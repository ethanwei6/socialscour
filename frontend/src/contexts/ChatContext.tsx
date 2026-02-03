import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef, startTransition } from 'react';
import { ChatContextType, Chat, Message, Source, SentimentAnalysis } from '../types';
import { getApiUrl } from '../lib/utils';

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
  
  // Refs to track streaming state that persists across tab switches
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentChatIdRef = useRef<string | null>(null);
  const accumulatedContentRef = useRef<string>('');
  const isStreamingRef = useRef<boolean>(false);

  // Load all chats from backend
  const loadChats = useCallback(async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/chats`);
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
      
      const response = await fetch(`${getApiUrl()}/api/chats`, {
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

  // Cleanup function to abort ongoing streams
  const cleanupStream = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {});
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isStreamingRef.current = false;
  }, []);

  // Handle tab visibility changes - restore state when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isStreamingRef.current && currentChatIdRef.current) {
        // Tab became visible again - check if streaming completed while away
        try {
          const response = await fetch(`${getApiUrl()}/api/chats/${currentChatIdRef.current}`);
          if (response.ok) {
            const updatedChat = await response.json();
            // Check if there's a new assistant message that wasn't in our state
            const lastMessage = updatedChat.messages[updatedChat.messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              // Streaming completed while tab was away
              setActiveChat(updatedChat);
              setChats(prev => prev.map(c => c.id === currentChatIdRef.current ? updatedChat : c));
              setIsStreaming(false);
              setIsLoading(false);
              setStreamingContent('');
              isStreamingRef.current = false;
              currentChatIdRef.current = null;
            }
          }
        } catch (error) {
          console.error('Error checking chat status:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  // Send query and handle streaming response
  const sendQuery = useCallback(async (query: string, chatId?: string, subreddit_filter?: string) => {
    // Cleanup any existing stream
    cleanupStream();

    // Use startTransition for initial state updates to keep UI responsive
    startTransition(() => {
      setIsLoading(true);
      setIsStreaming(true);
      setStreamingContent('');
      setCurrentSentiment(null);
    });
    
    accumulatedContentRef.current = '';
    isStreamingRef.current = true;

    let currentChatId = chatId;
    
    // Create new chat if no chatId provided - yield after this to keep UI responsive
    if (!currentChatId) {
      const newChat = await createChat(query, subreddit_filter);
      if (newChat) {
        currentChatId = newChat.id;
        // Yield to browser before setting active chat
        await new Promise(resolve => setTimeout(resolve, 0));
        setActiveChat(newChat);
      } else {
        setIsLoading(false);
        setIsStreaming(false);
        isStreamingRef.current = false;
        return;
      }
    }

    currentChatIdRef.current = currentChatId;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const requestBody: any = {
        query,
        subreddit_filter,
      };

      const response = await fetch(`${getApiUrl()}/api/research/${currentChatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send query');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let pendingUpdates: string[] = [];
      let lastUpdateTime = Date.now();
      const BATCH_INTERVAL = 50; // Update UI every 50ms max
      const MAX_BATCH_SIZE = 10; // Process max 10 chunks before yielding

      // Helper function to yield control to browser
      const yieldToBrowser = () => {
        return new Promise<void>(resolve => {
          // Use setTimeout with 0 delay to yield to event loop
          setTimeout(resolve, 0);
        });
      };

      // Process pending updates in batches
      const processPendingUpdates = () => {
        if (pendingUpdates.length === 0) return;
        
        const batch = pendingUpdates.splice(0, MAX_BATCH_SIZE);
        const combinedContent = batch.join('');
        
        // Use startTransition to mark these updates as non-urgent
        startTransition(() => {
          accumulatedContentRef.current += combinedContent;
          setStreamingContent(prev => prev + combinedContent);
        });
      };

      while (true) {
        // Check if aborted
        if (abortController.signal.aborted) {
          break;
        }

        let result;
        try {
          result = await reader.read();
        } catch (error: any) {
          // Handle network errors gracefully - might happen when tab is inactive
          if (error.name === 'AbortError' || error.name === 'NetworkError') {
            // Stream was aborted or network error - try to recover by checking backend
            console.log('Stream interrupted, checking backend for completion...');
            break;
          }
          throw error;
        }

        const { done, value } = result;
        if (done) {
          // Process any remaining pending updates
          processPendingUpdates();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Process any remaining updates before finishing
              processPendingUpdates();
              
              setIsStreaming(false);
              isStreamingRef.current = false;
              
              // Save the accumulated streaming content as a message in the frontend state
              if (accumulatedContentRef.current.trim()) {
                const tempMessage: Message = {
                  id: `temp-${Date.now()}`,
                  role: 'assistant',
                  content: accumulatedContentRef.current,
                  timestamp: new Date(),
                };
                startTransition(() => {
                  setChats(prev => prev.map(c => 
                    c.id === currentChatId 
                      ? { ...c, messages: [...c.messages, tempMessage] }
                      : c
                  ));
                  // Update activeChat if it matches the current chat
                  setActiveChat(prev => {
                    if (prev?.id === currentChatId) {
                      return {
                        ...prev,
                        messages: [...prev.messages, tempMessage],
                      };
                    }
                    return prev;
                  });
                });
              }
              continue;
            }

            // Try to parse as sentiment first
            try {
              const parsed = JSON.parse(data);
              if (parsed.score !== undefined && parsed.label !== undefined) {
                // Sentiment updates are important, update immediately
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
            
            // Add to pending updates batch
            pendingUpdates.push(content);
            
            // Process batch if we've accumulated enough or enough time has passed
            const now = Date.now();
            if (pendingUpdates.length >= MAX_BATCH_SIZE || (now - lastUpdateTime) >= BATCH_INTERVAL) {
              processPendingUpdates();
              lastUpdateTime = now;
              // Yield to browser to allow React to render
              await yieldToBrowser();
            }
          }
        }
        
        // Yield periodically even if we haven't hit batch limits
        // This ensures the UI stays responsive
        await yieldToBrowser();
      }

      // Cleanup reader
      readerRef.current = null;
      abortControllerRef.current = null;
      currentChatIdRef.current = null;

      // Yield to browser before doing final updates
      await yieldToBrowser();

      // Refresh chats after streaming is complete to get updated sources
      // Do this in a non-blocking way
      loadChats().then(() => {
        // Update activeChat with the latest data including sources
        if (currentChatId) {
          fetch(`${getApiUrl()}/api/chats/${currentChatId}`)
            .then(response => {
              if (response.ok) {
                return response.json();
              }
              return null;
            })
            .then(updatedChat => {
              if (updatedChat) {
                startTransition(() => {
                  setActiveChat(updatedChat);
                  // Also update in chats list
                  setChats(prev => prev.map(c => c.id === currentChatId ? updatedChat : c));
                });
              }
            })
            .catch(error => {
              console.error('Error fetching updated chat:', error);
            });
        }
      });
      
    } catch (error: any) {
      // Handle abort errors gracefully
      if (error.name === 'AbortError') {
        console.log('Stream was aborted');
        // Try to fetch the latest state from backend
        if (currentChatId) {
          try {
            const response = await fetch(`${getApiUrl()}/api/chats/${currentChatId}`);
            if (response.ok) {
              const updatedChat = await response.json();
              setActiveChat(updatedChat);
              setChats(prev => prev.map(c => c.id === currentChatId ? updatedChat : c));
            }
          } catch (fetchError) {
            console.error('Error fetching chat after abort:', fetchError);
          }
        }
      } else {
        console.error('Error sending query:', error);
        setStreamingContent('Error: Failed to get response from server');
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      isStreamingRef.current = false;
      readerRef.current = null;
      abortControllerRef.current = null;
    }
  }, [createChat, loadChats, cleanupStream]);

  // Update chat title
  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/chats/${chatId}/title`, {
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
      const response = await fetch(`${getApiUrl()}/api/chats/${chatId}`, {
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

  // Handle setting active chat - fetches latest data and clears streaming state
  const handleSetActiveChat = useCallback(async (chat: Chat | null) => {
    // Cleanup any ongoing streams when switching chats
    if (isStreamingRef.current) {
      cleanupStream();
      setIsStreaming(false);
      setIsLoading(false);
    }
    
    // Immediately clear activeChat to prevent showing stale sources
    setActiveChat(null);
    
    // Clear streaming content and sentiment when switching chats
    setStreamingContent('');
    setCurrentSentiment(null);
    accumulatedContentRef.current = '';
    
    if (!chat) {
      currentChatIdRef.current = null;
      return;
    }

    // Fetch the latest chat data from backend to ensure we have correct sources
    try {
      const response = await fetch(`${getApiUrl()}/api/chats/${chat.id}`);
      if (response.ok) {
        const updatedChat = await response.json();
        setActiveChat(updatedChat);
        // Also update in chats list to keep it in sync
        setChats(prev => prev.map(c => c.id === chat.id ? updatedChat : c));
      } else {
        // If fetch fails, fall back to the chat object passed in
        setActiveChat(chat);
      }
    } catch (error) {
      console.error('Error fetching chat data:', error);
      // If fetch fails, fall back to the chat object passed in
      setActiveChat(chat);
    }
  }, [cleanupStream]);

  const contextValue: ChatContextType = {
    chats,
    activeChat,
    isLoading,
    isStreaming,
    currentSentiment,
    streamingContent,
    loadChats,
    createChat,
    setActiveChat: handleSetActiveChat,
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