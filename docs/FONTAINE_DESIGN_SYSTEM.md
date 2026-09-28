# Fontaine Design System v2.0

## Brand Identity

**Fontaine** — Premium educational platform for Tunisian Arabic classrooms.

- **Logo**: Gradient teal mark (Droplets icon) `from-primary-500 to-primary-700`
- **Typeface**: Inter (Latin), Noto Sans Arabic (Arabic), loaded via `next/font/google`
- **Theme color**: `#0d9488` (primary-600)

## Color Palette

### Primary: Fontaine Teal
| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#f0fdfa` | Backgrounds, hover states |
| `primary-100` | `#ccfbf1` | Active badge fills |
| `primary-500` | `#14b8a6` | Progress bars, accents |
| `primary-600` | `#0d9488` | Buttons, links, brand |
| `primary-700` | `#0f766e` | Hover states, active nav |

### Accent: Warm Amber
Classroom energy, achievements, highlights.

### Semantic Colors
- **Success** (Emerald): Correct answers, positive states
- **Warning** (Amber): Paused sessions, medium difficulty
- **Danger** (Rose): Errors, wrong answers, destructive actions
- **Info** (Sky): Informational badges, counters

### Neutral: Slate
| Token | Usage |
|-------|-------|
| `neutral-50` | Page background |
| `neutral-100` | Skeleton base, input disabled bg |
| `neutral-200` | Borders, dividers |
| `neutral-400` | Placeholder text |
| `neutral-500` | Secondary text |
| `neutral-600` | Body text |
| `neutral-900` | Headings, primary text |

## Spacing & Sizing

- **Card padding**: `p-5`
- **Page padding**: `px-4 py-5 lg:px-8 lg:py-6`
- **Section spacing**: `space-y-6`
- **Card grid gap**: `gap-4`
- **Sidebar width**: `272px`
- **Header height**: `h-14`

## Border Radius

| Element | Radius |
|---------|--------|
| Cards, dialogs | `rounded-2xl` (16px) |
| Buttons, inputs, selects | `rounded-xl` (12px) |
| Badges, pills | `rounded-full` |
| Icon containers | `rounded-xl` |
| Nav items | `rounded-lg` |

## Typography

| Element | Style |
|---------|-------|
| Page heading | `text-2xl font-bold tracking-tight text-neutral-900` |
| Card heading | `text-lg font-semibold text-neutral-900` |
| Stat value | `text-2xl font-bold tracking-tight` |
| Body text | `text-sm text-neutral-600` |
| Secondary text | `text-sm text-neutral-500` |
| Muted text | `text-xs text-neutral-400` |
| Arabic body | `line-height: 1.75` (vs 1.6 for Latin) |

## Shadows

- **Cards**: No default shadow; `hover:shadow-md` on hover
- **Buttons (primary)**: `shadow-sm shadow-primary-600/20`
- **Elevated surfaces**: `shadow-lg` (dropdowns, dialogs)
- **Brand mark**: `shadow-lg shadow-primary-500/20`

## Animations

| Class | Keyframe | Duration | Use case |
|-------|----------|----------|----------|
| `animate-fadeIn` | `fadeIn` | 300ms | Page transitions |
| `animate-slideUp` | `slideUp` | 300ms | Card grids, lists |
| `animate-slideDown` | `slideDown` | 300ms | Dropdowns, errors |
| `animate-scaleIn` | `scaleIn` | 200ms | Dialogs |
| `animate-float` | `float` | 3s infinite | Decorative |
| `animate-pulse-soft` | `pulse-soft` | 2s infinite | Loading indicators |

### Stagger Delays
Use `animate-stagger-1` through `animate-stagger-5` (50ms increments).
For card grids: `style={{ animationDelay: \`${Math.min(index, 8) * 40}ms\` }}`.

### Reduced Motion
All animations respect `prefers-reduced-motion: reduce`.

## Loading States

### Skeleton Pattern
```html
<div className="skeleton h-8 w-48" />
```
Uses `shimmer` animation with gradient from `neutral-200` to `neutral-100`.

### Components
- `<Skeleton>` — text, circular, rectangular variants
- `<SkeletonCard>` — matches Card layout
- `<SkeletonStatCard>` — matches StatCard layout
- `<SkeletonTable>` — configurable rows/cols

## Component Library

### Button
Variants: `primary`, `secondary`, `danger`, `success`, `ghost`, `outline`.
Sizes: `sm` (h-9), `md` (h-10), `lg` (h-12).
Features: `loading` prop with spinner, `active:scale-[0.98]` press effect.

### Card
Props: `hover` (enables shadow transition), `padding` (default true).
Sub-components: `CardHeader`, `CardTitle`, `CardBody`, `CardFooter`.

### Badge
Variants: `info`, `success`, `warning`, `danger`, `neutral`, `accent`.
Sizes: `sm`, `md`.

### StatCard
Color-coded icon backgrounds. Props: `icon`, `label`, `value`, `color`, `trend`.

### Dialog
Native `<dialog>` with `showModal()`. Props: `open`, `onClose`, `title`, `actions`, `size`.
Backdrop: `bg-neutral-900/40 backdrop-blur`.

### Input / Textarea / Select
Consistent `rounded-xl` borders, focus rings via `ring-2 ring-primary-500/25`.

### EmptyState
Icon container + title + description + action CTA.

### Progress
Color variants, size variants, accessible `role="progressbar"`.

### Tabs
Context-based API: `<Tabs>`, `<TabList>`, `<Tab>`, `<TabPanel>`.

### Breadcrumb
RTL-aware separator (ChevronLeft for Arabic, ChevronRight for others).

### Tooltip
Position variants: `top`, `bottom`, `start`, `end`. Delayed show (200ms).

### ProgressRing
SVG-based circular progress with animated stroke-dashoffset.

## RTL Support

- Use **logical CSS properties**: `ps`/`pe`, `ms`/`me`, `start`/`end`, `border-s`/`border-e`
- Arabic line-height: `1.75` (vs `1.6` for Latin)
- Breadcrumb separator flips direction
- Arrow icons swap (`ArrowRight` for LTR, `ArrowLeft` for RTL)
- `text-start` instead of `text-left`
- `dir="auto"` on user-generated text inputs

## Accessibility

- All interactive elements have `min-h-[44px]` touch targets
- Focus-visible rings on all focusable elements
- `aria-label` on icon-only buttons
- `role="alert"` on error messages
- `aria-invalid` on invalid inputs
- `aria-describedby` linking inputs to errors/helpers
- `prefers-reduced-motion` respected globally

## File Organization

```
src/
  app/globals.css           ← Design tokens, keyframes, utilities
  lib/cn.ts                 ← Class name utility
  components/
    ui/                     ← Reusable primitives
      button.tsx
      card.tsx
      badge.tsx
      input.tsx
      select.tsx
      dialog.tsx
      stat-card.tsx
      empty-state.tsx
      skeleton.tsx
      tabs.tsx
      breadcrumb.tsx
      tooltip.tsx
      progress.tsx
      progress-ring.tsx
      spinner.tsx
    layout/                 ← Shell components
      teacher-sidebar.tsx
      teacher-header.tsx
      teacher-shell.tsx
      locale-switcher.tsx
    game/                   ← Game type renderers
      activity-renderer.tsx
      quiz-renderer.tsx
      ...
```
