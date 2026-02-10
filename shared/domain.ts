export enum NoteType {
  QUESTION = 'question',
  CLAIM = 'claim',
  EVIDENCE = 'evidence',
  TRIGGER = 'trigger',
  UNCATEGORIZED = 'uncategorized'
}

export type ConfidenceLabel = 'likely' | 'possible' | 'loose';

export type WanderingPlanetSuggestionKind = 'new_question' | 'existing_question';
