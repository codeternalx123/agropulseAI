import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { TextInput, Button, Text, RadioButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { villageGroupsAPI, uploadPhoto } from '../../services/api';

const CreatePostScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState('farming_tip');
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const postTypes = [
    { value: 'farming_tip', label: 'Farming Tip 💡', icon: 'lightbulb' },
    { value: 'question', label: 'Question ❓', icon: 'help-circle' },
    { value: 'problem', label: 'Problem 🚨', icon: 'alert-circle' },
    { value: 'success_story', label: 'Success Story 🏆', icon: 'trophy' },
  ];

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

  const handleStartRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permission is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      // Voice recording saved at uri
      Alert.alert('Success', 'Voice note recorded');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please write some content');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = null;
      if (photo) {
        photoUrl = await uploadPhoto(photo);
      }

      const postData = {
        farmer_id: user.id,
        post_type: postType,
        content: content.trim(),
        media_url: photoUrl,
        media_type: photoUrl ? 'photo' : null,
      };

      await villageGroupsAPI.createPost(user.village_group_id, postData);

      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
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
        <Text style={styles.title}>Create a New Post</Text>

        {/* Post Type Selection */}
        <Text style={styles.label}>Post Type</Text>
        <View style={styles.typeContainer}>
          {postTypes.map((type) => (
            <Chip
              key={type.value}
              selected={postType === type.value}
              onPress={() => setPostType(type.value)}
              style={styles.typeChip}
              icon={type.icon}
            >
              {type.label}
            </Chip>
          ))}
        </View>

        {/* Content Input */}
        <TextInput
          label="What's on your mind?"
          value={content}
          onChangeText={setContent}
          mode="outlined"
          multiline
          numberOfLines={8}
          placeholder={getPlaceholder(postType)}
          style={styles.input}
        />

        {/* Media Options */}
        <Text style={styles.label}>Add Media (Optional)</Text>

        {photo && (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photo }} style={styles.photoPreview} />
            <Button
              mode="text"
              icon="close"
              onPress={() => setPhoto(null)}
              style={styles.removeButton}
            >
              Remove
            </Button>
          </View>
        )}

        <View style={styles.mediaButtons}>
          <Button
            mode="outlined"
            icon="camera"
            onPress={handleTakePhoto}
            style={styles.mediaButton}
            disabled={!!photo}
          >
            Add Photo
          </Button>
          <Button
            mode="outlined"
            icon={isRecording ? 'stop' : 'microphone'}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            style={styles.mediaButton}
          >
            {isRecording ? 'Stop Recording' : 'Voice Note'}
          </Button>
        </View>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <MaterialCommunityIcons
              name="record-circle"
              size={24}
              color={theme.colors.error}
            />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsBox}>
          <MaterialCommunityIcons
            name="information"
            size={20}
            color={theme.colors.info}
          />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Tips for a great post:</Text>
            <Text style={styles.tipsText}>
              • Be specific and detailed{'\n'}
              • Share your experience{'\n'}
              • Include photos if relevant{'\n'}
              • Be respectful to others
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !content.trim()}
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
        >
          Post to Group
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getPlaceholder = (type) => {
  switch (type) {
    case 'farming_tip':
      return 'Share a farming tip that has worked for you...';
    case 'question':
      return 'Ask your farming question...';
    case 'problem':
      return 'Describe the problem you\'re facing...';
    case 'success_story':
      return 'Share your success story...';
    default:
      return 'Write something...';
  }
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
  title: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  typeChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: spacing.lg,
  },
  photoPreviewContainer: {
    marginBottom: spacing.md,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  removeButton: {
    alignSelf: 'flex-start',
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  mediaButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.error + '20',
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  recordingText: {
    ...typography.body,
    color: theme.colors.error,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  tipsBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  tipsContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  tipsTitle: {
    ...typography.caption,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  tipsText: {
    ...typography.caption,
    color: theme.colors.text,
    lineHeight: 18,
  },
  submitButton: {
    marginBottom: spacing.xl,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
});

export default CreatePostScreen;
