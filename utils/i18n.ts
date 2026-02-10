import { translations, type TranslationKey } from '../contexts/translations';

export const isTranslationKey = (value: string): value is TranslationKey =>
  Object.prototype.hasOwnProperty.call(translations.en, value);

export type { TranslationKey };
