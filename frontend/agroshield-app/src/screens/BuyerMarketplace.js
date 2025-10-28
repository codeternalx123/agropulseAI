import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://urchin-app-86rjy.ondigitalocean.app/api/marketplace/buyer';

export default function BuyerMarketplace({ navigation }) {
  const [activeTab, setActiveTab] = useState('search'); // search, requirements, offers, orders
  const [buyerId, setBuyerId] = useState(null);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    crop: '',
    min_quantity_kg: '',
    max_price_kes: '',
    quality_grade: '',
    radius_km: 100,
    organic_only: false,
    ready_within_days: '',
    // NEW: Cross-regional filters
    exclude_my_region: true, // Avoid suppliers in buyer's region
    prefer_different_regions: true, // Prioritize cross-regional
    target_regions: [] // Specific regions to search
  });
  const [searchResults, setSearchResults] = useState([]);
  const [buyerRegion, setBuyerRegion] = useState('');
  const [regionalInsights, setRegionalInsights] = useState(null);
  
  // Product requirements
  const [requirements, setRequirements] = useState([]);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [newRequirement, setNewRequirement] = useState({
    crop: '',
    quantity_needed_kg: '',
    quality_requirement: 'B',
    frequency: 'one-time',
    price_range_min: '',
    price_range_max: '',
    delivery_required: true,
    organic_only: false
  });
  
  // Offers and orders
  const [myOffers, setMyOffers] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  
  // Make offer modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [offerData, setOfferData] = useState({
    quantity_kg: '',
    offered_price_kes_per_kg: '',
    payment_terms: '50% deposit, 50% on delivery',
    requested_delivery_date: '',
    delivery_location: '',
    transport_responsibility: 'buyer',
    offer_notes: ''
  });
  
  // Registration modal
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    business_name: '',
    business_type: 'Processor',
    business_registration_number: '',
    vat_number: '',
    contact_person: '',
    phone_number: '',
    email: '',
    physical_address: '',
    location_lat: '',
    location_lon: '',
    annual_volume_kg: ''
  });

  useEffect(() => {
    loadBuyerId();
  }, []);

  useEffect(() => {
    if (buyerId) {
      checkRegistrationStatus();
    }
  }, [buyerId]);

  const loadBuyerId = async () => {
    try {
      const id = await AsyncStorage.getItem('buyer_id');
      if (id) {
        setBuyerId(id);
      } else {
        setShowRegistrationModal(true);
      }
    } catch (error) {
      console.error('Error loading buyer ID:', error);
    }
  };

  const checkRegistrationStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/buyer-profile/${buyerId}`);
      setBuyerProfile(response.data.profile);
      setIsRegistered(response.data.profile.verification_status === 'verified');
      
      if (response.data.profile.verification_status === 'pending') {
        Alert.alert(
          'Verification Pending',
          'Your business is being verified. This usually takes 24-48 hours. You will be notified once verified.'
        );
      }
      
      // NEW: Load buyer region after registration check
      if (response.data.profile.verification_status === 'verified') {
        loadBuyerRegion();
      }
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  // NEW: Load buyer's region for cross-regional search
  const loadBuyerRegion = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/buyer-location/${buyerId}`);
      setBuyerRegion(response.data.region);
    } catch (error) {
      console.error('Error loading buyer region:', error);
      // Fallback: Use location from profile if API fails
      if (buyerProfile && buyerProfile.location) {
        setBuyerRegion(buyerProfile.location.region || 'Unknown');
      }
    }
  };

  const registerBuyer = async () => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      Object.keys(registrationData).forEach(key => {
        formData.append(key, registrationData[key]);
      });

      const response = await axios.post(`${API_BASE_URL}/register-buyer`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await AsyncStorage.setItem('buyer_id', response.data.buyer_id);
      setBuyerId(response.data.buyer_id);
      setShowRegistrationModal(false);
      
      Alert.alert(
        'Registration Submitted',
        'Your business registration has been submitted for verification. You will be notified within 24-48 hours.'
      );
    } catch (error) {
      console.error('Error registering buyer:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const searchListings = async () => {
    if (!isRegistered) {
      Alert.alert('Verification Required', 'Please wait for your business to be verified.');
      return;
    }

    try {
      setLoading(true);
      
      const params = {
        buyer_id: buyerId,
        buyer_region: buyerRegion,
        ...searchFilters,
        // NEW: Cross-regional search parameters
        exclude_my_region: searchFilters.exclude_my_region,
        prefer_different_regions: searchFilters.prefer_different_regions,
        cross_regional_only: searchFilters.exclude_my_region
      };
      
      const response = await axios.get(`${API_BASE_URL}/search-listings`, { params });
      setSearchResults(response.data.listings);
      
      // NEW: Show regional insights
      if (response.data.regional_insights) {
        setRegionalInsights(response.data.regional_insights);
        
        const insights = response.data.regional_insights;
        Alert.alert(
          '🌍 Cross-Regional Insights',
          `Found ${response.data.listings.length} listings from ${insights.regions_covered} different regions\n\n` +
          `Excluded: ${insights.excluded_local_listings} local listings to avoid supporting your competition\n\n` +
          `Top supplier regions: ${insights.top_regions.join(', ')}\n\n` +
          `Average distance: ${insights.avg_distance_km.toFixed(0)}km`,
          [{ text: 'Great!' }]
        );
      }
    } catch (error) {
      console.error('Error searching listings:', error);
      Alert.alert('Error', 'Failed to search listings');
    } finally {
      setLoading(false);
    }
  };

  const viewPredictedSupply = async (crop) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/predicted-supply`, {
        params: {
          buyer_id: buyerId,
          crop: crop,
          days_ahead: 30,
          radius_km: 100
        }
      });
      
      const forecast = response.data.supply_forecast;
      const guidance = response.data.ai_recommendation;
      
      Alert.alert(
        `${crop.toUpperCase()} Supply Forecast`,
        `${guidance}\n\nExpected Supply: ${(forecast.total_supply_kg / 1000).toFixed(1)} tonnes\nFarmers Harvesting: ${forecast.farmers_harvesting}\nPrice Impact: ${forecast.expected_price_impact_percent}%`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error fetching supply forecast:', error);
    }
  };

  const createRequirement = async () => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('buyer_id', buyerId);
      Object.keys(newRequirement).forEach(key => {
        formData.append(key, newRequirement[key]);
      });

      const response = await axios.post(`${API_BASE_URL}/add-product-requirement`, formData);
      
      Alert.alert(
        'Requirement Created',
        `Found ${response.data.immediate_matches.count} immediate matches!\n\nPredicted supply in 30 days: ${(response.data.supply_forecast.next_30_days.predicted_supply_kg / 1000).toFixed(1)} tonnes\n\n${response.data.supply_forecast.recommendation}`
      );
      
      setShowRequirementModal(false);
      resetNewRequirement();
    } catch (error) {
      console.error('Error creating requirement:', error);
      Alert.alert('Error', 'Failed to create requirement');
    } finally {
      setLoading(false);
    }
  };

  const resetNewRequirement = () => {
    setNewRequirement({
      crop: '',
      quantity_needed_kg: '',
      quality_requirement: 'B',
      frequency: 'one-time',
      price_range_min: '',
      price_range_max: '',
      delivery_required: true,
      organic_only: false
    });
  };

  const makeOffer = async () => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('buyer_id', buyerId);
      formData.append('listing_id', selectedListing.listing_id);
      Object.keys(offerData).forEach(key => {
        formData.append(key, offerData[key]);
      });

      const response = await axios.post(`${API_BASE_URL}/make-offer`, formData);
      
      Alert.alert(
        'Offer Submitted',
        `Your offer has been sent to the farmer. They have 72 hours to respond.\n\nTotal Amount: ${response.data.offer.total_offer_amount_kes.toLocaleString()} KES`
      );
      
      setShowOfferModal(false);
      resetOfferData();
      loadMyOffers();
    } catch (error) {
      console.error('Error making offer:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to make offer');
    } finally {
      setLoading(false);
    }
  };

  const resetOfferData = () => {
    setOfferData({
      quantity_kg: '',
      offered_price_kes_per_kg: '',
      payment_terms: '50% deposit, 50% on delivery',
      requested_delivery_date: '',
      delivery_location: '',
      transport_responsibility: 'buyer',
      offer_notes: ''
    });
  };

  const loadMyOffers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/my-offers/${buyerId}`);
      setMyOffers(response.data.offers);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  };

  const loadMyOrders = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/my-orders/${buyerId}`);
      setMyOrders(response.data.orders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const payDeposit = async (contractId) => {
    Alert.prompt(
      'Pay Deposit',
      'Enter your M-Pesa phone number:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: async (phoneNumber) => {
            try {
              const response = await axios.post(`${API_BASE_URL}/pay-deposit/${contractId}`, {
                buyer_id: buyerId,
                phone_number: phoneNumber
              });
              
              Alert.alert(
                'M-Pesa Payment Initiated',
                `Check your phone for the M-Pesa prompt to pay ${response.data.deposit_amount_kes.toLocaleString()} KES`
              );
              
              loadMyOrders();
            } catch (error) {
              Alert.alert('Error', 'Failed to initiate payment');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const confirmReceipt = async (contractId) => {
    Alert.alert(
      'Confirm Receipt',
      'Have you received the produce and verified the quality?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Quality Issue',
          onPress: () => {
            Alert.prompt(
              'Report Quality Issue',
              'Describe the quality issue:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Submit',
                  onPress: async (notes) => {
                    try {
                      await axios.post(`${API_BASE_URL}/confirm-receipt/${contractId}`, {
                        buyer_id: buyerId,
                        quality_acceptable: false,
                        quality_notes: notes
                      });
                      
                      Alert.alert(
                        'Dispute Opened',
                        'Agropulse AI mediation team will review your complaint within 24 hours.'
                      );
                      
                      loadMyOrders();
                    } catch (error) {
                      Alert.alert('Error', 'Failed to report issue');
                    }
                  }
                }
              ],
              'plain-text'
            );
          }
        },
        {
          text: 'Quality OK',
          onPress: async () => {
            try {
              const response = await axios.post(`${API_BASE_URL}/confirm-receipt/${contractId}`, {
                buyer_id: buyerId,
                quality_acceptable: true,
                quality_notes: 'Quality acceptable'
              });
              
              Alert.alert(
                'Receipt Confirmed',
                `Final payment of ${response.data.final_payment_kes.toLocaleString()} KES is being processed to the farmer.`
              );
              
              loadMyOrders();
            } catch (error) {
              Alert.alert('Error', 'Failed to confirm receipt');
            }
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'search') {
      await searchListings();
    } else if (activeTab === 'offers') {
      await loadMyOffers();
    } else if (activeTab === 'orders') {
      await loadMyOrders();
    }
    setRefreshing(false);
  };

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Search Filters</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Crop (e.g., maize, beans)"
          value={searchFilters.crop}
          onChangeText={(text) => setSearchFilters({ ...searchFilters, crop: text })}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Minimum Quantity (kg)"
          keyboardType="numeric"
          value={searchFilters.min_quantity_kg}
          onChangeText={(text) => setSearchFilters({ ...searchFilters, min_quantity_kg: text })}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Maximum Price (KES/kg)"
          keyboardType="numeric"
          value={searchFilters.max_price_kes}
          onChangeText={(text) => setSearchFilters({ ...searchFilters, max_price_kes: text })}
        />
        
        <Text style={styles.pickerLabel}>Search Radius:</Text>
        <Picker
          selectedValue={searchFilters.radius_km}
          onValueChange={(value) => setSearchFilters({ ...searchFilters, radius_km: value })}
          style={styles.picker}
        >
          <Picker.Item label="50 km" value={50} />
          <Picker.Item label="100 km" value={100} />
          <Picker.Item label="150 km" value={150} />
        </Picker>
        
        {/* NEW: Cross-Regional Search Options */}
        <View style={styles.crossRegionalSection}>
          <Text style={styles.sectionHeader}>🌍 Cross-Regional Sourcing</Text>
          <Text style={styles.sectionSubtext}>
            Diversify your supply sources by connecting with farmers from different regions
          </Text>
          
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSearchFilters({ 
              ...searchFilters, 
              exclude_my_region: !searchFilters.exclude_my_region 
            })}
          >
            <Text style={styles.checkboxIcon}>
              {searchFilters.exclude_my_region ? '✅' : '⬜'}
            </Text>
            <Text style={styles.checkboxLabel}>
              Exclude suppliers from my region (Recommended)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSearchFilters({ 
              ...searchFilters, 
              prefer_different_regions: !searchFilters.prefer_different_regions 
            })}
          >
            <Text style={styles.checkboxIcon}>
              {searchFilters.prefer_different_regions ? '✅' : '⬜'}
            </Text>
            <Text style={styles.checkboxLabel}>
              Prioritize regional diversity in search results
            </Text>
          </TouchableOpacity>
          
          {regionalInsights && (
            <View style={styles.insightsBox}>
              <Text style={styles.insightsTitle}>📊 Regional Insights:</Text>
              <Text style={styles.insightsText}>
                Your region: {buyerRegion}
              </Text>
              <Text style={styles.insightsText}>
                Regions with best supply: {regionalInsights.top_regions?.join(', ') || 'Analyzing...'}
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity style={styles.searchButton} onPress={searchListings}>
          <Text style={styles.searchButtonText}>🔍 Search Listings</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.resultsSection}>
        <Text style={styles.resultsTitle}>
          Search Results ({searchResults.length})
        </Text>
        
        {/* NEW: Regional diversity summary */}
        {regionalInsights && searchResults.length > 0 && (
          <View style={styles.diversitySummary}>
            <Text style={styles.diversityTitle}>🌍 Regional Diversity Report</Text>
            <Text style={styles.diversityText}>
              Showing {searchResults.length} listings from {regionalInsights.regions_covered} different regions
            </Text>
            {regionalInsights.excluded_local_listings > 0 && (
              <Text style={styles.diversityExcluded}>
                ✓ Excluded {regionalInsights.excluded_local_listings} local listings to avoid supporting your competition
              </Text>
            )}
            <Text style={styles.diversityDistance}>
              Average distance: {regionalInsights.avg_distance_km?.toFixed(0) || 'N/A'} km
            </Text>
          </View>
        )}
        
        {searchResults.map((listing) => (
          <TouchableOpacity
            key={listing.listing_id}
            style={styles.listingCard}
            onPress={() => {
              setSelectedListing(listing);
              setOfferData({
                ...offerData,
                quantity_kg: listing.minimum_order_kg.toString(),
                offered_price_kes_per_kg: listing.target_price_kes_per_kg.toString()
              });
              setShowOfferModal(true);
            }}
          >
            <View style={styles.listingHeader}>
              <Text style={styles.listingCrop}>{listing.crop.toUpperCase()}</Text>
              <Text style={styles.listingDistance}>{listing.distance_km.toFixed(1)} km away</Text>
            </View>
            
            {/* NEW: Regional badge */}
            {listing.farmer_region && (
              <View style={[
                styles.regionBadge,
                listing.farmer_region !== buyerRegion ? styles.crossRegionalBadge : styles.localBadge
              ]}>
                <Text style={[
                  styles.regionBadgeText,
                  listing.farmer_region !== buyerRegion ? styles.crossRegionalBadgeText : styles.localBadgeText
                ]}>
                  {listing.farmer_region !== buyerRegion ? '🌍' : '📍'} {listing.farmer_region}
                  {listing.farmer_region !== buyerRegion && ' (Cross-Regional)'}
                </Text>
              </View>
            )}
            
            <View style={styles.listingRow}>
              <Text style={styles.listingLabel}>Available:</Text>
              <Text style={styles.listingValue}>{listing.quantity_available_kg.toLocaleString()} kg</Text>
            </View>
            
            <View style={styles.listingRow}>
              <Text style={styles.listingLabel}>Price:</Text>
              <Text style={styles.listingPrice}>{listing.target_price_kes_per_kg.toLocaleString()} KES/kg</Text>
            </View>
            
            <View style={styles.listingRow}>
              <Text style={styles.listingLabel}>Quality:</Text>
              <Text style={styles.listingValue}>Grade {listing.quality_grade}</Text>
            </View>
            
            <View style={styles.listingRow}>
              <Text style={styles.listingLabel}>Transport Cost:</Text>
              <Text style={styles.listingValue}>{listing.estimated_transport_cost_kes.toLocaleString()} KES</Text>
            </View>
            
            <View style={styles.listingRow}>
              <Text style={styles.listingLabel}>Ready:</Text>
              <Text style={styles.listingValue}>{new Date(listing.ready_date).toLocaleDateString()}</Text>
            </View>
            
            <View style={styles.farmerInfo}>
              <Text style={styles.farmerLabel}>Farmer:</Text>
              <Text style={styles.farmerName}>{listing.verification_details.farm_registered ? '✓ Verified' : 'Unverified'}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.supplyButton}
              onPress={() => viewPredictedSupply(listing.crop)}
            >
              <Text style={styles.supplyButtonText}>📊 View Supply Forecast</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRequirementsTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowRequirementModal(true)}
      >
        <Text style={styles.createButtonText}>+ Add Product Requirement</Text>
      </TouchableOpacity>
      
      <Text style={styles.sectionTitle}>Your Requirements</Text>
      <Text style={styles.sectionSubtitle}>
        AI will match you with farmers and alert you when produce becomes available
      </Text>
      
      {/* Requirements list would go here */}
    </View>
  );

  const renderOffersTab = () => (
    <View style={styles.tabContent}>
      {myOffers.map((offer) => (
        <View key={offer.offer_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{offer.crop.toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getOfferStatusColor(offer.status) }]}>
              <Text style={styles.statusText}>{offer.status}</Text>
            </View>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Quantity:</Text>
            <Text style={styles.value}>{offer.quantity_kg.toLocaleString()} kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Offered Price:</Text>
            <Text style={styles.value}>{offer.offered_price_kes_per_kg.toLocaleString()} KES/kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Total:</Text>
            <Text style={styles.totalAmount}>{offer.total_offer_amount_kes.toLocaleString()} KES</Text>
          </View>
          
          {offer.status === 'accepted' && (
            <Text style={styles.acceptedText}>✓ Farmer accepted! Deposit required.</Text>
          )}
          
          {offer.status === 'countered' && offer.counter_offer && (
            <View style={styles.counterBox}>
              <Text style={styles.counterLabel}>Farmer Counter-Offer:</Text>
              <Text style={styles.counterText}>
                {offer.counter_offer.counter_quantity_kg} kg @ {offer.counter_offer.counter_price_kes_per_kg} KES/kg
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  const renderOrdersTab = () => (
    <View style={styles.tabContent}>
      {myOrders.map((order) => (
        <View key={order.contract_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{order.crop.toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getContractStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Farmer:</Text>
            <Text style={styles.value}>{order.farmer_details.name}</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Quantity:</Text>
            <Text style={styles.value}>{order.quantity_kg.toLocaleString()} kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Price:</Text>
            <Text style={styles.value}>{order.agreed_price_kes_per_kg.toLocaleString()} KES/kg</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Total:</Text>
            <Text style={styles.totalAmount}>{order.total_amount_kes.toLocaleString()} KES</Text>
          </View>
          
          <View style={styles.cardRow}>
            <Text style={styles.label}>Delivery:</Text>
            <Text style={styles.value}>{new Date(order.delivery_date).toLocaleDateString()}</Text>
          </View>
          
          {order.status === 'pending_deposit' && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => payDeposit(order.contract_id)}
            >
              <Text style={styles.payButtonText}>
                💳 Pay Deposit ({(order.total_amount_kes * 0.1).toLocaleString()} KES)
              </Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'awaiting_buyer_confirmation' && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => confirmReceipt(order.contract_id)}
            >
              <Text style={styles.confirmButtonText}>Confirm Receipt & Release Payment</Text>
            </TouchableOpacity>
          )}
          
          {order.tracking && (
            <View style={styles.trackingBox}>
              <Text style={styles.trackingLabel}>🚚 Tracking:</Text>
              <Text style={styles.trackingText}>{order.tracking.status}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

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
      quality_dispute: '#F44336'
    };
    return colors[status] || '#9E9E9E';
  };

  if (!isRegistered && !showRegistrationModal) {
    return (
      <View style={styles.container}>
        <View style={styles.pendingContainer}>
          <Text style={styles.pendingTitle}>Verification Pending</Text>
          <Text style={styles.pendingText}>
            Your business is being verified. This usually takes 24-48 hours.
          </Text>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buyer Portal</Text>
        {buyerProfile && (
          <Text style={styles.headerSubtitle}>{buyerProfile.business_name}</Text>
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requirements' && styles.activeTab]}
          onPress={() => setActiveTab('requirements')}
        >
          <Text style={[styles.tabText, activeTab === 'requirements' && styles.activeTabText]}>
            Requirements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => {
            setActiveTab('offers');
            loadMyOffers();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
            My Offers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => {
            setActiveTab('orders');
            loadMyOrders();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            Orders
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
            {activeTab === 'search' && renderSearchTab()}
            {activeTab === 'requirements' && renderRequirementsTab()}
            {activeTab === 'offers' && renderOffersTab()}
            {activeTab === 'orders' && renderOrdersTab()}
          </>
        )}
      </ScrollView>

      {/* Registration Modal */}
      <Modal visible={showRegistrationModal} animationType="slide">
        <ScrollView style={styles.registrationModal}>
          <Text style={styles.modalTitle}>Buyer Registration</Text>
          <Text style={styles.modalSubtitle}>Register your business to source produce</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Business Name *"
            value={registrationData.business_name}
            onChangeText={(text) => setRegistrationData({ ...registrationData, business_name: text })}
          />
          
          <Text style={styles.pickerLabel}>Business Type:</Text>
          <Picker
            selectedValue={registrationData.business_type}
            onValueChange={(value) => setRegistrationData({ ...registrationData, business_type: value })}
            style={styles.picker}
          >
            <Picker.Item label="Food Processor" value="Processor" />
            <Picker.Item label="Restaurant/Hotel" value="Restaurant" />
            <Picker.Item label="Retail Store" value="Retailer" />
            <Picker.Item label="School/Institution" value="School" />
            <Picker.Item label="Aggregator/Wholesaler" value="Aggregator" />
          </Picker>
          
          <TextInput
            style={styles.input}
            placeholder="Business Registration Number *"
            value={registrationData.business_registration_number}
            onChangeText={(text) => setRegistrationData({ ...registrationData, business_registration_number: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="VAT Number (optional)"
            value={registrationData.vat_number}
            onChangeText={(text) => setRegistrationData({ ...registrationData, vat_number: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Contact Person *"
            value={registrationData.contact_person}
            onChangeText={(text) => setRegistrationData({ ...registrationData, contact_person: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Phone Number *"
            value={registrationData.phone_number}
            onChangeText={(text) => setRegistrationData({ ...registrationData, phone_number: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email *"
            value={registrationData.email}
            onChangeText={(text) => setRegistrationData({ ...registrationData, email: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Physical Address *"
            value={registrationData.physical_address}
            onChangeText={(text) => setRegistrationData({ ...registrationData, physical_address: text })}
          />
          
          <TouchableOpacity style={styles.submitButton} onPress={registerBuyer}>
            <Text style={styles.submitButtonText}>Submit Registration</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Make Offer Modal */}
      <Modal visible={showOfferModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Make Offer</Text>
            {selectedListing && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.listingPreview}>
                  <Text style={styles.previewText}>
                    {selectedListing.crop.toUpperCase()} - {selectedListing.quantity_available_kg.toLocaleString()} kg available
                  </Text>
                  <Text style={styles.previewText}>
                    Farmer's Price: {selectedListing.target_price_kes_per_kg.toLocaleString()} KES/kg
                  </Text>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Quantity (kg) *"
                  keyboardType="numeric"
                  value={offerData.quantity_kg}
                  onChangeText={(text) => setOfferData({ ...offerData, quantity_kg: text })}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Your Offered Price (KES/kg) *"
                  keyboardType="numeric"
                  value={offerData.offered_price_kes_per_kg}
                  onChangeText={(text) => setOfferData({ ...offerData, offered_price_kes_per_kg: text })}
                />
                
                {offerData.quantity_kg && offerData.offered_price_kes_per_kg && (
                  <Text style={styles.totalPreview}>
                    Total: {(parseFloat(offerData.quantity_kg) * parseFloat(offerData.offered_price_kes_per_kg)).toLocaleString()} KES
                  </Text>
                )}
                
                <TextInput
                  style={styles.input}
                  placeholder="Requested Delivery Date (YYYY-MM-DD) *"
                  value={offerData.requested_delivery_date}
                  onChangeText={(text) => setOfferData({ ...offerData, requested_delivery_date: text })}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Delivery Location *"
                  value={offerData.delivery_location}
                  onChangeText={(text) => setOfferData({ ...offerData, delivery_location: text })}
                />
                
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Offer Notes (optional)"
                  multiline
                  numberOfLines={3}
                  value={offerData.offer_notes}
                  onChangeText={(text) => setOfferData({ ...offerData, offer_notes: text })}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowOfferModal(false);
                      resetOfferData();
                    }}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={makeOffer}
                  >
                    <Text style={styles.buttonText}>Submit Offer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Product Requirement Modal */}
      <Modal visible={showRequirementModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Product Requirement</Text>
            <ScrollView style={styles.modalScroll}>
              <TextInput
                style={styles.input}
                placeholder="Crop (e.g., maize) *"
                value={newRequirement.crop}
                onChangeText={(text) => setNewRequirement({ ...newRequirement, crop: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Quantity Needed (kg) *"
                keyboardType="numeric"
                value={newRequirement.quantity_needed_kg}
                onChangeText={(text) => setNewRequirement({ ...newRequirement, quantity_needed_kg: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Min Price (KES/kg) *"
                keyboardType="numeric"
                value={newRequirement.price_range_min}
                onChangeText={(text) => setNewRequirement({ ...newRequirement, price_range_min: text })}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Max Price (KES/kg) *"
                keyboardType="numeric"
                value={newRequirement.price_range_max}
                onChangeText={(text) => setNewRequirement({ ...newRequirement, price_range_max: text })}
              />
              
              <Text style={styles.pickerLabel}>Frequency:</Text>
              <Picker
                selectedValue={newRequirement.frequency}
                onValueChange={(value) => setNewRequirement({ ...newRequirement, frequency: value })}
                style={styles.picker}
              >
                <Picker.Item label="One-Time" value="one-time" />
                <Picker.Item label="Weekly" value="weekly" />
                <Picker.Item label="Monthly" value="monthly" />
              </Picker>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowRequirementModal(false);
                    resetNewRequirement();
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={createRequirement}
                >
                  <Text style={styles.buttonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 40
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5
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
    borderBottomColor: '#2196F3'
  },
  tabText: {
    fontSize: 13,
    color: '#666'
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  tabContent: {
    padding: 15
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: '#fff'
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
    marginBottom: 10
  },
  searchButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  resultsSection: {
    marginTop: 10
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15
  },
  listingCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  listingCrop: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  listingDistance: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500'
  },
  listingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  listingLabel: {
    fontSize: 14,
    color: '#666'
  },
  listingValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  listingPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  farmerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  farmerLabel: {
    fontSize: 14,
    color: '#666'
  },
  farmerName: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  supplyButton: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center'
  },
  supplyButtonText: {
    color: '#2196F3',
    fontWeight: 'bold'
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
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
  totalAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  acceptedText: {
    marginTop: 10,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  counterBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 5
  },
  counterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  counterText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold'
  },
  payButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 5,
    marginTop: 10
  },
  payButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16
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
  trackingBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 5
  },
  trackingLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5
  },
  trackingText: {
    fontSize: 14,
    color: '#2196F3'
  },
  loader: {
    marginTop: 50
  },
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  pendingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
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
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  modalScroll: {
    maxHeight: 500
  },
  listingPreview: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15
  },
  previewText: {
    fontSize: 14,
    marginBottom: 5
  },
  totalPreview: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
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
  registrationModal: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  // NEW: Cross-regional styles
  crossRegionalSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
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
    color: '#555',
    marginBottom: 12,
    lineHeight: 18
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
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
  insightsBox: {
    backgroundColor: '#FFF',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#4CAF50'
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5
  },
  insightsText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 3
  },
  diversitySummary: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  diversityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 5
  },
  diversityText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4
  },
  diversityExcluded: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 4
  },
  diversityDistance: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  },
  regionBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 8,
    alignSelf: 'flex-start'
  },
  crossRegionalBadge: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50'
  },
  localBadge: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#9E9E9E'
  },
  regionBadgeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  crossRegionalBadgeText: {
    color: '#2E7D32'
  },
  localBadgeText: {
    color: '#666'
  }
});
