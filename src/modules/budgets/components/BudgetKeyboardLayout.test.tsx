import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('budget form keyboard layout contract', () => {
  it('enables Android fullscreen for both add and edit sheets', () => {
    const pageSource = readSource('src/modules/budgets/pages/BudgetSettingsPage.tsx');

    expect(pageSource.match(/fullScreenOnAndroid/g)).toHaveLength(2);
    expect(pageSource).toContain('logContext="BudgetEditForm"');
    expect(pageSource).toContain('logContext="BudgetAddForm"');
  });

  it('keeps the add form order and hides controls below amount while typing', () => {
    const source = readSource('src/modules/budgets/components/BudgetAddSheet.tsx');
    const categoryIndex = source.indexOf('{/* Category Picker */}');
    const periodIndex = source.indexOf('{/* Period Toggle */}');
    const amountIndex = source.indexOf('{/* Amount Input */}');
    const scopeIndex = source.indexOf('{/* Scope Picker */}');
    const footerIndex = source.indexOf('{/* Footer */}');

    expect(categoryIndex).toBeGreaterThan(-1);
    expect(categoryIndex).toBeLessThan(periodIndex);
    expect(periodIndex).toBeLessThan(amountIndex);
    expect(amountIndex).toBeLessThan(scopeIndex);
    expect(scopeIndex).toBeLessThan(footerIndex);
    expect(source).toContain('data-budget-form="true"');
    expect(source.match(/data-keyboard-hide-on-open="true"/g)).toHaveLength(2);
  });

  it('keeps the edit form stable until amount is selected and restores its footer', () => {
    const source = readSource('src/modules/budgets/components/BudgetEditForm.tsx');
    const periodIndex = source.indexOf('{/* Period Toggle */}');
    const amountIndex = source.indexOf('{/* Amount Input */}');
    const scopeIndex = source.indexOf('{/* Scope Picker */}');
    const removeIndex = source.indexOf('{/* Remove Link */}');
    const footerIndex = source.indexOf('{/* Footer stays');

    expect(periodIndex).toBeLessThan(amountIndex);
    expect(amountIndex).toBeLessThan(scopeIndex);
    expect(scopeIndex).toBeLessThan(removeIndex);
    expect(removeIndex).toBeLessThan(footerIndex);
    expect(source).not.toMatch(/\sautoFocus(?:\s|=)/);
    expect(source).toContain('data-budget-form="true"');
    expect(source.match(/data-keyboard-hide-on-open="true"/g)).toHaveLength(3);
  });

  it('scopes keyboard-only collapsing to the active budget form', () => {
    const css = readSource('src/index.css');

    expect(css).toContain(
      '[data-budget-form="true"][data-money-keyboard-active="true"]',
    );
    expect(css).toContain('[data-keyboard-hide-on-open="true"]');
    expect(css).toContain(
      '.keyboard-safe-bottom-sheet[data-money-keyboard-active="true"]',
    );
  });
});
