import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/updateCoordinator', () => ({
  updateCoordinator: {
    checkAndUpdate: vi.fn(),
  },
}));

vi.mock('../../version.config.json', () => ({
  default: { bundleVersion: '0.1.0-b1', nativeVersionName: '0.1.0' },
}));

import { updateCoordinator } from '@/services/updateCoordinator';
import { CheckUpdateButton } from '@/modules/settings/components/CheckUpdateButton';

const mockCheck = vi.mocked(updateCoordinator.checkAndUpdate);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CheckUpdateButton', () => {
  it('should render check button in idle state', () => {
    render(<CheckUpdateButton />);

    expect(screen.getByRole('button', { name: /Kiểm tra cập nhật/ })).toBeTruthy();
  });

  it('should display nativeVersionName and bundleVersion', () => {
    render(<CheckUpdateButton />);

    expect(screen.getByText('v0.1.0')).toBeTruthy();
    expect(screen.getByText('Bundle: 0.1.0-b1')).toBeTruthy();
  });

  it('should call checkAndUpdate with forceCheck=true on click', async () => {
    mockCheck.mockResolvedValue({ strategy: 'none', status: 'up_to_date' });
    render(<CheckUpdateButton />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra cập nhật/ }));

    await waitFor(() => {
      expect(mockCheck).toHaveBeenCalledWith({ forceCheck: true });
    });
  });

  it('should disable button and show checking text while loading', () => {
    mockCheck.mockReturnValue(new Promise(() => undefined));
    render(<CheckUpdateButton />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra cập nhật/ }));

    const button = screen.getByRole('button', { name: /Đang kiểm tra/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getAllByText('Đang kiểm tra...').length).toBeGreaterThan(0);
  });

  it('should show up_to_date message when result is up_to_date', async () => {
    mockCheck.mockResolvedValue({ strategy: 'none', status: 'up_to_date' });
    render(<CheckUpdateButton />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra cập nhật/ }));

    expect(await screen.findByText('Đã là phiên bản mới nhất')).toBeTruthy();
  });

  it('should show error message when result is api_error', async () => {
    mockCheck.mockResolvedValue({ strategy: 'none', status: 'api_error' });
    render(<CheckUpdateButton />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra cập nhật/ }));

    expect(await screen.findByText('Không thể kiểm tra. Thử lại sau.')).toBeTruthy();
  });

  it('should show native_required message when APK download starts', async () => {
    mockCheck.mockResolvedValue({ strategy: 'A', status: 'native_required' });
    render(<CheckUpdateButton />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra cập nhật/ }));

    expect(await screen.findByText('Đang tải bản cập nhật...')).toBeTruthy();
  });

  it('should show bundle_available message', async () => {
    mockCheck.mockResolvedValue({ strategy: 'B', status: 'bundle_available' });
    render(<CheckUpdateButton />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra cập nhật/ }));

    expect(await screen.findByText('Đang cập nhật trong nền...')).toBeTruthy();
  });

  it('should show throttled message', async () => {
    mockCheck.mockResolvedValue({ strategy: 'none', status: 'throttled' });
    render(<CheckUpdateButton />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra cập nhật/ }));

    expect(await screen.findByText('Đã kiểm tra gần đây')).toBeTruthy();
  });

  it('should bypass throttle and still call API when forceCheck=true', async () => {
    mockCheck.mockResolvedValue({ strategy: 'none', status: 'throttled' });
    render(<CheckUpdateButton />);

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra cập nhật/ }));

    await waitFor(() => {
      expect(mockCheck).toHaveBeenCalledTimes(1);
      expect(mockCheck).toHaveBeenCalledWith({ forceCheck: true });
    });
  });
});
