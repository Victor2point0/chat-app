export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'super_admin' | 'admin' | 'user';
          avatar_url: string | null;
          is_active: boolean;
          last_seen: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: 'super_admin' | 'admin' | 'user';
          avatar_url?: string | null;
          is_active?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'super_admin' | 'admin' | 'user';
          avatar_url?: string | null;
          is_active?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          name: string | null;
          type: 'private' | 'group' | 'announcement';
          description: string | null;
          encryption_key: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          type?: 'private' | 'group' | 'announcement';
          description?: string | null;
          encryption_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          type?: 'private' | 'group' | 'announcement';
          description?: string | null;
          encryption_key?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string;
        };
      };
      chat_participants: {
        Row: {
          id: string;
          chat_id: string;
          user_id: string;
          joined_at: string;
          is_admin: boolean;
        };
        Insert: {
          id?: string;
          chat_id: string;
          user_id: string;
          joined_at?: string;
          is_admin?: boolean;
        };
        Update: {
          id?: string;
          chat_id?: string;
          user_id?: string;
          joined_at?: string;
          is_admin?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string | null;
          content: string;
          encrypted_content: string | null;
          message_type: string;
          reply_to: string | null;
          is_edited: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id?: string | null;
          content: string;
          encrypted_content?: string | null;
          message_type?: string;
          reply_to?: string | null;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string | null;
          content?: string;
          encrypted_content?: string | null;
          message_type?: string;
          reply_to?: string | null;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          created_by: string | null;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          created_by?: string | null;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          created_by?: string | null;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}