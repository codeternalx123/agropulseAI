/**
 * Exchange Marketplace Screen
 * AI-Verified Asset Listing with Fraud Prevention & Escrow
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import exchangeService from '../services/exchangeService';
import aiFarmIntelligenceService from '../services/aiFarmIntelligenceService';
import * as Location from 'expo-location';

const ExchangeMarketplaceScreen = ({ navigation, route }) => {
  const { farmId, userId, userType = 'farmer' } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'myListings', 'transactions'

  // Browse state
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState({
    cropType: '',
    maxPrice: '',
    minQuantity: '',
    qualityGrade: ''
  });

  // My Listings state
  const [myListings, setMyListings] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Transactions state
  const [transactions, setTransactions] = useState([]);

  // Stats
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'browse') {
      loadActiveAssets();
    } else if (activeTab === 'myListings') {
      loadMyListings();
    } else if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load marketplace stats
      const statsResult = await exchangeService.getMarketplaceStats();
      if (statsResult.success) {
        setStats(statsResult.stats);
      }

      // Load initial assets
      await loadActiveAssets();
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveAssets = async () => {
    try {
      // Get user's location for nearby assets
      const { status } = await Location.requestForegroundPermissionsAsync();
      let locationFilters = { ...filters };
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        locationFilters.latitude = location.coords.latitude;
        locationFilters.longitude = location.coords.longitude;
        locationFilters.max_distance_km = 100; // 100km radius
      }

      const result = await exchangeService.getActiveAssets(locationFilters);
      if (result.success) {
        setAssets(result.assets);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const loadMyListings = async () => {
    try {
      // In production, fetch from backend filtered by seller_id
      // For now, use local state
      const myAssets = assets.filter(a => a.seller_id === userId);
      setMyListings(myAssets);

      // Load farm inventory
      if (farmId) {
        const inventoryResult = await exchangeService.getFarmInventory(farmId);
        if (inventoryResult.success) {
          setInventory(inventoryResult.inventory);
        }
      }
    } catch (error) {
      console.error('Error loading my listings:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      // In production, fetch from backend
      // For now, use mock data
      setTransactions([]);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleCreateListing = () => {
    navigation.navigate('CreateAssetListing', {
      farmId,
      userId,
      onListingCreated: () => {
        setActiveTab('myListings');
        loadMyListings();
      }
    });
  };

  const handleSyncInventory = async () => {
    if (!farmId) {
      Alert.alert('Error', 'Farm ID required to sync inventory');
      return;
    }

    Alert.alert(
      'Sync Inventory',
      'Sync market-ready inventory from your storage system?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            const result = await exchangeService.syncInventoryFromStorage(farmId);
            if (result.success) {
              Alert.alert('Success', 'Inventory synced successfully');
              loadMyListings();
            } else {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const handleAssetPress = (asset) => {
    navigation.navigate('AssetDetails', {
      assetId: asset.asset_id,
      userId,
      userType
    });
  };

  const renderStatCard = (icon, label, value, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderAssetCard = (asset) => {
    const qualityInfo = exchangeService.getQualityGradeInfo(asset.quality_grade);
    const spoilageRisk = asset.ai_verification.spoilage_risk_trend;
    const riskColor = 
      spoilageRisk === 'low' ? '#4CAF50' :
      spoilageRisk === 'moderate' ? '#FF9800' :
      '#F44336';

    return (
      <TouchableOpacity
        key={asset.asset_id}
        style={styles.assetCard}
        onPress={() => handleAssetPress(asset)}
      >
        <View style={styles.assetHeader}>
          <View style={styles.assetTitleRow}>
            <Text style={styles.assetTitle}>{asset.listing_title}</Text>
            <View style={[styles.qualityBadge, { backgroundColor: qualityInfo.color }]}>
              <Text style={styles.qualityText}>{qualityInfo.icon} {qualityInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.assetCropType}>{asset.crop_type}</Text>
        </View>

        <View style={styles.assetDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="weight-kilogram" size={20} color="#666" />
            <Text style={styles.detailText}>{asset.available_quantity_kg} kg available</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="cash" size={20} color="#666" />
            <Text style={styles.detailText}>KES {asset.unit_price_kes}/kg</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#666" />
            <Text style={styles.detailText}>{asset.preferred_pickup_location}</Text>
          </View>
        </View>

        {/* AI Verification Badges */}
        <View style={styles.verificationRow}>
          {asset.ai_verification.harvest_health_score && (
            <View style={styles.verificationBadge}>
              <MaterialCommunityIcons name="sprout" size={16} color="#4CAF50" />
              <Text style={styles.badgeText}>Harvest Score: {asset.ai_verification.harvest_health_score}%</Text>
            </View>
          )}
          {asset.ai_verification.storage_condition_proof && (
            <View style={styles.verificationBadge}>
              <MaterialCommunityIcons name="thermometer" size={16} color="#2196F3" />
              <Text style={styles.badgeText}>
                Storage: {asset.ai_verification.storage_condition_proof.safe_range_compliance}% safe
              </Text>
            </View>
          )}
          {asset.ai_verification.pest_free_certification && (
            <View style={styles.verificationBadge}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#4CAF50" />
              <Text style={styles.badgeText}>Pest-Free</Text>
            </View>
          )}
        </View>

        {/* Spoilage Risk */}
        <View style={[styles.spoilageRisk, { backgroundColor: riskColor + '20' }]}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={riskColor} />
          <Text style={[styles.riskText, { color: riskColor }]}>
            {spoilageRisk.toUpperCase()} Risk • {asset.ai_verification.predicted_shelf_life_days} days shelf life
          </Text>
        </View>

        <View style={styles.assetFooter}>
          <Text style={styles.sellerName}>Seller: {asset.seller_name}</Text>
          <Text style={styles.totalValue}>Total: KES {asset.total_value_kes.toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBrowseTab = () => (
    <View style={styles.tabContent}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.sectionTitle}>Filter Assets</Text>
        <View style={styles.filterRow}>
          <TextInput
            style={styles.filterInput}
            placeholder="Crop Type"
            value={filters.cropType}
            onChangeText={(text) => setFilters({ ...filters, cropType: text })}
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Max Price (KES)"
            keyboardType="numeric"
            value={filters.maxPrice}
            onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
          />
        </View>
        <TouchableOpacity style={styles.applyFilterButton} onPress={loadActiveAssets}>
          <Text style={styles.applyFilterText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Assets List */}
      <View style={styles.assetsContainer}>
        <Text style={styles.sectionTitle}>Available Assets ({assets.length})</Text>
        {assets.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="store-off" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No assets available</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters or check back later</Text>
          </View>
        ) : (
          assets.map(renderAssetCard)
        )}
      </View>
    </View>
  );

  const renderMyListingsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateListing}>
          <MaterialCommunityIcons name="plus-circle" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>Create Listing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleSyncInventory}>
          <MaterialCommunityIcons name="sync" size={24} color="#4CAF50" />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Sync Inventory</Text>
        </TouchableOpacity>
      </View>

      {/* Farm Inventory */}
      {inventory.length > 0 && (
        <View style={styles.inventorySection}>
          <Text style={styles.sectionTitle}>Farm Inventory</Text>
          {inventory.map((item, index) => (
            <View key={index} style={styles.inventoryCard}>
              <View style={styles.inventoryHeader}>
                <Text style={styles.inventoryTitle}>{item.crop_type}</Text>
                <Text style={styles.inventoryQuantity}>{item.current_quantity_kg} kg</Text>
              </View>
              <View style={styles.inventoryDetails}>
                <Text style={styles.inventoryDetail}>
                  Available for sale: {item.available_for_sale_kg} kg
                </Text>
                <Text style={styles.inventoryDetail}>
                  Spoilage risk: {item.spoilage_risk_score}% • {item.days_until_critical_spoilage} days
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* My Listings */}
      <View style={styles.listingsSection}>
        <Text style={styles.sectionTitle}>My Listings ({myListings.length})</Text>
        {myListings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No active listings</Text>
            <Text style={styles.emptySubtext}>Create your first listing to start selling</Text>
          </View>
        ) : (
          myListings.map(renderAssetCard)
        )}
      </View>
    </View>
  );

  const renderTransactionsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>My Transactions</Text>
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="receipt" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>Your buy/sell transactions will appear here</Text>
        </View>
      ) : (
        transactions.map((transaction, index) => (
          <View key={index} style={styles.transactionCard}>
            <Text>Transaction {transaction.transaction_id}</Text>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          {renderStatCard('store', 'Active Listings', stats.active_listings, '#4CAF50')}
          {renderStatCard('handshake', 'Total Transactions', stats.total_transactions, '#2196F3')}
          {renderStatCard('check-circle', 'Completion Rate', stats.completion_rate, '#FF9800')}
          {renderStatCard('alert-circle', 'Dispute Rate', stats.dispute_rate, '#F44336')}
        </ScrollView>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <MaterialCommunityIcons 
            name="shopping" 
            size={24} 
            color={activeTab === 'browse' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myListings' && styles.activeTab]}
          onPress={() => setActiveTab('myListings')}
        >
          <MaterialCommunityIcons 
            name="package-variant" 
            size={24} 
            color={activeTab === 'myListings' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'myListings' && styles.activeTabText]}>
            My Listings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <MaterialCommunityIcons 
            name="receipt" 
            size={24} 
            color={activeTab === 'transactions' ? '#4CAF50' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'browse' && renderBrowseTab()}
        {activeTab === 'myListings' && renderMyListingsTab()}
        {activeTab === 'transactions' && renderTransactionsTab()}
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
  statsScroll: {
    maxHeight: 120,
    backgroundColor: '#FFF',
    paddingVertical: 10
  },
  statCard: {
    width: 150,
    padding: 15,
    marginHorizontal: 5,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center'
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
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
    fontSize: 14,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14
  },
  applyFilterButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  applyFilterText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  assetsContainer: {
    marginTop: 10
  },
  assetCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  assetHeader: {
    marginBottom: 15
  },
  assetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5
  },
  assetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  qualityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 10
  },
  qualityText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  assetCropType: {
    fontSize: 16,
    color: '#666'
  },
  assetDetails: {
    marginBottom: 15
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10
  },
  detailText: {
    fontSize: 14,
    color: '#666'
  },
  verificationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 5
  },
  badgeText: {
    fontSize: 11,
    color: '#666'
  },
  spoilageRisk: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8
  },
  riskText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  assetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  sellerName: {
    fontSize: 12,
    color: '#666'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    gap: 8
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  secondaryButtonText: {
    color: '#4CAF50'
  },
  inventorySection: {
    marginBottom: 20
  },
  inventoryCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  inventoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  inventoryQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800'
  },
  inventoryDetails: {
    gap: 5
  },
  inventoryDetail: {
    fontSize: 12,
    color: '#666'
  },
  listingsSection: {
    marginTop: 10
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 15
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 5,
    textAlign: 'center'
  },
  transactionCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  }
});

export default ExchangeMarketplaceScreen;
