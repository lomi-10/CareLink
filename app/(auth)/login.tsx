// app/(auth)/login.tsx
import React from "react";
import {
  ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView,
  Platform, Text, TextInput, TouchableOpacity, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Imports
import { NotificationModal } from "@/components/common/NotificationModal";
import { useLoginForm } from "@/hooks/auth/useLoginForm";
import { styles } from "./login.styles";

export default function LoginScreen() {
  const {
    email, setEmail, password, setPassword, showPassword, setShowPassword,
    loading, isLocked, notification, closeNotification, handleLogin, router
  } = useLoginForm();

  const backgroundImage = Platform.select({
    web: require("../../assets/images/CareLink.BackGround.Web.png"),
    default: require("../../assets/images/CareLink.BackGround.Mobile.png"),
  });

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        
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
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" style={styles.eyeIcon} />
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
              <Text style={styles.buttonText}>{isLocked ? "Locked" : "Log In"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/welcome")}> 
            <Text style={styles.back}>← Back to Welcome</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Global Notification Modal instead of custom UI */}
      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
        autoClose={notification.type === 'success' || notification.type === 'info'} 
      />
      
    </ImageBackground>
  );
}