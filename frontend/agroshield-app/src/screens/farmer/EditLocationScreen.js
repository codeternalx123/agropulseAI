/**
 * Edit Location Screen
 * Allows farmers to manually edit or approve GPS location
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Card, TextInput, Button, Chip, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext.js';
import locationService from '../../services/locationService';
import { locationAPI } from '../../services/api';

export default function EditLocationScreen({ navigation, route }) {
  const { user } = useAuth();
  const { currentLocation } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  
  // Location fields
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [village, setVillage] = useState('');
  const [subcounty, setSubcounty] = useState('');
  const [county, setCounty] = useState('');
  const [state, setState] = useState('');
  const [accuracy, setAccuracy] = useState('');

  useEffect(() => {
    if (currentLocation) {
      populateFields(currentLocation);
    } else {
      loadCurrentLocation();
    }
  }, [currentLocation]);

  const populateFields = (location) => {
    setLatitude(location.latitude?.toString() || '');
    setLongitude(location.longitude?.toString() || '');
    setVillage(location.village || '');
    setSubcounty(location.subcounty || '');
    setCounty(location.county || '');
    setState(location.state || '');
    setAccuracy(location.accuracy?.toString() || '');
  };

  const loadCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await locationService.getCurrentLocation();
      
      if (location) {
        // Try to get address details
        const address = await locationService.reverseGeocode(
          location.latitude,
          location.longitude
        );
        
        populateFields({
          ...location,
          ...address,
        });
      }
    } catch (error) {
      console.error('Load location error:', error);
      Alert.alert('Error', 'Failed to load current location');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetectToggle = async () => {
    if (!autoDetect) {
      // Turning on auto-detect
      try {
        setLoading(true);
        const location = await locationService.getCurrentLocation();
        
        if (location) {
          const address = await locationService.reverseGeocode(
            location.latitude,
            location.longitude
          );
          
          populateFields({
            ...location,
            ...address,
          });
          
          setAutoDetect(true);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to detect location');
      } finally {
        setLoading(false);
      }
    } else {
      // Turning off auto-detect for manual entry
      setAutoDetect(false);
    }
  };

  const handleRefreshGPS = async () => {
    try {
      setLoading(true);
      
      const location = await locationService.getCurrentLocation();
      
      if (location) {
        const address = await locationService.reverseGeocode(
          location.latitude,
          location.longitude
        );
        
        populateFields({
          ...location,
          ...address,
        });
        
        Alert.alert('Success', 'GPS location refreshed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh GPS location');
    } finally {
      setLoading(false);
    }
  };

  const validateLocation = () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (!latitude || !longitude) {
      Alert.alert('Validation Error', 'Latitude and Longitude are required');
      return false;
    }

    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Validation Error', 'Latitude and Longitude must be valid numbers');
      return false;
    }

    // Kenya boundaries (approximate)
    if (lat < -5 || lat > 6 || lon < 33 || lon > 42) {
      Alert.alert(
        'Location Warning',
        'The coordinates appear to be outside Kenya. Are you sure this is correct?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => saveLocation() }
        ]
      );
      return false;
    }

    if (!county || county.trim() === '') {
      Alert.alert('Validation Error', 'County is required');
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (validateLocation()) {
      saveLocation();
    }
  };

  const saveLocation = async () => {
    try {
      setLoading(true);

      const locationData = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        village: village.trim(),
        subcounty: subcounty.trim(),
        county: county.trim(),
        state: state.trim(),
        accuracy: accuracy ? parseFloat(accuracy) : null,
      };

      // Update location on server
      const response = await locationAPI.updateLocation(user.id, locationData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Location updated successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error('Failed to update location');
      }

    } catch (error) {
      console.error('Save location error:', error);
      Alert.alert('Error', error.message || 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const handleReverseGeocode = async () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Error', 'Please enter valid coordinates first');
      return;
    }

    try {
      setLoading(true);
      
      const address = await locationService.reverseGeocode(lat, lon);
      
      setVillage(address.village || '');
      setSubcounty(address.subcounty || '');
      setCounty(address.county || '');
      setState(address.state || '');

      Alert.alert('Success', 'Location details fetched from coordinates');
      
    } catch (error) {
      Alert.alert('Error', 'Failed to get location details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Auto-detect Toggle */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.autoDetectContainer}>
            <View style={styles.autoDetectLeft}>
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#4CAF50" />
              <View style={styles.autoDetectText}>
                <Text style={styles.autoDetectTitle}>Auto-detect Location</Text>
                <Text style={styles.autoDetectSubtitle}>
                  Use GPS to automatically fill location details
                </Text>
              </View>
            </View>
            <Switch
              value={autoDetect}
              onValueChange={handleAutoDetectToggle}
              color="#4CAF50"
            />
          </View>

          {autoDetect && (
            <Button
              mode="outlined"
              onPress={handleRefreshGPS}
              icon="refresh"
              style={styles.refreshButton}
            >
              Refresh GPS Location
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Coordinates */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>GPS Coordinates</Text>
          <Text style={styles.sectionSubtitle}>
            {autoDetect ? 'Auto-detected from GPS' : 'Enter manually'}
          </Text>

          <TextInput
            label="Latitude *"
            value={latitude}
            onChangeText={setLatitude}
            mode="outlined"
            keyboardType="decimal-pad"
            disabled={autoDetect}
            style={styles.input}
            left={<TextInput.Icon icon="map-marker" />}
            placeholder="-1.2921"
            error={latitude && (isNaN(parseFloat(latitude)) || parseFloat(latitude) < -5 || parseFloat(latitude) > 6)}
          />

          <TextInput
            label="Longitude *"
            value={longitude}
            onChangeText={setLongitude}
            mode="outlined"
            keyboardType="decimal-pad"
            disabled={autoDetect}
            style={styles.input}
            left={<TextInput.Icon icon="map-marker" />}
            placeholder="36.8219"
            error={longitude && (isNaN(parseFloat(longitude)) || parseFloat(longitude) < 33 || parseFloat(longitude) > 42)}
          />

          {accuracy && (
            <Chip icon="target" mode="flat" style={styles.accuracyChip}>
              Accuracy: ±{Math.round(parseFloat(accuracy))}m
            </Chip>
          )}

          {!autoDetect && latitude && longitude && (
            <Button
              mode="text"
              onPress={handleReverseGeocode}
              icon="map-search"
              style={styles.geocodeButton}
            >
              Auto-fill from Coordinates
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Location Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Location Details</Text>
          <Text style={styles.sectionSubtitle}>
            {autoDetect ? 'Auto-detected (editable)' : 'Enter your location information'}
          </Text>

          <TextInput
            label="Village / Location Name"
            value={village}
            onChangeText={setVillage}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="home-map-marker" />}
            placeholder="e.g., Kiambu Village"
          />

          <TextInput
            label="Sub-County / Ward"
            value={subcounty}
            onChangeText={setSubcounty}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="map-marker-radius" />}
            placeholder="e.g., Kiambu"
          />

          <TextInput
            label="County *"
            value={county}
            onChangeText={setCounty}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="map" />}
            placeholder="e.g., Kiambu County"
            error={!county && !autoDetect}
          />

          <TextInput
            label="Region / Province"
            value={state}
            onChangeText={setState}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="map-outline" />}
            placeholder="e.g., Central"
          />
        </Card.Content>
      </Card>

      {/* Info Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="information" size={20} color="#2196F3" />
            <Text style={styles.infoTitle}>Why we need your location?</Text>
          </View>
          <Text style={styles.infoText}>
            • Provide accurate weather forecasts{'\n'}
            • Recommend suitable crops for your region{'\n'}
            • Calculate climate risks{'\n'}
            • Connect with nearby farmers{'\n'}
            • Show regional market prices{'\n'}
            • Optimize farming calendar
          </Text>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={loading || !latitude || !longitude || !county}
          icon="content-save"
          style={styles.saveButton}
        >
          Save Location
        </Button>

        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
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
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  card: {
    margin: 12,
    borderRadius: 12,
    elevation: 2,
  },
  autoDetectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoDetectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  autoDetectText: {
    marginLeft: 12,
    flex: 1,
  },
  autoDetectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  autoDetectSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  refreshButton: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  accuracyChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    marginBottom: 8,
  },
  geocodeButton: {
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  actionsContainer: {
    padding: 12,
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 12,
  },
  bottomSpace: {
    height: 24,
  },
});
