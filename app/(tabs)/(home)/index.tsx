import React from "react";
import { Stack } from "expo-router";
import { StyleSheet, View, Platform, Pressable, Alert } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { useTheme } from "@react-navigation/native";
import DataDisplay from "@/components/DataDisplay";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function HomeScreen() {
  const theme = useTheme();

  const renderHeaderRight = () => (
    <Pressable
      onPress={() => Alert.alert("Settings", "FTP configuration and chart settings would be available here")}
      style={styles.headerButtonContainer}
    >
      <IconSymbol name="gear" color={theme.colors.primary} />
    </Pressable>
  );

  const renderHeaderLeft = () => (
    <Pressable
      onPress={() => Alert.alert("Info", "XLS Data Visualization App\n\nAutomatically reads XLS files from FTP server and displays data graphically.")}
      style={styles.headerButtonContainer}
    >
      <IconSymbol name="info.circle" color={theme.colors.primary} />
    </Pressable>
  );

  return (
    <>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "XLS Data Viewer",
            headerRight: renderHeaderRight,
            headerLeft: renderHeaderLeft,
          }}
        />
      )}
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorBoundary>
          <DataDisplay />
        </ErrorBoundary>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor handled dynamically
  },
  listContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  listContainerWithTabBar: {
    paddingBottom: 100, // Extra padding for floating tab bar
  },
  demoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  demoContent: {
    flex: 1,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    // color handled dynamically
  },
  demoDescription: {
    fontSize: 14,
    lineHeight: 18,
    // color handled dynamically
  },
  headerButtonContainer: {
    padding: 6,
  },
  tryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    // color handled dynamically
  },
});
