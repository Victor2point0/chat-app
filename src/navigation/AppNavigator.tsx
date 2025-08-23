import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { NewChatScreen } from '../screens/NewChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ChatStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ChatList" 
      component={ChatListScreen} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Chat" 
      component={ChatScreen}
      options={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
      }}
    />
    <Stack.Screen 
      name="NewChat" 
      component={NewChatScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const MainTabs = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Announcements') {
            iconName = focused ? 'megaphone' : 'megaphone-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
          color: '#111827',
        },
      })}
    >
      <Tab.Screen 
        name="Chats" 
        component={ChatStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Announcements" 
        component={AnnouncementsScreen}
        options={{ title: 'Announcements' }}
      />
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{ title: 'Admin Panel' }}
        />
      )}
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You could show a loading screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};