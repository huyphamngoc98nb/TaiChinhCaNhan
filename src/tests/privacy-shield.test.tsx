import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrivacyShield } from '@/app/providers/PrivacyShield';

describe('PrivacyShield', () => {
  it('shows only neutral application identity', () => {
    render(<PrivacyShield />);

    expect(screen.getByTestId('privacy-shield')).toBeTruthy();
    expect(screen.getByText('Expense Tracker')).toBeTruthy();
    expect(screen.queryByText(/balance|transaction|account/i)).toBeNull();
  });
});
