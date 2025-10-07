
import Constants from 'expo-constants';

export interface AppConfig {
  ftp: {
    defaultHost: string;
    defaultPort: string;
    connectionTimeout: number;
    retryAttempts: number;
  };
  app: {
    refreshInterval: number;
    maxFileSize: number;
    supportedFileTypes: string[];
  };
  logging: {
    enableConsoleLogging: boolean;
    enableRemoteLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

const isDevelopment = __DEV__;
const isProduction = !__DEV__;

const developmentConfig: AppConfig = {
  ftp: {
    defaultHost: 'ftp.example.com',
    defaultPort: '21',
    connectionTimeout: 30000,
    retryAttempts: 3,
  },
  app: {
    refreshInterval: 30000, // 30 seconds
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFileTypes: ['.xls', '.xlsx', '.csv'],
  },
  logging: {
    enableConsoleLogging: true,
    enableRemoteLogging: false,
    logLevel: 'debug',
  },
};

const productionConfig: AppConfig = {
  ftp: {
    defaultHost: Constants.expoConfig?.extra?.ftpHost || 'ftp.example.com',
    defaultPort: Constants.expoConfig?.extra?.ftpPort || '21',
    connectionTimeout: 45000,
    retryAttempts: 5,
  },
  app: {
    refreshInterval: 60000, // 1 minute in production
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFileTypes: ['.xls', '.xlsx', '.csv', '.tsv'],
  },
  logging: {
    enableConsoleLogging: false,
    enableRemoteLogging: true,
    logLevel: 'error',
  },
};

export const config: AppConfig = isProduction ? productionConfig : developmentConfig;

export const getEnvironment = () => ({
  isDevelopment,
  isProduction,
  version: Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.extra?.buildNumber || '1',
});
