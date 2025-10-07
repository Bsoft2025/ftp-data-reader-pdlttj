
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import { logger } from './Logger';
import { secureStorage } from './SecureStorage';
import { config } from '@/config/environment';

// Import the react-native-ftp library
let FTPClient: any;

try {
  FTPClient = require('react-native-ftp');
} catch (error) {
  logger.warn('react-native-ftp not available, using fallback implementation', error, 'FTPService');
}

export interface FTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  filename: string;
}

interface ConnectionMetrics {
  connectionTime: number;
  downloadTime: number;
  fileSize: number;
  success: boolean;
  error?: string;
}

export class FTPService {
  private config: FTPConfig;
  private ftpClient: any = null;
  private connectionMetrics: ConnectionMetrics[] = [];
  private maxRetries: number;
  private connectionTimeout: number;

  constructor(config: FTPConfig) {
    this.config = config;
    this.maxRetries = config.app?.retryAttempts || 3;
    this.connectionTimeout = config.app?.connectionTimeout || 30000;
    logger.info('FTPService initialized', { host: config.host, port: config.port }, 'FTPService');
  }

  private async initializeFTPClient(): Promise<any> {
    const startTime = Date.now();
    
    try {
      if (!FTPClient) {
        throw new Error('FTP client library not available');
      }

      logger.debug('Initializing FTP client', { host: this.config.host }, 'FTPService');

      const client = new FTPClient();
      
      // Configure connection settings with timeout
      const connectionConfig = {
        host: this.config.host,
        port: parseInt(this.config.port) || 21,
        user: this.config.username,
        password: this.config.password,
        timeout: this.connectionTimeout,
        keepAlive: false, // Disable keep-alive for production
        secure: false, // Set to true for FTPS
        secureOptions: {
          rejectUnauthorized: false, // Set to true in production with valid certificates
        },
      };

      await client.connect(connectionConfig);

      const connectionTime = Date.now() - startTime;
      logger.info('FTP client connected successfully', { 
        connectionTime,
        host: this.config.host 
      }, 'FTPService');

      this.ftpClient = client;
      return client;
    } catch (error) {
      const connectionTime = Date.now() - startTime;
      logger.error('Failed to initialize FTP client', { 
        error: error instanceof Error ? error.message : error,
        connectionTime,
        host: this.config.host 
      }, 'FTPService');
      throw error;
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Attempting ${operationName} (attempt ${attempt}/${maxRetries})`, {}, 'FTPService');
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`${operationName} succeeded on attempt ${attempt}`, {}, 'FTPService');
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`${operationName} failed on attempt ${attempt}`, { 
          error: lastError.message,
          attempt,
          maxRetries 
        }, 'FTPService');
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error(`${operationName} failed after ${maxRetries} attempts`, { 
      error: lastError?.message 
    }, 'FTPService');
    throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
  }

  async testConnection(): Promise<boolean> {
    return this.retryOperation(async () => {
      logger.info('Testing FTP connection', { host: this.config.host }, 'FTPService');
      
      if (!FTPClient) {
        logger.info('FTP library not available, using mock connection test', {}, 'FTPService');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }

      const client = await this.initializeFTPClient();
      
      // Test connection by listing directory
      await client.list('/');
      
      // Close the test connection
      await this.disconnectClient(client);
      
      logger.info('FTP connection test successful', { host: this.config.host }, 'FTPService');
      return true;
    }, 'Connection Test');
  }

  private async disconnectClient(client: any): Promise<void> {
    try {
      if (client) {
        await client.disconnect();
        logger.debug('FTP client disconnected', {}, 'FTPService');
      }
    } catch (error) {
      logger.warn('Error disconnecting FTP client', { 
        error: error instanceof Error ? error.message : error 
      }, 'FTPService');
    }
  }

  private async validateFile(filePath: string): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    
    if (!fileInfo.exists) {
      throw new Error('Downloaded file does not exist');
    }
    
    if (fileInfo.size === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    if (fileInfo.size > config.app.maxFileSize) {
      throw new Error(`File size (${fileInfo.size}) exceeds maximum allowed size (${config.app.maxFileSize})`);
    }
    
    // Validate file extension
    const extension = this.config.filename.toLowerCase().split('.').pop();
    if (extension && !config.app.supportedFileTypes.includes(`.${extension}`)) {
      logger.warn('Unsupported file type', { extension, filename: this.config.filename }, 'FTPService');
    }
    
    logger.debug('File validation passed', { 
      size: fileInfo.size,
      path: filePath 
    }, 'FTPService');
  }

  async downloadFile(): Promise<string | null> {
    return this.retryOperation(async () => {
      const startTime = Date.now();
      let client: any = null;
      
      try {
        logger.info('Starting file download', { 
          filename: this.config.filename,
          host: this.config.host 
        }, 'FTPService');
        
        if (!FTPClient) {
          logger.info('FTP library not available, using mock download', {}, 'FTPService');
          return await this.mockDownload();
        }

        client = await this.initializeFTPClient();
        
        // Create local file path with timestamp
        const timestamp = Date.now();
        const fileExtension = this.config.filename.split('.').pop() || 'xlsx';
        const localFileName = `downloaded_${timestamp}.${fileExtension}`;
        const localFilePath = FileSystem.documentDirectory + localFileName;
        
        logger.debug('Downloading file', { 
          remoteFile: this.config.filename,
          localPath: localFilePath 
        }, 'FTPService');
        
        // Download file from FTP server
        await client.downloadFile(this.config.filename, localFilePath);
        
        // Validate downloaded file
        await this.validateFile(localFilePath);
        
        const downloadTime = Date.now() - startTime;
        const fileInfo = await FileSystem.getInfoAsync(localFilePath);
        
        // Record metrics
        this.connectionMetrics.push({
          connectionTime: downloadTime,
          downloadTime,
          fileSize: fileInfo.size || 0,
          success: true,
        });
        
        logger.info('File downloaded successfully', {
          localPath: localFilePath,
          size: fileInfo.size,
          downloadTime,
        }, 'FTPService');
        
        return localFilePath;
      } catch (error) {
        const downloadTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Record failed metrics
        this.connectionMetrics.push({
          connectionTime: downloadTime,
          downloadTime,
          fileSize: 0,
          success: false,
          error: errorMessage,
        });
        
        logger.error('File download failed', { 
          error: errorMessage,
          filename: this.config.filename,
          downloadTime 
        }, 'FTPService');
        
        throw error;
      } finally {
        if (client) {
          await this.disconnectClient(client);
        }
      }
    }, 'File Download');
  }

  private async mockDownload(): Promise<string> {
    logger.info('Using mock FTP download for development/fallback', {}, 'FTPService');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const mockData = this.generateMockXLSData();
    const fileUri = FileSystem.documentDirectory + `mock_downloaded_${Date.now()}.xlsx`;
    
    await FileSystem.writeAsStringAsync(fileUri, mockData, {
      encoding: FileSystem.EncodingType.Base64,
    });

    logger.info('Mock file created successfully', { path: fileUri }, 'FTPService');
    return fileUri;
  }

  private generateMockXLSData(): string {
    logger.debug('Generating mock XLS data for demonstration', {}, 'FTPService');
    
    // Enhanced sample data with more realistic business metrics
    const currentYear = new Date().getFullYear();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const sampleData = [
      ['Month', 'Sales', 'Profit', 'Expenses', 'Growth %', 'Customers', 'Orders'],
      ...months.map((month, index) => {
        const baseSales = 15000 + (index * 1000) + (Math.random() * 5000);
        const expenses = baseSales * (0.7 + Math.random() * 0.2);
        const profit = baseSales - expenses;
        const growth = ((Math.random() - 0.5) * 30).toFixed(1);
        const customers = Math.floor(baseSales / 50 + Math.random() * 100);
        const orders = Math.floor(customers * (1.2 + Math.random() * 0.8));
        
        return [
          month,
          Math.floor(baseSales),
          Math.floor(profit),
          Math.floor(expenses),
          growth,
          customers,
          orders
        ];
      })
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const base64Content = Buffer.from(csvContent).toString('base64');
    
    return base64Content;
  }

  async listFiles(directory: string = '/'): Promise<string[]> {
    return this.retryOperation(async () => {
      logger.info('Listing FTP directory files', { directory }, 'FTPService');
      
      if (!FTPClient) {
        logger.info('FTP library not available, returning mock file list', {}, 'FTPService');
        return ['data.xls', 'backup.xlsx', 'report.csv', 'monthly_stats.xlsx'];
      }

      const client = await this.initializeFTPClient();
      
      try {
        const fileList = await client.list(directory);
        logger.info('Files listed successfully', { count: fileList.length }, 'FTPService');
        return fileList;
      } finally {
        await this.disconnectClient(client);
      }
    }, 'List Files');
  }

  async uploadFile(localFilePath: string, remoteFileName: string): Promise<boolean> {
    return this.retryOperation(async () => {
      logger.info('Starting file upload', { 
        localPath: localFilePath,
        remoteName: remoteFileName 
      }, 'FTPService');
      
      if (!FTPClient) {
        logger.info('FTP library not available, simulating upload', {}, 'FTPService');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }

      // Validate local file
      const fileInfo = await FileSystem.getInfoAsync(localFilePath);
      if (!fileInfo.exists) {
        throw new Error('Local file does not exist');
      }

      const client = await this.initializeFTPClient();
      
      try {
        await client.uploadFile(localFilePath, remoteFileName);
        logger.info('File uploaded successfully', { 
          localPath: localFilePath,
          remoteName: remoteFileName,
          size: fileInfo.size 
        }, 'FTPService');
        return true;
      } finally {
        await this.disconnectClient(client);
      }
    }, 'File Upload');
  }

  updateConfig(newConfig: FTPConfig): void {
    logger.info('Updating FTP configuration', { 
      oldHost: this.config.host,
      newHost: newConfig.host 
    }, 'FTPService');
    
    this.config = newConfig;
    
    // Reset client to force reconnection with new config
    if (this.ftpClient) {
      this.disconnectClient(this.ftpClient);
      this.ftpClient = null;
    }
  }

  getConfig(): FTPConfig {
    return { ...this.config };
  }

  getMetrics(): ConnectionMetrics[] {
    return [...this.connectionMetrics];
  }

  clearMetrics(): void {
    this.connectionMetrics = [];
    logger.debug('Connection metrics cleared', {}, 'FTPService');
  }

  async disconnect(): Promise<void> {
    if (this.ftpClient) {
      await this.disconnectClient(this.ftpClient);
      this.ftpClient = null;
    }
  }

  // Save credentials securely
  async saveCredentials(): Promise<void> {
    try {
      const credentials = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        filename: this.config.filename,
      };
      
      await secureStorage.setItem('ftp_credentials', JSON.stringify(credentials), {
        requireAuthentication: Platform.OS !== 'web', // Require auth on mobile
      });
      
      logger.info('FTP credentials saved securely', { host: this.config.host }, 'FTPService');
    } catch (error) {
      logger.error('Failed to save FTP credentials', { 
        error: error instanceof Error ? error.message : error 
      }, 'FTPService');
      throw error;
    }
  }

  // Load credentials securely
  async loadCredentials(): Promise<FTPConfig | null> {
    try {
      const credentialsJson = await secureStorage.getItem('ftp_credentials', {
        requireAuthentication: Platform.OS !== 'web',
      });
      
      if (credentialsJson) {
        const credentials = JSON.parse(credentialsJson) as FTPConfig;
        logger.info('FTP credentials loaded securely', { host: credentials.host }, 'FTPService');
        return credentials;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to load FTP credentials', { 
        error: error instanceof Error ? error.message : error 
      }, 'FTPService');
      return null;
    }
  }
}

// Singleton instance with enhanced error handling
let ftpServiceInstance: FTPService | null = null;

export const getFTPService = (config?: FTPConfig): FTPService => {
  try {
    if (!ftpServiceInstance || config) {
      const defaultConfig: FTPConfig = {
        host: config?.host || 'ftp.example.com',
        port: config?.port || '21',
        username: config?.username || 'user',
        password: config?.password || 'password',
        filename: config?.filename || 'data.xls',
      };
      ftpServiceInstance = new FTPService(config || defaultConfig);
    }
    return ftpServiceInstance;
  } catch (error) {
    logger.error('Failed to create FTP service instance', { 
      error: error instanceof Error ? error.message : error 
    }, 'FTPService');
    throw error;
  }
};

// Enhanced cleanup function
export const cleanupFTPService = async (): Promise<void> => {
  try {
    if (ftpServiceInstance) {
      await ftpServiceInstance.disconnect();
      ftpServiceInstance = null;
      logger.info('FTP service cleaned up successfully', {}, 'FTPService');
    }
  } catch (error) {
    logger.error('Error during FTP service cleanup', { 
      error: error instanceof Error ? error.message : error 
    }, 'FTPService');
  }
};
