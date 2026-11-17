// Makes lib/siteMedia.generated.json: the list of pictures, PDFs and videos that are part of the
// website files (the public folder). The admin Media Library shows them together with the files
// uploaded from the admin, newest first.
// Runs by itself before `npm run dev` and `npm run build`. Commit the result with your changes.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const OUT = path.join(ROOT, "lib", "siteMedia.generated.json");

const KINDS = {
  jpg: "image", jpeg: "image", png: "image", webp: "image", avif: "image",
  pdf: "pdf",
  mp4: "video", webm: "video",
};
const SKIP_DIRS = new Set(["fonts", ".well-known"]);
const SKIP_NAME = /^(favicon|apple-touch-icon|android-chrome|mstile|safari-pinned)/i;

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else out.push(path.join(dir, e.name));
  }
  return out;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
}

// The date each file was last added or changed in git (newest commit wins).
function gitDates() {
  try {
    if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") return null; // dates are not reliable
    const text = git(["log", "--format=@@%cI", "--name-only", "--diff-filter=AMR", "--", "public"]);
    const map = new Map();
    let current = "";
    for (const line of text.split("\n")) {
      if (line.startsWith("@@")) current = line.slice(2).trim();
      else if (line.trim() && !map.has(line.trim())) map.set(line.trim(), current);
    }
    return map;
  } catch {
    return null;
  }
}

let previous = new Map();
try {
  for (const item of JSON.parse(fs.readFileSync(OUT, "utf8"))) previous.set(item.path, item);
} catch {}

const dates = gitDates();
const items = [];
for (const file of walk(PUBLIC_DIR)) {
  const rel = path.relative(PUBLIC_DIR, file).split(path.sep).join("/");
  const base = path.basename(file);
  const ext = base.slice(base.lastIndexOf(".") + 1).toLowerCase();
  const kind = KINDS[ext];
  if (!kind || SKIP_NAME.test(base)) continue;
  const st = fs.statSync(file);
  const date = dates?.get(`public/${rel}`) || previous.get(rel)?.date || st.mtime.toISOString();
  items.push({ path: rel, name: base, kind, size: st.size, date: new Date(date).toISOString() });
}
items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.path.localeCompare(b.path)));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const next = JSON.stringify(items, null, 1) + "\n";
let same = false;
try {
  same = fs.readFileSync(OUT, "utf8") === next;
} catch {}
if (!same) fs.writeFileSync(OUT, next);
console.log(`[media-index] ${items.length} site files${same ? " (unchanged)" : ""}`);
