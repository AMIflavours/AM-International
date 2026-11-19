// Plain-language help shown in the admin. Safe to import from server and client code.

// Where each text section appears on the website.
export const SECTION_HINTS = {
  hero: "The big banner at the very top of the Home page (heading, short text, buttons and video).",
  intro: "The short introduction block under the hero on the Home page.",
  clients: "The 'Our clients' strip with logos on the Home page.",
  expertise: "The 'Our expertise' cards on the Home page.",
  process: "The short process steps block on the Home page.",
  industries: "The industries we serve block on the Home page.",
  events: "The events block on the Home page.",
  insights: "The latest articles block on the Home page.",
  certifications: "The certification badges block on the Home page.",
  flavoursPage: "Everything on the Flavours & Fragrances page: tabs, product cards, formats and client logos.",
  processPage: "Everything on the Our Process page: hero and the step by step sections.",
  enquiryForm: "The Request a Sample pop-up form (opens from the Request for Sample buttons).",
  downloadsPage: "The text on the Downloads page. The files themselves are in Downloads.",
  about: "The About page: story, meaning, mission and vision, and the leadership team with photos.",
  contactPage: "The Contact page: form text, office addresses, direct phone numbers and email, and the bottom call to action.",
  insightsPage: "The text on the Insights listing page.",
  insightArticle: "The labels around a single article (back link, share, related).",
  nav: "The top menu on every page.",
  buttons: "Button names used across the site (for example Request for Sample).",
  footer: "The footer on every page.",
  whatsapp: "The floating WhatsApp button, its message and number, and the video button.",
  eventsPage: "The text on the Events page.",
  seo: "What Google and the browser tab show for each page: the title and the short description under it.",
};

// Short help for field names that are not obvious. Shown under the field.
export const FIELD_HINTS = {
  eyebrow: "Small line above the main heading.",
  heading: "Main heading of this block.",
  title: "Title.",
  subtitle: "Line under the title.",
  text: "Paragraph text.",
  cta: "Button text.",
  ctaLabel: "Button text.",
  tag: "Small label on the card.",
  readTime: "For example: 5 min read.",
  date: "Shown as written.",
  excerpt: "Short summary shown on the card.",
  alt: "Describes the picture for screen readers and Google.",
  mapsQuery: "What Google Maps searches when someone taps Get Directions.",
  phone1: "First phone number. Leave empty to hide it.",
  phone2: "Second phone number. Leave empty to hide it.",
  emailAddress: "Email address people can click. Leave empty to hide it.",
  number: "WhatsApp number with country code, digits only (for example 923001234567).",
  message: "The text that appears ready to send when someone opens WhatsApp.",
  description: "Short description shown under the title in search results.",
  articleSuffix: "Added after an article title in the browser tab (for example: Article name | A.M International).",
};

export function hintFor(key) {
  return FIELD_HINTS[key] || "";
}
