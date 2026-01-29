import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

interface SummaryRendererProps {
  content: string;
  className?: string;
}

const SummaryRenderer: React.FC<SummaryRendererProps> = ({ content, className }) => {
  // Clean up markdown content to remove empty bullet points and extra blank lines
  const cleanMarkdown = (text: string): string => {
    const lines = text.split('\n');
    const cleaned: string[] = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if this is a list item
      const isListItem = /^[\*\-\+]\s+/.test(trimmed);
      
      // Check if this is an empty list item (just bullet point with no content)
      const isEmptyListItem = /^[\*\-\+]\s*$/.test(trimmed);
      
      if (isEmptyListItem) {
        // Skip empty list items completely
        continue;
      }
      
      if (isListItem) {
        // If we're starting a new list after non-list content, add a blank line
        if (!inList && cleaned.length > 0 && cleaned[cleaned.length - 1].trim() !== '') {
          cleaned.push('');
        }
        inList = true;
        cleaned.push(line);
      } else if (trimmed === '') {
        // Skip blank lines that appear between list items
        // Only keep blank lines if we're not in a list context
        if (!inList && cleaned.length > 0 && cleaned[cleaned.length - 1].trim() !== '') {
          cleaned.push('');
        }
        // Otherwise skip the blank line (it's between list items)
      } else {
        // Regular content line
        // If we're leaving a list, add a blank line before non-list content
        if (inList && cleaned.length > 0 && cleaned[cleaned.length - 1].trim() !== '') {
          cleaned.push('');
        }
        inList = false;
        cleaned.push(line);
      }
    }
    
    // Remove trailing blank lines
    while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === '') {
      cleaned.pop();
    }
    
    return cleaned.join('\n');
  };

  const cleanedContent = cleanMarkdown(content);

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
          ul: ({ children }) => {
            // Filter out empty list items
            const validChildren = React.Children.toArray(children).filter((child) => {
              if (React.isValidElement(child)) {
                // Extract text content from the child (which is already an <li>)
                const childText = typeof child.props.children === 'string' 
                  ? child.props.children 
                  : React.Children.toArray(child.props.children)
                      .map(c => typeof c === 'string' ? c : '')
                      .join('');
                return childText.trim() !== '';
              }
              return true;
            });
            
            return (
              <ul className="list-disc list-inside mb-3 space-y-1">
                {validChildren}
              </ul>
            );
          },
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
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
};

export default SummaryRenderer;