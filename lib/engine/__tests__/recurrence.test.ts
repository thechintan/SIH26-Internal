import { describe, it, expect } from 'vitest';
import {
  isRecurring,
  getRecurrenceBonus,
  buildRecurrenceChain,
} from '../recurrence';

describe('Recurrence Detection', () => {
  describe('isRecurring and getRecurrenceBonus', () => {
    it('returns false and 0 bonus when previousIncidentId is null', () => {
      expect(isRecurring(null)).toBe(false);
      expect(getRecurrenceBonus(null)).toBe(0);
    });

    it('returns true and bonus of 2 when previousIncidentId is present', () => {
      expect(isRecurring('prev-incident-uuid')).toBe(true);
      expect(getRecurrenceBonus('prev-incident-uuid')).toBe(2);
    });
  });

  describe('buildRecurrenceChain', () => {
    it('builds chain of length 1 for new incident without previous history', () => {
      const chain = buildRecurrenceChain('inc-1', []);
      expect(chain.length).toBe(1);
      expect(chain.chain).toEqual(['inc-1']);
      expect(chain.isHotspot).toBe(false);
    });

    it('identifies recurrence chain of length 3+ as a failure hotspot', () => {
      const chain = buildRecurrenceChain('inc-3', ['inc-1', 'inc-2']);
      expect(chain.length).toBe(3);
      expect(chain.chain).toEqual(['inc-1', 'inc-2', 'inc-3']);
      expect(chain.isHotspot).toBe(true);
    });
  });
});
