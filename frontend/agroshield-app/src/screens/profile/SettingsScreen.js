import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Switch, List, Divider, RadioButton } from 'react-native-paper';
import { theme, spacing, typography } from '../../theme/theme';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    pushNotifications: true,
    smsNotifications: false,
    weatherAlerts: true,
    campaignAlerts: true,
    groupActivity: true,
    expertResponses: true,
    language: 'english',
    units: 'metric',
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Title title="Notifications" titleStyle={styles.cardTitle} />
        <Card.Content>
          <List.Item
            title="Push Notifications"
            description="Receive in-app notifications"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={settings.pushNotifications}
                onValueChange={(val) => updateSetting('pushNotifications', val)}
              />
            )}
          />
          <Divider />
          <List.Item
            title="SMS Notifications"
            description="Receive SMS alerts"
            left={(props) => <List.Icon {...props} icon="message-text" />}
            right={() => (
              <Switch
                value={settings.smsNotifications}
                onValueChange={(val) => updateSetting('smsNotifications', val)}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Weather Alerts"
            description="Get weather warnings"
            left={(props) => <List.Icon {...props} icon="weather-cloudy-alert" />}
            right={() => (
              <Switch
                value={settings.weatherAlerts}
                onValueChange={(val) => updateSetting('weatherAlerts', val)}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Campaign Alerts"
            description="New campaign notifications"
            left={(props) => <List.Icon {...props} icon="bullhorn" />}
            right={() => (
              <Switch
                value={settings.campaignAlerts}
                onValueChange={(val) => updateSetting('campaignAlerts', val)}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Group Activity"
            description="Posts and replies from your group"
            left={(props) => <List.Icon {...props} icon="account-group" />}
            right={() => (
              <Switch
                value={settings.groupActivity}
                onValueChange={(val) => updateSetting('groupActivity', val)}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Expert Responses"
            description="When experts reply to your requests"
            left={(props) => <List.Icon {...props} icon="account-tie" />}
            right={() => (
              <Switch
                value={settings.expertResponses}
                onValueChange={(val) => updateSetting('expertResponses', val)}
              />
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Language" titleStyle={styles.cardTitle} />
        <Card.Content>
          <RadioButton.Group
            onValueChange={(val) => updateSetting('language', val)}
            value={settings.language}
          >
            <RadioButton.Item label="English" value="english" />
            <RadioButton.Item label="Kiswahili" value="kiswahili" />
            <RadioButton.Item label="Kikuyu" value="kikuyu" />
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Units" titleStyle={styles.cardTitle} />
        <Card.Content>
          <RadioButton.Group
            onValueChange={(val) => updateSetting('units', val)}
            value={settings.units}
          >
            <RadioButton.Item label="Metric (ha, kg, °C)" value="metric" />
            <RadioButton.Item label="Imperial (acres, lbs, °F)" value="imperial" />
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="About" titleStyle={styles.cardTitle} />
        <Card.Content>
          <List.Item
            title="App Version"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <Divider />
          <List.Item
            title="Terms of Service"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Privacy Policy"
            left={(props) => <List.Icon {...props} icon="shield-lock" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
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
  card: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  cardTitle: {
    ...typography.h3,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
