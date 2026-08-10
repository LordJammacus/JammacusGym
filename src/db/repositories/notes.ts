import { db } from '../database';
import type { Note } from '@/types/entities';
import type { NoteType } from '@/types/enums';

export async function createNote(note: Note): Promise<void> {
  await db.notes.put(note);
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<void> {
  await db.notes.update(id, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.update(id, { archivedAt: new Date().toISOString() });
}

export async function getNote(id: string): Promise<Note | undefined> {
  return db.notes.get(id);
}

export async function getNotesForTarget(targetId: string, type?: NoteType): Promise<Note[]> {
  let query = db.notes.where('targetId').equals(targetId).filter(n => n.archivedAt === null);
  if (type) {
    query = db.notes.where('targetId').equals(targetId).filter(n => n.archivedAt === null && n.type === type);
  }
  return query.toArray();
}

export async function getReminderNotes(targetId: string): Promise<Note[]> {
  return db.notes
    .where('targetId')
    .equals(targetId)
    .filter(n => n.archivedAt === null && n.showNextTime)
    .toArray();
}

export async function getAllNotes(): Promise<Note[]> {
  return db.notes.filter(n => n.archivedAt === null).reverse().sortBy('updatedAt');
}

export async function getGeneralNotes(): Promise<Note[]> {
  return db.notes
    .where('type')
    .equals('general')
    .filter(n => n.archivedAt === null)
    .reverse()
    .sortBy('updatedAt');
}
