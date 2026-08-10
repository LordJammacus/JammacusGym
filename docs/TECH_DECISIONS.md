# Technology Decisions

## 1. Frontend Framework

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **React 18+** | Massive ecosystem, mature, excellent tooling, easy to hire/AI-maintain | Slightly larger bundle than alternatives |
| Preact | Tiny bundle (~3KB), React-compatible API | Smaller ecosystem, occasional compat issues with React libs |
| Solid.js | Best raw performance, fine-grained reactivity | Smaller ecosystem, less AI training data, JSX looks similar but semantics differ |
| Svelte 5 | Excellent DX, small bundles, runes system | Smaller ecosystem for fitness/charting libs, fewer devs familiar |

### Decision: **React 18+ with TypeScript**

React is specified in the product brief and is the correct choice. The ecosystem maturity means every problem this app will encounter (offline state, IndexedDB integration, charting, PWA) has well-tested solutions. AI agents maintain React codebases more reliably than alternatives due to training data volume. The bundle size difference (~40KB gzipped vs ~3KB for Preact) is irrelevant for a PWA that caches everything locally.

---

## 2. Build Tooling

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Vite** | Fast HMR, native ESM, excellent plugin ecosystem, PWA plugin | None meaningful for this project |
| Webpack | Mature, handles edge cases | Slow, complex config, declining mindshare |
| Turbopack | Fast | Still maturing, less plugin support |
| Parcel | Zero-config | Less control, smaller plugin ecosystem |

### Decision: **Vite**

No contest. Vite provides fast development builds, native TypeScript support, the `vite-plugin-pwa` integration for service workers, and trivial static output for deployment. Configuration is minimal.

---

## 3. Local Database / Storage

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Dexie.js (IndexedDB)** | Well-maintained, typed queries, versioned schema migrations, transactional, handles large datasets, 100% offline | Not SQL, queries are less expressive than SQL for complex analytics |
| wa-sqlite (SQLite WASM) | Full SQL, relational queries, powerful for analytics | ~1MB WASM payload, OPFS required for persistence (iOS support still maturing), more complex setup |
| RxDB | Reactive queries, sync built-in | Overkill for single-user, heavier, sync adds complexity we don't need |
| localStorage | Simple | 5-10MB limit, no indexing, no transactions, unsuitable for structured data |
| OPFS + SQLite | True file-system-based persistence | iOS Safari OPFS support is inconsistent in PWA context |

### Decision: **Dexie.js 4.x (IndexedDB)**

Dexie is purpose-built for this use case. It provides:
- Schema versioning with migration support (critical for years of accumulated data).
- Compound indexes for efficient queries (e.g., "all sets for exercise X in date range Y").
- Transactions for data safety during workout logging.
- No storage limit concerns (IndexedDB typically gets hundreds of MB to GB on iOS).
- Fully offline, no WASM payload, no server dependency.
- TypeScript support with typed tables.

The query expressiveness limitation is acceptable because analytics calculations will be done in application code anyway (deterministic, testable functions), not raw DB queries.

**Risk mitigation**: iOS Safari can evict IndexedDB data under extreme storage pressure if the PWA hasn't been used recently. Mitigation: regular export reminders and the backup system.

---

## 4. State Management

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Zustand** | Tiny (~1KB), simple API, supports persistence middleware, works outside React components | Minimal devtools compared to Redux |
| Redux Toolkit | Mature, excellent devtools, predictable | Boilerplate, overkill for single-user app |
| Jotai | Atomic model, fine-grained rerenders | Less suited to complex nested state like workout execution |
| React Context | No dependency | Performance issues with frequent updates, verbose |
| Valtio | Proxy-based, mutable API | Less explicit, harder to reason about |

### Decision: **Zustand**

The workout execution screen requires fast, frequent state updates (completing sets, updating timers). Zustand handles this without re-rendering the entire component tree. Its middleware system supports persisting workout-in-progress state to IndexedDB, protecting against page crashes. Business logic (progression engine, analytics) lives outside React entirely, and Zustand stores can be accessed from plain TypeScript modules.

---

## 5. Styling

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Tailwind CSS 3+** | Utility-first, built-in dark mode, responsive design primitives, small production bundles (purged) | Learning curve for those unfamiliar, verbose class strings |
| CSS Modules | Scoped styles, no runtime | More files, no design system consistency by default |
| Styled Components | Co-located styles | Runtime cost, larger bundle |
| Vanilla Extract | Type-safe, zero runtime | More complex setup |

### Decision: **Tailwind CSS**

Mobile-first responsive design and dark mode are first-class features of Tailwind. The utility approach produces consistent spacing, sizing, and colour across the app without maintaining a separate design system. Touch target sizes (`min-h-12`, `p-4`) are trivial to enforce. Production bundles are tiny after purging.

---

## 6. PWA Implementation

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **vite-plugin-pwa** | Automatic service worker generation via Workbox, manifest generation, update prompts | Abstracts some control |
| Manual service worker | Full control | Significant boilerplate, error-prone caching strategies |
| Workbox directly | Good control + helpers | More config than the Vite plugin |

### Decision: **vite-plugin-pwa (Workbox)**

Generates the service worker, web manifest, and handles cache strategies automatically. Supports `precache` for the app shell and `runtime caching` for any future API calls. Provides update-available notifications. The app will use a **cache-first** strategy since all data is local.

---

## 7. Charting / Analytics Visualisation

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Recharts** | React-native, declarative, responsive, good touch support, MIT licence | Slightly larger bundle (~150KB) |
| Chart.js + react-chartjs-2 | Lightweight core, many chart types | Canvas-based (less sharp on retina without config), imperative API |
| uPlot | Extremely fast and tiny (~30KB) | Low-level API, less React-friendly, limited chart types |
| Nivo | Beautiful defaults | Heavy bundle |
| Victory | Mobile-focused | Less maintained recently |

### Decision: **Recharts**

Recharts renders SVG (crisp on retina iPhone displays), has a declarative React API, supports responsive containers, and handles touch interactions well. The bundle size is acceptable for a PWA that caches everything. It covers all required chart types: line (progression), bar (volume), area (trends).

If bundle size becomes a concern later, individual chart components can be lazy-loaded since analytics screens aren't needed during workout execution.

---

## 8. Testing

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Vitest** | Native Vite integration, fast, Jest-compatible API, TypeScript-first | Newer than Jest |
| Jest | Mature, widely known | Slower, requires separate TS config |
| Playwright | Excellent E2E, mobile emulation | Heavier for unit tests |

### Decision: **Vitest (unit/integration) + Playwright (E2E)**

- **Vitest** for all business logic: progression engine, analytics calculations, PR detection, volume calculations. These are pure functions and must be heavily tested.
- **React Testing Library** for component behaviour tests.
- **Playwright** for critical E2E flows: workout execution, data persistence across reload, offline behaviour. Playwright's mobile emulation validates iPhone-sized interaction.

---

## 9. Routing

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **React Router 6+** | Standard, well-maintained, supports nested layouts | Slightly heavier than alternatives |
| TanStack Router | Type-safe, file-based option | Newer, less ecosystem support |
| Wouter | Tiny (~1KB) | Fewer features for nested layouts |

### Decision: **React Router 6+**

The app has nested navigation (bottom tabs → section → detail views) and needs URL-based state for deep linking within the PWA. React Router's outlet/layout system maps cleanly to the bottom-tab + page structure.

---

## 10. Data Export/Import

### Approach

- **JSON**: Primary format. Full database dump as a single JSON file with version metadata. Used for backup/restore.
- **CSV**: Per-table or per-exercise export for users who want to analyse in spreadsheets.
- Implementation via `Blob` + `URL.createObjectURL` + download link (works in iOS Safari and PWA).
- Import via `<input type="file">` with JSON schema validation before applying.

No external dependencies needed. The browser's native file APIs are sufficient.

---

## 11. Deployment / Hosting

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| **GitHub Pages** | Free, integrated with repo, automatic deploys via Actions | Custom domain requires DNS config |
| Cloudflare Pages | Free, fast CDN, automatic deploys | Separate service to manage |
| Netlify | Free tier, easy | Build minutes limit |
| Self-hosted (Raspberry Pi) | Full control | Requires hardware, maintenance |

### Decision: **GitHub Pages** (primary) with option for Cloudflare Pages

The repo is already on GitHub. A GitHub Action builds the Vite output and deploys to Pages on push. Zero cost, zero maintenance. HTTPS is provided automatically (required for service workers). If a custom domain is desired later, Cloudflare Pages is a trivial migration (same static output).

---

## 12. ID Generation

### Decision: **UUIDs (crypto.randomUUID())**

All entities use UUIDs rather than auto-increment integers. Reasons:
- No server to coordinate ID generation.
- Safe for future multi-device sync without conflicts.
- Supported natively in all modern browsers.
- Dexie supports non-auto-increment primary keys.

---

## 13. Date/Time Handling

### Decision: **Native Date + ISO 8601 strings for storage**

- Store all timestamps as ISO 8601 strings in IndexedDB (indexable, sortable, human-readable in exports).
- Use native `Date` for calculations. No `moment.js` or `date-fns` unless date arithmetic becomes complex enough to justify it.
- Durations stored as integer seconds.

---

## 14. Estimated 1RM Formula

### Decision: **Epley formula (primary), Brzycki as secondary**

- Epley: `1RM = weight × (1 + reps/30)` — widely used, simple, reasonable accuracy for 1-10 reps.
- Brzycki: `1RM = weight × 36 / (37 - reps)` — better at very low rep ranges.
- The app will use Epley by default but the formula is a configurable constant, making it trivial to swap or offer user choice later.
- For reps > 12, all formulas lose accuracy. The app will label these estimates clearly.

---

## 15. Optional Future: LLM Integration

The recommendation engine is designed as pure deterministic heuristics. However, the architecture deliberately separates the "data → metrics → recommendation" pipeline so that a future optional LLM layer could:
- Generate natural-language training summaries.
- Provide more nuanced block-planning suggestions.
- Answer open-ended questions about training history.

This would be opt-in, could use a local model or a user-provided API key, and would never be required for core functionality. No LLM dependency is introduced in the initial build.
