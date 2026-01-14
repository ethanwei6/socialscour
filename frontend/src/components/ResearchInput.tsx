import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Search, Hash } from 'lucide-react';

interface ResearchInputProps {
  onSubmit: (query: string, subredditFilter?: string) => void;
  isLoading?: boolean;
  subredditFilter?: string;
}

const ResearchInput: React.FC<ResearchInputProps> = ({ 
  onSubmit, 
  isLoading = false, 
  subredditFilter 
}) => {
  const [query, setQuery] = useState('');
  const [showSubredditInput, setShowSubredditInput] = useState(false);
  const [subreddit, setSubreddit] = useState(subredditFilter || '');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim(), subreddit.trim() || undefined);
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div className={cn(
          'relative bg-card border-2 rounded-xl transition-all duration-200',
          isFocused ? 'border-primary shadow-lg' : 'border-border',
          'hover:border-primary/50'
        )}>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to analyze? (e.g., 'iPhone 16 sentiment', 'Nvidia GPU reviews')"
              className={cn(
                'w-full pl-12 pr-4 py-4 bg-transparent resize-none outline-none',
                'text-foreground placeholder-muted-foreground',
                'min-h-[60px]'
              )}
              rows={1}
              disabled={isLoading}
            />
          </div>

          {/* Subreddit Filter */}
          {showSubredditInput && (
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  placeholder="Filter by subreddit (optional)"
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder-muted-foreground"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSubredditInput(false);
                    setSubreddit('');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => setShowSubredditInput(!showSubredditInput)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors',
                showSubredditInput || subreddit
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Hash className="w-3 h-3" />
              Subreddit Filter
              {subreddit && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                  r/{subreddit}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Press Enter to search
              </span>
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  'bg-primary text-primary-foreground',
                  'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ResearchInput;