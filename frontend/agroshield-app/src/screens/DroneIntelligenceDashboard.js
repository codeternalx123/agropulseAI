/**
 * Drone Intelligence Dashboard
 * ============================
 * Central hub for drone-based harvest intelligence:
 * - 3D farm visualization
 * - NDVI health mapping
 * - Yield predictions
 * - Optimal harvest windows
 * - Pre-harvest marketplace
 * - Farmer aggregation bundles
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import droneIntelligenceService from '../services/droneIntelligenceService';

const { width } = Dimensions.get('window');

const DroneIntelligenceDashboard = ({ navigation, route }) => {
  const { farmId, userId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'analysis', 'marketplace'

  // Data State
  const [flights, setFlights] = useState([]);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [yieldPredictions, setYieldPredictions] = useState([]);
  const [harvestWindow, setHarvestWindow] = useState(null);
  const [preHarvestListings, setPreHarvestListings] = useState([]);
  const [aggregationBundles, setAggregationBundles] = useState([]);
  const [harvestAlerts, setHarvestAlerts] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadFlights(),
        loadYieldPredictions(),
        loadHarvestWindow(),
        loadMarketplaceData(),
        loadHarvestAlerts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFlights = async () => {
    const result = await droneIntelligenceService.getFarmFlights(farmId);
    if (result.success) {
      setFlights(result.flights);
      
      // Load latest analysis
      if (result.flights.length > 0) {
        const latestFlight = result.flights[result.flights.length - 1];
        const analysisResult = await droneIntelligenceService.getMultispectralAnalysis(latestFlight.flight_id);
        if (analysisResult.success) {
          setLatestAnalysis(analysisResult.analysis);
        }
      }
    }
  };

  const loadYieldPredictions = async () => {
    const result = await droneIntelligenceService.getFarmYieldPredictions(farmId);
    if (result.success) {
      setYieldPredictions(result.predictions);
    }
  };

  const loadHarvestWindow = async () => {
    const result = await droneIntelligenceService.getHarvestWindow(farmId);
    if (result.success) {
      setHarvestWindow(result.window);
    }
  };

  const loadMarketplaceData = async () => {
    const listingsResult = await droneIntelligenceService.getPreHarvestListings();
    if (listingsResult.success) {
      setPreHarvestListings(listingsResult.listings);
    }

    const bundlesResult = await droneIntelligenceService.getAggregationBundles();
    if (bundlesResult.success) {
      setAggregationBundles(bundlesResult.bundles);
    }
  };

  const loadHarvestAlerts = async () => {
    const result = await droneIntelligenceService.getFarmerHarvestAlerts(userId);
    if (result.success) {
      setHarvestAlerts(result.alerts);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handlePlanDroneFlight = () => {
    navigation.navigate('PlanDroneFlight', { farmId });
  };

  const handleCreatePreHarvestListing = () => {
    if (yieldPredictions.length === 0) {
      Alert.alert('No Predictions', 'Please run a drone flight and yield prediction first');
      return;
    }
    navigation.navigate('CreatePreHarvestListing', {
      farmId,
      userId,
      prediction: yieldPredictions[0]
    });
  };

  const handleConfirmHarvesting = async (alertId) => {
    Alert.alert(
      'Confirm Harvesting',
      'Have you started harvesting? This will notify buyers and logistics partners.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const result = await droneIntelligenceService.confirmHarvestingStarted(alertId);
            if (result.success) {
              Alert.alert('Success', result.message);
              loadHarvestAlerts();
            } else {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Harvest Alerts */}
      {harvestAlerts.length > 0 && (
        <View style={[styles.card, styles.alertCard]}>
          <View style={styles.alertHeader}>
            <MaterialCommunityIcons name="alert-circle" size={32} color="#FF9800" />
            <Text style={styles.alertTitle}>🌾 OPTIMAL HARVEST WINDOW!</Text>
          </View>
          {harvestAlerts.map((alert, index) => (
            <View key={index} style={styles.alertContent}>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              {!alert.farmer_confirmed_harvesting && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => handleConfirmHarvesting(alert.alert_id)}
                >
                  <Text style={styles.confirmButtonText}>✓ Confirm Harvesting Started</Text>
                </TouchableOpacity>
              )}
              {alert.farmer_confirmed_harvesting && (
                <View style={styles.confirmedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.confirmedText}>Harvesting in progress</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="quadcopter" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{flights.length}</Text>
          <Text style={styles.statLabel}>Drone Flights</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="chart-line" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>{yieldPredictions.length}</Text>
          <Text style={styles.statLabel}>Predictions</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="basket" size={32} color="#FF9800" />
          <Text style={styles.statValue}>
            {yieldPredictions.length > 0
              ? droneIntelligenceService.formatYield(yieldPredictions[0].predicted_yield_kg)
              : '0'}
          </Text>
          <Text style={styles.statLabel}>Predicted Yield (kg)</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="currency-usd" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>
            {yieldPredictions.length > 0
              ? `${(yieldPredictions[0].predicted_total_value_kes / 1000).toFixed(0)}K`
              : '0'}
          </Text>
          <Text style={styles.statLabel}>Est. Value (KES)</Text>
        </View>
      </View>

      {/* Latest Yield Prediction */}
      {yieldPredictions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest Yield Prediction</Text>
          {renderYieldPredictionCard(yieldPredictions[0])}
        </View>
      )}

      {/* Harvest Window */}
      {harvestWindow && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Optimal Harvest Window</Text>
          {renderHarvestWindowCard(harvestWindow)}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePlanDroneFlight}>
            <MaterialCommunityIcons name="plus-circle" size={24} color="#FFF" />
            <Text style={styles.actionButtonText}>Plan Flight</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleCreatePreHarvestListing}>
            <MaterialCommunityIcons name="sale" size={24} color="#FFF" />
            <Text style={styles.actionButtonText}>List for Sale</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAnalysisTab = () => (
    <View style={styles.tabContent}>
      {/* NDVI Analysis */}
      {latestAnalysis && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Multispectral Analysis (NDVI)</Text>
          {renderMultispectralAnalysis(latestAnalysis)}
        </View>
      )}

      {/* Flight History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Drone Flights</Text>
        {flights.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="quadcopter" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No flights recorded</Text>
            <TouchableOpacity style={styles.planFlightButton} onPress={handlePlanDroneFlight}>
              <Text style={styles.planFlightButtonText}>Plan Your First Flight</Text>
            </TouchableOpacity>
          </View>
        ) : (
          flights.map((flight, index) => renderFlightCard(flight, index))
        )}
      </View>

      {/* Yield Predictions History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Yield Predictions History</Text>
        {yieldPredictions.map((prediction, index) => renderYieldPredictionCard(prediction, index))}
      </View>
    </View>
  );

  const renderMarketplaceTab = () => (
    <View style={styles.tabContent}>
      {/* Pre-Harvest Listings */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Pre-Harvest Marketplace</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreatePreHarvestListing}>
            <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardSubtitle}>Sell your crop before harvest - guaranteed market access</Text>

        {preHarvestListings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="sale" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No pre-harvest listings</Text>
          </View>
        ) : (
          preHarvestListings.slice(0, 5).map((listing, index) => renderPreHarvestListingCard(listing, index))
        )}
      </View>

      {/* Aggregation Bundles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Farmer Aggregation Bundles</Text>
        <Text style={styles.cardSubtitle}>Join with other farmers for bulk sales</Text>

        {aggregationBundles.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No active bundles</Text>
          </View>
        ) : (
          aggregationBundles.slice(0, 3).map((bundle, index) => renderAggregationBundleCard(bundle, index))
        )}
      </View>
    </View>
  );

  const renderYieldPredictionCard = (prediction, index) => {
    const gradeInfo = droneIntelligenceService.getQualityGradeInfo(prediction.predicted_quality_grade);
    
    return (
      <View key={index} style={styles.predictionCard}>
        <View style={styles.predictionHeader}>
          <View style={styles.cropBadge}>
            <MaterialCommunityIcons name="leaf" size={20} color="#4CAF50" />
            <Text style={styles.cropText}>{prediction.crop_type}</Text>
          </View>
          <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.color }]}>
            <Text style={styles.gradeIcon}>{gradeInfo.icon}</Text>
            <Text style={styles.gradeText}>{gradeInfo.label}</Text>
          </View>
        </View>

        <View style={styles.predictionStats}>
          <View style={styles.predictionStat}>
            <Text style={styles.predictionStatLabel}>Predicted Yield</Text>
            <Text style={styles.predictionStatValue}>
              {droneIntelligenceService.formatYield(prediction.predicted_yield_kg)} kg
            </Text>
            <Text style={styles.predictionStatSubtext}>
              {droneIntelligenceService.formatYield(prediction.predicted_yield_per_hectare_kg)} kg/ha
            </Text>
          </View>
          <View style={styles.predictionStat}>
            <Text style={styles.predictionStatLabel}>Est. Value</Text>
            <Text style={styles.predictionStatValue}>
              {droneIntelligenceService.formatCurrency(prediction.predicted_total_value_kes)}
            </Text>
            <Text style={styles.predictionStatSubtext}>
              @ KES {prediction.predicted_market_price_kes_kg.toFixed(2)}/kg
            </Text>
          </View>
        </View>

        <View style={styles.confidenceBar}>
          <Text style={styles.confidenceLabel}>Confidence: {prediction.confidence_percentage.toFixed(0)}%</Text>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceFill, { width: `${prediction.confidence_percentage}%` }]} />
          </View>
        </View>

        <View style={styles.factorsSection}>
          {prediction.positive_factors.length > 0 && (
            <View style={styles.factorsBox}>
              <Text style={styles.factorsTitle}>✓ Positive Factors</Text>
              {prediction.positive_factors.map((factor, idx) => (
                <Text key={idx} style={styles.factorItem}>• {factor}</Text>
              ))}
            </View>
          )}
          {prediction.risk_factors.length > 0 && (
            <View style={styles.factorsBox}>
              <Text style={[styles.factorsTitle, { color: '#F44336' }]}>⚠ Risk Factors</Text>
              {prediction.risk_factors.map((factor, idx) => (
                <Text key={idx} style={[styles.factorItem, { color: '#F44336' }]}>• {factor}</Text>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.maturityText}>
          Days to Maturity: {prediction.days_to_maturity} days
        </Text>
      </View>
    );
  };

  const renderHarvestWindowCard = (window) => {
    const daysUntil = droneIntelligenceService.daysUntil(window.optimal_harvest_date);
    
    return (
      <View style={styles.harvestWindowCard}>
        <View style={styles.windowHeader}>
          <MaterialCommunityIcons name="calendar-check" size={32} color="#4CAF50" />
          <View style={styles.windowHeaderText}>
            <Text style={styles.windowTitle}>Optimal Harvest Date</Text>
            <Text style={styles.windowDate}>
              {new Date(window.optimal_harvest_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <Text style={styles.windowDaysUntil}>
              {daysUntil > 0 ? `${daysUntil} days from now` : 'Harvest NOW!'}
            </Text>
          </View>
        </View>

        <View style={styles.windowStats}>
          <View style={styles.windowStat}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={24} color="#2196F3" />
            <Text style={styles.windowStatLabel}>Rain Risk</Text>
            <Text style={styles.windowStatValue}>{window.rain_risk_percentage.toFixed(0)}%</Text>
          </View>
          <View style={styles.windowStat}>
            <MaterialCommunityIcons name="thermometer" size={24} color="#FF5722" />
            <Text style={styles.windowStatLabel}>Heat Stress</Text>
            <Text style={styles.windowStatValue}>{window.heat_stress_risk.toFixed(0)}%</Text>
          </View>
          <View style={styles.windowStat}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />
            <Text style={styles.windowStatLabel}>Duration</Text>
            <Text style={styles.windowStatValue}>{window.estimated_harvest_duration_days.toFixed(1)} days</Text>
          </View>
        </View>

        <View style={styles.windowRecommendation}>
          <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FF9800" />
          <Text style={styles.recommendationText}>{window.weather_recommendation}</Text>
        </View>

        <View style={styles.windowLogistics}>
          <Text style={styles.logisticsTitle}>Logistics Requirements</Text>
          <Text style={styles.logisticsItem}>👥 Labor: {window.required_labor_count} people</Text>
          {window.required_equipment.map((equipment, idx) => (
            <Text key={idx} style={styles.logisticsItem}>🚜 {equipment}</Text>
          ))}
        </View>
      </View>
    );
  };

  const renderMultispectralAnalysis = (analysis) => {
    const gradeInfo = droneIntelligenceService.getQualityGradeInfo(analysis.quality_grade);
    
    return (
      <View style={styles.analysisCard}>
        <View style={styles.ndviHeader}>
          <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.color }]}>
            <Text style={styles.gradeIcon}>{gradeInfo.icon}</Text>
            <Text style={styles.gradeText}>{gradeInfo.label}</Text>
          </View>
          <Text style={styles.uniformityScore}>
            Uniformity: {analysis.uniformity_score.toFixed(0)}%
          </Text>
        </View>

        {/* NDVI Map Placeholder */}
        <View style={styles.ndviMapPlaceholder}>
          <MaterialCommunityIcons name="map" size={48} color="#4CAF50" />
          <Text style={styles.ndviMapText}>NDVI Health Map</Text>
          <Text style={styles.ndviMapSubtext}>Tap to view full resolution</Text>
        </View>

        <View style={styles.healthStats}>
          <View style={styles.healthStat}>
            <View style={[styles.healthIndicator, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.healthLabel}>Healthy</Text>
            <Text style={styles.healthValue}>{analysis.healthy_vegetation_percentage.toFixed(0)}%</Text>
          </View>
          <View style={styles.healthStat}>
            <View style={[styles.healthIndicator, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.healthLabel}>Stressed</Text>
            <Text style={styles.healthValue}>{analysis.stressed_vegetation_percentage.toFixed(0)}%</Text>
          </View>
          <View style={styles.healthStat}>
            <View style={[styles.healthIndicator, { backgroundColor: '#795548' }]} />
            <Text style={styles.healthLabel}>Bare Soil</Text>
            <Text style={styles.healthValue}>{analysis.bare_soil_percentage.toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.ndviMetrics}>
          <View style={styles.ndviMetric}>
            <Text style={styles.metricLabel}>NDVI Mean</Text>
            <Text style={styles.metricValue}>{analysis.ndvi_mean.toFixed(3)}</Text>
          </View>
          <View style={styles.ndviMetric}>
            <Text style={styles.metricLabel}>Water Stress</Text>
            <Text style={styles.metricValue}>{analysis.water_stress_score.toFixed(0)}%</Text>
          </View>
        </View>

        {analysis.disease_hotspots.length > 0 && (
          <View style={styles.hotspotsSection}>
            <Text style={styles.hotspotsTitle}>⚠ Disease Hotspots Detected</Text>
            <Text style={styles.hotspotsCount}>{analysis.disease_hotspots.length} locations</Text>
          </View>
        )}
      </View>
    );
  };

  const renderFlightCard = (flight, index) => (
    <View key={index} style={styles.flightCard}>
      <View style={styles.flightHeader}>
        <MaterialCommunityIcons name="quadcopter" size={24} color="#2196F3" />
        <View style={styles.flightInfo}>
          <Text style={styles.flightId}>{flight.flight_id}</Text>
          <Text style={styles.flightDate}>
            {new Date(flight.planned_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: droneIntelligenceService.getFlightStatusColor(flight.status)
        }]}>
          <Text style={styles.statusText}>{flight.status}</Text>
        </View>
      </View>
      <View style={styles.flightStats}>
        <Text style={styles.flightStat}>Images: {flight.estimated_images}</Text>
        <Text style={styles.flightStat}>Duration: {flight.estimated_duration_minutes} min</Text>
        <Text style={styles.flightStat}>Altitude: {flight.flight_altitude_meters}m</Text>
      </View>
    </View>
  );

  const renderPreHarvestListingCard = (listing, index) => {
    const gradeInfo = droneIntelligenceService.getQualityGradeInfo(listing.quality_grade);
    const weeksUntil = listing.weeks_until_harvest;
    
    return (
      <View key={index} style={styles.listingCard}>
        <View style={styles.listingHeader}>
          <Text style={styles.listingCrop}>{listing.crop_type}</Text>
          <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.color }]}>
            <Text style={styles.gradeIcon}>{gradeInfo.icon}</Text>
          </View>
        </View>
        <View style={styles.listingDetails}>
          <Text style={styles.listingQuantity}>
            {droneIntelligenceService.formatYield(listing.predicted_yield_kg)} kg
          </Text>
          <Text style={styles.listingPrice}>
            KES {listing.asking_price_kes_kg.toFixed(2)}/kg
          </Text>
        </View>
        <Text style={styles.listingHarvest}>
          Harvest in {weeksUntil} week{weeksUntil !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.listingValue}>
          Total Value: {droneIntelligenceService.formatCurrency(listing.total_listing_value_kes)}
        </Text>
        <View style={styles.verificationBadge}>
          <MaterialCommunityIcons name="check-decagram" size={16} color="#4CAF50" />
          <Text style={styles.verificationText}>Drone Verified</Text>
        </View>
      </View>
    );
  };

  const renderAggregationBundleCard = (bundle, index) => {
    const gradeInfo = droneIntelligenceService.getQualityGradeInfo(bundle.quality_grade);
    
    return (
      <View key={index} style={styles.bundleCard}>
        <View style={styles.bundleHeader}>
          <MaterialCommunityIcons name="account-group" size={24} color="#FF9800" />
          <Text style={styles.bundleCrop}>{bundle.crop_type}</Text>
          <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.color }]}>
            <Text style={styles.gradeIcon}>{gradeInfo.icon}</Text>
          </View>
        </View>
        <View style={styles.bundleStats}>
          <View style={styles.bundleStat}>
            <Text style={styles.bundleStatLabel}>Farmers</Text>
            <Text style={styles.bundleStatValue}>{bundle.total_farmers}</Text>
          </View>
          <View style={styles.bundleStat}>
            <Text style={styles.bundleStatLabel}>Total Quantity</Text>
            <Text style={styles.bundleStatValue}>
              {droneIntelligenceService.formatYield(bundle.total_predicted_yield_kg)} kg
            </Text>
          </View>
          <View style={styles.bundleStat}>
            <Text style={styles.bundleStatLabel}>Price</Text>
            <Text style={styles.bundleStatValue}>
              KES {bundle.bundled_price_kes_kg.toFixed(2)}/kg
            </Text>
          </View>
        </View>
        <Text style={styles.bundleValue}>
          Bundle Value: {droneIntelligenceService.formatCurrency(bundle.total_bundle_value_kes)}
        </Text>
        <Text style={styles.bundleRegion}>Region: {bundle.region}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="quadcopter" size={32} color="#FFF" />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Drone Intelligence</Text>
          <Text style={styles.headerSubtitle}>AI-Powered Harvest Prediction</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <MaterialCommunityIcons
            name="view-dashboard"
            size={24}
            color={activeTab === 'overview' ? '#4CAF50' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
          onPress={() => setActiveTab('analysis')}
        >
          <MaterialCommunityIcons
            name="chart-box"
            size={24}
            color={activeTab === 'analysis' ? '#4CAF50' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
            Analysis
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'marketplace' && styles.activeTab]}
          onPress={() => setActiveTab('marketplace')}
        >
          <MaterialCommunityIcons
            name="shopping"
            size={24}
            color={activeTab === 'marketplace' ? '#4CAF50' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'marketplace' && styles.activeTabText]}>
            Marketplace
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
        {activeTab === 'marketplace' && renderMarketplaceTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    gap: 15
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 5
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 5
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50'
  },
  tabText: {
    fontSize: 12,
    color: '#666'
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  scrollView: {
    flex: 1
  },
  tabContent: {
    padding: 15
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  alertCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800'
  },
  alertContent: {
    gap: 15
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8
  },
  confirmedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15
  },
  statCard: {
    flex: 1,
    minWidth: (width - 50) / 2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    gap: 10,
    elevation: 2
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  predictionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    gap: 15
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  cropText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5
  },
  gradeIcon: {
    fontSize: 16,
    color: '#FFF'
  },
  gradeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF'
  },
  predictionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0'
  },
  predictionStat: {
    alignItems: 'center'
  },
  predictionStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  predictionStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  predictionStatSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  confidenceBar: {
    gap: 5
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  confidenceTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4
  },
  factorsSection: {
    gap: 10
  },
  factorsBox: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5
  },
  factorItem: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10
  },
  maturityText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic'
  },
  harvestWindowCard: {
    gap: 15
  },
  windowHeader: {
    flexDirection: 'row',
    gap: 15
  },
  windowHeaderText: {
    flex: 1
  },
  windowTitle: {
    fontSize: 14,
    color: '#666'
  },
  windowDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5
  },
  windowDaysUntil: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5
  },
  windowStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8
  },
  windowStat: {
    alignItems: 'center',
    gap: 5
  },
  windowStatLabel: {
    fontSize: 11,
    color: '#666'
  },
  windowStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  windowRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#666'
  },
  windowLogistics: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    gap: 5
  },
  logisticsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  logisticsItem: {
    fontSize: 12,
    color: '#666'
  },
  analysisCard: {
    gap: 15
  },
  ndviHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  uniformityScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  ndviMapPlaceholder: {
    height: 200,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  ndviMapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  ndviMapSubtext: {
    fontSize: 12,
    color: '#666'
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8
  },
  healthStat: {
    alignItems: 'center',
    gap: 5
  },
  healthIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  healthLabel: {
    fontSize: 11,
    color: '#666'
  },
  healthValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  ndviMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  ndviMetric: {
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  hotspotsSection: {
    backgroundColor: '#FFEBEE',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  hotspotsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336'
  },
  hotspotsCount: {
    fontSize: 14,
    color: '#F44336'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 10
  },
  planFlightButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 15
  },
  planFlightButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  flightCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  flightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10
  },
  flightInfo: {
    flex: 1
  },
  flightId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  flightDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  flightStats: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  flightStat: {
    fontSize: 12,
    color: '#666'
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    gap: 10
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  createButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listingCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  listingCrop: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  listingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  listingQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  listingHarvest: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 5
  },
  listingValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  verificationText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  bundleCard: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15
  },
  bundleCrop: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  bundleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FFE0B2',
    marginBottom: 10
  },
  bundleStat: {
    alignItems: 'center'
  },
  bundleStatLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5
  },
  bundleStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  bundleValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 5
  },
  bundleRegion: {
    fontSize: 12,
    color: '#666'
  }
});

export default DroneIntelligenceDashboard;
