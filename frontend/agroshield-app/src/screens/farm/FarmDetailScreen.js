import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Card, Button, Chip, IconButton, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme, spacing, typography } from '../../theme/theme';

const FarmDetailScreen = ({ route, navigation }) => {
  const { farm } = route.params;
  const [selectedField, setSelectedField] = useState(farm.fields?.[0] || null);

  const handleSoilAnalysis = () => {
    if (selectedField) {
      navigation.navigate('SoilAnalysis', { field: selectedField });
    } else {
      Alert.alert('No Field Selected', 'Please select a field first');
    }
  };

  const handleCalendar = () => {
    if (selectedField) {
      navigation.navigate('Calendar', { field: selectedField });
    } else {
      Alert.alert('No Field Selected', 'Please select a field first');
    }
  };

  const handlePestScan = () => {
    if (selectedField) {
      navigation.navigate('PestScan', { field: selectedField });
    } else {
      Alert.alert('No Field Selected', 'Please select a field first');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Farm Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.farmIcon}>
              <MaterialCommunityIcons name="leaf" size={40} color={theme.colors.primary} />
            </View>
            <View style={styles.farmInfo}>
              <Text style={styles.farmName}>{farm.farm_name}</Text>
              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color={theme.colors.placeholder}
                />
                <Text style={styles.location}>
                  {farm.sub_county}, {farm.county}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={16}
                  color={theme.colors.placeholder}
                />
                <Text style={styles.location}>
                  {farm.latitude?.toFixed(4)}, {farm.longitude?.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{farm.fields?.length || 0}</Text>
              <Text style={styles.statLabel}>Fields</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{farm.total_area?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Total Acres</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {farm.fields?.filter(f => f.current_crop).length || 0}
              </Text>
              <Text style={styles.statLabel}>Active Crops</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Title title="Quick Actions" titleStyle={styles.cardTitle} />
        <Card.Content>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="flask"
              label="Soil Analysis"
              color={theme.colors.primary}
              onPress={handleSoilAnalysis}
            />
            <ActionButton
              icon="calendar"
              label="Calendar"
              color={theme.colors.secondary}
              onPress={handleCalendar}
            />
            <ActionButton
              icon="bug"
              label="Pest Scan"
              color={theme.colors.error}
              onPress={handlePestScan}
            />
            <ActionButton
              icon="weather-partly-cloudy"
              label="Weather"
              color={theme.colors.accent}
              onPress={() => Alert.alert('Coming Soon', 'Weather feature coming soon')}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Fields */}
      <Card style={styles.card}>
        <Card.Title title="Fields" titleStyle={styles.cardTitle} />
        <Card.Content>
          {farm.fields && farm.fields.length > 0 ? (
            farm.fields.map((field, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.fieldItem,
                  selectedField?.id === field.id && styles.selectedField,
                ]}
                onPress={() => setSelectedField(field)}
              >
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldName}>{field.field_name}</Text>
                  <Text style={styles.fieldSize}>{field.field_size_acres} acres</Text>
                </View>

                <View style={styles.fieldDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons
                      name="terrain"
                      size={16}
                      color={theme.colors.placeholder}
                    />
                    <Text style={styles.detailText}>
                      Soil: {field.soil_type || 'Unknown'}
                    </Text>
                  </View>

                  {field.current_crop && (
                    <>
                      <View style={styles.detailRow}>
                        <MaterialCommunityIcons
                          name="sprout"
                          size={16}
                          color={theme.colors.placeholder}
                        />
                        <Text style={styles.detailText}>
                          Crop: {field.current_crop} {field.variety && `(${field.variety})`}
                        </Text>
                      </View>
                      {field.planting_date && (
                        <View style={styles.detailRow}>
                          <MaterialCommunityIcons
                            name="calendar"
                            size={16}
                            color={theme.colors.placeholder}
                          />
                          <Text style={styles.detailText}>
                            Planted: {new Date(field.planting_date).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {field.ai_recommendations && (
                  <View style={styles.recommendationsBox}>
                    <Text style={styles.recommendationsTitle}>AI Recommendations:</Text>
                    <Text style={styles.recommendationsText}>
                      {field.ai_recommendations.summary || 'No recommendations available'}
                    </Text>
                  </View>
                )}

                {field.lcrs_score && (
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>LCRS Score:</Text>
                    <Chip
                      style={[
                        styles.scoreChip,
                        { backgroundColor: getScoreColor(field.lcrs_score) },
                      ]}
                      textStyle={styles.scoreText}
                    >
                      {field.lcrs_score}/100
                    </Chip>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No fields registered</Text>
          )}
        </Card.Content>
      </Card>

      {/* Soil Health Summary */}
      {selectedField?.soil_snapshots && selectedField.soil_snapshots.length > 0 && (
        <Card style={styles.card}>
          <Card.Title
            title="Soil Health"
            titleStyle={styles.cardTitle}
            right={(props) => (
              <IconButton
                {...props}
                icon="arrow-right"
                onPress={handleSoilAnalysis}
              />
            )}
          />
          <Card.Content>
            <Text style={styles.snapshotDate}>
              Last Analysis: {new Date(selectedField.soil_snapshots[0].snapshot_date).toLocaleDateString()}
            </Text>
            {selectedField.soil_snapshots[0].ai_analysis && (
              <View style={styles.nutrientRow}>
                <NutrientIndicator
                  label="Nitrogen"
                  value={selectedField.soil_snapshots[0].ai_analysis.nitrogen}
                />
                <NutrientIndicator
                  label="Phosphorus"
                  value={selectedField.soil_snapshots[0].ai_analysis.phosphorus}
                />
                <NutrientIndicator
                  label="Potassium"
                  value={selectedField.soil_snapshots[0].ai_analysis.potassium}
                />
              </View>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const ActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const NutrientIndicator = ({ label, value }) => {
  const getColor = (val) => {
    if (val === 'high') return theme.colors.success;
    if (val === 'medium') return theme.colors.accent;
    return theme.colors.error;
  };

  return (
    <View style={styles.nutrientItem}>
      <Text style={styles.nutrientLabel}>{label}</Text>
      <View style={[styles.nutrientBadge, { backgroundColor: getColor(value) + '30' }]}>
        <Text style={[styles.nutrientValue, { color: getColor(value) }]}>
          {value?.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const getScoreColor = (score) => {
  if (score >= 70) return theme.colors.success + '30';
  if (score >= 40) return theme.colors.accent + '30';
  return theme.colors.error + '30';
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
  cardTitle: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  farmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  location: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    ...typography.caption,
    color: theme.colors.text,
    textAlign: 'center',
  },
  fieldItem: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  selectedField: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primary + '10',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fieldName: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  fieldSize: {
    ...typography.body,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  fieldDetails: {
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  detailText: {
    ...typography.caption,
    color: theme.colors.text,
    marginLeft: spacing.sm,
  },
  recommendationsBox: {
    backgroundColor: theme.colors.secondary + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  recommendationsTitle: {
    ...typography.caption,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  recommendationsText: {
    ...typography.caption,
    color: theme.colors.text,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  scoreLabel: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scoreChip: {
    paddingHorizontal: spacing.sm,
  },
  scoreText: {
    fontWeight: 'bold',
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.placeholder,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  snapshotDate: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginBottom: spacing.md,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutrientItem: {
    alignItems: 'center',
  },
  nutrientLabel: {
    ...typography.caption,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  nutrientBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  nutrientValue: {
    ...typography.caption,
    fontWeight: 'bold',
  },
});

export default FarmDetailScreen;
