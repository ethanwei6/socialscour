import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useChat } from '../contexts/ChatContext';
import ResearchInput from './ResearchInput';
import SummaryRenderer from './SummaryRenderer';
import SentimentGauge from './SentimentGauge';
import { MessageCircle, Search } from 'lucide-react';

const ResearchPanel: React.FC = () => {
  const { 
    activeChat, 
    isLoading, 
    isStreaming, 
    currentSentiment, 
    streamingContent,
    sendQuery 
  } = useChat();
  const [showSentiment, setShowSentiment] = useState(false);

  useEffect(() => {
    if (currentSentiment) {
      setShowSentiment(true);
    }
  }, [currentSentiment]);

  const handleNewQuery = async (query: string, subredditFilter?: string) => {
    setShowSentiment(false);
    await sendQuery(query, activeChat?.id, subredditFilter);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {activeChat ? activeChat.title : 'SocialScour Intelligence'}
          </h1>
          <p className="text-muted-foreground">
            {activeChat 
              ? `Analyzing sentiment across Reddit discussions` 
              : 'Start your research by entering a topic below'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-6">
          {/* Floating Search Bar */}
          <div className="mb-8">
            <ResearchInput 
              onSubmit={handleNewQuery}
              isLoading={isLoading}
              subredditFilter={activeChat?.subreddit_filter}
            />
          </div>

          {/* Sentiment Gauge */}
          {showSentiment && currentSentiment && (
            <div className="mb-8">
              <SentimentGauge sentiment={currentSentiment} />
            </div>
          )}

          {/* Chat Messages */}
          {activeChat && (
            <div className="space-y-6">
              {activeChat.messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-4 py-3',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground border border-border'
                    )}
                  >
                    {message.role === 'user' ? (
                      <p className="text-sm">{message.content}</p>
                    ) : (
                      <div className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <SummaryRenderer content={message.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming Content - Show while streaming OR if content exists but not yet in messages */}
              {streamingContent && (isStreaming || !activeChat.messages.some(m => 
                m.role === 'assistant' && m.content.trim() === streamingContent.trim()
              )) && (
                <div className="flex gap-4 justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card text-card-foreground border border-border">
                    <div className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <SummaryRenderer content={streamingContent} />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && !streamingContent && (
                <div className="flex gap-4 justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card text-card-foreground border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="spinner w-4 h-4" />
                      <span className="text-sm">Analyzing Reddit discussions...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!activeChat && !isLoading && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/50 mb-4">
                <Search className="w-8 h-8 text-accent-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Ready to explore Reddit sentiment?
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter any topic, brand, or product name to analyze what Reddit users are saying and how they feel about it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchPanel;