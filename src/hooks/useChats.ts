import { useState, useEffect } from 'react';
import { supabase, type ChatWithParticipants } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useChats = () => {
  const [chats, setChats] = useState<ChatWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchChats = async () => {
    if (!user) return;

    try {
      // Fetch chats where user is a participant or announcement chats
      const { data: chatData, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants!inner (
            *,
            profile:profiles (*)
          )
        `)
        .or(`chat_participants.user_id.eq.${user.id},type.eq.announcement`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        return;
      }

      // Transform the data to match our interface
      const transformedChats: ChatWithParticipants[] = chatData?.map(chat => ({
        ...chat,
        participants: chat.chat_participants || []
      })) || [];

      setChats(transformedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to real-time chat updates
    const subscription = supabase
      .channel('chats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats'
      }, () => {
        fetchChats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_participants'
      }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const createChat = async (
    name: string,
    type: 'private' | 'group',
    participantIds: string[],
    description?: string
  ) => {
    if (!user) return null;

    try {
      // Create the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name,
          type,
          description,
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat:', chatError);
        return null;
      }

      // Add participants
      const participants = [user.id, ...participantIds].map(userId => ({
        chat_id: chat.id,
        user_id: userId,
        is_admin: userId === user.id
      }));

      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantError) {
        console.error('Error adding participants:', participantError);
        return null;
      }

      await fetchChats();
      return chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  };

  return {
    chats,
    loading,
    createChat,
    refetch: fetchChats
  };
};