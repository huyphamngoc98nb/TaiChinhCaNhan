import { describe, expect, it } from 'vitest';
import { normalizeDonutData } from '@/modules/reports/components/normalize-donut-data';

const colors = ['#111', '#222', '#333', '#444', '#555', '#666'];

describe('normalizeDonutData', () => {
  it('keeps all positive items sorted by amount and ignores grouping options', () => {
    const result = normalizeDonutData(
      [
        { id: 'small', label: 'Small', amount: 10 },
        { id: 'largest', label: 'Largest', amount: 50 },
        { id: 'medium', label: 'Medium', amount: 30 },
        { id: 'tiny', label: 'Tiny', amount: 5 },
      ],
      { colors, otherLabel: 'Other', topN: 2, minPercent: 0 },
    );

    expect(result.map(item => item.label)).toEqual(['Largest', 'Medium', 'Small', 'Tiny']);
    expect(result.map(item => item.amount)).toEqual([50, 30, 10, 5]);
    expect(result.some(item => item.label === 'Other' || item.isOther === true)).toBe(false);
    expect(result.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100);
  });

  it('does not group slices below the minimum percent into Other', () => {
    const result = normalizeDonutData(
      [
        { id: 'salary', label: 'Salary', amount: 920 },
        { id: 'bonus', label: 'Bonus', amount: 40 },
        { id: 'refund', label: 'Refund', amount: 40 },
      ],
      { colors, otherLabel: 'Other', topN: 5, minPercent: 5 },
    );

    expect(result.map(item => item.label)).toEqual(['Salary', 'Bonus', 'Refund']);
    expect(result.every(item => item.isOther === false)).toBe(true);
    expect(result.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100);
  });

  it('keeps more than the previous five item limit', () => {
    const result = normalizeDonutData(
      Array.from({ length: 10 }, (_, index) => ({
        id: `category-${index + 1}`,
        label: `Category ${index + 1}`,
        amount: 100 - index,
      })),
      { colors, otherLabel: 'Other' },
    );

    expect(result).toHaveLength(10);
    expect(result.some(item => item.label === 'Other' || item.isOther === true)).toBe(false);
    expect(result.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100);
  });

  it('filters non-positive amounts and uses the translated fallback for blank labels', () => {
    const result = normalizeDonutData(
      [
        { id: 'blank', label: '  ', amount: 25 },
        { id: 'food', label: 'Food', amount: 0 },
        { id: 'bills', label: 'Bills', amount: -10 },
        { id: 'invalid', label: 'Invalid', amount: Number.NaN },
      ],
      { colors, otherLabel: 'Other' },
    );

    expect(result.map(item => item.label)).toEqual(['Other']);
    expect(result[0].percent).toBe(100);
    expect(result[0].isOther).toBe(false);
  });

  it('returns an empty array when total is zero', () => {
    const result = normalizeDonutData(
      [
        { id: 'food', label: 'Food', amount: 0 },
        { id: 'bills', label: 'Bills', amount: -10 },
      ],
      { colors, otherLabel: 'Other' },
    );

    expect(result).toEqual([]);
  });

  it('preserves the input category ID', () => {
    const result = normalizeDonutData(
      [{ id: 'food-id', label: 'Ăn uống', amount: 3_000_000 }],
      { colors, otherLabel: 'Other' },
    );

    expect(result[0].id).toBe('food-id');
  });

  it('keeps categories with the same label distinct by category ID', () => {
    const result = normalizeDonutData(
      [
        { id: 'category-1', label: 'Khác', amount: 1_000_000 },
        { id: 'category-2', label: 'Khác', amount: 500_000 },
      ],
      { colors, otherLabel: 'Other' },
    );

    expect(result).toHaveLength(2);
    expect(result.map(item => item.id)).toEqual(['category-1', 'category-2']);
  });

  it('uses the semantic muted chart token when no palette color is available', () => {
    const result = normalizeDonutData(
      [{ id: 'food', label: 'Food', amount: 100 }],
      { colors: [], otherLabel: 'Other' },
    );

    expect(result[0].color).toBe('var(--chart-net)');
  });

  it('does not mutate source data while normalizing and sorting', () => {
    const source = [
      { id: 'small', label: ' Small ', amount: 10 },
      { id: 'large', label: 'Large', amount: 20 },
    ];
    const snapshot = structuredClone(source);

    normalizeDonutData(source, { colors, otherLabel: 'Other' });

    expect(source).toEqual(snapshot);
  });
});
