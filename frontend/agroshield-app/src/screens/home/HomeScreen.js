import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, Avatar, Badge, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { farmAPI, calendarAPI, villageGroupsAPI, partnerAPI, notificationsAPI } from '../../services/api';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    farms: [],
    upcomingPractices: [],
    recentPosts: [],
    activeCampaigns: [],
    unreadNotifications: 0,
    weather: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all dashboard data in parallel
      const [farms, notifications] = await Promise.all([
        farmAPI.getFarms(user.id),
        notificationsAPI.getNotifications(user.id),
      ]);

      // Get upcoming practices from first farm
      let practices = [];
      if (farms.length > 0) {
        practices = await calendarAPI.getPractices(farms[0].fields[0].id, 'upcoming');
      }

      // Get recent group posts if user has a group
      let posts = [];
      if (user.village_group_id) {
        const feed = await villageGroupsAPI.getGroupFeed(user.village_group_id, { limit: 3 });
        posts = feed.posts;
      }

      // Get active campaigns
      const campaigns = await partnerAPI.getCampaigns({ status: 'active', limit: 2 });

      setData({
        farms,
        upcomingPractices: practices.slice(0, 3),
        recentPosts: posts,
        activeCampaigns: campaigns.slice(0, 2),
        unreadNotifications: notifications.filter(n => !n.is_read).length,
        weather: null, // TODO: Add weather integration
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadDashboardData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.full_name?.split(' ')[0]}! 👋</Text>
            <Text style={styles.subtitle}>Welcome to Agropulse AI</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <View>
              <MaterialCommunityIcons name="bell" size={28} color={theme.colors.text} />
              {data.unreadNotifications > 0 && (
                <Badge style={styles.badge}>{data.unreadNotifications}</Badge>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="leaf"
            label="Add Farm"
            color={theme.colors.primary}
            onPress={() => navigation.navigate('FarmTab', { screen: 'AddFarm' })}
          />
          <QuickActionButton
            icon="camera"
            label="Scan Pest"
            color={theme.colors.accent}
            onPress={() => navigation.navigate('FarmTab', { screen: 'PestScan' })}
          />
          <QuickActionButton
            icon="brain"
            label="AI Training"
            color="#9C27B0"
            onPress={() => navigation.navigate('FarmTab', { screen: 'ModelTraining' })}
          />
          <QuickActionButton
            icon="calendar-clock"
            label="AI Calendar"
            color="#28a745"
            onPress={() => navigation.navigate('FarmTab', { screen: 'AICalendar' })}
          />
          <QuickActionButton
            icon="pencil"
            label="New Post"
            color={theme.colors.secondary}
            onPress={() => navigation.navigate('GroupsTab', { screen: 'CreatePost' })}
          />
          <QuickActionButton
            icon="bullhorn"
            label="Campaigns"
            color={theme.colors.info}
            onPress={() => navigation.navigate('CampaignsTab')}
          />
        </View>

        {/* Farms Summary */}
        <Card style={styles.card}>
          <Card.Title
            title="My Farms"
            titleStyle={styles.cardTitle}
            right={(props) => (
              <IconButton
                {...props}
                icon="arrow-right"
                onPress={() => navigation.navigate('FarmTab')}
              />
            )}
          />
          <Card.Content>
            {data.farms.length === 0 ? (
              <Text style={styles.emptyText}>No farms registered yet. Add your first farm!</Text>
            ) : (
              data.farms.map((farm, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.farmItem}
                  onPress={() => navigation.navigate('FarmTab', {
                    screen: 'FarmDetail',
                    params: { farm }
                  })}
                >
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <View style={styles.farmInfo}>
                    <Text style={styles.farmName}>{farm.farm_name}</Text>
                    <Text style={styles.farmDetails}>
                      {farm.fields?.length || 0} fields • {farm.county}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.disabled} />
                </TouchableOpacity>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Upcoming Practices */}
        {data.upcomingPractices.length > 0 && (
          <Card style={styles.card}>
            <Card.Title
              title="Upcoming Practices"
              titleStyle={styles.cardTitle}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="calendar"
                  onPress={() => navigation.navigate('FarmTab', { screen: 'Calendar' })}
                />
              )}
            />
            <Card.Content>
              {data.upcomingPractices.map((practice, index) => (
                <View key={index} style={styles.practiceItem}>
                  <View style={styles.practiceDate}>
                    <Text style={styles.practiceDay}>
                      {new Date(practice.recommended_date).getDate()}
                    </Text>
                    <Text style={styles.practiceMonth}>
                      {new Date(practice.recommended_date).toLocaleString('default', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.practiceInfo}>
                    <Text style={styles.practiceName}>{practice.practice_name}</Text>
                    <Text style={styles.practiceDescription}>{practice.description}</Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Active Campaigns */}
        {data.activeCampaigns.length > 0 && (
          <Card style={styles.card}>
            <Card.Title
              title="Partner Campaigns"
              titleStyle={styles.cardTitle}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="arrow-right"
                  onPress={() => navigation.navigate('CampaignsTab')}
                />
              )}
            />
            <Card.Content>
              {data.activeCampaigns.map((campaign, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.campaignItem}
                  onPress={() => navigation.navigate('CampaignsTab', {
                    screen: 'CampaignDetail',
                    params: { campaign }
                  })}
                >
                  <View style={styles.campaignIcon}>
                    <MaterialCommunityIcons
                      name="bullhorn"
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.campaignInfo}>
                    <Text style={styles.campaignName}>{campaign.campaign_name}</Text>
                    <Text style={styles.campaignOrg}>{campaign.partner_organization}</Text>
                    <Text style={styles.campaignDetails}>
                      {campaign.target_farmers} farmers • Ends {new Date(campaign.end_date).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Recent Group Activity */}
        {data.recentPosts.length > 0 && (
          <Card style={styles.card}>
            <Card.Title
              title="Village Group Activity"
              titleStyle={styles.cardTitle}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="arrow-right"
                  onPress={() => navigation.navigate('GroupsTab')}
                />
              )}
            />
            <Card.Content>
              {data.recentPosts.map((post, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.postItem}
                  onPress={() => navigation.navigate('GroupsTab', {
                    screen: 'PostDetail',
                    params: { post }
                  })}
                >
                  <View style={styles.postHeader}>
                    <Text style={styles.postAuthor}>{post.author_name}</Text>
                    <Badge style={styles.postBadge}>{post.post_type}</Badge>
                  </View>
                  <Text style={styles.postContent} numberOfLines={2}>
                    {post.content}
                  </Text>
                  <Text style={styles.postStats}>
                    {post.upvotes} upvotes • {post.reply_count} replies
                  </Text>
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const QuickActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    ...typography.body,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    ...typography.caption,
    color: theme.colors.text,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  cardTitle: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.placeholder,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  farmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  farmInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  farmName: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  farmDetails: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  practiceItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  practiceDate: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 8,
    marginRight: spacing.md,
  },
  practiceDay: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  practiceMonth: {
    ...typography.caption,
    color: theme.colors.primary,
  },
  practiceInfo: {
    flex: 1,
  },
  practiceName: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  practiceDescription: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  campaignItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  campaignIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  campaignOrg: {
    ...typography.caption,
    color: theme.colors.primary,
    marginTop: spacing.xs,
  },
  campaignDetails: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  postItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  postAuthor: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  postBadge: {
    backgroundColor: theme.colors.secondary,
  },
  postContent: {
    ...typography.body,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  postStats: {
    ...typography.caption,
    color: theme.colors.placeholder,
  },
});

export default HomeScreen;
