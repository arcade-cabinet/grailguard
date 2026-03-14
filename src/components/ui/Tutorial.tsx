/**
 * @module Tutorial
 *
 * Step-by-step onboarding overlay for first-time players. Renders a
 * semi-transparent dark backdrop with a spotlight cutout around the
 * target UI element for each step. Five tutorial steps walk the player
 * through wall placement, militia hut, wave start, gold economy, and
 * lumber/track logistics.
 *
 * Tutorial state is persisted via the `tutorialComplete` field in
 * settingsRepo. The overlay only appears when `tutorialComplete` is false.
 */
import { useState } from 'react';
import { updateSettings } from '../../db/meta';
import { t } from '../../i18n';

/**
 * Individual tutorial step definition.
 */
interface TutorialStep {
  /** i18n key for the step instruction text. */
  textKey:
    | 'tutorial_step_1'
    | 'tutorial_step_2'
    | 'tutorial_step_3'
    | 'tutorial_step_4'
    | 'tutorial_step_5';
  /** Emoji or icon displayed above the instruction. */
  icon: string;
}

const STEPS: TutorialStep[] = [
  { textKey: 'tutorial_step_1', icon: '🧱' },
  { textKey: 'tutorial_step_2', icon: '🏚️' },
  { textKey: 'tutorial_step_3', icon: '⚔️' },
  { textKey: 'tutorial_step_4', icon: '🪙' },
  { textKey: 'tutorial_step_5', icon: '🪵' },
];

/**
 * Tutorial overlay component that guides new players through the first
 * five key actions of a Grailguard run.
 *
 * @param props.visible - Whether the tutorial should be displayed.
 * @param props.onDismiss - Callback fired when the tutorial is completed or skipped.
 */
export function Tutorial({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);

  if (!visible) return null;

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleDismiss();
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const handleDismiss = () => {
    void updateSettings({ tutorialComplete: true });
    onDismiss();
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(10, 8, 6, 0.85)', zIndex: 9999 }}
      role="alert"
      aria-label={t(currentStep.textKey)}
    >
      {/* Spotlight circle hint */}
      <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#d4af37]/60 bg-[#d4af37]/15">
        <span className="text-5xl">{currentStep.icon}</span>
      </div>

      {/* Step counter */}
      <p className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
        {stepIndex + 1} / {STEPS.length}
      </p>

      {/* Instruction text */}
      <p className="mt-4 max-w-md px-6 text-center text-xl font-semibold leading-7 text-[#f5e8cc]">
        {t(currentStep.textKey)}
      </p>

      {/* Step indicator dots */}
      <div className="mt-6 flex flex-row gap-2">
        {STEPS.map((_, i) => (
          <div
            key={`dot-${i}`}
            className={`h-2.5 w-2.5 rounded-full ${
              i === stepIndex ? 'bg-[#d4af37]' : 'bg-[#6b4a2f]'
            }`}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex flex-row gap-4">
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-xl border border-[#8b6b45] bg-transparent px-6 py-3"
          aria-label={t('tutorial_btn_skip')}
        >
          <span className="font-bold text-[#c9b18b]">{t('tutorial_btn_skip')}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="rounded-xl border border-[#d4af37] bg-[#4a3b22] px-8 py-3"
          aria-label={isLastStep ? t('tutorial_btn_done') : t('tutorial_btn_next')}
        >
          <span className="font-bold text-[#f7ebd0]">
            {isLastStep ? t('tutorial_btn_done') : t('tutorial_btn_next')}
          </span>
        </button>
      </div>
    </div>
  );
}
