// ข้อมูลการตั้งค่า Spotify Developer
const CLIENT_ID = '718b9cea339949308f3f8f3f12a81d85'; // ใส่ Client ID ของคุณ
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-read-playback-state user-read-currently-playing user-read-private';

let accessToken = localStorage.getItem('spotify_access_token');
let startTime = null;
let timerInterval = null;
let isTracking = false;

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

// ฟังก์ชันเข้ารหัส Code Challenge สำหรับ PKCE
async function generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// 1. ระบบจัดการ Login (ใช้ response_type=code + PKCE)
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

// ตรวจสอบ Code หลังจาก Spotify Redirect กลับมา แล้วแลกเป็น Access Token
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
                // ล้างค่า Code ออกจาก URL เพื่อความสะอาด
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error("Error exchanging token:", error);
        }
    }

    if (accessToken) {
        loginBtn.classList.add('hidden');
        playerSection.classList.remove('hidden');
        statusText.textContent = "เชื่อมต่อสำเร็จ! กำลังโหลดข้อมูลโปรไฟล์...";
        
        fetchUserProfile(accessToken);
        startCheckingMusic();
    }
};

// 1.1 ฟังก์ชันดึงข้อมูลโปรไฟล์ผู้ใช้
async function fetchUserProfile(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('user-name').textContent = data.display_name || "Spotify User";
            if (data.images && data.images.length > 0) {
                document.getElementById('user-avatar').src = data.images[0].url;
            }
            document.getElementById('user-profile').classList.remove('hidden');
            statusText.textContent = "กำลังตรวจเช็กเพลงที่คุณฟัง...";
        } else {
            localStorage.removeItem('spotify_access_token');
            loginBtn.classList.remove('hidden');
            statusText.textContent = "Token หมดอายุ กรุณาล็อกอินใหม่อีกครั้ง";
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
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

                // เงื่อนไข: ถ้าเล่นเพลง (หรือปล่อยว่างไว้จับทุกเพลง)
                if (currentTrackId === "5jC3lBWBcVdby76sqWwqAE") {
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

// 3. ระบบจับเวลา
function startTimer() {
    isTracking = true;
    if (!startTime) {
        startTime = Date.now();
    }
    timerInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(elapsedSeconds % 60).padStart(2, '0');
        
        sleepTimerEl.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    isTracking = false;
    startTime = null;
    clearInterval(timerInterval);
}

// จัดการปุ่มแชร์ไปที่ X
const shareXBtn = document.getElementById('share-x-btn');
if (shareXBtn) {
    shareXBtn.addEventListener('click', () => {
        const timerText = sleepTimerEl.textContent;
        const trackText = trackNameEl.textContent;
        const currentUrl = window.location.href;

        const tweetMessage = encodeURIComponent(
            `🌙 ตอนนี้ฉันนอนหลับฝันดีไปแล้ว ${timerText} กับเพลง "${trackText}" 💤\n\nมาร่วมจำศีลฟังเพลงไปด้วยกันที่:`
        );

        const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetMessage}&url=${encodeURIComponent(currentUrl)}`;
        window.open(twitterShareUrl, '_blank');
    });
}