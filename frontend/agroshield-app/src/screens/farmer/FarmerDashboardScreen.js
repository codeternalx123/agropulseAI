/**
 * Farmer Dashboard - Main Screen
 * Shows location, weather, crop recommendations, and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Card, Button, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext.js';
import locationService from '../../services/locationService';
import { locationAPI, climateAPI } from '../../services/api';

const { width } = Dimensions.get('window');

export default function FarmerDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [cropRecommendations, setCropRecommendations] = useState(null);
  const [locationTracking, setLocationTracking] = useState(false);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);

      // Initialize location tracking
      await startLocationTracking();

      // Load dashboard data
      await Promise.all([
        loadWeatherData(),
        loadCropRecommendations(),
      ]);

    } catch (error) {
      console.error('Dashboard initialization error:', error);
      Alert.alert('Error', error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      // Check/request permissions
      const hasPermission = await locationService.hasPermissions();
      if (!hasPermission) {
        const permissions = await locationService.requestPermissions();
        if (!permissions.foreground) {
          Alert.alert(
            'Location Required',
            'Agropulse AI needs your location to provide weather forecasts and crop recommendations.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Get current location
      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);

      // Update location on server
      if (user?.id) {
        const response = await locationAPI.updateLocation(user.id, {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
          altitude: currentLocation.altitude,
        });

        // Update location with address details
        if (response.location) {
          setLocation({
            ...currentLocation,
            ...response.location,
          });
        }
      }

      // Start continuous tracking
      await locationService.startWatching(async (newLocation) => {
        setLocation({
          ...newLocation,
          ...location, // Preserve address details
        });
        
        // Update server periodically
        if (user?.id) {
          await locationAPI.updateLocation(user.id, {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            accuracy: newLocation.accuracy,
            altitude: newLocation.altitude,
          });
        }
      });

      setLocationTracking(true);
    } catch (error) {
      console.error('Location tracking error:', error);
      Alert.alert('Location Error', 'Unable to access your location. Please enable location services.');
    }
  };

  const loadWeatherData = async () => {
    try {
      if (!user?.id) return;

      // Get current weather
      const currentWeatherRes = await locationAPI.getCurrentWeather(user.id);
      setWeather(currentWeatherRes.weather);

      // Get 6-month forecast
      const forecastRes = await locationAPI.getWeatherForecast(user.id);
      setForecast(forecastRes.forecast);

    } catch (error) {
      console.error('Weather data error:', error);
    }
  };

  const loadCropRecommendations = async () => {
    try {
      if (!user?.id) return;

      const response = await locationAPI.getCropRecommendations(user.id);
      setCropRecommendations(response.recommendations);

    } catch (error) {
      console.error('Crop recommendations error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeDashboard();
    setRefreshing(false);
  };

  const handleScanSoil = () => {
    if (!location) {
      Alert.alert('Location Required', 'Please enable location services first');
      return;
    }
    navigation.navigate('SoilScan');
  };

  const handleCalculateBudget = () => {
    navigation.navigate('BudgetCalculator', { 
      cropRecommendations: cropRecommendations?.suitable_crops 
    });
  };

  const handleViewFullForecast = () => {
    navigation.navigate('WeatherForecast', { forecast });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Location Card */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Your Location</Text>
            {locationTracking && (
              <Chip icon="radar" mode="flat" style={styles.trackingChip}>
                Tracking
              </Chip>
            )}
          </View>

          {location ? (
            <>
              <Text style={styles.locationText}>
                {location.county || 'Unknown County'}, {location.state || 'Kenya'}
              </Text>
              {location.village && (
                <Text style={styles.locationSubtext}>Village: {location.village}</Text>
              )}
              {location.subcounty && (
                <Text style={styles.locationSubtext}>Sub-County: {location.subcounty}</Text>
              )}
              <Text style={styles.coordsText}>
                📍 {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
              </Text>
              {location.accuracy && (
                <Text style={styles.accuracyText}>
                  Accuracy: ±{Math.round(location.accuracy)}m
                </Text>
              )}

              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate('EditLocation', { currentLocation: location })}
                style={styles.editLocationButton}
                icon="pencil"
                compact
              >
                Edit Location
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.noDataText}>Location not available</Text>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('EditLocation')}
                style={styles.setLocationButton}
                icon="map-marker-plus"
              >
                Set Your Location
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Current Weather Card */}
      {weather && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons 
                name={getWeatherIcon(weather.weather)} 
                size={24} 
                color="#FF9800" 
              />
              <Text style={styles.cardTitle}>Current Weather</Text>
            </View>

            <View style={styles.weatherContent}>
              <View style={styles.tempContainer}>
                <Text style={styles.temperature}>
                  {Math.round(weather.temperature)}°C
                </Text>
                <Text style={styles.weatherDescription}>
                  {weather.description}
                </Text>
              </View>

              <View style={styles.weatherDetails}>
                <WeatherDetailItem 
                  icon="water-percent" 
                  label="Humidity" 
                  value={`${weather.humidity}%`} 
                />
                <WeatherDetailItem 
                  icon="weather-windy" 
                  label="Wind" 
                  value={`${weather.wind_speed} m/s`} 
                />
                <WeatherDetailItem 
                  icon="eye" 
                  label="Visibility" 
                  value={`${weather.visibility} km`} 
                />
                <WeatherDetailItem 
                  icon="cloud" 
                  label="Clouds" 
                  value={`${weather.clouds}%`} 
                />
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 6-Month Forecast Preview */}
      {forecast && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="calendar-range" size={24} color="#2196F3" />
              <Text style={styles.cardTitle}>Weather Forecast</Text>
            </View>

            <Text style={styles.forecastSubtitle}>
              Next 6 Months AI Prediction
            </Text>

            {/* Climate Pattern Summary */}
            {forecast.climate_pattern && (
              <View style={styles.climatePattern}>
                <Chip icon="weather-partly-cloudy" mode="outlined" style={styles.patternChip}>
                  {forecast.climate_pattern.climate_type}
                </Chip>
                <Chip 
                  icon={getRainIcon(forecast.climate_pattern.total_rainfall_6months)} 
                  mode="outlined" 
                  style={styles.patternChip}
                >
                  {forecast.climate_pattern.total_rainfall_6months}mm rain
                </Chip>
                <Chip 
                  icon="alert" 
                  mode="outlined" 
                  style={[
                    styles.patternChip,
                    { borderColor: getDroughtColor(forecast.climate_pattern.drought_risk) }
                  ]}
                >
                  {forecast.climate_pattern.drought_risk}
                </Chip>
              </View>
            )}

            {/* Next 3 Months Preview */}
            {forecast.monthly_forecast && forecast.monthly_forecast.slice(0, 3).map((month, index) => (
              <View key={index} style={styles.monthPreview}>
                <Text style={styles.monthName}>{month.month}</Text>
                <View style={styles.monthDetails}>
                  <Text style={styles.monthTemp}>
                    🌡️ {Math.round(month.avg_temperature)}°C
                  </Text>
                  <Text style={styles.monthRain}>
                    💧 {month.rainfall_mm}mm
                  </Text>
                  <Chip 
                    mode="flat" 
                    style={styles.seasonChip}
                    textStyle={styles.seasonText}
                  >
                    {month.season}
                  </Chip>
                </View>
              </View>
            ))}

            <Button 
              mode="outlined" 
              onPress={handleViewFullForecast}
              style={styles.viewMoreButton}
            >
              View Full 6-Month Forecast
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Crop Recommendations */}
      {cropRecommendations && cropRecommendations.suitable_crops && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="sprout" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>Recommended Crops</Text>
            </View>

            <Text style={styles.recommendationSubtitle}>
              Best crops for {cropRecommendations.location?.county} region
            </Text>
            <Text style={styles.altitudeText}>
              {cropRecommendations.altitude_zone}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {cropRecommendations.suitable_crops.slice(0, 4).map((crop, index) => (
                <CropCard key={index} crop={crop} />
              ))}
            </ScrollView>

            {cropRecommendations.planting_recommendation && (
              <View style={styles.plantingAdvice}>
                <Text style={styles.adviceTitle}>🌱 Planting Advice</Text>
                <Text style={styles.adviceText}>
                  {cropRecommendations.planting_recommendation.immediate_action}
                </Text>
                <Text style={styles.adviceMonth}>
                  Best time: {cropRecommendations.planting_recommendation.best_planting_month}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            <ActionButton
              icon="camera"
              label="Scan Soil"
              color="#795548"
              onPress={handleScanSoil}
            />
            <ActionButton
              icon="calculator"
              label="Budget Calculator"
              color="#FF5722"
              onPress={handleCalculateBudget}
            />
            <ActionButton
              icon="chart-line"
              label="Track Growth"
              color="#009688"
              onPress={() => navigation.navigate('GrowthTracking')}
            />
            <ActionButton
              icon="store"
              label="Marketplace"
              color="#673AB7"
              onPress={() => navigation.navigate('Marketplace')}
            />
            <ActionButton
              icon="swap-horizontal"
              label="Exchange"
              color="#4CAF50"
              onPress={() => navigation.navigate('ExchangeMarketplace', { 
                farmId: user?.farmId || 'default_farm_id',
                userId: user?.id || 'default_user_id',
                userType: 'farmer'
              })}
            />
            <ActionButton
              icon="brain"
              label="AI Intelligence"
              color="#2196F3"
              onPress={() => navigation.navigate('AIFarmIntelligence', {
                farmId: user?.farmId || 'default_farm_id'
              })}
            />
            <ActionButton
              icon="link-variant"
              label="Market Linkages"
              color="#FF9800"
              onPress={() => navigation.navigate('MarketLinkages', {
                farmId: user?.farmId || 'default_farm_id',
                userId: user?.id || 'default_user_id'
              })}
            />
            <ActionButton
              icon="quadcopter"
              label="Drone Intelligence"
              color="#2196F3"
              onPress={() => navigation.navigate('DroneIntelligence', {
                farmId: user?.farmId || 'default_farm_id',
                userId: user?.id || 'default_user_id'
              })}
            />
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

// Helper Components

const WeatherDetailItem = ({ icon, label, value }) => (
  <View style={styles.weatherDetailItem}>
    <MaterialCommunityIcons name={icon} size={20} color="#666" />
    <Text style={styles.weatherDetailLabel}>{label}</Text>
    <Text style={styles.weatherDetailValue}>{value}</Text>
  </View>
);

const CropCard = ({ crop }) => (
  <View style={styles.cropCard}>
    <View style={styles.cropHeader}>
      <MaterialCommunityIcons name="leaf" size={32} color="#4CAF50" />
      <Text style={styles.cropName}>{crop.crop}</Text>
    </View>
    <Chip 
      mode="flat" 
      style={[
        styles.suitabilityChip,
        { backgroundColor: getSuitabilityColor(crop.suitability) }
      ]}
      textStyle={styles.suitabilityText}
    >
      {crop.suitability}
    </Chip>
    <Text style={styles.cropDetail}>⏱️ {crop.maturity}</Text>
    <Text style={styles.cropDetail}>📊 {crop.expected_yield}</Text>
    <Text style={styles.cropPrice}>💰 {crop.market_price}</Text>
  </View>
);

const ActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon} size={32} color="#FFF" />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// Helper Functions

const getWeatherIcon = (weather) => {
  const icons = {
    Clear: 'weather-sunny',
    Clouds: 'weather-cloudy',
    Rain: 'weather-rainy',
    Drizzle: 'weather-partly-rainy',
    Thunderstorm: 'weather-lightning',
    Snow: 'weather-snowy',
    Mist: 'weather-fog',
  };
  return icons[weather] || 'weather-cloudy';
};

const getRainIcon = (rainfall) => {
  if (rainfall > 800) return 'weather-pouring';
  if (rainfall > 400) return 'weather-rainy';
  return 'weather-partly-rainy';
};

const getDroughtColor = (risk) => {
  if (risk.includes('High')) return '#F44336';
  if (risk.includes('Moderate')) return '#FF9800';
  return '#4CAF50';
};

const getSuitabilityColor = (suitability) => {
  if (suitability === 'Excellent') return '#C8E6C9';
  if (suitability === 'Good') return '#FFF9C4';
  return '#FFCCBC';
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  card: {
    margin: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  trackingChip: {
    height: 28,
    backgroundColor: '#E8F5E9',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  editLocationButton: {
    marginTop: 12,
  },
  setLocationButton: {
    marginTop: 12,
  },
  weatherContent: {
    marginTop: 8,
  },
  tempContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  weatherDescription: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  weatherDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  weatherDetailItem: {
    alignItems: 'center',
    width: width / 5,
    marginBottom: 12,
  },
  weatherDetailLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  weatherDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  forecastSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  climatePattern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  patternChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  monthPreview: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  monthName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  monthDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  monthTemp: {
    fontSize: 12,
    marginRight: 12,
  },
  monthRain: {
    fontSize: 12,
    marginRight: 12,
  },
  seasonChip: {
    height: 24,
    backgroundColor: '#E3F2FD',
  },
  seasonText: {
    fontSize: 10,
  },
  viewMoreButton: {
    marginTop: 12,
  },
  recommendationSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  altitudeText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  cropCard: {
    width: 160,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cropHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  cropName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  suitabilityChip: {
    alignSelf: 'center',
    height: 24,
    marginBottom: 8,
  },
  suitabilityText: {
    fontSize: 10,
  },
  cropDetail: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  cropPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  plantingAdvice: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  adviceMonth: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  bottomSpace: {
    height: 24,
  },
});
