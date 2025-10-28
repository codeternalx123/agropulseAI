import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Card, Chip, Badge, ActivityIndicator, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext.js';

/**
 * Notifications Screen
 * 
 * Features:
 * - IPM-focused pest/disease alerts
 * - Preventative weather alerts (Late Blight, fungal diseases, aphids)
 * - Storage condition warnings
 * - Calendar practice reminders
 * - Community pest reports (5km radius)
 * - Smart alert prioritization
 */

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, alerts, reminders, community
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [filter, searchQuery, notifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      // const response = await api.get('/notifications');
      // setNotifications(response.data);
      
      // For now, start with empty notifications
      setNotifications([]);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Filter by category
    if (filter !== 'all') {
      filtered = filtered.filter((notif) => notif.category === filter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (notif) =>
          notif.title.toLowerCase().includes(query) ||
          notif.message.toLowerCase().includes(query) ||
          (notif.crop && notif.crop.toLowerCase().includes(query))
      );
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId) => {
    try {
      // Call API to mark as read (replace with actual endpoint)
      // await api.post(`/notifications/${notificationId}/read`);

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to appropriate screen based on notification type
    if (notification.type === 'storage_warning') {
      navigation.navigate('StorageBLE', { cropType: notification.crop?.toLowerCase() });
    } else if (notification.type === 'calendar_reminder' || notification.type === 'harvest_reminder') {
      navigation.navigate('Calendar');
    } else if (notification.type === 'pest_alert' || notification.type === 'community_pest') {
      navigation.navigate('PestScan');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'pest_alert':
      case 'pest_prediction':
        return 'bug-outline';
      case 'storage_warning':
        return 'warehouse';
      case 'calendar_reminder':
      case 'harvest_reminder':
        return 'calendar-clock';
      case 'community_pest':
        return 'account-group';
      case 'weather_alert':
        return 'weather-cloudy-alert';
      default:
        return 'bell-outline';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'pest_alert':
      case 'pest_prediction':
        return '#E91E63';
      case 'storage_warning':
        return '#FF5722';
      case 'calendar_reminder':
      case 'harvest_reminder':
        return '#2196F3';
      case 'community_pest':
        return '#9C27B0';
      case 'weather_alert':
        return '#FF9800';
      default:
        return '#757575';
    }
  };

  const getPriorityColor = (priority) => {
    if (priority >= 8) return '#D32F2F'; // Critical
    if (priority >= 6) return '#F57C00'; // High
    if (priority >= 4) return '#FFA726'; // Medium
    return '#66BB6A'; // Low
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadText}>{unreadCount} unread messages</Text>
          )}
        </View>
        <Badge size={28} style={styles.badge}>
          {unreadCount}
        </Badge>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search notifications..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.filterChip}
          textStyle={filter === 'all' ? styles.filterChipTextActive : styles.filterChipText}
        >
          All ({notifications.length})
        </Chip>
        <Chip
          selected={filter === 'alerts'}
          onPress={() => setFilter('alerts')}
          style={styles.filterChip}
          textStyle={filter === 'alerts' ? styles.filterChipTextActive : styles.filterChipText}
        >
          Alerts ({notifications.filter((n) => n.category === 'alerts').length})
        </Chip>
        <Chip
          selected={filter === 'reminders'}
          onPress={() => setFilter('reminders')}
          style={styles.filterChip}
          textStyle={filter === 'reminders' ? styles.filterChipTextActive : styles.filterChipText}
        >
          Reminders ({notifications.filter((n) => n.category === 'reminders').length})
        </Chip>
        <Chip
          selected={filter === 'community'}
          onPress={() => setFilter('community')}
          style={styles.filterChip}
          textStyle={filter === 'community' ? styles.filterChipTextActive : styles.filterChipText}
        >
          Community ({notifications.filter((n) => n.category === 'community').length})
        </Chip>
      </ScrollView>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-off-outline" size={64} color="#BDBDBD" />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'No results found'
                : 'You\'re all caught up!'}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <Card
                style={[
                  styles.notificationCard,
                  !notification.read && styles.unreadCard,
                ]}
              >
                <Card.Content>
                  <View style={styles.notificationHeader}>
                    <View style={styles.notificationHeaderLeft}>
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: getTypeColor(notification.type) + '20' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={getTypeIcon(notification.type)}
                          size={24}
                          color={getTypeColor(notification.type)}
                        />
                      </View>
                      <View style={styles.notificationHeaderText}>
                        <View style={styles.titleRow}>
                          <Text style={styles.notificationTitle}>
                            {notification.title}
                          </Text>
                          {!notification.read && (
                            <View style={styles.unreadDot} />
                          )}
                        </View>
                        <View style={styles.metaRow}>
                          <Chip
                            style={{
                              backgroundColor: getPriorityColor(notification.priority) + '20',
                              height: 24,
                            }}
                            textStyle={{
                              color: getPriorityColor(notification.priority),
                              fontSize: 10,
                              marginVertical: 0,
                            }}
                          >
                            Priority {notification.priority}/10
                          </Chip>
                          {notification.crop && (
                            <Chip
                              style={styles.cropChip}
                              textStyle={styles.cropChipText}
                            >
                              {notification.crop}
                            </Chip>
                          )}
                          {notification.geoTagged && (
                            <MaterialCommunityIcons
                              name="map-marker"
                              size={16}
                              color="#757575"
                              style={{ marginLeft: 8 }}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>

                  {notification.actionable && (
                    <View style={styles.actionBox}>
                      <View style={styles.actionHeader}>
                        <MaterialCommunityIcons
                          name="lightbulb-on-outline"
                          size={18}
                          color="#FF9800"
                        />
                        <Text style={styles.actionTitle}>Recommended Action:</Text>
                      </View>
                      <Text style={styles.actionText}>{notification.action}</Text>
                      <Text style={styles.timingText}>⏰ Timing: {notification.timing}</Text>
                    </View>
                  )}

                  {notification.reportCount && (
                    <View style={styles.communityBox}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={18}
                        color="#9C27B0"
                      />
                      <Text style={styles.communityText}>
                        {notification.reportCount} reports • {notification.distance} away
                      </Text>
                    </View>
                  )}

                  <Text style={styles.timestamp}>
                    {getRelativeTime(notification.timestamp)}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function getRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  unreadText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#D32F2F',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  filterChipText: {
    color: '#757575',
  },
  filterChipTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  notificationCard: {
    margin: 8,
    marginHorizontal: 12,
    elevation: 1,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    elevation: 3,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notificationHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationHeaderText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cropChip: {
    backgroundColor: '#E8F5E9',
    height: 24,
    marginLeft: 8,
  },
  cropChipText: {
    fontSize: 10,
    color: '#2E7D32',
    marginVertical: 0,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E65100',
    marginLeft: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#424242',
    marginBottom: 6,
  },
  timingText: {
    fontSize: 12,
    color: '#616161',
  },
  communityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  communityText: {
    fontSize: 12,
    color: '#6A1B9A',
    marginLeft: 6,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
  },
});
