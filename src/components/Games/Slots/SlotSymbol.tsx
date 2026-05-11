import { motion } from 'motion/react';

export interface SlotSymbolProps {
  /** Either a Gemini signed URL (https://...) or an emoji/text fallback. */
  src: string;
  /** Accessibility label. */
  alt: string;
  /** True when this symbol is part of a winning payline; adds ring + scale pulse. */
  winning?: boolean;
}

const URL_RE = /^https?:\/\//;

export function SlotSymbol({ src, alt, winning = false }: SlotSymbolProps) {
  const isUrl = URL_RE.test(src);
  return (
    <motion.div
      data-testid="slot-symbol"
      data-winning={winning ? 'true' : 'false'}
      animate={winning ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: winning ? 3 : 0 }}
      className={`w-full h-full flex items-center justify-center overflow-hidden ${winning ? 'ring-[0.5vh] ring-yellow-400' : ''}`}
    >
      {isUrl ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span aria-label={alt}>{src}</span>
      )}
    </motion.div>
  );
}
