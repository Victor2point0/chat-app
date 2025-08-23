import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase, type ChatWithParticipants } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ChatListScreenProps {
  navigation: any;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
  const [chats, setChats] = useState<ChatWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, profile } = useAuth();

  const fetchChats = async () => {
    if (!user) return;

    try {
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

      const transformedChats: ChatWithParticipants[] = chatData?.map(chat => ({
        ...chat,
        participants: chat.chat_participants || []
      })) || [];

      setChats(transformedChats.filter(chat => chat.type !== 'announcement'));
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChats();

    const subscription = supabase
      .channel('chats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats'
      }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const getChatDisplayName = (chat: ChatWithParticipants) => {
    if (chat.name) return chat.name;
    
    const otherParticipant = chat.participants?.find(
      (p: any) => p.user_id !== profile?.id
    );
    return otherParticipant?.profile?.full_name || 'Unknown User';
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const renderChatItem = ({ item }: { item: ChatWithParticipants }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('Chat', { chat: item })}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {getChatDisplayName(item).charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {getChatDisplayName(item)}
          </Text>
          <Text style={styles.chatTime}>
            {format(new Date(item.last_message_at), 'HH:mm')}
          </Text>
        </View>
        
        <View style={styles.chatPreview}>
          <Text style={styles.chatDescription} numberOfLines={1}>
            {item.type === 'group' ? (
              `${item.participants?.length || 0} members`
            ) : (
              item.description || 'Private chat'
            )}
          </Text>
          {item.encryption_key && (
            <Ionicons name="lock-closed" size={12} color="#059669" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => navigation.navigate('NewChat')}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySubtitle}>
                Start a new conversation to get started
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  newChatButton: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatDescription: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});