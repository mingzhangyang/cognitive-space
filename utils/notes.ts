import { NoteType } from '../types';
import type { TranslationKey } from './i18n';

export const getTypeLabel = (type: NoteType, t: (key: TranslationKey) => string) => {
  switch (type) {
    case NoteType.QUESTION:
      return t('type_question');
    case NoteType.CLAIM:
      return t('type_claim');
    case NoteType.EVIDENCE:
      return t('type_evidence');
    case NoteType.TRIGGER:
      return t('type_trigger');
    case NoteType.UNCATEGORIZED:
    default:
      return t('type_uncategorized');
  }
};
