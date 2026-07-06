import { fireEvent, render, screen } from '@testing-library/react';
import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { CurrencyProvider } from '@/shared/context/CurrencyContext';
import type { RecurringBill } from '../domain/recurring-bill.model';
import { RecurringBillList } from './RecurringBillList';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'vi' })),
    set: vi.fn(async () => undefined),
  },
}));

function bill(overrides: Partial<RecurringBill> = {}): RecurringBill {
  return {
    id: 'internet',
    wallet_id: 'wallet',
    category_id: 'utilities',
    name: 'Internet',
    amount: 250_000,
    frequency: 'monthly',
    next_due_date: new Date(2026, 6, 28).getTime(),
    reminder_days: 3,
    is_active: 1,
    created_at: 1,
    updated_at: 1,
    ...overrides,
  };
}

function renderList(bills: RecurringBill[], onAdvanceDueDate = vi.fn()) {
  return {
    onAdvanceDueDate,
    ...render(
      <LanguageProvider>
        <CurrencyProvider>
          <RecurringBillList
            bills={bills}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onToggleActive={vi.fn()}
            onAdvanceDueDate={onAdvanceDueDate}
          />
        </CurrencyProvider>
      </LanguageProvider>,
    ),
  };
}

describe('RecurringBillList', () => {
  beforeEach(() => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'vi' });
  });

  it('always shows the paid action for active bills regardless of due date', async () => {
    const farFuture = bill();
    const overdue = bill({
      id: 'overdue',
      name: 'Electricity',
      next_due_date: new Date(2020, 0, 1).getTime(),
    });

    renderList([farFuture, overdue]);

    expect(await screen.findAllByRole('button', { name: 'Đã trả' })).toHaveLength(2);
  });

  it('does not show the paid action for inactive bills', async () => {
    renderList([bill({ is_active: 0 })]);

    expect(await screen.findByText('Internet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Đã trả' })).toBeNull();
  });

  it('marks the exact displayed billing period as paid', async () => {
    const displayedBill = bill();
    const onAdvanceDueDate = vi.fn();
    renderList([displayedBill], onAdvanceDueDate);

    fireEvent.click(await screen.findByRole('button', { name: 'Đã trả' }));

    expect(onAdvanceDueDate).toHaveBeenCalledOnce();
    expect(onAdvanceDueDate).toHaveBeenCalledWith(displayedBill);
    expect(onAdvanceDueDate.mock.calls[0][0].next_due_date).toBe(
      new Date(2026, 6, 28).getTime(),
    );
  });
});
