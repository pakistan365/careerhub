// Cloudflare Pages Function — /functions/api/chat-feedback.js
// Stores lightweight chatbot feedback signals for future prompt tuning.

const MAX_TEXT = 1200;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function cleanText(value) {
  return String(value || '').trim().slice(0, MAX_TEXT);
}

async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, 204);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const score = Number(payload?.score);
  if (![-1, 1].includes(score)) {
    return jsonResponse({ error: 'score must be -1 or 1' }, 400);
  }

  const record = {
    id: cleanText(payload?.id),
    page: cleanText(payload?.page),
    score,
    question: cleanText(payload?.question),
    answer: cleanText(payload?.answer),
    ts: cleanText(payload?.ts) || new Date().toISOString(),
  };

  // Optional binding: FEEDBACK_KV (Cloudflare KV namespace)
  if (env.FEEDBACK_KV && record.id) {
    await env.FEEDBACK_KV.put(`chat_feedback:${record.id}`, JSON.stringify(record), {
      expirationTtl: 60 * 60 * 24 * 30, // 30 days
    });
  }

  // Always log for observability, even if KV is not configured.
  console.log('[CareerHub chat feedback]', JSON.stringify(record));

  return jsonResponse({ ok: true });
}

export const onRequestPost = (ctx) => handleRequest(ctx.request, ctx.env);
export const onRequestOptions = (ctx) => handleRequest(ctx.request, ctx.env);
export const onRequest = (ctx) => handleRequest(ctx.request, ctx.env);
