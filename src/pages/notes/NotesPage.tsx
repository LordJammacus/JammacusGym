import { useState, useEffect } from 'react';
import { Button, Card, Modal } from '@/components/ui';
import type { Note } from '@/types/entities';
import type { NoteType } from '@/types/enums';
import * as notesRepo from '@/db/repositories/notes';
import { generateId } from '@/utils/ids';

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const load = async () => {
    const all = await notesRepo.getAllNotes();
    setNotes(all);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    await notesRepo.deleteNote(id);
    load();
  };

  const handleToggleReminder = async (note: Note) => {
    await notesRepo.updateNote(note.id, { showNextTime: !note.showNextTime });
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notes</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ New</Button>
      </div>

      {notes.length === 0 && (
        <Card>
          <p className="text-zinc-400 text-sm">No notes yet. Create one to get started.</p>
        </Card>
      )}

      <div className="space-y-3">
        {notes.map(n => (
          <Card key={n.id}>
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">{n.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-zinc-500 capitalize">{n.type.replace('_', ' ')}</span>
                  {n.showNextTime && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-800/40">reminder</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleToggleReminder(n)} className={`p-1.5 text-xs rounded ${n.showNextTime ? 'text-amber-400' : 'text-zinc-500'}`}>
                  🔔
                </button>
                <button onClick={() => setEditingNote(n)} className="p-1.5 text-xs text-brand-light">Edit</button>
                <button onClick={() => handleDelete(n.id)} className="p-1.5 text-xs text-red-400">×</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <NoteEditorModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={async (content, type, showNextTime) => {
          await notesRepo.createNote({
            id: generateId(),
            type,
            targetId: null,
            content,
            showNextTime,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            archivedAt: null,
          });
          setShowCreate(false);
          load();
        }}
      />

      <NoteEditorModal
        open={editingNote !== null}
        onClose={() => setEditingNote(null)}
        note={editingNote ?? undefined}
        onSave={async (content, type, showNextTime) => {
          if (!editingNote) return;
          await notesRepo.updateNote(editingNote.id, { content, type, showNextTime });
          setEditingNote(null);
          load();
        }}
      />
    </div>
  );
}

function NoteEditorModal({
  open,
  onClose,
  note,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  note?: Note;
  onSave: (content: string, type: NoteType, showNextTime: boolean) => void;
}) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoteType>('general');
  const [showNextTime, setShowNextTime] = useState(false);

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setType(note.type);
      setShowNextTime(note.showNextTime);
    } else {
      setContent('');
      setType('general');
      setShowNextTime(false);
    }
  }, [note, open]);

  return (
    <Modal open={open} onClose={onClose} title={note ? 'Edit Note' : 'New Note'}>
      <div className="space-y-4">
        <textarea
          placeholder="Write your note..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full bg-surface-overlay rounded-lg p-3 text-sm text-white placeholder-zinc-500 resize-none h-28"
        />
        <div className="flex gap-2 flex-wrap">
          {(['general', 'exercise', 'workout_template', 'reminder'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                type === t ? 'bg-brand/20 text-brand-light border border-brand/40' : 'bg-surface-overlay text-zinc-500'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={showNextTime}
            onChange={e => setShowNextTime(e.target.checked)}
            className="rounded"
          />
          Show next time (reminder)
        </label>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(content, type, showNextTime)} disabled={!content.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
