import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Edit2, Trash2, Search, Settings, Sun, Moon } from 'lucide-react';

const ChatSidebar: React.FC = () => {
  const { 
    chats, 
    activeChat, 
    setActiveChat, 
    createChat, 
    updateChatTitle, 
    deleteChat 
  } = useChat();
  const { theme, toggleTheme } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);

  const handleNewResearch = () => {
    setActiveChat(null);
  };

  const handleEditTitle = (chatId: string, currentTitle: string) => {
    setEditingId(chatId);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = async (chatId: string) => {
    if (editingTitle.trim()) {
      await updateChatTitle(chatId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleDeleteChat = async (chatId: string) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(chatId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <button
          onClick={handleNewResearch}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <Plus className="w-4 h-4" />
          New Research
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-2">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No research sessions yet</p>
              <p className="text-xs mt-1">Start by creating a new research</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  'group relative rounded-lg transition-all cursor-pointer',
                  activeChat?.id === chat.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-accent/50 border border-transparent'
                )}
                onClick={() => setActiveChat(chat)}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                <div className="p-3">
                  {editingId === chat.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveTitle(chat.id)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveTitle(chat.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-sm bg-background border border-primary rounded"
                      autoFocus
                    />
                  ) : (
                    <>
                      <h3 className="font-medium text-sm text-foreground truncate">
                        {chat.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                        {chat.subreddit_filter && (
                          <>
                            {' '}• r/{chat.subreddit_filter}
                          </>
                        )}
                      </p>
                    </>
                  )}
                </div>

                {/* Hover Actions */}
                {hoveredChatId === chat.id && editingId !== chat.id && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTitle(chat.id, chat.title);
                      }}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;