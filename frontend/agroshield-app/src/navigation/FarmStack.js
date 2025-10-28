import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { theme } from '../theme/theme';

// Screens
import FarmListScreen from '../screens/farm/FarmListScreen';
import AddFarmScreen from '../screens/farm/AddFarmScreen';
import FarmDetailScreen from '../screens/farm/FarmDetailScreen';
import SoilAnalysisScreen from '../screens/farm/SoilAnalysisScreen';
import CalendarScreen from '../screens/farm/CalendarScreen';
import PestScanScreen from '../screens/farm/PestScanScreen';

const Stack = createStackNavigator();

const FarmStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#701c1cff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="FarmList" 
        component={FarmListScreen}
        options={{ title: 'My Farms' }}
      />
      <Stack.Screen 
        name="AddFarm" 
        component={AddFarmScreen}
        options={{ title: 'Register Farm' }}
      />
      <Stack.Screen 
        name="FarmDetail" 
        component={FarmDetailScreen}
        options={{ title: 'Farm Details' }}
      />
      <Stack.Screen 
        name="SoilAnalysis" 
        component={SoilAnalysisScreen}
        options={{ title: 'Soil Analysis' }}
      />
      <Stack.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{ title: 'Farming Calendar' }}
      />
      <Stack.Screen 
        name="PestScan" 
        component={PestScanScreen}
        options={{ title: 'Pest Detection' }}
      />
    </Stack.Navigator>
  );
};

export default FarmStack;
