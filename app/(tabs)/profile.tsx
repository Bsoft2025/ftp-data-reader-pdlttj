
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
import { logger } from "@/services/Logger";
import { secureStorage } from "@/services/SecureStorage";
import { config } from "@/config/environment";

export default function ProfileScreen() {
  const theme = useTheme();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);
  const [connectionMetrics, setConnectionMetrics] = useState<any[]>([]);
  
  const [ftpConfig, setFtpConfig] = useState<FTPConfig>({
    host: config.ftp.defaultHost,
    port: config.ftp.defaultPort,
    username: '',
    password: '',
    filename: 'data.xls',
  });

  useEffect(() => {
    loadSavedConfiguration();
  }, []);

  const loadSavedConfiguration = async () => {
    try {
      setIsLoading(true);
      logger.info('Loading saved FTP configuration', {}, 'ProfileScreen');
      
      const ftpService = getFTPService();
      const savedConfig = await ftpService.loadCredentials();
      
      if (savedConfig) {
        setFtpConfig(savedConfig);
        logger.info('FTP configuration loaded successfully', { host: savedConfig.host }, 'ProfileScreen');
      } else {
        logger.info('No saved FTP configuration found, using defaults', {}, 'ProfileScreen');
      }
      
      // Load connection metrics
      const metrics = ftpService.getMetrics();
      setConnectionMetrics(metrics);
      
    } catch (error) {
      logger.error('Failed to load FTP configuration', { 
        error: error instanceof Error ? error.message : error 
      }, 'ProfileScreen');
      Alert.alert('Error', 'Failed to load saved configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const validateConfiguration = (): string | null => {
    if (!ftpConfig.host.trim()) {
      return 'FTP host is required';
    }
    
    if (!ftpConfig.username.trim()) {
      return 'Username is required';
    }
    
    if (!ftpConfig.password.trim()) {
      return 'Password is required';
    }
    
    if (!ftpConfig.filename.trim()) {
      return 'Filename is required';
    }

    const port = parseInt(ftpConfig.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      return 'Port must be a valid number between 1 and 65535';
    }

    // Validate filename extension
    const extension = ftpConfig.filename.toLowerCase().split('.').pop();
    if (extension && !config.app.supportedFileTypes.includes(`.${extension}`)) {
      return `Unsupported file type. Supported types: ${config.app.supportedFileTypes.join(', ')}`;
    }

    return null;
  };

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      logger.info('Saving FTP configuration', { host: ftpConfig.host }, 'ProfileScreen');
      
      // Validate configuration
      const validationError = validateConfiguration();
      if (validationError) {
        Alert.alert('Validation Error', validationError);
        return;
      }

      // Update FTP service configuration
      const ftpService = getFTPService();
      ftpService.updateConfig(ftpConfig);
      
      // Save credentials securely
      await ftpService.saveCredentials();
      
      logger.info('FTP configuration saved successfully', { host: ftpConfig.host }, 'ProfileScreen');
      Alert.alert('Success', 'FTP configuration saved successfully!');
      
      // Reset connection status since config changed
      setConnectionStatus('unknown');
      setLastTestResult(null);
      
    } catch (error) {
      logger.error('Failed to save FTP configuration', { 
        error: error instanceof Error ? error.message : error 
      }, 'ProfileScreen');
      Alert.alert('Error', 'Failed to save FTP configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      setConnectionStatus('unknown');
      setLastTestResult(null);
      
      logger.info('Testing FTP connection', { host: ftpConfig.host }, 'ProfileScreen');
      
      // Validate configuration first
      const validationError = validateConfiguration();
      if (validationError) {
        Alert.alert('Validation Error', validationError);
        return;
      }
      
      // Create temporary FTP service with current config for testing
      const ftpService = getFTPService(ftpConfig);
      const startTime = Date.now();
      const isConnected = await ftpService.testConnection();
      const testTime = Date.now() - startTime;
      
      if (isConnected) {
        setConnectionStatus('success');
        setLastTestResult(`Connection successful! Server responded in ${testTime}ms.`);
        logger.info('FTP connection test successful', { host: ftpConfig.host, testTime }, 'ProfileScreen');
        Alert.alert('Success', 'FTP connection test successful!');
      } else {
        setConnectionStatus('error');
        setLastTestResult('Connection failed. Please check your FTP settings.');
        logger.warn('FTP connection test failed', { host: ftpConfig.host }, 'ProfileScreen');
        Alert.alert('Connection Failed', 'Could not connect to FTP server. Please verify your settings.');
      }
      
      // Update metrics
      const metrics = ftpService.getMetrics();
      setConnectionMetrics(metrics);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('FTP connection test error', { 
        error: errorMessage,
        host: ftpConfig.host 
      }, 'ProfileScreen');
      
      setConnectionStatus('error');
      setLastTestResult(`Connection error: ${errorMessage}`);
      Alert.alert('Connection Error', `Failed to test FTP connection: ${errorMessage}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleListFiles = async () => {
    try {
      logger.info('Listing files on FTP server', { host: ftpConfig.host }, 'ProfileScreen');
      
      const validationError = validateConfiguration();
      if (validationError) {
        Alert.alert('Validation Error', validationError);
        return;
      }
      
      const ftpService = getFTPService(ftpConfig);
      const files = await ftpService.listFiles('/');
      
      if (files.length > 0) {
        const fileList = files.slice(0, 20).join('\n'); // Limit to first 20 files
        const message = files.length > 20 
          ? `${fileList}\n\n... and ${files.length - 20} more files`
          : fileList;
        Alert.alert('FTP Files', `Files found on server:\n\n${message}`);
        logger.info('FTP files listed successfully', { count: files.length }, 'ProfileScreen');
      } else {
        Alert.alert('No Files', 'No files found on the FTP server root directory.');
        logger.info('No files found on FTP server', {}, 'ProfileScreen');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to list FTP files', { error: errorMessage }, 'ProfileScreen');
      Alert.alert('Error', `Failed to list files: ${errorMessage}`);
    }
  };

  const handleClearMetrics = () => {
    const ftpService = getFTPService();
    ftpService.clearMetrics();
    setConnectionMetrics([]);
    logger.info('Connection metrics cleared', {}, 'ProfileScreen');
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading configuration...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <IconSymbol name="gear" size={32} color={colors.primary} />
          <Text style={styles.title}>FTP Configuration</Text>
          <Text style={styles.subtitle}>
            Configure your FTP server settings for secure data synchronization
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
              autoComplete="off"
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
              maxLength={5}
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
              autoComplete="username"
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
              autoComplete="password"
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
              Supported formats: {config.app.supportedFileTypes.join(', ')}
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

        {connectionMetrics.length > 0 && (
          <View style={styles.metricsCard}>
            <View style={styles.metricsHeader}>
              <Text style={styles.metricsTitle}>Connection Metrics</Text>
              <Pressable onPress={handleClearMetrics} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            </View>
            <Text style={styles.metricsText}>
              Total attempts: {connectionMetrics.length}
            </Text>
            <Text style={styles.metricsText}>
              Success rate: {Math.round((connectionMetrics.filter(m => m.success).length / connectionMetrics.length) * 100)}%
            </Text>
            {connectionMetrics.filter(m => m.success).length > 0 && (
              <Text style={styles.metricsText}>
                Avg. connection time: {Math.round(
                  connectionMetrics.filter(m => m.success).reduce((sum, m) => sum + m.connectionTime, 0) / 
                  connectionMetrics.filter(m => m.success).length
                )}ms
              </Text>
            )}
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
          <Text style={styles.infoTitle}>Production Features</Text>
          <Text style={styles.infoText}>
            ✓ Secure credential storage with device encryption
          </Text>
          <Text style={styles.infoText}>
            ✓ Automatic retry with exponential backoff
          </Text>
          <Text style={styles.infoText}>
            ✓ Connection metrics and performance monitoring
          </Text>
          <Text style={styles.infoText}>
            ✓ File validation and size limits ({Math.round(config.app.maxFileSize / 1024 / 1024)}MB max)
          </Text>
          <Text style={styles.infoText}>
            ✓ Comprehensive error logging and reporting
          </Text>
          <Text style={styles.infoText}>
            ✓ Network state monitoring and offline support
          </Text>
        </View>

        <View style={styles.warningSection}>
          <IconSymbol name="exclamationmark.triangle" color={colors.warning || '#FF9800'} size={20} />
          <Text style={styles.warningText}>
            Your credentials are stored securely using device encryption. 
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
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
  metricsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  clearButtonText: {
    color: colors.card,
    fontSize: 12,
    fontWeight: '500',
  },
  metricsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
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
