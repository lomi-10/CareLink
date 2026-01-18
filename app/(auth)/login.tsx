import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Alert,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router"; 
import { Ionicons } from "@expo/vector-icons";
import API_URL from "../../constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
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

  const backgroundImage = Platform.select({
    web: require("../../assets/images/CareLink.BackGround.Web.png"),
    default: require("../../assets/images/CareLink.BackGround.Mobile.png"),
  });

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
    // 1. Check Lock Status First
    if (isLocked) {
      setModalTitle("Login Locked");
      setModalMessage("Too many attempts. Please wait a while before trying again.");
      setModalVisible(true);
      return;
    }

    // 2. Check Empty Fields
    if (!email || !password) {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);

      // Clear inputs
      setEmail("");
      setPassword("");

      if (newAttempts <= 0) {
        handleLockout();
      } else {
        setModalTitle("Login Failed");
        setModalMessage(`Please enter correct email and/or password.\n You only have ${newAttempts} attempts left`);
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
        // ✅ SUCCESS LOGIC
        await AsyncStorage.setItem("user_token", data.user.user_id.toString());
        await AsyncStorage.setItem("user_data", JSON.stringify(data.user));

        // Reset counters on success
        setAttemptsLeft(5);
        
        setModalTitle("Welcome Back!");
        setModalMessage(data.message);
        setModalVisible(true);

        setTimeout(() => {
          setModalVisible(false);
          
          // Redirect based on role
          if (data.user_type === "admin") {
            router.replace("/admin/dashboard"); 
          } else if (data.user_type === "helper"){
            router.replace("/(helper)/home"); 
          } else {
            router.replace("/(parent)/home");
          }
        }, 1500);

      } else {
        // ❌ FAILURE LOGIC
        
        // Clear inputs as requested
        setEmail("");
        setPassword("");

        if (data.reason === "wrong_password") {
          const newAttempts = attemptsLeft - 1;
          setAttemptsLeft(newAttempts);

          if (newAttempts <= 0) {
            handleLockout();
          } else {
            setModalTitle("Login Failed");
            setModalMessage(`${data.message}\nYou have ${newAttempts} attempts left.`);
            setModalVisible(true);
          }
        } else if(data.reason === "Account Pending") {
          // Can enter but has limited acces
          // Reset counters on success
          setAttemptsLeft(5);

          setModalTitle("Welcome Back!");
          setModalMessage(data.message);
          setModalVisible(true);

          setTimeout(() => {
            setModalVisible(false);
            
            // Redirect based on role
            if (data.user_type === "admin") {
              router.replace("/admin/dashboard"); 
            } else if (data.user_type === "helper"){
              router.replace("/(helper)/home"); 
            } else {
              router.replace("/(parent)/home");
            }
          }, 1500);
        } else {
          // Other errors (like "User not found")
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
      }
    } catch (error) {
      console.error(error);
      setModalTitle("Connection Error");
      setModalMessage("Unable to connect to server.");
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Text style={styles.title}>Welcome to CareLink</Text>
        <Text style={styles.subtitle}>Where families find trusted supports.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.inputPassword}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={24}
                color="gray"
                style={styles.eyeIcon}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => Alert.alert("Info", "Contact Admin to reset password.")}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLocked && { backgroundColor: "gray" }]}
            onPress={handleLogin}
            disabled={isLocked || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLocked ? "Locked" : "Log In"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/welcome")}> 
            <Text style={styles.back}>← Back to Welcome</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modal */}
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
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 450, 
    alignSelf: 'center', 
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#000",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#000",
    marginBottom: 30,
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#fff",
    color: "#000",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
    paddingHorizontal: 15,
  },
  inputPassword: {
    flex: 1,
    height: "100%",
    color: "#000",
  },
  eyeIcon: {
    paddingLeft: 10,
  },
  link: {
    color: "#007AFF",
    fontSize: 14,
    textAlign: "right",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  back: {
    textAlign: "center",
    marginTop: 20,
    color: "#000",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});