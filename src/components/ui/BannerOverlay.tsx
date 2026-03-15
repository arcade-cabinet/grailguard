/**
 * @module BannerOverlay
 *
 * Animated announcement banner for wave starts, boss entrances, phase
 * changes, and spell casts. Uses framer-motion for slide-down entrance
 * and fade-up exit. Visually distinct per tone: 'holy' = gold/white,
 * 'danger' = red/dark with skull prefix.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { t } from '../../i18n';

/**
 * Renders an animated banner overlay that slides down from the top,
 * stays visible, then fades up when bannerLife expires.
 *
 * @param props.text - The banner message text.
 * @param props.tone - Visual style: 'holy' for gold/decree, 'danger' for red/boss.
 * @param props.life - Remaining life (0 = hidden, >0 = visible).
 * @param props.maxLife - Total duration for opacity normalization.
 */
export function BannerOverlay({
  text,
  tone,
  life,
  maxLife,
}: {
  text: string;
  tone: 'holy' | 'danger';
  life: number;
  maxLife: number;
}) {
  const isVisible = life > 0 && text.length > 0;
  const normalizedLife = Math.max(0, Math.min(1, life / Math.max(0.01, maxLife)));

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          key={text}
          className="pointer-events-none absolute left-0 right-0 top-28 z-30 flex justify-center"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: normalizedLife }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        >
          <motion.div
            className={`min-w-[260px] rounded-[28px] border px-6 py-4 shadow-lg ${
              tone === 'danger'
                ? 'border-[#d77a7a] bg-[#3a1212]/92'
                : 'border-[#d4af37] bg-[#2c2110]/92'
            }`}
            initial={{ scale: 0.85 }}
            animate={{ scale: 0.92 + normalizedLife * 0.08 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <p
              className={`text-center text-[11px] font-bold uppercase tracking-[4px] ${
                tone === 'danger' ? 'text-[#f3b2b2]' : 'text-[#d9c089]'
              }`}
            >
              {tone === 'danger' ? t('hud_banner_danger') : t('hud_banner_decree')}
            </p>
            <p
              className={`mt-1 text-center font-bold ${
                tone === 'danger' ? 'text-[#fff1f1] text-3xl' : 'text-[#fff2d4] text-2xl'
              }`}
            >
              {tone === 'danger' ? `\u2620 ${text}` : text}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
