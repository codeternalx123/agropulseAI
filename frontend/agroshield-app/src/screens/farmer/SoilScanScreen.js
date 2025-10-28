/**
 * Soil Scan Screen
 * Camera interface for capturing soil photos with AI analysis
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Button, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext.js';
import { uploadAPI, farmAPI, predictionAPI, pestAPI } from '../../services/api';
import locationService from '../../services/locationService';

export default function SoilScanScreen({ navigation }) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [wetPhoto, setWetPhoto] = useState(null);
  const [dryPhoto, setDryPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState('wet'); // 'wet', 'dry', 'analyze'
  const cameraRef = useRef(null);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (currentStep === 'wet') {
        setWetPhoto(photo.uri);
        setCurrentStep('dry');
        Alert.alert(
          'Wet Soil Captured',
          'Now take a photo of DRY soil from the same area'
        );
      } else if (currentStep === 'dry') {
        setDryPhoto(photo.uri);
        setCurrentStep('analyze');
      }
    } catch (error) {
      console.error('Take picture error:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (currentStep === 'wet') {
          setWetPhoto(result.assets[0].uri);
          setCurrentStep('dry');
        } else if (currentStep === 'dry') {
          setDryPhoto(result.assets[0].uri);
          setCurrentStep('analyze');
        }
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const analyzeSoil = async () => {
    if (!wetPhoto || !dryPhoto) {
      Alert.alert('Error', 'Please capture both wet and dry soil photos');
      return;
    }

    try {
      setAnalyzing(true);

      // Get current location
      const location = await locationService.getCurrentLocation();

      // Use ML model for soil analysis on wet photo
      const mlSoilAnalysis = await pestAPI.scanSoil(wetPhoto);

      // Upload photos for record keeping
      const wetUpload = await uploadAPI.uploadImage(wetPhoto, 'soil');
      const dryUpload = await uploadAPI.uploadImage(dryPhoto, 'soil');

      if (!wetUpload.success || !dryUpload.success) {
        throw new Error('Failed to upload photos');
      }

      // Perform traditional AI soil analysis as backup
      const traditionalAnalysis = await predictionAPI.predictSoilQuality({
        wet_image_url: wetUpload.url,
        dry_image_url: dryUpload.url,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      // Combine ML and traditional analysis
      const combinedAnalysis = {
        ...traditionalAnalysis,
        ml_prediction: mlSoilAnalysis,
        soil_type: mlSoilAnalysis.soil_type || traditionalAnalysis.soil_type,
        ml_confidence: mlSoilAnalysis.confidence,
        characteristics: mlSoilAnalysis.characteristics,
        recommendations: mlSoilAnalysis.recommendations,
        fertility_estimate: mlSoilAnalysis.fertility_estimate,
      };

      // Navigate to results screen
      navigation.navigate('SoilAnalysis', {
        analysis: combinedAnalysis,
        photos: {
          wet: wetUpload.url,
          dry: dryUpload.url,
        },
        location,
      });

    } catch (error) {
      console.error('Soil analysis error:', error);
      Alert.alert('Analysis Error', error.message || 'Failed to analyze soil');
    } finally {
      setAnalyzing(false);
    }
  };

  const retakePhoto = (type) => {
    if (type === 'wet') {
      setWetPhoto(null);
      setCurrentStep('wet');
    } else {
      setDryPhoto(null);
      setCurrentStep('dry');
    }
  };

  const reset = () => {
    setWetPhoto(null);
    setDryPhoto(null);
    setCurrentStep('wet');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#999" />
        <Text style={styles.noPermissionText}>
          Camera permission is required to scan soil
        </Text>
        <Button mode="contained" onPress={requestCameraPermission}>
          Grant Permission
        </Button>
      </View>
    );
  }

  if (analyzing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.analyzingText}>Analyzing soil...</Text>
        <Text style={styles.analyzingSubtext}>This may take a few moments</Text>
      </View>
    );
  }

  if (currentStep === 'analyze' && wetPhoto && dryPhoto) {
    return (
      <View style={styles.container}>
        <Text style={styles.reviewTitle}>Review Your Photos</Text>

        <Card style={styles.reviewCard}>
          <Card.Content>
            <Text style={styles.photoLabel}>Wet Soil</Text>
            <Image source={{ uri: wetPhoto }} style={styles.reviewImage} />
            <Button mode="text" onPress={() => retakePhoto('wet')}>
              Retake
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.reviewCard}>
          <Card.Content>
            <Text style={styles.photoLabel}>Dry Soil</Text>
            <Image source={{ uri: dryPhoto }} style={styles.reviewImage} />
            <Button mode="text" onPress={() => retakePhoto('dry')}>
              Retake
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.actionButtons}>
          <Button mode="outlined" onPress={reset} style={styles.actionButton}>
            Start Over
          </Button>
          <Button 
            mode="contained" 
            onPress={analyzeSoil} 
            style={styles.actionButton}
            icon="test-tube"
          >
            Analyze Soil
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Chip 
          icon={currentStep === 'wet' ? 'water' : 'weather-sunny'} 
          mode="flat" 
          style={styles.stepChip}
        >
          Step {currentStep === 'wet' ? '1' : '2'} of 2
        </Chip>
        <Text style={styles.instructionText}>
          {currentStep === 'wet' 
            ? 'Take a photo of WET soil (after watering)'
            : 'Now take a photo of DRY soil from the same spot'
          }
        </Text>
        {wetPhoto && (
          <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
        )}
      </View>

      {/* Camera */}
      <Camera 
        ref={cameraRef} 
        style={styles.camera} 
        type={type}
        ratio="16:9"
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.targetBox} />
        </View>
      </Camera>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.galleryButton}
          onPress={pickImageFromGallery}
        >
          <MaterialCommunityIcons name="image" size={28} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.captureButton}
          onPress={takePicture}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.flipButton}
          onPress={() => {
            setType(
              type === Camera.Constants.Type.back
                ? Camera.Constants.Type.front
                : Camera.Constants.Type.back
            );
          }}
        >
          <MaterialCommunityIcons name="camera-flip" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Photo Preview */}
      {wetPhoto && currentStep === 'dry' && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Wet soil captured ✓</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPermissionText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  analyzingText: {
    fontSize: 18,
    color: '#FFF',
    marginTop: 16,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  instructionsContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },
  stepChip: {
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBox: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#4CAF50',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 24,
  },
  reviewCard: {
    width: '90%',
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});
