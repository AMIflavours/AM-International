import path from "node:path";

// Server side storage settings for admin uploads (images, PDFs, videos).
//
//   STORAGE_DRIVER=blob   Vercel Blob. Used automatically on Vercel when a Blob store is connected
//                         (BLOB_READ_WRITE_TOKEN exists). The browser uploads straight to Blob.
//   STORAGE_DRIVER=local  Files are saved on the server's own disk in UPLOAD_DIR and served from
//                         /media/... (Nginx serves them directly). Default when no Blob token exists.
//   STORAGE_DRIVER=r2     Files go straight from the browser to a Cloudflare R2 bucket
//                         (or any S3 compatible storage) and are served from R2_PUBLIC_URL.

const explicit = String(process.env.STORAGE_DRIVER || "").toLowerCase();
export const DRIVER = explicit || (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local");
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads-data");

const MB = 1024 * 1024;

export const TYPES = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/avif": { ext: "avif", kind: "image" },
  "application/pdf": { ext: "pdf", kind: "pdf" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
};

export const LIMITS = { image: 10 * MB, pdf: 100 * MB, video: 500 * MB };

const EXT_TO_TYPE = Object.fromEntries(Object.entries(TYPES).map(([type, v]) => [v.ext, type]));
// year/month/13 digit time-8 hex id[-readable-name].ext
const KEY_RE = /^\d{4}\/\d{2}\/\d{13}-[a-f0-9]{8}(-[a-z0-9-]{1,60})?\.(jpg|png|webp|avif|pdf|mp4|webm)$/;

export function isValidKey(key) {
  return typeof key === "string" && KEY_RE.test(key);
}

export function typeForKey(key) {
  return EXT_TO_TYPE[key.slice(key.lastIndexOf(".") + 1)] || null;
}

export function limitForKey(key) {
  const type = typeForKey(key);
  return type ? LIMITS[TYPES[type].kind] : 0;
}

// "Summer Flavours (final).JPG" -> "summer-flavours-final"
function slugOf(name) {
  const base = String(name || "").replace(/\.[^.]+$/, "");
  return base
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export function newKey(type, name) {
  const info = TYPES[type];
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const slug = slugOf(name);
  return `${yyyy}/${mm}/${Date.now()}-${id}${slug ? `-${slug}` : ""}.${info.ext}`;
}

export function publicUrlFor(key) {
  if (DRIVER === "r2") return `${String(process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "")}/${key}`;
  return `/media/${key}`;
}

export const MIME_BY_EXT = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
};

export function kindOfName(name) {
  const ext = String(name || "").slice(String(name || "").lastIndexOf(".") + 1).toLowerCase();
  const type = EXT_TO_TYPE[ext === "jpeg" ? "jpg" : ext];
  return type ? TYPES[type].kind : null;
}

// A readable name from a stored file name: "1790000000000-abcdef12-summer-flavours.jpg" -> "summer-flavours.jpg"
export function displayName(fileName) {
  const base = String(fileName || "").split("/").pop() || "";
  const m = /^\d{13}-[a-f0-9]{8}-(.+)$/.exec(base);
  return m ? m[1] : base;
}
