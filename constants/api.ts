import { Platform } from 'react-native';

// --- THIS IS THE ONLY LINE YOU EVER NEED TO CHANGE ---
// 1. Find your computer's IP address (run "ipconfig" in cmd)
const COMPUTER_IP = '10.27.81.197'; // <-- Double-check this is still your IP!
// ----------------------------------------------------

// This is the URL for the website (using Laragon's auto-generated URL)
// You can also still use 'http://localhost/carelink_api' if you prefer!
const webApiUrl = 'http://localhost/carelink_api';

// This is the URL for the mobile app (running on your phone)
const mobileApiUrl = `http://${COMPUTER_IP}/carelink_api`;

// This is the "smart" variable.
const API_URL = Platform.OS === 'web' ? webApiUrl : mobileApiUrl;

// This "exports" the variable so other files can import it.
export default API_URL;