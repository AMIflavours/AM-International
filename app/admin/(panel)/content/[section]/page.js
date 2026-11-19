import Link from "next/link";
import { notFound } from "next/navigation";
import { getDefaultsDictionary as getBaseDictionary } from "@/lib/defaultsDictionary";
import { SECTION_MAP, editableShape, deepMerge, dropStaleOverride, getOverrides } from "@/lib/siteContent";
import { findByContentKey } from "@/lib/adminPages";
import ContentForm from "@/components/admin/ContentForm";
import { SECTION_HINTS } from "@/lib/adminHints";

export const dynamic = "force-dynamic";

export default async function ContentSectionPage({ params }) {
  const { section } = await params;
  const meta = SECTION_MAP[section];
  if (!meta) notFound();

  const owner = findByContentKey(section);
  const overrides = await getOverrides();
  const defaults = {};
  const current = {};
  for (const lang of ["en", "ar"]) {
    const base = editableShape(section, (await getBaseDictionary(lang))[section]);
    defaults[lang] = base;
    current[lang] = deepMerge(base, dropStaleOverride(section, base, overrides[section]?.[lang]));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-ink/50">
        <Link href="/admin/content" className="hover:text-brand-orange">Pages</Link> / {owner ? owner.page.label : meta.group}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-brand-navy">{owner ? owner.section.label : meta.label}</h1>
      {SECTION_HINTS[section] ? (
        <div className="mt-3 rounded-lg border border-brand-orange/20 bg-brand-orange/5 px-4 py-3 text-sm text-ink/80">
          <p><span className="font-semibold text-brand-navy">Where this shows on the website: </span>{SECTION_HINTS[section]}</p>
          <p className="mt-1 text-xs text-ink/60">English is on the left and Arabic on the right. Pictures and videos are shared by both languages. Changes go live as soon as you press Save.</p>
          {owner?.page && owner.page.id !== "sitewide" ? (
            <p className="mt-2"><a href={`/en${owner.page.live}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-orange hover:underline">Open this page on the website</a></p>
          ) : null}
        </div>
      ) : null}
      <ContentForm section={section} defaults={defaults} initial={current} hasOverrides={Boolean(overrides[section])} />
    </div>
  );
}
