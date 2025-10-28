import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../../theme/theme';
import ImageUploader from '../../components/ImageUploader';
import { farmAPI } from '../../services/api';

/**
 * Enhanced Soil Analysis Screen with ImageUploader component
 * 
 * This screen demonstrates how to use the ImageUploader component
 * for collecting wet and dry soil samples for AI analysis.
 */
const SoilAnalysisImprovedScreen = ({ route, navigation }) => {
  const { field } = route.params;
  const [loading, setLoading] = useState(false);
  const [wetSoilImages, setWetSoilImages] = useState([]);
  const [drySoilImages, setDrySoilImages] = useState([]);
  const [analysis, setAnalysis] = useState(field.soil_snapshots?.[0] || null);

  const handleWetSoilUpload = (uploadedData) => {
    setWetSoilImages(uploadedData);
    console.log('Wet soil images uploaded:', uploadedData);
  };

  const handleDrySoilUpload = (uploadedData) => {
    setDrySoilImages(uploadedData);
    console.log('Dry soil images uploaded:', uploadedData);
  };

  const handleUploadError = (error) => {
    Alert.alert('Upload Error', error);
  };

  const handleAnalyze = async () => {
    if (wetSoilImages.length === 0 || drySoilImages.length === 0) {
      Alert.alert('Photos Required', 'Please upload both wet and dry soil photos');
      return;
    }

    setLoading(true);
    try {
      const result = await farmAPI.addSoilSnapshot(field.id, {
        wet: wetSoilImages[0].url,
        dry: drySoilImages[0].url,
      });

      setAnalysis(result);
      Alert.alert('Success', 'Soil analysis completed!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error analyzing soil:', error);
      Alert.alert('Error', 'Failed to analyze soil. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canAnalyze = wetSoilImages.length > 0 && drySoilImages.length > 0;

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

      {/* Instructions */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.instructionsTitle}>📸 How to Take Soil Photos</Text>
          <Text style={styles.instructions}>
            {'\n'}1. Collect soil samples from different parts of your field
            {'\n'}2. Take photos when soil is wet (after rain or irrigation)
            {'\n'}3. Take photos when soil is dry (before watering)
            {'\n'}4. Ensure good lighting for clear images
            {'\n'}5. Our AI will analyze texture, moisture, and nutrient indicators
          </Text>
        </Card.Content>
      </Card>

      {/* Wet Soil Upload */}
      <Card style={styles.card}>
        <Card.Title 
          title="💧 Wet Soil Sample" 
          titleStyle={styles.cardTitle}
          subtitle="Take photo after rain or irrigation"
        />
        <Card.Content>
          <ImageUploader
            category="soil"
            multiple={false}
            previewSize={200}
            onUploadComplete={handleWetSoilUpload}
            onUploadError={handleUploadError}
          />
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Dry Soil Upload */}
      <Card style={styles.card}>
        <Card.Title 
          title="☀️ Dry Soil Sample" 
          titleStyle={styles.cardTitle}
          subtitle="Take photo when soil is dry"
        />
        <Card.Content>
          <ImageUploader
            category="soil"
            multiple={false}
            previewSize={200}
            onUploadComplete={handleDrySoilUpload}
            onUploadError={handleUploadError}
          />
        </Card.Content>
      </Card>

      {/* Analyze Button */}
      <Button
        mode="contained"
        onPress={handleAnalyze}
        loading={loading}
        disabled={loading || !canAnalyze}
        style={styles.analyzeButton}
        icon="microscope"
        contentStyle={styles.buttonContent}
      >
        {canAnalyze ? 'Analyze Soil with AI' : 'Upload Both Photos to Continue'}
      </Button>

      {/* Analysis Results (if available) */}
      {analysis && (
        <Card style={styles.card}>
          <Card.Title 
            title="Analysis Results" 
            titleStyle={styles.cardTitle}
            left={(props) => (
              <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.success} />
            )}
          />
          <Card.Content>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Texture Class:</Text>
              <Text style={styles.resultValue}>{analysis.texture_class || 'N/A'}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Clay Content:</Text>
              <Text style={styles.resultValue}>{analysis.clay_percent || 0}%</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Sand Content:</Text>
              <Text style={styles.resultValue}>{analysis.sand_percent || 0}%</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Silt Content:</Text>
              <Text style={styles.resultValue}>{analysis.silt_percent || 0}%</Text>
            </View>
            
            {analysis.ai_recommendations && (
              <>
                <Divider style={styles.divider} />
                <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                {analysis.ai_recommendations.map((rec, index) => (
                  <Text key={index} style={styles.recommendation}>
                    • {rec}
                  </Text>
                ))}
              </>
            )}
          </Card.Content>
        </Card>
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
  fieldName: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  fieldDetails: {
    ...typography.body,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  cardTitle: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  instructionsTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  instructions: {
    ...typography.body,
    color: theme.colors.placeholder,
    lineHeight: 24,
  },
  divider: {
    marginVertical: spacing.md,
  },
  analyzeButton: {
    marginVertical: spacing.lg,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  resultLabel: {
    ...typography.body,
    color: theme.colors.placeholder,
  },
  resultValue: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  recommendationsTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  recommendation: {
    ...typography.body,
    color: theme.colors.text,
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
});

export default SoilAnalysisImprovedScreen;
