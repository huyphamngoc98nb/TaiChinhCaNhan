# TaiChinhCaNhan design contract

**Status:** Locked for Phase 2
**Applies to:** React, TypeScript, Vite, Capacitor, Tailwind CSS, Recharts, and the existing SQLite-backed application
**Authority:** This document is the design-system source of truth for future Hallmark audits and redesign work.

Future Hallmark work must read this file before proposing or implementing UI changes. Changes to this contract require an explicit design-system decision; individual screens must not invent local exceptions.

## 4.1 Product design direction

TaiChinhCaNhan is an Android-first personal-finance utility. Its interface must feel:

- **Utilitarian:** each surface helps the user understand or act on financial information.
- **Calm:** restrained color, motion, and decoration keep attention on the data.
- **Trustworthy:** totals, statuses, dates, destructive actions, and saved state are unambiguous.
- **Focused:** the primary financial amount or task is visually dominant; secondary metadata recedes.
- **Compact but readable:** density is earned through alignment and hierarchy, never tiny text or undersized touch targets.
- **One-hand friendly:** frequent actions stay within comfortable reach and every interactive target is at least 44 × 44 CSS px.
- **Motion-cut:** motion explains state or spatial relationships; it never decorates routine interactions.

This direction rejects dashboard ornament, glass effects, decorative gradients, excessive card nesting, novelty typography, and page-specific visual systems.

## 4.2 Core principles

1. **Financial meaning before decoration.** Amount, sign, currency, category, date, and state must be understandable without relying on color alone.
2. **One dominant action per surface.** Primary actions are visually stronger than secondary, tertiary, and destructive actions.
3. **Semantic tokens over raw values.** Components consume named roles. Raw hex, legacy Tailwind palette utilities, and arbitrary values are migration debt.
4. **Consistent primitives before screen polish.** Shared controls, overlays, rows, cards, states, and charts are stabilized before module redesigns.
5. **Light and dark are equal products.** Every role has intentional contrast and elevation behavior in both modes.
6. **Compactness cannot reduce accessibility.** Visual icon size may be small; its hit area may not. Critical information may reflow but must not disappear.
7. **State is visible and announced.** Loading, empty, error, selected, excluded, disabled, saving, and success states have a defined visual and accessible contract.
8. **Progressive disclosure over card accumulation.** Group related settings and details in rows, sections, sheets, and dialogs instead of nested generic cards.
9. **Responsive behavior is explicit.** Layout decisions are verified at 320, 375, 414, and 768 px, including large amounts and long Vietnamese labels.
10. **The existing technology is the constraint.** Do not add a UI framework, icon set, font, chart library, or animation dependency.
11. **Design work does not reinterpret business rules.** Preserve routes, repositories, database behavior, financial calculations, transaction semantics, and translation intent.

## 4.3 Existing token inventory

The variables below already exist in `src/index.css` and remain the foundation.

### Foundation colors

| Token | Light | Dark | Contract |
|---|---|---|---|
| `--primary` | `#6366f1` | `#818cf8` | Accent, selected border, icon, and non-filled emphasis |
| `--primary-hover` | `#4f46e5` | `#a5b4fc` | Light primary-action fill; hover/emphasis where supported |
| `--primary-soft` | `rgba(99, 102, 241, .12)` | `rgba(129, 140, 248, .18)` | Selected and informational soft surface |
| `--bg` | `#f5f7fa` | `#0f1117` | App background |
| `--bg-subtle` | `#f8fafc` | `#141824` | Alternate app-level background |
| `--surface` | `#ffffff` | `#1b2030` | Default card, row, and form surface |
| `--surface-elevated` | `#ffffff` | `#242b3d` | Floating overlay and raised surface |
| `--surface-muted` | `#f1f5f9` | `#2d354a` | Subdued, disabled, and grouped surface |
| `--text` | `#111827` | `#f8fafc` | Primary text and financial values |
| `--text-muted` | `#64748b` | `#cbd5e1` | Secondary readable text |
| `--text-subtle` | `#94a3b8` | `#94a3b8` | Nonessential metadata only; not body copy on light surfaces |
| `--border` | `#e2e8f0` | `#334155` | Default separation |
| `--border-strong` | `#cbd5e1` | `#475569` | Control outline and strong separation |
| `--shadow-color` | `rgba(15, 23, 42, .08)` | `rgba(0, 0, 0, .42)` | Shadow tint; elevation rules decide when it is used |
| `--overlay` | `rgba(15, 23, 42, .42)` | `rgba(0, 0, 0, .64)` | Modal scrim |
| `--success` | `#059669` | `#34d399` | Positive and completed state |
| `--danger` | `#e11d48` | `#fb7185` | Negative, destructive, and error state |
| `--warning` | `#d97706` | `#fbbf24` | Warning and attention state |

### Runtime layout variables

| Token | Purpose |
|---|---|
| `--app-font-scale` | User-controlled UI font scaling |
| `--visual-viewport-height` | Mobile visual viewport sizing |
| `--keyboard-inset-bottom` | Soft-keyboard inset |
| `--money-keyboard-height` | Custom money-keyboard reservation |

### Current Tailwind bridge

`tailwind.config.js` currently exposes `primary`, `bg`, `bg-subtle`, `surface`, `surface-elevated`, `surface-muted`, `text`, `muted`, `subtle`, and `border`. Until the bridge is expanded during primitive migration, CSS variables remain authoritative. Do not bypass the gap with raw Tailwind palette colors.

### Known constraints

- `--text-subtle` on a white surface is approximately 2.56:1 and is not valid for required text.
- `--text-muted` on the light app background is approximately 4.43:1; use it for secondary text at 14 px or larger only after verifying the actual surface.
- White on light `--primary` is approximately 4.47:1, below the normal-text threshold. Filled light primary actions use `--primary-hover`, not `--primary`.
- White on dark `--primary` is approximately 2.98:1. Dark filled primary actions use dark ink, not white.
- Existing chart colors are not automatically safe on dark surfaces. Charts must consume the chart roles defined below.

## 4.4 Semantic token additions

These roles are locked by this contract but are **not yet runtime declarations**. Add them to `src/index.css` and expose only the roles needed in `tailwind.config.js` when the first shared primitive consumes them. This prevents unused tokens and lets implementation tests validate their real surface pairings.

| Token | Light behavior/value | Dark behavior/value | Purpose |
|---|---|---|---|
| `--action-primary-bg` | `#4f46e5` | `#818cf8` | Filled primary action |
| `--action-primary-text` | `#ffffff` | `#111827` | Text/icon paired only with primary action background |
| `--focus-ring` | `#4f46e5` | `#a5b4fc` | Keyboard-visible focus outline |
| `--focus-ring-offset` | `#f5f7fa` or current surface | `#0f1117` or current surface | Separates the ring from the control |
| `--selected-bg` | `var(--primary-soft)` | `var(--primary-soft)` | Selected row, chip, tab, or option background |
| `--selected-border` | `var(--primary)` | `var(--primary)` | Selected boundary |
| `--selected-text` | `#3730a3` | `#c7d2fe` | Selected label where stronger contrast is needed |
| `--disabled-bg` | `var(--surface-muted)` | `var(--surface-muted)` | Disabled control surface |
| `--disabled-text` | `var(--text-muted)` | `var(--text-subtle)` | Disabled label; never carries required information alone |
| `--positive-soft` | `rgba(5, 150, 105, .12)` | `rgba(52, 211, 153, .14)` | Positive amount/status background |
| `--negative-soft` | `rgba(225, 29, 72, .10)` | `rgba(251, 113, 133, .14)` | Negative amount/status background |
| `--warning-soft` | `rgba(217, 119, 6, .12)` | `rgba(251, 191, 36, .14)` | Warning background |
| `--chart-income` | `#047857` | `#6ee7b7` | Income series |
| `--chart-expense` | `#be123c` | `#fda4af` | Expense series |
| `--chart-net` | `#4338ca` | `#c7d2fe` | Net series |
| `--chart-series-4` | `#0369a1` | `#7dd3fc` | Additional categorical series |
| `--chart-series-5` | `#7c3aed` | `#c4b5fd` | Additional categorical series |
| `--chart-muted` | `#cbd5e1` | `#475569` | De-emphasized or excluded chart series |
| `--chart-grid` | `var(--border)` | `var(--border)` | Grid and axis line |
| `--chart-label` | `var(--text-muted)` | `var(--text-muted)` | Axis, legend, and tooltip metadata |

No page-specific color tokens are allowed. Category colors may remain data-driven only when they pass contrast checks on both themes and fall back to an approved chart series role.

## 4.5 Color usage contract

- Primary color identifies selection, focus, navigation context, and the one dominant action. It is not a general decoration color.
- Positive and negative colors communicate financial direction only when a sign, label, icon, or accessible name also communicates the meaning.
- Destructive actions use `--danger` for text or outline by default. A filled destructive action is reserved for the final confirmation step.
- Warning color does not substitute for an error. Error blocks use danger semantics and include a recovery action when recovery exists.
- Default cards and form fields use neutral surfaces. Tinted surfaces are reserved for selected, positive, negative, warning, and informational states.
- Selected states use selected background, border, and a persistent indicator. Excluded states use neutral/muted treatment plus an explicit off, hidden, or struck indicator; neither relies on opacity or color alone.
- Chart series use only the chart roles, and muted/excluded series use `--chart-muted` plus a line, marker, label, or visibility change.
- Body text uses `--text`; secondary text uses `--text-muted`. `--text-subtle` is limited to timestamps, helper metadata, and inactive decoration that can disappear without loss.
- Borders create most grouping. Shadows are not used to compensate for weak hierarchy.
- Raw hex values, `slate-*`, `gray-*`, `indigo-*`, `emerald-*`, `rose-*`, and other legacy palette utilities must not be added. Existing uses are migrated by component, not through an unsafe global replacement.
- Dark mode must not be produced by opacity alone. Every interactive, selected, disabled, chart, overlay, and feedback state has an intentional dark role.

## 4.6 Typography contract

Keep the existing Android-friendly system stack:

`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

Do not add a web-font dependency. All text respects `--app-font-scale`.

| Role | Size / line height | Weight | Usage |
|---|---|---|---|
| Page title | 20 px / 1.25 | 700 | One per page; may share a row with one compact action |
| Section title | 16 px / 1.35 | 700 | Major content group |
| Card/list title | 14 px / 1.4 | 600 | Merchant, category, setting, chart title |
| Body/control | 14 px / 1.5 | 400–600 | Rows, fields, buttons, tabs |
| Reading/empty/error body | 16 px / 1.5 | 400 | Explanatory text where density is not needed |
| Secondary metadata | 13 px / 1.45 | 400–500 | Dates, account names, helper content |
| Caption | 12 px / 1.4 | 500 | Nonessential labels only; never a primary action or critical value |
| Hero amount | 28–32 px / 1.15 | 700 | Total balance or page-defining amount |
| Summary amount | 20–24 px / 1.2 | 700 | Report summary and key metrics |
| Row amount | 14–16 px / 1.35 | 600–700 | Transaction and budget values |

Financial values use tabular numerals (`font-variant-numeric: tabular-nums`). Currency symbol and sign stay attached to the amount. Amounts may wrap as a unit or reduce within the defined role range; they must not be ellipsized. Labels and secondary metadata may truncate when the full value is available through context or an accessible name.

Do not use 10 or 11 px text. Uppercase is limited to short, non-localized data labels and must use increased letter spacing; sentence case is the default.

## 4.7 Spacing and sizing contract

Use a 4 px base scale:

| Step | Value | Typical use |
|---|---:|---|
| `1` | 4 px | Icon/text micro-gap |
| `2` | 8 px | Closely related content |
| `3` | 12 px | Compact row and control gap |
| `4` | 16 px | Default card padding and mobile page gutter |
| `5` | 20 px | Section separation |
| `6` | 24 px | Large section separation and tablet gutter |
| `8` | 32 px | Page-region separation |
| `10` | 40 px | Empty-state internal spacing only |

Rules:

- Mobile page gutter is 16 px at 320, 375, and 414 px. A deliberately edge-to-edge list may use 0 px only when its rows preserve 16 px content inset.
- Tablet page gutter is 24 px at 768 px; content width remains bounded and centered when appropriate.
- Default card padding is 16 px; compact row containers use 12 px vertically and 16 px horizontally.
- Default control height is 48 px. Compact controls may be 44 px. Primary transaction/money actions may be 52–56 px.
- Every touch target is at least 44 × 44 px, including clear buttons, chart tabs, icon actions, reminder actions, and drag handles.
- A 20–24 px icon is centered inside a 44–48 px target. Do not enlarge the icon merely to meet the target.
- Adjacent destructive and non-destructive targets need at least 8 px separation.
- Arbitrary spacing is allowed only for safe-area and keyboard insets supplied by runtime variables.

## 4.8 Radius and elevation contract

Approved radii:

| Role | Radius |
|---|---:|
| Small badge/internal element | 8 px |
| Button, chip, list action | 10 px |
| Input and select | 12 px |
| List-row group | 16 px |
| Card and grouped section | 16 px |
| Bottom sheet top corners | 24 px |
| Pill/circular control | 9999 px |

Do not add arbitrary 9, 14, 18, or page-specific radii.

Elevation has three levels:

1. **Base:** app background and inline sections; no shadow.
2. **Contained:** cards, form groups, and list groups; border first, no shadow by default.
3. **Floating:** dropdown, dialog, toast, and bottom sheet; `--surface-elevated`, strong border where useful, and one restrained shadow derived from `--shadow-color`.

Nested cards are prohibited. A card may contain rows, dividers, metrics, or controls, but not another generic card with its own elevation.

## 4.9 Motion contract

- Press feedback: 80 ms.
- Color, border, and opacity state change: 120 ms.
- Expand/collapse: up to 160 ms.
- Sheet/dialog entrance and exit: up to 220 ms.
- Chart filter or series change: 120 ms opacity crossfade; do not animate axes through large layout changes.
- Allowed properties: `opacity`, `transform`, `color`, `background-color`, `border-color`, and shadow opacity.
- Avoid `transition: all`, height/width animation, bouncing, looping decoration, and celebratory finance motion.
- Preserve spatial meaning: sheets move vertically, menus originate near their trigger, and dialogs fade with minimal scale change.
- Under `prefers-reduced-motion: reduce`, remove transforms and smooth scrolling and reduce nonessential durations to effectively immediate. State changes must remain visible without motion.

## 4.10 Component contracts

Every component below supports its applicable default, active/pressed, focus-visible, selected, disabled, loading, and error states without page-local styling. Every component uses semantic surfaces and text roles in dark mode; simply inverting, lowering opacity, or retaining a light-only shadow is not sufficient. Interactive components retain a minimum 44 × 44 px Android target even when their visual element is smaller.

### Button

- Variants: primary, secondary, tertiary, and destructive.
- Height: 48 px default, 44 px compact, 52–56 px for a page-defining money action.
- One primary button per local action group. Full-width is preferred for the final mobile form action.
- Loading preserves width, disables repeated activation, shows a progress indicator, and retains an accessible name.
- Disabled uses disabled roles, removes elevation, and is not represented by opacity alone.
- Focus uses a 2 px `--focus-ring` with visible offset. Press feedback uses a small transform only when reduced motion is not requested.

### Icon button

- Target is at least 44 × 44 px; icon is normally 20–24 px.
- Every icon-only action has an accessible name and visible tooltip only where hover exists.
- Destructive icon actions require a label in high-risk contexts or a confirmation step.
- Selected icon buttons use selected background, border, and accessible pressed/selected state.

### Card

- A card represents one coherent financial or settings concept.
- Default structure: optional title/action header, content, optional footer. Padding is 16 px.
- Use a border and surface before elevation. Do not nest generic cards.
- Clickable cards expose one clear interaction, keyboard focus, and a full-card accessible name; otherwise only their internal controls are interactive.

### List row

- Minimum height is 56 px, with 12 px vertical and 16 px horizontal padding.
- Leading content is optional; primary label and amount form the visual anchors; metadata is secondary.
- Amount alignment is consistent within a list and uses tabular numerals.
- Selected, excluded, disabled, and pressed rows have distinct non-color indicators.
- Row-level action menus use a 44 px icon target and do not conflict with row activation.

### Input

- Minimum height is 48 px, 12 px radius, and a persistent visible label.
- Placeholder text is an example, never the only label.
- Helper and error text reserve enough space to avoid disruptive jumps where practical.
- Focus uses both border and focus ring. Error uses danger border, message, and programmatic association.
- Numeric and money fields use the appropriate Android keyboard hint but retain a non-keyboard path for every action.

### Select

- Uses the Input visual contract and a 48 px trigger.
- The value, label, expanded state, and controlled element are programmatically connected.
- Options are at least 44 px high. Keyboard supports arrow navigation, Home/End where practical, Enter/Space selection, and Escape dismissal.
- Selected option uses check/indicator plus selected roles. The menu remains inside the safe visual viewport.

### Date/time control

- Date and time are readable in the active locale and display format.
- Trigger and clear actions are separate 44 px targets with accessible names.
- Quick-select chips are at least 44 px high and expose selected state.
- Native pickers may be used where they improve Android reliability; custom controls must support keyboard and screen-reader interaction.
- Invalid or out-of-range values show an inline error and preserve the user-entered value where safe.

### Bottom sheet

- Used for mobile choices, filters, and short forms; not for long, nested navigation.
- Has a labelled dialog semantic, modal state, initial focus, focus containment, Escape/back dismissal, and focus restoration.
- Drag handle may be visual only. If interactive, its hit area is at least 44 px and it has an accessible action name.
- Top corners are 24 px. Content respects safe-area and keyboard insets. Primary action remains reachable without covering fields.
- At 768 px, a short sheet may become an anchored dialog when that improves reading and focus order.

### Dialog

- Reserved for confirmation, irreversible risk, or a focused decision.
- Has `role="dialog"` or `alertdialog` as appropriate, `aria-modal`, a labelled title, optional description, initial focus, focus trap, Escape handling, and focus restoration.
- Mobile actions stack when labels do not fit. The safe/default action precedes the destructive action in focus order.
- Dismissal by scrim is disabled for destructive confirmation.

### Empty state

- Names what is empty, explains the useful next step, and offers at most one primary and one secondary action.
- Uses a restrained icon, not a decorative illustration requirement.
- Distinguishes “no data yet” from “no filter results.”
- Does not appear while data is still loading or after a failed load.

### Error state

- States what failed in user language, preserves safe context, and offers retry or recovery when possible.
- Page, section, field, and toast errors are separate levels. A toast does not replace a persistent error for blocked work.
- Error announcements use an appropriate live region without repeatedly interrupting the user.
- Technical details remain in diagnostics, not the primary message.

### Loading state

- Initial page loading uses a screen or section skeleton matching final geometry.
- Action loading stays inside the initiating control and prevents duplicates.
- Background refresh keeps stable data visible and adds a subtle status indicator.
- Skeletons do not pulse under reduced motion and are hidden from assistive technology.

### Chart card

- Structure: title, optional summary, filter/legend controls, plot, and accessible text/table summary.
- Plot is never the only representation of values or trends.
- Series consume chart tokens and remain distinguishable by label, line style, marker, or position—not color alone.
- Filters and tabs are at least 44 px high with selected state. Tooltips meet text contrast and remain within the viewport.
- Focus indicators are not suppressed. Recharts accessibility support stays enabled unless replaced by an equivalent tested interaction.
- At 320 px, simplify ticks and legend before shrinking text below the typography contract.

### Summary metric

- Structure: short label, dominant amount, optional change/status, and optional period.
- Amount uses tabular numerals and is never truncated.
- Positive/negative meaning includes sign or label, not color alone.
- Related metrics align to a shared grid; one metric is visually primary when the page has a clear total.
- A metric is not wrapped in another card solely to create visual emphasis.

## 4.11 State matrix

| State | Visual contract | Interaction contract | Accessible contract |
|---|---|---|---|
| Default | Neutral surface and border | Normal behavior | Name, role, value available |
| Active/current | Primary or strong neutral indicator tied to current context | Represents the current route, filter, period, or control | Current state exposed with the appropriate semantic |
| Hover | Subtle surface/border change | Pointer devices only | Never required to understand state |
| Pressed | Brief surface/scale response | Immediate activation feedback | Native pressed behavior where available |
| Focus-visible | 2 px focus ring with offset | Keyboard focus only | Never removed or blurred |
| Selected | Selected background + border + indicator | Reversible unless stated | `aria-selected`, `aria-pressed`, or checked state |
| Excluded/filter-off | Muted treatment + explicit off/excluded marker | Can be restored | Meaning is announced, not color-only |
| Disabled | Disabled surface/text; no elevation | No activation | Native `disabled` preferred; reason nearby if needed |
| Loading | Stable geometry + local progress | Duplicate actions blocked | Busy state and retained control name |
| Empty | Purpose-specific message and next step | Optional recovery/create action | Heading and action in reading order |
| Error | Danger indicator + persistent message | Retry/recovery where possible | Message associated or announced once |
| Success/saved | Calm confirmation, normally transient | Continue normal flow | Polite announcement where necessary |
| Destructive pending | Danger emphasis in final confirmation | Explicit confirmation | Consequence named in dialog |
| Dark mode | Intentional dark surface, border, foreground, and elevation role | Behavior is unchanged | Contrast and focus remain equivalent to light mode |
| Amount hidden | Stable masked placeholder; sign and digits are not exposed | Existing reveal control remains available | Hidden state and reveal action are announced |
| Small screen | Content reflows; critical values stay complete | Actions stack or move to an appropriate sheet | Reading and focus order remain logical |
| Positive | Success role plus `+`, income label, or directional context | Normal amount behavior | Meaning is present in accessible text |
| Negative | Danger role plus `−`, expense label, or directional context | Normal amount behavior | Meaning is present in accessible text |
| Warning | Warning role plus message/icon | Recovery or review action where applicable | Warning is named and associated |
| Over budget | Strong warning/danger treatment plus amount and threshold text | Opens existing budget details/action | Status and exceeded amount are announced |
| Archived | Muted surface plus archived label/icon | Read-only or restore behavior follows domain rules | Archived status is announced |
| Unavailable | Neutral disabled-like presentation plus reason | No unavailable action is offered | Reason and any alternative are readable |

## 4.12 Responsive contract

### 320 px

- Single-column layout, 16 px page gutter, no horizontal page scroll.
- Header permits title wrapping or moves secondary actions to a second row.
- Two-column metrics collapse when an amount or localized label would truncate.
- Form actions stack full-width; date ranges and chart filters wrap into rows or use a sheet.
- Chart tick count and legend density reduce before font size.

### 375 px

- Default Android mobile composition and 16 px gutter.
- Two compact summary metrics may share a row when both amounts remain fully visible.
- Row metadata may wrap beneath the primary label; actions retain 44 px targets.

### 414 px

- Preserve mobile hierarchy; use extra width for readable amounts and less wrapping, not more card chrome.
- Three short filter controls may share a row only when every target remains 44 px and labels remain clear.

### 768 px

- Use a bounded content region with 24 px gutter.
- Reports and settings may use two columns where reading and focus order remain logical.
- Dialogs may replace short bottom sheets. Long forms remain single-column unless field relationships justify grouping.
- Do not scale mobile type and controls indiscriminately; use space for hierarchy and comparison.

At every width, verify light and dark themes, the largest supported font scale, long Vietnamese translations, hidden/visible money state, safe-area insets, soft keyboard, loading, empty, error, selected, and disabled examples.

## 4.13 Migration rules

1. Migrate by component boundary, not by global search-and-replace.
2. Add a semantic runtime token only with its first consumer and a light/dark contrast check.
3. Expand the Tailwind bridge for semantic roles; do not expose raw palette aliases as a shortcut.
4. Shared primitives own focus, disabled, loading, selected, error, sizing, and reduced-motion behavior.
5. Screen modules compose primitives and may choose hierarchy; they may not redefine primitive visuals.
6. Replace generic `.card` use with the appropriate Card, grouped section, list, chart card, or summary metric contract.
7. Separate visual refactors from business-logic changes. If behavior must change for accessibility, isolate it and test it explicitly.
8. Preserve routes, repositories, database behavior, calculations, translations, and existing Capacitor integrations.
9. Do not add dependencies for fonts, UI kits, icons, charts, or animation.
10. Delete legacy styles only after all consumers migrate and viewport/state coverage passes.
11. New or modified UI must meet 44 px touch targets and visible focus before merge.
12. Recharts focus suppression and `accessibilityLayer={false}` are prohibited in migrated charts.
13. Every migrated component is checked at 320, 375, 414, and 768 px in both themes.
14. Update release notes only when implementation changes observable application UI or behavior; this contract itself is internal documentation.
15. Do not rename public component props unless there is no compatible path and every call site is inspected and migrated together.
16. Preserve component ownership: shared behavior stays shared and module-specific composition stays in its module.
17. Do not copy business state into local visual state. Derive presentation from the existing source of truth.
18. Inspect all call sites, tests, styles, and accessibility relationships before modifying a shared component.

## 4.14 Recommended redesign order

1. **Shared primitives and semantic runtime tokens**
   - Button, IconButton, Card, ListRow, Input, Select, date/time trigger, state surfaces, and common setting rows.
   - Then BottomSheet, Dialog, DropdownList, Toast, and shared responsive/focus utilities.
2. **Reports**
   - Chart card, summary metrics, range/granularity controls, accessible data alternatives, and chart token migration.
3. **Transactions**
   - Form controls and action hierarchy, transaction rows, filters, loading/error/empty states, and small-screen behavior.
4. **Budgets**
   - Reuse stabilized summary, progress, row, form, and state primitives; do not invent budget-only cards.
5. **Settings**
   - Remove card-in-card composition, consolidate repeated setting labels/toggles, and standardize grouped sections.
6. **Home/dashboard**
   - Migrate last because it composes summaries, chart cards, transaction rows, and quick actions from every earlier phase.

Each stage must finish its shared-state and responsive acceptance checks before the next screen family introduces new variants.

<!-- Hallmark pre-emit critique: purpose 5/5; hierarchy 5/5; evidence 5/5; systemization 5/5; restraint 5/5; validation pending implementation. -->
