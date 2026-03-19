

## Plan: Refine Roobert Typography & GX-Dark Pink Accent

### 1. Typography Refinements (index.css + tailwind.config.ts)

The brand guidelines show tight, clean typography with precise spacing. Current setup loads Roobert but applies no typographic refinements. Changes:

- **Letter-spacing**: Add slight negative tracking for headings (`-0.01em` to `-0.02em`) to match the tight, confident feel in the guidelines
- **Font-feature-settings**: Enable OpenType features (`kern`, `liga`) for better glyph rendering
- **Base body styling**: Set `font-smoothing: antialiased` and refine default line-height
- **Font weight mapping**: Ensure headings default to `font-weight: 600` (SemiBold) rather than browser-default bold (700) to match the brand's medium-weight heading style

These go in the `@layer base` section of `index.css`.

### 2. GX-Dark Pink Accent Shift (index.css)

Shift the primary accent from the current warm pink `hsl(330 50% 65%)` toward the brand's cooler, more saturated mauve `hsl(310 70% 78%)`. Update all related GX-Dark variables:

| Variable | Current | New |
|---|---|---|
| `--primary` | `330 50% 65%` | `310 70% 78%` |
| `--ring` | `330 50% 65%` | `310 70% 78%` |
| `--sidebar-primary` | `330 50% 65%` | `310 70% 78%` |
| `--gradient-primary` | `hsl(330 50% 60%)...` | `hsl(310 70% 75%)...` |
| `--shadow-modern` | uses `330 50% 65%` | uses `310 70% 78%` |
| `--sage-700/800/900` | `330 30-40%` | `310 50-60%` |

### Files Modified
- `src/index.css` — typography base styles + GX-Dark color variables
- `tailwind.config.ts` — optional letter-spacing utilities

