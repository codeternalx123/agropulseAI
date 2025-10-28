import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../../theme/theme';
import { partnerAPI } from '../../services/api';

const OutbreakDashboardScreen = ({ navigation }) => {
  const [outbreaks, setOutbreaks] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadOutbreaks();
  }, []);

  const loadOutbreaks = async () => {
    try {
      const data = await partnerAPI.getOutbreakDashboard('all');
      setOutbreaks(data.outbreaks || []);
    } catch (error) {
      console.error('Error loading outbreaks:', error);
      Alert.alert('Error', 'Failed to load outbreak data');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.accent;
      case 'low': return theme.colors.success;
      default: return theme.colors.disabled;
    }
  };

  const filteredOutbreaks = filter === 'all'
    ? outbreaks
    : outbreaks.filter(o => o.severity.toLowerCase() === filter);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -1.2921,
          longitude: 36.8219,
          latitudeDelta: 2,
          longitudeDelta: 2,
        }}
      >
        {filteredOutbreaks.map((outbreak, index) => (
          <React.Fragment key={index}>
            <Marker
              coordinate={{
                latitude: outbreak.latitude,
                longitude: outbreak.longitude,
              }}
              title={outbreak.pest_disease}
              description={`Severity: ${outbreak.severity}`}
            >
              <View style={[styles.marker, { backgroundColor: getSeverityColor(outbreak.severity) }]}>
                <MaterialCommunityIcons name="alert" size={24} color="#fff" />
              </View>
            </Marker>
            <Circle
              center={{
                latitude: outbreak.latitude,
                longitude: outbreak.longitude,
              }}
              radius={outbreak.radius * 1000}
              fillColor={getSeverityColor(outbreak.severity) + '30'}
              strokeColor={getSeverityColor(outbreak.severity)}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}
      </MapView>

      <Card style={styles.filterCard}>
        <Card.Content>
          <View style={styles.filterRow}>
            <Chip selected={filter === 'all'} onPress={() => setFilter('all')} style={styles.filterChip}>
              All
            </Chip>
            <Chip selected={filter === 'high'} onPress={() => setFilter('high')} style={styles.filterChip}>
              High
            </Chip>
            <Chip selected={filter === 'medium'} onPress={() => setFilter('medium')} style={styles.filterChip}>
              Medium
            </Chip>
            <Chip selected={filter === 'low'} onPress={() => setFilter('low')} style={styles.filterChip}>
              Low
            </Chip>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.legendCard}>
        <Card.Title title="Active Outbreaks" titleStyle={styles.cardTitle} />
        <Card.Content>
          <Text style={styles.count}>{filteredOutbreaks.length} outbreaks detected</Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  marker: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  filterCard: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, elevation: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap' },
  filterChip: { marginRight: spacing.sm, marginBottom: spacing.xs },
  legendCard: { position: 'absolute', bottom: spacing.md, left: spacing.md, right: spacing.md, elevation: 4 },
  cardTitle: { ...typography.h3, fontWeight: 'bold' },
  count: { ...typography.h2, fontWeight: 'bold', color: theme.colors.primary },
});

export default OutbreakDashboardScreen;
