// Built-in help guide for the admin. No AI and no key needed: it matches the question to a topic and answers
// in English or Roman Urdu with exact steps and the page to open. Safe to import from server and client code.
//
// hl = text of the heading on that page that gets highlighted when the page opens.

export const TOPICS = [
  {
    id: "logo",
    where: "Header and footer > Photos and links > Site pictures and videos",
    href: "/admin/media",
    hl: "Site pictures and videos",
    words: ["logo", "brand logo", "company logo", "header logo", "footer logo", "لوگو"],
    en: { title: "Change the logo", steps: ["Open Photos and links (Media).", "Find the card 'Site pictures and videos' and the field 'Logo'.", "Press Replace, pick a new file from the library or upload one.", "Press Save at the bottom. The website updates within a few seconds."] },
    ru: { title: "Logo badalna", steps: ["Photos and links (Media) kholein.", "'Site pictures and videos' card mein 'Logo' field dhoondein.", "Replace dabayein, library se file chunein ya nayi upload karein.", "Neeche Save dabayein. Website kuch seconds mein update ho jati hai."] },
  },
  {
    id: "sitemedia",
    where: "Photos and links > Site pictures and videos",
    href: "/admin/media",
    hl: "Site pictures and videos",
    words: ["hero video", "banner video", "background video", "promo video", "intro video", "process video", "about banner", "about hero", "contact background", "contact map", "map", "video", "videos", "background", "banner", "tasveer", "picture", "image", "photo", "vedio", "ویڈیو", "تصویر"],
    en: { title: "Change a picture or video of the site", steps: ["Open Photos and links (Media).", "Go to the card 'Site pictures and videos'. Every picture and video of the site is listed there by group (Home, About, Process, Contact, Events).", "Press Replace on the one you want. Pick from the library or upload from your device.", "Press Save. Use 'Reset to original' on a field to bring the old file back."] },
    ru: { title: "Site ki picture ya video badalna", steps: ["Photos and links (Media) kholein.", "'Site pictures and videos' card mein Home, About, Process, Contact, Events ke hisaab se sab pictures aur videos hain.", "Jo badalni ho us par Replace dabayein. Library se chunein ya device se upload karein.", "Save dabayein. Purani file wapas chahiye to field par 'Reset to original' dabayein."] },
  },
  {
    id: "clients",
    where: "Photos and links > Client logos",
    href: "/admin/media",
    hl: "Client logos",
    words: ["client", "clients", "client logo", "client logos", "customer logos", "brands we work with", "scrolling strip", "کلائنٹ"],
    en: { title: "Client logos (home page strip)", steps: ["Open Photos and links (Media).", "Go to the card 'Client logos'.", "Add, replace, reorder or remove logos. Use PNG or WebP with a clear background.", "Press Save."] },
    ru: { title: "Client logos (home page ki strip)", steps: ["Photos and links (Media) kholein.", "'Client logos' card par jayein.", "Logos add, replace, order change ya remove karein. PNG ya WebP use karein.", "Save dabayein."] },
  },
  {
    id: "certs",
    where: "Photos and links > Home page: Certifications",
    href: "/admin/media",
    hl: "Home page: Certifications",
    words: ["certificate", "certificates", "certification", "certifications", "badge", "badges", "halal", "iso", "fssc", "pfa", "pdf certificate", "سرٹیفکیٹ"],
    en: { title: "Certification badges and certificate PDFs", steps: ["Open Photos and links (Media).", "Go to 'Home page: Certifications'.", "Each badge has a picture and a PDF. Replace either, change the order, or Add badge.", "Press Save."] },
    ru: { title: "Certification badges aur certificate PDF", steps: ["Photos and links (Media) kholein.", "'Home page: Certifications' card par jayein.", "Har badge ki picture aur PDF alag hai. Replace karein, order badlein ya Add badge dabayein.", "Save dabayein."] },
  },
  {
    id: "social",
    where: "Photos and links > Social links",
    href: "/admin/media",
    hl: "Social links",
    words: ["social", "facebook", "instagram", "linkedin", "youtube", "twitter", "tiktok", "social media", "social icons", "social links"],
    en: { title: "Social media links", steps: ["Open Photos and links (Media).", "Go to the card 'Social links'.", "Add the platform and paste the full link (https://...). Remove the ones you do not use.", "Press Save. Icons appear in the header and footer."] },
    ru: { title: "Social media links", steps: ["Photos and links (Media) kholein.", "'Social links' card par jayein.", "Platform chunein aur poora link (https://...) paste karein. Jo use nahi hote wo hata dein.", "Save dabayein. Icons header aur footer mein aa jayenge."] },
  },
  {
    id: "menu",
    where: "Photos and links > Header (links) / Header and footer > Menu (names)",
    href: "/admin/media",
    hl: "Header",
    words: ["menu", "header", "navigation", "nav", "menu link", "header button", "top menu", "request sample button", "catalogue button", "download catalogue"],
    en: { title: "Header menu and buttons", steps: ["For where the links go: open Photos and links (Media) > card 'Header'.", "For the names of the menu items: open Header and footer > Menu.", "For the Download Catalogue file: card 'Catalogue' in Photos and links.", "Press Save."] },
    ru: { title: "Header menu aur buttons", steps: ["Links kahan jayen: Photos and links (Media) > 'Header' card.", "Menu ke naam: Header and footer > Menu.", "Download Catalogue ki file: Photos and links ka 'Catalogue' card.", "Save dabayein."] },
  },
  {
    id: "footerlinks",
    where: "Photos and links > Footer links",
    href: "/admin/media",
    hl: "Footer links",
    words: ["footer link", "footer links", "footer menu", "quick links"],
    en: { title: "Footer links", steps: ["Open Photos and links (Media) > card 'Footer links' to set where each link goes.", "The link names are in Header and footer > Footer text.", "Press Save."] },
    ru: { title: "Footer links", steps: ["Photos and links (Media) > 'Footer links' card mein har link ki destination set karein.", "Link ke naam Header and footer > Footer text mein hain.", "Save dabayein."] },
  },
  {
    id: "footercontact",
    where: "Header and footer > Footer contacts",
    href: "/admin/footer",
    hl: "Footer contacts",
    words: ["footer phone", "footer email", "footer number", "phone number", "phone", "email", "emails", "mobile number", "call number", "contact number", "number", "نمبر"],
    en: { title: "Phone numbers and emails in the footer", steps: ["Open Header and footer > Footer contacts.", "Add, change or remove phone numbers and emails (up to 6 each).", "Press Save."] },
    ru: { title: "Footer ke phone numbers aur emails", steps: ["Header and footer > Footer contacts kholein.", "Phone numbers aur emails add, change ya remove karein (6 tak).", "Save dabayein."] },
  },
  {
    id: "contactpage",
    where: "Contact > Contact text",
    href: "/admin/content/contactPage",
    hl: "Direct",
    words: ["contact page", "contact us", "office", "offices", "address", "addresses", "direct contact", "call us", "email us", "karachi", "lahore", "faisalabad", "map directions", "پتہ"],
    en: { title: "Contact page: offices, phone and email", steps: ["Open Contact > Contact text.", "Offices and addresses are under 'Locations'. The phone numbers and email people can click are under 'Direct' (Phone 1, Phone 2, Email Address).", "Change English on the left and Arabic on the right.", "Press Save."] },
    ru: { title: "Contact page: offices, phone aur email", steps: ["Contact > Contact text kholein.", "Offices aur addresses 'Locations' mein hain. Click hone wale phone aur email 'Direct' mein hain (Phone 1, Phone 2, Email Address).", "English left side, Arabic right side mein badlein.", "Save dabayein."] },
  },
  {
    id: "whatsapp",
    where: "Header and footer > WhatsApp and YouTube",
    href: "/admin/content/whatsapp",
    hl: "Number",
    words: ["whatsapp", "whats app", "wa number", "floating button", "chat button", "whatsapp number", "whatsapp message", "واٹس ایپ"],
    en: { title: "Floating WhatsApp button", steps: ["Open Header and footer > WhatsApp and YouTube.", "'Number' is the WhatsApp number with country code, digits only (for example 923001234567).", "'Message' is the text that is ready to send when a visitor opens the chat.", "Press Save."] },
    ru: { title: "Floating WhatsApp button", steps: ["Header and footer > WhatsApp and YouTube kholein.", "'Number' mein country code ke saath sirf digits likhein (jaise 923001234567).", "'Message' wo text hai jo chat khulte hi pehle se likha hota hai.", "Save dabayein."] },
  },
  {
    id: "seo",
    where: "Header and footer > Search results (SEO)",
    href: "/admin/content/seo",
    hl: "Home",
    words: ["seo", "google", "search result", "search results", "page title", "tab title", "browser title", "meta", "description", "site title", "title"],
    en: { title: "Google title and description of a page", steps: ["Open Header and footer > Search results (SEO).", "Every page has a Title (browser tab and Google headline) and a Description (small text under it).", "Press Save. Google may take days to show the change."] },
    ru: { title: "Page ka Google title aur description", steps: ["Header and footer > Search results (SEO) kholein.", "Har page ka Title (tab aur Google headline) aur Description (neeche chhota text) hai.", "Save dabayein. Google ko change dikhane mein kuch din lag sakte hain."] },
  },
  {
    id: "hometext",
    where: "Home > Hero / Intro / Expertise ...",
    href: "/admin/pages",
    hl: "",
    words: ["home", "home page", "homepage", "hero", "hero text", "heading", "headline", "main text", "front page", "intro", "expertise", "industries", "ہوم"],
    en: { title: "Home page text", steps: ["Open Pages > Home.", "Pick the block: Hero, Intro and Stats, Clients, Expertise, Process, Industries, Events block, Insights block, Certifications.", "Edit the text (English left, Arabic right) and press Save."] },
    ru: { title: "Home page ka text", steps: ["Pages > Home kholein.", "Block chunein: Hero, Intro and Stats, Clients, Expertise, Process, Industries, Events block, Insights block, Certifications.", "Text badlein (English left, Arabic right) aur Save dabayein."] },
  },
  {
    id: "stats",
    where: "Home > Intro and Stats",
    href: "/admin/home",
    hl: "Intro and Stats",
    words: ["stats", "statistics", "numbers", "counter", "counters", "years", "experience", "happy clients", "intro and stats"],
    en: { title: "Statistics numbers on the home page", steps: ["Open Home > Intro and Stats.", "Edit the intro text and the statistic cards (number and label).", "Press Save."] },
    ru: { title: "Home page ke statistics numbers", steps: ["Home > Intro and Stats kholein.", "Intro text aur statistic cards (number aur label) badlein.", "Save dabayein."] },
  },
  {
    id: "flavours",
    where: "Flavours and Fragrances > Products and logos / Page text",
    href: "/admin/content/flavoursPage",
    hl: "",
    words: ["flavour", "flavours", "flavor", "fragrance", "fragrances", "product card", "product", "products", "category", "categories", "confectionery", "beverages", "baking", "soap", "cosmetics", "format", "logos on card"],
    en: { title: "Flavours and Fragrances page", steps: ["Text, card photos and the client logos of each card: Flavours and Fragrances > Page text. Each card shows its photo and logo fields.", "Product tabs and formats: Flavours and Fragrances > Products and logos.", "Replace a picture with the Replace button, then Save."] },
    ru: { title: "Flavours and Fragrances page", steps: ["Har card ka text, photo aur client logos: Flavours and Fragrances > Page text.", "Product tabs aur formats: Flavours and Fragrances > Products and logos.", "Picture Replace button se badlein, phir Save."] },
  },
  {
    id: "about",
    where: "About > About text",
    href: "/admin/content/about",
    hl: "Team",
    words: ["about", "about us", "about page", "team", "team photo", "team photos", "leadership", "director", "managing director", "story", "mission", "vision", "founder", "ٹیم"],
    en: { title: "About page and team photos", steps: ["Open About > About text.", "Story, mission and vision are at the top. Leadership cards (name, role, photo) are under 'Team'.", "Press Save."] },
    ru: { title: "About page aur team photos", steps: ["About > About text kholein.", "Story, mission aur vision upar hain. Leadership cards (naam, role, photo) 'Team' mein hain.", "Save dabayein."] },
  },
  {
    id: "process",
    where: "Our Process > Process text",
    href: "/admin/content/processPage",
    hl: "",
    words: ["process page", "our process", "process steps", "research", "quality control", "step", "steps"],
    en: { title: "Our Process page", steps: ["Open Our Process > Process text.", "Edit the hero and each step. The step videos are in Photos and links > Site pictures and videos.", "Press Save."] },
    ru: { title: "Our Process page", steps: ["Our Process > Process text kholein.", "Hero aur har step ka text badlein. Step videos Photos and links > Site pictures and videos mein hain.", "Save dabayein."] },
  },
  {
    id: "events",
    where: "Events > Events list",
    href: "/admin/events",
    hl: "",
    words: ["event", "events", "new event", "add event", "exhibition", "expo", "upcoming", "past events", "ایونٹ"],
    en: { title: "Add or edit an event", steps: ["Open Events > Events list.", "Press the new event button to add one, or click an event to edit or delete it.", "Add title, date, location, picture, then Save.", "The top banner is in Photos and links > 'Events page: top banner'."] },
    ru: { title: "Event add ya edit karna", steps: ["Events > Events list kholein.", "Naya event add karne ke liye new button dabayein, ya kisi event par click karke edit/delete karein.", "Title, date, location, picture bharein aur Save karein.", "Top banner Photos and links > 'Events page: top banner' mein hai."] },
  },
  {
    id: "insights",
    where: "Insights > Articles",
    href: "/admin/insights",
    hl: "",
    words: ["insight", "insights", "article", "articles", "blog", "post", "posts", "news", "write article", "new article", "مضمون"],
    en: { title: "Articles (Insights)", steps: ["Open Insights.", "Press New to write an article, or click an article to edit or delete it.", "Add title, summary, picture and text, then Save or Publish."] },
    ru: { title: "Articles (Insights)", steps: ["Insights kholein.", "Naya article likhne ke liye New dabayein, ya article par click karke edit/delete karein.", "Title, summary, picture aur text bharein, phir Save ya Publish karein."] },
  },
  {
    id: "downloads",
    where: "Downloads",
    href: "/admin/downloads",
    hl: "Downloads",
    words: ["download", "downloads", "catalogue", "catalog", "brochure", "booklet", "company profile", "pdf", "pdf file", "file for download", "ڈاؤن لوڈ"],
    en: { title: "Download files (catalogue, brochures)", steps: ["Open Downloads.", "Add, replace, rename or remove the files visitors can download.", "Press Save. The page text is in Downloads > Page text."] },
    ru: { title: "Download files (catalogue, brochures)", steps: ["Downloads kholein.", "Jo files visitors download karte hain unhe add, replace, rename ya remove karein.", "Save dabayein. Page ka text Downloads > Page text mein hai."] },
  },
  {
    id: "enquiries",
    where: "Enquiries",
    href: "/admin/enquiries",
    hl: "",
    words: ["enquiry", "enquiries", "inquiry", "inquiries", "sample request", "request for sample", "form submission", "customer message", "lead", "leads", "reply", "reply customer", "messages", "forms", "chat with customer", "انکوائری"],
    en: { title: "Customer enquiries", steps: ["Open Enquiries.", "Click an enquiry to read it. Use the green WhatsApp button to chat with the customer, or Call.", "Delete removes it. Enquiry emails arrive at the address set in the server settings (ENQUIRY_TO)."] },
    ru: { title: "Customer enquiries", steps: ["Enquiries kholein.", "Enquiry par click karke parhein. Green WhatsApp button se customer se chat karein, ya Call dabayein.", "Delete se hat jati hai. Enquiry emails server settings ke ENQUIRY_TO address par aati hain."] },
  },
  {
    id: "enquiryform",
    where: "Contact > Enquiry form",
    href: "/admin/content/enquiryForm",
    hl: "",
    words: ["enquiry form text", "sample form", "form text", "form labels", "popup", "pop up", "request sample popup"],
    en: { title: "Request a Sample pop-up text", steps: ["Open Contact > Enquiry form.", "Edit the labels, messages and success text (English and Arabic).", "Press Save."] },
    ru: { title: "Request a Sample pop-up ka text", steps: ["Contact > Enquiry form kholein.", "Labels, messages aur success text (English aur Arabic) badlein.", "Save dabayein."] },
  },
  {
    id: "files",
    where: "All files",
    href: "/admin/files",
    hl: "",
    words: ["all files", "files", "delete", "remove", "compress", "download file", "delete file", "remove file", "delete image", "delete video", "compress", "compress image", "reduce size", "size", "storage", "memory", "download file", "view file", "where is file used", "media library", "library", "mb", "kb", "heavy", "slow", "site slow", "فائل"],
    en: { title: "All files: view, delete, download, compress", steps: ["Open All files.", "Use the tabs (Images, Videos, PDFs) and the filter to find a file.", "Click a file to view it, download it, delete it or compress it (smaller size, same quality).", "Before deleting, it shows where the file is used on the website. Deleting is permanent and removes it from the site too."] },
    ru: { title: "All files: view, delete, download, compress", steps: ["All files kholein.", "Tabs (Images, Videos, PDFs) aur filter se file dhoondein.", "File par click karke view, download, delete ya compress (size kam, quality wahi) karein.", "Delete se pehle dikhata hai ke file website par kahan use ho rahi hai. Delete permanent hai aur site se bhi hat jati hai."] },
  },
  {
    id: "upload",
    where: "Any picture field > Upload image / Replace",
    href: "/admin/files",
    hl: "",
    words: ["upload", "upload image", "upload video", "upload photo", "add image", "add picture", "new image", "new photo", "replace image", "replace picture", "change image", "change picture", "change photo"],
    en: { title: "Upload or replace a picture", steps: ["On any picture field press Upload image (or Replace). The media library opens.", "Pick an existing file, or press 'Upload from device' to add a new one. New uploads are saved in the library automatically.", "Press Save on the page."] },
    ru: { title: "Picture upload ya replace karna", steps: ["Kisi bhi picture field par Upload image (ya Replace) dabayein. Media library khulti hai.", "Purani file chunein ya 'Upload from device' se nayi dalein. Nayi upload library mein khud save ho jati hai.", "Page par Save dabayein."] },
  },
  {
    id: "arrange",
    where: "Pages > (page) > Layout and visibility",
    href: "/admin/pages",
    hl: "",
    words: ["hide", "show", "hide section", "show section", "reorder", "arrange", "move section", "order", "layout", "visibility", "remove section", "section hatao", "chhupana"],
    en: { title: "Hide, show or reorder sections", steps: ["Open Pages and pick the page.", "Choose 'Layout and visibility'.", "Switch a section off to hide it, or drag to change the order. Save."] },
    ru: { title: "Section hide, show ya order badalna", steps: ["Pages kholein aur page chunein.", "'Layout and visibility' chunein.", "Section off karke hide karein ya drag karke order badlein. Save."] },
  },
  {
    id: "team",
    where: "Team and access",
    href: "/admin/team",
    hl: "Team and access",
    words: ["team member", "invite", "invite user", "new user", "add user", "permission", "permissions", "access", "password", "forgot password", "reset password", "login", "login link", "admin user", "remove user", "sign in", "ٹیم ممبر"],
    en: { title: "Add a team member or change access", steps: ["Open Team and access.", "Invite a person by email, choose which areas they can use, and copy the login link to send them.", "You can also change a member's access or remove them. Only the owner can do this."] },
    ru: { title: "Team member add karna ya access badalna", steps: ["Team and access kholein.", "Email se invite karein, chunein wo kaunse areas use kar sakta hai, aur login link copy karke bhej dein.", "Member ka access badal ya remove bhi kar sakte hain. Ye sirf owner kar sakta hai."] },
  },
  {
    id: "ownership",
    where: "Team and access > Transfer ownership",
    href: "/admin/team",
    hl: "Transfer ownership",
    words: ["transfer ownership", "ownership", "owner", "new owner", "change owner", "make owner", "hand over", "handover", "give admin", "malik", "owner badlo", "owner change"],
    en: { title: "Hand the admin over to a new owner", steps: ["Open Team and access (only the owner can).", "In the 'Transfer ownership' card press Transfer ownership, enter the new owner's email and your own password, tick the confirmation and send.", "They get a link by email (you also see it to copy). They set their own password and become the owner.", "You stay the owner until they finish. Then you become a team member and they can change or remove you."] },
    ru: { title: "Admin ka owner badalna", steps: ["Team and access kholein (sirf owner kar sakta hai).", "'Transfer ownership' card mein Transfer ownership dabayein, naye owner ki email aur apna password likhein, confirmation tick karke bhej dein.", "Unhein email par link milta hai (aap ko bhi copy karne ke liye dikhta hai). Wo apna password set karke owner ban jate hain.", "Jab tak wo link na kholein aap hi owner rahenge. Phir aap team member ban jayenge aur naya owner aap ko change ya remove kar sakta hai."] },
  },
  {
    id: "reports",
    where: "Reports",
    href: "/admin/reports",
    hl: "Reports",
    words: ["report", "reports", "weekly report", "daily report", "monthly report", "visitors", "traffic", "analytics", "stats report"],
    en: { title: "Reports", steps: ["Open Reports.", "See the summary and download or open the reports."] },
    ru: { title: "Reports", steps: ["Reports kholein.", "Summary dekhein aur reports download ya open karein."] },
  },
  {
    id: "activity",
    where: "Activity",
    href: "/admin/activity",
    hl: "Activity",
    words: ["activity", "history", "who changed", "who edited", "log", "changes log", "audit", "kisne badla"],
    en: { title: "Who changed what", steps: ["Open Activity.", "It lists every change with the person, the time and what was edited."] },
    ru: { title: "Kisne kya badla", steps: ["Activity kholein.", "Yahan har change, kis ne kiya, kab kiya aur kya badla sab likha hota hai."] },
  },
  {
    id: "reset",
    where: "Bottom of each page > Reset",
    href: "/admin/pages",
    hl: "",
    words: ["reset", "undo", "restore", "original", "go back", "default", "wapas", "purana", "old text", "old version"],
    en: { title: "Go back to the original", steps: ["Open the page you changed.", "Scroll to the very bottom and use the Reset area (it asks twice).", "For one picture, use 'Reset to original' on that field."] },
    ru: { title: "Original par wapas jana", steps: ["Jis page mein change kiya wo kholein.", "Bilkul neeche Reset area hai (2 baar confirm poochta hai).", "Sirf ek picture ke liye us field par 'Reset to original' dabayein."] },
  },
  {
    id: "arabic",
    where: "Any text page: right column",
    href: "/admin/pages",
    hl: "",
    words: ["arabic", "english", "language", "translate", "translation", "urdu", "عربی", "arabic text", "rtl"],
    en: { title: "Arabic and English text", steps: ["In every text page English is the left column and Arabic is the right column.", "Edit both. Pictures and videos are shared by both languages."] },
    ru: { title: "Arabic aur English text", steps: ["Har text page mein English left column aur Arabic right column mein hai.", "Dono mein badlein. Pictures aur videos dono languages ke liye ek hi hain."] },
  },
  {
    id: "notupdating",
    where: "Anywhere",
    href: "/admin",
    hl: "",
    words: ["not updating", "not showing", "not change", "not changed", "change not showing", "old still showing", "refresh", "cache", "nahi aa raha", "nahi badla", "update nahi", "dikh nahi"],
    en: { title: "Change saved but the website still shows the old one", steps: ["Make sure you pressed Save and saw the green confirmation.", "Wait about 30 seconds, then refresh the website with Ctrl+F5 (hard refresh).", "Videos and big pictures can stay cached a minute longer.", "Still old? Check you edited the right language (English and Arabic are separate) and tell the developer."] },
    ru: { title: "Change save hui lekin website par purana dikh raha hai", steps: ["Dekhein ke Save dabaya aur green confirmation aaya.", "30 seconds ruk kar website par Ctrl+F5 (hard refresh) karein.", "Videos aur bari pictures ek minute mazeed cache mein reh sakti hain.", "Phir bhi purana ho to check karein sahi language (English/Arabic alag hain) badli, aur developer ko batayein."] },
  },
];

const ROMAN_URDU_HINTS = ["kaise", "kese", "kaisay", "kahan", "kahaan", "kya", "kyun", "nahi", "nai", "hai", "hy", "hain", "badal", "badlo", "badalna", "badlna", "karna", "karo", "krna", "kro", "dikhao", "dikha", "batao", "bata", "mujhe", "mojy", "mera", "meri", "mere", "ko", "ka", "ki", "ky", "ma", "mein", "se", "sy", "tasveer", "wapas", "chahiye", "chahye", "lagana", "hatana", "hata", "karni", "krni", "ye", "wo", "agar", "abhi", "kuch", "sab"];

export function detectLang(text) {
  const t = String(text || "");
  if (/[؀-ۿ]/.test(t)) return "ur";
  const words = t.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const hits = words.filter((w) => ROMAN_URDU_HINTS.includes(w)).length;
  return hits >= 2 || (hits >= 1 && words.length <= 3) ? "ru" : "en";
}

function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9؀-ۿ\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function findTopics(query, limit = 2) {
  const q = ` ${norm(query)} `;
  const tokens = q.trim().split(" ").filter(Boolean);
  const scored = [];
  for (const t of TOPICS) {
    let score = 0;
    for (const w of t.words) {
      const nw = norm(w);
      if (!nw) continue;
      if (nw.includes(" ")) {
        if (q.includes(` ${nw} `)) score += 4;
      } else if (tokens.includes(nw)) score += 2;
      else if (nw.length >= 5 && tokens.some((x) => x.length >= 5 && (x.startsWith(nw) || nw.startsWith(x)))) score += 1;
    }
    if (score > 0) scored.push({ t, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]?.score || 0;
  return scored.filter((x) => x.score >= Math.max(2, top * 0.6)).slice(0, limit).map((x) => x.t);
}

export const SUGGESTIONS = {
  en: ["How do I change the logo?", "Where do I change the phone number?", "How do I replace a video?", "How do I delete a file?"],
  ru: ["Logo kaise badlun?", "Phone number kahan se badlun?", "Video kaise replace karun?", "File delete kaise karun?"],
};

const COPY = {
  en: {
    hello: "Hi! Ask me anything about the admin, in English, Urdu or Roman Urdu. I will tell you the exact page and steps, and open it for you.",
    none: "I could not find that. Try other words (for example: logo, video, phone number, event, article, enquiry, delete file) or pick one of these.",
    open: "Open",
    also: "Also related",
  },
  ru: {
    hello: "Salam! Admin ke baare mein kuch bhi poochein, English, Urdu ya Roman Urdu mein. Main exact page aur steps bataunga aur wo page khol dunga.",
    none: "Ye mujhe nahi mila. Doosre lafz try karein (jaise: logo, video, phone number, event, article, enquiry, delete file) ya neeche se chunein.",
    open: "Kholein",
    also: "Mutaliq",
  },
};

export function copyFor(lang) {
  return COPY[lang === "en" ? "en" : "ru"];
}

export function topicView(t, lang) {
  const l = lang === "en" ? "en" : "ru";
  return { id: t.id, title: t[l].title, steps: t[l].steps, where: t.where, href: t.href, hl: t.hl };
}

// Built-in answer. Always returns the same shape as the AI answer.
export function guideAnswer(query, lang = detectLang(query)) {
  const c = copyFor(lang);
  const found = findTopics(query, 2);
  if (!found.length) return { reply: c.none, steps: [], actions: [], suggestions: SUGGESTIONS[lang === "en" ? "en" : "ru"], source: "guide", lang };
  const main = topicView(found[0], lang);
  const actions = found.map((t) => {
    const v = topicView(t, lang);
    return { label: `${c.open}: ${v.where}`, href: v.href, hl: v.hl, id: v.id };
  });
  return { reply: main.title, steps: main.steps, actions, source: "guide", lang };
}

export const ALLOWED_HREFS = new Set(TOPICS.map((t) => t.href).concat(["/admin"]));
