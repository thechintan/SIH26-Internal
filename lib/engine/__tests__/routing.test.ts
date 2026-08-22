import { describe, it, expect } from 'vitest';
import {
  routeToDepartment,
  getCategoriesForDepartment,
  CATEGORY_DEPARTMENT_MAP,
} from '../routing';
import { CategoryEnum, DepartmentEnum } from '../types';

describe('Routing Rules Engine', () => {
  it('maps all 8 primary categories to their respective departments deterministically', () => {
    expect(routeToDepartment(CategoryEnum.STRUCTURAL)).toEqual({
      department: DepartmentEnum.PUBLIC_WORKS,
      autoRouted: true,
      reason: expect.stringContaining('PUBLIC_WORKS'),
    });

    expect(routeToDepartment(CategoryEnum.ELECTRICAL)).toEqual({
      department: DepartmentEnum.ELECTRICAL,
      autoRouted: true,
      reason: expect.stringContaining('ELECTRICAL'),
    });

    expect(routeToDepartment(CategoryEnum.DRAIN_MANHOLE)).toEqual({
      department: DepartmentEnum.WATER_DRAINAGE,
      autoRouted: true,
      reason: expect.stringContaining('WATER_DRAINAGE'),
    });

    expect(routeToDepartment(CategoryEnum.WATER_LEAK)).toEqual({
      department: DepartmentEnum.WATER_DRAINAGE,
      autoRouted: true,
      reason: expect.stringContaining('WATER_DRAINAGE'),
    });

    expect(routeToDepartment(CategoryEnum.POTHOLE)).toEqual({
      department: DepartmentEnum.PUBLIC_WORKS,
      autoRouted: true,
      reason: expect.stringContaining('PUBLIC_WORKS'),
    });

    expect(routeToDepartment(CategoryEnum.FOOTPATH)).toEqual({
      department: DepartmentEnum.PUBLIC_WORKS,
      autoRouted: true,
      reason: expect.stringContaining('PUBLIC_WORKS'),
    });

    expect(routeToDepartment(CategoryEnum.GARBAGE)).toEqual({
      department: DepartmentEnum.SANITATION,
      autoRouted: true,
      reason: expect.stringContaining('SANITATION'),
    });

    expect(routeToDepartment(CategoryEnum.STREETLIGHT)).toEqual({
      department: DepartmentEnum.ELECTRICAL,
      autoRouted: true,
      reason: expect.stringContaining('ELECTRICAL'),
    });
  });

  it('routes OTHER to triage queue (null department)', () => {
    const result = routeToDepartment(CategoryEnum.OTHER);
    expect(result.department).toBeNull();
    expect(result.autoRouted).toBe(false);
    expect(result.reason).toContain('manual triage');
  });

  it('provides reverse lookup of categories for a department', () => {
    const pwCategories = getCategoriesForDepartment(DepartmentEnum.PUBLIC_WORKS);
    expect(pwCategories).toContain(CategoryEnum.POTHOLE);
    expect(pwCategories).toContain(CategoryEnum.FOOTPATH);
    expect(pwCategories).toContain(CategoryEnum.STRUCTURAL);
    expect(pwCategories.length).toBe(3);

    const sanCategories = getCategoriesForDepartment(DepartmentEnum.SANITATION);
    expect(sanCategories).toEqual([CategoryEnum.GARBAGE]);
  });
});
