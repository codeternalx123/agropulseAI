import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Card, FAB, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { farmAPI } from '../../services/api';

const FarmListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    setLoading(true);
    try {
      const data = await farmAPI.getFarms(user.id);
      setFarms(data);
    } catch (error) {
      console.error('Error loading farms:', error);
      Alert.alert('Error', 'Failed to load farms');
    } finally {
      setLoading(false);
    }
  };

  const renderFarm = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('FarmDetail', { farm: item })}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.farmIcon}>
              <MaterialCommunityIcons
                name="leaf"
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.farmInfo}>
              <Text style={styles.farmName}>{item.farm_name}</Text>
              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color={theme.colors.placeholder}
                />
                <Text style={styles.location}>
                  {item.sub_county}, {item.county}
                </Text>
              </View>
            </View>
            <IconButton
              icon="chevron-right"
              size={24}
              onPress={() => navigation.navigate('FarmDetail', { farm: item })}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.fields?.length || 0}</Text>
              <Text style={styles.statLabel}>Fields</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {item.total_area?.toFixed(1) || '0.0'}
              </Text>
              <Text style={styles.statLabel}>Acres</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {item.fields?.filter(f => f.current_crop).length || 0}
              </Text>
              <Text style={styles.statLabel}>Active Crops</Text>
            </View>
          </View>

          {item.fields && item.fields.length > 0 && (
            <View style={styles.chipsContainer}>
              {item.fields.slice(0, 3).map((field, index) => (
                <Chip
                  key={index}
                  style={styles.cropChip}
                  textStyle={styles.chipText}
                >
                  {field.current_crop || 'Fallow'}
                </Chip>
              ))}
              {item.fields.length > 3 && (
                <Chip style={styles.cropChip} textStyle={styles.chipText}>
                  +{item.fields.length - 3} more
                </Chip>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={farms}
        renderItem={renderFarm}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFarms} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="sprout"
              size={80}
              color={theme.colors.disabled}
            />
            <Text style={styles.emptyTitle}>No Farms Yet</Text>
            <Text style={styles.emptyText}>
              Register your first farm to get started with AI-powered farming insights!
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddFarm')}
        label="Add Farm"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  farmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.md,
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cropChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.secondary + '30',
  },
  chipText: {
    ...typography.caption,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.placeholder,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: theme.colors.primary,
  },
});

export default FarmListScreen;
