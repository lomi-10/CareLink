// app/admin/login.tsx
// WEB-ONLY Admin Login - Shows warning on mobile devices

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API_URL from "../../constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AdminLoginScreen() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    checkIfMobile();
  }, []);

  const checkIfMobile = () => {
    const { width } = Dimensions.get('window');
    const isMobileDevice = Platform.OS !== 'web' || width < 768;
    setIsMobile(isMobileDevice);
  };

  const handleLockout = () => {
    setIsLocked(true);
    setModalTitle("Too Many Attempts");
    setModalMessage("Account locked for 1 minute.");
    setModalVisible(true);
    
    setTimeout(() => {
      setIsLocked(false);
      setAttemptsLeft(5);
    }, 60000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      setEmail("");
      setPassword("");

      if (newAttempts <= 0) {
        handleLockout();
      } else {
        setModalTitle("Login Failed");
        setModalMessage(`Please enter correct credentials.\nYou have ${newAttempts} attempts left.`);
        setModalVisible(true);
      }
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // ================================================================
        // SECURITY CHECK: Only admin and peso allowed
        // ================================================================
        if (data.user_type === 'admin' || data.user_type === 'peso') {
          setAttemptsLeft(5);
          
          await AsyncStorage.setItem("user_token", data.user.user_id.toString());
          await AsyncStorage.setItem("user_data", JSON.stringify(data.user));
          
          setModalTitle(data.user_type === 'admin' ? "Welcome Super Admin" : "Welcome PESO Admin");
          setModalMessage("Access Granted.");
          setModalVisible(true);

          setTimeout(() => {
            setModalVisible(false);
            if (data.user_type === 'admin') {
              router.replace("/admin/dashboard");
            } else {
              router.replace("/(peso)/home");
            }
          }, 1500);
        } else {
          // Regular users trying to login here
          const newAttempts = attemptsLeft - 1;
          setAttemptsLeft(newAttempts);

          if (newAttempts <= 0) {
            handleLockout();
          } else {
            setModalTitle("Access Denied");
            setModalMessage("This portal is for administrators only.\n\nUse the regular login for user access.");
            setModalVisible(true);
          }
        }
      } else {
        const newAttempts = attemptsLeft - 1;
        setAttemptsLeft(newAttempts);
        setEmail("");
        setPassword("");

        if (newAttempts <= 0) {
          handleLockout();
        } else {
          setModalTitle("Login Failed");
          setModalMessage(`Please enter correct credentials.\nYou have ${newAttempts} attempts left.`);
          setModalVisible(true);
        }
      }
    } catch (error) {
      setModalTitle("System Error");
      setModalMessage("Unable to connect to the server.");
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Mobile Warning Screen
  if (isMobile) {
    return (
      <SafeAreaView style={styles.mobileWarningContainer}>
        <View style={styles.mobileWarningCard}>
          <Ionicons name="desktop" size={80} color="#004080" />
          <Text style={styles.mobileWarningTitle}>Desktop Only</Text>
          <Text style={styles.mobileWarningMessage}>
            The Admin Portal is only accessible from desktop or tablet devices.
          </Text>
          <View style={styles.mobileInstructions}>
            <Text style={styles.instructionText}>
              Please access this portal from:
            </Text>
            <View style={styles.deviceList}>
              <View style={styles.deviceItem}>
                <Ionicons name="desktop" size={24} color="#004080" />
                <Text style={styles.deviceText}>Desktop Computer</Text>
              </View>
              <View style={styles.deviceItem}>
                <Ionicons name="tablet-landscape" size={24} color="#004080" />
                <Text style={styles.deviceText}>Tablet (Landscape)</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.mobileBackButton}
            onPress={() => router.push("/welcome")}
          >
            <Text style={styles.mobileBackText}>← Back to Welcome</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Desktop/Web Login Screen
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          {/* Admin Header Icon */}
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={60} color="#004080" />
          </View>
          
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.subtitle}>Secure Access Only</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.inputPassword}
                placeholder="Enter Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="gray"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Authenticate</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/welcome")}>
              <Text style={styles.backText}>Exit to Main Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Mobile Warning Styles
  mobileWarningContainer: {
    flex: 1,
    backgroundColor: "#E6E9F0",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  mobileWarningCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 40,
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  mobileWarningTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#004080",
    marginTop: 20,
    marginBottom: 12,
  },
  mobileWarningMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  mobileInstructions: {
    width: "100%",
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  deviceList: {
    gap: 12,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deviceText: {
    fontSize: 14,
    color: "#666",
  },
  mobileBackButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  mobileBackText: {
    color: "#004080",
    fontSize: 15,
    fontWeight: "600",
  },

  // Desktop Login Styles
  container: {
    flex: 1,
    backgroundColor: "#E6E9F0",
    justifyContent: "center",
    padding: 20,
  },
  keyboardView: {
    width: "100%",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    alignItems: "center",
  },
  headerIcon: {
    marginBottom: 15,
    backgroundColor: "#E6F0FF",
    padding: 15,
    borderRadius: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#004080",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 50,
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  inputPassword: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: "#004080",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  backText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 10,
    width: "80%",
    maxWidth: 350,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  modalMessage: {
    fontSize: 15,
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#004080",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
