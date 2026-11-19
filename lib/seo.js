// Page title and description for search results and browser tabs. Edited in the admin (Search results).
import { getDictionary } from "@/lib/getDictionary";

export async function seoMeta(locale, key) {
  const dict = await getDictionary(locale);
  const s = dict.seo?.[key] || {};
  const out = {};
  if (s.title) out.title = s.title;
  if (s.description) out.description = s.description;
  return out;
}

export async function seoSuffix(locale) {
  const dict = await getDictionary(locale);
  return dict.seo?.articleSuffix || "A.M International";
}
