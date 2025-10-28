/**
 * Growth Tracking AI Service
 * Integrates ML models with growth tracking features
 */

import { API_BASE_URL } from './config';

class GrowthTrackingAIService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/advanced-growth/ai`;
  }

  /**
   * Get status of all AI models for growth tracking
   */
  async getModelsStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/models/status`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch models status');
      }
      
      return {
        available: data.models_available,
        features: data.features,
        summary: data.summary,
        message: data.message
      };
    } catch (error) {
      console.error('[GROWTH AI] Error fetching models status:', error);
      // Return safe defaults
      return {
        available: false,
        features: {
          soil_analysis: false,
          plant_health: false,
          pest_detection: false,
          disease_detection: false,
          yield_prediction: false,
          growth_prediction: false
        },
        summary: {
          total_features: 6,
          available_features: 0,
          percentage_ready: 0
        },
        message: 'Using rule-based analysis'
      };
    }
  }

  /**
   * Get detailed info about a specific AI feature
   */
  async getFeatureInfo(feature) {
    try {
      const response = await fetch(`${this.baseUrl}/models/${feature}/info`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Failed to get info for feature: ${feature}`);
      }
      
      return {
        feature: data.feature,
        modelName: data.model_name,
        available: data.available,
        loaded: data.loaded,
        type: data.type,
        description: data.description,
        capabilities: data.capabilities || []
      };
    } catch (error) {
      console.error(`[GROWTH AI] Error getting feature info for ${feature}:`, error);
      throw error;
    }
  }

  /**
   * Load a specific AI feature model into memory
   */
  async loadFeatureModel(feature) {
    try {
      const response = await fetch(`${this.baseUrl}/models/${feature}/load`, {
        method: 'POST'
      });
      const data = await response.json();
      
      return {
        success: data.success,
        feature: data.feature,
        loaded: data.loaded,
        message: data.message
      };
    } catch (error) {
      console.error(`[GROWTH AI] Error loading feature ${feature}:`, error);
      throw error;
    }
  }

  /**
   * Get list of available AI features
   */
  async getAvailableFeatures() {
    try {
      const response = await fetch(`${this.baseUrl}/features/available`);
      const data = await response.json();
      
      return {
        success: data.success,
        features: data.available_features || [],
        count: data.count || 0,
        percentageReady: data.percentage_ready || 0
      };
    } catch (error) {
      console.error('[GROWTH AI] Error getting available features:', error);
      return {
        success: false,
        features: [],
        count: 0,
        percentageReady: 0
      };
    }
  }

  /**
   * Check if a specific feature is available
   */
  async isFeatureAvailable(feature) {
    try {
      const status = await this.getModelsStatus();
      return status.features[feature] || false;
    } catch (error) {
      console.error(`[GROWTH AI] Error checking feature ${feature}:`, error);
      return false;
    }
  }

  /**
   * Get capabilities description for a feature
   */
  async getFeatureCapabilities(feature) {
    try {
      const info = await this.getFeatureInfo(feature);
      return info.capabilities;
    } catch (error) {
      console.error(`[GROWTH AI] Error getting capabilities for ${feature}:`, error);
      return [];
    }
  }

  /**
   * Get feature-to-UI mapping for display
   */
  getFeatureDisplay(feature) {
    const displayMap = {
      soil_analysis: {
        title: 'Soil Analysis',
        icon: '🌱',
        description: 'AI-powered soil type, texture, and health analysis'
      },
      plant_health: {
        title: 'Plant Health',
        icon: '🌿',
        description: 'Overall health scoring and growth stage detection'
      },
      pest_detection: {
        title: 'Pest Detection',
        icon: '🐛',
        description: 'Identify and assess pest infestations'
      },
      disease_detection: {
        title: 'Disease Detection',
        icon: '🦠',
        description: 'Detect and classify crop diseases early'
      },
      yield_prediction: {
        title: 'Yield Prediction',
        icon: '📊',
        description: 'Forecast harvest dates and expected yields'
      },
      growth_prediction: {
        title: 'Growth Prediction',
        icon: '📅',
        description: 'Smart calendar and growth stage forecasting'
      },
      storage_assessment: {
        title: 'Storage Assessment',
        icon: '📦',
        description: 'Monitor crop quality during storage'
      }
    };

    return displayMap[feature] || {
      title: feature,
      icon: '🤖',
      description: 'AI feature'
    };
  }
}

export default new GrowthTrackingAIService();
