import { NextResponse } from "next/server";
import { buildAnswer } from "@/lib/oracle";
import { hasApiKey, narrateWithClaude, type PastTurn } from "@/lib/claude";
import type { Lang } from "@/lib/data";

// Protects the API budget: each visitor gets a limited number of AI answers per window
// (then the verified-evidence answer, which is free). In-memory, so per server instance.
const AI_LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();
function allowAi(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= AI_LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

export async function POST(req: Request) {
  let question = "";
  let lang: Lang = "en";
  let history: PastTurn[] = [];
  let runContext = "";
  try {
    const body = await req.json();
    question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
    lang = body?.lang === "es" ? "es" : "en";
    // the simulation run the user is looking at (built in the browser from its RunRecord), so Pax can explain it
    runContext = typeof body?.runContext === "string" ? body.runContext.slice(0, 4000) : "";
    if (Array.isArray(body?.history))
      history = (body.history as PastTurn[])
        .filter((h) => typeof h?.q === "string" && typeof h?.a === "string")
        .slice(-2)
        .map((h) => ({ q: h.q.slice(0, 300), a: h.a.slice(0, 600) }));
  } catch {
    /* fall through */
  }
  if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  // Everything factual (numbers, evidence, gaps, links) is built from verified data.
  // A short follow-up ("and on Mars?") is searched together with the previous question.
  const prev = history.at(-1)?.q;
  const query = prev && question.split(/\s+/).length < 8 ? `${prev} ${question}` : question;
  const { answer, context } = buildAnswer(query, lang);

  // With an API key, Claude rewrites the narrative; numbers it cannot support are removed.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (hasApiKey() && allowAi(ip)) {
    try {
      const n = await narrateWithClaude(question, context, answer.keyFacts, lang, history, runContext);
      if (n) {
        const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return NextResponse.json({
          ...answer,
          mode: "ai",
          headline: n.headline,
          body: n.body,
          viz: n.viz !== "none" ? n.viz : answer.viz,
          followUps: n.followUps.length === 3 ? n.followUps : answer.followUps,
          // never more confident than the evidence allows
          confidence: order[n.confidence] < order[answer.confidence] ? n.confidence : answer.confidence,
        });
      }
    } catch (e) {
      // fall back to the evidence answer so the demo never breaks (logged for Vercel)
      console.error("[ask] AI narration failed:", e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json(answer);
}
