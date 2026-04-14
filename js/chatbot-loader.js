// CareerHub — chatbot-loader.js
// Loads the chatbot script with a slight delay after page load (performance-friendly)
(function () {
  function loadChatbot() {
    if (document.querySelector('script[src*="gemini-chatbot"]')) return;
    const script = document.createElement('script');
    script.src = 'js/gemini-chatbot.js';
    document.body.appendChild(script);
  }
  // Load during idle time or after 2s — whichever comes first
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadChatbot, { timeout: 2000 });
  } else {
    setTimeout(loadChatbot, 1500);
  }
  // Also load immediately on any user interaction
  ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, loadChatbot, { once: true, passive: true });
  });
})();
