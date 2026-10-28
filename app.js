// ข้อมูลการตั้งค่า Spotify Developer
const CLIENT_ID = '718b9cea339949308f3f8f3f12a81d85'; // Client ID ของคุณ
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-read-playback-state user-read-currently-playing user-read-private';

// ** [ข้อ 1] กำหนดเฉพาะ Spotify ID ของเพลง Insomnia - RIIZE เพลงเดียวเท่านั้น **
const TARGET_TRACK_ID = '5jC3lBWBcVdby76sqWwqAE';

// นำเข้า Firebase Modular SDK จาก CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// เริ่มต้นใช้งาน Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let accessToken = localStorage.getItem('spotify_access_token');
let timerInterval = null;
let isTracking = false;
let currentSpotifyId = null; 
let totalElapsedSeconds = 0; // เวลารวมสะสมทั้งหมดของเพลงนี้

const loginBtn = document.getElementById('login-btn');
const playerSection = document.getElementById('player-section');
const statusText = document.getElementById('status-text');
const trackNameEl = document.getElementById('track-name');
const sleepTimerEl = document.getElementById('sleep-timer');

// ฟังก์ชันสร้างรหัสสุ่มสำหรับ PKCE
function generateRandomString(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// ระบบจัดการ Login (PKCE)
loginBtn.addEventListener('click', async () => {
    const codeVerifier = generateRandomString(64);
    localStorage.setItem('code_verifier', codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    const params = {
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: REDIRECT_URI,
    };
    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
});

// ตรวจสอบ Code หลังจาก Spotify Redirect กลับมา
window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        const codeVerifier = localStorage.getItem('code_verifier');
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI,
                    code_verifier: codeVerifier,
                })
            });

            const data = await response.json();
            if (data.access_token) {
                accessToken = data.access_token;
                localStorage.setItem('spotify_access_token', accessToken);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error("Error exchanging token:", error);
        }
    }

    if (accessToken) {
        loginBtn.classList.add('hidden');
        playerSection.classList.remove('hidden');
        statusText.textContent = "