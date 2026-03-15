/**
 * @module WaveCompleteOverlay
 *
 * Brief reward screen shown when a wave is completed. Displays the wave
 * number, gold bonus, interest bonus, and early-start bonus. Automatically
 * fades out after 2 seconds using framer-motion AnimatePresence.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { t } from '../../i18n';

/** Reward breakdown passed from the game loop on wave completion. */
export interface WaveReward {
  /** The wave number that was just completed. */
  wave: number;
  /** Base gold reward for completing the wave. */
  goldReward: number;
  /** Interest bonus from the golden_age relic (0 if not held). */
  interest: number;
  /** Interest rate percentage (e.g. 5 for 5%). */
  interestRate: number;
  /** Early start gold bonus (0 if not applicable). */
  earlyBonus: number;
}

/**
 * Animated overlay that appears briefly after a wave is cleared.
 * Shows reward breakdown, then auto-fades out.
 *
 * @param props.reward - The reward data to display, or null to hide.
 */
export function WaveCompleteOverlay({ reward }: { reward: WaveReward | null }) {
  return (
    <AnimatePresence>
      {reward ? (
        <motion.div
          key={`wave-complete-${reward.wave}`}
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          data-testid="wave-complete-overlay"
        >
          <motion.div
            className="min-w-[300px] rounded-[28px] border-2 border-[#d4af37] bg-[#1a1208]/95 p-8 shadow-2xl backdrop-blur-sm"
            initial={{ scale: 0.7, y: -30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <h2 className="text-center text-3xl font-bold text-[#f5e8cc]">
              {t('wave_complete_title', { wave: reward.wave })}
            </h2>

            <div className="mt-6 flex flex-col gap-3">
              {/* Gold bonus */}
              <motion.div
                className="flex items-center justify-between"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <span className="text-lg text-[#c9b18b]">Wave Bonus</span>
                <span className="text-xl font-bold text-[#facc15]">
                  {t('wave_complete_gold_bonus', { amount: reward.goldReward })}
                </span>
              </motion.div>

              {/* Interest bonus */}
              {reward.interest > 0 ? (
                <motion.div
                  className="flex items-center justify-between"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-lg text-[#c9b18b]">Interest</span>
                  <span className="text-xl font-bold text-[#fde68a]">
                    {t('wave_complete_interest', {
                      amount: reward.interest,
                      rate: reward.interestRate,
                    })}
                  </span>
                </motion.div>
              ) : null}

              {/* Early start bonus */}
              {reward.earlyBonus > 0 ? (
                <motion.div
                  className="flex items-center justify-between"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  <span className="text-lg text-[#c9b18b]">Early Start</span>
                  <span className="text-xl font-bold text-[#34d399]">
                    {t('wave_complete_early_bonus', { amount: reward.earlyBonus })}
                  </span>
                </motion.div>
              ) : null}
            </div>

            {/* Total */}
            <motion.div
              className="mt-5 border-t border-[#6b4a2f] pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-[#f5e8cc]">Total</span>
                <span className="text-2xl font-bold text-[#d4af37]">
                  +{reward.goldReward + reward.interest + reward.earlyBonus}g
                </span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
