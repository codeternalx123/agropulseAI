import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { Text, Card, TextInput, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { partnerAPI, uploadPhoto } from '../../services/api';

const ExpertHelpScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('pest_disease');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [requests, setRequests] = useState([]);

  React.useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await partnerAPI.getExpertHelpRequests(user.id);
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

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
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your problem');
      return;
    }

    setLoading(true);
    try {
      const photoUrls = await Promise.all(photos.map(photo => uploadPhoto(photo)));

      await partnerAPI.requestExpertHelp({
        farmer_id: user.id,
        category,
        description: description.trim(),
        photo_urls: photoUrls,
      });

      Alert.alert('Success', 'Expert help request submitted!');
      setDescription('');
      setPhotos([]);
      loadRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'pest_disease', label: 'Pest/Disease', icon: 'bug' },
    { value: 'soil_health', label: 'Soil Health', icon: 'terrain' },
    { value: 'crop_management', label: 'Crop Management', icon: 'sprout' },
    { value: 'weather', label: 'Weather', icon: 'weather-cloudy' },
    { value: 'other', label: 'Other', icon: 'help-circle' },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Title title="Request Expert Help" titleStyle={styles.cardTitle} />
          <Card.Content>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <Chip
                  key={cat.value}
                  selected={category === cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={styles.categoryChip}
                  icon={cat.icon}
                >
                  {cat.label}
                </Chip>
              ))}
            </View>

            <TextInput
              label="Describe your problem"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={6}
              placeholder="Provide as much detail as possible..."
              style={styles.input}
            />

            <Text style={styles.label}>Photos (Optional)</Text>
            <View style={styles.photosContainer}>
              {photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.photoThumb} />
              ))}
            </View>

            <Button mode="outlined" icon="camera" onPress={handleTakePhoto} style={styles.photoButton}>
              Add Photo
            </Button>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              contentStyle={styles.buttonContent}
            >
              Submit Request
            </Button>
          </Card.Content>
        </Card>

        {requests.length > 0 && (
          <Card style={styles.card}>
            <Card.Title title="My Requests" titleStyle={styles.cardTitle} />
            <Card.Content>
              {requests.map((req, index) => (
                <View key={index} style={styles.requestItem}>
                  <View style={styles.requestHeader}>
                    <Chip style={styles.statusChip}>{req.status}</Chip>
                    <Text style={styles.requestDate}>
                      {new Date(req.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.requestCategory}>{req.category}</Text>
                  <Text style={styles.requestDescription} numberOfLines={2}>
                    {req.description}
                  </Text>
                  {req.expert_response && (
                    <View style={styles.responseBox}>
                      <MaterialCommunityIcons name="account-tie" size={20} color={theme.colors.success} />
                      <Text style={styles.responseText}>{req.expert_response}</Text>
                    </View>
                  )}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: spacing.md },
  card: { marginBottom: spacing.md, elevation: 2 },
  cardTitle: { ...typography.h3, fontWeight: 'bold' },
  label: { ...typography.body, fontWeight: 'bold', marginBottom: spacing.sm, marginTop: spacing.md },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  categoryChip: { marginRight: spacing.sm, marginBottom: spacing.sm },
  input: { marginBottom: spacing.md },
  photosContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  photoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: spacing.sm, marginBottom: spacing.sm },
  photoButton: { marginBottom: spacing.md },
  submitButton: { marginTop: spacing.md },
  buttonContent: { paddingVertical: spacing.sm },
  requestItem: { padding: spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, marginBottom: spacing.md },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statusChip: { backgroundColor: theme.colors.info + '30' },
  requestDate: { ...typography.caption, color: theme.colors.placeholder },
  requestCategory: { ...typography.caption, fontWeight: 'bold', color: theme.colors.primary, marginBottom: spacing.xs },
  requestDescription: { ...typography.body, color: theme.colors.text, marginBottom: spacing.sm },
  responseBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.success + '20', padding: spacing.sm, borderRadius: 4, marginTop: spacing.sm },
  responseText: { ...typography.caption, color: theme.colors.text, marginLeft: spacing.sm, flex: 1 },
});

export default ExpertHelpScreen;
