import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { villageGroupsAPI } from '../../services/api';

const ShowcaseScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showcase, setShowcase] = useState(null);

  useEffect(() => {
    loadShowcase();
  }, []);

  const loadShowcase = async () => {
    setLoading(true);
    try {
      const data = await villageGroupsAPI.getWeeklyShowcase(user.village_group_id);
      setShowcase(data);
    } catch (error) {
      console.error('Error loading showcase:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!showcase) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadShowcase} />}
    >
      <Text style={styles.title}>🏆 This Week's Champions</Text>

      {/* Top Contributors */}
      <Card style={styles.card}>
        <Card.Title title="Top Contributors" titleStyle={styles.cardTitle} />
        <Card.Content>
          {showcase.top_contributors?.map((farmer, index) => (
            <View key={index} style={styles.farmerItem}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <Avatar.Icon size={48} icon="account" />
              <View style={styles.farmerInfo}>
                <Text style={styles.farmerName}>{farmer.name}</Text>
                <Text style={styles.farmerStats}>
                  {farmer.posts} posts • {farmer.upvotes} upvotes
                </Text>
              </View>
              <MaterialCommunityIcons
                name="trophy"
                size={24}
                color={index === 0 ? theme.colors.accent : theme.colors.disabled}
              />
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Best Success Stories */}
      <Card style={styles.card}>
        <Card.Title title="Best Success Stories" titleStyle={styles.cardTitle} />
        <Card.Content>
          {showcase.best_stories?.map((story, index) => (
            <View key={index} style={styles.storyItem}>
              <Text style={styles.storyTitle}>{story.title}</Text>
              <Text style={styles.storyAuthor}>by {story.author}</Text>
              <Text style={styles.storyPreview} numberOfLines={2}>{story.content}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: spacing.md },
  title: { ...typography.h2, fontWeight: 'bold', marginBottom: spacing.lg, textAlign: 'center' },
  card: { marginBottom: spacing.md, elevation: 2 },
  cardTitle: { ...typography.h3, fontWeight: 'bold' },
  farmerItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  rankText: { ...typography.caption, color: '#fff', fontWeight: 'bold' },
  farmerInfo: { flex: 1, marginLeft: spacing.md },
  farmerName: { ...typography.body, fontWeight: 'bold' },
  farmerStats: { ...typography.caption, color: theme.colors.placeholder, marginTop: spacing.xs },
  storyItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  storyTitle: { ...typography.body, fontWeight: 'bold', marginBottom: spacing.xs },
  storyAuthor: { ...typography.caption, color: theme.colors.placeholder, marginBottom: spacing.sm },
  storyPreview: { ...typography.caption, color: theme.colors.text },
});

export default ShowcaseScreen;
