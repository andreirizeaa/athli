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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Edit, Plus, MoreHorizontal, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { getNotes, createNote, editNote, deleteNote, type Note } from '@/lib/messaging/notes-service';

const ClientNotesPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewNoteOpen, setIsViewNoteOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');
  const [editingNoteBody, setEditingNoteBody] = useState('');
  const [hasNoteChanges, setHasNoteChanges] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const noteTitleInputRef = useRef<HTMLInputElement>(null);

  const itemsPerPage = 25;

  useEffect(() => {
    const fetchNotes = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const fetchedNotes = await getNotes(clientId);
        setNotes(fetchedNotes);
        setFilteredCount(fetchedNotes.length);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
        setNotes([]);
        setFilteredCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [clientId]);

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
      const updatedNote = await editNote({
        noteId: selectedNote.id,
        contactId: clientId,
        title: editingNoteTitle,
        body: editingNoteBody,
      });

      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === selectedNote.id ? updatedNote : note
        )
      );
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
    setRowMenuOpenId(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!clientId) return;
    
    try {
      await deleteNote({
        noteId,
        contactId: clientId,
      });

      setNotes((prevNotes) => prevNotes.filter((n) => n.id !== noteId));
      setRowMenuOpenId(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleDeleteNoteFromPanel = async () => {
    if (!selectedNote || !clientId) return;

    try {
      await deleteNote({
        noteId: selectedNote.id,
        contactId: clientId,
      });

      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== selectedNote.id));
      setIsViewNoteOpen(false);
      setSelectedNote(null);
      setHasNoteChanges(false);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !clientId) return;

    try {
      const newNote = await createNote({
        contactId: clientId,
        title: noteTitle,
        body: noteContent,
      });

      setNotes((prevNotes) => [newNote, ...prevNotes]);
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

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const formatCreatedDate = (timestamp: number): string => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  // Render first column header with checkbox
  const renderFirstColumnHeader = ({
    isAllSelected,
    onToggleAll,
  }: {
    isAllSelected: boolean;
    onToggleAll: () => void;
  }) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
        <div className="flex items-center gap-2">
          <FileText className="size-3 text-muted-foreground" />
          <span className="text-xs uppercase text-muted-foreground">{t('messages.noteTitle')}</span>
        </div>
      </div>
    );
  };

  // Render first column with checkbox and title
  const renderFirstColumn = (row: Note, isSelected: boolean) => {
    return (
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
    );
  };

  // Create column definitions
  const columns: ColumnDefinition<Note>[] = [
    {
      id: 'title',
      label: t('messages.noteTitle'),
      icon: <FileText className="size-3" />,
      width: { class: 'min-w-[300px]', pixel: '300px' },
      renderCell: (row) => (
        <div className="flex items-center w-full">
          <span className="text-sm font-medium truncate">{row.title}</span>
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
          <span className="text-sm text-muted-foreground truncate">{row.body || ''}</span>
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
      width: { class: 'w-[26px]', pixel: '26px' },
      renderCell: (row) => (
        <div className="flex items-center justify-end w-full" data-action-menu="true">
          <DropdownMenu open={rowMenuOpenId === row.id} onOpenChange={(open) => setRowMenuOpenId(open ? row.id : null)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setRowMenuOpenId(row.id);
                }}
                aria-label={t('messages.viewNoteAria', { title: row.title })}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditNote(row);
                }}
              >
                <Edit className="size-4 mr-2" />
                <span>{t('general.edit')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNote(row.id);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                <span>{t('general.delete')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('messages.searchNotesPlaceholder')}
        searchFields={[(row) => `${row.title} ${row.body || ''}`]}
        enableEditColumns={false}
        enableExport={false}
        enableRowSelection={true}
        selectedRowIds={selectedNotes}
        onSelectionChange={setSelectedNotes}
        firstColumnId="title"
        stickyFirstColumn={true}
        firstColumnWidth="175px"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={handleClearSelected}
              className="gap-2"
              aria-label={t('general.clear')}
            >
              <span>
                {t('general.clear')} {selectedNotes.size} selected
              </span>
            </Button>
          </div>
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
              {t('general.delete')}
            </Button>
            <Button variant="outline" onClick={handleCancelNoteEdit}>
              {t('general.cancel')}
            </Button>
          </div>
        }
      >
        {selectedNote && (
          <div className="flex-1 flex flex-col min-h-0 gap-4">
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
        <div className="flex-1 flex flex-col min-h-0 gap-4">
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
    </div>
  );
};

export default ClientNotesPage;

