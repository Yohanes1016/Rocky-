let messages = [];
let isTyping = false;
let sessionHistory = [];
let historyCreated = false;
let archives = [];
let mouthInterval = null;
let voiceReplyEnabled = false;
let isRecording = false;
let recognition = null;
let currentSpeakBtn = null;

// ========================
// INIT
// ========================

document.addEventListener('DOMContentLoaded', () => {
    startBlinking();
    window.speechSynthesis.getVoices();

    const sendBtn = document.querySelector('.send-btn');
    const input   = document.getElementById('user-input');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input)   input.addEventListener('keypress', handleEnter);

    const icon = document.getElementById('voice-icon');
    if (icon) icon.className = 'ti ti-volume-off';
});

// ========================
// SIDEBAR TOGGLE
// ========================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

// ========================
// VOICE REPLY TOGGLE
// ========================

function toggleVoiceReply() {
    voiceReplyEnabled = !voiceReplyEnabled;
    const btn  = document.getElementById('voice-toggle-btn');
    const icon = document.getElementById('voice-icon');
    if (!btn || !icon) return;
    if (voiceReplyEnabled) {
        btn.classList.add('active');
        icon.className = 'ti ti-volume';
        showVoiceStatus('🔊 Auto balas suara aktif');
    } else {
        btn.classList.remove('active');
        icon.className = 'ti ti-volume-off';
        showVoiceStatus('🔇 Auto balas suara nonaktif');
        window.speechSynthesis.cancel();
        stopAllSpeakBtns();
    }
    setTimeout(() => showVoiceStatus(''), 2000);
}

function showVoiceStatus(msg) {
    const el = document.getElementById('voice-status');
    if (el) el.textContent = msg;
}

// ========================
// STOP SEMUA TOMBOL SUARA
// ========================

function stopAllSpeakBtns() {
    document.querySelectorAll('.speak-btn').forEach(btn => {
        btn.classList.remove('playing');
        btn.innerHTML = '<i class="ti ti-player-play"></i> Putar';
    });
    setAvatarTalking(false);
    stopLastMsgAvatarTalking();
}

// ========================
// BERSIHKAN TEKS UNTUK SUARA
// ========================

function cleanForSpeech(text) {
    return text
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{3030}]|[\u{2B50}]|[\u{2B55}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{3297}]|[\u{3299}]|[\u{303D}]|[\u{00A9}]|[\u{00AE}]|[\u{2122}]|[\u{23F3}]|[\u{24C2}]|[\u{23E9}-\u{23EF}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]/gu, '')
        .replace(/<[^>]*>/g, '')
        .replace(/~+/g, '')
        .replace(/\.{2,}/g, '.')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ========================
// TEXT TO SPEECH - SUARA PRIA SOFT
// ========================

function speakAsRocky(text, btn) {
    if (!window.speechSynthesis) return;

    if (btn && btn.classList.contains('playing')) {
        window.speechSynthesis.cancel();
        btn.classList.remove('playing');
        btn.innerHTML = '<i class="ti ti-player-play"></i> Putar';
        setAvatarTalking(false);
        stopLastMsgAvatarTalking();
        currentSpeakBtn = null;
        return;
    }

    window.speechSynthesis.cancel();
    stopAllSpeakBtns();

    const clean = cleanForSpeech(text);
    if (!clean) return;

    const utter = new SpeechSynthesisUtterance(clean);

    utter.lang   = 'id-ID';
    utter.pitch  = 1.0;
    utter.rate   = 1.0;
    utter.volume = 1.0;

    const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();

        const preferred =
            voices.find(v => v.name === 'Microsoft Andika - Indonesian (Indonesia)') ||
            voices.find(v => v.lang === 'id-ID') ||
            voices.find(v => v.name === 'Microsoft David - English (United States)') ||
            voices[0];

        if (preferred) utter.voice = preferred;

        utter.onstart = () => {
            setAvatarTalking(true);
            if (btn) {
                const msgGroup  = btn.closest('.msg-group');
                const msgAvatar = msgGroup?.querySelector('.msg-avatar-sm');
                if (msgAvatar) {
                    msgAvatar.classList.add('talking');
                    currentSpeakBtn = { btn, msgAvatar };
                }
                btn.classList.add('playing');
                btn.innerHTML = '<i class="ti ti-player-pause"></i> Stop';
            }
        };

        utter.onend = () => {
            setAvatarTalking(false);
            stopLastMsgAvatarTalking();
            if (btn) {
                btn.classList.remove('playing');
                btn.innerHTML = '<i class="ti ti-player-play"></i> Putar';
            }
            currentSpeakBtn = null;
        };

        utter.onerror = () => {
            setAvatarTalking(false);
            stopLastMsgAvatarTalking();
            if (btn) {
                btn.classList.remove('playing');
                btn.innerHTML = '<i class="ti ti-player-play"></i> Putar';
            }
            currentSpeakBtn = null;
        };

        window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
    } else {
        trySpeak();
    }
}

function stopLastMsgAvatarTalking() {
    if (currentSpeakBtn?.msgAvatar) {
        currentSpeakBtn.msgAvatar.classList.remove('talking');
    }
    document.querySelectorAll('.msg-avatar-sm.talking').forEach(a => {
        a.classList.remove('talking');
    });
}

// ========================
// VOICE INPUT
// ========================

function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showVoiceStatus('❌ Browser tidak mendukung pesan suara');
        setTimeout(() => showVoiceStatus(''), 3000);
        return;
    }
    isRecording ? stopRecording() : startRecording();
}

function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isRecording = true;
        document.getElementById('mic-btn')?.classList.add('recording');
        const icon = document.getElementById('mic-icon');
        if (icon) icon.className = 'ti ti-microphone-off';
        showVoiceStatus('🔴 Sedang merekam... bicara sekarang!');
    };

    recognition.onresult = (e) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            transcript += e.results[i][0].transcript;
        }
        const input = document.getElementById('user-input');
        if (input) input.value = transcript;
    };

    recognition.onend = () => {
        stopRecording();
        const text = document.getElementById('user-input')?.value.trim();
        if (text) sendMessage();
    };

    recognition.onerror = (e) => {
        stopRecording();
        showVoiceStatus('❌ Gagal merekam: ' + e.error);
        setTimeout(() => showVoiceStatus(''), 3000);
    };

    recognition.start();
}

function stopRecording() {
    isRecording = false;
    document.getElementById('mic-btn')?.classList.remove('recording');
    const icon = document.getElementById('mic-icon');
    if (icon) icon.className = 'ti ti-microphone';
    showVoiceStatus('');
    if (recognition) {
        try { recognition.stop(); } catch(e) {}
        recognition = null;
    }
}

// ========================
// PANDA ANIMATIONS
// ========================

function setAvatarTalking(isTalking) {
    document.querySelectorAll('.panda-svg').forEach(av =>
        isTalking ? av.classList.add('talking') : av.classList.remove('talking')
    );
    animateMouth(isTalking);
}

function animateMouth(isTalking) {
    const getMouths = () => [
        document.getElementById('panda-mouth'),
        document.getElementById('panda-mouth-large')
    ];
    if (isTalking) {
        clearInterval(mouthInterval);
        let open = false;
        mouthInterval = setInterval(() => {
            open = !open;
            getMouths().forEach(m => {
                if (m) m.setAttribute('d', open
                    ? 'M 42 58 Q 50 70 58 58'
                    : 'M 42 58 Q 50 61 58 58');
            });
        }, 180);
    } else {
        clearInterval(mouthInterval);
        getMouths().forEach(m => {
            if (m) m.setAttribute('d', 'M 42 58 Q 50 65 58 58');
        });
    }
}

function startBlinking() {
    const getPupils = () => [
        document.getElementById('pupil-left'),
        document.getElementById('pupil-right'),
        document.getElementById('pupil-left-large'),
        document.getElementById('pupil-right-large')
    ];

    setInterval(() => {
        getPupils().forEach(p => { if (p) p.setAttribute('ry', '0.3'); });
        setTimeout(() => {
            getPupils().forEach(p => { if (p) p.setAttribute('ry', '3'); });
        }, 130);
    }, 3500);

    setInterval(() => {
        const dx = (Math.random() - 0.5) * 2.5;
        const dy = (Math.random() - 0.5) * 1.5;
        [['pupil-left',34],['pupil-right',68],
         ['pupil-left-large',34],['pupil-right-large',68]
        ].forEach(([id, cx]) => {
            const el = document.getElementById(id);
            if (el) {
                el.setAttribute('cx', cx + dx);
                el.setAttribute('cy', 41 + dy);
            }
        });
    }, 2500);
}

// ========================
// SEND MESSAGE
// ========================

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

function sendSuggestion(text) {
    const input = document.getElementById('user-input');
    if (input) input.value = text;
    sendMessage();
}

function sendMessage() {
    if (isTyping) return;

    const input = document.getElementById('user-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.remove();

    appendMessage('user', text, text);
    messages.push({ role: 'user', content: text });
    sessionHistory.push({ role: 'user', content: text });

    showTyping();

    fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    })
    .then(r => r.json())
    .then(data => {
        removeTyping();
        const plain     = data.reply || 'Maaf, tidak ada jawaban.';
        const formatted = data.formatted || plain;
        appendMessage('bot', plain, formatted);
        messages.push({ role: 'assistant', content: plain });
        sessionHistory.push({ role: 'assistant', content: plain });
        updateHistoryItem();

        if (voiceReplyEnabled) {
            const allBtns = document.querySelectorAll('.speak-btn');
            const lastBtn = allBtns[allBtns.length - 1];
            speakAsRocky(plain, lastBtn);
        }
    })
    .catch(() => {
        removeTyping();
        const errMsg = 'Aduh, Rocky gagal konek nih! Coba lagi ya~ 🐼';
        appendMessage('bot', errMsg, errMsg);
    });
}

// ========================
// APPEND MESSAGE
// ========================

function getTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2,'0') + ':' +
           now.getMinutes().toString().padStart(2,'0');
}

const PANDA_MINI = `<svg viewBox="0 0 100 100" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="28" r="14" fill="#2a2a2a"/>
    <circle cx="22" cy="28" r="8" fill="#555"/>
    <circle cx="78" cy="28" r="14" fill="#2a2a2a"/>
    <circle cx="78" cy="28" r="8" fill="#555"/>
    <ellipse cx="50" cy="72" rx="28" ry="22" fill="#2a2a2a"/>
    <circle cx="50" cy="45" r="32" fill="white"/>
    <ellipse cx="33" cy="40" rx="10" ry="11" fill="#2a2a2a"/>
    <ellipse cx="67" cy="40" rx="10" ry="11" fill="#2a2a2a"/>
    <circle cx="33" cy="40" r="5" fill="white"/>
    <circle cx="34" cy="41" r="3" fill="#1a1a1a"/>
    <circle cx="67" cy="40" r="5" fill="white"/>
    <circle cx="68" cy="41" r="3" fill="#1a1a1a"/>
    <ellipse cx="50" cy="52" rx="5" ry="3" fill="#ffb6c1"/>
    <path d="M 42 58 Q 50 65 58 58" stroke="#2a2a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;

function appendMessage(role, plainText, htmlText) {
    const box = document.getElementById('chat-box');
    if (!box) return;

    const group = document.createElement('div');
    group.className = `msg-group ${role}`;

    const row = document.createElement('div');
    row.className = `msg-row ${role}`;

    const av = document.createElement('div');
    if (role === 'bot') {
        av.className = 'msg-avatar-sm';
        av.innerHTML = PANDA_MINI;
    } else {
        av.className = 'user-av-sm';
        av.textContent = 'U';
    }
    row.appendChild(av);

    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${role}`;
    bubble.innerHTML = htmlText || plainText;
    row.appendChild(bubble);
    group.appendChild(row);

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.style.justifyContent = role === 'user' ? 'flex-end' : 'flex-start';

    if (role === 'bot') {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn';
        speakBtn.innerHTML = '<i class="ti ti-player-play"></i> Putar';
        speakBtn.onclick = () => speakAsRocky(plainText, speakBtn);
        meta.appendChild(speakBtn);
    }

    const timeEl = document.createElement('div');
    timeEl.className = 'msg-time';
    timeEl.textContent = getTime();
    meta.appendChild(timeEl);

    group.appendChild(meta);
    box.appendChild(group);
    box.scrollTop = box.scrollHeight;
}

// ========================
// TYPING INDICATOR
// ========================

function showTyping() {
    isTyping = true;
    setAvatarTalking(true);

    const box = document.getElementById('chat-box');
    if (!box) return;

    const wrap = document.createElement('div');
    wrap.className = 'typing-wrap';
    wrap.id = 'typing-indicator';

    const av = document.createElement('div');
    av.className = 'msg-avatar-sm';
    av.innerHTML = PANDA_MINI;
    wrap.appendChild(av);

    const t = document.createElement('div');
    t.className = 'typing';
    t.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    wrap.appendChild(t);

    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
}

function removeTyping() {
    isTyping = false;
    setAvatarTalking(false);
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

// ========================
// HISTORY
// ========================

function updateHistoryItem() {
    const list = document.getElementById('history-list');
    if (!list) return;

    if (!historyCreated) {
        const item = document.createElement('div');
        item.className = 'history-item active';
        item.id = 'current-history-item';
        const title = sessionHistory[0].content.slice(0, 26) +
                      (sessionHistory[0].content.length > 26 ? '...' : '');
        item.innerHTML = `<i class="ti ti-message" style="font-size:13px;margin-right:6px;flex-shrink:0"></i>
                          <span style="overflow:hidden;text-overflow:ellipsis">${title}</span>`;
        item.onclick = () => loadSessionHistory(sessionHistory, item);
        list.insertBefore(item, list.firstChild);
        historyCreated = true;
    }

    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
    document.getElementById('current-history-item')?.classList.add('active');
}

function loadSessionHistory(historyData, clickedItem) {
    if (!historyData || historyData.length === 0) return;
    const box = document.getElementById('chat-box');
    if (!box) return;
    box.innerHTML = '';
    historyData.forEach(msg =>
        appendMessage(msg.role === 'user' ? 'user' : 'bot', msg.content, msg.content)
    );
    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
    clickedItem.classList.add('active');
}

// ========================
// NEW CHAT
// ========================

const PANDA_LARGE_SVG = `
<svg id="bot-avatar-large" class="panda-svg large" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="28" r="14" fill="#2a2a2a"/>
    <circle cx="22" cy="28" r="8" fill="#555"/>
    <circle cx="78" cy="28" r="14" fill="#2a2a2a"/>
    <circle cx="78" cy="28" r="8" fill="#555"/>
    <ellipse cx="50" cy="72" rx="28" ry="22" fill="#2a2a2a"/>
    <circle cx="50" cy="45" r="32" fill="white"/>
    <ellipse cx="33" cy="40" rx="10" ry="11" fill="#2a2a2a"/>
    <ellipse cx="67" cy="40" rx="10" ry="11" fill="#2a2a2a"/>
    <circle cx="33" cy="40" r="5" fill="white"/>
    <circle id="pupil-left-large" cx="34" cy="41" r="3" fill="#1a1a1a"/>
    <circle cx="67" cy="40" r="5" fill="white"/>
    <circle id="pupil-right-large" cx="68" cy="41" r="3" fill="#1a1a1a"/>
    <ellipse cx="50" cy="52" rx="5" ry="3" fill="#ffb6c1"/>
    <path id="panda-mouth-large" d="M 42 58 Q 50 65 58 58" stroke="#2a2a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="26" cy="56" rx="7" ry="5" fill="#ffb6c1" opacity="0.5"/>
    <ellipse cx="74" cy="56" rx="7" ry="5" fill="#ffb6c1" opacity="0.5"/>
    <rect x="8" y="60" width="7" height="30" rx="3" fill="#4CAF50"/>
    <line x1="8" y1="68" x2="15" y2="68" stroke="#388E3C" stroke-width="1.5"/>
    <line x1="8" y1="76" x2="15" y2="76" stroke="#388E3C" stroke-width="1.5"/>
    <line x1="8" y1="84" x2="15" y2="84" stroke="#388E3C" stroke-width="1.5"/>
    <rect x="85" y="60" width="7" height="30" rx="3" fill="#4CAF50"/>
    <line x1="85" y1="68" x2="92" y2="68" stroke="#388E3C" stroke-width="1.5"/>
    <line x1="85" y1="76" x2="92" y2="76" stroke="#388E3C" stroke-width="1.5"/>
    <line x1="85" y1="84" x2="92" y2="84" stroke="#388E3C" stroke-width="1.5"/>
    <ellipse cx="20" cy="70" rx="9" ry="7" fill="#2a2a2a" transform="rotate(-30 20 70)"/>
    <ellipse cx="80" cy="70" rx="9" ry="7" fill="#2a2a2a" transform="rotate(30 80 70)"/>
</svg>`;

function newChat() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopAllSpeakBtns();

    if (sessionHistory.length > 0) {
        const snapshot = [...sessionHistory];
        archives.push(snapshot);
        const currentItem = document.getElementById('current-history-item');
        if (currentItem) {
            currentItem.removeAttribute('id');
            currentItem.classList.remove('active');
            const captured     = snapshot;
            const capturedItem = currentItem;
            capturedItem.onclick = () => loadSessionHistory(captured, capturedItem);
        }
    }

    messages       = [];
    sessionHistory = [];
    historyCreated = false;

    fetch('/clear', { method: 'POST' }).catch(() => {});

    const box = document.getElementById('chat-box');
    if (!box) return;

    box.innerHTML = `
    <div class="empty-state" id="empty-state">
        <div class="avatar-wrap large">
            ${PANDA_LARGE_SVG}
            <div class="avatar-shadow large"></div>
        </div>
        <p class="empty-title">Haii! Aku Rocky 🐼</p>
        <p class="empty-sub">Panda pintar yang siap menjawab semua pertanyaanmu~</p>
        <div class="suggestion-chips">
            <div class="chip" onclick="sendSuggestion('Halo Rocky, kamu lagi ngapain?')">👋 Halo Rocky!</div>
                    <div class="chip" onclick="sendSuggestion('Kasih aku tebak-tebakan yang lucu dong!')">🤔 Tebak-tebakan</div>
                    <div class="chip" onclick="sendSuggestion('Ceritain fakta lucu tentang kamu dong Rocky!')">🐼 Fakta tentang Rocky</div>
                    <div class="chip" onclick="sendSuggestion('Aku lagi bosan nih, hiburin aku dong!')">😴 Aku bosen nih</div>
                    <div class="chip" onclick="sendSuggestion('Rocky suka makan apa selain bambu?')">🎋 Rocky suka makan apa?</div>
                    <div class="chip" onclick="sendSuggestion('Ceritain hal lucu yang pernah kamu alamin!')">😂 Cerita lucu dong</div>
    </div>`;

    startBlinking();
}

function clearChat() { newChat(); }