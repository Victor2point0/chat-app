import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../contexts/AuthContext';
import { type ChatWithParticipants } from '../../lib/supabase';

interface ChatWindowProps {
  chat: ChatWithParticipants | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat }) => {
  const [messageInput, setMessageInput] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const { messages, loading, typing, sendMessage, editMessage, deleteMessage, updateTypingStatus } = useMessages(
    chat?.id || null,
    chat?.encryption_key || undefined
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [chat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !chat) return;

    const success = await sendMessage(messageInput, replyTo);
    if (success) {
      setMessageInput('');
      setReplyTo(null);
      updateTypingStatus(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (value: string) => {
    setMessageInput(value);
    updateTypingStatus(value.length > 0);
  };

  const handleReply = (messageId: string) => {
    setReplyTo(messageId);
    inputRef.current?.focus();
  };

  const handleEdit = async (messageId: string, content: string) => {
    await editMessage(messageId, content);
  };

  const handleDelete = async (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(messageId);
    }
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl text-gray-300 mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to School Chat</h3>
          <p className="text-gray-500">Select a chat to start messaging or create a new conversation</p>
        </div>
      </div>
    );
  }

  const getChatDisplayName = () => {
    if (chat.name) return chat.name;
    if (chat.type === 'announcement') return 'School Announcements';
    
    const otherParticipant = chat.participants?.find(p => p.user_id !== user?.id);
    return otherParticipant?.profile?.full_name || 'Unknown User';
  };

  const replyToMessage = replyTo ? messages.find(m => m.id === replyTo) : null;
  const isEncrypted = !!chat.encryption_key;

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getChatDisplayName()}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {chat.type === 'group' && (
                <span>{chat.participants?.length || 0} members</span>
              )}
              {isEncrypted && (
                <span className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  End-to-end encrypted
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.sender_id === user?.id}
              isEncrypted={isEncrypted}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
        
        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        {/* Reply Preview */}
        {replyToMessage && (
          <div className="mb-3 p-3 bg-gray-50 border-l-4 border-blue-500 rounded">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Replying to {replyToMessage.sender?.full_name}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  {replyToMessage.content}
                </div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};