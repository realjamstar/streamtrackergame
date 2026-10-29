let timerInterval = null;
let totalElapsedSeconds = 0; 
let selectedCharacter = null; 
let playerName = "";
let ytPlayer = null;
let isYTInitialized = false;

const CORRECT_YT_ID = "RgkoXU4BlOE"; // YouTube ID ที่ถูกต้อง
let isSpotifyActive = false;
let isYTPlaying = false;

const nameInputSection = document.getElementById('name-input-section');
const playerNameInput = document.getElementById('player-name-input');
const startNameBtn = document.getElementById('start-name-btn');
const userProfile = document.getElementById('user-profile');
const userNameEl = document.getElementById('user-name');
const editNameBtn = document.getElementById('edit-name-btn');
const resetTimerBtn = document.getElementById('reset-timer-btn');
const characterSelectSection = document.getElementById('character-select-section');
const playerSection = document.getElementById('player-section');
const statusText = document.getElementById('status-text');
const sleepTimerEl = document.getElementById('sleep-timer');
const selectedCharImg = document.getElementById('selected-char-img');
const pixelTimerBox = document.getElementById('pixel-timer-box');
const backToSelectBtn = document.getElementById('back-to-select-btn');

// ปุ่มสลับ Tabs
const tabSpotify = document.getElementById('tab-spotify');
const tabYoutube = document.getElementById('tab-youtube');
const spotifyBox = document.getElementById('spotify-box');
const youtubeBox = document.getElementById('youtube-box');

window.onload = () => {
    totalElapsedSeconds = parseInt(localStorage.getItem('insomnia_total_seconds')) || 0;
    updateTimerDisplay(totalElapsedSeconds);

    const savedName = localStorage.getItem('insomnia_player_name');
    if (savedName) {
        playerName = savedName;
        userNameEl.textContent = playerName;
        userProfile.classList.remove('hidden');
        nameInputSection.classList.add('hidden');
        characterSelectSection.classList.remove('hidden');
        statusText.textContent = "เลือกเมมเบอร์ที่ต้องการ";
    }

    startNameBtn.addEventListener('click', () => {
        const inputVal = playerNameInput.value.trim();
        if (!inputVal) {
            alert("กรุณากรอกชื่อของคุณก่อนเริ่มต้นครับ!");
            return;
        }

        playerName = inputVal;
        localStorage.setItem('insomnia_player_name', playerName);

        userNameEl.textContent = playerName;
        userProfile.classList.remove('hidden');
        nameInputSection.classList.add('hidden');
        characterSelectSection.classList.remove('hidden');
        statusText.textContent = "เลือกเมมเบอร์ที่ต้องการ";
    });

    if (editNameBtn) {
        editNameBtn.addEventListener('click', () => {
            resetAllPlayback();
            playerSection.classList.add('hidden');
            characterSelectSection.classList.add('hidden');
            userProfile.classList.add('hidden');
            nameInputSection.classList.remove('hidden');
            playerNameInput.value = playerName;
            statusText.textContent = "พิมพ์ชื่อใหม่ของคุณแล้วกดเริ่ม";
        });
    }

    if (resetTimerBtn) {
        resetTimerBtn.addEventListener('click', () => {
            if (confirm("คุณต้องการรีเซ็ตเวลาสะสมทั้งหมดกลับเป็น 0 ใช่หรือไม่?")) {
                totalElapsedSeconds = 0;
                localStorage.setItem('insomnia_total_seconds', 0);
                updateTimerDisplay(totalElapsedSeconds);
            }
        });
    }

    // ระบบสลับแท็บเครื่องเล่น
    if (tabSpotify && tabYoutube) {
        tabSpotify.addEventListener('click', () => {
            tabSpotify.className = "py-1.5 px-3 rounded-lg text-xs font-bold bg-pink-600 text-white transition shadow-sm";
            tabYoutube.className = "py-1.5 px-3 rounded-lg text-xs font-bold text-purple-300 hover:text-white transition";
            spotifyBox.classList.remove('hidden');
            youtubeBox.classList.add('hidden');

            // เมื่ออยู่แท็บ Spotify ให้เริ่มนับเวลาฟังเพลงทันทีที่เลือกเปิดเพลง
            isSpotifyActive = true;
            evaluateTimerState();
        });

        tabYoutube.addEventListener('click', () => {
            tabYoutube.className = "py-1.5 px-3 rounded-lg text-xs font-bold bg-pink-600 text-white transition shadow-sm";
            tabSpotify.className = "py-1.5 px-3 rounded-lg text-xs font-bold text-purple-300 hover:text-white transition";
            youtubeBox.classList.remove('hidden');
            spotifyBox.classList.add('hidden');

            // ออกจากแท็บ Spotify ปิดสถานะ
            isSpotifyActive = false;
            evaluateTimerState();

            if (!isYTInitialized) {
                initYTPlayer();
                isYTInitialized = true;
            }
        });
    }

    const charSelectBtns = document.querySelectorAll('.char-select-btn');
    charSelectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedCharacter = btn.getAttribute('data-name');
            const cardImgUrl = btn.getAttribute('data-card-img');

            activateCharacterCard(selectedCharacter, cardImgUrl);
        });
    });

    if (backToSelectBtn) {
        backToSelectBtn.addEventListener('click', () => {
            resetAllPlayback();
            playerSection.classList.add('hidden');
            characterSelectSection.classList.remove('hidden');
            statusText.textContent = "เลือกเมมเบอร์ที่ต้องการ";
        });
    }
};

function activateCharacterCard(charName, imgUrl) {
    selectedCharacter = charName;
    selectedCharImg.src = imgUrl;

    pixelTimerBox.className = "pixel-timer-container";
    pixelTimerBox.classList.add(`pos-${selectedCharacter.toLowerCase()}`);

    characterSelectSection.classList.add('hidden');
    playerSection.classList.remove('hidden');
    
    // ตั้งค่าเริ่มต้นให้อยู่ที่แท็บ Spotify และเริ่มนับเวลาให้ทันทีที่เลือกเมมเบอร์
    isSpotifyActive = true;
    evaluateTimerState();
    statusText.textContent = `${playerName} กำลังฟัง Spotify กับ ${selectedCharacter} 💤`;
}

// สร้าง YouTube Player ควบคุมผ่าน API
function initYTPlayer() {
    ytPlayer = new YT.Player('youtube-player', {
        height: '130',
        width: '100%',
        videoId: CORRECT_YT_ID,
        playerVars: {
            'autoplay': 0,
            'controls': 1,
            'loop': 1,
            'playlist': CORRECT_YT_ID
        },
        events: {
            'onStateChange': onYTPlayerStateChange
        }
    });
}

function onYTPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        const currentVideoId = ytPlayer.getVideoData().video_id;
        if (currentVideoId === CORRECT_YT_ID) {
            isYTPlaying = true;
        }
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        isYTPlaying = false;
    }
    evaluateTimerState();
}

// ประเมินสถานะการนับเวลารวม
function evaluateTimerState() {
    // ถ้าอยู่หน้า Spotify หรือ YouTube กำลังเล่นอยู่ ให้เริ่มนับเวลา
    if (isSpotifyActive || isYTPlaying) {
        startTimer();
        const platform = isSpotifyActive ? "Spotify" : "YouTube";
        statusText.textContent = `${playerName} กำลังฟังเพลงผ่าน ${platform} กับ ${selectedCharacter} 💤`;
    } else {
        stopTimer();
        statusText.textContent = `${playerName} หยุดฟังเพลง (หยุดจับเวลา)`;
    }
}

function resetAllPlayback() {
    stopTimer();
    isSpotifyActive = false;
    isYTPlaying = false;
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
}

function startTimer() {
    if (timerInterval) return;

    timerInterval = setInterval(() => {
        totalElapsedSeconds++;
        updateTimerDisplay(totalElapsedSeconds);
        localStorage.setItem('insomnia_total_seconds', totalElapsedSeconds);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function updateTimerDisplay(totalSeconds) {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    
    sleepTimerEl.textContent = `${minutes}:${seconds}`;
}

// ระบบบันทึกภาพการ์ดพร้อมเวลาและแชร์ไปที่ X
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
                allowTaint: true,
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
                `🌙 ${playerName} ฟังเพลง Insomnia - RIIZE สะสมเวลาความฝันกับ ${selectedCharacter} ไปแล้ว ${timerText} นาที 💤✨\n\n(บันทึกภาพการ์ดแล้ว อย่าลืมแนบรูปภาพลงในโพสต์นะ!)\n\nมาร่วมฟังเพลงและสะสมเวลาไปด้วยกันที่:`
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