import React, { useState } from "react";
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
  SafeAreaView
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API_URL from "../../constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AdminLoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  // Logic Fix: Start with 5 attempts and count DOWN
    const [attemptsLeft, setAttemptsLeft] = useState(5);
    const [isLocked, setIsLocked] = useState(false);

  // Helper to handle locking
  const handleLockout = () => {
    setIsLocked(true);
    setModalTitle("Too Many Attempts");
    setModalMessage("Account locked for 1 minute.");
    setModalVisible(true);
    
    // Unlock after 60 seconds
    setTimeout(() => {
      setIsLocked(false);
      setAttemptsLeft(5); // Reset attempts
    }, 60000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);

      // Clear inputs as requested
      setEmail("");
      setPassword("");

      if (newAttempts <= 0) {
        handleLockout();
      } else {
        setModalTitle("Login Failed");
        setModalMessage(`Please enter correct admin email and/or password.\nYou have ${newAttempts} attempts left.`);
        setModalVisible(true);
      }

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.user_type === 'admin') {

          setAttemptsLeft(5);
          // ✅ Login Success
          await AsyncStorage.setItem("user_token", data.user.user_id.toString());
          await AsyncStorage.setItem("user_data", JSON.stringify(data.user));
          
          setModalTitle("Welcome Admin");
          setModalMessage("Access Granted.");
          setModalVisible(true);

          setTimeout(() => {
            setModalVisible(false);
            router.replace("/admin/dashboard"); // Redirect to Admin Dashboard
          }, 1500);
        } else {
          // ❌ Correct password, but NOT an admin
          const newAttempts = attemptsLeft - 1;
          setAttemptsLeft(newAttempts);

          if (newAttempts <= 0) {
            handleLockout();
          } else {
            setModalTitle("Login Failed");
            setModalMessage(`${data.message}\nYou have ${newAttempts} attempts left.`);
            setModalVisible(true);
          }
        }
      } else {
        const newAttempts = attemptsLeft - 1;
        setAttemptsLeft(newAttempts);

        // Clear inputs as requested
        setEmail("");
        setPassword("");

        if (newAttempts <= 0) {
          handleLockout();
        } else {
          setModalTitle("Login Failed");
          setModalMessage(`Please enter correct admin email and/or password.\nYou have ${newAttempts} attempts left.`);
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
  container: {
    flex: 1,
    backgroundColor: "#E6E9F0", // Light gray professional background
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
    backgroundColor: "#004080", // Corporate Blue
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
  // Modal Styles
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