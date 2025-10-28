import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { partnerAPI } from '../../services/api';

const CampaignDetailScreen = ({ route, navigation }) => {
  const { campaign } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleRegister = async () => {
    Alert.alert('Register for Campaign', `Register for ${campaign.campaign_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Register',
        onPress: async () => {
          setLoading(true);
          try {
            await partnerAPI.registerForCampaign(campaign.id, user.id);
            Alert.alert('Success', 'Successfully registered for campaign!');
          } catch (error) {
            console.error('Error registering:', error);
            Alert.alert('Error', 'Failed to register');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="bullhorn" size={48} color={theme.colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{campaign.campaign_name}</Text>
              <Text style={styles.org}>{campaign.partner_organization}</Text>
              <Chip style={styles.statusChip}>{campaign.status}</Chip>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Description" titleStyle={styles.cardTitle} />
        <Card.Content>
          <Text style={styles.description}>{campaign.description}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Details" titleStyle={styles.cardTitle} />
        <Card.Content>
          <DetailRow icon="calendar-start" label="Start Date" value={new Date(campaign.start_date).toLocaleDateString()} />
          <DetailRow icon="calendar-end" label="End Date" value={new Date(campaign.end_date).toLocaleDateString()} />
          <DetailRow icon="tag" label="Type" value={campaign.campaign_type} />
          <DetailRow icon="map-marker" label="Location" value={`${campaign.sub_county}, ${campaign.county}`} />
          <DetailRow icon="account-group" label="Target" value={`${campaign.target_farmers} farmers`} />
          <DetailRow icon="check-circle" label="Registered" value={`${campaign.registered_farmers} farmers`} />
        </Card.Content>
      </Card>

      {campaign.requirements && (
        <Card style={styles.card}>
          <Card.Title title="Requirements" titleStyle={styles.cardTitle} />
          <Card.Content>
            {campaign.requirements.map((req, index) => (
              <View key={index} style={styles.listItem}>
                <MaterialCommunityIcons name="check" size={20} color={theme.colors.success} />
                <Text style={styles.listText}>{req}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {campaign.benefits && (
        <Card style={styles.card}>
          <Card.Title title="Benefits" titleStyle={styles.cardTitle} />
          <Card.Content>
            {campaign.benefits.map((benefit, index) => (
              <View key={index} style={styles.listItem}>
                <MaterialCommunityIcons name="gift" size={20} color={theme.colors.accent} />
                <Text style={styles.listText}>{benefit}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading || campaign.status !== 'active'}
        style={styles.registerButton}
        contentStyle={styles.buttonContent}
      >
        Register for Campaign
      </Button>
    </ScrollView>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} />
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: spacing.md },
  card: { marginBottom: spacing.md, elevation: 2 },
  cardTitle: { ...typography.h3, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  headerInfo: { flex: 1 },
  name: { ...typography.h2, fontWeight: 'bold', color: theme.colors.text, marginBottom: spacing.xs },
  org: { ...typography.body, color: theme.colors.primary, marginBottom: spacing.sm },
  statusChip: { alignSelf: 'flex-start', backgroundColor: theme.colors.success + '30' },
  description: { ...typography.body, color: theme.colors.text, lineHeight: 24 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  detailLabel: { ...typography.body, fontWeight: 'bold', color: theme.colors.text, marginLeft: spacing.sm, marginRight: spacing.sm },
  detailValue: { ...typography.body, color: theme.colors.text, flex: 1 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  listText: { ...typography.body, color: theme.colors.text, marginLeft: spacing.sm, flex: 1 },
  registerButton: { marginVertical: spacing.lg },
  buttonContent: { paddingVertical: spacing.sm },
});

export default CampaignDetailScreen;
