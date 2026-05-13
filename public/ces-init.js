// Diagnostic modes (param-gated, no impact on regular users):
//   ?no-ces=1   — hide CES messenger entirely (confirmed CES is the
//                 mobile-tap blocker — d5e5dc3)
//   ?show-ces=1 — outline ces-messenger host in red (confirmed host
//                 element is small, ~bubble-sized — so the blocker is
//                 something CES is injecting elsewhere)
//   ?diag-tap=1 — tap-tracker. Shows a toast on every touchstart with
//                 the element that received it. Reveals what's actually
//                 capturing taps when buttons feel dead.
if (location.search.includes('no-ces')) {
  var diagStyleHide = document.createElement('style');
  diagStyleHide.textContent = 'ces-messenger{display:none!important}';
  document.head.appendChild(diagStyleHide);
} else if (location.search.includes('show-ces')) {
  var diagStyleShow = document.createElement('style');
  diagStyleShow.textContent =
    'ces-messenger{outline:4px solid red!important;background:rgba(255,0,0,0.15)!important;}';
  document.head.appendChild(diagStyleShow);
} else if (location.search.includes('diag-tap')) {
  var diagTapStyle = document.createElement('style');
  diagTapStyle.textContent =
    '#diag-tap-toast{position:fixed;top:0;left:0;right:0;background:#000;color:#0f0;' +
    'padding:8px;z-index:99999;font-family:monospace;font-size:11px;line-height:1.3;' +
    'word-break:break-all;border-bottom:2px solid #0f0;pointer-events:none;}';
  document.head.appendChild(diagTapStyle);
  var ensureToast = function () {
    var t = document.getElementById('diag-tap-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'diag-tap-toast';
      t.textContent = 'tap-tracker armed — tap a button to see what received it';
      document.body.appendChild(t);
    }
    return t;
  };
  var formatEl = function (el) {
    if (!el) return 'null';
    var name = el.tagName || el.nodeName || '?';
    if (el.id) name += '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      name += '.' + el.className.trim().replace(/\s+/g, '.');
    }
    return name;
  };
  var trackTap = function (e) {
    var t = ensureToast();
    var pt = (e.touches && e.touches[0]) || e;
    var x = pt.clientX,
      y = pt.clientY;
    var topEl = document.elementFromPoint(x, y);
    var path = [];
    var cur = topEl;
    while (cur && path.length < 5) {
      path.push(formatEl(cur));
      cur = cur.parentElement;
    }
    t.textContent =
      'TAP @' +
      Math.round(x) +
      ',' +
      Math.round(y) +
      ' → top: ' +
      formatEl(topEl) +
      ' | path: ' +
      path.join(' ‹ ');
  };
  // Capture-phase so we see the element BEFORE any other handler can stop it.
  document.addEventListener('touchstart', trackTap, { capture: true, passive: true });
  document.addEventListener('click', trackTap, { capture: true });
  // Mount the toast as soon as body exists.
  if (document.body) ensureToast();
  else document.addEventListener('DOMContentLoaded', ensureToast);
}

window.addEventListener('ces-messenger-loaded', () => {
  const cesMessenger = document.querySelector('ces-messenger');

  const templateString = `
  <style>
    .game-carousel {
      display: flex;
      overflow-x: auto;
      gap: 12px;
      padding: 10px 4px 14px 4px;
      scrollbar-width: thin;
      scrollbar-color: #475569 transparent;
    }
    .game-carousel::-webkit-scrollbar {
      height: 6px;
    }
    .game-carousel::-webkit-scrollbar-thumb {
      background: #475569;
      border-radius: 4px;
    }
    .game-card {
      min-width: 220px;
      max-width: 240px;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
      flex-shrink: 0;
    }
    .game-card h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: #f8fafc;
      font-family: 'Righteous', sans-serif !important;
      letter-spacing: 0.5px;
    }
    .game-card p {
      font-size: 13.5px;
      color: #cbd5e1;
      margin: 0 0 18px 0;
      flex-grow: 1;
      font-family: 'Inter', sans-serif !important;
      line-height: 1.5;
    }
    .game-card a.play-button {
      display: block;
      background-color: #8b5cf6;
      background-image: linear-gradient(to right, #8b5cf6, #6d28d9);
      color: #fff;
      text-decoration: none;
      text-align: center;
      padding: 10px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-family: 'Inter', sans-serif !important;
      transition: transform 0.2s, opacity 0.2s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .game-card a.play-button:hover {
      transform: translateY(-1px);
      opacity: 0.9;
    }
    .game-card a.play-button:active {
      transform: translateY(1px);
    }
  </style>
  <div class="game-carousel">
    {{#each games}}
    <div class="game-card">
      <h3>{{title}}</h3>
      <p>{{subtitle}}</p>
      <a href="{{uri}}" target="_blank" class="play-button">Play Now</a>
    </div>
    {{/each}}
  </div>`;

  const compiledTemplate = Handlebars.compile(templateString);
  cesMessenger.registerTemplate('game_carousel', compiledTemplate);
});

// Listen for the agent actively ending the session
window.addEventListener('ces-end-session', (event) => {
  const cesm = document.querySelector('ces-messenger');
  console.log("Agent ended the session:", event.detail.endSession);
  try {
    cesm.endSession();
    const p1 = cesm.disconnectWebStream('AGENT_REQUESTED');
    if (p1 && p1.catch) p1.catch((e) => console.error(e));
    const p2 = cesm.clearStorage();
    if (p2 && p2.catch) p2.catch((e) => console.error(e));
    cesm.close();
  } catch (e) {
    console.error("Error during session end:", e);
  }
});

window.addEventListener('ces-chat-open-changed', (event) => {
  const cesm = document.querySelector('ces-messenger');
  if (!event.detail.isOpen) {
    try {
      cesm.endSession();
      const p1 = cesm.disconnectWebStream('USER_REQUESTED');
      if (p1 && p1.catch) p1.catch((e) => console.error(e));
      const p2 = cesm.clearStorage();
      if (p2 && p2.catch) p2.catch((e) => console.error(e));
    } catch (e) {
      console.error("Error during chat close:", e);
    }
  }
});
