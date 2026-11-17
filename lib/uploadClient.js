// Browser side upload used by the admin ImageField and FileField (and the Media Library popup).
// 1) ask the server for permission and a file name, 2) send the file straight to storage.
// Returns the public link of the uploaded file. onProgress gets a number from 0 to 100.
export async function uploadFile(file, onProgress) {
  const res = await fetch("/api/admin/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: file.type, size: file.size, name: file.name }),
  });
  const plan = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(plan.error || "Upload failed.");

  // Vercel Blob: direct upload with a short lived token (big files are sent in parts).
  if (plan.mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(plan.pathname, file, {
      access: "public",
      contentType: plan.contentType,
      handleUploadUrl: "/api/admin/blob-token",
      multipart: file.size > 20 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
    });
    return blob.url;
  }

  if (!plan.uploadUrl) throw new Error(plan.error || "Upload failed.");
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", plan.uploadUrl);
    for (const [name, value] of Object.entries(plan.headers || {})) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = "Upload failed. Please try again.";
      try {
        message = JSON.parse(xhr.responseText).error || message;
      } catch {}
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error. Please check the connection and try again."));
    xhr.send(file);
  });

  return plan.publicUrl;
}

// What kind of file a link points to: "image", "pdf", "video" or "other".
export function kindOfUrl(url) {
  const clean = String(url || "").split("?")[0].split("#")[0].toLowerCase();
  if (/\.(jpe?g|png|webp|avif|gif|svg)$/.test(clean)) return "image";
  if (/\.pdf$/.test(clean)) return "pdf";
  if (/\.(mp4|webm|mov)$/.test(clean)) return "video";
  return "other";
}
