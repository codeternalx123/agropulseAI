/**
 * Enhanced AI Calendar Screen
 * Displays crop lifecycle calendar with AI-powered features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

export default function EnhancedAICalendarScreen({ route, navigation }) {
  const { plotId, crop, variety, plantingDate } = route.params || {};
  
  const [calendar, setCalendar] = useState(null);
  const [aiFeatures, setAiFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('timeline'); // timeline, practices, resources, risks
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load calendar
      const calendarResponse = await axios.post(
        `${API_BASE_URL}/ai-calendar/lifecycle/generate`,
        {
          crop: crop || 'maize',
          variety: variety || 'h614',
          planting_date: plantingDate || new Date().toISOString(),
          plot_id: plotId || 'demo_plot'
        }
      );
      
      // Load AI features status
      const featuresResponse = await axios.get(
        `${API_BASE_URL}/ai-calendar/features/ai-status`
      );
      
      setCalendar(calendarResponse.data.calendar);
      setAiFeatures(featuresResponse.data);
    } catch (error) {
      console.error('Error loading calendar:', error);
      Alert.alert('Error', 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };
  
  const getCurrentStage = () => {
    if (!calendar) return null;
    
    const now = new Date();
    const planting = new Date(calendar.planting_date);
    const daysSincePlanting = Math.floor((now - planting) / (1000 * 60 * 60 * 24));
    
    for (const stage of calendar.stages) {
      if (daysSincePlanting >= stage.dap_start && daysSincePlanting <= stage.dap_end) {
        return {
          ...stage,
          days_since_planting: daysSincePlanting,
          progress: ((daysSincePlanting - stage.dap_start) / (stage.dap_end - stage.dap_start)) * 100
        };
      }
    }
    
    return null;
  };
  
  const getUpcomingPractices = () => {
    if (!calendar) return [];
    
    const now = new Date();
    return calendar.practices
      .filter(p => new Date(p.scheduled_date) >= now)
      .slice(0, 5)
      .map(p => ({
        ...p,
        days_until: Math.ceil((new Date(p.scheduled_date) - now) / (1000 * 60 * 60 * 24))
      }));
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading AI Calendar...</Text>
      </View>
    );
  }
  
  const currentStage = getCurrentStage();
  const upcomingPractices = getUpcomingPractices();
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {calendar?.crop} ({calendar?.variety})
        </Text>
        <Text style={styles.headerSubtitle}>
          {calendar?.maturity_days} days to harvest
        </Text>
        {calendar?.ai_enabled && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>✨ AI-Powered</Text>
          </View>
        )}
      </View>
      
      {/* AI Features Status */}
      {aiFeatures && (
        <View style={styles.aiStatus}>
          <Text style={styles.aiStatusTitle}>
            AI Features: {aiFeatures.summary.percentage_ready.toFixed(0)}% Ready
          </Text>
          <View style={styles.featuresRow}>
            {aiFeatures.features.pest_detection && <FeatureBadge icon="🐛" label="Pest Detection" />}
            {aiFeatures.features.disease_detection && <FeatureBadge icon="🦠" label="Disease Detection" />}
            {aiFeatures.features.plant_health_monitoring && <FeatureBadge icon="🌿" label="Health Monitor" />}
            {aiFeatures.features.yield_prediction && <FeatureBadge icon="📊" label="Yield Forecast" />}
          </View>
        </View>
      )}
      
      {/* Current Stage */}
      {currentStage && (
        <View style={styles.currentStage}>
          <Text style={styles.stageTitle}>{currentStage.name}</Text>
          <Text style={styles.stageDays}>
            Day {currentStage.days_since_planting} of {currentStage.dap_end}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${currentStage.progress}%` }]} />
          </View>
        </View>
      )}
      
      {/* Tabs */}
      <View style={styles.tabs}>
        <Tab label="Timeline" active={selectedTab === 'timeline'} onPress={() => setSelectedTab('timeline')} />
        <Tab label="Practices" active={selectedTab === 'practices'} onPress={() => setSelectedTab('practices')} />
        <Tab label="Resources" active={selectedTab === 'resources'} onPress={() => setSelectedTab('resources')} />
        <Tab label="Risks" active={selectedTab === 'risks'} onPress={() => setSelectedTab('risks')} />
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content}>
        {selectedTab === 'timeline' && (
          <TimelineView stages={calendar?.stages} milestones={calendar?.milestones} />
        )}
        
        {selectedTab === 'practices' && (
          <PracticesView practices={upcomingPractices} allPractices={calendar?.practices} />
        )}
        
        {selectedTab === 'resources' && (
          <ResourcesView resources={calendar?.resource_plan} />
        )}
        
        {selectedTab === 'risks' && (
          <RisksView risks={calendar?.risk_calendar} />
        )}
      </ScrollView>
    </View>
  );
}

function Tab({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FeatureBadge({ icon, label }) {
  return (
    <View style={styles.featureBadge}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

function TimelineView({ stages, milestones }) {
  return (
    <View style={styles.timelineContainer}>
      <Text style={styles.sectionTitle}>Growth Stages</Text>
      {stages?.map((stage, index) => (
        <View key={index} style={styles.stageCard}>
          <View style={styles.stageHeader}>
            <Text style={styles.stageCardTitle}>{stage.name}</Text>
            <Text style={styles.stageDuration}>{stage.duration_days} days</Text>
          </View>
          <Text style={styles.stageDates}>
            DAP {stage.dap_start}-{stage.dap_end}
          </Text>
          
          {stage.practices && stage.practices.length > 0 && (
            <View style={styles.stagePractices}>
              <Text style={styles.practicesLabel}>Key Practices:</Text>
              {stage.practices.slice(0, 3).map((practice, idx) => (
                <Text key={idx} style={styles.practiceItem}>
                  • {practice.description}
                </Text>
              ))}
            </View>
          )}
          
          {stage.monitoring && (
            <View style={styles.stageMonitoring}>
              <Text style={styles.monitoringLabel}>Monitor:</Text>
              <Text style={styles.monitoringParams}>
                {stage.monitoring.parameters.join(', ')}
              </Text>
            </View>
          )}
        </View>
      ))}
      
      <Text style={[styles.sectionTitle, styles.milestonesTitle]}>Milestones</Text>
      {milestones?.map((milestone, index) => (
        <View key={index} style={styles.milestoneCard}>
          <Text style={styles.milestoneIcon}>{milestone.icon}</Text>
          <View style={styles.milestoneInfo}>
            <Text style={styles.milestoneName}>{milestone.name}</Text>
            <Text style={styles.milestoneDate}>
              {new Date(milestone.date).toLocaleDateString()} (DAP {milestone.dap})
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function PracticesView({ practices, allPractices }) {
  return (
    <View style={styles.practicesContainer}>
      <Text style={styles.sectionTitle}>Upcoming Practices</Text>
      {practices?.map((practice, index) => (
        <View key={index} style={styles.practiceCard}>
          <View style={styles.practiceHeader}>
            <Text style={styles.practiceName}>{practice.practice.replace(/_/g, ' ').toUpperCase()}</Text>
            {practice.ai_optimized && <Text style={styles.aiTag}>✨ AI</Text>}
          </View>
          <Text style={styles.practiceDescription}>{practice.description}</Text>
          <View style={styles.practiceDetails}>
            <Text style={styles.practiceDate}>
              📅 {new Date(practice.scheduled_date).toLocaleDateString()}
            </Text>
            <Text style={styles.practiceDays}>
              {practice.days_until} days
            </Text>
          </View>
          <View style={styles.practiceMetrics}>
            <Text style={styles.metricItem}>⏱️ {practice.estimated_hours}h</Text>
            <Text style={styles.metricItem}>💰 ${practice.estimated_cost}</Text>
            <Text style={[styles.metricItem, styles.priority, styles[`priority${practice.priority}`]]}>
              {practice.priority.toUpperCase()}
            </Text>
          </View>
        </View>
      ))}
      
      <TouchableOpacity style={styles.viewAllButton}>
        <Text style={styles.viewAllText}>View All {allPractices?.length} Practices</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResourcesView({ resources }) {
  return (
    <View style={styles.resourcesContainer}>
      <Text style={styles.sectionTitle}>Resource Requirements</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Season Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Labor:</Text>
          <Text style={styles.summaryValue}>{resources?.total_labor_hours} hours</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Estimated Cost:</Text>
          <Text style={styles.summaryValue}>${resources?.total_estimated_cost}</Text>
        </View>
      </View>
      
      <Text style={styles.subsectionTitle}>Inputs Needed</Text>
      <View style={styles.inputsList}>
        {resources?.inputs_needed?.map((input, index) => (
          <View key={index} style={styles.inputItem}>
            <Text style={styles.inputIcon}>📦</Text>
            <Text style={styles.inputName}>{input.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
        ))}
      </View>
      
      <Text style={styles.subsectionTitle}>Equipment Required</Text>
      <View style={styles.equipmentList}>
        {resources?.equipment_needed?.map((equipment, index) => (
          <View key={index} style={styles.equipmentItem}>
            <Text style={styles.equipmentIcon}>🔧</Text>
            <Text style={styles.equipmentName}>{equipment.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RisksView({ risks }) {
  return (
    <View style={styles.risksContainer}>
      <Text style={styles.sectionTitle}>Risk Calendar</Text>
      {risks?.map((risk, index) => (
        <View key={index} style={styles.riskCard}>
          <Text style={styles.riskStage}>{risk.stage_name}</Text>
          <Text style={styles.riskPeriod}>
            Starting {new Date(risk.risk_period_start).toLocaleDateString()}
          </Text>
          
          <View style={styles.risksList}>
            {risk.risks.map((r, idx) => (
              <View key={idx} style={styles.riskItem}>
                <Text style={styles.riskIcon}>⚠️</Text>
                <Text style={styles.riskName}>{r.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.riskMonitoring}>
            <Text style={styles.monitoringFreq}>Monitor: {risk.monitoring_frequency}</Text>
            {risk.ai_detection_available && (
              <Text style={styles.aiDetection}>✨ AI Detection Available</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  aiBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  aiStatus: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  aiStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featureIcon: {
    fontSize: 14,
  },
  featureLabel: {
    fontSize: 11,
    color: '#616161',
  },
  currentStage: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
  },
  stageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  stageDays: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
  },
  tabTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  // Timeline styles
  timelineContainer: {
    backgroundColor: '#F5F5F5',
  },
  stageCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  stageDuration: {
    fontSize: 12,
    color: '#757575',
  },
  stageDates: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  stagePractices: {
    marginTop: 12,
  },
  practicesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 4,
  },
  practiceItem: {
    fontSize: 12,
    color: '#616161',
    marginLeft: 8,
  },
  stageMonitoring: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  monitoringLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#424242',
  },
  monitoringParams: {
    fontSize: 11,
    color: '#616161',
    marginTop: 2,
  },
  milestonesTitle: {
    marginTop: 16,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  milestoneIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  milestoneDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  // Practices styles
  practicesContainer: {
    padding: 16,
  },
  practiceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  practiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  practiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  aiTag: {
    fontSize: 10,
    color: '#4CAF50',
  },
  practiceDescription: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 8,
  },
  practiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  practiceDate: {
    fontSize: 12,
    color: '#757575',
  },
  practiceDays: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  practiceMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    fontSize: 12,
    color: '#616161',
  },
  priority: {
    fontWeight: '600',
  },
  priorityhigh: {
    color: '#D32F2F',
  },
  prioritymedium: {
    color: '#F57C00',
  },
  prioritylow: {
    color: '#616161',
  },
  viewAllButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Resources styles
  resourcesContainer: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#616161',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  inputsList: {
    marginBottom: 16,
  },
  inputItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  inputName: {
    fontSize: 13,
    color: '#212121',
  },
  equipmentList: {},
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  equipmentIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  equipmentName: {
    fontSize: 13,
    color: '#212121',
  },
  // Risks styles
  risksContainer: {
    padding: 16,
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  riskStage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  riskPeriod: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    marginBottom: 12,
  },
  risksList: {
    marginBottom: 12,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  riskName: {
    fontSize: 13,
    color: '#212121',
  },
  riskMonitoring: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  monitoringFreq: {
    fontSize: 12,
    color: '#616161',
  },
  aiDetection: {
    fontSize: 11,
    color: '#4CAF50',
  },
});
