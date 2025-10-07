
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface LoadingScreenProps {
  message?: string;
  showIcon?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  showIcon = true 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.loadingCard}>
        {showIcon && (
          <IconSymbol name="arrow.down.circle" size={48} color={colors.primary} />
        )}
        <ActivityIndicator 
          size="large" 
          color={colors.primary} 
          style={styles.spinner}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  spinner: {
    marginVertical: 16,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LoadingScreen;
