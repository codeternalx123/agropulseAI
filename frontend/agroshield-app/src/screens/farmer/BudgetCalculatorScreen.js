/**
 * Budget Calculator Screen
 * Calculate crop production budget and ROI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Card, TextInput, Button, Chip, Divider } from 'react-native-paper';
import { Picker } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext.js';
import { locationAPI } from '../../services/api';

// Crop data with costs and yields
const CROP_DATABASE = {
  'Maize': {
    seedCostPerHa: 6000,
    fertilizerPerHa: 12000,
    laborDaysPerHa: 25,
    wateringCostPerHa: 8000,
    pesticidesPerHa: 4000,
    equipmentPerHa: 3000,
    yieldPerHa: 4000, // kg
    pricePerKg: 40,
    maturityDays: 105,
  },
  'Beans': {
    seedCostPerHa: 8000,
    fertilizerPerHa: 8000,
    laborDaysPerHa: 20,
    wateringCostPerHa: 6000,
    pesticidesPerHa: 3000,
    equipmentPerHa: 2500,
    yieldPerHa: 1500,
    pricePerKg: 100,
    maturityDays: 75,
  },
  'Potatoes': {
    seedCostPerHa: 50000,
    fertilizerPerHa: 15000,
    laborDaysPerHa: 40,
    wateringCostPerHa: 10000,
    pesticidesPerHa: 8000,
    equipmentPerHa: 5000,
    yieldPerHa: 20000,
    pricePerKg: 40,
    maturityDays: 105,
  },
  'Tomatoes': {
    seedCostPerHa: 20000,
    fertilizerPerHa: 18000,
    laborDaysPerHa: 60,
    wateringCostPerHa: 15000,
    pesticidesPerHa: 12000,
    equipmentPerHa: 8000,
    yieldPerHa: 30000,
    pricePerKg: 60,
    maturityDays: 80,
  },
  'Cabbage': {
    seedCostPerHa: 12000,
    fertilizerPerHa: 10000,
    laborDaysPerHa: 35,
    wateringCostPerHa: 8000,
    pesticidesPerHa: 6000,
    equipmentPerHa: 4000,
    yieldPerHa: 40000,
    pricePerKg: 25,
    maturityDays: 85,
  },
  'Coffee': {
    seedCostPerHa: 80000,
    fertilizerPerHa: 25000,
    laborDaysPerHa: 80,
    wateringCostPerHa: 20000,
    pesticidesPerHa: 15000,
    equipmentPerHa: 12000,
    yieldPerHa: 1000,
    pricePerKg: 120,
    maturityDays: 365,
  },
  'Tea': {
    seedCostPerHa: 100000,
    fertilizerPerHa: 30000,
    laborDaysPerHa: 90,
    wateringCostPerHa: 18000,
    pesticidesPerHa: 10000,
    equipmentPerHa: 15000,
    yieldPerHa: 2500,
    pricePerKg: 150,
    maturityDays: 365,
  },
};

export default function BudgetCalculatorScreen({ route, navigation }) {
  const { user } = useAuth();
  const { cropRecommendations, soilData } = route.params || {};

  const [selectedCrop, setSelectedCrop] = useState('');
  const [farmSize, setFarmSize] = useState('1');
  const [laborCost, setLaborCost] = useState('500');
  const [calculating, setCalculating] = useState(false);
  const [budget, setBudget] = useState(null);
  const [recommendedCrops, setRecommendedCrops] = useState([]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      if (cropRecommendations) {
        setRecommendedCrops(cropRecommendations.map(c => c.crop || c));
      } else {
        // Fallback: Use all crops from database if API fails
        setRecommendedCrops(Object.keys(CROP_DATABASE));
      }
    } catch (error) {
      console.error('Load recommendations error:', error);
      // Fallback: Use all crops from database
      setRecommendedCrops(Object.keys(CROP_DATABASE));
    }
  };

  const calculateBudget = () => {
    console.log('🧮 Calculate Budget clicked');
    console.log('Selected Crop:', selectedCrop);
    console.log('Farm Size:', farmSize);
    console.log('Labor Cost:', laborCost);
    
    if (!selectedCrop) {
      Alert.alert('Error', 'Please select a crop');
      return;
    }

    const size = parseFloat(farmSize) || 1;
    const laborRate = parseFloat(laborCost) || 500;

    if (size <= 0) {
      Alert.alert('Error', 'Farm size must be greater than 0');
      return;
    }

    setCalculating(true);

    try {
      // Get crop data
      const cropData = CROP_DATABASE[selectedCrop];
      
      console.log('Crop Data:', cropData);
      
      if (!cropData) {
        Alert.alert('Error', 'Crop data not available');
        setCalculating(false);
        return;
      }

      // Validate crop data has all required fields
      if (!cropData.pricePerKg) {
        Alert.alert('Error', `Price per kg not available for ${selectedCrop}`);
        setCalculating(false);
        return;
      }

      // Calculate costs
      const costs = {
        seeds: cropData.seedCostPerHa * size,
        fertilizer: cropData.fertilizerPerHa * size,
        labor: cropData.laborDaysPerHa * laborRate * size,
        watering: cropData.wateringCostPerHa * size,
        pesticides: cropData.pesticidesPerHa * size,
        equipment: cropData.equipmentPerHa * size,
      };

      const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);

      // Calculate revenue
      const expectedYield = cropData.yieldPerHa * size;
      const revenue = expectedYield * cropData.pricePerKg;
      const profit = revenue - totalCost;
      const roi = ((profit / totalCost) * 100).toFixed(1);

      const budgetResult = {
        crop: selectedCrop,
        farmSize: size,
        costs,
        totalCost,
        expectedYield,
        pricePerKg: cropData.pricePerKg,
        revenue,
        profit,
        roi,
        maturityDays: cropData.maturityDays,
        breakEven: Math.ceil(totalCost / cropData.pricePerKg),
      };

      console.log('✅ Budget Result:', budgetResult);
      setBudget(budgetResult);
    } catch (error) {
      console.error('❌ Calculation Error:', error);
      Alert.alert('Error', `Failed to calculate budget: ${error.message}`);
    } finally {
      setCalculating(false);
    }
  };

  const reset = () => {
    setBudget(null);
    setSelectedCrop('');
    setFarmSize('1');
  };

  const formatCurrency = (amount) => {
    return `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Green Top Bar */}
      <View style={styles.greenBar} />

      {/* Welcome Content */}
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>Welcome to Agropulse AI! 🎉</Text>
        <View style={styles.userBadge}>
          <Text style={styles.userIcon}>🛒</Text>
          <Text style={styles.userType}>BUYER</Text>
        </View>
        <Text style={styles.welcomeSubtitle}>How to Get Started:</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <MaterialCommunityIcons name="calculator" size={32} color="#4CAF50" />
            <Text style={styles.title}>Crop Budget Calculator</Text>
          </View>
          <Text style={styles.subtitle}>
            Calculate investment, costs, and expected profit
          </Text>
        </Card.Content>
      </Card>

      {!budget ? (
        <>
          {/* Input Form */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Crop Selection</Text>

              {recommendedCrops.length > 0 && (
                <View style={styles.recommendedChips}>
                  <Text style={styles.recommendedLabel}>
                    Recommended for your region:
                  </Text>
                  {recommendedCrops.slice(0, 4).map((crop, index) => (
                    <Chip
                      key={index}
                      selected={selectedCrop === crop}
                      onPress={() => setSelectedCrop(crop)}
                      style={styles.cropChip}
                    >
                      {crop}
                    </Chip>
                  ))}
                </View>
              )}

              <TextInput
                label="Select Crop *"
                value={selectedCrop}
                onChangeText={setSelectedCrop}
                mode="outlined"
                style={styles.input}
                right={<TextInput.Icon icon="chevron-down" />}
                placeholder="e.g., Maize, Beans, Potatoes"
              />

              <TextInput
                label="Farm Size (Hectares) *"
                value={farmSize}
                onChangeText={setFarmSize}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                left={<TextInput.Icon icon="land-fields" />}
              />

              <TextInput
                label="Labor Cost (KES per day)"
                value={laborCost}
                onChangeText={setLaborCost}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="currency-usd" />}
              />

              <Button
                mode="contained"
                onPress={calculateBudget}
                loading={calculating}
                disabled={calculating || !selectedCrop || !farmSize}
                style={styles.calculateButton}
                icon="calculator"
              >
                Calculate Budget
              </Button>
            </Card.Content>
          </Card>

          {/* Info Card */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.infoHeader}>
                <MaterialCommunityIcons name="information" size={20} color="#2196F3" />
                <Text style={styles.infoTitle}>What's Included?</Text>
              </View>
              <Text style={styles.infoText}>
                • Seeds and planting materials{'\n'}
                • Fertilizers and soil amendments{'\n'}
                • Labor costs (planting, weeding, harvesting){'\n'}
                • Irrigation/watering costs{'\n'}
                • Pesticides and disease control{'\n'}
                • Equipment and tools{'\n'}
                • Expected yield and market prices{'\n'}
                • Profit projection and ROI
              </Text>
            </Card.Content>
          </Card>
        </>
      ) : (
        <>
          {/* Budget Results */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.resultHeader}>
                <MaterialCommunityIcons name="sprout" size={40} color="#4CAF50" />
                <View style={styles.resultTitleContainer}>
                  <Text style={styles.resultTitle}>{budget.crop}</Text>
                  <Text style={styles.resultSubtitle}>
                    {budget.farmSize} Hectare{budget.farmSize > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Summary Metrics */}
              <View style={styles.metricsRow}>
                <MetricCard 
                  icon="clock-outline"
                  label="Maturity"
                  value={`${budget.maturityDays} days`}
                  color="#2196F3"
                />
                <MetricCard 
                  icon="scale-balance"
                  label="Yield"
                  value={`${budget.expectedYield.toLocaleString()} kg`}
                  color="#FF9800"
                />
              </View>
            </Card.Content>
          </Card>

          {/* Cost Breakdown */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Cost Breakdown</Text>

              <CostItem 
                icon="seed"
                label="Seeds"
                amount={budget.costs.seeds}
              />
              <CostItem 
                icon="leaf"
                label="Fertilizer"
                amount={budget.costs.fertilizer}
              />
              <CostItem 
                icon="account-group"
                label="Labor"
                amount={budget.costs.labor}
              />
              <CostItem 
                icon="water"
                label="Watering/Irrigation"
                amount={budget.costs.watering}
              />
              <CostItem 
                icon="spray"
                label="Pesticides"
                amount={budget.costs.pesticides}
              />
              <CostItem 
                icon="tools"
                label="Equipment"
                amount={budget.costs.equipment}
              />

              <Divider style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Investment</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(budget.totalCost)}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Revenue & Profit */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Expected Returns</Text>

              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Expected Revenue</Text>
                <Text style={styles.revenueAmount}>
                  {formatCurrency(budget.revenue)}
                </Text>
              </View>

              <View style={styles.priceInfo}>
                <Text style={styles.priceText}>
                  Market Price: {formatCurrency(budget.pricePerKg)}/kg
                </Text>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Net Profit</Text>
                <Text 
                  style={[
                    styles.profitAmount,
                    { color: budget.profit >= 0 ? '#4CAF50' : '#F44336' }
                  ]}
                >
                  {formatCurrency(budget.profit)}
                </Text>
              </View>

              <View style={styles.roiContainer}>
                <Chip 
                  icon="percent" 
                  mode="flat"
                  style={[
                    styles.roiChip,
                    { 
                      backgroundColor: budget.roi >= 50 
                        ? '#C8E6C9' 
                        : budget.roi >= 20 
                        ? '#FFF9C4' 
                        : '#FFCCBC' 
                    }
                  ]}
                >
                  ROI: {budget.roi}%
                </Chip>
              </View>

              <View style={styles.breakEvenInfo}>
                <MaterialCommunityIcons name="information-outline" size={16} color="#666" />
                <Text style={styles.breakEvenText}>
                  Break-even at {budget.breakEven.toLocaleString()} kg
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              mode="outlined"
              onPress={reset}
              style={styles.actionButton}
              icon="restart"
            >
              Calculate Another Crop
            </Button>

            <Button
              mode="contained"
              onPress={() => navigation.navigate('Marketplace')}
              style={styles.actionButton}
              icon="store"
            >
              List on Marketplace
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('FarmerDashboard')}
              style={styles.actionButton}
            >
              Back to Dashboard
            </Button>
          </View>
        </>
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

// Helper Components

const MetricCard = ({ icon, label, value, color }) => (
  <View style={styles.metricCard}>
    <MaterialCommunityIcons name={icon} size={24} color={color} />
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
  </View>
);

const CostItem = ({ icon, label, amount }) => (
  <View style={styles.costItem}>
    <View style={styles.costLeft}>
      <MaterialCommunityIcons name={icon} size={20} color="#666" />
      <Text style={styles.costLabel}>{label}</Text>
    </View>
    <Text style={styles.costAmount}>
      KES {amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  welcomeBar: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 12,
  },
  userIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  userType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    margin: 12,
    borderRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  recommendedChips: {
    marginBottom: 16,
  },
  recommendedLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  cropChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  calculateButton: {
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitleContainer: {
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  costLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    marginLeft: 12,
  },
  costAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
  },
  revenueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  priceInfo: {
    marginBottom: 12,
  },
  priceText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profitLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profitAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  roiContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  roiChip: {
    paddingHorizontal: 16,
  },
  breakEvenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakEvenText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionsContainer: {
    padding: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
  bottomSpace: {
    height: 24,
  },
});
