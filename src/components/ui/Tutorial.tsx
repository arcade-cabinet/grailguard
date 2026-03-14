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
import { Text, TouchableOpacity, View } from 'react-native';
import { updateSettings } from '../../db/meta';
import { t } from '../../i18n';

/**
 * Individual tutorial step definition.
 */
interface TutorialStep {
  /** i18n key for the step instruction text. */
  textKey: 'tutorial_step_1' | 'tutorial_step_2' | 'tutorial_step_3' | 'tutorial_step_4' | 'tutorial_step_5';
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
export function Tutorial({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
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
    <View
      className="absolute inset-0 items-center justify-center"
      style={{ backgroundColor: 'rgba(10, 8, 6, 0.85)', zIndex: 9999 }}
      accessibilityRole="alert"
      accessibilityLabel={t(currentStep.textKey)}
    >
      {/* Spotlight circle hint */}
      <View className="mb-8 h-28 w-28 items-center justify-center rounded-full border-2 border-[#d4af37]/60 bg-[#d4af37]/15">
        <Text className="text-5xl">{currentStep.icon}</Text>
      </View>

      {/* Step counter */}
      <Text className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
        {stepIndex + 1} / {STEPS.length}
      </Text>

      {/* Instruction text */}
      <Text className="mt-4 max-w-md px-6 text-center text-xl font-semibold leading-7 text-[#f5e8cc]">
        {t(currentStep.textKey)}
      </Text>

      {/* Step indicator dots */}
      <View className="mt-6 flex-row gap-2">
        {STEPS.map((_, i) => (
          <View
            key={`dot-${i}`}
            className={`h-2.5 w-2.5 rounded-full ${
              i === stepIndex ? 'bg-[#d4af37]' : 'bg-[#6b4a2f]'
            }`}
          />
        ))}
      </View>

      {/* Action buttons */}
      <View className="mt-8 flex-row gap-4">
        <TouchableOpacity
          onPress={handleDismiss}
          className="rounded-xl border border-[#8b6b45] bg-transparent px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel={t('tutorial_btn_skip')}
        >
          <Text className="font-bold text-[#c9b18b]">{t('tutorial_btn_skip')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          className="rounded-xl border border-[#d4af37] bg-[#4a3b22] px-8 py-3"
          accessibilityRole="button"
          accessibilityLabel={isLastStep ? t('tutorial_btn_done') : t('tutorial_btn_next')}
        >
          <Text className="font-bold text-[#f7ebd0]">
            {isLastStep ? t('tutorial_btn_done') : t('tutorial_btn_next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
