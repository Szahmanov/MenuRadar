// netlify/functions/groq.js
// Server-side proxy to Groq. The GROQ_API_KEY lives in Netlify environment
// variables and is NEVER exposed to the browser. The frontend calls /api/groq
// with a messages array and a json flag; the model and limits are fixed here.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function reply(statusCode, payload) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: JSON_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "method_not_allowed" });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return reply(500, {
      error: "missing_groq_key",
      message:
        "GROQ_API_KEY is not configured on the server. Add it in Netlify > Site settings > Environment variables.",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "bad_request" });
  }

  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || !messages.length) {
    return reply(400, { error: "empty_messages" });
  }
  const wantJson = body.json !== false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 2200,
        ...(wantJson ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    });
    clearTimeout(timeout);

    if (res.status === 429) {
      return reply(429, { error: "rate_limited", message: "Groq rate limit reached. Try again shortly." });
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return reply(502, { error: "groq_error", status: res.status, detail: detail.slice(0, 300) });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return reply(200, { content });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err && err.name === "AbortError";
    return reply(aborted ? 504 : 502, { error: aborted ? "timeout" : "fetch_failed" });
  }
};
