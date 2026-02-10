export {
  subscribeToNoteEvents,
  type NoteStoreEventDetail,
  type NoteStoreEventKind
} from './storage/noteEvents';

export {
  createNoteObject,
  deleteNote,
  demoteQuestion,
  getDarkMatter,
  getDarkMatterCount,
  getDarkMatterPage,
  getNoteById,
  getNotes,
  getQuestions,
  getQuestionConstellationStats,
  getRelatedNotes,
  saveNote,
  updateNoteContent,
  updateNoteMeta,
  type DarkMatterPage,
  type QuestionConstellationStats
} from './storage/notes';

export {
  exportAppData,
  importAppData,
  parseAppDataExport,
  clearAllData,
  type AppDataExport,
  type ImportMode
} from './storage/importExport';

export {
  recordDarkMatterAnalysisRequested,
  recordDarkMatterSuggestionApplied,
  recordDarkMatterSuggestionDismissed
} from './storage/telemetry';
