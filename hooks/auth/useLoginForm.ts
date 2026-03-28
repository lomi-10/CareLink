// hooks/auth/useLoginForm.ts
import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "@/constants/api";

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

        // SUCCESS: Regular users
        await AsyncStorage.setItem("user_token", data.user.user_id.toString());
        await AsyncStorage.setItem("user_data", JSON.stringify(data.user));

        setAttemptsLeft(5);
        setNotification({ visible: true, message: data.message || "Welcome Back!", type: "success" });

        setTimeout(() => {
          setNotification(prev => ({ ...prev, visible: false }));
          if (data.user_type === "helper") router.replace("/(helper)/home"); 
          else router.replace("/(parent)/home");
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
          // PENDING USER
          await AsyncStorage.setItem("user_token", data.user.user_id.toString());
          await AsyncStorage.setItem("user_data", JSON.stringify(data.user));
          setAttemptsLeft(5);

          setNotification({ visible: true, message: "Account Pending. Setup your profile for PESO approval.", type: "info" });

          setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
            if (data.user_type === "helper") router.replace("/(helper)/home"); 
            else if (data.user_type === "parent") router.replace("/(parent)/home");
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