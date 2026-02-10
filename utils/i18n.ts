import { translations } from '../contexts/AppContext';

export type TranslationKey = keyof typeof translations.en;

export const isTranslationKey = (value: string): value is TranslationKey =>
  Object.prototype.hasOwnProperty.call(translations.en, value);
