# Open Questions

These are genuinely unresolved decisions that could go either way and have meaningful architectural or UX impact. Everything else has been resolved with reasonable defaults that can be changed later.

---

## 1. Weight Increment Granularity

**Context**: The progression engine needs to know the smallest weight jump available.

**Options**:
- A) Default to 2.5kg (standard plate pair) with user-configurable override.
- B) Default to 1.25kg (assumes user has fractional plates).

**Impact**: Affects progression speed. Smaller increments allow more gradual progression on isolation exercises. Larger increments are simpler but may stall progress on smaller lifts.

**Current assumption**: Default 2.5kg with a per-exercise override option (e.g., 1.25kg for curls, 5kg for deadlifts). Configurable in settings.

**Do you have fractional plates (1.25kg or smaller)?**

---

## 2. Superset Rest Behaviour

**Context**: When exercises are supersetted (A1 Bench, A2 Row), the rest timer behaviour isn't obvious.

**Options**:
- A) Rest only after completing both A1 and A2 (true superset — move immediately from A1 to A2, then rest).
- B) Short rest between A1→A2 (e.g., 30s), full rest after A2 before looping back to A1.
- C) Fully configurable per superset group.

**Impact**: Affects timer UX during workout execution.

**Current assumption**: Option A (true superset — no rest between paired exercises, full rest after the pair). This is the most common gym interpretation. But I'd implement it as configurable if you prefer B.

---

## 3. Deployment Domain

**Context**: The PWA needs to be served over HTTPS for service workers to function. GitHub Pages provides `https://username.github.io/repo-name/` for free.

**Options**:
- A) GitHub Pages at `https://your-username.github.io/JammacusGym/`
- B) Custom domain (requires DNS setup, can still use GitHub Pages or Cloudflare Pages as host).
- C) Decide later — develop locally for now, deploy when ready.

**Impact**: Affects base path configuration in Vite and the PWA manifest. Trivial to change but best to set correctly from the start.

**Current assumption**: Option C — develop locally, configure deployment path when you're ready to deploy.

---

## 4. Initial Exercise Library Scope

**Context**: Phase 1B needs a seed exercise library. The question is how comprehensive.

**Options**:
- A) Minimal (~40 exercises) — cover major compounds and common isolations. User adds the rest.
- B) Comprehensive (~150 exercises) — cover most gym equipment and variations.
- C) Start minimal, provide an importable expansion pack later.

**Impact**: More exercises means more time seeding data and mapping muscle contributions correctly. But a rich library reduces friction for the user.

**Current assumption**: Option B — a comprehensive library is low-effort to generate, reduces ongoing manual entry, and muscle-group mappings are more useful with complete coverage. Bad mappings are worse than no mappings, so quality matters more than quantity.

**Are there specific exercises you know you'll use that you want to ensure are included from day one?**

---

## 5. RPE vs RIR Preference

**Context**: The spec mentions both RPE (Rate of Perceived Exertion, 1-10 scale) and RIR (Reps in Reserve, 0-4+ scale). They're inversely related (RPE 8 ≈ RIR 2).

**Options**:
- A) Primary UI shows RIR with RPE available as secondary/toggle.
- B) Primary UI shows RPE with RIR derived.
- C) User chooses their preferred scale in settings.

**Impact**: Affects the workout execution screen — only one value should be prominent to keep the interface fast.

**Current assumption**: Option A — RIR is more intuitive for programming ("leave 2 in the tank") and is what the spec primarily references. RPE can be stored alongside it for users who prefer that mental model. Settings toggle available.

---

## Summary

None of these are blocking. If you confirm the current assumptions are acceptable (or provide different answers), I'll proceed with implementation. All decisions are easily changeable later except the deployment path (which only affects a config value anyway).
