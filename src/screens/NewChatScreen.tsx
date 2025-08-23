import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, type Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateEncryptionKey } from '../lib/encryption';

interface NewChatScreenProps {
  navigation: any;
}

export const NewChatScreen: React.FC<NewChatScreenProps> = ({ navigation }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatName, setChatName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

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
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    if (selectedUsers.length > 1 && !chatName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const finalChatType = selectedUsers.length === 1 ? 'private' : 'group';
      const encryptionKey = await generateEncryptionKey();

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
        Alert.alert('Error', 'Failed to create chat');
        return;
      }

      // Add participants
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
        Alert.alert('Error', 'Failed to add participants');
        return;
      }

      // Navigate to the new chat
      navigation.navigate('Chat', { chat });
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to create chat');
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

  const renderUserItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedUsers.includes(item.id) && styles.userItemSelected
      ]}
      onPress={() => toggleUserSelection(item.id)}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
      </View>

      {selectedUsers.includes(item.id) && (
        <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
        <TouchableOpacity
          onPress={handleCreateChat}
          disabled={selectedUsers.length === 0 || loading}
          style={[styles.createButton, (selectedUsers.length === 0 || loading) && styles.createButtonDisabled]}
        >
          <Text style={[styles.createButtonText, (selectedUsers.length === 0 || loading) && styles.createButtonTextDisabled]}>
            {loading ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {selectedUsers.length > 1 && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Enter group name..."
            value={chatName}
            onChangeText={setChatName}
          />
        </View>
      )}

      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>Selected ({selectedUsers.length})</Text>
          <View style={styles.selectedUsers}>
            {selectedUsers.map(userId => {
              const user = users.find(u => u.id === userId);
              return (
                <View key={userId} style={styles.selectedUser}>
                  <Text style={styles.selectedUserText}>{user?.full_name}</Text>
                  <TouchableOpacity
                    onPress={() => toggleUserSelection(userId)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? 'Try a different search term' : 'No users available'}
            </Text>
          </View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  createButtonTextDisabled: {
    color: '#9ca3af',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  groupNameContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  groupNameInput: {
    fontSize: 16,
    color: '#111827',
  },
  selectedContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  selectedUsers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedUserText: {
    fontSize: 14,
    color: '#1e40af',
    marginRight: 8,
  },
  removeButton: {
    padding: 2,
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userItemSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});