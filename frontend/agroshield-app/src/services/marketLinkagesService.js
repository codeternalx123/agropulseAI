/**
 * Market Linkages Service
 * AI-Driven Price Discovery, Smart Logistics, Community Liquidity
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getCachedData = async (key) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }
  return null;
};

const setCachedData = async (key, data) => {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (error) {
    console.log('Cache write error:', error);
  }
};

// ============================================================================
// PRICE DISCOVERY
// ============================================================================

/**
 * Get localized price benchmark with AI quality adjustments
 */
export const getLocalizedPriceBenchmark = async (cropType, latitude, longitude, qualityGrade = 'grade_b_standard') => {
  try {
    const cacheKey = `price_benchmark_${cropType}_${qualityGrade}`;
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return { success: true, benchmark: cached, fromCache: true };
    }

    const response = await api.get('/market-linkages/price-discovery/benchmark', {
      params: {
        crop_type: cropType,
        latitude,
        longitude,
        quality_grade: qualityGrade
      }
    });

    await setCachedData(cacheKey, response.data);

    return {
      success: true,
      benchmark: response.data,
      fromCache: false
    };
  } catch (error) {
    console.error('Error fetching price benchmark:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch price benchmark'
    };
  }
};

/**
 * Calculate comprehensive AI quality score
 */
export const calculateAIQualityScore = async (scores) => {
  try {
    const response = await api.post('/market-linkages/price-discovery/calculate-ai-quality-score', null, {
      params: scores
    });

    return {
      success: true,
      qualityScore: response.data
    };
  } catch (error) {
    console.error('Error calculating quality score:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to calculate quality score'
    };
  }
};

/**
 * Calculate risk-adjusted pricing
 */
export const calculateRiskAdjustedPrice = async (priceData) => {
  try {
    const response = await api.post('/market-linkages/price-discovery/risk-adjusted-price', null, {
      params: priceData
    });

    return {
      success: true,
      riskAdjustedPrice: response.data
    };
  } catch (error) {
    console.error('Error calculating risk-adjusted price:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to calculate risk-adjusted price'
    };
  }
};

/**
 * Create forward/futures contract for pre-harvest sales
 */
export const createForwardContract = async (contractData) => {
  try {
    const response = await api.post('/market-linkages/price-discovery/create-forward-contract', contractData);

    return {
      success: true,
      contract: response.data,
      message: 'Forward contract created successfully. Guaranteed market access secured!'
    };
  } catch (error) {
    console.error('Error creating forward contract:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create forward contract'
    };
  }
};

/**
 * Get available forward contracts
 */
export const getForwardContracts = async (filters = {}) => {
  try {
    const response = await api.get('/market-linkages/price-discovery/forward-contracts', {
      params: filters
    });

    return {
      success: true,
      contracts: response.data
    };
  } catch (error) {
    console.error('Error fetching forward contracts:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch contracts',
      contracts: []
    };
  }
};

// ============================================================================
// SMART LOGISTICS
// ============================================================================

/**
 * Optimize transport window based on weather
 */
export const optimizeTransportWindow = async (assetId, originLat, originLon, destLat, destLon) => {
  try {
    const response = await api.post('/market-linkages/logistics/optimize-transport-window', null, {
      params: {
        asset_id: assetId,
        origin_lat: originLat,
        origin_lon: originLon,
        destination_lat: destLat,
        destination_lon: destLon
      }
    });

    return {
      success: true,
      logistics: response.data
    };
  } catch (error) {
    console.error('Error optimizing transport:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to optimize transport window'
    };
  }
};

/**
 * Verify geo-fenced delivery
 */
export const verifyGeoFencedDelivery = async (deliveryData) => {
  try {
    const response = await api.post('/market-linkages/logistics/verify-geo-fenced-delivery', deliveryData);

    return {
      success: true,
      verification: response.data,
      fundsReleased: response.data.funds_released
    };
  } catch (error) {
    console.error('Error verifying delivery:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to verify delivery'
    };
  }
};

/**
 * Create inventory staging alert
 */
export const createStagingAlert = async (alertData) => {
  try {
    const response = await api.post('/market-linkages/logistics/create-staging-alert', alertData);

    return {
      success: true,
      alert: response.data
    };
  } catch (error) {
    console.error('Error creating staging alert:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create alert'
    };
  }
};

/**
 * Get staging alerts for farmer
 */
export const getStagingAlerts = async (farmerId) => {
  try {
    const response = await api.get(`/market-linkages/logistics/staging-alerts/${farmerId}`);

    return {
      success: true,
      alerts: response.data
    };
  } catch (error) {
    console.error('Error fetching staging alerts:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch alerts',
      alerts: []
    };
  }
};

// ============================================================================
// COMMUNITY LIQUIDITY
// ============================================================================

/**
 * Create supply aggregation pool
 */
export const createSupplyPool = async (poolData) => {
  try {
    const response = await api.post('/market-linkages/community/create-supply-pool', poolData);

    return {
      success: true,
      pool: response.data,
      message: `Pool created! ${response.data.current_fill_percentage.toFixed(0)}% filled.`
    };
  } catch (error) {
    console.error('Error creating supply pool:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create supply pool'
    };
  }
};

/**
 * Get available supply pools
 */
export const getSupplyPools = async (filters = {}) => {
  try {
    const response = await api.get('/market-linkages/community/supply-pools', {
      params: filters
    });

    return {
      success: true,
      pools: response.data
    };
  } catch (error) {
    console.error('Error fetching supply pools:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch pools',
      pools: []
    };
  }
};

/**
 * Predict demand matching
 */
export const predictDemandMatching = async (region, cropType, farmersCount, predictedSupply) => {
  try {
    const response = await api.post('/market-linkages/community/predict-demand-matching', null, {
      params: {
        region,
        crop_type: cropType,
        farmers_planting_count: farmersCount,
        predicted_supply_kg: predictedSupply
      }
    });

    return {
      success: true,
      prediction: response.data
    };
  } catch (error) {
    console.error('Error predicting demand:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to predict demand'
    };
  }
};

/**
 * Get seller reputation score
 */
export const getSellerReputation = async (sellerId) => {
  try {
    const cacheKey = `reputation_${sellerId}`;
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return { success: true, reputation: cached, fromCache: true };
    }

    const response = await api.get(`/market-linkages/community/seller-reputation/${sellerId}`);

    await setCachedData(cacheKey, response.data);

    return {
      success: true,
      reputation: response.data,
      fromCache: false
    };
  } catch (error) {
    console.error('Error fetching reputation:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch reputation'
    };
  }
};

/**
 * Update seller reputation after transaction
 */
export const updateSellerReputation = async (sellerId, updateData) => {
  try {
    const response = await api.put(`/market-linkages/community/update-reputation/${sellerId}`, null, {
      params: updateData
    });

    // Clear cache
    await AsyncStorage.removeItem(`reputation_${sellerId}`);

    return {
      success: true,
      reputation: response.data.reputation,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error updating reputation:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to update reputation'
    };
  }
};

// ============================================================================
// REPUTATION TIER HELPERS
// ============================================================================

export const REPUTATION_TIERS = {
  platinum: {
    label: 'Platinum',
    icon: '💎',
    color: '#E5E4E2',
    minScore: 90,
    benefits: ['Premium Listings', 'Priority Matching', 'Reduced Fees', 'VIP Support']
  },
  gold: {
    label: 'Gold',
    icon: '🥇',
    color: '#FFD700',
    minScore: 80,
    benefits: ['Premium Listings', 'Priority Matching', 'Reduced Fees']
  },
  silver: {
    label: 'Silver',
    icon: '🥈',
    color: '#C0C0C0',
    minScore: 70,
    benefits: ['Priority Matching']
  },
  bronze: {
    label: 'Bronze',
    icon: '🥉',
    color: '#CD7F32',
    minScore: 60,
    benefits: ['Standard Access']
  },
  unrated: {
    label: 'Unrated',
    icon: '⚪',
    color: '#9E9E9E',
    minScore: 0,
    benefits: ['Standard Access']
  }
};

export const getReputationTierInfo = (tier) => {
  return REPUTATION_TIERS[tier] || REPUTATION_TIERS.unrated;
};

// ============================================================================
// PRICE TREND HELPERS
// ============================================================================

export const PRICE_TRENDS = {
  increasing: {
    label: 'Increasing',
    icon: '📈',
    color: '#4CAF50',
    description: 'Prices expected to rise'
  },
  stable: {
    label: 'Stable',
    icon: '➡️',
    color: '#2196F3',
    description: 'Prices expected to remain steady'
  },
  decreasing: {
    label: 'Decreasing',
    icon: '📉',
    color: '#F44336',
    description: 'Prices expected to fall'
  }
};

export const getPriceTrendInfo = (trend) => {
  return PRICE_TRENDS[trend] || PRICE_TRENDS.stable;
};

// ============================================================================
// SUPPLY LEVEL HELPERS
// ============================================================================

export const SUPPLY_LEVELS = {
  surplus: {
    label: 'Surplus',
    icon: '📦',
    color: '#FF9800',
    recommendation: 'Consider storage or forward contracts'
  },
  balanced: {
    label: 'Balanced',
    icon: '⚖️',
    color: '#4CAF50',
    recommendation: 'Good time to sell'
  },
  shortage: {
    label: 'Shortage',
    icon: '⚠️',
    color: '#F44336',
    recommendation: 'Premium pricing opportunity'
  }
};

export const getSupplyLevelInfo = (level) => {
  return SUPPLY_LEVELS[level] || SUPPLY_LEVELS.balanced;
};

export default {
  // Price Discovery
  getLocalizedPriceBenchmark,
  calculateAIQualityScore,
  calculateRiskAdjustedPrice,
  createForwardContract,
  getForwardContracts,
  
  // Smart Logistics
  optimizeTransportWindow,
  verifyGeoFencedDelivery,
  createStagingAlert,
  getStagingAlerts,
  
  // Community Liquidity
  createSupplyPool,
  getSupplyPools,
  predictDemandMatching,
  getSellerReputation,
  updateSellerReputation,
  
  // Helpers
  REPUTATION_TIERS,
  getReputationTierInfo,
  PRICE_TRENDS,
  getPriceTrendInfo,
  SUPPLY_LEVELS,
  getSupplyLevelInfo
};
