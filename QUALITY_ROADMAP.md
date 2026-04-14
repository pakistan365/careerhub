 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/QUALITY_ROADMAP.md b/QUALITY_ROADMAP.md
new file mode 100644
index 0000000000000000000000000000000000000000..30107c002fcf3e98ac4221a6aefe46d853711a55
--- /dev/null
+++ b/QUALITY_ROADMAP.md
@@ -0,0 +1,178 @@
+# CareerHub Quality & AI Bot Improvement Roadmap
+
+This roadmap focuses on three goals:
+
+1. Make the web app more reliable and user-friendly.
+2. Make the AI Career Bot more helpful and safer.
+3. Correctly handle uploaded content links (especially TeraBox, PDFs, and images).
+
+---
+
+## 1) Product quality upgrades (quick wins)
+
+### UX polish (1-2 days)
+- Add a **global loading state** while sheet data is being fetched.
+- Add **empty-state messages** for each section (jobs, scholarships, internships, books).
+- Add **last-updated timestamp** from sheet data so users trust freshness.
+- Add **link health badges**: Valid, Needs login, Broken (auto checked in backend job).
+
+### Reliability
+- Add client-side URL normalization before rendering links.
+- Add a safe `openExternal(url)` helper so all external links are validated and opened with `rel="noopener noreferrer"`.
+- Add fallback cards when an image fails to load.
+- Cache sheet results for a short TTL (e.g., 5-10 minutes) to reduce failed requests.
+
+### Trust and conversion
+- Add structured source labels on cards: `Official`, `Community Upload`, `Mirror`.
+- Add a **Report broken link** button on each card.
+- Add simple analytics events for: card click, apply click, download click, chat question asked.
+
+---
+
+## 2) AI Career Bot: become more friendly and useful
+
+### Conversation style upgrades
+- Greet users by intent and language (Urdu/English).
+- Ask one clarifying question before giving long answers.
+- End every answer with 2-3 next actions (e.g., "Do you want deadlines only?", "Should I filter fully funded?").
+- Keep answers mobile-first: short bullets + one optional "Show details" section.
+
+### Capability upgrades
+- Add command-style intents:
+  - `find scholarships undergrad germany`
+  - `jobs karachi remote`
+  - `mdcat 30-day plan`
+- Let bot cite from your internal data rows (title + deadline + link) instead of generic suggestions.
+- Add a "save this" action from chat to Favorites.
+
+### Safety and quality
+- Add guardrails: avoid legal/medical certainty, avoid fabricated links.
+- If unsure, bot must say: "I may be wrong, want me to show only verified listings?"
+- Add refusal handling for harmful or non-career requests.
+
+---
+
+## 3) “Train itself” approach (practical and safe)
+
+Use a **feedback loop**, not uncontrolled self-training.
+
+### Recommended architecture
+1. **Collect signals** (with consent):
+   - User question
+   - Bot answer
+   - Clicked result?
+   - Helpful / Not helpful
+2. **Store logs** in a simple table (Cloudflare D1/Supabase).
+3. Build a weekly process to:
+   - Find low-rated answers
+   - Generate improved prompt examples
+   - Review manually
+4. Update:
+   - System prompt
+   - Retrieval ranking rules
+   - FAQ snippets
+
+### Why this is better than direct self-training
+- Prevents model drift and hallucination loops.
+- Keeps quality under your control.
+- Gives measurable KPI improvements (resolution rate, helpfulness score).
+
+---
+
+## 4) Handling TeraBox / PDF / image links properly
+
+Your current flow (sheet has links) is good, but add a **link processing pipeline**.
+
+### A) Normalize and classify URLs
+When reading sheet rows, parse each link and classify:
+- `pdf_direct`
+- `image_direct`
+- `terabox_page`
+- `google_drive`
+- `unknown`
+
+Store fields like:
+- `asset_type`
+- `provider`
+- `direct_url` (if known)
+- `preview_url`
+- `requires_login` (boolean)
+
+### B) Backend resolver endpoint
+Create endpoint: `/api/resolve-link?url=...`
+- Validates URL safely.
+- Detects provider.
+- Returns normalized metadata.
+- Never trusts client-side parsing alone.
+
+Response example:
+```json
+{
+  "provider": "terabox",
+  "assetType": "file_page",
+  "previewable": false,
+  "directDownload": null,
+  "openUrl": "https://www.terabox.com/...",
+  "note": "May require login"
+}
+```
+
+### C) UI behavior by type
+- **Direct PDF**: open in embedded viewer (or new tab fallback).
+- **Image**: show thumbnail and lightbox preview.
+- **TeraBox page**: show provider badge + "Open on TeraBox" + warning if login required.
+- **Unknown**: safe external open only.
+
+### D) Security checks (important)
+- Allowlist protocols: `https:` only.
+- Reject `javascript:`, `data:`, or malformed URLs.
+- Strip tracking params where possible.
+- Run all external links with `target="_blank" rel="noopener noreferrer"`.
+
+### E) Broken link monitor
+Nightly cron job:
+- HEAD/GET check URLs (rate-limited).
+- Mark status in sheet/db: `ok`, `slow`, `broken`, `blocked`.
+- Bot should avoid suggesting `broken` links.
+
+---
+
+## 5) Suggested roadmap by priority
+
+### Phase 1 (this week)
+- URL validator + safe open helper
+- Better bot response style (clarify + next actions)
+- Broken-link report button
+
+### Phase 2 (next 2 weeks)
+- Resolver API for TeraBox/PDF/image links
+- Link classification fields in data model
+- Bot grounding from live sheet data with source citations
+
+### Phase 3 (month)
+- Feedback loop storage and analytics dashboard
+- Weekly prompt/rules tuning process
+- Personalized recommendations (saved interests + past clicks)
+
+---
+
+## 6) KPI targets
+
+Track these to measure improvement:
+- Bot helpfulness score >= 75%
+- Chat-to-click conversion >= 35%
+- Broken-link rate <= 5%
+- Average response time <= 2.5s
+- Repeat users (7-day) +20%
+
+---
+
+## 7) Immediate action checklist
+
+- [ ] Add URL normalize/validate utility shared across card rendering.
+- [ ] Add provider badge rendering (`TeraBox`, `PDF`, `Image`, `Drive`).
+- [ ] Add `/api/resolve-link` stub with domain detection.
+- [ ] Update chatbot prompt style to ask a clarifying question and provide actionable next steps.
+- [ ] Add thumbs up/down feedback under each bot response.
+- [ ] Log feedback + clicked recommendations for weekly quality tuning.
+
 
EOF
)
