// app/(PESO)/reports.tsx
// Reports Screen - Placeholder for future reports
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Reports() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Reports & Analytics</Text>
          <Text style={styles.pageSubtitle}>Coming soon</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.placeholderCard}>
          <Ionicons name="bar-chart" size={64} color="#ccc" />
          <Text style={styles.placeholderTitle}>Reports Coming Soon</Text>
          <Text style={styles.placeholderText}>
            This section will contain:
          </Text>
          <View style={styles.featureList}>
            <FeatureItem text="Verification statistics" />
            <FeatureItem text="Document approval rates" />
            <FeatureItem text="Helper demographics" />
            <FeatureItem text="Monthly trends" />
            <FeatureItem text="Export reports to PDF/Excel" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name="checkmark-circle" size={20} color="#34C759" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1C1E",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#666",
  },

  scrollContent: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  placeholderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: 500,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1C1E",
    marginTop: 20,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  featureList: {
    width: "100%",
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    color: "#666",
  },
});
