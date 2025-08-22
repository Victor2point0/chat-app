import React, { useState } from 'react';
import { MessageSquare, Megaphone, Plus, Settings, LogOut, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useChats } from '../../hooks/useChats';
import { format } from 'date-fns';

interface SidebarProps {
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onShowAnnouncements: () => void;
  onShowAdmin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedChatId,
  onChatSelect,
  onNewChat,
  onShowAnnouncements,
  onShowAdmin
}) => {
  const { profile, signOut } = useAuth();
  const { chats, loading } = useChats();
  const [activeSection, setActiveSection] = useState<'chats' | 'announcements'>('chats');

  const handleShowAnnouncements = () => {
    setActiveSection('announcements');
    onShowAnnouncements();
  };

  const handleShowChats = () => {
    setActiveSection('chats');
  };

  const getChatDisplayName = (chat: any) => {
    if (chat.name) return chat.name;
    if (chat.type === 'announcement') return 'School Announcements';
    
    // For private chats, show the other participant's name
    const otherParticipant = chat.participants?.find(
      (p: any) => p.user_id !== profile?.id
    );
    return otherParticipant?.profile?.full_name || 'Unknown User';
  };

  const regularChats = chats.filter(chat => chat.type !== 'announcement');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">School Chat</h1>
          {isAdmin && (
            <button
              onClick={onShowAdmin}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Admin Panel"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>{profile?.full_name}</span>
          <span className="text-gray-400">•</span>
          <span className="capitalize">{profile?.role?.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={handleShowChats}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeSection === 'chats'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Chats
        </button>
        <button
          onClick={handleShowAnnouncements}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeSection === 'announcements'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Megaphone className="w-4 h-4 inline mr-2" />
          Announcements
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'chats' && (
          <>
            <div className="p-4 border-b border-gray-100">
              <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </button>
            </div>

            <div className="space-y-1 p-2">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading chats...</div>
              ) : regularChats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No chats yet. Start a new conversation!
                </div>
              ) : (
                regularChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => onChatSelect(chat.id)}
                    className={`w-full p-3 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                      selectedChatId === chat.id ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {format(new Date(chat.last_message_at), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">
                        {chat.type === 'group' ? (
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {chat.participants?.length || 0} members
                          </span>
                        ) : (
                          <span>{chat.description || 'Private chat'}</span>
                        )}
                      </p>
                      {chat.type !== 'announcement' && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full opacity-60"></div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center py-2 px-4 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
};