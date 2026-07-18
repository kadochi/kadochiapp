# Legacy-to-token style map

The homepage keeps the legacy information hierarchy and responsive breakpoints,
but every visual value is now expressed through the Tailwind v4 design tokens
defined in `src/app/globals.css`.

| Legacy style | Tailwind v4 token / utility | Homepage use |
| --- | --- | --- |
| `--space-4`, `--space-8`, `--space-12`, `--space-16` | `--spacing-4`, `--spacing-8`, `--spacing-12`, `--spacing-16` (`gap-*`, `p-*`, `m-*`) | Compact card spacing and rail gutters |
| `--space-20`, `--space-24`, `--space-32` | `--spacing-20`, `--spacing-24`, `--spacing-32` | Section rhythm, card padding, and the about block |
| `--surface-background`, `--surface-surface-soft`, `--surface-surface-dim` | `bg-surface-background`, `bg-surface-soft`, `bg-surface-dim` | Page surfaces, cards, and loading states |
| `--surface-neutral-*-emphasis` | `text-surface-neutral-*-emphasis` | Heading, supporting, and subdued text |
| `--secondary-secondary*` | `bg-secondary-container`, `text-secondary`, `--color-secondary-gradient` | Occasion prompt and category-card fallbacks |
| `--primary-primary*` | `bg-primary-container`, `text-primary`, `--color-primary-gradient` | Fast-delivery badge and hero treatment |
| `--radius-l`, `--radius-xl`, `--radius-xxl` | `rounded-l`, `rounded-xl`, `rounded-xxl` | Service tiles, rail cards, and the hero |
| `--fs-*` / `--lh-*` | `text-label-*`, `text-body-*`, `text-title-*`, `text-heading-*` | Legacy type hierarchy with the current scale |
| `--fw-regular`, `--fw-bold`, `--fw-extrabold` | `font-regular`, `font-bold`, `font-extrabold` | Card labels and editorial headings |
| Legacy 860px / 1024px rails | `min-[860px]:*` / `min-[1024px]:*` | Same mobile-to-desktop rail behavior |

No legacy CSS custom properties or component-local colour constants are used by
the landing components; gradients only compose the existing semantic colour
tokens.
