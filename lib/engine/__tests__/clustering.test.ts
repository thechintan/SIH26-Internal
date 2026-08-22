import { describe, it, expect } from 'vitest';
import {
  computeAdaptiveRadius,
  shouldCluster,
  recomputeCentroid,
  haversineDistanceM,
  makeClusteringDecision,
} from '../clustering';
import { CategoryEnum, StatusEnum } from '../types';

describe('Clustering Engine (Pure Logic)', () => {
  describe('computeAdaptiveRadius', () => {
    it('calculates 35m base radius when GPS accuracy is 0', () => {
      expect(computeAdaptiveRadius(0)).toBe(35);
    });

    it('adapts radius with GPS accuracy (e.g., 35 + 25 = 60m)', () => {
      expect(computeAdaptiveRadius(25)).toBe(60);
    });

    it('handles negative accuracy defensively', () => {
      expect(computeAdaptiveRadius(-5)).toBe(35);
    });
  });

  describe('shouldCluster', () => {
    it('allows clustering for same category and open status', () => {
      expect(
        shouldCluster(
          CategoryEnum.POTHOLE,
          CategoryEnum.POTHOLE,
          StatusEnum.SUBMITTED,
        ),
      ).toBe(true);

      expect(
        shouldCluster(
          CategoryEnum.POTHOLE,
          CategoryEnum.POTHOLE,
          StatusEnum.IN_PROGRESS,
        ),
      ).toBe(true);

      expect(
        shouldCluster(
          CategoryEnum.POTHOLE,
          CategoryEnum.POTHOLE,
          StatusEnum.REOPENED,
        ),
      ).toBe(true);
    });

    it('rejects clustering across different categories at the same location', () => {
      expect(
        shouldCluster(
          CategoryEnum.POTHOLE,
          CategoryEnum.STREETLIGHT,
          StatusEnum.SUBMITTED,
        ),
      ).toBe(false);
    });

    it('rejects clustering into RESOLVED or terminal incidents', () => {
      expect(
        shouldCluster(
          CategoryEnum.POTHOLE,
          CategoryEnum.POTHOLE,
          StatusEnum.RESOLVED,
        ),
      ).toBe(false);

      expect(
        shouldCluster(
          CategoryEnum.POTHOLE,
          CategoryEnum.POTHOLE,
          StatusEnum.VERIFIED,
        ),
      ).toBe(false);

      expect(
        shouldCluster(
          CategoryEnum.POTHOLE,
          CategoryEnum.POTHOLE,
          StatusEnum.REJECTED,
        ),
      ).toBe(false);

      expect(
        shouldCluster(
          CategoryEnum.POTHOLE,
          CategoryEnum.POTHOLE,
          StatusEnum.DUPLICATE,
        ),
      ).toBe(false);
    });
  });

  describe('recomputeCentroid', () => {
    it('computes arithmetic mean of member coordinates', () => {
      const locations = [
        { lat: 19.0, lng: 72.0 },
        { lat: 19.1, lng: 72.2 },
      ];
      const centroid = recomputeCentroid(locations);
      expect(centroid.lat).toBeCloseTo(19.05);
      expect(centroid.lng).toBeCloseTo(72.1);
    });

    it('throws when empty locations array is passed', () => {
      expect(() => recomputeCentroid([])).toThrow();
    });
  });

  describe('haversineDistanceM', () => {
    it('computes approx 0 distance for identical coordinates', () => {
      const p = { lat: 19.076, lng: 72.8777 };
      expect(haversineDistanceM(p, p)).toBe(0);
    });

    it('computes approx distance between known coordinates', () => {
      const p1 = { lat: 19.076, lng: 72.8777 };
      const p2 = { lat: 19.0765, lng: 72.8777 }; // ~55m north
      const dist = haversineDistanceM(p1, p2);
      expect(dist).toBeGreaterThan(50);
      expect(dist).toBeLessThan(60);
    });
  });

  describe('makeClusteringDecision', () => {
    it('attaches to nearest eligible open candidate', () => {
      const candidates = [
        {
          incidentId: 'inc-resolved',
          category: CategoryEnum.POTHOLE,
          status: StatusEnum.RESOLVED,
          centroid: { lat: 19.0, lng: 72.0 },
          distanceM: 10,
        },
        {
          incidentId: 'inc-open-diff-cat',
          category: CategoryEnum.GARBAGE,
          status: StatusEnum.SUBMITTED,
          centroid: { lat: 19.0, lng: 72.0 },
          distanceM: 15,
        },
        {
          incidentId: 'inc-open-match',
          category: CategoryEnum.POTHOLE,
          status: StatusEnum.ACKNOWLEDGED,
          centroid: { lat: 19.0, lng: 72.0 },
          distanceM: 20,
        },
      ];

      const decision = makeClusteringDecision(CategoryEnum.POTHOLE, candidates);
      expect(decision).toEqual({
        action: 'attach',
        incidentId: 'inc-open-match',
      });
    });

    it('creates new incident when no candidates are eligible', () => {
      const candidates = [
        {
          incidentId: 'inc-resolved',
          category: CategoryEnum.POTHOLE,
          status: StatusEnum.RESOLVED,
          centroid: { lat: 19.0, lng: 72.0 },
          distanceM: 10,
        },
      ];

      const decision = makeClusteringDecision(CategoryEnum.POTHOLE, candidates);
      expect(decision).toEqual({ action: 'create_new' });
    });
  });
});
