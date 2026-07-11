# Component Library Audit: Radix UI Migration + Bug Fixes + New Components

## Context

The UI library in `front/src/components/ui/` (16 components, cva + Tailwind v4, RTL Persian app) hand-rolls behavior that Radix provides: form controls (Toggle, Checkbox, Radio, SegmentSelector) are hidden native inputs + `peer` CSS, and controlled/uncontrolled state is manually managed. Several components have layout hacks causing visible bugs (toggle thumb displacement, stepper button backgrounds, input helper sizing, chip padding, progress-stepper connector logic). Tabs, DropdownMenu, Alert/Toast, and Select don't exist.

**User decisions:** full Radix rebuild of form controls (data-state styling, Radix `<button>` roots); add new Tabs (with panels) *and* migrate SegmentSelector; "items menu" = DropdownMenu; Alert = inline banner *and* Toast system; Select styled like existing Input.

**Blast radius is near zero:** the only consumers are the preview files (`front/src/components/*-preview.tsx`) and the showcase `front/src/app/page.tsx`. Visual design must stay identical after migrations.

## Phase 0 — Foundation

1. `npm i radix-ui tailwind-merge` in `front/`. Use the **unified `radix-ui` package**; migrate the 5 files off individual packages (`ui/avatar.tsx`, `ui/bottom-sheet.tsx`, `ui/button.tsx`, `ui/chip.tsx`, `ui/label.tsx` — e.g. `import { Dialog } from "radix-ui"`) and remove `@radix-ui/react-avatar`, `@radix-ui/react-dialog`, `@radix-ui/react-slot` from `front/package.json`.
2. New `front/src/lib/utils.ts` with `cn()` = `extendTailwindMerge` + clsx. **Must extend class groups** or merges silently drop classes with this custom theme:
   - `font-size`: `text-(label|body|title|heading)-\d+` (else treated as text-color — `cn("text-error","text-label-12")` would drop `text-error`)
   - `font-weight`: `font-light|regular|bold|extrabold` (else treated as font-family)
   - `rounded`: the custom radius tokens incl. `rounded-rounded`
   Sweep `clsx(...)` → `cn(...)` in each ui file as it's touched.
3. RTL: add `Direction.Provider dir="rtl"` (from `radix-ui`) in `front/src/app/layout.tsx` wrapping children. This drives Radix keyboard nav and popper positioning (Select/DropdownMenu). Keep existing per-component `dir="rtl"` defaults; do NOT flip `<html dir>` (would reflow the showcase — separate decision).

## Phase 1 — Radix migrations (visual parity)

Translation pattern for all: hidden `<input class="peer sr-only">` + decorative span disappears; Radix Root **is** the visible control. `peer-checked:*` → `data-[state=checked]:*`; `peer-disabled:*` → `disabled:*`/`data-[disabled]:*`; `peer-focus-visible:*` → `focus-visible:*`; remove `pointer-events-none`; keep the `<label class="group">` wrapper for label + hover styling. Forward `name`/`value`/`required` (Radix injects a hidden input inside forms). Coerce Radix Checkbox's `boolean | "indeterminate"` at the boundary.

- **`ui/toggle.tsx` → `Switch`** (props API unchanged: `label, tone, size, checked, defaultChecked, onCheckedChange, disabled`).
  **Bug fix (thumb displacement):** replace `inset-inline-start: calc(100% - thumb - gap)` animation with a transform on `Switch.Thumb`: add per-size `--toggle-travel` (sm: 16px = 40−18−2×3; md: 24px = 56−24−2×4), thumb gets `data-[state=checked]:translate-x-[var(--toggle-travel)]` + `rtl:data-[state=checked]:-translate-x-[var(--toggle-travel)]` (translate doesn't auto-flip in RTL), `transition-transform`. Keep exact track sizes `h-24 w-40` / `h-32 w-56` and tone classes.
- **`ui/checkbox.tsx` → `Checkbox`** (API unchanged). Use `Checkbox.Indicator forceMount` + `data-[state=unchecked]:text-transparent` to preserve the 150ms check color fade (Radix unmounts the indicator otherwise). Drop the `!important` overrides (`peer-disabled:!border-disable` etc.) — no more peer-specificity fight; visually verify disabled+checked row.
- **`ui/radio.tsx` → `RadioGroup` + `RadioGroupItem`** (API change — only new export needing consumer rewrite). Group-level `tone/size/invalid` passed to items via small React context; item structure mirrors Checkbox with `RadioGroup.Indicator forceMount` + dot span. Gives roving tabindex + RTL-aware arrow keys + hidden form input for free. Rewrite the Radio table + `name="notification"` fieldset in `page.tsx`.
- **`ui/segment-selector.tsx` → build on `RadioGroup`** (not ToggleGroup — current semantics are exactly-one-selected radiogroup; ToggleGroup allows deselection). Keep the `items`/`value`/`defaultValue`/`onValueChange`/`tone`/`size` API verbatim; delete the hand-rolled `useState`. Each option = one `RadioGroup.Item` (label/input pair merged into one element) with current segment classes translated to `data-[state=checked]:*`, keep `flex-1 border-e last:border-e-0`.

**"Radix logics" for components with no primitive** (Button, Input, InputStepper, Chip, ProgressStepper): `Slot`/`asChild` for polymorphism, `value/defaultValue/onValueChange` convention, state exposed as data-attributes styled with `data-[...]` variants, explicit ARIA wiring (`useId`, `aria-invalid`, `aria-live`).

## Phase 2 — Layout-bug fixes

- **`ui/input.tsx`**
  - Icons: drop absolute positioning (`--input-inset`, `start-/end-[var(--input-inset)]`) and the compensating `ps-24`/`pe-24`; make the field a flex row with `gap-8` (sm) / `gap-12` (md/lg), icons as `shrink-0` spans sized by `--input-icon-size`.
  - **Helper icon/text sizes (reported bug):** add `size` to `inputMessageVariants` — sm/md: `text-label-12` + icon `size-14`; lg: `text-label-14` + icon `size-16`. Replace `StatusIcon`'s hardcoded `mt-px size-14` with `items-center` alignment on the message row + `shrink-0`.
  - Keep exporting `inputFieldVariants`/`inputMessageVariants` — Select reuses them. Extract the label + message block into a shared internal (`InputMessage`) so Select doesn't duplicate it.
- **`ui/input-stepper.tsx`** — **drop absolute positioning**: root becomes `inline-flex items-center justify-between` (sm `h-32 min-w-96 px-4`, md `h-56 min-w-[9rem] px-16`); delete `--stepper-inset`; DOM order `[+, <output>, −]` renders correctly under RTL; output gets `flex-1 text-center`.
  **Button-background fix:** explicit resting backgrounds per variant — `outline` controls: `bg-transparent hover:bg-surface active:bg-surface-dim`; `subtle` controls: `bg-surface-dim hover:bg-border-high-emphasis` on a `bg-surface` root (today's `bg-surface` control on `bg-surface-background` root reads wrong). Keep API, clamp logic, `data-state`, `onRemove`/Trash.
- **`ui/chip.tsx`** — standardize to fixed heights aligned with the sibling Label pill: sm `h-28 px-12 gap-4 text-label-12`; md `h-32 px-12 gap-6 text-label-14` (was `min-h-* px-8 py-4/6 text-label-16` — the cramped-padding bug). Drop the `-my-2` remove-button hack (keep `-me-2` optical inset). Replace hand-rolled `Children.only`/`cloneElement` asChild with `Slot`/`Slottable`.
- **`ui/progress-stepper.tsx`** — **connector ordering fix:** render the connector on the *incoming* edge (every step except the first, `index > 0`), active iff the step's **own** status is `complete`/`current` — deletes the `nextStatus = steps[index+1]?.status` peek. Tail geometry: span between adjacent indicator edges with a 4px gap each end so tails never touch a `current` indicator's ring (`inset-inline-end:calc(50%+var(--progress-indicator-size)/2+4px)`, `w-[calc(100%-var(--progress-indicator-size)-8px)]`; vertical analogous). Add `data-status={status}` on each `<li>`.
- **`ui/button.tsx`** — replace bracketed px values with theme scale (`h-[40px]` → `h-40` etc., identical output); replace `[&:not(:disabled):not([aria-disabled=true])...]` selector chains with data-attributes: set `data-disabled` alongside existing `data-loading`, style with Tailwind v4 `not-data-disabled:`/`not-data-loading:` variants. No API change.

## Phase 3 — New components (all in `front/src/components/ui/`, cva + cn, existing tokens)

- **`tabs.tsx`** — Radix Tabs: `Tabs` (Root), `TabsList`, `TabsTrigger`, `TabsContent`; `tone`/`size` via context from Root. List/trigger styling reuses the segment-selector shell (`rounded-m border`, `flex-1 border-e last:border-e-0`, `data-[state=active]:bg-secondary-container`).
- **`select.tsx`** — Radix Select. Composed `Select` component matching Input anatomy: `label, description, status, size (sm/md/lg → h-40/56/64), leadingIcon, placeholder, items[], value/defaultValue/onValueChange, name, required, disabled`. Trigger reuses `inputFieldVariants({ size, status })` + `data-[placeholder]:text-surface-neutral-mid-emphasis`, `ChevronDown` as `Select.Icon`. Content: `Select.Portal` + `position="popper" sideOffset={4}`, `min-w-[--radix-select-trigger-width]`, `rounded-m border bg-surface-background` + shadow. Item: `data-[highlighted]:bg-surface data-[state=checked]:text-primary` + `Check` ItemIndicator at inline-end. Also export the styled primitives for composition.
- **`dropdown-menu.tsx`** — Radix DropdownMenu styled re-exports: `DropdownMenu`, `DropdownMenuTrigger` (asChild-friendly), `DropdownMenuContent` (same shell as Select content), `DropdownMenuItem` (cva `tone: default | danger`; danger = `text-error data-[highlighted]:bg-error-container`), `DropdownMenuSeparator`, `DropdownMenuLabel`.
- **`alert.tsx`** — presentational (no Radix): `tone: info|success|warning|error` mapping to existing `*-container`/`on-*-container` tokens; `title`, children = description, `icon` override, `onDismiss` → X button (Chip remove-button pattern). Default lucide icons per tone; `role="alert"` for error/warning, `role="status"` otherwise. Base: `flex items-start gap-12 rounded-m p-16`.
- **`toast.tsx` + `toaster.tsx`** — Radix Toast: styled `ToastProvider/ToastViewport/Toast/ToastTitle/ToastDescription/ToastClose/ToastAction` (Toast reuses Alert's tone cva + shadow; open/close/swipe keyframes added to `globals.css` `@theme` as `--animate-*`; viewport `fixed bottom-0 start-0 z-[60]`, explicit `swipeDirection`). `toaster.tsx`: context-based `useToast()` → `toast({ tone, title, description, duration })`; `<Toaster />` mounted in `layout.tsx` inside `Direction.Provider` (layout stays a server component; Toaster is the client boundary).

## Phase 4 — Previews & showcase

- Update in place: `toggle-preview`, `segment-selector-preview`, `input-preview` (message-size rows per size), `input-stepper-preview`, `chip-preview`, `progress-stepper-preview` (add a complete→current→upcoming row in both orientations to prove the connector fix).
- `page.tsx`: Checkbox usage source-compatible; **Radio table must be rewritten** to `RadioGroup`/`RadioGroupItem` — extract into `checkbox-preview.tsx`/`radio-preview.tsx` to match sibling convention while touching it.
- New previews registered in `page.tsx`: `tabs-preview`, `select-preview` (sizes × statuses, Persian labels to exercise RTL popper), `dropdown-menu-preview` (Button asChild trigger, icons, danger item, separator), `alert-preview` (4 tones × dismissible), `toast-preview` (buttons firing `toast()` per tone).

## Work order

1. Foundation (packages, `cn()`, unified-import migration, DirectionProvider) — zero visual change expected.
2. Form-control migrations, in order of increasing churn: Toggle → Checkbox → Radio/RadioGroup → SegmentSelector, each with its preview update.
3. Bug-fix refactors: input, input-stepper, chip, progress-stepper, button (+ cn sweep of remaining ui files).
4. New components, each with preview registered immediately: Tabs → Select → DropdownMenu → Alert → Toast/Toaster (+ layout.tsx).
5. `npm run lint` and `npm run build` (or `npx tsc --noEmit`).

## Verification

- `npm run dev` in `front/`, open the showcase at `/`. Screenshot Toggle/Checkbox/Radio/SegmentSelector sections **before** Phase 1 as the visual-parity baseline; compare after each migration (all state rows: unchecked/checked/disabled/disabled-checked/invalid, hover shadow, focus ring).
- Keyboard: Space toggles Switch/Checkbox; RadioGroup/SegmentSelector/Tabs are a single tab stop with direction-correct arrow keys under RTL; Select opens with Enter/Space, typeahead works, Esc closes; DropdownMenu arrows + Esc; Toast auto-dismiss + Esc.
- RTL specifics: Toggle thumb travels the correct direction; Select/DropdownMenu popper aligns to the correct side.
- Forms: wrap Toggle/Checkbox/RadioGroup/SegmentSelector/Select in a test `<form>` in one preview; confirm submitted values and `required` blocking.

## Risks

- Radix Checkbox `onCheckedChange` includes `"indeterminate"` — coerce.
- Dropping checkbox/radio `!important` disabled overrides may change disabled+checked rendering — check that row explicitly.
- tailwind-merge misclassifies the custom typography/weight tokens without the Phase-0 config — don't skip it.
- After removing individual @radix-ui packages, confirm no duplicate `@radix-ui/react-slot` remains in the lockfile.
