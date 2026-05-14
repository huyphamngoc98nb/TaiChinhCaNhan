import { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { updateCoordinator } from '@/services/updateCoordinator';
import versionConfig from '../../../../version.config.json';

type CheckState =
  | 'idle'
  | 'checking'
  | 'up_to_date'
  | 'bundle_available'
  | 'native_required'
  | 'throttled'
  | 'api_error';

const feedback: Record<Exclude<CheckState, 'idle'>, { icon: string; text: string; className: string }> = {
  checking: {
    icon: '',
    text: 'Đang kiểm tra...',
    className: 'text-indigo-600',
  },
  up_to_date: {
    icon: '✅',
    text: 'Đã là phiên bản mới nhất',
    className: 'text-emerald-600',
  },
  bundle_available: {
    icon: '🔄',
    text: 'Đang cập nhật trong nền...',
    className: 'text-indigo-600',
  },
  native_required: {
    icon: '⬇️',
    text: 'Đang tải bản cập nhật...',
    className: 'text-indigo-600',
  },
  throttled: {
    icon: '🕐',
    text: 'Đã kiểm tra gần đây',
    className: 'text-amber-600',
  },
  api_error: {
    icon: '❌',
    text: 'Không thể kiểm tra. Thử lại sau.',
    className: 'text-red-600',
  },
};

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function CheckUpdateButton() {
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const currentFeedback = checkState === 'idle' ? null : feedback[checkState];

  async function handleCheck(): Promise<void> {
    setCheckState('checking');

    try {
      const result = await updateCoordinator.checkAndUpdate({ forceCheck: true });
      setCheckState(result.status);
    } catch {
      setCheckState('api_error');
    }
  }

  return (
    <section aria-label="Phiên bản ứng dụng">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
          <RefreshCcw size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-gray-900">Phiên bản ứng dụng</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">v{versionConfig.nativeVersionName}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Bundle: {versionConfig.bundleVersion}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheck}
        disabled={checkState === 'checking'}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-indigo-50 text-indigo-600 text-[14px] font-semibold active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {checkState === 'checking' ? (
          <>
            <Spinner />
            Đang kiểm tra...
          </>
        ) : (
          <>
            <RefreshCcw size={16} />
            Kiểm tra cập nhật
          </>
        )}
      </button>

      {currentFeedback ? (
        <p className={`mt-3 text-[12px] font-medium ${currentFeedback.className}`} role="status">
          {checkState === 'checking' ? <Spinner /> : <span className="mr-1">{currentFeedback.icon}</span>}
          <span className={checkState === 'checking' ? 'ml-2' : ''}>{currentFeedback.text}</span>
        </p>
      ) : null}
    </section>
  );
}
