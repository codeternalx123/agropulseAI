/**
 * API Configuration
 * Central configuration for all API endpoints and settings
 */

// API Base URL - Configure based on environment
export const getApiBaseUrl = () => {
  // Check environment variable first
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  // Mobile app configuration
  // Development: Local network IP
  // Production: Vercel backend URL (after deployment)
  return __DEV__ 
    ? 'http://192.168.137.1:8000/api'  // Development - Local backend on WiFi
    : 'https://agropulse-ai.vercel.app/api';  // Production - Vercel backend
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 30000, // 30 seconds
  
  // File upload settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Cache settings
  CACHE_ENABLED: true,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// API Endpoints - Organized by feature
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    RESET_PASSWORD: '/auth/reset-password',
    UPDATE_PASSWORD: '/auth/update-password',
    VERIFY_TOKEN: '/auth/verify-token',
  },

  // Farm Management
  FARMS: {
    REGISTER: '/farms/register',
    LIST: (farmerId) => `/farms/farmer/${farmerId}`,
    SOIL_SNAPSHOT: '/farms/soil-snapshot-simple',
    VARIETY_RECOMMENDATION: '/farms/variety-recommendation',
  },

  // Calendar & Practices
  CALENDAR: {
    GENERATE: '/calendar/generate',
    PRACTICES: (fieldId) => `/calendar/practices/${fieldId}`,
    MARK_DONE: (practiceId) => `/calendar/practices/${practiceId}/done`,
    AI_ADJUSTED: (fieldId) => `/calendar/ai-adjusted-practices/${fieldId}`,
    OPTIMIZE_FERTILIZER: '/calendar/optimize-fertilizer-timing',
    REFINE_HARVEST: '/calendar/refine-harvest-window',
  },

  // Pest & Disease Detection
  SCAN: {
    PLANT: '/scan/plant',
    IPM_RECOMMENDATIONS: '/scan/ipm-recommendations',
    HISTORY: (farmerId) => `/scan/history/${farmerId}`,
  },

  // AI Predictions
  PREDICT: {
    PLANT_HEALTH: '/predict/plant-health',
    SOIL_QUALITY: '/predict/soil-quality',
    WEATHER: '/predict/weather',
    BATCH: '/predict/batch',
  },

  // Growth Tracking
  GROWTH: {
    LOG_MILESTONE: '/growth/log-milestone',
    TIMELINE: (fieldId) => `/growth/timeline/${fieldId}`,
    ANALYTICS: (fieldId) => `/growth/analytics/${fieldId}`,
    TRACK_YIELD: '/growth/track-yield',
    YIELD_PREDICTIONS: (fieldId) => `/growth/yield-predictions/${fieldId}`,
    COMPARE_PEERS: (fieldId) => `/growth/compare-peers/${fieldId}`,
    RECOMMENDATIONS: (fieldId) => `/growth/recommendations/${fieldId}`,
  },

  // Climate & Weather
  CLIMATE: {
    LCRS_SCORE: '/climate/lcrs-score',
    WEATHER_FORECAST: '/climate/weather-forecast',
    RECOMMENDATIONS: '/climate/recommendations',
  },

  // Village Groups
  VILLAGE_GROUPS: {
    REGISTER: '/village-groups/register-farmer',
    FEED: (groupId) => `/village-groups/groups/${groupId}/feed`,
    CREATE_POST: (groupId) => `/village-groups/groups/${groupId}/posts`,
    UPVOTE: (postId) => `/village-groups/posts/${postId}/upvote`,
    REPLY: (postId) => `/village-groups/posts/${postId}/replies`,
    POLLS: (groupId) => `/village-groups/groups/${groupId}/polls`,
    VOTE: (pollId) => `/village-groups/polls/${pollId}/vote`,
    SHOWCASE: (groupId) => `/village-groups/groups/${groupId}/showcase`,
  },

  // Partner Portal
  PARTNERS: {
    CAMPAIGNS: '/partners/campaigns',
    REGISTER_CAMPAIGN: (campaignId) => `/partners/campaigns/${campaignId}/register-farmer`,
    EXPERT_HELP: '/partners/expert-help/request',
    EXPERT_REQUESTS: (farmerId) => `/partners/expert-help/farmer/${farmerId}`,
    OUTBREAK: '/partners/outbreak-dashboard/live',
  },

  // BLE Storage
  STORAGE: {
    PAIR: '/storage/pair-sensor',
    READINGS: (sensorId) => `/storage/sensors/${sensorId}/readings`,
    RECOMMENDATIONS: (sensorId) => `/storage/sensors/${sensorId}/recommendations`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: (farmerId) => `/notifications/farmer/${farmerId}`,
    MARK_READ: (notificationId) => `/notifications/${notificationId}/read`,
    REGISTER_TOKEN: '/notifications/register-token',
  },

  // File Upload
  UPLOAD: {
    PHOTO: '/upload/photo',
    PLANT: '/upload/plant',
    LEAF: '/upload/leaf',
    SOIL: '/upload/soil',
    FARM: '/upload/farm',
    BATCH: '/upload/photos/batch',
    DELETE: (category, filename) => `/upload/${category}/${filename}`,
    STATS: '/upload/stats',
  },

  // Subscription & Payments
  SUBSCRIPTION: {
    TIERS: '/subscription/tiers',
    SUBSCRIBE: '/subscription/subscribe',
    PAY_PER_SERVICE: '/subscription/pay-per-service',
    STATUS: (userId) => `/subscription/status/${userId}`,
    TRANSACTIONS: (userId) => `/subscription/transactions/${userId}`,
    RELIABILITY: (userId) => `/subscription/reliability-score/${userId}`,
    CHECK_ACCESS: '/subscription/check-access',
  },

  // Premium Features
  PREMIUM: {
    YIELD_FORECAST: '/premium/yield-forecast',
    WHAT_IF: '/premium/what-if-scenario',
    MARKET_ALERTS: (crop) => `/premium/premium-market-alerts/${crop}`,
    PRIORITY_EXPERT: '/premium/priority-expert-triage',
    SPECTRAL: '/premium/spectral-analysis',
    FERTILIZER_PLAN: '/premium/custom-fertilizer-plan',
    STORAGE_MONITORING: (deviceId) => `/premium/storage-monitoring/${deviceId}`,
    STORAGE_CERT: '/premium/storage-certificate',
    IOT_API_KEY: '/premium/iot-api-key',
  },

  // Farmer Marketplace
  FARMER_MARKETPLACE: {
    LIST_PRODUCE: '/marketplace/farmer/list-produce',
    MY_LISTINGS: (farmerId) => `/marketplace/farmer/listings/${farmerId}`,
    UPDATE_LISTING: (listingId) => `/marketplace/farmer/listings/${listingId}`,
    MARK_SOLD: (listingId) => `/marketplace/farmer/listings/${listingId}/sold`,
    DEMAND_MATCHING: (farmerId) => `/marketplace/farmer/demand-matching/${farmerId}`,
    BEST_MARKETS: '/marketplace/farmer/best-markets',
    LOGISTICS: '/marketplace/farmer/logistics',
    AGGREGATOR_PRICING: '/marketplace/farmer/aggregator-pricing',
    EARNINGS: (farmerId) => `/marketplace/farmer/earnings/${farmerId}`,
    PRICE_ALERTS: (farmerId) => `/marketplace/farmer/price-alerts/${farmerId}`,
    SUBSCRIBE_ALERTS: '/marketplace/farmer/price-alerts/subscribe',
  },

  // Buyer Marketplace
  BUYER_MARKETPLACE: {
    SEARCH: '/marketplace/buyer/search',
    PURCHASE_REQUEST: '/marketplace/buyer/purchase-request',
    MY_REQUESTS: (buyerId) => `/marketplace/buyer/requests/${buyerId}`,
    MATCHED_FARMERS: '/marketplace/buyer/matched-farmers',
    SUPPLY_FORECAST: '/marketplace/buyer/supply-forecast',
    REGIONAL_PRICING: (crop) => `/marketplace/buyer/regional-pricing/${crop}`,
    QUALITY_VERIFICATION: (listingId) => `/marketplace/buyer/quality-verification/${listingId}`,
    REQUEST_SAMPLE: '/marketplace/buyer/request-sample',
    PLACE_ORDER: '/marketplace/buyer/place-order',
    ORDER_HISTORY: (buyerId) => `/marketplace/buyer/orders/${buyerId}`,
    RATE_TRANSACTION: '/marketplace/buyer/rate-transaction',
  },

  // Regional Trade
  REGIONAL: {
    ANALYSIS: '/regional/analysis',
    OPPORTUNITIES: (farmerId) => `/regional/opportunities/${farmerId}`,
    EXPORT_REQUIREMENTS: '/regional/export-requirements',
    EXCHANGE_RATES: '/regional/exchange-rates',
    CALCULATE_COSTS: '/regional/calculate-costs',
  },

  // Payments
  PAYMENTS: {
    MPESA_INITIATE: '/payments/mpesa/initiate',
    MPESA_STATUS: (checkoutRequestId) => `/payments/mpesa/status/${checkoutRequestId}`,
    STRIPE_INITIATE: '/payments/stripe/initiate',
    STRIPE_CONFIRM: '/payments/stripe/confirm',
    HISTORY: (userId) => `/payments/history/${userId}`,
    PAYOUT_INITIATE: '/payments/payout/initiate',
    PAYOUT_STATUS: (payoutId) => `/payments/payout/status/${payoutId}`,
  },
};

// Error Messages
export const API_ERRORS = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Invalid data provided.',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload an image.',
};

// Success Messages
export const API_SUCCESS = {
  UPLOAD_SUCCESS: 'File uploaded successfully',
  SAVE_SUCCESS: 'Data saved successfully',
  UPDATE_SUCCESS: 'Updated successfully',
  DELETE_SUCCESS: 'Deleted successfully',
  SYNC_SUCCESS: 'Data synchronized successfully',
};

export default {
  API_CONFIG,
  API_ENDPOINTS,
  API_ERRORS,
  API_SUCCESS,
  getApiBaseUrl,
};
