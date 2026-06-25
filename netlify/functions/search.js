// netlify/functions/search.js
// Server-side Serper.dev Google Search.
// The SERPER_API_KEY lives in Netlify environment variables and is NEVER
// exposed to the browser. The frontend calls /api/search instead.

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

  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return reply(500, {
      error: "missing_serper_key",
      message:
        "SERPER_API_KEY is not configured on the server. Add it in Netlify > Site settings > Environment variables.",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "bad_request", message: "Invalid JSON body." });
  }

  const query = (body.query || "").toString().trim();
  if (!query) {
    return reply(400, { error: "empty_query", message: "Search query is required." });
  }

  const num = Math.min(Math.max(parseInt(body.num, 10) || 8, 1), 10);
  const gl = (body.gl || "bg").toString().slice(0, 5);
  const hl = (body.hl || "bg").toString().slice(0, 5);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num, gl, hl }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return reply(502, {
        error: "serper_error",
        status: res.status,
        message: "Search provider returned an error.",
        detail: detail.slice(0, 300),
      });
    }

    const data = await res.json();
    const organic = Array.isArray(data.organic)
      ? data.organic.slice(0, num).map((r) => ({
          title: r.title || "",
          link: r.link || "",
          snippet: r.snippet || "",
          position: r.position || null,
        }))
      : [];

    return reply(200, { query, organic });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err && err.name === "AbortError";
    return reply(aborted ? 504 : 502, {
      error: aborted ? "timeout" : "fetch_failed",
      message: aborted ? "Search timed out." : "Could not reach the search provider.",
    });
  }
};
