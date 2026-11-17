// Host of the public file storage (only when STORAGE_DRIVER=r2), so next/image may load from it.
function r2Pattern() {
  try {
    const host = new URL(process.env.R2_PUBLIC_URL || "").hostname;
    return host ? [{ protocol: "https", hostname: host }] : [];
  } catch {
    return [];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self contained server build (.next/standalone) used on the VPS, started with PM2.
  // Vercel makes its own build, so this is only set when not building on Vercel.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  images: {
    remotePatterns: [
      // Old uploads that still live on Vercel Blob. Can be removed once scripts/migrate-blob.mjs has been run.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      ...r2Pattern(),
    ],
  },
};

export default nextConfig;
