// ============================================================
// CareerHub Pakistan — gemini-chatbot.js  (FIXED v2)
// Floating AI chatbot powered by Google Gemini via Cloudflare Function
// ============================================================

const CHAT_ENDPOINT = '/api/gemini-chat';

// Build context from CMS data (safe — handles missing data)
function buildContext() {
  const d = window.CMS_DATA || {};
  const s = (d.Scholarships || []).slice(0, 5).map(x => `- ${x.title} (${x.country || ''}, ${x.funding || ''}, deadline: ${x.deadline || 'TBD'})`).join('\n');
  const j = (d.Jobs || []).slice(0, 5).map(x => `- ${x.title} (${x.type || ''}, ${x.location || ''}, salary: ${x.salary || 'N/A'})`).join('\n');
  const e = (d.Exams || []).slice(0, 4).map(x => `- ${x.title} (${x.exam_type || ''}, date: ${x.test_date || 'TBD'})`).join('\n');
  const b = (d.Books || []).slice(0, 4).map(x => `- ${x.title} by ${x.author || 'Unknown'} (${x.exam_type || ''})`).join('\n');
  const i = (d.Internships || []).slice(0, 4).map(x => `- ${x.title} at ${x.organization || ''} (${x.stipend || 'N/A'}, ${x.location || ''})`).join('\n');
  return `You are CareerHub AI — a helpful assistant for CareerHub Pakistan. Help users find scholarships, jobs, internships, exam prep resources, and books. Be friendly, concise, and practical. Respond in the same language the user uses (Urdu or English).

Current CareerHub listings:
SCHOLARSHIPS:\n${s || 'Loading…'}
JOBS:\n${j || 'Loading…'}
EXAMS:\n${e || 'Loading…'}
BOOKS:\n${b || 'Loading…'}
INTERNSHIPS:\n${i || 'Loading…'}

Help users find opportunities, prepare for exams, build careers, and navigate CareerHub.`;
}

let chatHistory = [];
let chatbotReady = false;

// ── Toggle panel ─────────────────────────────────────────────
function toggleChatbot() {
  const panel = document.getElementById('chatbotPanel');
  const btn   = document.getElementById('chatbotBtn');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('open', isOpen);
  if (isOpen) {
    document.getElementById('chatbotInput')?.focus();
    if (!chatbotReady) {
      chatbotReady = true;
      appendBotMessage("👋 Hi! I'm <strong>CareerHub AI</strong>. Ask me about scholarships, jobs, exams, or career advice!");
    }
  }
}

// ── Send message ─────────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chatbotInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.disabled = true;

  // Hide suggestion chips after first use
  const sug = document.getElementById('chatbotSuggestions');
  if (sug) sug.style.display = 'none';

  appendUserMessage(text);
  chatHistory.push({ role: 'user', parts: [{ text }] });

  const typingId = appendTyping();

  try {
    const payload = {
      system_instruction: { parts: [{ text: buildContext() }] },
      contents: chatHistory.map(m => ({ role: m.role, parts: m.parts })),
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
    };

    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    removeTyping(typingId);

    if (!res.ok || data.error) {
      const errMsg = data.error || 'Unable to reach AI service.';
      appendBotMessage(`❌ ${errMsg}`);
      // Remove the failed user message from history
      chatHistory.pop();
    } else if (data.reply) {
      chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });
      appendBotMessage(formatBotReply(data.reply));
    } else {
      appendBotMessage('Sorry, no response received. Please try again.');
    }
  } catch (err) {
    removeTyping(typingId);
    appendBotMessage('❌ Network error. Please check your connection.');
    chatHistory.pop();
    console.error('[ChatBot] Error:', err);
  }

  input.disabled = false;
  input.focus();
}

// Simple markdown-to-HTML for bot replies
function formatBotReply(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// ── Quick ask buttons ─────────────────────────────────────────
function quickAsk(text) {
  document.getElementById('chatbotInput').value = text;
  sendChat();
}

// ── DOM helpers ───────────────────────────────────────────────
function appendUserMessage(text) {
  const msgs = document.getElementById('chatbotMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendBotMessage(html) {
  const msgs = document.getElementById('chatbotMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = html;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping() {
  const msgs = document.getElementById('chatbotMessages');
  if (!msgs) return null;
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg bot typing';
  div.id = id;
  div.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) {
  if (id) document.getElementById(id)?.remove();
}

// ── Inject HTML ───────────────────────────────────────────────
function injectChatbot() {
  if (document.getElementById('chatbotPanel')) return;

  document.body.insertAdjacentHTML('beforeend', `
  <button class="chatbot-toggle-btn" id="chatbotBtn" onclick="toggleChatbot()" aria-label="Open AI Chat" title="CareerHub AI">
    <svg class="chat-icon-open" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <svg class="chat-icon-close" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    <span class="chatbot-badge">AI</span>
  </button>

  <div class="chatbot-panel" id="chatbotPanel" role="dialog" aria-label="CareerHub AI Chat">
    <div class="chatbot-header">
      <div class="chatbot-header-info">
        <div class="chatbot-avatar">🤖</div>
        <div>
          <strong>CareerHub AI</strong>
          <span class="chatbot-status">● Online</span>
        </div>
      </div>
      <button class="chatbot-close-btn" onclick="toggleChatbot()" aria-label="Close chat">✕</button>
    </div>
    <div class="chatbot-messages" id="chatbotMessages" role="log" aria-live="polite"></div>
    <div class="chatbot-suggestions" id="chatbotSuggestions">
      <button onclick="quickAsk('Best fully funded scholarships for Pakistan?')">🎓 Scholarships</button>
      <button onclick="quickAsk('How to prepare for MDCAT 2025?')">🩺 MDCAT prep</button>
      <button onclick="quickAsk('Latest government jobs in Pakistan?')">🏛️ Govt jobs</button>
      <button onclick="quickAsk('CSS exam tips and syllabus?')">📋 CSS advice</button>
    </div>
    <div class="chatbot-input-row">
      <input type="text" id="chatbotInput" placeholder="Ask me anything…" 
             onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChat();}" 
             maxlength="500" autocomplete="off"/>
      <button onclick="sendChat()" class="chatbot-send-btn" aria-label="Send message">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>`);
}

// ── Styles ────────────────────────────────────────────────────
function injectChatbotStyles() {
  if (document.getElementById('chatbot-styles')) return;
  const style = document.createElement('style');
  style.id = 'chatbot-styles';
  style.textContent = `
    .chatbot-toggle-btn {
      position: fixed; bottom: 90px; right: 20px;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(99,102,241,0.5);
      z-index: 9998; display: flex; align-items: center; justify-content: center;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .chatbot-toggle-btn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(99,102,241,0.7); }
    .chat-icon-close { display: none; }
    .chatbot-toggle-btn.open .chat-icon-open { display: none; }
    .chatbot-toggle-btn.open .chat-icon-close { display: block; }
    .chatbot-badge {
      position: absolute; top: -4px; right: -4px;
      background: #f59e0b; color: #000; font-size: 0.55rem;
      font-weight: 700; padding: 2px 5px; border-radius: 99px;
    }
    .chatbot-panel {
      position: fixed; bottom: 158px; right: 20px;
      width: 360px; max-height: 530px;
      background: var(--bg-card, #fff);
      border-radius: 18px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      z-index: 9997; display: flex; flex-direction: column;
      overflow: hidden; opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      border: 1px solid var(--border, #e5e7eb);
    }
    .chatbot-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .chatbot-header {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .chatbot-header-info { display: flex; align-items: center; gap: 10px; }
    .chatbot-avatar { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
    .chatbot-status { display: block; font-size: 0.7rem; opacity: 0.85; color: #a7f3d0; margin-top: 1px; }
    .chatbot-close-btn { background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 1.1rem; padding: 4px 6px; border-radius: 6px; transition: background 0.2s; line-height: 1; }
    .chatbot-close-btn:hover { background: rgba(255,255,255,0.15); color: white; }
    .chatbot-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      background: var(--bg-main, #f8fafc);
      min-height: 180px; max-height: 280px;
      scroll-behavior: smooth;
    }
    .chat-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 16px;
      font-size: 0.875rem; line-height: 1.55; word-break: break-word;
    }
    .chat-msg.user {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; align-self: flex-end; border-bottom-right-radius: 4px;
    }
    .chat-msg.bot {
      background: var(--bg-card, #fff); color: var(--text-main, #1a1a2e);
      align-self: flex-start; border-bottom-left-radius: 4px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    }
    .chat-msg.bot a { color: #6366f1; text-decoration: underline; }
    .chat-msg.typing { display: flex; align-items: center; gap: 5px; padding: 14px; }
    .dot { width: 7px; height: 7px; background: #6366f1; border-radius: 50%; animation: dotBounce 1.2s infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dotBounce { 0%,80%,100% { transform:scale(0.6);opacity:0.4; } 40% { transform:scale(1);opacity:1; } }
    .chatbot-suggestions {
      padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 6px;
      background: var(--bg-main, #f8fafc);
      border-top: 1px solid var(--border, #e5e7eb); flex-shrink: 0;
    }
    .chatbot-suggestions button {
      background: var(--bg-card, #fff); border: 1px solid var(--border, #e5e7eb);
      border-radius: 99px; padding: 5px 11px; font-size: 0.75rem;
      cursor: pointer; color: var(--text-main, #374151);
      transition: all 0.2s; font-family: inherit;
    }
    .chatbot-suggestions button:hover { background: #6366f1; color: white; border-color: #6366f1; }
    .chatbot-input-row {
      display: flex; align-items: center; padding: 10px 12px;
      border-top: 1px solid var(--border, #e5e7eb);
      background: var(--bg-card, #fff); gap: 8px; flex-shrink: 0;
    }
    .chatbot-input-row input {
      flex: 1; border: 1.5px solid var(--border, #e5e7eb);
      border-radius: 99px; padding: 9px 16px; font-size: 0.875rem;
      outline: none; background: var(--bg-main, #f8fafc);
      color: var(--text-main, #1a1a2e); transition: border-color 0.2s;
      font-family: inherit;
    }
    .chatbot-input-row input:focus { border-color: #6366f1; }
    .chatbot-input-row input:disabled { opacity: 0.6; cursor: not-allowed; }
    .chatbot-send-btn {
      width: 40px; height: 40px; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none; border-radius: 50%; color: white;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .chatbot-send-btn:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
    @media (max-width: 480px) {
      .chatbot-panel { width: calc(100vw - 24px); right: 12px; bottom: 130px; max-height: 70vh; }
      .chatbot-toggle-btn { bottom: 76px; right: 12px; }
    }
    body.dark .chatbot-panel { background: #1e1e2e; border-color: #374151; }
    body.dark .chatbot-messages { background: #181825; }
    body.dark .chat-msg.bot { background: #2a2a3e; color: #e5e7eb; }
    body.dark .chatbot-input-row { background: #1e1e2e; border-color: #374151; }
    body.dark .chatbot-input-row input { background: #181825; color: #e5e7eb; border-color: #374151; }
    body.dark .chatbot-suggestions { background: #181825; border-color: #374151; }
    body.dark .chatbot-suggestions button { background: #2a2a3e; color: #e5e7eb; border-color: #374151; }
    body.dark .chatbot-close-btn { color: rgba(255,255,255,0.7); }
  `;
  document.head.appendChild(style);
}

// ── Auto-init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectChatbotStyles();
  injectChatbot();
});
