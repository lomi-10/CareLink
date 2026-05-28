import React, { useState } from 'react';

import {

  View,

  Text,

  Modal,

  TextInput,

  TouchableOpacity,

  StyleSheet,

  ActivityIndicator,

  KeyboardAvoidingView,

  Platform,

} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '@/constants/theme';

import { submitPlacementReview } from '@/lib/reviewsApi';

import { NotificationModal } from '@/components/shared/NotificationModal';



type Props = {

  visible: boolean;

  onClose: () => void;

  applicationId: number;

  userType: 'parent' | 'helper';

  counterpartyName: string;

  jobTitle?: string;

  accentColor?: string;

  onSubmitted?: () => void;

};



export function PlacementReviewModal({

  visible,

  onClose,

  applicationId,

  userType,

  counterpartyName,

  jobTitle,

  accentColor = theme.color.parent,

  onSubmitted,

}: Props) {

  const [rating, setRating] = useState(0);

  const [comment, setComment] = useState('');

  const [busy, setBusy] = useState(false);

  const [inlineErr, setInlineErr] = useState<string | null>(null);

  const [toast, setToast] = useState<{

    visible: boolean;

    type: 'success' | 'error' | 'info';

    message: string;

    title?: string;

  }>({ visible: false, type: 'info', message: '' });



  const submit = async () => {

    setInlineErr(null);

    if (rating < 1) {

      const msg = 'Tap a star rating first.';

      setToast({ visible: true, type: 'info', message: msg, title: 'Review' });

      setInlineErr(msg);

      return;

    }

    const raw = await AsyncStorage.getItem('user_data');

    if (!raw) {

      const msg = 'Please sign in again.';

      setToast({ visible: true, type: 'error', message: msg, title: 'Review' });

      setInlineErr(msg);

      return;

    }

    const user = JSON.parse(raw) as { user_id: string };

    const userId = Number(user.user_id);

    setBusy(true);

    try {

      const res = await submitPlacementReview({

        application_id: applicationId,

        user_id: userId,

        user_type: userType,

        rating,

        comment: comment.trim() || undefined,

      });

      if (!res.success) {

        const msg = res.message || 'Could not save.';

        setToast({ visible: true, type: 'error', message: msg, title: 'Review' });

        setInlineErr(msg);

        return;

      }

      setRating(0);

      setComment('');

      setToast({

        visible: true,

        type: 'success',

        title: 'Thank you',

        message: 'Your review helps keep CareLink trustworthy for families and helpers.',

      });

      onSubmitted?.();

      setTimeout(() => {

        onClose();

      }, 380);

    } finally {

      setBusy(false);

    }

  };



  return (

    <>

      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>

        <KeyboardAvoidingView

          behavior={Platform.OS === 'ios' ? 'padding' : undefined}

          style={styles.overlay}

        >

          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

          <View style={[styles.cardWrap, Platform.OS === 'web' && styles.cardWrapWeb]}>

            <View style={styles.card}>

              <View style={styles.head}>

                <Text style={styles.title}>Rate your experience</Text>

                <TouchableOpacity onPress={onClose} hitSlop={12}>

                  <Ionicons name="close" size={24} color={theme.color.ink} />

                </TouchableOpacity>

              </View>

              <Text style={styles.sub}>

                {jobTitle ? `${jobTitle} · ` : ''}

                {counterpartyName}

              </Text>

              <Text style={styles.note}>
                {
                  "You're reviewing a placement that has already ended. Thanks for helping keep CareLink trustworthy for families and helpers."
                }
              </Text>

              <View style={styles.stars}>

                {[1, 2, 3, 4, 5].map((n) => (

                  <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={8}>

                    <Ionicons

                      name={n <= rating ? 'star' : 'star-outline'}

                      size={36}

                      color={n <= rating ? accentColor : theme.color.lineStrong}

                    />

                  </TouchableOpacity>

                ))}

              </View>

              <Text style={styles.label}>Optional comment</Text>

              <TextInput

                style={styles.input}

                value={comment}

                onChangeText={setComment}

                placeholder="What went well? What could improve?"

                placeholderTextColor={theme.color.subtle}

                multiline

              />

              {inlineErr ? <Text style={styles.inlineErr}>{inlineErr}</Text> : null}

              <TouchableOpacity

                style={[styles.btn, { backgroundColor: accentColor }, busy && { opacity: 0.7 }]}

                onPress={() => void submit()}

                disabled={busy}

              >

                {busy ? (

                  <ActivityIndicator color="#fff" />

                ) : (

                  <Text style={styles.btnText}>Submit review</Text>

                )}

              </TouchableOpacity>

            </View>

          </View>

        </KeyboardAvoidingView>

      </Modal>

      <NotificationModal

        visible={toast.visible}

        type={toast.type}

        title={toast.title}

        message={toast.message}

        onClose={() => setToast((t) => ({ ...t, visible: false }))}

        autoClose

        duration={toast.type === 'error' ? 4500 : 3200}

      />

    </>

  );

}



const styles = StyleSheet.create({

  overlay: { flex: 1, justifyContent: 'center', padding: 20 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.overlay },

  cardWrap: {},

  cardWrapWeb: {

    width: '100%',

    maxWidth: 480,

    alignSelf: 'center',

  },

  card: {

    backgroundColor: theme.color.surfaceElevated,

    borderRadius: 20,

    padding: 22,

    ...theme.shadow.card,

  },

  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  title: { fontSize: 20, fontWeight: '900', color: theme.color.ink },

  sub: { fontSize: 15, fontWeight: '600', color: theme.color.parent, marginTop: 8 },

  note: { fontSize: 13, color: theme.color.muted, marginTop: 6, lineHeight: 18 },

  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20 },

  label: { fontSize: 13, fontWeight: '700', color: theme.color.inkMuted, marginBottom: 8 },

  input: {

    borderWidth: 1,

    borderColor: theme.color.line,

    borderRadius: 12,

    padding: 12,

    minHeight: 88,

    textAlignVertical: 'top',

    fontSize: 15,

    color: theme.color.ink,

  },

  inlineErr: {

    fontSize: 13,

    fontWeight: '600',

    color: theme.color.danger,

    marginTop: 10,

    lineHeight: 18,

  },

  btn: { marginTop: 18, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },

  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

});


