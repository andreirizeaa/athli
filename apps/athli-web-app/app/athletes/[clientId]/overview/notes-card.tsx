'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { Separator } from '@/components/ui/separator';
import { SidePanel } from '@/components/app/side-panel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Edit, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/general/utils';
import { format } from 'date-fns';
import { getNotes, createNote, editNote, deleteNote, type Note } from '@/lib/coach/coach-note-service';

type NotesCardProps = {
  clientId: string;
};

export const NotesCard = ({ clientId }: NotesCardProps) => {
  const t = useTranslations();
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
  const [searchQuery, setSearchQuery] = useState('');
  const noteTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const fetchedNotes = await getNotes(clientId);
        setNotes(fetchedNotes);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
        setNotes([]);
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
    if (!selectedNote) return;

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
  };

  const handleDeleteNoteFromRow = async (note: Note) => {
    try {
      await deleteNote({
        noteId: note.id,
        contactId: clientId,
      });

      setNotes((prevNotes) => prevNotes.filter((n) => n.id !== note.id));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;

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
    if (!noteTitle.trim()) return;

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

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const formatCreatedDate = (timestamp: number): string => {
    return format(new Date(timestamp), 'MMM d, yyyy');
  };

  const filteredNotes = notes.filter((note) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.body?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Card className="bg-background w-full flex flex-col" style={{ height: '556px', minHeight: '556px', maxHeight: '556px' }}>
        <CardHeader className="px-4">
          <div className="flex items-center justify-between">
            <CardTitle>{t('messages.notes')} ({notes.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-7 text-xs w-[200px]"
                  aria-label="Search notes"
                />
              </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateNoteOpen(true)}
              className="h-7 text-xs"
              aria-label={t('messages.createNote')}
            >
              <Plus className="h-3 w-3" />
              {t('messages.createNote')}
            </Button>
            </div>
          </div>
        </CardHeader>
        <Separator className="w-full mt-[-8px]" />
        <CardContent className="px-0 flex flex-col flex-1 min-h-0">
          <div className="px-4 pb-2 pt-6">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">{t('messages.note')}</div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mr-10">{t('messages.createdDate')}</div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">{t('messages.action')}</div>
            </div>
          </div>
          <Separator className="w-full" />
          <div className="w-full" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {isLoading ? (
              <div className="px-4 py-4">
                <p className="text-sm text-muted-foreground">{t('messages.loadingNotes')}</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="px-4 py-4">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? t('messages.noNotesFound') : t('messages.noNotesFound')}
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="border-b cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => handleEditNote(note)}
                    role="button"
                    tabIndex={0}
                    aria-label={t('messages.viewNoteAria', { title: note.title })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEditNote(note);
                      }
                    }}
                  >
                    <div className="grid grid-cols-[1fr_auto_auto] gap-4 py-4 px-4 items-center">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium">{note.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {truncateText(note.body || '', 100)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap mr-4">
                        {formatCreatedDate(note.createdAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditNote(note);
                              }}
                              aria-label={t('general.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('general.edit')}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNoteFromRow(note);
                              }}
                              aria-label={t('general.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('general.delete')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
              onClick={handleDeleteNote}
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
    </>
  );
};

