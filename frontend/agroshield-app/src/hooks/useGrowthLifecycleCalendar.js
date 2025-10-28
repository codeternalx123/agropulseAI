/**
 * useGrowthLifecycleCalendar Hook
 * React hook for managing growth lifecycle calendar state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import * as growthCalendarService from '../services/growthLifecycleCalendar';

export const useGrowthLifecycleCalendar = (plotId) => {
  const [calendar, setCalendar] = useState(null);
  const [currentStage, setCurrentStage] = useState(null);
  const [upcomingPractices, setUpcomingPractices] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [resourcePlan, setResourcePlan] = useState(null);
  const [riskCalendar, setRiskCalendar] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load full calendar
  const loadCalendar = useCallback(async () => {
    if (!plotId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await growthCalendarService.generateLifecycleCalendar(plotId);
      
      if (response.success) {
        setCalendar(response.calendar);
      }
    } catch (err) {
      console.error('Error loading calendar:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [plotId]);

  // Load current stage
  const loadCurrentStage = useCallback(async () => {
    if (!plotId) return;
    
    try {
      const response = await growthCalendarService.getCurrentGrowthStage(plotId);
      
      if (response.success) {
        setCurrentStage(response.current_stage);
      }
    } catch (err) {
      console.error('Error loading current stage:', err);
    }
  }, [plotId]);

  // Load upcoming practices
  const loadUpcomingPractices = useCallback(async (daysAhead = 7) => {
    if (!plotId) return;
    
    try {
      const response = await growthCalendarService.getUpcomingPractices(plotId, daysAhead);
      
      if (response.success) {
        setUpcomingPractices(response.upcoming_practices);
      }
    } catch (err) {
      console.error('Error loading upcoming practices:', err);
    }
  }, [plotId]);

  // Load milestones
  const loadMilestones = useCallback(async () => {
    if (!plotId) return;
    
    try {
      const response = await growthCalendarService.getGrowthMilestones(plotId);
      
      if (response.success) {
        setMilestones(response.milestones);
      }
    } catch (err) {
      console.error('Error loading milestones:', err);
    }
  }, [plotId]);

  // Load resource plan
  const loadResourcePlan = useCallback(async () => {
    if (!plotId) return;
    
    try {
      const response = await growthCalendarService.getResourcePlan(plotId);
      
      if (response.success) {
        setResourcePlan(response.resource_plan);
      }
    } catch (err) {
      console.error('Error loading resource plan:', err);
    }
  }, [plotId]);

  // Load risk calendar
  const loadRiskCalendar = useCallback(async () => {
    if (!plotId) return;
    
    try {
      const response = await growthCalendarService.getRiskCalendar(plotId);
      
      if (response.success) {
        setRiskCalendar(response.risk_calendar);
      }
    } catch (err) {
      console.error('Error loading risk calendar:', err);
    }
  }, [plotId]);

  // Load AI status
  const loadAIStatus = useCallback(async () => {
    try {
      const response = await growthCalendarService.getCalendarAIStatus();
      
      if (response.success) {
        setAiStatus(response);
      }
    } catch (err) {
      console.error('Error loading AI status:', err);
    }
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (!plotId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadCalendar(),
        loadCurrentStage(),
        loadUpcomingPractices(7),
        loadMilestones(),
        loadResourcePlan(),
        loadRiskCalendar(),
        loadAIStatus()
      ]);
    } catch (err) {
      console.error('Error loading all data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    plotId,
    loadCalendar,
    loadCurrentStage,
    loadUpcomingPractices,
    loadMilestones,
    loadResourcePlan,
    loadRiskCalendar,
    loadAIStatus
  ]);

  // Auto-load on mount
  useEffect(() => {
    if (plotId) {
      loadAllData();
    }
  }, [plotId]);

  return {
    // State
    calendar,
    currentStage,
    upcomingPractices,
    milestones,
    resourcePlan,
    riskCalendar,
    aiStatus,
    loading,
    error,
    
    // Actions
    loadCalendar,
    loadCurrentStage,
    loadUpcomingPractices,
    loadMilestones,
    loadResourcePlan,
    loadRiskCalendar,
    loadAIStatus,
    loadAllData,
    
    // Helpers
    isAIEnabled: calendar?.ai_enabled || false,
    hasData: !!calendar
  };
};

export default useGrowthLifecycleCalendar;
