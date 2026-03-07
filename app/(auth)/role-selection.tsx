import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  ImageBackground,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

export default function RoleSelectionScreen() {
  const router = useRouter();

  const backgroundImage = Platform.select({
    web: require("../../assets/images/CareLink.BackGround.Web.png"),
    default: require("../../assets/images/CareLink.BackGround.Mobile.png"),
  });

  const handleRoleSelect = (role: string) => {
    // Navigate to signup with role parameter
    router.push({
      pathname: "/(auth)/signup",
      params: { role },
    });
  };

  const RoleCard = ({ 
    role, 
    title, 
    description, 
    icon, 
    color 
  }: { 
    role: string; 
    title: string; 
    description: string; 
    icon: any; 
    color: string; 
  }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={() => handleRoleSelect(role)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.content}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Join CareLink</Text>
              <Text style={styles.subtitle}>Select how you want to use the platform</Text>
            </View>

            <View style={styles.cardsContainer}>
              <RoleCard
                role="parent"
                title="I'm a Parent"
                description="I want to find and hire trusted help for my home."
                icon="people"
                color="#007AFF"
              />

              <RoleCard
                role="helper"
                title="I'm a Helper"
                description="I want to find jobs and offer my services to families."
                icon="briefcase"
                color="#34C759"
              />
            </View>

            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text 
                style={styles.link} 
                onPress={() => router.push("/login")}
              >
                Login here
              </Text>
            </Text>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderLeftWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  footerText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  link: {
    color: "#007AFF",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
