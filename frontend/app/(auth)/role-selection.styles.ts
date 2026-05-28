import { StyleSheet, Dimensions, Platform } from 'react-native';
import { Color, FontFamily, FontSize, Border, Padding } from "@/constants/GlobalStyles";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2A1608",
  },
  radialHighlight: {
    flex: 1,
    opacity: 0.8,
  },
  scrollContent: {
    paddingTop: Platform.OS === "web" ? "10%" : 50,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: "100%",
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  backButtonContainer: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  backButton: {
    padding: 8,
  },
  logoParentLayout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: "15%",
    gap: 10,
  },
  carelinkWrapper: {
    alignItems: "flex-start",
  },
  carelink: {
    fontSize: 25,
    textAlign: "center",
    zIndex: 3,
    fontFamily: FontFamily.fredokaSemiBold,
  },
  care: {
    color: Color.colorWhite,
  },
  link: {
    color: Color.colorChocolate100,
  },
  titleContainer: {
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 15,
  },
  getStarted: {
    color: "#E96613",
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  mainTitle: {
    color: 'white',
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 32,
    marginTop: 8,
  },
  subtitle: {
    color: '#D1D1D1',
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 16,
    marginTop: 8,
  },
  cardsContainer: {
    paddingHorizontal: 15,
  },
  parentCard: {
    backgroundColor: "#FBD9A0",
    height: 300,
    borderRadius: Border.br_30,
    marginBottom: "-10%",
    elevation: 2,
  },
  pressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },

  helperCard: {
    backgroundColor: "#3B1E08",
    height: 300,
    borderRadius: Border.br_30,
    elevation: 2,
  },
  cardOverlay: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    width: '60%',
  },
  parentRoleImageRight: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 200,
    height: 250,
    opacity: 0.9,
  },
  roleImageRight: {
    position: 'absolute',
    right: -20,
    bottom: 0,
    width: '70%',
    height: '100%',
    opacity: 0.9,
  },
  iconBadge: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  roleTitleDark: {
    fontSize: 28,
    fontFamily: FontFamily.fredokaSemiBold,
    color: "#3B1E08",
  },
  roleTitleLight: {
    fontSize: 28,
    fontFamily: FontFamily.fredokaSemiBold,
    color: "white",
  },
  roleDescriptionDark: {
    fontSize: 15,
    fontFamily: FontFamily.fredokaRegular,
    color: "#5C4033",
    marginTop: 10,
    lineHeight: 22,
  },
  roleDescriptionLight: {
    fontSize: 15,
    fontFamily: FontFamily.fredokaRegular,
    color: "#BCBCBC",
    marginTop: 10,
    lineHeight: 22,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#BCBCBC',
    fontSize: 14,
    fontFamily: FontFamily.fredokaRegular,
  },
  signInLink: {
    color: '#FBD9A0',
    fontFamily: FontFamily.fredokaSemiBold,
  },

  // ==========================================
  // 🖥️ WEB-SPECIFIC STYLES
  // ==========================================
  webPageContainer: {
    flex: 1,
    backgroundColor: "#1A0D04",
  },

  webHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 24,
  },

  webLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 20,
  },

  webContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 20, // Prevents footer text from hugging the taskbar border too tightly
  },

  webCenteredTitle: {
    color: "white",
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 42,        // Scaled down beautifully from 58 to save space
    marginTop: 8,
  },

  webCenteredSubtitle: {
    color: "#D1D1D1",
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 16,        // Crisp, readable desktop body size
    marginTop: 10,
    textAlign: "center",
    maxWidth: 600,
    lineHeight: 24,
  },

  webModernCardsContainer: {
    flexDirection: "row",
    gap: 28,
    marginTop: 30,       // Tighter vertical flow
  },

  webModernParentCard: {
    width: 370,          // Proportional width scale down
    height: 390,         // Reduced height so it easily fits within 720px–1080px viewports
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FBD9A0",
    transitionDuration: "220ms",
  },

  webModernHelperCard: {
    width: 370,          
    height: 390,         
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#3B1E08",
    transitionDuration: "220ms",
  },

  webModernOverlay: {
    flex: 1,
    padding: 28,
    justifyContent: "flex-end",
    width: "70%",
    zIndex: 10,
  },

  webModernImage: {
    position: "absolute",
    right: -15,
    bottom: 0,
    width: "75%",
    height: "100%",
  },

  webFooterContainer: {
    marginTop: 35,       // Positions the sign-in text right under the cards comfortably
  },
});