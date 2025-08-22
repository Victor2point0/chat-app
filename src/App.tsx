import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Layout/Sidebar';
import { ChatWindow } from './components/Chat/ChatWindow';
import { AnnouncementList } from './components/Announcements/AnnouncementList';
import { AdminPanel } from './components/Admin/AdminPanel';
import { NewChatModal } from './components/Modals/NewChatModal';
import { useChats } from './hooks/useChats';

type ViewType = 'chat' | 'announcements' | 'admin';

const MainApp: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { chats } = useChats();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const selectedChat = selectedChatId 
    ? chats.find(chat => chat.id === selectedChatId) || null 
    : null;

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    setCurrentView('chat');
  };

  const handleShowAnnouncements = () => {
    setCurrentView('announcements');
    setSelectedChatId(null);
  };

  const handleShowAdmin = () => {
    setCurrentView('admin');
    setSelectedChatId(null);
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
  };

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
    setCurrentView('chat');
    setShowNewChatModal(false);
  };

  useEffect(() => {
    // Auto-select first chat if none selected
    if (!selectedChatId && chats.length > 0 && currentView === 'chat') {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, selectedChatId, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginForm />;
  }

  return (
    <div className="h-screen flex bg-gray-100">
      <Sidebar
        selectedChatId={selectedChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onShowAnnouncements={handleShowAnnouncements}
        onShowAdmin={handleShowAdmin}
      />
      
      <div className="flex-1 flex flex-col">
        {currentView === 'chat' && <ChatWindow chat={selectedChat} />}
        {currentView === 'announcements' && <AnnouncementList />}
        {currentView === 'admin' && <AdminPanel />}
      </div>

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;