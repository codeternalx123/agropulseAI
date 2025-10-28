/**
 * Growth Tracking AI Hooks
 * React hooks for accessing AI features in growth tracking
 */

import { useState, useEffect } from 'react';
import growthTrackingAI from '../services/growthTrackingAI';

/**
 * Hook to get AI models status for growth tracking
 */
export const useGrowthAIStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await growthTrackingAI.getModelsStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message);
      // Set safe defaults on error
      setStatus({
        available: false,
        features: {},
        summary: { total_features: 0, available_features: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    loading,
    error,
    refresh: loadStatus
  };
};

/**
 * Hook to check if specific feature is available
 */
export const useFeatureAvailable = (featureName) => {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAvailability();
  }, [featureName]);

  const checkAvailability = async () => {
    try {
      setLoading(true);
      const isAvailable = await growthTrackingAI.isFeatureAvailable(featureName);
      setAvailable(isAvailable);
    } catch (error) {
      console.error(`Error checking ${featureName}:`, error);
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    available,
    loading,
    refresh: checkAvailability
  };
};

/**
 * Hook to get feature info and capabilities
 */
export const useFeatureInfo = (featureName) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (featureName) {
      loadInfo();
    }
  }, [featureName]);

  const loadInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await growthTrackingAI.getFeatureInfo(featureName);
      setInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadModel = async () => {
    try {
      await growthTrackingAI.loadFeatureModel(featureName);
      await loadInfo(); // Refresh info after loading
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    info,
    loading,
    error,
    loadModel
  };
};

/**
 * Hook to get all available features
 */
export const useAvailableFeatures = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [percentageReady, setPercentageReady] = useState(0);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const data = await growthTrackingAI.getAvailableFeatures();
      setFeatures(data.features);
      setPercentageReady(data.percentageReady);
    } catch (error) {
      console.error('Error loading available features:', error);
      setFeatures([]);
      setPercentageReady(0);
    } finally {
      setLoading(false);
    }
  };

  return {
    features,
    loading,
    percentageReady,
    refresh: loadFeatures
  };
};

/**
 * Hook to manage feature flags for UI
 */
export const useGrowthFeatureFlags = () => {
  const { status, loading } = useGrowthAIStatus();

  const flags = {
    canAnalyzeSoil: status?.features?.soil_analysis || false,
    canCheckHealth: status?.features?.plant_health || false,
    canDetectPests: status?.features?.pest_detection || false,
    canDetectDiseases: status?.features?.disease_detection || false,
    canPredictYield: status?.features?.yield_prediction || false,
    canPredictGrowth: status?.features?.growth_prediction || false,
    canAssessStorage: status?.features?.storage_assessment || false,
    aiEnabled: status?.available || false
  };

  return {
    flags,
    loading,
    summary: status?.summary
  };
};
