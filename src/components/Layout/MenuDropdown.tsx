import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, User as UserIcon, BookOpen, HelpCircle, LogOut } from 'lucide-react';

interface MenuDropdownProps {
  onProfile: () => void;
  onRules: () => void;
  onHelp: () => void;
  onLogout: () => void;
}

interface Item {
  key: string;
  label: string;
  Icon: typeof UserIcon;
  handler: () => void;
}

export function MenuDropdown({ onProfile, onRules, onHelp, onLogout }: MenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  const items: Item[] = [
    { key: 'profile', label: 'Profile', Icon: UserIcon, handler: onProfile },
    { key: 'rules', label: 'Rules', Icon: BookOpen, handler: onRules },
    { key: 'help', label: 'Help', Icon: HelpCircle, handler: onHelp },
    { key: 'logout', label: 'Logout', Icon: LogOut, handler: onLogout },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-lg bg-zinc-900/95 shadow-2xl backdrop-blur-md ring-1 ring-white/10 py-1 z-50"
        >
          {items.map(({ key, label, Icon, handler }) => (
            <li key={key} role="none">
              <button
                role="menuitem"
                type="button"
                onClick={() => { handler(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-white/90 hover:bg-white/10 transition-colors"
              >
                <Icon className="w-4 h-4 opacity-70" />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
