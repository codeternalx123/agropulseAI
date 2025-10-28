import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { theme, spacing, typography } from '../../theme/theme';
import { farmAPI, uploadPhoto } from '../../services/api';

const SoilAnalysisScreen = ({ route, navigation }) => {
  const { field } = route.params;
  const [loading, setLoading] = useState(false);
  const [wetPhoto, setWetPhoto] = useState(null);
  const [dryPhoto, setDryPhoto] = useState(null);
  const [analysis, setAnalysis] = useState(field.soil_snapshots?.[0] || null);

  const handleTakePhoto = async (type) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'wet') {
        setWetPhoto(result.assets[0].uri);
      } else {
        setDryPhoto(result.assets[0].uri);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!wetPhoto || !dryPhoto) {
      Alert.alert('Photos Required', 'Please take both wet and dry soil photos');
      return;
    }

    setLoading(true);
    try {
      const wetPhotoUrl = await uploadPhoto(wetPhoto);
      const dryPhotoUrl = await uploadPhoto(dryPhoto);

      const result = await farmAPI.addSoilSnapshot(field.id, {
        wet: wetPhotoUrl,
        dry: dryPhotoUrl,
      });

      setAnalysis(result);
      Alert.alert('Success', 'Soil analysis completed!');
    } catch (error) {
      console.error('Error analyzing soil:', error);
      Alert.alert('Error', 'Failed to analyze soil. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Field Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.fieldName}>{field.field_name}</Text>
          <Text style={styles.fieldDetails}>
            {field.field_size_acres} acres • {field.soil_type}
          </Text>
        </Card.Content>
      </Card>

      {/* Photo Capture */}
      <Card style={styles.card}>
        <Card.Title title="Capture Soil Photos" titleStyle={styles.cardTitle} />
        <Card.Content>
          <Text style={styles.instructions}>
            Take photos of soil samples when wet (after rain) and dry for accurate AI analysis
          </Text>

          <View style={styles.photoGrid}>
            <View style={styles.photoContainer}>
              <Text style={styles.photoLabel}>Wet Soil</Text>
              {wetPhoto ? (
                <Image source={{ uri: wetPhoto }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons
                    name="water"
                    size={48}
                    color="#5A9BD5"
                  />
                </View>
              )}
              <Button
                mode="outlined"
                icon="camera"
                onPress={() => handleTakePhoto('wet')}
                style={styles.photoButton}
              >
                {wetPhoto ? 'Retake' : 'Take Photo'}
              </Button>
            </View>

            <View style={styles.photoContainer}>
              <Text style={styles.photoLabel}>Dry Soil</Text>
              {dryPhoto ? (
                <Image source={{ uri: dryPhoto }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons
                    name="weather-sunny"
                    size={48}
                    color="#F4A460"
                  />
                </View>
              )}
              <Button
                mode="outlined"
                icon="camera"
                onPress={() => handleTakePhoto('dry')}
                style={styles.photoButton}
              >
                {dryPhoto ? 'Retake' : 'Take Photo'}
              </Button>
            </View>
          </View>

          <Button
            mode="contained"
            onPress={handleAnalyze}
            loading={loading}
            disabled={loading || !wetPhoto || !dryPhoto}
            style={styles.analyzeButton}
            contentStyle={styles.buttonContent}
          >
            Analyze Soil with AI
          </Button>
        </Card.Content>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* ML Prediction Section */}
          {analysis.ml_prediction && (
            <Card style={styles.card}>
              <Card.Title title="🤖 ML Soil Classification" titleStyle={styles.cardTitle} />
              <Card.Content>
                <View style={styles.mlHeader}>
                  <MaterialCommunityIcons
                    name="brain"
                    size={32}
                    color="#6B8E23"
                  />
                  <View style={styles.mlInfo}>
                    <Text style={styles.soilType}>{analysis.soil_type?.toUpperCase()}</Text>
                    <View style={styles.confidenceRow}>
                      <Text style={styles.confidenceLabel}>Confidence:</Text>
                      <Text style={styles.confidenceValue}>
                        {(analysis.ml_confidence * 100).toFixed(1)}%
                      </Text>
                    </View>
                    {analysis.ml_prediction.model_used && (
                      <Text style={styles.modelText}>
                        Model: {analysis.ml_prediction.model_used}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Soil Characteristics */}
                {analysis.characteristics && (
                  <View style={styles.characteristicsSection}>
                    <Text style={styles.sectionTitle}>Characteristics:</Text>
                    <View style={styles.charGrid}>
                      {Object.entries(analysis.characteristics).map(([key, value]) => (
                        <View key={key} style={styles.charItem}>
                          <Text style={styles.charLabel}>{key.replace('_', ' ')}:</Text>
                          <Text style={styles.charValue}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Fertility Estimate */}
                {analysis.fertility_estimate && (
                  <View style={styles.fertilitySection}>
                    <Text style={styles.sectionTitle}>Fertility Estimate:</Text>
                    <View style={styles.fertilityBar}>
                      <View
                        style={[
                          styles.fertilityFill,
                          {
                            width: `${analysis.fertility_estimate.fertility_score * 100}%`,
                            backgroundColor:
                              analysis.fertility_estimate.fertility_score > 0.7
                                ? theme.colors.success
                                : analysis.fertility_estimate.fertility_score > 0.4
                                ? theme.colors.accent
                                : theme.colors.error,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.fertilityText}>
                      {analysis.fertility_estimate.description} ({(analysis.fertility_estimate.fertility_score * 100).toFixed(0)}%)
                    </Text>
                  </View>
                )}

                {/* Crop Recommendations */}
                {analysis.recommendations?.suitable_crops && (
                  <View style={styles.cropsSection}>
                    <Text style={styles.sectionTitle}>🌾 Suitable Crops:</Text>
                    <View style={styles.cropsList}>
                      {analysis.recommendations.suitable_crops.map((crop, index) => (
                        <Chip key={index} style={styles.cropChip}>
                          {crop}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}

                {/* Amendments */}
                {analysis.recommendations?.amendments && (
                  <View style={styles.amendmentsSection}>
                    <Text style={styles.sectionTitle}>💊 Recommended Amendments:</Text>
                    {analysis.recommendations.amendments.map((amendment, index) => (
                      <View key={index} style={styles.amendmentItem}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={18}
                          color="#6B8E23"
                        />
                        <Text style={styles.amendmentText}>{amendment}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          <Card style={styles.card}>
            <Card.Title title="Soil Texture Analysis" titleStyle={styles.cardTitle} />
            <Card.Content>
              <View style={styles.textureRow}>
                <View style={styles.textureItem}>
                  <Text style={styles.textureLabel}>Clay</Text>
                  <Text style={styles.textureValue}>
                    {analysis.ai_analysis?.clay_percent || 0}%
                  </Text>
                </View>
                <View style={styles.textureItem}>
                  <Text style={styles.textureLabel}>Sand</Text>
                  <Text style={styles.textureValue}>
                    {analysis.ai_analysis?.sand_percent || 0}%
                  </Text>
                </View>
                <View style={styles.textureItem}>
                  <Text style={styles.textureLabel}>Silt</Text>
                  <Text style={styles.textureValue}>
                    {analysis.ai_analysis?.silt_percent || 0}%
                  </Text>
                </View>
              </View>
              <View style={styles.textureClassification}>
                <Text style={styles.classificationLabel}>Texture Class:</Text>
                <Chip style={styles.classificationChip}>
                  {analysis.ai_analysis?.texture_class || 'Unknown'}
                </Chip>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Nutrient Levels" titleStyle={styles.cardTitle} />
            <Card.Content>
              <NutrientBar
                label="Nitrogen (N)"
                level={analysis.ai_analysis?.nitrogen || 'medium'}
              />
              <NutrientBar
                label="Phosphorus (P)"
                level={analysis.ai_analysis?.phosphorus || 'medium'}
              />
              <NutrientBar
                label="Potassium (K)"
                level={analysis.ai_analysis?.potassium || 'medium'}
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Recommendations" titleStyle={styles.cardTitle} />
            <Card.Content>
              <View style={styles.recommendations}>
                {analysis.ai_analysis?.recommendations?.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color="#6B8E23"
                    />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const NutrientBar = ({ label, level }) => {
  const getColor = () => {
    if (level === 'high') return '#6B8E23'; // Olive green
    if (level === 'medium') return '#D4A574'; // Tan/wheat
    return '#A0826D'; // Brown
  };

  const getWidth = () => {
    if (level === 'high') return '100%';
    if (level === 'medium') return '60%';
    return '30%';
  };

  return (
    <View style={styles.nutrientBar}>
      <View style={styles.nutrientHeader}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <Chip style={[styles.levelChip, { backgroundColor: getColor() + '30' }]}>
          <Text style={[styles.levelText, { color: getColor() }]}>
            {level.toUpperCase()}
          </Text>
        </Chip>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: getWidth(), backgroundColor: getColor() }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3F0',
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    ...typography.h3,
    fontWeight: '600',
    color: '#3E2723',
    letterSpacing: 0.3,
  },
  fieldName: {
    ...typography.h3,
    fontWeight: '700',
    color: '#2C1810',
    letterSpacing: 0.5,
  },
  fieldDetails: {
    ...typography.caption,
    color: '#8B7355',
    marginTop: spacing.xs,
    fontSize: 13,
  },
  instructions: {
    ...typography.body,
    color: '#5D4E37',
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
  photoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  photoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  photoLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1,
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D4C5B9',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E8DED2',
  },
  photoButton: {
    width: '100%',
    borderRadius: 8,
    borderColor: '#8B7355',
  },
  analyzeButton: {
    marginTop: spacing.md,
    borderRadius: 12,
    backgroundColor: '#6B8E23',
    elevation: 2,
  },
  buttonContent: {
    paddingVertical: spacing.sm + 2,
  },
  textureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  textureItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  textureLabel: {
    ...typography.caption,
    color: '#8B7355',
    marginBottom: spacing.xs,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textureValue: {
    ...typography.h2,
    fontWeight: '700',
    color: '#6B8E23',
    fontSize: 28,
  },
  textureClassification: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderColor: '#E8DED2',
    marginTop: spacing.xs,
  },
  classificationLabel: {
    ...typography.body,
    fontWeight: '600',
    color: '#3E2723',
    marginRight: spacing.sm,
    fontSize: 13,
  },
  classificationChip: {
    backgroundColor: '#8B7355',
    paddingHorizontal: spacing.md,
  },
  nutrientBar: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nutrientLabel: {
    ...typography.body,
    fontWeight: '600',
    color: '#3E2723',
    fontSize: 14,
  },
  levelChip: {
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
  },
  levelText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E8DED2',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  recommendations: {
    marginTop: spacing.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  recommendationText: {
    ...typography.body,
    color: '#5D4E37',
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
    fontSize: 13,
  },
  mlHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'center',
    backgroundColor: '#F9F7F4',
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6B8E23',
  },
  mlInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  soilType: {
    ...typography.h3,
    fontWeight: '700',
    color: '#2C1810',
    textTransform: 'capitalize',
    fontSize: 20,
    letterSpacing: 0.5,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  confidenceLabel: {
    ...typography.caption,
    color: '#8B7355',
    marginRight: spacing.xs,
    fontSize: 12,
  },
  confidenceValue: {
    ...typography.body,
    fontWeight: '700',
    color: '#6B8E23',
    fontSize: 15,
  },
  modelText: {
    ...typography.caption,
    color: '#A0826D',
    fontStyle: 'italic',
    marginTop: spacing.xs,
    fontSize: 11,
  },
  characteristicsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E8DED2',
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: '#3E2723',
    marginBottom: spacing.sm,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  charGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  charItem: {
    width: '48%',
    marginBottom: spacing.sm,
    backgroundColor: '#FAF8F5',
    padding: spacing.sm,
    borderRadius: 8,
  },
  charLabel: {
    ...typography.caption,
    color: '#8B7355',
    textTransform: 'capitalize',
    fontSize: 11,
    marginBottom: 2,
  },
  charValue: {
    ...typography.body,
    fontWeight: '600',
    color: '#3E2723',
    textTransform: 'capitalize',
    fontSize: 14,
  },
  fertilitySection: {
    marginTop: spacing.md,
    backgroundColor: '#F9F7F4',
    padding: spacing.md,
    borderRadius: 12,
  },
  fertilityBar: {
    height: 24,
    backgroundColor: '#E8DED2',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  fertilityFill: {
    height: '100%',
    borderRadius: 12,
  },
  fertilityText: {
    ...typography.caption,
    color: '#5D4E37',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  cropsSection: {
    marginTop: spacing.md,
  },
  cropsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  cropChip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: '#D4E7C5',
    borderRadius: 8,
  },
  amendmentsSection: {
    marginTop: spacing.md,
  },
  amendmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    backgroundColor: '#FAF8F5',
    padding: spacing.sm,
    borderRadius: 8,
  },
  amendmentText: {
    ...typography.body,
    color: '#5D4E37',
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
    fontSize: 13,
  },
});

export default SoilAnalysisScreen;

