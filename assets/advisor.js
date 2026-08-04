/* ============================================================================
   Copilot "When to Use What" — Advisor
   ---------------------------------------------------------------------------
   Hybrid recommendation engine.

   PHASE 1 (this file, always active): a deterministic, client-side scoring
   engine. Zero infrastructure, zero API keys, works offline, cannot leak
   credentials, and never rate-limits. This is also the permanent fallback.

   PHASE 2 (optional): if window.ADVISOR_CONFIG.endpoint is set, the result is
   sent to a serverless function that holds the model key SERVER-SIDE and
   returns a richer, conversational explanation. Any failure — network, rate
   limit, cold start, bad JSON — silently degrades to the Phase 1 answer, so
   the box never breaks.
   ========================================================================= */
(function () {
  "use strict";

  var CONFIG = window.ADVISOR_CONFIG || {};
  var LLM_ENDPOINT = CONFIG.endpoint || "";      // empty => pure Phase 1
  var LLM_TIMEOUT = CONFIG.timeoutMs || 8000;

  /* ---------------------------------------------------------------- surfaces */
  var SURFACES = {
    chat: {
      id: "chat", name: "M365 Copilot Chat", href: "chat.html", cls: "out-chat", emoji: "\uD83D\uDCAC",
      tagline: "Ask, find, draft or analyze one thing — you in the loop.",
      access: "Broadly available — home base for the whole org"
    },
    cowork: {
      id: "cowork", name: "Copilot Cowork", href: "cowork.html", cls: "out-cowork", emoji: "\uD83E\uDD1D",
      tagline: "Multi-artifact, multi-step work across M365 — you approve the actions.",
      access: "Licensed users — often rolled out after Chat"
    },
    code: {
      id: "code", name: "Copilot Code", href: "code.html", cls: "out-code", emoji: "\uD83D\uDCBB",
      tagline: "Natural-language software building, local or cloud.",
      access: "Licensed users — developer-focused"
    },
    scout: {
      id: "scout", name: "Microsoft Scout", href: "scout.html", cls: "out-scout", emoji: "\uD83E\uDD16",
      tagline: "Always-on agent that runs habits and automations and coordinates your day.",
      access: "Licensed users — the autopilot tier"
    },
    agent: {
      id: "agent", name: "a Custom Agent", href: "custom-agents.html", cls: "out-agent", emoji: "\uD83E\uDDE9",
      tagline: "Package a repeatable workflow as a governed, shareable capability.",
      access: "Built in Agent Builder or Copilot Studio"
    }
  };

  /* Chat sub-modes, surfaced as a secondary hint when Chat wins. */
  var CHAT_MODES = [
    { id: "researcher", label: "Researcher agent", rx: /\b(deep research|research|literature|competitive landscape|market scan|investigate|sources|cite|citation)\b/i,
      why: "deep, multi-source research with citations" },
    { id: "analyst", label: "Analyst agent", rx: /\b(analy[sz]e|analysis|data|dataset|spreadsheet|excel|numbers|metrics|trend|forecast|statistic|chart)\b/i,
      why: "reasoning step-by-step over data" },
    { id: "notebook", label: "Notebook", rx: /\b(notebook|working set|ongoing|long-running|project|corpus|pinned|same sources|keep refining)\b/i,
      why: "grounding a reusable, curated working set" },
    { id: "create", label: "Create", rx: /\b(image|images|picture|graphic|visual|logo|illustration|design|art)\b/i,
      why: "generating visual and creative content" },
    { id: "search", label: "Search", rx: /\b(find|search|look up|where is|locate|which document|who knows|what'?s our)\b/i,
      why: "finding and synthesizing an answer" }
  ];

  /* ------------------------------------------------------------------ signals
     Each signal adds weight to one or more surfaces. Weights are tuned so that
     a single strong signal (e.g. "every Monday") beats several weak ones.     */
  var SIGNALS = [
    /* --- Code ------------------------------------------------------------ */
    { rx: /\b(code|coding|script|scripting|program|programming|app|application|api|repo|repository|debug|refactor|function|python|javascript|typescript|c#|java|sql|powershell|bash|pipeline|deploy|build a tool|software|website|web ?app|unit test)\b/i,
      w: { code: 10 }, label: "building software" },
    { rx: /\b(bug|stack trace|compile|runtime error|git|pull request|codebase)\b/i,
      w: { code: 7 }, label: "working in a codebase" },
    { rx: /\b(dashboard|endpoint|webhook|database|backend|front[- ]?end|integration|connector|cron|query|schema|json|rest\b|sdk|library|framework|stand up a|spin up a)\b/i,
      w: { code: 8 }, label: "software components" },

    /* --- Scout (always-on / scheduled / autonomous) ---------------------- */
    { rx: /\b(every (morning|day|week|monday|tuesday|wednesday|thursday|friday|month)|daily|weekly|recurring|on a schedule|scheduled|automatically|automate|always[- ]on|24\/7|ongoing basis|each (day|week|morning))\b/i,
      w: { scout: 9, cowork: 4 }, label: "runs on a schedule" },
    { rx: /\b(while i'?m (away|out|asleep|offline)|when i'?m (away|not|out)|not at my desk|overnight|in the background|without me|on its own|unattended|monitor|monitoring|watch for|keep an eye on|notify me when|alert me|going forward|from now on|on an ongoing basis)\b/i,
      w: { scout: 10 }, label: "runs on its own while you're away" },
    { rx: /\b(manage my day|coordinate my day|my calendar for me|handle my (calendar|scheduling|inbox)|book time with me|others can|on my behalf|assistant that|triage my|for me going forward)\b/i,
      w: { scout: 9 }, label: "always-on coordination" },

    /* --- Cowork (multi-artifact, multi-step, takes action) --------------- */
    { rx: /\b(and (also |then )?(a|an|create|make|build|draft)|plus a|as well as a|along with a|multiple (files|documents|artifacts|outputs|deliverables)|several (files|documents|artifacts|outputs)|deck and|doc and|report and|,\s*(a|an)\s+\w+[- ]?\w*\s+and)\b/i,
      w: { cowork: 9 }, label: "several artifacts in one task" },
    { rx: /\b(one[- ]pager|slides|write[- ]?up|write it up|summary and|memo and|spreadsheet and)\b/i,
      w: { cowork: 5 }, label: "additional deliverables" },
    { rx: /\b(deck|presentation|powerpoint|slides)\b/i, w: { cowork: 3, chat: 1 }, label: "produces a deck" },
    { rx: /\b(prep(are)? for (a |my |the )?(customer |client |exec |executive )?(meeting|call|review|qbr)|briefing (doc|document|pack)|meeting prep|pre[- ]read|leadership[- ]ready|client[- ]ready|everything i need for|ready for (the |my )?(qbr|business review))\b/i,
      w: { cowork: 8 }, label: "assembling a briefing package" },
    { rx: /\b(send (it|the|an|out|them)|email (it|them|the team)|post (it|to|in) teams|schedule (a|the) meeting|book (a|the) meeting|reply to (all|them)|respond to (all|the|every)|file (it|them)|log them|organi[sz]e my (inbox|files|onedrive|folders)|clean up my (inbox|onedrive|files|folders)|reorgani[sz]e|move (files|emails)|share (it|this|them) with)\b/i,
      w: { cowork: 8 }, label: "takes actions across M365" },
    { rx: /\b(across (systems|sharepoint|onedrive|outlook|teams)|multi[- ]step|end[- ]to[- ]end|workflow|process that|then (send|post|share|save))\b/i,
      w: { cowork: 7 }, label: "multi-step across systems" },
    { rx: /\b(6 months|six months|12 months|twelve months|quarter over quarter|year over year|long time frame|historical|prior period|months of)\b/i,
      w: { cowork: 5, chat: 1 }, label: "broad aggregation over time" },

    /* --- Custom agent (repeatable + shared + governed) ------------------- */
    { rx: /\b(my team can|everyone can|whole team|entire team|all employees|colleagues can|reusable|re-?use|standardi[sz]e|consistent(ly)? (for|across)|self[- ]service|others (can|to) use|other people (can|do not|don'?t)|roll ?out to|company[- ]wide|org[- ]wide|department|sales org|the org can|anyone (can|in)|same way (every|for))\b/i,
      w: { agent: 9 }, label: "many people reuse it" },
    { rx: /\b(same (workflow|process|task|thing) (every|each|again)|over and over|repeatedly|governance|guardrails|permissions|approved sources|policy|compliance|audit|package (this|it)|so (other )?people do ?n'?o?t have to|without re-?prompting|re-?prompt)\b/i,
      w: { agent: 8 }, label: "repeatable and governed" },
    { rx: /\b(build (an|a) agent|custom agent|copilot studio|agent builder|chatbot|bot for)\b/i,
      w: { agent: 10 }, label: "explicitly an agent" },

    /* --- Chat (fast, single, interactive) -------------------------------- */
    { rx: /\b(quick(ly)?|just|simple|fast|right now|real quick|one|a single|short)\b/i,
      w: { chat: 5 }, label: "quick and simple" },
    { rx: /\b(what is|what'?s|who is|explain|summari[sz]e|tell me|help me understand|catch me up|catch up|recap|tl;?dr|brainstorm|ideas|draft an? (email|note|reply|message)|rewrite|reword|translate)\b/i,
      w: { chat: 7 }, label: "ask, summarize or draft one thing" },
    { rx: /\b(find|search|look up|where is|which (doc|file|deck)|locate)\b/i,
      w: { chat: 8 }, label: "finding information" },
    { rx: /\b(analy[sz]e|analysis|research)\b/i, w: { chat: 4, cowork: 2 }, label: "research or analysis" }
  ];

  /* --------------------------------------------------------------- scoring */
  function score(text) {
    var t = " " + String(text || "").toLowerCase().replace(/\s+/g, " ") + " ";
    var s = { chat: 0, cowork: 0, code: 0, scout: 0, agent: 0 };
    var matched = [];

    SIGNALS.forEach(function (sig) {
      if (sig.rx.test(t)) {
        matched.push(sig.label);
        for (var k in sig.w) { if (s.hasOwnProperty(k)) s[k] += sig.w[k]; }
      }
    });

    // Chat is home base: it gets a modest floor so it wins ties and short,
    // ambiguous asks default to the surface everyone actually has.
    s.chat += 3;

    // A custom agent should only surface when reuse is paired with a real
    // workflow — otherwise "my team" phrasing alone hijacks the result.
    if (s.agent > 0 && s.cowork === 0 && s.scout === 0 && s.code === 0) s.agent *= 0.6;

    var ranked = Object.keys(s)
      .map(function (k) { return { id: k, v: s[k] }; })
      .sort(function (a, b) { return b.v - a.v; });

    var top = ranked[0], second = ranked[1];
    var spread = top.v - second.v;

    // Confidence must reflect real evidence, not the Chat floor. If nothing
    // matched, we're guessing — say so rather than showing false certainty.
    var evidence = 0;
    for (var k2 in s) { if (k2 !== "chat") evidence += s[k2]; }
    var confidence;
    if (matched.length === 0) confidence = "low";
    else if (spread >= 6 && (evidence > 0 || matched.length >= 2)) confidence = "high";
    else if (spread >= 3) confidence = "medium";
    else confidence = "low";
    if (!text || text.trim().length < 12) confidence = "low";

    return { ranked: ranked, top: top, second: second, confidence: confidence, matched: matched };
  }

  function chatMode(text) {
    for (var i = 0; i < CHAT_MODES.length; i++) {
      if (CHAT_MODES[i].rx.test(text)) return CHAT_MODES[i];
    }
    return null;
  }

  function recommend(text) {
    var r = score(text);
    var primary = SURFACES[r.top.id];
    var runner = r.second.v > 0 ? SURFACES[r.second.id] : null;
    var mode = r.top.id === "chat" ? chatMode(text) : null;
    return {
      primary: primary, runner: runner, mode: mode,
      confidence: r.confidence, matched: r.matched, scores: r.ranked
    };
  }

  /* ------------------------------------------------------------------- view */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render(res, note) {
    var p = res.primary;
    var why = res.matched.length
      ? "Because your task looks like: " + res.matched.slice(0, 3).join(", ") + "."
      : "Nothing specific stood out, so this is the safe default — it's where most work happens.";

    var html = '<div class="adv-result">';
    html += '<div class="adv-verdict">';
    html += '<span class="adv-conf adv-conf-' + res.confidence + '">' + res.confidence + ' confidence</span>';
    html += '<span class="adv-lead">Start with</span></div>';

    html += '<a class="outcome ' + p.cls + ' big" href="' + p.href + '">' +
              '<span class="em">' + p.emoji + '</span>' +
              '<span class="oc"><strong>' + esc(p.name) + '</strong><span>' + esc(p.tagline) + '</span></span>' +
              '<span class="arw">&rarr;</span></a>';

    html += '<p class="adv-why">' + esc(why) + '</p>';
    html += '<p class="adv-access"><b>Access:</b> ' + esc(p.access) + '</p>';

    if (res.mode) {
      html += '<p class="adv-mode">Inside Chat, try <strong>' + esc(res.mode.label) +
              '</strong> — best for ' + esc(res.mode.why) + '.</p>';
    }

    if (res.runner && res.runner.id !== p.id) {
      html += '<p class="adv-runner"><b>Also consider:</b> <a href="' + res.runner.href + '">' +
              esc(res.runner.name) + '</a> — ' + esc(res.runner.tagline) + '</p>';
    }

    if (res.confidence === "low") {
      html += '<p class="adv-hint">That was a little broad — add what you want produced, ' +
              'how often it runs, and who else uses it for a sharper answer.</p>';
    }

    if (note) html += '<p class="adv-note">' + esc(note) + '</p>';

    html += '<p class="adv-more"><a href="decision-tree.html">Walk the full decision tree &rarr;</a> ' +
            '<a href="compare.html">Compare all surfaces &rarr;</a></p>';
    html += "</div>";
    return html;
  }

  /* ------------------------------------------------- phase 2 (optional LLM) */
  function enhance(text, res, outEl) {
    if (!LLM_ENDPOINT) return;                       // pure Phase 1
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, LLM_TIMEOUT);

    fetch(LLM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: text, suggested: res.primary.id, confidence: res.confidence }),
      signal: ctl.signal
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        clearTimeout(timer);
        if (!data || !data.explanation) return;      // degrade silently
        var el = outEl.querySelector(".adv-why");
        if (el) {
          el.textContent = data.explanation;
          el.classList.add("adv-enhanced");
        }
        if (data.surface && SURFACES[data.surface] && data.surface !== res.primary.id) {
          var badge = outEl.querySelector(".adv-verdict");
          if (badge) badge.insertAdjacentHTML("beforeend",
            '<span class="adv-refined">refined</span>');
        }
      })
      .catch(function () { clearTimeout(timer); /* Phase 1 answer stands */ });
  }

  /* ------------------------------------------------------------------ mount */
  var DIALOG_HTML =
    '<dialog id="advisorDialog" class="adv-dialog" aria-labelledby="advisorTitle">' +
      '<div class="adv-dialog-head">' +
        '<div>' +
          '<p class="eyebrow mb-0">Not sure where to start?</p>' +
          '<h2 id="advisorTitle">Describe your task</h2>' +
        '</div>' +
        '<button type="button" class="adv-close" data-advisor-close aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="adv-dialog-body">' +
        '<form id="advisorForm" class="advisor-row" autocomplete="off">' +
          '<textarea id="advisorInput" rows="1" aria-label="Describe what you\'re trying to do" ' +
            'placeholder="e.g. Prep for my customer meeting: pull emails, calendar and recent files into a briefing doc, an Excel overview and a client-ready deck&hellip;"></textarea>' +
          '<button class="btn btn-primary" type="submit">Recommend &rarr;</button>' +
        '</form>' +
        '<div class="advisor-ex">' +
          '<span class="lbl">Try</span>' +
          '<button class="ex-chip" type="button" data-advisor-example="Summarize what I missed in yesterday\'s meetings">Catch up on meetings</button>' +
          '<button class="ex-chip" type="button" data-advisor-example="Prep for my customer meeting: pull emails, calendar and recent files into a briefing doc, an Excel overview and a client-ready deck">Prep a customer meeting</button>' +
          '<button class="ex-chip" type="button" data-advisor-example="Send me a status summary every Monday morning automatically while I\'m away">Run every Monday</button>' +
          '<button class="ex-chip" type="button" data-advisor-example="Build a small web app that tracks our project intake">Build an app</button>' +
          '<button class="ex-chip" type="button" data-advisor-example="My whole team needs to run the same onboarding workflow the same way every time with approved sources">A tool for my team</button>' +
        '</div>' +
        '<div id="advisorOut" hidden></div>' +
      '</div>' +
      '<div class="adv-dialog-foot">' +
        '<span><kbd>Enter</kbd> to recommend &middot; <kbd>Shift</kbd>+<kbd>Enter</kbd> newline &middot; <kbd>Esc</kbd> to close</span>' +
        '<span class="adv-privacy">Runs in your browser</span>' +
      '</div>' +
    '</dialog>';

  function init() {
    // Inject the dialog once, on every page.
    if (!document.getElementById("advisorDialog")) {
      document.body.insertAdjacentHTML("beforeend", DIALOG_HTML);
    }
    var dlg = document.getElementById("advisorDialog");
    var form = document.getElementById("advisorForm");
    if (!dlg || !form) return;
    var input = document.getElementById("advisorInput");
    var out = document.getElementById("advisorOut");

    // Grow the textarea to fit its content, up to the CSS max-height.
    // scrollHeight excludes borders, but box-sizing is border-box, so add them
    // back or the element ends up ~2px short and shows a phantom scrollbar.
    var MAXH = 200;
    function autosize() {
      var cs = window.getComputedStyle(input);
      var borders = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      input.style.height = "auto";
      var want = input.scrollHeight + borders;
      input.style.height = Math.min(want, MAXH) + "px";
      input.style.overflowY = want > MAXH ? "auto" : "hidden";
    }

    function run(text) {
      if (!text || !text.trim()) { out.innerHTML = ""; out.hidden = true; return; }
      var res = recommend(text);
      out.innerHTML = render(res);
      out.hidden = false;
      enhance(text, res, out);
    }

    function open(prefill) {
      if (typeof prefill === "string" && prefill) input.value = prefill;
      if (dlg.showModal) { if (!dlg.open) dlg.showModal(); }
      else dlg.setAttribute("open", "");    // very old browsers
      autosize();
      setTimeout(function () { input.focus(); }, 30);
    }
    function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }

    input.addEventListener("input", autosize);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(input.value); }
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); run(input.value); });

    // Close: the X, and clicking the backdrop outside the panel.
    dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-advisor-close]")) { close(); return; }
      if (e.target === dlg) close();      // native dialog backdrop click
    });

    var chips = dlg.querySelectorAll("[data-advisor-example]");
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener("click", function () {
        input.value = this.getAttribute("data-advisor-example");
        autosize();
        run(input.value);
      });
    }

    // Any element on any page can open it.
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-advisor-open]");
      if (!t) return;
      e.preventDefault();
      open(t.getAttribute("data-advisor-prefill"));
    });

    window.CopilotAdvisor.open = open;
    window.CopilotAdvisor.close = close;
    autosize();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // exposed for testing
  window.CopilotAdvisor = { recommend: recommend, score: score };
})();
