import { useRouter, Link } from "expo-router";
import React from "react";
import {
  Platform,
  Dimensions,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const WelcomeScreen = () => {
  const isWeb = Platform.OS === 'web';

  // Smart Background Image Selection
  const backgroundImage = Platform.select({
    web: require("../assets/images/CareLink.BackGround.Web.png"),
    default: require("../assets/images/CareLink.BackGround.Mobile.png"), 
  });

  // --- WEB LAYOUT (Desktop Design) ---
  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        {/* 1. Web Top Navigation Bar */}
        <View style={styles.webNavbar}>
          <Text style={styles.webLogo}>CareLink</Text>
          <View style={styles.webNavLinks}>
            
            {/* Admin Link -> Goes to specific Admin Login page */}
            <Link href="/admin/adminlogin" asChild>
              <TouchableOpacity>
                <Text style={styles.webNavLink}>Admin Portal</Text>
              </TouchableOpacity>
            </Link>

            {/* Standard Login */}
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.webNavLink}>Login</Text>
              </TouchableOpacity>
            </Link>

            {/* Sign Up Button */}
            <Link href="/signup" asChild>
              <TouchableOpacity style={styles.webNavButton}>
                <Text style={styles.webNavButtonText}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* 2. Web Hero Section */}
        <ImageBackground
          source={backgroundImage}
          style={styles.webBackground}
          resizeMode="cover"
        >
          <View style={styles.webContentOverlay}>
            <View style={styles.webTextBlock}>
              <Text style={styles.webTitle}>Welcome to CareLink</Text>
              <Text style={styles.webSubtitle}>
                Where families find trusted supports.{"\n"}
                Build safer, stronger, and more caring homes.
              </Text>
              
              {/* Web Call to Action */}
              <Link href="/login" asChild>
                <TouchableOpacity style={styles.webHeroButton}>
                  <Text style={styles.webHeroButtonText}>Find a Helper Now</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // --- MOBILE LAYOUT (Your Original Design) ---
  return (
    <View style={styles.pageContainer}>
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="cover"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subMessage}>
            Where families find trusted supports.
          </Text>

          <Text style={styles.welcomeMessage}>
            <Text style={{ fontWeight: "bold" }}>Welcome to CareLink!</Text>
            {"\n"}Whether you’re a parent looking for a trusted{"\n"}
            support or a helper finding a job{"\n"}
            while showcasing your skills, you’re{"\n"}
            in the right place. Together, we{"\n"}
            build safer, stronger, and more{"\n"}
            caring homes.
          </Text>

          <Text style={styles.accountTypeTitle}>Get Started</Text>

          <View style={styles.buttonContainer}>
            <Link href="/login" asChild>
              <TouchableOpacity style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/signup" asChild>
              <TouchableOpacity style={styles.signupButton}>
                <Text style={styles.signupButtonText}>Create Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  // --- MOBILE STYLES ---
  pageContainer: {
    flex: 1,
    backgroundColor: "#f5f5ff",
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  subMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  welcomeMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "left",
    color: "#050505ff",
    marginBottom: 30,
  },
  accountTypeTitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 350,
  },
  loginButton: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: "#0a0a0aff",
    marginBottom: 15,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  signupButton: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#0a0a0aff",
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0a0a0aff",
  },

  // --- WEB STYLES ---
  webContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webNavbar: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  webLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  webNavLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  webNavLink: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    cursor: 'pointer',
  },
  webNavButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  webNavButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  webBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  webContentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 60,
  },
  webTextBlock: {
    maxWidth: 600,
  },
  webTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  webSubtitle: {
    fontSize: 20,
    color: '#f0f0f0',
    lineHeight: 30,
    marginBottom: 40,
  },
  webHeroButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignSelf: 'flex-start',
  },
  webHeroButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});