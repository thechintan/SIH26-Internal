import { describe, it, expect } from 'vitest';
import {
  computePriority,
  computePriorityTier,
  computePriorityBatch,
} from '../priority';
import { CategoryEnum, PriorityTierEnum } from '../types';

describe('Priority Scoring Engine', () => {
  describe('PRD Worked Examples (§7)', () => {
    it('calculates pothole worked example correctly: S=6, N=12, D=3, B=0 -> P=12.63', () => {
      const result = computePriority({
        category: CategoryEnum.POTHOLE,
        uniqueUserCount: 12,
        daysOpen: 3,
        previousIncidentId: null,
      });

      // P = 1(6) + 2*ln(13) + 0.5(3) + 0 = 6 + 5.13 + 1.5 = 12.63
      expect(result.score).toBe(12.63);
      expect(result.tier).toBe(PriorityTierEnum.MEDIUM);
      expect(result.factors.severity.baseSeverity).toBe(6);
      expect(result.factors.severity.weighted).toBe(6);
      expect(result.factors.reportCount.uniqueUsers).toBe(12);
      expect(result.factors.reportCount.weighted).toBe(5.13);
      expect(result.factors.age.daysOpen).toBe(3);
      expect(result.factors.age.weighted).toBe(1.5);
      expect(result.factors.recurrence.isRecurring).toBe(false);
      expect(result.factors.recurrence.weighted).toBe(0);
    });

    it('calculates streetlight worked example correctly: S=2, N=1, D=1, B=0 -> P=3.89', () => {
      const result = computePriority({
        category: CategoryEnum.STREETLIGHT,
        uniqueUserCount: 1,
        daysOpen: 1,
        previousIncidentId: null,
      });

      // P = 1(2) + 2*ln(2) + 0.5(1) + 0 = 2 + 1.39 + 0.5 = 3.89
      expect(result.score).toBe(3.89);
      expect(result.tier).toBe(PriorityTierEnum.LOW);
      expect(result.factors.severity.weighted).toBe(2);
      expect(result.factors.reportCount.weighted).toBe(1.39);
      expect(result.factors.age.weighted).toBe(0.5);
      expect(result.factors.recurrence.weighted).toBe(0);
    });
  });

  describe('ENUMS.md Calibration Scenarios', () => {
    it('scores structural failure (50 reporters, 7 days, recurring) as CRITICAL (~23.36)', () => {
      const result = computePriority({
        category: CategoryEnum.STRUCTURAL,
        uniqueUserCount: 50,
        daysOpen: 7,
        previousIncidentId: 'prev-123',
      });

      // 10 + 2*ln(51) + 0.5(7) + 2 = 10 + 7.863 + 3.5 + 2 = 23.36
      expect(result.score).toBe(23.36);
      expect(result.tier).toBe(PriorityTierEnum.CRITICAL);
    });

    it('demonstrates anti-starvation: garbage open for 20 days reaches HIGH tier', () => {
      const result = computePriority({
        category: CategoryEnum.GARBAGE,
        uniqueUserCount: 3,
        daysOpen: 20,
        previousIncidentId: null,
      });

      // 3 + 2*ln(4) + 0.5(20) + 0 = 3 + 2.77 + 10 = 15.77
      expect(result.score).toBe(15.77);
      expect(result.tier).toBe(PriorityTierEnum.HIGH);
    });
  });

  describe('Tier Thresholds', () => {
    it('correctly maps scores to priority tiers', () => {
      expect(computePriorityTier(25.0)).toBe(PriorityTierEnum.CRITICAL);
      expect(computePriorityTier(20.0)).toBe(PriorityTierEnum.CRITICAL);
      expect(computePriorityTier(19.99)).toBe(PriorityTierEnum.HIGH);
      expect(computePriorityTier(14.0)).toBe(PriorityTierEnum.HIGH);
      expect(computePriorityTier(13.99)).toBe(PriorityTierEnum.MEDIUM);
      expect(computePriorityTier(8.0)).toBe(PriorityTierEnum.MEDIUM);
      expect(computePriorityTier(7.99)).toBe(PriorityTierEnum.LOW);
      expect(computePriorityTier(0.0)).toBe(PriorityTierEnum.LOW);
    });
  });

  describe('Logarithmic Compression', () => {
    it('ensures viral reports do not infinitely dominate the queue', () => {
      const base = computePriority({
        category: CategoryEnum.POTHOLE,
        uniqueUserCount: 1,
        daysOpen: 0,
        previousIncidentId: null,
      });

      const tenReports = computePriority({
        category: CategoryEnum.POTHOLE,
        uniqueUserCount: 10,
        daysOpen: 0,
        previousIncidentId: null,
      });

      const hundredReports = computePriority({
        category: CategoryEnum.POTHOLE,
        uniqueUserCount: 100,
        daysOpen: 0,
        previousIncidentId: null,
      });

      const fiveHundredReports = computePriority({
        category: CategoryEnum.POTHOLE,
        uniqueUserCount: 500,
        daysOpen: 0,
        previousIncidentId: null,
      });

      // 1 -> 10 change is significant (~3.4 score diff)
      const diff1to10 = tenReports.score - base.score;
      // 100 -> 500 change is small (~3.2 score diff despite 400 extra reports)
      const diff100to500 = fiveHundredReports.score - hundredReports.score;

      expect(diff1to10).toBeGreaterThan(3.0);
      expect(diff100to500).toBeLessThan(3.5);
    });
  });

  describe('computePriorityBatch', () => {
    it('skips manual override incidents and scores the rest', () => {
      const incidents = [
        {
          id: 'inc-1',
          category: CategoryEnum.POTHOLE,
          uniqueUserCount: 5,
          daysOpen: 2,
          previousIncidentId: null,
          manualOverride: false,
        },
        {
          id: 'inc-2',
          category: CategoryEnum.ELECTRICAL,
          uniqueUserCount: 10,
          daysOpen: 1,
          previousIncidentId: null,
          manualOverride: true, // Should be skipped
        },
      ];

      const scored = computePriorityBatch(incidents);
      expect(scored.has('inc-1')).toBe(true);
      expect(scored.has('inc-2')).toBe(false);
    });
  });
});
