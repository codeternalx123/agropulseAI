// Placeholder - Campaign registration confirmation screen
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { theme, spacing, typography } from '../../theme/theme';

const RegisterCampaignScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Campaign Registration Screen</Text>
      <Text style={styles.subtext}>Confirmation and details form</Text>
      <Button mode="contained" onPress={() => navigation.goBack()}>
        Go Back
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  text: { ...typography.h2, marginBottom: spacing.md },
  subtext: { ...typography.body, color: theme.colors.placeholder, marginBottom: spacing.lg },
});

export default RegisterCampaignScreen;
