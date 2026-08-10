# Build Brief: Personal iPhone Workout & Training Optimisation Web App

## Role

You are an expert full-stack software engineer, product designer, UX designer, database architect, and sports-training analytics developer.

Build a complete, polished, production-quality **personal workout tracking and training optimisation web application** designed primarily for use on an iPhone.

The application is for **one private user**. It does not need to be published to the Apple App Store.

The application should be installable to an iPhone Home Screen as a **Progressive Web App (PWA)** and should feel as close to a native iPhone application as practical.

The application should prioritise:

1. Fast workout logging.
2. Excellent iPhone usability.
3. Complete historical workout data.
4. Workout/program management.
5. Automatic progression.
6. Training analysis and optimisation.
7. Local ownership of data.
8. No mandatory subscriptions or paid services.
9. No proprietary APIs or services that create ongoing costs.
10. Offline functionality wherever practical.

---

# 1. Core Product Concept

The application is a personal strength and hypertrophy training system.

It should combine the functionality of:

* A workout logger.
* A workout/program builder.
* A training diary.
* A progression engine.
* A training analytics dashboard.
* A workout scheduling system.
* A personal training assistant.

The application should not merely record what the user did.

It should analyse historical training data and help answer:

> "Given everything I have done recently, what should I do next?"

Examples:

* Which day should I train?
* Should I train today or rest?
* What workout should I perform?
* What exercises should I perform?
* How many sets should I perform?
* What weight should I use?
* What rep range should I target?
* How hard should I train?
* Is my current volume appropriate?
* Am I recovering adequately?
* Am I progressing?
* Is fatigue accumulating?
* Should volume be increased, maintained, or reduced?
* Should I deload?
* Is a muscle group being under- or over-trained?
* Is an exercise stagnating?
* Should an exercise be substituted?
* Is the current PPL structure optimal based on my actual performance?

The system should provide **recommendations**, while always allowing the user to override them.

It must never pretend that its recommendations are medically authoritative.

---

# 2. Technology Requirements

Build this as a modern web application with PWA support.

## Critical constraints

The application must NOT require:

* Apple App Store publication.
* An Apple Developer Program membership.
* Paid APIs.
* Paid databases.
* Paid analytics services.
* Proprietary fitness APIs.
* Mandatory cloud hosting subscriptions.
* A commercial backend.

Prefer technologies that are:

* Open source.
* Free for personal use.
* Well maintained.
* Suitable for client-side applications.
* Capable of offline operation.

The application should be deployable as a static web application where possible.

## Recommended architecture

Prefer a:

**React + TypeScript + modern frontend framework + local database/storage + PWA**

architecture.

A suitable implementation could use:

* React
* TypeScript
* Vite or another lightweight modern build system
* IndexedDB through a well-supported abstraction such as Dexie
* Service Worker/PWA support
* CSS/Tailwind or another lightweight styling system
* Charting library with a permissive/open-source licence

Do not introduce unnecessary dependencies.

If another architecture is objectively better for a local-first personal iPhone application, explain why before using it.

---

# 3. Data Ownership

The user's workout data belongs to the user.

The application should be **local-first**.

Workout data should primarily be stored locally on the device.

The application must continue functioning without an internet connection after it has been installed/loaded.

Provide:

* JSON export.
* JSON import.
* CSV export where appropriate.
* Full database backup.
* Restore functionality.

The exported data should contain enough information to completely reconstruct the user's workout history, programs, exercises, notes, measurements, and settings.

Do not make the user's historical training data dependent on an external server.

If cloud synchronisation is added later, it must be optional.

---

# 4. PWA / iPhone Requirements

The application must:

* Be installable from Safari using "Add to Home Screen".
* Have an application icon.
* Have an appropriate splash/loading experience where supported.
* Open in standalone mode.
* Work well in portrait orientation.
* Be optimised for one-handed iPhone use.
* Use large touch targets.
* Avoid hover-dependent functionality.
* Avoid tiny controls.
* Work with the iPhone keyboard.
* Support dark mode.
* Support offline use.
* Preserve state if Safari temporarily suspends the application.
* Never lose an in-progress workout because the page reloads.

The workout logger must automatically save changes continuously.

---

# 5. Main Application Sections

The application should have the following major sections:

1. Today
2. Workout
3. Programs
4. Exercises
5. History
6. Analytics
7. Training Manager
8. Body/Recovery
9. Notes
10. Settings/Data

Use a bottom navigation system optimised for iPhone.

---

# 6. TODAY / DASHBOARD

The main screen should answer:

> "What should I do today?"

Display:

* Current training program.
* Current training block.
* Current week.
* Today's planned workout.
* Last workout.
* Days since each muscle group was trained.
* Recovery indicators.
* Recent performance.
* Current fatigue indicators.
* Recommended action.

Example:

## Today

**Recommended: Push 1**

Reason:

* Chest last trained 72 hours ago.
* Shoulders last trained 72 hours ago.
* Recovery appears adequate.
* Push 1 is next in the current rotation.
* Current weekly volume is within target range.

Button:

**Start Push 1**

Also allow:

* Train anyway.
* Rest today.
* Change workout.
* Move workout to another day.

---

# 7. WORKOUT BUILDER

Users must be able to create and modify workouts.

A workout should contain exercises in a user-defined order.

For every exercise allow configuration of:

* Exercise.
* Number of sets.
* Rep range.
* Target reps.
* Target weight.
* RIR/RPE.
* Rest time.
* Tempo.
* Exercise timer.
* Notes.
* Warm-up sets.
* Working sets.
* Drop sets.
* Failure sets.
* Supersets.
* Optional exercises.

Example:

### Bench Press

3 sets

8–10 reps

Target RIR: 1–2

Target weight: 80kg

Rest: 180 seconds

---

# 8. PPL1 / PPL2 TRAINING SYSTEM

The application must support programs such as:

### Push 1

Hypertrophy-focused

### Pull 1

Hypertrophy-focused

### Legs 1

Hypertrophy-focused

### Push 2

Strength/power-focused

### Pull 2

Strength/power-focused

### Legs 2

Strength/power-focused

However, do not hard-code these assumptions.

The user must be able to configure the training goal of each workout.

Possible goals:

* Hypertrophy
* Strength
* Power
* Explosiveness
* Technique
* Conditioning
* Recovery
* General fitness

The application should understand that different sessions can deliberately have different:

* Volume.
* Intensity.
* Rep ranges.
* RIR.
* Rest periods.
* Exercise selection.
* Fatigue profiles.

---

# 9. TRAINING BLOCKS

Support structured training blocks.

Example:

Program:

**PPL Hypertrophy + Strength**

Block 1:
Weeks 1–4

Block 2:
Weeks 5–8

Block 3:
Weeks 9–11

Deload:
Week 12

Each block can have its own:

* Exercises.
* Volume.
* Intensity.
* Rep ranges.
* RIR targets.
* Progression rules.

Past completed workouts must never change when a program is edited.

Historical workout instances must be immutable records of what actually happened.

---

# 10. WORKOUT EXECUTION SCREEN

The workout screen is the most important screen in the application.

It must be extremely fast to use while training.

Display:

* Exercise.
* Set number.
* Target weight.
* Target reps.
* Actual weight.
* Actual reps.
* RIR/RPE.
* Previous workout result.
* Rest timer.
* Exercise timer.
* Workout timer.

Example:

### Bench Press

**Target**

80kg × 8–10

**Last time**

80kg × 10
80kg × 9
80kg × 8

### Current

Set 1:

80kg × 10 ✓

Set 2:

80kg × 9 ✓

Set 3:

80kg × 8

The interface should make entering the next set extremely fast.

Include large controls for:

* Weight +/-
* Rep +/-
* Complete set.
* Skip set.
* Add set.
* Edit set.
* Start rest timer.

---

# 11. ADDITIONAL SETS DURING WORKOUT

The user must be able to add:

* Additional normal sets.
* Drop sets.
* Warm-up sets.
* Failure sets.
* Custom sets.

These sets must be stored separately from the original programmed target.

For example:

Programmed:

3 sets

Actual:

4 sets

The system must know that the fourth set was an additional set.

---

# 12. TIMERS

Implement:

## Overall workout timer

Starts when the workout begins.

Stops when the workout ends.

## Exercise timer

Tracks time spent on an individual exercise.

## Rest timer

Starts after completing a set.

Allow the user to manually start/stop/modify the timer.

Store:

* Prescribed rest.
* Actual rest.
* Time between sets.
* Exercise duration.
* Total workout duration.

Calculate:

* Total training time.
* Total rest time.
* Total unaccounted time.
* Rest adherence.

Example:

> Prescribed rest: 120 sec
> Actual average rest: 158 sec
> Rest adherence: 76%

---

# 13. NOTES

Support three types of notes.

## Pre-workout notes

Things the user wants to remember before a workout.

## Post-workout notes

Things learned during the workout.

## Persistent exercise notes

Notes associated with an exercise.

Also support temporary:

**"Show this note next time I perform this workout."**

Example:

> Remember to use a narrower grip on bench press.

The note should appear automatically during the next relevant workout.

Allow the user to dismiss/archive the note.

---

# 14. PLANNED VS ACTUAL DATA

This distinction is fundamental.

Never overwrite programmed targets with actual results.

Store separately:

### Planned

* Weight.
* Reps.
* Sets.
* RIR.
* Rest.

### Actual

* Weight.
* Reps.
* Sets.
* RIR.
* RPE.
* Rest.
* Duration.

The application should compare the two.

Example:

**Target:** 80kg × 8–10

**Actual:** 80kg × 10 / 9 / 8

---

# 15. AUTOMATIC PROGRESSION ENGINE

Build a configurable progression engine.

Support:

### Double progression

Example:

3 × 8–12

Increase weight when the user reaches the upper end across all required sets.

### Rep progression

Increase reps while maintaining weight.

### Weight progression

Increase weight after successful workouts.

### RIR progression

Adjust load based on achieved RIR.

### Percentage-based progression

Use percentages of estimated 1RM.

### Top set + back-off sets

Example:

Top set:

100kg × 6–8

Back-off:

90kg × 10 × 3

### Manual progression

User chooses the next target.

The user must be able to configure progression rules per exercise.

---

# 16. TRAINING MANAGER / OPTIMISATION ENGINE

This is a core feature.

The application should analyse historical data to recommend training decisions.

It should consider:

* Workout frequency.
* Muscle-group frequency.
* Weekly set volume.
* Intensity.
* Rep ranges.
* RIR.
* RPE.
* Exercise performance.
* Recent progression.
* Performance decline.
* Workout duration.
* Rest adherence.
* Recovery indicators.
* Previous workout fatigue.
* Days since muscle group was trained.
* Training frequency.
* Recent deloads.
* Training block.
* Program phase.

The system should generate recommendations such as:

> "Chest has received 18 working sets this week and performance is stable. Maintain volume."

Or:

> "Hamstring volume has been low for the last three weeks. Consider adding 2 weekly working sets."

Or:

> "Bench performance has declined across three consecutive sessions while volume and RPE have increased. Consider reducing bench volume or taking a recovery day."

Recommendations must include a short explanation of why they were made.

---

# 17. WORKOUT SCHEDULING OPTIMISATION

The system should help determine when to train.

It should consider:

* User's available days.
* Previous workout.
* Muscle-group recovery.
* Current fatigue.
* Training frequency.
* Program sequence.
* Weekly volume.
* Workout difficulty.

Example:

If Push 1 was Monday and Pull 1 Tuesday, the system may determine that Wednesday Legs 1 is appropriate.

If the user reports unusually high fatigue, the system might recommend:

> Rest today and move Legs 1 to tomorrow.

The user must always be able to override the recommendation.

---

# 18. VOLUME OPTIMISATION

Track weekly volume by:

* Exercise.
* Muscle group.
* Primary muscle.
* Secondary muscle.
* Workout.
* Training block.

Allow the exercise database to specify which muscles an exercise trains and at what approximate contribution.

Calculate:

* Direct sets.
* Indirect sets.
* Total estimated sets.
* Weekly volume.
* Rolling 7-day volume.
* Rolling 14-day volume.
* Rolling 28-day volume.

Avoid pretending these calculations are scientifically exact.

Clearly label estimated/weighted values as estimates.

---

# 19. INTENSITY ANALYSIS

Track:

* Absolute weight.
* Relative intensity where applicable.
* Reps.
* RIR.
* RPE.
* Estimated 1RM.
* Volume load.

Identify trends.

Example:

> Bench Press estimated 1RM

Week 1: 105kg

Week 4: 110kg

Week 8: 115kg

---

# 20. FATIGUE ANALYSIS

Track optional user inputs:

* Sleep quality.
* Energy.
* Motivation.
* Soreness.
* Stress.
* Overall fatigue.
* Workout difficulty.

Use these alongside performance data.

Identify potential patterns.

Example:

> "Your average Pull 2 performance is lower following Legs 2 sessions."

Or:

> "Performance has declined while reported fatigue has increased."

Do not make medical claims.

Do not diagnose overtraining.

Use language such as:

* "Possible fatigue accumulation."
* "Performance trend suggests..."
* "Consider..."
* "Data indicates..."

---

# 21. DELOAD SYSTEM

Allow the user to manually schedule a deload.

Also allow the optimisation engine to recommend one.

Potential triggers:

* Sustained performance decline.
* Increasing RPE.
* Increasing fatigue.
* Reduced performance despite increasing effort.
* Excessive recent volume.
* User-defined schedule.

The system should recommend possible adjustments:

* Reduce sets.
* Reduce load.
* Increase RIR.
* Reduce frequency.
* Maintain movement patterns while reducing fatigue.

Never automatically change the user's program without confirmation.

---

# 22. EXERCISE LIBRARY

Create an exercise database containing:

* Exercise name.
* Category.
* Equipment.
* Primary muscle.
* Secondary muscles.
* Movement pattern.
* Strength/hypertrophy/power suitability.
* Default rep ranges.
* Default rest.
* Notes.

Allow the user to create custom exercises.

Allow exercises to be substituted without changing historical data.

---

# 23. EXERCISE SUBSTITUTION

If an exercise cannot be performed, allow the user to substitute it.

Example:

Bench Press

→ DB Bench Press

→ Smith Machine Bench

→ Chest Press Machine

The original program should remain unchanged.

The completed workout should record what was actually performed.

---

# 24. SUPERSETS

Support:

* Supersets.
* Giant sets.
* Alternating exercises.
* Circuits.

Example:

A1 Bench Press

A2 Cable Row

The timer should understand the structure.

---

# 25. WARM-UP SYSTEM

Separate warm-up sets from working sets.

Warm-up sets should not normally contribute to hypertrophy volume statistics.

Allow manually configured warm-ups.

Optionally generate suggested warm-up sets based on the working weight.

---

# 26. PERSONAL RECORDS

Detect:

* Weight PR.
* Rep PR.
* Volume PR.
* Estimated 1RM PR.
* Rep-at-weight PR.

Display PRs prominently but not intrusively.

Example:

> 🏆 New Bench Press PR
> 82.5kg × 10
> Estimated 1RM: 110kg

---

# 27. ANALYTICS

Create a comprehensive analytics dashboard.

Allow time periods:

* 1 week.
* 1 month.
* 3 months.
* 6 months.
* 1 year.
* Custom.

Charts should include:

* Weight progression.
* Rep progression.
* Volume.
* Estimated 1RM.
* Weekly sets.
* Muscle-group volume.
* Workout frequency.
* Workout duration.
* Rest adherence.
* RIR/RPE.
* Performance trends.
* Bodyweight if recorded.

The user should be able to select individual exercises.

---

# 28. PROGRAM ANALYSIS

For every training program, show:

* Total volume.
* Average weekly volume.
* Frequency.
* Average intensity.
* Average RIR.
* Workout duration.
* Progression.
* PRs.
* Performance changes.
* Muscle-group distribution.

At the end of a training block, provide a summary:

> **8-week block analysis**

Include:

* What improved.
* What stagnated.
* What declined.
* Which muscles received the most volume.
* Which exercises progressed.
* Which exercises stalled.
* Whether volume increased.
* Whether fatigue increased.
* Suggested changes for the next block.

---

# 29. BODY / RECOVERY TRACKING

Optional user inputs:

* Body weight.
* Waist.
* Chest.
* Arms.
* Thighs.
* Other measurements.
* Sleep.
* Energy.
* Soreness.
* Stress.

Plot body measurements against strength progression.

Example:

> Bodyweight +3kg
> Bench estimated 1RM +8kg
> Waist +0.5cm

---

# 30. WORKOUT HISTORY

Every completed workout must remain available.

Show:

* Date.
* Workout.
* Duration.
* Exercises.
* Sets.
* Volume.
* Notes.
* PRs.

Allow the user to open a historical workout and see exactly what happened.

Historical data must never be silently modified because the program has subsequently changed.

---

# 31. SEARCH / FILTERING

Allow searching:

* Exercises.
* Workouts.
* Programs.
* Historical workouts.
* Notes.

Filter analytics by:

* Exercise.
* Muscle group.
* Program.
* Training block.
* Date range.

---

# 32. DATA BACKUP

Provide an obvious:

**Export All Data**

function.

Export a complete JSON backup.

Also provide:

**Import Backup**

Before importing, warn the user if existing data may be overwritten or merged.

Provide safe validation of imported data.

Never silently destroy existing data.

---

# 33. PRIVACY

The app is intended for personal use.

Do not collect analytics.

Do not send workout data to third parties.

Do not require account creation.

Do not include advertising.

Do not require a subscription.

Do not require a proprietary backend.

The application should work entirely locally wherever technically practical.

---

# 34. USER EXPERIENCE PRINCIPLES

The application should feel:

* Fast.
* Minimal.
* Professional.
* Data-rich without being overwhelming.
* Native to iPhone.
* Dark-mode friendly.
* Easy to use during exercise.

The workout screen should prioritise speed over visual complexity.

Analytics screens can be more detailed.

Do not clutter the workout interface with unnecessary information.

---

# 35. RESPONSIVENESS

Design mobile-first.

Primary target:

**iPhone Safari / installed iOS PWA**

Secondary target:

* Desktop browsers.
* iPad.

Do not design desktop first and simply shrink it down.

---

# 36. ACCESSIBILITY

Support:

* Large touch targets.
* Readable fonts.
* High contrast.
* Dynamic layouts.
* Screen-reader labels where practical.
* No functionality that depends solely on colour.

---

# 37. DATABASE DESIGN

Design a robust relational-style data model.

At minimum, consider entities such as:

* UserSettings
* Exercise
* MuscleGroup
* Program
* TrainingBlock
* TrainingWeek
* WorkoutTemplate
* WorkoutTemplateExercise
* SetTarget
* WorkoutInstance
* WorkoutExercise
* CompletedSet
* ExerciseSubstitution
* Note
* BodyMeasurement
* RecoveryMeasurement
* ProgressionRule
* TrainingRecommendation
* PersonalRecord

Use IDs and timestamps appropriately.

Separate:

**Templates**

from:

**Historical workout instances**

This is essential.

---

# 38. ANALYTICS ENGINE

Create analytics as a separate logical layer rather than hard-coding calculations into UI components.

The analytics engine should calculate things such as:

* Weekly volume.
* Rolling volume.
* Frequency.
* Exercise progression.
* Estimated 1RM.
* PRs.
* RIR trends.
* RPE trends.
* Workout duration.
* Rest adherence.
* Muscle-group volume.
* Performance trends.
* Fatigue indicators.

Keep calculations deterministic and testable.

---

# 39. RECOMMENDATION ENGINE

Create a separate recommendation engine.

Each recommendation should contain:

* Recommendation.
* Reason.
* Supporting data.
* Confidence/strength indicator where appropriate.
* Suggested action.
* User override option.

Example:

```text
Recommendation:
Rest today.

Reason:
Legs were trained heavily 36 hours ago and your last two lower-body
sessions show reduced performance alongside increased reported fatigue.

Suggested action:
Move Legs 2 to tomorrow.

User choice:
Accept / Ignore / Modify
```

Do not automatically alter the user's schedule.

---

# 40. SCIENTIFIC CAUTION

Training recommendations should be treated as data-informed heuristics, not medical or scientific certainty.

Avoid claims such as:

"You definitely need 48 hours recovery."

Instead use:

"Your recent performance suggests you may benefit from additional recovery."

The system should clearly distinguish:

* Recorded facts.
* Calculated metrics.
* Heuristics.
* Recommendations.

---

# 41. SETTINGS

Include settings for:

* Units: kg/lb.
* Distance/time format.
* Default rest timers.
* Default RIR.
* Default progression strategy.
* Week start day.
* Theme.
* Notification preferences if supported.
* Data export.
* Data import.
* Reset/delete data.

---

# 42. NOTIFICATIONS

Do not make notifications a core dependency.

If technically practical for the PWA, support optional reminders such as:

> "Push 1 is scheduled today."

But the application must work fully without notifications.

---

# 43. OFFLINE-FIRST BEHAVIOUR

Once the application has been installed/loaded:

* Workout logging should work offline.
* Historical data should work offline.
* Programs should work offline.
* Analytics based on local data should work offline.
* The current workout should survive temporary connectivity loss.

Never require an internet connection to record a workout.

---

# 44. SECURITY / DATA SAFETY

Prevent accidental data loss.

Use:

* Transactional database operations where possible.
* Automatic saves.
* Validation.
* Backup/export.
* Import validation.
* Confirmation before destructive actions.

If a workout is in progress and the application closes, restore it when the application is reopened.

---

# 45. DEVELOPMENT APPROACH

Do not attempt to build every feature simultaneously.

Build in stages.

## Phase 1 — Foundation

Build:

* Project structure.
* PWA.
* Local database.
* Exercise library.
* Workout templates.
* Workout execution.
* Set logging.
* Timers.
* Historical workouts.
* Basic navigation.

## Phase 2 — Training system

Add:

* Programs.
* PPL1/PPL2.
* Training blocks.
* Progression engine.
* Notes.
* Warm-ups.
* Supersets.
* Exercise substitutions.

## Phase 3 — Analytics

Add:

* Charts.
* PR detection.
* Volume analysis.
* Progression analysis.
* Muscle-group analysis.
* Workout duration analysis.
* Rest adherence.

## Phase 4 — Training manager

Add:

* Scheduling optimisation.
* Fatigue analysis.
* Recovery tracking.
* Volume recommendations.
* Intensity recommendations.
* Deload recommendations.
* Training block analysis.

## Phase 5 — Polish

Improve:

* iPhone UX.
* Animations.
* Dark mode.
* Accessibility.
* Performance.
* Offline behaviour.
* Data backup.
* Error handling.

---

# 46. TESTING REQUIREMENTS

Create automated tests for:

* Progression calculations.
* Volume calculations.
* PR detection.
* Estimated 1RM calculations.
* Rest calculations.
* Workout duration.
* Historical data integrity.
* Program modifications.
* Data export/import.
* Recommendation logic.

Especially test that changing a workout template does NOT change historical workouts.

Test the application on mobile-sized screens.

Test:

* Offline mode.
* Page refresh during workout.
* Browser restart during workout.
* Adding sets.
* Editing completed sets.
* Substituting exercises.
* Importing/exporting data.

---

# 47. DESIGN DIRECTION

The visual design should be inspired by modern fitness applications but must NOT copy another company's proprietary UI.

Use:

* Clean cards.
* Strong typography.
* Clear hierarchy.
* Large touch controls.
* Minimal navigation during workouts.
* Dark mode.
* Subtle animations.
* Clear charts.

The interface should feel like a serious training tool rather than a generic web dashboard.

---

# 48. IMPORTANT PRODUCT PRINCIPLE

The app should progressively move from:

**"What did I do?"**

to:

**"What should I do?"**

The historical logger is the foundation.

The ultimate purpose is to use that history to make increasingly useful training decisions.

The application should therefore continuously collect high-quality structured data without making the workout experience cumbersome.

---

# 49. FIRST DEVELOPMENT TASK

Before writing substantial application code:

1. Analyse this entire specification.
2. Identify ambiguities and technical risks.
3. Propose the final technology stack.
4. Design the database schema.
5. Define the application's information architecture.
6. Define the main screens and navigation.
7. Define the progression engine.
8. Define the analytics architecture.
9. Define the recommendation architecture.
10. Identify which features belong in MVP.
11. Explain any feature that cannot be implemented reliably as a PWA.
12. Create a development roadmap.

Do NOT immediately generate a huge codebase.

First produce the architecture and implementation plan.

After the plan is approved, implement the application incrementally.

At every stage:

* Keep the application runnable.
* Avoid breaking existing functionality.
* Write tests for important logic.
* Keep the database schema migration-safe.
* Avoid unnecessary dependencies.
* Prefer simple, maintainable solutions.
* Explain important architectural decisions.

The final product should be a **private, personal, offline-first iPhone workout and training optimisation application** that the user can install to their iPhone Home Screen and use without publishing anything to the App Store or paying for proprietary services.
