import React from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import HomeEmptyState from '../components/home/HomeEmptyState';
import HomeFab from '../components/home/HomeFab';
import HomeHeader from '../components/home/HomeHeader';
import HomeQuestionCard from '../components/home/HomeQuestionCard';
import HomeRecallPanel from '../components/home/HomeRecallPanel';
import { useHomeModel } from '../hooks/useHomeModel';

const Home: React.FC = () => {
  const {
    t,
    questions,
    hasNotes,
    darkMatterCount,
    deleteTarget,
    mobileQuestionActionsId,
    editingQuestionId,
    editContent,
    setEditContent,
    isSavingEdit,
    query,
    isRecallOpen,
    fabContainer,
    onboardingDismissed,
    filteredQuestions,
    hasQuestions,
    isFiltering,
    setQuery,
    setIsRecallOpen,
    setDeleteTarget,
    setMobileQuestionActionsId,
    getTensionColor,
    dismissOnboarding,
    openRecall,
    closeRecall,
    handleDelete,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleCopyQuestion,
    confirmDelete
  } = useHomeModel();

  const handleExitRecall = () => {
    setQuery('');
    setIsRecallOpen(false);
  };

  return (
    <div className="flex flex-col h-full relative">
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={t('confirm_delete_question_with_notes')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <HomeHeader
        t={t}
        hasQuestions={hasQuestions}
        questionCount={questions.length}
      />

      <div className="space-y-4 sm:space-y-5 pb-28 sm:pb-24">
        <HomeRecallPanel
          t={t}
          darkMatterCount={darkMatterCount}
          isRecallOpen={isRecallOpen}
          query={query}
          isFiltering={isFiltering}
          onOpenRecall={openRecall}
          onCloseRecall={closeRecall}
          onQueryChange={setQuery}
          onClearQuery={() => setQuery('')}
          onExitRecall={handleExitRecall}
        />

        {filteredQuestions.length === 0 ? (
          <HomeEmptyState
            t={t}
            hasQuestions={hasQuestions}
            isFiltering={isFiltering}
            hasNotes={hasNotes}
            onboardingDismissed={onboardingDismissed}
            onDismissOnboarding={dismissOnboarding}
          />
        ) : (
          filteredQuestions.map((question) => {
            const isMobileActionsOpen = mobileQuestionActionsId === question.id;
            const isEditing = editingQuestionId === question.id;

            return (
              <HomeQuestionCard
                key={question.id}
                question={question}
                isEditing={isEditing}
                editContent={editContent}
                isSavingEdit={isSavingEdit}
                isMobileActionsOpen={isMobileActionsOpen}
                tensionColor={getTensionColor(question.updatedAt)}
                onStartEdit={handleStartEdit}
                onCopy={handleCopyQuestion}
                onDelete={handleDelete}
                onOpenMobileActions={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMobileQuestionActionsId(question.id);
                }}
                onCloseMobileActions={() => setMobileQuestionActionsId(null)}
                onEditContentChange={setEditContent}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                t={t}
              />
            );
          })
        )}
      </div>

      <HomeFab t={t} fabContainer={fabContainer} />
    </div>
  );
};

export default Home;
