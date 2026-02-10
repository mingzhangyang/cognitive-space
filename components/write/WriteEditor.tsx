import React from 'react';

interface WriteEditorProps {
  t: (key: string) => string;
  content: string;
  previewHtml: string;
  showPreview: boolean;
  isProcessing: boolean;
  onContentChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const WriteEditor: React.FC<WriteEditorProps> = ({
  t,
  content,
  previewHtml,
  showPreview,
  isProcessing,
  onContentChange,
  textareaRef
}) => {
  return (
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
            onContentChange(e.target.value);
          }}
          autoFocus
          disabled={isProcessing}
        />
      )}
    </div>
  );
};

export default WriteEditor;
