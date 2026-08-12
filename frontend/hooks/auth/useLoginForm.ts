// hooks/auth/useLoginForm.ts
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "@/constants/api";
import { isProfileCompleted } from "./authProfile";

const LOCK_KEY = "login_lock_until";
const ATTEMPTS_KEY = "login_attempts_left";
const LOCK_MS = 60_000;

export function useLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login attempts tracking.
  //
  // Persisted, because these were plain useState: leaving the login screen
  // unmounted the hook and the lock evaporated, so "5 attempts then locked"
  // could be bypassed by pressing home and coming back. Storing the lock
  // EXPIRY (not a countdown) also means it survives the app being killed —
  // a timer alone would not.
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [isLocked, setIsLocked] = useState(false);

  /** Re-read the persisted lock; also clears it once the window has passed. */
  const syncLock = useCallback(async () => {
    try {
      const [untilRaw, attemptsRaw] = await Promise.all([
        AsyncStorage.getItem(LOCK_KEY),
        AsyncStorage.getItem(ATTEMPTS_KEY),
      ]);
      const until = Number(untilRaw ?? 0);
      if (until > Date.now()) {
        setIsLocked(true);
        setAttemptsLeft(0);
        // Re-check when the window expires so the form unlocks on its own.
        setTimeout(() => { void syncLock(); }, Math.min(until - Date.now() + 250, LOCK_MS));
      } else {
        if (untilRaw) await AsyncStorage.multiRemove([LOCK_KEY, ATTEMPTS_KEY]);
        setIsLocked(false);
        setAttemptsLeft(untilRaw ? 5 : Math.max(0, Number(attemptsRaw ?? 5) || 5));
      }
    } catch { /* storage unavailable — fall back to in-memory only */ }
  }, []);

  useEffect(() => { void syncLock(); }, [syncLock]);

  // Unified Notification State
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
  });

  const handleLockout = async () => {
    setIsLocked(true);
    setNotification({ visible: true, message: "Account locked for 1 minute.", type: "error" });
    try {
      await AsyncStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_MS));
      await AsyncStorage.setItem(ATTEMPTS_KEY, "0");
    } catch { /* in-memory lock still applies for this session */ }

    setTimeout(() => { void syncLock(); }, LOCK_MS);
  };

  const handleLogin = async () => {
    if (isLocked) {
      setNotification({ visible: true, message: "Too many attempts. Please wait before trying again.", type: "warning" });
      return;
    }

    if (!email || !password) {
      setNotification({ visible: true, message: "Please enter your email and password.", type: "warning" });
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
            // Route exists; expo typed routes may lag behind file-based routes
            router.push("/admin/adminlogin" as never);
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
        // A successful sign-in clears the persisted counter too.
        try { await AsyncStorage.multiRemove([LOCK_KEY, ATTEMPTS_KEY]); } catch {}
        setNotification({ visible: true, message: data.message || "Welcome Back!", type: "success" });

        // Always land on Home — the guided profile-setup coach lives there, so
        // incomplete users see exactly what to do next instead of a bare profile.
        const go = data.user_type === "helper" ? "/(helper)/home" : "/(parent)/home";

        setTimeout(() => {
          setNotification(prev => ({ ...prev, visible: false }));
          router.replace(go as never);
        }, 1500);

      } else {
        // FAILURE HANDLING
        setPassword("");

        if (data.reason === "email_unverified") {
          // Correct password, unverified inbox — send them to finish verifying
          // instead of burning a login attempt on something that isn't their fault.
          setNotification({ visible: true, message: data.message, type: "info" });
          setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
            router.push({
              pathname: "/(auth)/verify-email",
              params: { email: data.email ?? email, user_id: String(data.user_id ?? "") },
            } as never);
          }, 1200);

        } else if (data.reason === "wrong_password" || !data.reason) {
          const newAttempts = attemptsLeft - 1;
          setAttemptsLeft(newAttempts);
          // Persisted so the count can't be reset by leaving and returning.
          try { await AsyncStorage.setItem(ATTEMPTS_KEY, String(Math.max(0, newAttempts))); } catch {}

          if (newAttempts <= 0) await handleLockout();
          else setNotification({ visible: true, message: `${data.message || "Incorrect email or password."}\n${newAttempts} attempt${newAttempts !== 1 ? "s" : ""} left.`, type: "error" });

        } else if (data.reason === "Account Pending") {
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

          const go = data.user_type === "helper" ? "/(helper)/home" : "/(parent)/home";

          setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
            router.replace(go as never);
          }, 2000);
        } else {
          // Unhandled reason — still show the server message
          setNotification({ visible: true, message: data.message || "Login failed. Please try again.", type: "error" });
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