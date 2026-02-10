import React from 'react';
import { Link } from 'react-router-dom';
import { Note, NoteType } from '../types';
import { CheckIcon, XIcon, EyeIcon, EyeOffIcon, LoadingSpinner, MoreIcon, ArrowDownIcon, EditIcon, ChevronDownIcon, GripVerticalIcon, MoveIcon } from '../components/Icons';
import ActionIconButton from '../components/ActionIconButton';
import ActionSheetButton from '../components/ActionSheetButton';
import ConfirmDialog from '../components/ConfirmDialog';
import IconButton from '../components/IconButton';
import MobileActionSheet from '../components/MobileActionSheet';
import TypeBadge from '../components/TypeBadge';
import QuestionGraph from '../components/QuestionGraph';
import QuestionStatsPanel from '../components/QuestionStatsPanel';
import Tooltip from '../components/Tooltip';
import QuestionDowngradeDialog from '../components/QuestionDowngradeDialog';
import MoveToQuestionModal from '../components/MoveToQuestionModal';
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

  const renderNote = (note: Note, sectionKey: string) => {
    const isMobileActionsOpen = mobileNoteActionsId === note.id;
    const isAnalyzing = pendingNoteId === note.id && note.type === NoteType.UNCATEGORIZED;
    const actionButtons = (
      <>
        <ActionIconButton
          action="edit"
          onClick={() => handleEdit(note)}
          disabled={isSavingEdit}
        />
        <ActionIconButton
          action="copy"
          onClick={() => handleCopyNote(note.content)}
        />
        {availableQuestions.length > 0 && (
          <IconButton
            label={t('move_to_question')}
            sizeClassName="h-10 w-10"
            onClick={() => openMoveToQuestion(note.id)}
            className="text-subtle dark:text-subtle-dark hover:text-accent dark:hover:text-accent-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
          >
            <MoveIcon className="w-4 h-4" />
          </IconButton>
        )}
        <ActionIconButton
          action="delete"
          onClick={() => handleDelete(note.id, false)}
        />
      </>
    );

    return (
      <div
        key={note.id}
        id={`note-${note.id}`}
        draggable
        onDragStart={() => handleDragStart(note.id, sectionKey)}
        onDragEnter={() => handleDragEnter(note.id, sectionKey)}
        onDragEnd={() => handleDragEnd(sectionKey, getOrderedNotes(sectionKey, relatedNotes.filter((n) => {
          if (sectionKey === 'claims') return n.type === NoteType.CLAIM;
          if (sectionKey === 'evidence') return n.type === NoteType.EVIDENCE;
          if (sectionKey === 'triggers') return n.type === NoteType.TRIGGER;
          return ![NoteType.CLAIM, NoteType.EVIDENCE, NoteType.TRIGGER].includes(n.type);
        })))}
        onDragOver={(e) => e.preventDefault()}
        className="group relative pl-4 sm:pl-6 border-l-2 border-line-soft dark:border-line-dark hover:border-line-muted dark:hover:border-muted-600 transition-colors"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center">
            <span
              className="hidden sm:flex items-center cursor-grab active:cursor-grabbing text-muted-300 dark:text-muted-500 opacity-0 group-hover:opacity-100 transition-opacity mr-1 -ml-5"
              aria-hidden="true"
            >
              <GripVerticalIcon className="w-3.5 h-3.5" />
            </span>
            <TypeBadge type={note.type} subType={note.subType} />
            <span className="text-micro text-muted-300 dark:text-muted-400 ml-2">
              {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isAnalyzing && (
              <span className="ml-2 inline-flex items-center gap-1 text-micro text-muted-400 dark:text-muted-500">
                <LoadingSpinner className="w-3 h-3 text-muted-400 dark:text-muted-500" />
                {t('analyzing')}
              </span>
            )}
          </div>
          <div className="relative flex items-center gap-1">
            {editingId !== note.id && (
              <>
                <IconButton
                  label={t('actions_show')}
                  showTooltip={false}
                  sizeClassName="h-10 w-10"
                  onClick={() => setMobileNoteActionsId(note.id)}
                  className="sm:hidden text-subtle dark:text-subtle-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark"
                >
                  <MoreIcon className="w-4 h-4" />
                </IconButton>
                <div className="hidden sm:flex gap-1 opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {actionButtons}
                </div>
                <MobileActionSheet
                  isOpen={isMobileActionsOpen}
                  onClose={() => setMobileNoteActionsId(null)}
                >
                  <ActionSheetButton
                    action="edit"
                    onClick={() => {
                      setMobileNoteActionsId(null);
                      handleEdit(note);
                    }}
                    disabled={isSavingEdit}
                  />
                  <ActionSheetButton
                    action="copy"
                    onClick={() => {
                      setMobileNoteActionsId(null);
                      handleCopyNote(note.content);
                    }}
                  />
                  {availableQuestions.length > 0 && (
                    <ActionSheetButton
                      action="move"
                      onClick={() => {
                        setMobileNoteActionsId(null);
                        openMoveToQuestion(note.id);
                      }}
                    />
                  )}
                  <ActionSheetButton
                    action="delete"
                    onClick={() => {
                      setMobileNoteActionsId(null);
                      handleDelete(note.id, false);
                    }}
                  />
                </MobileActionSheet>
              </>
            )}
          </div>
        </div>

      {editingId === note.id ? (
        <div className="space-y-2">
          <textarea
            className="textarea-base"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelEdit();
              }
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleSaveEdit();
              }
            }}
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editContent.trim()}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm bg-accent dark:bg-accent-dark text-white rounded-md hover:opacity-90 transition-opacity ${
                isSavingEdit || !editContent.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSavingEdit ? <LoadingSpinner className="w-3.5 h-3.5 text-white" /> : <CheckIcon className="w-3.5 h-3.5" />}
              {isSavingEdit ? t('saving') : t('save')}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSavingEdit}
              className={`flex items-center gap-1 px-3 py-1.5 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${
                isSavingEdit ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <XIcon className="w-3.5 h-3.5" />
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-ink dark:text-ink-dark leading-relaxed whitespace-pre-wrap">
          {note.content}
        </p>
      )}
    </div>
    );
  };

  const renderSection = (sectionKey: string, title: string, emptyText: string, notes: Note[]) => {
    const isCollapsed = collapsedSections[sectionKey] ?? false;
    const orderedNotes = getOrderedNotes(sectionKey, notes);
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center gap-2 cursor-pointer group/header w-full text-left"
          aria-expanded={!isCollapsed}
        >
          <ChevronDownIcon
            className={`w-4 h-4 text-muted-400 dark:text-muted-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
          />
          <h2 className="section-title">
            {title}
          </h2>
          <span className="text-micro tabular-nums text-muted-400 dark:text-muted-500">
            ({notes.length})
          </span>
        </button>
        {!isCollapsed && (
          notes.length === 0 ? (
            <p className="text-body-sm-muted">{emptyText}</p>
          ) : (
            <div className="space-y-8">
              {orderedNotes.map((note) => renderNote(note, sectionKey))}
            </div>
          )
        )}
      </section>
    );
  };

  return (
    <div>
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={t('confirm_delete_question_with_notes')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <QuestionDowngradeDialog
        isOpen={isDowngradeOpen}
        relatedCount={relatedNotes.length}
        selectedType={downgradeType}
        typeOptions={downgradeOptions}
        destination={downgradeDestination}
        relinkTargets={availableQuestions.map((note) => ({ id: note.id, title: note.content }))}
        relinkQuestionId={relinkQuestionId}
        isWorking={isDowngrading}
        onSelectType={setDowngradeType}
        onDestinationChange={(next) => {
          setDowngradeDestination(next);
          if (next === 'relink' && !relinkQuestionId && availableQuestions.length > 0) {
            setRelinkQuestionId(availableQuestions[0].id);
          }
        }}
        onSelectRelinkQuestion={setRelinkQuestionId}
        onConfirm={handleConfirmDowngrade}
        onCancel={() => !isDowngrading && setIsDowngradeOpen(false)}
        t={t}
      />
      <MoveToQuestionModal
        isOpen={moveNoteId !== null}
        isWorking={isMoving}
        questions={availableQuestions.map((q) => ({ id: q.id, title: q.content }))}
        selectedQuestionId={moveTargetQuestionId}
        onSelectQuestion={setMoveTargetQuestionId}
        onConfirm={handleConfirmMove}
        onCancel={() => setMoveNoteId(null)}
        t={t}
      />

      <div className="mb-10 sm:mb-12 section-divider pb-8">
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-accent dark:text-accent-dark tracking-widest uppercase mb-3 block">{t('current_problem')}</span>
          <div className="flex items-center gap-2">
            <Tooltip content={visualizationOpen ? t('hide_visualization') : t('visualize')}>
            <button
              onClick={() => setVisualizationOpen((prev) => !prev)}
              className="h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon cursor-pointer"
              aria-label={visualizationOpen ? t('hide_visualization') : t('visualize')}
            >
              <span className="sm:hidden">
                {visualizationOpen ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </span>
              <span className="hidden sm:inline">
                {visualizationOpen ? t('hide_visualization') : t('visualize')}
              </span>
            </button>
            </Tooltip>
            <Tooltip content={t('downgrade_question_action')}>
            <button
              onClick={openDowngrade}
              disabled={isSavingEdit || editingId === question.id || isDowngrading}
              className={`h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 muted-label border-0 sm:border sm:border-line dark:sm:border-line-dark hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark sm:hover:border-line-muted dark:sm:hover:border-muted-600 btn-icon ${
                isSavingEdit || editingId === question.id || isDowngrading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
              aria-label={t('downgrade_question_action')}
            >
              <span className="sm:hidden">
                <ArrowDownIcon className="w-4 h-4" />
              </span>
              <span className="hidden sm:inline">
                {t('downgrade_question_action')}
              </span>
            </button>
            </Tooltip>
            {editingId !== question.id && (
              <>
                <ActionIconButton
                  action="edit"
                  onClick={() => handleEdit(question)}
                  disabled={isSavingEdit}
                />
                <ActionIconButton
                  action="copy"
                  onClick={() => handleCopyNote(question.content)}
                />
              </>
            )}
            <ActionIconButton
              action="delete"
              onClick={() => handleDelete(question.id, true)}
            />
          </div>
        </div>
        {editingId === question.id ? (
          <div className="space-y-2">
          <textarea
            className="textarea-base"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelEdit();
              }
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleSaveEdit();
              }
            }}
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editContent.trim()}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm bg-accent dark:bg-accent-dark text-white rounded-md hover:opacity-90 transition-opacity ${
                isSavingEdit || !editContent.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSavingEdit ? <LoadingSpinner className="w-3.5 h-3.5 text-white" /> : <CheckIcon className="w-3.5 h-3.5" />}
              {isSavingEdit ? t('saving') : t('save')}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSavingEdit}
              className={`flex items-center gap-1 px-3 py-1.5 text-body-sm-muted hover:text-ink dark:hover:text-ink-dark transition-colors ${
                isSavingEdit ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <XIcon className="w-3.5 h-3.5" />
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
          <h1 className="page-title-lg">
            {question.content}
          </h1>
        )}
        <div className="mt-4 text-caption">
          {t('initiated_on')} {new Date(question.createdAt).toLocaleDateString()}
        </div>
      </div>

      {visualizationOpen && (
        <section className="mb-12 sm:mb-14 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title">
              {t('question_constellation')}
            </h2>
            <span className="section-meta">
              {t('read_only')}
            </span>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <QuestionGraph
                question={question}
                notes={relatedNotes}
                selectedNoteId={selectedGraphNote?.id ?? null}
                onSelectNote={(note) => setSelectedGraphNote(note)}
              />
              {selectedGraphNote && (
                <div className="surface-panel p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <TypeBadge type={selectedGraphNote.type} subType={selectedGraphNote.subType} />
                      <IconButton
                        label={t('close_detail')}
                        sizeClassName="h-8 w-8"
                        onClick={() => setSelectedGraphNote(null)}
                        className="text-muted-400 hover:text-ink dark:text-muted-400 dark:hover:text-ink-dark"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                    <p className="text-body-sm leading-relaxed whitespace-pre-wrap">
                      {selectedGraphNote.content}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          handleEdit(selectedGraphNote);
                          document.getElementById(`note-${selectedGraphNote.id}`)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          });
                        }}
                        disabled={isSavingEdit}
                        className={`inline-flex items-center gap-2 px-3 py-2 text-xs bg-accent dark:bg-accent-dark text-white rounded-full hover:opacity-90 transition-opacity ${
                          isSavingEdit ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => {
                          document.getElementById(`note-${selectedGraphNote.id}`)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          });
                        }}
                        className="chip-outline hover:border-line-muted dark:hover:border-muted-600"
                      >
                        {t('jump_to_note')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <QuestionStatsPanel stats={stats} relationDensity={relationDensity} />
          </div>
        </section>
      )}

      <div className="space-y-10">
        {relatedNotes.length === 0 ? (
          <div className="text-center py-10 opacity-60 text-subtle dark:text-subtle-dark">
            <p className="text-body-sm-muted">{t('no_thoughts_here')}</p>
          </div>
        ) : (
          <>
            {renderSection('claims', t('section_claims'), t('no_claims'), claims)}
            {renderSection('evidence', t('section_evidence'), t('no_evidence'), evidence)}
            {renderSection('triggers', t('section_triggers'), t('no_triggers'), triggers)}
            {renderSection('other', t('section_other'), t('no_other'), otherNotes)}
          </>
        )}
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
