
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { getFTPService, FTPConfig } from '@/services/FTPService';
import LoadingScreen from './LoadingScreen';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
}

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: colors.card,
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(41, 98, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: colors.primary,
  },
};

export default function DataDisplay() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [pieData, setPieData] = useState<DataPoint[]>([]);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ftpConfig, setFtpConfig] = useState<FTPConfig>({
    host: 'ftp.example.com',
    port: '21',
    username: 'user',
    password: 'password',
    filename: 'data.xls',
  });

  // Test FTP connection
  const testFTPConnection = async (): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      setErrorMessage(null);
      
      const ftpService = getFTPService(ftpConfig);
      const isConnected = await ftpService.testConnection();
      
      if (isConnected) {
        setConnectionStatus('connected');
        console.log('FTP connection test successful');
        return true;
      } else {
        setConnectionStatus('error');
        setErrorMessage('Failed to connect to FTP server');
        return false;
      }
    } catch (error) {
      console.error('FTP connection test error:', error);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Connection test failed');
      return false;
    }
  };

  // Download XLS file using FTP service
  const downloadXLSFile = async (): Promise<string | null> => {
    try {
      console.log('Attempting to download file from FTP server...');
      setErrorMessage(null);
      
      const ftpService = getFTPService(ftpConfig);
      const fileUri = await ftpService.downloadFile();
      
      if (fileUri) {
        console.log('XLS file downloaded successfully to:', fileUri);
        return fileUri;
      } else {
        throw new Error('Failed to download file - no file URI returned');
      }
    } catch (error) {
      console.error('Error downloading XLS file:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown download error';
      setErrorMessage(`Download failed: ${errorMsg}`);
      
      // Don't show alert here as we'll show it in the UI
      return null;
    }
  };

  const parseXLSFile = async (fileUri: string) => {
    try {
      console.log('Parsing XLS file from:', fileUri);
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Downloaded file does not exist');
      }

      // Read the file
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!fileContent) {
        throw new Error('File content is empty');
      }

      // Try to parse as Excel first
      try {
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        
        if (!sheetName) {
          throw new Error('No sheets found in Excel file');
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('Excel file parsed successfully, rows:', jsonData.length);
        return jsonData;
      } catch (xlsxError) {
        console.log('Excel parsing failed, trying CSV parsing...', xlsxError);
        
        // If Excel parsing fails, try CSV parsing
        const csvContent = Buffer.from(fileContent, 'base64').toString('utf-8');
        const rows = csvContent.split('\n')
          .filter(row => row.trim().length > 0) // Remove empty rows
          .map(row => row.split(',').map(cell => cell.trim()));
        
        console.log('CSV file parsed successfully, rows:', rows.length);
        return rows;
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown parsing error';
      setErrorMessage(`File parsing failed: ${errorMsg}`);
      throw error;
    }
  };

  const processDataForCharts = (rawData: any[]) => {
    try {
      if (!rawData || rawData.length < 2) {
        throw new Error('Insufficient data - need at least 2 rows (header + data)');
      }

      // Assume first row is headers, rest is data
      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1).filter(row => row && row.length > 0);

      if (dataRows.length === 0) {
        throw new Error('No data rows found');
      }

      console.log('Processing data for charts:', { 
        headers: headers.length, 
        dataRows: dataRows.length 
      });

      // Create chart data for line/bar charts
      const labels = dataRows.map((row, index) => {
        const label = String(row[0] || `Row ${index + 1}`);
        return label.length > 10 ? label.substring(0, 10) + '...' : label;
      });
      
      const datasets = [];

      // Process numeric columns (skip first column which is labels)
      for (let i = 1; i < headers.length && i < 5; i++) { // Limit to 4 datasets for readability
        const columnData = dataRows.map(row => {
          const value = row[i];
          const numValue = Number(value);
          return isNaN(numValue) ? 0 : numValue;
        });

        // Only add dataset if it has some non-zero values
        if (columnData.some(val => val !== 0)) {
          datasets.push({
            data: columnData,
            color: (opacity: number) => `rgba(${41 + i * 50}, ${98 + i * 30}, 255, ${opacity})`,
            strokeWidth: 2,
          });
        }
      }

      if (datasets.length === 0) {
        throw new Error('No numeric data columns found');
      }

      const processedChartData: ChartData = { labels, datasets };
      setChartData(processedChartData);

      // Create pie chart data (using first numeric column)
      const pieChartData: DataPoint[] = labels.map((label, index) => ({
        name: label,
        value: Math.abs(datasets[0].data[index]) || 1, // Ensure positive values for pie chart
        color: `hsl(${(index * 360) / labels.length}, 70%, 50%)`,
      }));
      setPieData(pieChartData);

      setData(dataRows);
      console.log('Data processed successfully for charts');
    } catch (error) {
      console.error('Error processing data for charts:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown processing error';
      setErrorMessage(`Data processing failed: ${errorMsg}`);
      throw error;
    }
  };

  const fetchAndProcessData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Test connection first
      console.log('Testing FTP connection before download...');
      const connectionOk = await testFTPConnection();
      
      if (!connectionOk) {
        console.log('Connection test failed, but continuing with download attempt...');
      }

      // Download XLS file from FTP
      const fileUri = await downloadXLSFile();
      if (!fileUri) {
        throw new Error('Failed to download file from FTP server');
      }

      // Parse XLS file
      const parsedData = await parseXLSFile(fileUri);
      if (!parsedData) {
        throw new Error('Failed to parse downloaded file');
      }

      // Process data for charts
      processDataForCharts(parsedData);

      setLastUpdated(new Date());
      setConnectionStatus('connected');
      console.log('Data loaded and processed successfully!');
      
      // Clean up downloaded file to save space
      try {
        await FileSystem.deleteAsync(fileUri);
        console.log('Temporary file cleaned up');
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary file:', cleanupError);
      }
      
    } catch (error) {
      console.error('Error in fetchAndProcessData:', error);
      setConnectionStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(errorMsg);
      
      // Show alert for critical errors
      Alert.alert('Error', `Failed to fetch and process data: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch data on component mount
    console.log('Component mounted, fetching initial data...');
    fetchAndProcessData();
  }, []);

  useEffect(() => {
    // Set up auto-refresh interval
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh && !isLoading) {
      console.log('Setting up auto-refresh interval (30 seconds)');
      interval = setInterval(() => {
        console.log('Auto-refreshing data...');
        fetchAndProcessData();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('Auto-refresh interval cleared');
      }
    };
  }, [autoRefresh, isLoading]);

  const renderChart = () => {
    if (!chartData) return null;

    const chartWidth = screenWidth - 32;

    try {
      switch (chartType) {
        case 'line':
          return (
            <LineChart
              data={chartData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          );
        case 'bar':
          return (
            <BarChart
              data={chartData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          );
        case 'pie':
          return (
            <PieChart
              data={pieData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          );
        default:
          return null;
      }
    } catch (chartError) {
      console.error('Error rendering chart:', chartError);
      return (
        <View style={styles.chartError}>
          <IconSymbol name="exclamationmark.triangle" color={colors.textSecondary} size={24} />
          <Text style={styles.chartErrorText}>Error rendering chart</Text>
        </View>
      );
    }
  };

  const renderChartTypeSelector = () => (
    <View style={styles.chartTypeSelector}>
      {(['line', 'bar', 'pie'] as const).map((type) => (
        <Pressable
          key={type}
          style={[
            styles.chartTypeButton,
            chartType === type && styles.chartTypeButtonActive,
          ]}
          onPress={() => setChartType(type)}
        >
          <Text
            style={[
              styles.chartTypeButtonText,
              chartType === type && styles.chartTypeButtonTextActive,
            ]}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return colors.success || '#4CAF50';
      case 'connecting': return colors.warning || '#FF9800';
      case 'error': return colors.error || '#F44336';
      default: return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  if (isLoading && !chartData) {
    return <LoadingScreen message="Connecting to FTP server and downloading data..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>XLS Data Visualization</Text>
        <Text style={styles.subtitle}>
          Real-time data from FTP server using react-native-ftp
        </Text>
      </View>

      <View style={styles.configCard}>
        <Text style={styles.configTitle}>FTP Connection Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        <Text style={styles.configText}>Host: {ftpConfig.host}:{ftpConfig.port}</Text>
        <Text style={styles.configText}>User: {ftpConfig.username}</Text>
        <Text style={styles.configText}>File: {ftpConfig.filename}</Text>
        {lastUpdated && (
          <Text style={styles.configText}>
            Last Updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <IconSymbol name="exclamationmark.triangle" color={colors.error || '#F44336'} size={16} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
        <View style={styles.autoRefreshContainer}>
          <Text style={styles.configText}>Auto-refresh (30s): </Text>
          <Pressable
            style={[styles.toggleSwitch, autoRefresh && styles.toggleSwitchActive]}
            onPress={() => setAutoRefresh(!autoRefresh)}
          >
            <View style={[
              styles.toggleThumb,
              autoRefresh && styles.toggleThumbActive
            ]} />
          </Pressable>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.actionButton, styles.testButton]}
          onPress={testFTPConnection}
          disabled={isLoading}
        >
          {connectionStatus === 'connecting' ? (
            <ActivityIndicator color={colors.card} size="small" />
          ) : (
            <IconSymbol name="network" color={colors.card} size={20} />
          )}
          <Text style={styles.actionButtonText}>Test Connection</Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.refreshButton, isLoading && styles.refreshButtonDisabled]}
          onPress={fetchAndProcessData}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.card} size="small" />
          ) : (
            <IconSymbol name="arrow.clockwise" color={colors.card} size={20} />
          )}
          <Text style={styles.actionButtonText}>
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </Text>
        </Pressable>
      </View>

      {chartData && (
        <>
          {renderChartTypeSelector()}
          <View style={styles.chartContainer}>
            {renderChart()}
          </View>
        </>
      )}

      {data.length > 0 && (
        <View style={styles.dataPreview}>
          <Text style={styles.dataPreviewTitle}>Data Preview ({data.length} rows)</Text>
          {data.slice(0, 5).map((row, index) => (
            <View key={index} style={styles.dataRow}>
              {row.slice(0, 4).map((cell: any, cellIndex: number) => (
                <Text key={cellIndex} style={styles.dataCell} numberOfLines={1}>
                  {String(cell || '')}
                </Text>
              ))}
            </View>
          ))}
          {data.length > 5 && (
            <Text style={styles.moreDataText}>
              ... and {data.length - 5} more rows
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100, // Extra space for floating tab bar
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  configCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  configText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error ? `${colors.error}20` : '#F4433620',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error || '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: colors.textSecondary,
  },
  refreshButton: {
    backgroundColor: colors.primary,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  chartTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  chartTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  chartTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chartTypeButtonTextActive: {
    color: colors.card,
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  chart: {
    borderRadius: 8,
  },
  chartError: {
    alignItems: 'center',
    padding: 20,
  },
  chartErrorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  dataPreview: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  dataPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  dataCell: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: 4,
  },
  moreDataText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  autoRefreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  toggleSwitch: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textSecondary,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});
