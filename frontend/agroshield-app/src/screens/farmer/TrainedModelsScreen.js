import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_BASE_URL = 'https://urchin-app-86rjy.ondigitalocean.app/api/ml';

const TrainedModelsScreen = ({ navigation }) => {
  const [modelsSummary, setModelsSummary] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchModelsSummary(), fetchTrainingHistory()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelsSummary = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/models/summary`);
      setModelsSummary(response.data);
    } catch (error) {
      console.error('Error fetching models summary:', error);
    }
  };

  const fetchTrainingHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/training/history`);
      setTrainingHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching training history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 0.9) return '#4CAF50';
    if (accuracy >= 0.8) return '#8BC34A';
    if (accuracy >= 0.7) return '#FFC107';
    return '#FF5722';
  };

  const getAccuracyGrade = (accuracy) => {
    if (accuracy >= 0.95) return 'Excellent';
    if (accuracy >= 0.9) return 'Very Good';
    if (accuracy >= 0.85) return 'Good';
    if (accuracy >= 0.8) return 'Fair';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading trained models...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="analytics" size={40} color="#4CAF50" />
          <Text style={styles.headerTitle}>Trained Models</Text>
          <Text style={styles.headerSubtitle}>
            {modelsSummary?.total_models || 0} models available
          </Text>
        </View>
      </View>

      {/* Models Summary */}
      {modelsSummary?.summary && Object.keys(modelsSummary.summary).length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Performance</Text>

          {Object.entries(modelsSummary.summary).map(([modelType, data]) => (
            <TouchableOpacity
              key={modelType}
              style={styles.modelCard}
              onPress={() => setSelectedModel(selectedModel === modelType ? null : modelType)}
            >
              <View style={styles.modelCardHeader}>
                <View style={styles.modelIcon}>
                  <Ionicons name="cube" size={24} color="#4CAF50" />
                </View>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelType}>
                    {modelType.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.modelSubtitle}>
                    {data.training_runs} training run(s)
                  </Text>
                </View>
                <Ionicons
                  name={selectedModel === modelType ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#666"
                />
              </View>

              {/* Performance Metrics */}
              <View style={styles.metricsContainer}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Accuracy</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: getAccuracyColor(data.performance.accuracy) },
                    ]}
                  >
                    {(data.performance.accuracy * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.metricGrade}>
                    {getAccuracyGrade(data.performance.accuracy)}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Samples</Text>
                  <Text style={styles.metricValue}>{data.performance.training_samples}</Text>
                  <Text style={styles.metricGrade}>Training Data</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Size</Text>
                  <Text style={styles.metricValue}>
                    {data.model_file.size_mb.toFixed(1)} MB
                  </Text>
                  <Text style={styles.metricGrade}>Model File</Text>
                </View>
              </View>

              {/* Expanded Details */}
              {selectedModel === modelType && (
                <View style={styles.expandedDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#666" />
                    <Text style={styles.detailLabel}>Last Trained:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(data.performance.trained_at)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="document" size={16} color="#666" />
                    <Text style={styles.detailLabel}>Model Path:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {data.model_file.path.split('/').pop()}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.detailLabel}>Last Modified:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(data.model_file.modified)}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={80} color="#CCC" />
          <Text style={styles.emptyStateTitle}>No Trained Models Yet</Text>
          <Text style={styles.emptyStateText}>
            Train your first AI model to see performance metrics here
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('ModelTraining')}
          >
            <Text style={styles.emptyStateButtonText}>Start Training</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Training History */}
      {trainingHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training History</Text>

          {trainingHistory.slice(0, 10).map((run, index) => (
            <View key={index} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.historyIcon}>
                  <Ionicons name="time" size={20} color="#2196F3" />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyModel}>
                    {run.model_type.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.historyDate}>{formatDate(run.timestamp)}</Text>
                </View>
                <View
                  style={[
                    styles.historyBadge,
                    run.results.final_val_accuracy >= 0.9
                      ? styles.historyBadgeSuccess
                      : styles.historyBadgeWarning,
                  ]}
                >
                  <Text style={styles.historyBadgeText}>
                    {run.results.final_val_accuracy
                      ? `${(run.results.final_val_accuracy * 100).toFixed(1)}%`
                      : `R²: ${run.results.test_r2?.toFixed(3)}`}
                  </Text>
                </View>
              </View>

              <View style={styles.historyDetails}>
                {run.results.epochs && (
                  <Text style={styles.historyDetail}>• {run.results.epochs} epochs</Text>
                )}
                {run.results.training_samples && (
                  <Text style={styles.historyDetail}>
                    • {run.results.training_samples} training samples
                  </Text>
                )}
                {run.results.num_classes && (
                  <Text style={styles.historyDetail}>• {run.results.num_classes} classes</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => navigation.navigate('ModelTraining')}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>Train New Model</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color="#2196F3" />
          <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>Refresh Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginBottom: 10,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modelCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  modelInfo: {
    flex: 1,
  },
  modelType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modelSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  metricGrade: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  expandedDetails: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyModel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  historyBadgeSuccess: {
    backgroundColor: '#E8F5E9',
  },
  historyBadgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  historyDetails: {
    marginTop: 10,
    marginLeft: 52,
  },
  historyDetail: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  actionButtons: {
    padding: 15,
    paddingBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 10,
  },
});

export default TrainedModelsScreen;
