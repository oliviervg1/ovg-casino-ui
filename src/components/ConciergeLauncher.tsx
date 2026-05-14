import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { routeToTheme, type RouteTheme } from '../utils/routeTheme';

const CONCIERGE_AVATARS: Record<RouteTheme, string> = {
  lobby: '✨',
  sweets: '🍭',
  egypt: '𓂀',
  space: '🚀',
  west: '🤠',
  ocean: '🐚',
  jungle: '🌿',
  vampire: '🦇',
  ninja: '🥷',
};

type CesMessengerEl = HTMLElement & { open?: () => void };

function openCesPanel() {
  const cesm = document.querySelector('ces-messenger') as CesMessengerEl | null;
  if (!cesm) return;
  if (typeof cesm.open === 'function') {
    cesm.open();
  } else {
    cesm.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
}

export function ConciergeLauncher() {
  const [cesAvailable, setCesAvailable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const recheck = () => {
      const cesm = document.querySelector('ces-messenger');
      if (!cesm) {
        setCesAvailable(false);
        return;
      }
      // ?no-ces=1 in public/ces-init.js sets display:none on the host. Honour
      // it so the diagnostic continues to hide the entire concierge surface.
      setCesAvailable(getComputedStyle(cesm).display !== 'none');
    };
    recheck();
    // Re-check on ces-messenger-loaded too: handles the race where React
    // mounts before the custom-element upgrade attaches cesm.open (the CES
    // script loads async from gstatic.com), and any case where ?no-ces=1 or
    // a similar mid-session toggle changes the host's visibility after our
    // first check.
    window.addEventListener('ces-messenger-loaded', recheck);
    return () => window.removeEventListener('ces-messenger-loaded', recheck);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen?: boolean }>).detail;
      setIsOpen(!!detail?.isOpen);
    };
    window.addEventListener('ces-chat-open-changed', handler);
    return () => window.removeEventListener('ces-chat-open-changed', handler);
  }, []);

  if (!cesAvailable || isOpen) return null;

  const theme = routeToTheme(location.pathname);
  const avatar = CONCIERGE_AVATARS[theme];

  return createPortal(
    <button
      type="button"
      aria-label="Talk to concierge"
      onClick={openCesPanel}
      className="concierge-launcher"
    >
      <span className="concierge-avatar" aria-hidden="true">{avatar}</span>
      <span className="concierge-text">
        <span className="concierge-title">Talk to concierge</span>
        <span className="concierge-sub">Help, tips, anything</span>
      </span>
      <span className="concierge-chev" aria-hidden="true">›</span>
    </button>,
    document.body
  );
}
