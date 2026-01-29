export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  upvotes?: number;
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  sources: Source[];
  created_at: string;
  updated_at: string;
  subreddit_filter?: string;
}

export interface SentimentAnalysis {
  score: number; // 0-100
  label: string; // "Very Negative", "Negative", "Neutral", "Positive", "Very Positive"
  confidence: number; // 0-1
}

export interface QueryRequest {
  query: string;
  chat_id?: string;
  subreddit_filter?: string;
}

export interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  isLoading: boolean;
  isStreaming: boolean;
  currentSentiment: SentimentAnalysis | null;
  streamingContent: string;
  loadChats: () => Promise<void>;
  createChat: (query: string, subreddit_filter?: string) => Promise<Chat | null>;
  setActiveChat: (chat: Chat | null) => void | Promise<void>;
  sendQuery: (query: string, chatId?: string, subreddit_filter?: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  clearStreamingContent: () => void;
}