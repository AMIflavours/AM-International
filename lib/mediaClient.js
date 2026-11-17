// Browser helpers for the admin media screens.

// Where are these files used on the website? Returns { [url]: [{ where, detail }] } (empty on any problem).
export async function fetchUsage(urls) {
  try {
    const res = await fetch("/api/admin/media/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }) });
    const json = await res.json().catch(() => ({}));
    return json.usage || {};
  } catch {
    return {};
  }
}

// Saves a file to the computer. Falls back to opening it in a new tab if the browser blocks the download.
export async function downloadFile(url, name) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// A short readable list of places for the delete warning.
export function describeUsage(list) {
  return (list || []).map((u) => (u.detail ? `${u.where} (${u.detail})` : u.where));
}
