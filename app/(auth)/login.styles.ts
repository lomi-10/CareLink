// app/(auth)/login.styles.ts
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { 
    flex: 1, 
    justifyContent: "center", 
    paddingHorizontal: 20, 
    width: '100%', 
    maxWidth: 450, 
    alignSelf: 'center' 
  },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", color: "#000", marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: "center", color: "#000", marginBottom: 30 },
  form: { 
    backgroundColor: "rgba(255,255,255,0.9)", 
    borderRadius: 12, 
    padding: 25, 
    shadowColor: "#000", 
    shadowOpacity: 0.2, 
    shadowRadius: 5, 
    elevation: 5 
  },
  input: { 
    height: 50, 
    borderColor: "#ccc", 
    borderWidth: 1, 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    marginBottom: 15, 
    backgroundColor: "#fff", 
    color: "#000" 
  },
  passwordContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    height: 50, 
    borderColor: "#ccc", 
    borderWidth: 1, 
    borderRadius: 8, 
    marginBottom: 15, 
    backgroundColor: "#fff", 
    paddingHorizontal: 15 
  },
  inputPassword: { flex: 1, height: "100%", color: "#000" },
  eyeIcon: { paddingLeft: 10 },
  link: { color: "#007AFF", fontSize: 14, textAlign: "right", marginBottom: 20 },
  button: { backgroundColor: "#000", paddingVertical: 15, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  back: { textAlign: "center", marginTop: 20, color: "#000", fontSize: 14, textDecorationLine: "underline" },
});