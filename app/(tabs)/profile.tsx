import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  TextInput, 
  Pressable,
  Alert 
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/styles/commonStyles";

export default function ProfileScreen() {
  const theme = useTheme();
  const [ftpConfig, setFtpConfig] = useState({
    host: 'ftp.example.com',
    port: '21',
    username: 'user',
    password: 'password',
    filename: 'data.xls',
    autoRefresh: true,
    refreshInterval: '30', // seconds
  });

  const handleSaveConfig = () => {
    Alert.alert(
      'Configuration Saved',
      'FTP settings have been saved successfully!',
      [{ text: 'OK' }]
    );
  };

  const handleTestConnection = () => {
    Alert.alert(
      'Testing Connection',
      'This would test the FTP connection with the provided settings.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS !== 'ios' && styles.scrollContentWithTabBar
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <IconSymbol name="server.rack" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>FTP Configuration</Text>
          <Text style={styles.subtitle}>Configure your FTP server settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Settings</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>FTP Host</Text>
            <TextInput
              style={styles.textInput}
              value={ftpConfig.host}
              onChangeText={(text) => setFtpConfig(prev => ({ ...prev, host: text }))}
              placeholder="ftp.example.com"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Port</Text>
            <TextInput
              style={styles.textInput}
              value={ftpConfig.port}
              onChangeText={(text) => setFtpConfig(prev => ({ ...prev, port: text }))}
              placeholder="21"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={ftpConfig.username}
              onChangeText={(text) => setFtpConfig(prev => ({ ...prev, username: text }))}
              placeholder="username"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={ftpConfig.password}
              onChangeText={(text) => setFtpConfig(prev => ({ ...prev, password: text }))}
              placeholder="password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>XLS Filename</Text>
            <TextInput
              style={styles.textInput}
              value={ftpConfig.filename}
              onChangeText={(text) => setFtpConfig(prev => ({ ...prev, filename: text }))}
              placeholder="data.xls"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto-Refresh Settings</Text>
          
          <Pressable
            style={styles.toggleItem}
            onPress={() => setFtpConfig(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
          >
            <View style={styles.toggleContent}>
              <IconSymbol name="arrow.clockwise" size={24} color={colors.primary} />
              <Text style={styles.toggleText}>Auto-refresh data</Text>
            </View>
            <View style={[
              styles.toggle,
              ftpConfig.autoRefresh && styles.toggleActive
            ]}>
              <View style={[
                styles.toggleThumb,
                ftpConfig.autoRefresh && styles.toggleThumbActive
              ]} />
            </View>
          </Pressable>

          {ftpConfig.autoRefresh && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Refresh Interval (seconds)</Text>
              <TextInput
                style={styles.textInput}
                value={ftpConfig.refreshInterval}
                onChangeText={(text) => setFtpConfig(prev => ({ ...prev, refreshInterval: text }))}
                placeholder="30"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.testButton} onPress={handleTestConnection}>
            <IconSymbol name="wifi" size={20} color={colors.card} />
            <Text style={styles.testButtonText}>Test Connection</Text>
          </Pressable>

          <Pressable style={styles.saveButton} onPress={handleSaveConfig}>
            <IconSymbol name="checkmark" size={20} color={colors.card} />
            <Text style={styles.saveButtonText}>Save Configuration</Text>
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About</Text>
          <Text style={styles.infoText}>
            This app automatically downloads XLS files from your FTP server and displays the data in interactive charts. 
            Configure your FTP settings above and the app will handle the rest.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100, // Extra padding for floating tab bar
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.textSecondary,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  testButton: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
