import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext.js';

const WelcomeScreen = ({ navigation }) => {
  const { profile, isFarmer, isBuyer } = useAuth();

  const farmerFeatures = [
    {
      icon: 'store',
      title: 'List Your Produce',
      description: 'Sell to buyers across multiple regions',
      route: 'FarmerMarketplace',
    },
    {
      icon: 'chart-line',
      title: 'Track Growth',
      description: 'Monitor your crops with AI insights',
      route: 'GrowthTracking',
    },
    {
      icon: 'camera',
      title: 'Scan Plants',
      description: 'Detect pests and diseases instantly',
      route: 'PlantScanner',
    },
    {
      icon: 'calendar',
      title: 'Farming Calendar',
      description: 'Get AI-optimized schedules',
      route: 'FarmCalendar',
    },
  ];

  const buyerFeatures = [
    {
      icon: 'shopping',
      title: 'Browse Marketplace',
      description: 'Source quality produce from verified farmers',
      route: 'BuyerMarketplace',
    },
    {
      icon: 'map-marker-radius',
      title: 'Regional Search',
      description: 'Find produce across multiple regions',
      route: 'RegionalSearch',
    },
    {
      icon: 'chart-box',
      title: 'Supply Forecast',
      description: 'AI-powered supply predictions',
      route: 'SupplyForecast',
    },
    {
      icon: 'truck-delivery',
      title: 'Logistics Support',
      description: 'Arrange delivery and transportation',
      route: 'LogisticsSupport',
    },
  ];

  const features = isFarmer ? farmerFeatures : buyerFeatures;

  const handleGetStarted = () => {
    if (isFarmer) {
      navigation.replace('FarmerMarketplace');
    } else {
      navigation.replace('BuyerMarketplace');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={isFarmer ? 'leaf' : 'shopping'}
          size={80}
          color="#2d6a4f"
        />
        <Text style={styles.welcomeTitle}>Welcome to Agropulse AI! 🎉</Text>
        <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {isFarmer ? '🌾 FARMER' : '🛒 BUYER'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>
          {isFarmer ? 'What You Can Do:' : 'How to Get Started:'}
        </Text>

        {features.map((feature, index) => (
          <TouchableOpacity
            key={index}
            style={styles.featureCard}
            onPress={() => navigation.navigate(feature.route)}
          >
            <View style={styles.featureIcon}>
              <MaterialCommunityIcons
                name={feature.icon}
                size={32}
                color="#2d6a4f"
              />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#999"
            />
          </TouchableOpacity>
        ))}
      </View>

      {isFarmer && (
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="lightbulb" size={24} color="#ff9800" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Quick Tip for Farmers</Text>
            <Text style={styles.tipText}>
              Start by listing your upcoming harvest on the marketplace. Buyers can
              pre-book your produce and you'll get better prices! 🌟
            </Text>
          </View>
        </View>
      )}

      {isBuyer && (
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="lightbulb" size={24} color="#ff9800" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Quick Tip for Buyers</Text>
            <Text style={styles.tipText}>
              Use the supply forecast to plan ahead! Lock in prices before harvest
              peaks to get the best deals. 💰
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.getStartedButton}
        onPress={handleGetStarted}
      >
        <Text style={styles.getStartedText}>
          {isFarmer ? 'Go to Marketplace' : 'Start Browsing'}
        </Text>
        <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.replace('Home')}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d6a4f',
    marginTop: 16,
    textAlign: 'center',
  },
  userName: {
    fontSize: 20,
    color: '#666',
    marginTop: 8,
  },
  badge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d6a4f',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#e8f5e9',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  getStartedButton: {
    flexDirection: 'row',
    backgroundColor: '#2d6a4f',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  getStartedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 40,
  },
  skipText: {
    color: '#999',
    fontSize: 16,
  },
});

export default WelcomeScreen;
