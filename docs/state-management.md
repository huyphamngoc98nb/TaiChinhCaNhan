# Shared State Strategy

## Decision

Use a layered state strategy:

1. **SQLite is the source of truth for domain data**
   - Wallets, transactions, budgets, reports, recurring bills, backups.
   - Repositories and use cases read/write SQLite.
   - UI hooks may cache loaded rows for a screen, but global state must not become a second database.

2. **React local state is the default for screen-local UI**
   - Form fields, modal/sheet open state, active tabs, loading flags, temporary validation errors.
   - Keep this in `useState` inside the component or feature hook.

3. **Feature hooks own async view state**
   - Examples: `useWallets`, `useTransactions`, `useBudgets`, `useDashboard`.
   - Hooks coordinate use cases, loading/error state, refresh actions, and view models.
   - Hooks should stay close to their module unless reused across multiple modules.

4. **React Context is reserved for provider-shaped dependencies**
   - Toasts, confirmation dialogs, language, currency.
   - Context is acceptable when consumers need a provider boundary or render UI outside the caller.
   - Avoid adding broad domain data Context providers.

5. **Use Zustand for shared client state when cross-route coordination grows**
   - Recommended fit for Capacitor + React because it avoids deep provider nesting, works outside React
     components, and keeps action-based stores small.
   - Do not add Zustand for state that is only used by one page.

## When to Introduce Zustand

Introduce Zustand when at least one of these is true:

- Multiple routes need the same mutable UI/session state.
- A state update needs to be triggered from non-component code.
- Provider nesting starts growing only to pass shared app state.
- A feature needs optimistic UI state or pending sync state across screens.
- The same screen data is repeatedly refetched only because route components unmount/remount.

Good initial candidates:

- App/session readiness if bootstrap grows beyond DB init.
- Currency/language after moving persistence to Capacitor Preferences consistently.
- Lightweight refresh invalidation, for example `walletsVersion` or `transactionsVersion`, not copied rows.
- UI shell state shared across routes.

Avoid Zustand for:

- SQLite rows as durable normalized app data.
- One-off form state.
- Toast/confirm rendering unless the current Context implementation becomes limiting.

## Proposed Folder Shape

```text
src/
  core/
    state/
      app.store.ts
      refresh.store.ts
  modules/
    wallets/
      hooks/
      services/
      repositories/
```

Store rules:

- Export selectors/hooks, not the raw store everywhere.
- Keep actions in the store file.
- Persist only small preferences/session flags.
- Use Capacitor Preferences for persisted mobile settings; avoid direct `localStorage` for mobile-facing
  state unless web-only.
- Use repository/use case methods for database writes, then invalidate or refresh feature hooks.

## Example Pattern

```ts
import { create } from 'zustand';

interface RefreshState {
  walletsVersion: number;
  bumpWallets: () => void;
}

export const useRefreshStore = create<RefreshState>((set) => ({
  walletsVersion: 0,
  bumpWallets: () => set((state) => ({ walletsVersion: state.walletsVersion + 1 })),
}));
```

Feature hooks can subscribe to version counters and reload from SQLite. This keeps SQLite authoritative
while still allowing cross-screen refresh coordination.

## Current App Position

The current codebase does not yet require Zustand for correctness. Existing Context providers are small
and feature hooks are module-scoped. The next state refactor should be incremental:

1. Add `zustand` only when the first cross-route shared state appears.
2. Start with refresh/session/preferences state.
3. Keep domain data behind repositories and use cases.
4. Add tests for store actions before wiring them into screens.
