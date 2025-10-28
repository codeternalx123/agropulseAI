import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { theme } from '../theme/theme';

// Screens
import GroupFeedScreen from '../screens/groups/GroupFeedScreen';
import CreatePostScreen from '../screens/groups/CreatePostScreen';
import PostDetailScreen from '../screens/groups/PostDetailScreen';
import PollsScreen from '../screens/groups/PollsScreen';
import ShowcaseScreen from '../screens/groups/ShowcaseScreen';

const Stack = createStackNavigator();

const GroupsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="GroupFeed" 
        component={GroupFeedScreen}
        options={{ title: 'Village Groups' }}
      />
      <Stack.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
        options={{ title: 'Create Post' }}
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen}
        options={{ title: 'Post Details' }}
      />
      <Stack.Screen 
        name="Polls" 
        component={PollsScreen}
        options={{ title: 'Community Polls' }}
      />
      <Stack.Screen 
        name="Showcase" 
        component={ShowcaseScreen}
        options={{ title: 'Weekly Showcase' }}
      />
    </Stack.Navigator>
  );
};

export default GroupsStack;
