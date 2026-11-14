import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { theme } from '@/lib/theme';

export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textDim,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Cây',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={typeof color === 'string' ? color : theme.textDim} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Quét',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={size} color={typeof color === 'string' ? color : theme.textDim} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={typeof color === 'string' ? color : theme.textDim} />
          ),
        }}
      />
    </Tabs>
  );
}
