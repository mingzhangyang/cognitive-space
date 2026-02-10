import { translationsEn } from './en';
import { translationsZh } from './zh';

export const translations = {
  en: translationsEn,
  zh: translationsZh
} as const;

export type TranslationKey = keyof typeof translationsEn;
