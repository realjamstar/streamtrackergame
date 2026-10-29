const CLIENT_ID = '718b9cea339949308f3f8f3f12a81d85';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-read-playback-state user-read-currently-playing user-read-private';

const TARGET_TRACK_ID = '5jC3lBWBcVdby76sqWwqAE';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let accessToken = localStorage.getItem('spotify_access_token');
let timerInterval = null;
let isTracking = false;
let currentSpotifyId = null; 
let totalElapsedSeconds = 0; 
let selectedCharacter = null; 

const loginBtn = document.getElementById('login-btn');
const characterSelectSection = document.getElementById('character-select-section');
const playerSection = document.getElementById('player-section');
const statusText = document.getElementById('status-text');
const trackNameEl = document.getElementById('track-name');
const sleepTimerEl = document.getElementById('sleep-timer');
const selectedCharImg = document.getElementById('selected-char-img');
const pixelTimerBox = document.getElementById('pixel-timer-box');
const backToSelectBtn = document.getElementById('back-to-select-btn');

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
        statusText.textContent = "เชื่อมต่อสำเร็จ! กำลังตรวจสอบข้อมูลโปรไฟล์...";
        await fetchUserProfile(accessToken);
    }

    const charSelectBtns = document.querySelectorAll('.char-select-btn');
    charSelectBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            selectedCharacter = btn.getAttribute('data-name');
            const imgUrl = btn.getAttribute('data-img');

            activateCharacterCard(selectedCharacter, imgUrl);

            if (currentSpotifyId) {
                try {
                    const userRef = doc(db, 'insomnia_sleep_users', currentSpotifyId);
                    await setDoc(userRef, { selected_character: selectedCharacter }, { merge: true });
                } catch (error) {
                    console.error("Error saving character:", error);
                }
            }
        });
    });

    if (backToSelectBtn) {
        backToSelectBtn.addEventListener('click', () => {
            playerSection.classList.add('hidden');
            characterSelectSection.classList.remove('hidden');
            statusText.textContent = "เลือกตัวละครของคุณเพื่อเริ่มจำศีล";
        });
    }
};

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

        } else {
            localStorage.removeItem('spotify_access_token');
            loginBtn.classList.remove('hidden');
            statusText.textContent = "Token หมดอายุ กรุณาล็อกอินใหม่อีกครั้ง";
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
}

async function loadUserDataFromFirestore(spotifyId, displayName) {
    const userRef = doc(db, 'insomnia_sleep_users', spotifyId);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            totalElapsedSeconds = docSnap.data().total_sleep_seconds || 0;
            const savedChar = docSnap.data().selected_character;
            if (savedChar) {
                selectedCharacter = savedChar;
                const targetBtn = document.querySelector(`.char-select-btn[data-name="${selectedCharacter}"]`);
                if (targetBtn) {
                    activateCharacterCard(selectedCharacter, targetBtn.getAttribute('data-img'));
                } else {
                    characterSelectSection.classList.remove('hidden');
                    statusText.textContent = "กรุณาเลือกตัวละครของคุณ";
                }
            } else {
                characterSelectSection.classList.remove('hidden');
                statusText.textContent = "กรุณาเลือกตัวละครของคุณ";
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
            characterSelectSection.classList.remove('hidden');
            statusText.textContent = "กรุณาเลือกตัวละครของคุณ";
        }
        updateTimerDisplay(totalElapsedSeconds);
        startCheckingMusic();
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

function activateCharacterCard(charName, imgUrl) {
    selectedCharacter = charName;
    selectedCharImg.src = imgUrl;

    pixelTimerBox.className = "pixel-timer-container";
    pixelTimerBox.classList.add(`pos-${selectedCharacter.toLowerCase()}`);

    characterSelectSection.classList.add('hidden');
    playerSection.classList.remove('hidden');
    statusText.textContent = `กำลังจำศีลกับ ${selectedCharacter} 💤`;
}

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

const shareXBtn = document.getElementById('share-x-btn');
if (shareXBtn) {
    shareXBtn.addEventListener('click', async () => {
        const timerText = sleepTimerEl.textContent;
        const currentUrl = window.location.href;
        const cardContainer = document.getElementById('share-card-container');

        statusText.textContent = "กำลังสร้างรูปภาพการ์ดของคุณ...";

        try {
            const canvas = await html2canvas(cardContainer, {
                scale: 2,
                useCORS: true,
                backgroundColor: null
            });

            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const imageURL = URL.createObjectURL(imageBlob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = imageURL;
            downloadLink.download = `insomnia-sleep-card-${selectedCharacter.toLowerCase()}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            statusText.textContent = `บันทึกภาพการ์ดเรียบร้อย! กำลังเปิด X... 💤`;

            const tweetMessage = encodeURIComponent(
                `🌙 ฉันสะสมเวลานอนหลับกับเพลง Insomnia - RIIZE โดยมี ${selectedCharacter} มาอยู่เป็นเพื่อน ไปแล้ว ${timerText} 💤✨\n\n(บันทึกภาพการ์ดแล้ว อย่าลืมแนบรูปภาพลงในโพสต์นะ!)\n\nมาร่วมจำศีลฟังเพลงไปด้วยกันที่:`
            );

            const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetMessage}&url=${encodeURIComponent(currentUrl)}`;
            setTimeout(() => {
                window.open(twitterShareUrl, '_blank');
            }, 1000);

        } catch (error) {
            console.error("Error generating card image:", error);
            statusText.textContent = "เกิดข้อผิดพลาดในการสร้างภาพการ์ด กรุณาลองใหม่อีกครั้ง";
        }
    });
}