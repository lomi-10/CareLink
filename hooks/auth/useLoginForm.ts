// hooks/auth/useLoginForm.ts
import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "@/constants/api";
import { isProfileCompleted } from "./authProfile";

export function useLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login attempts tracking
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [isLocked, setIsLocked] = useState(false);

  // Unified Notification State
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
  });

  const handleLockout = () => {
    setIsLocked(true);
    setNotification({ visible: true, message: "Account locked for 1 minute.", type: "error" });
    
    setTimeout(() => {
      setIsLocked(false);
      setAttemptsLeft(5);
    }, 60000);
  };

  const handleLogin = async () => {
    if (isLocked) {
      setNotification({ visible: true, message: "Too many attempts. Please wait before trying again.", type: "warning" });
      return;
    }

    if (!email || !password) {
      const newAttempts = attemptsLeft - 1;
      setAttemptsLeft(newAttempts);
      setEmail("");
      setPassword("");

      if (newAttempts <= 0) handleLockout();
      else setNotification({ visible: true, message: `Please enter email and password.\n${newAttempts} attempts left.`, type: "warning" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // SECURITY CHECK: Block admin and peso users
        if (data.user_type === 'admin' || data.user_type === 'peso') {
          setEmail(""); setPassword("");
          setNotification({ visible: true, message: "Admin and PESO users must use the Admin Portal. Redirecting...", type: "warning" });
          
          setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
            router.push("/admin/adminlogin");
          }, 2000);
          return;
        }

        // SUCCESS: parent / helper — complete profile first when needed (Phase A)
        const mergedUser = {
          ...data.user,
          profile_completed: data.user.profile_completed,
          status: data.user.status ?? "approved",
        };
        await AsyncStorage.setItem("user_token", data.user.user_id.toString());
        await AsyncStorage.setItem("user_data", JSON.stringify(mergedUser));

        setAttemptsLeft(5);
        setNotification({ visible: true, message: data.message || "Welcome Back!", type: "success" });

        const go =
          data.user_type === "helper"
            ? !isProfileCompleted(mergedUser)
              ? "/(helper)/profile"
              : "/(helper)/home"
            : !isProfileCompleted(mergedUser)
              ? "/(parent)/profile"
              : "/(parent)/home";

        setTimeout(() => {
          setNotification(prev => ({ ...prev, visible: false }));
          router.replace(go);
        }, 1500);

      } else {
        // FAILURE HANDLING
        setEmail(""); setPassword("");

        if (data.reason === "wrong_password" || !data.reason) {
          const newAttempts = attemptsLeft - 1;
          setAttemptsLeft(newAttempts);

          if (newAttempts <= 0) handleLockout();
          else setNotification({ visible: true, message: `${data.message}\n${newAttempts} attempts left.`, type: "error" });
        
        } else if(data.reason === "Account Pending") {
          // PENDING USER (not yet approved by PESO — still complete profile & docs for verification)
          const mergedUser = {
            ...data.user,
            profile_completed: data.user.profile_completed,
            status: data.user.status ?? "pending",
          };
          await AsyncStorage.setItem("user_token", data.user.user_id.toString());
          await AsyncStorage.setItem("user_data", JSON.stringify(mergedUser));
          setAttemptsLeft(5);

          setNotification({ visible: true, message: "Account pending. Complete your profile and documents for PESO review.", type: "info" });

          const go =
            data.user_type === "helper"
              ? !isProfileCompleted(mergedUser)
                ? "/(helper)/profile"
                : "/(helper)/home"
              : data.user_type === "parent"
                ? !isProfileCompleted(mergedUser)
                  ? "/(parent)/profile"
                  : "/(parent)/home"
                : "/(parent)/home";

          setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
            router.replace(go);
          }, 2000);
        }
      }
    } catch (error) {
      setNotification({ visible: true, message: "Unable to connect to server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const closeNotification = () => setNotification(prev => ({ ...prev, visible: false }));

  return {
    email, setEmail, password, setPassword, showPassword, setShowPassword,
    loading, isLocked, notification, closeNotification, handleLogin, router
  };
}