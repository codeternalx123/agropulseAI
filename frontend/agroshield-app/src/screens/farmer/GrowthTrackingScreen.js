
import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, Platform, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from "../../context/AuthContext";
import { fetchUserPlots } from "../../api/plots";

const API_BASE = "https://urchin-app-86rjy.ondigitalocean.app/api/advanced-growth";

export default function GrowthTrackingScreen({ route, navigation }) {
  const { user } = useAuth();
  const [selectedPlotId, setSelectedPlotId] = useState(route?.params?.plotId || null);
  const [allPlots, setAllPlots] = useState([]);
  const [selectedPlotDetails, setSelectedPlotDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [error, setError] = useState(null);
  const [showSoilJSON, setShowSoilJSON] = useState(false);
  const [showPestJSON, setShowPestJSON] = useState(false);
  const [uploadingSoilImage, setUploadingSoilImage] = useState(false);
  const [uploadingCropImage, setUploadingCropImage] = useState(false);

  const loadPlots = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    console.log("=========================================");
    console.log("🔍 GrowthTrackingScreen Debug Info:");
    console.log("=========================================");
    console.log("User ID:", user?.id);
    console.log("User Email:", user?.email);
    console.log("=========================================");
    
    try {
      const data = await fetchUserPlots(user.id);
      console.log("📦 Plots data received:", JSON.stringify(data, null, 2));
      
      if (data && data.success && data.plots && data.plots.length > 0) {
        console.log("✅ Setting plots:", data.plots.length, "plots found");
        setAllPlots(data.plots);
        const firstPlotId = data.plots[0].id;
        setSelectedPlotId(firstPlotId);
        // Load details for first plot
        loadPlotDetails(firstPlotId);
        setError(null);
      } else if (data && data.success === false) {
        console.log("⚠️  API returned success=false");
        setError("no_plots");
      } else if (data && data.plots && data.plots.length === 0) {
        console.log("⚠️  No plots found for user");
        setError("no_plots");
      } else {
        console.log("⚠️  Unexpected response format:", data);
        setError("no_plots");
      }
    } catch (err) {
      console.error("❌ Error fetching plots:", err);
      console.error("❌ Error details:", err.message);
      setError("no_plots");
    } finally {
      setLoading(false);
    }
  };

  const loadPlotDetails = async (plotId) => {
    console.log('🚀 loadPlotDetails called with plotId:', plotId, 'user.id:', user?.id);
    
    if (!plotId || !user?.id) {
      console.log('⚠️ loadPlotDetails skipped - missing plotId or user.id');
      return;
    }
    
    setLoadingDetails(true);
    try {
      console.log(`🔍 Fetching detailed data for plot: ${plotId}`);
      const response = await fetch(`${API_BASE}/plots/${plotId}?user_id=${user.id}`);
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      const data = await response.json();
      
      console.log('📦 Full response data:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log("✅ Plot details loaded:", JSON.stringify(data, null, 2));
        console.log("📍 Location field type:", typeof data.plot?.location);
        console.log("📍 Location field value:", JSON.stringify(data.plot?.location, null, 2));
        console.log("📊 Images count:", data.images?.length);
        console.log("📅 Upcoming events count:", data.upcoming_events?.length);
        console.log("🔍 Checking AI analysis data...");
        
        // Check for AI analysis in images
        if (data.images && data.images.length > 0) {
          data.images.forEach((img, idx) => {
            console.log(`Image ${idx + 1}:`, JSON.stringify({
              id: img.id,
              type: img.image_type,
              url: img.image_url || img.url,
              uploaded_at: img.uploaded_at,
              has_ai_analysis: !!img.ai_analysis,
              ai_analysis_keys: img.ai_analysis ? Object.keys(img.ai_analysis) : []
            }, null, 2));
            
            if (img.ai_analysis) {
              console.log(`  - Soil Health:`, img.ai_analysis.soil_health ? '✅ EXISTS' : '❌ MISSING');
              console.log(`  - Pest Disease:`, img.ai_analysis.pest_disease_scan ? '✅ EXISTS' : '❌ MISSING');
              
              if (img.ai_analysis.soil_health) {
                console.log(`  - Soil Data Preview:`, JSON.stringify(img.ai_analysis.soil_health).substring(0, 200));
              }
              if (img.ai_analysis.pest_disease_scan) {
                console.log(`  - Pest Data Preview:`, JSON.stringify(img.ai_analysis.pest_disease_scan).substring(0, 200));
              }
            }
          });
        } else {
          console.log("⚠️ No images found in plot details");
        }
        
        setSelectedPlotDetails(data);
        console.log('✅ selectedPlotDetails state updated');
      } else {
        console.error("❌ Failed to load plot details:", data);
        setSelectedPlotDetails(null);
      }
    } catch (error) {
      console.error("❌ Error loading plot details:", error);
      setSelectedPlotDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Upload soil image for AI analysis
  const uploadSoilImage = async () => {
    try {
      // Validate required data
      if (!selectedPlotId) {
        Alert.alert('No Plot Selected', 'Please select a plot first before uploading images');
        return;
      }
      
      if (!user?.id) {
        Alert.alert('Authentication Error', 'Please log in to upload images');
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingSoilImage(true);
        const imageUri = result.assets[0].uri;
        
        console.log('📤 Upload data - User ID:', user.id, 'Plot ID:', selectedPlotId);
        
        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          type: 'image/jpeg',
          name: 'soil_image.jpg',
        });
        formData.append('user_id', user.id);
        formData.append('image_type', 'soil');
        formData.append('plot_id', selectedPlotId);

        console.log('📤 Uploading soil image to plot:', selectedPlotId);
        
        const uploadResponse = await fetch(`${API_BASE}/upload/plot-image`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log('📥 Soil upload response status:', uploadResponse.status);
        
        let uploadData;
        try {
          uploadData = await uploadResponse.json();
        } catch (parseError) {
          const responseText = await uploadResponse.text();
          console.error('❌ Failed to parse soil response as JSON:', responseText);
          Alert.alert('Upload Error', `Server returned invalid response (${uploadResponse.status})`);
          setUploadingSoilImage(false);
          return;
        }
        
        console.log('📥 Soil response data:', uploadData);
        
        if (uploadData.success) {
          console.log('✅ Soil image uploaded successfully:', uploadData.image_url);
          console.log('🔬 AI Analysis completed:', uploadData.analysis_completed);
          console.log('📊 Analysis data:', uploadData.ai_analysis);
          
          const hasAnalysis = uploadData.analysis_completed && uploadData.ai_analysis?.soil_health;
          const analysisMsg = hasAnalysis 
            ? `AI Analysis Complete!\n\nFertility Score: ${uploadData.ai_analysis.soil_health.fertility_score}/10\nSoil Type: ${uploadData.ai_analysis.soil_health.soil_type}\nNitrogen: ${uploadData.ai_analysis.soil_health.nutrients.nitrogen}`
            : 'Soil image uploaded successfully! AI analysis will be available shortly.';
          
          Alert.alert(
            'Success', 
            analysisMsg,
            [{ text: 'OK', onPress: () => loadPlotDetails(selectedPlotId) }]
          );
        } else {
          console.error('❌ Soil upload failed:', uploadData);
          const errorMsg = uploadData.detail 
            ? (Array.isArray(uploadData.detail) 
                ? uploadData.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('\n')
                : uploadData.detail)
            : (uploadData.error || 'Failed to upload image');
          Alert.alert('Upload Failed', errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ Error uploading soil image:', error);
      Alert.alert('Error', 'Failed to upload soil image: ' + error.message);
    } finally {
      setUploadingSoilImage(false);
    }
  };

  // Upload crop health image for AI analysis
  const uploadCropImage = async () => {
    try {
      // Validate required data
      if (!selectedPlotId) {
        Alert.alert('No Plot Selected', 'Please select a plot first before uploading images');
        return;
      }
      
      if (!user?.id) {
        Alert.alert('Authentication Error', 'Please log in to upload images');
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingCropImage(true);
        const imageUri = result.assets[0].uri;
        
        console.log('📤 Upload data - User ID:', user.id, 'Plot ID:', selectedPlotId);
        
        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          type: 'image/jpeg',
          name: 'crop_image.jpg',
        });
        formData.append('user_id', user.id);
        formData.append('image_type', 'progress');
        formData.append('plot_id', selectedPlotId);

        console.log('📤 Uploading crop health image to plot:', selectedPlotId);
        
        const uploadResponse = await fetch(`${API_BASE}/upload/plot-image`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log('📥 Crop upload response status:', uploadResponse.status);
        
        let uploadData;
        try {
          uploadData = await uploadResponse.json();
        } catch (parseError) {
          const responseText = await uploadResponse.text();
          console.error('❌ Failed to parse crop response as JSON:', responseText);
          Alert.alert('Upload Error', `Server returned invalid response (${uploadResponse.status})`);
          setUploadingCropImage(false);
          return;
        }
        
        console.log('📥 Crop response data:', uploadData);
        
        if (uploadData.success) {
          console.log('✅ Crop image uploaded successfully:', uploadData.image_url);
          console.log('🐛 AI Analysis completed:', uploadData.analysis_completed);
          console.log('📊 Analysis data:', uploadData.ai_analysis);
          
          const hasAnalysis = uploadData.analysis_completed && uploadData.ai_analysis?.pest_disease_scan;
          const analysisMsg = hasAnalysis 
            ? `AI Analysis Complete!\n\nHealth Status: ${uploadData.ai_analysis.pest_disease_scan.health_status}\nRisk Level: ${uploadData.ai_analysis.pest_disease_scan.risk_level}\nPests Detected: ${uploadData.ai_analysis.pest_disease_scan.detected_pests?.length || 0}\nDiseases Detected: ${uploadData.ai_analysis.pest_disease_scan.detected_diseases?.length || 0}`
            : 'Crop image uploaded successfully! AI analysis will be available shortly.';
          
          Alert.alert(
            'Success', 
            analysisMsg,
            [{ text: 'OK', onPress: () => loadPlotDetails(selectedPlotId) }]
          );
        } else {
          console.error('❌ Crop upload failed:', uploadData);
          const errorMsg = uploadData.detail 
            ? (Array.isArray(uploadData.detail) 
                ? uploadData.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('\n')
                : uploadData.detail)
            : (uploadData.error || 'Failed to upload image');
          Alert.alert('Upload Failed', errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ Error uploading crop image:', error);
      Alert.alert('Error', 'Failed to upload crop image: ' + error.message);
    } finally {
      setUploadingCropImage(false);
    }
  };

  // Watch for plot selection changes
  useEffect(() => {
    console.log('🔄 useEffect triggered - selectedPlotId:', selectedPlotId, 'user?.id:', user?.id);
    if (selectedPlotId && user?.id) {
      loadPlotDetails(selectedPlotId);
    } else {
      console.log('⚠️ useEffect skipped loadPlotDetails - missing dependency');
    }
  }, [selectedPlotId, user?.id]);

  useEffect(() => {
    console.log('🔄 loadPlots useEffect - selectedPlotId:', selectedPlotId, 'user?.id:', user?.id);
    if (!selectedPlotId && user?.id) {
      loadPlots();
    }
  }, [selectedPlotId, user]);

  const createDemoData = async () => {
    if (!user?.id) return;
    
    setCreatingDemo(true);
    try {
      const response = await fetch(`https://urchin-app-86rjy.ondigitalocean.app/api/advanced-growth/seed-demo-data/${user.id}`, {
        method: 'POST',
      });
      const data = await response.json();
      console.log("✅ Demo data created:", data);
      
      // Reload plots
      await loadPlots();
    } catch (err) {
      console.error("❌ Error creating demo data:", err);
      alert("Failed to create demo data. Make sure the backend is running.");
    } finally {
      setCreatingDemo(false);
    }
  };

  const currentUserId = user?.id || null;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your plots...</Text>
      </View>
    );
  }

  if (error === "no_plots" && !selectedPlotId) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="sprout-outline" size={80} color="#ccc" />
        <Text style={styles.title}>No Plots Found</Text>
        <Text style={styles.message}>
          You don't have any plots yet. Create your first plot to start tracking growth!
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Create New Plot"
            onPress={() => navigation.navigate('CreatePlot')}
            color="#4CAF50"
          />
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <Button
            title={creatingDemo ? "Creating..." : "Create Demo Plot"}
            onPress={createDemoData}
            disabled={creatingDemo}
            color="#2196F3"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Plot Selector - Always visible */}
      <View style={styles.plotSelectorContainer}>
        <View style={styles.plotSelectorHeader}>
          <Text style={styles.plotSelectorLabel}>
            {allPlots.length === 0 ? 'No Plots Yet' : allPlots.length === 1 ? 'My Plot' : 'Select Plot'}
          </Text>
          <View style={styles.headerButtons}>
            {selectedPlotId && (
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => navigation.navigate('PlotDetails', { plotId: selectedPlotId })}
              >
                <MaterialCommunityIcons name="chart-line" size={20} color="#2196F3" />
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.createPlotButton}
              onPress={() => navigation.navigate('CreatePlot')}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="#4CAF50" />
              <Text style={styles.createPlotButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {allPlots.length > 0 && (
          <View>
            <Picker
              selectedValue={selectedPlotId}
              style={styles.plotPicker}
              onValueChange={(itemValue) => setSelectedPlotId(itemValue)}
            >
              {allPlots.map((plot) => {
                const plotLabel = `${plot.crop_type || 'Unknown Crop'}${
                  plot.variety ? ' - ' + plot.variety : ''
                } | ${plot.area_size || '0'} ${plot.area_unit || 'sqm'}${
                  plot.plot_name ? ' (' + plot.plot_name + ')' : ''
                }${plot.is_demo ? ' [DEMO]' : ''}`;
                
                return (
                  <Picker.Item
                    key={plot.id}
                    label={plotLabel}
                    value={plot.id}
                  />
                );
              })}
            </Picker>
            
            {/* Selected Plot Details */}
            {loadingDetails && (
              <View style={styles.loadingDetailsContainer}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingDetailsText}>Loading plot details...</Text>
              </View>
            )}
            
            {!loadingDetails && selectedPlotDetails && selectedPlotDetails.plot && (() => {
              console.log('🎨 RENDERING PLOT DETAILS');
              console.log('📦 selectedPlotDetails keys:', Object.keys(selectedPlotDetails));
              console.log('📊 Images:', selectedPlotDetails.images?.length || 0);
              console.log('📅 Upcoming events:', selectedPlotDetails.upcoming_events?.length || 0);
              console.log('🌱 Plot data:', JSON.stringify(selectedPlotDetails.plot, null, 2));
              
              return (
              <ScrollView style={styles.plotDetailsCard} nestedScrollEnabled={true}>
                {/* Uploaded Images Gallery with ML Analysis */}
                {selectedPlotDetails.images && selectedPlotDetails.images.length > 0 && (
                  <View style={styles.imagesGallerySection}>
                    <View style={styles.galleryHeader}>
                      <Text style={styles.sectionTitle}>📸 Uploaded Images & ML Analysis</Text>
                      <Text style={styles.gallerySubtitle}>
                        {selectedPlotDetails.images.filter(img => img.ai_analysis).length} of {selectedPlotDetails.images.length} analyzed
                      </Text>
                    </View>
                    {selectedPlotDetails.images.map((image, index) => {
                      const hasAnalysis = image.ai_analysis && (
                        image.ai_analysis.pest_disease_scan || 
                        image.ai_analysis.soil_health
                      );
                      const imageUrl = image.image_url || image.url;
                      
                      return (
                        <View key={image.id || index} style={styles.imageCard}>
                          {/* Image Preview */}
                          {imageUrl && (
                            <Image 
                              source={{ uri: imageUrl }}
                              style={styles.uploadedImagePreview}
                              resizeMode="cover"
                            />
                          )}
                          
                          <View style={styles.imageCardHeader}>
                            <View style={styles.imageInfo}>
                              <MaterialCommunityIcons 
                                name={image.image_type === 'soil' ? 'texture-box' : 'leaf'} 
                                size={24} 
                                color="#6B8E23" 
                              />
                              <View style={styles.imageMetadata}>
                                <Text style={styles.imageType}>
                                  {image.image_type === 'soil' ? '🌱 Soil Sample' : '🌿 Crop Image'}
                                </Text>
                                <Text style={styles.imageTimestamp}>
                                  {new Date(image.uploaded_at || image.created_at).toLocaleDateString()} at {new Date(image.uploaded_at || image.created_at).toLocaleTimeString()}
                                </Text>
                              </View>
                            </View>
                            
                            {hasAnalysis && (
                              <TouchableOpacity 
                                style={styles.detailsButton}
                                onPress={() => {
                                  const analysisData = image.ai_analysis.pest_disease_scan || image.ai_analysis.soil_health;
                                  const analysisType = image.ai_analysis.pest_disease_scan ? 'Pest & Disease' : 'Soil Health';
                                  
                                  // Create detailed analysis message
                                  let detailsMessage = `📊 ${analysisType} Analysis\n\n`;
                                  
                                  if (image.ai_analysis.pest_disease_scan) {
                                    const scan = image.ai_analysis.pest_disease_scan;
                                    detailsMessage += `🏥 Health Status: ${scan.health_status || 'Unknown'}\n`;
                                    detailsMessage += `⚠️ Risk Level: ${scan.risk_level || 'Low'}\n`;
                                    detailsMessage += `🐛 Pests Detected: ${scan.detected_pests?.length || 0}\n`;
                                    detailsMessage += `� Diseases Detected: ${scan.detected_diseases?.length || 0}\n\n`;
                                    
                                    if (scan.detected_pests && scan.detected_pests.length > 0) {
                                      detailsMessage += `🐛 PESTS:\n`;
                                      scan.detected_pests.forEach((pest, i) => {
                                        detailsMessage += `\n${i + 1}. ${pest.pest_name}\n`;
                                        detailsMessage += `   Scientific: ${pest.scientific_name}\n`;
                                        detailsMessage += `   Severity: ${pest.severity}\n`;
                                        detailsMessage += `   Confidence: ${(pest.confidence * 100).toFixed(1)}%\n`;
                                      });
                                    }
                                    
                                    if (scan.detected_diseases && scan.detected_diseases.length > 0) {
                                      detailsMessage += `\n🦠 DISEASES:\n`;
                                      scan.detected_diseases.forEach((disease, i) => {
                                        detailsMessage += `\n${i + 1}. ${disease.disease_name}\n`;
                                        detailsMessage += `   Scientific: ${disease.scientific_name}\n`;
                                        detailsMessage += `   Severity: ${disease.severity}\n`;
                                        detailsMessage += `   Confidence: ${(disease.confidence * 100).toFixed(1)}%\n`;
                                      });
                                    }
                                    
                                    if (scan.immediate_actions && scan.immediate_actions.length > 0) {
                                      detailsMessage += `\n⚡ IMMEDIATE ACTIONS:\n`;
                                      scan.immediate_actions.forEach((action, i) => {
                                        detailsMessage += `${i + 1}. ${action}\n`;
                                      });
                                    }
                                  }
                                  
                                  if (image.ai_analysis.soil_health) {
                                    const soil = image.ai_analysis.soil_health;
                                    detailsMessage += `🌱 Soil Type: ${soil.soil_type || 'Unknown'}\n`;
                                    detailsMessage += `📊 Fertility Score: ${soil.fertility_score || 'N/A'}/10\n`;
                                    detailsMessage += `🧪 pH Level: ${soil.ph_level || 'N/A'}\n`;
                                    detailsMessage += `💧 Moisture: ${soil.moisture || 'N/A'}\n`;
                                    detailsMessage += `🌡️ Temperature: ${soil.temperature || 'N/A'}°C\n\n`;
                                    
                                    if (soil.nutrients) {
                                      detailsMessage += `🧪 NUTRIENTS:\n`;
                                      detailsMessage += `   Nitrogen (N): ${soil.nutrients.nitrogen}\n`;
                                      detailsMessage += `   Phosphorus (P): ${soil.nutrients.phosphorus}\n`;
                                      detailsMessage += `   Potassium (K): ${soil.nutrients.potassium}\n\n`;
                                    }
                                    
                                    if (soil.recommendations && soil.recommendations.length > 0) {
                                      detailsMessage += `💡 RECOMMENDATIONS:\n`;
                                      soil.recommendations.forEach((rec, i) => {
                                        detailsMessage += `${i + 1}. ${rec}\n`;
                                      });
                                    }
                                  }
                                  
                                  Alert.alert(
                                    `🤖 ${analysisType} Analysis`,
                                    detailsMessage,
                                    [
                                      {
                                        text: 'View JSON',
                                        onPress: () => {
                                          Alert.alert(
                                            'Raw Analysis Data',
                                            JSON.stringify(analysisData, null, 2),
                                            [{ text: 'Close' }]
                                          );
                                        }
                                      },
                                      { text: 'Close', style: 'cancel' }
                                    ],
                                    { cancelable: true }
                                  );
                                }}
                              >
                                <MaterialCommunityIcons name="information" size={20} color="#fff" />
                                <Text style={styles.detailsButtonText}>Details</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          
                          {/* Analysis Summary */}
                          {hasAnalysis ? (
                            <View style={styles.analysisSummary}>
                              {image.ai_analysis.pest_disease_scan && (
                                <>
                                  <View style={styles.summaryRow}>
                                    <MaterialCommunityIcons name="shield-check" size={18} color="#4CAF50" />
                                    <Text style={styles.summaryLabel}>Health:</Text>
                                    <Text style={[styles.summaryValue, {
                                      color: image.ai_analysis.pest_disease_scan.health_status === 'healthy' ? '#4CAF50' : '#FF5722'
                                    }]}>
                                      {image.ai_analysis.pest_disease_scan.health_status || 'Unknown'}
                                    </Text>
                                  </View>
                                  <View style={styles.summaryRow}>
                                    <MaterialCommunityIcons name="alert" size={18} color="#FF9800" />
                                    <Text style={styles.summaryLabel}>Risk:</Text>
                                    <Text style={styles.summaryValue}>
                                      {image.ai_analysis.pest_disease_scan.risk_level || 'Low'}
                                    </Text>
                                  </View>
                                  <View style={styles.summaryRow}>
                                    <MaterialCommunityIcons name="bug" size={18} color="#F44336" />
                                    <Text style={styles.summaryLabel}>Issues:</Text>
                                    <Text style={styles.summaryValue}>
                                      {(image.ai_analysis.pest_disease_scan.detected_pests?.length || 0) + 
                                       (image.ai_analysis.pest_disease_scan.detected_diseases?.length || 0)} detected
                                    </Text>
                                  </View>
                                  {image.ai_analysis.pest_disease_scan.confidence && (
                                    <View style={styles.summaryRow}>
                                      <MaterialCommunityIcons name="gauge" size={18} color="#2196F3" />
                                      <Text style={styles.summaryLabel}>Confidence:</Text>
                                      <Text style={styles.summaryValue}>
                                        {(image.ai_analysis.pest_disease_scan.confidence * 100).toFixed(1)}%
                                      </Text>
                                    </View>
                                  )}
                                </>
                              )}
                              
                              {image.ai_analysis.soil_health && (
                                <>
                                  <View style={styles.summaryRow}>
                                    <MaterialCommunityIcons name="sprout" size={18} color="#6B8E23" />
                                    <Text style={styles.summaryLabel}>Soil Type:</Text>
                                    <Text style={styles.summaryValue}>
                                      {image.ai_analysis.soil_health.soil_type || 'Unknown'}
                                    </Text>
                                  </View>
                                  <View style={styles.summaryRow}>
                                    <MaterialCommunityIcons name="chart-line" size={18} color="#4CAF50" />
                                    <Text style={styles.summaryLabel}>Fertility:</Text>
                                    <Text style={styles.summaryValue}>
                                      {image.ai_analysis.soil_health.fertility_score || 'N/A'}/10
                                    </Text>
                                  </View>
                                  <View style={styles.summaryRow}>
                                    <MaterialCommunityIcons name="flask" size={18} color="#2196F3" />
                                    <Text style={styles.summaryLabel}>pH Level:</Text>
                                    <Text style={styles.summaryValue}>
                                      {image.ai_analysis.soil_health.ph_level || 'N/A'}
                                    </Text>
                                  </View>
                                  {image.ai_analysis.soil_health.nutrients && (
                                    <View style={styles.nutrientsGrid}>
                                      <View style={styles.nutrientItem}>
                                        <Text style={styles.nutrientLabel}>N</Text>
                                        <Text style={styles.nutrientValue}>
                                          {image.ai_analysis.soil_health.nutrients.nitrogen}
                                        </Text>
                                      </View>
                                      <View style={styles.nutrientItem}>
                                        <Text style={styles.nutrientLabel}>P</Text>
                                        <Text style={styles.nutrientValue}>
                                          {image.ai_analysis.soil_health.nutrients.phosphorus}
                                        </Text>
                                      </View>
                                      <View style={styles.nutrientItem}>
                                        <Text style={styles.nutrientLabel}>K</Text>
                                        <Text style={styles.nutrientValue}>
                                          {image.ai_analysis.soil_health.nutrients.potassium}
                                        </Text>
                                      </View>
                                    </View>
                                  )}
                                </>
                              )}
                            </View>
                          ) : (
                            <View style={styles.noAnalysisBox}>
                              <MaterialCommunityIcons name="clock-outline" size={20} color="#999" />
                              <Text style={styles.noAnalysisText}>
                                {image.image_type === 'initial' 
                                  ? 'Initial photo - No analysis needed' 
                                  : 'Analysis pending... Upload a new image to trigger ML analysis'}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* AI Disease & Pest Detection */}
                {(() => {
                  const pestAnalysis = selectedPlotDetails.images?.find(
                    img => img.ai_analysis?.pest_disease_scan
                  )?.ai_analysis?.pest_disease_scan;
                  
                  const displayData = pestAnalysis;
                  const isRealData = !!pestAnalysis;
                  
                  console.log("🐛 Pest Analysis found:", isRealData);
                  console.log("🐛 Show Pest JSON state:", showPestJSON);
                  
                  return (
                    <View style={styles.analysisSection}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🐛 Disease & Pest Detection</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity 
                            style={styles.uploadImageButton}
                            onPress={uploadCropImage}
                            disabled={uploadingCropImage}
                          >
                            {uploadingCropImage ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="camera-plus" size={18} color="#fff" />
                                <Text style={styles.uploadImageButtonText}>Upload Crop</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          {isRealData && (
                            <TouchableOpacity 
                              style={styles.jsonToggleButton}
                              onPress={() => {
                                console.log("🔘 Pest JSON Toggle clicked! Current state:", showPestJSON);
                                setShowPestJSON(!showPestJSON);
                              }}
                            >
                              <MaterialCommunityIcons 
                                name={showPestJSON ? "code-json" : "code-braces"} 
                                size={20} 
                                color="#2196F3" 
                              />
                              <Text style={styles.jsonToggleText}>
                                {showPestJSON ? 'Hide' : 'Show'} JSON
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      
                      {/* JSON Dashboard or Empty State */}
                      {!isRealData ? (
                        <View style={styles.emptyStateContainer}>
                          <MaterialCommunityIcons name="camera-off" size={64} color="#ccc" />
                          <Text style={styles.emptyStateTitle}>No Analysis Available</Text>
                          <Text style={styles.emptyStateText}>
                            Upload crop images to get AI-powered pest and disease detection
                          </Text>
                        </View>
                      ) : showPestJSON ? (
                        <View style={styles.jsonDashboard}>
                          <View style={styles.jsonHeader}>
                            <MaterialCommunityIcons name="code-json" size={24} color="#4CAF50" />
                            <Text style={styles.jsonHeaderText}>
                              Pest & Disease Analysis - JSON Data
                            </Text>
                          </View>
                          <View style={styles.jsonScrollContainer}>
                            <ScrollView 
                              horizontal 
                              nestedScrollEnabled={true}
                              showsHorizontalScrollIndicator={true}
                            >
                              <ScrollView 
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                              >
                                <Text style={styles.jsonText}>
                                  {JSON.stringify(displayData, null, 2)}
                                </Text>
                              </ScrollView>
                            </ScrollView>
                          </View>
                          <View style={styles.jsonFooter}>
                            <Text style={styles.jsonFooterText}>
                              📊 Total Pests: {displayData.detected_pests?.length || 0} | 
                              🦠 Total Diseases: {displayData.detected_diseases?.length || 0} | 
                              ⚡ Actions: {displayData.immediate_actions?.length || 0}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.debugText}>JSON hidden - Click "Show JSON" to view data</Text>
                      )}
                      
                      {isRealData && (
                        <>
                        {/* Health Status Badge */}
                        <View style={styles.healthStatusBadge}>
                        <MaterialCommunityIcons 
                          name={displayData.health_status === 'healthy' ? 'check-circle' : 'alert-circle'}
                          size={24}
                          color={displayData.health_status === 'healthy' ? '#4CAF50' : '#FF5722'}
                        />
                        <Text style={[
                          styles.healthStatusText,
                          { color: displayData.health_status === 'healthy' ? '#4CAF50' : '#FF5722' }
                        ]}>
                          {displayData.health_status?.toUpperCase()}
                        </Text>
                        <Text style={styles.confidenceText}>
                          ({(displayData.confidence * 100).toFixed(0)}% confidence)
                        </Text>
                      </View>
                      
                      {/* Risk Level */}
                      {displayData.risk_level && (
                        <View style={[styles.riskLevelBadge, { backgroundColor: getRiskColor(displayData.risk_level) }]}>
                          <Text style={styles.riskLevelText}>Risk: {displayData.risk_level.toUpperCase()}</Text>
                        </View>
                      )}
                      
                      {/* Growth Stage */}
                      {displayData.growth_stage && (
                        <View style={styles.growthStageContainer}>
                          <MaterialCommunityIcons name="sprout" size={20} color="#4CAF50" />
                          <Text style={styles.growthStageText}>
                            Growth Stage: {displayData.growth_stage.stage?.toUpperCase()} 
                            ({displayData.growth_stage.maturity})
                          </Text>
                        </View>
                      )}
                      
                      {/* Health Metrics */}
                      {displayData.health_metrics && (
                        <View style={styles.healthMetricsBox}>
                          <Text style={styles.metricsTitle}>Plant Health Metrics</Text>
                          <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Health Score:</Text>
                            <Text style={[styles.metricValue, { color: displayData.health_metrics.health_score > 70 ? '#4CAF50' : '#FF9800' }]}>
                              {displayData.health_metrics.health_score}/100
                            </Text>
                          </View>
                          <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Vigor:</Text>
                            <Text style={styles.metricValue}>{displayData.health_metrics.vigor?.toUpperCase()}</Text>
                          </View>
                          {displayData.health_metrics.yellowing_percentage > 0 && (
                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>⚠️ Yellowing:</Text>
                              <Text style={[styles.metricValue, { color: '#FF9800' }]}>
                                {displayData.health_metrics.yellowing_percentage}%
                              </Text>
                            </View>
                          )}
                          {displayData.health_metrics.browning_percentage > 0 && (
                            <View style={styles.metricRow}>
                              <Text style={styles.metricLabel}>⚠️ Browning:</Text>
                              <Text style={[styles.metricValue, { color: '#F44336' }]}>
                                {displayData.health_metrics.browning_percentage}%
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                      
                      {/* Detected Pests */}
                      {displayData.detected_pests && displayData.detected_pests.length > 0 && (
                        <View style={styles.detectedIssuesBox}>
                          <Text style={styles.issuesTitle}>🐜 Detected Pests ({displayData.detected_pests.length})</Text>
                          {displayData.detected_pests.map((pest, idx) => (
                            <View key={idx} style={styles.issueCard}>
                              <View style={styles.issueHeader}>
                                <Text style={styles.issueName}>{pest.name}</Text>
                                <View style={[styles.severityBadge, { backgroundColor: 
                                  pest.severity === 'high' ? '#F44336' : 
                                  pest.severity === 'moderate' ? '#FF9800' : '#FFC107' 
                                }]}>
                                  <Text style={styles.severityText}>{pest.severity?.toUpperCase()}</Text>
                                </View>
                              </View>
                              <Text style={styles.scientificName}>{pest.scientific_name}</Text>
                              <Text style={styles.issueDetail}>Coverage: {pest.coverage_percentage || 'N/A'}%</Text>
                              <Text style={styles.issueDetail}>Economic Impact: {pest.economic_impact || 'Unknown'}</Text>
                              <View style={styles.treatmentBox}>
                                <Text style={styles.treatmentLabel}>💊 Treatment:</Text>
                                <Text style={styles.treatmentText}>{pest.treatment}</Text>
                              </View>
                              <View style={styles.actionBox}>
                                <Text style={styles.actionLabel}>⚡ Immediate Action:</Text>
                                <Text style={styles.actionText}>{pest.immediate_action}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Detected Diseases */}
                      {displayData.detected_diseases && displayData.detected_diseases.length > 0 && (
                        <View style={styles.detectedIssuesBox}>
                          <Text style={styles.issuesTitle}>🦠 Detected Diseases ({displayData.detected_diseases.length})</Text>
                          {displayData.detected_diseases.map((disease, idx) => (
                            <View key={idx} style={styles.issueCard}>
                              <View style={styles.issueHeader}>
                                <Text style={styles.issueName}>{disease.name}</Text>
                                <View style={[styles.severityBadge, { backgroundColor: 
                                  disease.severity === 'high' ? '#F44336' : 
                                  disease.severity === 'moderate' ? '#FF9800' : '#FFC107' 
                                }]}>
                                  <Text style={styles.severityText}>{disease.severity?.toUpperCase()}</Text>
                                </View>
                              </View>
                              <Text style={styles.scientificName}>{disease.scientific_name}</Text>
                              <Text style={styles.pathogenType}>Pathogen: {disease.pathogen_type?.toUpperCase()}</Text>
                              <Text style={styles.issueDetail}>Affected Area: {disease.affected_area_percentage || 'N/A'}%</Text>
                              <Text style={styles.issueDetail}>Spread Risk: {disease.spread_risk || 'Unknown'}</Text>
                              {disease.symptoms && disease.symptoms.length > 0 && (
                                <View style={styles.symptomsBox}>
                                  <Text style={styles.symptomsLabel}>Symptoms:</Text>
                                  {disease.symptoms.map((symptom, sidx) => (
                                    <Text key={sidx} style={styles.symptomText}>• {symptom}</Text>
                                  ))}
                                </View>
                              )}
                              <View style={styles.treatmentBox}>
                                <Text style={styles.treatmentLabel}>💊 Treatment:</Text>
                                <Text style={styles.treatmentText}>{disease.treatment}</Text>
                              </View>
                              <View style={styles.actionBox}>
                                <Text style={styles.actionLabel}>🛡️ Prevention:</Text>
                                <Text style={styles.actionText}>{disease.prevention}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Predictions */}
                      {displayData.predictions && displayData.predictions.length > 0 && (
                        <View style={styles.predictionsBox}>
                          <Text style={styles.predictionsTitle}>🔮 Predictions & Forecasts</Text>
                          {displayData.predictions.map((pred, idx) => (
                            <View key={idx} style={styles.predictionCard}>
                              <Text style={styles.predictionIssue}>{pred.issue}</Text>
                              <View style={styles.predictionDetails}>
                                <Text style={styles.predictionLabel}>Likelihood:</Text>
                                <Text style={[styles.predictionValue, { 
                                  color: pred.likelihood === 'high' ? '#F44336' : '#FF9800' 
                                }]}>
                                  {pred.likelihood?.toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.predictionDetails}>
                                <Text style={styles.predictionLabel}>Timeframe:</Text>
                                <Text style={styles.predictionValue}>{pred.timeframe}</Text>
                              </View>
                              <Text style={styles.predictionReason}>Reason: {pred.reason}</Text>
                              <View style={styles.preventionBox}>
                                <Text style={styles.preventionLabel}>Prevention:</Text>
                                <Text style={styles.preventionText}>{pred.prevention}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Immediate Actions */}
                      {displayData.immediate_actions && displayData.immediate_actions.length > 0 && (
                        <View style={styles.immediateActionsBox}>
                          <Text style={styles.immediateActionsTitle}>⚡ Immediate Actions Required</Text>
                          {displayData.immediate_actions.map((action, idx) => (
                            <Text key={idx} style={styles.immediateActionText}>{action}</Text>
                          ))}
                        </View>
                      )}
                      
                      {/* No Issues Detected */}
                      {(!displayData.detected_pests || displayData.detected_pests.length === 0) && 
                       (!displayData.detected_diseases || displayData.detected_diseases.length === 0) && (
                        <View style={styles.issuesContainer}>
                          <MaterialCommunityIcons name="check-circle" size={48} color="#4CAF50" />
                          <Text style={styles.subSectionTitle}>✅ No Pests or Diseases Detected</Text>
                          <Text style={styles.issueText}>Your crop appears healthy!</Text>
                        </View>
                      )}
                        </>
                      )}
                    </View>
                  )
                })()}

                {/* Soil Health Metrics */}
                {(() => {
                  const soilAnalysis = selectedPlotDetails.images?.find(
                    img => img.ai_analysis?.soil_health
                  )?.ai_analysis?.soil_health;
                  
                  const displayData = soilAnalysis;
                  const isRealData = !!soilAnalysis;
                  
                  console.log("🌱 Soil Analysis found:", isRealData);
                  console.log("🌱 Show Soil JSON state:", showSoilJSON);
                  
                  return (
                    <View style={styles.analysisSection}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🌱 Soil Health Metrics</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity 
                            style={styles.uploadImageButton}
                            onPress={uploadSoilImage}
                            disabled={uploadingSoilImage}
                          >
                            {uploadingSoilImage ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="camera-plus" size={18} color="#fff" />
                                <Text style={styles.uploadImageButtonText}>Upload Soil</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          {isRealData && (
                            <TouchableOpacity 
                              style={styles.jsonToggleButton}
                              onPress={() => {
                                console.log("🔘 Soil JSON Toggle clicked! Current state:", showSoilJSON);
                                setShowSoilJSON(!showSoilJSON);
                              }}
                            >
                              <MaterialCommunityIcons 
                                name={showSoilJSON ? "code-json" : "code-braces"} 
                                size={20} 
                                color="#2196F3" 
                              />
                              <Text style={styles.jsonToggleText}>
                                {showSoilJSON ? 'Hide' : 'Show'} JSON
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      
                      {/* JSON Dashboard or Empty State */}
                      {!isRealData ? (
                        <View style={styles.emptyStateContainer}>
                          <MaterialCommunityIcons name="image-off" size={64} color="#ccc" />
                          <Text style={styles.emptyStateTitle}>No Soil Analysis Available</Text>
                          <Text style={styles.emptyStateText}>
                            Upload soil images to get AI-powered soil health analysis
                          </Text>
                        </View>
                      ) : showSoilJSON ? (
                        <View style={styles.jsonDashboard}>
                          <View style={styles.jsonHeader}>
                            <MaterialCommunityIcons name="code-json" size={24} color="#4CAF50" />
                            <Text style={styles.jsonHeaderText}>
                              Soil Health Analysis - JSON Data
                            </Text>
                          </View>
                          <View style={styles.jsonScrollContainer}>
                            <ScrollView 
                              horizontal 
                              nestedScrollEnabled={true}
                              showsHorizontalScrollIndicator={true}
                            >
                              <ScrollView 
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                              >
                                <Text style={styles.jsonText}>
                                  {JSON.stringify(displayData, null, 2)}
                                </Text>
                              </ScrollView>
                            </ScrollView>
                          </View>
                          <View style={styles.jsonFooter}>
                            <Text style={styles.jsonFooterText}>
                              🌱 Fertility: {displayData.fertility_score}/10 | 
                              🧪 pH: {displayData.ph_estimate || 'N/A'} | 
                              🏞️ Type: {displayData.soil_type || 'Unknown'}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.debugText}>JSON hidden - Click "Show JSON" to view data</Text>
                      )}
                      
                      {isRealData && (
                      <>
                      <View style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Fertility Score:</Text>
                        <View style={styles.scoreBarContainer}>
                          <View style={[styles.scoreBar, { width: `${(displayData.fertility_score / 10) * 100}%` }]} />
                          <Text style={styles.scoreValue}>{displayData.fertility_score}/10</Text>
                        </View>
                      </View>
                      
                      {displayData.soil_type && (
                        <View style={styles.metricRow}>
                          <Text style={styles.metricLabel}>Soil Type:</Text>
                          <Text style={styles.metricValue}>{displayData.soil_type}</Text>
                        </View>
                      )}
                      
                      {displayData.nutrients && (
                        <View style={styles.nutrientsContainer}>
                          <Text style={styles.subSectionTitle}>NPK Levels:</Text>
                          <View style={styles.nutrientRow}>
                            <MaterialCommunityIcons name="alpha-n-circle" size={20} color="#4CAF50" />
                            <Text style={styles.nutrientLabel}>Nitrogen:</Text>
                            <Text style={styles.nutrientValue}>{displayData.nutrients.nitrogen || 'N/A'}</Text>
                          </View>
                          <View style={styles.nutrientRow}>
                            <MaterialCommunityIcons name="alpha-p-circle" size={20} color="#FF9800" />
                            <Text style={styles.nutrientLabel}>Phosphorus:</Text>
                            <Text style={styles.nutrientValue}>{displayData.nutrients.phosphorus || 'N/A'}</Text>
                          </View>
                          <View style={styles.nutrientRow}>
                            <MaterialCommunityIcons name="alpha-k-circle" size={20} color="#2196F3" />
                            <Text style={styles.nutrientLabel}>Potassium:</Text>
                            <Text style={styles.nutrientValue}>{displayData.nutrients.potassium || 'N/A'}</Text>
                          </View>
                        </View>
                      )}
                      
                      {displayData.ph_estimate && (
                        <View style={styles.metricRow}>
                          <Text style={styles.metricLabel}>pH Level:</Text>
                          <Text style={styles.metricValue}>{displayData.ph_estimate}</Text>
                        </View>
                      )}
                      </>
                      )}
                    </View>
                  )
                })()}

                {/* Upcoming Activities Calendar */}
                {(() => {
                  console.log('📅 Calendar check - upcoming_events:', selectedPlotDetails.upcoming_events?.length || 0);
                  console.log('📅 Upcoming events data:', selectedPlotDetails.upcoming_events);
                  
                  return selectedPlotDetails.upcoming_events && selectedPlotDetails.upcoming_events.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.sectionTitle}>📅 Upcoming Farm Activities</Text>
                    {selectedPlotDetails.upcoming_events.slice(0, 5).map((event, idx) => (
                      <View key={idx} style={styles.activityItem}>
                        <MaterialCommunityIcons 
                          name={getActivityIcon(event.practice_key)} 
                          size={20} 
                          color="#4CAF50" 
                        />
                        <View style={styles.activityContent}>
                          <Text style={styles.activityTitle}>{event.practice_name}</Text>
                          <Text style={styles.activityDate}>
                            {new Date(event.scheduled_date).toLocaleDateString()} 
                            {event.days_after_planting && ` (Day ${event.days_after_planting})`}
                          </Text>
                          {event.estimated_labor_hours && (
                            <Text style={styles.activityMeta}>
                              ⏱️ {event.estimated_labor_hours}h labor
                            </Text>
                          )}
                          {event.description && (
                            <Text style={styles.activityDescription} numberOfLines={2}>
                              {event.description}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                    {selectedPlotDetails.upcoming_events.length > 5 && (
                      <TouchableOpacity 
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('PlotDetails', { plotId: selectedPlotId })}
                      >
                        <Text style={styles.viewAllText}>
                          View all {selectedPlotDetails.upcoming_events.length} activities →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  )
                })()}

                {/* Budget Estimation */}
                {(() => {
                  const calculateBudget = () => {
                    const events = selectedPlotDetails.upcoming_events || [];
                    const laborCost = events.reduce((sum, e) => sum + (e.estimated_labor_hours || 0), 0) * 5; // $5/hour
                    
                    // Estimate input costs based on practices
                    const weedingEvents = events.filter(e => e.practice_key?.includes('weeding')).length;
                    const fertilizingEvents = events.filter(e => e.practice_key?.includes('fertilizer')).length;
                    const pesticideEvents = events.filter(e => e.practice_key?.includes('pest') || e.practice_key?.includes('disease')).length;
                    
                    const weedingCost = weedingEvents * 10; // $10 per weeding
                    const fertilizerCost = fertilizingEvents * 25; // $25 per fertilizer application
                    const pesticideCost = pesticideEvents * 30; // $30 per pesticide treatment
                    
                    const totalInputs = weedingCost + fertilizerCost + pesticideCost;
                    const total = laborCost + totalInputs;
                    
                    return { laborCost, weedingCost, fertilizerCost, pesticideCost, totalInputs, total };
                  };
                  
                  const budget = calculateBudget();
                  
                  return selectedPlotDetails.upcoming_events && selectedPlotDetails.upcoming_events.length > 0 && (
                    <View style={styles.analysisSection}>
                      <Text style={styles.sectionTitle}>💰 Estimated Budget</Text>
                      
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetLabel}>Labor Costs:</Text>
                        <Text style={styles.budgetValue}>${budget.laborCost.toFixed(2)}</Text>
                      </View>
                      
                      <View style={styles.budgetBreakdown}>
                        {budget.weedingCost > 0 && (
                          <View style={styles.budgetSubRow}>
                            <Text style={styles.budgetSubLabel}>• Weeding:</Text>
                            <Text style={styles.budgetSubValue}>${budget.weedingCost.toFixed(2)}</Text>
                          </View>
                        )}
                        {budget.fertilizerCost > 0 && (
                          <View style={styles.budgetSubRow}>
                            <Text style={styles.budgetSubLabel}>• Fertilizer (Organic/Inorganic):</Text>
                            <Text style={styles.budgetSubValue}>${budget.fertilizerCost.toFixed(2)}</Text>
                          </View>
                        )}
                        {budget.pesticideCost > 0 && (
                          <View style={styles.budgetSubRow}>
                            <Text style={styles.budgetSubLabel}>• Pest/Disease Control:</Text>
                            <Text style={styles.budgetSubValue}>${budget.pesticideCost.toFixed(2)}</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetLabel}>Total Inputs:</Text>
                        <Text style={styles.budgetValue}>${budget.totalInputs.toFixed(2)}</Text>
                      </View>
                      
                      <View style={[styles.budgetRow, styles.budgetTotal]}>
                        <Text style={styles.budgetTotalLabel}>Total Estimated Cost:</Text>
                        <Text style={styles.budgetTotalValue}>${budget.total.toFixed(2)}</Text>
                      </View>
                    </View>
                  )
                })()}
              </ScrollView>
            )
          })()}
          </View>
        )}
      </View>
      
      {/* Floating Action Button for Create Plot */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePlot')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Helper functions
function getRiskColor(risk) {
  const colors = {
    low: '#4CAF50',
    medium: '#FFC107',
    high: '#FF9800',
    critical: '#FF5722'
  };
  return colors[risk?.toLowerCase()] || '#999';
}

function getActivityIcon(practiceKey) {
  if (!practiceKey) return 'calendar';
  if (practiceKey.includes('weeding')) return 'delete-sweep';
  if (practiceKey.includes('fertilizer')) return 'spray';
  if (practiceKey.includes('pest') || practiceKey.includes('disease')) return 'bug';
  if (practiceKey.includes('harvest')) return 'basket';
  if (practiceKey.includes('water')) return 'water';
  if (practiceKey.includes('photo')) return 'camera';
  return 'shovel';
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 14,
  },
  plotSelectorContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  plotSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  plotSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  detailsButtonText: {
    marginLeft: 5,
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  createPlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  createPlotButtonText: {
    marginLeft: 5,
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  plotPicker: {
    height: 50,
    width: '100%',
  },
  plotDetailsCard: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 500,
  },
  overviewSection: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  plotNameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  demoBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  demoText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewItem: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  overviewSubValue: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: '#FFF9C4',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FBC02D',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  loadingDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingDetailsText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  imagesSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  imageGallery: {
    marginTop: 5,
  },
  imageItem: {
    marginRight: 10,
    alignItems: 'center',
  },
  plotImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  imageType: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
  },
  imageDate: {
    fontSize: 10,
    color: '#999',
  },
  analysisSection: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  healthStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  healthStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  riskLevelBadge: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  riskLevelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  issuesContainer: {
    marginTop: 10,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  issueText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 13,
    color: '#666',
    width: 100,
  },
  metricValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  scoreBarContainer: {
    flex: 1,
    position: 'relative',
    height: 24,
  },
  // New pest/disease detection styles
  growthStageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  growthStageText: {
    fontSize: 13,
    color: '#2E7D32',
    marginLeft: 8,
    fontWeight: '600',
  },
  healthMetricsBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  detectedIssuesBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  issuesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 10,
  },
  issueCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  issueName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scientificName: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 4,
  },
  pathogenType: {
    fontSize: 12,
    color: '#FF6F00',
    marginBottom: 4,
    fontWeight: '600',
  },
  issueDetail: {
    fontSize: 12,
    color: '#555',
    marginBottom: 3,
  },
  symptomsBox: {
    backgroundColor: '#FFF9E6',
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    marginBottom: 6,
  },
  symptomsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  symptomText: {
    fontSize: 11,
    color: '#555',
    marginBottom: 2,
  },
  treatmentBox: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  treatmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 3,
  },
  treatmentText: {
    fontSize: 11,
    color: '#333',
  },
  actionBox: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#388E3C',
    marginBottom: 3,
  },
  actionText: {
    fontSize: 11,
    color: '#333',
  },
  predictionsBox: {
    backgroundColor: '#F3E5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  predictionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6A1B9A',
    marginBottom: 10,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  predictionIssue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  predictionDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  predictionLabel: {
    fontSize: 12,
    color: '#666',
    width: 80,
  },
  predictionValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  predictionReason: {
    fontSize: 11,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 6,
  },
  preventionBox: {
    backgroundColor: '#FFF9C4',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  preventionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 2,
  },
  preventionText: {
    fontSize: 10,
    color: '#333',
  },
  immediateActionsBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  immediateActionsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C62828',
    marginBottom: 8,
  },
  immediateActionText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
    paddingLeft: 8,
  },
  scoreBarContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  scoreValue: {
    position: 'absolute',
    right: 8,
    top: 3,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  nutrientsContainer: {
    marginTop: 10,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nutrientLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  nutrientValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  activityContent: {
    marginLeft: 10,
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityMeta: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  viewAllButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 13,
    color: '#666',
  },
  budgetValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  budgetBreakdown: {
    marginLeft: 15,
    marginBottom: 10,
  },
  budgetSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetSubLabel: {
    fontSize: 12,
    color: '#888',
  },
  budgetSubValue: {
    fontSize: 12,
    color: '#666',
  },
  budgetTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  budgetTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  budgetTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  plotDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  plotDetailLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    width: 100,
  },
  plotDetailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Uploaded Images Gallery Styles
  imagesGallerySection: {
    backgroundColor: '#F9F7F4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  galleryHeader: {
    marginBottom: 12,
  },
  gallerySubtitle: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 4,
    fontStyle: 'italic',
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8DED2',
    elevation: 2,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  uploadedImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F5F3F0',
  },
  imageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  imageMetadata: {
    marginLeft: 10,
  },
  imageType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E2723',
  },
  imageTimestamp: {
    fontSize: 11,
    color: '#8B7355',
    marginTop: 2,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B8E23',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    elevation: 2,
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  analysisSummary: {
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#5D4E37',
    fontWeight: '500',
    marginLeft: 4,
  },
  summaryValue: {
    fontSize: 13,
    color: '#3E2723',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  nutrientsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8DED2',
  },
  nutrientItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 60,
  },
  nutrientLabel: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '600',
    marginBottom: 4,
  },
  nutrientValue: {
    fontSize: 14,
    color: '#6B8E23',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  noAnalysisBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  noAnalysisText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  // JSON Dashboard Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  jsonToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  jsonToggleText: {
    marginLeft: 5,
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 13,
  },
  jsonDashboard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  jsonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  jsonHeaderText: {
    marginLeft: 10,
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  jsonScrollContainer: {
    maxHeight: 400,
    minHeight: 200,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 10,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#D4D4D4',
    lineHeight: 18,
  },
  jsonFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  jsonFooterText: {
    color: '#9E9E9E',
    fontSize: 12,
    textAlign: 'center',
  },
  debugText: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
    padding: 10,
    textAlign: 'center',
  },
  sampleDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FF9800',
    gap: 8,
  },
  sampleDataText: {
    flex: 1,
    color: '#F57C00',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  uploadImageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});


