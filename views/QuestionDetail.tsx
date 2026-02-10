import React from 'react';
import { Link } from 'react-router-dom';
import QuestionDetailDialogs from '../components/questionDetail/QuestionDetailDialogs';
import QuestionDetailHeader from '../components/questionDetail/QuestionDetailHeader';
import QuestionDetailSections from '../components/questionDetail/QuestionDetailSections';
import QuestionDetailVisualization from '../components/questionDetail/QuestionDetailVisualization';
import { useQuestionDetailModel } from '../hooks/useQuestionDetailModel';

const QuestionDetail: React.FC = () => {
  const {
    t,
    question,
    relatedNotes,
    visualizationOpen,
    selectedGraphNote,
    stats,
    relationDensity,
    editingId,
    editContent,
    isSavingEdit,
    isDowngrading,
    isDowngradeOpen,
    downgradeType,
    downgradeDestination,
    availableQuestions,
    relinkQuestionId,
    deleteTarget,
    mobileNoteActionsId,
    pendingNoteId,
    collapsedSections,
    moveNoteId,
    moveTargetQuestionId,
    isMoving,
    downgradeOptions,
    claims,
    evidence,
    triggers,
    otherNotes,
    setVisualizationOpen,
    setSelectedGraphNote,
    setEditContent,
    setIsDowngradeOpen,
    setDowngradeType,
    setDowngradeDestination,
    setRelinkQuestionId,
    setDeleteTarget,
    setMobileNoteActionsId,
    setMoveNoteId,
    setMoveTargetQuestionId,
    toggleSection,
    handleEdit,
    handleCopyNote,
    handleSaveEdit,
    handleCancelEdit,
    handleDelete,
    openMoveToQuestion,
    handleConfirmMove,
    getOrderedNotes,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    openDowngrade,
    handleConfirmDowngrade,
    confirmDelete
  } = useQuestionDetailModel();

  if (!question) {
    return <div className="p-8 text-center text-subtle dark:text-subtle-dark">{t('problem_not_found')}</div>;
  }

  const noteProps = {
    availableQuestions,
    editingId,
    editContent,
    isSavingEdit,
    pendingNoteId,
    mobileNoteActionsId,
    setMobileNoteActionsId,
    setEditContent,
    handleEdit,
    handleCopyNote,
    handleSaveEdit,
    handleCancelEdit,
    handleDelete,
    openMoveToQuestion,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    t
  };

  return (
    <div>
      <QuestionDetailDialogs
        t={t}
        deleteTarget={deleteTarget}
        onConfirmDelete={confirmDelete}
        onCancelDelete={() => setDeleteTarget(null)}
        isDowngradeOpen={isDowngradeOpen}
        relatedCount={relatedNotes.length}
        selectedType={downgradeType}
        typeOptions={downgradeOptions}
        destination={downgradeDestination}
        relinkTargets={availableQuestions.map((note) => ({ id: note.id, title: note.content }))}
        relinkQuestionId={relinkQuestionId}
        isDowngrading={isDowngrading}
        onSelectType={setDowngradeType}
        onDestinationChange={(next) => {
          setDowngradeDestination(next);
          if (next === 'relink' && !relinkQuestionId && availableQuestions.length > 0) {
            setRelinkQuestionId(availableQuestions[0].id);
          }
        }}
        onSelectRelinkQuestion={setRelinkQuestionId}
        onConfirmDowngrade={handleConfirmDowngrade}
        onCancelDowngrade={() => !isDowngrading && setIsDowngradeOpen(false)}
        isMoveOpen={moveNoteId !== null}
        isMoving={isMoving}
        questions={availableQuestions.map((q) => ({ id: q.id, title: q.content }))}
        selectedQuestionId={moveTargetQuestionId}
        onSelectQuestion={setMoveTargetQuestionId}
        onConfirmMove={handleConfirmMove}
        onCancelMove={() => setMoveNoteId(null)}
      />

      <QuestionDetailHeader
        t={t}
        question={question}
        visualizationOpen={visualizationOpen}
        onToggleVisualization={() => setVisualizationOpen((prev) => !prev)}
        onOpenDowngrade={openDowngrade}
        isSavingEdit={isSavingEdit}
        editingId={editingId}
        isDowngrading={isDowngrading}
        editContent={editContent}
        onEditContentChange={setEditContent}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onEditQuestion={() => handleEdit(question)}
        onCopyQuestion={() => handleCopyNote(question.content)}
        onDeleteQuestion={() => handleDelete(question.id, true)}
      />

      {visualizationOpen && (
        <QuestionDetailVisualization
          question={question}
          notes={relatedNotes}
          selectedNote={selectedGraphNote}
          stats={stats}
          relationDensity={relationDensity}
          isSavingEdit={isSavingEdit}
          onSelectNote={setSelectedGraphNote}
          onEditNote={handleEdit}
          t={t}
        />
      )}

      <div className="space-y-10">
        <QuestionDetailSections
          t={t}
          relatedCount={relatedNotes.length}
          claims={claims}
          evidence={evidence}
          triggers={triggers}
          otherNotes={otherNotes}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          getOrderedNotes={getOrderedNotes}
          noteProps={noteProps}
        />
      </div>

      <div className="mt-16 sm:mt-20 flex justify-center">
        <Link to={`/write?questionId=${question.id}`} className="btn-pill btn-outline">
          {t('add_thought_stream')}
        </Link>
      </div>
    </div>
  );
};

export default QuestionDetail;
