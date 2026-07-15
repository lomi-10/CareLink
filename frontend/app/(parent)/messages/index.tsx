// app/(parent)/messages/index.tsx
// PHP: messages/get_conversations.php, messages/get_messages.php, messages/send_message.php, messages/upload_image.php, messages/edit_message.php
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useConversations, Conversation } from '@/hooks/shared';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { Sidebar, MobileMenu, ParentTabBar, ParentWorkModeTabBar } from '@/components/parent/home';
import { useParentPortalMode } from '@/hooks/parent/useParentPortalMode';
import { useParentProfile } from '@/hooks/parent';
import { ParentMessagesWeb } from '@/components/parent/web/ParentMessagesWeb';
import { LoadingSpinner, ConfirmationModal, NotificationModal } from '@/components/shared/';
import { BG, BROWN, CARAMEL, DARK, MUTED, SUBTLE } from '@/components/parent/home/parentWarmTheme';
import { s, ACCENT } from './messages.styles';
import { ConvItem } from './components';
import ChatPanel from './ChatPanel';

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ParentMessages() {
  const router           = useRouter();
  const { isDesktop }    = useResponsive();
  const { handleLogout, getFullName } = useAuth();
  const { profileData } = useParentProfile();
  const { unreadCount: notifUnread } = useNotifications('parent');
  const isWorkMode = useParentPortalMode();
  const params = useLocalSearchParams<{ partner_id?: string; partner_name?: string; job_post_id?: string }>();

  const { conversations, loading: loadingConvs, refresh } = useConversations();

  const [activePartner,        setActivePartner]        = useState<Conversation | null>(null);
  const [isMobileMenuOpen,     setIsMobileMenuOpen]     = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);
  const [convSearch,           setConvSearch]           = useState('');

  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setConfirmLogoutVisible(true);
  };
  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  useEffect(() => {
    if (!params.partner_id || loadingConvs) return;
    const found = conversations.find(c => String(c.partner_id) === params.partner_id);
    if (found) {
      setActivePartner(found);
    } else if (params.partner_name) {
      setActivePartner({
        partner_id:    Number(params.partner_id),
        partner_name:  decodeURIComponent(params.partner_name),
        partner_type:  'helper',
        partner_photo: null,
        last_message:  null,
        last_sent_at:  new Date().toISOString(),
        is_mine:       false,
        unread_count:  0,
        job_post_id:   params.job_post_id ? Number(params.job_post_id) : null,
        job_title:     null,
        has_messages:  false,
        application_status: null,
      });
    }
  }, [params.partner_id, params.partner_name, loadingConvs]);

  const filteredConvs = convSearch.trim()
    ? conversations.filter(c =>
        c.partner_name.toLowerCase().includes(convSearch.toLowerCase()) ||
        (c.job_title ?? '').toLowerCase().includes(convSearch.toLowerCase())
      )
    : conversations;

  const openPartner = useCallback((conv: Conversation) => {
    setActivePartner(conv);
  }, []);

  const ConvList = (
    <>
      {/* Search */}
      <View style={s.convSearch}>
        <Ionicons name="search" size={16} color={MUTED} style={{ marginRight: 6 }} />
        <TextInput
          style={s.convSearchInput}
          value={convSearch}
          onChangeText={setConvSearch}
          placeholder="Search conversation"
          placeholderTextColor={SUBTLE}
        />
        {convSearch.length > 0 && (
          <TouchableOpacity onPress={() => setConvSearch('')}>
            <Ionicons name="close-circle" size={16} color={SUBTLE} />
          </TouchableOpacity>
        )}
      </View>

      {loadingConvs ? (
        <LoadingSpinner visible />
      ) : filteredConvs.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="chatbubbles-outline" size={52} color={SUBTLE} />
          <Text style={s.emptyTitle}>{convSearch ? 'No matches' : 'No messages yet'}</Text>
          <Text style={s.emptySub}>
            {convSearch ? 'Try a different name.' : 'Post a job and start chatting with helpers.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConvs}
          keyExtractor={c => String(c.partner_id)}
          renderItem={({ item }) => (
            <ConvItem
              item={item}
              onPress={() => openPartner(item)}
              active={activePartner?.partner_id === item.partner_id}
            />
          )}
          contentContainerStyle={{ paddingBottom: 88 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (!isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        {!activePartner ? (
          <SafeAreaView style={{ flex: 1 }}>
            <View style={s.mobileHeader}>
              <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={s.menuBtn}>
                <Ionicons name="menu-outline" size={26} color={DARK} />
              </TouchableOpacity>
              <Text style={s.mobileTitle}>Messages</Text>
              <TouchableOpacity
                style={[s.menuBtn, { position: 'relative' }]}
                onPress={() => router.push('/(parent)/notifications')}
                activeOpacity={0.8}
              >
                <Ionicons name={notifUnread > 0 ? 'notifications' : 'notifications-outline'} size={24} color={BROWN} />
                {notifUnread > 0 && (
                  <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7,
                    backgroundColor: CARAMEL, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                    <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>
                      {notifUnread > 9 ? '9+' : notifUnread}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={s.contractFlowHintBar}>
              <Ionicons name="document-text-outline" size={14} color={MUTED} />
              <Text style={s.contractFlowHintText}>
                After you message a helper and agree on terms, the next step is generating your employment contract.
              </Text>
            </View>
            {ConvList}
          </SafeAreaView>
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
            <ChatPanel
              partnerId={activePartner.partner_id}
              partnerName={activePartner.partner_name}
              partnerPhoto={activePartner.partner_photo}
              jobPostId={activePartner.job_post_id}
              onBack={() => { setActivePartner(null); refresh(); }}
            />
          </SafeAreaView>
        )}

        {!activePartner ? (isWorkMode ? <ParentWorkModeTabBar /> : <ParentTabBar />) : null}

        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          handleLogout={initiateLogout}
          notificationUnread={notifUnread}
        />
        <ConfirmationModal
          visible={confirmLogoutVisible}
          title="Log Out"
          message="Are you sure you want to log out?"
          confirmText="Log Out"
          cancelText="Cancel"
          type="danger"
          onConfirm={executeLogout}
          onCancel={() => setConfirmLogoutVisible(false)}
        />
        <NotificationModal
          visible={successLogoutVisible}
          message="Logged Out Successfully!"
          type="success"
          autoClose
          duration={1500}
          onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }}
        />
      </View>
    );
  }

  // ── Desktop layout (redesigned web screen) ───────────────────────────────────
  return (
    <>
      <ParentMessagesWeb
        userName={getFullName()}
        avatar={(profileData?.profile?.profile_image as string) ?? null}
        verified={profileData?.profile?.verification_status === 'Verified'}
        onLogout={initiateLogout}
      />
      <ConfirmationModal
        visible={confirmLogoutVisible}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={executeLogout}
        onCancel={() => setConfirmLogoutVisible(false)}
      />
      <NotificationModal
        visible={successLogoutVisible}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }}
      />
    </>
  );
}
