// app/(auth)/signup.tsx
import React from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

// Import our new separated Logic and Styles!
import { NotificationModal } from "@/components/common/NotificationModal";
import { useSignupForm } from "@/hooks/auth/useSignupForm";
import { styles } from "./signup.styles"; 

export default function SignUpScreen() {
  // Grab ALL our logic from the custom hook in one line!
  const {
    role, 
    form, 
    handleChange, 
    showPassword, 
    setShowPassword, 
    showConfirmPassword, 
    setShowConfirmPassword, 
    isPasswordValid, 
    notification, 
    closeNotification, 
    handleSignUpScreen, 
    router
  } = useSignupForm();

  const backgroundImage = Platform.select({
    web: require("../../assets/images/CareLink.BackGround.Web.png"),
    default: require("../../assets/images/CareLink.BackGround.Mobile.png"),
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.modalBox}>
              
              <Pressable style={styles.closeButton} onPress={() => router.back()}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>

              <Text style={styles.title}>
                {role === 'helper' ? 'Helper Registration' : role === 'parent' ? 'Parent Registration' : 'Register for CareLink'}
              </Text>

              {/* Dynamic Role Display */}
              {role ? (
                <View style={[styles.roleBadgeContainer, { backgroundColor: role === 'parent' ? '#e6f2ff' : '#eafaf1', borderColor: role === 'parent' ? '#007AFF' : '#34C759' }]}>
                  <Ionicons name={role === 'parent' ? 'people' : 'briefcase'} size={20} color={role === 'parent' ? '#007AFF' : '#34C759'} />
                  <Text style={[styles.roleBadgeText, { color: role === 'parent' ? '#007AFF' : '#34C759' }]}>
                    Registering as a {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>I am a:</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={form.user_type} onValueChange={(value) => handleChange("user_type", value)} style={styles.picker}>
                      <Picker.Item label="-- Select Role --" value="" />
                      <Picker.Item label="Parent" value="parent" />
                      <Picker.Item label="Helper" value="helper" />
                    </Picker>
                  </View>
                </View>
              )}

              {/* Inputs */}
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <TextInput placeholder="First Name" style={styles.input} value={form.first_name} onChangeText={(v) => handleChange("first_name", v)} />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <TextInput placeholder="Last Name" style={styles.input} value={form.last_name} onChangeText={(v) => handleChange("last_name", v)} />
                </View>
              </View>

              <TextInput placeholder="Middle Name (Optional)" style={styles.input} value={form.middle_name} onChangeText={(v) => handleChange("middle_name", v)} />
              <TextInput placeholder="Email" style={styles.input} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => handleChange("email", v)} />

              <View style={styles.passwordContainer}>
                <TextInput placeholder="Password" secureTextEntry={!showPassword} style={styles.inputPassword} value={form.password} onChangeText={(v) => handleChange("password", v)} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" style={styles.eyeIcon} />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput placeholder="Confirm Password" secureTextEntry={!showConfirmPassword} style={styles.inputPassword} value={form.confirmpass} onChangeText={(v) => handleChange("confirmpass", v)} />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={24} color="gray" style={styles.eyeIcon} />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordRequirement}>
                <Text style={{color: isPasswordValid ? 'green' : '#d9534f', fontWeight: "500"}}>
                  {isPasswordValid ? '✓' : '*'} Minimum 8 characters, 1 number, 1 uppercase, 1 special character.
                </Text>
              </View>

              <Pressable style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]} onPress={handleSignUpScreen}>
                <Text style={styles.buttonText}>Sign Up</Text>
              </Pressable>

              <Text style={styles.loginText}>
                Already have an account?
                <Text style={styles.link} onPress={() => router.push("/login")}> Login Here</Text>
              </Text>

            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>

      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
        autoClose={notification.type === 'success'}
      />
    </SafeAreaView>
  );
}