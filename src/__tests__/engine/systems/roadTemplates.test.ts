/**
 * @module roadTemplates.test
 *
 * TDD tests for the road template system (US-085).
 * Tests selectRoadTemplate() and roadTemplates.json data.
 */

import roadTemplates from '../../../data/roadTemplates.json';
import { selectRoadTemplate } from '../../../engine/mapGenerator';
import { createRng } from '../../../engine/systems/rng';

describe('road template system (US-085)', () => {
  describe('roadTemplates.json', () => {
    it('contains exactly 3 templates', () => {
      expect(roadTemplates.templates).toHaveLength(3);
    });

    it('template 1 (s-curve) has ~8 waypoints', () => {
      const t1 = roadTemplates.templates[0];
      expect(t1.name).toBe('s-curve');
      expect(t1.waypoints.length).toBeGreaterThanOrEqual(7);
      expect(t1.waypoints.length).toBeLessThanOrEqual(9);
    });

    it('template 2 (u-turn) has ~12 waypoints', () => {
      const t2 = roadTemplates.templates[1];
      expect(t2.name).toBe('u-turn');
      expect(t2.waypoints.length).toBeGreaterThanOrEqual(11);
      expect(t2.waypoints.length).toBeLessThanOrEqual(13);
    });

    it('template 3 (winding) has ~16 waypoints', () => {
      const t3 = roadTemplates.templates[2];
      expect(t3.name).toBe('winding');
      expect(t3.waypoints.length).toBeGreaterThanOrEqual(15);
      expect(t3.waypoints.length).toBeLessThanOrEqual(17);
    });

    it('every waypoint has x, y, z number fields', () => {
      for (const template of roadTemplates.templates) {
        for (const wp of template.waypoints) {
          expect(typeof wp.x).toBe('number');
          expect(typeof wp.y).toBe('number');
          expect(typeof wp.z).toBe('number');
        }
      }
    });
  });

  describe('selectRoadTemplate', () => {
    it('returns a template object with waypoints array', () => {
      const rng = createRng('test-road');
      const template = selectRoadTemplate(rng);
      expect(template).toBeDefined();
      expect(Array.isArray(template.waypoints)).toBe(true);
      expect(template.waypoints.length).toBeGreaterThan(0);
    });

    it('returns one of the 3 defined templates', () => {
      const validNames = roadTemplates.templates.map((t) => t.name);
      const rng = createRng('test-road-2');
      const template = selectRoadTemplate(rng);
      expect(validNames).toContain(template.name);
    });

    it('is deterministic for the same seed', () => {
      const rng1 = createRng('deterministic-road');
      const rng2 = createRng('deterministic-road');
      const t1 = selectRoadTemplate(rng1);
      const t2 = selectRoadTemplate(rng2);
      expect(t1.name).toBe(t2.name);
      expect(t1.waypoints).toEqual(t2.waypoints);
    });

    it('can produce different templates with different seeds', () => {
      const names = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const rng = createRng(`road-variety-${i}`);
        names.add(selectRoadTemplate(rng).name);
      }
      // With 3 templates and 50 seeds, we should hit at least 2
      expect(names.size).toBeGreaterThanOrEqual(2);
    });
  });
});
