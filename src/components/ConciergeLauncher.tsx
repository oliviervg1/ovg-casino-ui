import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function ConciergeLauncher() {
  const [cesAvailable, setCesAvailable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCesAvailable(!!document.querySelector('ces-messenger'));
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
