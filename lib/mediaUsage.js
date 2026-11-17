import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Finds where an uploaded file is used on the website, and clears it from there when the file is deleted.
// Files are matched by their stored file name (it holds a time stamp and a random id, so it is unique),
// which keeps working even if the storage address (host) changed after a move.

export function fileNameOf(url) {
  try {
    return decodeURIComponent(String(url).split("?")[0].split("/").pop() || "");
  } catch {
    return "";
  }
}

const matches = (value, name) => typeof value === "string" && name && value.split("?")[0].endsWith(`/${name}`);

// Walks a JSON value; calls onHit(path) for each string that is the file.
function scan(node, name, path, onHit) {
  if (typeof node === "string") {
    if (matches(node, name)) onHit(path);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => scan(v, name, [...path, i], onHit));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) scan(v, name, [...path, k], onHit);
  }
}

// Returns a copy with the file removed: matching text fields become "", matching list entries are dropped.
function strip(node, name) {
  if (typeof node === "string") return matches(node, name) ? "" : node;
  if (Array.isArray(node)) {
    const out = [];
    for (const v of node) {
      if (typeof v === "string" && matches(v, name)) continue;
      out.push(strip(v, name));
    }
    return out;
  }
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, strip(v, name)]));
  return node;
}

const nice = (k) => String(k).replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").trim().toLowerCase();
const place = (path) => path.filter((p) => typeof p === "string" && !["en", "ar"].includes(p)).map(nice).join(" > ");

// usage for many files: { [url]: [{ where, detail }] }
export async function findUsage(urls) {
  const db = getDb();
  const result = Object.fromEntries(urls.map((u) => [u, []]));
  if (!db) return result;
  const names = new Map(urls.map((u) => [u, fileNameOf(u)]));

  const [contentRows, postRows, eventRows] = await Promise.all([
    db.select().from(schema.siteContent),
    db.select().from(schema.posts),
    db.select().from(schema.events),
  ]);

  for (const [url, name] of names) {
    if (!name) continue;
    const list = result[url];
    for (const row of contentRows) {
      if (String(row.key).startsWith("team:")) continue;
      const seen = new Set();
      scan(row.value, name, [], (path) => {
        const detail = place(path);
        if (!seen.has(detail)) {
          seen.add(detail);
          list.push({ where: `Page content: ${nice(row.key)}`, detail });
        }
      });
    }
    for (const [rows, label] of [[postRows, "Insight article"], [eventRows, "Event"]]) {
      for (const r of rows) {
        let hit = matches(r.imageUrl, name);
        scan(r.data, name, [], () => (hit = true));
        if (hit) list.push({ where: `${label}: ${r.data?.en?.title || r.slug}`, detail: "" });
      }
    }
  }
  return result;
}

// Removes the file from every place that uses it. Returns how many places were changed.
export async function clearUsage(url) {
  const db = getDb();
  const name = fileNameOf(url);
  if (!db || !name) return 0;
  let changed = 0;

  for (const row of await db.select().from(schema.siteContent)) {
    if (String(row.key).startsWith("team:")) continue;
    let hit = false;
    scan(row.value, name, [], () => (hit = true));
    if (!hit) continue;
    await db.update(schema.siteContent).set({ value: strip(row.value, name), updatedAt: new Date() }).where(eq(schema.siteContent.key, row.key));
    changed++;
  }

  for (const [table, rows] of [[schema.posts, await db.select().from(schema.posts)], [schema.events, await db.select().from(schema.events)]]) {
    for (const r of rows) {
      let hit = matches(r.imageUrl, name);
      scan(r.data, name, [], () => (hit = true));
      if (!hit) continue;
      await db
        .update(table)
        .set({ imageUrl: matches(r.imageUrl, name) ? "" : r.imageUrl, data: strip(r.data, name), updatedAt: new Date() })
        .where(eq(table.id, r.id));
      changed++;
    }
  }
  return changed;
}

