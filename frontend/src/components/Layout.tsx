import React, { useEffect } from 'react';
import { cn } from '../lib/utils';
import { useChat } from '../contexts/ChatContext';
import ChatSidebar from './ChatSidebar';
import ResearchPanel from './ResearchPanel';
import SourcePanel from './SourcePanel';

const Layout: React.FC = () => {
  const { loadChats } = useChat();

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return (
    <div className="h-full w-full flex bg-background">
      {/* Left Sidebar - Chat History */}
      <div className="w-[260px] flex-shrink-0 border-r border-border">
        <ChatSidebar />
      </div>

      {/* Center Panel - Research Engine */}
      <div className="flex-1 min-w-0">
        <ResearchPanel />
      </div>

      {/* Right Panel - Intelligence Sidebar */}
      <div className="w-[320px] flex-shrink-0 border-l border-border">
        <SourcePanel />
      </div>
    </div>
  );
};

export default Layout;