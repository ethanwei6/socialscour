import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ChatContextType, Chat, Message, Source, SentimentAnalysis } from '../types';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSentiment, setCurrentSentiment] = useState<SentimentAnalysis | null>(null);
  const [streamingContent, setStreamingContent] = useState('');

  // Load all chats from backend
  const loadChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }, []);

  // Create a new chat
  const createChat = useCallback(async (query: string, subreddit_filter?: string): Promise<Chat | null> => {
    try {
      const params = new URLSearchParams({ query });
      if (subreddit_filter) {
        params.append('subreddit_filter', subreddit_filter);
      }
      
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats(prev => [newChat, ...prev]);
        return newChat;
      }
      return null;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }, []);

  // Send query and handle streaming response
  const sendQuery = useCallback(async (query: string, chatId?: string, subreddit_filter?: string) => {
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    setCurrentSentiment(null);

    let currentChatId = chatId;
    
    // Create new chat if no chatId provided
    if (!currentChatId) {
      const newChat = await createChat(query, subreddit_filter);
      if (newChat) {
        currentChatId = newChat.id;
        setActiveChat(newChat);
      } else {
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }
    }

    try {
      const requestBody: any = {
        query,
        subreddit_filter,
      };

      const response = await fetch(`/api/research/${currentChatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to send query');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              // Save the accumulated streaming content as a message in the frontend state
              // This ensures it persists even if the backend hasn't saved it yet
              if (accumulatedContent.trim()) {
                const tempMessage: Message = {
                  id: `temp-${Date.now()}`,
                  role: 'assistant',
                  content: accumulatedContent,
                  timestamp: new Date(),
                };
                setChats(prev => prev.map(c => 
                  c.id === currentChatId 
                    ? { ...c, messages: [...c.messages, tempMessage] }
                    : c
                ));
                if (activeChat?.id === currentChatId) {
                  setActiveChat({
                    ...activeChat,
                    messages: [...activeChat.messages, tempMessage],
                  });
                }
              }
              continue;
            }

            // Try to parse as sentiment first
            try {
              const parsed = JSON.parse(data);
              if (parsed.score !== undefined && parsed.label !== undefined) {
                setCurrentSentiment(parsed);
                continue;
              }
            } catch {
              // Not JSON, treat as text content
            }

            // Handle text content (remove quotes if present)
            let content = data;
            if (content.startsWith('"') && content.endsWith('"')) {
              content = content.slice(1, -1);
            }
            content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
            
            // Accumulate content for saving
            accumulatedContent += content;
            setStreamingContent(prev => prev + content);
          }
        }
      }

      // Refresh chats after streaming is complete to get updated sources
      await loadChats();
      
      // Update activeChat with the latest data including sources
      if (currentChatId) {
        try {
          const response = await fetch(`/api/chats/${currentChatId}`);
          if (response.ok) {
            const updatedChat = await response.json();
            setActiveChat(updatedChat);
            // Also update in chats list
            setChats(prev => prev.map(c => c.id === currentChatId ? updatedChat : c));
          }
        } catch (error) {
          console.error('Error fetching updated chat:', error);
        }
      }
      
    } catch (error) {
      console.error('Error sending query:', error);
      setStreamingContent('Error: Failed to get response from server');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [createChat, loadChats]);

  // Update chat title
  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        setChats(prev => prev.map(chat => 
          chat.id === chatId ? { ...chat, title } : chat
        ));
        if (activeChat?.id === chatId) {
          setActiveChat({ ...activeChat, title });
        }
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  }, [activeChat]);

  // Delete chat
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        if (activeChat?.id === chatId) {
          setActiveChat(null);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, [activeChat]);

  // Clear streaming content
  const clearStreamingContent = useCallback(() => {
    setStreamingContent('');
    setCurrentSentiment(null);
  }, []);

  const contextValue: ChatContextType = {
    chats,
    activeChat,
    isLoading,
    isStreaming,
    currentSentiment,
    streamingContent,
    loadChats,
    createChat,
    setActiveChat,
    sendQuery,
    updateChatTitle,
    deleteChat,
    clearStreamingContent,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};