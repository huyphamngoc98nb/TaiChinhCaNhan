export interface RawDonutItem {
  label: string;
  amount: number;
}

export interface DonutItem {
  id: string;
  label: string;
  amount: number;
  percent: number;
  percentLabel: string;
  color: string;
  isOther?: boolean;
}

interface NormalizeDonutDataOptions {
  colors: string[];
  otherLabel: string;
  // Kept for backward compatibility; donut items are no longer grouped.
  topN?: number;
  minPercent?: number;
}

const makeId = (label: string, index: number) => `${label.trim().toLowerCase()}-${index}`;

const formatPercentLabel = (percent: number) => {
  if (percent >= 10 || Number.isInteger(percent)) return `${percent.toFixed(0)}%`;
  return `${percent.toFixed(1)}%`;
};

export function normalizeDonutData(
  rawItems: RawDonutItem[],
  { colors }: NormalizeDonutDataOptions,
): DonutItem[] {
  const sortedItems = rawItems
    .map(item => ({
      label: item.label.trim() || 'Uncategorized',
      amount: Number.isFinite(item.amount) ? Math.max(0, item.amount) : 0,
    }))
    .filter(item => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = sortedItems.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return [];

  return sortedItems.map((item, index) => ({
    id: makeId(item.label, index),
    label: item.label,
    amount: item.amount,
    percent: (item.amount / total) * 100,
    percentLabel: formatPercentLabel((item.amount / total) * 100),
    color: colors[index % colors.length],
    isOther: false,
  }));
}
