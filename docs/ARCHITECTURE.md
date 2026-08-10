# Application Architecture

## Overview

JammacusGym is a local-first, offline-capable PWA built as a single-page React application. All data lives in IndexedDB on the user's device. There is no backend server. The app is deployed as static files.

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                       │
│  Pages / Components / Hooks                              │
├─────────────────────────────────────────────────────────┤
│                 State Layer (Zustand)                     │
│  Workout execution state, UI state, timers               │
├─────────────────────────────────────────────────────────┤
│               Business Logic Layer                        │
│  Progression Engine │ Analytics Engine │ Recommendation   │
├─────────────────────────────────────────────────────────┤
│                Data Access Layer (Dexie)                  │
│  Repositories / Queries / Transactions                   │
├─────────────────────────────────────────────────────────┤
│                  IndexedDB (Browser)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
src/
├── app/                    # App shell, routing, providers
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers.tsx
│
├── components/             # Shared UI components
│   ├── ui/                 # Primitives (Button, Card, Input, Modal)
│   ├── layout/             # Shell, BottomNav, PageHeader
│   ├── workout/            # Workout-specific components (SetRow, Timer)
│   └── charts/             # Chart wrappers
│
├── pages/                  # Route-level page components
│   ├── today/
│   ├── workout/
│   ├── programs/
│   ├── exercises/
│   ├── history/
│   ├── analytics/
│   ├── training-manager/
│   ├── body/
│   ├── notes/
│   └── settings/
│
├── db/                     # Data access layer
│   ├── database.ts         # Dexie instance + schema versions
│   ├── repositories/       # Per-entity data access (CRUD + queries)
│   │   ├── exercises.ts
│   │   ├── workouts.ts
│   │   ├── programs.ts
│   │   ├── sets.ts
│   │   └── ...
│   ├── seed.ts             # Initial exercise library + muscle groups
│   └── migrations.ts       # Schema upgrade logic
│
├── engines/                # Business logic (no React, no UI)
│   ├── progression/
│   │   ├── types.ts
│   │   ├── strategies/     # One file per strategy
│   │   │   ├── double.ts
│   │   │   ├── weight.ts
│   │   │   ├── rep.ts
│   │   │   ├── rir.ts
│   │   │   ├── percentage.ts
│   │   │   └── topset.ts
│   │   └── index.ts        # Dispatcher
│   │
│   ├── analytics/
│   │   ├── volume.ts       # Volume calculations
│   │   ├── intensity.ts    # 1RM, relative intensity
│   │   ├── frequency.ts    # Training frequency metrics
│   │   ├── performance.ts  # Trend detection
│   │   ├── fatigue.ts      # Fatigue indicators
│   │   ├── records.ts      # PR detection
│   │   ├── rest.ts         # Rest adherence
│   │   └── types.ts
│   │
│   ├── recommendations/
│   │   ├── types.ts
│   │   ├── scheduling.ts   # When to train
│   │   ├── volume.ts       # Volume adjustments
│   │   ├── deload.ts       # Deload detection
│   │   ├── exercise.ts     # Exercise substitution suggestions
│   │   └── index.ts        # Aggregates all recommendation sources
│   │
│   └── warmup/
│       └── generator.ts    # Warm-up set suggestions
│
├── stores/                 # Zustand stores
│   ├── workoutStore.ts     # Active workout state
│   ├── timerStore.ts       # Timer state
│   └── uiStore.ts          # UI preferences, active navigation
│
├── hooks/                  # React hooks
│   ├── useExercises.ts
│   ├── useWorkoutHistory.ts
│   ├── useAnalytics.ts
│   ├── useProgression.ts
│   ├── useTimer.ts
│   └── ...
│
├── utils/                  # Pure utility functions
│   ├── formulas.ts         # 1RM estimation, volume load
│   ├── dates.ts            # Date helpers
│   ├── units.ts            # kg/lb conversion
│   ├── export.ts           # JSON/CSV export
│   ├── import.ts           # JSON import + validation
│   └── ids.ts              # UUID generation
│
├── types/                  # Shared TypeScript types
│   ├── entities.ts         # DB entity interfaces
│   ├── enums.ts            # Shared enums
│   └── analytics.ts        # Analytics result types
│
├── constants/              # App constants
│   ├── muscles.ts          # Seed muscle group data
│   ├── exercises.ts        # Seed exercise library
│   └── defaults.ts         # Default settings values
│
├── workers/                # Web Workers (if needed for heavy analytics)
│   └── analytics.worker.ts
│
└── test/                   # Test utilities and fixtures
    ├── fixtures/           # Sample data for tests
    ├── helpers/            # Test helpers
    └── setup.ts            # Vitest setup
```

---

## Layer Responsibilities

### UI Layer (`pages/`, `components/`)

- Renders data.
- Handles user input.
- Calls stores and hooks.
- Never contains business logic.
- Never queries the database directly.

### State Layer (`stores/`)

- Manages transient application state (active workout, timers, UI state).
- The `workoutStore` is the most critical store — it holds the in-progress workout and persists it to IndexedDB on every set completion.
- Stores are accessible from both React components and engine code.

### Business Logic Layer (`engines/`)

- **Pure TypeScript modules with zero React dependencies.**
- All functions are deterministic: same input → same output.
- Fully unit-testable without DOM or database.
- Engines receive data (arrays of sets, workout instances, etc.) and return results (next weight, recommendations, metrics).

### Data Access Layer (`db/`)

- Encapsulates all Dexie/IndexedDB operations.
- Repositories expose typed async functions: `getExercise(id)`, `getCompletedSetsForExercise(exerciseId, dateRange)`, etc.
- Handles transactions for multi-table writes.
- Manages schema migrations.

---

## Navigation Architecture

The app has 10 logical sections but the bottom navigation shows 5 primary tabs. Remaining sections are accessible via the "More" menu or contextual navigation.

```
Bottom Nav (5 tabs):
┌────────┬────────┬────────┬────────┬────────┐
│ Today  │Workout │Programs│History │  More  │
└────────┴────────┴────────┴────────┴────────┘

"More" menu:
- Exercises
- Analytics
- Training Manager
- Body/Recovery
- Notes
- Settings
```

During an active workout, the bottom nav collapses or highlights the Workout tab. The workout execution screen takes priority.

**Routing structure:**

```
/                       → Today (dashboard)
/workout                → Active workout or workout selection
/workout/:id            → Workout execution
/programs               → Program list
/programs/:id           → Program detail / editor
/exercises              → Exercise library
/exercises/:id          → Exercise detail
/history                → Workout history list
/history/:id            → Historical workout detail
/analytics              → Analytics dashboard
/analytics/exercise/:id → Per-exercise analytics
/training               → Training manager
/body                   → Body measurements
/notes                  → Notes
/settings               → Settings / data management
```

---

## Workout Execution Architecture

This is the most performance-critical flow.

### State Machine

```
IDLE → ACTIVE → COMPLETED
              → ABANDONED
```

### WorkoutStore (Zustand)

```typescript
interface WorkoutState {
  instance: WorkoutInstance | null;
  exercises: WorkoutExerciseInstance[];
  sets: CompletedSet[];
  currentExerciseIndex: number;
  currentSetIndex: number;

  // Timer state
  workoutStartTime: number;
  restTimerStart: number | null;
  restTimerTarget: number;

  // Actions
  startWorkout(templateId: string): void;
  completeSet(data: SetInput): void;
  skipSet(): void;
  addSet(): void;
  nextExercise(): void;
  substituteExercise(newExerciseId: string): void;
  finishWorkout(): void;
  abandonWorkout(): void;
}
```

### Persistence Strategy

1. On `startWorkout`: Create WorkoutInstance in IndexedDB with status `"in_progress"`.
2. On every `completeSet`: Write CompletedSet to IndexedDB immediately. Also persist full store state to a `workoutInProgress` key.
3. On app reload: Check for `workoutInProgress`. If found, restore the store and resume.
4. On `finishWorkout`: Set status to `"completed"`, calculate totals, detect PRs, clear `workoutInProgress`.

This guarantees no data loss even if the browser crashes mid-set.

---

## Progression Engine Architecture

```
Input: Exercise history (last N sessions) + ProgressionRule config
Output: Next session targets (weight, reps, RIR)
```

### Strategy Pattern

```typescript
interface ProgressionStrategy {
  calculateNextTargets(
    history: CompletedSet[][],  // Last N sessions, each is array of sets
    currentTargets: SetTarget[],
    rule: ProgressionRule,
    settings: UserSettings
  ): SetTarget[];
}
```

Each strategy (`double`, `weight`, `rep`, `rir`, `percentage`, `topset_backoff`, `manual`) implements this interface.

### Evaluation Criteria

The progression engine needs to answer: "Did the user meet the progression threshold?"

For **double progression**:
- Check if all working sets hit `targetRepMax`.
- If yes for `requiredConsecutiveSuccess` sessions → increase weight by `weightIncrement`.
- If no → maintain current targets.
- If failed to hit `targetRepMin` for N sessions → consider deload.

### Output

```typescript
interface ProgressionResult {
  nextTargets: SetTarget[];
  reasoning: string;           // "Hit 12 reps on all sets for 2 consecutive sessions"
  action: "increase" | "maintain" | "deload" | "manual";
  confidence: "high" | "medium" | "low";
}
```

---

## Analytics Engine Architecture

All analytics functions are pure: they take arrays of historical data and return computed metrics.

```typescript
// Volume
function calculateWeeklyVolume(
  sets: CompletedSet[],
  exerciseMuscles: ExerciseMuscle[],
  dateRange: DateRange
): MuscleVolumeMap;

// 1RM
function estimateOneRepMax(weight: number, reps: number): number;

// Trends
function calculatePerformanceTrend(
  sets: CompletedSet[],
  windowSize: number
): TrendResult;

// PRs
function detectPersonalRecords(
  newSets: CompletedSet[],
  existingRecords: PersonalRecord[]
): PersonalRecord[];
```

### Caching Strategy

Analytics over large date ranges can be expensive. Strategy:
1. For the current week/month: compute on-demand (fast enough with indexed queries).
2. For longer periods: compute lazily and cache results in a `analyticsCache` IndexedDB table keyed by `(metric, exerciseId, dateRange)`.
3. Invalidate cache when new workout is completed.
4. If computation takes >100ms, move to a Web Worker.

---

## Recommendation Engine Architecture

```
Analytics Output → Rule Evaluation → Ranked Recommendations
```

### Rule-Based System

Each recommendation source is a function:

```typescript
interface RecommendationSource {
  id: string;
  name: string;
  evaluate(context: TrainingContext): Recommendation[];
}

interface TrainingContext {
  recentWorkouts: WorkoutInstance[];
  muscleVolumeMap: MuscleVolumeMap;
  exercisePerformance: Map<string, PerformanceTrend>;
  recoveryLogs: RecoveryLog[];
  currentProgram: Program;
  currentBlock: TrainingBlock;
  daysSinceLastWorkout: number;
  daysSinceMuscleGroupTrained: Map<string, number>;
}

interface Recommendation {
  id: string;
  type: "schedule" | "volume" | "deload" | "exercise" | "intensity";
  priority: "high" | "medium" | "low";
  title: string;
  reasoning: string;
  suggestedAction: string;
  supportingData: Record<string, any>;
  confidence: number;  // 0-1
}
```

### Recommendation Sources

1. **SchedulingRecommender**: Should you train today? What workout?
2. **VolumeRecommender**: Is muscle-group volume appropriate?
3. **DeloadRecommender**: Should you deload?
4. **PerformanceRecommender**: Are exercises stagnating?
5. **FatigueRecommender**: Is fatigue accumulating?

Each runs independently and produces 0-N recommendations. The aggregator deduplicates and ranks by priority.

### Determinism

All recommendation logic is deterministic: same training history + same rules → same recommendations. No randomness, no external API calls. Fully testable.

### Future LLM Hook

The architecture allows an optional future addition:

```typescript
interface LLMEnhancer {
  enhanceRecommendation(rec: Recommendation, context: TrainingContext): Promise<string>;
}
```

This could generate natural-language summaries or more nuanced explanations. It would be opt-in and never required.

---

## Timer Architecture

Three independent timers managed in `timerStore`:

```typescript
interface TimerState {
  // Workout timer (counts up from workout start)
  workoutStartedAt: number | null;

  // Rest timer (counts down from target)
  restStartedAt: number | null;
  restTargetSeconds: number;

  // Exercise timer (counts up from exercise start)
  exerciseStartedAt: number | null;
}
```

Timers use `Date.now()` anchoring rather than `setInterval` counting. This means:
- Timers survive page suspension (iOS background).
- Timers survive brief disconnection.
- Display updates via `requestAnimationFrame` or 1-second interval for display only.
- Actual elapsed time is always `Date.now() - startedAt`.

---

## PWA Architecture

### Service Worker Strategy

- **Precache**: All app shell files (HTML, JS, CSS, icons).
- **Runtime cache**: None needed initially (no API calls).
- **Offline**: App works entirely offline after first load.
- **Updates**: "New version available" toast prompts user to reload.

### Manifest

```json
{
  "name": "JammacusGym",
  "short_name": "Gym",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "orientation": "portrait",
  "icons": [...]
}
```

### iOS Considerations

- iOS PWAs lose state when fully closed. Mitigation: all state persisted to IndexedDB.
- iOS doesn't support push notifications for PWAs (as of 2026, limited support exists but is unreliable). The app does not depend on notifications.
- `viewport-fit=cover` + `safe-area-inset-*` CSS for notch handling.
- `touch-action: manipulation` to prevent double-tap zoom.
- `-webkit-overflow-scrolling: touch` for smooth scrolling.

---

## Data Export/Import Architecture

### Export

```typescript
async function exportAllData(): Promise<Blob> {
  const data = await db.transaction('r', db.tables, async () => {
    return {
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      app: "JammacusGym",
      data: {
        userSettings: await db.userSettings.toArray(),
        exercises: await db.exercises.toArray(),
        // ... all tables
      }
    };
  });
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}
```

### Import

1. Parse JSON.
2. Validate schema version.
3. Validate entity relationships (referential integrity check).
4. Show user what will be imported and what conflicts exist.
5. User confirms merge strategy: "Replace all" or "Merge (keep newer)".
6. Execute within a transaction.

### CSV Export

Per-exercise or per-table CSV for spreadsheet analysis. Uses streaming generation for large datasets.

---

## Testing Architecture

```
tests/
├── unit/
│   ├── engines/
│   │   ├── progression/
│   │   │   ├── double.test.ts
│   │   │   ├── weight.test.ts
│   │   │   └── ...
│   │   ├── analytics/
│   │   │   ├── volume.test.ts
│   │   │   ├── records.test.ts
│   │   │   └── ...
│   │   └── recommendations/
│   │       ├── scheduling.test.ts
│   │       ├── deload.test.ts
│   │       └── ...
│   └── utils/
│       ├── formulas.test.ts
│       └── dates.test.ts
│
├── integration/
│   ├── db/
│   │   ├── workout-flow.test.ts
│   │   ├── export-import.test.ts
│   │   └── migration.test.ts
│   └── stores/
│       └── workout-store.test.ts
│
└── e2e/
    ├── workout-execution.spec.ts
    ├── offline.spec.ts
    └── data-persistence.spec.ts
```

### Testing Principles

- **Engines are tested exhaustively** — every progression strategy, every edge case, every formula.
- **The "template immutability" invariant has dedicated tests** — modifying a template and verifying historical instances are unchanged.
- **Integration tests** use `fake-indexeddb` to test data flows without a browser.
- **E2E tests** use Playwright with iPhone viewport emulation.

---

## Performance Considerations

1. **Workout execution is never blocked by analytics.** Analytics run asynchronously after workout completion.
2. **Large history queries are paginated.** The history page loads 20 workouts at a time.
3. **Chart data is pre-aggregated.** Weekly/monthly rollups computed once and cached.
4. **Bundle splitting.** Analytics and charting code is lazy-loaded — not included in the workout execution critical path.
5. **IndexedDB queries use indexes.** No full-table scans for time-range queries.

---

## Error Handling

- Database write failures: retry once, then surface to user with option to export current state.
- Corrupted import data: validate before writing, reject with specific error messages.
- Missing required fields during workout: prevent set completion until valid.
- App crash during workout: full recovery from persisted state on next load.
