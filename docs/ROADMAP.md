# Implementation Roadmap

## Phases Overview

| Phase | Focus | Outcome |
|-------|-------|---------|
| 1A | Project scaffold | Runnable empty PWA with database |
| 1B | Core workout logging | Can create exercises, build workouts, execute and log sets |
| 1C | History & timers | Full workout history, rest/workout timers |
| 2A | Programs & blocks | Multi-workout programs with training blocks |
| 2B | Progression engine | Automatic weight/rep progression |
| 2C | Notes & supersets | Notes system, superset support, warm-ups |
| 3A | Analytics foundation | Volume, frequency, 1RM charts |
| 3B | PR detection & trends | Personal records, performance trend analysis |
| 4A | Recommendation engine | Scheduling, volume, deload recommendations |
| 4B | Training manager UI | Dashboard intelligence, fatigue analysis |
| 5 | Polish | Animations, accessibility, performance, edge cases |

---

## Phase 1A — Project Scaffold

**Goal**: Installable PWA with database, navigation shell, and dark mode.

### Tasks

1. Initialize Vite + React + TypeScript project.
2. Configure Tailwind CSS with dark mode (`class` strategy).
3. Install and configure Dexie.js with initial schema (v1).
4. Set up `vite-plugin-pwa` with manifest and basic service worker.
5. Create app shell: bottom navigation (5 tabs), page layout, safe-area handling.
6. Set up React Router with route structure.
7. Create base UI components: Button, Card, Input, Modal, BottomNav.
8. Implement UserSettings entity with defaults.
9. Verify PWA installs correctly on iPhone (Add to Home Screen).
10. Set up Vitest.
11. Configure GitHub Actions for build + deploy to GitHub Pages.

### Deliverable

A blank but installable dark-mode PWA with working navigation between empty pages.

---

## Phase 1B — Core Workout Logging

**Goal**: User can create exercises, build a workout template, start a workout, log sets, and complete the workout.

### Tasks

1. Seed exercise library (50-80 common exercises with muscle mappings).
2. Seed muscle groups.
3. Exercise list page with search/filter.
4. Exercise detail/edit page.
5. Create custom exercise flow.
6. WorkoutTemplate CRUD (create, edit, delete).
7. TemplateExercise management (add, reorder, remove exercises from template).
8. SetTarget configuration per exercise.
9. **Workout execution screen** (most critical):
   - Start workout from template.
   - Display current exercise + set targets.
   - Weight +/- controls.
   - Rep +/- controls.
   - Complete set button.
   - Navigate between exercises.
   - Add additional sets.
   - Finish workout.
10. WorkoutInstance creation (snapshot template on start).
11. CompletedSet persistence (save to IndexedDB on every set).
12. Workout-in-progress recovery (restore on reload).
13. Abandon workout flow.

### Deliverable

Fully functional workout logger. User can execute and record a workout with proper planned-vs-actual separation.

---

## Phase 1C — History & Timers

**Goal**: View past workouts. Rest timer, exercise timer, workout timer.

### Tasks

1. Workout history list page (date, name, duration, exercise count).
2. Workout history detail page (full set-by-set breakdown).
3. Workout timer (counts up from start).
4. Rest timer (configurable countdown after each set, auto-starts on set completion).
5. Rest timer display with haptic/audio alert on completion (where supported).
6. Store actual rest times in CompletedSet.
7. Exercise timer (time on current exercise).
8. "Previous workout" display during execution (show last session's results for context).
9. Basic workout summary on completion (total volume, duration, sets).

### Deliverable

Complete Phase 1 workout logging system with timers and history.

---

## Phase 2A — Programs & Training Blocks

**Goal**: User can create structured multi-workout programs with blocks and rotations.

### Tasks

1. Program CRUD.
2. TrainingBlock management within a program.
3. BlockWorkout linking (assign workout templates to blocks in rotation order).
4. "Active program" designation.
5. Today dashboard: determine next workout based on program rotation + last completed workout.
6. Program detail view showing block structure.
7. Training block goals (hypertrophy/strength/deload).
8. Week tracking within blocks.

### Deliverable

User can set up a PPL program with blocks and the app recommends which workout is next.

---

## Phase 2B — Progression Engine

**Goal**: The app automatically suggests next-session targets based on performance.

### Tasks

1. ProgressionRule entity and CRUD.
2. Double progression strategy implementation + tests.
3. Weight progression strategy + tests.
4. Rep progression strategy + tests.
5. RIR-based progression strategy + tests.
6. Percentage-based progression strategy + tests.
7. Top set + back-off strategy + tests.
8. Manual progression (user override).
9. Link progression rules to TemplateExercise.
10. Display suggested targets during workout execution.
11. Progression history/reasoning display ("Increased because you hit 12 reps × 3 sets last session").
12. Deload trigger after consecutive failures.

### Deliverable

Workout targets automatically adjust based on recent performance. User sees reasoning and can override.

---

## Phase 2C — Notes, Supersets, Warm-ups, Substitutions

**Goal**: Complete the training system with supporting features.

### Tasks

1. Note entity and CRUD.
2. Pre-workout notes (display before workout starts).
3. Post-workout notes (prompt on completion).
4. Exercise notes (persistent, shown during execution).
5. "Show next time" reminder notes.
6. Superset grouping in templates (A1/A2 notation).
7. Superset-aware execution screen (grouped display, adjusted rest logic).
8. Warm-up set type (excluded from working volume).
9. Auto-generated warm-up suggestions based on working weight.
10. Exercise substitution during workout (record original + actual).
11. Drop set and failure set support.

### Deliverable

Full training system feature set ready for analytics.

---

## Phase 3A — Analytics Foundation

**Goal**: Charts showing volume, frequency, estimated 1RM, and muscle-group distribution.

### Tasks

1. Analytics engine: volume calculation functions + tests.
2. Analytics engine: estimated 1RM calculation + tests.
3. Analytics engine: frequency calculation + tests.
4. Analytics engine: muscle-group volume (using exercise-muscle contribution weights) + tests.
5. Analytics page shell with time-period selector.
6. Exercise selector for per-exercise charts.
7. Line chart: weight progression over time.
8. Line chart: estimated 1RM over time.
9. Bar chart: weekly set volume by muscle group.
10. Bar chart: workout frequency (sessions per week).
11. Workout duration tracking and display.
12. Rest adherence calculation and display.

### Deliverable

Functional analytics dashboard with core training metrics visualised.

---

## Phase 3B — PR Detection & Performance Trends

**Goal**: Automatic personal record detection and trend analysis.

### Tasks

1. PR detection engine: weight PR, rep PR, volume PR, estimated 1RM PR, reps-at-weight PR.
2. PR detection runs automatically on workout completion.
3. PR celebration display (non-intrusive notification during workout).
4. PR history page (all-time records per exercise).
5. Performance trend calculation (moving averages, regression).
6. Stagnation detection (exercise not progressing over N sessions).
7. Rolling volume calculations (7/14/28 day windows).
8. Program analysis summary (block-level aggregations).

### Deliverable

PRs are detected and displayed. User can see performance trends and stagnation.

---

## Phase 4A — Recommendation Engine

**Goal**: The app generates training recommendations based on data.

### Tasks

1. Recommendation engine architecture: context builder, sources, aggregator.
2. Scheduling recommender: "Should you train today? What workout?"
3. Volume recommender: "Is muscle-group volume appropriate?"
4. Deload recommender: "Performance declining + fatigue increasing = deload?"
5. Performance recommender: "Exercise X has stagnated for 4 weeks."
6. Recommendation display UI (card format with reasoning, accept/dismiss/modify).
7. Recommendation history (what was suggested, what was accepted).
8. Confidence indicators.
9. Tests for all recommendation logic.

### Deliverable

Dashboard shows actionable, explainable training recommendations.

---

## Phase 4B — Training Manager & Recovery

**Goal**: Full training intelligence dashboard and recovery tracking.

### Tasks

1. Training manager page: unified view of all recommendations.
2. Body measurement logging (weight, circumferences).
3. Recovery log (sleep, energy, soreness, stress).
4. Fatigue analysis: correlate recovery logs with performance.
5. Body measurement charts overlaid with strength progression.
6. Muscle-group recovery estimation (days since trained + volume).
7. Training block summary on completion.
8. Suggested next-block adjustments based on current block analysis.
9. Available training days configuration.

### Deliverable

Complete training intelligence system. The app meaningfully answers "What should I do today/next?"

---

## Phase 5 — Polish

**Goal**: Production-quality UX, performance, and reliability.

### Tasks

1. iPhone-optimised animations (page transitions, set completion feedback).
2. Haptic feedback where supported (`navigator.vibrate`).
3. Full dark mode audit (no white flashes, correct contrast ratios).
4. Accessibility audit (touch targets ≥44px, screen reader labels, focus management).
5. Performance audit (bundle size analysis, lazy loading analytics/charts).
6. Offline behaviour testing and edge case handling.
7. Data export/import UI with validation and conflict resolution.
8. Settings page completion (all user preferences).
9. Onboarding flow (first launch: set units, create first workout).
10. Error boundaries and graceful degradation.
11. iOS-specific fixes (safe areas, scroll behaviour, keyboard avoidance).
12. Comprehensive E2E test suite (Playwright, iPhone viewport).

### Deliverable

Polished, reliable, production-quality personal training application.

---

## MVP Definition

The **minimum viable product** is Phases 1A + 1B + 1C:

- Installable PWA.
- Exercise library.
- Workout builder.
- Workout execution with set logging.
- Timers.
- Workout history.
- Data persistence and crash recovery.
- Export/import.

This is usable from day one as a workout logger, even before programs or analytics exist.

---

## Estimated Scope

| Phase | Approximate complexity |
|-------|----------------------|
| 1A | Small — scaffold/config |
| 1B | Large — workout execution is complex |
| 1C | Medium |
| 2A | Medium |
| 2B | Large — many strategies to implement and test |
| 2C | Medium |
| 3A | Medium — mostly pure functions + chart wiring |
| 3B | Medium |
| 4A | Large — recommendation logic is nuanced |
| 4B | Medium |
| 5 | Medium — many small fixes |

---

## Non-Negotiable Constraints Throughout

- App must remain runnable at the end of every phase.
- Tests must pass before moving to next phase.
- Workout execution must never regress.
- Historical data integrity must never be compromised.
- Offline functionality must work at every stage.
