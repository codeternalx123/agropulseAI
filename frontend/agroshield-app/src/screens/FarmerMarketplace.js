import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://urchin-app-86rjy.ondigitalocean.app/api/marketplace/farmer';

export default function FarmerMarketplace({ navigation }) {
  const [activeTab, setActiveTab] = useState('listings'); // listings, offers, contracts, insights
  const [farmerId, setFarmerId] = useState(null);
  const [listings, setListings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [marketInsights, setMarketInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Cross-regional trading state
  const [farmerLocation, setFarmerLocation] = useState(null);
  const [farmerRegion, setFarmerRegion] = useState('');
  const [targetRegions, setTargetRegions] = useState([]);
  const [regionalCompetition, setRegionalCompetition] = useState(null);
  const [crossRegionalMatches, setCrossRegionalMatches] = useState([]);
  
  // Create listing modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListing, setNewListing] = useState({
    field_id: '',
    crop: '',
    quantity_kg: '',
    quality_grade: 'B',
    target_price: '',
    minimum_order_kg: '',
    delivery_available: true,
    organic_certified: false,
    storage_location: '',
    willing_to_negotiate: true,
    prefer_cross_regional: true, // NEW: Default to cross-regional
    target_regions: [], // NEW: Specific regions to target
    avoid_local_competition: true // NEW: Avoid selling in same region
  });
  const [productImages, setProductImages] = useState([]);
  
  // Offer response modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offerAction, setOfferAction] = useState('accept'); // accept, counter, decline
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQuantity, setCounterQuantity] = useState('');
  const [farmerNotes, setFarmerNotes] = useState('');

  useEffect(() => {
    loadFarmerId();
  }, []);

  useEffect(() => {
    if (farmerId) {
      loadData();
    }
  }, [farmerId, activeTab]);

  const loadFarmerId = async () => {
    try {
      const id = await AsyncStorage.getItem('farmer_id');
      setFarmerId(id);
    } catch (error) {
      console.error('Error loading farmer ID:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load farmer location and region first
      await loadFarmerRegion();
      
      if (activeTab === 'listings') {
        await loadListings();
        await analyzeCrossRegionalOpportunities();
      } else if (activeTab === 'offers') {
        await loadOffers();
      } else if (activeTab === 'contracts') {
        await loadContracts();
      } else if (activeTab === 'insights') {
        await loadMarketInsights();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Load farmer's region and location
  const loadFarmerRegion = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/farmer-location/${farmerId}`);
      setFarmerLocation(response.data.location);
      setFarmerRegion(response.data.region);
    } catch (error) {
      console.error('Error loading farmer region:', error);
    }
  };

  // NEW: Analyze cross-regional opportunities
  const analyzeCrossRegionalOpportunities = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/analyze-cross-regional`, {
        farmer_id: farmerId,
        farmer_region: farmerRegion,
        crops: listings.map(l => l.crop)
      });
      
      setTargetRegions(response.data.recommended_regions);
      setRegionalCompetition(response.data.local_competition);
      setCrossRegionalMatches(response.data.matched_buyers);
    } catch (error) {
      console.error('Error analyzing cross-regional:', error);
    }
  };

  const loadListings = async () => {
    const response = await axios.get(`${API_BASE_URL}/my-listings/${farmerId}`);
    setListings(response.data.listings);
  };

  const loadOffers = async () => {
    const response = await axios.get(`${API_BASE_URL}/offers/${farmerId}`);
    setOffers(response.data.all_offers);
  };

  const loadContracts = async () => {
    const response = await axios.get(`${API_BASE_URL}/contracts/${farmerId}`);
    setContracts(response.data.contracts);
  };

  const loadMarketInsights = async () => {
    const response = await axios.get(`${API_BASE_URL}/market-insights/${farmerId}`);
    setMarketInsights(response.data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      maxFiles: 5
    });

    if (!result.canceled) {
      setProductImages(result.assets);
    }
  };

  const createListing = async () => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('farmer_id', farmerId);
      formData.append('field_id', newListing.field_id);
      formData.append('crop', newListing.crop);
      formData.append('quantity_kg', parseFloat(newListing.quantity_kg));
      formData.append('quality_grade', newListing.quality_grade);
      formData.append('target_price_kes_per_kg', parseFloat(newListing.target_price) || 0);
      formData.append('minimum_order_kg', parseFloat(newListing.minimum_order_kg));
      formData.append('delivery_available', newListing.delivery_available);
      formData.append('organic_certified', newListing.organic_certified);
      formData.append('storage_location', newListing.storage_location);
      formData.append('willing_to_negotiate', newListing.willing_to_negotiate);
      
      // NEW: Cross-regional trading preferences
      formData.append('farmer_region', farmerRegion);
      formData.append('prefer_cross_regional', newListing.prefer_cross_regional);
      formData.append('avoid_local_competition', newListing.avoid_local_competition);
      formData.append('target_regions', JSON.stringify(newListing.target_regions));

      productImages.forEach((image, index) => {
        formData.append('product_images', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `product_${index}.jpg`
        });
      });

      const response = await axios.post(`${API_BASE_URL}/create-listing`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', 'Listing created successfully!');
      
      // Show AI recommendations with cross-regional insights
      if (response.data.ai_recommendations) {
        const ai = response.data.ai_recommendations;
        const regionalMsg = response.data.cross_regional_insights 
          ? `\n\n🌍 CROSS-REGIONAL OPPORTUNITIES:\n${response.data.cross_regional_insights.message}\nRecommended Regions: ${response.data.cross_regional_insights.recommended_regions.join(', ')}\nAvoid: ${response.data.cross_regional_insights.avoid_regions.join(', ')} (High local competition)`
          : '';
        
        Alert.alert(
          'AI Market Insights',
          `${ai.ai_recommendation}\n\nOptimal Sale Window: ${ai.optimal_sale_window.start_date} to ${ai.optimal_sale_window.end_date}\n\nBest Option: ${ai.market_recommendations[0]?.channel} - ${ai.market_recommendations[0]?.net_profit_kes.toLocaleString()} KES net profit${regionalMsg}`
        );
      }

      setShowCreateModal(false);
      resetNewListing();
      loadListings();
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const resetNewListing = () => {
    setNewListing({
      field_id: '',
      crop: '',
      quantity_kg: '',
      quality_grade: 'B',
      target_price: '',
      minimum_order_kg: '',
      delivery_available: true,
      organic_certified: false,
      storage_location: '',
      willing_to_negotiate: true
    });
    setProductImages([]);
  };

  const handleOfferResponse = async () => {
    try {
      setLoading(true);

      const payload = {
        offer_id: selectedOffer.offer_id,
        action: offerAction,
        farmer_notes: farmerNotes
      };

      if (offerAction === 'counter') {
        payload.counter_price_kes_per_kg = parseFloat(counterPrice);
        payload.counter_quantity_kg = parseFloat(counterQuantity);
      }

      const response = await axios.post(`${API_BASE_URL}/respond-to-offer`, payload);

      if (offerAction === 'accept') {
        Alert.alert(
          'Contract Created!',
          `Buyer will deposit ${(response.data.contract.total_amount_kes * 0.1).toLocaleString()} KES as earnest money.\n\nPrepare your produce for delivery on ${response.data.contract.delivery_date}.`,
          [{ text: 'OK', onPress: () => setActiveTab('contracts') }]
        );
      } else if (offerAction === 'counter') {
        Alert.alert('Counter Offer Sent', 'Buyer has 48 hours to respond.');
      } else {
        Alert.alert('Offer Declined', 'Buyer has been notified.');
      }

      setShowOfferModal(false);
      resetOfferModal();
      loadOffers();
    } catch (error) {
      console.error('Error responding to offer:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to respond to offer');
    } finally {
      setLoading(false);
    }
  };

  const resetOfferModal = () => {
    setSelectedOffer(null);
    setOfferAction('accept');
    setCounterPrice('');
    setCounterQuantity('');
    setFarmerNotes('');
  };

  const confirmDelivery = async (contractId) => {
    Alert.alert(
      'Confirm Delivery',
      'Have you delivered/handed over the produce to the buyer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Confirm',
          onPress: async () => {
            try {
              const response = await axios.post(`${API_BASE_URL}/confirm-delivery/${contractId}`, {
                farmer_confirmed_delivery: true,
                farmer_delivery_notes: 'Delivered as per contract'
              });
              
              Alert.alert(
                'Delivery Confirmed',
                'Buyer has 24 hours to confirm receipt. Final payment will be released automatically if no issues are raised.'
              );
              
              loadContracts();
            } catch (error) {
              Alert.alert('Error', 'Failed to confirm delivery');
            }
          }
        }
      ]
    );
  };

  const renderListings = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.createButtonText}>+ Create New Listing</Text>
      </TouchableOpacity>

      {listings.map((listing) => (
        <View key={listing.listing_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{listing.crop.toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(listing.status) }]}>
              <Text style={styles.statusText}>{listing.status}</Text>
            </View>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Quantity:</Text>
            <Text style={styles.value}>{listing.quantity_available_kg.toLocaleString()} kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Target Price:</Text>
            <Text style={styles.value}>{listing.target_price_kes_per_kg.toLocaleString()} KES/kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Quality Grade:</Text>
            <Text style={styles.value}>Grade {listing.quality_grade}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Ready Date:</Text>
            <Text style={styles.value}>{new Date(listing.ready_date).toLocaleDateString()}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Offers Received:</Text>
            <Text style={styles.valueHighlight}>{listing.offers_count} ({listing.pending_offers} pending)</Text>
          </View>

          {listing.latest_offer && (
            <View style={styles.offerPreview}>
              <Text style={styles.offerLabel}>Latest Offer:</Text>
              <Text style={styles.offerText}>
                {listing.latest_offer.quantity_kg} kg @ {listing.latest_offer.offered_price_kes_per_kg} KES/kg
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderOffers = () => (
    <View style={styles.tabContent}>
      {offers.map((offer) => (
        <TouchableOpacity
          key={offer.offer_id}
          style={styles.card}
          onPress={() => {
            setSelectedOffer(offer);
            setShowOfferModal(true);
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{offer.listing.crop.toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getOfferStatusColor(offer.status) }]}>
              <Text style={styles.statusText}>{offer.status}</Text>
            </View>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Buyer:</Text>
            <Text style={styles.value}>{offer.buyer_details.business_name}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Offered Quantity:</Text>
            <Text style={styles.value}>{offer.quantity_kg.toLocaleString()} kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Offered Price:</Text>
            <Text style={styles.valueHighlight}>{offer.offered_price_kes_per_kg.toLocaleString()} KES/kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.totalAmount}>{offer.total_offer_amount_kes.toLocaleString()} KES</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Delivery Date:</Text>
            <Text style={styles.value}>{new Date(offer.requested_delivery_date).toLocaleDateString()}</Text>
          </View>

          {offer.status === 'pending' && (
            <Text style={styles.actionPrompt}>Tap to Respond</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContracts = () => (
    <View style={styles.tabContent}>
      {contracts.map((contract) => (
        <View key={contract.contract_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{contract.crop.toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getContractStatusColor(contract.status) }]}>
              <Text style={styles.statusText}>{contract.status}</Text>
            </View>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Buyer:</Text>
            <Text style={styles.value}>{contract.buyer_details.business_name}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Quantity:</Text>
            <Text style={styles.value}>{contract.quantity_kg.toLocaleString()} kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Agreed Price:</Text>
            <Text style={styles.value}>{contract.agreed_price_kes_per_kg.toLocaleString()} KES/kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.totalAmount}>{contract.total_amount_kes.toLocaleString()} KES</Text>
          </View>
          
          <View style={styles.paymentStatus}>
            <Text style={styles.paymentLabel}>Payment Status:</Text>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentItem}>
                Deposit: {contract.payment_status.deposit_paid ? '✓ Paid' : '⏳ Pending'}
              </Text>
              <Text style={styles.paymentItem}>
                Final: {contract.payment_status.final_payment_paid ? '✓ Paid' : '⏳ Pending'}
              </Text>
            </View>
            <Text style={styles.paymentTotal}>
              Received: {contract.payment_status.total_paid_kes.toLocaleString()} KES
            </Text>
          </View>

          {contract.status === 'in_transit' && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => confirmDelivery(contract.contract_id)}
            >
              <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  const renderMarketInsights = () => {
    if (!marketInsights) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.insightsHeader}>
          <Text style={styles.insightsTitle}>AI Market Insights</Text>
          <Text style={styles.insightsSummary}>
            Total Fields: {marketInsights.total_fields} | 
            Predicted Yield: {(marketInsights.total_predicted_yield_kg / 1000).toFixed(1)} tonnes
          </Text>
          <Text style={styles.potentialRevenue}>
            Potential Revenue: {marketInsights.total_potential_revenue_kes.toLocaleString()} KES
          </Text>
        </View>

        {marketInsights.insights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <Text style={styles.insightCrop}>{insight.crop.toUpperCase()}</Text>
            <Text style={styles.insightYield}>
              Expected Yield: {insight.predicted_yield_kg.toLocaleString()} kg
            </Text>
            <Text style={styles.insightHarvest}>
              Harvest: {new Date(insight.harvest_date).toLocaleDateString()}
            </Text>
            
            <View style={styles.strategyBox}>
              <Text style={styles.strategyLabel}>Optimal Strategy:</Text>
              <Text style={styles.strategyText}>
                {insight.optimal_strategy.ai_recommendation}
              </Text>
              
              <Text style={styles.windowText}>
                Best Selling Window: {insight.optimal_strategy.optimal_sale_window.start_date} to {insight.optimal_strategy.optimal_sale_window.end_date}
              </Text>
              
              <Text style={styles.priceText}>
                Expected Price: {insight.optimal_strategy.optimal_sale_window.min_price_kes.toLocaleString()} - {insight.optimal_strategy.optimal_sale_window.max_price_kes.toLocaleString()} KES/kg
              </Text>

              {insight.optimal_strategy.market_recommendations[0] && (
                <View style={styles.topRecommendation}>
                  <Text style={styles.recLabel}>Top Recommendation:</Text>
                  <Text style={styles.recText}>
                    {insight.optimal_strategy.market_recommendations[0].channel}
                  </Text>
                  <Text style={styles.recProfit}>
                    Net Profit: {insight.optimal_strategy.market_recommendations[0].net_profit_kes.toLocaleString()} KES
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#4CAF50',
      sold_out: '#FF9800',
      expired: '#9E9E9E',
      deleted: '#F44336'
    };
    return colors[status] || '#2196F3';
  };

  const getOfferStatusColor = (status) => {
    const colors = {
      pending: '#FF9800',
      accepted: '#4CAF50',
      countered: '#2196F3',
      declined: '#F44336'
    };
    return colors[status] || '#9E9E9E';
  };

  const getContractStatusColor = (status) => {
    const colors = {
      pending_deposit: '#FF9800',
      deposit_paid: '#2196F3',
      in_transit: '#00BCD4',
      awaiting_buyer_confirmation: '#9C27B0',
      completed: '#4CAF50',
      cancelled: '#F44336'
    };
    return colors[status] || '#9E9E9E';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Farmer Marketplace</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'listings' && styles.activeTab]}
          onPress={() => setActiveTab('listings')}
        >
          <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>
            My Listings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
            Offers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contracts' && styles.activeTab]}
          onPress={() => setActiveTab('contracts')}
        >
          <Text style={[styles.tabText, activeTab === 'contracts' && styles.activeTabText]}>
            Contracts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
          onPress={() => setActiveTab('insights')}
        >
          <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>
            AI Insights
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
        ) : (
          <>
            {activeTab === 'listings' && renderListings()}
            {activeTab === 'offers' && renderOffers()}
            {activeTab === 'contracts' && renderContracts()}
            {activeTab === 'insights' && renderMarketInsights()}
          </>
        )}
      </ScrollView>

      {/* Create Listing Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Listing</Text>
            <ScrollView style={styles.modalScroll}>
              <TextInput
                style={styles.input}
                placeholder="Field ID"
                value={newListing.field_id}
                onChangeText={(text) => setNewListing({ ...newListing, field_id: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Crop (e.g., maize)"
                value={newListing.crop}
                onChangeText={(text) => setNewListing({ ...newListing, crop: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Quantity (kg)"
                keyboardType="numeric"
                value={newListing.quantity_kg}
                onChangeText={(text) => setNewListing({ ...newListing, quantity_kg: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Target Price (KES/kg) - Optional"
                keyboardType="numeric"
                value={newListing.target_price}
                onChangeText={(text) => setNewListing({ ...newListing, target_price: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Minimum Order (kg)"
                keyboardType="numeric"
                value={newListing.minimum_order_kg}
                onChangeText={(text) => setNewListing({ ...newListing, minimum_order_kg: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Storage Location"
                value={newListing.storage_location}
                onChangeText={(text) => setNewListing({ ...newListing, storage_location: text })}
              />
              
              <Text style={styles.pickerLabel}>Quality Grade:</Text>
              <Picker
                selectedValue={newListing.quality_grade}
                onValueChange={(value) => setNewListing({ ...newListing, quality_grade: value })}
                style={styles.picker}
              >
                <Picker.Item label="Grade A (Premium)" value="A" />
                <Picker.Item label="Grade B (Standard)" value="B" />
                <Picker.Item label="Grade C (Economy)" value="C" />
              </Picker>

              {/* NEW: Cross-Regional Trading Section */}
              <View style={styles.crossRegionalSection}>
                <Text style={styles.sectionHeader}>🌍 Cross-Regional Trading</Text>
                <Text style={styles.sectionSubtext}>
                  Sell to buyers outside your region to avoid local competition and get better prices
                </Text>
                
                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setNewListing({ 
                      ...newListing, 
                      prefer_cross_regional: !newListing.prefer_cross_regional 
                    })}
                  >
                    <Text style={styles.checkboxIcon}>
                      {newListing.prefer_cross_regional ? '✅' : '⬜'}
                    </Text>
                    <Text style={styles.checkboxLabel}>
                      Prefer cross-regional buyers (Recommended)
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setNewListing({ 
                      ...newListing, 
                      avoid_local_competition: !newListing.avoid_local_competition 
                    })}
                  >
                    <Text style={styles.checkboxIcon}>
                      {newListing.avoid_local_competition ? '✅' : '⬜'}
                    </Text>
                    <Text style={styles.checkboxLabel}>
                      Avoid regions growing same crops
                    </Text>
                  </TouchableOpacity>
                </View>

                {regionalCompetition && (
                  <View style={styles.competitionAlert}>
                    <Text style={styles.competitionText}>
                      ⚠️ High local competition detected for {newListing.crop}
                    </Text>
                    <Text style={styles.competitionText}>
                      {regionalCompetition.local_farmers_count} farmers in your region
                    </Text>
                    <Text style={styles.recommendationText}>
                      💡 Recommended target regions: {targetRegions.slice(0, 3).join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.imageButton} onPress={pickImages}>
                <Text style={styles.imageButtonText}>
                  📷 Add Product Photos ({productImages.length}/5)
                </Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetNewListing();
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={createListing}
                >
                  <Text style={styles.buttonText}>Create Listing</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Offer Response Modal */}
      <Modal visible={showOfferModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Respond to Offer</Text>
            {selectedOffer && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.offerDetails}>
                  <Text style={styles.offerDetailText}>
                    Buyer: {selectedOffer.buyer_details?.business_name}
                  </Text>
                  <Text style={styles.offerDetailText}>
                    Quantity: {selectedOffer.quantity_kg.toLocaleString()} kg
                  </Text>
                  <Text style={styles.offerDetailText}>
                    Offered Price: {selectedOffer.offered_price_kes_per_kg.toLocaleString()} KES/kg
                  </Text>
                  <Text style={styles.offerDetailText}>
                    Total: {selectedOffer.total_offer_amount_kes.toLocaleString()} KES
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, offerAction === 'accept' && styles.activeAction]}
                    onPress={() => setOfferAction('accept')}
                  >
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, offerAction === 'counter' && styles.activeAction]}
                    onPress={() => setOfferAction('counter')}
                  >
                    <Text style={styles.actionButtonText}>Counter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, offerAction === 'decline' && styles.activeAction]}
                    onPress={() => setOfferAction('decline')}
                  >
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>

                {offerAction === 'counter' && (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Counter Price (KES/kg)"
                      keyboardType="numeric"
                      value={counterPrice}
                      onChangeText={setCounterPrice}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Counter Quantity (kg)"
                      keyboardType="numeric"
                      value={counterQuantity}
                      onChangeText={setCounterQuantity}
                    />
                  </>
                )}

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes (optional)"
                  multiline
                  numberOfLines={3}
                  value={farmerNotes}
                  onChangeText={setFarmerNotes}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowOfferModal(false);
                      resetOfferModal();
                    }}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={handleOfferResponse}
                  >
                    <Text style={styles.buttonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center'
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50'
  },
  tabText: {
    fontSize: 14,
    color: '#666'
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  tabContent: {
    padding: 15
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    color: '#666'
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  valueHighlight: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  totalAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  offerPreview: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 5
  },
  offerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  offerText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold'
  },
  actionPrompt: {
    marginTop: 10,
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  paymentStatus: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  paymentItem: {
    fontSize: 13,
    color: '#666'
  },
  paymentTotal: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5
  },
  confirmButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 5,
    marginTop: 10
  },
  confirmButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  insightsHeader: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  insightsSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  potentialRevenue: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15
  },
  insightCrop: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5
  },
  insightYield: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  insightHarvest: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  strategyBox: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10
  },
  strategyLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5
  },
  strategyText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 8
  },
  windowText: {
    fontSize: 13,
    color: '#2196F3',
    marginBottom: 5
  },
  priceText: {
    fontSize: 13,
    color: '#4CAF50',
    marginBottom: 8
  },
  topRecommendation: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 5,
    marginTop: 5
  },
  recLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3
  },
  recText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3
  },
  recProfit: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  loader: {
    marginTop: 50
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  modalScroll: {
    maxHeight: 500
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 14
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666'
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10
  },
  // NEW: Cross-regional styles
  crossRegionalSection: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5
  },
  sectionSubtext: {
    fontSize: 12,
    color: '#1B5E20',
    marginBottom: 12,
    lineHeight: 18
  },
  checkboxRow: {
    marginBottom: 10
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkboxIcon: {
    fontSize: 20,
    marginRight: 8
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  competitionAlert: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800'
  },
  competitionText: {
    fontSize: 12,
    color: '#E65100',
    marginBottom: 4
  },
  recommendationText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 6
  },
  imageButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    marginHorizontal: 5
  },
  cancelButton: {
    backgroundColor: '#9E9E9E'
  },
  submitButton: {
    backgroundColor: '#4CAF50'
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  offerDetails: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15
  },
  offerDetailText: {
    fontSize: 14,
    marginBottom: 5
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 3
  },
  activeAction: {
    backgroundColor: '#4CAF50'
  },
  actionButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333'
  }
});
