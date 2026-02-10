import React from 'react';
import { LoadingSpinner, EyeIcon, EyeOffIcon } from '../components/Icons';
import IconButton from '../components/IconButton';
import { useWriteModel } from '../hooks/useWriteModel';

const Write: React.FC = () => {
  const {
    t,
    content,
    setContent,
    isProcessing,
    showPreview,
    castSuccess,
    previewHtml,
    charCount,
    wordCount,
    showCounter,
    showPreviewToggle,
    handleTogglePreview,
    handleSave,
    textareaRef
  } = useWriteModel();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col pt-2">
        {showPreview ? (
          <div
            className="w-full text-lg sm:text-xl leading-relaxed text-ink dark:text-ink-dark font-serif prose-preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-lg sm:text-xl leading-relaxed text-ink dark:text-ink-dark resize-none focus:outline-none placeholder:text-muted-500 dark:placeholder:text-muted-500 font-serif"
            placeholder={t('write_placeholder')}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
            autoFocus
            disabled={isProcessing}
          />
        )}
      </div>

      {/* Word/char counter + preview toggle */}
      <div className="flex items-center justify-between mt-2 min-h-6">
        <span
          className={`text-micro tabular-nums muted-label transition-opacity duration-300 ${
            showCounter && !isProcessing ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={!showCounter}
        >
          {t('write_char_count').replace('{count}', String(charCount))}
          {' / '}
          {t('write_word_count').replace('{count}', String(wordCount))}
        </span>

        {showPreviewToggle && !isProcessing && (
          <IconButton
            label={showPreview ? t('write_edit') : t('write_preview')}
            onClick={handleTogglePreview}
            sizeClassName="h-7 w-7"
            className="text-muted-400 dark:text-muted-500 hover:text-accent dark:hover:text-accent-dark active:scale-95"
          >
            {showPreview ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </IconButton>
        )}
      </div>

      <div className="min-h-[4.5rem] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-line-soft dark:border-line-dark mt-2 pt-4">
        <div className="text-body-sm-muted flex items-center gap-2 w-full sm:w-auto">
           {isProcessing && (
             <>
               <LoadingSpinner className="w-4 h-4 text-accent dark:text-accent-dark" />
               <span className="animate-pulse">{t('absorbing')}</span>
             </>
           )}
           {castSuccess && !isProcessing && (
             <span className="text-accent dark:text-accent-dark font-medium animate-cast-success">
               {t('cast_success')}
             </span>
           )}
        </div>

        <button
          onClick={handleSave}
          disabled={!content.trim() || isProcessing}
          className={`w-full sm:w-auto px-6 py-3 min-h-11 rounded-full font-medium transition-all ${
            content.trim() && !isProcessing
              ? 'bg-action dark:bg-action text-white hover:bg-action-hover dark:hover:bg-action-hover-dark shadow-[var(--shadow-elev-2)] dark:shadow-[var(--shadow-elev-2-dark)]'
              : 'bg-line dark:bg-surface-hover-dark text-muted-400 dark:text-muted-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? t('saving') : t('cast')}
        </button>
      </div>
    </div>
  );
};

export default Write;
