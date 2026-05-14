import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from '@/shared/context/LanguageContext';

const preferencesMock = vi.hoisted(() => ({
  value: null as string | null,
  get: vi.fn(async () => ({ value: preferencesMock.value })),
  set: vi.fn(async ({ value }: { key: string; value: string }) => {
    preferencesMock.value = value;
  }),
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: preferencesMock.get,
    set: preferencesMock.set,
  },
}));

function Probe() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <p data-testid="language">{language}</p>
      <p>{t('settings.title')}</p>
      <button type="button" onClick={() => setLanguage('en')}>
        English
      </button>
    </div>
  );
}

beforeEach(() => {
  preferencesMock.value = null;
  preferencesMock.get.mockClear();
  preferencesMock.set.mockClear();
});

describe('LanguageProvider', () => {
  it('defaults to Vietnamese when no saved preference exists', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect((await screen.findByTestId('language')).textContent).toBe('vi');
    expect(screen.getByText('Cài đặt')).toBeTruthy();
  });

  it('loads saved language from Capacitor Preferences', async () => {
    preferencesMock.value = 'en';

    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    expect((await screen.findByTestId('language')).textContent).toBe('en');
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(preferencesMock.get).toHaveBeenCalledWith({ key: 'app_language' });
  });

  it('persists language changes to Capacitor Preferences', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'English' }));

    await waitFor(() => {
      expect(preferencesMock.set).toHaveBeenCalledWith({ key: 'app_language', value: 'en' });
    });
    expect(screen.getByTestId('language').textContent).toBe('en');
  });
});
