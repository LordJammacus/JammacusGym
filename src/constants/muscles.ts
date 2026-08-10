import type { MuscleGroup } from '@/types/entities';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'mg-chest', name: 'Chest', category: 'push', sortOrder: 0 },
  { id: 'mg-front-delts', name: 'Front Delts', category: 'push', sortOrder: 1 },
  { id: 'mg-side-delts', name: 'Side Delts', category: 'push', sortOrder: 2 },
  { id: 'mg-rear-delts', name: 'Rear Delts', category: 'pull', sortOrder: 3 },
  { id: 'mg-triceps', name: 'Triceps', category: 'push', sortOrder: 4 },
  { id: 'mg-biceps', name: 'Biceps', category: 'pull', sortOrder: 5 },
  { id: 'mg-forearms', name: 'Forearms', category: 'pull', sortOrder: 6 },
  { id: 'mg-upper-back', name: 'Upper Back', category: 'pull', sortOrder: 7 },
  { id: 'mg-lats', name: 'Lats', category: 'pull', sortOrder: 8 },
  { id: 'mg-traps', name: 'Traps', category: 'pull', sortOrder: 9 },
  { id: 'mg-lower-back', name: 'Lower Back', category: 'pull', sortOrder: 10 },
  { id: 'mg-quads', name: 'Quads', category: 'legs', sortOrder: 11 },
  { id: 'mg-hamstrings', name: 'Hamstrings', category: 'legs', sortOrder: 12 },
  { id: 'mg-glutes', name: 'Glutes', category: 'legs', sortOrder: 13 },
  { id: 'mg-calves', name: 'Calves', category: 'legs', sortOrder: 14 },
  { id: 'mg-abs', name: 'Abs', category: 'core', sortOrder: 15 },
  { id: 'mg-obliques', name: 'Obliques', category: 'core', sortOrder: 16 },
];
