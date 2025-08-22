import React, { useState, useEffect } from 'react';
import { Plus, Pin, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase, type Announcement } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const AnnouncementList: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    // Subscribe to real-time updates
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

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
      setShowForm(false);
      setEditingId(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentPinned })
        .eq('id', id);

      if (error) throw error;
      fetchAnnouncements();
    } catch (error) {
      console.error('Error updating pin status:', error);
    }
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">School Announcements</h2>
            <p className="text-gray-600">Important updates and news for everyone</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setFormData({ title: '', content: '', is_pinned: false });
                  setEditingId(null);
                }
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </button>
          )}
        </div>
      </div>

      {/* New/Edit Announcement Form */}
      {isAdmin && showForm && (
        <div className="bg-white border-b border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Announcement title..."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Write your announcement..."
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_pinned"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_pinned" className="ml-2 block text-sm text-gray-700">
                Pin this announcement to the top
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update' : 'Publish'} Announcement
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ title: '', content: '', is_pinned: false });
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading announcements...</div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl text-gray-300 mb-4">📢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Announcements Yet</h3>
            <p className="text-gray-500">
              {isAdmin ? 'Create the first announcement for your school community.' : 'Check back later for updates.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`bg-white rounded-lg shadow-sm border p-6 ${
                  announcement.is_pinned ? 'ring-2 ring-yellow-200 bg-yellow-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {announcement.is_pinned && (
                      <Pin className="w-4 h-4 text-yellow-600" />
                    )}
                    <h3 className="text-xl font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => togglePin(announcement.id, announcement.is_pinned)}
                        className={`p-2 rounded-lg transition-colors ${
                          announcement.is_pinned
                            ? 'text-yellow-600 hover:bg-yellow-100'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="prose max-w-none mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <span>
                    Published by {(announcement as any).created_by_profile?.full_name || 'Unknown'}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{format(new Date(announcement.created_at), 'MMM dd, yyyy at HH:mm')}</span>
                  {announcement.updated_at !== announcement.created_at && (
                    <>
                      <span className="mx-2">•</span>
                      <span>Edited {format(new Date(announcement.updated_at), 'MMM dd, yyyy at HH:mm')}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};