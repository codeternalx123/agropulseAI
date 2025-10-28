import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip, List, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../theme/theme';
import { subscriptionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext.js';

const SubscriptionScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tiers, setTiers] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tiersData, statusData] = await Promise.all([
        subscriptionAPI.getTiers(),
        subscriptionAPI.getStatus(user.id),
      ]);
      setTiers(tiersData);
      setCurrentStatus(statusData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  };

  const handleSubscribe = async (tier) => {
    Alert.alert(
      'Confirm Subscription',
      `Subscribe to ${tier} tier for KES ${tiers.subscriptions[tier].price}/month?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await subscriptionAPI.subscribe(
                user.phone,
                tier,
                'monthly'
              );
              
              Alert.alert(
                'M-Pesa Payment',
                result.message,
                [{ text: 'OK', onPress: () => loadData() }]
              );
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Subscription failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'FREE':
        return theme.colors.disabled;
      case 'PRO':
        return theme.colors.primary;
      case 'EXPERT':
        return '#FF6F00';
      default:
        return theme.colors.accent;
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'FREE':
        return 'star-outline';
      case 'PRO':
        return 'star';
      case 'EXPERT':
        return 'crown';
      default:
        return 'star';
    }
  };

  if (!tiers || !currentStatus) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const isCurrentTier = (tier) => currentStatus.subscription_tier === tier;
  const isActiveTier = currentStatus.is_active && isCurrentTier('PRO') || isCurrentTier('EXPERT');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Current Status */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusLabel}>Current Plan</Text>
              <Text style={styles.statusTier}>{currentStatus.subscription_tier}</Text>
            </View>
            <MaterialCommunityIcons
              name={getTierIcon(currentStatus.subscription_tier)}
              size={48}
              color={getTierColor(currentStatus.subscription_tier)}
            />
          </View>
          
          {currentStatus.expiry_date && (
            <Text style={styles.expiryText}>
              {currentStatus.is_active 
                ? `Expires: ${new Date(currentStatus.expiry_date).toLocaleDateString()}`
                : 'Expired - Renew to restore access'}
            </Text>
          )}

          {currentStatus.agri_reliability_score && (
            <View style={styles.scoreContainer}>
              <MaterialCommunityIcons name="certificate" size={20} color={theme.colors.success} />
              <Text style={styles.scoreText}>
                Agri-Reliability Score: {currentStatus.agri_reliability_score}/100
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Subscription Tiers */}
      {Object.entries(tiers.subscriptions).map(([tierKey, tierData]) => (
        <Card
          key={tierKey}
          style={[
            styles.tierCard,
            isCurrentTier(tierKey) && styles.currentTierCard,
          ]}
        >
          <Card.Content>
            <View style={styles.tierHeader}>
              <View style={styles.tierTitleRow}>
                <MaterialCommunityIcons
                  name={getTierIcon(tierKey)}
                  size={32}
                  color={getTierColor(tierKey)}
                />
                <View style={styles.tierTitleContent}>
                  <Text style={styles.tierName}>{tierData.name}</Text>
                  {isCurrentTier(tierKey) && (
                    <Chip mode="flat" compact style={styles.activeChip}>
                      Active
                    </Chip>
                  )}
                </View>
              </View>
              
              {tierKey !== 'FREE' && (
                <Text style={styles.tierPrice}>
                  KES {tierData.price}
                  <Text style={styles.priceUnit}>/month</Text>
                </Text>
              )}
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.featuresTitle}>Features:</Text>
            {tierData.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color={theme.colors.success}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            {tierKey !== 'FREE' && !isCurrentTier(tierKey) && (
              <Button
                mode="contained"
                onPress={() => handleSubscribe(tierKey)}
                loading={loading}
                style={[styles.subscribeButton, { backgroundColor: getTierColor(tierKey) }]}
              >
                {tierKey === 'PRO' ? 'Upgrade to Pro' : 'Upgrade to Expert'}
              </Button>
            )}

            {isCurrentTier(tierKey) && tierKey !== 'FREE' && !currentStatus.is_active && (
              <Button
                mode="contained"
                onPress={() => handleSubscribe(tierKey)}
                loading={loading}
                style={styles.renewButton}
              >
                Renew Subscription
              </Button>
            )}
          </Card.Content>
        </Card>
      ))}

      {/* Pay-Per-Service */}
      <Card style={styles.card}>
        <Card.Title
          title="Pay-Per-Service"
          titleStyle={styles.cardTitle}
          left={(props) => <MaterialCommunityIcons name="cash" size={24} color={theme.colors.accent} />}
        />
        <Card.Content>
          <Text style={styles.sectionDescription}>
            One-time purchases without subscription commitment
          </Text>

          {Object.entries(tiers.pay_per_service).map(([serviceKey, serviceData]) => (
            <List.Item
              key={serviceKey}
              title={serviceData.name}
              description={`${serviceData.description} - KES ${serviceData.price}`}
              left={(props) => <List.Icon {...props} icon="lightning-bolt" />}
              right={(props) => (
                <Button
                  mode="outlined"
                  compact
                  onPress={() => handlePurchaseService(serviceKey, serviceData)}
                >
                  Buy
                </Button>
              )}
              style={styles.serviceItem}
            />
          ))}
        </Card.Content>
      </Card>

      {/* Billing & Receipts */}
      <Card style={styles.card}>
        <Card.Title title="Billing & Receipts" />
        <Card.Content>
          <Button
            mode="outlined"
            icon="receipt"
            onPress={() => navigation.navigate('Transactions')}
          >
            View Transaction History
          </Button>
        </Card.Content>
      </Card>

      {/* Help */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.helpText}>
            💳 All payments are processed securely via M-Pesa{'\n'}
            📱 You'll receive an STK Push notification{'\n'}
            🔒 Your payment information is never stored{'\n\n'}
            Problems with payment? Contact us via SMS: 0700000000
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  async function handlePurchaseService(serviceKey, serviceData) {
    Alert.alert(
      'Confirm Purchase',
      `Buy ${serviceData.name} for KES ${serviceData.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await subscriptionAPI.purchaseService(
                user.phone,
                serviceKey
              );
              
              Alert.alert('M-Pesa Payment', result.message);
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Purchase failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    marginBottom: spacing.md,
    elevation: 4,
    backgroundColor: theme.colors.primary + '10',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.caption,
    color: theme.colors.placeholder,
  },
  statusTier: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  expiryText: {
    ...typography.body,
    color: theme.colors.placeholder,
    marginTop: spacing.sm,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: theme.colors.success + '20',
    borderRadius: 4,
  },
  scoreText: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginLeft: spacing.xs,
  },
  tierCard: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  currentTierCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  tierHeader: {
    marginBottom: spacing.sm,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tierTitleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: spacing.sm,
  },
  tierName: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  activeChip: {
    backgroundColor: theme.colors.success,
  },
  tierPrice: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  priceUnit: {
    ...typography.body,
    color: theme.colors.placeholder,
  },
  divider: {
    marginVertical: spacing.md,
  },
  featuresTitle: {
    ...typography.h4,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureText: {
    ...typography.body,
    color: theme.colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  subscribeButton: {
    marginTop: spacing.md,
  },
  renewButton: {
    marginTop: spacing.md,
    backgroundColor: theme.colors.accent,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  cardTitle: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  sectionDescription: {
    ...typography.body,
    color: theme.colors.placeholder,
    marginBottom: spacing.md,
  },
  serviceItem: {
    marginBottom: spacing.sm,
  },
  helpText: {
    ...typography.body,
    color: theme.colors.placeholder,
    lineHeight: 24,
  },
});

export default SubscriptionScreen;
