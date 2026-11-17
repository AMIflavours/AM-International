import FilesManager from "@/components/admin/FilesManager";

export const dynamic = "force-dynamic";

export default function FilesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-brand-navy">All files</h1>
      <p className="mt-1 text-sm text-ink/60">Every picture, video and PDF of the website in one place. View, delete or make files smaller without losing quality.</p>
      <FilesManager />
    </div>
  );
}
 