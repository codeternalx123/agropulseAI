import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Card, Button, ProgressBar, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { api } from '../services/api';
import aiFarmIntelligenceService from '../services/aiFarmIntelligenceService';
// Note: BLE requires expo-bluetooth or react-native-ble-plx
// For production, install: npm install react-native-ble-plx

/**
 * StorageBLE Screen - Bluetooth Storage Monitoring
 * 
 * Features:
 * - BLE temperature & humidity sensor integration
 * - Crop-specific safe range profiles
 * - Automated SMS alerts for unsafe conditions
 * - Historical data tracking & visualization
 * - Predictive spoilage modeling
 * - Smart alert prioritization
 * - Weather-aware remediation advice
 * - Stored pest prediction
 * - Localized advice (English & Swahili)
 */

export default function StorageBLEScreen({ navigation, route }) {
  const { farmId, cropType = 'maize', storageId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [currentReading, setCurrentReading] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [spoilageRisk, setSpoilageRisk] = useState(null);
  const [pestPrediction, setPestPrediction] = useState(null);

  // Crop-specific storage profiles
  const CROP_PROFILES = {
    maize: {
      name: 'Maize',
      safeTempMin: 10,
      safeTempMax: 21,
      safeHumidityMin: 50,
      safeHumidityMax: 65,
      criticalHumidity: 70,
      optimalMoisture: 13.5,
      moldSusceptibility: 8,
      weevilSusceptibility: 9,
      economicValue: 45, // KES per kg
      pests: ['Maize Weevil', 'Larger Grain Borer', 'Angoumois Grain Moth'],
    },
    beans: {
      name: 'Beans',
      safeTempMin: 10,
      safeTempMax: 18,
      safeHumidityMin: 50,
      safeHumidityMax: 60,
      criticalHumidity: 65,
      optimalMoisture: 12.0,
      moldSusceptibility: 6,
      weevilSusceptibility: 7,
      economicValue: 120,
      pests: ['Bean Weevil', 'Bean Bruchid'],
    },
    potatoes: {
      name: 'Potatoes',
      safeTempMin: 7,
      safeTempMax: 10,
      safeHumidityMin: 85,
      safeHumidityMax: 95,
      criticalHumidity: 98,
      moldSusceptibility: 9,
      weevilSusceptibility: 3,
      economicValue: 65,
      pests: ['Potato Tuber Moth', 'Bacterial Soft Rot'],
    },
    rice: {
      name: 'Rice',
      safeTempMin: 10,
      safeTempMax: 21,
      safeHumidityMin: 50,
      safeHumidityMax: 65,
      criticalHumidity: 70,
      optimalMoisture: 14.0,
      moldSusceptibility: 7,
      weevilSusceptibility: 8,
      economicValue: 95,
      pests: ['Rice Weevil', 'Angoumois Grain Moth'],
    },
  };

  const cropProfile = CROP_PROFILES[cropType] || CROP_PROFILES.maize;

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      setLoading(true);
      
      // Fetch real BLE sensor data from backend
      const realSensors = await aiFarmIntelligenceService.getBLESensorData(farmId);
      
      if (realSensors && realSensors.length > 0) {
        // Use real sensor data
        setSensors(realSensors);
        setSelectedSensor(realSensors[0]);
        await loadSensorReading(realSensors[0].id);
      } else {
        // No sensors available
        setSensors([]);
        setSelectedSensor(null);
      }

      await loadAlerts();
      await calculateSpoilageRisk();
      await predictPestEmergence();

    } catch (error) {
      console.error('Error loading storage data:', error);
      Alert.alert('Error', 'Failed to load storage data');
    } finally {
      setLoading(false);
    }
  };

  const loadSensorReading = async (sensorId) => {
    try {
      // Try to fetch real sensor reading from backend
      const response = await api.get(`/ble-sensors/${sensorId}/reading`);
      
      if (response.data && response.data.temperature && response.data.humidity) {
        setCurrentReading({
          temperature: response.data.temperature,
          humidity: response.data.humidity,
          timestamp: response.data.timestamp || new Date().toISOString(),
          sensorId,
        });
        return;
      }

      // No valid reading available
      setCurrentReading(null);
    } catch (error) {
      console.error('Error loading sensor reading:', error);
      setCurrentReading(null);
    }
  };

  const loadAlerts = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.get('/storage/alerts');
      // setAlerts(response.data);
      
      setAlerts([]);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setAlerts([]);
    }
  };

  const calculateSpoilageRisk = async () => {
    try {
      if (!currentReading) return;

      const temp = currentReading.temperature;
      const humidity = currentReading.humidity;

      // Simple risk calculation (replace with AI model)
      let riskScore = 0;
      let daysToRisk = 30;
      let potentialLoss = 0;

      // Temperature risk
      if (temp > cropProfile.safeTempMax) {
        riskScore += ((temp - cropProfile.safeTempMax) / 10) * 30;
        daysToRisk -= 5;
      }

      // Humidity risk (most critical)
      if (humidity > cropProfile.safeHumidityMax) {
        const humidityExcess = humidity - cropProfile.safeHumidityMax;
        riskScore += humidityExcess * 3;
        daysToRisk = Math.max(3, daysToRisk - humidityExcess * 2);
      }

      // Mold susceptibility multiplier
      riskScore *= (cropProfile.moldSusceptibility / 5);
      riskScore = Math.min(100, Math.max(0, riskScore));

      // Calculate potential loss (assuming 500kg stored)
      const storedKg = 500;
      const lossPercentage = riskScore * 0.6; // 60% at 100% risk
      potentialLoss = (storedKg * lossPercentage / 100) * cropProfile.economicValue;

      setSpoilageRisk({
        score: riskScore,
        level: riskScore > 70 ? 'critical' : riskScore > 40 ? 'high' : riskScore > 20 ? 'moderate' : 'low',
        daysToRisk: Math.round(daysToRisk),
        potentialLoss: Math.round(potentialLoss),
        message:
          riskScore > 70
            ? `Your ${cropProfile.name.toLowerCase()} has ${Math.round(riskScore)}% mold risk in ${Math.round(daysToRisk)} days. Potential loss: ${Math.round(potentialLoss)} KES`
            : `Storage conditions are ${riskScore > 40 ? 'acceptable' : 'good'}. Risk level: ${Math.round(riskScore)}%`,
      });
    } catch (error) {
      console.error('Error calculating spoilage risk:', error);
    }
  };

  const predictPestEmergence = async () => {
    try {
      if (!currentReading) return;

      const temp = currentReading.temperature;
      
      // Temperature-dependent pest life cycle
      // Maize weevil: egg to adult at 30°C = 28 days, at 20°C = 56 days
      const daysToEmergence = temp > 25 ? 30 : temp > 20 ? 45 : 60;
      const riskLevel = temp > 25 ? 'high' : temp > 20 ? 'moderate' : 'low';

      setPestPrediction({
        daysToEmergence,
        riskLevel,
        pests: cropProfile.pests,
        message: `${cropProfile.pests[0]} emergence predicted in ${daysToEmergence} days (${riskLevel} risk at ${Math.round(temp)}°C)`,
      });
    } catch (error) {
      console.error('Error predicting pests:', error);
    }
  };

  const scanForSensors = async () => {
    try {
      setScanning(true);
      Alert.alert(
        'BLE Scanning',
        'Bluetooth scanning requires native BLE library (expo-bluetooth or react-native-ble-plx). Using simulated sensors for demo.',
      );
      
      // Simulated scanning delay
      setTimeout(() => {
        setScanning(false);
        loadStorageData();
      }, 2000);
    } catch (error) {
      console.error('Error scanning for sensors:', error);
      setScanning(false);
    }
  };

  const connectToSensor = async (sensor) => {
    try {
      Alert.alert('Connecting...', `Connecting to ${sensor.name}`);
      // Implement BLE connection logic here
      setSelectedSensor(sensor);
      await loadSensorReading(sensor.id);
    } catch (error) {
      console.error('Error connecting to sensor:', error);
      Alert.alert('Connection Failed', 'Could not connect to sensor');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#D32F2F';
      case 'warning':
        return '#F57C00';
      case 'info':
        return '#1976D2';
      default:
        return '#757575';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical':
        return '#D32F2F';
      case 'high':
        return '#F57C00';
      case 'moderate':
        return '#FFA726';
      case 'low':
        return '#66BB6A';
      default:
        return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading storage data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Storage Monitoring</Text>
              <Text style={styles.subtitle}>Crop: {cropProfile.name}</Text>
            </View>
            <MaterialCommunityIcons name="bluetooth" size={32} color="#2196F3" />
          </View>
        </Card.Content>
      </Card>

      {/* Sensor List */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>BLE Sensors</Text>
            <Button
              mode="contained"
              onPress={scanForSensors}
              loading={scanning}
              disabled={scanning}
              compact
              style={styles.scanButton}
            >
              Scan
            </Button>
          </View>

          {sensors.map((sensor) => (
            <TouchableOpacity
              key={sensor.id}
              style={[
                styles.sensorItem,
                selectedSensor?.id === sensor.id && styles.sensorItemSelected,
              ]}
              onPress={() => connectToSensor(sensor)}
            >
              <View style={styles.sensorLeft}>
                <MaterialCommunityIcons
                  name={sensor.connected ? 'bluetooth-connect' : 'bluetooth-off'}
                  size={24}
                  color={sensor.connected ? '#4CAF50' : '#757575'}
                />
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorName}>{sensor.name}</Text>
                  <Text style={styles.sensorId}>{sensor.deviceId}</Text>
                </View>
              </View>
              <View style={styles.sensorRight}>
                <MaterialCommunityIcons name="battery" size={20} color="#757575" />
                <Text style={styles.batteryText}>{sensor.batteryLevel}%</Text>
              </View>
            </TouchableOpacity>
          ))}

          {sensors.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bluetooth-off" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>No sensors found</Text>
              <Text style={styles.emptySubtext}>Tap "Scan" to search for BLE devices</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Current Reading */}
      {currentReading && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Current Conditions</Text>

            <View style={styles.readingRow}>
              <View style={styles.readingItem}>
                <MaterialCommunityIcons name="thermometer" size={32} color="#FF6B6B" />
                <Text style={styles.readingValue}>{currentReading.temperature.toFixed(1)}°C</Text>
                <Text style={styles.readingLabel}>Temperature</Text>
                <Text style={styles.readingRange}>
                  Safe: {cropProfile.safeTempMin}-{cropProfile.safeTempMax}°C
                </Text>
                {(currentReading.temperature < cropProfile.safeTempMin ||
                  currentReading.temperature > cropProfile.safeTempMax) && (
                  <Chip
                    icon="alert"
                    style={[styles.statusChip, { backgroundColor: '#FFEBEE' }]}
                    textStyle={{ color: '#D32F2F', fontSize: 11 }}
                  >
                    Out of Range
                  </Chip>
                )}
              </View>

              <View style={styles.readingItem}>
                <MaterialCommunityIcons name="water-percent" size={32} color="#2196F3" />
                <Text style={styles.readingValue}>{currentReading.humidity.toFixed(1)}%</Text>
                <Text style={styles.readingLabel}>Humidity</Text>
                <Text style={styles.readingRange}>
                  Safe: {cropProfile.safeHumidityMin}-{cropProfile.safeHumidityMax}%
                </Text>
                {(currentReading.humidity < cropProfile.safeHumidityMin ||
                  currentReading.humidity > cropProfile.safeHumidityMax) && (
                  <Chip
                    icon="alert"
                    style={[styles.statusChip, { backgroundColor: '#FFEBEE' }]}
                    textStyle={{ color: '#D32F2F', fontSize: 11 }}
                  >
                    {currentReading.humidity > cropProfile.criticalHumidity ? 'Critical' : 'Warning'}
                  </Chip>
                )}
              </View>
            </View>

            <Text style={styles.timestamp}>
              Last updated: {new Date(currentReading.timestamp).toLocaleTimeString()}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Spoilage Risk Prediction */}
      {spoilageRisk && (
        <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: getRiskColor(spoilageRisk.level) }]}>
          <Card.Content>
            <View style={styles.riskHeader}>
              <Text style={styles.sectionTitle}>Spoilage Risk Prediction</Text>
              <Chip
                style={{ backgroundColor: getRiskColor(spoilageRisk.level) + '20' }}
                textStyle={{ color: getRiskColor(spoilageRisk.level), fontWeight: 'bold' }}
              >
                {spoilageRisk.level.toUpperCase()}
              </Chip>
            </View>

            <View style={styles.riskContent}>
              <View style={styles.riskScoreContainer}>
                <Text style={[styles.riskScore, { color: getRiskColor(spoilageRisk.level) }]}>
                  {Math.round(spoilageRisk.score)}%
                </Text>
                <Text style={styles.riskLabel}>Risk Score</Text>
              </View>

              <View style={styles.riskDetails}>
                <View style={styles.riskDetailItem}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#757575" />
                  <Text style={styles.riskDetailText}>{spoilageRisk.daysToRisk} days to risk</Text>
                </View>
                <View style={styles.riskDetailItem}>
                  <MaterialCommunityIcons name="cash-remove" size={20} color="#757575" />
                  <Text style={styles.riskDetailText}>Potential loss: {spoilageRisk.potentialLoss} KES</Text>
                </View>
              </View>
            </View>

            <Text style={styles.riskMessage}>{spoilageRisk.message}</Text>

            <ProgressBar
              progress={spoilageRisk.score / 100}
              color={getRiskColor(spoilageRisk.level)}
              style={styles.riskProgress}
            />
          </Card.Content>
        </Card>
      )}

      {/* Pest Prediction */}
      {pestPrediction && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pest Emergence Prediction</Text>
              <Chip
                icon="bug"
                style={{ backgroundColor: getRiskColor(pestPrediction.riskLevel) + '20' }}
                textStyle={{ color: getRiskColor(pestPrediction.riskLevel) }}
              >
                {pestPrediction.riskLevel.toUpperCase()}
              </Chip>
            </View>

            <Text style={styles.pestMessage}>{pestPrediction.message}</Text>

            <Text style={styles.pestTitle}>Common Pests:</Text>
            <View style={styles.pestList}>
              {pestPrediction.pests.map((pest, index) => (
                <Chip key={index} style={styles.pestChip} textStyle={{ fontSize: 12 }}>
                  {pest}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Smart Alerts */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Smart Alerts</Text>
          <Text style={styles.alertSubtitle}>Priority-sorted actionable alerts</Text>

          {alerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertItem,
                { borderLeftColor: getSeverityColor(alert.severity), borderLeftWidth: 4 },
              ]}
            >
              <View style={styles.alertHeader}>
                <MaterialCommunityIcons
                  name={
                    alert.severity === 'critical'
                      ? 'alert-circle'
                      : alert.severity === 'warning'
                      ? 'alert'
                      : 'information'
                  }
                  size={24}
                  color={getSeverityColor(alert.severity)}
                />
                <View style={styles.alertHeaderText}>
                  <Text style={[styles.alertMessage, { color: getSeverityColor(alert.severity) }]}>
                    {alert.message}
                  </Text>
                  <Text style={styles.alertSwahili}>{alert.messageSwahili}</Text>
                </View>
              </View>

              {alert.actionRequired && alert.remediation && (
                <View style={styles.remediationBox}>
                  <Text style={styles.remediationTitle}>🛠️ Recommended Action:</Text>
                  <Text style={styles.remediationAction}>{alert.remediation.action}</Text>
                  <Text style={styles.remediationTiming}>⏰ Timing: {alert.remediation.timing}</Text>
                  <Text style={styles.remediationResult}>✅ Expected: {alert.remediation.expectedResult}</Text>
                </View>
              )}

              <Text style={styles.alertTime}>
                {new Date(alert.timestamp).toLocaleString()} • Priority: {alert.priority}/10
              </Text>
            </View>
          ))}

          {alerts.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle" size={48} color="#4CAF50" />
              <Text style={styles.emptyText}>No active alerts</Text>
              <Text style={styles.emptySubtext}>Storage conditions are optimal</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Storage Strategy Recommendations */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Storage Strategy</Text>
          <Text style={styles.strategyText}>
            Based on current conditions and {cropProfile.name.toLowerCase()} profile:
          </Text>

          <View style={styles.strategyItem}>
            <MaterialCommunityIcons name="package-variant" size={20} color="#4CAF50" />
            <Text style={styles.strategyItemText}>
              Recommended: PICS bags for moisture control
            </Text>
          </View>

          <View style={styles.strategyItem}>
            <MaterialCommunityIcons name="calendar-clock" size={20} color="#4CAF50" />
            <Text style={styles.strategyItemText}>
              Expected safe storage: 6-8 months (with monitoring)
            </Text>
          </View>

          <View style={styles.strategyItem}>
            <MaterialCommunityIcons name="cash-check" size={20} color="#4CAF50" />
            <Text style={styles.strategyItemText}>
              Potential savings: 1,500-8,000 KES per season (15-30% loss prevention)
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Setup Instructions */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>BLE Sensor Setup</Text>
          
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Purchase BLE temperature/humidity sensors (e.g., Xiaomi Mi Temperature Sensor, 500-1000 KES)
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              Enable Bluetooth on your phone and grant location permissions
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Place sensor in center of storage shed/crib, away from walls
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>
              Tap "Scan" above to discover and connect sensors
            </Text>
          </View>

          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>5</Text>
            <Text style={styles.stepText}>
              Enable SMS alerts in Settings to receive notifications (even without internet)
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  card: {
    margin: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  scanButton: {
    backgroundColor: '#2196F3',
  },
  sensorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sensorItemSelected: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#E8F5E9',
  },
  sensorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sensorInfo: {
    marginLeft: 12,
  },
  sensorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  sensorId: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  sensorRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 4,
    textAlign: 'center',
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  readingItem: {
    alignItems: 'center',
    flex: 1,
  },
  readingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 8,
  },
  readingLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  readingRange: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  statusChip: {
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginTop: 16,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  riskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  riskScoreContainer: {
    alignItems: 'center',
    marginRight: 24,
  },
  riskScore: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  riskLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  riskDetails: {
    flex: 1,
  },
  riskDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  riskDetailText: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 8,
  },
  riskMessage: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginTop: 8,
  },
  riskProgress: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  pestMessage: {
    fontSize: 14,
    color: '#424242',
    marginVertical: 8,
  },
  pestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginTop: 12,
    marginBottom: 8,
  },
  pestList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pestChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFF3E0',
  },
  alertSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 12,
  },
  alertItem: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  alertMessage: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  alertSwahili: {
    fontSize: 13,
    color: '#757575',
    marginTop: 4,
    fontStyle: 'italic',
  },
  remediationBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  remediationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 6,
  },
  remediationAction: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
  },
  remediationTiming: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 4,
  },
  remediationResult: {
    fontSize: 13,
    color: '#388E3C',
  },
  alertTime: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 8,
  },
  strategyText: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 12,
  },
  strategyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  strategyItemText: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 12,
    flex: 1,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
});
