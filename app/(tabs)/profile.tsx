
import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  TextInput, 
  Pressable,
  Alert,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { getFTPService, FTPConfig } from "@/services/FTPService";

export default function ProfileScreen() {
  const theme = useTheme();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);
  
  const [ftpConfig, setFtpConfig] = useState<FTPConfig>({
    host: 'ftp.example.com',
    port: '21',
    username: 'user',
    password: 'password',
    filename: 'data.xls',
  });

  useEffect(() => {
    // Load current FTP configuration
    const currentConfig = getFTPService().getConfig();
    setFtpConfig(currentConfig);
  }, []);

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      
      // Validate configuration
      if (!ftpConfig.host.trim()) {
        Alert.alert('Validation Error', 'FTP host is required');
        return;
      }
      
      if (!ftpConfig.username.trim()) {
        Alert.alert('Validation Error', 'Username is required');
        return;
      }
      
      if (!ftpConfig.filename.trim()) {
        Alert.alert('Validation Error', 'Filename is required');
        return;
      }

      const port = parseInt(ftpConfig.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        Alert.alert('Validation Error', 'Port must be a valid number between 1 and 65535');
        return;
      }

      // Update FTP service configuration
      const ftpService = getFTPService();
      ftpService.updateConfig(ftpConfig);
      
      console.log('FTP configuration saved:', ftpConfig);
      Alert.alert('Success', 'FTP configuration saved successfully!');
      
      // Reset connection status since config changed
      setConnectionStatus('unknown');
      setLastTestResult(null);
      
    } catch (error) {
      console.error('Error saving FTP configuration:', error);
      Alert.alert('Error', 'Failed to save FTP configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      setConnectionStatus('unknown');
      setLastTestResult(null);
      
      console.log('Testing FTP connection with config:', ftpConfig);
      
      // Create temporary FTP service with current config for testing
      const ftpService = getFTPService(ftpConfig);
      const isConnected = await ftpService.testConnection();
      
      if (isConnected) {
        setConnectionStatus('success');
        setLastTestResult('Connection successful! FTP server is reachable.');
        Alert.alert('Success', 'FTP connection test successful!');
      } else {
        setConnectionStatus('error');
        setLastTestResult('Connection failed. Please check your FTP settings.');
        Alert.alert('Connection Failed', 'Could not connect to FTP server. Please verify your settings.');
      }
      
    } catch (error) {
      console.error('FTP connection test error:', error);
      setConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastTestResult(`Connection error: ${errorMessage}`);
      Alert.alert('Connection Error', `Failed to test FTP connection: ${errorMessage}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleListFiles = async () => {
    try {
      console.log('Listing files on FTP server...');
      
      const ftpService = getFTPService(ftpConfig);
      const files = await ftpService.listFiles('/');
      
      if (files.length > 0) {
        const fileList = files.join('\n');
        Alert.alert('FTP Files', `Files found on server:\n\n${fileList}`);
      } else {
        Alert.alert('No Files', 'No files found on the FTP server root directory.');
      }
      
    } catch (error) {
      console.error('Error listing FTP files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to list files: ${errorMessage}`);
    }
  };

  const updateConfigField = (field: keyof FTPConfig, value: string) => {
    setFtpConfig(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset connection status when config changes
    if (connectionStatus !== 'unknown') {
      setConnectionStatus('unknown');
      setLastTestResult(null);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'success': return colors.success || '#4CAF50';
      case 'error': return colors.error || '#F44336';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'success': return 'checkmark.circle';
      case 'error': return 'xmark.circle';
      default: return 'questionmark.circle';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <IconSymbol name="gear" size={32} color={colors.primary} />
          <Text style={styles.title}>FTP Configuration</Text>
          <Text style={styles.subtitle}>
            Configure your FTP server settings for data synchronization
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Settings</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FTP Host *</Text>
            <TextInput
              style={styles.input}
              value={ftpConfig.host}
              onChangeText={(value) => updateConfigField('host', value)}
              placeholder="ftp.example.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Port *</Text>
            <TextInput
              style={styles.input}
              value={ftpConfig.port}
              onChangeText={(value) => updateConfigField('port', value)}
              placeholder="21"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              value={ftpConfig.username}
              onChangeText={(value) => updateConfigField('username', value)}
              placeholder="your-username"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              value={ftpConfig.password}
              onChangeText={(value) => updateConfigField('password', value)}
              placeholder="your-password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>File Name *</Text>
            <TextInput
              style={styles.input}
              value={ftpConfig.filename}
              onChangeText={(value) => updateConfigField('filename', value)}
              placeholder="data.xls"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helpText}>
              The Excel file to download from the FTP server
            </Text>
          </View>
        </View>

        {lastTestResult && (
          <View style={[styles.statusCard, { borderLeftColor: getStatusColor() }]}>
            <View style={styles.statusHeader}>
              <IconSymbol 
                name={getStatusIcon()} 
                size={20} 
                color={getStatusColor()} 
              />
              <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
                Connection Test Result
              </Text>
            </View>
            <Text style={styles.statusMessage}>{lastTestResult}</Text>
          </View>
        )}

        <View style={styles.buttonSection}>
          <Pressable
            style={[styles.button, styles.testButton]}
            onPress={handleTestConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? (
              <ActivityIndicator color={colors.card} size="small" />
            ) : (
              <IconSymbol name="network" color={colors.card} size={20} />
            )}
            <Text style={styles.buttonText}>
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.listButton]}
            onPress={handleListFiles}
            disabled={isTestingConnection}
          >
            <IconSymbol name="list.bullet" color={colors.card} size={20} />
            <Text style={styles.buttonText}>List Files</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveConfig}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.card} size="small" />
            ) : (
              <IconSymbol name="checkmark" color={colors.card} size={20} />
            )}
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About FTP Integration</Text>
          <Text style={styles.infoText}>
            This app uses the react-native-ftp library to connect to your FTP server and download Excel files for data visualization.
          </Text>
          <Text style={styles.infoText}>
            • Supports standard FTP protocol
          </Text>
          <Text style={styles.infoText}>
            • Automatically downloads and parses Excel/CSV files
          </Text>
          <Text style={styles.infoText}>
            • Real-time data synchronization with auto-refresh
          </Text>
          <Text style={styles.infoText}>
            • Secure credential storage
          </Text>
        </View>

        <View style={styles.warningSection}>
          <IconSymbol name="exclamationmark.triangle" color={colors.warning || '#FF9800'} size={20} />
          <Text style={styles.warningText}>
            Make sure your FTP server is accessible and the specified file exists. 
            Test the connection before saving to ensure proper configuration.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra space for floating tab bar
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  buttonSection: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  testButton: {
    backgroundColor: colors.textSecondary,
  },
  listButton: {
    backgroundColor: colors.warning || '#FF9800',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  warningSection: {
    flexDirection: 'row',
    backgroundColor: colors.warning ? `${colors.warning}20` : '#FF980020',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: 14,
    color: colors.warning || '#FF9800',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});
