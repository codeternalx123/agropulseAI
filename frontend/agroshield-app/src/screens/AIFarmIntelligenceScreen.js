import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Card, Button, Chip, ActivityIndicator, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api';
import aiFarmIntelligenceService from '../services/aiFarmIntelligenceService';
import * as Location from 'expo-location';

/**
 * AI Farm Intelligence Dashboard
 * 
 * Features:
 * 1. GPS-Based Micro-Climate Profiling - Instant satellite NDVI analysis
 * 2. Farming Zone Classification (5 zones)
 * 3. Computer Vision Soil Analysis - AI fertility scoring (0-10)
 * 4. Crop Variety Risk Assessment - Success rate predictions
 * 5. Location Intelligence - Elevation, climate risks, growth adjustments
 * 6. Community Insights - Nearby farmer success rates
 */

const { width } = Dimensions.get('window');

export default function AIFarmIntelligenceScreen({ navigation, route }) {
  const { user } = useAuth();
  const { farmId, latitude: routeLat, longitude: routeLon, soilScanData } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [microClimate, setMicroClimate] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [soilAnalysis, setSoilAnalysis] = useState(null);
  const [cropRisks, setCropRisks] = useState([]);
  const [locationIntel, setLocationIntel] = useState(null);
  const [communityData, setCommunityData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    loadAIIntelligence();
  }, []);

  const loadAIIntelligence = async () => {
    try {
      setLoading(true);

      // Get current location if not provided
      let lat = routeLat;
      let lon = routeLon;

      if (!lat || !lon) {
        const location = await getCurrentLocation();
        if (location) {
          lat = location.latitude;
          lon = location.longitude;
          setCurrentLocation(location);
        } else {
          Alert.alert('Location Required', 'Please enable location services to use AI Farm Intelligence');
          return;
        }
      }

      // Load all AI intelligence data from real sources
      await Promise.all([
        loadMicroClimateProfile(lat, lon),
        loadNDVIAnalysis(lat, lon),
        loadSoilIntelligence(),
        loadLocationIntelligence(lat, lon),
        loadCommunityInsights(lat, lon),
      ]);

      // Load crop risk assessment after we have microclimate and soil data
      await loadCropRiskAssessment();

    } catch (error) {
      console.error('Error loading AI intelligence:', error);
      Alert.alert('Error', 'Failed to load AI farm intelligence. Using offline estimates.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  };

  const loadMicroClimateProfile = async (lat, lon) => {
    try {
      const data = await aiFarmIntelligenceService.getMicroClimateProfile(farmId, lat, lon);
      setMicroClimate(data);
    } catch (error) {
      console.error('Error loading micro-climate:', error);
    }
  };

  const loadNDVIAnalysis = async (lat, lon) => {
    try {
      const data = await aiFarmIntelligenceService.getNDVIAnalysis(farmId, lat, lon);
      setNdviData(data);
    } catch (error) {
      console.error('Error loading NDVI:', error);
    }
  };

  const loadSoilIntelligence = async () => {
    try {
      // Use provided soil scan data if available, otherwise fetch from backend
      const data = await aiFarmIntelligenceService.getSoilAnalysis(farmId, soilScanData);
      setSoilAnalysis(data);
    } catch (error) {
      console.error('Error loading soil analysis:', error);
    }
  };

  const loadCropRiskAssessment = async () => {
    try {
      const risks = await aiFarmIntelligenceService.getCropRiskAssessment(
        farmId,
        microClimate,
        soilAnalysis
      );
      setCropRisks(risks);
    } catch (error) {
      console.error('Error loading crop risks:', error);
    }
  };

  const loadLocationIntelligence = async (lat, lon) => {
    try {
      const data = await aiFarmIntelligenceService.getLocationIntelligence(farmId, lat, lon);
      setLocationIntel(data);
    } catch (error) {
      console.error('Error loading location intelligence:', error);
    }
  };

  const loadCommunityInsights = async (lat, lon) => {
    try {
      const data = await aiFarmIntelligenceService.getCommunityInsights(farmId, lat, lon);
      setCommunityData(data);
    } catch (error) {
      console.error('Error loading community data:', error);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low':
        return '#66BB6A';
      case 'moderate':
        return '#FFA726';
      case 'high':
        return '#EF5350';
      default:
        return '#9E9E9E';
    }
  };

  const getNDVIColor = (value) => {
    if (value >= 0.7) return '#66BB6A'; // Healthy
    if (value >= 0.5) return '#FFA726'; // Moderate
    return '#EF5350'; // Poor
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Analyzing farm intelligence...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>AI Farm Intelligence</Text>
              <Text style={styles.subtitle}>Powered by satellite & community data</Text>
            </View>
            <MaterialCommunityIcons name="brain" size={40} color="#4CAF50" />
          </View>

          {/* Data Sources */}
          <View style={styles.dataSourcesRow}>
            <Chip
              icon="map-marker"
              style={styles.dataSourceChip}
              textStyle={styles.dataSourceText}
            >
              GPS
            </Chip>
            <Chip
              icon="satellite-variant"
              style={styles.dataSourceChip}
              textStyle={styles.dataSourceText}
            >
              Satellite
            </Chip>
            {soilScanData && (
              <Chip
                icon="camera"
                style={styles.dataSourceChip}
                textStyle={styles.dataSourceText}
              >
                Soil Scan
              </Chip>
            )}
            <Chip
              icon="account-group"
              style={styles.dataSourceChip}
              textStyle={styles.dataSourceText}
            >
              Community
            </Chip>
          </View>

          {microClimate?.calculatedLocally && (
            <View style={styles.offlineBadge}>
              <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#FF9800" />
              <Text style={styles.offlineText}>Using offline climate estimates</Text>
            </View>
          )}

          {currentLocation && (
            <Text style={styles.locationText}>
              📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)} (±{Math.round(currentLocation.accuracy)}m)
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Micro-Climate Profile */}
      {microClimate && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="earth" size={28} color="#2196F3" />
              <Text style={styles.cardTitle}>Micro-Climate Profile</Text>
            </View>

            <View style={styles.zoneBox}>
              <Text style={styles.zoneName}>{microClimate.zoneName}</Text>
              <Text style={styles.zoneCharacteristics}>{microClimate.characteristics}</Text>
              <Chip
                style={[styles.confidenceChip, { backgroundColor: '#E3F2FD' }]}
                textStyle={{ color: '#1976D2', fontWeight: 'bold' }}
              >
                {microClimate.confidence}% confidence
              </Chip>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="elevation-rise" size={24} color="#757575" />
                <Text style={styles.statValue}>{microClimate.elevation}m</Text>
                <Text style={styles.statLabel}>Elevation</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="water" size={24} color="#2196F3" />
                <Text style={styles.statValue}>{microClimate.annualRainfall}mm</Text>
                <Text style={styles.statLabel}>Annual Rain</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="thermometer" size={24} color="#FF6B6B" />
                <Text style={styles.statValue}>{microClimate.avgTemperature}°C</Text>
                <Text style={styles.statLabel}>Avg Temp</Text>
              </View>
            </View>

            <Text style={styles.sectionSubtitle}>Suitable Crops:</Text>
            <View style={styles.chipRow}>
              {microClimate.suitableFor.map((crop, index) => (
                <Chip key={index} style={styles.cropChip} textStyle={{ fontSize: 13 }}>
                  {crop}
                </Chip>
              ))}
            </View>

            <Text style={styles.sectionSubtitle}>Climate Risks:</Text>
            {microClimate.climateRisks.map((risk, index) => (
              <View key={index} style={styles.riskRow}>
                <View style={styles.riskLeft}>
                  <Text style={styles.riskType}>
                    {risk.type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <ProgressBar
                    progress={risk.probability / 100}
                    color={getRiskColor(risk.severity)}
                    style={styles.riskBar}
                  />
                </View>
                <Chip
                  style={{ backgroundColor: getRiskColor(risk.severity) + '20' }}
                  textStyle={{ color: getRiskColor(risk.severity), fontSize: 11 }}
                >
                  {risk.probability}%
                </Chip>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* NDVI Satellite Analysis */}
      {ndviData && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="satellite-variant" size={28} color="#FF9800" />
              <Text style={styles.cardTitle}>Satellite NDVI Analysis</Text>
            </View>

            <View style={styles.ndviScoreBox}>
              <Text style={[styles.ndviScore, { color: getNDVIColor(ndviData.current) }]}>
                {ndviData.current.toFixed(2)}
              </Text>
              <View style={styles.ndviLabels}>
                <Text style={styles.ndviLabel}>NDVI Index</Text>
                <Chip
                  icon={
                    ndviData.trend === 'improving'
                      ? 'trending-up'
                      : ndviData.trend === 'declining'
                      ? 'trending-down'
                      : 'trending-neutral'
                  }
                  style={{ backgroundColor: '#E8F5E9' }}
                  textStyle={{ color: '#2E7D32', fontSize: 12 }}
                >
                  {ndviData.trend}
                </Chip>
              </View>
            </View>

            <Text style={styles.ndviInterpretation}>{ndviData.interpretation}</Text>

            <View style={styles.ndviComparisonRow}>
              <View style={styles.ndviComparisonItem}>
                <Text style={styles.ndviComparisonValue}>{ndviData.comparison.nearbyAverage.toFixed(2)}</Text>
                <Text style={styles.ndviComparisonLabel}>Nearby Avg</Text>
              </View>
              <View style={styles.ndviComparisonItem}>
                <Text style={styles.ndviComparisonValue}>{ndviData.comparison.seasonalNormal.toFixed(2)}</Text>
                <Text style={styles.ndviComparisonLabel}>Seasonal Normal</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information" size={20} color="#1976D2" />
              <Text style={styles.infoText}>
                NDVI measures vegetation health using satellite imagery. 0.6-0.9 indicates healthy crops.
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* AI Soil Analysis */}
      {soilAnalysis ? (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="layers-triple" size={28} color="#795548" />
              <Text style={styles.cardTitle}>Computer Vision Soil Analysis</Text>
            </View>

            <View style={styles.fertilityBox}>
              <View style={styles.fertilityLeft}>
                <Text style={styles.fertilityScore}>{soilAnalysis.fertilityScore.toFixed(1)}</Text>
                <Text style={styles.fertilityLabel}>/ 10</Text>
              </View>
              <View style={styles.fertilityRight}>
                <Text style={styles.fertilityTitle}>Fertility Score</Text>
                <ProgressBar
                  progress={soilAnalysis.fertilityScore / 10}
                  color="#66BB6A"
                  style={styles.fertilityBar}
                />
                <Text style={styles.soilTypeText}>
                  Probable type: <Text style={styles.soilTypeBold}>{soilAnalysis.soilType}</Text> ({soilAnalysis.soilTypeProbability}%)
                </Text>
              </View>
            </View>

            <View style={styles.nutrientRow}>
              <View style={[styles.nutrientBox, { borderColor: getStatusColor(soilAnalysis.nitrogenStatus) }]}>
                <Text style={styles.nutrientSymbol}>N</Text>
                <Text style={[styles.nutrientStatus, { color: getStatusColor(soilAnalysis.nitrogenStatus) }]}>
                  {soilAnalysis.nitrogenStatus}
                </Text>
                <Text style={styles.nutrientName}>Nitrogen</Text>
              </View>
              <View style={[styles.nutrientBox, { borderColor: getStatusColor(soilAnalysis.phosphorusStatus) }]}>
                <Text style={styles.nutrientSymbol}>P</Text>
                <Text style={[styles.nutrientStatus, { color: getStatusColor(soilAnalysis.phosphorusStatus) }]}>
                  {soilAnalysis.phosphorusStatus}
                </Text>
                <Text style={styles.nutrientName}>Phosphorus</Text>
              </View>
              <View style={[styles.nutrientBox, { borderColor: getStatusColor(soilAnalysis.potassiumStatus) }]}>
                <Text style={styles.nutrientSymbol}>K</Text>
                <Text style={[styles.nutrientStatus, { color: getStatusColor(soilAnalysis.potassiumStatus) }]}>
                  {soilAnalysis.potassiumStatus}
                </Text>
                <Text style={styles.nutrientName}>Potassium</Text>
              </View>
            </View>

            <Text style={styles.sectionSubtitle}>AI Recommendations:</Text>
            {soilAnalysis.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationBox}>
                <View style={styles.recommendationHeader}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F57C00" />
                  <Text style={styles.recommendationIssue}>{rec.issue}</Text>
                </View>
                <Text style={styles.recommendationAction}>💡 {rec.action}</Text>
                <View style={styles.recommendationFooter}>
                  <Text style={styles.recommendationImprovement}>📈 {rec.expectedImprovement}</Text>
                  <Text style={styles.recommendationCost}>💰 {rec.cost}</Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="layers-triple" size={28} color="#795548" />
              <Text style={styles.cardTitle}>Computer Vision Soil Analysis</Text>
            </View>

            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="camera-off" size={64} color="#BDBDBD" />
              <Text style={styles.emptyText}>No Soil Analysis Available</Text>
              <Text style={styles.emptySubtext}>
                Scan your soil to get AI-powered fertility analysis and recommendations
              </Text>
              <Button
                mode="contained"
                icon="camera"
                onPress={() => navigation.navigate('SoilScan', { farmId })}
                style={{ marginTop: 16, backgroundColor: '#795548' }}
              >
                Scan Soil Now
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Crop Variety Risk Assessment */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-line" size={28} color="#E91E63" />
            <Text style={styles.cardTitle}>Crop Variety Risk Assessment</Text>
          </View>

          {cropRisks.map((crop, index) => (
            <View key={index} style={styles.cropRiskCard}>
              <View style={styles.cropRiskHeader}>
                <Text style={styles.cropRiskName}>{crop.crop} - {crop.variety}</Text>
                <Chip
                  style={{ backgroundColor: getRiskColor(crop.riskLevel) + '20' }}
                  textStyle={{ color: getRiskColor(crop.riskLevel), fontWeight: 'bold' }}
                >
                  {crop.successRate}% success
                </Chip>
              </View>

              <Text style={styles.cropRiskYield}>Expected: {crop.yieldPotential}</Text>

              <View style={styles.scoreGrid}>
                {crop.reasons.map((reason, idx) => (
                  <View key={idx} style={styles.scoreItem}>
                    <View style={styles.scoreHeader}>
                      <Text style={styles.scoreFactor}>{reason.factor}</Text>
                      <Text style={[styles.scoreValue, { color: getScoreColor(reason.score) }]}>
                        {reason.score}/10
                      </Text>
                    </View>
                    <Text style={styles.scoreComment}>{reason.comment}</Text>
                  </View>
                ))}
              </View>

              {crop.alternatives.length > 0 && (
                <View style={styles.alternativesBox}>
                  <Text style={styles.alternativesTitle}>⚠️ Better Alternatives:</Text>
                  {crop.alternatives.map((alt, idx) => (
                    <View key={idx} style={styles.alternativeItem}>
                      <Text style={styles.alternativeVariety}>
                        {alt.variety} ({alt.successRate}% success)
                      </Text>
                      <Text style={styles.alternativeReason}>→ {alt.reason}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Location Intelligence */}
      {locationIntel && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map-marker-star" size={28} color="#9C27B0" />
              <Text style={styles.cardTitle}>Location Intelligence</Text>
            </View>

            <View style={styles.locationGrid}>
              <View style={styles.locationItem}>
                <MaterialCommunityIcons name="elevation-rise" size={24} color="#757575" />
                <Text style={styles.locationValue}>{locationIntel.elevation}m</Text>
                <Text style={styles.locationLabel}>{locationIntel.elevationZone}</Text>
              </View>
            </View>

            <Text style={styles.sectionSubtitle}>Risk Assessment:</Text>
            <View style={styles.riskGrid}>
              <View style={styles.riskGridItem}>
                <MaterialCommunityIcons name="snowflake" size={20} color="#2196F3" />
                <Text style={styles.riskGridLabel}>Frost</Text>
                <Text style={styles.riskGridValue}>{locationIntel.frostRisk}</Text>
              </View>
              <View style={styles.riskGridItem}>
                <MaterialCommunityIcons name="weather-sunny-alert" size={20} color="#FF9800" />
                <Text style={styles.riskGridLabel}>Drought</Text>
                <Text style={styles.riskGridValue}>{locationIntel.droughtRisk}</Text>
              </View>
              <View style={styles.riskGridItem}>
                <MaterialCommunityIcons name="blur" size={20} color="#4CAF50" />
                <Text style={styles.riskGridLabel}>Fungal</Text>
                <Text style={styles.riskGridValue}>{locationIntel.fungalDiseaseRisk}</Text>
              </View>
            </View>

            <Text style={styles.sectionSubtitle}>Growth Model Adjustments:</Text>
            {locationIntel.growthModelAdjustments.map((adjustment, index) => (
              <View key={index} style={styles.adjustmentItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#757575" />
                <Text style={styles.adjustmentText}>{adjustment}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Community Insights */}
      {communityData && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account-group" size={28} color="#00BCD4" />
              <Text style={styles.cardTitle}>Community Insights</Text>
            </View>

            <View style={styles.communityStats}>
              <View style={styles.communityStatItem}>
                <Text style={styles.communityStatValue}>{communityData.within5km}</Text>
                <Text style={styles.communityStatLabel}>Farmers within 5km</Text>
              </View>
              <View style={styles.communityStatItem}>
                <Text style={styles.communityStatValue}>{communityData.topCrops.length}</Text>
                <Text style={styles.communityStatLabel}>Top crops grown</Text>
              </View>
            </View>

            <Text style={styles.sectionSubtitle}>Popular Crops in Your Area:</Text>
            {communityData.topCrops.map((crop, index) => (
              <View key={index} style={styles.communityCropItem}>
                <View style={styles.communityCropHeader}>
                  <Text style={styles.communityCropName}>{crop.crop}</Text>
                  <Chip
                    style={{ backgroundColor: '#E8F5E9' }}
                    textStyle={{ color: '#2E7D32', fontSize: 11 }}
                  >
                    {crop.successRate}% success
                  </Chip>
                </View>
                <Text style={styles.communityCropDetails}>
                  {crop.farmers} farmers • Avg yield: {crop.avgYield}
                </Text>
              </View>
            ))}

            {communityData.recentChallenges.length > 0 && (
              <>
                <Text style={styles.sectionSubtitle}>Recent Pest/Disease Reports:</Text>
                {communityData.recentChallenges.map((challenge, index) => (
                  <View key={index} style={styles.challengeItem}>
                    <MaterialCommunityIcons name="alert-octagon" size={20} color="#F57C00" />
                    <View style={styles.challengeInfo}>
                      <Text style={styles.challengeIssue}>{challenge.issue}</Text>
                      <Text style={styles.challengeDetails}>
                        {challenge.reports} reports • {challenge.date}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            icon="refresh"
            onPress={loadAIIntelligence}
            style={styles.actionButton}
          >
            Refresh Analysis
          </Button>
          <Button
            mode="outlined"
            icon="map"
            onPress={() => navigation.navigate('FarmDetail', { farmId })}
            style={styles.actionButton}
          >
            View Farm Details
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'high':
      return '#66BB6A';
    case 'moderate':
      return '#FFA726';
    case 'low':
      return '#EF5350';
    default:
      return '#9E9E9E';
  }
};

const getScoreColor = (score) => {
  if (score >= 8) return '#66BB6A';
  if (score >= 6) return '#FFA726';
  return '#EF5350';
};

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
  dataSourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  dataSourceChip: {
    backgroundColor: '#E8F5E9',
  },
  dataSourceText: {
    fontSize: 11,
    color: '#2E7D32',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  offlineText: {
    fontSize: 12,
    color: '#E65100',
    marginLeft: 6,
  },
  locationText: {
    fontSize: 11,
    color: '#757575',
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginLeft: 12,
  },
  zoneBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  zoneName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  zoneCharacteristics: {
    fontSize: 14,
    color: '#424242',
    marginTop: 4,
    marginBottom: 8,
  },
  confidenceChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cropChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#E8F5E9',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  riskLeft: {
    flex: 1,
    marginRight: 12,
  },
  riskType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 4,
  },
  riskBar: {
    height: 6,
    borderRadius: 3,
  },
  ndviScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  ndviScore: {
    fontSize: 48,
    fontWeight: 'bold',
    marginRight: 16,
  },
  ndviLabels: {
    flex: 1,
  },
  ndviLabel: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  ndviInterpretation: {
    fontSize: 14,
    color: '#424242',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  ndviComparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  ndviComparisonItem: {
    alignItems: 'center',
  },
  ndviComparisonValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  ndviComparisonLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#424242',
    marginLeft: 8,
  },
  fertilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  fertilityLeft: {
    marginRight: 16,
  },
  fertilityScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#66BB6A',
  },
  fertilityLabel: {
    fontSize: 20,
    color: '#757575',
  },
  fertilityRight: {
    flex: 1,
  },
  fertilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  fertilityBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  soilTypeText: {
    fontSize: 13,
    color: '#616161',
  },
  soilTypeBold: {
    fontWeight: 'bold',
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  nutrientBox: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  nutrientSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  nutrientStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  nutrientName: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  recommendationBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationIssue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginLeft: 8,
  },
  recommendationAction: {
    fontSize: 13,
    color: '#424242',
    marginBottom: 8,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recommendationImprovement: {
    fontSize: 12,
    color: '#388E3C',
  },
  recommendationCost: {
    fontSize: 12,
    color: '#616161',
  },
  cropRiskCard: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  cropRiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cropRiskName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  cropRiskYield: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 12,
  },
  scoreGrid: {
    marginTop: 8,
  },
  scoreItem: {
    marginVertical: 6,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreFactor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  scoreComment: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  alternativesBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  alternativesTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  alternativeItem: {
    marginVertical: 4,
  },
  alternativeVariety: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
  },
  alternativeReason: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 12,
  },
  locationGrid: {
    marginBottom: 16,
  },
  locationItem: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
  },
  locationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginTop: 4,
  },
  locationLabel: {
    fontSize: 13,
    color: '#757575',
    marginTop: 4,
  },
  riskGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  riskGridItem: {
    alignItems: 'center',
  },
  riskGridLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  riskGridValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 2,
  },
  adjustmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  adjustmentText: {
    fontSize: 13,
    color: '#424242',
    marginLeft: 8,
    flex: 1,
  },
  communityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  communityStatItem: {
    alignItems: 'center',
  },
  communityStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ACC1',
  },
  communityStatLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    textAlign: 'center',
  },
  communityCropItem: {
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 6,
    marginVertical: 6,
  },
  communityCropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  communityCropName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  communityCropDetails: {
    fontSize: 12,
    color: '#757575',
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 6,
    marginVertical: 6,
  },
  challengeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  challengeIssue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  challengeDetails: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  actionButton: {
    marginVertical: 6,
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
});
