/**
 * Asset Details Screen
 * View full asset information with escrow transaction capability
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import exchangeService from '../services/exchangeService';

const AssetDetailsScreen = ({ navigation, route }) => {
  const { assetId, userId, userType = 'buyer' } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState(null);
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  
  // Buy form
  const [buyForm, setBuyForm] = useState({
    quantityKg: '',
    paymentMethod: 'mpesa',
    deliveryMethod: 'pickup',
    deliveryAddress: '',
    expectedDeliveryDays: '3'
  });

  // Dispute form
  const [disputeForm, setDisputeForm] = useState({
    category: 'quality',
    reason: '',
    description: ''
  });

  useEffect(() => {
    loadAssetDetails();
  }, [assetId]);

  const loadAssetDetails = async () => {
    setLoading(true);
    try {
      const result = await exchangeService.getAssetDetails(assetId);
      if (result.success) {
        setAsset(result.asset);
        setBuyForm({ ...buyForm, quantityKg: result.asset.available_quantity_kg.toString() });
      } else {
        Alert.alert('Error', result.error);
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading asset:', error);
      Alert.alert('Error', 'Failed to load asset details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (!asset) return;
    setBuyModalVisible(true);
  };

  const submitBuyOrder = async () => {
    // Validate
    if (!buyForm.quantityKg || parseFloat(buyForm.quantityKg) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (parseFloat(buyForm.quantityKg) > asset.available_quantity_kg) {
      Alert.alert('Error', `Only ${asset.available_quantity_kg} kg available`);
      return;
    }

    if (buyForm.deliveryMethod === 'delivery' && !buyForm.deliveryAddress) {
      Alert.alert('Error', 'Please enter delivery address');
      return;
    }

    setLoading(true);
    try {
      // Create escrow transaction
      const transactionResult = await exchangeService.createEscrowTransaction({
        asset_id: assetId,
        buyer_id: userId,
        buyer_name: 'Jane Buyer', // In production, get from user profile
        buyer_phone: '+254700000000', // In production, get from user profile
        quantity_kg: parseFloat(buyForm.quantityKg),
        payment_method: buyForm.paymentMethod,
        delivery_method: buyForm.deliveryMethod,
        delivery_address: buyForm.deliveryMethod === 'delivery' ? buyForm.deliveryAddress : null,
        expected_delivery_days: parseInt(buyForm.expectedDeliveryDays)
      });

      if (transactionResult.success) {
        setBuyModalVisible(false);
        
        Alert.alert(
          'Transaction Created',
          `Transaction ID: ${transactionResult.transaction.transaction_id}\n\n` +
          `Total Amount: KES ${transactionResult.transaction.total_amount_kes.toLocaleString()}\n` +
          `Escrow Account: ${transactionResult.transaction.escrow_account_id}\n\n` +
          `Please proceed to payment to lock funds in escrow.`,
          [
            {
              text: 'Make Payment',
              onPress: () => navigation.navigate('PaymentScreen', {
                transactionId: transactionResult.transaction.transaction_id,
                amount: transactionResult.transaction.total_amount_kes,
                paymentMethod: buyForm.paymentMethod
              })
            },
            { text: 'Later', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', transactionResult.error);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseDispute = () => {
    setDisputeModalVisible(true);
  };

  const submitDispute = async () => {
    if (!disputeForm.description) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }

    setLoading(true);
    try {
      const result = await exchangeService.createDispute({
        transaction_id: 'TRANS_123', // In production, get from actual transaction
        raised_by: userType,
        raised_by_user_id: userId,
        dispute_reason: disputeForm.reason,
        dispute_category: disputeForm.category,
        description: disputeForm.description,
        evidence_images: []
      });

      if (result.success) {
        setDisputeModalVisible(false);
        Alert.alert(
          'Dispute Raised',
          result.message,
          [
            {
              text: 'View Dispute',
              onPress: () => navigation.navigate('DisputeDetails', {
                disputeId: result.dispute.dispute_id
              })
            },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error raising dispute:', error);
      Alert.alert('Error', 'Failed to raise dispute');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !asset) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading asset details...</Text>
      </View>
    );
  }

  const qualityInfo = exchangeService.getQualityGradeInfo(asset.quality_grade);
  const aiData = asset.ai_verification;
  const spoilageRisk = aiData.spoilage_risk_trend;
  const riskColor = 
    spoilageRisk === 'low' ? '#4CAF50' :
    spoilageRisk === 'moderate' ? '#FF9800' :
    '#F44336';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{asset.listing_title}</Text>
          <View style={[styles.qualityBadge, { backgroundColor: qualityInfo.color }]}>
            <Text style={styles.qualityText}>{qualityInfo.icon} {qualityInfo.label}</Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asset Details</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="sprout" size={24} color="#666" />
            <Text style={styles.infoLabel}>Crop Type:</Text>
            <Text style={styles.infoValue}>{asset.crop_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="weight-kilogram" size={24} color="#666" />
            <Text style={styles.infoLabel}>Available:</Text>
            <Text style={styles.infoValue}>{asset.available_quantity_kg} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="cash" size={24} color="#666" />
            <Text style={styles.infoLabel}>Price:</Text>
            <Text style={styles.infoValue}>KES {asset.unit_price_kes}/kg</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#666" />
            <Text style={styles.infoLabel}>Pickup:</Text>
            <Text style={styles.infoValue}>{asset.preferred_pickup_location}</Text>
          </View>
          {asset.delivery_available && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="truck-delivery" size={24} color="#4CAF50" />
              <Text style={styles.infoValue}>Delivery available ({asset.delivery_radius_km} km)</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {asset.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{asset.description}</Text>
          </View>
        )}

        {/* AI Verification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Verification Data</Text>
          <Text style={styles.verificationSubtitle}>
            Confidence Score: {aiData.ai_confidence_score}%
          </Text>

          {/* Harvest Health */}
          {aiData.harvest_health_score && (
            <View style={styles.verificationCard}>
              <View style={styles.verificationHeader}>
                <MaterialCommunityIcons name="sprout" size={32} color="#4CAF50" />
                <View style={styles.verificationInfo}>
                  <Text style={styles.verificationTitle}>Harvest Health</Text>
                  <Text style={styles.verificationValue}>{aiData.harvest_health_score}%</Text>
                </View>
              </View>
              <Text style={styles.verificationDetail}>
                Maturity: {aiData.harvest_maturity_level || 'Not specified'}
              </Text>
              <Text style={styles.verificationDetail}>
                Harvest Date: {aiData.harvest_date ? new Date(aiData.harvest_date).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          )}

          {/* Storage Conditions */}
          {aiData.storage_condition_proof && (
            <View style={styles.verificationCard}>
              <View style={styles.verificationHeader}>
                <MaterialCommunityIcons name="thermometer" size={32} color="#2196F3" />
                <View style={styles.verificationInfo}>
                  <Text style={styles.verificationTitle}>Storage Monitoring</Text>
                  <Text style={styles.verificationValue}>
                    {aiData.storage_condition_proof.safe_range_compliance}% Safe
                  </Text>
                </View>
              </View>
              <Text style={styles.verificationDetail}>
                Temperature: {aiData.storage_condition_proof.temperature_avg}°C 
                ({aiData.storage_condition_proof.temperature_min}-{aiData.storage_condition_proof.temperature_max}°C)
              </Text>
              <Text style={styles.verificationDetail}>
                Humidity: {aiData.storage_condition_proof.humidity_avg}%
                ({aiData.storage_condition_proof.humidity_min}-{aiData.storage_condition_proof.humidity_max}%)
              </Text>
              <Text style={styles.verificationDetail}>
                Monitored: {aiData.storage_condition_proof.total_readings} readings from{' '}
                {new Date(aiData.storage_condition_proof.monitoring_start_date).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Spoilage Risk */}
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <MaterialCommunityIcons name="alert-circle" size={32} color={riskColor} />
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Spoilage Risk</Text>
                <Text style={[styles.verificationValue, { color: riskColor }]}>
                  {spoilageRisk.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.verificationDetail}>
              Predicted Shelf Life: {aiData.predicted_shelf_life_days} days
            </Text>
            <Text style={styles.verificationDetail}>
              Risk Score: {aiData.spoilage_risk_score}%
            </Text>
          </View>

          {/* GPS & Traceability */}
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <MaterialCommunityIcons name="map-marker-check" size={32} color="#4CAF50" />
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>GPS Traceability</Text>
                <Text style={styles.verificationValue}>Verified</Text>
              </View>
            </View>
            <Text style={styles.verificationDetail}>
              Location: {aiData.gps_latitude.toFixed(4)}, {aiData.gps_longitude.toFixed(4)}
            </Text>
            <Text style={styles.verificationDetail}>
              Farm ID: {aiData.farm_id}
            </Text>
            <Text style={styles.verificationDetail}>
              Field: {aiData.field_registration_id}
            </Text>
          </View>

          {/* Pest Management */}
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <MaterialCommunityIcons 
                name={aiData.pest_free_certification ? "shield-check" : "shield-alert"} 
                size={32} 
                color={aiData.pest_free_certification ? "#4CAF50" : "#FF9800"} 
              />
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>Pest Management</Text>
                <Text style={styles.verificationValue}>
                  {aiData.pest_free_certification ? 'Pest-Free' : 'Standard'}
                </Text>
              </View>
            </View>
            <Text style={styles.verificationDetail}>
              Scan History: {aiData.pest_scan_history.length} scans
            </Text>
            {aiData.last_pest_scan_date && (
              <Text style={styles.verificationDetail}>
                Last Scan: {new Date(aiData.last_pest_scan_date).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Soil & NDVI */}
          {(aiData.soil_health_score || aiData.ndvi_index) && (
            <View style={styles.verificationCard}>
              <View style={styles.verificationHeader}>
                <MaterialCommunityIcons name="earth" size={32} color="#795548" />
                <View style={styles.verificationInfo}>
                  <Text style={styles.verificationTitle}>Soil & Vegetation</Text>
                  {aiData.soil_health_score && (
                    <Text style={styles.verificationValue}>{aiData.soil_health_score}% Soil Health</Text>
                  )}
                </View>
              </View>
              {aiData.ndvi_index && (
                <Text style={styles.verificationDetail}>
                  NDVI Index: {aiData.ndvi_index.toFixed(2)} - {aiData.vegetation_health}
                </Text>
              )}
              {aiData.soil_nutrient_status && (
                <Text style={styles.verificationDetail}>
                  Nutrients: N-{aiData.soil_nutrient_status.nitrogen}, 
                  P-{aiData.soil_nutrient_status.phosphorus}, 
                  K-{aiData.soil_nutrient_status.potassium}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Seller Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller Information</Text>
          <View style={styles.sellerCard}>
            <MaterialCommunityIcons name="account-circle" size={48} color="#4CAF50" />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{asset.seller_name}</Text>
              <Text style={styles.sellerPhone}>{asset.seller_phone}</Text>
              <Text style={styles.sellerDetail}>Listed: {new Date(asset.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      {userType === 'buyer' && asset.status === 'active' && (
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total Price</Text>
            <Text style={styles.priceValue}>
              KES {(parseFloat(buyForm.quantityKg || asset.available_quantity_kg) * asset.unit_price_kes).toLocaleString()}
            </Text>
          </View>
          <TouchableOpacity style={styles.buyButton} onPress={handleBuyNow}>
            <MaterialCommunityIcons name="cart" size={24} color="#FFF" />
            <Text style={styles.buyButtonText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Buy Modal */}
      <Modal
        visible={buyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBuyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Purchase</Text>
              <TouchableOpacity onPress={() => setBuyModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalLabel}>Quantity (kg)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter quantity"
                keyboardType="numeric"
                value={buyForm.quantityKg}
                onChangeText={(text) => setBuyForm({ ...buyForm, quantityKg: text })}
              />

              <Text style={styles.modalLabel}>Payment Method</Text>
              <Picker
                selectedValue={buyForm.paymentMethod}
                style={styles.modalPicker}
                onValueChange={(value) => setBuyForm({ ...buyForm, paymentMethod: value })}
              >
                {Object.entries(exchangeService.PAYMENT_METHODS).map(([key, method]) => (
                  <Picker.Item key={key} label={`${method.icon} ${method.label}`} value={method.value} />
                ))}
              </Picker>

              <Text style={styles.modalLabel}>Delivery Method</Text>
              <Picker
                selectedValue={buyForm.deliveryMethod}
                style={styles.modalPicker}
                onValueChange={(value) => setBuyForm({ ...buyForm, deliveryMethod: value })}
              >
                <Picker.Item label="Pickup from seller" value="pickup" />
                <Picker.Item label="Delivery" value="delivery" />
                <Picker.Item label="Third-party logistics" value="third_party" />
              </Picker>

              {buyForm.deliveryMethod === 'delivery' && (
                <>
                  <Text style={styles.modalLabel}>Delivery Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter delivery address"
                    value={buyForm.deliveryAddress}
                    onChangeText={(text) => setBuyForm({ ...buyForm, deliveryAddress: text })}
                  />
                </>
              )}

              <Text style={styles.modalLabel}>Expected Delivery (days)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="3"
                keyboardType="numeric"
                value={buyForm.expectedDeliveryDays}
                onChangeText={(text) => setBuyForm({ ...buyForm, expectedDeliveryDays: text })}
              />

              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>
                  KES {(parseFloat(buyForm.quantityKg || 0) * asset.unit_price_kes).toLocaleString()}
                </Text>
              </View>

              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information" size={20} color="#2196F3" />
                <Text style={styles.infoText}>
                  Funds will be held in secure escrow until delivery is confirmed. 
                  You have 48 hours to inspect and accept the goods.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalButton} onPress={submitBuyOrder}>
              <Text style={styles.modalButtonText}>Create Escrow Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15
  },
  scrollView: {
    flex: 1
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10
  },
  qualityBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  qualityText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  section: {
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: 10
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  verificationCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  verificationInfo: {
    marginLeft: 15,
    flex: 1
  },
  verificationTitle: {
    fontSize: 16,
    color: '#666'
  },
  verificationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  verificationDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8
  },
  sellerInfo: {
    marginLeft: 15,
    flex: 1
  },
  sellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  sellerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 5
  },
  sellerDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 5
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  priceContainer: {
    flex: 1
  },
  priceLabel: {
    fontSize: 14,
    color: '#666'
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  buyButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    gap: 10
  },
  buyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  modalScroll: {
    padding: 20
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 15
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  modalPicker: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    marginTop: 20
  },
  totalLabel: {
    fontSize: 16,
    color: '#666'
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    gap: 10
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  }
});

export default AssetDetailsScreen;
