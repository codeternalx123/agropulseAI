/**
 * AI Prediction Service
 * Handles disease prediction, integrated intelligence, and action recommendations
 */

import { api } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';

class AIPredictionService {
  /**
   * Predict disease risk for a farm
   */
  async predictDiseaseRisk(environmentData) {
    try {
      const response = await api.post(API_ENDPOINTS.AI.DISEASE_RISK, environmentData);
      return response.data;
    } catch (error) {
      console.error('Error predicting disease risk:', error);
      throw error;
    }
  }

  /**
   * Get disease prediction history for a farm
   */
  async getDiseaseHistory(farmId) {
    try {
      const response = await api.get(API_ENDPOINTS.AI.DISEASE_HISTORY(farmId));
      return response.data;
    } catch (error) {
      console.error('Error fetching disease history:', error);
      throw error;
    }
  }

  /**
   * Generate integrated farm intelligence report
   */
  async generateIntegratedIntelligence(environmentData, financialData) {
    try {
      const response = await api.post(API_ENDPOINTS.AI.INTEGRATED_INTELLIGENCE, {
        environment_data: environmentData,
        financial_data: financialData,
      });
      return response.data;
    } catch (error) {
      console.error('Error generating intelligence report:', error);
      throw error;
    }
  }

  /**
   * Get latest intelligence report for a farm
   */
  async getIntelligenceReport(farmId) {
    try {
      const response = await api.get(API_ENDPOINTS.AI.INTELLIGENCE_REPORT(farmId));
      return response.data;
    } catch (error) {
      console.error('Error fetching intelligence report:', error);
      throw error;
    }
  }

  /**
   * Get action recommendations for a farm
   */
  async getActionRecommendations(farmId) {
    try {
      const response = await api.get(API_ENDPOINTS.AI.ACTIONS(farmId));
      return response.data;
    } catch (error) {
      console.error('Error fetching actions:', error);
      throw error;
    }
  }

  // Helper functions
  formatRiskLevel(riskScore) {
    if (riskScore >= 75) return { level: 'CRITICAL', color: '#D32F2F', icon: 'alert-circle' };
    if (riskScore >= 50) return { level: 'HIGH', color: '#F57C00', icon: 'alert' };
    if (riskScore >= 30) return { level: 'MODERATE', color: '#FFA726', icon: 'alert-outline' };
    return { level: 'LOW', color: '#4CAF50', icon: 'check-circle' };
  }

  formatPriority(priority) {
    const priorities = {
      immediate: { label: 'IMMEDIATE', color: '#D32F2F', hours: 24 },
      urgent: { label: 'URGENT', color: '#F57C00', hours: 72 },
      scheduled: { label: 'SCHEDULED', color: '#2196F3', hours: 168 },
      monitoring: { label: 'MONITORING', color: '#4CAF50', hours: null },
    };
    return priorities[priority] || priorities.monitoring;
  }

  calculateROI(potentialLoss, treatmentCost) {
    if (treatmentCost === 0) return 0;
    return ((potentialLoss - treatmentCost) / treatmentCost * 100).toFixed(0);
  }
}

export default new AIPredictionService();
