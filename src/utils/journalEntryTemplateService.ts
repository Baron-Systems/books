/**
 * Service for Journal Entry Templates.
 * Uses existing fyo.db / fyo.doc layer only.
 */
import type { DocValueMap } from 'fyo/core/types';
import type { Doc } from 'fyo/model/doc';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';

export type JournalEntryTemplatePayload = {
  name: string;
  description?: string;
  isActive?: boolean;
  lines?: DocValueMap[];
};

export async function listActiveTemplates(): Promise<DocValueMap[]> {
  return await fyo.db.getAll(ModelNameEnum.JournalEntryTemplate, {
    filters: { isActive: true },
    orderBy: 'modified',
    order: 'desc',
  });
}

export async function getTemplate(id: string): Promise<Doc> {
  return fyo.doc.getDoc(ModelNameEnum.JournalEntryTemplate, id);
}

export async function createTemplate(
  payload: JournalEntryTemplatePayload
): Promise<Doc> {
  const doc = fyo.doc.getNewDoc(ModelNameEnum.JournalEntryTemplate, {
    name: payload.name,
    description: payload.description ?? null,
    isActive: payload.isActive ?? true,
  });
  if (Array.isArray(payload.lines) && payload.lines.length > 0) {
    for (const row of payload.lines) {
      doc.push('lines', row);
    }
  }
  await doc.sync();
  return doc;
}

export async function updateTemplate(
  id: string,
  changes: Partial<JournalEntryTemplatePayload>
): Promise<Doc> {
  const doc = await fyo.doc.getDoc(ModelNameEnum.JournalEntryTemplate, id);
  if (changes.name !== undefined) await doc.set('name', changes.name);
  if (changes.description !== undefined)
    await doc.set('description', changes.description);
  if (changes.isActive !== undefined) await doc.set('isActive', changes.isActive);
  if (Array.isArray(changes.lines)) {
    (doc as unknown as { lines?: Doc[] }).lines = [];
    doc._setDirty(true);
    for (const row of changes.lines) {
      doc.push('lines', row);
    }
  }
  await doc.sync();
  return doc;
}

export async function toggleTemplate(
  id: string,
  isActive: boolean
): Promise<Doc> {
  const doc = await fyo.doc.getDoc(ModelNameEnum.JournalEntryTemplate, id);
  await doc.set('isActive', isActive);
  await doc.sync();
  return doc;
}

export async function deleteTemplate(id: string): Promise<void> {
  const doc = await fyo.doc.getDoc(ModelNameEnum.JournalEntryTemplate, id);
  await doc.delete();
}

function moneyToNumber(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (v != null && typeof v === 'object' && 'float' in v)
    return (v as { float: number }).float;
  return 0;
}

/**
 * Apply a journal entry template to a Journal Entry doc (UI only; no posting logic).
 * Does not change date or narration.
 */
export async function applyTemplateToJournalEntry(
  journalEntryDoc: Doc,
  templateId: string,
  mode: 'replace' | 'append'
): Promise<void> {
  const templateDoc = await getTemplate(templateId);
  const lines = (templateDoc.lines ?? []) as Doc[];
  const newRows: DocValueMap[] = lines.map((row) => {
    const data = row as unknown as Record<string, unknown>;
    const account = typeof data.account === 'string' ? data.account : '';
    const party = typeof data.party === 'string' ? data.party : undefined;
    return {
      account,
      party,
      debit: fyo.pesa(moneyToNumber(data.defaultDebit)),
      credit: fyo.pesa(moneyToNumber(data.defaultCredit)),
      allowEditDebit: data.allowEditDebit !== false,
      allowEditCredit: data.allowEditCredit !== false,
      allowEditAccount: data.allowEditAccount === true,
    };
  });

  if (mode === 'replace') {
    (journalEntryDoc as { accounts?: Doc[] }).accounts = [];
    journalEntryDoc._setDirty(true);
    for (const row of newRows) {
      journalEntryDoc.push('accounts', row);
    }
  } else {
    for (const row of newRows) {
      journalEntryDoc.push('accounts', row);
    }
  }
}
