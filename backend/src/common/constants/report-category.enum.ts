export enum ReportCategory {
  POTHOLE = 'pothole',
  STREETLIGHT = 'streetlight',
  GARBAGE = 'garbage',
  WATER_LEAKAGE = 'water_leakage',
  DRAINAGE = 'drainage',
  STRAY_ANIMAL = 'stray_animal',
  OTHER = 'other',
}

/** Default base weights for priority scoring per category */
export const DEFAULT_CATEGORY_BASE_WEIGHTS: Record<string, number> = {
  [ReportCategory.POTHOLE]: 6,
  [ReportCategory.STREETLIGHT]: 5,
  [ReportCategory.GARBAGE]: 4,
  [ReportCategory.WATER_LEAKAGE]: 8,
  [ReportCategory.DRAINAGE]: 7,
  [ReportCategory.STRAY_ANIMAL]: 3,
  [ReportCategory.OTHER]: 2,
};
