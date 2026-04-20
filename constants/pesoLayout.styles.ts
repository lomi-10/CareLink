import { Platform, StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.color.canvasPeso,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },

  sidebar: {
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
    paddingVertical: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  sidebarWide: {
    width: 260,
    paddingHorizontal: 15,
  },
  sidebarCollapsed: {
    width: 80,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  mobileBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  mobileLogo: { fontSize: 18, fontWeight: '800', color: '#1A1C1E' },
  mobileSub: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  mobileMenuBtn: { padding: 8 },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    ...Platform.select({
      web: { justifyContent: 'center', padding: 20 },
      default: { justifyContent: 'flex-end' },
    }),
  },
  drawerSheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: '#fff',
    maxHeight: '85%',
    paddingBottom: 24,
    ...Platform.select({
      web: { borderRadius: 20 },
      default: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    }),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  drawerScroll: { paddingHorizontal: 8 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerItemText: { fontSize: 16, fontWeight: '600', color: '#1A1C1E' },
  drawerLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  drawerLogoutText: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1C1E',
  },
  logoSubtext: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  toggleBtn: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 10,
    marginRight: 5,
  },

  navLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    marginBottom: 12,
    marginLeft: 10,
    letterSpacing: 1.2,
  },
  navItems: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 6,
  },
  sidebarItemActive: {
    backgroundColor: '#FFF4E5',
  },
  sidebarText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
  },
  sidebarTextActive: {
    color: '#FF9500',
    fontWeight: '700',
  },

  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 10,
  },
  userText: {
    flex: 1,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  userRoleText: {
    fontSize: 12,
    color: '#999',
  },
  sidebarLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    gap: 8,
  },
  logoutTextSide: {
    color: '#FF3B30',
    fontWeight: '700',
    fontSize: 15,
  },

  mainContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 16,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#1A1C1E',
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
