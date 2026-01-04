import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RootIndexPage = () => {
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 1. Check for token AND user data
        const token = await AsyncStorage.getItem("user_token");
        const userDataStr = await AsyncStorage.getItem("user_data");

        if (token && userDataStr) {
          const userData = JSON.parse(userDataStr);

          // 2. SMART REDIRECT: Check the role!
          if (userData.user_type === 'admin') {
            router.replace("/admin/dashboard");
          } else {
            router.replace("/(tabs)/home");
          }
        } else {
          // Not logged in
          router.replace("/welcome");
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        router.replace("/welcome");
      }
    };

    checkAuthStatus();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default RootIndexPage;