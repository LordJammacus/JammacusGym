import { db } from '../database';
import type { Program, TrainingBlock, BlockWorkout } from '@/types/entities';

// --- Programs ---

export async function getAllPrograms(): Promise<Program[]> {
  return db.programs.filter(p => p.archivedAt === null).toArray();
}

export async function getProgram(id: string): Promise<Program | undefined> {
  return db.programs.get(id);
}

export async function getActiveProgram(): Promise<Program | undefined> {
  // Don't use where('isActive').equals(1) — IndexedDB stores JS booleans as
  // true/false, not 1/0, so the numeric index lookup misses active programs.
  return db.programs
    .filter(p => p.isActive === true && p.archivedAt === null)
    .first();
}

export async function createProgram(program: Program): Promise<void> {
  await db.programs.put(program);
}

export async function updateProgram(id: string, updates: Partial<Program>): Promise<void> {
  await db.programs.update(id, { ...updates, updatedAt: new Date().toISOString() });
}

export async function archiveProgram(id: string): Promise<void> {
  await db.programs.update(id, {
    archivedAt: new Date().toISOString(),
    isActive: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function setActiveProgram(id: string): Promise<void> {
  await db.transaction('rw', db.programs, async () => {
    const all = await db.programs.toArray();
    const now = new Date().toISOString();
    for (const p of all) {
      if (p.isActive) {
        await db.programs.update(p.id, { isActive: false, updatedAt: now });
      }
    }
    await db.programs.update(id, { isActive: true, updatedAt: now });
  });
}

// --- Training Blocks ---

export async function getBlocksForProgram(programId: string): Promise<TrainingBlock[]> {
  return db.trainingBlocks
    .where('programId')
    .equals(programId)
    .sortBy('orderIndex');
}

export async function createBlock(block: TrainingBlock): Promise<void> {
  await db.trainingBlocks.put(block);
}

export async function updateBlock(id: string, updates: Partial<TrainingBlock>): Promise<void> {
  await db.trainingBlocks.update(id, updates);
}

export async function deleteBlock(id: string): Promise<void> {
  await db.transaction('rw', [db.trainingBlocks, db.blockWorkouts], async () => {
    await db.blockWorkouts.where('trainingBlockId').equals(id).delete();
    await db.trainingBlocks.delete(id);
  });
}

export async function reorderBlocks(blocks: { id: string; orderIndex: number }[]): Promise<void> {
  await db.transaction('rw', db.trainingBlocks, async () => {
    for (const b of blocks) {
      await db.trainingBlocks.update(b.id, { orderIndex: b.orderIndex });
    }
  });
}

// --- Block Workouts ---

export async function getProgramContextForTemplate(templateId: string): Promise<{
  programId: string | null;
  trainingBlockId: string | null;
}> {
  const program = await getActiveProgram();
  if (!program) return { programId: null, trainingBlockId: null };

  const blocks = await getBlocksForProgram(program.id);
  for (const block of blocks) {
    const workouts = await getBlockWorkouts(block.id);
    if (workouts.some(bw => bw.workoutTemplateId === templateId)) {
      return { programId: program.id, trainingBlockId: block.id };
    }
  }
  return { programId: null, trainingBlockId: null };
}

export async function getBlockWorkouts(trainingBlockId: string): Promise<BlockWorkout[]> {
  return db.blockWorkouts
    .where('trainingBlockId')
    .equals(trainingBlockId)
    .sortBy('orderIndex');
}

export async function addBlockWorkout(bw: BlockWorkout): Promise<void> {
  await db.blockWorkouts.put(bw);
}

export async function removeBlockWorkout(id: string): Promise<void> {
  await db.blockWorkouts.delete(id);
}

export async function reorderBlockWorkouts(workouts: { id: string; orderIndex: number }[]): Promise<void> {
  await db.transaction('rw', db.blockWorkouts, async () => {
    for (const w of workouts) {
      await db.blockWorkouts.update(w.id, { orderIndex: w.orderIndex });
    }
  });
}

/** Workouts that are not on any live program's rotation. */
export const NO_PROGRAM_GROUP_ID = 'none';

export interface WorkoutGroup {
  id: string;
  label: string;
  programId: string | null;
  blockId: string | null;
  isActive: boolean;
  templateIds: string[];
}

/**
 * Groups live templates by program, and by block when a program has more than one.
 * Templates that are not on a live program land in the No program group.
 */
export async function listWorkoutGroups(): Promise<WorkoutGroup[]> {
  const programs = (await getAllPrograms()).sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const liveTemplates = await db.workoutTemplates.filter(t => t.archivedAt === null).toArray();
  const liveIds = new Set(liveTemplates.map(t => t.id));
  const assigned = new Set<string>();
  const groups: WorkoutGroup[] = [];

  for (const program of programs) {
    const blocks = await getBlocksForProgram(program.id);
    if (blocks.length === 0) {
      groups.push({
        id: `program:${program.id}`,
        label: program.name,
        programId: program.id,
        blockId: null,
        isActive: program.isActive,
        templateIds: [],
      });
      continue;
    }

    const splitByBlock = blocks.length > 1;
    for (const [index, block] of blocks.entries()) {
      const workouts = await getBlockWorkouts(block.id);
      const templateIds: string[] = [];
      for (const bw of workouts) {
        if (!liveIds.has(bw.workoutTemplateId) || templateIds.includes(bw.workoutTemplateId)) continue;
        templateIds.push(bw.workoutTemplateId);
        assigned.add(bw.workoutTemplateId);
      }
      groups.push({
        id: `block:${block.id}`,
        label: splitByBlock ? `${program.name} · ${block.name}` : program.name,
        programId: program.id,
        blockId: block.id,
        isActive: program.isActive && index === 0,
        templateIds,
      });
    }
  }

  const looseIds = liveTemplates
    .filter(t => !assigned.has(t.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(t => t.id);

  groups.push({
    id: NO_PROGRAM_GROUP_ID,
    label: 'No program',
    programId: null,
    blockId: null,
    isActive: false,
    templateIds: looseIds,
  });

  return groups;
}

// --- Next Workout Logic ---

export async function determineNextWorkout(programId: string): Promise<{
  templateId: string;
  blockName: string;
  workoutIndex: number;
} | null> {
  const blocks = await getBlocksForProgram(programId);
  if (blocks.length === 0) return null;

  const activeBlock = blocks[0]!;
  const blockWorkouts = await getBlockWorkouts(activeBlock.id);
  if (blockWorkouts.length === 0) return null;

  const templateIds = new Set(blockWorkouts.map(bw => bw.workoutTemplateId));
  const completed = await db.workoutInstances
    .where('status')
    .equals('completed')
    .sortBy('startedAt');

  // Starts historically omitted programId. Count completed sessions of this
  // block's templates; abandoned/paused/in-progress never happened for rotation.
  const lastWorkout = [...completed].reverse().find(i => {
    if (!i.workoutTemplateId || !templateIds.has(i.workoutTemplateId)) return false;
    return i.programId === programId || i.programId === null;
  });

  if (!lastWorkout?.workoutTemplateId) {
    return {
      templateId: blockWorkouts[0]!.workoutTemplateId,
      blockName: activeBlock.name,
      workoutIndex: 0,
    };
  }

  const lastIdx = blockWorkouts.findIndex(bw => bw.workoutTemplateId === lastWorkout.workoutTemplateId);
  const nextIdx = lastIdx < 0 ? 0 : (lastIdx + 1) % blockWorkouts.length;

  return {
    templateId: blockWorkouts[nextIdx]!.workoutTemplateId,
    blockName: activeBlock.name,
    workoutIndex: nextIdx,
  };
}
