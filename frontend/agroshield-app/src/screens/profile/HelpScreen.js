import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Card, List, Divider, Button, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../../theme/theme';

const HelpScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I register my farm?',
      answer: 'Go to the Farms tab, tap "Add Farm", fill in your farm details, capture GPS location, and optionally take soil photos for AI analysis.',
    },
    {
      id: 2,
      question: 'How does the pest detection work?',
      answer: 'Take a clear photo of the affected plant, add symptoms if any, and our AI will identify the pest or disease and provide treatment recommendations.',
    },
    {
      id: 3,
      question: 'What is a Village Group?',
      answer: 'Village Groups are community-based farming networks where farmers can share tips, ask questions, and learn from each other\'s experiences.',
    },
    {
      id: 4,
      question: 'How do I register for a campaign?',
      answer: 'Browse campaigns in the Campaigns tab, select one that matches your needs, and tap "Register for Campaign".',
    },
    {
      id: 5,
      question: 'How do I get expert help?',
      answer: 'Go to Campaigns > Expert Help, describe your problem, add photos if needed, and submit. An agricultural expert will respond within 24-48 hours.',
    },
    {
      id: 6,
      question: 'What is the farming calendar?',
      answer: 'The AI-powered calendar generates personalized farming schedules based on your location, soil type, crop, and weather forecasts.',
    },
    {
      id: 7,
      question: 'How accurate is the soil analysis?',
      answer: 'Our AI soil analysis uses computer vision to estimate soil texture and nutrients with 85-90% accuracy. For precise results, consider lab testing.',
    },
    {
      id: 8,
      question: 'Can I use the app offline?',
      answer: 'Some features like viewing saved data work offline, but most features (AI analysis, posts, campaigns) require internet connection.',
    },
  ];

  const filteredFaqs = searchQuery
    ? faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Searchbar
        placeholder="Search help articles..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <Card style={styles.card}>
        <Card.Title title="Frequently Asked Questions" titleStyle={styles.cardTitle} />
        <Card.Content>
          {filteredFaqs.map((faq) => (
            <View key={faq.id}>
              <List.Accordion
                title={faq.question}
                expanded={expandedId === faq.id}
                onPress={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                left={(props) => <List.Icon {...props} icon="help-circle" />}
              >
                <View style={styles.answerContainer}>
                  <Text style={styles.answer}>{faq.answer}</Text>
                </View>
              </List.Accordion>
              <Divider />
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Contact Support" titleStyle={styles.cardTitle} />
        <Card.Content>
          <List.Item
            title="Email Support"
            description="support@agropulseai.com"
            left={(props) => <List.Icon {...props} icon="email" />}
            onPress={() => Linking.openURL('mailto:support@agropulseai.com')}
          />
          <Divider />
          <List.Item
            title="WhatsApp"
            description="+254 700 000000"
            left={(props) => <List.Icon {...props} icon="whatsapp" />}
            onPress={() => Linking.openURL('https://wa.me/254700000000')}
          />
          <Divider />
          <List.Item
            title="Call Us"
            description="+254 700 000000"
            left={(props) => <List.Icon {...props} icon="phone" />}
            onPress={() => Linking.openURL('tel:+254700000000')}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Quick Guides" titleStyle={styles.cardTitle} />
        <Card.Content>
          <Button
            mode="outlined"
            icon="book-open"
            onPress={() => {}}
            style={styles.guideButton}
          >
            Getting Started Guide
          </Button>
          <Button
            mode="outlined"
            icon="video"
            onPress={() => {}}
            style={styles.guideButton}
          >
            Video Tutorials
          </Button>
          <Button
            mode="outlined"
            icon="camera"
            onPress={() => {}}
            style={styles.guideButton}
          >
            How to Take Good Photos
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={styles.feedbackContainer}>
          <MaterialCommunityIcons
            name="message-alert"
            size={48}
            color={theme.colors.primary}
          />
          <Text style={styles.feedbackTitle}>Have feedback?</Text>
          <Text style={styles.feedbackText}>
            We'd love to hear from you! Help us improve Agropulse AI.
          </Text>
          <Button
            mode="contained"
            onPress={() => Linking.openURL('mailto:feedback@agropulseai.com')}
            style={styles.feedbackButton}
          >
            Send Feedback
          </Button>
        </Card.Content>
      </Card>
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
  searchbar: {
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  cardTitle: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  answerContainer: {
    padding: spacing.md,
    backgroundColor: theme.colors.background,
  },
  answer: {
    ...typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  guideButton: {
    marginBottom: spacing.sm,
  },
  feedbackContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  feedbackTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: spacing.md,
  },
  feedbackText: {
    ...typography.body,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  feedbackButton: {
    marginTop: spacing.sm,
  },
});

export default HelpScreen;
