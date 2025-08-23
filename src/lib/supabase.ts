import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage implementation for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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