import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Chip, DataTable, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, spacing, typography } from '../theme/theme';
import { subscriptionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext.js';

const TransactionsScreen = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await subscriptionAPI.getTransactions(user.id);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return theme.colors.success;
      case 'PENDING':
        return theme.colors.accent;
      case 'FAILED':
        return theme.colors.error;
      default:
        return theme.colors.placeholder;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadTransactions} />
      }
    >
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="receipt" size={32} color={theme.colors.primary} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Transaction History</Text>
              <Text style={styles.headerSubtitle}>
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {transactions.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons
              name="cash-remove"
              size={64}
              color={theme.colors.disabled}
            />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Your payment history will appear here
            </Text>
          </Card.Content>
        </Card>
      ) : (
        transactions.map((transaction, index) => (
          <Card key={index} style={styles.transactionCard}>
            <Card.Content>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionType}>
                    {transaction.type || 'Subscription'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.timestamp)}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={styles.amountText}>KES {transaction.amount}</Text>
                  <Chip
                    mode="flat"
                    textStyle={[
                      styles.statusChip,
                      { color: getStatusColor(transaction.status) },
                    ]}
                    style={{ backgroundColor: getStatusColor(transaction.status) + '20' }}
                  >
                    {transaction.status}
                  </Chip>
                </View>
              </View>

              {transaction.mpesa_receipt && (
                <View style={styles.receiptRow}>
                  <MaterialCommunityIcons
                    name="checkbox-marked-circle"
                    size={16}
                    color={theme.colors.success}
                  />
                  <Text style={styles.receiptText}>
                    Receipt: {transaction.mpesa_receipt}
                  </Text>
                </View>
              )}

              {transaction.phone_number && (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="phone" size={16} color={theme.colors.placeholder} />
                  <Text style={styles.detailText}>{transaction.phone_number}</Text>
                </View>
              )}

              {transaction.description && (
                <Text style={styles.descriptionText}>{transaction.description}</Text>
              )}
            </Card.Content>
          </Card>
        ))
      )}
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
  headerCard: {
    marginBottom: spacing.md,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    ...typography.body,
    color: theme.colors.placeholder,
  },
  emptyCard: {
    marginTop: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.placeholder,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: theme.colors.placeholder,
    marginTop: spacing.sm,
  },
  transactionCard: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    ...typography.h4,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  transactionDate: {
    ...typography.caption,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    ...typography.h3,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  statusChip: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: theme.colors.success + '10',
    borderRadius: 4,
  },
  receiptText: {
    ...typography.caption,
    color: theme.colors.success,
    marginLeft: spacing.xs,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  detailText: {
    ...typography.body,
    color: theme.colors.placeholder,
    marginLeft: spacing.xs,
  },
  descriptionText: {
    ...typography.body,
    color: theme.colors.text,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

export default TransactionsScreen;
