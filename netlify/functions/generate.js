/**
 * Netlify Function — AI proposal proxy (Netlify equivalent of functions/api/generate.js).
 * Reachable at /api/generate via the redirect in netlify.toml.
 *
 * Set the secret in: Netlify → Site settings → Environment variables →
 *   ANTHROPIC_API_KEY = sk-ant-...
 */

const ALLOWED_MODELS = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"];
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4000;
const SYSTEM_PROMPT =
  "You are an expert HR compensation writer for a US legal entity. " +
  "You write clear, warm, professional compensation proposals in GitHub-flavored Markdown " +
  "(headings, bold, tables, bullet lists). Never invent or alter any monetary figures or personal " +
  "details — use only the data provided. Return ONLY the proposal markdown, no commentary.";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json"
};
const reply = (status, obj) => ({ statusCode: status, headers: CORS, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod === "GET")
    return reply(200, { ok: true, ai: true, configured: !!process.env.ANTHROPIC_API_KEY });
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });

  try {
    if (!process.env.ANTHROPIC_API_KEY)
      return reply(500, { error: "AI backend is not configured. Set the ANTHROPIC_API_KEY environment variable." });

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch (e) {}
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
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system: SYSTEM_PROMPT, messages: [{ role: "user", content: userMsg }] })
    });
    if (!r.ok) {
      let detail = "";
      try { const j = await r.json(); detail = (j.error && j.error.message) || ""; } catch (e) {}
      return reply(502, { error: "Upstream error " + r.status + (detail ? ": " + detail : "") });
    }
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return reply(200, { text });
  } catch (e) {
    return reply(500, { error: String((e && e.message) || e) });
  }
};
