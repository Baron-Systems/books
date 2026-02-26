/**
 * NotesService – تخزين ملاحظات واجهة البداية (Get Started) محليًا.
 * معزول عن قاعدة البيانات ولا يؤثر على أي مسارات أو شاشات أخرى.
 */

const STORAGE_KEY = 'getStartedNotebook';
const DEFAULT_CREATED_KEY = 'getStartedNotebookDefaultCreated';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}

function isNote(value: unknown): value is Note {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const arr = parsed as unknown[];
    return arr.filter(isNote).map((n) => ({ ...n }));
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** ملاحظة افتراضية عند عدم وجود أي ملاحظات (يمكن للمستخدم حذفها) */
function getDefaultNote(): Note {
  const now = new Date().toISOString();
  return {
    id: 'default-welcome',
    title: 'مرحباً',
    content: 'هذه ملاحظة ترحيبية. يمكنك تعديلها أو حذفها وإنشاء ملاحظات جديدة.',
    createdAt: now,
    updatedAt: now,
  };
}

/** ترتيب حسب updatedAt تنازليًا (الأحدث أولاً). عند أول تشغيل بدون ملاحظات يُنشأ ملاحظة افتراضية (قابلة للحذف). */
export function getNotes(): Note[] {
  const notes = loadNotes();
  if (notes.length === 0) {
    try {
      if (!localStorage.getItem(DEFAULT_CREATED_KEY)) {
        const defaultNote = getDefaultNote();
        saveNotes([defaultNote]);
        localStorage.setItem(DEFAULT_CREATED_KEY, '1');
        return [defaultNote];
      }
    } catch {
      // ignore
    }
    return [];
  }
  return notes.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getNote(id: string): Note | null {
  return loadNotes().find((n) => n.id === id) ?? null;
}

export function createNote(): Note {
  const now = new Date().toISOString();
  const note: Note = {
    id: generateId(),
    title: '',
    content: '',
    createdAt: now,
    updatedAt: now,
  };
  const notes = loadNotes();
  notes.push(note);
  saveNotes(notes);
  return note;
}

export function saveNote(updated: Note): void {
  const notes = loadNotes();
  const index = notes.findIndex((n) => n.id === updated.id);
  const toSave: Note = {
    ...updated,
    updatedAt: new Date().toISOString(),
  };
  if (index >= 0) {
    notes[index] = toSave;
  } else {
    notes.push(toSave);
  }
  saveNotes(notes);
}

export function deleteNote(id: string): void {
  const notes = loadNotes().filter((n) => n.id !== id);
  saveNotes(notes);
}
