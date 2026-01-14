import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

interface SummaryRendererProps {
  content: string;
  className?: string;
}

const SummaryRenderer: React.FC<SummaryRendererProps> = ({ content, className }) => {
  // Custom renderer for links that look like citations [1], [2], etc.
  const renderText = (text: string) => {
    // Split text by citation patterns and render them as clickable links
    const parts = text.split(/(\[[0-9]+\])/g);
    
    return parts.map((part, index) => {
      const citationMatch = part.match(/\[([0-9]+)\]/);
      if (citationMatch) {
        const citationNumber = citationMatch[1];
        return (
          <button
            key={index}
            onClick={() => {
              // Scroll to the corresponding source in the right panel
              const sourceElement = document.getElementById(`source-${citationNumber}`);
              if (sourceElement) {
                sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight the source temporarily
                sourceElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                setTimeout(() => {
                  sourceElement.style.backgroundColor = '';
                }, 2000);
              }
            }}
            className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-primary bg-primary/10 rounded-sm hover:bg-primary/20 transition-colors"
          >
            {citationNumber}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom rendering for strong text
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          // Custom rendering for paragraphs
          p: ({ children }) => (
            <p className="mb-3 text-foreground leading-relaxed">
              {typeof children === 'string' ? renderText(children) : children}
            </p>
          ),
          // Custom rendering for lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1">
              {React.Children.map(children, (child, index) => (
                <li key={index} className="text-foreground">
                  {child}
                </li>
              ))}
            </ul>
          ),
          // Custom rendering for list items
          li: ({ children }) => (
            <li className="ml-4">
              {typeof children === 'string' ? renderText(children) : children}
            </li>
          ),
          // Custom rendering for headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-foreground mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {children}
            </h3>
          ),
          // Custom rendering for code blocks
          code: ({ children }) => (
            <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
          // Custom rendering for blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default SummaryRenderer;