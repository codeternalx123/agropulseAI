import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, FAB, Chip, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../../theme/theme';
import { partnerAPI } from '../../services/api';

const CampaignListScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    loadCampaigns();
  }, [filter]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await partnerAPI.getCampaigns({ status: filter });
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCampaign = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CampaignDetail', { campaign: item })}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="bullhorn" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.campaign_name}</Text>
              <Text style={styles.org}>{item.partner_organization}</Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

          <View style={styles.tagsRow}>
            <Chip style={styles.typeChip}>{item.campaign_type}</Chip>
            <Chip style={styles.statusChip}>{item.status}</Chip>
          </View>

          <View style={styles.footer}>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="account-group" size={16} color={theme.colors.placeholder} />
              <Text style={styles.statText}>{item.registered_farmers}/{item.target_farmers} farmers</Text>
            </View>
            <Text style={styles.date}>Ends: {new Date(item.end_date).toLocaleDateString()}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search campaigns..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <View style={styles.filterContainer}>
        <Chip selected={filter === 'active'} onPress={() => setFilter('active')} style={styles.filterChip}>Active</Chip>
        <Chip selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} style={styles.filterChip}>Upcoming</Chip>
        <Chip selected={filter === 'completed'} onPress={() => setFilter('completed')} style={styles.filterChip}>Past</Chip>
      </View>

      <FlatList
        data={campaigns.filter(c => c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()))}
        renderItem={renderCampaign}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCampaigns} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bullhorn" size={80} color={theme.colors.disabled} />
            <Text style={styles.emptyText}>No campaigns found</Text>
          </View>
        }
      />

      <FAB icon="lifebuoy" label="Expert Help" style={styles.fab} onPress={() => navigation.navigate('ExpertHelp')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchbar: { margin: spacing.md },
  filterContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  filterChip: { marginRight: spacing.sm },
  listContent: { padding: spacing.md },
  card: { marginBottom: spacing.md, elevation: 2 },
  header: { flexDirection: 'row', marginBottom: spacing.md },
  iconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  info: { flex: 1 },
  name: { ...typography.h3, fontWeight: 'bold', color: theme.colors.text },
  org: { ...typography.caption, color: theme.colors.primary, marginTop: spacing.xs },
  description: { ...typography.body, color: theme.colors.text, marginBottom: spacing.md },
  tagsRow: { flexDirection: 'row', marginBottom: spacing.md },
  typeChip: { marginRight: spacing.sm, backgroundColor: theme.colors.secondary + '30' },
  statusChip: { backgroundColor: theme.colors.success + '30' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: spacing.sm },
  stat: { flexDirection: 'row', alignItems: 'center' },
  statText: { ...typography.caption, color: theme.colors.placeholder, marginLeft: spacing.xs },
  date: { ...typography.caption, color: theme.colors.placeholder },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.body, color: theme.colors.disabled, marginTop: spacing.md },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.md, backgroundColor: theme.colors.info },
});

export default CampaignListScreen;
