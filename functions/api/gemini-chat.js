// Cloudflare Pages Function — /functions/api/gemini-chat.js
// Proxies requests to Google Gemini API using server-side API key

const GEMINI_MODEL = 'gemini-2.0-flash';

async function handleRequest(request, env) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'Gemini API key not configured. Add GEMINI_API_KEY in Cloudflare Pages → Settings → Environment Variables.' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      const msg = data?.error?.message || 'Gemini API request failed.';
      return jsonResponse({ error: msg }, upstream.status);
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return jsonResponse({ error: 'No response text from Gemini.' }, 502);
    }

    return jsonResponse({ reply });
  } catch (err) {
    return jsonResponse({ error: 'Server error: ' + err.message }, 500);
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const onRequestPost = (ctx) => handleRequest(ctx.request, ctx.env);
export const onRequestOptions = (ctx) => handleRequest(ctx.request, ctx.env);
export const onRequest = (ctx) => handleRequest(ctx.request, ctx.env);
