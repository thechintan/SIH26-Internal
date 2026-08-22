import { describe, it, expect } from 'vitest';
import { validateMerge, computeMerge } from '../merge';
import { CategoryEnum, StatusEnum } from '../types';

describe('Merge Incidents Logic', () => {
  describe('validateMerge', () => {
    it('approves merge for distinct same-category active incidents', () => {
      const primary = {
        id: 'inc-1',
        category: CategoryEnum.POTHOLE,
        status: StatusEnum.SUBMITTED,
      };
      const secondary = {
        id: 'inc-2',
        category: CategoryEnum.POTHOLE,
        status: StatusEnum.ACKNOWLEDGED,
      };

      const result = validateMerge(primary, secondary);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('rejects merge with self', () => {
      const inc = {
        id: 'inc-1',
        category: CategoryEnum.POTHOLE,
        status: StatusEnum.SUBMITTED,
      };
      const result = validateMerge(inc, inc);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Cannot merge an incident with itself');
    });

    it('rejects merge between different categories', () => {
      const primary = {
        id: 'inc-1',
        category: CategoryEnum.POTHOLE,
        status: StatusEnum.SUBMITTED,
      };
      const secondary = {
        id: 'inc-2',
        category: CategoryEnum.ELECTRICAL,
        status: StatusEnum.SUBMITTED,
      };

      const result = validateMerge(primary, secondary);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Category mismatch');
    });

    it('rejects merge if either incident is in terminal status', () => {
      const primary = {
        id: 'inc-1',
        category: CategoryEnum.POTHOLE,
        status: StatusEnum.VERIFIED,
      };
      const secondary = {
        id: 'inc-2',
        category: CategoryEnum.POTHOLE,
        status: StatusEnum.SUBMITTED,
      };

      const result = validateMerge(primary, secondary);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('terminal status');
    });
  });

  describe('computeMerge', () => {
    it('combines reports, picks earliest timestamp, and recalculates centroid', () => {
      const d1 = new Date('2026-08-20T10:00:00Z');
      const d2 = new Date('2026-08-21T10:00:00Z');

      const primary = { id: 'inc-1', firstReportedAt: d2 };
      const secondary = { id: 'inc-2', firstReportedAt: d1 };

      const locations = [
        { lat: 19.0, lng: 72.0 },
        { lat: 19.2, lng: 72.4 },
      ];

      const merged = computeMerge(primary, secondary, locations, 5);

      expect(merged.primaryId).toBe('inc-1');
      expect(merged.secondaryId).toBe('inc-2');
      expect(merged.newReportCount).toBe(5);
      expect(merged.newFirstReportedAt).toEqual(d1); // Earliest
      expect(merged.newCentroid.lat).toBeCloseTo(19.1);
      expect(merged.newCentroid.lng).toBeCloseTo(72.2);
    });

    it('throws if no report locations provided', () => {
      const d = new Date();
      expect(() =>
        computeMerge(
          { id: 'inc-1', firstReportedAt: d },
          { id: 'inc-2', firstReportedAt: d },
          [],
          0,
        ),
      ).toThrow();
    });
  });
});
