import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { theme, spacing, typography } from '../theme/theme';
import ImageUploader from '../components/ImageUploader';

const ImageUploadDemoScreen = ({ navigation }) => {
  const [uploadedPlants, setUploadedPlants] = useState([]);
  const [uploadedLeaves, setUploadedLeaves] = useState([]);
  const [uploadedSoil, setUploadedSoil] = useState([]);

  const handlePlantUpload = (data) => {
    setUploadedPlants(data);
    console.log('Plant images uploaded:', data);
  };

  const handleLeafUpload = (data) => {
    setUploadedLeaves(data);
    console.log('Leaf images uploaded:', data);
  };

  const handleSoilUpload = (data) => {
    setUploadedSoil(data);
    console.log('Soil images uploaded:', data);
  };

  const handleUploadError = (error) => {
    Alert.alert('Upload Error', error);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Image Upload System</Text>
          <Text style={styles.description}>
            Upload images of plants, leaves, and soil for AI analysis. The system automatically
            categorizes and optimizes your photos.
          </Text>
        </Card.Content>
      </Card>

      {/* Plant Image Upload */}
      <Card style={styles.card}>
        <Card.Content>
          <ImageUploader
            category="plant"
            multiple={true}
            maxImages={5}
            onUploadComplete={handlePlantUpload}
            onUploadError={handleUploadError}
            previewSize={120}
          />
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Leaf Image Upload */}
      <Card style={styles.card}>
        <Card.Content>
          <ImageUploader
            category="leaf"
            multiple={true}
            maxImages={5}
            onUploadComplete={handleLeafUpload}
            onUploadError={handleUploadError}
            previewSize={120}
          />
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Soil Image Upload */}
      <Card style={styles.card}>
        <Card.Content>
          <ImageUploader
            category="soil"
            multiple={false}
            onUploadComplete={handleSoilUpload}
            onUploadError={handleUploadError}
            previewSize={150}
          />
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Farm Image Upload */}
      <Card style={styles.card}>
        <Card.Content>
          <ImageUploader
            category="farm"
            multiple={true}
            maxImages={10}
            onUploadComplete={(data) => console.log('Farm images:', data)}
            onUploadError={handleUploadError}
            previewSize={100}
          />
        </Card.Content>
      </Card>

      {/* Upload Results */}
      {(uploadedPlants.length > 0 || uploadedLeaves.length > 0 || uploadedSoil.length > 0) && (
        <Card style={styles.card}>
          <Card.Title title="Upload Results" />
          <Card.Content>
            {uploadedPlants.length > 0 && (
              <Text style={styles.result}>
                ✅ {uploadedPlants.length} plant image(s) uploaded
              </Text>
            )}
            {uploadedLeaves.length > 0 && (
              <Text style={styles.result}>
                ✅ {uploadedLeaves.length} leaf image(s) uploaded
              </Text>
            )}
            {uploadedSoil.length > 0 && (
              <Text style={styles.result}>
                ✅ {uploadedSoil.length} soil image(s) uploaded
              </Text>
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
  title: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: theme.colors.placeholder,
    lineHeight: 22,
  },
  divider: {
    marginVertical: spacing.md,
  },
  result: {
    ...typography.body,
    color: theme.colors.success,
    marginBottom: spacing.xs,
  },
});

export default ImageUploadDemoScreen;
