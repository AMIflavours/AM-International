import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { TOPICS, guideAnswer, detectLang, topicView } from "@/lib/adminGuide";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.HELP_BOT_MODEL || "claude-haiku-4-5-20251001";
const hits = new Map(); // user id -> timestamps (simple per-minute limit)

function limited(id) {
  const now = Date.now();
  const list = (hits.get(id) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(id, list);
  return list.length > 15;
}

function knowledge() {
  return TOPICS.map((t) => `- id=${t.id} | ${t.en.title} | page: ${t.where} | steps: ${t.en.steps.join(" ")}`).join("\n");
}

function systemPrompt(lang) {
  const langRule =
    lang === "ur" ? "Answer in Urdu (Urdu script)." : lang === "ru" ? "Answer in Roman Urdu (Urdu written in English letters)." : "Answer in English.";
  return `You are the help assistant inside the admin panel of the A.M International website (flavours and fragrances company). The person asking is a client who manages the website and may not be technical.
${langRule} If the user clearly writes in another language of these (English, Urdu, Roman Urdu), match theirs.
Rules:
- Use ONLY the guide below. Never invent pages, buttons or features. If the guide does not cover it, say so briefly and suggest asking the developer.
- Be short and friendly. Explain in plain words. Give the exact place (menu name > page > card/field) and numbered steps.
- Do not use the characters "—" or "--".
- Never ask for passwords, keys or tokens.
Reply with ONLY a JSON object: {"reply": "one or two sentences", "steps": ["step 1", "step 2"], "topics": ["topic id", "..."]}
"topics" lists the 1 or 2 most relevant guide ids (they become Open buttons). Use [] if none apply.

GUIDE:
${knowledge()}`;
}

async function askAi(message, history, lang) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const msgs = [];
  for (const h of history.slice(-6)) {
    if (h && (h.role === "user" || h.role === "assistant") && typeof h.text === "string") msgs.push({ role: h.role, content: h.text.slice(0, 600) });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  msgs.push({ role: "user", content: message });
  // merge consecutive same-role messages
  const merged = [];
  for (const m of msgs) {
    if (merged.length && merged[merged.length - 1].role === m.role) merged[merged.length - 1].content += "\n" + m.content;
    else merged.push({ ...m });
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: systemPrompt(lang), messages: merged }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = (data.content || []).map((b) => b.text || "").join("");
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const reply = typeof json.reply === "string" ? json.reply.slice(0, 600) : "";
    if (!reply) return null;
    const steps = Array.isArray(json.steps) ? json.steps.filter((x) => typeof x === "string").map((x) => x.slice(0, 300)).slice(0, 8) : [];
    const ids = Array.isArray(json.topics) ? json.topics.filter((x) => typeof x === "string").slice(0, 2) : [];
    const actions = ids
      .map((id) => TOPICS.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => {
        const v = topicView(t, lang);
        return { label: `${lang === "en" ? "Open" : "Kholein"}: ${v.where}`, href: v.href, hl: v.hl, id: v.id };
      });
    return { reply, steps, actions, source: "ai", lang };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (limited(session.id)) return NextResponse.json({ error: "Please wait a minute and ask again." }, { status: 429 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return NextResponse.json({ error: "Type a question." }, { status: 400 });
  const history = Array.isArray(body?.history) ? body.history : [];
  const lang = detectLang(message);

  const ai = await askAi(message, history, lang);
  return NextResponse.json(ai || guideAnswer(message, lang));
}
