import React from 'react';
import WriteEditor from '../components/write/WriteEditor';
import WriteFooter from '../components/write/WriteFooter';
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

  const canSave = Boolean(content.trim()) && !isProcessing;

  return (
    <div className="flex-1 flex flex-col">
      <WriteEditor
        t={t}
        content={content}
        previewHtml={previewHtml}
        showPreview={showPreview}
        isProcessing={isProcessing}
        onContentChange={setContent}
        textareaRef={textareaRef}
      />
      <WriteFooter
        t={t}
        charCount={charCount}
        wordCount={wordCount}
        showCounter={showCounter}
        isProcessing={isProcessing}
        showPreviewToggle={showPreviewToggle}
        showPreview={showPreview}
        onTogglePreview={handleTogglePreview}
        castSuccess={castSuccess}
        canSave={canSave}
        onSave={handleSave}
      />
    </div>
  );
};

export default Write;
