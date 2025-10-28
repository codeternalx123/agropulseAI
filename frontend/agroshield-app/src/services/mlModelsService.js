/**
 * ML Models Service
 * Connects frontend to trained AI models and provides model status
 */

import { API_BASE_URL } from './config';

class MLModelsService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/models`;
  }

  /**
   * Get status of all AI models
   */
  async getModelsStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch models status');
      }
      
      return {
        models: data.models,
        trainingData: data.training_data,
        summary: data.summary,
        paths: data.paths
      };
    } catch (error) {
      console.error('Error fetching models status:', error);
      throw error;
    }
  }

  /**
   * List all available models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/list`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to list models');
      }
      
      return data.models;
    } catch (error) {
      console.error('Error listing models:', error);
      throw error;
    }
  }

  /**
   * Get detailed info about a specific model
   */
  async getModelInfo(modelName) {
    try {
      const response = await fetch(`${this.baseUrl}/${modelName}/info`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Failed to get info for model: ${modelName}`);
      }
      
      return {
        name: data.model_name,
        available: data.available,
        loaded: data.loaded,
        type: data.type,
        description: data.description,
        inputShape: data.input_shape,
        classes: data.classes,
        numClasses: data.num_classes
      };
    } catch (error) {
      console.error(`Error getting model info for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Load a model into memory
   */
  async loadModel(modelName) {
    try {
      const response = await fetch(`${this.baseUrl}/${modelName}/load`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Failed to load model: ${modelName}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Error loading model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Check if models system is healthy
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      return {
        healthy: data.status === 'healthy',
        status: data.status,
        modelsAvailable: data.models_available,
        systemReady: data.system_ready,
        message: data.message
      };
    } catch (error) {
      console.error('Error checking models health:', error);
      return {
        healthy: false,
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Get training data status
   */
  async getTrainingDataStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/training-data/status`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to get training data status');
      }
      
      return {
        syntheticData: data.synthetic_data,
        publicData: data.public_data,
        totalDatasets: data.total_datasets
      };
    } catch (error) {
      console.error('Error getting training data status:', error);
      throw error;
    }
  }

  /**
   * Get model availability for specific features
   */
  async getFeatureAvailability() {
    try {
      const models = await this.listModels();
      
      return {
        pestDetection: models.pest_detection?.available || false,
        diseaseDetection: models.disease_detection?.available || false,
        soilDiagnostics: models.soil_diagnostics?.available || false,
        yieldPrediction: models.yield_prediction?.available || false,
        climatePrediction: models.climate_prediction?.available || false,
        storageAssessment: models.storage_assessment?.available || false,
        plantHealth: models.plant_health?.available || false,
        aiCalendar: models.ai_calendar?.available || false
      };
    } catch (error) {
      console.error('Error getting feature availability:', error);
      // Return all false if error
      return {
        pestDetection: false,
        diseaseDetection: false,
        soilDiagnostics: false,
        yieldPrediction: false,
        climatePrediction: false,
        storageAssessment: false,
        plantHealth: false,
        aiCalendar: false
      };
    }
  }
}

export default new MLModelsService();
