import { describe, expect, it } from 'vitest';

import { defaultMealSlot, MEAL_SLOTS } from '@/logic/mealSlot';

describe('defaultMealSlot', () => {
  it('picks breakfast before 11:00', () => {
    expect(defaultMealSlot(0)).toBe('breakfast');
    expect(defaultMealSlot(7)).toBe('breakfast');
    expect(defaultMealSlot(10)).toBe('breakfast');
  });

  it('picks lunch from 11:00 until 15:00', () => {
    expect(defaultMealSlot(11)).toBe('lunch');
    expect(defaultMealSlot(14)).toBe('lunch');
  });

  it('picks snack for mid-afternoon, 15:00 until 17:00', () => {
    expect(defaultMealSlot(15)).toBe('snack');
    expect(defaultMealSlot(16)).toBe('snack');
  });

  it('picks dinner from 17:00 until 21:00', () => {
    expect(defaultMealSlot(17)).toBe('dinner');
    expect(defaultMealSlot(20)).toBe('dinner');
  });

  it('picks snack from 21:00', () => {
    expect(defaultMealSlot(21)).toBe('snack');
    expect(defaultMealSlot(23)).toBe('snack');
  });

  it('returns a known slot for every hour of the day', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      expect(MEAL_SLOTS).toContain(defaultMealSlot(hour));
    }
  });
});
