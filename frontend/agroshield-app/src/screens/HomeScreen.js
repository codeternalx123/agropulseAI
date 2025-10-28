import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();

  const features = [
    {
      id: 1,
      title: 'Farm Dashboard',
      description: 'Monitor your farm operations and get real-time insights',
      icon: 'view-dashboard',
      color: theme.colors.primary,
      gradient: theme.colors.gradientGreen,
      route: 'FarmerDashboard',
    },
    {
      id: 2,
      title: 'Growth Tracking',
      description: 'Track crop growth, pests, and soil health across your plots',
      icon: 'sprout',
      color: theme.colors.cropGold,
      gradient: [theme.colors.cropGold, theme.colors.harvestOrange],
      route: 'GrowthTracking',
    },
    {
      id: 3,
      title: 'AI Intelligence',
      description: 'Get AI-powered recommendations and predictions',
      icon: 'brain',
      color: theme.colors.skyBlue,
      gradient: [theme.colors.skyBlue, theme.colors.waterBlue],
      route: 'AIFarmIntelligence',
    },
    {
      id: 4,
      title: 'Storage Monitor',
      description: 'Monitor storage conditions with BLE sensors',
      icon: 'home-silo',
      color: theme.colors.soilBrown,
      gradient: [theme.colors.soilBrown, theme.colors.earthBrown],
      route: 'StorageBLE',
    },
    {
      id: 5,
      title: 'Marketplace',
      description: 'Buy and sell agricultural products and equipment',
      icon: 'shopping',
      color: theme.colors.harvestOrange,
      gradient: [theme.colors.harvestOrange, theme.colors.sunsetOrange],
      route: 'ExchangeMarketplace',
    },
    {
      id: 6,
      title: 'Notifications',
      description: 'Stay updated with alerts, reminders, and insights',
      icon: 'bell-ring',
      color: theme.colors.error,
      gradient: [theme.colors.error, '#D32F2F'],
      route: 'Notifications',
    },
  ];

  const renderFeatureCard = (feature) => (
    <Card
      key={feature.id}
      style={styles.card}
      onPress={() => navigation?.navigate(feature.route)}
    >
      <LinearGradient
        colors={feature.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <MaterialCommunityIcons
            name={feature.icon}
            size={48}
            color="#fff"
            style={styles.icon}
          />
          <Title style={styles.cardTitle}>{feature.title}</Title>
          <Paragraph style={styles.cardDescription}>{feature.description}</Paragraph>
        </View>
      </LinearGradient>
    </Card>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.colors.gradientGreen}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <MaterialCommunityIcons name="leaf" size={48} color="#fff" />
        <Title style={styles.headerTitle}>AgroShield</Title>
        <Paragraph style={styles.headerSubtitle}>
          Your Complete Farm Management Solution
        </Paragraph>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Features
        </Text>
        <View style={styles.grid}>
          {features.map(renderFeatureCard)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Empowering farmers with technology 🌾
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#aeec67ff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 16,
    minHeight: 180,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default HomeScreen;
