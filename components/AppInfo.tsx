
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

const AppInfo: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <IconSymbol name="chart.bar.xaxis" size={64} color={colors.primary} />
        <Text style={styles.title}>XLS Data Visualization</Text>
        <Text style={styles.subtitle}>
          Automatically reads XLS files from FTP servers and displays data graphically
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featureList}>
          <FeatureItem 
            icon="server.rack" 
            title="FTP Integration" 
            description="Connects to FTP servers to download XLS files automatically"
          />
          <FeatureItem 
            icon="doc.text" 
            title="XLS Parsing" 
            description="Parses Excel files and extracts data for visualization"
          />
          <FeatureItem 
            icon="chart.line.uptrend.xyaxis" 
            title="Multiple Chart Types" 
            description="Display data as line charts, bar charts, or pie charts"
          />
          <FeatureItem 
            icon="arrow.clockwise" 
            title="Auto-Refresh" 
            description="Automatically refreshes data at configurable intervals"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepList}>
          <StepItem 
            number="1" 
            title="Configure FTP Settings" 
            description="Set up your FTP server details in the configuration tab"
          />
          <StepItem 
            number="2" 
            title="Automatic Download" 
            description="The app connects to your FTP server and downloads the XLS file"
          />
          <StepItem 
            number="3" 
            title="Data Processing" 
            description="XLS data is parsed and converted into chart-ready format"
          />
          <StepItem 
            number="4" 
            title="Visual Display" 
            description="Data is displayed in interactive charts with multiple view options"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supported Formats</Text>
        <Text style={styles.bodyText}>
          • Excel files (.xls, .xlsx){'\n'}
          • CSV files with Excel-compatible structure{'\n'}
          • Data with headers in the first row{'\n'}
          • Numeric data for chart visualization
        </Text>
      </View>
    </ScrollView>
  );
};

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <IconSymbol name={icon} size={24} color={colors.primary} />
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

interface StepItemProps {
  number: string;
  title: string;
  description: string;
}

const StepItem: React.FC<StepItemProps> = ({ number, title, description }) => (
  <View style={styles.stepItem}>
    <View style={styles.stepNumber}>
      <Text style={styles.stepNumberText}>{number}</Text>
    </View>
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
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
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  bodyText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  featureContent: {
    flex: 1,
    marginLeft: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  stepList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.card,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default AppInfo;
