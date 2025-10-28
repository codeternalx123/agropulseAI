import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_BASE_URL = 'https://urchin-app-86rjy.ondigitalocean.app/api/ml';

const ModelTrainingScreen = ({ navigation }) => {
  const [datasetsStatus, setDatasetsStatus] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [modelTypes, setModelTypes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // Poll training status every 5 seconds if training is active
    const interval = setInterval(() => {
      if (trainingStatus?.status?.is_training) {
        fetchTrainingStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [trainingStatus?.status?.is_training]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDatasetsStatus(),
        fetchTrainingStatus(),
        fetchModelTypes(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load ML training data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasetsStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/datasets/status`);
      setDatasetsStatus(response.data);
    } catch (error) {
      console.error('Error fetching datasets status:', error);
    }
  };

  const fetchTrainingStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/training/status`);
      setTrainingStatus(response.data);
    } catch (error) {
      console.error('Error fetching training status:', error);
    }
  };

  const fetchModelTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/model-types`);
      setModelTypes(response.data);
    } catch (error) {
      console.error('Error fetching model types:', error);
    }
  };

  const handleGenerateDatasets = async () => {
    Alert.alert(
      'Generate Training Datasets',
      'This will create synthetic datasets (~120MB) for all AI models. This may take 5-10 minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              const response = await axios.post(`${API_BASE_URL}/datasets/generate`, {
                force_regenerate: false,
              });
              Alert.alert('Success', response.data.message);
              setTimeout(fetchDatasetsStatus, 2000);
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to generate datasets');
            }
          },
        },
      ]
    );
  };

  const handleStartTraining = async (modelType) => {
    if (!datasetsStatus?.all_datasets_ready) {
      Alert.alert(
        'Datasets Required',
        'Training datasets must be generated first. Would you like to generate them now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Generate', onPress: handleGenerateDatasets },
        ]
      );
      return;
    }

    Alert.alert(
      'Start Model Training',
      `Train ${modelType.replace(/_/g, ' ')} model? This may take 10-30 minutes depending on the model type.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Training',
          onPress: async () => {
            try {
              const response = await axios.post(`${API_BASE_URL}/train`, {
                model_type: modelType,
                epochs: 10,
              });
              Alert.alert('Success', response.data.message);
              fetchTrainingStatus();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to start training');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading ML Training Dashboard...</Text>
      </View>
    );
  }

  const getStatusColor = (available) => (available ? '#4CAF50' : '#FF9800');
  const getStatusIcon = (available) => (available ? 'checkmark-circle' : 'alert-circle');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="bulb" size={40} color="#4CAF50" />
        <Text style={styles.headerTitle}>AI Model Training</Text>
        <Text style={styles.headerSubtitle}>Train custom AI models for your farm</Text>
      </View>

      {/* Training Status Card */}
      {trainingStatus?.status?.is_training && (
        <View style={styles.trainingStatusCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="timer" size={24} color="#2196F3" />
            <Text style={styles.cardTitle}>Training In Progress</Text>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.currentModel}>
              {trainingStatus.status.current_model?.replace(/_/g, ' ').toUpperCase()}
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBar, { width: `${trainingStatus.status.progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {trainingStatus.status.progress}% - {trainingStatus.status.message}
            </Text>
          </View>
        </View>
      )}

      {/* Datasets Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="folder-open" size={24} color="#FF9800" />
          <Text style={styles.cardTitle}>Training Datasets</Text>
        </View>
        
        {datasetsStatus?.all_datasets_ready ? (
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.statusText}>All datasets ready</Text>
          </View>
        ) : (
          <>
            <View style={styles.statusRow}>
              <Ionicons name="alert-circle" size={20} color="#FF9800" />
              <Text style={styles.statusText}>Datasets not generated</Text>
            </View>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateDatasets}
            >
              <Ionicons name="cloud-download" size={20} color="#FFF" />
              <Text style={styles.generateButtonText}>Generate Datasets</Text>
            </TouchableOpacity>
          </>
        )}

        {datasetsStatus?.datasets && (
          <View style={styles.datasetsList}>
            {Object.entries(datasetsStatus.datasets).map(([name, data]) => (
              <View key={name} style={styles.datasetItem}>
                <Ionicons
                  name={getStatusIcon(data.available)}
                  size={16}
                  color={getStatusColor(data.available)}
                />
                <Text style={styles.datasetName}>{name.replace(/_/g, ' ')}</Text>
                {data.available && data.num_images && (
                  <Text style={styles.datasetInfo}>({data.num_images} images)</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Available Models */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="layers" size={24} color="#4CAF50" />
          <Text style={styles.cardTitle}>Available Models</Text>
        </View>

        {modelTypes?.model_types &&
          Object.entries(modelTypes.model_types).map(([key, model]) => (
            <View key={key} style={styles.modelCard}>
              <View style={styles.modelHeader}>
                <Text style={styles.modelName}>{model.description}</Text>
                <TouchableOpacity
                  style={[
                    styles.trainButton,
                    trainingStatus?.status?.is_training && styles.trainButtonDisabled,
                  ]}
                  onPress={() => handleStartTraining(key)}
                  disabled={trainingStatus?.status?.is_training}
                >
                  <Ionicons name="play-circle" size={20} color="#FFF" />
                  <Text style={styles.trainButtonText}>Train</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modelDetails}>
                <View style={styles.modelDetailRow}>
                  <Ionicons name="cube" size={14} color="#666" />
                  <Text style={styles.modelDetailText}>Algorithm: {model.algorithm}</Text>
                </View>
                <View style={styles.modelDetailRow}>
                  <Ionicons name="server" size={14} color="#666" />
                  <Text style={styles.modelDetailText}>Dataset: {model.dataset_size}</Text>
                </View>
                <View style={styles.modelDetailRow}>
                  <Ionicons name="enter" size={14} color="#666" />
                  <Text style={styles.modelDetailText}>Input: {model.input}</Text>
                </View>
                <View style={styles.modelDetailRow}>
                  <Ionicons name="exit" size={14} color="#666" />
                  <Text style={styles.modelDetailText}>Output: {model.output}</Text>
                </View>
              </View>
            </View>
          ))}
      </View>

      {/* View Models Button */}
      <TouchableOpacity
        style={styles.viewModelsButton}
        onPress={() => navigation.navigate('TrainedModels')}
      >
        <Ionicons name="analytics" size={24} color="#FFF" />
        <Text style={styles.viewModelsButtonText}>View Trained Models & Performance</Text>
      </TouchableOpacity>
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  trainingStatusCard: {
    backgroundColor: '#E3F2FD',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  card: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  currentModel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  datasetsList: {
    marginTop: 15,
  },
  datasetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  datasetName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
    textTransform: 'capitalize',
  },
  datasetInfo: {
    fontSize: 12,
    color: '#666',
  },
  modelCard: {
    backgroundColor: '#FAFAFA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  trainButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  trainButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  trainButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  modelDetails: {
    marginTop: 5,
  },
  modelDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  modelDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  viewModelsButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModelsButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ModelTrainingScreen;
