import React, { useState, useEffect, useRef, ChangeEvent } from 'react'

interface User {
  id: string;
  displayName: string;
  photoURL: string;
  email: string;
  companyId: string;
  online?: boolean;
}

interface Message {
  id: number;
  user: string;
  content: string;
  time: string;
  avatar: string;
  reactions: string[];
  replies: { user: string; content: string; time: string }[];
  isPinned: boolean;
  mentions: string[];
  files: { name: string; url: string }[];
  isRead: boolean;
}

interface Reply {
  user: string;
  content: string;
  time: string;
}

interface File {
  name: string;
  url: string;
}
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Command, CommandInput, CommandItem, CommandList } from "./ui/command"
import { Textarea } from "./ui/textarea"
import { ChevronDown, Hash, Plus, Send, Users, Menu, Bell, Settings, Sun, Moon, Smile, Paperclip, Edit2, Pin, AtSign, Search } from "lucide-react"

export default function SlackInterface() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentChannel, setCurrentChannel] = useState('general')
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isJumpToOpen, setIsJumpToOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const channels = ['general', 'random', 'announcements', 'project-a', 'project-b']
  const [users, setUsers] = useState<{[key: string]: User}>({})
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }
        const data = await response.json()
        console.log('Fetched users:', data) // Debugging
        // Convert array to object with user IDs as keys
        const usersMap = data.reduce((acc: {[key: string]: User}, user: User) => {
          acc[user.id] = user
          return acc
        }, {})
        console.log('Users map:', usersMap) // Debugging
        setUsers(usersMap)
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch users')
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

  const allUsers = ['You', ...Object.values(users).map(user => user.displayName)]
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      user: 'Alice Smith',
      content: 'Hey team, how\'s the project coming along?',
      time: '10:30 AM',
      avatar: '/placeholder.svg?height=40&width=40',
      reactions: [] as string[],
      replies: [] as Reply[],
      isPinned: false,
      mentions: [] as string[],
      files: [] as File[],
      isRead: true
    },
    {
      id: 2,
      user: 'Bob Johnson',
      content: 'We\'re making good progress. Just finished the first milestone.',
      time: '10:32 AM',
      avatar: '/placeholder.svg?height=40&width=40',
      reactions: [] as string[],
      replies: [] as Reply[],
      isPinned: false,
      mentions: [] as string[],
      files: [] as File[],
      isRead: true
    },
    {
      id: 3,
      user: 'Charlie Brown',
      content: 'Great job everyone! Let\'s keep up the momentum.',
      time: '10:35 AM',
      avatar: '/placeholder.svg?height=40&width=40',
      reactions: [] as string[],
      replies: [] as Reply[],
      isPinned: false,
      mentions: [] as string[],
      files: [] as File[],
      isRead: true
    },
    {
      id: 4,
      user: 'Diana Prince',
      content: 'I\'ve uploaded the latest designs to the shared folder.',
      time: '10:40 AM',
      avatar: '/placeholder.svg?height=40&width=40',
      reactions: [] as string[],
      replies: [] as Reply[],
      isPinned: false,
      mentions: [] as string[],
      files: [{ name: 'design.pdf', url: '#' }] as File[],
      isRead: true
    },
    {
      id: 5,
      user: 'Alice Smith',
      content: 'Awesome, I\'ll take a look at them right away.',
      time: '10:42 AM',
      avatar: '/placeholder.svg?height=40&width=40',
      reactions: [] as string[],
      replies: [] as Reply[],
      isPinned: false,
      mentions: [] as string[],
      files: [] as File[],
      isRead: false
    }
  ])

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        user: 'You',
        content: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: '/placeholder.svg?height=40&width=40',
        reactions: [],
        replies: [],
        isPinned: false,
        mentions: message.match(/@(\w+)/g) || [],
        files: [],
        isRead: true,
      }
      setMessages([...messages, newMessage])
      setMessage('')
      setIsTyping(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    console.log(`Searching for: ${searchQuery}`)
    // Implement actual search logic here
  }

  const filteredMessages = isSearching
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.user.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  const addReaction = (messageId: number, emoji: string) => {
    setMessages(messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions: [...msg.reactions, emoji] }
        : msg
    ))
  }

  const addReply = (messageId: number, reply: string) => {
    setMessages(messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, replies: [...msg.replies, { user: 'You', content: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] }
        : msg
    ))
  }

  const editMessage = (messageId: number, newContent: string) => {
    setMessages(messages.map(msg =>
      msg.id === messageId
        ? { ...msg, content: newContent }
        : msg
    ))
  }

  const togglePinMessage = (messageId: number) => {
    setMessages(messages.map(msg =>
      msg.id === messageId
        ? { ...msg, isPinned: !msg.isPinned }
        : msg
    ))
  }

  const handleFileUpload = (messageId: number | null, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (messageId) {
        // Attach file to existing message
        setMessages(messages.map(msg =>
          msg.id === messageId
            ? { ...msg, files: [...msg.files, { name: file.name, url: URL.createObjectURL(file) }] }
            : msg
        ))
      } else {
        // Create new message with file
        const newMessage = {
          id: messages.length + 1,
          user: 'You',
          content: `Uploaded file: ${file.name}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatar: '/placeholder.svg?height=40&width=40',
          reactions: [],
          replies: [],
          isPinned: false,
          mentions: [],
          files: [{ name: file.name, url: URL.createObjectURL(file) }],
          isRead: true,
        }
        setMessages([...messages, newMessage])
      }
    }
  }

  useEffect(() => {
    const typingTimer = setTimeout(() => {
      setIsTyping(message.length > 0)
    }, 1000)

    return () => clearTimeout(typingTimer)
  }, [message])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsJumpToOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`w-64 bg-gray-800 dark:bg-gray-900 text-gray-300 flex-col ${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Acme Inc</h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start">Profile</Button>
                <Button variant="ghost" className="w-full justify-start">Preferences</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={toggleDarkMode}>
                  {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </Button>
                <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600">Sign out</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <ScrollArea className="flex-grow">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-2 flex items-center justify-between text-gray-100">
              Channels
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 text-gray-400 hover:text-white hover:bg-gray-700">
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add Channel</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a new channel</DialogTitle>
                  </DialogHeader>
                  <Input placeholder="Enter channel name" />
                  <Button>Create Channel</Button>
                </DialogContent>
              </Dialog>
            </h2>
            <ul>
              {channels.map((channel) => (
                <li key={channel} className="mb-1">
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start hover:bg-gray-700 ${currentChannel === channel ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white'}`}
                    onClick={() => setCurrentChannel(channel)}
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    {channel}
                  </Button>
                </li>
              ))}
            </ul>
            <h2 className="text-lg font-semibold mt-6 mb-2 flex items-center justify-between text-gray-100">
              Direct Messages
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 text-gray-400 hover:text-white hover:bg-gray-700">
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add Direct Message</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start a new conversation</DialogTitle>
                  </DialogHeader>
                  <Input placeholder="Enter username" />
                  <Button>Start Conversation</Button>
                </DialogContent>
              </Dialog>
            </h2>
            <ul>
              {Object.values(users).map((user: User) => (
                <li key={user.id} className="mb-1">
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    {user.displayName}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {/* Channel Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={toggleMobileMenu}>
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
            <Hash className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{currentChannel}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsJumpToOpen(true)}>
              Jump to... (Ctrl+K)
            </Button>
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="search"
                placeholder="Search messages"
                className="pr-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" variant="ghost" size="sm" className="absolute right-0 top-0 h-full">
                <Search className="h-4 w-4" />
              
              </Button>
            </form>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Channel notifications</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" className="text-gray-500 dark:text-gray-400">
                    <Users className="h-5 w-5 mr-2" />
                    24
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View channel members</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {filteredMessages.map((message) => (
            <div key={message.id} className={`mb-4 ${message.isPinned ? 'bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded' : ''}`}>
              <div className="flex items-start">
                <Avatar className="w-10 h-10 mr-3">
                  <AvatarImage src={message.avatar} alt={message.user} />
                  <AvatarFallback>{message.user.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-semibold mr-2 text-gray-800 dark:text-white">{message.user}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{message.time}</span>
                    {!message.isRead && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">New</span>}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}></p>
                  {message.files.length > 0 && (
                    <div className="mt-2">
                      {message.files.map((file, index) => (
                        <a key={index} href={file.url} className="text-blue-500 hover:underline block" target="_blank" rel="noopener noreferrer">
                          📎 {file.name}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center mt-2 space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Smile className="h-4 w-4 mr-1" />
                          Add Reaction
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {['👍', '❤️', '😂', '🎉', '🤔'].map(emoji => (
                          <DropdownMenuItem key={emoji} onClick={() => addReaction(message.id, emoji)}>
                            {emoji}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const reply = prompt('Enter your reply:')
                      if (reply) addReply(message.id, reply)
                    }}>
                      Reply
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const newContent = prompt('Edit message:', message.content)
                      if (newContent) editMessage(message.id, newContent)
                    }}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => togglePinMessage(message.id)}>
                      <Pin className="h-4 w-4 mr-1" />
                      {message.isPinned ? 'Unpin' : 'Pin'}
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="h-4 w-4 mr-1" />
                            Attach File
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Attach a file to this message</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => handleFileUpload(message.id, e)}
                    />
                  </div>
                  {message.reactions.length > 0 && (
                    <div className="flex items-center mt-2 space-x-1">
                      {message.reactions.map((reaction, index) => (
                        <span key={index} className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 text-sm">
                          {reaction}
                        </span>
                      ))}
                    </div>
                  )}
                  {message.replies.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {message.replies.map((reply, index) => (
                        <div key={index} className="mt-2">
                          <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">{reply.user}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{reply.time}</span>
                          <p className="text-sm text-gray-800 dark:text-gray-200">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {isTyping && <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Someone is typing...</div>}
          <form onSubmit={handleSendMessage} className="flex items-center">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message #${currentChannel}`}
              className="flex-1 mr-2 min-h-[60px]"
            />
            <div className="flex flex-col space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" size="icon" disabled={!message.trim()}>
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send message</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" size="icon" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4" />
                      <span className="sr-only">Attach file</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach a file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </form>
        </div>
      </div>

      {/* Jump To Dialog */}
      <Dialog open={isJumpToOpen} onOpenChange={setIsJumpToOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Jump to</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandItem onSelect={() => {
                setIsJumpToOpen(false)
                // Handle channel selection
              }}>
                <Hash className="mr-2 h-4 w-4" />
                <span>Channels</span>
              </CommandItem>
              {channels.map((channel) => (
                <CommandItem key={channel} onSelect={() => {
                  setCurrentChannel(channel)
                  setIsJumpToOpen(false)
                }}>
                  <Hash className="mr-2 h-4 w-4" />
                  <span>{channel}</span>
                </CommandItem>
              ))}
              <CommandItem onSelect={() => {
                setIsJumpToOpen(false)
                // Handle direct message selection
              }}>
                <AtSign className="mr-2 h-4 w-4" />
                <span>Direct Messages</span>
              </CommandItem>
              {Object.values(users).map((user: User) => (
                <CommandItem key={user.id} onSelect={() => {
                  // Handle direct message selection
                  setIsJumpToOpen(false)
                }}>
                  <AtSign className="mr-2 h-4 w-4" />
                  <span>{user.displayName}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  )
}
