import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { deleteEnquiry } from "../actions";
import DeleteButton from "@/components/admin/DeleteButton";
import MarkRead from "@/components/admin/MarkRead";
import { whatsappLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function formatDate(value) {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Karachi" });
}

function Row({ label, children }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

export default async function EnquiryPage({ params }) {
  const { id } = await params;
  const num = Number(id);
  const db = getDb();
  if (!db || !Number.isInteger(num)) notFound();

  const rows = await db.select().from(schema.enquiries).where(eq(schema.enquiries.id, num)).limit(1);
  const r = rows[0];
  if (!r) notFound();

  const person = r.name || r.company;
  const wa = whatsappLink(
    r.phone,
    `Hello ${r.name || ""}`.trim() + `, thank you for contacting A.M International${r.topic ? ` about ${r.topic}` : ""}.`
  );

  return (
    <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <MarkRead id={r.id} status={r.status} />
      <Link href="/admin/enquiries" className="text-sm text-ink/50 hover:text-brand-orange md:hidden">&larr; All enquiries</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3 md:mt-0">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-brand-navy">{person}</h1>
          {r.name && r.company ? <p className="mt-0.5 text-sm text-ink/60">{r.company}</p> : null}
          <p className="mt-1 text-sm text-ink/50">{formatDate(r.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.1L2 22l5.05-1.6A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.25.7-1.45 1.35-2 1.4-.52.05-1 .25-3.4-.7-2.9-1.15-4.75-4.1-4.9-4.3-.15-.2-1.2-1.6-1.2-3s.75-2.1 1-2.4c.25-.3.55-.35.75-.35h.55c.18 0 .42-.07.65.5.25.6.85 2.05.9 2.2.08.15.12.32.02.5-.1.2-.15.32-.3.5-.15.17-.32.38-.45.5-.15.15-.3.3-.13.6.17.3.78 1.3 1.7 2.1 1.15 1 2.1 1.35 2.4 1.5.3.15.47.12.65-.07.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.7.8 2 .95.3.15.5.22.57.35.07.12.07.7-.18 1.4Z" /></svg>
              WhatsApp
            </a>
          ) : null}
          <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-black/5">Call</a>
          <form action={deleteEnquiry}>
            <input type="hidden" name="id" value={r.id} />
            <DeleteButton label="Delete" message="Delete this enquiry permanently? This cannot be undone." />
          </form>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-black/5 border-t border-black/5">
        <Row label="Name">{r.name || "-"}</Row>
        <Row label="Company">{r.company}</Row>
        <Row label="Email">{r.email}</Row>
        <Row label="Phone">{r.phone}</Row>
        <Row label="Topic">{r.topic || "-"}</Row>
        <Row label="Message"><p className="whitespace-pre-wrap leading-relaxed">{r.message}</p></Row>
      </dl>
    </div>
  );
}
