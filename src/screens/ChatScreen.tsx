import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GiftedChat, IMessage, User } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { supabase, type MessageWithSender, type ChatWithParticipants } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { encryptMessage, decryptMessage } from '../lib/encryption';

interface ChatScreenProps {
  route: {
    params: {
      chat: ChatWithParticipants;
    };
  };
  navigation: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { chat } = route.params;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!chat.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (*)
        `)
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const giftedMessages: IMessage[] = data?.map(message => {
        let content = message.content;
        
        // Decrypt if encrypted
        if (message.encrypted_content && chat.encryption_key) {
          try {
            content = decryptMessage(message.encrypted_content, chat.encryption_key);
          } catch (error) {
            console.error('Decryption failed:', error);
          }
        }

        return {
          _id: message.id,
          text: content,
          createdAt: new Date(message.created_at),
          user: {
            _id: message.sender_id || 'unknown',
            name: message.sender?.full_name || 'Unknown User',
            avatar: message.sender?.avatar_url || undefined,
          },
        };
      }) || [];

      setMessages(giftedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [chat.id, chat.encryption_key]);

  useEffect(() => {
    fetchMessages();

    // Set navigation title
    const getChatDisplayName = () => {
      if (chat.name) return chat.name;
      const otherParticipant = chat.participants?.find(p => p.user_id !== profile?.id);
      return otherParticipant?.profile?.full_name || 'Unknown User';
    };

    navigation.setOptions({
      title: getChatDisplayName(),
      headerRight: () => chat.encryption_key ? (
        <Ionicons name="lock-closed" size={20} color="#059669" style={{ marginRight: 16 }} />
      ) : null,
    });

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${chat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chat.id}`
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [chat, profile, navigation, fetchMessages]);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!user || newMessages.length === 0) return;

    const message = newMessages[0];
    
    try {
      let messageData = {
        chat_id: chat.id,
        sender_id: user.id,
        content: message.text,
        encrypted_content: null as string | null
      };

      // Encrypt message if encryption key is available
      if (chat.encryption_key) {
        messageData.encrypted_content = encryptMessage(message.text, chat.encryption_key);
        messageData.content = '[Encrypted Message]'; // Placeholder for database
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      // Optimistically add message to UI
      setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [user, chat]);

  const currentUser: User = {
    _id: user?.id || 'unknown',
    name: profile?.full_name || 'You',
    avatar: profile?.avatar_url || undefined,
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={currentUser}
        placeholder="Type your message..."
        alwaysShowSend
        renderAvatar={(props) => (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {props.currentMessage?.user.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        textInputStyle={styles.textInput}
        sendButtonProps={{
          style: styles.sendButton,
        }}
        messagesContainerStyle={styles.messagesContainer}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContainer: {
    backgroundColor: '#f8fafc',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
});