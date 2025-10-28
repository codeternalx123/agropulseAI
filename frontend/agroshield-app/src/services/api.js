import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_CONFIG } from '../config/apiConfig';

// Get API base URL from environment or use default
const API_BASE_URL = process.env.API_BASE_URL || API_CONFIG.BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // Get token from AsyncStorage (Supabase session)
      const sessionStr = await AsyncStorage.getItem('supabase.auth.token');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const token = session?.access_token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear session
      await AsyncStorage.removeItem('supabase.auth.token');
      // You can also trigger navigation to login here
    }
    return Promise.reject(error);
  }
);

export default api;

// =============================================================================
// FARM REGISTRATION API
// =============================================================================

export const farmAPI = {
  // Register farm with AI analysis
  registerFarm: async (farmData) => {
    const response = await api.post('/farms/register', {
      ...farmData,
      enable_ai_analysis: true,
    });
    return response.data;
  },

  // Get farmer's farms
  getFarms: async (farmerId) => {
    const response = await api.get(`/farms/farmer/${farmerId}`);
    return response.data;
  },

  // Add soil snapshot with AI
  addSoilSnapshot: async (fieldId, photos) => {
    const response = await api.post('/farms/soil-snapshot-simple', {
      field_id: fieldId,
      soil_photo_wet_url: photos.wet,
      soil_photo_dry_url: photos.dry,
      enable_ai_analysis: true,
    });
    return response.data;
  },

  // Get variety recommendation
  getVarietyRecommendation: async (fieldId, crop, variety, lcrsScore) => {
    const response = await api.post('/farms/variety-recommendation', {
      field_id: fieldId,
      crop,
      selected_variety: variety,
      lcrs_score: lcrsScore,
    });
    return response.data;
  },
};

// =============================================================================
// CALENDAR API
// =============================================================================

export const calendarAPI = {
  // Generate farming calendar
  generateCalendar: async (fieldId) => {
    const response = await api.post('/calendar/generate', { field_id: fieldId });
    return response.data;
  },

  // Get practices for field
  getPractices: async (fieldId, status = 'all') => {
    const response = await api.get(`/calendar/practices/${fieldId}`, {
      params: { status },
    });
    return response.data;
  },

  // Mark practice as done
  markPracticeDone: async (practiceId, notes, photos) => {
    const response = await api.post(`/calendar/practices/${practiceId}/done`, {
      notes,
      photo_urls: photos,
    });
    return response.data;
  },

  // Get AI-adjusted practices
  getAIAdjustedPractices: async (fieldId, weatherForecast) => {
    const response = await api.post(`/calendar/ai-adjusted-practices/${fieldId}`, {
      weather_forecast: weatherForecast,
    });
    return response.data;
  },

  // Get optimized fertilizer timing
  getOptimizedFertilizerTiming: async (fieldId, fertilizerType, scheduledDate) => {
    const response = await api.post('/calendar/optimize-fertilizer-timing', {
      field_id: fieldId,
      fertilizer_type: fertilizerType,
      scheduled_date: scheduledDate,
    });
    return response.data;
  },

  // Get refined harvest window
  getRefinedHarvestWindow: async (fieldId, crop, variety) => {
    const response = await api.post('/calendar/refine-harvest-window', {
      field_id: fieldId,
      crop,
      variety,
    });
    return response.data;
  },
};

// =============================================================================
// PEST DETECTION API
// =============================================================================

export const pestAPI = {
  // Scan plant for pests/diseases
  scanPlant: async (fieldId, photoUrl, symptoms) => {
    const response = await api.post('/scan/plant', {
      field_id: fieldId,
      photo_url: photoUrl,
      symptoms,
    });
    return response.data;
  },

  // Scan soil with ML model
  scanSoil: async (imageFile) => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageFile,
      type: 'image/jpeg',
      name: 'soil.jpg',
    });
    
    const response = await api.post('/scan/soil', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get IPM recommendations
  getIPMRecommendations: async (disease, severity) => {
    const response = await api.post('/scan/ipm-recommendations', {
      disease,
      severity,
    });
    return response.data;
  },

  // Get scan history
  getScanHistory: async (farmerId) => {
    const response = await api.get(`/scan/history/${farmerId}`);
    return response.data;
  },
};

// =============================================================================
// AI PREDICTION API
// =============================================================================

export const predictionAPI = {
  // Predict plant health from image
  predictPlantHealth: async (imageUrl) => {
    const response = await api.post('/predict/plant-health', {
      image_url: imageUrl,
    });
    return response.data;
  },

  // Predict soil quality from image
  predictSoilQuality: async (imageUrl) => {
    const response = await api.post('/predict/soil-quality', {
      image_url: imageUrl,
    });
    return response.data;
  },

  // Predict weather/climate
  predictWeather: async (latitude, longitude, daysAhead = 7) => {
    const response = await api.post('/predict/weather', {
      latitude,
      longitude,
      days_ahead: daysAhead,
    });
    return response.data;
  },

  // Batch prediction
  batchPredict: async (images) => {
    const response = await api.post('/predict/batch', { images });
    return response.data;
  },
};

// =============================================================================
// GROWTH TRACKING API
// =============================================================================

export const growthAPI = {
  // Log growth milestone
  logMilestone: async (fieldId, milestoneData) => {
    const response = await api.post('/growth/log-milestone', {
      field_id: fieldId,
      ...milestoneData,
    });
    return response.data;
  },

  // Get growth timeline
  getTimeline: async (fieldId) => {
    const response = await api.get(`/growth/timeline/${fieldId}`);
    return response.data;
  },

  // Get growth analytics
  getAnalytics: async (fieldId) => {
    const response = await api.get(`/growth/analytics/${fieldId}`);
    return response.data;
  },

  // Track yield
  trackYield: async (fieldId, yieldData) => {
    const response = await api.post('/growth/track-yield', {
      field_id: fieldId,
      ...yieldData,
    });
    return response.data;
  },

  // Get yield predictions
  getYieldPredictions: async (fieldId) => {
    const response = await api.get(`/growth/yield-predictions/${fieldId}`);
    return response.data;
  },

  // Compare with similar farms
  compareWithPeers: async (fieldId) => {
    const response = await api.get(`/growth/compare-peers/${fieldId}`);
    return response.data;
  },

  // Get growth recommendations
  getRecommendations: async (fieldId) => {
    const response = await api.get(`/growth/recommendations/${fieldId}`);
    return response.data;
  },
};

// =============================================================================
// CLIMATE/WEATHER API
// =============================================================================

export const climateAPI = {
  // Get LCRS score
  getLCRSScore: async (latitude, longitude) => {
    const response = await api.post('/climate/lcrs-score', {
      latitude,
      longitude,
    });
    return response.data;
  },

  // Get weather forecast
  getWeatherForecast: async (latitude, longitude) => {
    const response = await api.post('/climate/weather-forecast', {
      latitude,
      longitude,
    });
    return response.data;
  },

  // Get climate recommendations
  getClimateRecommendations: async (farmingZone, lcrsScore) => {
    const response = await api.post('/climate/recommendations', {
      farming_zone: farmingZone,
      lcrs_score: lcrsScore,
    });
    return response.data;
  },
};

// =============================================================================
// VILLAGE GROUPS API
// =============================================================================

export const villageGroupsAPI = {
  // Register farmer to group
  registerToGroup: async (farmerData) => {
    const response = await api.post('/village-groups/register-farmer', farmerData);
    return response.data;
  },

  // Get group feed
  getGroupFeed: async (groupId, filters = {}) => {
    const response = await api.get(`/village-groups/groups/${groupId}/feed`, {
      params: filters,
    });
    return response.data;
  },

  // Create post
  createPost: async (groupId, postData) => {
    const response = await api.post(`/village-groups/groups/${groupId}/posts`, postData);
    return response.data;
  },

  // Upvote post
  upvotePost: async (postId, farmerId) => {
    const response = await api.post(`/village-groups/posts/${postId}/upvote`, {
      farmer_id: farmerId,
    });
    return response.data;
  },

  // Add reply
  addReply: async (postId, replyData) => {
    const response = await api.post(`/village-groups/posts/${postId}/replies`, replyData);
    return response.data;
  },

  // Get community polls
  getPolls: async (groupId) => {
    const response = await api.get(`/village-groups/groups/${groupId}/polls`);
    return response.data;
  },

  // Vote on poll
  voteOnPoll: async (pollId, farmerId, option) => {
    const response = await api.post(`/village-groups/polls/${pollId}/vote`, {
      farmer_id: farmerId,
      option,
    });
    return response.data;
  },

  // Get weekly showcase
  getWeeklyShowcase: async (groupId) => {
    const response = await api.get(`/village-groups/groups/${groupId}/showcase`);
    return response.data;
  },
};

// =============================================================================
// PARTNER PORTAL API
// =============================================================================

export const partnerAPI = {
  // Get campaigns
  getCampaigns: async (filters = {}) => {
    const response = await api.get('/partners/campaigns', { params: filters });
    return response.data;
  },

  // Register for campaign
  registerForCampaign: async (campaignId, farmerId) => {
    const response = await api.post(`/partners/campaigns/${campaignId}/register-farmer`, {
      farmer_id: farmerId,
      registration_method: 'app',
    });
    return response.data;
  },

  // Request expert help
  requestExpertHelp: async (helpRequest) => {
    const response = await api.post('/partners/expert-help/request', helpRequest);
    return response.data;
  },

  // Get expert help requests
  getExpertHelpRequests: async (farmerId) => {
    const response = await api.get(`/partners/expert-help/farmer/${farmerId}`);
    return response.data;
  },

  // Get outbreak dashboard
  getOutbreakDashboard: async (county) => {
    const response = await api.get('/partners/outbreak-dashboard/live', {
      params: { county },
    });
    return response.data;
  },
};

// =============================================================================
// BLE STORAGE SENSOR API
// =============================================================================

export const storageAPI = {
  // Pair sensor
  pairSensor: async (sensorData) => {
    const response = await api.post('/storage/pair-sensor', sensorData);
    return response.data;
  },

  // Get sensor readings
  getSensorReadings: async (sensorId) => {
    const response = await api.get(`/storage/sensors/${sensorId}/readings`);
    return response.data;
  },

  // Get storage recommendations
  getStorageRecommendations: async (sensorId) => {
    const response = await api.get(`/storage/sensors/${sensorId}/recommendations`);
    return response.data;
  },
};

// =============================================================================
// NOTIFICATIONS API
// =============================================================================

export const notificationsAPI = {
  // Get notifications
  getNotifications: async (farmerId) => {
    const response = await api.get(`/notifications/farmer/${farmerId}`);
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Register push token
  registerPushToken: async (farmerId, token) => {
    const response = await api.post('/notifications/register-token', {
      farmer_id: farmerId,
      token,
      platform: Platform.OS,
    });
    return response.data;
  },
};

// =============================================================================
// PHOTO UPLOAD API
// =============================================================================

export const uploadAPI = {
  // Upload single photo with category
  uploadPhoto: async (uri, category = 'general') => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', {
      uri,
      type,
      name: filename || 'photo.jpg',
    });
    formData.append('category', category);

    const response = await api.post('/upload/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Upload plant image
  uploadPlantImage: async (uri) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', {
      uri,
      type,
      name: filename || 'plant.jpg',
    });

    const response = await api.post('/upload/plant', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Upload leaf image
  uploadLeafImage: async (uri) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', {
      uri,
      type,
      name: filename || 'leaf.jpg',
    });

    const response = await api.post('/upload/leaf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Upload soil image
  uploadSoilImage: async (uri) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', {
      uri,
      type,
      name: filename || 'soil.jpg',
    });

    const response = await api.post('/upload/soil', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Upload farm/field image
  uploadFarmImage: async (uri) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', {
      uri,
      type,
      name: filename || 'farm.jpg',
    });

    const response = await api.post('/upload/farm', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Upload multiple photos at once
  uploadPhotoBatch: async (uris, category = 'general') => {
    const formData = new FormData();

    uris.forEach((uri, index) => {
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photos', {
        uri,
        type,
        name: filename || `photo_${index}.jpg`,
      });
    });

    formData.append('category', category);

    const response = await api.post('/upload/photos/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Delete photo
  deletePhoto: async (category, filename) => {
    const response = await api.delete(`/upload/${category}/${filename}`);
    return response.data;
  },

  // Get upload statistics
  getUploadStats: async () => {
    const response = await api.get('/upload/stats');
    return response.data;
  },
};

// Legacy function for backward compatibility
export const uploadPhoto = async (uri) => {
  const response = await uploadAPI.uploadPhoto(uri, 'general');
  return response.url;
};

// =============================================================================
// SUBSCRIPTION & PAYMENT API
// =============================================================================

export const subscriptionAPI = {
  // Get all subscription tiers
  getTiers: async () => {
    const response = await api.get('/subscription/tiers');
    return response.data;
  },

  // Subscribe to a tier
  subscribe: async (phoneNumber, tier, duration = 'monthly') => {
    const response = await api.post('/subscription/subscribe', {
      phone_number: phoneNumber,
      tier,
      duration,
    });
    return response.data;
  },

  // Purchase pay-per-service
  purchaseService: async (phoneNumber, serviceType) => {
    const response = await api.post('/subscription/pay-per-service', {
      phone_number: phoneNumber,
      service_type: serviceType,
    });
    return response.data;
  },

  // Get subscription status
  getStatus: async (userId) => {
    const response = await api.get(`/subscription/status/${userId}`);
    return response.data;
  },

  // Get transaction history
  getTransactions: async (userId) => {
    const response = await api.get(`/subscription/transactions/${userId}`);
    return response.data;
  },

  // Get reliability score
  getReliabilityScore: async (userId) => {
    const response = await api.get(`/subscription/reliability-score/${userId}`);
    return response.data;
  },

  // Check feature access
  checkAccess: async (userId, featureTier) => {
    const response = await api.post('/subscription/check-access', null, {
      params: { user_id: userId, feature_tier: featureTier },
    });
    return response.data;
  },
};

// =============================================================================
// PREMIUM FEATURES API
// =============================================================================

export const premiumAPI = {
  // Yield & Profit Forecasting (PRO)
  getYieldForecast: async (fieldId, userId, daysAhead = 90) => {
    const response = await api.post(`/premium/yield-forecast?user_id=${userId}`, {
      field_id: fieldId,
      days_ahead: daysAhead,
    });
    return response.data;
  },

  // What-If Scenario Analysis (PRO)
  calculateWhatIf: async (fieldId, userId, investmentAmount, investmentType) => {
    const response = await api.post(`/premium/what-if-scenario?user_id=${userId}`, {
      field_id: fieldId,
      investment_amount: investmentAmount,
      investment_type: investmentType,
    });
    return response.data;
  },

  // Premium Market Alerts (PRO)
  getMarketAlerts: async (crop, userId) => {
    const response = await api.get(`/premium/premium-market-alerts/${crop}?user_id=${userId}`);
    return response.data;
  },

  // Priority Expert Triage (EXPERT)
  requestPriorityExpert: async (imageUrl, symptoms, fieldId, userId) => {
    const response = await api.post(`/premium/priority-expert-triage?user_id=${userId}`, {
      image_url: imageUrl,
      symptoms,
      field_id: fieldId,
      guaranteed_response: true,
    });
    return response.data;
  },

  // Spectral Analysis (EXPERT)
  performSpectralAnalysis: async (imageUrl, fieldId, userId) => {
    const response = await api.post(`/premium/spectral-analysis?user_id=${userId}`, {
      image_url: imageUrl,
      field_id: fieldId,
    });
    return response.data;
  },

  // Custom Fertilizer Plan (EXPERT)
  getCustomFertilizerPlan: async (fieldId, userId) => {
    const response = await api.post(`/premium/custom-fertilizer-plan?user_id=${userId}`, {
      field_id: fieldId,
    });
    return response.data;
  },

  // High-Frequency Storage Monitoring (EXPERT)
  getStorageMonitoring: async (deviceId, userId) => {
    const response = await api.get(`/premium/storage-monitoring/${deviceId}?user_id=${userId}`);
    return response.data;
  },

  // Generate Storage Certificate (EXPERT)
  generateStorageCertificate: async (deviceId, userId, durationDays = 30) => {
    const response = await api.post(`/premium/storage-certificate?user_id=${userId}`, {
      storage_device_id: deviceId,
      duration_days: durationDays,
    });
    return response.data;
  },

  // Generate IoT API Key (EXPERT)
  generateIoTApiKey: async (userId) => {
    const response = await api.post(`/premium/iot-api-key?user_id=${userId}`);
    return response.data;
  },
};

// =============================================================================
// AUTHENTICATION API (Supabase)
// =============================================================================

export const authAPI = {
  // Register new user
  register: async (email, password, userType, fullName, phoneNumber, location) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      user_type: userType, // 'farmer' or 'buyer'
      full_name: fullName,
      phone_number: phoneNumber,
      location,
    });
    return response.data;
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Get current user profile
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update user profile
  updateProfile: async (updates) => {
    const response = await api.put('/auth/me', updates);
    return response.data;
  },

  // Request password reset
  resetPassword: async (email) => {
    const response = await api.post('/auth/reset-password', { email });
    return response.data;
  },

  // Update password
  updatePassword: async (newPassword) => {
    const response = await api.post('/auth/update-password', {
      new_password: newPassword,
    });
    return response.data;
  },

  // Verify token
  verifyToken: async () => {
    const response = await api.get('/auth/verify-token');
    return response.data;
  },
};

// =============================================================================
// FARMER MARKETPLACE API (Cross-Regional)
// =============================================================================

export const farmerMarketplaceAPI = {
  // List produce on marketplace
  listProduce: async (produceData) => {
    const response = await api.post('/marketplace/farmer/list-produce', produceData);
    return response.data;
  },

  // Get farmer's active listings
  getMyListings: async (farmerId, status = 'active') => {
    const response = await api.get(`/marketplace/farmer/listings/${farmerId}`, {
      params: { status },
    });
    return response.data;
  },

  // Update listing
  updateListing: async (listingId, updates) => {
    const response = await api.put(`/marketplace/farmer/listings/${listingId}`, updates);
    return response.data;
  },

  // Mark listing as sold
  markAsSold: async (listingId, soldQuantity) => {
    const response = await api.post(`/marketplace/farmer/listings/${listingId}/sold`, {
      sold_quantity_kg: soldQuantity,
    });
    return response.data;
  },

  // Get demand matching (buyers looking for my produce)
  getDemandMatching: async (farmerId) => {
    const response = await api.get(`/marketplace/farmer/demand-matching/${farmerId}`);
    return response.data;
  },

  // Get best regional markets
  getBestMarkets: async (farmerId, crop, quantityKg) => {
    const response = await api.post('/marketplace/farmer/best-markets', {
      farmer_id: farmerId,
      crop,
      quantity_kg: quantityKg,
    });
    return response.data;
  },

  // Get logistics partners
  getLogistics: async (fromLocation, toLocation, quantityKg) => {
    const response = await api.post('/marketplace/farmer/logistics', {
      from_location: fromLocation,
      to_location: toLocation,
      quantity_kg: quantityKg,
    });
    return response.data;
  },

  // Get aggregator pricing
  getAggregatorPricing: async (farmerId, crop) => {
    const response = await api.post('/marketplace/farmer/aggregator-pricing', {
      farmer_id: farmerId,
      crop,
    });
    return response.data;
  },

  // Get earnings analytics
  getEarningsAnalytics: async (farmerId, period = '30d') => {
    const response = await api.get(`/marketplace/farmer/earnings/${farmerId}`, {
      params: { period },
    });
    return response.data;
  },

  // Get price alerts
  getPriceAlerts: async (farmerId) => {
    const response = await api.get(`/marketplace/farmer/price-alerts/${farmerId}`);
    return response.data;
  },

  // Subscribe to price alerts
  subscribeToPriceAlerts: async (farmerId, crop, targetPrice) => {
    const response = await api.post('/marketplace/farmer/price-alerts/subscribe', {
      farmer_id: farmerId,
      crop,
      target_price: targetPrice,
    });
    return response.data;
  },
};

// =============================================================================
// BUYER MARKETPLACE API (Cross-Regional)
// =============================================================================

export const buyerMarketplaceAPI = {
  // Search produce across regions
  searchProduce: async (filters) => {
    const response = await api.post('/marketplace/buyer/search', filters);
    return response.data;
  },

  // Create purchase request
  createPurchaseRequest: async (requestData) => {
    const response = await api.post('/marketplace/buyer/purchase-request', requestData);
    return response.data;
  },

  // Get my purchase requests
  getMyRequests: async (buyerId) => {
    const response = await api.get(`/marketplace/buyer/requests/${buyerId}`);
    return response.data;
  },

  // Get matched farmers
  getMatchedFarmers: async (buyerId, crop, quantityKg) => {
    const response = await api.post('/marketplace/buyer/matched-farmers', {
      buyer_id: buyerId,
      crop,
      quantity_kg: quantityKg,
    });
    return response.data;
  },

  // Get supply forecast
  getSupplyForecast: async (buyerId, crop, daysAhead = 30) => {
    const response = await api.post('/marketplace/buyer/supply-forecast', {
      buyer_id: buyerId,
      crop,
      days_ahead: daysAhead,
    });
    return response.data;
  },

  // Get regional pricing comparison
  getRegionalPricing: async (crop) => {
    const response = await api.get(`/marketplace/buyer/regional-pricing/${crop}`);
    return response.data;
  },

  // Get quality verification
  getQualityVerification: async (listingId) => {
    const response = await api.get(`/marketplace/buyer/quality-verification/${listingId}`);
    return response.data;
  },

  // Request sample
  requestSample: async (listingId, buyerId) => {
    const response = await api.post('/marketplace/buyer/request-sample', {
      listing_id: listingId,
      buyer_id: buyerId,
    });
    return response.data;
  },

  // Place order
  placeOrder: async (orderData) => {
    const response = await api.post('/marketplace/buyer/place-order', orderData);
    return response.data;
  },

  // Get order history
  getOrderHistory: async (buyerId) => {
    const response = await api.get(`/marketplace/buyer/orders/${buyerId}`);
    return response.data;
  },

  // Rate transaction
  rateTransaction: async (transactionId, rating, review) => {
    const response = await api.post('/marketplace/buyer/rate-transaction', {
      transaction_id: transactionId,
      rating,
      review,
    });
    return response.data;
  },
};

// =============================================================================
// REGIONAL CROSS-BORDER API
// =============================================================================

export const regionalAPI = {
  // Get cross-regional market analysis
  getCrossRegionalAnalysis: async (crop, regions) => {
    const response = await api.post('/regional/analysis', {
      crop,
      regions,
    });
    return response.data;
  },

  // Get trade opportunities
  getTradeOpportunities: async (farmerId) => {
    const response = await api.get(`/regional/opportunities/${farmerId}`);
    return response.data;
  },

  // Get export requirements
  getExportRequirements: async (crop, fromRegion, toRegion) => {
    const response = await api.post('/regional/export-requirements', {
      crop,
      from_region: fromRegion,
      to_region: toRegion,
    });
    return response.data;
  },

  // Get currency exchange rates
  getExchangeRates: async () => {
    const response = await api.get('/regional/exchange-rates');
    return response.data;
  },

  // Calculate cross-border costs
  calculateCrossBorderCosts: async (fromLocation, toLocation, quantityKg, crop) => {
    const response = await api.post('/regional/calculate-costs', {
      from_location: fromLocation,
      to_location: toLocation,
      quantity_kg: quantityKg,
      crop,
    });
    return response.data;
  },
};

// =============================================================================
// PAYMENT GATEWAY API (M-Pesa, Stripe, etc.)
// =============================================================================

export const paymentAPI = {
  // Initialize M-Pesa payment
  initiateMpesa: async (phoneNumber, amount, accountReference) => {
    const response = await api.post('/payments/mpesa/initiate', {
      phone_number: phoneNumber,
      amount,
      account_reference: accountReference,
    });
    return response.data;
  },

  // Check M-Pesa payment status
  checkMpesaStatus: async (checkoutRequestId) => {
    const response = await api.get(`/payments/mpesa/status/${checkoutRequestId}`);
    return response.data;
  },

  // Initialize Stripe payment
  initiateStripe: async (amount, currency, description) => {
    const response = await api.post('/payments/stripe/initiate', {
      amount,
      currency,
      description,
    });
    return response.data;
  },

  // Confirm Stripe payment
  confirmStripePayment: async (paymentIntentId) => {
    const response = await api.post('/payments/stripe/confirm', {
      payment_intent_id: paymentIntentId,
    });
    return response.data;
  },

  // Get payment history
  getPaymentHistory: async (userId) => {
    const response = await api.get(`/payments/history/${userId}`);
    return response.data;
  },

  // Initiate farmer payout
  initiatePayout: async (farmerId, amount, method = 'mpesa') => {
    const response = await api.post('/payments/payout/initiate', {
      farmer_id: farmerId,
      amount,
      method,
    });
    return response.data;
  },

  // Get payout status
  getPayoutStatus: async (payoutId) => {
    const response = await api.get(`/payments/payout/status/${payoutId}`);
    return response.data;
  },
};

// =============================================================================
// LOCATION & WEATHER API
// =============================================================================

export const locationAPI = {
  // Update farmer location
  updateLocation: async (userId, locationData) => {
    const response = await api.post('/location/update', locationData, {
      params: { user_id: userId }
    });
    return response.data;
  },

  // Get 6-month weather forecast
  getWeatherForecast: async (userId) => {
    const response = await api.get(`/location/weather-forecast/${userId}`);
    return response.data;
  },

  // Get crop recommendations
  getCropRecommendations: async (userId, soilType = null) => {
    const response = await api.get(`/location/crop-recommendations/${userId}`, {
      params: soilType ? { soil_type: soilType } : {}
    });
    return response.data;
  },

  // Get current weather
  getCurrentWeather: async (userId) => {
    const response = await api.get(`/location/current-weather/${userId}`);
    return response.data;
  },

  // Get location history
  getLocationHistory: async (userId, limit = 50) => {
    const response = await api.get(`/location/location-history/${userId}`, {
      params: { limit }
    });
    return response.data;
  },

  // Reverse geocode
  reverseGeocode: async (latitude, longitude) => {
    const response = await api.post('/location/reverse-geocode', null, {
      params: { latitude, longitude }
    });
    return response.data;
  },

  // Find nearby farmers
  getNearbyFarmers: async (userId, radiusKm = 10) => {
    const response = await api.get(`/location/nearby-farmers/${userId}`, {
      params: { radius_km: radiusKm }
    });
    return response.data;
  },
};

