// ข้อมูลการตั้งค่า Spotify Developer (ต้องไปลงทะเบียนที่ Spotify Dashboard)
const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID'; // ใส่ Client ID ของคุณ
const REDIRECT_URI = window.location.origin + window.location.pathname;
// เพิ่มสิทธิ์ 'user-read-private' เพื่อดึงข้อมูลโปรไฟล์ (ชื่อและรูปภาพ)
const SCOPES = 'user-read-playback-state user-read-currently-playing user-read-private';

// เพลงเป้าหมายที่กำหนดให้เริ่มจับเวลา (เช่น เพลงกล่อม / Lofi ที่ชอบ)
const TARGET_TRACK_ID = 'ใส่_URI_หรือ_ID_เพลงที่ต้องการตรงนี้'; 

let accessToken = localStorage.getItem('spotify_access_token');
let startTime = null;
let timerInterval = null;
let isTracking = false;

const loginBtn = document.getElementById('login-btn');
const playerSection = document.getElementById('player-section');
const statusText = document.getElementById('status-text');
const trackNameEl = document.getElementById('track-name');
const sleepTimerEl = document.getElementById('sleep-timer');

// 1. ระบบจัดการ Login (Redirect ไปหน้าขอสิทธิ์ Spotify)
loginBtn.addEventListener('click', async () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
    window.location = authUrl;
});

// ตรวจสอบ Token หลังจาก Spotify Redirect กลับมา
window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');

    if (token) {
        accessToken = token;
        localStorage.setItem('spotify_access_token', token);
        window.location.hash = ''; // เคลียร์ URL
    }

    if (accessToken) {
        loginBtn.classList.add('hidden');
        playerSection.classList.remove('hidden');
        statusText.textContent = "เชื่อมต่อสำเร็จ! กำลังโหลดข้อมูลโปรไฟล์...";
        
        // ดึงข้อมูลโปรไฟล์ผู้ใช้มาแสดงบนเว็บ
        fetchUserProfile(accessToken);
        
        // เริ่มเช็กเพลงที่กำลังเล่น
        startCheckingMusic();
    }
};

// 1.1 ฟังก์ชันดึงข้อมูลโปรไฟล์ผู้ใช้ (ชื่อและรูปภาพ) จาก Spotify
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
            // ถ้า Token หมดอายุหรือมีปัญหา ให้ล้างค่าทิ้ง
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

                // เงื่อนไข: ถ้าเพลงที่เล่นตรงกับเพลงที่เรากำหนด (หรือปล่อยว่างไว้จับทุกเพลง)
                if (currentTrackId === TARGET_TRACK_ID || TARGET_TRACK_ID === "ใส่_URI_หรือ_ID_เพลงที่ต้องการตรงนี้" || TARGET_TRACK_ID === "") {
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
    }, 5000); // เช็กทุกๆ 5 วินาที
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

shareXBtn.addEventListener('click', () => {
    const timerText = sleepTimerEl.textContent; // ดึงเวลาปัจจุบัน เช่น "01:15:30"
    const trackText = trackNameEl.textContent;  // ดึงชื่อเพลงปัจจุบัน
    const currentUrl = window.location.href;    // ดึง URL เว็บไซต์ของคุณตอนนี้

    // ข้อความแคปชั่นที่จะให้ไปปรากฏบน X อัตโนมัติ
    const tweetMessage = encodeURIComponent(
        `🌙 ตอนนี้ฉันนอนหลับฝันดีไปแล้ว ${timerText} กับเพลง "${trackText}" 💤\n\nมาร่วมจำศีลฟังเพลงไปด้วยกันที่:`
    );

    // สร้างลิงก์ Web Intent ของ X
    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetMessage}&url=${encodeURIComponent(currentUrl)}`;

    // เปิดหน้าต่างสำหรับโพสต์ทวีต
    window.open(twitterShareUrl, '_blank');
});