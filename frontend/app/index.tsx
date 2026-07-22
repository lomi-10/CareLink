import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { BrandLoader } from "@/components/branding/BrandLoader";
import LandingPage from "@/components/landing/LandingPage";
import API_URL from "@/constants/api";
import { isProfileCompleted } from "@/hooks/auth/authProfile";

type Phase = "init" | "land" | "routed";

export default function Index() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("init");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = await AsyncStorage.getItem("user_token");
        const raw = await AsyncStorage.getItem("user_data");

        if (!token || !raw) {
          if (!cancelled) setPhase("land");
          return;
        }

        let user = JSON.parse(raw) as Record<string, unknown>;

        try {
          const res = await fetch(`${API_URL}/shared/get_user_status.php?user_id=${user.user_id}&requester_id=${user.user_id}`);
          const data = await res.json();
          if (data.success) {
            user = {
              ...user,
              status: data.status,
              profile_completed:
                data.details?.profile_completed ?? user.profile_completed,
            };
            await AsyncStorage.setItem("user_data", JSON.stringify(user));
          }
        } catch {
          /* use cached user */
        }

        if (cancelled) return;
        routeLoggedInUser(router, user);
        setPhase("routed");
      } catch (e) {
        console.error("Index auth bootstrap:", e);
        if (!cancelled) setPhase("land");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Auth bootstrap runs right after the splash hands off. A bare spinner on a
  // blank canvas (in the old legacy blue, no less) read as a second stutter —
  // reuse the exact same loader so splash -> boot -> landing is one motion.
  if (phase === "init") {
    return <BrandLoader message="Signing you in…" />;
  }

  if (phase === "land") {
    return <LandingPage />;
  }

  return null;
}

function routeLoggedInUser(router: ReturnType<typeof useRouter>, user: Record<string, unknown>) {
  const t = user.user_type as string | undefined;
  if (t === "admin") {
    router.replace("/admin/dashboard");
    return;
  }
  if (t === "peso") {
    router.replace("/(peso)/home");
    return;
  }
  if (t === "helper") {
    if (!isProfileCompleted(user)) router.replace("/(helper)/profile");
    else router.replace("/(helper)/home");
    return;
  }
  if (t === "parent") {
    if (!isProfileCompleted(user)) router.replace("/(parent)/profile");
    else router.replace("/(parent)/home");
    return;
  }
  router.replace("/login");
}
