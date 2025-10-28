/**
 * Soil Analysis Results Screen
 * Displays AI analysis results and recommendations
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Card, Button, Chip, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function SoilAnalysisScreen({ route, navigation }) {
  const { analysis, photos, location } = route.params;

  const handleCalculateBudget = () => {
    navigation.navigate('BudgetCalculator', {
      soilData: analysis,
      recommendedCrops: analysis.suitable_crops,
    });
  };

  const getSoilQualityColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#FFC107';
    return '#F44336';
  };

  const getNutrientLevel = (value) => {
    if (value >= 80) return 'High';
    if (value >= 50) return 'Medium';
    return 'Low';
  };

  const getNutrientColor = (value) => {
    if (value >= 80) return '#4CAF50';
    if (value >= 50) return '#FFC107';
    return '#F44336';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#4CAF50" />
            <Text style={styles.headerTitle}>Soil Analysis Complete</Text>
            <Text style={styles.headerSubtitle}>
              {location ? `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}` : ''}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Soil Quality Score */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Overall Soil Quality</Text>
          
          <View style={styles.scoreContainer}>
            <Text 
              style={[
                styles.qualityScore, 
                { color: getSoilQualityColor(analysis.soil_quality_score || 70) }
              ]}
            >
              {analysis.soil_quality_score || 70}
            </Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>

          <ProgressBar 
            progress={(analysis.soil_quality_score || 70) / 100} 
            color={getSoilQualityColor(analysis.soil_quality_score || 70)}
            style={styles.progressBar}
          />

          <Chip 
            mode="flat" 
            style={[
              styles.qualityChip,
              { backgroundColor: `${getSoilQualityColor(analysis.soil_quality_score || 70)}20` }
            ]}
            textStyle={{ color: getSoilQualityColor(analysis.soil_quality_score || 70) }}
          >
            {analysis.soil_quality || 'Good Quality'}
          </Chip>
        </Card.Content>
      </Card>

      {/* Soil Photos */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Analyzed Photos</Text>
          
          <View style={styles.photosContainer}>
            <View style={styles.photoContainer}>
              <Image source={{ uri: photos.wet }} style={styles.soilPhoto} />
              <Text style={styles.photoLabel}>Wet Soil</Text>
            </View>
            <View style={styles.photoContainer}>
              <Image source={{ uri: photos.dry }} style={styles.soilPhoto} />
              <Text style={styles.photoLabel}>Dry Soil</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Soil Properties */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Soil Properties</Text>

          <View style={styles.propertiesGrid}>
            <PropertyItem 
              icon="water-percent" 
              label="Moisture" 
              value={`${analysis.moisture_content || 45}%`}
              color="#2196F3"
            />
            <PropertyItem 
              icon="ph" 
              label="pH Level" 
              value={analysis.ph_level || '6.5'}
              color="#9C27B0"
            />
            <PropertyItem 
              icon="grain" 
              label="Texture" 
              value={analysis.soil_texture || 'Loamy'}
              color="#795548"
            />
            <PropertyItem 
              icon="palette" 
              label="Color" 
              value={analysis.soil_color || 'Dark Brown'}
              color="#FF5722"
            />
          </View>
        </Card.Content>
      </Card>

      {/* Nutrient Levels */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Nutrient Levels</Text>

          <NutrientBar 
            icon="alpha-n-circle" 
            label="Nitrogen (N)" 
            value={analysis.nitrogen || 65}
            color="#4CAF50"
          />
          <NutrientBar 
            icon="alpha-p-circle" 
            label="Phosphorus (P)" 
            value={analysis.phosphorus || 72}
            color="#FF9800"
          />
          <NutrientBar 
            icon="alpha-k-circle" 
            label="Potassium (K)" 
            value={analysis.potassium || 58}
            color="#F44336"
          />
          <NutrientBar 
            icon="leaf" 
            label="Organic Matter" 
            value={analysis.organic_matter || 80}
            color="#8BC34A"
          />
        </Card.Content>
      </Card>

      {/* Recommendations */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Recommendations</Text>

          {analysis.recommendations?.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <MaterialCommunityIcons 
                name="check-circle-outline" 
                size={20} 
                color="#4CAF50" 
              />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          )) || (
            <>
              <View style={styles.recommendationItem}>
                <MaterialCommunityIcons 
                  name="check-circle-outline" 
                  size={20} 
                  color="#4CAF50" 
                />
                <Text style={styles.recommendationText}>
                  Add organic compost to improve soil structure
                </Text>
              </View>
              <View style={styles.recommendationItem}>
                <MaterialCommunityIcons 
                  name="check-circle-outline" 
                  size={20} 
                  color="#4CAF50" 
                />
                <Text style={styles.recommendationText}>
                  Consider nitrogen-rich fertilizers for better crop yield
                </Text>
              </View>
              <View style={styles.recommendationItem}>
                <MaterialCommunityIcons 
                  name="check-circle-outline" 
                  size={20} 
                  color="#4CAF50" 
                />
                <Text style={styles.recommendationText}>
                  Maintain regular irrigation schedule
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Suitable Crops */}
      {analysis.suitable_crops && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Suitable Crops for Your Soil</Text>
            
            <View style={styles.cropsContainer}>
              {analysis.suitable_crops.slice(0, 6).map((crop, index) => (
                <Chip 
                  key={index}
                  icon="sprout" 
                  mode="outlined"
                  style={styles.cropChip}
                >
                  {crop}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button 
          mode="contained" 
          icon="calculator"
          onPress={handleCalculateBudget}
          style={styles.actionButton}
        >
          Calculate Crop Budget
        </Button>

        <Button 
          mode="outlined"
          icon="download"
          onPress={() => {}}
          style={styles.actionButton}
        >
          Download Report
        </Button>

        <Button 
          mode="text"
          onPress={() => navigation.navigate('FarmerDashboard')}
          style={styles.actionButton}
        >
          Back to Dashboard
        </Button>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

// Helper Components

const PropertyItem = ({ icon, label, value, color }) => (
  <View style={styles.propertyItem}>
    <MaterialCommunityIcons name={icon} size={32} color={color} />
    <Text style={styles.propertyLabel}>{label}</Text>
    <Text style={styles.propertyValue}>{value}</Text>
  </View>
);

const NutrientBar = ({ icon, label, value, color }) => {
  const level = value >= 80 ? 'High' : value >= 50 ? 'Medium' : 'Low';
  const levelColor = value >= 80 ? '#4CAF50' : value >= 50 ? '#FFC107' : '#F44336';

  return (
    <View style={styles.nutrientBar}>
      <View style={styles.nutrientHeader}>
        <View style={styles.nutrientLabelContainer}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
          <Text style={styles.nutrientLabel}>{label}</Text>
        </View>
        <View style={styles.nutrientValueContainer}>
          <Text style={styles.nutrientValue}>{value}%</Text>
          <Chip 
            mode="flat" 
            style={[styles.levelChip, { backgroundColor: `${levelColor}20` }]}
            textStyle={[styles.levelText, { color: levelColor }]}
          >
            {level}
          </Chip>
        </View>
      </View>
      <ProgressBar 
        progress={value / 100} 
        color={color}
        style={styles.nutrientProgress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  card: {
    margin: 12,
    borderRadius: 12,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qualityScore: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 24,
    color: '#999',
    marginBottom: 8,
    marginLeft: 4,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  qualityChip: {
    alignSelf: 'center',
  },
  photosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoContainer: {
    width: '48%',
    alignItems: 'center',
  },
  soilPhoto: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  propertiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  propertyItem: {
    width: '48%',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  propertyLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  propertyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  nutrientBar: {
    marginBottom: 20,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nutrientLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  nutrientValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutrientValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  levelChip: {
    height: 24,
  },
  levelText: {
    fontSize: 10,
  },
  nutrientProgress: {
    height: 8,
    borderRadius: 4,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  recommendationText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    color: '#333',
  },
  cropsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cropChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  actionsContainer: {
    padding: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
  bottomSpace: {
    height: 24,
  },
});
