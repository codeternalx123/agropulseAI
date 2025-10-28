/**
 * Market Linkages Screen
 * Price Discovery, Smart Logistics, Community Liquidity
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
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import marketLinkagesService from '../services/marketLinkagesService';
import * as Location from 'expo-location';

const MarketLinkagesScreen = ({ navigation, route }) => {
  const { farmId, userId, cropType = 'Potato' } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('price'); // 'price', 'logistics', 'community'

  // Price Discovery
  const [priceBenchmark, setPriceBenchmark] = useState(null);
  const [riskAdjustedPrice, setRiskAdjustedPrice] = useState(null);
  const [forwardContracts, setForwardContracts] = useState([]);

  // Logistics
  const [logisticsOptimization, setLogisticsOptimization] = useState(null);
  const [stagingAlerts, setStagingAlerts] = useState([]);

  // Community
  const [supplyPools, setSupplyPools] = useState([]);
  const [demandPrediction, setDemandPrediction] = useState(null);
  const [reputation, setReputation] = useState(null);

  // Location
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Get GPS location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }

      // Load all data
      await Promise.all([
        loadPriceDiscovery(),
        loadLogistics(),
        loadCommunityData()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPriceDiscovery = async () => {
    try {
      // Get price benchmark
      const benchmarkResult = await marketLinkagesService.getLocalizedPriceBenchmark(
        cropType,
        currentLocation?.latitude || -1.2921,
        currentLocation?.longitude || 36.8219,
        'grade_a_premium'
      );
      if (benchmarkResult.success) {
        setPriceBenchmark(benchmarkResult.benchmark);
      }

      // Get forward contracts
      const contractsResult = await marketLinkagesService.getForwardContracts({
        crop_type: cropType,
        status: 'open'
      });
      if (contractsResult.success) {
        setForwardContracts(contractsResult.contracts);
      }

      // Calculate risk-adjusted price
      const riskResult = await marketLinkagesService.calculateRiskAdjustedPrice({
        base_price_kes_kg: benchmarkResult.benchmark?.fair_market_price_kes_kg || 40,
        climate_risk_score: 25,
        crop_variety_risk: 15,
        storage_risk: 10,
        lcrs: 28
      });
      if (riskResult.success) {
        setRiskAdjustedPrice(riskResult.riskAdjustedPrice);
      }
    } catch (error) {
      console.error('Error loading price discovery:', error);
    }
  };

  const loadLogistics = async () => {
    try {
      // Get staging alerts
      if (userId) {
        const alertsResult = await marketLinkagesService.getStagingAlerts(userId);
        if (alertsResult.success) {
          setStagingAlerts(alertsResult.alerts);
        }
      }
    } catch (error) {
      console.error('Error loading logistics:', error);
    }
  };

  const loadCommunityData = async () => {
    try {
      // Get supply pools
      const poolsResult = await marketLinkagesService.getSupplyPools({
        crop_type: cropType,
        status: 'active'
      });
      if (poolsResult.success) {
        setSupplyPools(poolsResult.pools);
      }

      // Get demand prediction
      const demandResult = await marketLinkagesService.predictDemandMatching(
        'Central Kenya',
        cropType,
        50,
        10000
      );
      if (demandResult.success) {
        setDemandPrediction(demandResult.prediction);
      }

      // Get reputation
      if (userId) {
        const reputationResult = await marketLinkagesService.getSellerReputation(userId);
        if (reputationResult.success) {
          setReputation(reputationResult.reputation);
        }
      }
    } catch (error) {
      console.error('Error loading community data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleCreateForwardContract = () => {
    navigation.navigate('CreateForwardContract', {
      farmId,
      userId,
      cropType,
      suggestedPrice: priceBenchmark?.fair_market_price_kes_kg || 40
    });
  };

  const handleOptimizeLogistics = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    const result = await marketLinkagesService.optimizeTransportWindow(
      'ASSET_123',
      currentLocation.latitude,
      currentLocation.longitude,
      -1.2921,
      36.8219
    );

    if (result.success) {
      setLogisticsOptimization(result.logistics);
      Alert.alert(
        'Transport Optimized',
        `Best window: ${new Date(result.logistics.recommended_departure_time).toLocaleString()}\n\n` +
        `Risk Score: ${result.logistics.weather_risk_score}/100\n\n` +
        result.logistics.transport_advisories.join('\n')
      );
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleJoinSupplyPool = (poolId) => {
    Alert.alert(
      'Join Supply Pool',
      'Add your inventory to this aggregation pool to attract bulk buyers?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: () => {
            // Navigate to join pool screen
            navigation.navigate('JoinSupplyPool', { poolId });
          }
        }
      ]
    );
  };

  const renderPriceDiscoveryTab = () => (
    <View style={styles.tabContent}>
      {/* Price Benchmark */}
      {priceBenchmark && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Localized Price Benchmark</Text>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Fair Market Price:</Text>
              <Text style={styles.priceValue}>
                KES {priceBenchmark.fair_market_price_kes_kg.toFixed(2)}/kg
              </Text>
            </View>
            <Text style={styles.priceRange}>
              Range: KES {priceBenchmark.price_range_min} - {priceBenchmark.price_range_max}/kg
            </Text>
            <Text style={styles.priceInfo}>
              Based on {priceBenchmark.recent_sales_count} recent sales in {priceBenchmark.region}
            </Text>
          </View>

          <View style={styles.marketDynamics}>
            <View style={styles.dynamicItem}>
              <MaterialCommunityIcons 
                name={marketLinkagesService.getSupplyLevelInfo(priceBenchmark.supply_level).icon} 
                size={24} 
                color={marketLinkagesService.getSupplyLevelInfo(priceBenchmark.supply_level).color}
              />
              <Text style={styles.dynamicLabel}>Supply: {priceBenchmark.supply_level}</Text>
            </View>
            <View style={styles.dynamicItem}>
              <MaterialCommunityIcons 
                name={marketLinkagesService.getPriceTrendInfo(priceBenchmark.demand_trend).icon}
                size={24} 
                color={marketLinkagesService.getPriceTrendInfo(priceBenchmark.demand_trend).color}
              />
              <Text style={styles.dynamicLabel}>Trend: {priceBenchmark.demand_trend}</Text>
            </View>
          </View>

          <Text style={styles.recommendation}>
            {marketLinkagesService.getSupplyLevelInfo(priceBenchmark.supply_level).recommendation}
          </Text>
        </View>
      )}

      {/* Risk-Adjusted Price */}
      {riskAdjustedPrice && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Risk-Adjusted Pricing</Text>
          <View style={styles.riskAdjustment}>
            <View style={styles.priceComparisonRow}>
              <View style={styles.priceComparisonItem}>
                <Text style={styles.comparisonLabel}>Base Price</Text>
                <Text style={styles.comparisonValue}>
                  KES {riskAdjustedPrice.base_price_kes_kg.toFixed(2)}
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={24} color="#666" />
              <View style={styles.priceComparisonItem}>
                <Text style={styles.comparisonLabel}>Adjusted Price</Text>
                <Text style={[styles.comparisonValue, styles.adjustedPrice]}>
                  KES {riskAdjustedPrice.risk_adjusted_price_kes_kg.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.adjustmentDetails}>
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Climate Risk:</Text>
                <Text style={[styles.adjustmentValue, riskAdjustedPrice.climate_risk_adjustment >= 0 ? styles.positive : styles.negative]}>
                  {riskAdjustedPrice.climate_risk_adjustment >= 0 ? '+' : ''}
                  {riskAdjustedPrice.climate_risk_adjustment.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Crop Variety Risk:</Text>
                <Text style={[styles.adjustmentValue, riskAdjustedPrice.crop_variety_risk_adjustment >= 0 ? styles.positive : styles.negative]}>
                  {riskAdjustedPrice.crop_variety_risk_adjustment >= 0 ? '+' : ''}
                  {riskAdjustedPrice.crop_variety_risk_adjustment.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Storage Risk:</Text>
                <Text style={[styles.adjustmentValue, riskAdjustedPrice.storage_risk_adjustment >= 0 ? styles.positive : styles.negative]}>
                  {riskAdjustedPrice.storage_risk_adjustment >= 0 ? '+' : ''}
                  {riskAdjustedPrice.storage_risk_adjustment.toFixed(1)}%
                </Text>
              </View>
            </View>

            <View style={styles.premiumBox}>
              <Text style={styles.premiumLabel}>Buyer Risk Premium:</Text>
              <Text style={[styles.premiumValue, riskAdjustedPrice.buyer_risk_premium >= 0 ? styles.positive : styles.negative]}>
                KES {Math.abs(riskAdjustedPrice.buyer_risk_premium).toFixed(2)}/kg
              </Text>
            </View>

            <Text style={styles.justification}>{riskAdjustedPrice.justification}</Text>
          </View>
        </View>
      )}

      {/* Forward Contracts */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Forward Contracts</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateForwardContract}>
            <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardSubtitle}>
          Secure guaranteed price and market access before harvest
        </Text>

        {forwardContracts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No open forward contracts</Text>
            <Text style={styles.emptySubtext}>Create a contract to lock in prices before harvest</Text>
          </View>
        ) : (
          forwardContracts.map((contract, index) => (
            <View key={index} style={styles.contractCard}>
              <View style={styles.contractHeader}>
                <Text style={styles.contractCrop}>{contract.crop_type}</Text>
                <Text style={styles.contractStatus}>{contract.status}</Text>
              </View>
              <View style={styles.contractDetails}>
                <Text style={styles.contractDetail}>
                  {contract.contracted_quantity_kg} kg @ KES {contract.locked_price_kes_kg}/kg
                </Text>
                <Text style={styles.contractDetail}>
                  Harvest: {new Date(contract.harvest_prediction_date).toLocaleDateString()}
                </Text>
                <Text style={styles.contractDetail}>
                  Total Value: KES {contract.total_contract_value_kes.toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderLogisticsTab = () => (
    <View style={styles.tabContent}>
      {/* Weather-Optimized Logistics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Smart Logistics</Text>
        <TouchableOpacity style={styles.optimizeButton} onPress={handleOptimizeLogistics}>
          <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFF" />
          <Text style={styles.optimizeButtonText}>Optimize Transport Window</Text>
        </TouchableOpacity>

        {logisticsOptimization && (
          <View style={styles.logisticsDetails}>
            <View style={styles.weatherWindow}>
              <MaterialCommunityIcons name="weather-sunny" size={32} color="#FF9800" />
              <View style={styles.windowInfo}>
                <Text style={styles.windowTitle}>Recommended Window</Text>
                <Text style={styles.windowTime}>
                  {new Date(logisticsOptimization.recommended_departure_time).toLocaleString()}
                </Text>
                <Text style={styles.windowRisk}>
                  Weather Risk: {logisticsOptimization.weather_risk_score}/100
                </Text>
              </View>
            </View>

            {logisticsOptimization.transport_advisories.map((advisory, index) => (
              <View key={index} style={styles.advisory}>
                <MaterialCommunityIcons name="information" size={16} color="#2196F3" />
                <Text style={styles.advisoryText}>{advisory}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Staging Alerts */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Inventory Staging Alerts</Text>
        {stagingAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No pending alerts</Text>
          </View>
        ) : (
          stagingAlerts.map((alert, index) => (
            <View key={index} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <MaterialCommunityIcons name="bell-ring" size={24} color="#FF9800" />
                <Text style={styles.alertTitle}>Preparation Required</Text>
              </View>
              <Text style={styles.alertTime}>
                Pickup: {new Date(alert.expected_pickup_time).toLocaleString()}
              </Text>
              <Text style={styles.alertInfo}>
                Prepare {alert.preparation_required_hours} hours in advance
              </Text>
              <View style={styles.checklist}>
                {alert.preparation_checklist.map((item, idx) => (
                  <Text key={idx} style={styles.checklistItem}>✓ {item}</Text>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderCommunityTab = () => (
    <View style={styles.tabContent}>
      {/* Seller Reputation */}
      {reputation && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Reputation</Text>
          <View style={styles.reputationHeader}>
            <Text style={styles.reputationTier}>
              {marketLinkagesService.getReputationTierInfo(reputation.reputation_tier).icon}
              {' '}
              {marketLinkagesService.getReputationTierInfo(reputation.reputation_tier).label}
            </Text>
            <Text style={styles.reputationScore}>{reputation.reputation_score.toFixed(1)}/100</Text>
          </View>

          <View style={styles.reputationStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Success Rate</Text>
              <Text style={styles.statValue}>{reputation.success_rate.toFixed(0)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Quality Score</Text>
              <Text style={styles.statValue}>{reputation.average_quality_score.toFixed(0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>On-Time</Text>
              <Text style={styles.statValue}>{reputation.on_time_delivery_rate.toFixed(0)}%</Text>
            </View>
          </View>

          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Benefits:</Text>
            {marketLinkagesService.getReputationTierInfo(reputation.reputation_tier).benefits.map((benefit, index) => (
              <Text key={index} style={styles.benefitItem}>✓ {benefit}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Supply Aggregation Pools */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Supply Aggregation Pools</Text>
        <Text style={styles.cardSubtitle}>
          Join with other farmers to attract bulk buyers
        </Text>

        {supplyPools.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No active pools</Text>
          </View>
        ) : (
          supplyPools.map((pool, index) => (
            <View key={index} style={styles.poolCard}>
              <View style={styles.poolHeader}>
                <Text style={styles.poolCrop}>{pool.crop_type}</Text>
                <Text style={styles.poolStatus}>{pool.status}</Text>
              </View>
              <View style={styles.poolStats}>
                <Text style={styles.poolStat}>{pool.farmer_ids.length} Farmers</Text>
                <Text style={styles.poolStat}>{pool.total_quantity_kg} kg</Text>
                <Text style={styles.poolStat}>{pool.current_fill_percentage.toFixed(0)}% Full</Text>
              </View>
              <Text style={styles.poolPrice}>
                Pooled Price: KES {pool.pooled_price_kes_kg}/kg
              </Text>
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={() => handleJoinSupplyPool(pool.pool_id)}
              >
                <Text style={styles.joinButtonText}>Join Pool</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Demand Prediction */}
      {demandPrediction && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Demand Prediction</Text>
          <View style={styles.demandStats}>
            <View style={styles.demandRow}>
              <Text style={styles.demandLabel}>Predicted Supply:</Text>
              <Text style={styles.demandValue}>{demandPrediction.predicted_supply_kg.toLocaleString()} kg</Text>
            </View>
            <View style={styles.demandRow}>
              <Text style={styles.demandLabel}>Predicted Demand:</Text>
              <Text style={styles.demandValue}>{demandPrediction.predicted_demand_kg.toLocaleString()} kg</Text>
            </View>
            <View style={styles.demandRow}>
              <Text style={styles.demandLabel}>Supply/Demand Ratio:</Text>
              <Text style={[styles.demandValue, demandPrediction.supply_demand_ratio < 1 ? styles.positive : styles.negative]}>
                {demandPrediction.supply_demand_ratio.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.trendBox}>
            <MaterialCommunityIcons 
              name={marketLinkagesService.getPriceTrendInfo(demandPrediction.predicted_price_trend).icon}
              size={24}
              color={marketLinkagesService.getPriceTrendInfo(demandPrediction.predicted_price_trend).color}
            />
            <Text style={styles.trendText}>
              Price Trend: {demandPrediction.predicted_price_trend}
            </Text>
          </View>

          <Text style={styles.confidence}>
            Market Linkage Confidence: {demandPrediction.market_linkage_confidence.toFixed(0)}%
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market Linkages</Text>
        <Text style={styles.headerSubtitle}>
          AI-Driven Price Discovery & Smart Logistics
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'price' && styles.activeTab]}
          onPress={() => setActiveTab('price')}
        >
          <MaterialCommunityIcons 
            name="cash-multiple" 
            size={24} 
            color={activeTab === 'price' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'price' && styles.activeTabText]}>
            Price Discovery
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'logistics' && styles.activeTab]}
          onPress={() => setActiveTab('logistics')}
        >
          <MaterialCommunityIcons 
            name="truck-delivery" 
            size={24} 
            color={activeTab === 'logistics' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'logistics' && styles.activeTabText]}>
            Logistics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'community' && styles.activeTab]}
          onPress={() => setActiveTab('community')}
        >
          <MaterialCommunityIcons 
            name="account-group" 
            size={24} 
            color={activeTab === 'community' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'community' && styles.activeTabText]}>
            Community
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'price' && renderPriceDiscoveryTab()}
        {activeTab === 'logistics' && renderLogisticsTab()}
        {activeTab === 'community' && renderCommunityTab()}
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
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8F5E9',
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
  priceContainer: {
    marginBottom: 15
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  priceLabel: {
    fontSize: 16,
    color: '#666'
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  priceRange: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  priceInfo: {
    fontSize: 12,
    color: '#999'
  },
  marketDynamics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10
  },
  dynamicItem: {
    alignItems: 'center',
    gap: 5
  },
  dynamicLabel: {
    fontSize: 12,
    color: '#666'
  },
  recommendation: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8
  },
  riskAdjustment: {
    gap: 15
  },
  priceComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8
  },
  priceComparisonItem: {
    alignItems: 'center'
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  adjustedPrice: {
    color: '#4CAF50'
  },
  adjustmentDetails: {
    gap: 10
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  adjustmentLabel: {
    fontSize: 14,
    color: '#666'
  },
  adjustmentValue: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  positive: {
    color: '#4CAF50'
  },
  negative: {
    color: '#F44336'
  },
  premiumBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8
  },
  premiumLabel: {
    fontSize: 14,
    color: '#666'
  },
  premiumValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  justification: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
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
  emptySubtext: {
    fontSize: 12,
    color: '#CCC',
    marginTop: 5,
    textAlign: 'center'
  },
  contractCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  contractCrop: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  contractStatus: {
    fontSize: 12,
    color: '#4CAF50',
    textTransform: 'uppercase'
  },
  contractDetails: {
    gap: 5
  },
  contractDetail: {
    fontSize: 14,
    color: '#666'
  },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10
  },
  optimizeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  logisticsDetails: {
    gap: 15
  },
  weatherWindow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    gap: 15
  },
  windowInfo: {
    flex: 1
  },
  windowTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  windowTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  windowRisk: {
    fontSize: 12,
    color: '#FF9800'
  },
  advisory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    gap: 10
  },
  advisoryText: {
    fontSize: 14,
    color: '#666',
    flex: 1
  },
  alertCard: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800'
  },
  alertTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  alertInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10
  },
  checklist: {
    gap: 5
  },
  checklistItem: {
    fontSize: 12,
    color: '#666'
  },
  reputationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  reputationTier: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  reputationScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  reputationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 15
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  benefits: {
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 8
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10
  },
  benefitItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  poolCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  poolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  poolCrop: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  poolStatus: {
    fontSize: 12,
    color: '#4CAF50',
    textTransform: 'uppercase'
  },
  poolStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  poolStat: {
    fontSize: 12,
    color: '#666'
  },
  poolPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  demandStats: {
    gap: 10,
    marginBottom: 15
  },
  demandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  demandLabel: {
    fontSize: 14,
    color: '#666'
  },
  demandValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  trendBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10,
    gap: 10
  },
  trendText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  confidence: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8
  }
});

export default MarketLinkagesScreen;
