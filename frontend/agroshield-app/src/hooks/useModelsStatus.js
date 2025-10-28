/**
 * Model Status Hook
 * React hook for accessing ML models status in components
 */

import { useState, useEffect } from 'react';
import mlModelsService from '../services/mlModelsService';

export const useModelsStatus = () => {
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
      const data = await mlModelsService.getModelsStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadStatus();
  };

  return {
    status,
    loading,
    error,
    refresh
  };
};

export const useModelInfo = (modelName) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (modelName) {
      loadInfo();
    }
  }, [modelName]);

  const loadInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mlModelsService.getModelInfo(modelName);
      setInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadModel = async () => {
    try {
      setError(null);
      await mlModelsService.loadModel(modelName);
      await loadInfo(); // Refresh info
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

export const useFeatureAvailability = () => {
  const [features, setFeatures] = useState({
    pestDetection: false,
    diseaseDetection: false,
    soilDiagnostics: false,
    yieldPrediction: false,
    climatePrediction: false,
    storageAssessment: false,
    plantHealth: false,
    aiCalendar: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const data = await mlModelsService.getFeatureAvailability();
      setFeatures(data);
    } catch (err) {
      console.error('Error loading feature availability:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    features,
    loading,
    refresh: loadFeatures
  };
};
