import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Chat = Database['public']['Tables']['chats']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Announcement = Database['public']['Tables']['announcements']['Row'];
export type ChatParticipant = Database['public']['Tables']['chat_participants']['Row'];

export type UserRole = 'super_admin' | 'admin' | 'user';
export type ChatType = 'private' | 'group' | 'announcement';

export interface ChatWithParticipants extends Chat {
  participants: (ChatParticipant & { profile: Profile })[];
  last_message?: Message & { sender: Profile };
}

export interface MessageWithSender extends Message {
  sender: Profile;
  reply_to_message?: Message & { sender: Profile };
}