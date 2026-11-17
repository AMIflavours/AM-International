// Copies every table and row from the OLD Neon database into the NEW Neon database.
//
// Put both links in .env.local (never share them with anyone):
//   OLD_DATABASE_URL=postgresql://...   (the database the live site uses now)
//   NEW_DATABASE_URL=postgresql://...   (the empty database in the new Neon account)
//
// Steps:
//   1. (Nothing to do for tables: missing tables are created in the NEW database automatically.)
//   2. Dry run (shows what would be copied, changes nothing):
//        node scripts/copy-db.mjs
//   3. Copy for real:
//        node scripts/copy-db.mjs --apply
//      If the new database already has rows, add --replace to empty the new tables first.
//
// The old database is only read, never changed.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const OLD = process.env.OLD_DATABASE_URL;
const NEW = process.env.NEW_DATABASE_URL;
if (!OLD || !NEW) {
  console.error("Put OLD_DATABASE_URL and NEW_DATABASE_URL in .env.local first.");
  process.exit(1);
}
if (OLD === NEW) {
  console.error("OLD and NEW are the same link. Stopping.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const REPLACE = process.argv.includes("--replace");
const BATCH = 200;

const oldSql = neon(OLD);
const newSql = neon(NEW);
const q = (name) => `"${String(name).replace(/"/g, '""')}"`;

async function tablesOf(sql) {
  const rows = await sql.query(
    `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`
  );
  return rows.map((r) => r.table_name).filter((t) => !t.startsWith("drizzle") && !t.startsWith("__drizzle"));
}

// Tables that other tables point to must be copied first.
async function orderByDependencies(sql, tables) {
  const fk = await sql.query(
    `select cl.relname as child, pr.relname as parent
       from pg_constraint c
       join pg_class cl on cl.oid = c.conrelid
       join pg_class pr on pr.oid = c.confrelid
       join pg_namespace n on n.oid = cl.relnamespace
      where c.contype = 'f' and n.nspname = 'public'`
  );
  const deps = new Map(tables.map((t) => [t, new Set()]));
  for (const { child, parent } of fk) if (child !== parent && deps.has(child) && deps.has(parent)) deps.get(child).add(parent);
  const done = [];
  const left = new Set(tables);
  while (left.size) {
    const ready = [...left].filter((t) => [...deps.get(t)].every((d) => done.includes(d)));
    if (!ready.length) {
      done.push(...left);
      break;
    }
    for (const t of ready) {
      done.push(t);
      left.delete(t);
    }
  }
  return done;
}

// Table definitions (same as db/schema.js). Used to create missing tables in the NEW database.
const DDL = {
  admin_users: `CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "name" varchar(120) DEFAULT '' NOT NULL,
  "password_hash" text NOT NULL,
  "role" varchar(20) DEFAULT 'admin' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);`,
  enquiries: `CREATE TABLE IF NOT EXISTS "enquiries" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL,
  "company" varchar(160) NOT NULL,
  "email" varchar(160) NOT NULL,
  "phone" varchar(40) NOT NULL,
  "topic" varchar(60) DEFAULT '' NOT NULL,
  "message" text NOT NULL,
  "status" varchar(20) DEFAULT 'new' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);`,
  events: `CREATE TABLE IF NOT EXISTS "events" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" varchar(160) NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "image_url" text DEFAULT '' NOT NULL,
  "event_date" timestamp with time zone,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "events_slug_unique" UNIQUE("slug")
);`,
  posts: `CREATE TABLE IF NOT EXISTS "posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" varchar(160) NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "image_url" text DEFAULT '' NOT NULL,
  "published_at" timestamp with time zone,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);`,
  site_content: `CREATE TABLE IF NOT EXISTS "site_content" (
  "key" varchar(120) PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);`,
};

const oldTables = await tablesOf(oldSql);
const newTables = await tablesOf(newSql);
const missing = oldTables.filter((t) => !newTables.includes(t));
const unknown = missing.filter((t) => !DDL[t]);
if (unknown.length) {
  console.error(`The OLD database has tables this script does not know how to create: ${unknown.join(", ")}`);
  process.exit(1);
}

const order = await orderByDependencies(oldSql, oldTables);
console.log(APPLY ? "COPYING" : "DRY RUN (nothing is changed)", "\n");

let problems = 0;
const plan = [];
for (const t of order) {
  const [{ n: oldCount }] = await oldSql.query(`select count(*)::int as n from ${q(t)}`);
  const newCount = newTables.includes(t) ? (await newSql.query(`select count(*)::int as n from ${q(t)}`))[0].n : 0;
  plan.push({ t, oldCount, newCount });
  const note = newTables.includes(t) ? "" : "   (will be created)";
  console.log(`${t.padEnd(22)} old: ${String(oldCount).padStart(5)} rows   new: ${String(newCount).padStart(5)} rows${note}`);
  if (newCount > 0 && !REPLACE) problems++;
}

if (problems && !REPLACE) {
  console.error("\nThe NEW database already has rows. Add --replace to empty those tables first, or use a fresh database.");
  if (APPLY) process.exit(1);
}
if (!APPLY) {
  console.log("\nThis was a dry run. Run again with --apply to copy.");
  process.exit(0);
}

for (const t of missing) {
  await newSql.query(DDL[t]);
  console.log(`created table ${t}`);
}

if (REPLACE) {
  for (const t of [...order].reverse()) await newSql.query(`truncate table ${q(t)} restart identity cascade`);
}

for (const { t, oldCount } of plan) {
  if (!oldCount) continue;
  const cols = await oldSql.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [t]
  );
  const pk = await oldSql.query(
    `select a.attname as col from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
      where i.indrelid = '${q(t)}'::regclass and i.indisprimary`
  );
  const orderBy = pk.length ? pk.map((p) => q(p.col)).join(", ") : q(cols[0].column_name);

  let copied = 0;
  for (let offset = 0; offset < oldCount; offset += BATCH) {
    const rows = await oldSql.query(`select * from ${q(t)} order by ${orderBy} limit ${BATCH} offset ${offset}`);
    if (!rows.length) break;
    await newSql.query(`insert into ${q(t)} select * from jsonb_populate_recordset(null::${q(t)}, $1::jsonb)`, [JSON.stringify(rows)]);
    copied += rows.length;
  }
  console.log(`copied ${String(copied).padStart(5)} rows into ${t}`);

  // Keep numbering (id) going after the highest copied id.
  const hasId = cols.some((c) => c.column_name === "id");
  const seq = hasId ? await newSql.query(`select pg_get_serial_sequence('${q(t).replace(/'/g, "''")}', 'id') as s`) : [];
  if (seq[0]?.s) await newSql.query(`select setval('${seq[0].s}', coalesce((select max(id) from ${q(t)}), 1), (select count(*) > 0 from ${q(t)}))`);
}

console.log("\nChecking counts...");
let ok = true;
for (const { t, oldCount } of plan) {
  const [{ n }] = await newSql.query(`select count(*)::int as n from ${q(t)}`);
  const same = n === oldCount;
  if (!same) ok = false;
  console.log(`${same ? "OK " : "BAD"} ${t.padEnd(22)} old ${oldCount}  new ${n}`);
}
console.log(ok ? "\nAll tables match. The new database is ready." : "\nSome counts differ. Do not switch yet; tell the developer.");
process.exit(ok ? 0 : 1);
