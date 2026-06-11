// components/helper/home/GreetingCard.tsx
// Hero banner shown on the helper dashboard (non-hired state).
// PHP: none — purely presentational

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

// ─── Constants ────────────────────────────────────────────────────────────────

const PILL_BORDER = 'rgba(255,255,255,0.5)';
const TEXT_MUTED  = 'rgba(255,255,255,0.72)';
const BROWSE_BG   = '#FDF0D0';
const BROWSE_TEXT = '#3B1A08';

// Photo ring diameter — change this one constant to resize the circle
const PHOTO_D = 100;

// ─── Props ────────────────────────────────────────────────────────────────────

interface GreetingCardProps {
  userName:      string;
  profileImage?: string | null;
  verified?:     boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GreetingCard({
  userName,
  profileImage,
  verified = true,
}: GreetingCardProps) {
  const router = useRouter();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 18) return 'Good afternoon,';
    return 'Good evening,';
  })();

  return (
    <LinearGradient
      colors={['#6B2E0A', '#3B1508', '#1E0A04']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.card}
    >
      {/* ── Left content ─────────────────────────────────────────────── */}
      <View style={s.content}>

        {/* PESO-VERIFIED pill */}
        {verified && (
          <View style={s.pesoPill}>
            <Ionicons name="shield-checkmark" size={11} color="#fff" />
            <Text style={s.pesoPillText}>PESO-VERIFIED</Text>
          </View>
        )}

        <Text style={s.greeting}>{greeting}</Text>
        <Text style={s.name} numberOfLines={2}>{userName} 👋</Text>

        <Text style={s.subtitle}>
          Your next opportunity{'\n'}is just around the corner.
        </Text>

        {/* Browse Jobs CTA */}
        <TouchableOpacity
          style={s.browseBtn}
          onPress={() => router.push('/(helper)/browse')}
          activeOpacity={0.88}
        >
          <Ionicons name="briefcase-outline" size={14} color={BROWSE_TEXT} />
          <Text style={s.browseTxt}>Browse Jobs</Text>
          <Ionicons name="chevron-forward" size={13} color={BROWSE_TEXT} />
        </TouchableOpacity>
      </View>

      {/* ── Right side: circular profile photo ───────────────────────── */}
      <View style={s.photoCol}>

        {/* ============================================================
            🌿  DECORATIVE LEAF / PLANT behind the photo
            Uncomment + adjust s.leafDecor once you have the asset.
            ============================================================
        <Image
          source={require("../../../assets/dashboard/leaf-decor.png")}
          style={s.leafDecor}
          contentFit="contain"
          pointerEvents="none"
        />
        */}

        {/* Soft warm glow behind the circle */}
        <View style={s.photoGlow} pointerEvents="none" />

        {/* Outer border ring */}
        <View style={s.photoRingOuter}>
          {/* Inner clipping circle */}
          <View style={s.photoRingInner}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={s.photo}
                contentFit="cover"
              />
            ) : (
              <View style={s.photoFallback}>
                <Ionicons name="person" size={PHOTO_D * 0.4} color="rgba(255,255,255,0.45)" />
              </View>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 200,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',   // vertically center both text and photo
    paddingLeft: 22,
    paddingRight: 18,
    paddingVertical: 22,
  },

  content: { flex: 1, zIndex: 2 },

  pesoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  pesoPillText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },

  greeting: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  name: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 8,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 19,
    marginBottom: 18,
  },

  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BROWSE_BG,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  browseTxt: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: BROWSE_TEXT,
  },

  // ── Right side: circular photo ────────────────────────────────────────────
  photoCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    position: 'relative',
  },

  // Soft warm glow behind the circle (decorative, no interaction)
  photoGlow: {
    position: 'absolute',
    width: PHOTO_D + 32,
    height: PHOTO_D + 32,
    borderRadius: (PHOTO_D + 32) / 2,
    backgroundColor: 'rgba(255,180,80,0.14)',
  },

  // Outer ring (white semi-transparent border)
  photoRingOuter: {
    width: PHOTO_D + 6,
    height: PHOTO_D + 6,
    borderRadius: (PHOTO_D + 6) / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  // Inner circle that clips the image
  photoRingInner: {
    width: PHOTO_D,
    height: PHOTO_D,
    borderRadius: PHOTO_D / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  photo: {
    width: PHOTO_D,
    height: PHOTO_D,
  },

  photoFallback: {
    width: PHOTO_D,
    height: PHOTO_D,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Decorator placeholder ──────────────────────────────────────────────────
  leafDecor: {
    position: 'absolute',
    right: 80,
    bottom: 0,
    width: 60,
    height: 90,
    zIndex: 1,
    opacity: 0.6,
  },
});
