import React, { useEffect } from 'react';
import { ChatProvider } from './contexts/ChatContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import './App.css';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ChatProvider>
        <div className="app">
          <Layout />
        </div>
      </ChatProvider>
    </ThemeProvider>
  );
};

export default App;