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
  return db.programs.where('isActive').equals(1).first();
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
    const allActive = await db.programs.where('isActive').equals(1).toArray();
    for (const p of allActive) {
      await db.programs.update(p.id, { isActive: false, updatedAt: new Date().toISOString() });
    }
    await db.programs.update(id, { isActive: true, updatedAt: new Date().toISOString() });
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

  const lastCompleted = await db.workoutInstances
    .where('status')
    .equals('completed')
    .filter(i => i.programId === programId)
    .sortBy('startedAt');

  const lastWorkout = lastCompleted[lastCompleted.length - 1];

  if (!lastWorkout) {
    return {
      templateId: blockWorkouts[0]!.workoutTemplateId,
      blockName: activeBlock.name,
      workoutIndex: 0,
    };
  }

  const lastTemplateId = lastWorkout.workoutTemplateId;
  const lastIdx = blockWorkouts.findIndex(bw => bw.workoutTemplateId === lastTemplateId);
  const nextIdx = (lastIdx + 1) % blockWorkouts.length;

  return {
    templateId: blockWorkouts[nextIdx]!.workoutTemplateId,
    blockName: activeBlock.name,
    workoutIndex: nextIdx,
  };
}
