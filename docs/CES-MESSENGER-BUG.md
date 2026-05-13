# CES messenger bug report — Chrome Android

Draft bug report we're holding for the CES messenger team. Update the version
info / URLs to match what you want to share publicly before filing.

The workaround referenced below is already shipped in this repo — see
`src/index.css` (the `ces-messenger { … width:144px … }` block) and
`public/ces-init.js` (the `ces-chat-open-changed` listener that toggles the
`.chat-open` class).

---

## Title

`<ces-messenger>` host element intercepts hit-testing across the entire viewport on Chrome Android — page becomes non-interactive

## Summary

On Chrome for Android, `<ces-messenger>`'s shadow DOM contains a `position: fixed` child that escapes the host element's bounding box and causes `document.elementFromPoint(x, y)` to return `<ces-messenger>` for **every coordinate on the visible viewport** — including coordinates far from the launcher bubble, and even while the chat panel is closed. This makes every other tappable element on the embedding page (buttons, links, click handlers) unresponsive: taps land on the messenger, not on the underlying UI. The bubble itself remains tappable. Reproduces only on Chrome Android in our testing — desktop Chrome and desktop Firefox don't show it. iOS Safari untested.

## Reproduction

1. Embed `<ces-messenger>` per the standard integration on a page that has any other tappable UI (buttons, links, `onClick` divs).
2. Open the page in Chrome on Android (recent stable; we tested on a current Pixel-class device, May 2026).
3. Try to tap any UI element other than the messenger bubble.
4. Observe: taps register on the messenger element, not on the underlying button.

A minimal repro is any page mounting `<ces-messenger>` alongside a `<button onclick="alert('hit')">test</button>` placed elsewhere — tapping the button does nothing on Chrome Android.

## Diagnostic

Adding this capture-phase listener and triggering taps reveals what's at the tap coordinates:

```js
document.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  console.log('elementFromPoint:',
    document.elementFromPoint(t.clientX, t.clientY));
}, { capture: true, passive: true });
```

On Chrome Android, the logged element is `<ces-messenger>` regardless of where on the viewport the user taps — including the top-left corner, far from the bubble. On the same page, `document.querySelector('ces-messenger').getBoundingClientRect()` returns a small box (≈bubble-sized), so the over-large hit area is coming from a shadow-DOM descendant, not the host's own layout.

## Expected behavior

When the messenger is in its closed/minimized state, only the visible bubble area should be hit-testable. Taps elsewhere on the viewport should fall through to the host page.

## Actual behavior

The host element captures every tap on the viewport on Chrome Android. The host page is effectively non-interactive except for the bubble itself.

## Likely cause (speculation)

The shadow DOM appears to render an always-mounted container with `position: fixed` covering the viewport — probably either a click-outside-to-close backdrop or a pre-positioned chat panel — without `pointer-events: none` while the chat is closed. Per the shadow-DOM hit-testing model, taps within that fixed child resolve to the host element (encapsulation), so the host appears to "own" the entire viewport for tap purposes.

## Workaround currently deployed

```css
ces-messenger {
  width: 144px !important;
  height: 144px !important;
  overflow: hidden !important;
  transform: translateZ(0) !important;
}
ces-messenger.chat-open {
  width: auto !important;
  height: auto !important;
  overflow: visible !important;
  transform: none !important;
}
```

```js
window.addEventListener('ces-chat-open-changed', (e) => {
  const cesm = document.querySelector('ces-messenger');
  if (!cesm) return;
  if (e.detail?.isOpen) cesm.classList.add('chat-open');
  else cesm.classList.remove('chat-open');
});
```

`transform: translateZ(0)` makes the host a containing block for shadow-DOM `position: fixed` descendants (so they're positioned relative to the host rather than the viewport); `overflow: hidden` then clips them to the bubble-sized host box. The `.chat-open` class — toggled off the `ces-chat-open-changed` event the messenger already dispatches — releases the constraint when the user opens the chat so the panel can expand normally.

This works but is intrusive — host pages shouldn't need to know the messenger's internal shadow-DOM layout to keep the rest of their page interactive.

## Suggested fix

Whichever applies internally:

- If a viewport-spanning element exists in the shadow DOM for click-outside-to-close behavior, gate it with `pointer-events: none` while the chat is closed, and only `pointer-events: auto` while open.
- If the chat panel is mounted-but-hidden via `opacity: 0` / `visibility: hidden`, ensure it carries `pointer-events: none` in that state.
- Audit any always-mounted shadow children with `position: fixed` for missing `pointer-events: none`.

## Environment

- **Library:** `https://www.gstatic.com/ces-console/fast/ces-messenger/ces-messenger.js` (whatever was current on 2026-05-13)
- **Affected browser:** Chrome on Android (recent stable, May 2026)
- **Not affected:** desktop Chrome, desktop Firefox (iOS Safari untested)
- **Embedding:** SPA on Cloud Run; `<ces-messenger>` mounted at `<body>` level alongside the React `<div id="root">`
- **Configuration:** standard — `deployment-id`, `chat-title`, `token-broker-url`, `theme-id="dark"`, `auto-open-chat="false"`, `initial-message="Hello"`
