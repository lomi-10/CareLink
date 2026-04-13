CareLink — landing page assets
==============================

Place custom images here, then reference them from:
  components/landing/LandingScreen.tsx

Suggested files
---------------

1) hero.png (optional top banner)
   - Recommended size: 1920 x 720 px (or 1600 x 600) at 72–144 dpi for web.
   - For mobile-first previews, 1200 x 900 px also works; the layout uses a fixed-height block — adjust styles.heroPlaceholder height if needed.
   - Format: PNG or JPG (photos), PNG with transparency for overlays.
   - Safe area: keep faces and text out of the outer 8% (cropping on small phones).

2) logo-mark.png (optional, if you want a mark next to the word "CareLink")
   - Square: 512 x 512 px, transparent PNG.

After adding hero.png, in LandingScreen.tsx you can replace the dashed placeholder <View> with:

  import { Image } from "react-native";
  <Image
    source={require("../../assets/landing/hero.png")}
    style={{ width: "100%", height: 220, borderRadius: 16, marginBottom: 20 }}
    resizeMode="cover"
  />

Metro only bundles files that exist at build time, so the file must be present before require().
