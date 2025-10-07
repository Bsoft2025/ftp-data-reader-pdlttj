
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, AppState } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { logger, setupGlobalErrorHandling } from "@/services/Logger";
import { cleanupFTPService } from "@/services/FTPService";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getEnvironment } from "@/config/environment";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    // Initialize production-ready logging and error handling
    setupGlobalErrorHandling();
    
    const environment = getEnvironment();
    logger.info('App started', {
      version: environment.version,
      buildNumber: environment.buildNumber,
      isDevelopment: environment.isDevelopment,
      platform: process.env.EXPO_OS,
    }, 'RootLayout');

    if (loaded) {
      SplashScreen.hideAsync();
      logger.info('Splash screen hidden, fonts loaded', {}, 'RootLayout');
    }
  }, [loaded]);

  // Handle app state changes for cleanup
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      logger.info('App state changed', { state: nextAppState }, 'RootLayout');
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Cleanup resources when app goes to background
        cleanupFTPService().catch(error => {
          logger.error('Error during background cleanup', { error }, 'RootLayout');
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      // Final cleanup when component unmounts
      cleanupFTPService().catch(error => {
        logger.error('Error during component unmount cleanup', { error }, 'RootLayout');
      });
      logger.destroy();
    };
  }, []);

  // Enhanced network state monitoring
  useEffect(() => {
    if (networkState.isConnected === false) {
      logger.warn('Network disconnected', { 
        isInternetReachable: networkState.isInternetReachable 
      }, 'RootLayout');
      
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online.",
        [{ text: "OK", style: "default" }]
      );
    } else if (networkState.isConnected === true) {
      logger.info('Network connected', { 
        isInternetReachable: networkState.isInternetReachable,
        type: networkState.type 
      }, 'RootLayout');
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!loaded) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(41, 98, 255)", // Updated to match commonStyles
      background: "rgb(255, 255, 255)",
      card: "rgb(255, 255, 255)",
      text: "rgb(33, 33, 33)",
      border: "rgb(224, 224, 224)",
      notification: "rgb(244, 67, 54)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(89, 131, 255)",
      background: "rgb(18, 18, 18)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(68, 68, 70)",
      notification: "rgb(255, 69, 58)",
    },
  };

  return (
    <ErrorBoundary>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <WidgetProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack>
              {/* Main app with tabs */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

              {/* Modal Demo Screens */}
              <Stack.Screen
                name="modal"
                options={{
                  presentation: "modal",
                  title: "Standard Modal",
                }}
              />
              <Stack.Screen
                name="formsheet"
                options={{
                  presentation: "formSheet",
                  title: "Form Sheet Modal",
                  sheetGrabberVisible: true,
                  sheetAllowedDetents: [0.5, 0.8, 1.0],
                  sheetCornerRadius: 20,
                }}
              />
              <Stack.Screen
                name="transparent-modal"
                options={{
                  presentation: "transparentModal",
                  headerShown: false,
                }}
              />
            </Stack>
            <SystemBars style="auto" />
          </GestureHandlerRootView>
        </WidgetProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
