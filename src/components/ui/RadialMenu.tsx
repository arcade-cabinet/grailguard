/**
 * @module RadialMenu
 *
 * Diegetic radial context menu for building placement, upgrades, and sales.
 * Appears at the click/tap position on the 3D terrain and presents
 * contextual actions based on road proximity, existing buildings, and
 * game phase. Uses framer-motion for spring-based staggered animations.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Descriptor for a single item in the radial menu ring.
 */
export interface RadialMenuItem {
  /** Unique key for this item. */
  id: string;
  /** Emoji or short icon string. */
  icon: string;
  /** Primary label shown on hover/focus. */
  label: string;
  /** Secondary text (cost, info). */
  subLabel?: string;
  /** If true, item is visible but non-interactive (unaffordable). */
  disabled?: boolean;
  /** Callback invoked when the item is selected. */
  onSelect: () => void;
}

/**
 * Props for the RadialMenu overlay component.
 */
export interface RadialMenuProps {
  /** Items to arrange in a circle around the click position. */
  items: RadialMenuItem[];
  /** Screen-space coordinates where the menu should appear. */
  position: { x: number; y: number };
  /** Called when the menu should be dismissed. */
  onClose: () => void;
}

/** Radius of the circle on which items are placed (pixels). */
const RING_RADIUS = 90;
/** Item button diameter (pixels). */
const ITEM_SIZE = 56;
/** Stagger delay between each item's entrance animation (seconds). */
const STAGGER_DELAY = 0.05;

/**
 * Computes the angular position for each item in the ring.
 * Items are distributed evenly starting from the top (-PI/2).
 */
function getItemPosition(index: number, total: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  return {
    x: Math.cos(angle) * RING_RADIUS,
    y: Math.sin(angle) * RING_RADIUS,
  };
}

/**
 * Adjusts the menu origin so it stays fully visible within the viewport.
 */
function clampToViewport(pos: { x: number; y: number }, margin: number): { x: number; y: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  return {
    x: Math.max(margin, Math.min(vw - margin, pos.x)),
    y: Math.max(margin, Math.min(vh - margin, pos.y)),
  };
}

/**
 * Radial context menu rendered as an absolute-positioned overlay on the
 * game canvas. Items animate outward from the center with spring physics
 * and staggered timing. Dismisses on ESC, click-outside, or item selection.
 */
export function RadialMenu({ items, position, onClose }: RadialMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const clamped = clampToViewport(position, RING_RADIUS + ITEM_SIZE / 2 + 8);

  // ESC to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Click outside to dismiss
  const handleBackdropClick = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="pointer-events-auto fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onPointerDown={handleBackdropClick}
        data-testid="radial-menu-backdrop"
      >
        {/* Center dot */}
        <motion.div
          className="absolute h-3 w-3 rounded-full bg-[#d4af37] shadow-lg shadow-[#d4af37]/40"
          style={{
            left: clamped.x - 6,
            top: clamped.y - 6,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />

        {/* Menu items */}
        {items.map((item, index) => {
          const offset = getItemPosition(index, items.length);
          return (
            <motion.div
              key={item.id}
              className="absolute"
              style={{
                left: clamped.x - ITEM_SIZE / 2,
                top: clamped.y - ITEM_SIZE / 2,
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{
                x: offset.x,
                y: offset.y,
                scale: 1,
                opacity: 1,
              }}
              exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
                delay: index * STAGGER_DELAY,
              }}
            >
              <RadialMenuItemButton item={item} onClose={onClose} />
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Individual radial menu item rendered as a circular button with
 * tooltip-style label on hover.
 */
function RadialMenuItemButton({ item, onClose }: { item: RadialMenuItem; onClose: () => void }) {
  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={() => {
        if (!item.disabled) {
          item.onSelect();
          onClose();
        }
      }}
      className={`group relative flex flex-col items-center justify-center rounded-full border-2 shadow-lg transition-transform hover:scale-110 ${
        item.disabled
          ? 'cursor-not-allowed border-[#5a4a3a] bg-[#2a1e15]/80 opacity-50'
          : 'cursor-pointer border-[#d4af37] bg-[#2b1b14]/90 hover:border-[#f5d76e] hover:bg-[#3a281d]'
      }`}
      style={{
        width: ITEM_SIZE,
        height: ITEM_SIZE,
      }}
      aria-label={`${item.label}${item.subLabel ? `, ${item.subLabel}` : ''}`}
      aria-disabled={item.disabled}
      data-testid={`radial-item-${item.id}`}
    >
      <span className="text-lg leading-none">{item.icon}</span>

      {/* Tooltip: name + cost (red when unaffordable) */}
      <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#6b4a2f] bg-[#1f140f]/95 px-3 py-1.5 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        <span className="block text-center text-[10px] font-bold text-[#f5e8cc]">{item.label}</span>
        {item.subLabel ? (
          <span
            className={`block text-center text-[9px] font-semibold ${
              item.disabled ? 'text-[#ef4444]' : 'text-[#c9b18b]'
            }`}
          >
            {item.subLabel}
          </span>
        ) : null}
      </div>
    </button>
  );
}
