import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "../../constants/api";

// Interfaces
interface FormData {
  first_name: string;
  middle_name: string,
  last_name: string,
  email: string;
  user_type: string;
  password: string;
  confirmpass: string;
}

export default function SignUpScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  
  const [form, setForm] = useState<FormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    user_type: role || "",
    password: "",
    confirmpass: "",
  });

  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Real-time passwrod validation
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const backgroundImage = Platform.select({
    web: require("../../assets/images/CareLink.BackGround.Web.png"),
    default: require("../../assets/images/CareLink.BackGround.Mobile.png"),
  });

  const router = useRouter();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusColor, setStatusColor] = useState<string>("#ff4d4f");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const handleChange = (key: keyof FormData, value: string) =>
    setForm({ ...form, [key]: value });

  //Real-time validation effect
  useEffect(() => {
    const { password, confirmpass } = form;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasLength = password.length >= 8;
    const isEqual = password === confirmpass && password !== "";

    if(hasUpperCase && hasNumber && hasLength && hasSpecial && isEqual){
      setIsPasswordValid(true);
    }
    else {
      setIsPasswordValid(false);
    }
  }, [form.password, form.confirmpass]);

  const handleSignUpScreen = async () => {
    const { first_name, middle_name, last_name, email, user_type, password, confirmpass } = form;

    // 1. Check Empty Fields
    if (!first_name || !last_name || !user_type || !email || !password || !confirmpass) {
      setModalTitle("Missing Fields");
      setModalMessage("Please fill in all required fields.");
      setModalVisible(true);
      return;
    }

    // 2. Check Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalTitle("Invalid Email");
      setModalMessage("Please enter a valid email address.");
      setModalVisible(true);
      return;
    }

    // 3. Password checks
    // Regex (Regular Expressions) Checks
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasLength = password.length >= 8;

    if (password !== confirmpass) {
      setModalTitle("Password Mismatch");
      setModalMessage("Passwords do not match.");
      setModalVisible(true);
      return;
    }

    // Checks if its 8 characters longo or more
    if (!hasLength) {
      setModalTitle("Weak Password");
      setModalMessage("Password must be at least 8 characters long.");
      setModalVisible(true);
      return;
    }

    //checks if it has numbers
    if (!hasNumber) {
      setModalTitle("Weak Password");
      setModalMessage("Password must contain a number.");
      setModalVisible(true);
      return;
    }

    //checks if it has uppercases
    if (!hasUpperCase) {
      setModalTitle("Weak Password");
      setModalMessage("Password must contain an uppercase.");
      setModalVisible(true);
      return;
    }

    //checks if it has special character
    if(!hasSpecial){
      setModalTitle("Weak Password");
      setModalMessage("Password must contain a special character.");
      setModalVisible(true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/signup.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name, middle_name, last_name, email, user_type, password }),
      });

      const data = await response.json();
      console.log("Response: ", data);

      if (data.success) {
        setModalTitle("✅ Success");
        let successMessage = data.message;
        if (form.user_type === 'helper') {
          successMessage = "Registration successful! Your account is now pending for PESO verification. You can log in to complete your profile.";
        } else if (form.user_type === 'peso') {
          successMessage = "PESO registration submitted. Your account is pending system approval.";
        } else if (form.user_type === 'admin') {
          successMessage = "Super Admin registration successful! You can now access the system management dashboard.";
        }
        setModalMessage(successMessage);
        setModalVisible(true);

        setTimeout(() => {
          setModalVisible(false);
          router.replace("/login");
        }, 2000);
      } else {
        setModalTitle("❌ Registration Failed");
        setModalMessage(data.message || "Try again.");
        setModalVisible(true);
      }
    } catch (error) {
      console.error("Registration Error:", error);
      setModalTitle("⚠️ Connection Error");
      setModalMessage(
        "Unable to connect to server. Is XAMPP running? Is your IP correct?"
      );
      setModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ImageBackground
          source={backgroundImage}
          style={styles.background}
          resizeMode="cover"
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.modalBox}>
              <Pressable
                style={styles.closeButton}
                onPress={() => router.back()}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>

              <Text style={styles.title}>
                {role === 'helper' ? 'Helper Registration' : 
                 role === 'parent' ? 'Parent Registration' : 
                 'Register for CareLink'}
              </Text>

              {statusMessage ? (
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusMessage}
                </Text>
              ) : null}

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    placeholder="First Name"
                    style={styles.input}
                    value={form.first_name}
                    onChangeText={(v) => handleChange("first_name", v)}
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <TextInput
                    placeholder="Last Name"
                    style={styles.input}
                    value={form.last_name}
                    onChangeText={(v) => handleChange("last_name", v)}
                  />
                </View>
              </View>

              <TextInput
                placeholder="Middle Name (Optional)"
                style={styles.input}
                value={form.middle_name}
                onChangeText={(v) => handleChange("middle_name", v)}
              />

              <TextInput
                placeholder="Email"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(v) => handleChange("email", v)}
              />

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>I am a:</Text>
                <View style={[styles.pickerWrapper, role ? styles.disabledPicker : null]}>
                  <Picker
                    selectedValue={form.user_type}
                    onValueChange={(value) => !role && handleChange("user_type", value)}
                    style={styles.picker}
                    enabled={!role}
                  >
                    <Picker.Item label="-- Select Role --" value="" />
                    <Picker.Item label="Parent" value="parent" />
                    <Picker.Item label="Helper" value="helper" />
                  </Picker>
                </View>
                {role && (
                  <Text style={styles.roleHint}>
                    Registering as {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                )}
                <Text style={styles.adminNote}>
                  * PESO and Admin accounts are created by system administrators only.
                </Text>
              </View>

              {/* Password Field with Eye Icon */}
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  style={styles.inputPassword}
                  value={form.password}
                  onChangeText={(v) => handleChange("password", v)}
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

              {/* Confirm Password Field with Eye Icon */}
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Confirm Password"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.inputPassword}
                  value={form.confirmpass}
                  onChangeText={(v) => handleChange("confirmpass", v)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={24}
                    color="gray"
                    style={styles.eyeIcon}
                  />
                </TouchableOpacity>
              </View>

              {/* Requirements Indicator for password */}
              <View style={styles.passwordRequirement}>
                <Text style={{color: isPasswordValid ? 'green' : '#d9534f', fontWeight: "500"}}>
                  {isPasswordValid ? '✓' : '*'} Your password must be atleast 8 characters and contain a number, 
                  uppercase letter, and special characters.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleSignUpScreen}
              >
                <Text style={styles.buttonText}>Sign Up</Text>
              </Pressable>

              <Text style={styles.loginText}>
                Already have an account?
                <Text style={styles.link} onPress={() => router.push("/login")}>
                  {" "}
                  Login Here
                </Text>
              </Text>
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>

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
              style={styles.closeButtonModal}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>OK</Text>
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
     
  },
  keyboardView: { 
    flex: 1, 
    width: "100%" 
  },
  background: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: { elevation: 10 },
    }),
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 3,
    zIndex: 10,
  },
  closeText: { 
    color: "black", 
    fontSize: 20, 
    fontWeight: "bold" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#000",
    marginBottom: 10,
  },
  input: {
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
    color: "#000",
  },
  inputRow: {
    flexDirection: "row",
    width: "100%",
  },
  // New styles for Password Container
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  inputPassword: {
    flex: 1,
    height: "100%",
    color: "#000",
  },
  eyeIcon: {
    paddingLeft: 10,
  },
  passwordRequirement: {
    paddingTop: 0,
    padding: 5,
    marginBottom: 15,
    
  },
  button: {
    backgroundColor: "#4b4040ff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  loginText: { 
    color: "black", 
    fontSize: 14, 
    textAlign: "center", 
    marginTop: 15 
  },
  link: { 
    color: 
    "#09613cff", 
    textDecorationLine: "underline" 
  },
  statusText: { 
    marginBottom: 10, 
    textAlign: "center", 
    fontWeight: "600" 
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  closeButtonModal: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  closeButtonText: { 
    color: "#fff", 
    fontWeight: "bold" 
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 10 
  },
  modalMessage: { 
    fontSize: 16, 
    textAlign: "center", 
    marginBottom: 15 
  },
  pickerContainer: { 
    marginVertical: 6, 
    marginBottom: 15 
  },
  pickerLabel: { 
    color: "#333", 
    marginBottom: 4, 
    fontWeight: "600" 
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  disabledPicker: {
    backgroundColor: "#f5f5f5",
    borderColor: "#e0e0e0",
  },
  roleHint: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 4,
    fontWeight: "600",
  },
  adminNote: {
    fontSize: 10,
    color: "#666",
    fontStyle: "italic",
    marginTop: 6,
    textAlign: "center",
  },
  picker: { 
    height: 50, 
    width: "100%", 
    color: "#000" 
  },
});