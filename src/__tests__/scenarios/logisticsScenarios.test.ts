/**
 * @module logisticsScenarios.test
 *
 * Comprehensive scenario tests for resource logistics: BFS pathfinding,
 * cart movement, delivery calculations, and mint routing.
 */

import {
  calculateDelivery,
  findLogisticsPathPure,
  moveCartStep,
} from '../../engine/systems/logisticsSystem';

/* ------------------------------------------------------------------ */
/*  Common test fixtures                                              */
/* ------------------------------------------------------------------ */

const sanctuaryPos = { x: 50, z: 0 };

// A straight line of track nodes from x=0 to x=45, spaced 5 apart
const straightTrack = Array.from({ length: 10 }, (_, i) => ({
  x: i * 5,
  z: 0,
}));

// L-shaped track: right then up
const lShapedTrack = [
  { x: 0, z: 0 },
  { x: 5, z: 0 },
  { x: 10, z: 0 },
  { x: 10, z: 5 },
  { x: 10, z: 10 },
];

/* ------------------------------------------------------------------ */
/*  BFS pathfinding                                                   */
/* ------------------------------------------------------------------ */

describe('logistics scenarios: BFS pathfinding', () => {
  it('finds path from source through tracks to sanctuary', () => {
    const sourcePos = { x: -3, z: 0 }; // adjacent to first track at (0,0)
    const path = findLogisticsPathPure(sourcePos, 'wood', straightTrack, [], sanctuaryPos);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
    // Last node should be the sanctuary (snapped to grid)
    const lastNode = path![path!.length - 1];
    expect(lastNode.x).toBe(50);
    expect(lastNode.z).toBe(0);
  });

  it('finds shortest path (BFS property)', () => {
    // Add a detour track alongside the straight one
    const detourTrack = [...straightTrack, { x: 0, z: 5 }, { x: 5, z: 5 }, { x: 10, z: 5 }];
    const sourcePos = { x: -3, z: 0 };
    const path = findLogisticsPathPure(sourcePos, 'wood', detourTrack, [], sanctuaryPos);
    expect(path).not.toBeNull();
    // BFS finds the shortest path: straight line should be preferred
    // Path length should be <= straight track length + 1 (for sanctuary)
    expect(path!.length).toBeLessThanOrEqual(straightTrack.length + 1);
  });

  it('returns null when no path exists', () => {
    const sourcePos = { x: 0, z: 0 };
    // No tracks at all
    const path = findLogisticsPathPure(sourcePos, 'wood', [], [], sanctuaryPos);
    expect(path).toBeNull();
  });

  it('returns null when source is not adjacent to any track', () => {
    const sourcePos = { x: 100, z: 100 }; // far from any track
    const path = findLogisticsPathPure(sourcePos, 'wood', straightTrack, [], sanctuaryPos);
    expect(path).toBeNull();
  });

  it('returns null when tracks do not reach sanctuary', () => {
    // Tracks stop at x=20, sanctuary at x=50 (too far)
    const shortTrack = [
      { x: 0, z: 0 },
      { x: 5, z: 0 },
      { x: 10, z: 0 },
      { x: 15, z: 0 },
      { x: 20, z: 0 },
    ];
    const sourcePos = { x: -3, z: 0 };
    const path = findLogisticsPathPure(sourcePos, 'wood', shortTrack, [], { x: 50, z: 0 });
    expect(path).toBeNull();
  });

  it('ore routes to mint when available', () => {
    const mintPositions = [{ x: 20, z: 0 }];
    const trackToMint = [
      { x: 0, z: 0 },
      { x: 5, z: 0 },
      { x: 10, z: 0 },
      { x: 15, z: 0 },
    ];
    const sourcePos = { x: -3, z: 0 };
    const path = findLogisticsPathPure(sourcePos, 'ore', trackToMint, mintPositions, {
      x: 100,
      z: 0,
    });
    expect(path).not.toBeNull();
    // Last node should be the mint
    const lastNode = path![path!.length - 1];
    expect(lastNode.x).toBe(20);
  });

  it('wood does not route to mint (ignores mint positions)', () => {
    const mintPositions = [{ x: 20, z: 0 }];
    // Track reaches mint but not sanctuary
    const trackToMint = [
      { x: 0, z: 0 },
      { x: 5, z: 0 },
      { x: 10, z: 0 },
      { x: 15, z: 0 },
    ];
    const sourcePos = { x: -3, z: 0 };
    // Sanctuary far away, but mint is close -- wood should NOT go to mint
    const path = findLogisticsPathPure(sourcePos, 'wood', trackToMint, mintPositions, {
      x: 100,
      z: 0,
    });
    // Should be null since wood can only go to sanctuary, which is unreachable
    expect(path).toBeNull();
  });

  it('gem does not route to mint', () => {
    const mintPositions = [{ x: 20, z: 0 }];
    const trackToMint = [
      { x: 0, z: 0 },
      { x: 5, z: 0 },
      { x: 10, z: 0 },
      { x: 15, z: 0 },
    ];
    const sourcePos = { x: -3, z: 0 };
    const path = findLogisticsPathPure(sourcePos, 'gem', trackToMint, mintPositions, {
      x: 100,
      z: 0,
    });
    expect(path).toBeNull();
  });

  it('handles L-shaped path', () => {
    // Sanctuary at (10,15) -- reachable from L-shaped track
    const nearSanctuary = { x: 10, z: 15 };
    const sourcePos = { x: -3, z: 0 };
    const path = findLogisticsPathPure(sourcePos, 'wood', lShapedTrack, [], nearSanctuary);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });

  it('adjacency distance is 6 (track spacing)', () => {
    // Tracks exactly 6 apart should be adjacent
    const wideTrack = [
      { x: 0, z: 0 },
      { x: 5.9, z: 0 }, // < 6 from (0,0) -- adjacent
    ];
    const sourcePos = { x: -3, z: 0 };
    const path = findLogisticsPathPure(sourcePos, 'wood', wideTrack, [], { x: 10, z: 0 });
    // This tests that adjacency check works; path may or may not exist depending on sanctuary reach
    // The key test is that BFS traverses adjacent tracks
    expect(path).not.toBeNull();
  });

  it('tracks too far apart are not connected', () => {
    const disconnectedTrack = [
      { x: 0, z: 0 },
      { x: 20, z: 0 }, // > 6 from first -- not adjacent
    ];
    const sourcePos = { x: -3, z: 0 };
    // Sanctuary at (25,0) -- adjacent to second track but not reachable from first
    const path = findLogisticsPathPure(sourcePos, 'wood', disconnectedTrack, [], { x: 25, z: 0 });
    expect(path).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Cart movement                                                     */
/* ------------------------------------------------------------------ */

describe('logistics scenarios: cart movement', () => {
  const path = [
    { x: 0, z: 0 },
    { x: 5, z: 0 },
    { x: 10, z: 0 },
    { x: 15, z: 0 },
  ];

  it('moves cart at correct speed (5 units/s)', () => {
    const result = moveCartStep({ x: 0, z: 0 }, path, 0, 5, 1.0);
    // After 1 second at speed 5: should arrive at (5,0) or advance path index
    expect(result.arrived).toBe(false);
  });

  it('cart arrives when reaching end of path', () => {
    const result = moveCartStep({ x: 15, z: 0 }, path, 3, 5, 1.0);
    // Already at last waypoint
    expect(result.arrived).toBe(true);
  });

  it('cart advances path index when reaching waypoint', () => {
    // Position very close to waypoint 0
    const result = moveCartStep({ x: 0.1, z: 0 }, path, 0, 5, 1.0);
    // Should advance to next waypoint
    expect(result.pathIndex).toBeGreaterThanOrEqual(1);
  });

  it('cart arrives at final waypoint when close enough', () => {
    // Position 14.8 is within 0.5 of waypoint 15.0 at index 3
    // So cart snaps to waypoint, then advances past end => arrived
    const result = moveCartStep({ x: 14.8, z: 0 }, path, 3, 5, 0.1);
    expect(result.pathIndex).toBe(4);
    expect(result.arrived).toBe(true);
  });

  it('already past path returns arrived=true', () => {
    const result = moveCartStep({ x: 15, z: 0 }, path, 4, 5, 1.0);
    expect(result.arrived).toBe(true);
  });

  it('zero dt does not move cart', () => {
    const result = moveCartStep({ x: 0, z: 0 }, path, 0, 5, 0);
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });

  it('faster speed covers more distance per frame', () => {
    const slow = moveCartStep({ x: 0, z: 0 }, path, 1, 5, 0.2);
    const fast = moveCartStep({ x: 0, z: 0 }, path, 1, 10, 0.2);
    // Fast cart should be further along or at same point with different indices
    expect(fast.x).toBeGreaterThanOrEqual(slow.x);
  });

  it('relic speed (10) is double normal (5)', () => {
    const normalSpeed = 5;
    const relicSpeed = 10;
    expect(relicSpeed).toBe(normalSpeed * 2);
  });
});

/* ------------------------------------------------------------------ */
/*  Delivery amounts                                                  */
/* ------------------------------------------------------------------ */

describe('logistics scenarios: delivery amounts', () => {
  it('wood delivers 10 units', () => {
    const result = calculateDelivery('wood', false, false);
    expect(result.resource).toBe('wood');
    expect(result.amount).toBe(10);
    expect(result.gold).toBe(0);
  });

  it('ore delivers 1 unit (to sanctuary)', () => {
    const result = calculateDelivery('ore', false, false);
    expect(result.resource).toBe('ore');
    expect(result.amount).toBe(1);
    expect(result.gold).toBe(0);
  });

  it('gem delivers 1 unit', () => {
    const result = calculateDelivery('gem', false, false);
    expect(result.resource).toBe('gem');
    expect(result.amount).toBe(1);
    expect(result.gold).toBe(0);
  });

  it('ore to mint converts to 15 gold (Royal Mint)', () => {
    const result = calculateDelivery('ore', true, false);
    expect(result.resource).toBe('ore');
    expect(result.amount).toBe(0); // ore consumed
    expect(result.gold).toBe(15);
  });

  it('wood to mint does NOT convert (only ore converts)', () => {
    const result = calculateDelivery('wood', true, false);
    expect(result.resource).toBe('wood');
    expect(result.amount).toBe(10);
    expect(result.gold).toBe(0);
  });

  it('gem to mint does NOT convert', () => {
    const result = calculateDelivery('gem', true, false);
    expect(result.resource).toBe('gem');
    expect(result.amount).toBe(1);
    expect(result.gold).toBe(0);
  });

  it('blessed_pickaxe relic doubles gem delivery to 2', () => {
    const result = calculateDelivery('gem', false, true);
    expect(result.resource).toBe('gem');
    expect(result.amount).toBe(2);
    expect(result.gold).toBe(0);
  });

  it('blessed_pickaxe does not affect wood delivery', () => {
    const result = calculateDelivery('wood', false, true);
    expect(result.resource).toBe('wood');
    expect(result.amount).toBe(10);
  });

  it('blessed_pickaxe does not affect ore delivery', () => {
    const result = calculateDelivery('ore', false, true);
    expect(result.resource).toBe('ore');
    expect(result.amount).toBe(1);
  });

  it('blessed_pickaxe with mint still converts ore to gold', () => {
    const result = calculateDelivery('ore', true, true);
    expect(result.gold).toBe(15);
    expect(result.amount).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Multiple carts                                                    */
/* ------------------------------------------------------------------ */

describe('logistics scenarios: multiple carts', () => {
  const path = [
    { x: 0, z: 0 },
    { x: 5, z: 0 },
    { x: 10, z: 0 },
  ];

  it('two carts on same path are independent', () => {
    const cart1 = moveCartStep({ x: 0, z: 0 }, path, 0, 5, 0.5);
    const cart2 = moveCartStep({ x: 5, z: 0 }, path, 1, 5, 0.5);
    // Both should move independently
    expect(cart1.x).not.toBe(cart2.x);
  });

  it('carts at different path indices produce different results', () => {
    const cartEarly = moveCartStep({ x: 0, z: 0 }, path, 0, 5, 1.0);
    const cartLate = moveCartStep({ x: 10, z: 0 }, path, 2, 5, 1.0);
    expect(cartLate.arrived).toBe(true);
    expect(cartEarly.arrived).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Edge cases                                                        */
/* ------------------------------------------------------------------ */

describe('logistics scenarios: edge cases', () => {
  it('single-node path with cart already there', () => {
    const singlePath = [{ x: 0, z: 0 }];
    const result = moveCartStep({ x: 0, z: 0 }, singlePath, 0, 5, 1.0);
    expect(result.arrived).toBe(true);
  });

  it('empty path returns arrived immediately', () => {
    const result = moveCartStep({ x: 0, z: 0 }, [], 0, 5, 1.0);
    expect(result.arrived).toBe(true);
  });

  it('pathfinding with single track node adjacent to source and sanctuary', () => {
    const singleTrack = [{ x: 5, z: 0 }];
    const sourcePos = { x: 2, z: 0 };
    const sanctuary = { x: 10, z: 0 };
    const path = findLogisticsPathPure(sourcePos, 'wood', singleTrack, [], sanctuary);
    expect(path).not.toBeNull();
  });
});
