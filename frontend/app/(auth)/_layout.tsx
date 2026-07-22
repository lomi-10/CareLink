import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Without this, every auth screen sits on the navigation theme's own
        // background (#f8fafc — near-white slate). Anywhere a screen's colour
        // doesn't reach — the bottom safe-area inset, short content, the moment
        // mid-transition — that pale slate shows through as a "white bar".
        // Backing the stack with the auth cream leaves nothing to leak.
        //
        // signup/role-selection can be dark (helper theme); their own root View
        // paints over this, so cream is only ever the fallback.
        contentStyle: { backgroundColor: '#FAE8D0' },
      }}
    />
  );
}
