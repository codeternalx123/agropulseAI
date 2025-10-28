import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, Text, HelperText, RadioButton } from 'react-native-paper';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { farmAPI, uploadPhoto } from '../../services/api';

const AddFarmScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    farmName: '',
    county: user.county || '',
    subCounty: user.sub_county || '',
    latitude: '',
    longitude: '',
    fieldName: 'Main Field',
    fieldSize: '',
    soilType: 'loam',
    currentCrop: '',
    variety: '',
    plantingDate: '',
    wetSoilPhoto: null,
    drySoilPhoto: null,
  });
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to register a farm');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      updateField('latitude', location.coords.latitude.toString());
      updateField('longitude', location.coords.longitude.toString());
      Alert.alert('Success', 'Location captured successfully!');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location');
    }
  };

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
      updateField(type, result.assets[0].uri);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.farmName) {
      newErrors.farmName = 'Farm name is required';
    }
    if (!formData.county) {
      newErrors.county = 'County is required';
    }
    if (!formData.subCounty) {
      newErrors.subCounty = 'Sub-county is required';
    }
    if (!formData.latitude || !formData.longitude) {
      newErrors.location = 'GPS location is required';
    }
    if (!formData.fieldSize || parseFloat(formData.fieldSize) <= 0) {
      newErrors.fieldSize = 'Field size must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Upload soil photos if provided
      let wetPhotoUrl = null;
      let dryPhotoUrl = null;

      if (formData.wetSoilPhoto) {
        wetPhotoUrl = await uploadPhoto(formData.wetSoilPhoto);
      }
      if (formData.drySoilPhoto) {
        dryPhotoUrl = await uploadPhoto(formData.drySoilPhoto);
      }

      // Register farm with AI analysis
      const result = await farmAPI.registerFarm({
        farmer_id: user.id,
        farm_name: formData.farmName,
        county: formData.county,
        sub_county: formData.subCounty,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        field_name: formData.fieldName,
        field_size_acres: parseFloat(formData.fieldSize),
        soil_type: formData.soilType,
        current_crop: formData.currentCrop || null,
        variety: formData.variety || null,
        planting_date: formData.plantingDate || null,
        soil_photo_wet_url: wetPhotoUrl,
        soil_photo_dry_url: dryPhotoUrl,
      });

      Alert.alert(
        'Success!',
        'Farm registered successfully with AI analysis',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error registering farm:', error);
      Alert.alert('Error', 'Failed to register farm. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Farm Information</Text>

        <TextInput
          label="Farm Name"
          value={formData.farmName}
          onChangeText={(text) => updateField('farmName', text)}
          mode="outlined"
          error={!!errors.farmName}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.farmName}>
          {errors.farmName}
        </HelperText>

        <TextInput
          label="County"
          value={formData.county}
          onChangeText={(text) => updateField('county', text)}
          mode="outlined"
          error={!!errors.county}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.county}>
          {errors.county}
        </HelperText>

        <TextInput
          label="Sub-County"
          value={formData.subCounty}
          onChangeText={(text) => updateField('subCounty', text)}
          mode="outlined"
          error={!!errors.subCounty}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.subCounty}>
          {errors.subCounty}
        </HelperText>

        <View style={styles.locationContainer}>
          <View style={styles.locationInputs}>
            <TextInput
              label="Latitude"
              value={formData.latitude}
              mode="outlined"
              editable={false}
              style={[styles.input, styles.locationInput]}
            />
            <TextInput
              label="Longitude"
              value={formData.longitude}
              mode="outlined"
              editable={false}
              style={[styles.input, styles.locationInput]}
            />
          </View>
          <Button
            mode="contained"
            icon="crosshairs-gps"
            onPress={handleGetLocation}
            style={styles.locationButton}
          >
            Get GPS Location
          </Button>
        </View>
        <HelperText type="error" visible={!!errors.location}>
          {errors.location}
        </HelperText>

        <Text style={styles.sectionTitle}>Field Details</Text>

        <TextInput
          label="Field Name"
          value={formData.fieldName}
          onChangeText={(text) => updateField('fieldName', text)}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Field Size (acres)"
          value={formData.fieldSize}
          onChangeText={(text) => updateField('fieldSize', text)}
          mode="outlined"
          keyboardType="decimal-pad"
          error={!!errors.fieldSize}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.fieldSize}>
          {errors.fieldSize}
        </HelperText>

        <Text style={styles.label}>Soil Type</Text>
        <RadioButton.Group
          onValueChange={(value) => updateField('soilType', value)}
          value={formData.soilType}
        >
          <View style={styles.radioRow}>
            <RadioButton.Item label="Clay" value="clay" />
            <RadioButton.Item label="Loam" value="loam" />
          </View>
          <View style={styles.radioRow}>
            <RadioButton.Item label="Sandy" value="sandy" />
            <RadioButton.Item label="Silt" value="silt" />
          </View>
        </RadioButton.Group>

        <Text style={styles.sectionTitle}>Current Crop (Optional)</Text>

        <TextInput
          label="Crop Name"
          value={formData.currentCrop}
          onChangeText={(text) => updateField('currentCrop', text)}
          mode="outlined"
          placeholder="e.g., Maize, Beans"
          style={styles.input}
        />

        <TextInput
          label="Variety"
          value={formData.variety}
          onChangeText={(text) => updateField('variety', text)}
          mode="outlined"
          placeholder="e.g., DH02"
          style={styles.input}
        />

        <TextInput
          label="Planting Date"
          value={formData.plantingDate}
          onChangeText={(text) => updateField('plantingDate', text)}
          mode="outlined"
          placeholder="YYYY-MM-DD"
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Soil Photos (Optional)</Text>
        <Text style={styles.helperText}>
          Take photos of soil when wet and dry for AI texture analysis
        </Text>

        <View style={styles.photoRow}>
          <Button
            mode={formData.wetSoilPhoto ? 'contained' : 'outlined'}
            icon="camera"
            onPress={() => handleTakePhoto('wetSoilPhoto')}
            style={styles.photoButton}
          >
            {formData.wetSoilPhoto ? 'Wet Soil ✓' : 'Wet Soil'}
          </Button>
          <Button
            mode={formData.drySoilPhoto ? 'contained' : 'outlined'}
            icon="camera"
            onPress={() => handleTakePhoto('drySoilPhoto')}
            style={styles.photoButton}
          >
            {formData.drySoilPhoto ? 'Dry Soil ✓' : 'Dry Soil'}
          </Button>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
        >
          Register Farm with AI Analysis
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: spacing.xs,
  },
  locationContainer: {
    marginBottom: spacing.xs,
  },
  locationInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationInput: {
    flex: 1,
    marginRight: spacing.sm,
  },
  locationButton: {
    marginTop: spacing.sm,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helperText: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginBottom: spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  photoButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
});

export default AddFarmScreen;
