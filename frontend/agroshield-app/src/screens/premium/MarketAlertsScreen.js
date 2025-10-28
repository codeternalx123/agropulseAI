import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Chip, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../theme/theme';
import { premiumAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext.js';

const MarketAlertsScreen = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('maize');
  const [searchQuery, setSearchQuery] = useState('');

  const popularCrops = [
    { name: 'maize', label: 'Maize', icon: 'corn' },
    { name: 'beans', label: 'Beans', icon: 'food' },
    { name: 'tomatoes', label: 'Tomatoes', icon: 'fruit-cherries' },
    { name: 'cabbage', label: 'Cabbage', icon: 'leaf' },
    { name: 'potatoes', label: 'Potatoes', icon: 'potato' },
  ];

  useEffect(() => {
    if (selectedCrop) {
      loadMarketAlerts();
    }
  }, [selectedCrop]);

  const loadMarketAlerts = async () => {
    setLoading(true);
    try {
      const data = await premiumAPI.getMarketAlerts(selectedCrop, user.id);
      setAlerts(data);
    } catch (error) {
      if (error.response?.status === 403) {
        Alert.alert('Premium Feature', 'This feature requires PRO or EXPERT subscription.');
      } else {
        Alert.alert('Error', 'Failed to load market alerts');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMarketIcon = (marketName) => {
    if (marketName.includes('Nairobi')) return 'city';
    if (marketName.includes('Mombasa')) return 'ferry';
    if (marketName.includes('Kisumu')) return 'waves';
    return 'store';
  };

  const getPriceChangeColor = (change) => {
    if (change > 0) return theme.colors.success;
    if (change < 0) return theme.colors.error;
    return theme.colors.placeholder;
  };

  const getBestMarket = () => {
    if (!alerts?.regional_markets) return null;
    return alerts.regional_markets.reduce((best, market) => 
      market.price_per_kg > best.price_per_kg ? market : best
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadMarketAlerts} />
      }
    >
      {/* Crop Selector */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Select Crop</Text>
          <View style={styles.cropChips}>
            {popularCrops.map((crop) => (
              <Chip
                key={crop.name}
                selected={selectedCrop === crop.name}
                onPress={() => setSelectedCrop(crop.name)}
                style={styles.cropChip}
                icon={crop.icon}
              >
                {crop.label}
              </Chip>
            ))}
          </View>

          <Searchbar
            placeholder="Search other crops..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                setSelectedCrop(searchQuery.trim().toLowerCase());
              }
            }}
            style={styles.searchBar}
          />
        </Card.Content>
      </Card>

      {alerts && (
        <>
          {/* Optimal Sale Window */}
          {alerts.optimal_sale_window && (
            <Card style={[styles.card, styles.optimalCard]}>
              <Card.Content>
                <View style={styles.optimalHeader}>
                  <MaterialCommunityIcons
                    name="calendar-star"
                    size={32}
                    color={theme.colors.accent}
                  />
                  <View style={styles.optimalContent}>
                    <Text style={styles.optimalTitle}>Optimal Sale Window</Text>
                    <Text style={styles.optimalSubtitle}>
                      {alerts.optimal_sale_window.start_date} -{' '}
                      {alerts.optimal_sale_window.end_date}
                    </Text>
                  </View>
                </View>

                <View style={styles.profitIncrease}>
                  <MaterialCommunityIcons
                    name="trending-up"
                    size={24}
                    color={theme.colors.success}
                  />
                  <Text style={styles.profitIncreaseText}>
                    Up to {alerts.optimal_sale_window.profit_increase_percentage}% higher profit
                  </Text>
                </View>

                <Text style={styles.optimalReason}>{alerts.optimal_sale_window.reason}</Text>
              </Card.Content>
            </Card>
          )}

          {/* Regional Markets */}
          <Card style={styles.card}>
            <Card.Title
              title="Regional Market Prices"
              subtitle={`Last updated: ${new Date().toLocaleDateString()}`}
              left={(props) => (
                <MaterialCommunityIcons name="map-marker-multiple" size={24} color={theme.colors.primary} />
              )}
            />
            <Card.Content>
              {alerts.regional_markets?.map((market, index) => {
                const isBestMarket = market === getBestMarket();
                return (
                  <Card
                    key={index}
                    style={[
                      styles.marketCard,
                      isBestMarket && styles.bestMarketCard,
                    ]}
                  >
                    <Card.Content>
                      <View style={styles.marketHeader}>
                        <View style={styles.marketInfo}>
                          <View style={styles.marketNameRow}>
                            <MaterialCommunityIcons
                              name={getMarketIcon(market.market_name)}
                              size={20}
                              color={isBestMarket ? theme.colors.success : theme.colors.primary}
                            />
                            <Text style={styles.marketName}>{market.market_name}</Text>
                            {isBestMarket && (
                              <Chip
                                mode="flat"
                                compact
                                style={styles.bestChip}
                                textStyle={styles.bestChipText}
                              >
                                Best Price
                              </Chip>
                            )}
                          </View>
                          {market.distance_km && (
                            <Text style={styles.marketDistance}>
                              📍 {market.distance_km} km away
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.priceRow}>
                        <View>
                          <Text style={styles.priceLabel}>Current Price</Text>
                          <Text
                            style={[
                              styles.priceValue,
                              isBestMarket && { color: theme.colors.success },
                            ]}
                          >
                            KES {market.price_per_kg}/kg
                          </Text>
                        </View>

                        {market.price_change_7d !== undefined && (
                          <View style={styles.changeContainer}>
                            <Text style={styles.changeLabel}>7-Day Change</Text>
                            <View style={styles.changeRow}>
                              <MaterialCommunityIcons
                                name={
                                  market.price_change_7d > 0
                                    ? 'arrow-up'
                                    : market.price_change_7d < 0
                                    ? 'arrow-down'
                                    : 'minus'
                                }
                                size={16}
                                color={getPriceChangeColor(market.price_change_7d)}
                              />
                              <Text
                                style={[
                                  styles.changeText,
                                  { color: getPriceChangeColor(market.price_change_7d) },
                                ]}
                              >
                                {market.price_change_7d > 0 ? '+' : ''}
                                {market.price_change_7d}%
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {market.demand_level && (
                        <View style={styles.demandRow}>
                          <Text style={styles.demandLabel}>Demand: </Text>
                          <Chip
                            mode="flat"
                            compact
                            style={{
                              backgroundColor:
                                market.demand_level === 'High'
                                  ? theme.colors.success + '20'
                                  : market.demand_level === 'Medium'
                                  ? theme.colors.accent + '20'
                                  : theme.colors.error + '20',
                            }}
                            textStyle={{
                              color:
                                market.demand_level === 'High'
                                  ? theme.colors.success
                                  : market.demand_level === 'Medium'
                                  ? theme.colors.accent
                                  : theme.colors.error,
                            }}
                          >
                            {market.demand_level}
                          </Chip>
                        </View>
                      )}

                      {market.contact_info && (
                        <Button
                          mode="outlined"
                          compact
                          icon="phone"
                          onPress={() => Alert.alert('Contact', market.contact_info)}
                          style={styles.contactButton}
                        >
                          Contact Market
                        </Button>
                      )}
                    </Card.Content>
                  </Card>
                );
              })}
            </Card.Content>
          </Card>

          {/* Market Trends & Insights */}
          {alerts.insights && alerts.insights.length > 0 && (
            <Card style={styles.card}>
              <Card.Title
                title="Market Insights"
                left={(props) => (
                  <MaterialCommunityIcons
                    name="lightbulb-on"
                    size={24}
                    color={theme.colors.accent}
                  />
                )}
              />
              <Card.Content>
                {alerts.insights.map((insight, index) => (
                  <View key={index} style={styles.insightRow}>
                    <MaterialCommunityIcons
                      name="information"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Price Comparison Summary */}
          <Card style={styles.card}>
            <Card.Title title="Price Summary" />
            <Card.Content>
              {alerts.regional_markets && alerts.regional_markets.length > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Highest Price:</Text>
                    <Text style={styles.summaryValue}>
                      KES {Math.max(...alerts.regional_markets.map(m => m.price_per_kg))}/kg
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Lowest Price:</Text>
                    <Text style={styles.summaryValue}>
                      KES {Math.min(...alerts.regional_markets.map(m => m.price_per_kg))}/kg
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Average Price:</Text>
                    <Text style={styles.summaryValue}>
                      KES{' '}
                      {(
                        alerts.regional_markets.reduce((sum, m) => sum + m.price_per_kg, 0) /
                        alerts.regional_markets.length
                      ).toFixed(0)}
                      /kg
                    </Text>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  sectionTitle: {
    ...typography.h4,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  cropChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  cropChip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  searchBar: {
    marginTop: spacing.sm,
  },
  optimalCard: {
    backgroundColor: theme.colors.accent + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  optimalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optimalContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  optimalTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  optimalSubtitle: {
    ...typography.body,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  profitIncrease: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  profitIncreaseText: {
    ...typography.h4,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginLeft: spacing.sm,
  },
  optimalReason: {
    ...typography.body,
    color: theme.colors.text,
    fontStyle: 'italic',
  },
  marketCard: {
    marginBottom: spacing.md,
    elevation: 1,
  },
  bestMarketCard: {
    borderWidth: 2,
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '05',
  },
  marketHeader: {
    marginBottom: spacing.md,
  },
  marketInfo: {
    flex: 1,
  },
  marketNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  marketName: {
    ...typography.h4,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: spacing.xs,
    flex: 1,
  },
  bestChip: {
    backgroundColor: theme.colors.success,
  },
  bestChipText: {
    color: 'white',
    fontWeight: 'bold',
  },
  marketDistance: {
    ...typography.caption,
    color: theme.colors.placeholder,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  priceLabel: {
    ...typography.caption,
    color: theme.colors.placeholder,
  },
  priceValue: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  changeContainer: {
    alignItems: 'flex-end',
  },
  changeLabel: {
    ...typography.caption,
    color: theme.colors.placeholder,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    ...typography.body,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  demandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  demandLabel: {
    ...typography.body,
    color: theme.colors.text,
  },
  contactButton: {
    marginTop: spacing.sm,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  insightText: {
    ...typography.body,
    color: theme.colors.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    ...typography.body,
    color: theme.colors.placeholder,
  },
  summaryValue: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});

export default MarketAlertsScreen;
