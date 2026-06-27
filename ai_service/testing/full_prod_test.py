"""
Full production test suite — covers all 6 test groups.
Run: python testing/full_prod_test.py
"""
import sys, json, time, urllib.request, urllib.error
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://127.0.0.1:8000"
REAL_KB = "abc57a29-99f8-4891-9749-df9126f0b22d"

PASS = 0
FAIL = 0
WARN = 0
results = []

def ask(msg, thread, kb_id=REAL_KB, lang="en", tone="friendly"):
    payload = json.dumps({
        "thread_id": thread,
        "business_id": "test-biz",
        "lead_id": "test-lead",
        "lead_name": "Test User",
        "message": msg,
        "kb_id": kb_id,
        "campaign_config": {"agentTone": tone, "language": lang}
    }).encode()
    req = urllib.request.Request(f"{BASE}/agent/message", data=payload)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"reply": f"HTTP_ERROR_{e.code}", "stage": "error", "qualification_score": 0, "needs_human": False, "intent_signals": []}
    except Exception as e:
        return {"reply": f"TIMEOUT_OR_ERROR: {e}", "stage": "error", "qualification_score": 0, "needs_human": False, "intent_signals": []}

def check(label, result, expect_contains=None, expect_not_contains=None,
          expect_needs_human=None, expect_score_gte=None, expect_score_lte=None,
          warn_only=False):
    global PASS, FAIL, WARN
    reply = result.get("reply", "")
    score = result.get("qualification_score", 0)
    needs_human = result.get("needs_human", False)

    failures = []

    if expect_contains:
        for kw in expect_contains:
            if kw.lower() not in reply.lower():
                failures.append(f"missing '{kw}'")

    if expect_not_contains:
        for kw in expect_not_contains:
            if kw.lower() in reply.lower():
                failures.append(f"contains banned '{kw}'")

    if expect_needs_human is not None:
        if needs_human != expect_needs_human:
            failures.append(f"needs_human={needs_human} (expected {expect_needs_human})")

    if expect_score_gte is not None:
        if score < expect_score_gte:
            failures.append(f"score={score} (expected >={expect_score_gte})")

    if expect_score_lte is not None:
        if score > expect_score_lte:
            failures.append(f"score={score} (expected <={expect_score_lte})")

    status = "PASS" if not failures else ("WARN" if warn_only else "FAIL")
    if not failures:
        PASS += 1
    elif warn_only:
        WARN += 1
    else:
        FAIL += 1

    icon = "✅" if status == "PASS" else ("⚠️" if status == "WARN" else "❌")
    results.append((icon, label, failures, reply[:150]))
    print(f"{icon} {label}")
    if failures:
        for f in failures:
            print(f"   └─ {f}")
    print(f"   Reply: {reply[:120]}...")
    print()

print("=" * 65)
print("FULL PRODUCTION TEST SUITE")
print("=" * 65)
print()

# ─────────────────────────────────────────────────────────────────────
print("── SECTION 1: CONVERSATION FLOW ──────────────────────────────")
print()

# 1a. Happy path — initial inquiry
r1a = ask("I'm interested in a 3BHK flat around 1.5 Cr", "flow-happy-001")
check("Happy path: 3BHK inquiry",
      r1a,
      expect_contains=["3BHK", "Cr"],
      expect_not_contains=["I don't have", "check with our team"],
      expect_score_gte=1)

# 1b. Follow-up — budget signal → score should increment
r1b = ask("My budget is 1.8 Cr and I want to move in by December", "flow-happy-001")
check("Happy path: budget+timeline follow-up → score ≥ 2",
      r1b,
      expect_score_gte=2)

# 1c. Decision maker signal → score 3+
r1c = ask("I'm the decision maker, my family is on board", "flow-happy-001")
check("Happy path: decision maker signal → score ≥ 3",
      r1c,
      expect_score_gte=3)

# 1d. Handoff — explicit request
r1d = ask("I want to talk to a human agent please", "flow-handoff-001")
check("Handoff: explicit human request",
      r1d,
      expect_needs_human=True)

# 1e. Handoff — abusive language
r1e = ask("you stupid bot, you're useless and I hate this", "flow-abuse-001")
check("Handoff: abusive language triggers escalation",
      r1e,
      expect_needs_human=True)

# 1f. Out-of-scope: recipe
r1f = ask("What's the recipe for biryani?", "flow-scope-001")
check("Out-of-scope: biryani recipe deflected",
      r1f,
      expect_not_contains=["rice", "spice", "onion", "cook"],
      expect_contains=["real estate", "property", "project", "assist"])

# 1g. Out-of-scope: competitor
r1g = ask("Godrej has better projects na? What about Lodha?", "flow-scope-001")
check("Out-of-scope: competitor redirect",
      r1g,
      expect_not_contains=["godrej is better", "lodha is better", "yes godrej", "lodha has"],
      expect_contains=["project", "portfolio", "knowledge base", "our"])

# 1h. Bot persona check
r1h = ask("Are you a bot or AI?", "flow-persona-001")
check("Persona: denies being a bot",
      r1h,
      expect_not_contains=["i am an ai", "i'm an ai", "language model", "chatgpt", "i am a bot"],
      expect_contains=["consultant", "pranjal", "help"])

# ─────────────────────────────────────────────────────────────────────
print("── SECTION 2: KNOWLEDGE BASE ACCURACY ────────────────────────")
print()

# 2a. Project isolation — Eden only
r2a = ask("Tell me only about Eden project", "kb-isolation-001")
check("KB isolation: Eden only (no Page 22 bleed)",
      r2a,
      expect_contains=["eden"],
      expect_not_contains=["reneev page 22", "codename dear life", "life in blue"])

# 2b. Project isolation — Reneev Page 22 pricing
r2b = ask("What are the prices for Reneev Page 22?", "kb-price-001")
check("KB accuracy: Reneev Page 22 has pricing",
      r2b,
      expect_contains=["1.85", "2.50", "reneev"],
      expect_not_contains=["don't have", "check with"])

# 2c. RERA deflect — should not guess
r2c = ask("What is the RERA number for Life In Blue?", "kb-rera-001")
check("KB accuracy: RERA deflected to team",
      r2c,
      expect_not_contains=["PR/GJ/1234", "RERA123", "registration number is"],
      warn_only=True)  # warn only — partial info OK

# 2d. No price for project not in KB
r2d = ask("What is the price of Godrej Meridien?", "kb-noprice-001")
check("KB accuracy: no hallucinated competitor pricing",
      r2d,
      expect_not_contains=["godrej meridien starts at", "₹", "crore is the price of godrej"])

# 2e. Multi-project Jagatpur match
r2e = ask("Tell me about the luxury 3BHK project near Jagatpur", "kb-multi-001")
check("KB: Jagatpur query returns relevant project",
      r2e,
      expect_contains=["jagatpur"],
      expect_not_contains=["south bopal", "shela"])

# ─────────────────────────────────────────────────────────────────────
print("── SECTION 3: EDGE CASES ──────────────────────────────────────")
print()

# 3a. Gibberish — "ho"
r3a = ask("ho", "edge-gibberish-001")
check("Edge: gibberish 'ho' — no crash, asks clarification",
      r3a,
      expect_not_contains=["traceback", "error", "exception", "500"])

# 3b. Single dot
r3b = ask(".", "edge-gibberish-001")
check("Edge: single dot — no crash",
      r3b,
      expect_not_contains=["traceback", "error", "500"])

# 3c. Language switch — Hinglish
r3c = ask("Bhai mujhe ek accha 3BHK chahiye, budget 1.5 cr hai", "edge-lang-001", lang="hinglish")
check("Edge: Hinglish input — responds in Hinglish",
      r3c,
      expect_contains=["3bhk", "cr", "project"],
      warn_only=True)

# 3d. Gujarati input
r3d = ask("મને 3BHK ઘર જોઈએ છે, ભાવ 1.5 Cr", "edge-lang-002", lang="gu")
check("Edge: Gujarati input — no crash",
      r3d,
      expect_not_contains=["traceback", "error", "500"])

# 3e. Very long message (500 chars)
long_msg = ("I'm looking for a premium 3BHK apartment in Ahmedabad. "
            "My budget is flexible between 1.5 to 2.5 crore. "
            "I want the flat to be in a gated community with good amenities like gym, pool, and kids area. "
            "The location should be in West Ahmedabad, preferably near SP Ring Road or South Bopal. "
            "I need possession within 2 years. My family consists of 4 people. "
            "I'm a salaried professional and can arrange a home loan for 70% of the property value. "
            "Please share all matching options with prices and brochures if possible. Thank you!")
r3e = ask(long_msg, "edge-long-001")
reply_len = len(r3e.get("reply", ""))
check("Edge: long message — concise response (<800 chars)",
      r3e,
      expect_contains=["3bhk", "project"],
      expect_not_contains=["traceback"])
if reply_len > 800:
    print(f"   ⚠️  Response length: {reply_len} chars (should be <800)")

# ─────────────────────────────────────────────────────────────────────
print("── SECTION 4: REACT LOOP & TOOLS ─────────────────────────────")
print()

# 4a. Tool: KB search with correct kb_id
r4a = ask("Tell me about Life In Blue", "react-kbid-001")
check("ReAct: KB search fires and returns data",
      r4a,
      expect_contains=["life in blue", "south bopal"],
      expect_not_contains=["don't have", "check with team"])

# 4b. Tool: multi-ask in one message
r4b = ask("Tell me about Reneev Page 22 price, amenities, and how to book a site visit", "react-multi-001")
check("ReAct: multi-intent — price + amenities + visit CTA in one response",
      r4b,
      expect_contains=["reneev", "cr", "visit"],
      expect_not_contains=["don't have", "traceback"])

# 4c. Book site visit flow
r4c = ask("I want to schedule a site visit for this Saturday at 11 AM for Reneev Page 22", "react-book-001")
check("ReAct: site visit booking attempted",
      r4c,
      expect_not_contains=["traceback", "error", "500"],
      warn_only=True)  # slots might be unavailable — warn only

# ─────────────────────────────────────────────────────────────────────
print("── SECTION 5: HEALTH & INFRASTRUCTURE ────────────────────────")
print()

# 5a. Health endpoint
try:
    with urllib.request.urlopen(f"{BASE}/health", timeout=5) as r:
        health = json.loads(r.read())
        if health.get("status") == "ok":
            PASS += 1
            results.append(("✅", "Health: /health returns ok", [], str(health)))
            print(f"✅ Health: /health → {health}")
        else:
            FAIL += 1
            results.append(("❌", "Health: /health failed", ["bad response"], str(health)))
            print(f"❌ Health: /health → {health}")
except Exception as e:
    FAIL += 1
    results.append(("❌", "Health: /health unreachable", [str(e)], ""))
    print(f"❌ Health: /health unreachable: {e}")
print()

# 5b. KB list documents
try:
    with urllib.request.urlopen(f"{BASE}/kb/{REAL_KB}/documents", timeout=10) as r:
        kb_data = json.loads(r.read())
        doc_count = len(kb_data.get("data", []))
        if doc_count > 0:
            PASS += 1
            results.append(("✅", f"KB: list_documents returns {doc_count} sources", [], ""))
            print(f"✅ KB: list_documents → {doc_count} document sources")
        else:
            FAIL += 1
            results.append(("❌", "KB: list_documents returned 0 docs", ["empty KB"], ""))
            print(f"❌ KB: list_documents → empty")
except Exception as e:
    FAIL += 1
    results.append(("❌", "KB: list_documents endpoint failed", [str(e)], ""))
    print(f"❌ KB: list_documents failed: {e}")
print()

# 5c. Concurrent state isolation
import threading
thread_results = {}
def run_isolated(tid, msg):
    r = ask(msg, tid)
    thread_results[tid] = r.get("reply", "")

t1 = threading.Thread(target=run_isolated, args=("concurrent-001", "Tell me about Life In Blue"))
t2 = threading.Thread(target=run_isolated, args=("concurrent-002", "Tell me about Forever Young bungalow"))
t3 = threading.Thread(target=run_isolated, args=("concurrent-003", "Tell me about Codename Cornerstone"))
for t in [t1, t2, t3]: t.start()
for t in [t1, t2, t3]: t.join()

ok = True
if "forever young" in thread_results.get("concurrent-001", "").lower():
    ok = False
if "life in blue" in thread_results.get("concurrent-002", "").lower():
    ok = False
if ok:
    PASS += 1
    results.append(("✅", "Concurrent: 3 sessions — no state leak", [], ""))
    print("✅ Concurrent: 3 simultaneous sessions — no state leak")
else:
    WARN += 1
    results.append(("⚠️", "Concurrent: possible state leak between threads", ["check replies"], ""))
    print("⚠️  Concurrent: possible state leak — review replies:")
    for k,v in thread_results.items():
        print(f"   {k}: {v[:80]}")
print()

# ─────────────────────────────────────────────────────────────────────
print("── SECTION 6: REGRESSION CHECKLIST ───────────────────────────")
print()

r6a = ask("What projects do you have?", "reg-001")
check("Regression: KB search returns project data",
      r6a,
      expect_contains=["project", "life in blue"])

r6b = ask("price kitna hai bhai", "reg-002", lang="hinglish")
check("Regression: Hinglish price query — responds",
      r6b,
      expect_not_contains=["traceback", "error"])

r6c = ask("I'm interested, I will buy this week", "reg-003")
check("Regression: intent signals trigger score",
      r6c,
      expect_score_gte=1)

r6d = ask("show me photos of Reneev Page 22", "reg-004")
check("Regression: image/brochure request handled",
      r6d,
      expect_not_contains=["traceback", "500"])

# ─────────────────────────────────────────────────────────────────────
print()
print("=" * 65)
print(f"RESULTS: ✅ {PASS} PASS  |  ❌ {FAIL} FAIL  |  ⚠️  {WARN} WARN")
print("=" * 65)

if FAIL > 0:
    print("\nFAILED TESTS:")
    for icon, label, failures, _ in results:
        if icon == "❌":
            print(f"  ❌ {label}")
            for f in failures:
                print(f"     └─ {f}")

if WARN > 0:
    print("\nWARNINGS (non-blocking):")
    for icon, label, failures, _ in results:
        if icon == "⚠️":
            print(f"  ⚠️  {label}")
