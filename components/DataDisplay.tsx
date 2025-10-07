
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
  const [ftpConfig, setFtpConfig] = useState({
    host: 'ftp.example.com',
    username: 'user',
    password: 'password',
    filename: 'data.xls',
  });

  // Download XLS file using FTP service
  const downloadXLSFile = async (): Promise<string | null> => {
    try {
      console.log('Attempting to connect to FTP server...');
      
      const ftpService = getFTPService();
      const fileUri = await ftpService.downloadFile();
      
      if (fileUri) {
        console.log('XLS file downloaded successfully');
        return fileUri;
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading XLS file:', error);
      Alert.alert('Error', 'Failed to download XLS file from FTP server');
      return null;
    }
  };

  const parseXLSFile = async (fileUri: string) => {
    try {
      console.log('Parsing XLS file...');
      
      // Read the file
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // For demo purposes, we'll parse it as CSV since our mock data is CSV
      // In a real implementation, you would use XLSX.read for actual Excel files
      try {
        // Try to parse as Excel first
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('XLS file parsed successfully:', jsonData);
        return jsonData;
      } catch (xlsxError) {
        // If Excel parsing fails, try CSV parsing
        console.log('Excel parsing failed, trying CSV parsing...');
        const csvContent = Buffer.from(fileContent, 'base64').toString('utf-8');
        const rows = csvContent.split('\n').map(row => row.split(','));
        console.log('CSV file parsed successfully:', rows);
        return rows;
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      Alert.alert('Error', 'Failed to parse data file');
      return null;
    }
  };

  const processDataForCharts = (rawData: any[]) => {
    if (!rawData || rawData.length < 2) return;

    // Assume first row is headers, rest is data
    const headers = rawData[0] as string[];
    const dataRows = rawData.slice(1);

    console.log('Processing data for charts:', { headers, dataRows });

    // Create chart data for line/bar charts
    const labels = dataRows.map(row => String(row[0]));
    const datasets = [];

    // Process numeric columns (skip first column which is labels)
    for (let i = 1; i < headers.length; i++) {
      const data = dataRows.map(row => Number(row[i]) || 0);
      datasets.push({
        data,
        color: (opacity: number) => `rgba(${41 + i * 50}, ${98 + i * 30}, 255, ${opacity})`,
        strokeWidth: 2,
      });
    }

    const processedChartData: ChartData = { labels, datasets };
    setChartData(processedChartData);

    // Create pie chart data (using first numeric column)
    if (datasets.length > 0) {
      const pieChartData: DataPoint[] = labels.map((label, index) => ({
        name: label,
        value: datasets[0].data[index],
        color: `hsl(${(index * 360) / labels.length}, 70%, 50%)`,
      }));
      setPieData(pieChartData);
    }

    setData(dataRows);
  };

  const fetchAndProcessData = async () => {
    setIsLoading(true);
    try {
      // Download XLS file from FTP
      const fileUri = await downloadXLSFile();
      if (!fileUri) return;

      // Parse XLS file
      const parsedData = await parseXLSFile(fileUri);
      if (!parsedData) return;

      // Process data for charts
      processDataForCharts(parsedData);

      setLastUpdated(new Date());
      console.log('Data loaded and processed successfully!');
    } catch (error) {
      console.error('Error in fetchAndProcessData:', error);
      Alert.alert('Error', 'Failed to fetch and process data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch data on component mount
    fetchAndProcessData();
  }, []);

  useEffect(() => {
    // Set up auto-refresh interval
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        console.log('Auto-refreshing data...');
        fetchAndProcessData();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  const renderChart = () => {
    if (!chartData) return null;

    const chartWidth = screenWidth - 32;

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

  if (isLoading && !chartData) {
    return <LoadingScreen message="Downloading and processing XLS data..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>XLS Data Visualization</Text>
        <Text style={styles.subtitle}>
          Automatically reads XLS files from FTP server
        </Text>
      </View>

      <View style={styles.configCard}>
        <Text style={styles.configTitle}>Connection Status</Text>
        <Text style={styles.configText}>Host: {ftpConfig.host}</Text>
        <Text style={styles.configText}>File: {ftpConfig.filename}</Text>
        <Text style={styles.configText}>Status: {isLoading ? 'Connecting...' : 'Ready'}</Text>
        {lastUpdated && (
          <Text style={styles.configText}>
            Last Updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
        <View style={styles.autoRefreshContainer}>
          <Text style={styles.configText}>Auto-refresh: </Text>
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

      <Pressable
        style={[styles.refreshButton, isLoading && styles.refreshButtonDisabled]}
        onPress={fetchAndProcessData}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.card} size="small" />
        ) : (
          <IconSymbol name="arrow.clockwise" color={colors.card} size={20} />
        )}
        <Text style={styles.refreshButtonText}>
          {isLoading ? 'Loading...' : 'Refresh Data'}
        </Text>
      </Pressable>

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
          <Text style={styles.dataPreviewTitle}>Data Preview</Text>
          {data.slice(0, 5).map((row, index) => (
            <View key={index} style={styles.dataRow}>
              {row.map((cell: any, cellIndex: number) => (
                <Text key={cellIndex} style={styles.dataCell}>
                  {String(cell)}
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
    marginBottom: 8,
  },
  configText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
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
