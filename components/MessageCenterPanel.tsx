import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssistantInbox, AssistantMessage, NoteSuggestionPayload } from '../contexts/AssistantInboxContext';
import { useAppContext } from '../contexts/AppContext';
import { LoadingSpinner, XIcon } from './Icons';
import IconButton from './IconButton';
import { getNoteById, updateNoteMeta } from '../services/storageService';
import { truncate, formatTemplate, containsCjk } from '../utils/text';
import { getTypeLabel } from '../utils/notes';

const isNoteSuggestion = (message: AssistantMessage): message is Extract<AssistantMessage, { kind: 'note_suggestion' }> =>
  message.kind === 'note_suggestion';

const isDarkMatterReady = (message: AssistantMessage): message is Extract<AssistantMessage, { kind: 'dark_matter_ready' }> =>
  message.kind === 'dark_matter_ready';

const buildNoteSuggestionDetails = (payload: NoteSuggestionPayload, t: (key: string) => string) => {
  const details: Array<{ label: string; value: string }> = [];
  details.push({ label: t('assistant_suggestion_type'), value: getTypeLabel(payload.classification, t) });
  if (payload.relatedQuestionTitle) {
    details.push({ label: t('assistant_suggestion_related'), value: truncate(payload.relatedQuestionTitle, 42) });
  }
  if (typeof payload.confidence === 'number') {
    details.push({
      label: t('assistant_suggestion_confidence'),
      value: `${Math.round(payload.confidence * 100)}%`
    });
  }
  return details;
};

const getSuggestionReasoning = (
  payload: NoteSuggestionPayload,
  t: (key: string) => string,
  language: 'en' | 'zh'
) => {
  const raw = typeof payload.reasoning === 'string' ? payload.reasoning.trim() : '';
  if (!raw || (language === 'zh' && !containsCjk(raw))) {
    if (language !== 'zh') return raw;
    return formatTemplate(t('assistant_suggestion_reasoning_fallback'), {
      type: getTypeLabel(payload.classification, t)
    });
  }
  return raw;
};

const MessageCenterPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { t, language } = useAppContext();
  const translate = t as (key: string) => string;
  const { jobs, messages, dismissMessage } = useAssistantInbox();
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const runningJobs = jobs.filter((job) => job.status === 'running');
  const clearAnalysisPending = async (noteId: string) => {
    try {
      const note = await getNoteById(noteId);
      if (note?.analysisPending) {
        await updateNoteMeta(noteId, { analysisPending: false });
      }
    } catch (error) {
      console.error('Failed to clear analysis pending state', error);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-sm sm:max-w-md bg-surface dark:bg-surface-dark border-l border-line dark:border-line-dark shadow-[var(--shadow-elev-2)] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-line-soft dark:border-line-dark flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-ink dark:text-ink-dark">{translate('assistant_inbox_title')}</h2>
          </div>
          <IconButton
            label={t('menu_close')}
            onClick={onClose}
            className="text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
          >
            <XIcon className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {runningJobs.length > 0 && (
            <section className="space-y-3">
              <p className="text-caption-upper">{translate('assistant_inbox_running')}</p>
              {runningJobs.map((job) => {
                const jobLabel = job.kind === 'note_analysis'
                  ? translate('assistant_job_note')
                  : formatTemplate(translate('assistant_job_dark_matter'), { count: job.meta?.noteCount ?? 0 });
                return (
                  <div key={job.id} className="surface-card p-3 flex items-start gap-3">
                    <LoadingSpinner className="w-4 h-4 text-accent dark:text-accent-dark mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-body-sm text-ink dark:text-ink-dark">{jobLabel}</p>
                      {job.meta?.notePreview && (
                        <p className="text-body-sm-muted">{truncate(job.meta.notePreview, 60)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {messages.length > 0 && (
            <section className="space-y-3">
              <p className="text-caption-upper">{translate('assistant_inbox_suggestions')}</p>
              {messages.map((message) => {
                if (isNoteSuggestion(message)) {
                  const details = buildNoteSuggestionDetails(message.payload, translate);
                  const reasoning = getSuggestionReasoning(message.payload, translate, language);
                  return (
                    <div key={message.id} className="surface-card p-4 space-y-3">
                      <div>
                        <p className="text-body-sm-muted">{translate('assistant_suggestion_note')}</p>
                        <p className="text-ink dark:text-ink-dark text-base font-medium">
                          {truncate(message.payload.notePreview, 80)}
                        </p>
                      </div>
                      <div className="space-y-1 text-body-sm-muted">
                        {details.map((detail) => (
                          <p key={detail.label}>
                            <span className="text-subtle dark:text-subtle-dark">{detail.label}:</span>{' '}
                            <span className="text-ink dark:text-ink-dark">{detail.value}</span>
                          </p>
                        ))}
                      </div>
                      {reasoning && (
                        <p className="text-body-sm-muted">{reasoning}</p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateNoteMeta(message.payload.noteId, {
                                ...message.payload.updates,
                                analysisPending: false
                              });
                              dismissMessage(message.id);
                            } catch (error) {
                              console.error('Failed to apply suggestion', error);
                            }
                          }}
                          className="px-3 py-1.5 rounded-full bg-ink text-white dark:bg-muted-600 hover:opacity-90 transition-opacity text-xs"
                        >
                          {translate('assistant_suggestion_apply')}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await clearAnalysisPending(message.payload.noteId);
                            dismissMessage(message.id);
                          }}
                          className="px-3 py-1.5 rounded-full border border-line-muted dark:border-muted-600 hover:border-muted-400 dark:hover:border-muted-500 transition-colors text-xs text-subtle dark:text-subtle-dark"
                        >
                          {translate('assistant_suggestion_dismiss')}
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isDarkMatterReady(message)) {
                  const count = message.payload.suggestionCount;
                  return (
                    <div key={message.id} className="surface-card p-4 space-y-3">
                      <div>
                        <p className="text-body-sm-muted">{translate('assistant_suggestion_dark_matter')}</p>
                        <p className="text-ink dark:text-ink-dark text-base font-medium">
                          {formatTemplate(translate('assistant_dark_matter_ready_title'), { count })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/dark-matter');
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-full bg-ink text-white dark:bg-muted-600 hover:opacity-90 transition-opacity text-xs"
                        >
                          {translate('assistant_suggestion_open_dark_matter')}
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissMessage(message.id)}
                          className="px-3 py-1.5 rounded-full border border-line-muted dark:border-muted-600 hover:border-muted-400 dark:hover:border-muted-500 transition-colors text-xs text-subtle dark:text-subtle-dark"
                        >
                          {translate('assistant_suggestion_dismiss')}
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </section>
          )}

          {runningJobs.length === 0 && messages.length === 0 && (
            <p className="text-body-sm-muted">{translate('assistant_inbox_empty')}</p>
          )}
        </div>
      </aside>
    </div>
  );
};

export default MessageCenterPanel;
