import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Text, Button, IconButton, ActivityIndicator, Chip, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme, spacing, typography } from '../theme/theme';
import { uploadAPI } from '../services/api';
const ImageUploader = ({
  category = 'general',
  multiple = false,
  maxImages = 5,
  onUploadComplete,
  onUploadError,
  previewSize = 150,
  showPreview = true,
  style,
}) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const categoryInfo = {
    plant: { icon: 'sprout', color: theme.colors.success, label: 'Plant Photos' },
    leaf: { icon: 'leaf', color: '#4CAF50', label: 'Leaf Photos' },
    soil: { icon: 'terrain', color: '#795548', label: 'Soil Photos' },
    farm: { icon: 'barn', color: theme.colors.primary, label: 'Farm Photos' },
    general: { icon: 'image', color: theme.colors.accent, label: 'Photos' },
  };

  const info = categoryInfo[category] || categoryInfo.general;

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library access are needed to upload images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        const newImage = {
          uri: result.assets[0].uri,
          uploaded: false,
          uploading: false,
        };

        if (multiple) {
          if (images.length >= maxImages) {
            Alert.alert('Limit Reached', `You can only upload up to ${maxImages} images.`);
            return;
          }
          setImages([...images, newImage]);
        } else {
          setImages([newImage]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo: ' + error.message);
    }
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: multiple,
        selectionLimit: multiple ? maxImages : 1,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          uploaded: false,
          uploading: false,
        }));

        if (multiple) {
          const combinedImages = [...images, ...newImages];
          if (combinedImages.length > maxImages) {
            Alert.alert('Limit Reached', `You can only upload up to ${maxImages} images.`);
            setImages(combinedImages.slice(0, maxImages));
          } else {
            setImages(combinedImages);
          }
        } else {
          setImages(newImages);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos: ' + error.message);
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: pickImageFromCamera },
        { text: 'Choose from Gallery', onPress: pickImageFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const uploadImages = async () => {
    const unuploadedImages = images.filter(img => !img.uploaded);
    if (unuploadedImages.length === 0) {
      Alert.alert('No New Images', 'All images have already been uploaded.');
      return;
    }

    setUploading(true);

    try {
      if (multiple && unuploadedImages.length > 1) {
        // Batch upload
        const uris = unuploadedImages.map(img => img.uri);
        const result = await uploadAPI.uploadPhotoBatch(uris, category);

        // Update uploaded status
        const newImages = images.map(img => {
          const uploaded = result.uploaded.find(u => u.url.includes(img.uri.split('/').pop()));
          if (uploaded) {
            return { ...img, uploaded: true, uploadedData: uploaded };
          }
          return img;
        });
        setImages(newImages);

        if (onUploadComplete) {
          onUploadComplete(result.uploaded);
        }

        Alert.alert(
          'Upload Complete',
          `${result.uploaded.length} images uploaded successfully.${
            result.failed.length > 0 ? ` ${result.failed.length} failed.` : ''
          }`
        );
      } else {
        // Single or individual uploads
        const uploadPromises = unuploadedImages.map(async (img, index) => {
          try {
            let uploadedData;
            switch (category) {
              case 'plant':
                uploadedData = await uploadAPI.uploadPlantImage(img.uri);
                break;
              case 'leaf':
                uploadedData = await uploadAPI.uploadLeafImage(img.uri);
                break;
              case 'soil':
                uploadedData = await uploadAPI.uploadSoilImage(img.uri);
                break;
              case 'farm':
                uploadedData = await uploadAPI.uploadFarmImage(img.uri);
                break;
              default:
                uploadedData = await uploadAPI.uploadPhoto(img.uri, category);
            }
            return { success: true, data: uploadedData, uri: img.uri };
          } catch (error) {
            return { success: false, error: error.message, uri: img.uri };
          }
        });

        const results = await Promise.all(uploadPromises);

        // Update images with upload status
        const newImages = images.map(img => {
          const result = results.find(r => r.uri === img.uri);
          if (result && result.success) {
            return { ...img, uploaded: true, uploadedData: result.data };
          }
          return img;
        });
        setImages(newImages);

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        if (onUploadComplete && successful.length > 0) {
          onUploadComplete(successful.map(r => r.data));
        }

        if (failed.length > 0 && onUploadError) {
          onUploadError(failed.map(r => r.error).join(', '));
        }

        Alert.alert(
          'Upload Complete',
          `${successful.length} images uploaded successfully.${
            failed.length > 0 ? ` ${failed.length} failed.` : ''
          }`
        );
      }
    } catch (error) {
      Alert.alert('Upload Failed', error.message);
      if (onUploadError) {
        onUploadError(error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all images?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setImages([]) },
    ]);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name={info.icon} size={24} color={info.color} />
          <Text style={styles.headerText}>{info.label}</Text>
        </View>
        {multiple && images.length > 0 && (
          <Chip icon="counter" compact>
            {images.length}/{maxImages}
          </Chip>
        )}
      </View>

      {/* Image Previews */}
      {showPreview && images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.previewScroll}
          contentContainerStyle={styles.previewContent}
        >
          {images.map((img, index) => (
            <Surface key={index} style={[styles.previewContainer, { width: previewSize, height: previewSize }]}>
              <Image source={{ uri: img.uri }} style={styles.previewImage} />
              {img.uploaded && (
                <View style={styles.uploadedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.success} />
                </View>
              )}
              <IconButton
                icon="close-circle"
                size={20}
                iconColor={theme.colors.error}
                containerColor="white"
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              />
            </Surface>
          ))}
        </ScrollView>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          icon="camera"
          onPress={showImagePickerOptions}
          style={styles.button}
          disabled={uploading || (!multiple && images.length >= 1)}
        >
          {images.length === 0 ? 'Add Photo' : multiple ? 'Add More' : 'Change Photo'}
        </Button>

        {images.length > 0 && (
          <>
            <Button
              mode="contained"
              icon="upload"
              onPress={uploadImages}
              style={styles.button}
              loading={uploading}
              disabled={uploading || images.every(img => img.uploaded)}
            >
              Upload {images.filter(img => !img.uploaded).length > 0 && `(${images.filter(img => !img.uploaded).length})`}
            </Button>

            <IconButton
              icon="delete-sweep"
              size={24}
              iconColor={theme.colors.error}
              onPress={clearAll}
              disabled={uploading}
            />
          </>
        )}
      </View>

      {/* Help Text */}
      <Text style={styles.helpText}>
        {category === 'plant' && '📸 Capture full plant photos for best results'}
        {category === 'leaf' && '🍃 Take close-up photos of affected leaves'}
        {category === 'soil' && '🌍 Photograph soil samples (wet and dry if possible)'}
        {category === 'farm' && '🌾 Take clear photos of your field or farm'}
        {category === 'general' && '📷 Take clear, well-lit photos'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    ...typography.h3,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    color: theme.colors.text,
  },
  previewScroll: {
    marginBottom: spacing.md,
  },
  previewContent: {
    gap: spacing.sm,
  },
  previewContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    marginRight: spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadedBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  helpText: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

export default ImageUploader;
