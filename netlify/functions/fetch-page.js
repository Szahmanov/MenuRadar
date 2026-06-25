// netlify/functions/fetch-page.js
// Fetches a single public restaurant/menu page and returns readable text.
// Hardened against SSRF: blocks non-http(s), localhost, and private IP ranges.

const cheerio = require("cheerio");

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function reply(statusCode, payload) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) };
}

// Block localhost + private / reserved IP literals.
const BLOCKED_HOST = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
];

function hostIsBlocked(hostname) {
  const h = hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  return BLOCKED_HOST.some((re) => re.test(h));
}

const MAX_BYTES = 2_500_000; // ~2.5MB cap on the HTML we download
const MAX_TEXT = 6500; // chars of body text we hand to the AI

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: JSON_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "method_not_allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "bad_request" });
  }

  const rawUrl = (body.url || "").toString().trim();
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return reply(400, { error: "invalid_url" });
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return reply(400, { error: "unsupported_protocol" });
  }
  if (hostIsBlocked(parsed.hostname)) {
    return reply(403, { error: "blocked_host" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MenuRadarBot/1.0; +https://stagove.example)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("xml")) {
      return reply(200, {
        url: parsed.toString(),
        title: "",
        description: "",
        text: "",
        note: "non_html",
      });
    }

    const declaredLen = parseInt(res.headers.get("content-length") || "0", 10);
    if (declaredLen && declaredLen > MAX_BYTES) {
      return reply(200, {
        url: parsed.toString(),
        title: "",
        description: "",
        text: "",
        note: "too_large",
      });
    }

    const buf = await res.arrayBuffer();
    const html = Buffer.from(buf.slice(0, MAX_BYTES)).toString("utf8");

    const $ = cheerio.load(html);
    $("script, style, noscript, svg, iframe, nav, footer, header, form, button").remove();

    const title = ($("title").first().text() || "").replace(/\s+/g, " ").trim();
    const description = (
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim();

    let text = ($("main").text() || $("body").text() || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TEXT);

    return reply(200, { url: parsed.toString(), title, description, text });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err && err.name === "AbortError";
    return reply(aborted ? 504 : 502, {
      error: aborted ? "timeout" : "fetch_failed",
      url: parsed.toString(),
    });
  }
};
