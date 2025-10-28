import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Card, FAB, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CalendarStrip from 'react-native-calendar-strip';

import { theme, spacing, typography } from '../../theme/theme';
import { calendarAPI } from '../../services/api';

const CalendarScreen = ({ route, navigation }) => {
  const { field } = route.params;
  const [loading, setLoading] = useState(false);
  const [practices, setPractices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, overdue

  useEffect(() => {
    loadPractices();
  }, [filter]);

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = await calendarAPI.getPractices(field.id, filter);
      setPractices(data);
    } catch (error) {
      console.error('Error loading practices:', error);
      Alert.alert('Error', 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCalendar = async () => {
    Alert.alert(
      'Generate Calendar',
      'This will create an AI-powered farming calendar based on your field data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setLoading(true);
            try {
              await calendarAPI.generateCalendar(field.id);
              await loadPractices();
              Alert.alert('Success', 'Farming calendar generated!');
            } catch (error) {
              console.error('Error generating calendar:', error);
              Alert.alert('Error', 'Failed to generate calendar');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkDone = async (practice) => {
    Alert.alert(
      'Mark as Done',
      `Mark "${practice.practice_name}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Done',
          onPress: async () => {
            try {
              await calendarAPI.markPracticeDone(practice.id, '', []);
              await loadPractices();
              Alert.alert('Success', 'Practice marked as completed!');
            } catch (error) {
              console.error('Error marking practice:', error);
              Alert.alert('Error', 'Failed to mark practice');
            }
          },
        },
      ]
    );
  };

  const renderPractice = ({ item }) => {
    const practiceDate = new Date(item.recommended_date);
    const today = new Date();
    const isOverdue = practiceDate < today && item.status !== 'completed';
    const isToday = practiceDate.toDateString() === today.toDateString();

    return (
      <Card style={[styles.card, isOverdue && styles.overdueCard]}>
        <Card.Content>
          <View style={styles.practiceHeader}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{practiceDate.getDate()}</Text>
              <Text style={styles.dateMonth}>
                {practiceDate.toLocaleString('default', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.practiceInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.practiceName}>{item.practice_name}</Text>
                {isToday && <Chip style={styles.todayChip}>Today</Chip>}
                {isOverdue && <Chip style={styles.overdueChip}>Overdue</Chip>}
              </View>
              <Text style={styles.practiceDescription}>{item.description}</Text>
              <View style={styles.tagsRow}>
                <Chip style={styles.categoryChip} textStyle={styles.chipText}>
                  {item.category}
                </Chip>
                <Chip
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                  textStyle={styles.chipText}
                >
                  {item.status}
                </Chip>
              </View>
            </View>
            {item.status !== 'completed' && (
              <IconButton
                icon="check-circle"
                size={28}
                iconColor={theme.colors.success}
                onPress={() => handleMarkDone(item)}
              />
            )}
          </View>

          {item.notes && (
            <View style={styles.notesBox}>
              <MaterialCommunityIcons
                name="note-text"
                size={16}
                color={theme.colors.placeholder}
              />
              <Text style={styles.notes}>{item.notes}</Text>
            </View>
          )}

          {item.ai_adjusted && (
            <View style={styles.aiBox}>
              <MaterialCommunityIcons
                name="robot"
                size={16}
                color={theme.colors.info}
              />
              <Text style={styles.aiText}>AI-adjusted based on weather forecast</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return theme.colors.success + '30';
      case 'upcoming':
        return theme.colors.info + '30';
      case 'overdue':
        return theme.colors.error + '30';
      default:
        return theme.colors.disabled + '30';
    }
  };

  return (
    <View style={styles.container}>
      {/* Calendar Strip */}
      <CalendarStrip
        scrollable
        style={styles.calendarStrip}
        calendarColor={theme.colors.primary}
        calendarHeaderStyle={styles.calendarHeader}
        dateNumberStyle={styles.dateNumber}
        dateNameStyle={styles.dateName}
        highlightDateNumberStyle={styles.highlightDateNumber}
        highlightDateNameStyle={styles.highlightDateName}
        selectedDate={selectedDate}
        onDateSelected={(date) => setSelectedDate(date)}
        iconContainer={{ flex: 0.1 }}
      />

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.filterChip}
        >
          All
        </Chip>
        <Chip
          selected={filter === 'upcoming'}
          onPress={() => setFilter('upcoming')}
          style={styles.filterChip}
        >
          Upcoming
        </Chip>
        <Chip
          selected={filter === 'completed'}
          onPress={() => setFilter('completed')}
          style={styles.filterChip}
        >
          Completed
        </Chip>
        <Chip
          selected={filter === 'overdue'}
          onPress={() => setFilter('overdue')}
          style={styles.filterChip}
        >
          Overdue
        </Chip>
      </View>

      {/* Practices List */}
      <FlatList
        data={practices}
        renderItem={renderPractice}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPractices} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={80}
              color={theme.colors.disabled}
            />
            <Text style={styles.emptyText}>No practices scheduled</Text>
            <Text style={styles.emptySubtext}>
              Generate an AI-powered farming calendar to get started
            </Text>
          </View>
        }
      />

      <FAB
        icon="auto-fix"
        label="Generate Calendar"
        style={styles.fab}
        onPress={handleGenerateCalendar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  calendarStrip: {
    height: 100,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  calendarHeader: {
    color: '#fff',
  },
  dateNumber: {
    color: '#fff',
  },
  dateName: {
    color: '#fff',
  },
  highlightDateNumber: {
    color: theme.colors.primary,
  },
  highlightDateName: {
    color: theme.colors.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
  },
  filterChip: {
    marginRight: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  practiceHeader: {
    flexDirection: 'row',
  },
  dateBox: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 8,
    marginRight: spacing.md,
  },
  dateDay: {
    ...typography.h2,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  dateMonth: {
    ...typography.caption,
    color: theme.colors.primary,
  },
  practiceInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  practiceName: {
    ...typography.body,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  todayChip: {
    backgroundColor: theme.colors.info + '30',
    marginLeft: spacing.sm,
  },
  overdueChip: {
    backgroundColor: theme.colors.error + '30',
    marginLeft: spacing.sm,
  },
  practiceDescription: {
    ...typography.caption,
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: theme.colors.secondary + '30',
    marginRight: spacing.sm,
  },
  statusChip: {
    marginRight: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    fontSize: 10,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.background,
    padding: spacing.sm,
    borderRadius: 4,
    marginTop: spacing.sm,
  },
  notes: {
    ...typography.caption,
    color: theme.colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  aiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.info + '20',
    padding: spacing.sm,
    borderRadius: 4,
    marginTop: spacing.sm,
  },
  aiText: {
    ...typography.caption,
    color: theme.colors.info,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.disabled,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: theme.colors.primary,
  },
});

export default CalendarScreen;
