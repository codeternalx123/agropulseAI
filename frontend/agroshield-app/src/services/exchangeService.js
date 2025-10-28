/**
 * AgroPulse Exchange Service
 * Decentralized marketplace with escrow, fraud prevention, and payment finality
 * Integrates with AI Farm Intelligence for verified asset listings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for market data

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
// TOKENIZED ASSET LISTING
// ============================================================================

/**
 * Create AI-verified tokenized asset listing
 * Links to GPS, soil scan, BLE sensors, harvest photos, pest history
 */
export const createAssetListing = async (assetData) => {
  try {
    const response = await api.post('/exchange/assets/create', assetData);
    return {
      success: true,
      asset: response.data,
      message: 'Asset listing created successfully'
    };
  } catch (error) {
    console.error('Error creating asset listing:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create asset listing'
    };
  }
};

/**
 * Publish asset to active marketplace
 */
export const publishAsset = async (assetId, expiresInDays = 30) => {
  try {
    const response = await api.put(`/exchange/assets/${assetId}/publish`, null, {
      params: { expires_in_days: expiresInDays }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error publishing asset:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to publish asset'
    };
  }
};

/**
 * Get active marketplace listings with filters
 */
export const getActiveAssets = async (filters = {}) => {
  try {
    const cacheKey = `active_assets_${JSON.stringify(filters)}`;
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return { success: true, assets: cached, fromCache: true };
    }

    const response = await api.get('/exchange/assets/active', { params: filters });
    const assets = response.data;
    
    await setCachedData(cacheKey, assets);
    
    return {
      success: true,
      assets,
      fromCache: false
    };
  } catch (error) {
    console.error('Error fetching active assets:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch assets',
      assets: []
    };
  }
};

/**
 * Get detailed asset information with full AI verification
 */
export const getAssetDetails = async (assetId) => {
  try {
    const response = await api.get(`/exchange/assets/${assetId}`);
    return {
      success: true,
      asset: response.data
    };
  } catch (error) {
    console.error('Error fetching asset details:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch asset details'
    };
  }
};

/**
 * Build AI verification data from farm intelligence
 */
export const buildAIVerification = (farmData, soilData, storageData, pestData, gpsData) => {
  return {
    // Harvest data
    harvest_health_score: farmData?.harvestHealthScore || null,
    harvest_maturity_level: farmData?.maturityLevel || null,
    harvest_image_url: farmData?.harvestImageUrl || null,
    harvest_date: farmData?.harvestDate || null,

    // Spoilage risk
    spoilage_risk_score: storageData?.spoilageRiskScore || 0,
    spoilage_risk_trend: storageData?.spoilageRiskTrend || 'low',
    predicted_shelf_life_days: storageData?.predictedShelfLifeDays || 30,
    color_coded_risk: storageData?.riskColor || '#4CAF50',

    // Storage conditions
    storage_condition_proof: storageData?.sensorData ? {
      sensor_id: storageData.sensorData.sensorId,
      temperature_avg: storageData.sensorData.temperatureAvg,
      temperature_min: storageData.sensorData.temperatureMin,
      temperature_max: storageData.sensorData.temperatureMax,
      humidity_avg: storageData.sensorData.humidityAvg,
      humidity_min: storageData.sensorData.humidityMin,
      humidity_max: storageData.sensorData.humidityMax,
      safe_range_compliance: storageData.sensorData.safeRangeCompliance,
      monitoring_start_date: storageData.sensorData.monitoringStartDate,
      monitoring_end_date: storageData.sensorData.monitoringEndDate,
      total_readings: storageData.sensorData.totalReadings
    } : null,

    // GPS data
    gps_latitude: gpsData?.latitude || 0,
    gps_longitude: gpsData?.longitude || 0,
    farm_id: farmData?.farmId || '',
    field_registration_id: farmData?.fieldId || '',

    // Pest management
    pest_scan_history: pestData?.scans || [],
    pest_free_certification: pestData?.pestFree || false,
    last_pest_scan_date: pestData?.lastScanDate || null,

    // Soil analysis
    soil_health_score: soilData?.healthScore || null,
    soil_nutrient_status: soilData?.nutrients || null,

    // NDVI
    ndvi_index: farmData?.ndviIndex || null,
    vegetation_health: farmData?.vegetationHealth || null,

    // Verification
    verified_at: new Date().toISOString(),
    ai_confidence_score: calculateConfidenceScore(farmData, soilData, storageData, pestData)
  };
};

const calculateConfidenceScore = (farmData, soilData, storageData, pestData) => {
  let score = 0;
  if (farmData?.harvestHealthScore) score += 20;
  if (soilData?.healthScore) score += 20;
  if (storageData?.sensorData) score += 25;
  if (pestData?.pestFree) score += 20;
  if (farmData?.ndviIndex) score += 15;
  return Math.min(score, 100);
};

// ============================================================================
// ESCROW TRANSACTIONS
// ============================================================================

/**
 * Create escrow transaction
 * Locks asset and prepares for fund escrow
 */
export const createEscrowTransaction = async (transactionData) => {
  try {
    const response = await api.post('/exchange/transactions/create', null, {
      params: transactionData
    });
    return {
      success: true,
      transaction: response.data,
      message: 'Transaction created. Please proceed to payment.'
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create transaction'
    };
  }
};

/**
 * Lock funds in escrow
 * CRITICAL: Once locked, funds CANNOT be withdrawn unilaterally
 */
export const escrowFunds = async (transactionId, paymentReference, paymentProofUrl = null) => {
  try {
    const response = await api.post(`/exchange/transactions/${transactionId}/escrow-funds`, null, {
      params: {
        payment_reference: paymentReference,
        payment_proof_url: paymentProofUrl
      }
    });
    return {
      success: true,
      data: response.data,
      warning: 'Funds are now LOCKED in escrow and cannot be withdrawn without delivery or dispute resolution'
    };
  } catch (error) {
    console.error('Error escrowing funds:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to escrow funds'
    };
  }
};

/**
 * Seller submits proof of delivery
 * Starts buyer acceptance window
 */
export const submitDeliveryProof = async (transactionId, deliveryImages, digitalSignature = null, qrCode = null) => {
  try {
    const response = await api.post(`/exchange/transactions/${transactionId}/submit-delivery-proof`, null, {
      params: {
        delivery_images: deliveryImages,
        digital_signature: digitalSignature,
        qr_code: qrCode
      }
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error submitting delivery proof:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to submit delivery proof'
    };
  }
};

/**
 * Buyer confirms acceptance
 * Triggers automatic fund release to seller
 */
export const buyerAcceptDelivery = async (transactionId, buyerId) => {
  try {
    const response = await api.post(`/exchange/transactions/${transactionId}/buyer-accept`, null, {
      params: { buyer_id: buyerId }
    });
    return {
      success: true,
      data: response.data,
      message: 'Transaction completed. Funds released to seller.'
    };
  } catch (error) {
    console.error('Error accepting delivery:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to accept delivery'
    };
  }
};

/**
 * Get transaction details
 */
export const getTransactionDetails = async (transactionId) => {
  try {
    const response = await api.get(`/exchange/transactions/${transactionId}`);
    return {
      success: true,
      transaction: response.data
    };
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch transaction'
    };
  }
};

// ============================================================================
// DISPUTE RESOLUTION
// ============================================================================

/**
 * Create dispute case
 * Freezes fund release and pulls AI data for arbitration
 */
export const createDispute = async (disputeData) => {
  try {
    const response = await api.post('/exchange/disputes/create', null, {
      params: disputeData
    });
    return {
      success: true,
      dispute: response.data,
      message: 'Dispute created. An arbitrator will review your case.'
    };
  } catch (error) {
    console.error('Error creating dispute:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create dispute'
    };
  }
};

/**
 * Get dispute details
 */
export const getDisputeDetails = async (disputeId) => {
  try {
    const response = await api.get(`/exchange/disputes/${disputeId}`);
    return {
      success: true,
      dispute: response.data
    };
  } catch (error) {
    console.error('Error fetching dispute:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch dispute'
    };
  }
};

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

/**
 * Sync inventory from AI Storage Intelligence Engine
 * Links storage data to marketplace
 */
export const syncInventoryFromStorage = async (farmId) => {
  try {
    const response = await api.post('/exchange/inventory/sync-from-storage', null, {
      params: { farm_id: farmId }
    });
    return {
      success: true,
      inventory: response.data.inventory
    };
  } catch (error) {
    console.error('Error syncing inventory:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to sync inventory'
    };
  }
};

/**
 * Get farm market inventory
 */
export const getFarmInventory = async (farmId) => {
  try {
    const response = await api.get(`/exchange/inventory/farm/${farmId}`);
    return {
      success: true,
      inventory: response.data
    };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch inventory',
      inventory: []
    };
  }
};

// ============================================================================
// BULK BUYER ORDERS
// ============================================================================

/**
 * Create bulk buyer order (processors/distributors)
 * System matches with available inventory and forward sales
 */
export const createBulkOrder = async (orderData) => {
  try {
    const response = await api.post('/exchange/orders/create-bulk-order', orderData);
    return {
      success: true,
      order: response.data,
      message: `Order created. Matched with ${response.data.matched_assets.length} assets.`
    };
  } catch (error) {
    console.error('Error creating bulk order:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create bulk order'
    };
  }
};

/**
 * Get buyer orders
 */
export const getBuyerOrders = async (buyerId) => {
  try {
    const response = await api.get(`/exchange/orders/bulk/${buyerId}`);
    return {
      success: true,
      orders: response.data
    };
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch orders',
      orders: []
    };
  }
};

// ============================================================================
// MARKETPLACE ANALYTICS
// ============================================================================

/**
 * Get marketplace statistics and analytics
 */
export const getMarketplaceStats = async () => {
  try {
    const cacheKey = 'marketplace_stats';
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return { success: true, stats: cached, fromCache: true };
    }

    const response = await api.get('/exchange/analytics/marketplace-stats');
    const stats = response.data;
    
    await setCachedData(cacheKey, stats);
    
    return {
      success: true,
      stats,
      fromCache: false
    };
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch stats'
    };
  }
};

// ============================================================================
// QUALITY GRADE HELPERS
// ============================================================================

export const QUALITY_GRADES = {
  GRADE_A_PREMIUM: {
    value: 'grade_a_premium',
    label: 'Grade A Premium',
    icon: '⭐',
    color: '#FFD700',
    description: 'AI-verified with full traceability, GPS, sensors, and pest-free certification'
  },
  GRADE_B_STANDARD: {
    value: 'grade_b_standard',
    label: 'Grade B Standard',
    icon: '✓',
    color: '#4CAF50',
    description: 'Partial verification with basic quality controls'
  },
  GRADE_C_BASIC: {
    value: 'grade_c_basic',
    label: 'Grade C Basic',
    icon: '○',
    color: '#9E9E9E',
    description: 'Minimal verification, standard market grade'
  }
};

export const getQualityGradeInfo = (grade) => {
  return QUALITY_GRADES[grade.toUpperCase()] || QUALITY_GRADES.GRADE_C_BASIC;
};

// ============================================================================
// PAYMENT METHOD HELPERS
// ============================================================================

export const PAYMENT_METHODS = {
  MPESA: { value: 'mpesa', label: 'M-Pesa', icon: '📱' },
  BANK_TRANSFER: { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  CRYPTO: { value: 'crypto', label: 'Cryptocurrency', icon: '₿' },
  CASH_ON_DELIVERY: { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: '💵' }
};

export default {
  // Asset Listing
  createAssetListing,
  publishAsset,
  getActiveAssets,
  getAssetDetails,
  buildAIVerification,
  
  // Escrow Transactions
  createEscrowTransaction,
  escrowFunds,
  submitDeliveryProof,
  buyerAcceptDelivery,
  getTransactionDetails,
  
  // Disputes
  createDispute,
  getDisputeDetails,
  
  // Inventory
  syncInventoryFromStorage,
  getFarmInventory,
  
  // Bulk Orders
  createBulkOrder,
  getBuyerOrders,
  
  // Analytics
  getMarketplaceStats,
  
  // Helpers
  QUALITY_GRADES,
  getQualityGradeInfo,
  PAYMENT_METHODS
};
