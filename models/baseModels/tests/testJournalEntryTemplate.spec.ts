import test from 'tape';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import { ModelNameEnum } from 'models/types';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);

test('JournalEntryTemplate: create template with lines', async (t) => {
  const accounts = await fyo.db.getAll(ModelNameEnum.Account, {
    filters: { isGroup: false },
    limit: 2,
  });
  t.ok(accounts.length >= 2, 'at least two ledger accounts exist');
  const [acc1, acc2] = accounts.map((a) => a.name as string);

  const template = fyo.doc.getNewDoc(ModelNameEnum.JournalEntryTemplate, {
    name: 'Test JV Template',
    description: 'Test',
    isActive: true,
  });
  template.push('lines', {
    account: acc1,
    defaultDebit: 100,
    defaultCredit: 0,
  });
  template.push('lines', {
    account: acc2,
    defaultDebit: 0,
    defaultCredit: 100,
  });
  await template.sync();

  t.ok(
    await fyo.db.exists(ModelNameEnum.JournalEntryTemplate, template.name),
    'template exists'
  );
  const loaded = await fyo.doc.getDoc(
    ModelNameEnum.JournalEntryTemplate,
    template.name!
  );
  t.equal(
    (loaded.lines as unknown[]).length,
    2,
    'template has 2 lines'
  );
  t.equal((loaded.lines as { account: string }[])[0].account, acc1);
  t.equal((loaded.lines as { account: string }[])[1].account, acc2);
});

test('JournalEntryTemplate: listActiveTemplates returns only active', async (t) => {
  const activeList = await fyo.db.getAll(ModelNameEnum.JournalEntryTemplate, {
    filters: { isActive: true },
  });
  t.ok(activeList.length >= 1, 'at least one active template');
  const inactive = activeList.find((d) => !d.isActive);
  t.equal(inactive, undefined, 'no inactive in list');

  const templateDoc = await fyo.doc.getDoc(
    ModelNameEnum.JournalEntryTemplate,
    'Test JV Template'
  );
  await templateDoc.set('isActive', false);
  await templateDoc.sync();

  const afterDeactivate = await fyo.db.getAll(ModelNameEnum.JournalEntryTemplate, {
    filters: { isActive: true },
  });
  const found = afterDeactivate.find((d) => d.name === 'Test JV Template');
  t.equal(found, undefined, 'deactivated template not in active list');
});

test('JournalEntryTemplate: apply replace and append to Journal Entry', async (t) => {
  const templateDocToActivate = await fyo.doc.getDoc(
    ModelNameEnum.JournalEntryTemplate,
    'Test JV Template'
  );
  await templateDocToActivate.set('isActive', true);
  await templateDocToActivate.sync();

  const accounts = await fyo.db.getAll(ModelNameEnum.Account, {
    filters: { isGroup: false },
    limit: 2,
  });
  const [acc1, acc2] = accounts.map((a) => a.name as string);

  const templateDoc = await fyo.doc.getDoc(
    ModelNameEnum.JournalEntryTemplate,
    'Test JV Template'
  );
  const lines = (templateDoc.lines ?? []) as { account: string; defaultDebit?: unknown; defaultCredit?: unknown }[];

  function moneyToNumber(v: unknown): number {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (v != null && typeof v === 'object' && 'float' in v)
      return (v as { float: number }).float;
    return 0;
  }

  const je = fyo.doc.getNewDoc(ModelNameEnum.JournalEntry, { date: new Date() });
  const newRows = lines.map((row) => ({
    account: row.account,
    debit: fyo.pesa(moneyToNumber(row.defaultDebit)),
    credit: fyo.pesa(moneyToNumber(row.defaultCredit)),
  }));

  (je as { accounts?: unknown[] }).accounts = [];
  je._setDirty(true);
  for (const row of newRows) {
    je.push('accounts', row);
  }

  const jeAccounts =
    (je as unknown as { accounts?: { account?: string }[] }).accounts ?? [];
  t.equal(jeAccounts.length, 2, 'replace: 2 lines');
  t.equal(jeAccounts[0]?.account, acc1);
  t.equal(jeAccounts[1]?.account, acc2);

  for (const row of newRows) {
    je.push('accounts', row);
  }
  const accountsAfter =
    (je as unknown as { accounts?: { account?: string }[] }).accounts ?? [];
  t.equal(accountsAfter.length, 4, 'append: 4 lines');
});

closeTestFyo(fyo, __filename);
