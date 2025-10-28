import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';

const API_BASE_URL = 'https://urchin-app-86rjy.ondigitalocean.app/api';

const AICalendarScreen = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form data
  const [crop, setCrop] = useState('maize');
  const [plantingDate, setPlantingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [county, setCounty] = useState('Nairobi');
  const [soilType, setSoilType] = useState('loamy');
  const [season, setSeason] = useState('long_rains');
  const [temperature, setTemperature] = useState(25);
  const [rainfall, setRainfall] = useState(100);
  const [pestPressure, setPestPressure] = useState('none');
  const [diseaseOccurrence, setDiseaseOccurrence] = useState('none');
  
  // Prediction result
  const [prediction, setPrediction] = useState(null);
  const [fullSchedule, setFullSchedule] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  
  // Options
  const crops = ['maize', 'beans', 'tomatoes', 'cabbage', 'kale', 'potatoes', 'wheat'];
  const counties = ['Nairobi', 'Kiambu', 'Nakuru', 'Meru', 'Kisumu', 'Eldoret', 'Machakos'];
  const soilTypes = ['sandy', 'loamy', 'clay', 'silty', 'peaty', 'chalky'];
  const seasons = [
    { label: 'Long Rains', value: 'long_rains' },
    { label: 'Short Rains', value: 'short_rains' },
    { label: 'Dry Season', value: 'dry_season' },
  ];
  const pressureLevels = ['none', 'low', 'medium', 'high'];
  
  useEffect(() => {
    checkModelStatus();
  }, []);
  
  const checkModelStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai-calendar/model-status`);
      setModelStatus(response.data);
    } catch (error) {
      console.error('Error checking model status:', error);
    }
  };
  
  const predictNextPractice = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/ai-calendar/predict`, {
        crop,
        planting_date: plantingDate.toISOString().split('T')[0],
        county,
        soil_type: soilType,
        season,
        temperature,
        rainfall_mm: rainfall,
        pest_pressure: pestPressure,
        disease_occurrence: diseaseOccurrence,
      });
      
      setPrediction(response.data);
    } catch (error) {
      console.error('Error predicting practice:', error);
      Alert.alert('Error', 'Failed to get AI prediction. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const generateFullSchedule = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/ai-calendar/schedule`, {
        crop,
        planting_date: plantingDate.toISOString().split('T')[0],
        county,
        soil_type: soilType,
        season,
      });
      
      setFullSchedule(response.data);
    } catch (error) {
      console.error('Error generating schedule:', error);
      Alert.alert('Error', 'Failed to generate schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([predictNextPractice(), checkModelStatus()])
      .finally(() => setRefreshing(false));
  };
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'upcoming':
        return '#ffc107';
      case 'scheduled':
        return '#007bff';
      default:
        return '#6c757d';
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Ionicons name="calendar" size={40} color="#28a745" />
        <Text style={styles.title}>AI Farming Calendar</Text>
        <Text style={styles.subtitle}>Smart scheduling for your farm</Text>
      </View>
      
      {/* Model Status */}
      {modelStatus && (
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={modelStatus.ai_calendar_model_available ? 'checkmark-circle' : 'warning'}
              size={20}
              color={modelStatus.ai_calendar_model_available ? '#28a745' : '#ffc107'}
            />
            <Text style={styles.statusText}>
              {modelStatus.ai_calendar_model_available
                ? 'AI Model Active'
                : 'Using Simulation Mode'}
            </Text>
          </View>
        </View>
      )}
      
      {/* Farm Details Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Farm Details</Text>
        
        {/* Crop Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Crop</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={crop}
              onValueChange={(value) => setCrop(value)}
              style={styles.picker}
            >
              {crops.map((c) => (
                <Picker.Item key={c} label={c.charAt(0).toUpperCase() + c.slice(1)} value={c} />
              ))}
            </Picker>
          </View>
        </View>
        
        {/* Planting Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Planting Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDate(plantingDate.toISOString())}</Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        {showDatePicker && (
          <DateTimePicker
            value={plantingDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setPlantingDate(selectedDate);
            }}
          />
        )}
        
        {/* County */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>County</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={county}
              onValueChange={(value) => setCounty(value)}
              style={styles.picker}
            >
              {counties.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>
        </View>
        
        {/* Soil Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Soil Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={soilType}
              onValueChange={(value) => setSoilType(value)}
              style={styles.picker}
            >
              {soilTypes.map((s) => (
                <Picker.Item key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} value={s} />
              ))}
            </Picker>
          </View>
        </View>
        
        {/* Season */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Season</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={season}
              onValueChange={(value) => setSeason(value)}
              style={styles.picker}
            >
              {seasons.map((s) => (
                <Picker.Item key={s.value} label={s.label} value={s.value} />
              ))}
            </Picker>
          </View>
        </View>
        
        {/* Pest & Disease Pressure */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Pest Pressure</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={pestPressure}
                onValueChange={(value) => setPestPressure(value)}
                style={styles.picker}
              >
                {pressureLevels.map((p) => (
                  <Picker.Item key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} value={p} />
                ))}
              </Picker>
            </View>
          </View>
          
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Disease</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={diseaseOccurrence}
                onValueChange={(value) => setDiseaseOccurrence(value)}
                style={styles.picker}
              >
                {pressureLevels.map((d) => (
                  <Picker.Item key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} value={d} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={predictNextPractice}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.buttonText}>Get Next Practice</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={generateFullSchedule}
          disabled={loading}
        >
          <Ionicons name="list" size={20} color="#007bff" />
          <Text style={[styles.buttonText, { color: '#007bff' }]}>Full Season</Text>
        </TouchableOpacity>
      </View>
      
      {/* Next Practice Prediction */}
      {prediction && (
        <View style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <Ionicons name="checkmark-circle" size={30} color={getPriorityColor(prediction.priority)} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.predictionTitle}>{prediction.next_practice.replace(/_/g, ' ').toUpperCase()}</Text>
              <Text style={styles.predictionSubtitle}>
                {prediction.days_until_practice === 0
                  ? 'Recommended Today'
                  : `In ${prediction.days_until_practice} day${prediction.days_until_practice > 1 ? 's' : ''}`}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(prediction.priority) }]}>
              <Text style={styles.priorityText}>{prediction.priority.toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={styles.predictionDescription}>{prediction.practice_description}</Text>
          
          <View style={styles.predictionDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Recommended: {formatDate(prediction.recommended_date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="leaf-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Growth Stage: {prediction.current_growth_stage}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="timer-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Days Since Planting: {prediction.days_since_planting}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="analytics-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Confidence: {(prediction.confidence * 100).toFixed(1)}% ({prediction.model_used})
              </Text>
            </View>
          </View>
          
          {/* Alternative Practices */}
          {prediction.alternative_practices && prediction.alternative_practices.length > 1 && (
            <View style={styles.alternativesSection}>
              <Text style={styles.alternativesTitle}>Alternative Practices:</Text>
              {prediction.alternative_practices.slice(1, 3).map((alt, index) => (
                <View key={index} style={styles.alternativeItem}>
                  <Text style={styles.alternativeName}>
                    {alt.practice.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.alternativeConfidence}>
                    {(alt.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      
      {/* Full Season Schedule */}
      {fullSchedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Full Season Schedule - {fullSchedule.crop.charAt(0).toUpperCase() + fullSchedule.crop.slice(1)}
          </Text>
          <Text style={styles.scheduleSubtitle}>
            {fullSchedule.total_practices} practices from planting to post-harvest
          </Text>
          
          {fullSchedule.schedule.map((item, index) => (
            <View key={index} style={styles.scheduleItem}>
              <View style={styles.scheduleHeader}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={styles.schedulePractice}>
                  {item.practice.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <View style={[styles.priorityBadge, styles.smallBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                  <Text style={[styles.priorityText, styles.smallText]}>{item.priority.toUpperCase()}</Text>
                </View>
              </View>
              
              <Text style={styles.scheduleDescription}>{item.description}</Text>
              
              <View style={styles.scheduleFooter}>
                <Text style={styles.scheduleDate}>📅 {formatDate(item.date)}</Text>
                <Text style={styles.scheduleDays}>
                  {item.days_from_planting < 0
                    ? `${Math.abs(item.days_from_planting)} days before planting`
                    : `Day ${item.days_from_planting}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#f9f9f9',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#28a745',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  predictionCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 6,
    borderLeftColor: '#28a745',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  predictionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 10,
  },
  predictionDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  predictionDetails: {
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  alternativesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  alternativeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  alternativeName: {
    fontSize: 14,
    color: '#555',
    textTransform: 'capitalize',
  },
  alternativeConfidence: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: -8,
    marginBottom: 16,
  },
  scheduleItem: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  schedulePractice: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  scheduleDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  scheduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  scheduleDays: {
    fontSize: 12,
    color: '#888',
  },
});

export default AICalendarScreen;
