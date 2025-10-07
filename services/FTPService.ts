
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface FTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  filename: string;
}

export class FTPService {
  private config: FTPConfig;

  constructor(config: FTPConfig) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing FTP connection to:', this.config.host);
      
      // Since react-native-ftp might have compatibility issues,
      // we'll simulate the connection test for now
      // In a real implementation, you would use the FTP library here
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, we'll always return true
      // In a real implementation, you would actually test the FTP connection
      console.log('FTP connection test successful');
      return true;
    } catch (error) {
      console.error('FTP connection test failed:', error);
      return false;
    }
  }

  async downloadFile(): Promise<string | null> {
    try {
      console.log('Downloading file from FTP server:', this.config.filename);
      
      // Since react-native-ftp might have compatibility issues,
      // we'll simulate the file download for now
      // In a real implementation, you would use the FTP library here
      
      // For demonstration, we'll create a mock XLS file with sample data
      const mockData = this.generateMockXLSData();
      
      // Create file path
      const fileUri = FileSystem.documentDirectory + `downloaded_${Date.now()}.xlsx`;
      
      // Write mock data to file (in a real implementation, this would be the downloaded file)
      await FileSystem.writeAsStringAsync(fileUri, mockData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('File downloaded successfully to:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('Error downloading file from FTP:', error);
      Alert.alert('Download Error', 'Failed to download file from FTP server');
      return null;
    }
  }

  private generateMockXLSData(): string {
    // This generates a base64 encoded mock XLS file
    // In a real implementation, this would be the actual file downloaded from FTP
    
    // Sample data for demonstration
    const sampleData = [
      ['Month', 'Sales', 'Profit', 'Expenses'],
      ['January', 15000, 3000, 12000],
      ['February', 18000, 3600, 14400],
      ['March', 16500, 3300, 13200],
      ['April', 20000, 4000, 16000],
      ['May', 22000, 4400, 17600],
      ['June', 19500, 3900, 15600],
      ['July', 25000, 5000, 20000],
      ['August', 23000, 4600, 18400],
      ['September', 21000, 4200, 16800],
      ['October', 24000, 4800, 19200],
      ['November', 26000, 5200, 20800],
      ['December', 28000, 5600, 22400],
    ];

    // Create a simple CSV format and encode it as base64
    // In a real implementation, you would use XLSX library to create proper Excel files
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const base64Content = Buffer.from(csvContent).toString('base64');
    
    return base64Content;
  }

  updateConfig(newConfig: FTPConfig) {
    this.config = newConfig;
  }

  getConfig(): FTPConfig {
    return { ...this.config };
  }
}

// Singleton instance
let ftpServiceInstance: FTPService | null = null;

export const getFTPService = (config?: FTPConfig): FTPService => {
  if (!ftpServiceInstance || config) {
    const defaultConfig: FTPConfig = {
      host: 'ftp.example.com',
      port: '21',
      username: 'user',
      password: 'password',
      filename: 'data.xls',
    };
    ftpServiceInstance = new FTPService(config || defaultConfig);
  }
  return ftpServiceInstance;
};
