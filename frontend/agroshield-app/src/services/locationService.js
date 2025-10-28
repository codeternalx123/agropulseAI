/**
 * Location Tracking Service
 * Handles GPS tracking, permissions, and location updates
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const LOCATION_STORAGE_KEY = '@agropulseai_location';
const LOCATION_UPDATE_INTERVAL = 300000; // 5 minutes

class LocationService {
  constructor() {
    this.locationSubscription = null;
    this.currentLocation = null;
    this.watchId = null;
  }

  /**
   * Request location permissions
   */
  async requestPermissions() {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Request background permissions for continuous tracking
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted'
      };
    } catch (error) {
      console.error('Permission request error:', error);
      throw error;
    }
  }

  /**
   * Check if location permissions are granted
   */
  async hasPermissions() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation() {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const permissions = await this.requestPermissions();
        if (!permissions.foreground) {
          throw new Error('Location permission required');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        timestamp: location.timestamp,
      };

      // Store locally
      await this.storeLocation(this.currentLocation);

      return this.currentLocation;
    } catch (error) {
      console.error('Get location error:', error);
      // Try to return cached location
      return await this.getCachedLocation();
    }
  }

  /**
   * Start watching location changes
   */
  async startWatching(callback) {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        await this.requestPermissions();
      }

      // Stop existing watch
      this.stopWatching();

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: 100, // Update when moved 100m
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            timestamp: location.timestamp,
          };

          // Store locally
          this.storeLocation(this.currentLocation);

          // Callback with new location
          if (callback) {
            callback(this.currentLocation);
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Start watching error:', error);
      return false;
    }
  }

  /**
   * Stop watching location
   */
  stopWatching() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
  }

  /**
   * Update location on backend
   */
  async updateLocationOnServer(userId, locationData = null) {
    try {
      const location = locationData || this.currentLocation || await this.getCurrentLocation();
      
      if (!location) {
        throw new Error('No location data available');
      }

      const response = await api.post('/api/location/update', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
      }, {
        params: { user_id: userId }
      });

      return response.data;
    } catch (error) {
      console.error('Update location error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await api.post('/api/location/reverse-geocode', null, {
        params: { latitude, longitude }
      });

      return response.data.location;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      
      // Fallback to Expo's reverse geocoding
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          return {
            country: address.country || 'Kenya',
            state: address.region || '',
            county: address.city || address.subregion || '',
            village: address.district || address.street || '',
            latitude,
            longitude,
          };
        }
      } catch (expError) {
        console.error('Expo reverse geocode error:', expError);
      }

      return {
        country: 'Kenya',
        state: 'Unknown',
        county: 'Unknown',
        latitude,
        longitude,
      };
    }
  }

  /**
   * Get location details with address
   */
  async getLocationWithAddress() {
    try {
      const location = await this.getCurrentLocation();
      const address = await this.reverseGeocode(location.latitude, location.longitude);
      
      return {
        ...location,
        ...address,
      };
    } catch (error) {
      console.error('Get location with address error:', error);
      throw error;
    }
  }

  /**
   * Store location in AsyncStorage
   */
  async storeLocation(location) {
    try {
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
    } catch (error) {
      console.error('Store location error:', error);
    }
  }

  /**
   * Get cached location
   */
  async getCachedLocation() {
    try {
      const locationStr = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (locationStr) {
        return JSON.parse(locationStr);
      }
      return null;
    } catch (error) {
      console.error('Get cached location error:', error);
      return null;
    }
  }

  /**
   * Clear cached location
   */
  async clearLocation() {
    try {
      await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
      this.currentLocation = null;
    } catch (error) {
      console.error('Clear location error:', error);
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance; // in km
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Auto-update location on app launch/resume
   */
  async initializeLocationTracking(userId, onUpdate) {
    try {
      // Get initial location
      const location = await this.getCurrentLocation();
      
      // Update server
      await this.updateLocationOnServer(userId, location);
      
      // Start watching for changes
      await this.startWatching(async (newLocation) => {
        try {
          await this.updateLocationOnServer(userId, newLocation);
          if (onUpdate) {
            onUpdate(newLocation);
          }
        } catch (error) {
          console.error('Location update callback error:', error);
        }
      });

      if (onUpdate) {
        onUpdate(location);
      }

      return location;
    } catch (error) {
      console.error('Initialize tracking error:', error);
      throw error;
    }
  }

  /**
   * Cleanup - stop all tracking
   */
  cleanup() {
    this.stopWatching();
    this.currentLocation = null;
  }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;
