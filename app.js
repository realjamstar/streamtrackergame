let timerInterval = null;
let totalElapsedSeconds = 0; 
let selectedCharacter = null; 
let playerName = "";
let isPlaying = false; // เช็กสถานะว่ากำลังกดเล่นอยู่หรือไม่

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

// ปุ่ม Play/Pause บนหน้าเว็บ
const playPauseBtn = document.getElementById('play-pause-btn');
const playPauseIcon = document.getElementById('play-pause-icon');
const playPauseText = document.getElementById('play-pause-text');

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
            stopTimer();
            isPlaying = false;
            updatePlayPauseButtonUI();
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
            stopTimer(); 
            isPlaying = false;
            updatePlayPauseButtonUI();
            playerSection.classList.add('hidden');
            characterSelectSection.classList.remove('hidden');
            statusText.textContent = "เลือกเมมเบอร์ที่ต้องการ";
        });
    }

    // ฟังก์ชันกดปุ่ม Play/Pause เพื่อเริ่มหรือหยุดจับเวลา
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            isPlaying = !isPlaying;
            if (isPlaying) {
                startTimer();
                statusText.textContent = `${playerName} กำลังฟังเพลงกับ ${selectedCharacter} 💤`;
            } else {
                stopTimer();
                statusText.textContent = `${playerName} หยุดฟังเพลง (หยุดจับเวลา)`;
            }
            updatePlayPauseButtonUI();
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
    
    // ตั้งค่าเริ่มต้นเมื่อเข้ามาหน้าเล่นเพลง (ยังไม่นับ จนกว่าจะกดปุ่ม Play)
    stopTimer();
    isPlaying = false;
    updatePlayPauseButtonUI();
    statusText.textContent = `${playerName} พร้อมแล้ว! กดปุ่ม Play ด้านล่างเพื่อเริ่มนับเวลา`;
}

function updatePlayPauseButtonUI() {
    if (isPlaying) {
        playPauseBtn.className = "w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-2.5 px-4 rounded-xl transition duration-200 flex items-center justify-center space-x-2 text-xs shadow-md";
        playPauseIcon.textContent = "⏸️";
        playPauseText.textContent = "หยุดพักการฟังเพลง (Pause)";
    } else {
        playPauseBtn.className = "w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition duration-200 flex items-center justify-center space-x-2 text-xs shadow-md";
        playPauseIcon.textContent = "▶️";
        playPauseText.textContent = "กดเพื่อเริ่มฟังและนับเวลา";
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