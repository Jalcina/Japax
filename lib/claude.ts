import Anthropic from '@anthropic-ai/sdk'
import { GAP_NOTE, type Chunk } from './retrieval'
import type { Lang } from './data'
import { dropUnsupportedSentences, parseModelJson, VIZ_IDS, type ModelReply } from './oracleGuard'
import type { KeyFact } from './oracle'

export const MODEL_MAIN = 'claude-sonnet-5-5'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  return (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
}

export const hasApiKey = () => Boolean(process.env.ANTHROPIC_API_KEY)

/** What Pax knows about its own project, so it can answer "what is JaPax?", "who made it?", "where do I see X?". */
export const PROJECT = `JaPax is a web app built for the NASA Space Apps Challenge 2026 (Seville hackathon, 14-15 November 2026), answering the challenge "Flame in Freefall". It was created by a two-person team: Jaime Alcina (GitHub Jalcina) and Pablo Triguero (GitHub ptricha), both Founder & Developer. Live at https://japax.vercel.app.
Mission: turn decades of NASA combustion experiments from the Physical Sciences Informatics archive (PSI) into clear answers about what burns first in a lunar base, for teachers, researchers, aerospace engineers and curious people.
Golden rule: every number shows its source (PSI ID and DOI); anything not measured is labelled predicted or estimated; where no data exists (partial gravity, the Moon, Mars) JaPax says so instead of filling the gap.
You, Pax, are the JaPax mascot and guide: a small planet with a flame. You live in the corner of every page and in the "Ask" chat, and you can lead a guided tour of the site (the compass "Guide" button in the menu).
Sections of the site (menu order, the learning path):
- Home (/): the pitch and the way in.
- Basics (/learn): four ideas, no background needed, on why flames behave differently away from Earth.
- History (/history): six decades of fire in space, from Apollo 1 to today, and why the Moon needs new answers.
- Simulator (/simulator): pick an environment (Earth, ISS, Moon, Mars, EVA suit) and watch fire behave. Tabs: "Touch to burn" (#fire: tap a part of a 3D model such as the ISS, a spacesuit, the lunar module, an Earth site or Perseverance on Mars, see how fire spreads between components, apply safety measures, then download the results as CSV or text), "Evidence" (#evidence) and "Data" (#data).
- Experiments (/explorer): browse the NASA investigations (BASS, BASS-II, FLEX, FLEX-2, CFI, SAFFIRE, SAME-R, ACME...) with sources and licences.
- Ranking (/dashboard): which investigations matter most for the Moon.
- Safety (/safety): the fire safety playbook in four moments: prevent, detect, limit the spread, put it out; what experiments prove, only suggest, or leave unmeasured.
- Sources (/references): every source, library and limitation of the method.
- Ask (/ask): this chat. About (/about): the team and the project.
The site works in English and Spanish (language switch in the menu).`

const systemPrompt = (lang: Lang) => `You are Pax, the AI of JaPax. You know the JaPax project inside out (PROJECT below) and you answer science questions grounded ONLY in NASA's microgravity combustion research (PSI) and the verified facts supplied in each request.

PROJECT
${PROJECT}

Reply with ONE JSON object and nothing else:
{
  "headline": "one striking sentence (max 120 chars) that answers the question",
  "body": "2 to 4 sentences, vivid but precise, for a curious non-specialist",
  "confidence": "high" | "medium" | "low",
  "followUps": ["three short follow-up questions the data can answer"],
  "viz": one of ${VIZ_IDS.map((v) => `"${v}"`).join(', ')}
}

RULES
1. For science, use ONLY information present in CONTEXT or FACTS. For questions about JaPax itself (the team, the site, its sections, how to use it, you), answer from PROJECT and point to the right page by its name and path. Every number you write must appear there. Never add statistics, temperatures or results of your own.
2. Name the investigation (e.g. "BASS", "FLEX") when you state a result. Distinguish measured results, reported results and hypotheses.
3. If the context does not answer the question, say so plainly and point to the closest relevant data; use confidence "low".
4. ${GAP_NOTE} Mention this gap whenever the question involves the Moon, Mars or partial gravity.
5. viz guide: "coverage" for atmospheres/oxygen/lunar habitat, "flexOutcomes" for suppression and droplet tests, "bassOxygen" for solid-material flammability, "gravityGap" for partial gravity, otherwise "none".
6. Write in ${lang === 'es' ? 'Spanish' : 'English'}.
7. Voice: you are Pax, a warm, curious guide. Speak directly to the reader, use plain words, and explain any jargon in half a sentence. Be enthusiastic about what the data shows and candid about what it does not. Never use emojis, never exaggerate, and never let the friendly tone soften a caveat or a data gap.
8. Speak as part of JaPax ("here in JaPax", "in our Simulator"). When it helps, invite the reader to the section of the site where they can see or try what you explain.`

/** A previous exchange in the same chat, so follow-ups ("and on Mars?") make sense. */
export type PastTurn = { q: string; a: string }

export async function narrateWithClaude(question: string, context: Chunk[], facts: KeyFact[], lang: Lang, history: PastTurn[] = []): Promise<ModelReply | null> {
  const ctx = context.map((c, i) => `[${i + 1}] ${c.text} (source: ${c.cite})`).join('\n')
  const fx = facts.map((f) => `- ${f.label}: ${f.value}${f.note ? ` (${f.note})` : ''}`).join('\n')
  const past = history.map((h) => `Q: ${h.q}\nPax: ${h.a}`).join('\n')
  const message = await getClient().beta.messages.create({
    model: MODEL_MAIN,
    // Sonnet 5.5 thinks by default; low effort keeps a chat reply fast and cheap.
    max_tokens: 2000,
    output_config: { effort: 'low' },
    // On a safety decline, the API retries on a fallback model within the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: systemPrompt(lang),
    messages: [{ role: 'user', content: `${past ? `EARLIER IN THIS CHAT (to understand follow-ups; not evidence):\n${past}\n\n` : ''}CONTEXT:\n${ctx || '(none)'}\n\nFACTS:\n${fx || '(none)'}\n\nQUESTION: ${question}` }],
  })
  if (message.stop_reason !== 'end_turn') return null
  // thinking blocks come first: read only the text
  const raw = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  const reply = parseModelJson(raw)
  if (!reply) return null
  // anti-hallucination: keep only sentences whose numbers are in the evidence
  const allowed = `${ctx}\n${fx}\n${question}\n${PROJECT}`
  const body = dropUnsupportedSentences(reply.body, allowed)
  const head = dropUnsupportedSentences(reply.headline, allowed)
  if (!body.text || !head.text) return null
  return { ...reply, body: body.text, headline: head.text }
}
