import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Text, Card, Button, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { theme, spacing, typography } from '../../theme/theme';
import { pestAPI, uploadPhoto } from '../../services/api';

const PestScanScreen = ({ route, navigation }) => {
  const { field } = route.params;
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState(null);

  const handleTakePhoto = async () => {
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
      setPhoto(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleScan = async () => {
    if (!photo) {
      Alert.alert('Photo Required', 'Please take or select a photo first');
      return;
    }

    setLoading(true);
    try {
      const photoUrl = await uploadPhoto(photo);
      const scanResult = await pestAPI.scanPlant(field.id, photoUrl, symptoms);
      setResult(scanResult);
    } catch (error) {
      console.error('Error scanning plant:', error);
      Alert.alert('Error', 'Failed to scan plant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetIPMRecommendations = async () => {
    if (!result) return;

    setLoading(true);
    try {
      const ipmResult = await pestAPI.getIPMRecommendations(
        result.disease,
        result.severity
      );
      setResult(prev => ({ ...prev, ipm_recommendations: ipmResult }));
    } catch (error) {
      console.error('Error getting IPM recommendations:', error);
      Alert.alert('Error', 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return theme.colors.error;
      case 'medium':
        return theme.colors.accent;
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.disabled;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Field Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.fieldName}>{field.field_name}</Text>
          <Text style={styles.fieldDetails}>
            {field.current_crop} • {field.field_size_acres} acres
          </Text>
        </Card.Content>
      </Card>

      {/* Photo Capture */}
      <Card style={styles.card}>
        <Card.Title title="Capture Plant Photo" titleStyle={styles.cardTitle} />
        <Card.Content>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons
                name="camera"
                size={64}
                color={theme.colors.disabled}
              />
              <Text style={styles.placeholderText}>No photo selected</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              icon="camera"
              onPress={handleTakePhoto}
              style={styles.photoButton}
            >
              Take Photo
            </Button>
            <Button
              mode="outlined"
              icon="image"
              onPress={handlePickImage}
              style={styles.photoButton}
            >
              Pick Image
            </Button>
          </View>

          <TextInput
            label="Symptoms (Optional)"
            value={symptoms}
            onChangeText={setSymptoms}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Describe what you see: yellowing leaves, spots, wilting, etc."
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleScan}
            loading={loading}
            disabled={loading || !photo}
            style={styles.scanButton}
            contentStyle={styles.buttonContent}
          >
            Scan with AI
          </Button>
        </Card.Content>
      </Card>

      {/* Scan Results */}
      {result && (
        <>
          <Card style={styles.card}>
            <Card.Title title="Diagnosis" titleStyle={styles.cardTitle} />
            <Card.Content>
              <View style={styles.diagnosisHeader}>
                <View style={styles.diseaseIcon}>
                  <MaterialCommunityIcons
                    name="bug"
                    size={32}
                    color={getSeverityColor(result.severity)}
                  />
                </View>
                <View style={styles.diseaseInfo}>
                  <Text style={styles.diseaseName}>{result.disease}</Text>
                  <View style={styles.severityRow}>
                    <Text style={styles.severityLabel}>Severity:</Text>
                    <Chip
                      style={[
                        styles.severityChip,
                        { backgroundColor: getSeverityColor(result.severity) + '30' },
                      ]}
                      textStyle={[
                        styles.severityText,
                        { color: getSeverityColor(result.severity) },
                      ]}
                    >
                      {result.severity?.toUpperCase()}
                    </Chip>
                  </View>
                  <View style={styles.confidenceRow}>
                    <Text style={styles.confidenceLabel}>Confidence:</Text>
                    <Text style={styles.confidenceValue}>
                      {(result.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                  {result.cv_analysis?.model_used && (
                    <View style={styles.modelRow}>
                      <MaterialCommunityIcons name="brain" size={16} color="#666" />
                      <Text style={styles.modelText}>
                        {result.cv_analysis.model_used === 'ai_calendar_random_forest' ? 'AI Model' : 
                         result.cv_analysis.model_used === 'fallback_simulation' ? 'Simulation' : 
                         'ML Model'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.description}>{result.description}</Text>
              
              {/* ML Alternative Predictions */}
              {result.cv_analysis?.top_predictions && result.cv_analysis.top_predictions.length > 1 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🤖 ML Alternative Diagnoses:</Text>
                  {result.cv_analysis.top_predictions.slice(1, 4).map((prediction, index) => (
                    <View key={index} style={styles.alternativeItem}>
                      <View style={styles.alternativeLeft}>
                        <MaterialCommunityIcons
                          name="circle-small"
                          size={20}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.alternativeText}>
                          {prediction.class || prediction.pest_type || prediction.disease_type}
                        </Text>
                      </View>
                      <Text style={styles.alternativeConfidence}>
                        {(prediction.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Pest & Disease Breakdown */}
              {result.cv_analysis?.pest_type && result.cv_analysis?.disease_type && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📊 Detailed Analysis:</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>🐛 Pest:</Text>
                    <Text style={styles.detailValue}>
                      {result.cv_analysis.pest_type} ({(result.cv_analysis.pest_confidence * 100).toFixed(0)}%)
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>🦠 Disease:</Text>
                    <Text style={styles.detailValue}>
                      {result.cv_analysis.disease_type} ({(result.cv_analysis.disease_confidence * 100).toFixed(0)}%)
                    </Text>
                  </View>
                  {result.cv_analysis.is_healthy !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>🌿 Health Status:</Text>
                      <Text style={[styles.detailValue, { color: result.cv_analysis.is_healthy ? theme.colors.success : theme.colors.error }]}>
                        {result.cv_analysis.is_healthy ? 'Healthy' : 'Unhealthy'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {result.common_causes && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Common Causes:</Text>
                  {result.common_causes.map((cause, index) => (
                    <View key={index} style={styles.listItem}>
                      <MaterialCommunityIcons
                        name="circle-small"
                        size={20}
                        color={theme.colors.text}
                      />
                      <Text style={styles.listText}>{cause}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title
              title="Treatment Recommendations"
              titleStyle={styles.cardTitle}
              right={(props) => (
                result.ipm_recommendations ? null : (
                  <Button
                    mode="outlined"
                    onPress={handleGetIPMRecommendations}
                    loading={loading}
                    compact
                  >
                    Get IPM
                  </Button>
                )
              )}
            />
            <Card.Content>
              {result.ipm_recommendations ? (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🌱 Organic Methods:</Text>
                    {result.ipm_recommendations.organic_methods?.map((method, index) => (
                      <View key={index} style={styles.methodItem}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={theme.colors.success}
                        />
                        <Text style={styles.methodText}>{method}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💊 Chemical Control:</Text>
                    {result.ipm_recommendations.chemical_methods?.map((method, index) => (
                      <View key={index} style={styles.methodItem}>
                        <MaterialCommunityIcons
                          name="flask"
                          size={20}
                          color={theme.colors.accent}
                        />
                        <Text style={styles.methodText}>{method}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🛡️ Prevention:</Text>
                    {result.ipm_recommendations.prevention_tips?.map((tip, index) => (
                      <View key={index} style={styles.methodItem}>
                        <MaterialCommunityIcons
                          name="shield-check"
                          size={20}
                          color={theme.colors.info}
                        />
                        <Text style={styles.methodText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                result.immediate_actions && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Immediate Actions:</Text>
                    {result.immediate_actions.map((action, index) => (
                      <View key={index} style={styles.listItem}>
                        <MaterialCommunityIcons
                          name="alert-circle"
                          size={20}
                          color={theme.colors.error}
                        />
                        <Text style={styles.listText}>{action}</Text>
                      </View>
                    ))}
                  </View>
                )
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  cardTitle: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  fieldName: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  fieldDetails: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  photoPlaceholder: {
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  placeholderText: {
    ...typography.caption,
    color: theme.colors.disabled,
    marginTop: spacing.sm,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  photoButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  input: {
    marginBottom: spacing.md,
  },
  scanButton: {
    marginTop: spacing.sm,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  diagnosisHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  diseaseIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  diseaseInfo: {
    flex: 1,
  },
  diseaseName: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  severityLabel: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginRight: spacing.sm,
  },
  severityChip: {
    paddingHorizontal: spacing.sm,
  },
  severityText: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginRight: spacing.sm,
  },
  confidenceValue: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  modelText: {
    ...typography.caption,
    color: '#666',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  alternativeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  alternativeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alternativeText: {
    ...typography.body,
    color: theme.colors.text,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
  },
  alternativeConfidence: {
    ...typography.caption,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: theme.colors.placeholder,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  description: {
    ...typography.body,
    color: theme.colors.text,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  listText: {
    ...typography.body,
    color: theme.colors.text,
    flex: 1,
    marginLeft: spacing.xs,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  methodText: {
    ...typography.body,
    color: theme.colors.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
});

export default PestScanScreen;
