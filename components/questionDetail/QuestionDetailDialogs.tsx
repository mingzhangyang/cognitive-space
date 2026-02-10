import React from 'react';
import ConfirmDialog from '../ConfirmDialog';
import MoveToQuestionModal from '../MoveToQuestionModal';
import QuestionDowngradeDialog from '../QuestionDowngradeDialog';

interface RelinkTarget {
  id: string;
  title: string;
}

interface QuestionDetailDialogsProps {
  t: (key: string) => string;
  deleteTarget: string | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  isDowngradeOpen: boolean;
  relatedCount: number;
  selectedType: string;
  typeOptions: Array<{ id: string; label: string }>;
  destination: string;
  relinkTargets: RelinkTarget[];
  relinkQuestionId: string | null;
  isDowngrading: boolean;
  onSelectType: (type: string) => void;
  onDestinationChange: (destination: string) => void;
  onSelectRelinkQuestion: (id: string) => void;
  onConfirmDowngrade: () => void;
  onCancelDowngrade: () => void;
  isMoveOpen: boolean;
  isMoving: boolean;
  questions: RelinkTarget[];
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string) => void;
  onConfirmMove: () => void;
  onCancelMove: () => void;
  isCopyOpen: boolean;
  isCopying: boolean;
  copyQuestions: RelinkTarget[];
  selectedCopyQuestionId: string | null;
  onSelectCopyQuestion: (id: string) => void;
  onConfirmCopy: () => void;
  onCancelCopy: () => void;
}

const QuestionDetailDialogs: React.FC<QuestionDetailDialogsProps> = ({
  t,
  deleteTarget,
  onConfirmDelete,
  onCancelDelete,
  isDowngradeOpen,
  relatedCount,
  selectedType,
  typeOptions,
  destination,
  relinkTargets,
  relinkQuestionId,
  isDowngrading,
  onSelectType,
  onDestinationChange,
  onSelectRelinkQuestion,
  onConfirmDowngrade,
  onCancelDowngrade,
  isMoveOpen,
  isMoving,
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onConfirmMove,
  onCancelMove,
  isCopyOpen,
  isCopying,
  copyQuestions,
  selectedCopyQuestionId,
  onSelectCopyQuestion,
  onConfirmCopy,
  onCancelCopy
}) => {
  return (
    <>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={t('confirm_delete_question_with_notes')}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
      <QuestionDowngradeDialog
        isOpen={isDowngradeOpen}
        relatedCount={relatedCount}
        selectedType={selectedType}
        typeOptions={typeOptions}
        destination={destination}
        relinkTargets={relinkTargets}
        relinkQuestionId={relinkQuestionId}
        isWorking={isDowngrading}
        onSelectType={onSelectType}
        onDestinationChange={onDestinationChange}
        onSelectRelinkQuestion={onSelectRelinkQuestion}
        onConfirm={onConfirmDowngrade}
        onCancel={onCancelDowngrade}
        t={t}
      />
      <MoveToQuestionModal
        isOpen={isMoveOpen}
        isWorking={isMoving}
        questions={questions}
        selectedQuestionId={selectedQuestionId}
        onSelectQuestion={onSelectQuestion}
        onConfirm={onConfirmMove}
        onCancel={onCancelMove}
        t={t}
      />
      <MoveToQuestionModal
        isOpen={isCopyOpen}
        isWorking={isCopying}
        questions={copyQuestions}
        selectedQuestionId={selectedCopyQuestionId}
        onSelectQuestion={onSelectCopyQuestion}
        onConfirm={onConfirmCopy}
        onCancel={onCancelCopy}
        titleKey="copy_to_question_title"
        confirmKey="copy_to_question_confirm"
        t={t}
      />
    </>
  );
};

export default QuestionDetailDialogs;
