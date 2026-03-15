/**
 * @module Tutorial.test
 *
 * Unit tests for the Tutorial overlay component. Tests step rendering,
 * navigation, skip/done behavior, and step indicator dots.
 *
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock i18n
vi.mock('../../i18n', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      tutorial_step_1: 'Place a wall on the road to block enemy paths.',
      tutorial_step_2: 'Place a militia hut nearby to spawn defenders.',
      tutorial_step_3: 'Start the wave and defend the Grail!',
      tutorial_step_4: 'Gold is earned from kills. Spend it wisely.',
      tutorial_step_5: 'Build a lumber camp and lay track for resources.',
      tutorial_btn_next: 'Next',
      tutorial_btn_skip: 'Skip Tutorial',
      tutorial_btn_done: 'Got It!',
    };
    return translations[key] ?? key;
  },
}));

// Mock db/meta settings persistence
vi.mock('../../db/meta', () => ({
  updateSettings: vi.fn().mockResolvedValue(undefined),
}));

import { Tutorial } from '../../components/ui/Tutorial';

afterEach(() => {
  cleanup();
});

/* ------------------------------------------------------------------ */
/*  Visibility                                                        */
/* ------------------------------------------------------------------ */

describe('Tutorial: visibility', () => {
  it('renders nothing when visible=false', () => {
    const { container } = render(<Tutorial visible={false} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders overlay when visible=true', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  Step 1 rendering                                                  */
/* ------------------------------------------------------------------ */

describe('Tutorial: step 1 rendering', () => {
  it('renders step 1 text', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    expect(screen.getByText('Place a wall on the road to block enemy paths.')).toBeTruthy();
  });

  it('shows step counter "1 / 5"', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    expect(screen.getByText('1 / 5')).toBeTruthy();
  });

  it('shows "Next" button on step 1', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    const nextBtn = screen.getByLabelText('Next');
    expect(nextBtn).toBeTruthy();
    expect(nextBtn.textContent).toBe('Next');
  });

  it('shows "Skip Tutorial" button', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    const skipBtn = screen.getByLabelText('Skip Tutorial');
    expect(skipBtn).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  Step navigation                                                   */
/* ------------------------------------------------------------------ */

describe('Tutorial: navigation', () => {
  it('next button advances to step 2', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Next'));
    expect(screen.getByText('Place a militia hut nearby to spawn defenders.')).toBeTruthy();
    expect(screen.getByText('2 / 5')).toBeTruthy();
  });

  it('can navigate through all 5 steps', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);

    // Step 1
    expect(screen.getByText('Place a wall on the road to block enemy paths.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Next'));

    // Step 2
    expect(screen.getByText('Place a militia hut nearby to spawn defenders.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Next'));

    // Step 3
    expect(screen.getByText('Start the wave and defend the Grail!')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Next'));

    // Step 4
    expect(screen.getByText('Gold is earned from kills. Spend it wisely.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Next'));

    // Step 5
    expect(screen.getByText('Build a lumber camp and lay track for resources.')).toBeTruthy();
  });

  it('step 5 shows "Got It!" instead of "Next"', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);

    // Navigate to step 5
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText('Next'));
    }

    const doneBtn = screen.getByLabelText('Got It!');
    expect(doneBtn).toBeTruthy();
    expect(doneBtn.textContent).toBe('Got It!');
  });
});

/* ------------------------------------------------------------------ */
/*  Skip / Done behavior                                              */
/* ------------------------------------------------------------------ */

describe('Tutorial: skip and done', () => {
  it('skip button calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<Tutorial visible={true} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText('Skip Tutorial'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('"Got It!" on last step calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<Tutorial visible={true} onDismiss={onDismiss} />);

    // Navigate to last step
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText('Next'));
    }

    fireEvent.click(screen.getByLabelText('Got It!'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('skip persists tutorialComplete setting', async () => {
    const { updateSettings } = await import('../../db/meta');
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Skip Tutorial'));
    expect(updateSettings).toHaveBeenCalledWith({ tutorialComplete: true });
  });
});

/* ------------------------------------------------------------------ */
/*  Step indicator dots                                               */
/* ------------------------------------------------------------------ */

describe('Tutorial: step dots', () => {
  it('renders 5 step indicator dots', () => {
    const { container } = render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    const dots = container.querySelectorAll('.rounded-full.h-2\\.5');
    expect(dots.length).toBe(5);
  });

  it('first dot is active (gold) on step 1', () => {
    const { container } = render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    const dots = container.querySelectorAll('.rounded-full.h-2\\.5');
    expect(dots[0].classList.contains('bg-[#d4af37]')).toBe(true);
    expect(dots[1].classList.contains('bg-[#6b4a2f]')).toBe(true);
  });

  it('second dot is active on step 2', () => {
    const { container } = render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Next'));
    const dots = container.querySelectorAll('.rounded-full.h-2\\.5');
    expect(dots[0].classList.contains('bg-[#6b4a2f]')).toBe(true);
    expect(dots[1].classList.contains('bg-[#d4af37]')).toBe(true);
  });

  it('last dot is active on step 5', () => {
    const { container } = render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText('Next'));
    }
    const dots = container.querySelectorAll('.rounded-full.h-2\\.5');
    expect(dots[4].classList.contains('bg-[#d4af37]')).toBe(true);
    expect(dots[3].classList.contains('bg-[#6b4a2f]')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */

describe('Tutorial: step icons', () => {
  it('step 1 shows wall icon', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    // The wall emoji icon should be present
    const { container } = render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    // Step 1 icon is in a large text span
    const iconSpans = container.querySelectorAll('.text-5xl');
    expect(iconSpans.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Aria labels                                                       */
/* ------------------------------------------------------------------ */

describe('Tutorial: accessibility', () => {
  it('overlay has role="alert"', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('overlay has aria-label matching current step text', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-label')).toBe(
      'Place a wall on the road to block enemy paths.',
    );
  });

  it('aria-label updates when step changes', () => {
    render(<Tutorial visible={true} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Next'));
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-label')).toBe(
      'Place a militia hut nearby to spawn defenders.',
    );
  });
});
