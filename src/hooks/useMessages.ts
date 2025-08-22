import { useState, useEffect, useCallback } from 'react';
import { supabase, type MessageWithSender } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { encryptMessage, decryptMessage } from '../lib/encryption';

export const useMessages = (chatId: string | null, encryptionKey?: string) => {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<string[]>([]);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (*),
          reply_to_message:messages!reply_to (
            *,
            sender:profiles!sender_id (*)
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Decrypt messages if encryption key is available
      const decryptedMessages = data?.map(message => {
        if (message.encrypted_content && encryptionKey) {
          return {
            ...message,
            content: decryptMessage(message.encrypted_content, encryptionKey)
          };
        }
        return message;
      }) || [];

      setMessages(decryptedMessages as MessageWithSender[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [chatId, encryptionKey]);

  useEffect(() => {
    fetchMessages();

    if (!chatId) return;

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel(`messages:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        // Fetch the complete message with sender info
        fetchMessages();
      })
      .subscribe();

    // Subscribe to typing indicators (using presence)
    const typingSubscription = supabase
      .channel(`typing:${chatId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = supabase.channel(`typing:${chatId}`).presenceState();
        const typingUsers = Object.keys(state).filter(id => id !== user?.id);
        setTyping(typingUsers);
      })
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      typingSubscription.unsubscribe();
    };
  }, [chatId, fetchMessages, user?.id]);

  const sendMessage = async (content: string, replyTo?: string) => {
    if (!chatId || !user || !content.trim()) return;

    try {
      let messageData = {
        chat_id: chatId,
        sender_id: user.id,
        content: content.trim(),
        reply_to: replyTo,
        encrypted_content: null as string | null
      };

      // Encrypt message if encryption key is available
      if (encryptionKey) {
        messageData.encrypted_content = encryptMessage(content.trim(), encryptionKey);
        messageData.content = '[Encrypted Message]'; // Placeholder for database
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!chatId || !user) return;

    const channel = supabase.channel(`typing:${chatId}`);
    
    if (isTyping) {
      await channel.track({ user_id: user.id, typing: true });
    } else {
      await channel.untrack();
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return false;

    try {
      let updateData = {
        content: newContent.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
        encrypted_content: null as string | null
      };

      // Re-encrypt if encryption key is available
      if (encryptionKey) {
        updateData.encrypted_content = encryptMessage(newContent.trim(), encryptionKey);
        updateData.content = '[Encrypted Message]';
      }

      const { error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) {
        console.error('Error editing message:', error);
        return false;
      }

      await fetchMessages();
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) {
        console.error('Error deleting message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  };

  return {
    messages,
    loading,
    typing,
    sendMessage,
    editMessage,
    deleteMessage,
    updateTypingStatus,
    refetch: fetchMessages
  };
};