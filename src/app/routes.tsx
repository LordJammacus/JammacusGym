import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TodayPage } from '@/pages/today/TodayPage';
import { WorkoutPage } from '@/pages/workout/WorkoutPage';
import { StartWorkoutPage, ActiveWorkoutPage } from '@/pages/workout/WorkoutExecutionPage';

const TemplateEditorPage = lazy(() => import('@/pages/workout/TemplateEditorPage').then(m => ({ default: m.TemplateEditorPage })));
const ProgramsPage = lazy(() => import('@/pages/programs/ProgramsPage').then(m => ({ default: m.ProgramsPage })));
const ProgramDetailPage = lazy(() => import('@/pages/programs/ProgramDetailPage').then(m => ({ default: m.ProgramDetailPage })));
const ExercisesPage = lazy(() => import('@/pages/exercises/ExercisesPage').then(m => ({ default: m.ExercisesPage })));
const ExerciseDetailPage = lazy(() => import('@/pages/exercises/ExerciseDetailPage').then(m => ({ default: m.ExerciseDetailPage })));
const HistoryPage = lazy(() => import('@/pages/history/HistoryPage').then(m => ({ default: m.HistoryPage })));
const HistoryDetailPage = lazy(() => import('@/pages/history/HistoryDetailPage').then(m => ({ default: m.HistoryDetailPage })));
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const ExerciseAnalyticsPage = lazy(() => import('@/pages/analytics/ExerciseAnalyticsPage').then(m => ({ default: m.ExerciseAnalyticsPage })));
const PRHistoryPage = lazy(() => import('@/pages/analytics/PRHistoryPage').then(m => ({ default: m.PRHistoryPage })));
const TrainingManagerPage = lazy(() => import('@/pages/training-manager/TrainingManagerPage').then(m => ({ default: m.TrainingManagerPage })));
const BodyPage = lazy(() => import('@/pages/body/BodyPage').then(m => ({ default: m.BodyPage })));
const NotesPage = lazy(() => import('@/pages/notes/NotesPage').then(m => ({ default: m.NotesPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const MorePage = lazy(() => import('@/pages/more/MorePage').then(m => ({ default: m.MorePage })));

function LazyFallback() {
  return <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Loading...</div>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/workout/template/:id" element={<TemplateEditorPage />} />
        <Route path="/workout/start/:templateId" element={<StartWorkoutPage />} />
        <Route path="/workout/active" element={<ActiveWorkoutPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/programs/:id" element={<ProgramDetailPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics/exercise/:id" element={<ExerciseAnalyticsPage />} />
        <Route path="/analytics/records" element={<PRHistoryPage />} />
        <Route path="/training" element={<TrainingManagerPage />} />
        <Route path="/body" element={<BodyPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
