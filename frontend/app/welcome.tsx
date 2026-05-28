import { Redirect } from "expo-router";

/** Legacy route: older links pointed here; the public entry is now `/` (landing). */
export default function WelcomeRedirect() {
  return <Redirect href="/" />;
}
