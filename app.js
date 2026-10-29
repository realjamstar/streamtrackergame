// เอาการเรียก initSpotifyEmbed ออกจาก window.onload
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
            playerSection.classList.add('hidden');
            characterSelectSection.classList.remove('hidden');
            statusText.textContent = "เลือกเมมเบอร์ที่ต้องการ";
        });
    }
};

let isPlayerLoaded = false;

function activateCharacterCard(charName, imgUrl) {
    selectedCharacter = charName;
    selectedCharImg.src = imgUrl;

    pixelTimerBox.className = "pixel-timer-container";
    pixelTimerBox.classList.add(`pos-${selectedCharacter.toLowerCase()}`);

    characterSelectSection.classList.add('hidden');
    playerSection.classList.remove('hidden');
    statusText.textContent = `${playerName} พร้อมจำศีลกับ ${selectedCharacter} (กด Play เพลงด้านล่างเพื่อเริ่มนับเวลา)`;

    // โหลด Spotify Embed Player ทันทีที่ผู้ใช้เลือกเมมเบอร์และเข้ามาหน้า player-section แล้ว
    if (!isPlayerLoaded) {
        initSpotifyEmbed();
        isPlayerLoaded = true;
    }
}

function initSpotifyEmbed() {
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
        const element = document.getElementById('spotify-player');
        const options = {
            width: '100%',
            height: '80',
            uri: 'spotify:track:5jC3lBWBcVdby76sqWwqAE'
        };
        
        const callback = (EmbedController) => {
            embedControllerRef = EmbedController;
            EmbedController.addListener('playback_update', e => {
                if (e.data.isPaused) {
                    stopTimer();
                    statusText.textContent = `${playerName} หยุดฟังเพลง Insomnia (หยุดจับเวลา)`;
                } else {
                    startTimer();
                    statusText.textContent = `${playerName} กำลังฟัง Insomnia กับ ${selectedCharacter} 💤`;
                }
            });
        };

        IFrameAPI.createIframe(element, options, callback);
    };

    if (!document.getElementById('spotify-iframe-script')) {
        const scriptTag = document.createElement('script');
        scriptTag.id = 'spotify-iframe-script';
        scriptTag.src = "https://open.spotify.com/embed/iframe-api/v1";
        scriptTag.async = true;
        document.body.appendChild(scriptTag);
    }
}