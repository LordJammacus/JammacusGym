# Database Schema

## Design Principles

1. **Templates are mutable** — the user edits programs, workouts, and exercises freely.
2. **Instances are immutable** — a completed workout is a permanent historical record. Editing a template never changes past instances.
3. **Snapshot on start** — when a workout begins, the relevant template data is copied into the instance. The instance stores both the planned targets (as they were at that moment) and the actual results.
4. **UUIDs everywhere** — all primary keys are `crypto.randomUUID()` strings.
5. **ISO timestamps** — all dates/times stored as ISO 8601 strings for indexability and export clarity.
6. **Soft deletes where appropriate** — exercises and programs use `archivedAt` rather than hard delete, preserving referential integrity in historical data.

---

## Entity Relationship Overview

```
Program
  └── TrainingBlock
        └── BlockWorkout (ordered link to WorkoutTemplate)

WorkoutTemplate
  └── TemplateExercise (ordered)
        └── SetTarget (ordered)

WorkoutInstance (immutable snapshot)
  └── WorkoutExerciseInstance (ordered)
        └── CompletedSet (ordered)

Exercise
  └── ExerciseMuscle (junction → MuscleGroup)

ProgressionRule → linked to TemplateExercise or Exercise

Note → linked to Exercise | WorkoutTemplate | WorkoutInstance

BodyMeasurement (standalone, timestamped)
RecoveryLog (standalone, timestamped)
PersonalRecord (derived, cached)
```

---

## Entities

### UserSettings

Single row. Application configuration.

| Field | Type | Notes |
|-------|------|-------|
| id | string | Always `"default"` |
| units | `"kg"` \| `"lb"` | Weight display |
| weekStartDay | number | 0=Sunday, 1=Monday, etc. |
| defaultRestSeconds | number | Default rest timer |
| defaultRir | number | Default RIR target |
| defaultProgressionStrategy | string | Enum of strategy types |
| theme | `"dark"` \| `"light"` \| `"system"` | |
| weightIncrement | number | Smallest weight jump (e.g. 2.5) |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |

---

### MuscleGroup

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| name | string | e.g. "Chest", "Quads", "Rear Delts" |
| category | string | "push" \| "pull" \| "legs" \| "core" \| "other" |
| sortOrder | number | Display ordering |

---

### Exercise

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| name | string | e.g. "Barbell Bench Press" |
| category | string | "compound" \| "isolation" \| "cardio" \| "other" |
| equipment | string | "barbell" \| "dumbbell" \| "cable" \| "machine" \| "bodyweight" \| "other" |
| movementPattern | string | "horizontal_push" \| "vertical_pull" \| "hip_hinge" \| "squat" \| "isolation" \| etc. |
| defaultRepRangeMin | number | |
| defaultRepRangeMax | number | |
| defaultRestSeconds | number | |
| suitability | object | `{ hypertrophy: 1-5, strength: 1-5, power: 1-5 }` |
| notes | string | Persistent exercise notes |
| isCustom | boolean | User-created vs seed data |
| archivedAt | string \| null | Soft delete |
| createdAt | string | |
| updatedAt | string | |

---

### ExerciseMuscle

Junction table: which muscles an exercise works and at what contribution.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| exerciseId | string | FK → Exercise |
| muscleGroupId | string | FK → MuscleGroup |
| role | `"primary"` \| `"secondary"` | |
| contribution | number | 0.0–1.0 (1.0 = full set counts, 0.3 = ~30% contribution) |

**Index**: `[exerciseId]`, `[muscleGroupId]`

---

### Program

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| name | string | e.g. "PPL Hypertrophy + Strength" |
| description | string | |
| isActive | boolean | Only one program active at a time |
| createdAt | string | |
| updatedAt | string | |
| archivedAt | string \| null | |

---

### TrainingBlock

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| programId | string | FK → Program |
| name | string | e.g. "Block 1 — Volume" |
| orderIndex | number | Position within program |
| weekCount | number | Number of weeks in this block |
| goal | string | "hypertrophy" \| "strength" \| "power" \| "deload" \| etc. |
| notes | string | |
| createdAt | string | |

---

### BlockWorkout

Links a TrainingBlock to its WorkoutTemplates in a specific rotation order.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| trainingBlockId | string | FK → TrainingBlock |
| workoutTemplateId | string | FK → WorkoutTemplate |
| orderIndex | number | Position in rotation (0, 1, 2 = Push, Pull, Legs) |
| dayOfWeek | number \| null | Optional preferred day (null = flexible) |

**Index**: `[trainingBlockId, orderIndex]`

---

### WorkoutTemplate

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| name | string | e.g. "Push 1" |
| goal | string | "hypertrophy" \| "strength" \| "power" \| etc. |
| estimatedDurationMinutes | number \| null | |
| notes | string | |
| createdAt | string | |
| updatedAt | string | |
| archivedAt | string \| null | |

---

### TemplateExercise

An exercise slot within a workout template.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| workoutTemplateId | string | FK → WorkoutTemplate |
| exerciseId | string | FK → Exercise |
| orderIndex | number | Position in workout |
| supersetGroup | string \| null | e.g. "A" — exercises with same group are supersetted |
| isOptional | boolean | Can be skipped |
| restSeconds | number | Prescribed rest between sets |
| tempo | string \| null | e.g. "3-1-2-0" |
| notes | string | |
| progressionRuleId | string \| null | FK → ProgressionRule |

**Index**: `[workoutTemplateId, orderIndex]`

---

### SetTarget

Planned sets for a TemplateExercise.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| templateExerciseId | string | FK → TemplateExercise |
| orderIndex | number | Set position |
| setType | string | "working" \| "warmup" \| "drop" \| "failure" \| "backoff" |
| targetWeight | number \| null | null = user decides |
| targetRepMin | number | |
| targetRepMax | number | |
| targetRir | number \| null | |
| targetRpe | number \| null | |
| percentageOf1RM | number \| null | Alternative to absolute weight |

**Index**: `[templateExerciseId, orderIndex]`

---

### ProgressionRule

Configurable per exercise or per template-exercise.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| name | string | User-facing label |
| strategy | string | "double" \| "rep" \| "weight" \| "rir" \| "percentage" \| "topset_backoff" \| "manual" |
| weightIncrement | number | How much to increase weight |
| repThreshold | number \| null | For double progression: upper rep that triggers weight increase |
| requiredConsecutiveSuccess | number | How many sessions must meet criteria |
| deloadPercentage | number \| null | Auto-deload after N failures |
| deloadAfterFailures | number \| null | |
| notes | string | |
| createdAt | string | |

---

### WorkoutInstance

**Immutable historical record.** Created when a workout starts.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| workoutTemplateId | string \| null | FK → WorkoutTemplate (null for ad-hoc workouts) |
| programId | string \| null | Program at time of workout |
| trainingBlockId | string \| null | Block at time of workout |
| templateName | string | Snapshot of template name at time of creation |
| goal | string | Snapshot of workout goal |
| status | string | "in_progress" \| "completed" \| "abandoned" |
| startedAt | string | ISO timestamp |
| completedAt | string \| null | |
| durationSeconds | number \| null | |
| totalRestSeconds | number \| null | Calculated sum |
| notes | string | Post-workout notes |
| preWorkoutNotes | string | |
| perceivedDifficulty | number \| null | 1-10 |
| createdAt | string | |

**Index**: `[startedAt]`, `[workoutTemplateId]`, `[status]`

---

### WorkoutExerciseInstance

A specific exercise as performed within a WorkoutInstance.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| workoutInstanceId | string | FK → WorkoutInstance |
| exerciseId | string | FK → Exercise (the exercise actually performed) |
| templateExerciseId | string \| null | FK → TemplateExercise (original slot, null if ad-hoc) |
| originalExerciseId | string \| null | If substituted, the originally-planned exercise |
| orderIndex | number | Position in workout as performed |
| supersetGroup | string \| null | |
| startedAt | string \| null | |
| completedAt | string \| null | |
| restSecondsTarget | number | Prescribed rest (snapshot) |
| notes | string | |

**Index**: `[workoutInstanceId, orderIndex]`, `[exerciseId]`

---

### CompletedSet

Individual set record. The core unit of training data.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| workoutExerciseInstanceId | string | FK → WorkoutExerciseInstance |
| orderIndex | number | Set position as performed |
| setType | string | "working" \| "warmup" \| "drop" \| "failure" \| "backoff" \| "additional" |
| targetWeight | number \| null | What was planned (snapshot) |
| targetRepMin | number \| null | Planned range min (snapshot) |
| targetRepMax | number \| null | Planned range max (snapshot) |
| targetRir | number \| null | Planned RIR (snapshot) |
| actualWeight | number | What was lifted |
| actualReps | number | Reps completed |
| actualRir | number \| null | User-reported RIR |
| actualRpe | number \| null | User-reported RPE |
| isAdditional | boolean | True if user added this beyond programmed sets |
| restAfterSeconds | number \| null | Actual rest taken after this set |
| completedAt | string | When set was logged |
| notes | string | |

**Index**: `[workoutExerciseInstanceId, orderIndex]`, `[completedAt]`

---

### Note

Flexible note system.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| type | string | "exercise" \| "workout_template" \| "workout_instance" \| "general" \| "reminder" |
| linkedEntityId | string \| null | FK to exercise, template, or instance |
| content | string | |
| showNextWorkout | boolean | "Show this next time" flag |
| dismissedAt | string \| null | When user dismissed the reminder |
| createdAt | string | |
| updatedAt | string | |

**Index**: `[type, linkedEntityId]`, `[showNextWorkout]`

---

### BodyMeasurement

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| date | string | ISO date (YYYY-MM-DD) |
| bodyweight | number \| null | |
| waist | number \| null | cm or inches based on settings |
| chest | number \| null | |
| leftArm | number \| null | |
| rightArm | number \| null | |
| leftThigh | number \| null | |
| rightThigh | number \| null | |
| notes | string | |
| createdAt | string | |

**Index**: `[date]`

---

### RecoveryLog

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| date | string | ISO date |
| sleepQuality | number \| null | 1-5 |
| sleepHours | number \| null | |
| energy | number \| null | 1-5 |
| motivation | number \| null | 1-5 |
| soreness | number \| null | 1-5 (5 = very sore) |
| stress | number \| null | 1-5 |
| overallFatigue | number \| null | 1-5 |
| notes | string | |
| createdAt | string | |

**Index**: `[date]`

---

### PersonalRecord

Cached/derived table. Rebuilt from CompletedSet data.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| exerciseId | string | FK → Exercise |
| type | string | "weight" \| "reps" \| "volume" \| "estimated_1rm" \| "reps_at_weight" |
| value | number | The record value |
| weight | number \| null | Context (for reps_at_weight) |
| reps | number \| null | Context |
| completedSetId | string | FK → CompletedSet that achieved this PR |
| achievedAt | string | When it happened |
| createdAt | string | |

**Index**: `[exerciseId, type]`, `[achievedAt]`

---

## Key Invariants

1. **WorkoutInstance is never modified after completion** except for post-workout notes. CompletedSet records are append-only during the workout and frozen on completion.

2. **Template edits do not propagate to instances.** The WorkoutInstance stores `templateName` and goal as strings. CompletedSet stores `targetWeight`, `targetRepMin`, `targetRepMax`, `targetRir` as snapshots of what was planned at start time.

3. **Exercise deletion is soft.** An archived exercise remains referenced by all historical CompletedSets. The UI hides archived exercises from template builders but shows them in history.

4. **Program deletion is soft.** Historical instances retain `programId` and can always display which program they belonged to.

5. **Substitution preserves both sides.** WorkoutExerciseInstance stores `exerciseId` (what was performed) AND `originalExerciseId` (what was planned). Analytics can track either.

---

## Indexes Strategy

Dexie compound indexes for common query patterns:

```typescript
db.version(1).stores({
  userSettings: 'id',
  muscleGroups: 'id, name, category',
  exercises: 'id, name, category, equipment, movementPattern, archivedAt',
  exerciseMuscles: 'id, exerciseId, muscleGroupId',
  programs: 'id, isActive, archivedAt',
  trainingBlocks: 'id, programId, orderIndex',
  blockWorkouts: 'id, trainingBlockId, orderIndex',
  workoutTemplates: 'id, name, archivedAt',
  templateExercises: 'id, workoutTemplateId, orderIndex',
  setTargets: 'id, templateExerciseId, orderIndex',
  progressionRules: 'id',
  workoutInstances: 'id, workoutTemplateId, programId, status, startedAt, completedAt',
  workoutExerciseInstances: 'id, workoutInstanceId, exerciseId, orderIndex',
  completedSets: 'id, workoutExerciseInstanceId, orderIndex, completedAt',
  notes: 'id, type, linkedEntityId, showNextWorkout',
  bodyMeasurements: 'id, date',
  recoveryLogs: 'id, date',
  personalRecords: 'id, exerciseId, type, achievedAt',
});
```

---

## Schema Migration Strategy

Dexie supports incremental versioning:

```typescript
db.version(1).stores({ /* initial schema */ });
db.version(2).stores({ /* added fields */ }).upgrade(tx => { /* migrate data */ });
db.version(3).stores({ /* ... */ });
```

Rules:
- Never remove an indexed field without migration.
- New optional fields are backward-compatible (no migration needed).
- Schema version is stored in the export JSON for import compatibility.
- Each version upgrade function is tested independently.

---

## Data Volume Estimates (5-10 years)

Assuming 5 sessions/week, 6 exercises/session, 4 sets/exercise:

- **CompletedSets**: ~5 × 6 × 4 × 52 × 10 = **624,000 rows** over 10 years
- **WorkoutInstances**: ~2,600 rows
- **WorkoutExerciseInstances**: ~15,600 rows

IndexedDB handles this comfortably. Queries should use indexed fields. Analytics that scan large date ranges will use pagination or pre-computed summaries if performance degrades.

---

## Export Format

```json
{
  "version": 1,
  "exportedAt": "2026-08-09T22:00:00.000Z",
  "app": "JammacusGym",
  "data": {
    "userSettings": { ... },
    "muscleGroups": [ ... ],
    "exercises": [ ... ],
    "exerciseMuscles": [ ... ],
    "programs": [ ... ],
    "trainingBlocks": [ ... ],
    "blockWorkouts": [ ... ],
    "workoutTemplates": [ ... ],
    "templateExercises": [ ... ],
    "setTargets": [ ... ],
    "progressionRules": [ ... ],
    "workoutInstances": [ ... ],
    "workoutExerciseInstances": [ ... ],
    "completedSets": [ ... ],
    "notes": [ ... ],
    "bodyMeasurements": [ ... ],
    "recoveryLogs": [ ... ],
    "personalRecords": [ ... ]
  }
}
```

The `version` field allows future import logic to handle schema differences.
