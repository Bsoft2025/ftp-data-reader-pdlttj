
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface SecureStorageOptions {
  requireAuthentication?: boolean;
  accessGroup?: string;
}

class SecureStorageService {
  private static instance: SecureStorageService;
  
  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  async setItem(key: string, value: string, options?: SecureStorageOptions): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Fallback to localStorage for web (not secure, but functional)
        localStorage.setItem(`secure_${key}`, value);
        return;
      }

      const secureStoreOptions: SecureStore.SecureStoreOptions = {};
      
      if (options?.requireAuthentication) {
        secureStoreOptions.requireAuthentication = true;
        secureStoreOptions.authenticationPrompt = 'Authenticate to access FTP credentials';
      }

      if (options?.accessGroup && Platform.OS === 'ios') {
        secureStoreOptions.accessGroup = options.accessGroup;
      }

      await SecureStore.setItemAsync(key, value, secureStoreOptions);
      console.log(`Securely stored item with key: ${key}`);
    } catch (error) {
      console.error(`Failed to store secure item ${key}:`, error);
      throw new Error(`Failed to store secure data: ${error}`);
    }
  }

  async getItem(key: string, options?: SecureStorageOptions): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Fallback to localStorage for web
        return localStorage.getItem(`secure_${key}`);
      }

      const secureStoreOptions: SecureStore.SecureStoreOptions = {};
      
      if (options?.requireAuthentication) {
        secureStoreOptions.requireAuthentication = true;
        secureStoreOptions.authenticationPrompt = 'Authenticate to access FTP credentials';
      }

      const result = await SecureStore.getItemAsync(key, secureStoreOptions);
      return result;
    } catch (error) {
      console.error(`Failed to retrieve secure item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(`secure_${key}`);
        return;
      }

      await SecureStore.deleteItemAsync(key);
      console.log(`Removed secure item with key: ${key}`);
    } catch (error) {
      console.error(`Failed to remove secure item ${key}:`, error);
      throw new Error(`Failed to remove secure data: ${error}`);
    }
  }

  async hasItem(key: string): Promise<boolean> {
    try {
      const item = await this.getItem(key);
      return item !== null;
    } catch (error) {
      console.error(`Failed to check secure item ${key}:`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Clear all secure items from localStorage
        const keys = Object.keys(localStorage).filter(key => key.startsWith('secure_'));
        keys.forEach(key => localStorage.removeItem(key));
        return;
      }

      // Note: SecureStore doesn't have a clear all method
      // You would need to track keys separately if needed
      console.log('Secure storage cleared (individual items need to be removed manually)');
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
      throw new Error(`Failed to clear secure storage: ${error}`);
    }
  }
}

export const secureStorage = SecureStorageService.getInstance();
