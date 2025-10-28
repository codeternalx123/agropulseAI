import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Text, Card, Button, TextInput, IconButton, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { villageGroupsAPI } from '../../services/api';

const PostDetailScreen = ({ route, navigation }) => {
  const { post } = route.params;
  const { user } = useAuth();
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState(post.replies || []);
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState(null);

  const handleUpvote = async () => {
    if (post.has_upvoted) return;
    
    try {
      await villageGroupsAPI.upvotePost(post.id, user.id);
      post.upvotes += 1;
      post.has_upvoted = true;
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const handleAddReply = async () => {
    if (!replyText.trim()) return;

    setLoading(true);
    try {
      const newReply = await villageGroupsAPI.addReply(post.id, {
        farmer_id: user.id,
        reply_text: replyText.trim(),
      });

      setReplies([...replies, newReply]);
      setReplyText('');
      Alert.alert('Success', 'Reply added!');
    } catch (error) {
      console.error('Error adding reply:', error);
      Alert.alert('Error', 'Failed to add reply');
    } finally {
      setLoading(false);
    }
  };

  const playVoiceNote = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: post.media_url },
        { shouldPlay: true }
      );

      setSound(newSound);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play voice note');
    }
  };

  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Post Card */}
        <Card style={styles.postCard}>
          <Card.Content>
            {/* Author */}
            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                <MaterialCommunityIcons
                  name="account"
                  size={32}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.authorInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.authorName}>{post.author_name}</Text>
                  {post.author_is_expert && (
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={20}
                      color={theme.colors.success}
                      style={styles.expertBadge}
                    />
                  )}
                </View>
                <Text style={styles.timestamp}>
                  {new Date(post.created_at).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Post Type Badge */}
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: getPostTypeColor(post.post_type) + '30' },
              ]}
            >
              <Text
                style={[styles.typeText, { color: getPostTypeColor(post.post_type) }]}
              >
                {post.post_type.replace('_', ' ').toUpperCase()}
              </Text>
            </View>

            {/* Content */}
            <Text style={styles.content}>{post.content}</Text>

            {/* Media */}
            {post.media_url && post.media_type === 'photo' && (
              <Image source={{ uri: post.media_url }} style={styles.photo} />
            )}

            {post.media_url && post.media_type === 'voice' && (
              <TouchableOpacity style={styles.voiceNote} onPress={playVoiceNote}>
                <MaterialCommunityIcons
                  name="play-circle"
                  size={40}
                  color={theme.colors.primary}
                />
                <Text style={styles.voiceLabel}>Play Voice Note</Text>
              </TouchableOpacity>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statButton} onPress={handleUpvote}>
                <MaterialCommunityIcons
                  name={post.has_upvoted ? 'arrow-up-bold' : 'arrow-up-bold-outline'}
                  size={24}
                  color={post.has_upvoted ? theme.colors.primary : theme.colors.disabled}
                />
                <Text style={styles.statText}>{post.upvotes}</Text>
              </TouchableOpacity>
              <View style={styles.statButton}>
                <MaterialCommunityIcons
                  name="comment"
                  size={24}
                  color={theme.colors.disabled}
                />
                <Text style={styles.statText}>{replies.length}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Replies Section */}
        <View style={styles.repliesSection}>
          <Text style={styles.repliesTitle}>
            Replies ({replies.length})
          </Text>

          {replies.map((reply, index) => (
            <View key={index} style={styles.replyItem}>
              <View style={styles.replyAvatar}>
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.replyContent}>
                <View style={styles.replyHeader}>
                  <Text style={styles.replyAuthor}>{reply.farmer_name}</Text>
                  <Text style={styles.replyTime}>
                    {new Date(reply.reply_date).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.replyText}>{reply.reply_text}</Text>
              </View>
            </View>
          ))}

          {replies.length === 0 && (
            <View style={styles.emptyReplies}>
              <Text style={styles.emptyText}>No replies yet. Be the first!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Reply Input */}
      <View style={styles.replyInputContainer}>
        <TextInput
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Write a reply..."
          mode="outlined"
          style={styles.replyInput}
          multiline
        />
        <IconButton
          icon="send"
          size={28}
          iconColor={theme.colors.primary}
          onPress={handleAddReply}
          disabled={loading || !replyText.trim()}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  postCard: {
    elevation: 2,
    marginBottom: spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    ...typography.h3,
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
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  typeText: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  content: {
    ...typography.body,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  voiceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  voiceLabel: {
    ...typography.body,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: spacing.md,
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xl,
  },
  statText: {
    ...typography.body,
    color: theme.colors.text,
    marginLeft: spacing.sm,
  },
  repliesSection: {
    marginBottom: spacing.xl,
  },
  repliesTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  replyAuthor: {
    ...typography.caption,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  replyTime: {
    ...typography.caption,
    color: theme.colors.placeholder,
  },
  replyText: {
    ...typography.body,
    color: theme.colors.text,
    lineHeight: 20,
  },
  emptyReplies: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.placeholder,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  replyInput: {
    flex: 1,
    marginRight: spacing.sm,
  },
});

export default PostDetailScreen;
