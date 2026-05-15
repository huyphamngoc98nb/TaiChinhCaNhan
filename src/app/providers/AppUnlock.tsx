import { FormEvent, useState } from 'react';
import { authService } from '@/core/auth/auth.service';

interface AppUnlockProps {
  onUnlocked: () => void;
}

export function AppUnlock({ onUnlocked }: AppUnlockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await authService.unlockWithPin(pin);
      setPin('');
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unlock app.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[18px] bg-white p-5 shadow-sm border border-gray-100"
      >
        <h1 className="text-[22px] font-bold text-gray-900 mb-2">Unlock data</h1>
        <p className="text-[13px] text-gray-500 mb-5">
          Enter your PIN. On supported native devices, the encrypted database secret is protected by the system secure store.
        </p>

        <label className="block text-[12px] font-semibold text-gray-700 mb-2" htmlFor="app-pin">
          PIN
        </label>
        <input
          id="app-pin"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          minLength={6}
          className="w-full h-12 rounded-[12px] border border-gray-200 px-3 text-[16px] outline-none focus:border-indigo-500"
          disabled={submitting}
        />

        {error && (
          <p className="mt-3 text-[12px] text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || pin.trim().length < 6}
          className="mt-5 w-full h-12 rounded-[12px] bg-indigo-500 text-white text-[14px] font-semibold disabled:opacity-50"
        >
          {submitting ? 'Verifying...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
