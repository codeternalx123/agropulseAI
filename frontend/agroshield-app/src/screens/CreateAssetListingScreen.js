/**
 * Create Asset Listing Screen
 * AI-Verified Asset Creation with Data from Farm Intelligence
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import exchangeService from '../services/exchangeService';
import aiFarmIntelligenceService from '../services/aiFarmIntelligenceService';

const CreateAssetListingScreen = ({ navigation, route }) => {
  const { farmId, userId, onListingCreated } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    cropType: '',
    quantityKg: '',
    unitPrice: '',
    listingTitle: '',
    description: '',
    preferredPickupLocation: '',
    deliveryAvailable: false,
    deliveryRadiusKm: ''
  });

  // AI Verification Data
  const [aiData, setAiData] = useState(null);
  const [verificationScore, setVerificationScore] = useState(0);
  const [qualityGrade, setQualityGrade] = useState('grade_c_basic');

  // GPS
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    loadFarmData();
  }, []);

  const loadFarmData = async () => {
    setVerifying(true);
    try {
      // Get GPS location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }

      // Load AI verification data from farm intelligence
      await loadAIVerificationData();
    } catch (error) {
      console.error('Error loading farm data:', error);
      Alert.alert('Warning', 'Could not load complete farm data. Please ensure GPS and sensor data are available.');
    } finally {
      setVerifying(false);
    }
  };

  const loadAIVerificationData = async () => {
    try {
      // Load micro-climate profile
      const microClimate = await aiFarmIntelligenceService.getMicroClimateProfile(
        farmId,
        currentLocation?.latitude || -1.2921,
        currentLocation?.longitude || 36.8219
      );

      // Load NDVI
      const ndvi = await aiFarmIntelligenceService.getNDVIAnalysis(
        farmId,
        currentLocation?.latitude || -1.2921,
        currentLocation?.longitude || 36.8219
      );

      // Load BLE sensor data
      const sensorData = await aiFarmIntelligenceService.getBLESensorData(farmId);

      // Load soil analysis (if available)
      // In production, fetch from backend
      const soilData = {
        healthScore: 75,
        nutrients: { nitrogen: 'adequate', phosphorus: 'adequate', potassium: 'good' }
      };

      // Load pest scan history (if available)
      const pestData = {
        scans: [],
        pestFree: true,
        lastScanDate: new Date().toISOString()
      };

      // Calculate spoilage risk based on storage data
      const spoilageData = {
        spoilageRiskScore: 15,
        spoilageRiskTrend: 'low',
        predictedShelfLifeDays: 45,
        riskColor: '#4CAF50',
        sensorData: sensorData.sensors && sensorData.sensors.length > 0 ? {
          sensorId: sensorData.sensors[0].id,
          temperatureAvg: 12,
          temperatureMin: 10,
          temperatureMax: 15,
          humidityAvg: 65,
          humidityMin: 60,
          humidityMax: 70,
          safeRangeCompliance: 95,
          monitoringStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          monitoringEndDate: new Date().toISOString(),
          totalReadings: 720
        } : null
      };

      // Build AI verification object
      const aiVerification = exchangeService.buildAIVerification(
        {
          farmId,
          harvestHealthScore: 85,
          maturityLevel: 'optimal',
          harvestImageUrl: null,
          harvestDate: new Date().toISOString(),
          ndviIndex: ndvi.current_index || 0.7,
          vegetationHealth: ndvi.classification || 'healthy'
        },
        soilData,
        spoilageData,
        pestData,
        currentLocation || { latitude: -1.2921, longitude: 36.8219 }
      );

      setAiData(aiVerification);
      
      // Calculate verification score
      const score = aiVerification.ai_confidence_score;
      setVerificationScore(score);

      // Determine quality grade
      if (score >= 90) {
        setQualityGrade('grade_a_premium');
      } else if (score >= 60) {
        setQualityGrade('grade_b_standard');
      } else {
        setQualityGrade('grade_c_basic');
      }
    } catch (error) {
      console.error('Error loading AI verification:', error);
    }
  };

  const handleCreateListing = async () => {
    // Validate form
    if (!formData.cropType || !formData.quantityKg || !formData.unitPrice || !formData.listingTitle) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!aiData) {
      Alert.alert('Error', 'AI verification data not loaded. Please try again.');
      return;
    }

    if (verificationScore < 60) {
      Alert.alert(
        'Low Verification Score',
        `Your verification score is ${verificationScore}%. To improve your score and quality grade:\n\n` +
        '• Complete GPS field registration\n' +
        '• Upload harvest photos\n' +
        '• Perform pest scans\n' +
        '• Connect BLE storage sensors\n' +
        '• Complete soil analysis\n\n' +
        'Do you want to continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => submitListing() }
        ]
      );
      return;
    }

    await submitListing();
  };

  const submitListing = async () => {
    setLoading(true);
    try {
      // Build asset listing
      const assetData = {
        seller_id: userId,
        seller_name: 'John Farmer', // In production, get from user profile
        seller_phone: '+254700000000', // In production, get from user profile
        crop_type: formData.cropType,
        quantity_kg: parseFloat(formData.quantityKg),
        unit_price_kes: parseFloat(formData.unitPrice),
        total_value_kes: parseFloat(formData.quantityKg) * parseFloat(formData.unitPrice),
        quality_grade: qualityGrade,
        ai_verification: aiData,
        listing_title: formData.listingTitle,
        description: formData.description,
        listing_images: [], // In production, upload images
        preferred_pickup_location: formData.preferredPickupLocation,
        delivery_available: formData.deliveryAvailable,
        delivery_radius_km: formData.deliveryRadiusKm ? parseFloat(formData.deliveryRadiusKm) : null,
        harvest_date: new Date().toISOString(),
        storage_location: 'Farm Storage' // In production, get from storage system
      };

      // Create listing
      const result = await exchangeService.createAssetListing(assetData);

      if (result.success) {
        // Auto-publish if high quality
        if (verificationScore >= 80) {
          await exchangeService.publishAsset(result.asset.asset_id, 30);
          Alert.alert(
            'Success!',
            `Asset listed and published on marketplace!\n\n` +
            `Quality Grade: ${exchangeService.getQualityGradeInfo(result.asset.quality_grade).label}\n` +
            `Verification Score: ${verificationScore}%\n` +
            `Total Value: KES ${result.asset.total_value_kes.toLocaleString()}`,
            [
              {
                text: 'View Listing',
                onPress: () => {
                  if (onListingCreated) onListingCreated();
                  navigation.goBack();
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Success!',
            'Asset listing created. You can publish it from My Listings.',
            [
              {
                text: 'OK',
                onPress: () => {
                  if (onListingCreated) onListingCreated();
                  navigation.goBack();
                }
              }
            ]
          );
        }
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const qualityInfo = exchangeService.getQualityGradeInfo(qualityGrade);

  if (verifying) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Verifying farm data...</Text>
        <Text style={styles.loadingSubtext}>Loading GPS, sensors, and AI intelligence</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Verification Score Card */}
        <View style={styles.verificationCard}>
          <View style={styles.verificationHeader}>
            <MaterialCommunityIcons name="shield-check" size={32} color={qualityInfo.color} />
            <View style={styles.verificationInfo}>
              <Text style={styles.verificationTitle}>AI Verification Score</Text>
              <Text style={[styles.verificationScore, { color: qualityInfo.color }]}>
                {verificationScore}%
              </Text>
            </View>
          </View>
          <View style={[styles.qualityBadge, { backgroundColor: qualityInfo.color }]}>
            <Text style={styles.qualityText}>
              {qualityInfo.icon} {qualityInfo.label}
            </Text>
          </View>
          <Text style={styles.verificationDescription}>{qualityInfo.description}</Text>
          
          {/* Verification Details */}
          {aiData && (
            <View style={styles.verificationDetails}>
              <View style={styles.verificationRow}>
                <MaterialCommunityIcons 
                  name="sprout" 
                  size={20} 
                  color={aiData.harvest_health_score ? '#4CAF50' : '#CCC'} 
                />
                <Text style={styles.verificationItem}>
                  Harvest Health: {aiData.harvest_health_score ? `${aiData.harvest_health_score}%` : 'Not available'}
                </Text>
              </View>
              <View style={styles.verificationRow}>
                <MaterialCommunityIcons 
                  name="thermometer" 
                  size={20} 
                  color={aiData.storage_condition_proof ? '#4CAF50' : '#CCC'} 
                />
                <Text style={styles.verificationItem}>
                  Storage Monitoring: {aiData.storage_condition_proof ? 'Connected' : 'Not connected'}
                </Text>
              </View>
              <View style={styles.verificationRow}>
                <MaterialCommunityIcons 
                  name="shield-bug" 
                  size={20} 
                  color={aiData.pest_free_certification ? '#4CAF50' : '#CCC'} 
                />
                <Text style={styles.verificationItem}>
                  Pest-Free: {aiData.pest_free_certification ? 'Yes' : 'No'}
                </Text>
              </View>
              <View style={styles.verificationRow}>
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={20} 
                  color={currentLocation ? '#4CAF50' : '#CCC'} 
                />
                <Text style={styles.verificationItem}>
                  GPS Verified: {currentLocation ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Asset Details</Text>

          <Text style={styles.label}>Crop Type *</Text>
          <Picker
            selectedValue={formData.cropType}
            style={styles.picker}
            onValueChange={(value) => setFormData({ ...formData, cropType: value })}
          >
            <Picker.Item label="Select crop type" value="" />
            <Picker.Item label="Potato" value="Potato" />
            <Picker.Item label="Maize" value="Maize" />
            <Picker.Item label="Tomato" value="Tomato" />
            <Picker.Item label="Cabbage" value="Cabbage" />
            <Picker.Item label="Carrot" value="Carrot" />
            <Picker.Item label="Onion" value="Onion" />
            <Picker.Item label="Beans" value="Beans" />
            <Picker.Item label="Peas" value="Peas" />
          </Picker>

          <Text style={styles.label}>Quantity (kg) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 500"
            keyboardType="numeric"
            value={formData.quantityKg}
            onChangeText={(text) => setFormData({ ...formData, quantityKg: text })}
          />

          <Text style={styles.label}>Unit Price (KES per kg) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 50"
            keyboardType="numeric"
            value={formData.unitPrice}
            onChangeText={(text) => setFormData({ ...formData, unitPrice: text })}
          />

          {formData.quantityKg && formData.unitPrice && (
            <View style={styles.totalValueCard}>
              <Text style={styles.totalLabel}>Total Value:</Text>
              <Text style={styles.totalValue}>
                KES {(parseFloat(formData.quantityKg) * parseFloat(formData.unitPrice)).toLocaleString()}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Listing Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Grade A Premium Potatoes - Fresh Harvest"
            value={formData.listingTitle}
            onChangeText={(text) => setFormData({ ...formData, listingTitle: text })}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your crop quality, harvest date, storage conditions, etc."
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />

          <Text style={styles.label}>Pickup Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Kiambu County, Limuru"
            value={formData.preferredPickupLocation}
            onChangeText={(text) => setFormData({ ...formData, preferredPickupLocation: text })}
          />

          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setFormData({ ...formData, deliveryAvailable: !formData.deliveryAvailable })}
            >
              <MaterialCommunityIcons
                name={formData.deliveryAvailable ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={formData.deliveryAvailable ? '#4CAF50' : '#666'}
              />
              <Text style={styles.checkboxLabel}>Delivery Available</Text>
            </TouchableOpacity>
          </View>

          {formData.deliveryAvailable && (
            <>
              <Text style={styles.label}>Delivery Radius (km)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 50"
                keyboardType="numeric"
                value={formData.deliveryRadiusKm}
                onChangeText={(text) => setFormData({ ...formData, deliveryRadiusKm: text })}
              />
            </>
          )}
        </View>

        {/* Warning for low score */}
        {verificationScore < 60 && (
          <View style={styles.warningCard}>
            <MaterialCommunityIcons name="alert" size={24} color="#FF9800" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Low Verification Score</Text>
              <Text style={styles.warningText}>
                Your asset will be listed as Grade C. Complete more verifications to improve your grade and attract premium buyers.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreateListing}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle" size={24} color="#FFF" />
              <Text style={styles.submitButtonText}>Create Listing</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10
  },
  scrollView: {
    flex: 1
  },
  verificationCard: {
    backgroundColor: '#FFF',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  verificationInfo: {
    marginLeft: 15,
    flex: 1
  },
  verificationTitle: {
    fontSize: 16,
    color: '#666'
  },
  verificationScore: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  qualityBadge: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  qualityText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  verificationDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15
  },
  verificationDetails: {
    gap: 10
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  verificationItem: {
    fontSize: 14,
    color: '#333'
  },
  formContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  picker: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA'
  },
  totalValueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    marginTop: 15
  },
  totalLabel: {
    fontSize: 16,
    color: '#666'
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  checkboxRow: {
    marginTop: 15
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333'
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  warningContent: {
    marginLeft: 10,
    flex: 1
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 5
  },
  warningText: {
    fontSize: 14,
    color: '#666'
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC'
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  }
});

export default CreateAssetListingScreen;
