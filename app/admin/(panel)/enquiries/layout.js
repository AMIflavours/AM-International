import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireSection } from "@/lib/guard";
import EnquiriesShell from "@/components/admin/EnquiriesShell";

export const dynamic = "force-dynamic";

// Shopify inbox style: the list of customers stays on the left, the chosen enquiry opens on the right.
export default async function SectionLayout({ children }) {
  await requireSection("enquiries");

  const db = getDb();
  let rows = [];
  let failed = false;
  if (db) {
    try {
      const list = await db.select().from(schema.enquiries).orderBy(desc(schema.enquiries.createdAt)).limit(300);
      rows = list.map((r) => ({
        id: r.id,
        name: r.name || "",
        company: r.company || "",
        topic: r.topic || "",
        message: r.message || "",
        status: r.status,
        createdAt: new Date(r.createdAt).toISOString(),
      }));
    } catch {
      failed = true;
    }
  } else {
    failed = true;
  }

  return <EnquiriesShell rows={rows} failed={failed}>{children}</EnquiriesShell>;
}
