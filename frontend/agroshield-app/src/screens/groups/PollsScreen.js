import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Button, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext.js';
import { villageGroupsAPI } from '../../services/api';

const PollsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    setLoading(true);
    try {
      const data = await villageGroupsAPI.getPolls(user.village_group_id);
      setPolls(data);
    } catch (error) {
      console.error('Error loading polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId, option) => {
    try {
      await villageGroupsAPI.voteOnPoll(pollId, user.id, option);
      await loadPolls();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const renderPoll = ({ item }) => {
    const totalVotes = item.options.reduce((sum, opt) => sum + opt.votes, 0);
    const hasVoted = item.has_voted;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.pollHeader}>
            <MaterialCommunityIcons name="poll" size={24} color={theme.colors.primary} />
            <Text style={styles.pollQuestion}>{item.question}</Text>
          </View>
          
          <Text style={styles.voteCount}>{totalVotes} votes</Text>

          {item.options.map((option, index) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            
            return (
              <View key={index} style={styles.optionContainer}>
                {hasVoted ? (
                  <View style={styles.resultContainer}>
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionText}>{option.option_text}</Text>
                      <Text style={styles.percentageText}>{percentage.toFixed(0)}%</Text>
                    </View>
                    <ProgressBar progress={percentage / 100} color={theme.colors.primary} />
                  </View>
                ) : (
                  <Button
                    mode="outlined"
                    onPress={() => handleVote(item.id, option.option_text)}
                    style={styles.optionButton}
                  >
                    {option.option_text}
                  </Button>
                )}
              </View>
            );
          })}

          <Text style={styles.pollDate}>
            Ends: {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={polls}
        renderItem={renderPoll}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPolls} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="poll" size={80} color={theme.colors.disabled} />
            <Text style={styles.emptyText}>No active polls</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: spacing.md },
  card: { marginBottom: spacing.md, elevation: 2 },
  pollHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  pollQuestion: { ...typography.h3, fontWeight: 'bold', marginLeft: spacing.sm, flex: 1 },
  voteCount: { ...typography.caption, color: theme.colors.placeholder, marginBottom: spacing.md },
  optionContainer: { marginBottom: spacing.sm },
  resultContainer: { marginBottom: spacing.sm },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  optionText: { ...typography.body, color: theme.colors.text },
  percentageText: { ...typography.body, fontWeight: 'bold', color: theme.colors.primary },
  optionButton: { marginBottom: spacing.xs },
  pollDate: { ...typography.caption, color: theme.colors.placeholder, marginTop: spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.body, color: theme.colors.disabled, marginTop: spacing.md },
});

export default PollsScreen;
