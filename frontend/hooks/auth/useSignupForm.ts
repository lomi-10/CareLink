// hooks/auth/useSignupForm.ts
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import API_URL from "@/constants/api";
import { isValidPhMobile } from "@/lib/phone";

export interface FormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  /** PH mobile — required only when SMS is selected. Normalised server-side. */
  phone: string;
  user_type: string;
  password: string;
  confirmpass: string;
}

export function useSignupForm() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  
  const [form, setForm] = useState<FormData>({
    first_name: "", middle_name: "", last_name: "",
    email: "", phone: "", user_type: role || "", password: "", confirmpass: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationChannel, setVerificationChannelState] = useState<"email" | "sms">("email");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  // Signup validates the selected contact's email domain and sends one OTP before
  // responding, so it can take several seconds. Without this the button stayed live: an
  // impatient second tap raced the first, the first created the account, and the
  // second came back "email/mobile already registered" — making a SUCCESSFUL
  // signup look like a failure.
  const [loading, setLoading] = useState(false);

  // NEW: Single state for the NotificationModal!
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "info" as "success" | "error" | "warning" | "info"
  });

  const handleChange = (key: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const setVerificationChannel = (channel: "email" | "sms") => {
    setVerificationChannelState(channel);
    setForm(prev => channel === "email"
      ? { ...prev, phone: "" }
      : { ...prev, email: "" });
  };

  useEffect(() => {
    if (role && typeof role === "string") {
      setForm((prev) => ({ ...prev, user_type: role }));
    }
  }, [role]);

  useEffect(() => {
    const { password, confirmpass } = form;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasLength = password.length >= 8;
    const isEqual = password === confirmpass && password !== "";
    setIsPasswordValid(hasUpperCase && hasLowerCase && hasNumber && hasLength && hasSpecial && isEqual);
  }, [form.password, form.confirmpass]);

  const handleSignUpScreen = async () => {
    // Belt and braces: the button is disabled while loading, but guard the
    // function too — a fast double-tap can fire twice before React re-renders.
    if (loading) return;

    const { first_name, last_name, email, phone, user_type, password, confirmpass } = form;

    if (!first_name.trim() || !last_name.trim() || !user_type || !password || !confirmpass) {
      setNotification({ visible: true, message: "Please fill in all required fields.", type: "warning" });
      return;
    }

    if (verificationChannel === "email" && !email.trim()) {
      setNotification({ visible: true, message: "Enter an email address to receive your verification code.", type: "warning" });
      return;
    }

    if (verificationChannel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setNotification({ visible: true, message: "Please enter a valid email address.", type: "error" });
      return;
    }

    if (verificationChannel === "sms" && !phone.trim()) {
      setNotification({ visible: true, message: "Enter a mobile number to receive your verification code by SMS.", type: "warning" });
      return;
    }

    if (verificationChannel === "sms" && !isValidPhMobile(phone)) {
      setNotification({
        visible: true,
        message: "Please enter a valid Philippine mobile number, like 0917 123 4567.",
        type: "error",
      });
      return;
    }

    if (!isPasswordValid) {
      setNotification({ visible: true, message: "Please ensure your password meets all requirements.", type: "warning" });
      return;
    }

    if (!privacyConsent) {
      setNotification({ visible: true, message: "Please agree to the data privacy consent to continue.", type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/signup.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: verificationChannel === "email" ? email.trim() : "",
          phone: verificationChannel === "sms" ? phone.trim() : "",
          verification_channel: verificationChannel,
          privacy_consent: privacyConsent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Signup sends one 6-digit code through the channel the user selected.
        setNotification({
          visible: true,
          message: data.message || "Account created! Check your verification code.",
          type: "success",
        });

        setTimeout(() => {
          setNotification(prev => ({ ...prev, visible: false }));
          if (data.requires_verification) {
            router.replace({
              pathname: "/(auth)/verify-email",
              params: {
                email: data.email ?? form.email,
                user_id: String(data.user_id ?? ""),
                channel: data.verification_channel === "sms" ? "sms" : "email",
              },
            } as never);
          } else {
            router.replace("/login");
          }
        }, 1600);
        // Deliberately stay loading until we navigate away — releasing the button
        // during this 1.6s window would reopen the exact double-submit hole:
        // the account already exists, so a second tap returns "already registered".
      } else {
        setNotification({ visible: true, message: data.message || "Registration failed. Try again.", type: "error" });
        setLoading(false);
      }
    } catch (error) {
      setNotification({ visible: true, message: "Unable to connect to server.", type: "error" });
      setLoading(false);
    }
  };

  const closeNotification = () => setNotification(prev => ({ ...prev, visible: false }));

  return {
    role, form, handleChange, showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword, isPasswordValid,
    verificationChannel, setVerificationChannel,
    privacyConsent, setPrivacyConsent, loading,
    notification, closeNotification, handleSignUpScreen, router
  };
}