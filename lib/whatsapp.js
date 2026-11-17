// Turns a phone number typed on the contact form into a WhatsApp chat link.
// 0300 1234567 -> 923001234567 (Pakistan). A number that already has a country code is kept.
export function whatsappNumber(phone) {
  let d = String(phone || "").replace(/[^\d+]/g, "");
  const plus = d.startsWith("+");
  d = d.replace(/\D/g, "");
  if (!d) return "";
  if (plus) return d;
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) return `92${d.slice(1)}`;
  return d;
}

export function whatsappLink(phone, text) {
  const n = whatsappNumber(phone);
  if (n.length < 8) return "";
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
