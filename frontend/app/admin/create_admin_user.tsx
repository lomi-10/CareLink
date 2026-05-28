import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { NotificationModal } from '@/components/shared';
import API_URL from "../../constants/api";

export default function CreateAdminUserScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("error");

  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    password: "",
    user_type: "peso", // Default to peso
  });

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setModalMessage("Please fill in all required fields to create an account.");
      setModalType("error");
      setModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin_create_user.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (data.success) {
        setModalMessage(data.message || "Account created successfully!");
        setModalType("success");
        setModalVisible(true);
        setTimeout(() => {
          setModalVisible(false);
          router.back();
        }, 1500);
      } else {
        setModalMessage(data.message || "An unknown error occurred while creating the account.");
        setModalType("error");
        setModalVisible(true);
      }
    } catch (error) {
      console.error(error);
      setModalMessage("Unable to connect to the server. Please check your network and try again.");
      setModalType("error");
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NotificationModal
        visible={modalVisible}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalVisible(false)}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Admin/PESO Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={styles.input}
          value={form.first_name}
          onChangeText={(v) => setForm({ ...form, first_name: v })}
          placeholder="First Name"
        />

        <Text style={styles.label}>Middle Name (Optional)</Text>
        <TextInput
          style={styles.input}
          value={form.middle_name}
          onChangeText={(v) => setForm({ ...form, middle_name: v })}
          placeholder="Middle Name"
        />

        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={styles.input}
          value={form.last_name}
          onChangeText={(v) => setForm({ ...form, last_name: v })}
          placeholder="Last Name"
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={form.password}
          onChangeText={(v) => setForm({ ...form, password: v })}
          placeholder="Password"
          secureTextEntry
        />

        <Text style={styles.label}>Account Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.user_type}
            onValueChange={(v) => setForm({ ...form, user_type: v })}
            style={styles.picker}
          >
            <Picker.Item label="PESO Officer" value="peso" />
            <Picker.Item label="Super Admin" value="admin" />
          </Picker>
        </View>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  formContainer: { padding: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#666", marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 30,
    overflow: "hidden",
  },
  picker: { height: 50, width: "100%" },
  submitButton: {
    backgroundColor: "#004080",
    height: 55,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
