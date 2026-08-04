/* Shared site chrome for "When to Use What — Copilot".
   Injects ribbon + header + tabs + footer on every page.
   Mirrors the mfg-365.com family header pattern (adoption / agents sites). */
(function () {
  var pages = [
    { href: "index.html",         label: "Overview" },
    { href: "decision-tree.html", label: "Decision Tree" },
    { href: "chat.html",          label: "Copilot Chat" },
    { href: "cowork.html",        label: "Cowork" },
    { href: "code.html",          label: "Code" },
    { href: "scout.html",         label: "Scout" },
    { href: "custom-agents.html", label: "Custom Agents" },
    { href: "compare.html",       label: "Compare" }
  ];
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (here === "") here = "index.html";

  // Gradient "seed" brand glyph — identical mark family to the other mfg-365 apps.
  function glyph(size, id) {
    return '<span class="brand-glyph" aria-hidden="true">' +
      '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#12B8A6"/><stop offset=".4" stop-color="#2F6BFF"/>' +
      '<stop offset=".7" stop-color="#7C5CFC"/><stop offset="1" stop-color="#E3458E"/>' +
      '</linearGradient></defs>' +
      '<path fill="url(#' + id + ')" d="M50 8C28 8 12 24 12 46c0 8 2 13 5 18-3 5-4 9-4 14 0 0 9-3 14-6 6 4 14 6 23 6 22 0 38-16 38-38C88 24 72 8 50 8zm0 14a7 7 0 110 14 7 7 0 010-14zM34 50a5 5 0 015-5h22a5 5 0 015 5c0 8-7 15-16 15s-16-7-16-15z"/>' +
      '</svg></span>';
  }

  var tabs = pages.map(function (p) {
    var active = p.href.toLowerCase() === here ? " is-active" : "";
    return '<a class="tab' + active + '" href="' + p.href + '">' + p.label + "</a>";
  }).join("");

  var navHTML =
    '<header class="site-header">' +
      '<a class="brand" href="index.html">' + glyph(34, "gbHead") +
        '<span class="brand-text"><strong>When to Use What &middot; Copilot</strong>' +
        '<span>A Microsoft Copilot decision guide</span></span>' +
      '</a>' +
      '<a class="header-cta" href="https://adoption.microsoft.com/en-us/copilot/" target="_blank" rel="noopener">Copilot adoption &rarr;</a>' +
    '</header>' +
    '<nav class="tabs" role="tablist" aria-label="Guide sections">' + tabs + '</nav>';

  var footHTML =
    '<footer class="footer"><div class="container"><div class="foot-grid">' +
      '<div><div class="brand">' + glyph(26, "gbFoot") +
        '<span style="color:#fff;font-weight:700">When to Use What &middot; Copilot</span></div>' +
        '<p style="color:rgba(255,255,255,.7);margin:.6rem 0 0;max-width:44ch">Pick the right Copilot surface for the job — from a quick chat to an always-on agent.</p></div>' +
      '<div><strong style="color:#fff">Learn more</strong><br>' +
        '<a href="https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/" target="_blank" rel="noopener">Copilot Cowork on Learn</a><br>' +
        '<a href="https://support.microsoft.com/en-us/Microsoft-365-Copilot/how-copilot-chat-works-with-and-without-a-microsoft-365-copilot-license" target="_blank" rel="noopener">Copilot Chat with / without a license</a><br>' +
        '<a href="https://adoption.microsoft.com/en-us/copilot/" target="_blank" rel="noopener">Copilot Adoption Hub</a></div>' +
      "</div>" +
      '<p class="disclaimer">A decision aid for choosing among Microsoft Copilot surfaces. ' +
      'Product capabilities, naming, pricing and availability change frequently &mdash; always confirm against current Microsoft documentation. ' +
      'Not an official Microsoft product page. Part of the mfg-365.com site collection.</p>' +
    "</div></footer>";

  function mount() {
    var n = document.getElementById("site-nav");
    var f = document.getElementById("site-footer");
    if (n) n.innerHTML = '<div class="ribbon"></div>' + navHTML;
    if (f) f.innerHTML = footHTML;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
