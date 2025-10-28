import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Avatar, Button, Divider, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <Card style={styles.card}>
        <Card.Content style={styles.headerContent}>
          <Avatar.Icon
            size={80}
            icon="account"
            style={styles.avatar}
            color={theme.colors.primary}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{user?.full_name}</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={theme.colors.placeholder}
              />
              <Text style={styles.location}>
                {user?.sub_county}, {user?.county}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <MaterialCommunityIcons
                name="phone"
                size={16}
                color={theme.colors.placeholder}
              />
              <Text style={styles.contact}>{user?.phone}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Farms</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Campaigns</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Menu Options */}
      <Card style={styles.card}>
        <List.Section>
          <List.Item
            title="Edit Profile"
            description="Update your personal information"
            left={(props) => <List.Icon {...props} icon="account-edit" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Coming Soon', 'Profile editing coming soon')}
          />
          <Divider />
          <List.Item
            title="My Farms"
            description="View and manage your farms"
            left={(props) => <List.Icon {...props} icon="leaf" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('FarmTab')}
          />
          <Divider />
          <List.Item
            title="My Posts"
            description="View your community posts"
            left={(props) => <List.Icon {...props} icon="post" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('GroupsTab')}
          />
          <Divider />
          <List.Item
            title="Settings"
            description="App preferences and notifications"
            left={(props) => <List.Icon {...props} icon="cog" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Settings')}
          />
          <Divider />
          <List.Item
            title="Help & Support"
            description="FAQs and contact support"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Help')}
          />
        </List.Section>
      </Card>

      {/* Logout Button */}
      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor={theme.colors.error}
      >
        Logout
      </Button>

      <Text style={styles.version}>Version 1.0.0</Text>
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
  headerContent: {
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: theme.colors.primary + '20',
    marginBottom: spacing.md,
  },
  headerInfo: {
    alignItems: 'center',
  },
  name: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  location: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginLeft: spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contact: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  logoutButton: {
    marginVertical: spacing.lg,
    borderColor: theme.colors.error,
  },
  version: {
    ...typography.caption,
    color: theme.colors.disabled,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});

export default ProfileScreen;
