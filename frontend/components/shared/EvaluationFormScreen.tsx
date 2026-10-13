import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';

const PAGE = '#FBF5EC';
const DARK = '#2A1608';
const MUTED = '#7A6A58';

export function EvaluationFormScreen({
  audience,
  formUrl,
  accent,
}: {
  audience: 'employer' | 'helper';
  formUrl: string;
  accent: string;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openForm = async () => {
    setOpening(true);
    setError(null);
    try {
      await Linking.openURL(formUrl);
    } catch {
      setError('The form could not be opened. Please try again or copy the link below into your browser.');
    } finally {
      setOpening(false);
    }
  };

  const audienceLabel = audience === 'employer' ? 'employers' : 'helpers';

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={23} color={DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System Evaluation Form</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.content}>
          <View style={[styles.card, width >= 720 && styles.cardWide]}>
            <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
              <Ionicons name="clipboard-outline" size={34} color={accent} />
            </View>
            <Text style={styles.title}>Share your CareLink experience</Text>
            <Text style={styles.body}>
              The system evaluation is now collected through a Google Form made for {audienceLabel}.
              Your responses help us evaluate and improve CareLink.
            </Text>

            <TouchableOpacity
              style={[styles.openButton, { backgroundColor: accent }]}
              onPress={openForm}
              disabled={opening}
              activeOpacity={0.86}
              accessibilityRole="button"
            >
              {opening ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.openButtonText}>Open evaluation form</Text>
                  <Ionicons name="open-outline" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.externalNote}>
              <Ionicons name="open-outline" size={15} color={MUTED} />
              <Text style={styles.externalNoteText}>The form opens outside CareLink.</Text>
            </View>

            {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}

            <Text style={styles.linkLabel}>Form link</Text>
            <Text
              style={[styles.formLink, { color: accent }]}
              selectable
              accessibilityLabel={`${audienceLabel} evaluation form link`}
            >
              {formUrl}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EFE0CB',
  },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 17,
    color: DARK,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 28,
    shadowColor: '#5D3C1B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardWide: { padding: 40 },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 23,
    color: DARK,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 15,
    lineHeight: 23,
    color: MUTED,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  openButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  openButtonText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 16,
    color: '#fff',
  },
  externalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  externalNoteText: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: MUTED,
  },
  errorText: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 13,
    color: '#B42318',
    textAlign: 'center',
    marginTop: 14,
  },
  linkLabel: {
    alignSelf: 'flex-start',
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 12,
    color: MUTED,
    marginTop: 24,
    marginBottom: 5,
  },
  formLink: {
    alignSelf: 'flex-start',
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 13,
    lineHeight: 19,
  },
});
