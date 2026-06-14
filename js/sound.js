/**
 * ==========================================================================
 * Neon Rogue-Maze - sound.js (효과음 합성 및 BGM 연주기)
 * 한국어 주석과 함께 상세하고 구체적으로 구현됨.
 * ==========================================================================
 */

// --------------------------------------------------------------------------
// 1. Web Audio API 기반 효과음 합성기 & 실시간 BGM 연주기 (SoundSynthesizer)
// --------------------------------------------------------------------------
const Sound = {
    ctx: null,
    lastPlay: {}, // 동일 사운드 겹침 방지를 위한 타임스탬프 저장소
    sfxVolume: 1.0, // 효과음 볼륨 기본값 (0.0 ~ 1.0)
    bgmVolume: 0.5, // 배경음악 볼륨 기본값 (0.0 ~ 1.0)
    bgmGainNode: null, // [추가] 배경음악 전용 Gain 노드
    bgmInterval: null, // [추가] Synth BGM 스케줄 루프 타이머
    bgmStep: 0, // [추가] Synth BGM 16단계 리듬 스텝 카운터

    // 오디오 컨텍스트 초기화 (브라우저 정책 상 첫 상호작용 시 활성화)
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        this.loadVolumeSettings();
        // BGM 전용 Gain 노드가 없으면 실시간 생성 후 마스터 연결
        if (this.ctx && !this.bgmGainNode) {
            this.bgmGainNode = this.ctx.createGain();
            this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
            this.bgmGainNode.connect(this.ctx.destination);
        }
    },

    loadVolumeSettings() {
        try {
            const savedOptions = JSON.parse(localStorage.getItem('neon_rogue_options'));
            if (savedOptions) {
                if (savedOptions.sfxVolume !== undefined) this.sfxVolume = parseFloat(savedOptions.sfxVolume);
                if (savedOptions.bgmVolume !== undefined) this.bgmVolume = parseFloat(savedOptions.bgmVolume);
            }
        } catch (e) {
            console.error("볼륨 설정 로드 실패:", e);
        }
    },

    saveVolumeSettings() {
        try {
            const savedOptions = JSON.parse(localStorage.getItem('neon_rogue_options')) || {};
            savedOptions.sfxVolume = this.sfxVolume;
            savedOptions.bgmVolume = this.bgmVolume;
            localStorage.setItem('neon_rogue_options', JSON.stringify(savedOptions));
        } catch (e) {
            console.error("볼륨 설정 저장 실패:", e);
        }
    },

    // 효과음 볼륨 갱신 메소드
    setSFXVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, parseFloat(val)));
        this.saveVolumeSettings();
    },

    // 배경음악 볼륨 갱신 메소드 (BGM Gain 노드와 실시간 동기화)
    setBGMVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, parseFloat(val)));
        if (this.bgmGainNode && this.ctx) {
            this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        }
        this.saveVolumeSettings();
    },

    startBGM() {
        this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (this.bgmInterval) return; // 이미 연주 중이면 중복 재생 방지

        this.bgmStep = 0;
        // 200ms 마다 한 스텝씩 진행 (BPM 150 상당의 신나는 테크노/신스웨이브 템포)
        this.bgmInterval = setInterval(() => {
            this.playBGMStep();
        }, 200);
    },

    // [신규] Synth BGM 연주 정지 메소드
    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    },

    // [신규] 16비트 레트로 신스웨이브 BGM 실시간 합성 한 스텝 연주
    playBGMStep() {
        if (!this.ctx || !this.bgmGainNode) return;
        if (this.ctx.state === 'suspended') return;

        const now = this.ctx.currentTime;

        // C마이너 펜타토닉 네온 신스 저음 베이스 주파수 정의 (C2, Eb2, F2, G2, Bb2, C3)
        const baseFreqs = [65.41, 77.78, 87.31, 98.00, 116.54, 130.81];
        // 아르페지오 멜로디 주파수 정의 (C4, Eb4, F4, G4, Bb4, C5, Eb5, G5)
        const melFreqs = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 783.99];

        // 16스텝 베이스 리듬 패턴 (C -> Eb -> F -> Bb 진행)
        const basePattern = [
            0, 0, 0, 0,  // C (4스텝)
            1, 1, 1, 1,  // Eb
            2, 2, 2, 2,  // F
            4, 4, 3, 3   // Bb -> G
        ];

        // 16스텝 은은한 멜로디 아르페지오 패턴 (0은 쉼표)
        const melPattern = [
            0, 3, 5, 3,
            1, 4, 6, 4,
            2, 5, 7, 5,
            4, 3, 1, 0
        ];

        const step = this.bgmStep;

        // 1. 저음 네온 베이스 연주 (매 스텝마다 톱니파로 웅장하고 낮게 쿵쿵)
        const baseIdx = basePattern[step];
        const baseFreq = baseFreqs[baseIdx];

        const baseOsc = this.ctx.createOscillator();
        const baseGain = this.ctx.createGain();

        baseOsc.type = 'sawtooth';
        baseOsc.frequency.setValueAtTime(baseFreq, now);

        // 로우패스 필터를 걸어 귀 아픈 고주파를 차단하고 묵직함만 보존
        const baseFilter = this.ctx.createBiquadFilter();
        baseFilter.type = 'lowpass';
        baseFilter.frequency.setValueAtTime(180, now);

        // 볼륨 감쇄 (둥~ 소리가 0.18초에 걸쳐 사라짐)
        baseGain.gain.setValueAtTime(0.18, now);
        baseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);

        baseOsc.connect(baseFilter);
        baseFilter.connect(baseGain);
        baseGain.connect(this.bgmGainNode); // 마스터 BGM Gain에 결합

        baseOsc.start(now);
        baseOsc.stop(now + 0.19);

        // 2. 고음 아르페지오 멜로디 연주 (2스텝마다 삼각파로 영롱하게 아르페지오 톡톡)
        if (step % 2 === 0) {
            const melIdx = melPattern[step];
            const melFreq = melFreqs[melIdx];

            const melOsc = this.ctx.createOscillator();
            const melGain = this.ctx.createGain();

            melOsc.type = 'triangle';
            melOsc.frequency.setValueAtTime(melFreq, now);

            // 잔향 효과를 대신할 부드럽고 긴 감쇄 (0.35초)
            melGain.gain.setValueAtTime(0.05, now);
            melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            melOsc.connect(melGain);
            melGain.connect(this.bgmGainNode); // 마스터 BGM Gain에 결합

            melOsc.start(now);
            melOsc.stop(now + 0.38);
        }

        // 스텝 순환
        this.bgmStep = (this.bgmStep + 1) % 16;
    },

    // 다양한 레트로 네온 효과음 생성 및 재생
    play(type, pitchMultiplier = 1.0) {
        this.init();
        if (!this.ctx) return;
        
        // [안전 장치] 효과음 볼륨이 음소거(0) 상태이거나 극히 작은 경우, 재생을 생략하여(Early Return) Web Audio API의 'exponentialRampToValueAtTime' 0 주입 RangeError 버그를 원천 차단합니다.
        if (this.sfxVolume <= 0.001) {
            return;
        }
        
        // 오디오 컨텍스트가 정지 상태이면 재개
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // 사운드 유형별로 중복 재생 방지 가드 시간을 다르게 주어 타격감과 속사음을 살립니다.
        let guardTime = 250; // 기본 가드 시간 (보스경보, 폭발, victory 등 대형 효과)
        if (type === 'shoot') {
            guardTime = 45; // 0.045초 초단기 가드 (공속 10레벨 속사 완벽 대응)
        } else if (type === 'hit') {
            guardTime = 80; // [최적화] 피격음은 다단히트 시 버퍼 오버헤드를 막기 위해 80ms 간격 제한
        } else if (type === 'coin' || type === 'dodge' || type === 'slash') {
            guardTime = 80; // 코인 습득, 검풍, 회피 쿨타임 80ms
        }

        const nowTime = Date.now();
        if (this.lastPlay[type] && nowTime - this.lastPlay[type] < guardTime) {
            return;
        }
        this.lastPlay[type] = nowTime;

        const now = this.ctx.currentTime;

        switch (type) {
            case 'shoot': { // 총탄 발사음 (피치 급하강 레이저)
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
                
                // 볼륨 50% 감쇄 (0.15 -> 0.075) 및 전역 볼륨 곱 적용
                gain.gain.setValueAtTime(0.075 * this.sfxVolume, now);
                gain.gain.linearRampToValueAtTime(0.01 * this.sfxVolume, now + 0.15);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            }
            case 'slash': { // 검 베기 효과음 (노이즈 휩쓸기 및 금속음)
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

                // 볼륨 50% 감쇄 (0.2 -> 0.1) 및 전역 볼륨 곱 적용
                gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
                gain.gain.linearRampToValueAtTime(0.01 * this.sfxVolume, now + 0.2);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            }
            case 'hit': { // 적 피격음 (짧은 노이즈 버스트)
                const bufferSize = this.ctx.sampleRate * 0.05;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(400, now);

                const gain = this.ctx.createGain();
                // 볼륨 50% 감쇄 (0.1 -> 0.05) 및 전역 볼륨 곱 적용
                gain.gain.setValueAtTime(0.05 * this.sfxVolume, now);
                gain.gain.linearRampToValueAtTime(0.01 * this.sfxVolume, now + 0.05);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                break;
            }
            case 'explosion': { // 스플래시 폭발음 (중저음 폭발)
                const bufferSize = this.ctx.sampleRate * 0.3;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300, now);
                filter.frequency.linearRampToValueAtTime(10, now + 0.3);

                const gain = this.ctx.createGain();
                // 볼륨 50% 감쇄 (0.3 -> 0.15) 및 전역 볼륨 곱 적용
                gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.01 * this.sfxVolume), now + 0.3);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                break;
            }
            case 'dodge': { // 회피 성공음 (산뜻하고 빠르게 올라가는 사인파)
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1500, now + 0.12);

                // 볼륨 50% 감쇄 (0.2 -> 0.1) 및 전역 볼륨 곱 적용
                gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
                gain.gain.linearRampToValueAtTime(0.01 * this.sfxVolume, now + 0.12);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
                break;
            }
            case 'powerup': { // 카드 획득 파워업음 (경쾌한 3화음 아르페지오)
                const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq * pitchMultiplier, now + idx * 0.08);
                    
                    // 볼륨 50% 감쇄 (0.12 -> 0.06) 및 전역 볼륨 곱 적용
                    gain.gain.setValueAtTime(0.06 * this.sfxVolume, now + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.01 * this.sfxVolume, now + idx * 0.08 + 0.2);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.2);
                });
                break;
            }
            case 'gameover': { // 게임오버 (우울하게 꺾이는 소리)
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.linearRampToValueAtTime(55, now + 0.6);

                // 볼륨 50% 감쇄 (0.2 -> 0.1) 및 전역 볼륨 곱 적용
                gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.01 * this.sfxVolume), now + 0.6);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.6);
                break;
            }
            case 'victory': { // 100스테이지 최종 승리 (화려한 팡파르)
                const chords = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6 화려한 화음
                chords.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now);
                    osc.frequency.setValueAtTime(freq * 1.5, now + 0.2);

                    // 볼륨 50% 감쇄 (0.1 -> 0.05) 및 전역 볼륨 곱 적용
                    gain.gain.setValueAtTime(0.05 * this.sfxVolume, now);
                    gain.gain.linearRampToValueAtTime(0.01 * this.sfxVolume, now + 0.5);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.5);
                });
                break;
            }
            case 'boss_alert': { // 보스 출현 사이렌 (왱~ 하는 저음 경고 피치)
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.35);

                // 볼륨 50% 감쇄 (0.2 -> 0.1) 및 전역 볼륨 곱 적용
                gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
                gain.gain.linearRampToValueAtTime(0.01 * this.sfxVolume, now + 0.35);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.35);
                break;
            }
            case 'coin': { // 코인 획득 효과음 (청아하고 가벼운 레트로 띠링 소리)
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(987.77, now); // B5 (시)
                osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6 (미)
                
                // 볼륨 50% 감쇄 (0.08 -> 0.04) 및 전역 볼륨 곱 적용
                gain.gain.setValueAtTime(0.04 * this.sfxVolume, now);
                gain.gain.linearRampToValueAtTime(0.01 * this.sfxVolume, now + 0.25);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.25);
                break;
            }
        }
    }
};
