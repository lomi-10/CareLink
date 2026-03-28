// app/(parent)/post_job.styles.ts
import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  // ==========================================
  // 1. BASE CONTAINER
  // ==========================================
  container: {
    flex: 1,
    backgroundColor: '#7b8a99ff', // Kept your original background color
  },

  // ==========================================
  // 2. MOBILE HEADER (Matches jobs.tsx exactly)
  // ==========================================
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16, // Slightly taller for better touch targets
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 4 },
      web: { zIndex: 10 }, // Keeps header above scrolling content
    }),
  },
  menuButton: {
    padding: 4,
  },
  mobileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1C1E',
  },

  // ==========================================
  // 3. DESKTOP LAYOUT (Matches jobs.tsx exactly)
  // ==========================================
  desktopContentWrapper: {
    flex: 1,
    backgroundColor: '#7b8a99ff', 
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  desktopPageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1C1E',
    marginLeft: 16, // Adds space between the back button and the title
  },

  // ==========================================
  // 4. SHARED UI ELEMENTS
  // ==========================================
  backButton: {
    padding: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8, // Adds a nice subtle background to the back button
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 60,
  },
  formContainer: {
    width: '100%',
  },
  
  // Your excellent Document styling kept perfectly intact!
  formContainerDesktop: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
      },
    }),
  },

  // ==========================================
  // 5. BUTTONS
  // ==========================================
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#fff', // Changed to white so it's readable against your #7b8a99ff background!
    fontSize: 15,
    fontWeight: '600',
  },
});