/**
 * Drone Intelligence Service
 * =========================
 * Handles drone data upload, multispectral analysis, 3D reconstruction,
 * yield prediction, and harvest optimization.
 */

import api from './api';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

export const IMAGE_TYPES = {
  RGB: 'rgb',
  MULTISPECTRAL: 'multispectral',
  THERMAL: 'thermal',
  LIDAR: 'lidar'
};

export const QUALITY_GRADES = {
  GRADE_A_PREMIUM: {
    label: 'Grade A Premium',
    icon: '⭐',
    color: '#FFD700',
    uniformity: '90-100%',
    description: 'Exceptional uniformity and health'
  },
  GRADE_B_STANDARD: {
    label: 'Grade B Standard',
    icon: '✓',
    color: '#4CAF50',
    uniformity: '70-89%',
    description: 'Good overall quality'
  },
  GRADE_C_BASIC: {
    label: 'Grade C Basic',
    icon: '○',
    color: '#FF9800',
    uniformity: '50-69%',
    description: 'Acceptable with some variation'
  },
  GRADE_D_POOR: {
    label: 'Grade D Poor',
    icon: '⚠',
    color: '#F44336',
    uniformity: '<50%',
    description: 'Significant quality issues'
  }
};

export const HARVEST_STATUS = {
  PRE_HARVEST: 'pre_harvest',
  OPTIMAL_WINDOW: 'optimal_window',
  HARVESTING: 'harvesting',
  HARVESTED: 'harvested',
  DELAYED: 'delayed'
};

export const FLIGHT_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PROCESSING: 'processing',
  ANALYZED: 'analyzed'
};

// ============================================================================
// PILLAR 1: DATA ACQUISITION
// ============================================================================

/**
 * Plan a drone flight mission
 */
const planDroneFlight = async (flightPlanData) => {
  try {
    const response = await api.post('/drone/plan-flight', flightPlanData);
    return {
      success: true,
      flightPlan: response.data.flight_plan,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error planning drone flight:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to plan flight'
    };
  }
};

/**
 * Upload drone images from completed flight
 */
const uploadDroneImages = async (flightId, imageData) => {
  try {
    const formData = new FormData();
    formData.append('flight_id', flightId);
    formData.append('image_data', JSON.stringify(imageData));

    const response = await api.post('/drone/upload-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      success: true,
      imagesUploaded: response.data.images_uploaded,
      flightId: response.data.flight_id,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error uploading drone images:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to upload images'
    };
  }
};

/**
 * Upload BLE sensor data collected during drone flight
 */
const uploadBLESensorData = async (flightId, sensorData) => {
  try {
    const response = await api.post('/drone/collect-ble-data', {
      flight_id: flightId,
      sensor_data: sensorData
    });

    return {
      success: true,
      sensorsCollected: response.data.sensors_collected,
      averageMoisture: response.data.average_soil_moisture,
      averageTemperature: response.data.average_soil_temperature,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error uploading BLE data:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to upload sensor data'
    };
  }
};

// ============================================================================
// PILLAR 2: AI ANALYSIS & PREDICTION
// ============================================================================

/**
 * Analyze multispectral images for NDVI and health mapping
 */
const analyzeMultispectralImages = async (flightId, farmId, fieldAreaHectares) => {
  try {
    const response = await api.post('/drone/analysis/multispectral', {
      flight_id: flightId,
      farm_id: farmId,
      field_area_hectares: fieldAreaHectares
    });

    return {
      success: true,
      analysis: response.data.analysis,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error analyzing multispectral images:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to analyze images'
    };
  }
};

/**
 * Create 3D farm reconstruction from drone imagery
 */
const create3DFarmModel = async (flightId, farmId) => {
  try {
    const response = await api.post('/drone/analysis/3d-reconstruction', {
      flight_id: flightId,
      farm_id: farmId
    });

    return {
      success: true,
      reconstruction: response.data.reconstruction,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error creating 3D model:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create 3D model'
    };
  }
};

/**
 * Predict crop yield using AI
 */
const predictYield = async (yieldData) => {
  try {
    const response = await api.post('/drone/prediction/yield', yieldData);

    return {
      success: true,
      prediction: response.data.prediction,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error predicting yield:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to predict yield'
    };
  }
};

/**
 * Calculate optimal harvest window
 */
const calculateOptimalHarvestWindow = async (farmId, predictionId, storageFacilityId = null) => {
  try {
    const response = await api.post('/drone/harvest/calculate-optimal-window', {
      farm_id: farmId,
      prediction_id: predictionId,
      storage_facility_id: storageFacilityId
    });

    return {
      success: true,
      window: response.data.window,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error calculating harvest window:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to calculate window'
    };
  }
};

// ============================================================================
// PILLAR 3: MARKETPLACE & LOGISTICS
// ============================================================================

/**
 * Create farmer aggregation bundle for bulk buyers
 */
const createAggregationBundle = async (bundleData) => {
  try {
    const response = await api.post('/drone/marketplace/create-aggregation-bundle', bundleData);

    return {
      success: true,
      bundle: response.data.bundle,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error creating bundle:', error);
    return {
      success: false,
      error: error.response?.data?.detail || error.response?.data?.message || 'Failed to create bundle'
    };
  }
};

/**
 * Create pre-harvest marketplace listing (future contract)
 */
const createPreHarvestListing = async (listingData) => {
  try {
    const response = await api.post('/drone/marketplace/create-pre-harvest-listing', listingData);

    return {
      success: true,
      listing: response.data.listing,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error creating pre-harvest listing:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to create listing'
    };
  }
};

/**
 * Trigger harvest alert when optimal window is reached
 */
const triggerHarvestAlert = async (windowId, farmerId) => {
  try {
    const response = await api.post('/drone/harvest/trigger-alert', {
      window_id: windowId,
      farmer_id: farmerId
    });

    return {
      success: true,
      alert: response.data.alert,
      notificationsSent: response.data.notifications_sent,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error triggering harvest alert:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to trigger alert'
    };
  }
};

/**
 * Confirm harvesting has started
 */
const confirmHarvestingStarted = async (alertId) => {
  try {
    const response = await api.put(`/drone/harvest/confirm-harvesting/${alertId}`);

    return {
      success: true,
      message: response.data.message,
      buyerNotified: response.data.buyer_notified,
      storageNotified: response.data.storage_notified,
      logisticsNotified: response.data.logistics_notified
    };
  } catch (error) {
    console.error('Error confirming harvest:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to confirm harvest'
    };
  }
};

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all drone flights for a farm
 */
const getFarmFlights = async (farmId) => {
  try {
    const response = await api.get(`/drone/drone/flights/${farmId}`);
    return {
      success: true,
      flights: response.data.flights,
      total: response.data.total
    };
  } catch (error) {
    console.error('Error fetching flights:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch flights'
    };
  }
};

/**
 * Get multispectral analysis for a flight
 */
const getMultispectralAnalysis = async (flightId) => {
  try {
    const response = await api.get(`/drone/analysis/multispectral/${flightId}`);
    return {
      success: true,
      analysis: response.data.analysis
    };
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch analysis'
    };
  }
};

/**
 * Get yield predictions for a farm
 */
const getFarmYieldPredictions = async (farmId) => {
  try {
    const response = await api.get(`/drone/prediction/yield/${farmId}`);
    return {
      success: true,
      predictions: response.data.predictions,
      total: response.data.total
    };
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch predictions'
    };
  }
};

/**
 * Get harvest window for a farm
 */
const getHarvestWindow = async (farmId) => {
  try {
    const response = await api.get(`/drone/harvest/window/${farmId}`);
    return {
      success: true,
      window: response.data.window
    };
  } catch (error) {
    console.error('Error fetching harvest window:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'No harvest window calculated'
    };
  }
};

/**
 * Browse aggregation bundles
 */
const getAggregationBundles = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.cropType) params.append('crop_type', filters.cropType);
    if (filters.qualityGrade) params.append('quality_grade', filters.qualityGrade);
    if (filters.status) params.append('status', filters.status);

    const response = await api.get(`/drone/marketplace/aggregation-bundles?${params.toString()}`);
    return {
      success: true,
      bundles: response.data.bundles,
      total: response.data.total
    };
  } catch (error) {
    console.error('Error fetching bundles:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch bundles'
    };
  }
};

/**
 * Browse pre-harvest listings
 */
const getPreHarvestListings = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.cropType) params.append('crop_type', filters.cropType);
    if (filters.qualityGrade) params.append('quality_grade', filters.qualityGrade);
    if (filters.maxWeeksUntilHarvest) params.append('max_weeks_until_harvest', filters.maxWeeksUntilHarvest);

    const response = await api.get(`/drone/marketplace/pre-harvest-listings?${params.toString()}`);
    return {
      success: true,
      listings: response.data.listings,
      total: response.data.total
    };
  } catch (error) {
    console.error('Error fetching listings:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch listings'
    };
  }
};

/**
 * Get harvest alerts for a farmer
 */
const getFarmerHarvestAlerts = async (farmerId) => {
  try {
    const response = await api.get(`/drone/harvest/alerts/${farmerId}`);
    return {
      success: true,
      alerts: response.data.alerts,
      total: response.data.total
    };
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch alerts'
    };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get quality grade info
 */
export const getQualityGradeInfo = (grade) => {
  return QUALITY_GRADES[grade] || QUALITY_GRADES.GRADE_B_STANDARD;
};

/**
 * Format yield value with commas
 */
export const formatYield = (yieldKg) => {
  return yieldKg.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

/**
 * Format currency (KES)
 */
export const formatCurrency = (amount) => {
  return `KES ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Calculate days until date
 */
export const daysUntil = (dateString) => {
  const targetDate = new Date(dateString);
  const now = new Date();
  const diffTime = targetDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get harvest status color
 */
export const getHarvestStatusColor = (status) => {
  const colors = {
    [HARVEST_STATUS.PRE_HARVEST]: '#2196F3',
    [HARVEST_STATUS.OPTIMAL_WINDOW]: '#4CAF50',
    [HARVEST_STATUS.HARVESTING]: '#FF9800',
    [HARVEST_STATUS.HARVESTED]: '#9E9E9E',
    [HARVEST_STATUS.DELAYED]: '#F44336'
  };
  return colors[status] || '#666';
};

/**
 * Get flight status color
 */
export const getFlightStatusColor = (status) => {
  const colors = {
    [FLIGHT_STATUS.PLANNED]: '#2196F3',
    [FLIGHT_STATUS.IN_PROGRESS]: '#FF9800',
    [FLIGHT_STATUS.COMPLETED]: '#4CAF50',
    [FLIGHT_STATUS.PROCESSING]: '#9C27B0',
    [FLIGHT_STATUS.ANALYZED]: '#4CAF50'
  };
  return colors[status] || '#666';
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Data Acquisition
  planDroneFlight,
  uploadDroneImages,
  uploadBLESensorData,

  // AI Analysis
  analyzeMultispectralImages,
  create3DFarmModel,
  predictYield,
  calculateOptimalHarvestWindow,

  // Marketplace
  createAggregationBundle,
  createPreHarvestListing,
  triggerHarvestAlert,
  confirmHarvestingStarted,

  // Queries
  getFarmFlights,
  getMultispectralAnalysis,
  getFarmYieldPredictions,
  getHarvestWindow,
  getAggregationBundles,
  getPreHarvestListings,
  getFarmerHarvestAlerts,

  // Helpers
  getQualityGradeInfo,
  formatYield,
  formatCurrency,
  daysUntil,
  getHarvestStatusColor,
  getFlightStatusColor
};
