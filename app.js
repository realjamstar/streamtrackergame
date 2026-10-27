// ข้อมูลการตั้งค่า Spotify Developer
const CLIENT_ID = '718b9cea339949308f3f8f3f12a81d85'; // Client ID ของคุณ
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-read-playback-state user-read-currently-playing user-read-private';

// ** [1. ใส่ Spotify ID ของเพลงที่ต้องการตรงนี้] **
const TARGET_TRACK_IDS = [
    '5jC3lBWBcVdby76sqWwqAE'
];

// ** [2. ใส่ Firebase Config ของคุณตรงนี้] **
const firebaseConfig = {
    apiKey: "ใส่_API_KEY_ของคุณ",
    authDomain: "ใส่_AUTH_DOMAIN_ของคุณ",
    projectId: "ใส่_PROJECT_ID_ของคุณ",
    storageBucket: "ใส่_STORAGE_BUCKET_ของคุณ",
    messagingSenderId: "ใส่_MESSAGING_SENDER_ID_ของคุณ",
    appId: "ใส่_APP_ID_ของคุณ"
};

// เริ่มต้นใช้งาน Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let accessToken = localStorage.getItem('spotify_access_token');
let timerInterval = null;
let isTracking = false;
let currentSpotifyId = null; 
let totalElapsedSeconds = 0; 

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

// 1. ระบบจัดการ Login (PKCE)
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
        statusText.textContent = "เชื่อมต่อสำเร็จ! กำลังดึงสถิติเดิมจากคลาวด์...";
        
        await fetchUserProfile(accessToken);
    }
};

// 1.1 ดึงข้อมูลโปรไฟล์ผู้ใช้และเชื่อมต่อกับ Firestore
async function fetchUserProfile(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentSpotifyId = data.id; 
            
            document.getElementById('user-name').textContent = data.display_name || "Spotify User";
            if (data.images && data.images.length > 0) {
                document.getElementById('user-avatar').src = data.images[0].url;
            }
            document.getElementById('user-profile').classList.remove('hidden');

            await loadUserDataFromFirestore(currentSpotifyId, data.display_name);

            statusText.textContent = "โหลดสถิติสำเร็จ! กำลังตรวจเช็กเพลงที่คุณฟัง...";
            startCheckingMusic();

        } else {
            localStorage.removeItem('spotify_access_token');
            loginBtn.classList.remove('hidden');
            statusText.textContent = "Token หมดอายุ กรุณาล็อกอินใหม่อีกครั้ง";
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
}

// 1.2 ฟังก์ชันดึงข้อมูลจาก Firestore
async function loadUserDataFromFirestore(spotifyId, displayName) {
    const userRef = db.collection('sleep_users').doc(spotifyId);
    try {
        const doc = await userRef.get();
        if (doc.exists) {
            totalElapsedSeconds = doc.data().total_sleep_seconds || 0;
        } else {
            totalElapsedSeconds = 0;
            await userRef.set({
                spotify_id: spotifyId,
                name: displayName,
                total_sleep_seconds: 0,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        updateTimerDisplay(totalElapsedSeconds);
    } catch (error) {
        console.error("Error loading user data from Firestore:", error);
    }
}

// 2. ฟังก์ชันเช็กเพลงที่กำลังเล่นอยู่ทุกๆ 5 วินาที
function startCheckingMusic() {
    setInterval(async () => {
        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.status === 204 || response.status > 400) {
                statusText.textContent = "ไม่ได้เปิดเพลงอยู่ หรือไม่ได้เล่นเพลงใน Spotify ตอนนี้";
                stopTimer();
                return;
            }

            const data = await response.json();
            if (data && data.item) {
                const currentTrackId = data.item.id;
                const currentTrackName = data.item.name;
                const artistName = data.item.artists.map(a => a.name).join(', ');

                trackNameEl.textContent = `${currentTrackName} - ${artistName}`;

                const isTargetTrack = TARGET_TRACK_IDS.length === 0 || TARGET_TRACK_IDS.includes(currentTrackId);

                if (isTargetTrack) {
                    statusText.textContent = "กำลังนอนหลับฝันดีไปพร้อมกับเสียงเพลง... 💤";
                    if (!isTracking) {
                        startTimer();
                    }
                } else {
                    statusText.textContent = "กำลังฟังเพลงอื่นอยู่ (หยุดจับเวลา)";
                    stopTimer();
                }
            }
        } catch (error) {
            console.error("Error fetching player state:", error);
        }
    }, 5000);
}

// 3. ระบบจับเวลาและบันทึกลง Firestore แบบเรียลไทม์
function startTimer() {
    if (isTracking) return;
    isTracking = true;

    timerInterval = setInterval(async () => {
        totalElapsedSeconds++;
        updateTimerDisplay(totalElapsedSeconds);

        if (currentSpotifyId) {
            try {
                await db.collection('sleep_users').doc(currentSpotifyId).set({
                    total_sleep_seconds: totalElapsedSeconds,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (error) {
                console.error("Error updating sleep time to Firestore:", error);
            }
        }
    }, 1000);
}

function stopTimer() {
    isTracking = false;
    clearInterval(timerInterval);
}

function updateTimerDisplay(totalSeconds) {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    
    sleepTimerEl.textContent = `${hours}:${minutes}:${seconds}`;
}

// จัดการปุ่มแชร์ไปที่ X
const shareXBtn = document.getElementById('share-x-btn');
if (shareXBtn) {
    shareXBtn.addEventListener('click', () => {
        const timerText = sleepTimerEl.textContent;
        const trackText = trackNameEl.textContent;
        const currentUrl = window.location.href;

        const tweetMessage = encodeURIComponent(
            `🌙 ตอนนี้ฉันสะสมเวลานอนหลับฝันดีไปแล้ว ${timerText} กับเพลง "${trackText}" 💤\n\nมาร่วมจำศีลฟังเพลงไปด้วยกันที่:`
        );

        const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetMessage}&url=${encodeURIComponent(currentUrl)}`;
        window.open(twitterShareUrl, '_blank');
    });
}