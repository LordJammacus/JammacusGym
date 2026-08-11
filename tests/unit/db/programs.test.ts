import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/database';
import {
  createProgram,
  getActiveProgram,
  setActiveProgram,
} from '@/db/repositories/programs';
import type { Program } from '@/types/entities';

function makeProgram(id: string, isActive: boolean): Program {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    name: id,
    description: '',
    isActive,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

describe('getActiveProgram', () => {
  beforeEach(async () => {
    await db.programs.clear();
  });

  it('finds a program stored with boolean isActive true', async () => {
    await createProgram(makeProgram('prog-a', true));
    const active = await getActiveProgram();
    expect(active?.id).toBe('prog-a');
  });

  it('ignores archived active flags', async () => {
    await createProgram({
      ...makeProgram('prog-old', true),
      archivedAt: '2026-01-02T00:00:00.000Z',
    });
    await createProgram(makeProgram('prog-live', true));
    const active = await getActiveProgram();
    expect(active?.id).toBe('prog-live');
  });

  it('setActiveProgram switches the active flag', async () => {
    await createProgram(makeProgram('prog-a', true));
    await createProgram(makeProgram('prog-b', false));
    await setActiveProgram('prog-b');

    const active = await getActiveProgram();
    expect(active?.id).toBe('prog-b');

    const a = await db.programs.get('prog-a');
    expect(a?.isActive).toBe(false);
  });
});
