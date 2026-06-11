/**
 * Cloudflare Pages Function — AI proposal proxy.
 * Route: /api/generate  (Cloudflare maps functions/api/generate.js automatically)
 *
 * Holds the publisher's Anthropic key server-side so visitors don't need one.
 * Set the secret in: Cloudflare Pages → Settings → Environment variables →
 *   ANTHROPIC_API_KEY = sk-ant-...
 *
 * Safety: the prompt is built HERE from a small, validated payload (package vars
 * + a short instruction). Callers cannot inject arbitrary model bodies, oversized
 * outputs, or a different system prompt. Model is allowlisted; max_tokens capped.
 */

const ALLOWED_MODELS = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"];
const DEFAULT_MODEL = "claude-sonnet-4-6"; // publisher pays — cheaper default; change if you like
const MAX_TOKENS = 4000;

const SYSTEM_PROMPT =
  "You are an expert HR compensation writer for a US legal entity. " +
  "You write clear, warm, professional compensation proposals in GitHub-flavored Markdown " +
  "(headings, bold, tables, bullet lists). Never invent or alter any monetary figures or personal " +
  "details — use only the data provided. Return ONLY the proposal markdown, no commentary.";

function cors(extra) {
  return Object.assign({
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "content-type"
  }, extra || {});
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: cors({ "content-type": "application/json" }) });
}

// GET → availability probe used by the front-end to show "keyless AI detected".
export async function onRequestGet(context) {
  return json({ ok: true, ai: true, configured: !!context.env.ANTHROPIC_API_KEY });
}
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.ANTHROPIC_API_KEY)
      return json({ error: "AI backend is not configured. Set the ANTHROPIC_API_KEY environment variable." }, 500);

    const body = await request.json().catch(() => ({}));
    const vars = (body && typeof body.vars === "object" && body.vars) || {};
    const current = typeof body.current === "string" ? body.current.slice(0, 20000) : "";
    const instruction = (typeof body.instruction === "string" && body.instruction.trim())
      ? body.instruction.slice(0, 2000)
      : "Improve clarity, warmth, and professionalism. Keep all numbers exactly as given.";
    const model = ALLOWED_MODELS.includes(body.model) ? body.model : DEFAULT_MODEL;

    const userMsg =
      "Verified candidate & package data (do not change any value):\n" + JSON.stringify(vars, null, 2) +
      "\n\nCurrent draft to revise (may be empty):\n---\n" + current +
      "\n---\n\nInstruction: " + instruction + "\n\nProduce the full proposal in Markdown.";

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }]
      })
    });

    if (!r.ok) {
      let detail = "";
      try { const j = await r.json(); detail = (j.error && j.error.message) || ""; } catch (e) {}
      return json({ error: "Upstream error " + r.status + (detail ? ": " + detail : "") }, 502);
    }
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return json({ text });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
