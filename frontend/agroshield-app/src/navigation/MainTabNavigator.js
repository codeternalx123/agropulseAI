import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '../theme/theme';

// Stack Navigators
import FarmStack from './FarmStack';
import GroupsStack from './GroupsStack';
import CampaignsStack from './CampaignsStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'FarmTab':
              iconName = 'leaf';
              break;
            case 'GroupsTab':
              iconName = 'account-group';
              break;
            case 'CampaignsTab':
              iconName = 'bullhorn';
              break;
            case 'ProfileTab':
              iconName = 'account';
              break;
            default:
              iconName = 'help-circle';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.disabled,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen 
        name="FarmTab" 
        component={FarmStack}
        options={{ tabBarLabel: 'Farms' }}
      />
      <Tab.Screen 
        name="GroupsTab" 
        component={GroupsStack}
        options={{ tabBarLabel: 'Groups' }}
      />
      <Tab.Screen 
        name="CampaignsTab" 
        component={CampaignsStack}
        options={{ tabBarLabel: 'Campaigns' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
