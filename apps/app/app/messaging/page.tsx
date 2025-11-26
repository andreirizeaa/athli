'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Search, Send, MoreHorizontal, Paperclip, RadioTower, X, Filter, User, Check, ArrowUpNarrowWide, ArrowDownWideNarrow, MessageCirclePlus, CalendarDays, Dumbbell, Archive, ChevronDown, Plus, Image as ImageIcon, FileText, ArrowUp, Reply, Trash2, Video, NotebookPen } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { messageDraftStorage } from '@/lib/message-draft-storage'
import { sendMessage } from '@/lib/message-service'
import { mockContacts, mockMessages, mockAthletes, type Contact, type Message } from '@/components/app/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { SidePanel } from '@/components/app/side-panel'
import { AssignAthletesList } from '@/components/app/assign-athletes-list'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Note = {
  id: string
  title: string
  body: string
  createdAt: number // timestamp in milliseconds
  updatedAt: number | null // timestamp in milliseconds
}

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Training Progress Update',
    body: 'Client has shown significant improvement in their squat form. We\'ve increased the weight by 10kg and they\'re maintaining proper technique. Next session we\'ll focus on deadlift variations.',
    createdAt: new Date('2025-08-21T17:50:00').getTime(),
    updatedAt: new Date('2025-08-21T18:30:00').getTime(),
  },
  {
    id: '2',
    title: 'Nutrition Consultation',
    body: 'Discussed meal timing and protein intake. Client is tracking macros well. Recommended increasing water intake before workouts.',
    createdAt: new Date('2025-08-20T14:15:00').getTime(),
    updatedAt: null,
  },
  {
    id: '3',
    title: 'Injury Prevention Notes',
    body: 'Client mentioned slight discomfort in left shoulder during overhead movements. We\'ve adjusted the program to focus on mobility work and reduced overhead load. Will monitor closely in next session.',
    createdAt: new Date('2025-08-19T10:00:00').getTime(),
    updatedAt: new Date('2025-08-19T16:45:00').getTime(),
  },
  {
    id: '4',
    title: 'Weekly Check-in',
    body: '',
    createdAt: new Date('2025-08-18T09:30:00').getTime(),
    updatedAt: null,
  },
  {
    id: '5',
    title: 'Goal Setting Session',
    body: 'Client wants to focus on building muscle mass over the next 3 months. We\'ve set specific targets and created a progressive overload plan. They\'re motivated and committed to the program.',
    createdAt: new Date('2025-08-17T15:20:00').getTime(),
    updatedAt: null,
  },
]

const formatNoteDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const formatted = format(date, 'd MMM, yyyy - h:mma')
  // Capitalize the month abbreviation (e.g., "aug" -> "Aug")
  // Format: "21 aug, 2025 - 5:50pm" -> "21 Aug, 2025 - 5:50pm"
  const parts = formatted.split(' ')
  if (parts.length >= 2) {
    // Capitalize the month (second part, e.g., "aug," -> "Aug,")
    parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
  }
  return parts.join(' ')
}

const MessagingPage = () => {
  const router = useRouter()
  const params = useParams()
  const contactIdFromPath = params?.contactId as string | undefined
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [messageInput, setMessageInput] = React.useState('')
  const [messages, setMessages] = React.useState<Record<string, Message[]>>(mockMessages)
  const [isNewMessageOpen, setIsNewMessageOpen] = React.useState(false)
  const [isCreateNoteOpen, setIsCreateNoteOpen] = React.useState(false)
  const [noteTitle, setNoteTitle] = React.useState('')
  const [noteContent, setNoteContent] = React.useState('')
  const [isNoteEmpty, setIsNoteEmpty] = React.useState(true)
  const noteTitleInputRef = React.useRef<HTMLInputElement>(null)
  const noteTextareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [notes, setNotes] = React.useState<Note[]>(mockNotes)
  const [isViewNoteOpen, setIsViewNoteOpen] = React.useState(false)
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null)
  const [editingNoteTitle, setEditingNoteTitle] = React.useState('')
  const [editingNoteBody, setEditingNoteBody] = React.useState('')
  const [hasNoteChanges, setHasNoteChanges] = React.useState(false)
  const [isDeleteNoteMenuOpen, setIsDeleteNoteMenuOpen] = React.useState(false)
  
  React.useEffect(() => {
    if (isCreateNoteOpen && noteTitleInputRef.current) {
      // Small delay to ensure the sidebar is fully rendered
      setTimeout(() => {
        noteTitleInputRef.current?.focus()
      }, 100)
    }
  }, [isCreateNoteOpen])

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note)
    setEditingNoteTitle(note.title)
    setEditingNoteBody(note.body)
    setHasNoteChanges(false)
    setIsViewNoteOpen(true)
  }

  React.useEffect(() => {
    if (selectedNote) {
      const titleChanged = editingNoteTitle !== selectedNote.title
      const bodyChanged = editingNoteBody !== selectedNote.body
      setHasNoteChanges(titleChanged || bodyChanged)
    }
  }, [editingNoteTitle, editingNoteBody, selectedNote])

  React.useEffect(() => {
    if (isViewNoteOpen) {
      // Prevent auto-focus when sidebar opens
      // Use a small delay to ensure the sidebar is fully rendered
      const timeoutId = setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          activeElement.blur()
        }
        // Also explicitly blur any inputs in the view note panel
        const titleInput = document.getElementById('view-note-title') as HTMLInputElement
        const bodyTextarea = document.getElementById('view-note-body') as HTMLTextAreaElement
        if (titleInput) titleInput.blur()
        if (bodyTextarea) bodyTextarea.blur()
      }, 50)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isViewNoteOpen])

  const handleSaveNote = () => {
    if (!selectedNote) return
    
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === selectedNote.id
          ? {
              ...note,
              title: editingNoteTitle,
              body: editingNoteBody,
              updatedAt: Date.now(),
            }
          : note
      )
    )
    setIsViewNoteOpen(false)
    setSelectedNote(null)
    setHasNoteChanges(false)
  }

  const handleCancelNoteEdit = () => {
    if (selectedNote) {
      setEditingNoteTitle(selectedNote.title)
      setEditingNoteBody(selectedNote.body)
    }
    setHasNoteChanges(false)
    setIsViewNoteOpen(false)
    setSelectedNote(null)
  }

  const handleDeleteNote = () => {
    if (!selectedNote) return
    
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== selectedNote.id))
    setIsViewNoteOpen(false)
    setSelectedNote(null)
    setHasNoteChanges(false)
  }
  
  const [sortFilter, setSortFilter] = React.useState<string>('all')
  const [textareaHeight, setTextareaHeight] = React.useState(36)
  const [openDeleteMenuId, setOpenDeleteMenuId] = React.useState<string | null>(null)
  const [replyingToMessage, setReplyingToMessage] = React.useState<Message | null>(null)
  const [drafts, setDrafts] = React.useState<Record<string, import('@/lib/message-draft-storage').MessageDraftData>>({})
  const [attachedPdf, setAttachedPdf] = React.useState<File | null>(null)
  const [attachedImages, setAttachedImages] = React.useState<File[]>([])
  const [attachedVideo, setAttachedVideo] = React.useState<File | null>(null)
  const [isDraggingOver, setIsDraggingOver] = React.useState(false)
  const [dragCounter, setDragCounter] = React.useState(0)
  const isLoadingDraftRef = React.useRef(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Check if a contact has a draft (text, PDF, video, or images)
  const hasDraft = React.useCallback((contactId: string): boolean => {
    const draft = drafts[contactId]
    if (!draft) return false
    return Boolean(draft.text?.trim()) || Boolean(draft.pdf) || Boolean(draft.video) || Boolean(draft.images && draft.images.length > 0)
  }, [drafts])

  // Update drafts state from localStorage
  // Preserves optimistic updates (drafts with empty data fields) until actual data is saved
  const updateDraftsState = React.useCallback(() => {
    const allDrafts = messageDraftStorage.getAllDrafts()
    setDrafts((prev) => {
      const updated = { ...allDrafts }
      // Preserve optimistic updates (drafts with files that have empty data)
      // These will be replaced once the actual save completes
      Object.keys(prev).forEach((contactId) => {
        const prevDraft = prev[contactId]
        const savedDraft = updated[contactId]
        
        // If we have an optimistic PDF update (has name/size but empty or missing data)
        if (prevDraft?.pdf) {
          const prevHasData = prevDraft.pdf.data && prevDraft.pdf.data !== ''
          const savedHasData = savedDraft?.pdf?.data && savedDraft.pdf.data !== ''
          
          // Preserve optimistic update only if saved version doesn't have data yet
          if (!prevHasData && !savedHasData) {
            if (!updated[contactId]) {
              updated[contactId] = { text: prevDraft.text || '' }
            }
            updated[contactId].pdf = prevDraft.pdf
            // Also preserve video and images if they exist in optimistic state
            if (prevDraft.video) {
              updated[contactId].video = prevDraft.video
            }
            if (prevDraft.images && prevDraft.images.length > 0) {
              updated[contactId].images = prevDraft.images
            }
          }
        }
        
        // If we have an optimistic video update (has name/size but empty or missing data)
        if (prevDraft?.video) {
          const prevHasData = prevDraft.video.data && prevDraft.video.data !== ''
          const savedHasData = savedDraft?.video?.data && savedDraft.video.data !== ''
          
          // Preserve optimistic update only if saved version doesn't have data yet
          if (!prevHasData && !savedHasData) {
            if (!updated[contactId]) {
              updated[contactId] = { text: prevDraft.text || '' }
            }
            updated[contactId].video = prevDraft.video
            // Also preserve PDF and images if they exist in optimistic state
            if (prevDraft.pdf) {
              updated[contactId].pdf = prevDraft.pdf
            }
            if (prevDraft.images && prevDraft.images.length > 0) {
              updated[contactId].images = prevDraft.images
            }
          }
        }
        
        // If we have optimistic image updates (has images but empty data)
        if (prevDraft?.images && prevDraft.images.length > 0) {
          const prevHasData = prevDraft.images.some((img) => img.data && img.data !== '')
          const savedHasData = savedDraft?.images?.some((img) => img.data && img.data !== '')
          
          // Preserve optimistic update only if saved version doesn't have data yet
          if (!prevHasData && !savedHasData) {
            if (!updated[contactId]) {
              updated[contactId] = { text: prevDraft.text || '' }
            }
            updated[contactId].images = prevDraft.images
            // Preserve PDF and video if they exist in optimistic state
            if (prevDraft.pdf) {
              updated[contactId].pdf = prevDraft.pdf
            }
            if (prevDraft.video) {
              updated[contactId].video = prevDraft.video
            }
          }
        }
      })
      return updated
    })
  }, [])

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const pdfInputRef = React.useRef<HTMLInputElement>(null)
  const videoInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const selectedContact = selectedContactId
    ? mockContacts.find((contact) => contact.id === selectedContactId)
    : null

  const currentMessages = selectedContactId ? messages[selectedContactId] || [] : []

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return mockContacts
    const query = searchQuery.toLowerCase()
    return mockContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.lastMessage.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const allSentMessages = React.useMemo(() => {
    const sentMessages: Message[] = []
    Object.values(messages).forEach((contactMessages) => {
      contactMessages
        .filter((msg) => msg.isSent)
        .forEach((msg) => sentMessages.push(msg))
    })
    return sentMessages
  }, [messages])

  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentMessages])

  // Read contact ID from URL path params on mount and when path changes
  React.useEffect(() => {
    if (contactIdFromPath) {
      const contactExists = mockContacts.some((contact) => contact.id === contactIdFromPath)
      if (contactExists) {
        setSelectedContactId(contactIdFromPath)
      } else {
        // Invalid contact ID, redirect to base messaging page
        router.replace('/messaging')
      }
    } else {
      setSelectedContactId(null)
    }
  }, [contactIdFromPath, router])

  // Load drafts on mount
  React.useEffect(() => {
    updateDraftsState()
  }, [updateDraftsState])

  // Load draft when contact is selected
  React.useEffect(() => {
    const currentContactId = selectedContactId
    isLoadingDraftRef.current = true
    
    // Immediately clear files and text to prevent save effects from saving old data to new contact
    setMessageInput('')
    setAttachedPdf(null)
    setAttachedVideo(null)
    setAttachedImages([])
    
    // Use a small delay to ensure state clears before loading draft
    // This prevents race conditions where save effects might fire with old data
    setTimeout(() => {
      if (currentContactId && selectedContactId === currentContactId) {
        const draft = messageDraftStorage.getDraft(currentContactId)
        if (draft.text) {
          setMessageInput(draft.text)
        }
        
        // Restore PDF if it exists
        if (draft.pdf) {
          try {
            const pdfFile = messageDraftStorage.pdfDataToFile(draft.pdf)
            setAttachedPdf(pdfFile)
            setTextareaHeight(60)
          } catch {
            // If PDF restoration fails, just clear it
            setAttachedPdf(null)
          }
        }

        // Restore video if it exists
        if (draft.video) {
          try {
            const videoFile = messageDraftStorage.videoDataToFile(draft.video)
            setAttachedVideo(videoFile)
            setTextareaHeight(60)
          } catch {
            // If video restoration fails, just clear it
            setAttachedVideo(null)
          }
        } else {
          setAttachedVideo(null)
        }

        // Restore images if they exist
        if (draft.images && draft.images.length > 0) {
          try {
            const imageFiles = draft.images.map((img) => messageDraftStorage.imageDataToFile(img))
            setAttachedImages(imageFiles)
            setTextareaHeight(60)
          } catch {
            // If image restoration fails, just clear them
            setAttachedImages([])
          }
        }
      }
      
      // Reset flag after a delay to allow all state updates and effects to settle
      // This prevents save effects from firing during draft loading
      setTimeout(() => {
        isLoadingDraftRef.current = false
      }, 300)
    }, 50)
  }, [selectedContactId])

  // Save draft as user types (with debouncing for text)
  React.useEffect(() => {
    if (!selectedContactId) return
    // Don't save if we're currently loading a draft
    if (isLoadingDraftRef.current) return

    // Only save if there's actual content
    const hasContent = messageInput.trim().length > 1 || attachedPdf || attachedVideo || attachedImages.length > 0
    if (!hasContent) return

    const timeoutId = setTimeout(() => {
      // Only save if there's actual content for this specific contact
      // Don't update state immediately - let the file-specific effects handle state updates
      // This prevents overwriting optimistic updates before FileReader completes
      messageDraftStorage.saveDraft(selectedContactId, messageInput, attachedPdf, attachedImages, attachedVideo)
      // Only update state if there are no files (text-only draft)
      // Files will trigger their own state updates via callbacks
      if (!attachedPdf && !attachedVideo && attachedImages.length === 0) {
        updateDraftsState()
      }
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [messageInput, selectedContactId, attachedPdf, attachedImages, updateDraftsState])

  // Save draft immediately when PDF changes (not debounced)
  React.useEffect(() => {
    if (!selectedContactId) return
    // Don't save if we're currently loading a draft
    if (isLoadingDraftRef.current) return
    
    const currentContactId = selectedContactId
    const currentPdf = attachedPdf
    const currentText = messageInput
    const currentImages = attachedImages
    
    // Check if this PDF is from a draft (to avoid re-saving during load)
    const existingDraft = messageDraftStorage.getDraft(currentContactId)
    const isPdfFromDraft = existingDraft.pdf && currentPdf && 
      existingDraft.pdf.name === currentPdf.name && 
      existingDraft.pdf.size === currentPdf.size
    
    // Only save if PDF is actually being added (not removed) and not from draft
    if (currentPdf && !isPdfFromDraft) {
      // Update state optimistically for immediate feedback (before FileReader completes)
      setDrafts((prev) => {
        const updated = { ...prev }
        updated[currentContactId] = {
          text: currentText,
          pdf: {
            name: currentPdf.name,
            data: '', // Will be filled when FileReader completes
            type: currentPdf.type,
            size: currentPdf.size,
          },
        }
        return updated
      })
      
      // Save draft with captured values to ensure correct contactId
      messageDraftStorage.saveDraft(
        currentContactId, 
        currentText, 
        currentPdf,
        currentImages,
        attachedVideo,
        () => {
          // Callback when PDF is saved (after FileReader completes)
          // Only update if we're still on the same contact
          if (selectedContactId === currentContactId) {
            // Force update from localStorage now that PDF is saved
            const savedDrafts = messageDraftStorage.getAllDrafts()
            setDrafts(savedDrafts)
          }
        }
      )
    } else if (currentPdf === null && currentText.trim().length <= 1 && currentImages.length === 0 && !attachedVideo) {
      // If PDF is removed and there's no other content, clear draft
      messageDraftStorage.removeDraft(currentContactId)
      updateDraftsState()
    }
  }, [attachedPdf, attachedVideo, attachedImages, selectedContactId, messageInput, updateDraftsState])

  // Save draft immediately when images change (not debounced)
  React.useEffect(() => {
    if (!selectedContactId) return
    // Don't save if we're currently loading a draft
    if (isLoadingDraftRef.current) return
    
    const currentContactId = selectedContactId
    const currentImages = attachedImages
    const currentText = messageInput
    const currentPdf = attachedPdf
    
    // Check if these images are from a draft (to avoid re-saving during load)
    const existingDraft = messageDraftStorage.getDraft(currentContactId)
    const isImagesFromDraft = existingDraft.images && existingDraft.images.length > 0 && 
      currentImages.length > 0 &&
      existingDraft.images.length === currentImages.length &&
      existingDraft.images.every((draftImg, idx) => 
        currentImages[idx] && 
        draftImg.name === currentImages[idx].name && 
        draftImg.size === currentImages[idx].size
      )
    
    // Only save if images are actually being added (not removed) and not from draft
    if (currentImages.length > 0 && !isImagesFromDraft) {
      // Update state optimistically for immediate feedback (before FileReader completes)
      setDrafts((prev) => {
        const updated = { ...prev }
        const existingDraft = updated[currentContactId]
        updated[currentContactId] = {
          text: currentText,
          // Preserve existing PDF if it exists, otherwise use current PDF
          ...(existingDraft?.pdf ? { pdf: existingDraft.pdf } : currentPdf ? {
            pdf: {
              name: currentPdf.name,
              data: '', // Will be filled when FileReader completes
              type: currentPdf.type,
              size: currentPdf.size,
            },
          } : {}),
          images: currentImages.map((img) => ({
            name: img.name,
            data: '', // Will be filled when FileReader completes
            type: img.type,
            size: img.size,
          })),
        }
        return updated
      })
      
      // Save draft with captured values to ensure correct contactId
      messageDraftStorage.saveDraft(
        currentContactId, 
        currentText, 
        currentPdf,
        currentImages,
        attachedVideo,
        undefined, // onPdfSaved callback (not needed here)
        () => {
          // Callback when images are saved (after FileReader completes)
          // Only update if we're still on the same contact
          if (selectedContactId === currentContactId) {
            // Force update from localStorage now that images are saved
            const savedDrafts = messageDraftStorage.getAllDrafts()
            setDrafts(savedDrafts)
          }
        }
      )
      // The optimistic update above ensures the draft indicator shows immediately
      // The callback will update the state with actual base64 data when ready
    } else if (currentImages.length === 0 && currentText.trim().length <= 1 && !currentPdf && !attachedVideo) {
      // If images are removed and there's no other content, clear draft
      messageDraftStorage.removeDraft(currentContactId)
      updateDraftsState()
    }
  }, [attachedImages, selectedContactId, messageInput, attachedPdf, attachedVideo, updateDraftsState])

  // Save draft immediately when video changes (not debounced)
  React.useEffect(() => {
    if (!selectedContactId) return
    // Don't save if we're currently loading a draft
    if (isLoadingDraftRef.current) return
    
    const currentContactId = selectedContactId
    const currentVideo = attachedVideo
    const currentText = messageInput
    const currentImages = attachedImages
    const currentPdf = attachedPdf
    
    // Check if this video is from a draft (to avoid re-saving during load)
    const existingDraft = messageDraftStorage.getDraft(currentContactId)
    const isVideoFromDraft = existingDraft.video && currentVideo && 
      existingDraft.video.name === currentVideo.name && 
      existingDraft.video.size === currentVideo.size
    
    // Only save if video is actually being added (not removed) and not from draft
    if (currentVideo && !isVideoFromDraft) {
      // Update state optimistically for immediate feedback (before FileReader completes)
      setDrafts((prev) => {
        const updated = { ...prev }
        updated[currentContactId] = {
          text: currentText,
          video: {
            name: currentVideo.name,
            data: '', // Will be filled when FileReader completes
            type: currentVideo.type,
            size: currentVideo.size,
          },
        }
        return updated
      })
      
      // Save draft with captured values to ensure correct contactId
      messageDraftStorage.saveDraft(
        currentContactId, 
        currentText, 
        currentPdf,
        currentImages,
        currentVideo,
        undefined, // onPdfSaved callback (not needed here)
        undefined, // onImagesSaved callback (not needed here)
        () => {
          // Callback when video is saved (after FileReader completes)
          // Only update if we're still on the same contact
          if (selectedContactId === currentContactId) {
            // Force update from localStorage now that video is saved
            const savedDrafts = messageDraftStorage.getAllDrafts()
            setDrafts(savedDrafts)
          }
        }
      )
    } else if (currentVideo === null && currentText.trim().length <= 1 && currentImages.length === 0 && !currentPdf) {
      // If video is removed and there's no other content, clear draft
      messageDraftStorage.removeDraft(currentContactId)
      updateDraftsState()
    }
  }, [attachedVideo, attachedImages, selectedContactId, messageInput, attachedPdf, updateDraftsState])

  React.useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const wasFocused = document.activeElement === textarea
    const cursorPosition = textarea.selectionStart
    
    // If replying, PDF/video attached, or images attached, ensure multi-line height
    if (replyingToMessage || attachedPdf || attachedVideo || attachedImages.length > 0) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const minHeight = 60
      const maxHeight = 120
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight))
      textarea.style.height = `${newHeight}px`
      setTextareaHeight(newHeight)
    } else {
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 120
      const newHeight = Math.min(scrollHeight, maxHeight)
      textarea.style.height = `${newHeight}px`
      
      // Update height state
      setTextareaHeight(newHeight > 40 ? newHeight : 36)
    }
    
    // Restore focus and cursor position if it was focused
    if (wasFocused) {
      // Use a microtask to ensure DOM has updated
      Promise.resolve().then(() => {
        if (textarea && document.activeElement !== textarea) {
          textarea.focus()
          if (cursorPosition !== null && cursorPosition <= textarea.value.length) {
            textarea.setSelectionRange(cursorPosition, cursorPosition)
          }
        }
      })
    }
  }, [messageInput, replyingToMessage, attachedPdf, attachedVideo, attachedImages.length])


  const handleSendMessage = () => {
    if ((!messageInput.trim() && !attachedPdf && !attachedVideo && attachedImages.length === 0) || !selectedContactId) return

    // Get PDF data from draft if available, or convert attached PDF
    const getPdfData = async (): Promise<Message['pdf'] | undefined> => {
      if (!attachedPdf) return undefined

      // Try to get from draft first (already has base64)
      const draft = messageDraftStorage.getDraft(selectedContactId)
      if (draft.pdf && draft.pdf.data) {
        return draft.pdf
      }

      // Otherwise convert File to base64
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          resolve({
            name: attachedPdf.name,
            data: base64,
            type: attachedPdf.type,
            size: attachedPdf.size,
          })
        }
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(attachedPdf)
      })
    }

    // Convert images to base64
    const getImagesData = async (): Promise<Message['images']> => {
      if (attachedImages.length === 0) return undefined

      const convertImage = (file: File): Promise<{ name: string; data: string; type: string; size: number }> => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = reader.result as string
            resolve({
              name: file.name,
              data: base64,
              type: file.type,
              size: file.size,
            })
          }
          reader.onerror = () => resolve({
            name: file.name,
            data: '',
            type: file.type,
            size: file.size,
          })
          reader.readAsDataURL(file)
        })
      }

      return Promise.all(attachedImages.map(convertImage))
    }

    // Get video data from draft if available, or convert attached video
    const getVideoData = async (): Promise<Message['video'] | undefined> => {
      if (!attachedVideo) return undefined

      // Try to get from draft first (already has base64)
      const draft = messageDraftStorage.getDraft(selectedContactId)
      if (draft.video && draft.video.data) {
        return draft.video
      }

      // Otherwise convert File to base64
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          resolve({
            name: attachedVideo.name,
            data: base64,
            type: attachedVideo.type,
            size: attachedVideo.size,
          })
        }
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(attachedVideo)
      })
    }

    // Create separate messages for each file
    const createMessages = async () => {
      const pdfData = await getPdfData()
      const videoData = await getVideoData()
      const imagesData = await getImagesData()
      const messageText = messageInput.trim() || ''

      const replyToData = replyingToMessage
        ? {
            id: replyingToMessage.id,
            text: replyingToMessage.text,
            isSent: replyingToMessage.isSent,
            pdf: replyingToMessage.pdf,
            images: replyingToMessage.images,
            video: replyingToMessage.video,
          }
        : undefined

      const newMessages: Message[] = []
      let baseTimestamp = Date.now()

      // If there's text, send it as a separate message first
      if (messageText) {
        const textMessage = {
          id: `m${baseTimestamp}`,
          text: messageText,
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          isSent: true,
          replyTo: replyToData,
        }
        newMessages.push(textMessage)
        
        // Call message service
        if (selectedContactId) {
          sendMessage({
            contactId: selectedContactId,
            text: messageText,
            repliedTo: replyToData,
          }).catch((error) => {
            console.error('Failed to send text message:', error)
          })
        }
        
        baseTimestamp += 1
      }

      // Send each image as a separate message
      if (imagesData && imagesData.length > 0) {
        for (const image of imagesData) {
          const imageMessage = {
            id: `m${baseTimestamp}`,
            text: '',
            timestamp: new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }),
            isSent: true,
            replyTo: replyToData,
            images: [image],
          }
          newMessages.push(imageMessage)
          
          // Call message service
          if (selectedContactId) {
            sendMessage({
              contactId: selectedContactId,
              images: [image],
              repliedTo: replyToData,
            }).catch((error) => {
              console.error('Failed to send image message:', error)
            })
          }
          
          baseTimestamp += 1
        }
      }

      // Send PDF as a separate message
      if (pdfData) {
        const pdfMessage = {
          id: `m${baseTimestamp}`,
          text: '',
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          isSent: true,
          replyTo: replyToData,
          pdf: pdfData,
        }
        newMessages.push(pdfMessage)
        
        // Call message service
        if (selectedContactId) {
          sendMessage({
            contactId: selectedContactId,
            pdf: pdfData,
            repliedTo: replyToData,
          }).catch((error) => {
            console.error('Failed to send PDF message:', error)
          })
        }
        
        baseTimestamp += 1
      }

      // Send video as a separate message
      if (videoData) {
        const videoMessage = {
          id: `m${baseTimestamp}`,
          text: '',
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
          isSent: true,
          replyTo: replyToData,
          video: videoData,
        }
        newMessages.push(videoMessage)
        
        // Call message service
        if (selectedContactId) {
          sendMessage({
            contactId: selectedContactId,
            video: videoData,
            repliedTo: replyToData,
          }).catch((error) => {
            console.error('Failed to send video message:', error)
          })
        }
      }

      // Add all messages at once
      if (newMessages.length > 0) {
        setMessages((prev) => ({
          ...prev,
          [selectedContactId]: [...(prev[selectedContactId] || []), ...newMessages],
        }))
      }

      setMessageInput('')
      setReplyingToMessage(null)
      setAttachedPdf(null)
      setAttachedVideo(null)
      setAttachedImages([])
      setTextareaHeight(36)
      
      // Clear draft from localStorage
      if (selectedContactId) {
        messageDraftStorage.removeDraft(selectedContactId)
        updateDraftsState()
      }
    }

    createMessages()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleFileButtonClick()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedContactId) return

    // Capture the contact ID at the time of file selection to ensure it's saved to the correct contact
    const contactIdAtSelection = selectedContactId

    // Check if it's a PDF - store it instead of auto-sending
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Only set PDF if we're still on the same contact (prevent leaks to other conversations)
      if (selectedContactId === contactIdAtSelection) {
        setAttachedPdf(file)
        // Make input multi-line
        setTextareaHeight(60)
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Check if it's an image - store it instead of auto-sending
    if (file.type.startsWith('image/')) {
      // Only add image if we're still on the same contact (prevent leaks to other conversations)
      if (selectedContactId === contactIdAtSelection) {
        setAttachedImages((prev) => {
          const updated = [...prev, file]
          return updated
        })
        // Make input multi-line if not already
        if (textareaHeight <= 36) {
          setTextareaHeight(60)
        }
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Auto-submit other files
    const newMessage: Message = {
      id: `m${Date.now()}`,
      text: `📎 ${file.name}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      isSent: true,
    }

    setMessages((prev) => ({
      ...prev,
      [selectedContactId]: [...(prev[selectedContactId] || []), newMessage],
    }))

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    // Capture the contact ID at the time of file selection to ensure it's saved to the correct contact
    const contactIdAtSelection = selectedContactId
    if (!files || !contactIdAtSelection) return

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length > 0) {
      // Only add images if we're still on the same contact (prevent leaks to other conversations)
      if (selectedContactId === contactIdAtSelection) {
        setAttachedImages((prev) => {
          const updated = [...prev, ...imageFiles]
          return updated
        })
        // Make input multi-line if not already
        if (textareaHeight <= 36) {
          setTextareaHeight(60)
        }
      }
    }

    // Reset image input
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      if (updated.length === 0 && !attachedPdf && !attachedVideo && !replyingToMessage) {
        setTextareaHeight(36)
      }
      // Update draft to remove images
      if (selectedContactId) {
        messageDraftStorage.saveDraft(selectedContactId, messageInput, attachedPdf, updated, attachedVideo)
        updateDraftsState()
      }
      return updated
    })
  }

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedContactId) return

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setAttachedPdf(file)
      // Make input multi-line
      setTextareaHeight(60)
    }

    // Reset PDF input
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ''
    }
  }

  const handleRemovePdf = () => {
    setAttachedPdf(null)
    setTextareaHeight(36)
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ''
    }
    // Update draft to remove PDF
    if (selectedContactId) {
      messageDraftStorage.saveDraft(selectedContactId, messageInput, null, attachedImages, attachedVideo)
      updateDraftsState()
    }
  }

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedContactId) return

    // Check if it's an MP4 video
    if (file.type === 'video/mp4' || file.name.endsWith('.mp4')) {
      setAttachedVideo(file)
      setTextareaHeight(60)
      // Reset file input
      if (videoInputRef.current) {
        videoInputRef.current.value = ''
      }
    }
  }

  const handleRemoveVideo = () => {
    setAttachedVideo(null)
    setTextareaHeight(36)
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
    // Update draft to remove video
    if (selectedContactId) {
      messageDraftStorage.saveDraft(selectedContactId, messageInput, attachedPdf, attachedImages, null)
      updateDraftsState()
    }
  }

  const handleDownloadVideo = () => {
    if (!attachedVideo) return

    // Create a blob URL from the file and trigger download
    const url = URL.createObjectURL(attachedVideo)
    const link = document.createElement('a')
    link.href = url
    link.download = attachedVideo.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleVideoPreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDownloadVideo()
    }
  }

  const handleDownloadMessageVideo = (video: { name: string; data: string; type: string; size: number } | undefined) => {
    if (!video) return
    const byteString = atob(video.data.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: video.type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = video.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleMessageVideoPreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, video: { name: string; data: string; type: string; size: number } | undefined) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDownloadMessageVideo(video)
    }
  }

  // Handle drag and drop for files
  const handleDragEnter = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragCounter((prev) => prev + 1)
    if (event.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true)
    }
  }, [])

  const handleDragLeave = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragCounter((prev) => {
      const newCount = prev - 1
      if (newCount === 0) {
        setIsDraggingOver(false)
      }
      return newCount
    })
  }, [])

  const handleDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer.types.includes('Files')) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
    setDragCounter(0)

    if (!selectedContactId) return

    const files = Array.from(event.dataTransfer.files)
    if (files.length === 0) return

    // Separate PDFs, videos, and images
    const pdfFiles = files.filter(
      (file) => file.type === 'application/pdf' || file.name.endsWith('.pdf')
    )
    const videoFiles = files.filter(
      (file) => file.type === 'video/mp4' || file.name.endsWith('.mp4')
    )
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))

    // Handle PDF (only one PDF can be attached)
    if (pdfFiles.length > 0) {
      const pdfFile = pdfFiles[0]
      setAttachedPdf(pdfFile)
      setTextareaHeight(60)
    }

    // Handle video (only one video can be attached)
    if (videoFiles.length > 0) {
      const videoFile = videoFiles[0]
      setAttachedVideo(videoFile)
      setTextareaHeight(60)
    }

    // Handle images (multiple images can be attached)
    if (imageFiles.length > 0) {
      setAttachedImages((prev) => {
        const updated = [...prev, ...imageFiles]
        return updated
      })
      if (textareaHeight <= 36) {
        setTextareaHeight(60)
      }
    }
  }, [selectedContactId, textareaHeight])

  const handleDownloadPdf = () => {
    if (!attachedPdf) return

    // Create a blob URL from the file and trigger download
    const url = URL.createObjectURL(attachedPdf)
    const link = document.createElement('a')
    link.href = url
    link.download = attachedPdf.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePdfPreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDownloadPdf()
    }
  }

  const handleDownloadImage = (image: File) => {
    // Create a blob URL from the file and trigger download
    const url = URL.createObjectURL(image)
    const link = document.createElement('a')
    link.href = url
    link.download = image.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImagePreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, image: File) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDownloadImage(image)
    }
  }

  const handleDownloadMessagePdf = (pdf: Message['pdf']) => {
    if (!pdf || !pdf.data) return

    // Convert base64 to blob and download
    const byteString = atob(pdf.data.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: pdf.type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = pdf.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleMessagePdfPreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, pdf: Message['pdf']) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDownloadMessagePdf(pdf)
    }
  }

  const handleDeleteMessageImage = (messageId: string, imageIndex: number) => {
    setMessages((prev) => {
      const updated = { ...prev }
      if (updated[selectedContactId!]) {
        updated[selectedContactId!] = updated[selectedContactId!].map((msg) => {
          if (msg.id === messageId && msg.images) {
            const updatedImages = msg.images.filter((_, i) => i !== imageIndex)
            return {
              ...msg,
              images: updatedImages.length > 0 ? updatedImages : undefined,
            }
          }
          return msg
        })
      }
      return updated
    })
  }

  const handleDeleteMessagePdf = (messageId: string) => {
    setMessages((prev) => {
      const updated = { ...prev }
      if (updated[selectedContactId!]) {
        updated[selectedContactId!] = updated[selectedContactId!].map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              pdf: undefined,
            }
          }
          return msg
        })
      }
      return updated
    })
  }

  const handleDeleteMessageVideo = (messageId: string) => {
    setMessages((prev) => {
      const updated = { ...prev }
      if (updated[selectedContactId!]) {
        updated[selectedContactId!] = updated[selectedContactId!].map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              video: undefined,
            }
          }
          return msg
        })
      }
      return updated
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  const formatTime = (timestamp: string) => {
    return timestamp
  }

  const parseTimeToMinutes = (timeString: string): number => {
    // Parse time string like "2:30 PM" or "14:30"
    const match = timeString.match(/(\d+):(\d+)\s*(AM|PM)?/i)
    if (!match) return 0

    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const period = match[3]?.toUpperCase()

    if (period === 'PM' && hours !== 12) {
      hours += 12
    } else if (period === 'AM' && hours === 12) {
      hours = 0
    }

    return hours * 60 + minutes
  }

  const getTimeDifferenceInMinutes = (time1: string, time2: string): number => {
    const minutes1 = parseTimeToMinutes(time1)
    const minutes2 = parseTimeToMinutes(time2)
    // Handle day rollover (e.g., 11:59 PM to 12:01 AM)
    if (minutes2 < minutes1) {
      return (24 * 60 - minutes1) + minutes2
    }
    return minutes2 - minutes1
  }

  const shouldShowTimestamp = (message: Message, index: number, messages: Message[]): boolean => {
    // Always show timestamp on the last message
    if (index === messages.length - 1) {
      return true
    }

    const nextMessage = messages[index + 1]
    if (!nextMessage) {
      return true
    }

    // Show timestamp if next message is from different sender
    if (nextMessage.isSent !== message.isSent) {
      return true
    }

    // Show timestamp if next message is more than 2 minutes away
    const timeDiff = getTimeDifferenceInMinutes(message.timestamp, nextMessage.timestamp)
    if (timeDiff > 2) {
      return true
    }

    // Don't show timestamp if next message is from same sender and within 2 minutes
    // (The timestamp will show on the last message of the group)
    return false
  }

  const isInSameGroup = (message: Message, index: number, messages: Message[]): boolean => {
    // Check if this message is part of the same group as the next message
    if (index === messages.length - 1) {
      return false
    }

    const nextMessage = messages[index + 1]
    if (!nextMessage) {
      return false
    }

    // Same group if same sender and within 2 minutes
    if (nextMessage.isSent !== message.isSent) {
      return false
    }

    const timeDiff = getTimeDifferenceInMinutes(message.timestamp, nextMessage.timestamp)
    return timeDiff <= 2
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex flex-col gap-2 mb-2 mt-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-[22px] font-semibold">Messages</h1>
              <p className="text-sm mt-1 mb-4">
                {filteredContacts.length} {filteredContacts.length === 1 ? 'conversation' : 'conversations'}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-9 absolute top-0 right-4 gap-2"
                aria-label="Broadcast"
              >
                <RadioTower className="h-4 w-4" />
                Broadcast
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                Coming soon!
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="relative w-[250px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
                aria-label="Search messages"
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 h-9"
                    aria-label="Sort messages"
                  >
                    <ChevronDown className="size-4" />
                    Sort: {sortFilter === 'all' ? 'All' : sortFilter === 'unread' ? 'Unread' : sortFilter === 'read' ? 'Read' : 'Oldest'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={sortFilter} onValueChange={setSortFilter}>
                    <DropdownMenuRadioItem value="unread" className={cn(sortFilter === "unread" && "bg-accent")}>
                      Unread
                      {sortFilter === "unread" && <Check className="ml-2 size-4" />}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="read" className={cn(sortFilter === "read" && "bg-accent")}>
                      Read
                      {sortFilter === "read" && <Check className="ml-2 size-4" />}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="oldest" className={cn(sortFilter === "oldest" && "bg-accent")}>
                      Oldest
                      {sortFilter === "oldest" && <Check className="ml-2 size-4" />}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="all" className={cn(sortFilter === "all" && "bg-accent")}>
                      All
                      {sortFilter === "all" && <Check className="ml-2 size-4" />}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setIsNewMessageOpen(true)}
                className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90"
                aria-label="New message"
              >
                <MessageCirclePlus className="size-4" />
                New message
              </Button>
            </div>
          </div>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-hidden">
        <div className="h-full w-full flex">
          {/* Left Column - Athletes Table */}
          <div className="flex-[1.5] bg-background h-full overflow-y-auto">
            <div className="mt-[1px]">
              <Table className="table-fixed border-separate border-spacing-0" style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: "100%" }} />
                </colgroup>
                <TableHeader className="sticky top-0 z-20">
                  <TableRow className="hover:bg-transparent h-10">
                    <TableHead className="!px-4 !py-0 h-10 border-b bg-background">
                      <div className="flex items-center gap-3 h-full w-full">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
                              <User className="size-3 text-muted-foreground" />
                              <span className="text-xs uppercase text-muted-foreground">Athlete</span>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem>
                              <ArrowUpNarrowWide className="size-4 mr-2" />
                              <span className="flex-1">Sort ascending</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ArrowDownWideNarrow className="size-4 mr-2" />
                              <span className="flex-1">Sort descending</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAthletes
                    .filter((athlete) => {
                      if (!searchQuery.trim()) return true
                      const query = searchQuery.toLowerCase()
                      return athlete.name.toLowerCase().includes(query)
                    })
                    .map((athlete) => {
                      const isSelected = selectedContactId === athlete.id
                      const initials = athlete.name
                        .split(" ")
                        .map((part) => part.charAt(0).toUpperCase())
                        .slice(0, 2)
                        .join("")

                      return (
                        <TableRow
                          key={athlete.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open conversation with ${athlete.name}`}
                          onClick={() => {
                            // Find or create contact for this athlete
                            let contact = mockContacts.find((c) => c.id === athlete.id)
                            if (!contact) {
                              // Create a contact from athlete data
                              contact = {
                                id: athlete.id,
                                name: athlete.name,
                                avatar: athlete.avatar,
                                lastMessage: "",
                                timestamp: "",
                                unreadCount: 0,
                                isOnline: false,
                              }
                            }
                            router.push(`/messaging/${contact.id}`)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              let contact = mockContacts.find((c) => c.id === athlete.id)
                              if (!contact) {
                                contact = {
                                  id: athlete.id,
                                  name: athlete.name,
                                  avatar: athlete.avatar,
                                  lastMessage: "",
                                  timestamp: "",
                                  unreadCount: 0,
                                  isOnline: false,
                                }
                              }
                              router.push(`/messaging/${contact.id}`)
                            }
                          }}
                          className={cn(
                            isSelected && "bg-muted/50",
                            "cursor-pointer !h-[54px] group",
                            "[&:hover_td]:bg-muted"
                          )}
                          style={isSelected ? { backgroundColor: "hsl(var(--muted) / 0.5)" } : undefined}
                        >
                           <TableCell 
                             className={cn(
                               "!px-4 !h-[54px] align-middle !w-full border-b",
                               isSelected ? "!bg-muted" : "group-hover:!bg-muted !bg-background"
                             )}
                           >
                            <div className="flex items-center gap-3 h-full w-full">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={athlete.avatar} alt={athlete.name} />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm truncate flex-1 min-w-0">{athlete.name}</span>
                              {hasDraft(athlete.id) && (
                                <span className="font-medium text-muted-foreground flex-shrink-0 border border-muted-foreground/30 rounded px-1.5 py-0.5" style={{ fontSize: '12px' }} aria-label="Draft message">
                                  DRAFT
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
          <Separator orientation="vertical" />
          {/* Middle Column - Chat */}
          <div 
            className="relative flex-[4] h-full"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag and Drop Overlay */}
            {isDraggingOver && selectedContactId && (
              <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                <div className="text-center px-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="h-8 w-8" />
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        Drop your PDFs, videos or images here
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Files will be added to the message composer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="h-full overflow-y-auto flex flex-col">
          {selectedContact ? (
            <>
              {/* Message Header */}
              <div className="flex items-center justify-between px-4 h-[40.8px] border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate mb-[1px]">{selectedContact.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/athletes/${selectedContact.id}/training-calendar`)}
                    className="gap-2 h-7 text-xs"
                    aria-label="View training calendar"
                  >
                    <Dumbbell className="size-3" />
                    Training
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/athletes/${selectedContact.id}/overview`)}
                    className="gap-2 h-7 text-xs"
                    aria-label="View profile"
                  >
                    <User className="size-3" />
                    Profile
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Archive functionality - placeholder
                    }}
                    className="gap-2 h-7 text-xs"
                    aria-label="Archive conversation"
                  >
                    <Archive className="size-3" />
                    Archive
                  </Button>
                </div>
              </div>

              {/* Messages List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="flex flex-col px-4 pt-4">
                  {currentMessages.map((message, index) => {
                    const isLastInSequence =
                      index === currentMessages.length - 1 ||
                      currentMessages[index + 1]?.isSent !== message.isSent

                    const showTimestamp = shouldShowTimestamp(message, index, currentMessages)
                    const inSameGroup = isInSameGroup(message, index, currentMessages)

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex flex-col relative',
                          message.isSent ? 'items-end' : 'items-start',
                          inSameGroup ? 'mb-1' : 'mb-4'
                        )}
                      >
                        {/* Images Preview */}
                        {message.images && message.images.length > 0 && (
                          <div 
                            className={cn(
                              'mb-2 max-w-[80%] px-2 bg-background/50 rounded-lg relative group',
                              message.isSent ? 'items-end' : 'items-start'
                            )}
                            style={{ borderRadius: '18px' }}
                          >
                            <div className="flex gap-2 overflow-x-auto">
                              {message.images.map((image, imageIndex) => (
                                <div 
                                  key={imageIndex} 
                                  className="relative flex-shrink-0"
                                >
                                  <div
                                    className="cursor-pointer"
                                    onClick={() => {
                                      // Download image
                                      const byteString = atob(image.data.split(',')[1])
                                      const ab = new ArrayBuffer(byteString.length)
                                      const ia = new Uint8Array(ab)
                                      for (let i = 0; i < byteString.length; i++) {
                                        ia[i] = byteString.charCodeAt(i)
                                      }
                                      const blob = new Blob([ab], { type: image.type })
                                      const url = URL.createObjectURL(blob)
                                      const link = document.createElement('a')
                                      link.href = url
                                      link.download = image.name
                                      document.body.appendChild(link)
                                      link.click()
                                      document.body.removeChild(link)
                                      URL.revokeObjectURL(url)
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Download ${image.name}`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        // Download image
                                        const byteString = atob(image.data.split(',')[1])
                                        const ab = new ArrayBuffer(byteString.length)
                                        const ia = new Uint8Array(ab)
                                        for (let i = 0; i < byteString.length; i++) {
                                          ia[i] = byteString.charCodeAt(i)
                                        }
                                        const blob = new Blob([ab], { type: image.type })
                                        const url = URL.createObjectURL(blob)
                                        const link = document.createElement('a')
                                        link.href = url
                                        link.download = image.name
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                        URL.revokeObjectURL(url)
                                      }
                                    }}
                                  >
                                    <div className="bg-muted rounded-lg p-1.5 hover:bg-muted/80 transition-colors">
                                      <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-md">
                                        <img
                                          src={image.data}
                                          alt={image.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className={cn(
                              'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1',
                              message.isSent ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2'
                            )}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                      aria-label="Reply"
                                      onClick={() => {
                                        setReplyingToMessage(message)
                                        setTextareaHeight(60)
                                        setTimeout(() => {
                                          textareaRef.current?.focus()
                                        }, 100)
                                      }}
                                    >
                                      <Reply className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reply</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {message.isSent && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                      aria-label="Delete images"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={message.isSent ? "end" : "start"}>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setMessages((prev) => {
                                          const updated = { ...prev }
                                          if (updated[selectedContactId!]) {
                                            updated[selectedContactId!] = updated[selectedContactId!].map((msg) => {
                                              if (msg.id === message.id) {
                                                return {
                                                  ...msg,
                                                  images: undefined,
                                                }
                                              }
                                              return msg
                                            })
                                          }
                                          return updated
                                        })
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete all images
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        )}
                        {/* PDF Preview */}
                        {message.pdf && (
                          <div 
                            className={cn(
                              'mb-2 max-w-[80%] px-3 py-2 bg-background/50 rounded-lg border relative group',
                              message.isSent ? 'items-end' : 'items-start'
                            )}
                            style={{ borderRadius: '18px' }}
                          >
                            <div 
                              role="button"
                              tabIndex={0}
                              aria-label={`Download ${message.pdf.name}`}
                              onClick={() => handleDownloadMessagePdf(message.pdf)}
                              onKeyDown={(e) => handleMessagePdfPreviewKeyDown(e, message.pdf)}
                              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {message.pdf.name}
                                </p>
                                <p className="text-xs text-muted-foreground">PDF</p>
                              </div>
                            </div>
                            <div className={cn(
                              'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1',
                              message.isSent ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2'
                            )}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                      aria-label="Reply"
                                      onClick={() => {
                                        setReplyingToMessage(message)
                                        setTextareaHeight(60)
                                        setTimeout(() => {
                                          textareaRef.current?.focus()
                                        }, 100)
                                      }}
                                    >
                                      <Reply className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reply</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {message.isSent && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                      aria-label="Delete PDF"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={message.isSent ? "end" : "start"}>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        handleDeleteMessagePdf(message.id)
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Video Preview */}
                        {message.video && (
                          <div 
                            className={cn(
                              'mb-2 max-w-[80%] px-3 py-2 bg-background/50 rounded-lg border relative group',
                              message.isSent ? 'items-end' : 'items-start'
                            )}
                            style={{ borderRadius: '18px' }}
                          >
                            <div 
                              role="button"
                              tabIndex={0}
                              aria-label={`Download ${message.video?.name || 'video'}`}
                              onClick={() => message.video && handleDownloadMessageVideo(message.video)}
                              onKeyDown={(e) => message.video && handleMessageVideoPreviewKeyDown(e, message.video)}
                              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                <Video className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {message.video?.name || 'Video'}
                                </p>
                                <p className="text-xs text-muted-foreground">MP4</p>
                              </div>
                            </div>
                            <div className={cn(
                              'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1',
                              message.isSent ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2'
                            )}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                      aria-label="Reply"
                                      onClick={() => {
                                        setReplyingToMessage(message)
                                        setTextareaHeight(60)
                                        setTimeout(() => {
                                          textareaRef.current?.focus()
                                        }, 100)
                                      }}
                                    >
                                      <Reply className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reply</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {message.isSent && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                      aria-label="Delete video"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={message.isSent ? "end" : "start"}>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        handleDeleteMessageVideo(message.id)
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Message Bubble - show if there's text */}
                        {message.text.trim() && (
                        <div
                          className={cn(
                            'max-w-[80%] rounded-xl px-2 py-2 relative group',
                            message.isSent
                              ? 'bg-primary/20 text-foreground'
                              : 'bg-muted text-foreground',
                            isLastInSequence && message.isSent && 'rounded-br-sm',
                            isLastInSequence && !message.isSent && 'rounded-bl-sm'
                          )}
                        >
                          <div className={cn(
                            'absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1',
                            message.isSent ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2',
                            openDeleteMenuId === message.id && 'opacity-100'
                          )}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                    aria-label="Reply"
                                    onClick={() => {
                                      setReplyingToMessage(message)
                                      // Force textarea to be multi-line
                                      setTextareaHeight(60)
                                      // Focus the textarea after a brief delay
                                      setTimeout(() => {
                                        textareaRef.current?.focus()
                                      }, 100)
                                    }}
                                  >
                                    <Reply className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                            <TooltipContent>
                              <p>Reply</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {message.isSent && (
                          <DropdownMenu
                            open={openDeleteMenuId === message.id}
                            onOpenChange={(open) => {
                              setOpenDeleteMenuId(open ? message.id : null)
                            }}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 data-[state=open]:bg-gray-200 dark:data-[state=open]:bg-white/10"
                                aria-label="Delete message"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={message.isSent ? "end" : "start"}>
                              <DropdownMenuItem
                                onClick={() => {
                                  // Delete message functionality
                                  setMessages((prev) => {
                                    const updated = { ...prev }
                                    if (updated[selectedContactId!]) {
                                      updated[selectedContactId!] = updated[selectedContactId!].filter(
                                        (msg) => msg.id !== message.id
                                      )
                                    }
                                    return updated
                                  })
                                  // Clear draft if this was the last message or if we're deleting a draft
                                  if (selectedContactId) {
                                    const currentMessages = messages[selectedContactId] || []
                                    if (currentMessages.length === 1) {
                                      // If this is the only message, clear the draft
                                      messageDraftStorage.removeDraft(selectedContactId)
                                      updateDraftsState()
                                    }
                                  }
                                  setOpenDeleteMenuId(null)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                          </div>
                          {message.replyTo && (
                            <div className={cn(
                              "mb-2 px-1.5 py-1.5 rounded-[10px] border-l-4",
                              message.isSent
                                ? message.replyTo.isSent
                                  ? "bg-primary/15 border-primary"
                                  : "bg-primary/15 border-muted"
                                : "bg-background/50 border-muted"
                            )}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Reply className={cn(
                                  "h-3 w-3 flex-shrink-0",
                                  "text-muted-foreground"
                                )} />
                                <span className={cn(
                                  "text-xs font-semibold",
                                  "text-foreground"
                                )}>
                                  {message.replyTo.isSent ? 'Yourself' : selectedContact?.name || 'user'}
                                </span>
                              </div>
                              {message.replyTo.images && message.replyTo.images.length > 0 && (
                                <div className="flex gap-1 mb-1 overflow-x-auto">
                                  {message.replyTo.images.slice(0, 3).map((image, index) => (
                                    <div key={index} className="flex-shrink-0">
                                      <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-md bg-muted">
                                        <img
                                          src={image.data}
                                          alt={image.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                  {message.replyTo.images.length > 3 && (
                                    <div className="w-10 h-10 flex items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                                      +{message.replyTo.images.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                              {message.replyTo.pdf && (
                                <div className="flex items-center gap-1.5 mb-1">
                                  <FileText className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                  <span className="text-xs text-foreground/80 truncate">
                                    {message.replyTo.pdf.name}
                                  </span>
                                </div>
                              )}
                              {message.replyTo.video && (
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Video className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                  <span className="text-xs text-foreground/80 truncate">
                                    {message.replyTo.video.name}
                                  </span>
                                </div>
                              )}
                              {message.replyTo.text && (
                                <p className={cn(
                                  "text-xs line-clamp-2 truncate",
                                  "text-foreground/80"
                                )}>
                                  {message.replyTo.text}
                                </p>
                              )}
                            </div>
                          )}
                          {message.text.trim() && (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                          )}
                          {isLastInSequence && (
                            <>
                              {message.isSent ? (
                                <div
                                  className="absolute -bottom-1 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-r-0"
                                  style={{
                                    borderTop: '8px solid hsl(var(--primary) / 0.2)',
                                  }}
                                />
                              ) : (
                                <div
                                  className="absolute -bottom-1 left-0 w-0 h-0"
                                  style={{
                                    borderRight: '8px solid transparent',
                                    borderTop: '8px solid hsl(var(--muted))',
                                    borderLeft: '0 solid transparent',
                                  }}
                                />
                              )}
                            </>
                          )}
                        </div>
                        )}
                        {showTimestamp && (
                          <p
                            className={cn(
                              'text-xs mt-1 text-muted-foreground',
                              message.isSent ? 'text-right' : 'text-left'
                            )}
                          >
                            {formatTime(message.timestamp)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="px-4 pb-4 pt-4 flex-shrink-0">
                <div
                  className={cn(
                    'relative flex bg-muted px-3 py-2 transition-all duration-700 ease-in-out',
                    textareaHeight > 36 || replyingToMessage || attachedPdf || attachedVideo || attachedImages.length > 0
                      ? 'flex-col' 
                      : 'items-center'
                  )}
                  style={{ borderRadius: '28px' }}
                >
                  {/* Images Preview */}
                  {attachedImages.length > 0 && (
                    <div className="mb-2 px-3 py-2 bg-background/50" style={{ borderRadius: '18px' }}>
                      <div className="flex gap-2 overflow-x-auto">
                        {attachedImages.map((image, index) => (
                          <div key={index} className="relative group flex-shrink-0">
                            <div
                              role="button"
                              tabIndex={0}
                              aria-label={`Download ${image.name}`}
                              onClick={() => handleDownloadImage(image)}
                              onKeyDown={(e) => handleImagePreviewKeyDown(e, image)}
                              className="bg-muted rounded-lg p-1.5 cursor-pointer hover:bg-muted/80 transition-colors"
                            >
                              <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-md">
                                <img
                                  src={URL.createObjectURL(image)}
                                  alt={image.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute -top-1 -right-1 h-5 w-5 bg-background border border-border hover:bg-destructive hover:text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveImage(index)
                              }}
                              aria-label={`Remove ${image.name}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleRemoveImage(index)
                                }
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {attachedPdf && (
                    <div className="mb-2 px-3 py-2 bg-background/50" style={{ borderRadius: '18px' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          role="button"
                          tabIndex={0}
                          aria-label={`Download ${attachedPdf.name}`}
                          onClick={handleDownloadPdf}
                          onKeyDown={handlePdfPreviewKeyDown}
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {attachedPdf.name}
                            </p>
                            <p className="text-xs text-muted-foreground">PDF</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={handleRemovePdf}
                          aria-label="Remove PDF"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {attachedVideo && (
                    <div className="mb-2 px-3 py-2 bg-background/50" style={{ borderRadius: '18px' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          role="button"
                          tabIndex={0}
                          aria-label={`Download ${attachedVideo.name}`}
                          onClick={handleDownloadVideo}
                          onKeyDown={handleVideoPreviewKeyDown}
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                            <Video className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {attachedVideo.name}
                            </p>
                            <p className="text-xs text-muted-foreground">MP4</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={handleRemoveVideo}
                          aria-label="Remove video"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {replyingToMessage && (
                    <div className="mb-2 px-3 py-2 bg-background/50" style={{ borderRadius: '18px' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Reply className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs font-semibold text-foreground">
                              {replyingToMessage.isSent ? 'Yourself' : selectedContact?.name || 'user'}
                            </span>
                          </div>
                          {replyingToMessage.images && replyingToMessage.images.length > 0 && (
                            <div className="flex gap-1.5 mb-1.5 overflow-x-auto">
                              {replyingToMessage.images.slice(0, 3).map((image, index) => (
                                <div key={index} className="flex-shrink-0">
                                  <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-md bg-muted">
                                    <img
                                      src={image.data}
                                      alt={image.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                </div>
                              ))}
                              {replyingToMessage.images.length > 3 && (
                                <div className="w-12 h-12 flex items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                                  +{replyingToMessage.images.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          {replyingToMessage.pdf && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <FileText className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                              <span className="text-xs text-foreground truncate">
                                {replyingToMessage.pdf.name}
                              </span>
                            </div>
                          )}
                          {replyingToMessage.video && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <Video className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                              <span className="text-xs text-foreground truncate">
                                {replyingToMessage.video.name}
                              </span>
                            </div>
                          )}
                          {replyingToMessage.text && (
                            <p className="text-sm text-foreground line-clamp-2 truncate">
                              {replyingToMessage.text}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => {
                            setReplyingToMessage(null)
                            setTextareaHeight(36)
                          }}
                          aria-label="Cancel reply"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    aria-label="Upload file"
                    accept="*/*"
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleImageChange}
                    aria-label="Upload image"
                    accept="image/*"
                    multiple
                  />
                  <input
                    ref={pdfInputRef}
                    type="file"
                    className="hidden"
                    onChange={handlePdfChange}
                    aria-label="Upload PDF"
                    accept=".pdf"
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleVideoChange}
                    aria-label="Upload video"
                    accept="video/mp4,.mp4"
                  />
                  {(!textareaHeight || textareaHeight <= 36) && !replyingToMessage && !attachedPdf && !attachedVideo && attachedImages.length === 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <DropdownMenu>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                aria-label="Attach file"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => imageInputRef.current?.click()}
                            >
                              <ImageIcon className="mr-2 size-4" />
                              Images
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => pdfInputRef.current?.click()}
                            >
                              <FileText className="mr-2 size-4" />
                              PDFs
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => videoInputRef.current?.click()}
                            >
                              <Video className="mr-2 size-4" />
                              Videos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <TooltipContent>
                          <p>Attach files</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                  <Textarea
                    ref={textareaRef}
                    placeholder="Type, dictate or upload a file..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "flex-1 min-w-0 resize-none min-h-[36px] max-h-[120px] py-2 bg-muted dark:bg-muted border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none focus-visible:bg-muted dark:focus-visible:bg-muted",
                      textareaHeight > 36 && "pr-10"
                    )}
                    aria-label="Type a message"
                    rows={1}
                  />
                  {(textareaHeight > 36 || replyingToMessage || attachedPdf || attachedVideo) ? (
                    <>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <TooltipProvider>
                          <Tooltip>
                            <DropdownMenu>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-200 dark:hover:bg-white/10"
                                    aria-label="Attach file"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onClick={() => imageInputRef.current?.click()}
                                >
                                  <ImageIcon className="mr-2 size-4" />
                                  Images
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => pdfInputRef.current?.click()}
                                >
                                  <FileText className="mr-2 size-4" />
                                  PDFs
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => videoInputRef.current?.click()}
                                >
                                  <Video className="mr-2 size-4" />
                                  Videos
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <TooltipContent>
                              <p>Attach files</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {(messageInput.trim() || attachedPdf || attachedVideo || attachedImages.length > 0) ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={handleSendMessage}
                                  className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90 h-8 w-8 p-0 rounded-full"
                                  aria-label="Send message"
                                >
                                  <ArrowUp className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Send message</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={handleSendMessage}
                                  className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90 h-8 w-8 p-0 rounded-full"
                                  aria-label="Send message"
                                >
                                  <ArrowUp className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Send message</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </>
                  ) : (
                    (messageInput.trim() || attachedPdf) ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleSendMessage}
                              className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90 h-8 w-8 p-0 rounded-full"
                              aria-label="Send message"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send message</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleSendMessage}
                              className="gap-2 !bg-[#3f3c39] dark:!bg-foreground !text-background [&_svg]:!text-background hover:!bg-[#4a4642] dark:hover:!bg-foreground/90 h-8 w-8 p-0 rounded-full"
                              aria-label="Send message"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send message</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  Select an athlete to continue messaging or start a new chat
                </p>
              </div>
            </div>
          )}
            </div>
          </div>
          <Separator orientation="vertical" />
          {/* Right Column - Notes */}
          <div className="flex-[1.5] bg-background h-full overflow-y-auto">
            {selectedContact ? (
              <div className="p-4">
                <div className="flex flex-col items-center mb-3">
                  <Avatar className="h-16 w-16 mb-2">
                    <AvatarImage src={selectedContact.avatar} alt={selectedContact.name} />
                    <AvatarFallback>{getInitials(selectedContact.name)}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-sm">{selectedContact.name}</h3>
                </div>
                <div className="mb-3 -mx-4 w-[calc(100%+2rem)]">
                  <Separator className="w-full" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Notes</h2>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCreateNoteOpen(true)}
                    className="gap-2 h-8 text-xs"
                    aria-label="Create note"
                  >
                    <NotebookPen className="h-3 w-3" />
                    Create note
                  </Button>
                </div>
                <div className="space-y-3">
                  {notes.map((note) => (
                    <Card
                      key={note.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-accent py-0',
                        note.body ? 'h-[140px]' : 'h-auto'
                      )}
                      onClick={() => handleNoteClick(note)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View note: ${note.title}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleNoteClick(note)
                        }
                      }}
                    >
                      <CardContent className={cn('px-4 py-3 h-full flex flex-col', !note.body && 'h-auto')}>
                        <div className="space-y-2 flex-1 flex flex-col">
                          <div className="font-semibold text-sm">{note.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatNoteDate(note.updatedAt || note.createdAt)}
                          </div>
                          {note.body && (
                            <div className="text-sm text-muted-foreground line-clamp-3 overflow-hidden flex-1">
                              {note.body}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <SidePanel
        open={isNewMessageOpen}
        onOpenChange={setIsNewMessageOpen}
        title="New message"
      >
        <AssignAthletesList
          navigateOnSelect={false}
          onAthleteSelected={(athleteId) => {
            if (!athleteId) return
            // Find or create contact for this athlete
            let contact = mockContacts.find((c) => c.id === athleteId)
            if (!contact) {
              const athlete = mockAthletes.find((a) => a.id === athleteId)
              if (athlete) {
                contact = {
                  id: athlete.id,
                  name: athlete.name,
                  avatar: athlete.avatar,
                  lastMessage: "",
                  timestamp: "",
                  unreadCount: 0,
                  isOnline: false,
                }
              }
            }
            if (contact) {
              router.push(`/messaging/${contact.id}`)
              setIsNewMessageOpen(false)
            }
          }}
        />
      </SidePanel>
      <SidePanel
        open={isCreateNoteOpen}
        onOpenChange={setIsCreateNoteOpen}
        title="Create note"
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              onClick={() => {
                // TODO: Handle save note
                console.log('Note title:', noteTitle)
                console.log('Note content:', noteContent)
                setIsCreateNoteOpen(false)
                setNoteTitle('')
                setNoteContent('')
                setIsNoteEmpty(true)
              }}
              disabled={!noteTitle.trim()}
            >
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateNoteOpen(false)
                setNoteTitle('')
                setNoteContent('')
                setIsNoteEmpty(true)
              }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="note-title"
              ref={noteTitleInputRef}
              value={noteTitle}
              onChange={(e) => {
                setNoteTitle(e.target.value)
                setIsNoteEmpty(!e.target.value.trim())
              }}
              placeholder="Enter note title..."
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <Label htmlFor="note-body">Body</Label>
            <Textarea
              id="note-body"
              ref={noteTextareaRef}
              value={noteContent}
              onChange={(e) => {
                setNoteContent(e.target.value)
              }}
              placeholder="Write your note here..."
              className="flex-1 resize-none"
            />
          </div>
        </div>
      </SidePanel>
      <SidePanel
        open={isViewNoteOpen}
        onOpenChange={setIsViewNoteOpen}
        title="View note"
        footer={
          <div className="flex w-full justify-start gap-2">
            <Button
              onClick={handleSaveNote}
              disabled={!hasNoteChanges}
            >
              Save
            </Button>
            <DropdownMenu open={isDeleteNoteMenuOpen} onOpenChange={setIsDeleteNoteMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  aria-label="Delete note"
                >
                  Delete
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-40">
                <DropdownMenuItem
                  onClick={handleDeleteNote}
                  aria-label="Delete note"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={handleCancelNoteEdit}
            >
              Cancel
            </Button>
          </div>
        }
      >
        {selectedNote && (
          <div className="flex-1 flex flex-col min-h-0 gap-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span>Created at {formatNoteDate(selectedNote.createdAt)}</span>
                {selectedNote.updatedAt && (
                  <>
                    <span>•</span>
                    <span>Updated at {formatNoteDate(selectedNote.updatedAt)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-note-title">Title</Label>
              <Input
                id="view-note-title"
                value={editingNoteTitle}
                onChange={(e) => setEditingNoteTitle(e.target.value)}
                placeholder="Enter note title..."
                autoFocus={false}
                tabIndex={0}
              />
            </div>
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <Label htmlFor="view-note-body">Body</Label>
              <Textarea
                id="view-note-body"
                value={editingNoteBody}
                onChange={(e) => setEditingNoteBody(e.target.value)}
                placeholder="Write your note here..."
                className="flex-1 resize-none"
                autoFocus={false}
                tabIndex={0}
              />
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  )
}

export default MessagingPage


