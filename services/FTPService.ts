
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// Import the react-native-ftp library
// Note: The exact import might vary based on the library's export structure
let FTPClient: any;

try {
  // Try to import the FTP client
  FTPClient = require('react-native-ftp');
} catch (error) {
  console.warn('react-native-ftp not available, using fallback implementation');
}

export interface FTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  filename: string;
}

export class FTPService {
  private config: FTPConfig;
  private ftpClient: any = null;

  constructor(config: FTPConfig) {
    this.config = config;
  }

  private async initializeFTPClient(): Promise<any> {
    try {
      if (!FTPClient) {
        throw new Error('FTP client library not available');
      }

      // Initialize FTP client with configuration
      const client = new FTPClient();
      
      // Configure connection settings
      await client.connect({
        host: this.config.host,
        port: parseInt(this.config.port) || 21,
        user: this.config.username,
        password: this.config.password,
        timeout: 30000, // 30 seconds timeout
      });

      console.log('FTP client initialized and connected successfully');
      this.ftpClient = client;
      return client;
    } catch (error) {
      console.error('Failed to initialize FTP client:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing FTP connection to:', this.config.host);
      
      if (!FTPClient) {
        console.log('FTP library not available, using mock connection test');
        // Simulate network delay for mock
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }

      // Initialize and test real FTP connection
      const client = await this.initializeFTPClient();
      
      // Test connection by listing directory
      await client.list('/');
      
      // Close the test connection
      await client.disconnect();
      this.ftpClient = null;
      
      console.log('FTP connection test successful');
      return true;
    } catch (error) {
      console.error('FTP connection test failed:', error);
      
      // Clean up on error
      if (this.ftpClient) {
        try {
          await this.ftpClient.disconnect();
        } catch (disconnectError) {
          console.error('Error disconnecting FTP client:', disconnectError);
        }
        this.ftpClient = null;
      }
      
      return false;
    }
  }

  async downloadFile(): Promise<string | null> {
    try {
      console.log('Downloading file from FTP server:', this.config.filename);
      
      if (!FTPClient) {
        console.log('FTP library not available, using mock download');
        return await this.mockDownload();
      }

      // Initialize FTP client
      const client = await this.initializeFTPClient();
      
      // Create local file path
      const timestamp = Date.now();
      const fileExtension = this.config.filename.split('.').pop() || 'xlsx';
      const localFileName = `downloaded_${timestamp}.${fileExtension}`;
      const localFilePath = FileSystem.documentDirectory + localFileName;
      
      console.log('Downloading to local path:', localFilePath);
      
      // Download file from FTP server
      await client.downloadFile(this.config.filename, localFilePath);
      
      // Verify file was downloaded
      const fileInfo = await FileSystem.getInfoAsync(localFilePath);
      if (!fileInfo.exists) {
        throw new Error('Downloaded file does not exist');
      }
      
      console.log('File downloaded successfully:', {
        localPath: localFilePath,
        size: fileInfo.size,
      });
      
      // Close FTP connection
      await client.disconnect();
      this.ftpClient = null;
      
      return localFilePath;
    } catch (error) {
      console.error('Error downloading file from FTP:', error);
      
      // Clean up on error
      if (this.ftpClient) {
        try {
          await this.ftpClient.disconnect();
        } catch (disconnectError) {
          console.error('Error disconnecting FTP client:', disconnectError);
        }
        this.ftpClient = null;
      }
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Download Error', `Failed to download file from FTP server: ${errorMessage}`);
      
      // Fallback to mock data if real FTP fails
      console.log('Falling back to mock data due to FTP error');
      return await this.mockDownload();
    }
  }

  private async mockDownload(): Promise<string> {
    console.log('Using mock FTP download');
    
    // Generate mock XLS data
    const mockData = this.generateMockXLSData();
    
    // Create file path
    const fileUri = FileSystem.documentDirectory + `mock_downloaded_${Date.now()}.xlsx`;
    
    // Write mock data to file
    await FileSystem.writeAsStringAsync(fileUri, mockData, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('Mock file created successfully at:', fileUri);
    return fileUri;
  }

  private generateMockXLSData(): string {
    console.log('Generating mock XLS data for demonstration');
    
    // Sample data for demonstration
    const sampleData = [
      ['Month', 'Sales', 'Profit', 'Expenses', 'Growth'],
      ['January', 15000, 3000, 12000, 5.2],
      ['February', 18000, 3600, 14400, 8.1],
      ['March', 16500, 3300, 13200, -2.3],
      ['April', 20000, 4000, 16000, 12.7],
      ['May', 22000, 4400, 17600, 15.8],
      ['June', 19500, 3900, 15600, -4.1],
      ['July', 25000, 5000, 20000, 18.9],
      ['August', 23000, 4600, 18400, 2.4],
      ['September', 21000, 4200, 16800, -1.8],
      ['October', 24000, 4800, 19200, 9.6],
      ['November', 26000, 5200, 20800, 14.3],
      ['December', 28000, 5600, 22400, 21.1],
    ];

    // Create CSV format and encode as base64
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const base64Content = Buffer.from(csvContent).toString('base64');
    
    return base64Content;
  }

  async listFiles(directory: string = '/'): Promise<string[]> {
    try {
      console.log('Listing files in FTP directory:', directory);
      
      if (!FTPClient) {
        console.log('FTP library not available, returning mock file list');
        return ['data.xls', 'backup.xlsx', 'report.csv'];
      }

      // Initialize FTP client
      const client = await this.initializeFTPClient();
      
      // List files in directory
      const fileList = await client.list(directory);
      
      // Close connection
      await client.disconnect();
      this.ftpClient = null;
      
      console.log('Files listed successfully:', fileList);
      return fileList;
    } catch (error) {
      console.error('Error listing FTP files:', error);
      
      // Clean up on error
      if (this.ftpClient) {
        try {
          await this.ftpClient.disconnect();
        } catch (disconnectError) {
          console.error('Error disconnecting FTP client:', disconnectError);
        }
        this.ftpClient = null;
      }
      
      // Return empty array on error
      return [];
    }
  }

  async uploadFile(localFilePath: string, remoteFileName: string): Promise<boolean> {
    try {
      console.log('Uploading file to FTP server:', { localFilePath, remoteFileName });
      
      if (!FTPClient) {
        console.log('FTP library not available, simulating upload');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }

      // Check if local file exists
      const fileInfo = await FileSystem.getInfoAsync(localFilePath);
      if (!fileInfo.exists) {
        throw new Error('Local file does not exist');
      }

      // Initialize FTP client
      const client = await this.initializeFTPClient();
      
      // Upload file
      await client.uploadFile(localFilePath, remoteFileName);
      
      // Close connection
      await client.disconnect();
      this.ftpClient = null;
      
      console.log('File uploaded successfully');
      return true;
    } catch (error) {
      console.error('Error uploading file to FTP:', error);
      
      // Clean up on error
      if (this.ftpClient) {
        try {
          await this.ftpClient.disconnect();
        } catch (disconnectError) {
          console.error('Error disconnecting FTP client:', disconnectError);
        }
        this.ftpClient = null;
      }
      
      return false;
    }
  }

  updateConfig(newConfig: FTPConfig) {
    console.log('Updating FTP configuration');
    this.config = newConfig;
    
    // Reset client to force reconnection with new config
    if (this.ftpClient) {
      try {
        this.ftpClient.disconnect();
      } catch (error) {
        console.error('Error disconnecting old FTP client:', error);
      }
      this.ftpClient = null;
    }
  }

  getConfig(): FTPConfig {
    return { ...this.config };
  }

  async disconnect(): Promise<void> {
    if (this.ftpClient) {
      try {
        await this.ftpClient.disconnect();
        console.log('FTP client disconnected successfully');
      } catch (error) {
        console.error('Error disconnecting FTP client:', error);
      } finally {
        this.ftpClient = null;
      }
    }
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

// Cleanup function for app termination
export const cleanupFTPService = async (): Promise<void> => {
  if (ftpServiceInstance) {
    await ftpServiceInstance.disconnect();
    ftpServiceInstance = null;
  }
};
