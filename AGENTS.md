# CSS Usage Pattern (Project Guidelines)

Use this file as the shared guidance for styling changes in this repo. Keep the UI clean, consistent, and predictable.

## Defaults
- Use Tailwind utility classes first. Prefer existing tokens and utilities over ad‑hoc CSS.
- Reuse shared classes in `src/index.css` (e.g. `btn-icon`, `btn-pill`, `btn-outline`, `text-mini`, `text-micro`, `muted-label`, `section-divider`).
- Keep styling local to the component; avoid global CSS unless it is a reusable utility.

## Design Tokens
- Prefer semantic color utilities already in use: `bg-surface`, `text-ink`, `text-subtle`, `text-muted-500`, `border-line`, `bg-surface-hover`, and their `dark:` variants.
- Use existing shadows: `shadow-[var(--shadow-elev-1)]` and `shadow-[var(--shadow-elev-2)]` with `dark:shadow-[var(--shadow-elev-1-dark)]` or `dark:shadow-[var(--shadow-elev-2-dark)]` as needed.
- Keep borders subtle: `border-line/60-80` in light mode and `border-line-dark/60-80` in dark mode.

## Component Styling
- Buttons:
  - Icon buttons should use `btn-icon` and include `cursor-pointer`.
  - Maintain minimum touch target size `h-9 w-9` (or `min-h-11` for pill buttons).
  - Include focus-visible rings (`focus-visible:ring-2` etc.) via shared classes.
- Panels / overlays:
  - Use `bg-surface` / `bg-surface-dark` with optional `backdrop-blur-sm` for overlays.
  - Use rounded shapes (`rounded-xl`, `rounded-2xl`) and consistent padding.
- Typography:
  - Favor existing text utilities (`text-caption`, `text-micro`, `muted-label`).
  - Use `text-subtle` for secondary labels, `text-ink` for primary text.

## Interaction & Motion
- Provide hover states without layout shift; use `transition-colors duration-200`.
- Respect `prefers-reduced-motion` if adding new animations.
- Add `cursor-pointer` to all interactive elements.

## Consistency Rules
- Don’t introduce new colors unless required and documented.
- Don’t mix different border radii or shadows in the same UI cluster.
- Don’t add emoji icons; use SVG icons in `components/Icons.tsx`.
## Internationalization
- Use `t('key')` from `useAppContext()` for all user-facing strings.
- Never hardcode display text; add translations to both `en` and `zh` in `contexts/AppContext.tsx`.

## Icons
- Add new icons to `components/Icons.tsx`.
- Use `strokeWidth="1.8"` for visual consistency with existing icons.

## Compact Controls
- For inline/embedded controls (e.g. zoom panels), use smaller buttons (`h-7 w-7`) with `active:scale-95` for press feedback.
- Standalone buttons use standard `h-9 w-9` or `min-h-11` for pill buttons.

## Numeric Displays
- Use `tabular-nums` for numbers that update dynamically to prevent layout shift.
## When You Need New Utilities
- Add reusable utility classes to `src/index.css`.
- Keep names semantic and aligned with existing naming style.

