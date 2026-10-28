// ข้อมูลการตั้งค่า Spotify Developer
const CLIENT_ID = '718b9cea339949308f3f8f3f12a81d85';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-read-playback-state user-read-currently-playing user-read-private';

// ** กำหนดเฉพาะ Spotify ID ของเพลง Insomnia - RIIZE เพลงเดียวเท่านั้น **
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
let totalElapsedSeconds = 0; 
let selectedCharacter = "SHOTARO"; // ตัวละครเริ่มต้น

const loginBtn = document.getElementById('login-btn');
const playerSection = document.getElementById('player-section');
const statusText = document.getElementById('status-text');
const trackNameEl = document.getElementById('track-name');
const sleepTimerEl = document.getElementById('sleep-timer');
const selectedCharImg = document.getElementById('selected-char-img');

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
        statusText.textContent = "เชื่อมต่อสำเร็จ! กำลังตรวจสอบข้อมูลโปรไฟล์...";
        
        await fetchUserProfile(accessToken);
    }

    // จัดการการคลิกเลือกตัวละคร 6 ตัว
    const charButtons = document.querySelectorAll('.char-btn');
    charButtons.forEach(btn => {
        if (btn.getAttribute('data-name') === selectedCharacter) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', async () => {
            charButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            selectedCharacter = btn.getAttribute('data-name');
            const imgUrl = btn.getAttribute('data-img');

            selectedCharImg.src = imgUrl;

            // อัปเดตตำแหน่งพิกัดกล่องเวลาตามตัวละครนั้นๆ อัตโนมัติ
            const timerContainer = document.querySelector('.pixel-timer-container');
            if (timerContainer) {
                timerContainer.className = "pixel-timer-container";
                timerContainer.classList.add(`pos-${selectedCharacter.toLowerCase()}`);
            }

            // บันทึกตัวละครที่เลือกกลายลงใน Firebase ของ User นั้นๆ ทันที
            if (currentSpotifyId) {
                try {
                    const userRef = doc(db, 'insomnia_sleep_users', currentSpotifyId);
                    await setDoc(userRef, { selected_character: selectedCharacter }, { merge: true });
                } catch (error) {
                    console.error("Error saving selected character:", error);
                }
            }
        });
    });
};

// ดึงข้อมูลโปรไฟล์ผู้ใช้และแยกฐานข้อมูลตาม Spotify ID
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

            statusText.textContent = "พร้อมแล้ว! กรุณาเปิดเพลง Insomnia - RIIZE บน Spotify";
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

// ฟังก์ชันโหลดข้อมูลสะสมเดิมจาก Firestore (รวมถึงตัวละครที่เคยเลือกไว้)
async function loadUserDataFromFirestore(spotifyId, displayName) {
    const userRef = doc(db, 'insomnia_sleep_users', spotifyId);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            totalElapsedSeconds = docSnap.data().total_sleep_seconds || 0;
            const savedChar = docSnap.data().selected_character;
            if (savedChar) {
                selectedCharacter = savedChar;
                const targetBtn = document.querySelector(`.char-btn[data-name="${selectedCharacter}"]`);
                if (targetBtn) {
                    document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('selected'));
                    targetBtn.classList.add('selected');
                    selectedCharImg.src = targetBtn.getAttribute('data-img');
                    
                    // ปรับตำแหน่งพิกัดตามตัวละครที่เซฟไว้
                    const timerContainer = document.querySelector('.pixel-timer-container');
                    if (timerContainer) {
                        timerContainer.className = "pixel-timer-container";
                        timerContainer.classList.add(`pos-${selectedCharacter.toLowerCase()}`);
                    }
                }
            }
        } else {
            totalElapsedSeconds = 0;
            await setDoc(userRef, {
                spotify_id: spotifyId,
                name: displayName,
                total_sleep_seconds: 0,
                selected_character: "SHOTARO",
                updated_at: serverTimestamp()
            });
        }
        updateTimerDisplay(totalElapsedSeconds);
    } catch (error) {
        console.error("Error loading user data from Firestore:", error);
    }
}

// ฟังก์ชันเช็กเพลงปัจจุบัน บังคับเฉพาะเพลง Insomnia เท่านั้น
function startCheckingMusic() {
    setInterval(async () => {
        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.status === 204 || response.status > 400) {
                statusText.textContent = "ไม่ได้เปิดเพลงอยู่บน Spotify (หยุดจับเวลา)";
                stopTimer();
                return;
            }

            const data = await response.json();
            if (data && data.item) {
                const currentTrackId = data.item.id;
                const currentTrackName = data.item.name;
                const artistName = data.item.artists.map(a => a.name).join(', ');

                trackNameEl.textContent = `${currentTrackName} - ${artistName}`;

                if (currentTrackId === TARGET_TRACK_ID) {
                    statusText.textContent = `กำลังฟัง Insomnia - RIIZE กับ ${selectedCharacter}... 💤`;
                    if (!isTracking) {
                        startTimer();
                    }
                } else {
                    statusText.textContent = "กำลังฟังเพลงอื่นอยู่ (ระบบนับเฉพาะเพลง Insomnia เท่านั้น)";
                    stopTimer();
                }
            }
        } catch (error) {
            console.error("Error fetching player state:", error);
        }
    }, 5000);
}

// ระบบจับเวลาและบันทึกสะสมลง Firestore แบบเรียลไทม์
function startTimer() {
    if (isTracking) return;
    isTracking = true;

    timerInterval = setInterval(async () => {
        totalElapsedSeconds++;
        updateTimerDisplay(totalElapsedSeconds);

        if (currentSpotifyId) {
            try {
                const userRef = doc(db, 'insomnia_sleep_users', currentSpotifyId);
                await setDoc(userRef, {
                    total_sleep_seconds: totalElapsedSeconds,
                    updated_at: serverTimestamp()
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

// จัดการปุ่มแชร์สถิติไปที่ X (Twitter)
const shareXBtn = document.getElementById('share-x-btn');
if (shareXBtn) {
    shareXBtn.addEventListener('click', () => {
        const timerText = sleepTimerEl.textContent;
        const currentUrl = window.location.href;

        const tweetMessage = encodeURIComponent(
            `🌙 ฉันสะสมเวลานอนหลับกับเพลง Insomnia - RIIZE โดยมี ${selectedCharacter} มาอยู่เป็นเพื่อน ไปแล้ว ${timerText} 💤✨\n\nมาร่วมจำศีลฟังเพลงไปด้วยกันที่:`
        );

        const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetMessage}&url=${encodeURIComponent(currentUrl)}`;
        window.open(twitterShareUrl, '_blank');
    });
}