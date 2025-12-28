'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { SidePanel } from '@/components/app/side-panel';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { ConfirmDeleteDialog } from '@/components/app/confirm-delete-dialog';

import { Trash2, Plus, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { useClientNotes } from '@/hooks/use-client-notes';
import { type Note } from '@/api/coach/coach-client-service';

import { useClientProfileContext } from '../client-profile-context';

const ClientNotesPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const itemsPerPage = 25;

  const { notes: notesFromContext, isLoading: isLoadingContext } = useClientProfileContext();
  const {
    notes: notesFromHook,
    isLoading: isLoadingHook,
    refetch,
    createNote: createNoteMutation,
    updateNote: updateNoteMutation,
    deleteNote: deleteNoteMutation,
    deleteNotes: deleteNotesMutation,
    isCreating,
    isUpdating,
    isDeleting
  } = useClientNotes(clientId);

  const notes = notesFromContext.length > 0 ? notesFromContext : notesFromHook;
  const isLoading = isLoadingContext || isLoadingHook;

  const [isViewNoteOpen, setIsViewNoteOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');
  const [editingNoteBody, setEditingNoteBody] = useState('');
  const [hasNoteChanges, setHasNoteChanges] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const noteTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isViewNoteOpen) {
      // Remove focus from any active element when panel opens
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [isViewNoteOpen]);

  useEffect(() => {
    if (isCreateNoteOpen && noteTitleInputRef.current) {
      // Small delay to ensure the sidebar is fully rendered
      setTimeout(() => {
        noteTitleInputRef.current?.focus();
      }, 100);
    }
  }, [isCreateNoteOpen]);

  useEffect(() => {
    if (selectedNote) {
      const titleChanged = editingNoteTitle !== selectedNote.title;
      const bodyChanged = editingNoteBody !== selectedNote.body;
      setHasNoteChanges(titleChanged || bodyChanged);
    }
  }, [editingNoteTitle, editingNoteBody, selectedNote]);

  const handleSaveNote = async () => {
    if (!selectedNote || !clientId) return;

    try {
      await updateNoteMutation({
        noteId: selectedNote.id,
        contactId: clientId,
        title: editingNoteTitle,
        body: editingNoteBody,
      });

      setHasNoteChanges(false);
      setIsViewNoteOpen(false);
      setSelectedNote(null);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleCancelNoteEdit = () => {
    if (selectedNote) {
      setEditingNoteTitle(selectedNote.title);
      setEditingNoteBody(selectedNote.body);
    }
    setHasNoteChanges(false);
    setIsViewNoteOpen(false);
    setSelectedNote(null);
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setEditingNoteTitle(note.title);
    setEditingNoteBody(note.body);
    setHasNoteChanges(false);
    setIsViewNoteOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    setNoteToDelete(note);
    setIsBulkDelete(false);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientId) return;

    try {
      if (isBulkDelete) {
        await deleteNotesMutation({
          noteIds: Array.from(selectedNotes),
          contactId: clientId,
        });
        setSelectedNotes(new Set());
      } else if (noteToDelete) {
        await deleteNoteMutation({
          noteId: noteToDelete.id,
          contactId: clientId,
        });
      }

      setIsDeleteDialogOpen(false);
      setNoteToDelete(null);
      setIsViewNoteOpen(false);
      setSelectedNote(null);
      setHasNoteChanges(false);
    } catch (error) {
      console.error('Failed to delete notes:', error);
    }
  };

  const handleDeleteNoteFromPanel = () => {
    if (!selectedNote) return;
    setNoteToDelete(selectedNote);
    setIsBulkDelete(false);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !clientId) return;

    try {
      await createNoteMutation({
        contactId: clientId,
        title: noteTitle,
        body: noteContent,
      });

      setIsCreateNoteOpen(false);
      setNoteTitle('');
      setNoteContent('');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleToggleNote = (noteId: string) => {
    setSelectedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleClearSelected = () => {
    setSelectedNotes(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedNotes.size === 0) return;
    setIsBulkDelete(true);
    setNoteToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const formatCreatedDate = (timestamp: number): string => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  // Create column definitions
  const columns: ColumnDefinition<Note>[] = [
    {
      id: 'title',
      label: t('messages.noteTitle'),
      icon: <FileText className="size-3" />,
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderHeader: ({ isAllSelected, onToggleAll }) => (
        <div className="flex items-center gap-3 h-full w-full">
          <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <div className="flex items-center gap-2">
            <FileText className="size-3 text-muted-foreground" />
            <span className="text-xs uppercase text-muted-foreground">{t('messages.noteTitle')}</span>
          </div>
        </div>
      ),
      renderCell: (row, isSelected) => (
        <div className="flex items-center gap-3 h-full w-full">
          <div
            className="flex items-center justify-center h-full flex-shrink-0"
            data-no-row-link="true"
          >
            <Checkbox checked={isSelected} onCheckedChange={() => handleToggleNote(row.id)} />
          </div>
          <div className="flex items-center w-full min-w-0">
            <span className="text-sm font-medium truncate">{row.title}</span>
          </div>
        </div>
      ),
      getSortValue: (row) => row.title.toLowerCase(),
      getSearchValue: (row) => row.title,
    },
    {
      id: 'notes',
      label: t('messages.note'),
      icon: <FileText className="size-3" />,
      width: { class: 'min-w-[400px]', pixel: '400px' },
      sortable: false,
      renderHeader: () => (
        <div className="flex items-center gap-2 h-full w-full">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('messages.note')}</span>
        </div>
      ),
      renderCell: (row) => (
        <div className="flex items-center w-full min-w-0">
          <span className="text-sm text-muted-foreground truncate">{row.body || '--'}</span>
        </div>
      ),
      getSortValue: (row) => (row.body || '').toLowerCase(),
      getSearchValue: (row) => row.body || '',
    },
    {
      id: 'createdAt',
      label: t('messages.createdDate'),
      icon: <FileText className="size-3" />,
      width: { class: 'min-w-[150px]', pixel: '150px' },
      renderCell: (row) => (
        <div className="flex items-center w-full">
          <span className="text-sm">{formatCreatedDate(row.createdAt)}</span>
        </div>
      ),
      getSortValue: (row) => row.createdAt,
      getSearchValue: (row) => formatCreatedDate(row.createdAt),
    },
    {
      id: 'actions',
      label: '',
      width: { class: 'w-[50px]', pixel: '50px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-action-menu="true">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNote(row.id);
            }}
            aria-label={t('general.delete')}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Sort notes by created date (newest first)
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => b.createdAt - a.createdAt);
  }, [notes]);

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <DataGrid
        data={sortedNotes}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey={`client-notes-${clientId}`}
        itemsPerPage={itemsPerPage}
        enableSearch={true}
        searchPlaceholder={t('messages.searchNotesPlaceholder')}
        searchFields={[(row) => `${row.title} ${row.body || ''}`]}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedNotes}
        onSelectionChange={setSelectedNotes}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]') || targetElement.closest('[data-action-menu="true"]')) {
            return;
          }
          handleEditNote(row);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]') || targetElement.closest('[data-action-menu="true"]')) {
              return;
            }
            event.preventDefault();
            handleEditNote(row);
          }
        }}
        defaultColumnOrder={['title', 'notes', 'createdAt', 'actions']}
        defaultVisibleColumns={['title', 'notes', 'createdAt', 'actions']}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
        emptyMessage={t('messages.noNotesFound')}
        emptyState={
          <EmptyGridState
            title={t('messages.noNotesFound')}
            subtitle={t('messages.createNote')}
            action={
              <Button onClick={() => setIsCreateNoteOpen(true)} className="gap-2">
                <Plus className="size-4" />
                <span>{t('messages.createNote')}</span>
              </Button>
            }
          />
        }
        selectionActions={
          selectedNotes.size > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={handleClearSelected}
                className="gap-2"
              >
                <X className="size-4" />
                <span>{t('general.clearSelected', { count: selectedNotes.size })}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={handleDeleteSelected}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                <span>{t('general.delete')}</span>
              </Button>
            </div>
          ) : undefined
        }
        filterBarActions={
          <Button onClick={() => setIsCreateNoteOpen(true)} className="gap-2">
            <Plus className="size-4" />
            <span>{t('messages.createNote')}</span>
          </Button>
        }
      />

      <SidePanel
        open={isViewNoteOpen}
        onOpenChange={setIsViewNoteOpen}
        title={t('messages.viewNote')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button onClick={handleSaveNote} disabled={!hasNoteChanges}>
              {t('general.save')}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={handleDeleteNoteFromPanel}
              aria-label={t('general.delete')}
            >
              <Trash2 className="size-4" />
              {t('general.delete')}
            </Button>
            <Button variant="outline" onClick={handleCancelNoteEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        {selectedNote && (
          <div className="flex-1 flex flex-col min-h-0 gap-4 px-1 pb-1">
            <div className="space-y-2">
              <Label htmlFor="view-note-title">
                <span>{t('messages.noteTitle')}<RequiredAsterisk /></span>
              </Label>
              <Input
                id="view-note-title"
                value={editingNoteTitle}
                onChange={(e) => setEditingNoteTitle(e.target.value)}
                placeholder={t('messages.enterNoteTitle')}
                autoFocus={false}
                tabIndex={0}
              />
            </div>
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <Label htmlFor="view-note-body">
                <span>{t('messages.noteBody')}</span>
              </Label>
              <Textarea
                id="view-note-body"
                value={editingNoteBody}
                onChange={(e) => setEditingNoteBody(e.target.value)}
                placeholder={t('messages.writeNoteHere')}
                className="flex-1 resize-none"
                autoFocus={false}
                tabIndex={0}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mt-auto pt-4">
              <div className="flex items-center gap-2">
                <span>
                  {t('messages.createdAt')} {formatCreatedDate(selectedNote.createdAt)}
                </span>
                {selectedNote.updatedAt && (
                  <>
                    <span>•</span>
                    <span>
                      {t('messages.updatedAt')} {formatCreatedDate(selectedNote.updatedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </SidePanel>

      <SidePanel
        open={isCreateNoteOpen}
        onOpenChange={setIsCreateNoteOpen}
        title={t('messages.createNote')}
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button onClick={handleCreateNote} disabled={!noteTitle.trim()}>
              {t('general.save')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateNoteOpen(false);
                setNoteTitle('');
                setNoteContent('');
              }}
            >
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4 px-1 pb-1">
          <div className="space-y-2">
            <Label htmlFor="note-title">
              <span>{t('messages.noteTitle')}<RequiredAsterisk /></span>
            </Label>
            <Input
              id="note-title"
              ref={noteTitleInputRef}
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder={t('messages.enterNoteTitle')}
              autoFocus={false}
              tabIndex={0}
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <Label htmlFor="note-body">
              <span>{t('messages.noteBody')}</span>
            </Label>
            <Textarea
              id="note-body"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={t('messages.writeNoteHere')}
              className="flex-1 resize-none"
              autoFocus={false}
              tabIndex={0}
            />
          </div>
        </div>
      </SidePanel>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={noteToDelete?.title}
        count={selectedNotes.size}
        itemType="note"
        variant="default"
      />
    </div>
  );
};

export default ClientNotesPage;

