import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput, Button, Text, HelperText, RadioButton, Switch } from 'react-native-paper';

import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import locationService from '../../services/locationService';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'farmer', // 'farmer' or 'buyer'
    county: '',
    subCounty: '',
    village: '',
    latitude: '',
    longitude: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [autoDetectLocation, setAutoDetectLocation] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleAutoDetectToggle = async () => {
    if (!autoDetectLocation) {
      // Turning on auto-detect
      try {
        setDetectingLocation(true);
        
        // Request permissions
        const hasPermission = await locationService.hasPermissions();
        if (!hasPermission) {
          const permissions = await locationService.requestPermissions();
          if (!permissions.foreground) {
            Alert.alert('Permission Required', 'Location permission is required for auto-detection');
            return;
          }
        }

        // Get current location
        const location = await locationService.getCurrentLocation();
        
        if (location) {
          // Reverse geocode to get address
          const address = await locationService.reverseGeocode(
            location.latitude,
            location.longitude
          );

          // Update form fields
          setFormData(prev => ({
            ...prev,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
            county: address.county || prev.county,
            subCounty: address.subcounty || prev.subCounty,
            village: address.village || prev.village,
          }));

          setAutoDetectLocation(true);
          Alert.alert('Success', 'Location detected automatically');
        }
      } catch (error) {
        console.error('Auto-detect error:', error);
        Alert.alert('Error', 'Failed to detect location. Please enter manually.');
      } finally {
        setDetectingLocation(false);
      }
    } else {
      // Turning off auto-detect
      setAutoDetectLocation(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Please enter your full name';
    }
    
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.county) {
      newErrors.county = 'Please enter your county';
    }
    
    if (!formData.subCounty) {
      newErrors.subCounty = 'Please enter your sub-county';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await register(
      formData.email,
      formData.password,
      formData.userType,
      {
        full_name: formData.name,
        phone_number: formData.phone,
        location: `${formData.subCounty}, ${formData.county}`,
        county: formData.county,
        subcounty: formData.subCounty,
        village: formData.village,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      }
    );
    setLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.error);
    } else {
      // Redirect to welcome screen to show onboarding
      navigation.replace('Welcome');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Agropulse AI Community</Text>

        <View style={styles.formContainer}>
          <TextInput
            label="Full Name"
            value={formData.name}
            onChangeText={(text) => updateField('name', text)}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            error={!!errors.name}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>

          <TextInput
            label="Email Address"
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email" />}
            error={!!errors.email}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>

          <TextInput
            label="Phone Number"
            value={formData.phone}
            onChangeText={(text) => updateField('phone', text)}
            mode="outlined"
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone" />}
            error={!!errors.phone}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.phone}>
            {errors.phone}
          </HelperText>

          <Text style={styles.userTypeLabel}>I am a:</Text>
          <View style={styles.userTypeDescription}>
            <Text style={styles.descriptionText}>
              {formData.userType === 'farmer' 
                ? '🌾 As a Farmer: List your produce, access AI farming tools, track growth, and sell across regions'
                : '🛒 As a Buyer: Browse produce, connect with verified farmers, and access cross-regional marketplace'}
            </Text>
          </View>
          <RadioButton.Group
            onValueChange={(value) => updateField('userType', value)}
            value={formData.userType}
          >
            <View style={styles.radioContainer}>
              <View style={styles.radioOption}>
                <RadioButton value="farmer" />
                <View>
                  <Text style={styles.radioLabel}>Farmer</Text>
                  <Text style={styles.radioSubtext}>Grow & Sell</Text>
                </View>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="buyer" />
                <View>
                  <Text style={styles.radioLabel}>Buyer</Text>
                  <Text style={styles.radioSubtext}>Source & Purchase</Text>
                </View>
              </View>
            </View>
          </RadioButton.Group>

          {/* Auto-detect Location Toggle */}
          <View style={styles.autoDetectContainer}>
            <View style={styles.autoDetectLeft}>
              <Text style={styles.autoDetectLabel}>Auto-detect my location</Text>
              <Text style={styles.autoDetectSubtext}>Use GPS to fill location details</Text>
            </View>
            <Switch
              value={autoDetectLocation}
              onValueChange={handleAutoDetectToggle}
              disabled={detectingLocation}
              color="#4CAF50"
            />
          </View>

          {detectingLocation && (
            <Text style={styles.detectingText}>📍 Detecting location...</Text>
          )}

          <TextInput
            label="Village / Location Name"
            value={formData.village}
            onChangeText={(text) => updateField('village', text)}
            mode="outlined"
            left={<TextInput.Icon icon="home-map-marker" />}
            disabled={autoDetectLocation}
            style={styles.input}
            placeholder="Optional"
          />

          <TextInput
            label="County"
            value={formData.county}
            onChangeText={(text) => updateField('county', text)}
            mode="outlined"
            left={<TextInput.Icon icon="map-marker" />}
            error={!!errors.county}
            disabled={autoDetectLocation}
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
            left={<TextInput.Icon icon="map-marker-radius" />}
            error={!!errors.subCounty}
            disabled={autoDetectLocation}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.subCounty}>
            {errors.subCounty}
          </HelperText>

          {formData.latitude && formData.longitude && (
            <View style={styles.coordinatesContainer}>
              <Text style={styles.coordinatesLabel}>GPS Coordinates:</Text>
              <Text style={styles.coordinatesText}>
                📍 {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
              </Text>
            </View>
          )}

          <TextInput
            label="Password"
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            error={!!errors.password}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password}
          </HelperText>

          <TextInput
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-check" />}
            error={!!errors.confirmPassword}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.confirmPassword}>
            {errors.confirmPassword}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
          >
            Register
          </Button>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              compact
            >
              Login
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: theme.colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: spacing.xs,
  },
  registerButton: {
    marginTop: spacing.lg,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    ...typography.body,
    color: theme.colors.text,
  },
  userTypeLabel: {
    ...typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  userTypeDescription: {
    backgroundColor: '#e8f5e9',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  descriptionText: {
    ...typography.caption,
    color: '#2e7d32',
    lineHeight: 18,
  },
  radioContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    justifyContent: 'space-around',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: spacing.md,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  radioLabel: {
    ...typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  radioSubtext: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  autoDetectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  autoDetectLeft: {
    flex: 1,
  },
  autoDetectLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  autoDetectSubtext: {
    fontSize: 11,
    color: '#666',
  },
  detectingText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  coordinatesContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  coordinatesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
});

export default RegisterScreen;
