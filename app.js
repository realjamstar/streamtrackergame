let timerInterval = null;
let totalElapsedSeconds = 0; 
let selectedCharacter = null; 
let playerName = "";

let isSpotifyManualPlaying = false;
let ytPlayer = null;
let isYTInitialized = false;
let isYTPlaying = false;
let currentLang = localStorage.getItem('insomnia_lang') || 'th'; // ค่าเริ่มต้นภาษาไทย

const CORRECT_YT_ID = "RgkoXU4BlOE";

// 📌 พจนานุกรมคำแปล (Localization Dictionary)
const translations = {
    th: {
        langCode: "EN", // ปุ่มกดสลับจะโชว์ภาษาตรงข้าม
        editName: "✏️ เปลี่ยนชื่อ",
        resetTimer: "🔄 รีเซ็ตเวลาเป็น 0",
        statusInitial: "พิมพ์ชื่อของคุณแล้วเลือกเมมเบอร์ที่ต้องการ",
        warningText: "✨⚠️ เลือกช่องทางฟังเพลง (Spotify หรือ YouTube) เวลานับอัตโนมัติเมื่อกดฟัง ✨",
        namePlaceholder: "พิมพ์ชื่อของคุณที่นี่...",
        startBtn: "เริ่มเข้าสู่การ Insomnia 💤",
        selectMember: "เลือกเมมเบอร์ที่ต้องการ:",
        backToSelect: "← กลับไปเลือกเมมเบอร์อื่น",
        spotifyPlayBtn: "กดเพื่อเริ่มนับเวลาฟัง Spotify",
        spotifyPauseBtn: "หยุดพักการนับเวลา Spotify (Pause)",
        spotifyTip: "สำหรับ Spotify อย่าลืมกดปุ่มนับเวลาก่อนกดปุ่มเล่นนะคับ ♥",
        shareBtn: "𝕏 บันทึกภาพการ์ดและแชร์ไปที่ X",
        statusListening: (name, char) => `${name} กำลังฟังเพลงกับ ${char} 💤`,
        statusListeningSpotify: (name, char) => `${name} กำลังฟัง Spotify กับ ${char} 💤`,
        statusListeningYT: (name, char) => `${name} กำลังฟัง YouTube กับ ${char} 💤`,
        statusStopped: (name) => `${name} หยุดฟังเพลง (หยุดจับเวลา)`,
        readyMsg: (name, char) => `${name} พร้อมจำศีลกับ ${char} (เลือกช่องทางฟังเพลงได้เลย)`,
        resetConfirm: "คุณต้องการรีเซ็ตเวลาสะสมทั้งหมดกลับเป็น 0 ใช่หรือไม่?",
        nameAlert: "กรุณากรอกชื่อของคุณก่อนเริ่มต้นครับ!",
        creatingCard: "กำลังสร้างรูปภาพการ์ดของคุณ...",
        cardSaved: "บันทึกภาพการ์ดเรียบร้อย! กำลังเปิด X... 💤",
        tweetText: (name, char, time) => `🌙 ${name} ฟังเพลง Insomnia - RIIZE สะสมเวลาความฝันกับ ${char} ไปแล้ว ${time} นาที 💤✨\n\n(บันทึกภาพการ์ดแล้ว อย่าลืมแนบรูปภาพลงในโพสต์นะ!)\n\nมาร่วมฟังเพลงและสะสมเวลาไปด้วยกันที่:`
    },
    en: {
        langCode: "TH",
        editName: "✏️ Edit Name",
        resetTimer: "🔄 Reset Timer to 0",
        warningText: "✨⚠️ Choose a music player (Spotify or YouTube) to accumulate sleep time automatically ✨",
        statusInitial: "Type your name and select a member",
        namePlaceholder: "Type your name here...",
        startBtn: "Start Insomnia 💤",
        selectMember: "Select a member:",
        backToSelect: "← Back to member selection",
        spotifyPlayBtn: "Click to start Spotify timer",
        spotifyPauseBtn: "Pause Spotify timer",
        spotifyTip: "For Spotify, remember to click the timer button before playing ♥",
        shareBtn: "𝕏 Save Card & Share to X",
        statusListening: (name, char) => `${name} is listening to music with ${char} 💤`,
        statusListeningSpotify: (name, char) => `${name} is listening to Spotify with ${char} 💤`,
        statusListeningYT: (name, char) => `${name} is listening to YouTube with ${char} 💤`,
        statusStopped: (name) => `${name} stopped listening (Timer paused)`,
        readyMsg: (name, char) => `${name} is ready with ${char} (Choose your music player)`,
        resetConfirm: "Do you want to reset all accumulated time to 0?",
        nameAlert: "Please enter your name first!",
        creatingCard: "Generating your card image...",
        cardSaved: "Card saved successfully! Opening X... 💤",
        tweetText: (name, char, time) => `🌙 ${name} listened to Insomnia - RIIZE and dreamed with ${char} for ${time} minutes 💤✨\n\n(Card image downloaded! Don't forget to attach it!)\n\nJoin the insomnia session at:`
    }
};

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

const tabSpotify = document.getElementById('tab-spotify');
const tabYoutube = document.getElementById('tab-youtube');
const spotifyBox = document.getElementById('spotify-box');
const youtubeBox = document.getElementById('youtube-box');

const spotifyPlayToggle = document.getElementById('spotify-play-toggle');
const spotifyBtnIcon = document.getElementById('spotify-btn-icon');
const spotifyBtnText = document.getElementById('spotify-btn-text');

// ปุ่มเปลี่ยนภาษา
const langToggleBtn = document.getElementById('lang-toggle-btn');
const langLabel = document.getElementById('lang-label');

window.onload = () => {
    totalElapsedSeconds = parseInt(localStorage.getItem('insomnia_total_seconds')) || 0;
    updateTimerDisplay(totalElapsedSeconds);
    updateLanguageUI();

    const savedName = localStorage.getItem('insomnia_player_name');
    if (savedName) {
        playerName = savedName;
        userNameEl.textContent = playerName;
        userProfile.classList.remove('hidden');
        nameInputSection.classList.add('hidden');
        characterSelectSection.classList.remove('hidden');
        statusText.textContent = translations[currentLang].statusInitial;
    }

    startNameBtn.addEventListener('click', () => {
        const inputVal = playerNameInput.value.trim();
        if (!inputVal) {
            alert(translations[currentLang].nameAlert);
            return;
        }

        playerName = inputVal;
        localStorage.setItem('insomnia_player_name', playerName);

        userNameEl.textContent = playerName;
        userProfile.classList.remove('hidden');
        nameInputSection.classList.add('hidden');
        characterSelectSection.classList.remove('hidden');
        statusText.textContent = translations[currentLang].statusInitial;
    });

    if (editNameBtn) {
        editNameBtn.addEventListener('click', () => {
            resetAllPlayback();
            playerSection.classList.add('hidden');
            characterSelectSection.classList.add('hidden');
            userProfile.classList.add('hidden');
            nameInputSection.classList.remove('hidden');
            playerNameInput.value = playerName;
        });
    }

    if (resetTimerBtn) {
        resetTimerBtn.addEventListener('click', () => {
            if (confirm(translations[currentLang].resetConfirm)) {
                totalElapsedSeconds = 0;
                localStorage.setItem('insomnia_total_seconds', 0);
                updateTimerDisplay(totalElapsedSeconds);
            }
        });
    }

    // กดปุ่มเปลี่ยนภาษา
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            currentLang = currentLang === 'th' ? 'en' : 'th';
            localStorage.setItem('insomnia_lang', currentLang);
            updateLanguageUI();
        });
    }

    if (spotifyPlayToggle) {
        spotifyPlayToggle.addEventListener('click', () => {
            isSpotifyManualPlaying = !isSpotifyManualPlaying;
            updateSpotifyButtonUI();
            evaluateTimerState();
        });
    }

    if (tabSpotify && tabYoutube) {
        tabSpotify.addEventListener('click', () => {
            tabSpotify.className = "py-1.5 px-3 rounded-lg text-xs font-bold bg-pink-600 text-white transition shadow-sm";
            tabYoutube.className = "py-1.5 px-3 rounded-lg text-xs font-bold text-purple-300 hover:text-white transition";
            spotifyBox.classList.remove('hidden');
            youtubeBox.classList.add('hidden');
        });

        tabYoutube.addEventListener('click', () => {
            tabYoutube.className = "py-1.5 px-3 rounded-lg text-xs font-bold bg-pink-600 text-white transition shadow-sm";
            tabSpotify.className = "py-1.5 px-3 rounded-lg text-xs font-bold text-purple-300 hover:text-white transition";
            youtubeBox.classList.remove('hidden');
            spotifyBox.classList.add('hidden');

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
            statusText.textContent = translations[currentLang].statusInitial;
        });
    }
};

// ฟังก์ชันอัปเดตคำแปลภาษาบนหน้าเว็บ
function updateLanguageUI() {
    langLabel.textContent = translations[currentLang].langCode;

    // แปลข้อความทั่วไปผ่าน data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    // แปล placeholder ในช่องกรอกชื่อ
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.setAttribute('placeholder', translations[currentLang][key]);
        }
    });

    // อัปเดตข้อความปุ่ม Spotify ตามภาษาปัจจุบัน
    updateSpotifyButtonUI();
}

function activateCharacterCard(charName, imgUrl) {
    selectedCharacter = charName;
    selectedCharImg.src = imgUrl;

    pixelTimerBox.className = "pixel-timer-container";
    pixelTimerBox.classList.add(`pos-${selectedCharacter.toLowerCase()}`);

    characterSelectSection.classList.add('hidden');
    playerSection.classList.remove('hidden');
    
    resetAllPlayback();
    statusText.textContent = translations[currentLang].readyMsg(playerName, selectedCharacter);
}

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

function updateSpotifyButtonUI() {
    if (isSpotifyManualPlaying) {
        spotifyPlayToggle.className = "w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-2 px-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2 text-xs shadow-sm";
        spotifyBtnIcon.textContent = "⏸️";
        spotifyBtnText.textContent = translations[currentLang].spotifyPauseBtn;
    } else {
        spotifyPlayToggle.className = "w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2 text-xs shadow-sm";
        spotifyBtnIcon.textContent = "▶️";
        spotifyBtnText.textContent = translations[currentLang].spotifyPlayBtn;
    }
}

function evaluateTimerState() {
    const t = translations[currentLang];
    if (isSpotifyManualPlaying || isYTPlaying) {
        startTimer();
        if (isSpotifyManualPlaying) {
            statusText.textContent = t.statusListeningSpotify(playerName, selectedCharacter);
        } else {
            statusText.textContent = t.statusListeningYT(playerName, selectedCharacter);
        }
    } else {
        stopTimer();
        statusText.textContent = t.statusStopped(playerName);
    }
}

function resetAllPlayback() {
    stopTimer();
    isSpotifyManualPlaying = false;
    isYTPlaying = false;
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    updateSpotifyButtonUI();
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

// ระบบบันทึกภาพการ์ดพร้อมเวลาและแชร์ไปที่ X (รองรับ 2 ภาษา)
const shareXBtn = document.getElementById('share-x-btn');
if (shareXBtn) {
    shareXBtn.addEventListener('click', async () => {
        const timerText = sleepTimerEl.textContent;
        const currentUrl = window.location.href;
        const cardContainer = document.getElementById('share-card-container');
        const t = translations[currentLang];

        statusText.textContent = t.creatingCard;

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

            statusText.textContent = t.cardSaved;

            // คำนวณนาทีจาก timerText (MM:SS) มาแปลงเป็นนาทีคร่าวๆ หรือใช้สตริงตรงๆ
            const parts = timerText.split(':');
            const totalMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            const minutesDisplay = Math.max(1, Math.floor(totalMinutes / 60)); // แปลงเป็นนาที

            const tweetMessage = encodeURIComponent(t.tweetText(playerName, selectedCharacter, minutesDisplay));
            const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetMessage}&url=${encodeURIComponent(currentUrl)}`;
            
            setTimeout(() => {
                window.open(twitterShareUrl, '_blank');
            }, 1000);

        } catch (error) {
            console.error("Error generating card image:", error);
            statusText.textContent = "Error generating card image. Please try again.";
        }
    });
}