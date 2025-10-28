import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { theme } from '../theme/theme';

// Screens
import CampaignListScreen from '../screens/campaigns/CampaignListScreen';
import CampaignDetailScreen from '../screens/campaigns/CampaignDetailScreen';
import RegisterCampaignScreen from '../screens/campaigns/RegisterCampaignScreen';
import ExpertHelpScreen from '../screens/campaigns/ExpertHelpScreen';
import OutbreakDashboardScreen from '../screens/campaigns/OutbreakDashboardScreen';

const Stack = createStackNavigator();

const CampaignsStack = () => {
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
        name="CampaignList" 
        component={CampaignListScreen}
        options={{ title: 'Partner Campaigns' }}
      />
      <Stack.Screen 
        name="CampaignDetail" 
        component={CampaignDetailScreen}
        options={{ title: 'Campaign Details' }}
      />
      <Stack.Screen 
        name="RegisterCampaign" 
        component={RegisterCampaignScreen}
        options={{ title: 'Register for Campaign' }}
      />
      <Stack.Screen 
        name="ExpertHelp" 
        component={ExpertHelpScreen}
        options={{ title: 'Expert Help' }}
      />
      <Stack.Screen 
        name="OutbreakDashboard" 
        component={OutbreakDashboardScreen}
        options={{ title: 'Outbreak Dashboard' }}
      />
    </Stack.Navigator>
  );
};

export default CampaignsStack;
