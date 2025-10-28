import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const API_BASE = "https://urchin-app-86rjy.ondigitalocean.app/api/advanced-growth";

export default function PlotDetailsScreen({ route, navigation }) {
  const { user } = useAuth();
  const { plotId } = route.params;
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPlotDetails();
  }, [plotId]);

  const loadPlotDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/plots/${plotId}?user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setPlotData(data);
      } else {
        Alert.alert("Error", "Failed to load plot details");
      }
    } catch (error) {
      console.error("Error loading plot details:", error);
      Alert.alert("Error", "Failed to load plot details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading plot details...</Text>
      </View>
    );
  }

  if (!plotData || !plotData.plot) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#999" />
        <Text style={styles.errorText}>Plot not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadPlotDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { plot } = plotData;

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.plotName}>{plot.plot_name}</Text>
            <Text style={styles.cropName}>{plot.crop_variety}</Text>
          </View>
          <View style={styles.healthBadge}>
            <MaterialCommunityIcons
              name="leaf"
              size={20}
              color={plot.health_score >= 80 ? '#4CAF50' : plot.health_score >= 50 ? '#FFA726' : '#EF5350'}
            />
            <Text style={styles.healthScore}>{plot.health_score}%</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="ruler-square" size={20} color="#666" />
            <Text style={styles.statLabel}>Area</Text>
            <Text style={styles.statValue}>{plot.size_acres} acres</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="calendar" size={20} color="#666" />
            <Text style={styles.statLabel}>Planted</Text>
            <Text style={styles.statValue}>{new Date(plot.planting_date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="sprout" size={20} color="#666" />
            <Text style={styles.statLabel}>Stage</Text>
            <Text style={styles.statValue}>{plot.growth_stage}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'health' && styles.activeTab]}
          onPress={() => setActiveTab('health')}
        >
          <Text style={[styles.tabText, activeTab === 'health' && styles.activeTabText]}>
            Health
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pests' && styles.activeTab]}
          onPress={() => setActiveTab('pests')}
        >
          <Text style={[styles.tabText, activeTab === 'pests' && styles.activeTabText]}>
            Pests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <View style={styles.tabContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Plot Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{plot.location || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Soil Type:</Text>
              <Text style={styles.infoValue}>{plot.soil_type || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Irrigation:</Text>
              <Text style={styles.infoValue}>{plot.irrigation_type || 'N/A'}</Text>
            </View>
          </View>

          {plotData.recent_observations && plotData.recent_observations.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Observations</Text>
              {plotData.recent_observations.map((obs, index) => (
                <View key={index} style={styles.observationItem}>
                  <Text style={styles.observationDate}>
                    {new Date(obs.observation_date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.observationText}>{obs.notes}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 'health' && (
        <View style={styles.tabContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Health Metrics</Text>
            <View style={styles.healthMetric}>
              <Text style={styles.metricLabel}>Overall Health</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${plot.health_score}%`,
                      backgroundColor: plot.health_score >= 80 ? '#4CAF50' : plot.health_score >= 50 ? '#FFA726' : '#EF5350'
                    }
                  ]}
                />
              </View>
              <Text style={styles.metricValue}>{plot.health_score}%</Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'pests' && (
        <View style={styles.tabContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pest & Disease Status</Text>
            {plotData.pest_alerts && plotData.pest_alerts.length > 0 ? (
              plotData.pest_alerts.map((alert, index) => (
                <View key={index} style={styles.alertItem}>
                  <MaterialCommunityIcons name="alert" size={24} color="#EF5350" />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alert.pest_name}</Text>
                    <Text style={styles.alertText}>{alert.severity} severity</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No pest alerts</Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  plotName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cropName: {
    fontSize: 16,
    color: '#666',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  healthScore: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  observationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  observationDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  observationText: {
    fontSize: 14,
    color: '#333',
  },
  healthMetric: {
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alertContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 14,
    color: '#666',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
