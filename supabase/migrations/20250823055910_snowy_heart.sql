/*
  # School Messaging App Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (enum: super_admin, admin, user)
      - `avatar_url` (text, optional)
      - `is_active` (boolean, default true)
      - `last_seen` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `chats`
      - `id` (uuid, primary key)
      - `name` (text, optional for private chats)
      - `type` (enum: private, group, announcement)
      - `description` (text, optional)
      - `encryption_key` (text, for E2E encryption)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_message_at` (timestamp)

    - `chat_participants`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats)
      - `user_id` (uuid, references profiles)
      - `joined_at` (timestamp)
      - `is_admin` (boolean, for group chat admins)

    - `messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats)
      - `sender_id` (uuid, references profiles)
      - `content` (text)
      - `encrypted_content` (text, for E2E encryption)
      - `message_type` (text, default 'text')
      - `reply_to` (uuid, references messages)
      - `is_edited` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `announcements`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `created_by` (uuid, references profiles)
      - `is_pinned` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
    - Ensure proper access control for different user types
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');
CREATE TYPE chat_type AS ENUM ('private', 'group', 'announcement');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role DEFAULT 'user',
  avatar_url text,
  is_active boolean DEFAULT true,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  type chat_type DEFAULT 'private',
  description text,
  encryption_key text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  is_admin boolean DEFAULT false,
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  encrypted_content text,
  message_type text DEFAULT 'text',
  reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  is_edited boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Chats policies
CREATE POLICY "Users can view chats they participate in"
  ON chats FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = uid()
    ) OR type = 'announcement'
  );

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (uid() = created_by);

CREATE POLICY "Chat admins can update chats"
  ON chats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_id = chats.id 
      AND user_id = uid() 
      AND is_admin = true
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Chat participants policies
CREATE POLICY "Users can view participants of their chats"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = uid()
    )
  );

CREATE POLICY "Chat admins can manage participants"
  ON chat_participants FOR ALL
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = uid() 
      AND is_admin = true
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = uid()
    ) OR chat_id IN (
      SELECT id FROM chats 
      WHERE type = 'announcement'
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    uid() = sender_id AND (
      chat_id IN (
        SELECT chat_id FROM chat_participants 
        WHERE user_id = uid()
      ) OR chat_id IN (
        SELECT id FROM chats 
        WHERE type = 'announcement' 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = uid() 
          AND role IN ('super_admin', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = uid());

CREATE POLICY "Admins can delete any message"
  ON messages FOR DELETE
  TO authenticated
  USING (
    sender_id = uid() OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Announcements policies
CREATE POLICY "Everyone can view announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Function to update chat last_message_at
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET last_message_at = NEW.created_at 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat last_message_at when new message is inserted
CREATE TRIGGER trigger_update_chat_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_message();

-- Insert demo super admin user (password: password123)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES (
  gen_random_uuid(),
  'admin@school.edu',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Insert corresponding profile
INSERT INTO profiles (id, email, full_name, role)
SELECT id, email, 'Super Administrator', 'super_admin'
FROM auth.users 
WHERE email = 'admin@school.edu'
ON CONFLICT (email) DO NOTHING;