# TaiChinhCaNhan UI redesign migration plan

**Status:** Phase 2 planning; no production UI changes in this phase
**Contract:** [`design.md`](../design.md)
**Implementation boundary:** preserve routes, business logic, repositories, SQLite/database code, calculations, translations, and the existing React/Vite/Capacitor/Tailwind/Recharts stack.

## 1. Audit summary

The application already has a usable light/dark color foundation and a practical system font, but the UI does not yet behave as one design system. Shared tokens are only partially mapped into Tailwind, while screens use legacy palette utilities, raw colors, arbitrary text sizes, radii, shadows, and local interaction patterns.

The highest-risk gaps are not cosmetic:

- Overlay components lack a complete dialog, focus-containment, dismissal, and restoration contract.
- Several frequent Android controls are below the 44 × 44 px touch-target minimum.
- Focus treatment is sparse or explicitly suppressed in chart code.
- Chart series do not have a theme-safe semantic palette or a consistently accessible non-visual representation.
- Light and dark primary fills do not use a tested foreground pairing.
- Loading, empty, error, selected, excluded, and disabled treatments vary by module or are absent.
- Settings repeat local label/toggle implementations and place generic cards inside generic cards.
- Dense mobile pages rely on arbitrary sizing and require explicit behavior at 320, 375, 414, and 768 px.

The design contract resolves the target system. Implementation must now proceed from shared primitives outward, keeping visual and functional work separable in review.

## 2. Evidence baseline

Static audit findings in the requested scopes:

- 67 raw color values across 15 production files.
- 167 legacy Tailwind palette references across 27 production files.
- 119 arbitrary radius values across 32 production files.
- 194 arbitrary text-size values across 28 production files.
- 74 button elements, with only three button-bearing files declaring an explicit `focus-visible` treatment.

Measured examples:

- `--text-subtle` on a white surface: approximately 2.56:1.
- `--text-muted` on the light app background: approximately 4.43:1.
- White on light `--primary`: approximately 4.47:1.
- White on dark `--primary`: approximately 2.98:1.
- Current net chart color on dark surface: approximately 2.58:1.
- Current income chart color on dark surface: approximately 4.30:1.
- Current expense chart color on dark surface: approximately 3.45:1.

These values are evidence for migration priorities, not permission to perform global substitutions. Contrast must be checked against the actual component surface and text size.

## 3. Findings mapped to implementation tasks

### Visual-system tasks

| ID | Finding | Implementation task | Primary files | Depends on |
|---|---|---|---|---|
| V1 | Tailwind exposes only part of the existing variable system | Add approved semantic roles from `design.md` with their first consumers; extend the Tailwind bridge without raw palette aliases | `src/index.css`, `tailwind.config.js` | Contract locked |
| V2 | Buttons, fields, cards, and rows vary by screen | Build or normalize Button, IconButton, Card, ListRow, Input, Select, and state primitives | `src/shared/components/**` | V1 |
| V3 | Repeated arbitrary type, spacing, radius, and shadow values | Migrate each primitive to the contract scale; remove obsolete local values only after consumers move | `src/shared/components/**`, module component styles | V2 |
| V4 | Generic card patterns flatten hierarchy and create card-in-card settings | Introduce grouped-section and setting-row composition; reserve Card for coherent standalone concepts | `src/modules/settings/**`, shared components | V2 |
| V5 | Reports use raw series colors and inconsistent filters/metrics | Add ChartCard and SummaryMetric composition; use chart tokens and responsive control layout | `src/modules/reports/**` | V1–V3 |
| V6 | Transaction form and rows use local palettes and compact actions | Migrate form controls, type selector, submit action, transaction rows, and filters | `src/modules/transactions/**` | V1–V3 |
| V7 | Loading, empty, error, selected, and disabled visuals are inconsistent | Normalize shared state surfaces and adopt them screen by screen | `src/shared/components/**`, requested modules | V2 |
| V8 | Home/dashboard is composed from unstable local card variants | Rebuild composition using stabilized metrics, chart card, rows, and quick actions | `src/modules/transactions/pages/DashboardPage.tsx` and its children | V5–V7 |

### Functional and accessibility tasks

Keep these commits or pull-request sections distinct from visual-only changes so regressions are attributable.

| ID | Finding | Functional task | Primary files | Depends on |
|---|---|---|---|---|
| F1 | Bottom sheet and confirmation dialog lack complete modal semantics | Add labelled dialog semantics, initial focus, focus containment, Escape/Android-back handling, and focus restoration | `src/shared/components/BottomSheet.tsx`, `src/shared/components/ConfirmDialog.tsx` | V2 |
| F2 | Dropdown keyboard behavior and option sizing are incomplete | Implement trigger/list relationship, active option model, keyboard navigation, dismissal, and 44 px options | `src/shared/components/DropdownList.tsx` | V2 |
| F3 | Toasts lack a consistent announcement and dismiss contract | Add appropriate live-region behavior, accessible close action, stable timeout behavior, and reduced-motion handling | `src/shared/components/Toast.tsx`, `src/shared/components/Toast.css` | V1–V2 |
| F4 | Recharts focus is blurred and accessibility is disabled | Restore focus, enable or replace Recharts accessibility support, and add a textual/table data alternative | `src/modules/reports/components/CashflowTrendChart.tsx`, related report chart components | V5 |
| F5 | Small controls fail Android target guidance | Enlarge hit areas without inflating visual icons; verify overlap and scroll behavior | Date/time, report filter, export, reminder, and row-action components | V2 |
| F6 | Some pages do not distinguish loading, no data, no results, and load failure | Wire existing application state into the appropriate shared state surface without changing data semantics | Requested module pages | V7 |
| F7 | Dynamic viewport, safe-area, and keyboard states can cover actions | Verify sheet/form placement using existing viewport and keyboard variables; correct layout behavior only | Shared overlays and transaction forms | F1, V6 |

## 4. Affected files and ownership

The exact implementation diff should remain smaller than this inventory. Only touch a file when its component is part of the active migration stage.

### Foundation

- `src/index.css`
- `tailwind.config.js`

### Shared primitives and state

- `src/shared/components/BottomSheet.tsx`
- `src/shared/components/ConfirmDialog.tsx`
- `src/shared/components/DropdownList.tsx`
- `src/shared/components/Toast.tsx`
- `src/shared/components/Toast.css`
- `src/shared/components/DateTimePicker.tsx`
- `src/shared/components/EmptyState.tsx`
- `src/shared/components/ErrorScreen.tsx`
- `src/shared/components/LoadingScreen.tsx`
- `src/shared/components/SkeletonCard.tsx`
- `src/shared/components/ProgressBar.tsx`
- Existing shared button, card, field, row, and layout components discovered during implementation

### Reports

- `src/modules/reports/pages/ReportsPage.tsx`
- `src/modules/reports/components/CashflowTrendChart.tsx`
- Report date-range, granularity, summary, export, and chart components under `src/modules/reports/**`

### Transactions and home

- `src/modules/transactions/components/TransactionForm.tsx`
- `src/modules/transactions/components/TransactionItem.tsx`
- `src/modules/transactions/pages/DashboardPage.tsx`
- Transaction filters, date controls, lists, and page styles under `src/modules/transactions/**`
- Note: there is no current `src/modules/home` directory; the audited home/dashboard surface is `DashboardPage.tsx` in the transactions module.

### Settings

- `src/modules/settings/pages/SettingsPage.tsx`
- `src/modules/settings/components/CurrencySettings.tsx`
- `src/modules/settings/components/DatabaseDiagnostics.tsx`
- `src/modules/settings/components/DisplayFormatSettings.tsx`
- `src/modules/settings/components/LanguageSettings.tsx`
- `src/modules/settings/components/ThemeSelector.tsx`
- `src/modules/settings/components/TransactionInputSettings.tsx`
- `src/modules/settings/components/UiPersonalizationSettings.tsx`
- Notification/reminder controls under `src/modules/settings/**`

### Budgets

- Budget pages and components discovered under `src/modules/**` when that stage begins
- Reuse shared SummaryMetric, Progress, ListRow, form, and state primitives; avoid a budget-specific visual subsystem

## 5. Component-level redesign order

### Stage 1 — Foundation and shared primitives

1. Add only the semantic tokens needed by the first primitive.
2. Normalize Button and IconButton.
3. Normalize Input, Select, and date/time controls.
4. Normalize Card, grouped section, ListRow, SummaryMetric, and shared state surfaces.
5. Consolidate focus, selected, disabled, error, loading, and reduced-motion behavior.

**Exit condition:** shared primitive examples pass both themes, keyboard checks, and all four viewport widths.

### Stage 2 — Shared overlays and transient feedback

1. BottomSheet.
2. ConfirmDialog.
3. DropdownList.
4. Toast.

Visual styling and focus/dismissal behavior should be reviewed as separate changes even when delivered in the same stage.

**Exit condition:** modal focus never escapes, dismissal restores focus, Android back behavior is defined, safe areas are respected, and assistive announcements are not duplicated.

### Stage 3 — Reports

1. Summary metrics.
2. Date-range and granularity controls.
3. ChartCard framing and chart semantic palette.
4. Accessible chart summary/table.
5. Report loading, empty, error, selected-filter, and export states.

**Exit condition:** every plotted value has a non-color, non-pointer path; charts and filters remain usable at 320 px.

### Stage 4 — Transactions

1. Transaction form fields and type selector.
2. Primary submit/loading/disabled behavior.
3. Transaction ListRow and amount hierarchy.
4. Filters and date controls.
5. Loading, no-data, no-result, and error differentiation.

**Exit condition:** the main add/edit flow is one-hand friendly, keyboard-safe, and does not alter validation, persistence, or calculation behavior.

### Stage 5 — Budgets

1. Summary and progress.
2. Budget rows and status indicators.
3. Create/edit form.
4. Empty, exceeded, warning, and error states.

**Exit condition:** status is understandable without color and reuses the established primitives.

### Stage 6 — Settings

1. Create shared SettingRow, SettingLabel, and toggle/choice patterns.
2. Replace nested `.card` composition with grouped sections and dividers.
3. Migrate theme, language, currency, display, input, personalization, notification, and diagnostics sections.
4. Verify long labels and explanatory copy at all font scales.

**Exit condition:** no generic card is nested inside another generic card and duplicated setting helpers are removed.

### Stage 7 — Home/dashboard

1. Compose the stabilized SummaryMetric, ChartCard, ListRow, state, and quick-action patterns.
2. Establish a clear page total, secondary metrics, recent activity, and one dominant action.
3. Remove leftover dashboard-only card and typography variants.

**Exit condition:** home introduces no new primitive variant and remains coherent with reports and transactions.

## 6. Dependencies and sequencing

```text
Design contract
  -> semantic runtime roles
    -> shared primitives
      -> overlays and feedback
      -> reports
      -> transactions
        -> budgets
        -> settings
          -> home/dashboard
```

Reports may begin after core primitives are stable. Transactions may proceed in parallel only when it does not create competing primitive variants. Home remains last because it consumes patterns from reports, transactions, and shared state.

## 7. Visual versus functional change boundary

### Visual-only examples

- Replacing a raw color with an approved semantic token.
- Applying the contract type, spacing, radius, border, and elevation roles.
- Removing nested card chrome while retaining the same controls and order.
- Increasing a hit box with padding or a pseudo-element when event behavior is unchanged.
- Reflowing controls at the specified widths without changing their meaning.

### Functional/accessibility examples

- Adding keyboard navigation to a dropdown.
- Trapping and restoring focus in a dialog or sheet.
- Handling Escape or Android back.
- Changing live-region behavior or toast duration.
- Adding an accessible chart data representation.
- Distinguishing a load error from an empty data result.

Functional changes require targeted tests and must not be hidden inside broad visual cleanup. Neither category authorizes changes to routes, calculations, storage, repositories, database schema, or translations.

## 8. Regression risks

| Risk | Likely regression | Mitigation |
|---|---|---|
| Token migration | Theme-specific contrast or an unstyled legacy consumer | Add tokens with first consumer; test light/dark side by side |
| Global legacy cleanup | Unrelated screens change unexpectedly | Migrate by component and remove old rules only after usage search |
| Larger targets | Row height, wrapping, or adjacent target overlap changes | Test dense lists and controls at 320 px with long labels |
| Overlay semantics | Focus loops, Android back conflicts, or keyboard-covered actions | Component tests plus Android-host manual checks; retain viewport variables |
| Settings flattening | Control grouping or explanatory context becomes unclear | Preserve DOM order and labels; use section headings/dividers |
| Chart palette change | Series identity changes or tooltip/legend mismatch | Centralize series mapping and test every chart consumer |
| Accessible chart alternative | Duplicate screen-reader output or stale values | One labelled summary source tied to active filters |
| Typography normalization | Large amounts or Vietnamese copy overflow | Use tabular numerals, allowed wrapping, and all target widths/font scale |
| State consolidation | Empty state shown during loading or after failure | Test state precedence explicitly |
| CSS transition cleanup | State change becomes visually abrupt or reduced-motion breaks | Use approved property-specific durations and reduced-motion tests |
| Z-index normalization | Menu, sheet, toast, or keyboard layer appears in the wrong order | Define and test a small overlay layer order before deleting local values |

## 9. Required verification

Every production implementation stage runs the repository's existing typecheck, lint, unit-test, and build commands. Add focused tests in proportion to the component risk.

### Automated checks

- Token usage/static check for new raw hex and legacy palette additions in migrated components.
- Contrast assertions for approved foreground/background pairs where feasible.
- Primitive tests for variants and default, focus, selected, disabled, loading, and error states.
- Keyboard tests for dropdown, dialog, bottom sheet, date/time controls, and chart filters.
- Focus-containment, Escape dismissal, focus restoration, and accessible-name tests.
- State precedence tests: loading → content, empty, filtered-empty, error, background refresh.
- Report tests that confirm chart summaries match the active series, period, and filters.
- Existing calculation, repository, database, and translation tests remain unchanged and passing.

### Viewport and theme matrix

Verify at 320, 375, 414, and 768 px in:

- Light and dark themes.
- Default and largest supported app font scale.
- Long Vietnamese labels and large positive/negative amounts.
- Money visible and hidden.
- Loading, empty, filtered-empty, error, selected, excluded, disabled, and saving states.
- Portrait Android safe-area and soft-keyboard conditions.

### Manual Android-host checks

- One-handed reach for frequent actions.
- Every interactive target is at least 44 × 44 CSS px.
- Native back dismisses the topmost overlay before navigating.
- Soft keyboard does not cover the active field or primary action.
- Focus returns to the invoking control after sheet/dialog dismissal.
- TalkBack reads control name, role, value/state, error, and chart alternative in a sensible order.
- Reduced motion removes transforms and nonessential animation.

Per repository policy, do not run device, emulator, or sandbox test flows during this planning task. Schedule Android-host checks for the production implementation phase.

## 10. Stage acceptance criteria

A stage is complete only when:

- It conforms to `design.md` without new page-specific tokens or arbitrary visual values.
- New semantic tokens have both light and dark values and at least one real consumer.
- Required text meets WCAG 2.2 AA contrast for its actual size and surface.
- Focus is visible and no migrated component suppresses focus programmatically.
- Touch targets meet 44 × 44 px and remain non-overlapping.
- All defined component states have an intentional visual and accessible treatment.
- The 320, 375, 414, and 768 px matrix passes without horizontal page scroll or clipped financial amounts.
- Reduced-motion behavior is verified.
- Visual and functional changes are clearly separated in the diff and test report.
- Routes, business logic, repositories, database behavior, calculations, and translations are unchanged unless separately authorized.
- Typecheck, lint, relevant tests, and production build pass.
- User-facing release notes are updated for observable implementation changes.

## 11. Deferred work

The following is deliberately outside Phase 2:

- Redesigning any application screen.
- Adding runtime tokens before a shared component consumes them.
- Replacing every hardcoded value across the repository in one pass.
- Adding a font, UI framework, icon library, chart library, or animation library.
- Changing app navigation, route structure, domain calculations, repositories, database schema, or translations.
- Rewriting the dashboard before report and transaction primitives stabilize.
- Running an Android emulator/device flow.
- Creating new illustrations, brand assets, or decorative motion.
- Treating database diagnostics or developer-only tooling as a visual priority ahead of daily finance flows.

## 12. Phase 2 deliverables

- Locked design-system source of truth: `design.md`.
- Ranked, dependency-aware migration plan: `docs/ui-redesign-plan.md`.
- No production CSS, Tailwind, component, route, logic, repository, database, or translation changes.
- No new dependencies.
