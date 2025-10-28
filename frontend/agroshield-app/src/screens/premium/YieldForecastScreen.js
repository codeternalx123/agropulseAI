import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, SegmentedButtons, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { theme, spacing, typography } from '../theme/theme';
import { premiumAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext.js';

const screenWidth = Dimensions.get('window').width;

const YieldForecastScreen = ({ route }) => {
  const { user } = useAuth();
  const { fieldId } = route.params || {};
  
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [daysAhead, setDaysAhead] = useState('90');
  const [whatIfMode, setWhatIfMode] = useState(false);
  
  // What-If scenario state
  const [investmentType, setInvestmentType] = useState('fertilizer');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [whatIfResult, setWhatIfResult] = useState(null);

  useEffect(() => {
    if (fieldId) {
      loadForecast();
    }
  }, [fieldId, daysAhead]);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const data = await premiumAPI.getYieldForecast(fieldId, user.id, parseInt(daysAhead));
      setForecast(data);
    } catch (error) {
      if (error.response?.status === 403) {
        Alert.alert('Premium Feature', 'This feature requires PRO or EXPERT subscription.');
      } else {
        Alert.alert('Error', 'Failed to load forecast');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateWhatIf = async () => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid investment amount');
      return;
    }

    setLoading(true);
    try {
      const data = await premiumAPI.calculateWhatIf(
        fieldId,
        user.id,
        parseFloat(investmentAmount),
        investmentType
      );
      setWhatIfResult(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate What-If scenario');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return theme.colors.success;
    if (confidence >= 60) return theme.colors.accent;
    return theme.colors.error;
  };

  if (!forecast && !loading) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons name="chart-line" size={64} color={theme.colors.disabled} />
            <Text style={styles.emptyText}>No forecast available</Text>
            <Text style={styles.emptySubtext}>Select a field to view yield forecast</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Mode Selector */}
      <SegmentedButtons
        value={whatIfMode ? 'whatif' : 'forecast'}
        onValueChange={(value) => setWhatIfMode(value === 'whatif')}
        buttons={[
          {
            value: 'forecast',
            label: 'Forecast',
            icon: 'chart-line',
          },
          {
            value: 'whatif',
            label: 'What-If',
            icon: 'calculator',
          },
        ]}
        style={styles.segmentedButtons}
      />

      {!whatIfMode ? (
        <>
          {/* Forecast Duration Selector */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Forecast Duration</Text>
              <SegmentedButtons
                value={daysAhead}
                onValueChange={setDaysAhead}
                buttons={[
                  { value: '30', label: '30 Days' },
                  { value: '60', label: '60 Days' },
                  { value: '90', label: '90 Days' },
                  { value: '120', label: '120 Days' },
                ]}
              />
            </Card.Content>
          </Card>

          {forecast && (
            <>
              {/* Yield Prediction */}
              <Card style={styles.card}>
                <Card.Title
                  title="Predicted Yield"
                  left={(props) => (
                    <MaterialCommunityIcons name="barley" size={24} color={theme.colors.primary} />
                  )}
                />
                <Card.Content>
                  <View style={styles.metricRow}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Harvest Size</Text>
                      <Text style={styles.metricValue}>
                        {forecast.predicted_yield_kg.toFixed(0)} kg
                      </Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Expected Price</Text>
                      <Text style={styles.metricValue}>
                        KES {forecast.forecast_price.toFixed(0)}/kg
                      </Text>
                    </View>
                  </View>

                  <View style={styles.profitContainer}>
                    <Text style={styles.profitLabel}>Predicted Profit</Text>
                    <Text style={styles.profitValue}>
                      KES {forecast.predicted_profit.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceLabel}>Confidence Level</Text>
                    <View style={styles.confidenceBar}>
                      <View
                        style={[
                          styles.confidenceFill,
                          {
                            width: `${forecast.confidence_level}%`,
                            backgroundColor: getConfidenceColor(forecast.confidence_level),
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.confidenceText,
                        { color: getConfidenceColor(forecast.confidence_level) },
                      ]}
                    >
                      {forecast.confidence_level}% Confidence
                    </Text>
                  </View>
                </Card.Content>
              </Card>

              {/* Factors Influencing Forecast */}
              {forecast.factors && (
                <Card style={styles.card}>
                  <Card.Title title="Key Factors" />
                  <Card.Content>
                    {forecast.factors.map((factor, index) => (
                      <View key={index} style={styles.factorRow}>
                        <MaterialCommunityIcons
                          name={factor.icon || 'information'}
                          size={20}
                          color={theme.colors.primary}
                        />
                        <View style={styles.factorContent}>
                          <Text style={styles.factorTitle}>{factor.name}</Text>
                          <Text style={styles.factorDescription}>{factor.impact}</Text>
                        </View>
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              )}

              {/* Recommendations */}
              {forecast.recommendations && forecast.recommendations.length > 0 && (
                <Card style={styles.card}>
                  <Card.Title
                    title="Recommendations"
                    left={(props) => (
                      <MaterialCommunityIcons
                        name="lightbulb-on"
                        size={24}
                        color={theme.colors.accent}
                      />
                    )}
                  />
                  <Card.Content>
                    {forecast.recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationRow}>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={theme.colors.accent}
                        />
                        <Text style={styles.recommendationText}>{rec}</Text>
                      </View>
                    ))}
                  </Card.Content>
                </Card>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {/* What-If Scenario Calculator */}
          <Card style={styles.card}>
            <Card.Title
              title="What-If Scenario"
              subtitle="Calculate ROI for potential investments"
            />
            <Card.Content>
              <Text style={styles.sectionTitle}>Investment Type</Text>
              <SegmentedButtons
                value={investmentType}
                onValueChange={setInvestmentType}
                buttons={[
                  { value: 'fertilizer', label: 'Fertilizer', icon: 'flower' },
                  { value: 'pesticide', label: 'Pesticide', icon: 'bug' },
                  { value: 'irrigation', label: 'Irrigation', icon: 'water' },
                ]}
                style={styles.investmentButtons}
              />

              <TextInput
                label="Investment Amount (KES)"
                value={investmentAmount}
                onChangeText={setInvestmentAmount}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="currency-usd" />}
              />

              <Button
                mode="contained"
                onPress={calculateWhatIf}
                loading={loading}
                style={styles.calculateButton}
              >
                Calculate ROI
              </Button>
            </Card.Content>
          </Card>

          {whatIfResult && (
            <>
              {/* ROI Comparison */}
              <Card style={styles.card}>
                <Card.Title title="ROI Analysis" />
                <Card.Content>
                  <View style={styles.comparisonRow}>
                    <View style={styles.comparisonCard}>
                      <Text style={styles.comparisonLabel}>Baseline</Text>
                      <Text style={styles.comparisonValue}>
                        KES {whatIfResult.baseline_profit.toLocaleString()}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <View style={styles.comparisonCard}>
                      <Text style={styles.comparisonLabel}>With Investment</Text>
                      <Text style={[styles.comparisonValue, { color: theme.colors.success }]}>
                        KES {whatIfResult.with_investment_profit.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.roiContainer}>
                    <Text style={styles.roiLabel}>Return on Investment</Text>
                    <Text
                      style={[
                        styles.roiValue,
                        {
                          color:
                            whatIfResult.roi_percentage > 0
                              ? theme.colors.success
                              : theme.colors.error,
                        },
                      ]}
                    >
                      {whatIfResult.roi_percentage > 0 ? '+' : ''}
                      {whatIfResult.roi_percentage.toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.profitIncreaseContainer}>
                    <MaterialCommunityIcons
                      name="trending-up"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={styles.profitIncreaseText}>
                      Additional Profit: KES{' '}
                      {(
                        whatIfResult.with_investment_profit - whatIfResult.baseline_profit
                      ).toLocaleString()}
                    </Text>
                  </View>

                  {whatIfResult.recommendation && (
                    <View style={styles.recommendationBox}>
                      <MaterialCommunityIcons
                        name="information"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.recommendationBoxText}>
                        {whatIfResult.recommendation}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            </>
          )}
        </>
      )}

      <Button
        mode="outlined"
        onPress={loadForecast}
        loading={loading}
        style={styles.refreshButton}
      >
        Refresh Forecast
      </Button>
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
  emptyCard: {
    marginTop: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.placeholder,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: theme.colors.placeholder,
    marginTop: spacing.sm,
  },
  segmentedButtons: {
    marginBottom: spacing.md,
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.primary + '10',
    padding: spacing.md,
    borderRadius: 8,
    marginHorizontal: spacing.xs,
  },
  metricLabel: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginBottom: spacing.xs,
  },
  metricValue: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  profitContainer: {
    backgroundColor: theme.colors.success + '10',
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profitLabel: {
    ...typography.body,
    color: theme.colors.success,
    marginBottom: spacing.xs,
  },
  profitValue: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  confidenceContainer: {
    marginTop: spacing.md,
  },
  confidenceLabel: {
    ...typography.body,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: theme.colors.disabled + '30',
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceText: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  factorContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  factorTitle: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  factorDescription: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  recommendationText: {
    ...typography.body,
    color: theme.colors.text,
    flex: 1,
    marginLeft: spacing.xs,
  },
  investmentButtons: {
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  calculateButton: {
    marginTop: spacing.sm,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    borderRadius: 8,
  },
  comparisonLabel: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginBottom: spacing.xs,
  },
  comparisonValue: {
    ...typography.h4,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  roiContainer: {
    backgroundColor: theme.colors.success + '10',
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roiLabel: {
    ...typography.body,
    color: theme.colors.success,
    marginBottom: spacing.xs,
  },
  roiValue: {
    ...typography.h2,
    fontWeight: 'bold',
  },
  profitIncreaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  profitIncreaseText: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginLeft: spacing.xs,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primary + '10',
    padding: spacing.md,
    borderRadius: 8,
  },
  recommendationBoxText: {
    ...typography.body,
    color: theme.colors.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
  refreshButton: {
    marginTop: spacing.md,
  },
});

export default YieldForecastScreen;
