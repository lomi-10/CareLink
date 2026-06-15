// app/(helper)/messages/index.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useConversations, useAuth, useResponsive, useNotifications, Conversation } from '@/hooks/shared';
import { Sidebar, MobileMenu, HelperTabBar } from '@/components/helper/home';
import { WorkModeTabBar } from '@/components/helper/work';
import { LoadingSpinner, ConfirmationModal, NotificationModal } from '@/components/shared/';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import {
  createHelperMessagesStyles,
  DARK, MUTED, SUBTLE, ORANGE, PAGE_BG,
} from './messages.styles';
import { MessagesAppearanceContext, MessagesAppearanceValue, useMessagesAppearance } from './messagesAppearance';
import { ConvItem } from './components';
import ChatPanel from './ChatPanel';

// ─── Main screen ──────────────────────────────────────────────────────────────

function HelperMessagesContent() {
  const { s } = useMessagesAppearance();
  const router           = useRouter();
  const { isDesktop }    = useResponsive();
  const { handleLogout } = useAuth();
  const { unreadCount: notifUnread } = useNotifications('helper');
  const { isWorkMode, activeHire } = useHelperWorkMode();
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
        partner_type:  'parent',
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
          placeholder="Search conversations…"
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
            {convSearch ? 'Try a different name.' : 'Apply to a job and start chatting with a parent.'}
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
          contentContainerStyle={{ paddingBottom: !activePartner ? 88 : 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (!isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
        {!activePartner ? (
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <View style={s.mobileHeader}>
                <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={s.menuBtn}>
                  <Ionicons name="menu" size={26} color={DARK} />
                </TouchableOpacity>
                <Text style={s.mobileTitle}>Messages</Text>
                <TouchableOpacity
                  style={s.notifBtn}
                  onPress={() => router.push('/(helper)/notifications')}
                  activeOpacity={0.7}
                >
                  <Ionicons name={notifUnread > 0 ? 'notifications' : 'notifications-outline'} size={22} color={DARK} />
                  {notifUnread > 0 && (
                    <View style={s.notifBadge}>
                      <Text style={s.notifBadgeText}>{notifUnread > 9 ? '9+' : notifUnread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              {ConvList}
            </View>
            {isWorkMode && activeHire ? <WorkModeTabBar /> : <HelperTabBar />}
          </SafeAreaView>
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: PAGE_BG }}>
            <ChatPanel
              partnerId={activePartner.partner_id}
              partnerName={activePartner.partner_name}
              partnerPhoto={activePartner.partner_photo}
              jobPostId={activePartner.job_post_id}
              onBack={() => { setActivePartner(null); refresh(); }}
            />
          </SafeAreaView>
        )}

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

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <>
      <View style={s.desktopWrap}>
        <Sidebar onLogout={initiateLogout} />
        <View style={s.desktopMain}>
        {/* Conversation list panel */}
        <View style={s.convPanel}>
          <View style={s.convPanelHeader}>
            <Text style={s.convPanelTitle}>Messages</Text>
            <Text style={s.convPanelCount}>{conversations.length}</Text>
          </View>
          {ConvList}
        </View>

        {/* Chat panel */}
        <View style={s.chatPanelWrap}>
          {activePartner ? (
            <ChatPanel
              partnerId={activePartner.partner_id}
              partnerName={activePartner.partner_name}
              partnerPhoto={activePartner.partner_photo}
              jobPostId={activePartner.job_post_id}
            />
          ) : (
            <View style={s.noChatWrap}>
              <View style={s.noChatIcon}>
                <Ionicons name="chatbubbles-outline" size={56} color={ORANGE} />
              </View>
              <Text style={s.noChatTitle}>Your Messages</Text>
              <Text style={s.noChatSub}>
                Select a conversation to start chatting, or apply to a job to connect with a parent.
              </Text>
            </View>
          )}
        </View>
        </View>
      </View>
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

export default function HelperMessages() {
  const s = useMemo(() => createHelperMessagesStyles(), []);
  const appearance = useMemo((): MessagesAppearanceValue => ({ s }), [s]);
  return (
    <MessagesAppearanceContext.Provider value={appearance}>
      <HelperMessagesContent />
    </MessagesAppearanceContext.Provider>
  );
}
