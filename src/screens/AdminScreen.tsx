import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, type Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const AdminScreen: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'user' as 'user' | 'admin' | 'super_admin',
    password: ''
  });
  const { profile } = useAuth();

  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        Alert.alert('Error', 'Failed to create user: ' + authError.message);
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        Alert.alert('Error', 'Failed to create user profile');
        return;
      }

      setNewUser({ email: '', full_name: '', role: 'user', password: '' });
      setShowModal(false);
      fetchUsers();
      Alert.alert('Success', 'User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        Alert.alert('Error', 'Failed to update user role');
        return;
      }

      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user status:', error);
        Alert.alert('Error', 'Failed to update user status');
        return;
      }

      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return '#ef4444';
      case 'admin': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const renderUserItem = ({ item }: { item: Profile }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
              <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                {item.role.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10b981' : '#ef4444' }]}>
              <Text style={styles.statusText}>
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {isSuperAdmin && item.id !== profile?.id && (
        <View style={styles.userActions}>
          <TouchableOpacity
            onPress={() => toggleUserStatus(item.id, item.is_active)}
            style={[styles.actionButton, { backgroundColor: item.is_active ? '#ef4444' : '#10b981' }]}
          >
            <Text style={styles.actionButtonText}>
              {item.is_active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        {isSuperAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="person-add" size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />

      {/* Add User Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New User</Text>
            <TouchableOpacity
              onPress={handleAddUser}
              style={styles.modalSaveButton}
            >
              <Text style={styles.modalSaveText}>Create</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="user@school.edu"
                value={newUser.email}
                onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="John Doe"
                value={newUser.full_name}
                onChangeText={(text) => setNewUser({ ...newUser, full_name: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Temporary Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Minimum 6 characters"
                value={newUser.password}
                onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                secureTextEntry
                minLength={6}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.roleSelector}>
                {(['user', 'admin', 'super_admin'] as const).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      newUser.role === role && styles.roleOptionSelected
                    ]}
                    onPress={() => setNewUser({ ...newUser, role })}
                  >
                    <Text style={[
                      styles.roleOptionText,
                      newUser.role === role && styles.roleOptionTextSelected
                    ]}>
                      {role.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  userActions: {
    marginLeft: 16,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalSaveButton: {
    padding: 4,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  roleOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  roleOptionTextSelected: {
    color: '#ffffff',
  },
});