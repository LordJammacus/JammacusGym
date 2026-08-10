import type { UserSettings } from '@/types/entities';

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'default',
  units: 'kg',
  weekStartDay: 1,
  defaultRestSeconds: 120,
  defaultRir: 2,
  defaultProgressionStrategy: 'double',
  theme: 'dark',
  weightIncrement: 2.5,
  availableTrainingDays: [1, 2, 3, 4, 5, 6],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
