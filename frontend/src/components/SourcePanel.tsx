import React from 'react';
import { cn } from '../lib/utils';
import { useChat } from '../contexts/ChatContext';
import { getSubredditIcon } from '../lib/utils';
import { ExternalLink, MessageSquare, TrendingUp } from 'lucide-react';

const SourcePanel: React.FC = () => {
  const { activeChat } = useChat();

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Sources & Intelligence</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {activeChat ? `${activeChat.sources.length} sources analyzed` : 'No active research'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeChat && activeChat.sources.length > 0 ? (
          <div className="p-4 space-y-4">
            {/* Source Cards */}
            {activeChat.sources.map((source, index) => (
              <div
                key={source.id}
                id={`source-${index + 1}`}
                className="bg-background rounded-lg p-4 border border-border hover-lift"
              >
                {/* Subreddit Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: getSubredditIcon(source.subreddit) }}
                  >
                    r/{source.subreddit.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    r/{source.subreddit}
                  </span>
                  {source.upvotes && (
                    <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      {source.upvotes}
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-medium text-foreground mb-2 line-clamp-2">
                  {source.title}
                </h3>

                {/* Content Preview */}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {source.content.substring(0, 200)}
                  {source.content.length > 200 && '...'}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Source [{index + 1}]
                  </span>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Reddit
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : activeChat ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/50 mb-3">
              <MessageSquare className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No sources yet</h3>
            <p className="text-sm text-muted-foreground">
              Sources will appear here when you analyze a topic
            </p>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/50 mb-3">
              <MessageSquare className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No active research</h3>
            <p className="text-sm text-muted-foreground">
              Select a chat or start a new research session
            </p>
          </div>
        )}
      </div>

      {/* Footer Insights */}
      {activeChat && activeChat.sources.length > 0 && (
        <div className="p-4 border-t border-border bg-background/50">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Quick Stats</h4>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Sources</span>
                <span className="text-foreground font-medium">
                  {activeChat.sources.length}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subreddits</span>
                <span className="text-foreground font-medium">
                  {new Set(activeChat.sources.map(s => s.subreddit)).size}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Engagement</span>
                <span className="text-foreground font-medium">
                  {activeChat.sources.reduce((sum, s) => sum + (s.upvotes || 0), 0).toLocaleString()} upvotes
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourcePanel;