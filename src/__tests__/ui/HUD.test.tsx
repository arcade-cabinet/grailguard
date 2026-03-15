/**
 * @module HUD.test
 *
 * Unit tests for the HUD component in isolation. Mocks all external
 * dependencies (koota, db/meta, engine, sound, i18n) to test
 * rendering behavior across game states.
 *
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------ //
// Mock all external modules before importing HUD                     //
// ------------------------------------------------------------------ //

// Mock i18n -- return the key as the text for deterministic assertion
vi.mock('../../i18n', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      hud_phase_build: 'Build Phase',
      hud_phase_battle: 'Battle Phase',
      hud_phase_game_over: 'Grail Lost',
      hud_sanctum_condition: 'Sanctum Condition',
      hud_wave: 'Wave',
      hud_grail: 'Grail',
      hud_council_time: 'Council Time',
      hud_spells: 'Spells',
      hud_bank_label: 'Bank:',
      btn_call_wave: 'Call Wave',
      btn_leave: 'Leave',
      hud_tap_terrain_hint: 'Tap terrain to build',
      spell_smite: 'Smite',
      spell_holy_nova: 'Holy Nova',
      spell_haste: 'Haste',
      spell_quake: 'Quake',
      spell_meteor: 'Meteor',
      spell_shield: 'Shield',
      relic_draft_title: 'Relic Draft',
      relic_draft_subtitle: 'Choose a blessing',
      hud_banner_danger: 'Dire Omen',
      hud_banner_decree: 'Holy Decree',
    };
    return translations[key] ?? key;
  },
}));

// Mock framer-motion -- pass-through for div and button
vi.mock('framer-motion', () => {
  const React = require('react');
  const stripMotionProps = (props: Record<string, unknown>) => {
    const { initial, animate, exit, transition, whileHover, whileTap, layout, ...htmlProps } =
      props;
    return htmlProps;
  };
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: {
      div: React.forwardRef(
        (
          { children, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
          ref: React.Ref<HTMLDivElement>,
        ) => React.createElement('div', { ...stripMotionProps(props), ref }, children),
      ),
      button: React.forwardRef(
        (
          { children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> &
            Record<string, unknown>,
          ref: React.Ref<HTMLButtonElement>,
        ) => React.createElement('button', { ...stripMotionProps(props), ref }, children),
      ),
    },
  };
});

// Mock Radix Toolbar
vi.mock('@radix-ui/react-toolbar', () => {
  const React = require('react');
  return {
    Root: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('div', { ...props, 'data-testid': 'toolbar-root' }, children),
    Button: ({
      children,
      disabled,
      onClick,
      className,
      ...props
    }: Record<string, unknown>) =>
      React.createElement(
        'button',
        {
          disabled,
          onClick,
          className,
          ...props,
        },
        children,
      ),
  };
});

// Mock SoundManager
vi.mock('../../engine/SoundManager', () => ({
  soundManager: {
    playUiClick: vi.fn(),
    playBuild: vi.fn(),
    playUpgrade: vi.fn(),
  },
}));

// Session state used by multiple tests
let mockSession: Record<string, unknown> = {};
let mockWaveState: Record<string, unknown> | null = null;
let mockMetaSettings: Record<string, unknown> = {};
const mockQueueWorldCommand = vi.fn();

// Mock koota/react
vi.mock('koota/react', () => ({
  useTrait: (_world: unknown, trait: unknown) => {
    if (trait === 'GameSession') return mockSession;
    if (trait === 'WaveState') return mockWaveState;
    return null;
  },
}));

// Mock GameEngine
vi.mock('../../engine/GameEngine', () => ({
  GameSession: 'GameSession',
  WaveState: 'WaveState',
  gameWorld: {},
  queueWorldCommand: (...args: unknown[]) => mockQueueWorldCommand(...args),
}));

// Mock db/meta
vi.mock('../../db/meta', () => ({
  useMetaProgress: () => ({
    settings: mockMetaSettings,
  }),
}));

// Must import HUD after mocks are set up
import { HUD } from '../../components/ui/HUD';

/* ------------------------------------------------------------------ */
/*  Setup & teardown                                                  */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  mockSession = {
    phase: 'build',
    wave: 1,
    health: 20,
    gold: 300,
    wood: 50,
    ore: 0,
    gem: 0,
    faith: 100,
    buildTimeLeft: 30,
    gameOver: false,
    announcement: '',
    bannerLife: 0,
    bannerMaxLife: 0,
    bannerText: '',
    bannerTone: 'info',
    screenFlash: 0,
    screenFlashColor: '#fff',
    gameSpeed: 1,
    activeSpells: ['smite'],
    spellCooldowns: {},
    pendingRelicDraft: false,
  };
  mockWaveState = { spawnQueue: [] };
  mockMetaSettings = { highContrast: false };
  mockQueueWorldCommand.mockClear();
});

afterEach(() => {
  cleanup();
});

/* ------------------------------------------------------------------ */
/*  Render tests                                                      */
/* ------------------------------------------------------------------ */

describe('HUD', () => {
  it('renders null when session is null', () => {
    mockSession = null as unknown as Record<string, unknown>;
    const { container } = render(
      <HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows wave number', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('shows resource bank', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const bankText = screen.getByText(/Bank:/);
    expect(bankText).toBeTruthy();
    expect(bankText.textContent).toContain('300g');
    expect(bankText.textContent).toContain('50w');
    expect(bankText.textContent).toContain('0o');
    expect(bankText.textContent).toContain('100f');
  });

  it('shows wave 5 correctly', () => {
    mockSession.wave = 5;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('displays "Build Phase" label during build phase', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('Build Phase')).toBeTruthy();
  });

  it('displays "Battle Phase" label during defend phase', () => {
    mockSession.phase = 'defend';
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('Battle Phase')).toBeTruthy();
  });

  it('displays "Grail Lost" label during game over', () => {
    mockSession.phase = 'game_over';
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('Grail Lost')).toBeTruthy();
  });

  it('shows "Call Wave" button during build phase', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('Call Wave')).toBeTruthy();
  });

  it('does not show "Call Wave" button during defend phase', () => {
    mockSession.phase = 'defend';
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.queryByText('Call Wave')).toBeNull();
  });

  it('clicking "Call Wave" queues skipBuildPhase command', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    fireEvent.click(screen.getByText('Call Wave'));
    expect(mockQueueWorldCommand).toHaveBeenCalledWith({ type: 'skipBuildPhase' });
  });
});

/* ------------------------------------------------------------------ */
/*  Spell button tests                                                */
/* ------------------------------------------------------------------ */

describe('HUD: spell buttons', () => {
  it('shows spell button for active spell', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    // Smite spell button should appear
    const smiteBtn = screen.getByLabelText(/Cast Smite/);
    expect(smiteBtn).toBeTruthy();
  });

  it('spell button is disabled during build phase', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const smiteBtn = screen.getByLabelText(/Cast Smite/) as HTMLButtonElement;
    expect(smiteBtn.disabled).toBe(true);
  });

  it('spell button is enabled during defend phase with enough faith', () => {
    mockSession.phase = 'defend';
    mockSession.faith = 100;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const smiteBtn = screen.getByLabelText(/Cast Smite/) as HTMLButtonElement;
    expect(smiteBtn.disabled).toBe(false);
  });

  it('spell button disabled when insufficient faith', () => {
    mockSession.phase = 'defend';
    mockSession.faith = 10; // smite costs 25
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const smiteBtn = screen.getByLabelText(/Cast Smite/) as HTMLButtonElement;
    expect(smiteBtn.disabled).toBe(true);
  });

  it('spell button disabled when on cooldown', () => {
    mockSession.phase = 'defend';
    mockSession.faith = 100;
    mockSession.spellCooldowns = { smite: 5 };
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const smiteBtn = screen.getByLabelText(/Cast Smite, cooldown 5 seconds/) as HTMLButtonElement;
    expect(smiteBtn.disabled).toBe(true);
  });

  it('spell button disabled during game over', () => {
    mockSession.phase = 'defend';
    mockSession.gameOver = true;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const smiteBtn = screen.getByLabelText(/Cast Smite/) as HTMLButtonElement;
    expect(smiteBtn.disabled).toBe(true);
  });

  it('clicking enabled spell button queues castSpell command', () => {
    mockSession.phase = 'defend';
    mockSession.faith = 100;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const smiteBtn = screen.getByLabelText(/Cast Smite/);
    fireEvent.click(smiteBtn);
    expect(mockQueueWorldCommand).toHaveBeenCalledWith({ type: 'castSpell', spellId: 'smite' });
  });

  it('shows cooldown text when spell is on cooldown', () => {
    mockSession.spellCooldowns = { smite: 10 };
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText(/Smite \(10s\)/)).toBeTruthy();
  });

  it('shows faith cost text when spell is ready', () => {
    mockSession.spellCooldowns = {};
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText(/Smite \(25f\)/)).toBeTruthy();
  });

  it('renders multiple spell buttons', () => {
    mockSession.activeSpells = ['smite', 'holy_nova'];
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByLabelText(/Cast Smite/)).toBeTruthy();
    expect(screen.getByLabelText(/Cast Holy Nova/)).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  Game speed toggle                                                 */
/* ------------------------------------------------------------------ */

describe('HUD: game speed toggle', () => {
  it('shows current game speed', () => {
    mockSession.gameSpeed = 1;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('1x')).toBeTruthy();
  });

  it('shows 2x speed', () => {
    mockSession.gameSpeed = 2;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('2x')).toBeTruthy();
  });

  it('clicking speed toggle queues toggleGameSpeed command', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const speedBtn = screen.getByLabelText(/Game speed/);
    fireEvent.click(speedBtn);
    expect(mockQueueWorldCommand).toHaveBeenCalledWith({ type: 'toggleGameSpeed' });
  });
});

/* ------------------------------------------------------------------ */
/*  Leave button                                                      */
/* ------------------------------------------------------------------ */

describe('HUD: leave button', () => {
  it('renders leave button', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const leaveBtn = screen.getByLabelText(/Leave game/);
    expect(leaveBtn).toBeTruthy();
  });

  it('clicking leave calls onExit', () => {
    const onExit = vi.fn();
    render(<HUD activePlacement={null} onExit={onExit} onCancelPlacement={vi.fn()} />);
    const leaveBtn = screen.getByLabelText(/Leave game/);
    fireEvent.click(leaveBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/*  Active placement cancel                                           */
/* ------------------------------------------------------------------ */

describe('HUD: cancel placement', () => {
  it('shows cancel button when activePlacement is set during build', () => {
    render(
      <HUD activePlacement="hut" onExit={vi.fn()} onCancelPlacement={vi.fn()} />,
    );
    const cancelBtn = screen.getByLabelText(/Cancel placing Militia Hut/);
    expect(cancelBtn).toBeTruthy();
  });

  it('does not show cancel button when activePlacement is null', () => {
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.queryByLabelText(/Cancel placing/)).toBeNull();
  });

  it('clicking cancel calls onCancelPlacement', () => {
    const onCancel = vi.fn();
    render(<HUD activePlacement="hut" onExit={vi.fn()} onCancelPlacement={onCancel} />);
    const cancelBtn = screen.getByLabelText(/Cancel placing Militia Hut/);
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------ */
/*  Relic draft modal                                                  */
/* ------------------------------------------------------------------ */

describe('HUD: relic draft modal', () => {
  it('does not show relic draft when pendingRelicDraft is false', () => {
    mockSession.pendingRelicDraft = false;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.queryByText('Relic Draft')).toBeNull();
  });

  it('shows relic draft modal when pendingRelicDraft is true', () => {
    mockSession.pendingRelicDraft = true;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('Relic Draft')).toBeTruthy();
  });

  it('relic draft shows multiple relic options', () => {
    mockSession.pendingRelicDraft = true;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('Venomous Fletching')).toBeTruthy();
    expect(screen.getByText('Golden Age')).toBeTruthy();
    expect(screen.getByText('Iron Tracks')).toBeTruthy();
  });

  it('clicking a relic option queues draftRelic command', () => {
    vi.useFakeTimers();
    mockSession.pendingRelicDraft = true;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    const goldenAge = screen.getByLabelText(/Draft relic: Golden Age/);
    fireEvent.click(goldenAge);
    // Selection animation delays the command by 400ms
    vi.advanceTimersByTime(500);
    expect(mockQueueWorldCommand).toHaveBeenCalledWith({ type: 'draftRelic', relicId: 'golden_age' });
    vi.useRealTimers();
  });
});

/* ------------------------------------------------------------------ */
/*  Grail health bar                                                  */
/* ------------------------------------------------------------------ */

describe('HUD: grail health', () => {
  it('shows grail health value', () => {
    mockSession.health = 15;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('shows grail at full health (20)', () => {
    mockSession.health = 20;
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('20')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  Banner notifications                                              */
/* ------------------------------------------------------------------ */

describe('HUD: banner', () => {
  it('shows banner when bannerLife > 0', () => {
    mockSession.bannerLife = 3;
    mockSession.bannerMaxLife = 5;
    mockSession.bannerText = 'Wave 5 Incoming!';
    mockSession.bannerTone = 'info';
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('Wave 5 Incoming!')).toBeTruthy();
  });

  it('does not show banner when bannerLife is 0', () => {
    mockSession.bannerLife = 0;
    mockSession.bannerText = 'Should not appear';
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.queryByText('Should not appear')).toBeNull();
  });

  it('shows danger tone banner', () => {
    mockSession.bannerLife = 3;
    mockSession.bannerMaxLife = 5;
    mockSession.bannerText = 'Boss Approaches!';
    mockSession.bannerTone = 'danger';
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    // BannerOverlay prefixes danger banners with a skull character
    expect(screen.getByText(/Boss Approaches!/)).toBeTruthy();
    expect(screen.getByText('Dire Omen')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  Build hint                                                        */
/* ------------------------------------------------------------------ */

describe('HUD: build hint', () => {
  it('shows tap terrain hint during build phase without active placement', () => {
    mockSession.phase = 'build';
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.getByText('Tap terrain to build')).toBeTruthy();
  });

  it('hides tap hint when placement is active', () => {
    mockSession.phase = 'build';
    render(<HUD activePlacement="hut" onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.queryByText('Tap terrain to build')).toBeNull();
  });

  it('hides tap hint during defend phase', () => {
    mockSession.phase = 'defend';
    render(<HUD activePlacement={null} onExit={vi.fn()} onCancelPlacement={vi.fn()} />);
    expect(screen.queryByText('Tap terrain to build')).toBeNull();
  });
});
