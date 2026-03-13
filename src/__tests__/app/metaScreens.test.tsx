import { Text, TouchableOpacity } from 'react-native';
import CodexScreen from '../../app/codex';
import DoctrineScreen from '../../app/doctrine';
import MainMenuScreen from '../../app/index';
import SettingsScreen from '../../app/settings';

const TestRenderer = require('react-test-renderer') as any;
const act = TestRenderer.act;

type TestTextNode = {
  props: {
    children: string | string[];
  };
};

type TestTouchableNode = {
  props: {
    onPress: () => void;
  };
  findAllByType: (childType: unknown) => TestTextNode[];
};

function renderWithAct(node: React.ReactNode): any {
  let renderer: any = null;
  act(() => {
    renderer = TestRenderer.create(node);
  });

  if (!renderer) {
    throw new Error('Renderer was not created.');
  }

  return renderer;
}

const pushMock = jest.fn();
const backMock = jest.fn();
const purchaseBuildingUnlockMock = jest.fn();
const purchaseDoctrineNodeMock = jest.fn();
const updateSettingsMock = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
  }),
}));

jest.mock('@rn-primitives/tooltip', () => ({
  Root: ({ children }: { children: React.ReactNode }) => children,
  Trigger: ({ children }: { children: React.ReactNode }) => children,
  Portal: ({ children }: { children: React.ReactNode }) => children,
  Content: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../engine/SoundManager', () => ({
  soundManager: {
    init: jest.fn(),
    playAmbience: jest.fn(),
    stopAmbience: jest.fn(),
    playMusic: jest.fn(),
    stopMusic: jest.fn(),
    playUiClick: jest.fn(),
    playBuild: jest.fn(),
    playCombat: jest.fn(),
    playGameOver: jest.fn(),
  },
}));

jest.mock('../../db/meta', () => ({
  getUnlockCost: (type: string) =>
    ({ wall: 0, hut: 0, range: 50, temple: 150, keep: 300 })[type] ?? 0,
  purchaseBuildingUnlock: (...args: unknown[]) => purchaseBuildingUnlockMock(...args),
  purchaseDoctrineNode: (...args: unknown[]) => purchaseDoctrineNodeMock(...args),
  updateSettings: (...args: unknown[]) => updateSettingsMock(...args),
  useCodexEntries: () => [
    { entryId: 'enemy:goblin', category: 'enemy', discovered: true },
    { entryId: 'biome:kings-road', category: 'biome', discovered: false },
  ],
  useDoctrineNodes: () => [
    { nodeId: 'crown_tithe', unlocked: false },
    { nodeId: 'faithward', unlocked: true },
    { nodeId: 'iron_vanguard', unlocked: false },
  ],
  useMetaProgress: () => ({
    coins: 250,
    hasActiveRun: true,
    settings: {
      theme: 'holy-grail',
      preferredSpeed: 1.5,
      autoResume: true,
      reducedFx: false,
      soundEnabled: true,
      musicEnabled: true,
    },
    unlocks: {
      wall: true,
      hut: true,
      range: false,
      temple: false,
      keep: false,
      sentry: false,
      obelisk: false,
      lumber: false,
      mine_ore: false,
      mine_gem: false,
      track: true,
      mint: false,
      catapult: false,
      sorcerer: false,
      vault: false,
    },
    spellUnlocks: {
      smite: true,
      holy_nova: false,
      zealous_haste: false,
      earthquake: false,
      chrono_shift: false,
      meteor_strike: false,
      divine_shield: false,
    },
  }),
}));

function pressButtonByLabel(renderer: ReturnType<typeof TestRenderer.create>, label: string) {
  const button = (renderer.root.findAllByType(TouchableOpacity) as TestTouchableNode[]).find(
    (node) =>
      node.findAllByType(Text).some((child) => {
        const content = Array.isArray(child.props.children)
          ? child.props.children.join('')
          : String(child.props.children);
        return content === label;
      }),
  );

  if (!button) {
    throw new Error(`Button not found for label: ${label}`);
  }

  act(() => {
    button.props.onPress();
  });
}

describe('meta screens', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    purchaseBuildingUnlockMock.mockReset();
    purchaseDoctrineNodeMock.mockReset();
    updateSettingsMock.mockReset();
  });

  it('renders main menu actions and navigates to game and meta routes', () => {
    const renderer = renderWithAct(<MainMenuScreen />);

    pressButtonByLabel(renderer, 'Embark');
    pressButtonByLabel(renderer, 'Start Run');
    pressButtonByLabel(renderer, 'Continue Run');
    pressButtonByLabel(renderer, 'Codex');
    pressButtonByLabel(renderer, 'Doctrine');
    pressButtonByLabel(renderer, 'Settings');

    expect(pushMock).toHaveBeenCalledWith('/game?mode=fresh&biome=kings-road&challenge=pilgrim&spells=smite&mapSize=100');
    expect(pushMock).toHaveBeenCalledWith('/game?mode=resume');
    expect(pushMock).toHaveBeenCalledWith('/codex');
    expect(pushMock).toHaveBeenCalledWith('/doctrine');
    expect(pushMock).toHaveBeenCalledWith('/settings');
  });

  it('calls updateSettings when toggling settings rows', () => {
    const renderer = renderWithAct(<SettingsScreen />);

    pressButtonByLabel(renderer, 'On');

    expect(updateSettingsMock).toHaveBeenCalled();
  });

  it('renders doctrine state and purchases locked nodes', () => {
    const renderer = renderWithAct(<DoctrineScreen />);

    pressButtonByLabel(renderer, 'Consecrate');

    expect(purchaseDoctrineNodeMock).toHaveBeenCalledWith('crown_tithe', 100);
  });

  it('renders codex entries with discovered and hidden states', () => {
    const renderer = renderWithAct(<CodexScreen />);
    const textContent = renderer.root
      .findAllByType(Text)
      .flatMap((node: any) => (node as unknown as TestTextNode).props.children)
      .join(' ');

    expect(textContent).toContain('enemy • goblin');
    expect(textContent).toContain('Unknown Entry');
  });
});
