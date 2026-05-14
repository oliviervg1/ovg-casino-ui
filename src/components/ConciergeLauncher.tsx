import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ConciergeLauncher() {
  const [cesAvailable, setCesAvailable] = useState(false);

  useEffect(() => {
    setCesAvailable(!!document.querySelector('ces-messenger'));
  }, []);

  if (!cesAvailable) return null;

  return createPortal(
    <button
      type="button"
      aria-label="Talk to concierge"
      className="concierge-launcher"
    >
      <span className="concierge-avatar" aria-hidden="true">✨</span>
      <span className="concierge-text">
        <span className="concierge-title">Talk to concierge</span>
        <span className="concierge-sub">Help, tips, anything</span>
      </span>
      <span className="concierge-chev" aria-hidden="true">›</span>
    </button>,
    document.body
  );
}
