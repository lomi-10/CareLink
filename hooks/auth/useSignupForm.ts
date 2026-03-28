// hooks/auth/useSignupForm.ts
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import API_URL from "@/constants/api";

export interface FormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  user_type: string;
  password: string;
  confirmpass: string;
}

export function useSignupForm() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  
  const [form, setForm] = useState<FormData>({
    first_name: "", middle_name: "", last_name: "",
    email: "", user_type: role || "", password: "", confirmpass: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  // NEW: Single state for the NotificationModal!
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "info" as "success" | "error" | "warning" | "info"
  });

  const handleChange = (key: keyof FormData, value: string) =>
    setForm({ ...form, [key]: value });

  useEffect(() => {
    const { password, confirmpass } = form;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasLength = password.length >= 8;
    const isEqual = password === confirmpass && password !== "";
    setIsPasswordValid(hasUpperCase && hasNumber && hasLength && hasSpecial && isEqual);
  }, [form.password, form.confirmpass]);

  const handleSignUpScreen = async () => {
    const { first_name, last_name, email, user_type, password, confirmpass } = form;

    if (!first_name || !last_name || !user_type || !email || !password || !confirmpass) {
      setNotification({ visible: true, message: "Please fill in all required fields.", type: "warning" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setNotification({ visible: true, message: "Please enter a valid email address.", type: "error" });
      return;
    }

    if (!isPasswordValid) {
      setNotification({ visible: true, message: "Please ensure your password meets all requirements.", type: "warning" });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/signup.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.success) {
        let successMessage = data.message;
        if (form.user_type === 'helper') successMessage = "Registration successful! Pending PESO verification.";
        else if (form.user_type === 'peso') successMessage = "PESO registration submitted. Pending approval.";
        
        setNotification({ visible: true, message: successMessage, type: "success" });

        // Wait for the modal to show, then redirect
        setTimeout(() => {
          setNotification(prev => ({ ...prev, visible: false }));
          router.replace("/login");
        }, 2000);
      } else {
        setNotification({ visible: true, message: data.message || "Registration failed. Try again.", type: "error" });
      }
    } catch (error) {
      setNotification({ visible: true, message: "Unable to connect to server.", type: "error" });
    }
  };

  const closeNotification = () => setNotification(prev => ({ ...prev, visible: false }));

  return {
    role, form, handleChange, showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword, isPasswordValid,
    notification, closeNotification, handleSignUpScreen, router
  };
}