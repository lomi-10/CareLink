// app/(auth)/signup.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import { NotificationModal } from "@/components/shared/NotificationModal";
import { theme } from "@/constants/theme";
import { useSignupForm } from "@/hooks/auth/useSignupForm";
import { styles } from "./signup.styles";

const ph = theme.color.subtle;

export default function SignUpScreen() {
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
    router,
  } = useSignupForm();

  const backgroundImage = Platform.select({
    web: require("../../assets/images/CareLink.BackGround.Web.png"),
    default: require("../../assets/images/CareLink.BackGround.Mobile.png"),
  });

  const roleTint =
    role === "parent"
      ? { bg: theme.color.parentSoft, border: theme.color.parent, fg: theme.color.parent }
      : role === "helper"
        ? { bg: theme.color.helperSoft, border: theme.color.helper, fg: theme.color.helper }
        : { bg: theme.color.surface, border: theme.color.line, fg: theme.color.muted };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Pressable style={styles.closeButton} onPress={goBack} hitSlop={12}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>

              <Text style={styles.kicker}>Create account</Text>
              <Text style={styles.title}>
                {role === "helper"
                  ? "Helper registration"
                  : role === "parent"
                    ? "Parent registration"
                    : "Join CareLink"}
              </Text>
              <Text style={styles.subtitle}>
                You’ll complete your profile and documents next for PESO verification.
              </Text>

              {role ? (
                <View
                  style={[
                    styles.roleBadgeContainer,
                    { backgroundColor: roleTint.bg, borderColor: roleTint.border },
                  ]}
                >
                  <Ionicons
                    name={role === "parent" ? "people" : "briefcase"}
                    size={20}
                    color={roleTint.fg}
                  />
                  <Text style={[styles.roleBadgeText, { color: roleTint.fg }]}>
                    Registering as a {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>I am a</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={form.user_type}
                      onValueChange={(value) => handleChange("user_type", value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select role" value="" />
                      <Picker.Item label="Parent — hiring help" value="parent" />
                      <Picker.Item label="Helper — looking for work" value="helper" />
                    </Picker>
                  </View>
                </View>
              )}

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>First name <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    placeholder="Juan"
                    placeholderTextColor={ph}
                    style={styles.input}
                    value={form.first_name}
                    onChangeText={(v) => handleChange("first_name", v)}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Last name <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    placeholder="Dela Cruz"
                    placeholderTextColor={ph}
                    style={styles.input}
                    value={form.last_name}
                    onChangeText={(v) => handleChange("last_name", v)}
                  />
                </View>
              </View>

              <Text style={styles.label}>Middle name <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                placeholder="Optional"
                placeholderTextColor={ph}
                style={styles.input}
                value={form.middle_name}
                onChangeText={(v) => handleChange("middle_name", v)}
              />
              <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
              <TextInput
                placeholder="you@email.com"
                placeholderTextColor={ph}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={form.email}
                onChangeText={(v) => handleChange("email", v)}
              />

              <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Create a strong password"
                  placeholderTextColor={ph}
                  secureTextEntry={!showPassword}
                  style={styles.inputPassword}
                  value={form.password}
                  onChangeText={(v) => handleChange("password", v)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color={theme.color.muted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm password <Text style={styles.required}>*</Text></Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Repeat password"
                  placeholderTextColor={ph}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.inputPassword}
                  value={form.confirmpass}
                  onChangeText={(v) => handleChange("confirmpass", v)}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={22}
                    color={theme.color.muted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordRequirement}>
                <Text
                  style={[
                    styles.passwordRequirementText,
                    { color: isPasswordValid ? theme.color.success : theme.color.danger },
                  ]}
                >
                  {isPasswordValid ? "✓ " : "• "}
                  At least 8 characters, 1 number, 1 uppercase, 1 special character, and matching confirmation.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [styles.button, { opacity: pressed ? 0.88 : 1 }]}
                onPress={handleSignUpScreen}
              >
                <Text style={styles.buttonText}>Create account</Text>
              </Pressable>

              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={styles.link} onPress={() => router.push("/login")}>
                  Log in
                </Text>
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
        autoClose={notification.type === "success"}
      />
    </SafeAreaView>
  );
}
