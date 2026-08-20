import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RoutingEngineService } from './routing-engine.service';
import { PriorityTier, PRIORITY_THRESHOLDS } from '../common/constants';

/**
 * Unit tests for the routing engine — the "smart" core of CivicPulse.
 * Tests priority scoring, urgency keyword detection, tier assignment,
 * and ward/department resolution logic.
 */
describe('RoutingEngineService', () => {
  let service: RoutingEngineService;

  // Mock models
  const mockWardModel = {
    findOne: jest.fn(),
  };
  const mockRoutingRuleModel = {
    findOne: jest.fn(),
  };
  const mockReportModel = {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };
  const mockConfigModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingEngineService,
        { provide: getModelToken('Ward'), useValue: mockWardModel },
        { provide: getModelToken('RoutingRule'), useValue: mockRoutingRuleModel },
        { provide: getModelToken('Report'), useValue: mockReportModel },
        { provide: getModelToken('SystemConfig'), useValue: mockConfigModel },
      ],
    }).compile();

    service = module.get<RoutingEngineService>(RoutingEngineService);

    // Reset mocks
    jest.clearAllMocks();
  });

  // ── Priority Tier Assignment ────────────────────────────────────

  describe('scoreToPriorityTier', () => {
    it('should return CRITICAL for score >= 40', () => {
      expect(service.scoreToPriorityTier(40)).toBe(PriorityTier.CRITICAL);
      expect(service.scoreToPriorityTier(50)).toBe(PriorityTier.CRITICAL);
      expect(service.scoreToPriorityTier(100)).toBe(PriorityTier.CRITICAL);
    });

    it('should return HIGH for score >= 25 and < 40', () => {
      expect(service.scoreToPriorityTier(25)).toBe(PriorityTier.HIGH);
      expect(service.scoreToPriorityTier(30)).toBe(PriorityTier.HIGH);
      expect(service.scoreToPriorityTier(39)).toBe(PriorityTier.HIGH);
    });

    it('should return MEDIUM for score >= 12 and < 25', () => {
      expect(service.scoreToPriorityTier(12)).toBe(PriorityTier.MEDIUM);
      expect(service.scoreToPriorityTier(18)).toBe(PriorityTier.MEDIUM);
      expect(service.scoreToPriorityTier(24)).toBe(PriorityTier.MEDIUM);
    });

    it('should return LOW for score < 12', () => {
      expect(service.scoreToPriorityTier(0)).toBe(PriorityTier.LOW);
      expect(service.scoreToPriorityTier(5)).toBe(PriorityTier.LOW);
      expect(service.scoreToPriorityTier(11)).toBe(PriorityTier.LOW);
    });

    it('should handle exact boundary values correctly', () => {
      expect(service.scoreToPriorityTier(PRIORITY_THRESHOLDS.MEDIUM)).toBe(PriorityTier.MEDIUM);
      expect(service.scoreToPriorityTier(PRIORITY_THRESHOLDS.HIGH)).toBe(PriorityTier.HIGH);
      expect(service.scoreToPriorityTier(PRIORITY_THRESHOLDS.CRITICAL)).toBe(PriorityTier.CRITICAL);
      expect(service.scoreToPriorityTier(PRIORITY_THRESHOLDS.MEDIUM - 1)).toBe(PriorityTier.LOW);
    });
  });

  // ── Urgency Keyword Scoring ─────────────────────────────────────

  describe('computeUrgencyKeywordScore', () => {
    it('should return 0 for empty description', () => {
      expect(service.computeUrgencyKeywordScore('')).toBe(0);
    });

    it('should return 0 for null/undefined description', () => {
      expect(service.computeUrgencyKeywordScore(null as any)).toBe(0);
      expect(service.computeUrgencyKeywordScore(undefined as any)).toBe(0);
    });

    it('should return 0 for description without urgency keywords', () => {
      expect(service.computeUrgencyKeywordScore('Small crack on the sidewalk')).toBe(0);
    });

    it('should detect "emergency" keyword (score 10)', () => {
      expect(service.computeUrgencyKeywordScore('This is an emergency situation')).toBe(10);
    });

    it('should detect "dangerous" keyword (score 9)', () => {
      expect(service.computeUrgencyKeywordScore('Very dangerous pothole on the road')).toBe(9);
    });

    it('should detect "flooding" keyword (score 8)', () => {
      expect(service.computeUrgencyKeywordScore('Street is flooding rapidly')).toBe(8);
    });

    it('should return the highest score when multiple keywords present', () => {
      // "emergency" (10) and "dangerous" (9) → should return 10
      expect(service.computeUrgencyKeywordScore('emergency dangerous situation')).toBe(10);
    });

    it('should be case-insensitive', () => {
      expect(service.computeUrgencyKeywordScore('EMERGENCY FLOODING')).toBe(10);
      expect(service.computeUrgencyKeywordScore('Dangerous Road')).toBe(9);
    });

    it('should detect "broken" keyword (score 5)', () => {
      expect(service.computeUrgencyKeywordScore('Broken streetlight')).toBe(5);
    });

    it('should detect "collapse" keyword (score 9)', () => {
      expect(service.computeUrgencyKeywordScore('Wall about to collapse')).toBe(9);
    });
  });

  // ── Priority Score Computation ──────────────────────────────────

  describe('computePriority', () => {
    beforeEach(() => {
      // Default config
      mockConfigModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          priority_weights: { w1: 3, w2: 2, w3: 5, w4: 1 },
          category_base_weights: {
            pothole: 6, streetlight: 5, garbage: 4,
            water_leakage: 8, drainage: 7, stray_animal: 3, other: 2,
          },
        }),
      });

      // Default: no nearby reports
      mockReportModel.countDocuments.mockResolvedValue(0);
    });

    it('should compute score with no nearby reports, no upvotes, no urgency', async () => {
      // score = 3*0 + 2*0 + 5*0 + 1*6 = 6 (pothole base weight)
      const result = await service.computePriority(72.55, 23.05, 'pothole', 'Normal pothole', 0);
      expect(result.score).toBe(6);
      expect(result.tier).toBe(PriorityTier.LOW);
    });

    it('should increase score with nearby reports', async () => {
      mockReportModel.countDocuments.mockResolvedValue(5);
      // score = 3*5 + 2*0 + 5*0 + 1*6 = 21
      const result = await service.computePriority(72.55, 23.05, 'pothole', '', 0);
      expect(result.score).toBe(21);
      expect(result.tier).toBe(PriorityTier.MEDIUM);
    });

    it('should increase score with upvotes', async () => {
      // score = 3*0 + 2*10 + 5*0 + 1*6 = 26
      const result = await service.computePriority(72.55, 23.05, 'pothole', '', 10);
      expect(result.score).toBe(26);
      expect(result.tier).toBe(PriorityTier.HIGH);
    });

    it('should increase score with urgency keywords', async () => {
      // score = 3*0 + 2*0 + 5*10 + 1*8 = 58 (emergency keyword=10, water_leakage base=8)
      const result = await service.computePriority(72.55, 23.05, 'water_leakage', 'emergency pipe burst', 0);
      expect(result.score).toBe(58);
      expect(result.tier).toBe(PriorityTier.CRITICAL);
    });

    it('should compute CRITICAL with combined factors', async () => {
      mockReportModel.countDocuments.mockResolvedValue(3);
      // score = 3*3 + 2*5 + 5*9 + 1*7 = 9 + 10 + 45 + 7 = 71 (dangerous keyword=9, drainage base=7)
      const result = await service.computePriority(72.55, 23.05, 'drainage', 'dangerous flooding', 5);
      expect(result.score).toBe(71);
      expect(result.tier).toBe(PriorityTier.CRITICAL);
    });

    it('should use default weights when config is missing', async () => {
      mockConfigModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      // score = 3*0 + 2*0 + 5*0 + 1*2 = 2 (other default weight)
      const result = await service.computePriority(72.55, 23.05, 'other', '', 0);
      expect(result.score).toBe(2);
      expect(result.tier).toBe(PriorityTier.LOW);
    });

    it('should handle water_leakage with high base weight', async () => {
      // score = 3*0 + 2*0 + 5*0 + 1*8 = 8
      const result = await service.computePriority(72.55, 23.05, 'water_leakage', '', 0);
      expect(result.score).toBe(8);
      expect(result.tier).toBe(PriorityTier.LOW);
    });
  });

  // ── Ward Resolution ─────────────────────────────────────────────

  describe('resolveWard', () => {
    it('should return ward when coordinates match', async () => {
      const mockWard = { _id: 'ward-1', name: 'Ward 1' };
      mockWardModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWard),
      });

      const result = await service.resolveWard(72.55, 23.05);
      expect(result).toEqual(mockWard);
      expect(mockWardModel.findOne).toHaveBeenCalledWith({
        boundary: {
          $geoIntersects: {
            $geometry: { type: 'Point', coordinates: [72.55, 23.05] },
          },
        },
      });
    });

    it('should return null when no ward matches', async () => {
      mockWardModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.resolveWard(0, 0);
      expect(result).toBeNull();
    });
  });

  // ── Department Assignment ───────────────────────────────────────

  describe('assignDepartment', () => {
    it('should return department from ward-specific rule', async () => {
      const wardId = 'ward-1' as any;
      const deptId = 'dept-1' as any;
      mockRoutingRuleModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ department_id: deptId }),
      });

      const result = await service.assignDepartment('pothole', wardId);
      expect(result).toBe(deptId);
    });

    it('should fallback to catch-all rule when ward-specific rule not found', async () => {
      const wardId = 'ward-1' as any;
      const deptId = 'dept-fallback' as any;

      mockRoutingRuleModel.findOne
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) }) // ward-specific
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ department_id: deptId }) }); // catch-all

      const result = await service.assignDepartment('pothole', wardId);
      expect(result).toBe(deptId);
    });

    it('should throw NotFoundException when no rule found', async () => {
      mockRoutingRuleModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.assignDepartment('unknown_category', null as any),
      ).rejects.toThrow('No routing rule found');
    });
  });
});
