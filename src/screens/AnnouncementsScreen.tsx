import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase, type Announcement } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const AnnouncementsScreen: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', is_pinned: false });
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          created_by_profile:profiles!created_by (full_name)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        return;
      }

      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const subscription = supabase
      .channel('announcements')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements'
      }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content,
            is_pinned: formData.is_pinned,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert({
            title: formData.title,
            content: formData.content,
            is_pinned: formData.is_pinned,
            created_by: profile?.id
          });

        if (error) throw error;
      }

      setFormData({ title: '', content: '', is_pinned: false });
      setShowModal(false);
      setEditingId(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      Alert.alert('Error', 'Failed to save announcement');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned
    });
    setEditingId(announcement.id);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchAnnouncements();
            } catch (error) {
              console.error('Error deleting announcement:', error);
              Alert.alert('Error', 'Failed to delete announcement');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => (
    <View style={[styles.announcementItem, item.is_pinned && styles.pinnedItem]}>
      <View style={styles.announcementHeader}>
        <View style={styles.titleContainer}>
          {item.is_pinned && (
            <Ionicons name="pin" size={16} color="#f59e0b" style={styles.pinIcon} />
          )}
          <Text style={styles.announcementTitle}>{item.title}</Text>
        </View>
        
        {isAdmin && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handleEdit(item)}
              style={styles.actionButton}
            >
              <Ionicons name="pencil" size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.actionButton}
            >
              <Ionicons name="trash" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <Text style={styles.announcementContent}>{item.content}</Text>
      
      <View style={styles.announcementFooter}>
        <Text style={styles.announcementAuthor}>
          By {(item as any).created_by_profile?.full_name || 'Unknown'}
        </Text>
        <Text style={styles.announcementDate}>
          {format(new Date(item.created_at), 'MMM dd, yyyy')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Announcements</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setFormData({ title: '', content: '', is_pinned: false });
              setEditingId(null);
              setShowModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={announcements}
        renderItem={renderAnnouncementItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={announcements.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No announcements yet</Text>
              <Text style={styles.emptySubtitle}>
                {isAdmin ? 'Create the first announcement for your school community.' : 'Check back later for updates.'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Add/Edit Modal */}
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
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.modalSaveButton}
            >
              <Text style={styles.modalSaveText}>
                {editingId ? 'Update' : 'Publish'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Announcement title..."
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Write your announcement..."
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.inputLabel}>Pin to top</Text>
              <Switch
                value={formData.is_pinned}
                onValueChange={(value) => setFormData({ ...formData, is_pinned: value })}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor={formData.is_pinned ? '#ffffff' : '#f3f4f6'}
              />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
  },
  announcementItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinnedItem: {
    borderWidth: 2,
    borderColor: '#fbbf24',
    backgroundColor: '#fef3c7',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinIcon: {
    marginRight: 8,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  announcementContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementAuthor: {
    fontSize: 14,
    color: '#6b7280',
  },
  announcementDate: {
    fontSize: 14,
    color: '#6b7280',
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});