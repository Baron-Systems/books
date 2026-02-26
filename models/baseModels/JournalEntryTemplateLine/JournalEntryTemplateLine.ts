import { Doc } from 'fyo/model/doc';
import { FiltersMap } from 'fyo/model/types';

export class JournalEntryTemplateLine extends Doc {
  static filters: FiltersMap = {
    account: () => ({ isGroup: false }),
  };
}
