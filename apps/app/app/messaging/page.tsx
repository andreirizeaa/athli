'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Send, MoreHorizontal, Paperclip, RadioTower, X, Filter } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { mockContacts, mockMessages, type Contact, type Message } from '@/components/app/app-shell'

const MessagingPage = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [messageInput, setMessageInput] = React.useState('')
  const [messages, setMessages] = React.useState<Record<string, Message[]>>(mockMessages)
  const [isBroadcastOpen, setIsBroadcastOpen] = React.useState(false)
  const [broadcastSearchQuery, setBroadcastSearchQuery] = React.useState('')
  const [selectedBroadcastContacts, setSelectedBroadcastContacts] = React.useState<string[]>([])
  const [broadcastMessageInput, setBroadcastMessageInput] = React.useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const broadcastFileInputRef = React.useRef<HTMLInputElement>(null)
  const broadcastTextareaRef = React.useRef<HTMLTextAreaElement>(null)

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

  const filteredBroadcastContacts = React.useMemo(() => {
    if (!broadcastSearchQuery.trim()) return mockContacts
    const query = broadcastSearchQuery.toLowerCase()
    return mockContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.lastMessage.toLowerCase().includes(query)
    )
  }, [broadcastSearchQuery])

  const allSentMessages = React.useMemo(() => {
    const sentMessages: Message[] = []
    Object.values(messages).forEach((contactMessages) => {
      contactMessages
        .filter((msg) => msg.isSent)
        .forEach((msg) => sentMessages.push(msg))
    })
    return sentMessages
  }, [messages])

  const handleBroadcastContactToggle = (contactId: string) => {
    setSelectedBroadcastContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleSelectAllBroadcastContacts = () => {
    if (selectedBroadcastContacts.length === filteredBroadcastContacts.length) {
      setSelectedBroadcastContacts([])
    } else {
      setSelectedBroadcastContacts(filteredBroadcastContacts.map((contact) => contact.id))
    }
  }

  const handleBroadcastSendMessage = () => {
    if (!broadcastMessageInput.trim() || selectedBroadcastContacts.length === 0) return

    // Send message to all selected contacts
    const newMessages: Record<string, Message[]> = { ...messages }
    const newMessage: Message = {
      id: `m${Date.now()}`,
      text: broadcastMessageInput,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      isSent: true,
    }

    selectedBroadcastContacts.forEach((contactId) => {
      if (!newMessages[contactId]) {
        newMessages[contactId] = []
      }
      newMessages[contactId] = [...newMessages[contactId], newMessage]
    })

    setMessages(newMessages)
    setBroadcastMessageInput('')
  }

  const handleBroadcastKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleBroadcastSendMessage()
    }
  }

  const handleBroadcastFileButtonClick = () => {
    broadcastFileInputRef.current?.click()
  }

  const handleBroadcastFileButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleBroadcastFileButtonClick()
    }
  }

  const handleBroadcastFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || selectedBroadcastContacts.length === 0) return

    // Send file to all selected contacts
    const newMessages: Record<string, Message[]> = { ...messages }
    const newMessage: Message = {
      id: `m${Date.now()}`,
      text: `📎 ${file.name}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      isSent: true,
    }

    selectedBroadcastContacts.forEach((contactId) => {
      if (!newMessages[contactId]) {
        newMessages[contactId] = []
      }
      newMessages[contactId] = [...newMessages[contactId], newMessage]
    })

    setMessages(newMessages)

    if (broadcastFileInputRef.current) {
      broadcastFileInputRef.current.value = ''
    }
  }

  React.useEffect(() => {
    const textarea = broadcastTextareaRef.current
    if (textarea) {
      textarea.style.height = '36px'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 120
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [broadcastMessageInput])

  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentMessages])

  // Read contact ID from URL query params on mount
  React.useEffect(() => {
    let candidateContactId: string | null = null

    const contactIdFromUrl = searchParams.get('contact')
    if (contactIdFromUrl) {
      candidateContactId = contactIdFromUrl
    }

    if (!candidateContactId) {
      try {
        const storedContactId = window.sessionStorage.getItem('messagingSelectedContactId')
        if (storedContactId) {
          candidateContactId = storedContactId
        }
      } catch {
        // Ignore storage errors and fall back to empty selection
      }
    }

    if (candidateContactId) {
      const contactExists = mockContacts.some((contact) => contact.id === candidateContactId)

      if (contactExists) {
        setSelectedContactId(candidateContactId)
        try {
          window.sessionStorage.removeItem('messagingSelectedContactId')
        } catch {
          // Ignore storage errors
        }
      }
    }
  }, [searchParams])

  // Update URL query params when contact is selected
  React.useEffect(() => {
    if (selectedContactId) {
      const currentContact = searchParams.get('contact')
      if (currentContact !== selectedContactId) {
        router.replace(`/messaging?contact=${selectedContactId}`)
      }
    } else {
      const currentContact = searchParams.get('contact')
      if (currentContact) {
        router.replace('/messaging')
      }
    }
  }, [selectedContactId, searchParams, router])

  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = '36px'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 120
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [messageInput])

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedContactId) return

    const newMessage: Message = {
      id: `m${Date.now()}`,
      text: messageInput,
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

    setMessageInput('')
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

    // Auto-submit the file
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

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">Messages</h1>
          <Button
            onClick={() => setIsBroadcastOpen(true)}
            className="h-9 mb-2 mt-2"
            aria-label="Broadcast"
          >
            <RadioTower className="h-4 w-4 mr-2" />
            Broadcast
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-hidden px-4 py-4">
        <div className="h-full w-full flex gap-4 pr-4">
          {/* Contacts Container - 1/4 width */}
          <div className="w-1/4 h-full bg-sidebar rounded-lg overflow-hidden flex flex-col flex-shrink-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                  aria-label="Search contacts"
                />
              </div>
            </div>

            {/* Contacts List */}
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {filteredContacts.map((contact, index) => {
                  const isSelected = selectedContactId === contact.id
                  return (
                    <React.Fragment key={contact.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Open conversation with ${contact.name}`}
                        onClick={() => setSelectedContactId(contact.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedContactId(contact.id)
                          }
                        }}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50',
                          isSelected && 'bg-accent'
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={contact.avatar} alt={contact.name} />
                            <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          {contact.isOnline && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTime(contact.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-muted-foreground truncate">
                              {contact.lastMessage}
                            </p>
                            {contact.unreadCount && contact.unreadCount > 0 && (
                              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                {contact.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < filteredContacts.length - 1 && (
                        <div className="flex justify-center px-4">
                          <Separator className="w-[80%]" />
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Messages Container - 3/4 width */}
          <div className="w-3/4 h-full bg-sidebar rounded-lg overflow-hidden flex flex-col flex-shrink-0 min-w-0 p-4">
          {selectedContact ? (
            <>
              {/* Message Header */}
              <div className="flex items-center justify-between px-0 pb-1 border-b border-border flex-shrink-0 mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedContact.avatar} alt={selectedContact.name} />
                      <AvatarFallback>{getInitials(selectedContact.name)}</AvatarFallback>
                    </Avatar>
                    {selectedContact.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{selectedContact.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedContact.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          // Archive functionality - placeholder
                        }}
                      >
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          // Delete functionality - placeholder
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages List */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="flex flex-col gap-4 px-0">
                  {currentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex',
                        message.isSent ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-4 py-2',
                          message.isSent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                        <p
                          className={cn(
                            'text-xs mt-1',
                            message.isSent
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          )}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t border-border pt-4 mt-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    aria-label="Upload file"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleFileButtonClick}
                    onKeyDown={handleFileButtonKeyDown}
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Textarea
                    ref={textareaRef}
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 resize-none min-h-[36px] max-h-[120px] py-2"
                    aria-label="Type a message"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    disabled={!messageInput.trim()}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  Select a contact to start messaging
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent className="w-[70vw] max-w-[70vw] sm:max-w-[70vw] h-[80vh] flex flex-col" showCloseButton={false}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">Broadcast</DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 flex gap-4 overflow-hidden mt-4">
            {/* Contacts List - Left Side */}
            <div className="w-1/3 h-full bg-sidebar rounded-lg overflow-hidden flex flex-col flex-shrink-0">
              {/* Search Bar */}
              <div className="p-3 border-b border-border">
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search contacts..."
                    value={broadcastSearchQuery}
                    onChange={(e) => setBroadcastSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                    aria-label="Search contacts"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        filteredBroadcastContacts.length > 0 &&
                        selectedBroadcastContacts.length === filteredBroadcastContacts.length
                      }
                      onCheckedChange={handleSelectAllBroadcastContacts}
                      aria-label="Select all contacts"
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Select All
                    </label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Filter"
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56" align="end">
                      <div className="p-2">
                        {/* Filter content will go here */}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Contacts List */}
              <ScrollArea className="flex-1">
                <div className="flex flex-col">
                  {filteredBroadcastContacts.map((contact, index) => {
                    const isSelected = selectedBroadcastContacts.includes(contact.id)
                    return (
                      <React.Fragment key={contact.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Select ${contact.name} for broadcast`}
                          onClick={() => handleBroadcastContactToggle(contact.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleBroadcastContactToggle(contact.id)
                            }
                          }}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50',
                            isSelected && 'bg-accent'
                          )}
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={contact.avatar} alt={contact.name} />
                            <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                        </div>
                        {index < filteredBroadcastContacts.length - 1 && (
                          <div className="flex justify-center px-4">
                            <Separator className="w-[80%]" />
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Message Input - Right Side */}
            <div className="flex-1 h-full bg-sidebar rounded-lg overflow-hidden flex flex-col flex-shrink-0 min-w-0 p-4">
              <div className="flex-1 flex items-center justify-center mb-4">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    {selectedBroadcastContacts.length > 0
                      ? `Sending to ${selectedBroadcastContacts.length} contact${selectedBroadcastContacts.length === 1 ? '' : 's'}`
                      : 'Select contacts to send a broadcast message'}
                  </p>
                </div>
              </div>
              <div className="border-t border-border pt-4 mt-auto flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={broadcastFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleBroadcastFileChange}
                    aria-label="Upload file"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleBroadcastFileButtonClick}
                    onKeyDown={handleBroadcastFileButtonKeyDown}
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Textarea
                    ref={broadcastTextareaRef}
                    placeholder="Type a message..."
                    value={broadcastMessageInput}
                    onChange={(e) => setBroadcastMessageInput(e.target.value)}
                    onKeyDown={handleBroadcastKeyDown}
                    className="flex-1 min-w-0 resize-none min-h-[36px] max-h-[120px] py-2"
                    aria-label="Type a broadcast message"
                    rows={1}
                  />
                  <Button
                    onClick={handleBroadcastSendMessage}
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    disabled={!broadcastMessageInput.trim() || selectedBroadcastContacts.length === 0}
                    aria-label="Send broadcast message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MessagingPage


