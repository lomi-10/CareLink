// app/(auth)/signup.tsx
// PHP: auth/signup.php (via useSignupForm hook)
// Mobile: role-themed card (cream = parent, dark = helper)
// Web:    centered form on dark background, same theming

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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

import { AnimatedLogo } from "@/components/branding/AnimatedLogo";
import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import { NotificationModal } from "@/components/shared/NotificationModal";
import { useSignupForm } from "@/hooks/auth/useSignupForm";
import { PARENT_T, HELPER_T } from "@/constants/authThemes";
import { s, d } from "./signup.styles";

const WEB_BG = require("../../assets/images/login-bg-web.png");
const TRANS = { transitionDuration: "160ms", transitionProperty: "all", transitionTimingFunction: "ease" } as any;

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SignUpScreen() {
  const {
    role, form, handleChange,
    showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword,
    privacyConsent, setPrivacyConsent, loading,
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

  const title = role === 'parent' ? 'Household Employer registration'
    : role === 'helper'           ? 'Helper registration'
    :                               'Create account';

  const pw = form.password;
  const pwChecks = [
    { ok: pw.length >= 8,                              label: 'At least 8 characters' },
    { ok: /[a-z]/.test(pw),                            label: '1 lowercase' },
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
            Registering as a {role === 'parent' ? 'Household Employer' : 'Helper'}
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
            <Picker.Item label="Household Employer — hiring help" value="parent" />
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
          <Text style={[s.label, { color: t.label }]}>
            Last name <Text style={{ color: t.required }}>*</Text>
          </Text>
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
      <Text style={[s.label, { color: t.label }]}>
        Email <Text style={{ color: t.required }}>*</Text>
      </Text>
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

      {/* ── Mobile number ──
          Optional, but it becomes a second way to sign in — easier to remember
          than an email for many users. Validated in useSignupForm via lib/phone. */}
      <Text style={[s.label, { color: t.label }]}>
        Mobile number <Text style={{ color: t.placeholder, fontSize: 13 }}>(optional)</Text>
      </Text>
      <TextInput
        style={[s.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
        placeholder="0917 123 4567"
        placeholderTextColor={t.placeholder}
        keyboardType="phone-pad"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={16}
        value={form.phone}
        onChangeText={(v) => handleChange('phone', v)}
      />
      <Text style={[s.hint, { color: t.placeholder }]}>
        You&apos;ll be able to sign in with this number instead of your email.
      </Text>

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
      {/* Signup does a DNS lookup + sends the verification email before responding,
          so it can take several seconds. The spinner + disabled state are what stop
          an impatient second tap from racing the first and reporting the resulting
          account as "already registered". */}
      <Pressable
        style={[s.btn, { backgroundColor: t.btn, opacity: (!privacyConsent || loading) ? 0.5 : submitPressed ? 0.86 : 1 }]}
        onPressIn={() => setSubmitPressed(true)}
        onPressOut={() => setSubmitPressed(false)}
        onPress={handleSignUpScreen}
        disabled={!privacyConsent || loading}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={t.btnText} size="small" />
            <Text style={[s.btnText, { color: t.btnText }]}>Creating your account…</Text>
          </View>
        ) : (
          <Text style={[s.btnText, { color: t.btnText }]}>Create account</Text>
        )}
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
  // Split panel over the same photo login.tsx uses — brand + hero on the
  // left, a wide two-column form on the right. The old desktop view was just
  // the mobile card centered on a gradient; this gives it the same weight as
  // login instead of feeling like an afterthought.
  if (isDesktop) {
    // The mobile role themes assume the page BEHIND the card is a flat dark
    // gradient: the helper card is near-black (#3B1A08) and the parent card is
    // cream. Over the web background photo that falls apart — the helper card
    // becomes dark-brown-on-dark-brown with no edge, and the parent's pale gold
    // button on a cream card reads as disabled.
    //
    // So the web card gets one light, high-contrast surface for BOTH roles
    // (matching login.tsx), and role identity lives in the accent alone. This
    // shadows `t` for the desktop branch only; mobile is untouched.
    const t = {
      ...(role === 'helper' ? HELPER_T : PARENT_T),
      cardBg:      '#FDF9F3',
      inputBg:     '#FDF5E8',
      inputBorder: '#EFDCC0',
      inputText:   '#2A1608',
      label:       '#2A1608',
      placeholder: '#B8956A',
      optional:    '#9A7B5A',
      required:    role === 'helper' ? '#E86019' : '#B4762A',
      eye:         '#9A7B5A',
      pillBg:      role === 'helper' ? 'rgba(232,96,25,0.10)' : 'rgba(139,90,43,0.10)',
      pillBorder:  role === 'helper' ? 'rgba(232,96,25,0.28)' : 'rgba(139,90,43,0.28)',
      pillText:    '#2A1608',
      pillIcon:    role === 'helper' ? '#E86019' : '#8B5A2B',
      reqBg:       '#FFFFFF',
      reqBorder:   '#EFDCC0',
      reqText:     '#9A7B5A',
      // Saturated enough to read as a real primary action on a cream card.
      btn:         role === 'helper' ? '#E86019' : '#8B5A2B',
      btnText:     '#FFFFFF',
      footerText:  '#7A5C3E',
      footerLink:  role === 'helper' ? '#E86019' : '#8B5A2B',
    };

    return (
      <View style={d.page}>
        <Image source={WEB_BG} style={d.bgImage} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(20,10,4,0.72)", "rgba(20,10,4,0.30)", "rgba(20,10,4,0.55)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={d.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={d.shell}>

                {/* ── LEFT: brand + hero ── */}
                <View style={d.leftPanel}>
                  <View style={d.brandRow}>
                    <AnimatedLogo size={54} rings={false} glow float beat boxScale={1.3} entrance />
                    <View>
                      <Text style={d.brandName}>
                        <Text style={d.brandCare}>Care</Text>
                        <Text style={d.brandLink}>Link</Text>
                      </Text>
                      <Text style={d.brandTag}>Connecting homes with trusted help.</Text>
                    </View>
                  </View>

                  <Text style={d.heroTitle}>
                    {role === 'helper' ? (
                      <>Find work you{"\n"}can <Text style={d.heroAccent}>trust.</Text></>
                    ) : (
                      <>Hire help you{"\n"}can <Text style={d.heroAccent}>trust.</Text></>
                    )}
                  </Text>
                  <Text style={d.heroBody}>
                    {role === 'helper'
                      ? 'Every account is verified by your local PESO office, every contract follows DOLE Kasambahay Law, and you are never charged a peso to join.'
                      : 'Every helper is PESO-verified, every hire gets a DOLE-compliant contract with digital signing, and CareLink never holds your money.'}
                  </Text>

                  <Pressable
                    onPress={goBack}
                    style={({ hovered }: any) => [d.backRow, TRANS, hovered && { opacity: 0.7 }]}
                  >
                    <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.72)" />
                    <Text style={d.backText}>Back</Text>
                  </Pressable>
                </View>

                {/* ── RIGHT: wide two-column form ── */}
                <View style={[d.card, { backgroundColor: t.cardBg }]}>
                  <Text style={[d.title, { color: t.label }]}>{title}</Text>
                  <Text style={[d.subtitle, { color: t.footerText }]}>Create your account to get started.</Text>

                  {role ? (
                    <View style={[d.pill, { backgroundColor: t.pillBg, borderColor: t.pillBorder }]}>
                      <Ionicons name={role === 'parent' ? 'people' : 'briefcase'} size={16} color={t.pillIcon} />
                      <Text style={[d.pillText, { color: t.pillText }]}>
                        Registering as a {role === 'parent' ? 'Household Employer' : 'Helper'}
                      </Text>
                    </View>
                  ) : (
                    <View style={[s.pickerWrap, { backgroundColor: t.inputBg, borderColor: t.inputBorder, marginBottom: 18 }]}>
                      <Picker selectedValue={form.user_type} onValueChange={(v) => handleChange('user_type', v)} style={{ color: t.label }}>
                        <Picker.Item label="Select your role" value="" />
                        <Picker.Item label="Household Employer — hiring help" value="parent" />
                        <Picker.Item label="Helper — looking for work" value="helper" />
                      </Picker>
                    </View>
                  )}

                  <View style={d.gridRow}>
                    <View style={d.col}>
                      <Text style={[d.fieldLabel, { color: t.label }]}>First name <Text style={{ color: t.required }}>*</Text></Text>
                      <TextInput
                        style={[d.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
                        placeholder="Juan" placeholderTextColor={t.placeholder}
                        value={form.first_name} onChangeText={(v) => handleChange('first_name', v)}
                      />
                    </View>
                    <View style={d.col}>
                      <Text style={[d.fieldLabel, { color: t.label }]}>Last name <Text style={{ color: t.required }}>*</Text></Text>
                      <TextInput
                        style={[d.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
                        placeholder="Dela Cruz" placeholderTextColor={t.placeholder}
                        value={form.last_name} onChangeText={(v) => handleChange('last_name', v)}
                      />
                    </View>
                  </View>

                  <Text style={[d.fieldLabel, { color: t.label, marginTop: 14 }]}>Middle name <Text style={{ color: t.optional }}>(optional)</Text></Text>
                  <TextInput
                    style={[d.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText, marginBottom: 16 }]}
                    placeholder="Optional" placeholderTextColor={t.placeholder}
                    value={form.middle_name} onChangeText={(v) => handleChange('middle_name', v)}
                  />

                  <View style={d.gridRow}>
                    <View style={d.col}>
                      <Text style={[d.fieldLabel, { color: t.label }]}>Email <Text style={{ color: t.required }}>*</Text></Text>
                      <TextInput
                        style={[d.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
                        placeholder="you@email.com" placeholderTextColor={t.placeholder}
                        keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                        value={form.email} onChangeText={(v) => handleChange('email', v)}
                      />
                    </View>
                    <View style={d.col}>
                      <Text style={[d.fieldLabel, { color: t.label }]}>Mobile <Text style={{ color: t.optional }}>(optional)</Text></Text>
                      <TextInput
                        style={[d.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.inputText }]}
                        placeholder="0917 123 4567" placeholderTextColor={t.placeholder}
                        keyboardType="phone-pad" autoCapitalize="none" autoCorrect={false} maxLength={16}
                        value={form.phone} onChangeText={(v) => handleChange('phone', v)}
                      />
                    </View>
                  </View>
                  <Text style={[d.hint, { color: t.placeholder }]}>You can sign in with either your email or mobile number.</Text>

                  <View style={d.gridRow}>
                    <View style={d.col}>
                      <Text style={[d.fieldLabel, { color: t.label }]}>Password <Text style={{ color: t.required }}>*</Text></Text>
                      <View style={[d.pwRow, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
                        <TextInput
                          style={[d.pwInput, { color: t.inputText }]}
                          placeholder="Create a password" placeholderTextColor={t.placeholder}
                          secureTextEntry={!showPassword}
                          value={form.password} onChangeText={(v) => handleChange('password', v)}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={t.eye} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={d.col}>
                      <Text style={[d.fieldLabel, { color: t.label }]}>Confirm <Text style={{ color: t.required }}>*</Text></Text>
                      <View style={[d.pwRow, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
                        <TextInput
                          style={[d.pwInput, { color: t.inputText }]}
                          placeholder="Repeat password" placeholderTextColor={t.placeholder}
                          secureTextEntry={!showConfirmPassword}
                          value={form.confirmpass} onChangeText={(v) => handleChange('confirmpass', v)}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={8}>
                          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={t.eye} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Compact chips instead of the tall mobile checklist block —
                      the wide card has room to lay these out in one or two rows. */}
                  <View style={d.pwReqsRow}>
                    {pwChecks.map((c) => (
                      <View
                        key={c.label}
                        style={[d.pwReqChip, { backgroundColor: t.reqBg, borderWidth: 1, borderColor: c.ok ? '#10B981' : t.reqBorder }]}
                      >
                        <Ionicons name={c.ok ? 'checkmark-circle' : 'ellipse-outline'} size={12} color={c.ok ? '#10B981' : t.reqText} />
                        <Text style={[d.pwReqChipText, { color: c.ok ? '#10B981' : t.reqText }]}>{c.label}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={d.consentRow} activeOpacity={0.8} onPress={() => setPrivacyConsent(!privacyConsent)}>
                    <Ionicons name={privacyConsent ? 'checkbox' : 'square-outline'} size={19} color={privacyConsent ? t.btn : t.footerText} />
                    <Text style={[d.consentText, { color: t.footerText }]}>
                      I agree that CareLink may collect and process my personal information for recruitment and
                      employment matching purposes in accordance with{' '}
                      <Text style={{ textDecorationLine: 'underline' }} onPress={() => router.push('/privacy-policy' as any)}>
                        RA 10173 and NPC Circular 16-01
                      </Text>.
                    </Text>
                  </TouchableOpacity>

                  <Pressable
                    onPress={handleSignUpScreen}
                    disabled={!privacyConsent || loading}
                    style={({ hovered, pressed }: any) => [
                      d.submitBtn,
                      { backgroundColor: t.btn },
                      TRANS,
                      (!privacyConsent || loading) && { opacity: 0.5 },
                      hovered && privacyConsent && !loading && { transform: [{ translateY: -2 }], boxShadow: '0 10px 24px rgba(0,0,0,0.35)' },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator color={t.btnText} size="small" />
                        <Text style={[d.submitText, { color: t.btnText }]}>Creating your account…</Text>
                      </>
                    ) : (
                      <Text style={[d.submitText, { color: t.btnText }]}>Create account</Text>
                    )}
                  </Pressable>

                  <View style={d.footerRow}>
                    <Text style={[d.footerText, { color: t.footerText }]}>Already have an account? </Text>
                    <Pressable onPress={() => router.push('/login')} style={({ hovered }: any) => [TRANS, hovered && { opacity: 0.7 }]}>
                      <Text style={[d.footerLink, { color: t.footerLink }]}>Log in</Text>
                    </Pressable>
                  </View>
                </View>
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
            style={{ flex: 1, backgroundColor: '#1A0D04' }}
            contentContainerStyle={s.mobileScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
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

