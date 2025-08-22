import React, { useState, useEffect } from 'react';
import { X, Search, Users } from 'lucide-react';
import { supabase, type Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateEncryptionKey } from '../../lib/encryption';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onChatCreated
}) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatName, setChatName] = useState('');
  const [chatType, setChatType] = useState<'private' | 'group'>('private');
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);
    try {
      // Determine chat type
      const finalChatType = selectedUsers.length === 1 ? 'private' : 'group';
      
      // Generate encryption key for E2E encryption
      const encryptionKey = generateEncryptionKey();

      // Create the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: finalChatType === 'group' ? chatName : null,
          type: finalChatType,
          encryption_key: encryptionKey,
          created_by: user?.id
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat:', chatError);
        alert('Failed to create chat');
        return;
      }

      // Add participants (including current user)
      const participants = [user?.id, ...selectedUsers].map(userId => ({
        chat_id: chat.id,
        user_id: userId,
        is_admin: userId === user?.id
      }));

      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantError) {
        console.error('Error adding participants:', participantError);
        alert('Failed to add participants');
        return;
      }

      onChatCreated(chat.id);
      onClose();
      
      // Reset form
      setSelectedUsers([]);
      setChatName('');
      setSearchTerm('');
      setChatType('private');
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">New Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Group Name (if multiple users selected) */}
        {selectedUsers.length > 1 && (
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(userId => {
                const user = users.find(u => u.id === userId);
                return (
                  <span
                    key={userId}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {user?.full_name}
                    <button
                      onClick={() => toggleUserSelection(userId)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchTerm ? 'No users found' : 'No users available'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  className={`w-full flex items-center p-3 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                    selectedUsers.includes(user.id) ? 'bg-blue-50 ring-2 ring-blue-200' : ''
                  }`}
                >
                  <div className="flex-shrink-0 h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-gray-600">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.full_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  {user.role === 'admin' || user.role === 'super_admin' ? (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {user.role.replace('_', ' ')}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={handleCreateChat}
              disabled={selectedUsers.length === 0 || loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : (
                <>
                  {selectedUsers.length > 1 ? (
                    <Users className="w-4 h-4 inline mr-2" />
                  ) : null}
                  Create {selectedUsers.length > 1 ? 'Group' : 'Chat'}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};