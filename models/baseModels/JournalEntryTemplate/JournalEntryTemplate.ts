import { Fyo, t } from 'fyo';
import { Doc } from 'fyo/model/doc';
import { ListViewSettings, ValidationMap } from 'fyo/model/types';
import { Money } from 'pesa';

export class JournalEntryTemplate extends Doc {
  lines?: Doc[];

  validations: ValidationMap = {
    lines: () => {
      const lines = this.lines ?? [];
      for (let i = 0; i < lines.length; i++) {
        const row = lines[i];
        const account = row?.account;
        if (!account) {
          throw new Error(this.fyo.t`Line ${i + 1}: Account is required.`);
        }
        const debit = (row?.defaultDebit as Money | undefined) ?? this.fyo.pesa(0);
        const credit =
          (row?.defaultCredit as Money | undefined) ?? this.fyo.pesa(0);
        if (!debit.isZero() && !credit.isZero()) {
          throw new Error(
            this.fyo.t`Line ${i + 1}: Debit and Credit cannot both be greater than zero.`
          );
        }
      }
    },
  };

  static getListViewSettings(fyo: Fyo): ListViewSettings {
    return {
      columns: [
        'name',
        {
          label: fyo.t`Active`,
          fieldname: 'isActive',
          fieldtype: 'Check',
        },
        {
          label: fyo.t`Lines`,
          fieldname: 'lines',
          fieldtype: 'Int',
          display(value: unknown): string {
            return String(Array.isArray(value) ? value.length : 0);
          },
        },
        'modified',
      ],
    };
  }
}
