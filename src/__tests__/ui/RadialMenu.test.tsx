/**
 * @module RadialMenu.test
 *
 * Unit tests for the RadialMenu component and supporting logic.
 * Tests rendering, item display, disabled state, and dismiss behavior.
 *
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RadialMenu, type RadialMenuItem } from '../../components/ui/RadialMenu';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: {
      div: React.forwardRef(
        (
          { children, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
          ref: React.Ref<HTMLDivElement>,
        ) => {
          // Filter out framer-motion specific props
          const {
            initial,
            animate,
            exit,
            transition,
            whileHover,
            whileTap,
            onPointerDown,
            ...htmlProps
          } = props as Record<string, unknown>;
          return React.createElement(
            'div',
            {
              ...htmlProps,
              onPointerDown: onPointerDown as React.PointerEventHandler<HTMLDivElement>,
              ref,
            },
            children,
          );
        },
      ),
    },
  };
});

afterEach(() => {
  cleanup();
});

function makeItems(overrides: Partial<RadialMenuItem>[] = []): RadialMenuItem[] {
  const defaults: RadialMenuItem[] = [
    {
      id: 'build-hut',
      icon: '\u2694\ufe0f',
      label: 'Militia Hut',
      subLabel: '50g 20w',
      disabled: false,
      onSelect: vi.fn(),
    },
    {
      id: 'build-range',
      icon: '\ud83c\udff9',
      label: 'Archery Range',
      subLabel: '100g 50w',
      disabled: false,
      onSelect: vi.fn(),
    },
    {
      id: 'build-lumber',
      icon: '\ud83e\ude93',
      label: 'Lumber Camp',
      subLabel: '75g',
      disabled: true,
      onSelect: vi.fn(),
    },
  ];
  return defaults.map((item, i) => ({ ...item, ...(overrides[i] ?? {}) }));
}

describe('RadialMenu', () => {
  it('renders all items', () => {
    const items = makeItems();
    render(<RadialMenu items={items} position={{ x: 400, y: 300 }} onClose={vi.fn()} />);

    expect(screen.getByTestId('radial-item-build-hut')).toBeTruthy();
    expect(screen.getByTestId('radial-item-build-range')).toBeTruthy();
    expect(screen.getByTestId('radial-item-build-lumber')).toBeTruthy();
  });

  it('renders nothing when items array is empty', () => {
    const { container } = render(
      <RadialMenu items={[]} position={{ x: 400, y: 300 }} onClose={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('marks disabled items with aria-disabled', () => {
    const items = makeItems();
    render(<RadialMenu items={items} position={{ x: 400, y: 300 }} onClose={vi.fn()} />);

    const lumber = screen.getByTestId('radial-item-build-lumber');
    expect(lumber.getAttribute('aria-disabled')).toBe('true');
    expect((lumber as HTMLButtonElement).disabled).toBe(true);
  });

  it('disabled items do not fire onSelect', () => {
    const items = makeItems();
    render(<RadialMenu items={items} position={{ x: 400, y: 300 }} onClose={vi.fn()} />);

    const lumber = screen.getByTestId('radial-item-build-lumber');
    fireEvent.click(lumber);
    expect(items[2].onSelect).not.toHaveBeenCalled();
  });

  it('enabled items fire onSelect and close the menu', () => {
    const items = makeItems();
    const onClose = vi.fn();
    render(<RadialMenu items={items} position={{ x: 400, y: 300 }} onClose={onClose} />);

    const hut = screen.getByTestId('radial-item-build-hut');
    fireEvent.click(hut);
    expect(items[0].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses on ESC key', () => {
    const onClose = vi.fn();
    render(<RadialMenu items={makeItems()} position={{ x: 400, y: 300 }} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<RadialMenu items={makeItems()} position={{ x: 400, y: 300 }} onClose={onClose} />);

    const backdrop = screen.getByTestId('radial-menu-backdrop');
    // Simulate pointerDown on the backdrop itself (not a child)
    fireEvent.pointerDown(backdrop, { target: backdrop, currentTarget: backdrop });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('includes label and subLabel in aria-label', () => {
    const items = makeItems();
    render(<RadialMenu items={items} position={{ x: 400, y: 300 }} onClose={vi.fn()} />);

    const hut = screen.getByTestId('radial-item-build-hut');
    expect(hut.getAttribute('aria-label')).toBe('Militia Hut, 50g 20w');
  });

  it('renders correct number of items for each context scenario', () => {
    // Near road: only wall + any-terrain buildings
    const nearRoadItems: RadialMenuItem[] = [
      {
        id: 'build-wall',
        icon: '\ud83d\udea7',
        label: 'Barricade',
        subLabel: '15w',
        disabled: false,
        onSelect: vi.fn(),
      },
      {
        id: 'build-lumber',
        icon: '\ud83e\ude93',
        label: 'Lumber Camp',
        subLabel: '75g',
        disabled: false,
        onSelect: vi.fn(),
      },
      {
        id: 'build-track',
        icon: '\ud83d\udee4\ufe0f',
        label: 'Minecart Track',
        subLabel: '5g 5w',
        disabled: false,
        onSelect: vi.fn(),
      },
    ];

    const { container: c1 } = render(
      <RadialMenu items={nearRoadItems} position={{ x: 200, y: 200 }} onClose={vi.fn()} />,
    );
    const buttons1 = c1.querySelectorAll('[data-testid^="radial-item-"]');
    expect(buttons1.length).toBe(3);

    cleanup();

    // Far from road: spawners + turrets + any-terrain
    const farItems: RadialMenuItem[] = [
      {
        id: 'build-hut',
        icon: '\u2694\ufe0f',
        label: 'Militia Hut',
        subLabel: '50g 20w',
        disabled: false,
        onSelect: vi.fn(),
      },
      {
        id: 'build-range',
        icon: '\ud83c\udff9',
        label: 'Archery Range',
        subLabel: '100g 50w',
        disabled: false,
        onSelect: vi.fn(),
      },
      {
        id: 'build-sentry',
        icon: '\ud83c\udff9',
        label: 'Sentry Post',
        subLabel: '100w',
        disabled: false,
        onSelect: vi.fn(),
      },
      {
        id: 'build-lumber',
        icon: '\ud83e\ude93',
        label: 'Lumber Camp',
        subLabel: '75g',
        disabled: false,
        onSelect: vi.fn(),
      },
    ];

    const { container: c2 } = render(
      <RadialMenu items={farItems} position={{ x: 200, y: 200 }} onClose={vi.fn()} />,
    );
    const buttons2 = c2.querySelectorAll('[data-testid^="radial-item-"]');
    expect(buttons2.length).toBe(4);

    cleanup();

    // Existing building: upgrade + sell
    const buildingItems: RadialMenuItem[] = [
      {
        id: 'upgrade-spawn',
        icon: '\u2b06',
        label: 'Upgrade Spawn',
        subLabel: '50g',
        disabled: false,
        onSelect: vi.fn(),
      },
      {
        id: 'upgrade-stats',
        icon: '\u2b06',
        label: 'Upgrade Stats',
        subLabel: '50g',
        disabled: true,
        onSelect: vi.fn(),
      },
      {
        id: 'sell',
        icon: '\ud83d\udcb0',
        label: 'Sell',
        subLabel: '+25g',
        disabled: false,
        onSelect: vi.fn(),
      },
    ];

    const { container: c3 } = render(
      <RadialMenu items={buildingItems} position={{ x: 200, y: 200 }} onClose={vi.fn()} />,
    );
    const buttons3 = c3.querySelectorAll('[data-testid^="radial-item-"]');
    expect(buttons3.length).toBe(3);
  });

  it('shows unaffordable items as disabled but visible', () => {
    const items: RadialMenuItem[] = [
      {
        id: 'build-keep',
        icon: '\ud83d\udee1\ufe0f',
        label: 'Knight Keep',
        subLabel: '200g 100w',
        disabled: true,
        onSelect: vi.fn(),
      },
      {
        id: 'build-hut',
        icon: '\u2694\ufe0f',
        label: 'Militia Hut',
        subLabel: '50g 20w',
        disabled: false,
        onSelect: vi.fn(),
      },
    ];

    render(<RadialMenu items={items} position={{ x: 400, y: 300 }} onClose={vi.fn()} />);

    // Unaffordable item is visible
    const keep = screen.getByTestId('radial-item-build-keep');
    expect(keep).toBeTruthy();
    expect((keep as HTMLButtonElement).disabled).toBe(true);

    // Affordable item is clickable
    const hut = screen.getByTestId('radial-item-build-hut');
    expect((hut as HTMLButtonElement).disabled).toBe(false);
  });
});
