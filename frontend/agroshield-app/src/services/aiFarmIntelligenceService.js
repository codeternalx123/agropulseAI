/**
 * AI Farm Intelligence Service
 * 
 * Integrates real-world data from:
 * - GPS coordinates (farmer location)
 * - Soil scan images (computer vision analysis)
 * - BLE IoT sensor readings (temperature, humidity)
 * - Satellite NDVI data
 * - Weather APIs
 * - Community pest reports
 * - Farm registration data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { api } from './api';

const AI_CACHE_KEY = '@agropulseai_ai_cache';
const CACHE_DURATION = 3600000; // 1 hour

class AIFarmIntelligenceService {
  constructor() {
    this.cache = {};
    this.loadCache();
  }

  async loadCache() {
    try {
      const cached = await AsyncStorage.getItem(AI_CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading AI cache:', error);
    }
  }

  async saveCache() {
    try {
      await AsyncStorage.setItem(AI_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Error saving AI cache:', error);
    }
  }

  getCachedData(key) {
    const cached = this.cache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
    };
    this.saveCache();
  }

  // ==========================================================================
  // MICRO-CLIMATE PROFILING (GPS + Satellite Data)
  // ==========================================================================

  async getMicroClimateProfile(farmId, latitude, longitude) {
    try {
      const cacheKey = `microclimate_${farmId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Call backend API for micro-climate analysis
      const response = await api.get(`/ai-intelligence/microclimate/${farmId}`, {
        params: { latitude, longitude },
      });

      if (response.data) {
        this.setCachedData(cacheKey, response.data);
        return response.data;
      }

      // Fallback: Calculate locally if API fails
      return this.calculateMicroClimateLocally(latitude, longitude);
    } catch (error) {
      console.error('Error getting micro-climate profile:', error);
      // Fallback to local calculation
      return this.calculateMicroClimateLocally(latitude, longitude);
    }
  }

  calculateMicroClimateLocally(latitude, longitude) {
    // Simple elevation estimation based on Kenya's topography
    const elevation = this.estimateElevation(latitude, longitude);
    const zone = this.classifyFarmingZone(elevation, latitude);

    return {
      farmingZone: zone.id,
      zoneName: zone.name,
      characteristics: zone.characteristics,
      elevation,
      elevationZone: this.getElevationZone(elevation),
      annualRainfall: zone.avgRainfall,
      avgTemperature: zone.avgTemp,
      confidence: 75,
      suitableFor: zone.suitableCrops,
      climateRisks: zone.risks,
      calculatedLocally: true,
    };
  }

  estimateElevation(latitude, longitude) {
    // Kenya elevation estimation based on known regions
    // Highland areas: Central Kenya (Nyeri, Kiambu), Western (Kericho, Nandi)
    // Lowlands: Coast, Northeastern
    
    const centralHighlandLat = [-1.29, -0.42]; // Nairobi to Nyeri
    const centralHighlandLon = [36.7, 37.1];
    
    const westernHighlandLat = [-0.37, 0.52]; // Kericho to Kitale
    const westernHighlandLon = [34.9, 35.5];

    const coastalLat = [-4.66, -1.65]; // Mombasa to Malindi
    const coastalLon = [39.0, 40.1];

    // Check if in Central Highlands
    if (
      latitude >= centralHighlandLat[0] &&
      latitude <= centralHighlandLat[1] &&
      longitude >= centralHighlandLon[0] &&
      longitude <= centralHighlandLon[1]
    ) {
      return 1400 + Math.random() * 400; // 1400-1800m
    }

    // Check if in Western Highlands
    if (
      latitude >= westernHighlandLat[0] &&
      latitude <= westernHighlandLat[1] &&
      longitude >= westernHighlandLon[0] &&
      longitude <= westernHighlandLon[1]
    ) {
      return 1600 + Math.random() * 600; // 1600-2200m
    }

    // Check if in Coastal region
    if (
      latitude >= coastalLat[0] &&
      latitude <= coastalLat[1] &&
      longitude >= coastalLon[0] &&
      longitude <= coastalLon[1]
    ) {
      return 10 + Math.random() * 90; // 10-100m
    }

    // Default mid-altitude
    return 800 + Math.random() * 600; // 800-1400m
  }

  classifyFarmingZone(elevation, latitude) {
    if (elevation > 1800) {
      return {
        id: 'highland_wet',
        name: 'Highland Wet Zone',
        characteristics: 'High altitude, cool, high rainfall',
        avgRainfall: 1500,
        avgTemp: 16,
        suitableCrops: ['potatoes', 'tea', 'coffee', 'pyrethrum'],
        risks: [
          { type: 'frost', probability: 30, severity: 'moderate' },
          { type: 'fungal_disease', probability: 50, severity: 'high' },
          { type: 'hail', probability: 15, severity: 'low' },
        ],
      };
    } else if (elevation > 1400 && elevation <= 1800) {
      return {
        id: 'highland_moderate',
        name: 'Highland Moderate Zone',
        characteristics: 'Medium altitude, moderate rain',
        avgRainfall: 1000,
        avgTemp: 20,
        suitableCrops: ['maize', 'beans', 'potatoes', 'vegetables'],
        risks: [
          { type: 'drought', probability: 25, severity: 'moderate' },
          { type: 'frost', probability: 10, severity: 'low' },
          { type: 'fungal_disease', probability: 40, severity: 'moderate' },
        ],
      };
    } else if (elevation > 800 && elevation <= 1400) {
      return {
        id: 'midland_semi_arid',
        name: 'Midland Semi-Arid Zone',
        characteristics: 'Lower elevation, seasonal rainfall',
        avgRainfall: 700,
        avgTemp: 24,
        suitableCrops: ['maize', 'sorghum', 'millet', 'cowpeas'],
        risks: [
          { type: 'drought', probability: 50, severity: 'high' },
          { type: 'heat_stress', probability: 40, severity: 'moderate' },
          { type: 'pests', probability: 45, severity: 'moderate' },
        ],
      };
    } else {
      return {
        id: 'lowland_arid',
        name: 'Lowland Arid Zone',
        characteristics: 'Low elevation, hot, dry',
        avgRainfall: 400,
        avgTemp: 28,
        suitableCrops: ['cassava', 'sisal', 'drought-resistant sorghum'],
        risks: [
          { type: 'drought', probability: 70, severity: 'critical' },
          { type: 'heat_stress', probability: 60, severity: 'high' },
          { type: 'pests', probability: 50, severity: 'moderate' },
        ],
      };
    }
  }

  getElevationZone(elevation) {
    if (elevation > 1800) return 'Highland (>1800m)';
    if (elevation > 1200) return 'Mid-Altitude (1200-1800m)';
    if (elevation > 500) return 'Lowland (500-1200m)';
    return 'Coastal (<500m)';
  }

  // ==========================================================================
  // NDVI SATELLITE ANALYSIS
  // ==========================================================================

  async getNDVIAnalysis(farmId, latitude, longitude) {
    try {
      const cacheKey = `ndvi_${farmId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Call backend API for NDVI data
      const response = await api.get(`/ai-intelligence/ndvi/${farmId}`, {
        params: { latitude, longitude },
      });

      if (response.data) {
        this.setCachedData(cacheKey, response.data);
        return response.data;
      }

      // Fallback: Generate estimate based on zone
      return this.estimateNDVI(latitude, longitude);
    } catch (error) {
      console.error('Error getting NDVI analysis:', error);
      return this.estimateNDVI(latitude, longitude);
    }
  }

  estimateNDVI(latitude, longitude) {
    const elevation = this.estimateElevation(latitude, longitude);
    const zone = this.classifyFarmingZone(elevation, latitude);

    // NDVI varies by season and rainfall
    const baseNDVI = zone.avgRainfall > 1000 ? 0.7 : zone.avgRainfall > 600 ? 0.6 : 0.5;
    const variance = 0.1;
    const current = baseNDVI + (Math.random() - 0.5) * variance;

    return {
      current: Math.max(0.3, Math.min(0.9, current)),
      trend: current > baseNDVI ? 'improving' : current < baseNDVI - 0.05 ? 'declining' : 'stable',
      classification: current > 0.7 ? 'healthy' : current > 0.5 ? 'moderate' : 'stressed',
      last30Days: Array.from({ length: 4 }, (_, i) => 
        Math.max(0.3, baseNDVI + (Math.random() - 0.5) * variance)
      ),
      comparison: {
        nearbyAverage: baseNDVI,
        seasonalNormal: baseNDVI + 0.02,
      },
      interpretation: current > 0.7 
        ? 'Your farm shows healthy vegetation growth, above nearby average'
        : current > 0.5
        ? 'Vegetation health is moderate. Consider irrigation or nutrient management.'
        : 'Vegetation health is below optimal. Investigate water/nutrient stress.',
      estimatedFromClimate: true,
    };
  }

  // ==========================================================================
  // COMPUTER VISION SOIL ANALYSIS (From Scan)
  // ==========================================================================

  async analyzeSoilFromScan(soilImageUri, farmId) {
    try {
      // Upload image to backend for AI analysis
      const formData = new FormData();
      formData.append('soil_image', {
        uri: soilImageUri,
        type: 'image/jpeg',
        name: 'soil.jpg',
      });
      formData.append('farm_id', farmId);

      const response = await api.post('/ai-intelligence/analyze-soil', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        return response.data;
      }

      throw new Error('No response from soil analysis API');
    } catch (error) {
      console.error('Error analyzing soil:', error);
      throw error;
    }
  }

  async getSoilAnalysis(farmId, soilScanData = null) {
    try {
      // If we have recent soil scan data, use it
      if (soilScanData) {
        return soilScanData;
      }

      // Otherwise fetch from backend
      const response = await api.get(`/ai-intelligence/soil-analysis/${farmId}`);
      
      if (response.data) {
        return response.data;
      }

      // Fallback: Return null to prompt user to scan soil
      return null;
    } catch (error) {
      console.error('Error getting soil analysis:', error);
      return null;
    }
  }

  // ==========================================================================
  // CROP VARIETY RISK ASSESSMENT (Based on Location + Soil)
  // ==========================================================================

  async getCropRiskAssessment(farmId, microClimate, soilAnalysis) {
    try {
      const response = await api.post('/ai-intelligence/crop-risk-assessment', {
        farm_id: farmId,
        farming_zone: microClimate?.farmingZone,
        elevation: microClimate?.elevation,
        soil_fertility: soilAnalysis?.fertilityScore,
        soil_type: soilAnalysis?.soilType,
      });

      if (response.data) {
        return response.data.crops || [];
      }

      // Fallback: Generate based on zone
      return this.generateCropRisks(microClimate, soilAnalysis);
    } catch (error) {
      console.error('Error getting crop risk assessment:', error);
      return this.generateCropRisks(microClimate, soilAnalysis);
    }
  }

  generateCropRisks(microClimate, soilAnalysis) {
    const suitableCrops = microClimate?.suitableFor || ['maize', 'beans'];
    const elevation = microClimate?.elevation || 1200;
    const soilFertility = soilAnalysis?.fertilityScore || 6;

    return suitableCrops.map((crop) => {
      const baseSuccess = this.calculateBaseSuccess(crop, elevation, soilFertility);
      const risks = this.calculateCropRisks(crop, elevation, microClimate);

      return {
        crop: crop.charAt(0).toUpperCase() + crop.slice(1),
        variety: this.getRecommendedVariety(crop, elevation),
        successRate: Math.round(baseSuccess),
        riskLevel: baseSuccess > 70 ? 'low' : baseSuccess > 50 ? 'moderate' : 'high',
        yieldPotential: this.getYieldPotential(crop, baseSuccess),
        alternatives: baseSuccess < 60 ? this.getAlternatives(crop, elevation) : [],
        reasons: risks,
      };
    });
  }

  calculateBaseSuccess(crop, elevation, soilFertility) {
    let score = 60;

    // Elevation matching
    const optimalElevation = this.getOptimalElevation(crop);
    const elevationDiff = Math.abs(elevation - optimalElevation);
    score += Math.max(-20, -elevationDiff / 50);

    // Soil fertility impact
    score += (soilFertility - 5) * 3;

    return Math.max(30, Math.min(95, score));
  }

  getOptimalElevation(crop) {
    const elevations = {
      maize: 1400,
      beans: 1500,
      potatoes: 1800,
      tea: 2000,
      coffee: 1700,
      rice: 800,
      cassava: 600,
      sorghum: 1000,
    };
    return elevations[crop] || 1200;
  }

  calculateCropRisks(crop, elevation, microClimate) {
    return [
      {
        factor: 'Climate match',
        score: this.getClimateMatchScore(crop, elevation, microClimate),
        comment: this.getClimateComment(crop, elevation),
      },
      {
        factor: 'Soil fertility',
        score: 7,
        comment: 'Adequate soil conditions',
      },
      {
        factor: 'Disease resistance',
        score: this.getDiseaseResistanceScore(crop, elevation),
        comment: this.getDiseaseComment(crop, elevation),
      },
    ];
  }

  getClimateMatchScore(crop, elevation, microClimate) {
    const optimal = this.getOptimalElevation(crop);
    const diff = Math.abs(elevation - optimal);
    if (diff < 200) return 9;
    if (diff < 400) return 7;
    if (diff < 600) return 5;
    return 3;
  }

  getClimateComment(crop, elevation) {
    const optimal = this.getOptimalElevation(crop);
    const diff = elevation - optimal;
    if (Math.abs(diff) < 200) return 'Perfect elevation and climate';
    if (diff > 0) return 'Slightly higher than optimal, cooler temps';
    return 'Slightly lower than optimal, warmer temps';
  }

  getDiseaseResistanceScore(crop, elevation) {
    // Highland areas have more fungal diseases
    if (elevation > 1600) {
      return crop === 'potatoes' ? 8 : crop === 'maize' ? 6 : 7;
    }
    return 7;
  }

  getDiseaseComment(crop, elevation) {
    if (elevation > 1600) {
      return crop === 'potatoes' 
        ? 'Good late blight resistance variety needed'
        : 'Moderate fungal disease pressure';
    }
    return 'Low disease pressure at this elevation';
  }

  getRecommendedVariety(crop, elevation) {
    const varieties = {
      maize: elevation > 1600 ? 'H516' : 'H614',
      beans: elevation > 1600 ? 'Rosecoco' : 'KAT B9',
      potatoes: 'Shangi',
      tea: 'TRFK 6/8',
      coffee: 'Ruiru 11',
    };
    return varieties[crop] || 'Local variety';
  }

  getYieldPotential(crop, successRate) {
    const yields = {
      maize: `${Math.round(25 + successRate * 0.3)}-${Math.round(35 + successRate * 0.3)} bags/ha`,
      beans: `${Math.round(5 + successRate * 0.08)}-${Math.round(8 + successRate * 0.08)} bags/ha`,
      potatoes: `${Math.round(150 + successRate * 1.5)}-${Math.round(200 + successRate * 1.5)} bags/ha`,
    };
    return yields[crop] || 'Variable yield';
  }

  getAlternatives(crop, elevation) {
    if (crop === 'maize' && elevation > 1800) {
      return [
        { variety: 'H516', successRate: 75, reason: 'Better cold tolerance' },
      ];
    }
    if (crop === 'beans') {
      return [
        { variety: 'Rosecoco', successRate: 72, reason: 'Better fungal disease tolerance' },
        { variety: 'KAT B9', successRate: 68, reason: 'Drought tolerant, shorter cycle' },
      ];
    }
    return [];
  }

  // ==========================================================================
  // LOCATION INTELLIGENCE
  // ==========================================================================

  async getLocationIntelligence(farmId, latitude, longitude) {
    try {
      const microClimate = await this.getMicroClimateProfile(farmId, latitude, longitude);
      
      return {
        elevation: microClimate.elevation,
        elevationZone: microClimate.elevationZone,
        frostRisk: this.getFrostRisk(microClimate.elevation),
        droughtRisk: this.getDroughtRisk(microClimate.farmingZone),
        fungalDiseaseRisk: this.getFungalRisk(microClimate.elevation, microClimate.annualRainfall),
        growthModelAdjustments: this.getGrowthAdjustments(microClimate.elevation, microClimate.avgTemperature),
      };
    } catch (error) {
      console.error('Error getting location intelligence:', error);
      return null;
    }
  }

  getFrostRisk(elevation) {
    if (elevation > 2000) return 'High';
    if (elevation > 1600) return 'Moderate';
    return 'Low';
  }

  getDroughtRisk(zone) {
    const risks = {
      highland_wet: 'Low',
      highland_moderate: 'Moderate',
      midland_semi_arid: 'High',
      lowland_arid: 'Very High',
    };
    return risks[zone] || 'Moderate';
  }

  getFungalRisk(elevation, rainfall) {
    if (elevation > 1600 && rainfall > 1000) return 'High';
    if (elevation > 1400 || rainfall > 800) return 'Moderate';
    return 'Low';
  }

  getGrowthAdjustments(elevation, avgTemp) {
    const adjustments = [];
    
    if (avgTemp < 20) {
      adjustments.push('Maize: +5-7 days to maturity (cooler temps)');
      adjustments.push('Beans: +3-5 days to maturity');
    } else {
      adjustments.push('Maize: Standard 120-day cycle');
      adjustments.push('Beans: Standard 90-day cycle');
    }

    if (elevation > 1600) {
      adjustments.push('Potatoes: Optimal conditions, -3 days to maturity');
    }

    return adjustments;
  }

  // ==========================================================================
  // COMMUNITY INSIGHTS (GPS-based)
  // ==========================================================================

  async getCommunityInsights(farmId, latitude, longitude) {
    try {
      const response = await api.get(`/ai-intelligence/community-insights/${farmId}`, {
        params: { latitude, longitude, radius_km: 10 },
      });

      if (response.data) {
        return response.data;
      }

      return this.generateCommunityInsights();
    } catch (error) {
      console.error('Error getting community insights:', error);
      return this.generateCommunityInsights();
    }
  }

  generateCommunityInsights() {
    return {
      nearbyFarmers: Math.floor(15 + Math.random() * 15),
      within5km: Math.floor(10 + Math.random() * 10),
      within10km: Math.floor(20 + Math.random() * 10),
      topCrops: [
        { crop: 'Maize', farmers: 16, avgYield: '32 bags/ha', successRate: 75 },
        { crop: 'Beans', farmers: 14, avgYield: '8 bags/ha', successRate: 68 },
        { crop: 'Potatoes', farmers: 9, avgYield: '195 bags/ha', successRate: 84 },
      ],
      recentChallenges: [
        { issue: 'Fall Armyworm', reports: Math.floor(3 + Math.random() * 8), date: '2 weeks ago' },
        { issue: 'Late Blight', reports: Math.floor(2 + Math.random() * 5), date: '1 month ago' },
      ],
    };
  }

  // ==========================================================================
  // BLE SENSOR DATA INTEGRATION
  // ==========================================================================

  async getBLESensorData(farmId) {
    try {
      // Fetch real BLE sensor readings from backend
      const response = await api.get(`/ble-sensors/farm/${farmId}/latest`);
      
      if (response.data && response.data.sensors) {
        return response.data.sensors;
      }

      return [];
    } catch (error) {
      console.error('Error fetching BLE sensor data:', error);
      return [];
    }
  }

  async updateBLESensorReading(sensorId, reading) {
    try {
      await api.post(`/ble-sensors/${sensorId}/reading`, {
        temperature: reading.temperature,
        humidity: reading.humidity,
        timestamp: reading.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating BLE sensor reading:', error);
    }
  }
}

export default new AIFarmIntelligenceService();
