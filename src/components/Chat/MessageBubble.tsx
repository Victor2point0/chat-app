import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2, Reply, Lock } from 'lucide-react';
import { type MessageWithSender } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwnMessage: boolean;
  isEncrypted: boolean;
  onReply: (messageId: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  isEncrypted,
  onReply,
  onEdit,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const { profile } = useAuth();

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const canDelete = isOwnMessage || isAdmin;
  const canEdit = isOwnMessage;

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        {/* Sender name and timestamp */}
        <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <span className="text-sm font-medium text-gray-700">
            {isOwnMessage ? 'You' : message.sender?.full_name}
          </span>
          {isEncrypted && (
            <Lock className="w-3 h-3 text-green-600" title="End-to-end encrypted" />
          )}
          <span className="text-xs text-gray-500">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {message.is_edited && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>

        {/* Reply reference */}
        {message.reply_to_message && (
          <div className="mb-2 p-2 bg-gray-100 border-l-4 border-gray-300 rounded text-sm">
            <div className="font-medium text-gray-600 text-xs mb-1">
              Replying to {message.reply_to_message.sender?.full_name}
            </div>
            <div className="text-gray-700 truncate">
              {message.reply_to_message.content}
            </div>
          </div>
        )}

        {/* Message content */}
        <div
          className={`relative px-4 py-2 rounded-lg ${
            isOwnMessage
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full bg-transparent border-none outline-none resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}

          {/* Action buttons */}
          {showActions && !isEditing && (
            <div
              className={`absolute top-0 ${
                isOwnMessage ? '-left-20' : '-right-20'
              } flex space-x-1 bg-white shadow-lg rounded-lg p-1 opacity-90`}
            >
              <button
                onClick={() => onReply(message.id)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Reply"
              >
                <Reply className="w-3 h-3 text-gray-600" />
              </button>
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <Edit2 className="w-3 h-3 text-gray-600" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};