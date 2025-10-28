import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, FAB, Chip, IconButton, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { villageGroupsAPI } from '../../services/api';

const GroupFeedScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (user.village_group_id) {
      loadFeed();
    }
  }, [filter]);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await villageGroupsAPI.getGroupFeed(user.village_group_id, {
        post_type: filter === 'all' ? null : filter,
      });
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (postId) => {
    try {
      await villageGroupsAPI.upvotePost(postId, user.id);
      // Update post upvotes locally
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, upvotes: post.upvotes + 1, has_upvoted: true }
            : post
        )
      );
    } catch (error) {
      console.error('Error upvoting post:', error);
    }
  };

  const getPostTypeIcon = (type) => {
    switch (type) {
      case 'farming_tip':
        return 'lightbulb';
      case 'question':
        return 'help-circle';
      case 'problem':
        return 'alert-circle';
      case 'success_story':
        return 'trophy';
      default:
        return 'text';
    }
  };

  const getPostTypeColor = (type) => {
    switch (type) {
      case 'farming_tip':
        return theme.colors.success;
      case 'question':
        return theme.colors.info;
      case 'problem':
        return theme.colors.error;
      case 'success_story':
        return theme.colors.accent;
      default:
        return theme.colors.text;
    }
  };

  const renderPost = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('PostDetail', { post: item })}
    >
      <Card style={styles.card}>
        <Card.Content>
          {/* Post Header */}
          <View style={styles.postHeader}>
            <View style={styles.authorInfo}>
              <View style={styles.avatar}>
                <MaterialCommunityIcons
                  name="account"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <View>
                <View style={styles.nameRow}>
                  <Text style={styles.authorName}>{item.author_name}</Text>
                  {item.author_is_expert && (
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={16}
                      color={theme.colors.success}
                      style={styles.expertBadge}
                    />
                  )}
                </View>
                <Text style={styles.timestamp}>
                  {formatTimestamp(item.created_at)}
                </Text>
              </View>
            </View>
            <Chip
              style={[
                styles.typeChip,
                { backgroundColor: getPostTypeColor(item.post_type) + '30' },
              ]}
              textStyle={[styles.typeText, { color: getPostTypeColor(item.post_type) }]}
              icon={getPostTypeIcon(item.post_type)}
            >
              {item.post_type.replace('_', ' ')}
            </Chip>
          </View>

          {/* Post Content */}
          <Text style={styles.content} numberOfLines={4}>
            {item.content}
          </Text>

          {/* Media Preview */}
          {item.media_url && (
            <View style={styles.mediaContainer}>
              <MaterialCommunityIcons
                name={item.media_type === 'voice' ? 'microphone' : 'image'}
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.mediaLabel}>
                {item.media_type === 'voice' ? 'Voice Note' : 'Photo'}
              </Text>
            </View>
          )}

          {/* Post Footer */}
          <View style={styles.postFooter}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="arrow-up-bold"
                  size={16}
                  color={theme.colors.placeholder}
                />
                <Text style={styles.statText}>{item.upvotes}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons
                  name="comment"
                  size={16}
                  color={theme.colors.placeholder}
                />
                <Text style={styles.statText}>{item.reply_count}</Text>
              </View>
            </View>
            <IconButton
              icon={item.has_upvoted ? 'arrow-up-bold' : 'arrow-up-bold-outline'}
              size={20}
              iconColor={item.has_upvoted ? theme.colors.primary : theme.colors.disabled}
              onPress={() => !item.has_upvoted && handleUpvote(item.id)}
            />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user.village_group_id) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="account-group"
          size={80}
          color={theme.colors.disabled}
        />
        <Text style={styles.emptyTitle}>Not in a Village Group</Text>
        <Text style={styles.emptyText}>
          You need to be registered in a village group to see posts
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Header */}
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.filterChip}
        >
          All
        </Chip>
        <Chip
          selected={filter === 'farming_tip'}
          onPress={() => setFilter('farming_tip')}
          style={styles.filterChip}
          icon="lightbulb"
        >
          Tips
        </Chip>
        <Chip
          selected={filter === 'question'}
          onPress={() => setFilter('question')}
          style={styles.filterChip}
          icon="help-circle"
        >
          Questions
        </Chip>
        <Chip
          selected={filter === 'problem'}
          onPress={() => setFilter('problem')}
          style={styles.filterChip}
          icon="alert-circle"
        >
          Problems
        </Chip>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Polls')}
        >
          <MaterialCommunityIcons name="poll" size={24} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Polls</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Showcase')}
        >
          <MaterialCommunityIcons name="trophy" size={24} color={theme.colors.accent} />
          <Text style={styles.quickActionText}>Showcase</Text>
        </TouchableOpacity>
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFeed} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="post"
              size={80}
              color={theme.colors.disabled}
            />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label="New Post"
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  filterChip: {
    marginRight: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionText: {
    ...typography.caption,
    color: theme.colors.text,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  expertBadge: {
    marginLeft: spacing.xs,
  },
  timestamp: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
  },
  typeChip: {
    paddingHorizontal: spacing.sm,
  },
  typeText: {
    ...typography.caption,
    fontWeight: 'bold',
    fontSize: 10,
  },
  content: {
    ...typography.body,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: spacing.sm,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  mediaLabel: {
    ...typography.caption,
    color: theme.colors.text,
    marginLeft: spacing.sm,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  statText: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.disabled,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: theme.colors.primary,
  },
});

export default GroupFeedScreen;
