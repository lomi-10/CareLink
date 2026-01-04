import { Platform } from 'react-native';

// --- THIS IS THE ONLY LINE YOU EVER NEED TO CHANGE ---
// 1. Find your computer's IP address (run "ipconfig" in cmd)
// 2. Make sure your XAMPP API folder is named "carelink-api"
const COMPUTER_IP = '10.191.246.202'; // <-- IMPORTANT: Change this to YOUR IP!
// ----------------------------------------------------

// This is the URL for the website (running in your browser)
const webApiUrl = 'http://localhost/carelink_api';

// This is the URL for the mobile app (running on your phone)
const mobileApiUrl = `http://${COMPUTER_IP}/carelink_api`;

// This is the "smart" variable.
// It checks: "Is the Platform.OS equal to 'web'?"
// If YES, use the webApiUrl.
// If NO (it must be 'ios' or 'android'), use the mobileApiUrl.
const API_URL = Platform.OS === 'web' ? webApiUrl : mobileApiUrl;

// This "exports" the variable so other files can import it.
export default API_URL;