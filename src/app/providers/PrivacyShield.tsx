export function PrivacyShield() {
  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-bg"
      data-testid="privacy-shield"
      aria-hidden="true"
    >
      <img src="/icon.png" alt="" className="h-20 w-20 rounded-[20px]" />
      <p className="mt-4 text-[17px] font-semibold text-text">Expense Tracker</p>
    </div>
  );
}
