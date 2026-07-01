// app/(auth)/signup.tsx
// PHP: auth/signup.php (via useSignupForm hook)
// Mobile: role-themed card (cream = parent, dark = helper)
// Web:    centered form on dark background, same theming

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { NotificationModal } from "@/components/shared/NotificationModal";
import { useSignupForm } from "@/hooks/auth/useSignupForm";
import { PARENT_T, HELPER_T } from "@/constants/authThemes";
import { s } from "./signup.styles";

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SignUpScreen() {
  const {
    role, form, handleChange,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    privacyConsent, setPrivacyConsent,
    notification, closeNotification,
    handleSignUpScreen, router,
  } = useSignupForm();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [submitPressed, setSubmitPressed] = useState(false);

  const t = role === 'parent' ? PARENT_T : HELPER_T;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const title = role === 'parent' ? 'Parent registration'
    : role === 'helper'           ? 'Helper registration'
    :                               'Create account';

  const pw = form.password;
  const pwChecks = [
    { ok: pw.length >= 8,                              label: 'At least 8 characters' },
    { ok: /[0-9]/.test(pw),                            label: '1 number' },
    { ok: /[A-Z]/.test(pw),                            label: '1 uppercase' },
    { ok: /[!@#$%^&*(),.?":{}|<>]/.test(pw),          label: '1 special character' },
  ];

  // ── Form card (shared between mobile and desktop) ─────────────────────────
  const formCard = (
    <View style={[s.card, { backgroundColor: t.cardBg }]}>

      {/* Role pill  —  or picker if no role was passed */}
      {role ? (
        <View style={[s.pill, { backgroundColor: t.pillBg, borderColor: t.pillBorder }]}>
          <Ionicons
            name={role === 'parent' ? 'people' : 'briefcase'}
            size={17}
            color={t.pillIcon}
          />
          <Text style={[s.pillText, { color: t.pillText }]}>
            Registering as a {role === 'parent' ? 'Parent' : 'Helper'}
          </Text>
        </View>
      ) : (
        <View style={[s.pickerWrap, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
          <Picker
            selectedValue={form.user_type}
            onValueChange={(v) => handleChange('user_type', v)}
            style={{ color: t.label }}
          >
            <Picker.Item label="Select your role" value="" />
            <Picker.Item label="Parent — hiring help" value="parent" />
            <Picker.Item label="Helper — looking for work" value="helper" />
          </Picker>
        </View>
      )}

      {/* ── First + Last name row ── */}
      <View style={s.nameRow}>
        <View style={{ flex: 1 }}>
          <Text style={[s.label, { color: t.label }]}>
            First name <Text style={{ color: t.required }}>*</Text>
          </Text>
          <TextInput
            style={[s.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
            placeholder="Juan"
            placeholderTextColor={t.placeholder}
            value={form.first_name}
            onChangeText={(v) => handleChange('first_name', v)}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[s.label, { color: t.label }]}>Last name</Text>
          <TextInput
            style={[s.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
            placeholder="Dela Cruz"
            placeholderTextColor={t.placeholder}
            value={form.last_name}
            onChangeText={(v) => handleChange('last_name', v)}
          />
        </View>
      </View>

      {/* ── Middle name ── */}
      <Text style={[s.label, { color: t.label }]}>
        Middle name <Text style={{ color: t.optional }}>(optional)</Text>
      </Text>
      <TextInput
        style={[s.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
        placeholder="Optional"
        placeholderTextColor={t.placeholder}
        value={form.middle_name}
        onChangeText={(v) => handleChange('middle_name', v)}
      />

      {/* ── Email ── */}
      <Text style={[s.label, { color: t.label }]}>Email</Text>
      <TextInput
        style={[s.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
        placeholder="you@email.com"
        placeholderTextColor={t.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={form.email}
        onChangeText={(v) => handleChange('email', v)}
      />

      {/* ── Password ── */}
      <Text style={[s.label, { color: t.label }]}>
        Password <Text style={{ color: t.required }}>*</Text>
      </Text>
      <View style={[s.pwRow, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
        <TextInput
          style={[s.pwInput, { color: t.inputText }]}
          placeholder="Create a strong password"
          placeholderTextColor={t.placeholder}
          secureTextEntry={!showPassword}
          value={form.password}
          onChangeText={(v) => handleChange('password', v)}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={t.eye} />
        </TouchableOpacity>
      </View>

      {/* ── Confirm password ── */}
      <Text style={[s.label, { color: t.label }]}>
        Confirm password <Text style={{ color: t.required }}>*</Text>
      </Text>
      <View style={[s.pwRow, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
        <TextInput
          style={[s.pwInput, { color: t.inputText }]}
          placeholder="Repeat password"
          placeholderTextColor={t.placeholder}
          secureTextEntry={!showConfirmPassword}
          value={form.confirmpass}
          onChangeText={(v) => handleChange('confirmpass', v)}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={t.eye} />
        </TouchableOpacity>
      </View>

      {/* ── Password requirements ── */}
      <View style={[s.pwReqs, { backgroundColor: t.reqBg, borderColor: t.reqBorder }]}>
        <View style={s.pwReqsHeader}>
          <Ionicons name="shield-checkmark-outline" size={14} color={t.reqText} />
          <Text style={[s.pwReqsTitle, { color: t.reqText }]}>Password must contain:</Text>
        </View>
        {pwChecks.map((c) => (
          <Text
            key={c.label}
            style={[s.pwReqItem, { color: c.ok ? '#10B981' : t.reqText }]}
          >
            {c.ok ? '✓ ' : '• '}{c.label}
          </Text>
        ))}
      </View>

      {/* ── Privacy consent (RA 10173 / NPC Circular 16-01) ── */}
      <TouchableOpacity
        style={s.consentRow}
        activeOpacity={0.8}
        onPress={() => setPrivacyConsent(!privacyConsent)}
      >
        <Ionicons
          name={privacyConsent ? 'checkbox' : 'square-outline'}
          size={20}
          color={privacyConsent ? t.btn : t.footerText}
        />
        <Text style={[s.consentText, { color: t.footerText }]}>
          I agree that CareLink may collect and process my personal information for
          recruitment and employment matching purposes in accordance with{' '}
          <Text
            style={{ textDecorationLine: 'underline' }}
            onPress={() => router.push('/privacy-policy' as any)}
          >
            RA 10173 and NPC Circular 16-01
          </Text>
          .
        </Text>
      </TouchableOpacity>

      {/* ── Submit ── */}
      {/* Plain array style (not a function) - NativeWind's css-interop wrapper drops
          function-form `style` on Pressable on native, leaving it unstyled. */}
      <Pressable
        style={[s.btn, { backgroundColor: t.btn, opacity: !privacyConsent ? 0.5 : submitPressed ? 0.86 : 1 }]}
        onPressIn={() => setSubmitPressed(true)}
        onPressOut={() => setSubmitPressed(false)}
        onPress={handleSignUpScreen}
        disabled={!privacyConsent}
      >
        <Text style={[s.btnText, { color: t.btnText }]}>Create account</Text>
      </Pressable>

      {/* ── Footer ── */}
      <Text style={[s.footerTxt, { color: t.footerText }]}>
        Already have an account?{' '}
        <Text
          style={{ color: t.footerLink, fontWeight: '700' }}
          onPress={() => router.push('/login')}
        >
          Log in
        </Text>
      </Text>
    </View>
  );

  // ── Shared page header (dark background area) ─────────────────────────────
  const pageHeader = (
    <>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerLogo}>
          <CareLinkLogoMark size={38} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.titleSection}>
        <Text style={s.eyebrow}>GET STARTED</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>Create your account to get started.</Text>
      </View>
    </>
  );

  // ── Desktop layout ────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: '#2A1608' }}>
        <LinearGradient
          colors={['#422919', '#2A1608', '#1A0D04']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={s.webScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={s.webContainer}>
                {pageHeader}
                {formCard}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <NotificationModal
          visible={notification.visible}
          message={notification.message}
          type={notification.type}
          onClose={closeNotification}
          autoClose={notification.type === 'success'}
        />
      </View>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#2A1608' }}>
      <LinearGradient
        colors={['#422919', '#2A1608', '#1A0D04']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={s.mobileScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {pageHeader}
            <View style={s.mobileCardWrap}>
              {formCard}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={closeNotification}
        autoClose={notification.type === 'success'}
      />
    </View>
  );
}

