import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Farmer Screens
import FarmerDashboardScreen from '../screens/farmer/FarmerDashboardScreen';
import SoilScanScreen from '../screens/farmer/SoilScanScreen';
import SoilAnalysisScreen from '../screens/farmer/SoilAnalysisScreen';
import BudgetCalculatorScreen from '../screens/farmer/BudgetCalculatorScreen';
import EditLocationScreen from '../screens/farmer/EditLocationScreen';
import FarmerMarketplace from '../screens/FarmerMarketplace';
import GrowthTrackingScreen from '../screens/farmer/GrowthTrackingScreen';
import CreatePlotScreen from '../screens/farmer/CreatePlotScreen';
import PlotDetailsScreen from '../screens/farmer/PlotDetailsScreen';

// AI Intelligence Screens
import StorageBLEScreen from '../screens/StorageBLE';
import AIFarmIntelligenceScreen from '../screens/AIFarmIntelligenceScreen';
import NotificationsScreen from '../screens/Notifications';

// Exchange Marketplace Screens
import ExchangeMarketplaceScreen from '../screens/ExchangeMarketplaceScreen';
import CreateAssetListingScreen from '../screens/CreateAssetListingScreen';
import AssetDetailsScreen from '../screens/AssetDetailsScreen';
import MarketLinkagesScreen from '../screens/MarketLinkagesScreen';

// Drone Intelligence Screens
import DroneIntelligenceDashboard from '../screens/DroneIntelligenceDashboard';

// Buyer Screens
import BuyerMarketplace from '../screens/BuyerMarketplace';

// Shared Screens
import HomeScreen from '../screens/HomeScreen';

import { useAuth } from '../context/AuthContext.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right' 
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Farmer Tab Navigator
const FarmerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = 'view-dashboard';
        } else if (route.name === 'Marketplace') {
          iconName = 'store';
        }

        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#4CAF50',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={FarmerDashboard}
      options={{ 
        title: 'Farmer Dashboard',
        headerShown: false
      }}
    />
    <Tab.Screen 
      name="Marketplace" 
      component={FarmerMarketplace}
      options={{ 
        title: 'Marketplace',
        headerShown: false
      }}
    />
  </Tab.Navigator>
);

// Farmer Dashboard Stack (includes modal screens)
const FarmerDashboard = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="FarmerDashboard" 
      component={FarmerDashboardScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="EditLocation" 
      component={EditLocationScreen}
      options={{ 
        title: 'Edit Location',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF',
        presentation: 'modal'
      }}
    />
    <Stack.Screen 
      name="SoilScan" 
      component={SoilScanScreen}
      options={{ 
        title: 'Scan Soil',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="SoilAnalysis" 
      component={SoilAnalysisScreen}
      options={{ 
        title: 'Soil Analysis Results',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="BudgetCalculator" 
      component={BudgetCalculatorScreen}
      options={{ 
        title: 'Budget Calculator',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="WeatherForecast" 
      component={HomeScreen}
      options={{ 
        title: '6-Month Weather Forecast',
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="GrowthTracking" 
      component={GrowthTrackingScreen}
      options={{ 
        title: 'Growth Tracking',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="CreatePlot" 
      component={CreatePlotScreen}
      options={{ 
        title: 'Create New Plot',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="PlotDetails" 
      component={PlotDetailsScreen}
      options={{ 
        title: 'Plot Details',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="StorageBLE" 
      component={StorageBLEScreen}
      options={{ 
        title: 'Storage Monitoring',
        headerStyle: { backgroundColor: '#FF5722' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="AIFarmIntelligence" 
      component={AIFarmIntelligenceScreen}
      options={{ 
        title: 'AI Farm Intelligence',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="Notifications" 
      component={NotificationsScreen}
      options={{ 
        title: 'Notifications',
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="ExchangeMarketplace" 
      component={ExchangeMarketplaceScreen}
      options={{ 
        title: 'AgroPulse Exchange',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="CreateAssetListing" 
      component={CreateAssetListingScreen}
      options={{ 
        title: 'Create Asset Listing',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="AssetDetails" 
      component={AssetDetailsScreen}
      options={{ 
        title: 'Asset Details',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="MarketLinkages" 
      component={MarketLinkagesScreen}
      options={{ 
        title: 'Market Linkages',
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#FFF'
      }}
    />
    <Stack.Screen 
      name="DroneIntelligence" 
      component={DroneIntelligenceDashboard}
      options={{ 
        title: 'Drone Intelligence',
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#FFF'
      }}
    />
  </Stack.Navigator>
);

// Buyer Tab Navigator
const BuyerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Browse') {
          iconName = 'shopping';
        }

        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2d6a4f',
      tabBarInactiveTintColor: 'gray',
      headerShown: true,
      headerStyle: {
        backgroundColor: '#2d6a4f',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    })}
  >
    <Tab.Screen 
      name="Browse" 
      component={BuyerMarketplace}
      options={{ title: 'Browse Produce' }}
    />
  </Tab.Navigator>
);

// Main App Stack Navigator
const AppStack = () => {
  const { isFarmer, isBuyer } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Home">
        {() => (isFarmer ? <FarmerTabs /> : <BuyerTabs />)}
      </Stack.Screen>
      <Stack.Screen name="FarmerMarketplace" component={FarmerTabs} />
      <Stack.Screen name="BuyerMarketplace" component={BuyerTabs} />
    </Stack.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigator;
