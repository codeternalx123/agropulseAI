/**
 * Growth Lifecycle Calendar Service
 * AI-powered crop lifecycle calendar integrated with growth tracking
 */

import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const API_BASE = `${API_BASE_URL}/advanced-growth`;

/**
 * Generate lifecycle calendar for a growth tracking plot
 */
export const generateLifecycleCalendar = async (plotId) => {
  try {
    const response = await axios.post(`${API_BASE}/growth/${plotId}/lifecycle-calendar`);
    return response.data;
  } catch (error) {
    console.error('Error generating lifecycle calendar:', error);
    throw error;
  }
};

/**
 * Get current growth stage for a plot
 */
export const getCurrentGrowthStage = async (plotId) => {
  try {
    const response = await axios.get(`${API_BASE}/growth/${plotId}/current-stage`);
    return response.data;
  } catch (error) {
    console.error('Error getting current stage:', error);
    throw error;
  }
};

/**
 * Get upcoming practices for next N days
 */
export const getUpcomingPractices = async (plotId, daysAhead = 7) => {
  try {
    const response = await axios.get(`${API_BASE}/growth/${plotId}/upcoming-practices`, {
      params: { days_ahead: daysAhead }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting upcoming practices:', error);
    throw error;
  }
};

/**
 * Get growth milestones
 */
export const getGrowthMilestones = async (plotId) => {
  try {
    const response = await axios.get(`${API_BASE}/growth/${plotId}/milestones`);
    return response.data;
  } catch (error) {
    console.error('Error getting milestones:', error);
    throw error;
  }
};

/**
 * Get resource plan for the season
 */
export const getResourcePlan = async (plotId) => {
  try {
    const response = await axios.get(`${API_BASE}/growth/${plotId}/resource-plan`);
    return response.data;
  } catch (error) {
    console.error('Error getting resource plan:', error);
    throw error;
  }
};

/**
 * Get risk calendar
 */
export const getRiskCalendar = async (plotId) => {
  try {
    const response = await axios.get(`${API_BASE}/growth/${plotId}/risk-calendar`);
    return response.data;
  } catch (error) {
    console.error('Error getting risk calendar:', error);
    throw error;
  }
};

/**
 * Get calendar AI features status
 */
export const getCalendarAIStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE}/growth/calendar/ai-status`);
    return response.data;
  } catch (error) {
    console.error('Error getting AI status:', error);
    throw error;
  }
};

export default {
  generateLifecycleCalendar,
  getCurrentGrowthStage,
  getUpcomingPractices,
  getGrowthMilestones,
  getResourcePlan,
  getRiskCalendar,
  getCalendarAIStatus
};
