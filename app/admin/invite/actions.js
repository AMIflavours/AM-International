"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createSession } from "@/lib/auth";
import { cleanSections, SECTION_KEYS } from "@/lib/teamShared";
import { logActivity } from "@/lib/activity";
import { hashToken } from "@/lib/team";

export async function acceptInvite(prevState, formData) {
  const token = String(formData.get("token") || "");
  const name = String(formData.get("name") || "").trim().slice(0, 120);
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (password.length < 10) return { error: "Password must be at least 10 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  const db = getDb();
  if (!db) return { error: "Database is not configured." };

  const key = `invite:${hashToken(token)}`;
  let user;
  try {
    const rows = await db.select().from(schema.siteContent).where(eq(schema.siteContent.key, key)).limit(1);
    const invite = rows[0]?.value;
    if (!invite || new Date(invite.expiresAt).getTime() < Date.now()) {
      return { error: "This invitation is invalid or has expired. Ask the owner for a new one." };
    }

    if (invite.kind === "owner") {
      const passwordHash = await bcrypt.hash(password, 12);
      const found = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, invite.email)).limit(1);
      let next;
      if (found[0]) {
        // An existing team member is promoted: new password, owner role, member access row removed.
        const up = await db.update(schema.adminUsers).set({ passwordHash, role: "admin", name: name || found[0].name || invite.name || "" }).where(eq(schema.adminUsers.id, found[0].id)).returning();
        next = up[0];
        await db.delete(schema.siteContent).where(eq(schema.siteContent.key, `team:${next.id}`));
      } else {
        const ins = await db.insert(schema.adminUsers).values({ email: invite.email, name: name || invite.name || "", passwordHash, role: "admin" }).returning();
        next = ins[0];
      }
      // The new owner exists first, then every earlier owner becomes a team member with full access
      // (the new owner can change or remove them). There is never a moment with no owner.
      const owners = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.role, "admin"));
      for (const o of owners) {
        if (o.id === next.id) continue;
        await db.update(schema.adminUsers).set({ role: "editor" }).where(eq(schema.adminUsers.id, o.id));
        await db
          .insert(schema.siteContent)
          .values({ key: `team:${o.id}`, value: { sections: SECTION_KEYS, disabled: false }, updatedAt: new Date() })
          .onConflictDoUpdate({ target: schema.siteContent.key, set: { value: { sections: SECTION_KEYS, disabled: false }, updatedAt: new Date() } });
      }
      await db.delete(schema.siteContent).where(eq(schema.siteContent.key, key));
      await logActivity(next, "Became the owner (ownership transferred from)", owners.filter((o) => o.id !== next.id).map((o) => o.email).join(", "), "team");
      user = next;
    } else {
    const exists = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, invite.email)).limit(1);
    if (exists[0]) return { error: "This email already has an account. Try signing in." };

    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await db
      .insert(schema.adminUsers)
      .values({ email: invite.email, name: name || invite.name || "", passwordHash, role: "editor" })
      .returning();
    user = inserted[0];

    await db
      .insert(schema.siteContent)
      .values({ key: `team:${user.id}`, value: { sections: cleanSections(invite.sections), disabled: false }, updatedAt: new Date() });
    await db.delete(schema.siteContent).where(eq(schema.siteContent.key, key));
    }
  } catch (error) {
    console.error("[invite] accept failed", error);
    return { error: "Could not complete the invitation. Try again." };
  }

  await createSession(user);
  redirect("/admin");
}
