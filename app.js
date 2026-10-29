let timerInterval = null;
let totalElapsedSeconds = 0; 
let selectedCharacter = null; 
let playerName = "";

// ตัวแปรควบคุมเครื่องเล่น
let spotifyController = null;
let isSpotifyApiLoaded = false;
let ytPlayer = null;
let isYTPlayerInitialized = false;

// สถานะการเล่นของแต่ละตัวเล่น เพื่อเช็กว่าหยุดเล่นทั้งคู่หรือยัง
let isSpotifyPlaying = false;
let isYTPlaying = false;

// 📌 กำหนด YouTube Video ID ของเพลง Insomnia ที่อนุญาตให้นับเวลา
const ALLOWED_YT_TRACK_IDS = [
    "5jC3lBWBcVdby76sqWwqAE" // เปลี่ยนเป็น Video ID จริงบน YouTube
];

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
            stopTimerCompletely();
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
            stopTimerCompletely();
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
    statusText.textContent = `${playerName} พร้อมจำศีลกับ ${selectedCharacter} (กด Play เพลงด้านล่าง)`;

    // โหลด Spotify Embed Player
    if (!isSpotifyApiLoaded) {
        initSpotifyEmbed();
        isSpotifyApiLoaded = true;
    }

    // โหลด YouTube Player
    if (!isYTPlayerInitialized) {
        loadYouTubeAPI();
        isYTPlayerInitialized = true;
    }
}

// 1. ฟังก์ชันจัดการ Spotify Embed
function initSpotifyEmbed() {
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
        const element = document.getElementById('spotify-embed-container');
        const options = {
            width: '100%',
            height: '80',
            uri: 'spotify:track:5jC3lBWBcVdby76sqWwqAE'
        };
        
        const callback = (EmbedController) => {
            spotifyController = EmbedController;
            EmbedController.addListener('playback_update', e => {
                if (e.data.isPaused) {
                    isSpotifyPlaying = false;
                    checkPlaybackStatus();
                } else {
                    isSpotifyPlaying = true;
                    checkPlaybackStatus();
                }
            });
        };

        IFrameAPI.createIframe(element, options, callback);
    };

    if (!document.getElementById('spotify-iframe-api-script')) {
        const scriptTag = document.createElement('script');
        scriptTag.id = 'spotify-iframe-api-script';
        scriptTag.src = "https://open.spotify.com/embed/iframe-api/v1";
        scriptTag.async = true;
        document.body.appendChild(scriptTag);
    }
}

// 2. ฟังก์ชันจัดการ YouTube Player
function loadYouTubeAPI() {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        initYTPlayer();
    }
}

window.onYouTubeIframeAPIReady = function() {
    initYTPlayer();
};

function initYTPlayer() {
    ytPlayer = new YT.Player('youtube-player', {
        height: '140',
        width: '100%',
        videoId: ALLOWED_YT_TRACK_IDS[0],
        playerVars: {
            'autoplay': 0,
            'controls': 1,
            'loop': 1,
            'playlist': ALLOWED_YT_TRACK_IDS.join(',')
        },
        events: {
            'onStateChange': onYTPlayerStateChange
        }
    });
}

function onYTPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        const currentVideoId = ytPlayer.getVideoData().video_id;
        if (ALLOWED_YT_TRACK_IDS.includes(currentVideoId)) {
            isYTPlaying = true;
            checkPlaybackStatus();
        } else {
            isYTPlaying = false;
            checkPlaybackStatus();
        }
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        isYTPlaying = false;
        checkPlaybackStatus();
    }
}

// 3. ระบบรวมเช็กสถานะการเล่นเพลง (ถ้าตัวใดตัวหนึ่งเล่นอยู่ ให้เริ่มนับเวลา)
function checkPlaybackStatus() {
    if (isSpotifyPlaying || isYTPlaying) {
        startTimer();
        statusText.textContent = `${playerName} กำลังฟังเพลงกับ ${selectedCharacter} 💤`;
    } else {
        stopTimer();
        statusText.textContent = `${playerName} หยุดฟังเพลง (หยุดจับเวลา)`;
    }
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

function stopTimerCompletely() {
    stopTimer();
    isSpotifyPlaying = false;
    isYTPlaying = false;
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