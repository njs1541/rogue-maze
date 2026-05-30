/**
 * ==========================================================================
 * Neon Rogue-Maze - game.js (핵심 게임 로직 및 엔진)
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
        // BGM 전용 Gain 노드가 없으면 실시간 생성 후 마스터 연결
        if (this.ctx && !this.bgmGainNode) {
            this.bgmGainNode = this.ctx.createGain();
            this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
            this.bgmGainNode.connect(this.ctx.destination);
        }
    },

    // 효과음 볼륨 갱신 메소드
    setSFXVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, parseFloat(val)));
    },

    // 배경음악 볼륨 갱신 메소드 (BGM Gain 노드와 실시간 동기화)
    setBGMVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, parseFloat(val)));
        if (this.bgmGainNode && this.ctx) {
            this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        }
    },

    // [신규] Web Audio Synth BGM 연주 시작 메소드
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
    play(type) {
        this.init();
        if (!this.ctx) return;
        
        // 오디오 컨텍스트가 정지 상태이면 재개
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // 사운드 유형별로 중복 재생 방지 가드 시간을 다르게 주어 타격감과 속사음을 살립니다.
        let guardTime = 250; // 기본 가드 시간 (보스경보, 폭발, victory 등 대형 효과)
        if (type === 'shoot' || type === 'hit') {
            guardTime = 45; // 0.045초 초단기 가드 (공속 10레벨 속사 및 다단 타격 완벽 대응)
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
                gain.gain.exponentialRampToValueAtTime(0.01 * this.sfxVolume, now + 0.3);

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
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                    
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
                gain.gain.exponentialRampToValueAtTime(0.01 * this.sfxVolume, now + 0.6);

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

// --------------------------------------------------------------------------
// 2. 파티클 이펙트 엔진 (Particle System)
// --------------------------------------------------------------------------
class Particle {
    constructor(x, y, color, size, vx, vy, life, type = 'spark') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.vx = vx;
        this.vy = vy;
        this.maxLife = life;
        this.life = life;
        this.type = type; // 'spark', 'dust', 'explosionRing', 'slashWave'
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // 서서히 감속 처리 (마찰력)
        this.vx *= 0.95;
        this.vy *= 0.95;
        
        this.life--;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.type === 'spark' || this.type === 'dust') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = this.type === 'spark' ? 8 : 0;
            ctx.shadowColor = this.color;
            ctx.fill();
        } else if (this.type === 'explosionRing') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (1 - this.alpha), 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3 * this.alpha;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.stroke();
        } else if (this.type === 'slashWave') {
            // 검 베기 시 남는 검풍/파편
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fill();
        }

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 2.5. 격자 기반 맵 장애물 클래스 (NeonObstacle)
// --------------------------------------------------------------------------
class NeonObstacle {
    constructor(col, row) {
        this.col = col; // 격자 열 번호 (1~3)
        this.row = row; // 격자 행 번호 (1~3)
        this.width = 80;  // 장애물 가로 크기
        this.height = 65; // 장애물 세로 크기
        
        // 격자 기준 월드 좌표 계산 (방 크기 720x520, 좌상단 여백 40,40 기준)
        // 5x5 격자에서 col, row는 각각 0~4 범위
        // col=0, 4는 외곽선, row=0, 4는 외곽선이므로 장애물은 1~3 영역에만 배치됨
        this.x = 40 + col * 144 + 72;
        this.y = 40 + row * 104 + 52;
        
        // 자홍색 홀로그램 테마 색상 설정
        this.color = '#ff00aa'; 
        this.glowColor = '#ff00aa';
        this.pulse = Math.random() * 100; // 미세 맥동 효과를 위한 시작 위상차
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.04;
        let scale = 1.0 + Math.sin(this.pulse) * 0.04; // 미래지향적 홀로그램 맥동 연출
        
        // 홀로그램 네온 사각형 방벽 렌더링
        ctx.beginPath();
        ctx.rect(-this.width / 2 * scale, -this.height / 2 * scale, this.width * scale, this.height * scale);
        ctx.fillStyle = 'rgba(255, 0, 170, 0.12)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.glowColor;
        ctx.fill();
        ctx.stroke();
        
        // 내부 데코레이션 대각 격자 크로스 격자선 추가로 테크니컬한 감성 극대화
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 170, 0.25)';
        ctx.lineWidth = 1;
        ctx.moveTo(-this.width / 2 * scale, -this.height / 2 * scale);
        ctx.lineTo(this.width / 2 * scale, this.height / 2 * scale);
        ctx.moveTo(this.width / 2 * scale, -this.height / 2 * scale);
        ctx.lineTo(-this.width / 2 * scale, this.height / 2 * scale);
        ctx.stroke();
        
        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 3. 무기 및 투사체 정보 정의
// --------------------------------------------------------------------------
class Bullet {
    constructor(x, y, vx, vy, damage, isPlayerBullet, options = {}) {
        this.x = x;
        this.y = y;
        this.startX = x; // [추가] 사출 시작 위치 저장 (창끝 크리티컬 조준 계산용)
        this.startY = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = options.radius || 4;
        this.damage = damage;
        this.isPlayerBullet = isPlayerBullet;
        this.color = options.color || (isPlayerBullet ? '#00f0ff' : '#ff0055');
        
        // 탄환 특수 속성 (플레이어용)
        this.pierce = options.pierce || 0; // 남은 관통 횟수
        this.homing = options.homing || false; // 유도 여부
        this.splash = options.splash || 0; // 스플래시 폭발 반경 (0 이면 스플래시 없음)
        this.life = options.life || 300; // 최대 유지 프레임
        this.homingSpeed = options.homingSpeed || 0.08; // [추가] 유도탄 선회 각도 스피드 (강화 카드 연동)
        this.isSpear = options.isSpear || false; // [추가] 창 찌르기 관통 투사체 여부
        this.isLightning = options.isLightning || false; // [추가] 번개 마법 연쇄 벼락 여부
        this.isFire = options.isFire || false; // 불마법 탄환 여부
        this.isIce = options.isIce || false; // 얼음마법 탄환 여부
        this.bounceCount = 0; // 도탄 튕긴 누적 횟수
        this.bounceLimit = options.bounceLimit || 0; // 최대 허용 도탄 횟수
        this.monsterBounceCount = 0; // 몬스터 튕긴 누적 횟수
        this.monsterBounceLimit = options.monsterBounceLimit || 0; // 최대 허용 몬스터 튕기기 횟수
        this.active = true; // [신규] 탄환 활성화 상태 (배열 훼손 방멸용 소멸 예약 플래그)
    }

    update(monsters) {
        // [수정] 시간 왜곡 시 적 탄환 75% 감속 적용
        let timeScale = 1.0;
        if (!this.isPlayerBullet && window.gameEngine && window.gameEngine.timeDilationActive) {
            timeScale = 0.1; // 90% 느려짐 (시간 왜곡 시 압도적 감속)
        }

        this.life -= timeScale;

        // 유도탄 로직: 가장 가까운 적을 감지하여 실시간 유도 비행
        if (this.isPlayerBullet && this.homing && monsters.length > 0) {
            let closest = null;
            let minDist = Infinity;
            for (let m of monsters) {
                let dist = Math.hypot(m.x - this.x, m.y - this.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = m;
                }
            }

            if (closest) {
                // 적 방향의 목표 각도 연산
                let targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
                let currentAngle = Math.atan2(this.vy, this.vx);
                
                // 각도 보간 (매 프레임마다 약 5도씩 조준점 수정 - 강화 시 0.13로 향상)
                let diff = targetAngle - currentAngle;
                // 각도 차이 정규화 (-PI ~ PI)
                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                
                let newAngle = currentAngle + diff * this.homingSpeed;
                let speed = Math.hypot(this.vx, this.vy);
                this.vx = Math.cos(newAngle) * speed;
                this.vy = Math.sin(newAngle) * speed;
            }
        }

        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;

        // [5-4단계] 탄환과 격자 장애물의 AABB 충돌 및 도탄(Bounce)/소멸 물리 연동
        // 25등분 격자에 소환된 자홍색 홀로그램 장벽들과 탄환의 AABB 충돌을 검출합니다.
        if (window.gameEngine && window.gameEngine.obstacles.length > 0 && this.active) {
            for (let obs of window.gameEngine.obstacles) {
                let distX = this.x - obs.x;
                let distY = this.y - obs.y;
                let minXDist = (obs.width / 2) + this.radius;
                let minYDist = (obs.height / 2) + this.radius;

                if (Math.abs(distX) < minXDist && Math.abs(distY) < minYDist) {
                    // 충돌 발생!
                    // 플레이어의 도탄 탄환이고 튕김 횟수가 아직 남아있는 경우 도탄 기하 연산 적용
                    if (this.isPlayerBullet && this.bounceLimit > 0 && this.bounceCount < this.bounceLimit) {
                        let overlapX = minXDist - Math.abs(distX);
                        let overlapY = minYDist - Math.abs(distY);

                        if (overlapX < overlapY) {
                            // 좌우 측면 충돌 시 수평 속도 반사 및 밀어내기
                            this.x += distX > 0 ? overlapX : -overlapX;
                            this.vx = -this.vx;
                        } else {
                            // 상하 측면 충돌 시 수직 속도 반사 및 밀어내기
                            this.y += distY > 0 ? overlapY : -overlapY;
                            this.vy = -this.vy;
                        }

                        // 튕김 카운트 증가 및 데미지 복리 증폭 (+10%)
                        this.bounceCount++;
                        this.damage *= 1.10; 
                        Sound.play('dodge'); // 통통 튕기는 틱 레트로 효과음

                        // 튕길 때 튀는 3개 자홍색/노란색 네온 스파크 파티클
                        for (let k = 0; k < 3; k++) {
                            let randAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            window.gameEngine.particles.push(new Particle(
                                this.x, this.y, 
                                '#ff00aa', 1.5, 
                                Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'
                            ));
                        }
                        window.gameEngine.showFloatingText("BOUNCE! 💥", this.x, this.y - 15, '#ff00aa');
                    } else {
                        // 도탄이 불가능하거나 몬스터의 탄환인 경우 즉시 소멸 처리
                        this.active = false;
                        this.life = 0;

                        // 소멸 스파크 파편 효과 연출
                        for (let k = 0; k < 3; k++) {
                            let randAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            window.gameEngine.particles.push(new Particle(
                                this.x, this.y, 
                                this.color, 1.5, 
                                Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 10, 'spark'
                            ));
                        }
                    }
                    break; // 하나의 장애물과 충돌 시 루프 탈출
                }
            }
        }

        // [W-03 총 도탄 물리 기믹 연산]
        if (this.isPlayerBullet && this.bounceLimit > 0 && this.bounceCount < this.bounceLimit) {
            const wallMargin = 40;
            let collided = false;
            
            // 좌우 벽 충돌 감지
            if (this.x < wallMargin + this.radius) {
                this.x = wallMargin + this.radius;
                this.vx = -this.vx;
                collided = true;
            } else if (this.x > 800 - wallMargin - this.radius) {
                this.x = 800 - wallMargin - this.radius;
                this.vx = -this.vx;
                collided = true;
            }
            
            // 상하 벽 충돌 감지
            if (this.y < wallMargin + this.radius) {
                this.y = wallMargin + this.radius;
                this.vy = -this.vy;
                collided = true;
            } else if (this.y > 600 - wallMargin - this.radius) {
                this.y = 600 - wallMargin - this.radius;
                this.vy = -this.vy;
                collided = true;
            }
            
            // 튕겼을 때 데미지 +10% 가산 및 이펙트/효과음
            if (collided) {
                this.bounceCount++;
                this.damage *= 1.10; // 10% 복리 증폭
                Sound.play('dodge'); // 통통 튕기는 틱 레트로 효과음
                
                // 튕길 때 튀는 3개 노란 네온 스파크
                if (window.gameEngine) {
                    for (let k = 0; k < 3; k++) {
                        let randAngle = Math.random() * Math.PI * 2;
                        let pSpeed = Math.random() * 2 + 1;
                        window.gameEngine.particles.push(new Particle(
                            this.x, this.y, 
                            this.color, 1.5, 
                            Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'
                        ));
                    }
                    window.gameEngine.showFloatingText("BOUNCE! 💥", this.x, this.y - 15, '#ffdf00');
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.isSpear) {
            // [신규 기획] 창 투사체 전용 시안색 네온 마름모 창날 그래픽 렌더링
            ctx.translate(this.x, this.y);
            let angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            
            ctx.beginPath();
            ctx.moveTo(this.radius * 2.2, 0); // 날카로운 코
            ctx.lineTo(0, -this.radius * 0.7); // 상단 깃
            ctx.lineTo(-this.radius * 1.5, 0); // 뒤꽁무니
            ctx.lineTo(0, this.radius * 0.7); // 하단 깃
            ctx.closePath();
            
            ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00f0ff';
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fill();
        }
        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 3.5. 플레이어 주변 공전 보조 펫/드론 클래스 (Defender Drone)
// --------------------------------------------------------------------------
class Pet {
    constructor(angle = 0, orbitRadius = 45, color = '#39ff14') {
        this.x = 0;
        this.y = 0;
        this.radius = 6;
        this.angle = angle;
        this.orbitRadius = orbitRadius;
        this.orbitSpeed = 0.05; // 프레임당 회전각 (약 3도)
        this.color = color;
        
        this.shootCooldown = 150; // 2.5초 공격 쿨타임
    }

    update(player, enemyBullets, monsters, bullets, particles) {
        // 공전 좌표 갱신 (플레이어 기준 원형 회전)
        this.angle += this.orbitSpeed;
        this.x = player.x + Math.cos(this.angle) * this.orbitRadius;
        this.y = player.y + Math.sin(this.angle) * this.orbitRadius;

        // 펫이 날아가면서 만드는 귀여운 미세 네온 흔적 파티클
        if (Math.random() < 0.15) {
            particles.push(new Particle(
                this.x, this.y, 
                this.color, 1.5, 
                -Math.cos(this.angle) * 0.2, -Math.sin(this.angle) * 0.2, 15, 'dust'
            ));
        }

        // 적 탄환과의 충돌 검사 (탄환 소멸 방어막 기믹)
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            let b = enemyBullets[i];
            if (b.active && !b.isPlayerBullet) {
                let dist = Math.hypot(this.x - b.x, this.y - b.y);
                if (dist < this.radius + b.radius) {
                    // 탄환 제거 예약 (active = false 및 life = 0 처리로 배열 안전 보장)
                    b.active = false;
                    b.life = 0;
                    
                    // 스파크 방패 파편 연출
                    for (let k = 0; k < 4; k++) {
                        let randAngle = Math.random() * Math.PI * 2;
                        let pSpeed = Math.random() * 2 + 1;
                        particles.push(new Particle(this.x, this.y, this.color, 1.5, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12));
                    }
                    Sound.play('hit');
                }
            }
        }

        // 2.5초마다 가장 가까운 적에게 유도 레이저 탄환 사격
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        } else if (monsters.length > 0) {
            this.shootCooldown = 150; // 2.5초 쿨타임 리셋

            let closest = null;
            let minDist = Infinity;
            for (let m of monsters) {
                let dist = Math.hypot(m.x - this.x, m.y - this.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = m;
                }
            }

            if (closest) {
                // 펫의 발사 공격력: 플레이어 힘(ATK) 스탯의 25% 비례 보정 (드론 강화 연계 배율 연동)
                let petAtk = Math.max(2.0, player.atk * 0.25) * player.petDmgUpgrade;
                let targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
                let fireSpeed = 5.0;
                let vx = Math.cos(targetAngle) * fireSpeed;
                let vy = Math.sin(targetAngle) * fireSpeed;

                // 유도 레이저 사출
                bullets.push(new Bullet(this.x, this.y, vx, vy, petAtk, true, {
                    homing: true,
                    homingSpeed: player.homingAngleSpeed, // 펫 탄환도 유도 강화 연동
                    color: this.color,
                    radius: 3,
                    life: 150
                }));
                
                // 발사 스파크 조각
                for (let k = 0; k < 3; k++) {
                    let randAngle = targetAngle + Math.random() * 0.4 - 0.2;
                    let pSpeed = Math.random() * 2 + 1;
                    particles.push(new Particle(this.x, this.y, this.color, 1.5, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 10));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 미래지향 네온 그린 드론 외곽 링
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(57, 255, 20, 0.25)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.0;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 드론 내부 광역 초정밀 동력 코어
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 4. 플레이어 클래스 (이등변 삼각형 조종 및 스탯)
// --------------------------------------------------------------------------
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.angle = 0; // 마우스 조준 방향 각도
        
        // 기본 8대 스탯
        this.maxHp = 100;
        this.hp = 100;
        this.maxStamina = 100;
        this.stamina = 100;
        this.atk = 10;          // 힘 (공격 데미지)
        this.aspd = 1.2;        // 지능 (초당 공격 속도)
        this.ms = 3.2;          // 이동속도
        this.evd = 0.05;        // 민첩 (회피율 5%)
        this.luk = 1.0;         // 운 (보상 가중 확률)
        this.mp = 0;            // 마력 (특수기 충전율)
        this.maxMp = 100;       // [수정] 결함 1 해결을 위한 최대 마력 선언 추가!
        this.magicType = 'explosion'; // [추가] 마법 기술 유형 ('explosion': 광역 폭발, 'timeWarp': 시간 왜곡)
        this.isStopped = false;       // [추가] 플레이어가 가만히 멈춰 서 있는지 감지하는 플래그
        
        // [신규 기획] 코인 재화 및 퍼펙트 클리어 판정 변수
        this.coins = 0;
        this.perfectClearFlag = true;
        this.lastHitTimer = 300; // 피격 무사고 프레임 트래킹 (기본 300프레임 = 5초 상태로 시작)
        
        // [신규 기획] 장비 10종의 현재 레벨 저장 (기본 0레벨, 최대 10레벨 마스터)
        this.equipLevels = {
            armor: 0,
            boots: 0,
            gloves: 0,
            helm: 0,
            necklace: 0,
            ring_mp: 0,
            ring_hp: 0,
            ring_speed: 0,
            ring_aspd: 0,
            ring_evd: 0
        };

        // [신규] Phase 5 물리 기믹 및 초월 상태 변수 선언
        this.hasThorns = false;
        this.thornsFieldTimer = 0;
        this.hasTrap = false;
        this.whipSpeedStack = 0;
        this.whipSpeedTimer = 0;
        this.continuousShootTimer = 0;
        
        // [추가] 장비 연계 강화 카드 전용 능력치 스케일링 보정 변수
        this.swordDmgUpgrade = 1.0;   // 검기 추가 대미지 배율 (기본 1.0, 강화 시 1.4)
        this.multishotArc = 0.45;     // 멀티샷 부채꼴 퍼짐각 (기본 0.45, 강화 시 0.55)
        this.petDmgUpgrade = 1.0;     // 드론 레이저 대미지 배율 (기본 1.0, 강화 시 1.6)
        this.splashDmgUpgrade = 0.7;  // 스플래시 대폭발 피해 비율 (기본 0.7, 강화 시 0.9)
        this.homingAngleSpeed = 0.08; // 유도탄 추적 선회율 (기본 0.08, 강화 시 0.13)
        
        // 신규 추가 스탯
        this.hpRegen = 0.0;     // 초당 체력 회복량
        this.range = 350;       // 투사체 사정거리 (기본 350px)
        
        // 무기 스탯
        this.weaponType = 'gun'; // 'gun', 'sword', 'dual' (보상 카드로 검 획득 시 진화)
        this.multishot = 1;      // 부채꼴로 동시 발사될 탄환 수
        this.burstCount = 1;     // 한 번 사격 시 연속 점사 횟수
        this.pierceCount = 0;    // 탄환 관통력 개수
        this.homing = false;     // 유도탄 보유 여부
        this.wallBounceLimit = 0; // 벽 튕기기 제한 횟수
        this.monsterBounceLimit = 0; // 몬스터 튕기기 제한 횟수
        this.splashRadius = 0;   // 탄환 명중 시 스플래시 반경 (0 이면 기본 총알)

        // 쿨타임 및 상태 제어
        this.shootCooldown = 0;
        this.slashCooldown = 0;
        this.isSlashActive = false; // 현재 검 베기 모션이 화면에 그려지는 중인가?
        this.slashAngle = 0;        // 베기 애니메이션용 각도
        this.slashRadius = 45;      // 검 베기 물리 도달 반경
        
        // 회피 성공 피드백 연출 (붉은색 잔상)
        this.evadeActive = false;
        this.evadeTimer = 0;
        this.evadeAlpha = 0;
        this.evadeDirectionX = 0; // 회피 시 잔상이 노출될 X축 오프셋
        this.evadeDirectionY = 0; // 회피 시 잔상이 노출될 Y축 오프셋

        this.runDuration = 0;       // [추가] 연속 Shift 달리기 시간
        this.windScarActive = false; // [추가] Speed Ring 5레벨 달리기 공증 10% 플래그
        this.supernovaTimer = 0;     // [추가] Speed Ring 10레벨 스치기 회피 성공 시 이속 50% 가속 타이머
        
        // [신규] 프레임 기반 점사/난무 제어 변수 추가
        this.burstRemaining = 0;
        this.burstIntervalTimer = 0;
        this.burstAngle = 0;
        this.burstType = 'gun'; // 'gun', 'sword' 등
        this.invincibleTimer = 0; // [신규 추가] 피격 시 무적 쿨타임 타이머
        this.burstBulletsToLaunch = []; // [추가] 점사/난무 연속 격발 탄환 궤적 배열 사전 정의
        this.resurrected = false; // [추가] Plate Armor 10레벨 극적 부활 작동 여부 트래킹
    }

    // [신규] 채찍 버프 및 반지 오버리미트, 그리고 콤보 가속을 감안한 최종 실효 공격 속도 산출
    getEffectiveAspd() {
        let baseAspd = this.aspd;
        if (this.whipSpeedStack > 0) {
            baseAspd += this.whipSpeedStack * 0.20; // 3중첩 시 최대 +60% 공속 상승
        }
        // 콤보 가속 버프: 콤보당 연사 속도 +1.5% 상승 (최대 30% 한계)
        if (window.gameEngine) {
            baseAspd += Math.min(0.30, window.gameEngine.comboCount * 0.015);
        }
        return baseAspd;
    }

    update() {
        // [신규 기획] 피격 무사고 프레임 증가
        this.lastHitTimer++;

        // [신규 추가] 피격 무적 시간 실시간 감쇄
        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
        }

        // [W-01 가시 장막 오라] 3초(180프레임) 유지 중 주변 감속 및 잃은체력 10% 비례 매프레임 틱 피해
        if (this.thornsFieldTimer > 0) {
            this.thornsFieldTimer--;
            const thornsRadius = 120;
            if (window.gameEngine) {
                let lossHp = this.maxHp - this.hp;
                // 시간 왜곡/감속 timeScale 연동 적용
                let timeScale = window.gameEngine.timeDilationActive ? 0.1 : 1.0;
                let auraDamagePerFrame = ((lossHp * 0.10) / 60) * timeScale; // 초당 잃은 체력의 10%만큼 피해 (프레임당 분할 및 timeScale 반영)
                
                for (let m of window.gameEngine.monsters) {
                    let dist = Math.hypot(m.x - this.x, m.y - this.y);
                    if (dist < thornsRadius + m.radius) {
                        m.statusEffects.slow = Math.max(m.statusEffects.slow || 0, 10);
                        if (auraDamagePerFrame > 0) {
                            m.hp -= auraDamagePerFrame;
                            if (Math.random() < 0.05) {
                                m.flashTimer = 2;
                            }
                        }
                    }
                }
            }
        }

        // [W-02 채찍 견인 성공 버프] 3초 타이머 및 스택 감쇠
        if (this.whipSpeedTimer > 0) {
            this.whipSpeedTimer--;
            if (this.whipSpeedTimer <= 0) {
                this.whipSpeedStack = 0;
            }
        }

        // [E-08 신규 구현] Speed Ring 10레벨 초월: 초신성 기동 50% 가속 타이머 차감 및 네온 황금색 오라 파티클
        if (this.supernovaTimer > 0) {
            this.supernovaTimer--;
            if (Math.random() < 0.25 && window.gameEngine) {
                window.gameEngine.particles.push(new Particle(this.x, this.y, '#ffdf00', 1.8, (Math.random()-0.5)*0.8, (Math.random()-0.5)*0.8, 15, 'spark'));
            }
        }

        // [E-08 신규 구현] Speed Ring 5레벨 돌파: 바람의 상처 연속 달리기 2초(120프레임) 유지 시 공격력 10% 증가 바람 오라 가동
        let isMoving = !this.isStopped;
        let isSprinting = isMoving && window.gameEngine && window.gameEngine.keys['shift'] && this.stamina > 3;

        if (this.equipLevels.ring_speed >= 5 && isSprinting) {
            this.runDuration++;
            if (this.runDuration >= 120) { // 2초 연속 질주
                if (!this.windScarActive && window.gameEngine) {
                    window.gameEngine.showFloatingText("WIND SCAR ACTIVE! 🌪️ (+10% ATK)", this.x, this.y - 25, '#00f0ff');
                }
                this.windScarActive = true;
            }
        } else {
            this.runDuration = 0;
            this.windScarActive = false;
        }

        if (this.windScarActive && Math.random() < 0.15 && window.gameEngine) {
            window.gameEngine.particles.push(new Particle(this.x, this.y, '#00f0ff', 1.5, (Math.random()-0.5)*0.4, (Math.random()-0.5)*0.4, 12, 'dust'));
        }

        // [수정] 체력 자연 재생 (HP Regen) - 오직 전투 중이고, 플레이어가 가만히 서 있을 때에만 자연 치유 작동
        let isCombat = window.gameEngine && (window.gameEngine.monsters.length > 0 || window.gameEngine.spawnQueue.length > 0);
        let currentRegen = this.hpRegen;

        // [신규 기획] Health Ring 10레벨 초월: 5초간 피격 무사고 시 REGEN 속도 3배 가속!
        if (this.equipLevels.ring_hp === 10 && this.lastHitTimer >= 300) {
            currentRegen *= 3;
        }

        if (this.hp < this.maxHp && currentRegen > 0 && isCombat && this.isStopped) {
            this.hp = Math.min(this.maxHp, this.hp + (currentRegen / 60));
        }

        // [수정] MP 자연 재생 로직 주입 (MP 재생 반지 연동)
        if (this.mp < this.maxMp && this.mpRegen > 0) {
            this.mp = Math.min(this.maxMp, this.mp + (this.mpRegen / 60));
        }

        // 검 베기 반경(slashRadius)과 사정거리(range) 및 스플래시 반경(splashRadius) 동적 연동 보정
        this.slashRadius = 45 + (this.range - 350) * 0.2 + this.splashRadius;

        // 쿨타임 수치 매 프레임 감쇠 (60fps 기준)
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.slashCooldown > 0) this.slashCooldown--;
        
        // 검 베기 모션 타이머 관리 (지속시간 10프레임)
        if (this.isSlashActive) {
            this.slashTimer--;
            if (this.slashTimer <= 0) {
                this.isSlashActive = false;
            }
        }

        // 회피 잔상 애니메이션 관리
        if (this.evadeActive) {
            this.evadeTimer--;
            this.evadeAlpha = Math.max(0, this.evadeTimer / 25); // 25프레임 동안 서서히 사라짐
            if (this.evadeTimer <= 0) {
                this.evadeActive = false;
            }
        }
    }

    // 회피 발동 시 연출용 오프셋 트리거 (피격 지점의 반대 방향으로 1.5px 잔상 노출)
    triggerEvade(fromX, fromY) {
        this.evadeActive = true;
        this.evadeTimer = 25; // 0.4초간 유지
        this.evadeAlpha = 0.8;
        
        // 피격 위치로부터 나에게 향하는 반사 각도를 계산
        let angle = Math.atan2(this.y - fromY, this.x - fromX);
        // 몬스터/원인 위치의 정반대 방향으로 1.5픽셀 돌출 오프셋
        this.evadeDirectionX = Math.cos(angle) * 2;
        this.evadeDirectionY = Math.sin(angle) * 2;

        Sound.play('dodge');
    }

    draw(ctx) {
        ctx.save();

        // [W-01 가시 장막 필드 오라 비주얼 렌더링]
        if (this.thornsFieldTimer > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, 120, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 170, ${0.12 + Math.sin(Date.now() * 0.009) * 0.06})`;
            ctx.fillStyle = 'rgba(255, 0, 170, 0.03)';
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ff00aa';
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 1. 회피 발동 중일 때 1.5px 밀려난 붉은색 잔상 실루엣 렌더링 (플레이어 뒤쪽에 위치시키기 위해 먼저 렌더링)
        if (this.evadeActive && this.evadeAlpha > 0) {
            ctx.save();
            // 충돌 반대 방향으로 1.5 ~ 2px 물리 오프셋 위치 이동
            ctx.translate(this.x + this.evadeDirectionX, this.y + this.evadeDirectionY);
            ctx.rotate(this.angle);

            // 이등변 삼각형 형태 그리기 (붉은색 네온)
            ctx.beginPath();
            ctx.moveTo(this.radius, 0); // 전면 꼭짓점 (바라보는 방향)
            ctx.lineTo(-this.radius * 0.8, -this.radius * 0.7); // 후하단 왼쪽
            ctx.lineTo(-this.radius * 0.5, 0); // 중앙 홈
            ctx.lineTo(-this.radius * 0.8, this.radius * 0.7); // 후하단 오른쪽
            ctx.closePath();
            
            ctx.fillStyle = `rgba(255, 0, 85, ${this.evadeAlpha * 0.6})`;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ff0055';
            ctx.fill();
            ctx.restore();
        }

        // 2. 실제 플레이어 본체 캐릭터 렌더링 (이등변 삼각형)
        // [신규 추가] 피격 무적 타이머 가동 중일 때 빠른 템포로 깜빡임(Flicker) 연출
        if (this.invincibleTimer > 0 && Math.floor(Date.now() / 45) % 2 === 0) {
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 삼각형 모양 드로잉
        ctx.beginPath();
        ctx.moveTo(this.radius, 0); // 앞 코 (조준 방향)
        ctx.lineTo(-this.radius * 0.8, -this.radius * 0.7); 
        ctx.lineTo(-this.radius * 0.5, 0); // 안으로 살짝 파인 디테일
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.7);
        ctx.closePath();

        // 네온 민트/시안 테두리와 메인 색상 채우기
        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f0ff';
        ctx.fill();
        ctx.stroke();

        // 내부 기계식 코어 원 추가
        ctx.beginPath();
        ctx.arc(-2, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#39ff14'; // 스태미너 가동 시 코어가 빛남
        ctx.shadowColor = '#39ff14';
        ctx.fill();

        ctx.restore();

        // 3. 검을 휘두르는 모션 연출 (칼 장착 시 아크 렌더링)
        if (this.isSlashActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // 검 베기 검기 호(Arc) 드로잉 (각도는 조준 방향 기준 반원 -70도 ~ +70도 스윕)
            ctx.beginPath();
            let start = this.slashAngle - 1.2;
            let end = this.slashAngle + 1.2;
            ctx.arc(0, 0, this.slashRadius, start, end);
            
            ctx.strokeStyle = 'rgba(176, 38, 255, 0.85)';
            ctx.lineWidth = 6 * (this.slashTimer / 10); // 시간이 흐를수록 선이 얇아짐
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#b026ff';
            ctx.stroke();
            
            ctx.restore();
        }

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 5. 몬스터 클래스 (다양한 티어 및 AI)
// --------------------------------------------------------------------------
class Monster {
    constructor(x, y, tier, roomNum = 1) {
        this.x = x;
        this.y = y;
        this.tier = tier; // 5개 방마다 증가하는 단계 (1, 2, 3...)
        this.roomNum = roomNum;
        
        // [수정] 몬스터 이중 복합 인플레이션을 완화하되, 후반부 긴장감을 위해 선형 팩터가 가미된 스케일링 공식 개편
        let roomFactor = 1.0 + Math.log10(roomNum) * 1.2 + (roomNum / 20) * 0.6;

        // 티어별 기본 체력과 속도, 데미지 스케일링 설정
        this.maxHp = Math.ceil((15 + (tier - 1) * 4) * roomFactor); // 체력 증가율 합리적으로 완화
        this.hp = this.maxHp;
        this.atk = Math.ceil((5 + (tier - 1) * 1.5) * roomFactor); // 공격력 인플레이션 해결
        this.speed = 1.2 + Math.min(1.2, (tier - 1) * 0.1);
        // 후반부 속도 폭주 방지 안전 캡 보정 (50~100층 구간)
        if (roomNum >= 50) {
            this.speed = Math.min(2.2, this.speed);
        }
        this.scoreValue = tier; // 잡았을 때 기여도
        
        // 엘리트 몬스터 기믹용 속성 정의
        this.isElite = false;

        // 몬스터 종류 다양화
        const monsterTypes = ['normal', 'chaser', 'shooter'];
        // 높은 티어일수록 shooter나 chaser 비중이 높아짐
        let typeRand = Math.random();
        if (tier < 3) {
            this.type = 'normal';
        } else if (tier < 6) {
            this.type = typeRand < 0.6 ? 'normal' : 'chaser';
        } else {
            this.type = typeRand < 0.4 ? 'normal' : (typeRand < 0.7 ? 'chaser' : 'shooter');
        }

        // 타입별 속성 정의 (모양은 모두 동그라미)
        if (this.type === 'normal') {
            this.radius = 12 + Math.min(8, tier);
            this.color = '#ff0055'; // 기본 붉은색 네온
            this.glowColor = '#ff0055';
        } else if (this.type === 'chaser') { // 빠른 대시형 몬스터
            this.radius = 9 + Math.min(5, tier);
            this.speed *= 1.4; // 40% 빠름
            this.hp *= 0.75;  // 체력은 낮음
            this.color = '#ffaa00'; // 황금/오렌지
            this.glowColor = '#ffaa00';
            this.dashCooldown = 60;
        } else if (this.type === 'shooter') { // 원거리 사격 몬스터
            this.radius = 14 + Math.min(6, tier);
            this.hp *= 1.2;
            this.speed *= 0.8;
            this.color = '#b026ff'; // 보라색
            this.glowColor = '#b026ff';
            this.shootCooldown = 80 + Math.random() * 40;
        }

        // 보스 스테이지(5의 배수 방) 보스 몬스터 설정
        this.isBoss = false;

        this.knockbackX = 0;
        this.knockbackY = 0;
        this.flashTimer = 0; // 피격 시 백색 플래시 타이머
        this.isFrozenActive = 0; // [신규] 얼음 동결 완전 정지 상태 타이머
        this.statusEffects = {
            slow: 0,
            vulnerability: 0,
            shock: 0,
            burn: 0,        // [신규] 화상 지속 시간 프레임
            burnStack: 0,   // [신규] 화상 중첩 스택 (최대 5)
            freeze: 0       // [신규] 빙결 게이지 축적율 (0 ~ 100)
        };
        this.dead = false; // [신규] 지연 삭제용 사망 플래그
    }

    // 엘리트 속성 주입 메서드
    makeElite() {
        this.isElite = true;
        this.radius = (this.radius || 12) * 1.5; // 거대 1.5배 크기 확장
        this.maxHp *= 3; // 체력 3배 뻥튀기
        this.hp = this.maxHp;
        this.atk *= 2; // 공격력 2배
        this.scoreValue *= 5; // 처치 점수 5배 기여
        this.color = '#39ff14'; // 네온 초록색
        this.glowColor = '#39ff14';
    }

    // 보스 전용 생성 함수
    makeBoss(roomNum) {
        this.isBoss = true;
        this.radius = 35;
        let roomFactor = 1.0 + (roomNum - 1) * 0.05;
        this.maxHp = Math.ceil((100 + roomNum * 12) * roomFactor);
        this.hp = this.maxHp;
        this.atk = Math.ceil((15 + roomNum * 0.8) * roomFactor);
        this.speed = 1.0 + Math.min(1.0, roomNum * 0.01);
        this.color = '#ff3300';
        this.glowColor = '#ff3300';
        this.type = 'boss';
        this.shootCooldown = 50;
    }

    update(player, bullets) {
        // [수정] 전역 시간 왜곡(불릿 타임) 적용 배율 계산
        let timeScale = 1.0;
        if (window.gameEngine && window.gameEngine.timeDilationActive) {
            timeScale = 0.1; // 90% 시간 감속 (몬스터의 액션이 매우 느려짐)
        }

        // 디버프 타이머 차감 (시간 감속 반영)
        if (this.statusEffects.slow > 0) this.statusEffects.slow -= timeScale;
        if (this.statusEffects.vulnerability > 0) this.statusEffects.vulnerability -= timeScale;
        if (this.statusEffects.shock > 0) this.statusEffects.shock -= timeScale;
        if (this.statusEffects.freeze > 0) this.statusEffects.freeze -= timeScale * 0.5; // 빙결은 자연 상태에서 초당 30씩 서서히 감쇄
        
        // [신규] 화상(Burn) 도트 틱 연산 및 화염 스파크 연출
        if (this.statusEffects.burn > 0) {
            this.statusEffects.burn -= timeScale;
            // 30프레임(0.5초)마다 중첩(burnStack) 비례 화상 피해 가동
            if (Math.floor(this.statusEffects.burn) % 30 === 0) {
                let burnDmg = 1.2 * (this.statusEffects.burnStack || 1);
                this.hp -= burnDmg;
                this.flashTimer = 3;
                
                if (window.gameEngine && Math.random() < 0.4) {
                    window.gameEngine.particles.push(new Particle(this.x, this.y, '#ff5e00', 1.8, (Math.random()-0.5)*0.8, -Math.random()*1.0, 15, 'spark'));
                }
            }
            if (this.statusEffects.burn <= 0) {
                this.statusEffects.burnStack = 0;
            }
        }

        // [신규] 완전 동결(Frozen) 2.5초 기절 판정 및 정지 상태 타이머 감쇠
        if (this.statusEffects.freeze >= 100) {
            this.statusEffects.freeze = 0;
            this.statusEffects.shock = Math.max(this.statusEffects.shock || 0, 150); // 2.5초 스턴
            this.isFrozenActive = 150; // 2.5초 얼음껍질 렌더링 유지
            if (window.gameEngine) {
                window.gameEngine.showFloatingText("FROZEN! ❄️", this.x, this.y - 25, '#00f0ff');
                Sound.play('hit');
            }
        }
        if (this.isFrozenActive > 0) {
            this.isFrozenActive -= timeScale;
        }

        // 넉백 감쇠 처리 및 이동도 시간 지연 영향 받음
        this.x += this.knockbackX * timeScale;
        this.y += this.knockbackY * timeScale;
        this.knockbackX *= 0.85;
        this.knockbackY *= 0.85;

        // Shock (Stun / 기절) 상태 시 이동 및 행동 불능 처리
        if (this.statusEffects.shock > 0) {
            // 행동 불가 상태에서도 넉백과 벽 충돌 처리는 적용
            const wallMargin = 40;
            this.x = Math.max(wallMargin + this.radius, Math.min(800 - wallMargin - this.radius, this.x));
            this.y = Math.max(wallMargin + this.radius, Math.min(600 - wallMargin - this.radius, this.y));
            return;
        }

        // 플레이어와의 거리 및 각도
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let dist = Math.hypot(dx, dy);
        let angle = Math.atan2(dy, dx);

        // Slow (감속) 상태에 따른 실제 이동 속도 연산
        let activeSpeed = this.speed * timeScale;
        if (this.statusEffects.slow > 0) {
            activeSpeed *= 0.6; // 40% 속도 추가 감소
        }
        if (this.statusEffects.freeze > 0) {
            // [신규] 빙결 게이지 축적율에 따른 추가 비례 감속 (최대 50% 감속)
            activeSpeed *= (1 - (this.statusEffects.freeze / 200));
        }

        if (this.isBoss) {
            // 보스 AI: 플레이어를 천천히 추격하며 광역 탄막 발사
            if (dist > 100) {
                this.x += Math.cos(angle) * activeSpeed;
                this.y += Math.sin(angle) * activeSpeed;
            }
            
            this.shootCooldown -= timeScale; // 쿨타임 감소도 시간 왜곡 영향을 받음
            if (this.shootCooldown <= 0) {
                this.shootCooldown = 90 - Math.min(40, this.tier * 3);
                // 3방향 부채꼴 탄환 발사
                for (let i = -1; i <= 1; i++) {
                    let bAngle = angle + (i * 0.25);
                    let vx = Math.cos(bAngle) * 2.8;
                    let vy = Math.sin(bAngle) * 2.8;
                    bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.8, false, {
                        color: '#ff3300',
                        radius: 6
                    }));
                }
                Sound.play('shoot');
            }

            // 보스 이탈 방지 처리
            const wallMargin = 40;
            this.x = Math.max(wallMargin + this.radius, Math.min(800 - wallMargin - this.radius, this.x));
            this.y = Math.max(wallMargin + this.radius, Math.min(600 - wallMargin - this.radius, this.y));
            return;
        }

        // 일반 몬스터 AI 제어
        if (this.type === 'normal') {
            // 무조건 플레이어 추적 이동
            this.x += Math.cos(angle) * activeSpeed;
            this.y += Math.sin(angle) * activeSpeed;
        } 
        else if (this.type === 'chaser') {
            // 빠른 추적 및 주기적으로 대시 돌진
            this.dashCooldown -= timeScale;
            if (this.dashCooldown <= 0 && dist < 220) {
                // 대시 발동: 넉백처럼 플레이어 방향으로 순간 폭발적 가속도 (시간 왜곡 반영)
                this.knockbackX = Math.cos(angle) * 7;
                this.knockbackY = Math.sin(angle) * 7;
                this.dashCooldown = 120 + Math.random() * 60; // 2~3초 쿨타임
            } else {
                this.x += Math.cos(angle) * activeSpeed;
                this.y += Math.sin(angle) * activeSpeed;
            }
        } 
        else if (this.type === 'shooter') {
            // 플레이어와 거리 유지 (180 ~ 250px)
            if (dist > 220) {
                this.x += Math.cos(angle) * activeSpeed;
                this.y += Math.sin(angle) * activeSpeed;
            } else if (dist < 150) {
                // 플레이어가 너무 가까우면 뒤로 도망침
                this.x -= Math.cos(angle) * activeSpeed * 0.9;
                this.y -= Math.sin(angle) * activeSpeed * 0.9;
            } else {
                // 좌우 게걸음 회전 무빙 (단조로움 회피)
                let sideAngle = angle + Math.PI / 2;
                this.x += Math.cos(sideAngle) * activeSpeed * 0.5;
                this.y += Math.sin(sideAngle) * activeSpeed * 0.5;
            }

            // 사격 메커니즘
            this.shootCooldown -= timeScale;
            if (this.shootCooldown <= 0) {
                this.shootCooldown = 100 + Math.random() * 60;
                let vx = Math.cos(angle) * 3.5;
                let vy = Math.sin(angle) * 3.5;
                bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.7, false, {
                    color: '#b026ff',
                    radius: 5
                }));
            }
        }

        // 맵 벽 경계선 제한 충돌 처리 (몬스터 맵 이탈 방지) 및 창/넉백 벽꽝(Wall Slam) 판정 연동
        const wallMargin = 40;
        let preX = this.x;
        let preY = this.y;
        this.x = Math.max(wallMargin + this.radius, Math.min(800 - wallMargin - this.radius, this.x));
        this.y = Math.max(wallMargin + this.radius, Math.min(600 - wallMargin - this.radius, this.y));

        // 넉백 중 벽에 부딪혀 강제 위치 교정이 일어났는지 검사
        let hasSlammedWall = false;
        if ((this.x !== preX && Math.abs(this.knockbackX) > 2.5) || (this.y !== preY && Math.abs(this.knockbackY) > 2.5)) {
            hasSlammedWall = true;
        }

        if (hasSlammedWall && !this.wallSlamCooldown) {
            this.wallSlamCooldown = 30; // 0.5초 연속 격돌 방지 쿨다운
            
            // 넉백 벽꽝 대미지 (+100% 공격력 가산) 및 1.5초(90프레임) 마비 기절
            let slamDmg = player.atk;
            this.hp -= slamDmg;
            this.flashTimer = 8;
            this.statusEffects.shock = 90; // 1.5초 기절
            
            if (window.gameEngine) {
                window.gameEngine.showFloatingText("WALLSLAM STUN! 💥", this.x, this.y - 25, '#ffdf00');
                window.gameEngine.shakeScreen(10, 4.5);
                
                // 벽 충돌 네온 황금색 스파크 파편 연출
                for (let k = 0; k < 8; k++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 3 + 1.5;
                    window.gameEngine.particles.push(new Particle(this.x, this.y, '#ffdf00', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15));
                }
            }
        }
        if (this.wallSlamCooldown > 0) this.wallSlamCooldown--;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);

        // 피격 깜빡임 구현 (흰색 반투명 플래시)
        if (this.flashTimer > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffffff';
        } else if (this.statusEffects.shock >= 120) {
            // [W-08 시간 완전 정지 - 회색조 석상화 렌더링]
            ctx.fillStyle = 'rgba(80, 80, 80, 0.45)';
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = this.isBoss ? 4.0 : 2.0;
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#333333';
        } else {
            ctx.fillStyle = this.isBoss ? 'rgba(255, 51, 0, 0.2)' : 'rgba(255, 0, 85, 0.15)';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.isBoss ? 4.0 : 2.0;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.glowColor;
        }

        ctx.fill();
        if (this.flashTimer <= 0) {
            ctx.stroke();
        }

        // 보스 또는 일반 몬스터의 안구/핵 네온 그래픽
        ctx.beginPath();
        ctx.arc(0, 0, this.isBoss ? 8 : 3, 0, Math.PI * 2);
        ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : (this.statusEffects.shock >= 120 ? '#555555' : this.color);
        ctx.fill();

        // 디버프 상태이상 시각 오라 효과 렌더링
        if (this.flashTimer <= 0) {
            // [신규] 화상(Burn) 이글거리는 오렌지 오라
            if (this.statusEffects.burn > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 3 + Math.sin(Date.now() * 0.015) * 1.5, 0, Math.PI * 2);
                ctx.strokeStyle = '#ff5e00';
                ctx.lineWidth = 2.0;
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#ff5e00';
                ctx.stroke();
                ctx.restore();
            }
            // [신규] 동결(Frozen) 차가운 링 및 얼음 장막 바디 껍질
            if (this.isFrozenActive > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = '#00f0ff';
                ctx.lineWidth = 3.0;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f0ff';
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.32)';
                ctx.fill();
                ctx.restore();
            }

            if (this.statusEffects.shock > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffdf00'; // 노란색 스파크
                ctx.lineWidth = 2;
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#ffdf00';
                ctx.stroke();
                ctx.restore();
            }
            if (this.statusEffects.slow > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
                ctx.strokeStyle = '#00f0ff'; // 시안색 감속
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#00f0ff';
                ctx.stroke();
                ctx.restore();
            }
            if (this.statusEffects.vulnerability > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = '#ff0055'; // 자홍색 약화
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff0055';
                ctx.stroke();
                ctx.restore();
            }
        }

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6. 방(Room) 및 충돌 경계선 렌더링 클래스
// --------------------------------------------------------------------------
class RoomPortal {
    constructor(direction, scoreValue, x = null, y = null) {
        this.direction = direction; // 'top', 'bottom', 'left', 'right', 'secret'
        this.scoreValue = scoreValue; // 이 문을 지나갈 때의 몬스터 마릿수이자 점수
        this.width = 75;
        this.height = 18;
        this.active = true; // 현재 포털 활성화 상태 (전부 격퇴 시)
        this.difficultyClass = 'low'; // 'high', 'mid', 'low' 랭킹 등급 저장
        this.portalType = 'stat'; // 'stat', 'weapon', 'equipment', 'shop' - 신규 특화 속성 추가

        // 방향별 좌표 바인딩
        if (direction === 'top') {
            this.x = 400 - this.width / 2;
            this.y = 35;
        } else if (direction === 'bottom') {
            this.x = 400 - this.width / 2;
            this.y = 547;
        } else if (direction === 'left') {
            this.x = 35;
            this.y = 300 - this.width / 2;
            // 회전 처리를 위해 크기 교환
            this.width = 18;
            this.height = 75;
        } else if (direction === 'right') {
            this.x = 747;
            this.y = 300 - this.width / 2;
            this.width = 18;
            this.height = 75;
        } else if (direction === 'secret') {
            this.x = x;
            this.y = y;
            this.width = 40;
            this.height = 40;
            this.radius = 20; // 원형 포털 반경
            this.portalType = 'secret_room'; // 비밀방 차원 상점 진입 테마 매핑
        }
    }

    draw(ctx) {
        ctx.save();
        
        // [비밀 차원 포털 렌더링 예외 처리]
        if (this.direction === 'secret') {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // 뱅글뱅글 회전하는 프레임 각도 계산
            let spinAngle = (Date.now() * 0.005) % (Math.PI * 2);
            ctx.rotate(spinAngle);
            
            // 영롱한 보랏빛 차원 네온 서클
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(176, 38, 255, 0.18)';
            ctx.strokeStyle = '#b026ff';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#b026ff';
            ctx.fill();
            ctx.stroke();
            
            // 내부 소용돌이 나선 이펙트 라인 3개
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            for (let k = 0; k < 3; k++) {
                let angleOffset = (k * Math.PI * 2) / 3;
                ctx.moveTo(0, 0);
                let targetX = Math.cos(angleOffset) * this.radius * 0.8;
                let targetY = Math.sin(angleOffset) * this.radius * 0.8;
                ctx.quadraticCurveTo(
                    Math.cos(angleOffset + 0.6) * this.radius * 0.5,
                    Math.sin(angleOffset + 0.6) * this.radius * 0.5,
                    targetX, targetY
                );
            }
            ctx.stroke();
            
            ctx.restore();
            
            // 포털 상단 공중 부유 홀로그램 크리스탈 아이콘 🔮
            ctx.save();
            ctx.font = '13px "Outfit"';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#b026ff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("🔮", this.x, this.y - this.radius - 12);
            ctx.restore();
            
            ctx.restore();
            return; // 기존 직사각형 문 렌더링 로직 통째로 패스
        }
        
        // 포털 타입별 전용 네온 광채 컬러 정의 (잠김 상태는 일괄 붉은색)
        let color = '#ff0055'; 
        let bgStyle = 'rgba(255, 0, 85, 0.15)';
        
        if (this.active) {
            if (this.portalType === 'stat') {
                color = '#00f0ff'; // 청록색
                bgStyle = 'rgba(0, 240, 255, 0.15)';
            } else if (this.portalType === 'weapon') {
                color = '#b026ff'; // 보라색
                bgStyle = 'rgba(176, 38, 255, 0.15)';
            } else if (this.portalType === 'equipment') {
                color = '#ff6c00'; // 주황색
                bgStyle = 'rgba(255, 108, 0, 0.15)';
            } else if (this.portalType === 'shop') {
                color = '#ffdf00'; // 노란색
                bgStyle = 'rgba(255, 223, 0, 0.15)';
            }
        }
        
        // 포털 네온 박스 드로잉
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = bgStyle;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.stroke();

        // 문 위에 무작위 몬스터수(점수) 텍스트 렌더링
        ctx.font = '800 12px "Outfit"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#000000';

        let textX = this.x + this.width / 2;
        let textY = this.y + this.height / 2;
        
        // 시인성을 위해 방향별 텍스트 출력 좌표 약간의 보정 오프셋 적용
        if (this.direction === 'top') textY -= 15;
        if (this.direction === 'bottom') textY += 15;
        if (this.direction === 'left') textX -= 18;
        if (this.direction === 'right') textX += 18;

        ctx.fillText(this.scoreValue, textX, textY);

        // [신규 기획] 문 위에 전용 네온 아이콘 부유 홀로그램 렌더링
        if (this.active) {
            ctx.save();
            ctx.font = '13px "Outfit", "Noto Sans KR"';
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let icon = '📊';
            if (this.portalType === 'weapon') icon = '⚔️';
            if (this.portalType === 'equipment') icon = '🛡️';
            if (this.portalType === 'shop') icon = '🎰';

            let iconX = this.x + this.width / 2;
            let iconY = this.y + this.height / 2;
            
            if (this.direction === 'top') iconY += 16;
            if (this.direction === 'bottom') iconY -= 16;
            if (this.direction === 'left') iconX += 18;
            if (this.direction === 'right') iconX -= 18;
            
            ctx.fillText(icon, iconX, iconY);
            ctx.restore();
        }

        // [엘리트 기믹] 다음 방이 5의 배수 방이고(10의 배수 보스방 제외), 포털 랭킹 등급이 '상' 또는 '중'인 경우 [ELITE] 마커 출력
        let nextRoomNum = window.gameEngine ? window.gameEngine.roomNum + 1 : 2;
        if (this.active && nextRoomNum % 5 === 0 && nextRoomNum % 10 !== 0) {
            if (this.difficultyClass === 'high' || this.difficultyClass === 'mid') {
                ctx.save();
                ctx.font = '800 10px "Outfit"';
                ctx.fillStyle = '#39ff14'; // 네온 그린
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#39ff14';
                
                let eliteX = this.x + this.width / 2;
                let eliteY = this.y + this.height / 2;
                
                // 기존 아이콘 출력과의 마찰을 회피하기 위해 오프셋을 더 확장 적용
                if (this.direction === 'top') eliteY += 28;
                if (this.direction === 'bottom') eliteY -= 28;
                if (this.direction === 'left') eliteX += 32;
                if (this.direction === 'right') eliteX -= 32;
                
                ctx.fillText("[ELITE]", eliteX, eliteY);
                ctx.restore();
            }
        }

        ctx.restore();
    }

    // 플레이어가 문 안으로 깊숙이 진입했는지 영역 충돌 판단
    checkCollision(player) {
        if (!this.active) return false;
        
        if (this.direction === 'secret') {
            // 원형 포털과의 기하 충돌 판정
            return Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius;
        }
        
        // 플레이어가 포털 박스 영역 안에 도달 시 작동
        return (
            player.x > this.x - 5 &&
            player.x < this.x + this.width + 5 &&
            player.y > this.y - 5 &&
            player.y < this.y + this.height + 5
        );
    }
}

// --------------------------------------------------------------------------
// 6.5. 맵 클리어 힐링 물약 클래스 (Neon Healing Potion)
// --------------------------------------------------------------------------
class NeonPotion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 10;
        this.color = '#39ff14'; // 네온 초록색
        this.pulse = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        this.pulse += 0.05;
        let scale = 1.0 + Math.sin(this.pulse) * 0.1;

        // 반짝이는 외부 오라 구체
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 내부 십자가 힐링 마크 렌더링
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        // 가로 선
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        // 세로 선
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.5.5. 드롭된 황금 네온 코인 클래스 (Neon Coin)
// --------------------------------------------------------------------------
class NeonCoin {
    constructor(x, y, amount = 1) {
        this.x = x;
        this.y = y;
        // 사방으로 통통 튕기는 속도
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.radius = 6;
        this.amount = amount;
        this.color = '#ffdf00'; // 황금색 네온
        this.pulse = Math.random() * 10;
        this.friction = 0.95; // 통통 튕기고 정지하는 마찰력
        this.isAttractedToPlayer = false; // [신규 기믹] 보상 상자 획득 시 전체 흡입 플래그
    }

    update(player, timeDilationActive) {
        // 통통 튕기며 서서히 감속 처리 (바닥에 안착)
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;

        // 벽 마진선 이탈 방지
        const wallMargin = 40;
        if (this.x < wallMargin + this.radius) { this.x = wallMargin + this.radius; this.vx = -this.vx; }
        if (this.x > 800 - wallMargin - this.radius) { this.x = 800 - wallMargin - this.radius; this.vx = -this.vx; }
        if (this.y < wallMargin + this.radius) { this.y = wallMargin + this.radius; this.vy = -this.vy; }
        if (this.y > 600 - wallMargin - this.radius) { this.y = 600 - wallMargin - this.radius; this.vy = -this.vy; }

        // 자석 물리 기믹 연산
        let dist = Math.hypot(player.x - this.x, player.y - this.y);
        let pullRadius = 70; // 평소 자석 반경 70px
        
        // 시간 왜곡 중일 때는 맵 전역(무한) 자석 블랙홀 발동!
        if (timeDilationActive) {
            pullRadius = 1000; 
        }

        // 보상 상자를 먹었을 때의 강제 전체 흡입 상태이거나 자석 범위 내에 있을 경우
        if (this.isAttractedToPlayer || dist < pullRadius) {
            // [버그 수정] 초근접(40px 미만) 도달 시 오르비팅(공전)과 터널링을 완전히 막기 위해 LERP 강제 유도 적용
            if (dist < 40) {
                this.x += (player.x - this.x) * 0.45;
                this.y += (player.y - this.y) * 0.45;
                this.vx = 0;
                this.vy = 0;
                return;
            }

            // 강제 흡입 상태일 때는 최고 가속도와 속도를 주어 번개처럼 날아가도록 세팅
            let pullForce = this.isAttractedToPlayer ? 18.0 : (timeDilationActive ? 12.0 : 4.0);
            
            // 거리 비례 가속
            let angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
            this.vx += Math.cos(angleToPlayer) * pullForce * 0.15;
            this.vy += Math.sin(angleToPlayer) * pullForce * 0.15;
            
            // 속도 상한선 제한 (초광속 방지 및 자연스러움)
            let currentSpeed = Math.hypot(this.vx, this.vy);
            let maxSpeed = this.isAttractedToPlayer ? 22.0 : (timeDilationActive ? 15.0 : 6.0);
            if (currentSpeed > maxSpeed) {
                this.vx = (this.vx / currentSpeed) * maxSpeed;
                this.vy = (this.vy / currentSpeed) * maxSpeed;
            }
            // 마찰 무시하고 강력 흡입
            this.friction = 1.0;
        } else {
            this.friction = 0.95;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        this.pulse += 0.08;
        let scale = 1.0 + Math.sin(this.pulse) * 0.15;

        // 황금빛 글로우 원형 코인
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 223, 0, 0.2)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 코인 내부의 C 심볼 혹은 중앙 노랑 네온 코어
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.5.6. 파괴 가능한 비밀 균열 벽 클래스 (Secret Wall)
// --------------------------------------------------------------------------
class SecretWall {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.dir = direction; // 'top', 'bottom', 'left', 'right'
        
        // [박스 얇기 조절] 외곽 벽면과 거의 같도록 얇게 10px 두께 지정
        if (direction === 'top' || direction === 'bottom') {
            this.width = 120;
            this.height = 10;
        } else {
            this.width = 10;
            this.height = 120;
        }
        
        this.hp = 10; // 10회 가격 시 파괴
        this.hitCount = 0; // 누적 적중 공격수
        this.color = 'rgba(255, 255, 255, 0.08)'; // 던전 벽면과 거의 똑같이 동화되는 얇고 어두운 회백색 테두리
        this.glowColor = '#b026ff'; // 글리치 연출용 보랏빛
        this.flashTimer = 0;
        this.hitCooldown = 0; // 무적 시간 프레임
    }

    draw(ctx) {
        // [완벽 은닉] 반드시 플레이어가 공격한 공격이 닿아야만(hitCount > 0) 표시되기 시작해야 함!
        if (this.hitCount === 0) return;

        ctx.save();
        
        // 3회 이상 공격당했을 때 비밀방 단서로 지지직거리는 글리치 떨림 및 잔상 계산
        let shakeX = 0;
        let shakeY = 0;
        if (this.hitCount >= 3) {
            shakeX = (Math.random() * 2 - 1) * 3;
            shakeY = (Math.random() * 2 - 1) * 3;
        }

        ctx.translate(this.x + shakeX, this.y + shakeY);

        // 피격 시 백색 깜빡임 피드백
        if (this.flashTimer > 0) {
            this.flashTimer--;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ffffff';
        } else {
            // 벽 테두리 마진선과 혼연일체 되도록 얇고 어둡게 처리
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.strokeStyle = this.color;
            ctx.shadowBlur = 0;
        }

        // 박스 두께 약 2px 정도로 얇게 벽 테두리와 거의 유사한 느낌 드로잉
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // 3회 이상 타격 시 추가적인 보랏빛 노이즈 선을 지지직 덧그리기
        if (this.hitCount >= 3) {
            ctx.beginPath();
            ctx.strokeStyle = this.glowColor;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.glowColor;

            // 벽면에 보랏빛 지직거리는 크랙 노이즈 드로잉
            for (let k = 0; k < 3; k++) {
                if (this.width > this.height) { // 가로 벽
                    let rx = -this.width / 2 + Math.random() * this.width;
                    let ry = -this.height / 2 + Math.random() * this.height;
                    ctx.moveTo(rx - 15, ry);
                    ctx.lineTo(rx + 15, ry);
                } else { // 세로 벽
                    let rx = -this.width / 2 + Math.random() * this.width;
                    let ry = -this.height / 2 + Math.random() * this.height;
                    ctx.moveTo(rx, ry - 15);
                    ctx.lineTo(rx, ry + 15);
                }
            }
            ctx.stroke();
            
            // 5% 확률로 GLITCH 텍스트 홀로그램 가끔 출몰
            if (Math.random() < 0.05) {
                ctx.fillStyle = this.glowColor;
                ctx.font = '800 9px "Outfit"';
                ctx.textAlign = 'center';
                ctx.fillText("GLITCH", 0, this.height > this.width ? -this.height / 2 - 5 : -10);
            }
        }

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.5.7. 비밀방 전용 상호작용 글리치 장치 클래스 (Secret Glitch Device)
// --------------------------------------------------------------------------
class SecretGlitchDevice {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 22;
        this.color = '#b026ff'; // 차원 보랏빛 네온 테마
        this.pulse = 0;
        this.active = true;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.05;
        let scale = 1.0 + Math.sin(this.pulse) * 0.08;

        // 글리치 보랏빛 에너지 아우라 서클
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(176, 38, 255, 0.15)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 내부의 뱅글뱅글 핵심 코어
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 상호작용 텍스트 가이드
        ctx.font = '800 10px "Outfit"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText("CRASH TO ACTIVATE", 0, -this.radius - 8);

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.6. 네온 보상 상자 클래스 (Reward Chest)
// --------------------------------------------------------------------------
class RewardChest {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'stat', 'weapon', 'equipment'
        this.width = 36;
        this.height = 26;
        this.color = type === 'stat' ? '#00f0ff' : (type === 'weapon' ? '#b026ff' : '#ff6c00');
        this.pulse = 0;
        this.active = true;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.04;
        let bounceY = Math.sin(this.pulse) * 4;
        let scale = 1.0 + Math.sin(this.pulse) * 0.05;
        ctx.translate(0, bounceY);
        
        // 외부 발광 글로우 사각형
        ctx.beginPath();
        ctx.rect(-this.width/2 * scale, -this.height/2 * scale, this.width * scale, this.height * scale);
        ctx.fillStyle = this.type === 'stat' ? 'rgba(0, 240, 255, 0.15)' : (this.type === 'weapon' ? 'rgba(176, 38, 255, 0.15)' : 'rgba(255, 108, 0, 0.15)');
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 뚜껑선 드로잉
        ctx.beginPath();
        ctx.moveTo(-this.width/2 * scale, -this.height/6 * scale);
        ctx.lineTo(this.width/2 * scale, -this.height/6 * scale);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 자물쇠 네온 링 렌더링
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.7. 네온 코인 상점 자판기 클래스 (Vending Machine Shop)
// --------------------------------------------------------------------------
class VendingMachine {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'stat', 'weapon', 'equipment'
        this.width = 38;
        this.height = 56;
        this.color = type === 'stat' ? '#00f0ff' : (type === 'weapon' ? '#b026ff' : '#ff6c00');
        this.purchaseCount = 0;
        this.pulse = 0;
        this.active = true;
    }

    getPrice() {
        // 누적 구매 시마다 가격이 2배로 불어나는 인플레이션 딜레이 연산
        return 40 * Math.pow(2, this.purchaseCount);
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.03;
        let scale = 1.0 + Math.sin(this.pulse) * 0.02;

        // 메인 자판기 세로 박스 바디
        ctx.beginPath();
        ctx.rect(-this.width/2 * scale, -this.height/2 * scale, this.width * scale, this.height * scale);
        ctx.fillStyle = 'rgba(8, 9, 14, 0.9)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 상단 네온 전광판 (자판기 속성 마크)
        ctx.fillStyle = this.color;
        ctx.font = '800 10px "Outfit"';
        ctx.textAlign = 'center';
        ctx.fillText(this.type === 'equipment' ? 'EQUIP' : this.type.toUpperCase(), 0, -this.height/2 * scale + 14);

        // 네온 조명 스크린 창
        ctx.beginPath();
        ctx.rect(-this.width/2 + 5, -this.height/2 + 20, this.width - 10, 16);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fill();

        // 가격 표시 텍스트
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 9px "Outfit"';
        ctx.textAlign = 'center';
        ctx.fillText(`🪙 ${this.getPrice()}`, 0, -this.height/2 * scale + 31);

        // 동전 주입구 및 반환구 데코레이션
        ctx.beginPath();
        ctx.rect(this.width/2 - 10, 8, 4, 8);
        ctx.fillStyle = '#555555';
        ctx.fill();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.7.1. 네온 암시장 비밀 자판기 클래스 (Secret Black Market Vending Machine)
// 비밀 균열 벽 파괴 시 50% 확률로 출현하는 차원 거래 자판기.
// 코인 대신 최대 체력(Max HP) 15를 영구 바쳐 에픽/레전더리 카드를 확정 획득합니다.
// --------------------------------------------------------------------------
class SecretVendingMachine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 58;
        this.color = '#b026ff'; // 보라빛 네온 테마 컬러
        this.glowColor = '#d580ff'; // 밝은 보라 광휘
        this.pulse = 0;
        this.active = true;
        this.particleTimer = 0; // 차원 파티클 방출 타이머
    }

    // 보라빛 차원 아우라를 뿜는 비밀 자판기 렌더링
    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.04;
        let scale = 1.0 + Math.sin(this.pulse) * 0.03;

        // 차원의 보라빛 아우라 후광 (배경 글로우 원)
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(176, 38, 255, ${0.06 + Math.sin(this.pulse * 0.7) * 0.04})`;
        ctx.fill();

        // 메인 자판기 바디 (어두운 보라 테마)
        ctx.beginPath();
        ctx.rect(-this.width / 2 * scale, -this.height / 2 * scale, this.width * scale, this.height * scale);
        ctx.fillStyle = 'rgba(12, 6, 20, 0.92)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 22;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 상단 차원 포탈 마크 ("⁂ SECRET ⁂")
        ctx.fillStyle = this.glowColor;
        ctx.font = '800 8px "Outfit"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillText('⁂ SECRET ⁂', 0, -this.height / 2 * scale + 12);

        // 중앙 신비로운 보라빛 렌즈 스크린
        ctx.beginPath();
        ctx.rect(-this.width / 2 + 5, -this.height / 2 + 18, this.width - 10, 18);
        ctx.fillStyle = `rgba(176, 38, 255, ${0.08 + Math.sin(this.pulse * 1.3) * 0.06})`;
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fill();

        // 스크린 내 "??" 문양 (어떤 카드가 나올지 미지)
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 10px "Outfit"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fillText('🔮 ??', 0, -this.height / 2 * scale + 30);

        // 하단 경고 가격 표시 (Max HP)
        ctx.fillStyle = '#ff0055';
        ctx.font = '700 8px "Outfit"';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0055';
        ctx.fillText('❤️ -15 HP', 0, this.height / 2 * scale - 5);

        // 동전 주입구 데코 (보라빛)
        ctx.beginPath();
        ctx.rect(this.width / 2 - 10, 8, 4, 8);
        ctx.fillStyle = '#6b3a8a';
        ctx.fill();

        ctx.restore();
    }
}


// --------------------------------------------------------------------------
class NeonTrap {
    constructor(x, y, type, player) {
        this.x = x;
        this.y = y;
        this.type = type; // 'mine', 'laser_h' (가로 레이저), 'laser_v' (세로 레이저)
        this.player = player;
        this.radius = type === 'mine' ? 12 : 3;
        this.active = true;
        this.pulse = 0;
        
        if (type === 'laser_h') {
            this.x1 = 40;
            this.x2 = 760;
            this.y1 = y;
            this.y2 = y;
        } else if (type === 'laser_v') {
            this.x1 = x;
            this.x2 = x;
            this.y1 = 40;
            this.y2 = 560;
        }
    }

    update(monsters, game) {
        if (!this.active) return;
        this.pulse += 0.05;

        if (this.type === 'mine') {
            // 몬스터 충돌 감지
            for (let m of monsters) {
                let dist = Math.hypot(m.x - this.x, m.y - this.y);
                if (dist < m.radius + this.radius) {
                    this.triggerMine(game);
                    break;
                }
            }
        } else {
            // 레이저 트립와이어 충돌 감지
            for (let m of monsters) {
                let distToLaser = Infinity;
                if (this.type === 'laser_h') {
                    distToLaser = Math.abs(m.y - this.y);
                } else {
                    distToLaser = Math.abs(m.x - this.x);
                }
                
                if (distToLaser < m.radius + 3) {
                    this.triggerLaser(m, game);
                    break;
                }
            }
        }
    }

    triggerMine(game) {
        this.active = false;
        let splashRadius = 80;
        let damage = this.player.atk * 1.5;
        
        game.showFloatingText("MINE DETONATED! 💥", this.x, this.y - 25, '#ffdf00');
        game.shakeScreen(15, 5);
        Sound.play('explosion');
        
        // 폭발 파티클
        game.particles.push(new Particle(this.x, this.y, '#ffdf00', splashRadius, 0, 0, 30, 'explosionRing'));
        for (let k = 0; k < 15; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 4 + 2;
            game.particles.push(new Particle(this.x, this.y, '#ffdf00', 3, Math.cos(angle) * speed, Math.sin(angle) * speed, 20, 'spark'));
        }

        // 80px 내의 모든 적 기절 대폭발
        for (let m of game.monsters) {
            let dist = Math.hypot(m.x - this.x, m.y - this.y);
            if (dist < splashRadius + m.radius) {
                m.statusEffects.shock = 90; // 1.5초 기절
                let finalDmg = damage;
                if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                m.hp -= finalDmg;
                m.flashTimer = 8;
                
                // 강력 넉백
                let pushAngle = Math.atan2(m.y - this.y, m.x - this.x);
                m.knockbackX += Math.cos(pushAngle) * 5;
                m.knockbackY += Math.sin(pushAngle) * 5;
            }
        }
    }

    triggerLaser(hitMonster, game) {
        this.active = false;
        game.showFloatingText("TRIPWIRE DETONATED! ⚡", hitMonster.x, hitMonster.y - 25, '#00f0ff');
        game.shakeScreen(8, 3);
        
        // 체인 라이트닝 전류 마비 격발 (4회 전이, 100% 플레이어 atk 데미지)
        game.triggerChainLightning(this.x, this.y, hitMonster, 4, this.player.atk * 1.0);
        
        // 번개 스파크
        for (let k = 0; k < 8; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 3 + 1.5;
            game.particles.push(new Particle(hitMonster.x, hitMonster.y, '#00f0ff', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15, 'spark'));
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        
        if (this.type === 'mine') {
            ctx.translate(this.x, this.y);
            let scale = 1.0 + Math.sin(this.pulse) * 0.1;
            
            // 노란색 테두리 서클
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 223, 0, 0.2)';
            ctx.strokeStyle = '#ffdf00';
            ctx.lineWidth = 1.8;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ffdf00';
            ctx.fill();
            ctx.stroke();

            // 지뢰의 빨간 뇌관 점
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0055';
            ctx.fill();
        } else {
            // 레이저 트립와이어
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
            
            let alpha = 0.45 + Math.sin(this.pulse) * 0.2;
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f0ff';
            ctx.stroke();
            
            // 레이저 시작 및 끝 양쪽 벽면 네온 노드
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.arc(this.x1, this.y1, 4, 0, Math.PI * 2);
            ctx.arc(this.x2, this.y2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 7. 게임 전체를 지휘하는 핵심 컨트롤러 (GameEngine)
// --------------------------------------------------------------------------
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 디자인 해상도 비율 800 * 600 고정 스케일링 설정
        this.canvas.width = 800;
        this.canvas.height = 600;
 
        // 키보드 마우스 입력 상태 변수
        this.keys = {};
        this.mouse = { x: 0, y: 0, isDown: false };
        
        // 게임 상태 파라미터
        this.roomNum = 1;
        this.score = 0;
        this.kills = 0;
        this.isPlaying = false;
        this.isCleared = false;
        this.bossWarningTimer = 0; // [v0.95] 보스 출현 테두리 경보 타이머
        this.gameClearActive = false; // [v0.95] 최종 클리어 중복 방지 플래그
        
        // [신규 기믹] 보상 상자 획득 후 카드 선택 오버레이 활성화 지연 타이머 시스템
        this.rewardSelectorDelayTimer = -1;
        this.rewardSelectorIsFromHiddenChest = false;
        this.roomRewardSpawned = false; // [신규] 방 클리어 보상 스폰 유일성 플래그
        
        // 엔티티 관리 리스트
        this.player = new Player(400, 300);
        this.monsters = [];
        this.bullets = [];
        this.particles = [];
        this.pets = [];
        this.potions = []; // [추가] 맵 클리어 드롭 물약 엔티티 리스트
        this.coinsList = []; // [W-08 신규 구현] 드롭 코인 엔티티 리스트
        this.secretWalls = []; // [Phase 7 신규 구현] 비밀 균열 벽 리스트
        this.secretGlitchDevices = []; // 비밀방 상호작용 디바이스 리스트
        this.traps = [];   // [신규] 함정 엔티티 리스트
        this.obstacles = []; // [신규] 25등분 격자 장애물 리스트
        
        // [신규 기획] 포털 특화 보상 및 상점 관리 리스트
        this.currentRoomType = 'stat'; 
        this.rewardChests = [];
        this.vendingMachines = [];
        this.vendingCooldown = 0;
        this.secretVendingMachines = []; // [네온 암시장] 비밀 자판기 리스트
        
        // 4개의 방향 포털 포지셔닝
        this.portals = [];
        this.lastEnteredPortalDir = null; // 방에 진입했던 입구 추적 (그 입구에선 몬스터 스폰 차단)
        
        // 몬스터 스폰 지연 큐 (Sequential Spawn Queue)
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.currentSpawnTotal = 0;
        this.currentSpawnRemaining = 0;
        
        // 3차 피드백: 스폰 패턴 및 누적량 제어 변수
        this.spawnMethod = 1; // 1: 지속, 2: 2초 지연, 3: 웨이브 대기
        this.spawnedInRoom = 0; // 이번 방에서 실제 스폰이 이루어진 누적 몬스터 수
        this.method2DelayDone = false; // 방식 2에서 2초 딜레이를 먹였는지 체크 플래그
        
        // 흔들림 이펙트 강도
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // 콤보 및 기타 이펙트 수치
        this.comboCount = 0;
        this.comboTimer = 0;
        
        // v0.3: 난이도/보상 시너지 기믹 속성 초기화
        this.isEliteRoom = false;
        this.lastEnteredPortalClass = 'low';
        
        this.timeDilationActive = false; // [추가] 시간 왜곡(지연) 마법 활성화 플래그
        this.timeWarpFreeCastActive = false; // [신규 기획] Mana Helm 5레벨 무료 지속 시간왜곡 체크용 플래그
        this.hasRerolledThisRoom = false;   // [신규 기획] Luck Amulet 10레벨 초월: 보상 카드 방당 1회 리롤 트래킹 플래그
        this.gameOverActive = false;        // [신규 추가] 사망 연출 다중 중복 트리거 방지용 플래그
        
        this.inSecretRoom = false; // 비밀방 보너스 층 상태 추적 플래그
        this.forceSecretWallNextRoom = false; // 치트 강제 비밀방 등장 플래그

        // [보정] 고주사율 모니터 배속 방지를 위한 60FPS 고정 타임스텝 변수 초기화
        this.lastTime = performance.now();
        this.accumulatedTime = 0;
        this.timestep = 1000 / 60; // 60FPS (약 16.67ms)
        
        this.initInputEvents();
        this.setupInitialRoom();
        this.initCheatSystemEvents();
        this.initOptionEvents(); // [신규 추가] 시스템 옵션 모달 이벤트 등록
    }

    // 입력 장치 이벤트 바인딩
    initInputEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Spacebar를 누르면 마력 특수기 가동 (오버레이가 없고 실제 게임 실행 중일 때만 허용)
            if (e.key === ' ' || e.code === 'Space') {
                const isOverlayOpen = this.checkAnyOverlayOpen();
                if (!isOverlayOpen && this.isPlaying && this.player && this.player.hp > 0) {
                    this.triggerMagicSkill();
                }
            }

            // [테스트용 치트 핫키] P키: 디버그/치트 메뉴 토글
            if (e.key === 'p' || e.key === 'P') {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return;
                }
                e.preventDefault();
                
                // 치트 메뉴를 새로 여는 시점에만 다른 오버레이가 켜져 있는지 확인하여 차단
                const cheatOverlay = document.getElementById('cheat-overlay');
                const isAlreadyOpen = cheatOverlay && !cheatOverlay.classList.contains('hidden');
                if (!isAlreadyOpen) {
                    if (this.checkAnyOverlayOpenExcept('cheat-overlay')) return;
                }
                this.toggleCheatMenu();
            }

            // [신규 추가] Escape 키: 시스템 옵션 모달 토글
            if (e.key === 'Escape') {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return;
                }
                e.preventDefault();
                
                // 옵션 메뉴를 새로 여는 시점에만 다른 오버레이가 켜져 있는지 확인하여 차단
                const optionOverlay = document.getElementById('option-overlay');
                const isAlreadyOpen = optionOverlay && !optionOverlay.classList.contains('hidden');
                if (!isAlreadyOpen) {
                    if (this.checkAnyOverlayOpenExcept('option-overlay')) return;
                }
                this.toggleOptionMenu();
            }

            // [테스트용 치트 핫키] O키: 99스테이지 즉시 도달 워프 (100스테이지 보스 직전)
            if (e.key === 'o') {
                this.roomNum = 99;
                this.monsters = [];
                this.spawnQueue = [];
                this.updateHUD();
                this.showFloatingText("CHEAT: WARP TO ROOM 99", this.player.x, this.player.y - 40, '#ff3300');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // [수정] 마우스가 캔버스 바깥 영역으로 나가도 조준이 끊김 없이 부드럽게 갱신되도록 window 전체에 바인딩
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // 화면 스케일에 상관없이 정확한 캔버스 기준 상대 조준점 확보 (바깥 영역 투영 가능)
            this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        });

        // [수정] 캔버스 바깥 검은 영역을 클릭해도 정상 사격이 되도록 window에 mousedown 바인딩
        window.addEventListener('mousedown', (e) => {
            // 버튼, 슬라이더, 또는 HUD 오버레이 영역을 클릭 시 사격이 중복 격발되는 오동작 차단 가드 적용
            if (e.target) {
                const targetTagName = e.target.tagName;
                if (targetTagName === 'INPUT' || targetTagName === 'BUTTON' || targetTagName === 'SELECT' || 
                    e.target.closest('.overlay-panel') || e.target.closest('#hud-header') || e.target.closest('#hud-footer')) {
                    return;
                }
            }
            
            if (e.button === 0) { // 마우스 좌클릭
                this.mouse.isDown = true;
                Sound.init(); // 브라우저 자동 재생 규정 우회
                Sound.startBGM(); // 첫 클릭 시 은은하고 웅장한 Synth BGM 시작
            }
        });

        window.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
        });

        // 게임 오버 혹은 재시작 버튼 연결
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('start-overlay').classList.add('hidden');
            this.startGame();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('result-overlay').classList.add('hidden');
            this.restartGame();
        });

        // [신규] 파이어베이스 랭킹 시스템 UI 이벤트 리스너 연동
        
        // 닉네임 입력 실시간 필터 (영어 대문자와 숫자만 허용)
        const rankNicknameInput = document.getElementById('rank-nickname');
        if (rankNicknameInput) {
            rankNicknameInput.addEventListener('input', (e) => {
                let val = e.target.value.toUpperCase();
                // 영문 대문자와 숫자만 남기고 제거
                e.target.value = val.replace(/[^A-Z0-9]/g, '');
            });
            // Enter 키 입력 시 랭킹 등록 즉시 호출 지원
            rankNicknameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.submitRanking();
                }
            });
        }

        // 랭킹 등록 버튼 클릭 이벤트
        const submitRankBtn = document.getElementById('submit-rank-btn');
        if (submitRankBtn) {
            submitRankBtn.addEventListener('click', () => {
                this.submitRanking();
            });
        }

        // 리더보드 모달 열기 버튼 (메인 시작 화면 및 결과 화면)
        const mainLbBtn = document.getElementById('main-leaderboard-btn');
        if (mainLbBtn) {
            mainLbBtn.addEventListener('click', () => {
                this.showLeaderboard();
            });
        }

        const resLbBtn = document.getElementById('result-leaderboard-btn');
        if (resLbBtn) {
            resLbBtn.addEventListener('click', () => {
                this.showLeaderboard();
            });
        }

        // 리더보드 모달 닫기 버튼 (X 아이콘 및 하단 닫기 버튼)
        const lbCloseX = document.getElementById('ranking-modal-close');
        if (lbCloseX) {
            lbCloseX.addEventListener('click', () => {
                this.hideLeaderboard();
            });
        }

        const lbCloseBtn = document.getElementById('ranking-modal-close-btn');
        if (lbCloseBtn) {
            lbCloseBtn.addEventListener('click', () => {
                this.hideLeaderboard();
            });
        }

        // [신규] 리더보드 모달 필터 전환 버튼 이벤트 바인딩
        const filterBtns = document.querySelectorAll('.rank-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = btn.getAttribute('data-filter');
                const includeLocal = (filterType === 'all');
                
                // 필터링된 데이터 재호출 및 리더보드 다시 렌더링
                this.showLeaderboard(includeLocal);
            });
        });
    }

    // 게임 시작 시 초기화
    startGame() {
        // [결함 완치] 게임 재시작 시 기존에 기동 중이던 애니메이션 루프가 있을 수 있으므로 즉시 가드 해제(Cancel)하여 부스팅 현상을 박멸합니다.
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }

        this.isPlaying = true;
        this.roomNum = 1;
        this.score = 0;
        this.kills = 0;
        
        this.player = new Player(400, 300);
        this.monsters = [];
        this.bullets = [];
        this.particles = [];
        this.pets = [];
        this.potions = []; // [추가] 물약 리스트 초기화
        this.coinsList = []; // [W-08 신규 구현] 코인 리스트 초기화
        this.secretWalls = []; // [Phase 7 신규 구현] 비밀 벽 초기화
        this.secretGlitchDevices = []; // 비밀방 상호작용 디바이스 초기화
        this.traps = [];   // [신규] 함정 리스트 초기화
        this.obstacles = []; // [신규] 25등분 격자 장애물 리스트 초기화
        
        // [신규 기획] 보상 및 상점 리스트 리셋
        this.currentRoomType = 'stat';
        this.rewardChests = [];
        this.vendingMachines = [];
        this.vendingCooldown = 0;
        this.secretVendingMachines = []; // [네온 암시장] 비밀 자판기 초기화
        
        this.spawnQueue = [];
        this.lastEnteredPortalDir = null;
        
        // 3차 피드백: 스폰 초기화
        this.spawnMethod = 1;
        this.spawnedInRoom = 0;
        this.method2DelayDone = false;
        
        // v0.3: 난이도/보상 시너지 기믹 속성 초기화
        this.isEliteRoom = false;
        this.lastEnteredPortalClass = 'low';
        
        this.timeDilationActive = false; // [추가] 시작 시 시간 왜곡 비활성화
        
        this.inSecretRoom = false; // 비밀방 보너스 층 상태 추적 플래그
        this.forceSecretWallNextRoom = false; // 치트 강제 비밀방 등장 플래그

        this.updateHUD();
        this.setupInitialRoom();
        
        // [보정] 게임 재시작 시 타임스텝 누적 시간 리셋
        this.lastTime = performance.now();
        this.accumulatedTime = 0;

        // 매끄러운 60fps 애니메이션 루프 재구동 및 루프 ID 보관
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
        Sound.play('powerup');
        Sound.startBGM(); // [추가] 게임 시작 시 BGM 연주 강제 시작/보장
    }

    restartGame() {
        this.startGame();
    }

    // 첫 시작 방은 몬스터가 등장하지 않는 완전히 평화로운 휴식의 안전실
    setupInitialRoom() {
        this.portals = [
            new RoomPortal('top', this.getRandomScoreValue()),
            new RoomPortal('bottom', this.getRandomScoreValue()),
            new RoomPortal('left', this.getRandomScoreValue()),
            new RoomPortal('right', this.getRandomScoreValue())
        ];
        
        // [신규 기획] 포털 특화 유형 무작위 분배 (25% 확률로 스탯 1개가 상점 카드로 변경)
        let types = ['stat', 'stat', 'weapon', 'equipment'];
        if (Math.random() < 0.25) {
            types[0] = 'shop';
        }
        types.sort(() => 0.5 - Math.random());
        this.portals.forEach((p, idx) => {
            p.portalType = types[idx];
        });
        
        // v0.3: 문 랭킹 랭크 부여
        this.rankPortals();
        
        // 적이 없는 상태이므로 즉시 모든 문 개방
        this.portals.forEach(p => p.active = true);
        this.monsters = [];
        this.spawnQueue = [];
        this.traps = []; // [신규] 함정 리스트 초기화
        
        // 콤보 리셋
        this.comboCount = 0;
        this.comboTimer = 0;

        this.isEliteRoom = false;
        this.lastEnteredPortalClass = 'low';
    }

    // [v0.3] 3개 포털의 scoreValue에 랭킹 등급 상(high)/중(mid)/하(low) 부여
    rankPortals() {
        let activePortals = [...this.portals];
        if (this.lastEnteredPortalDir) {
            activePortals = activePortals.filter(p => p.direction !== this.lastEnteredPortalDir);
        }
        
        // 내림차순 정렬 (높은 몬스터 수 우선)
        activePortals.sort((a, b) => b.scoreValue - a.scoreValue);
        
        // 랭크 할당
        activePortals.forEach((p, idx) => {
            if (idx === 0) p.difficultyClass = 'high';
            else if (idx === 1) p.difficultyClass = 'mid';
            else p.difficultyClass = 'low';
        });
        
        // 제외된 포털이 있다면 기본 low
        this.portals.forEach(p => {
            if (!p.difficultyClass) p.difficultyClass = 'low';
        });
    }

    // 문 위에 들어갈 몬스터 수 & 획득 점수 랜덤 난이도 결정 (10스테이지마다 최대/최소 증가)
    getRandomScoreValue() {
        // 10스테이지마다 최대 등장 몬스터가 5마리씩 증가 (최대 65마리)
        // 1~10스테이지 (group 0): 1 ~ 20마리
        // 11~20스테이지 (group 1): 6 ~ 25마리
        // 21~30스테이지 (group 2): 11 ~ 30마리
        // ...
        // 91~100스테이지 (group 9): 46 ~ 65마리
        let stageGroup = Math.floor((this.roomNum - 1) / 10);
        let minVal = 1 + stageGroup * 5;
        let maxVal = Math.min(65, 20 + stageGroup * 5);
        
        // 보정: minVal이 maxVal을 넘지 않도록 안전 제한
        if (minVal > maxVal) minVal = maxVal - 4;
        if (minVal < 1) minVal = 1;
        
        return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
    }

    // 특정 문으로 입장했을 때의 방 전환 엔진
    transitionToNextRoom(portal) {
        // [신규 기획] 현재 방의 유형을 방금 진입한 포털의 보상 유형으로 갱신!
        const enteringSecretRoom = (portal.portalType === 'secret_room');
        
        if (enteringSecretRoom) {
            this.inSecretRoom = true;
            this.currentRoomType = 'secret_room';
        } else {
            this.currentRoomType = portal.portalType || 'stat';
        }

        const scoreBonus = portal.scoreValue;
        this.score += scoreBonus; // 획득 점수 축적
        
        // 진입한 문의 난이도 등급 저장 (보상 등급 강화에 적용)
        this.lastEnteredPortalClass = portal.difficultyClass || 'low';

        // 5의 배수 방(10의 배수 보스방 제외) 진입 시 엘리트 활성화 여부 세팅
        let nextRoomNum = this.roomNum + 1;
        if (nextRoomNum % 5 === 0 && nextRoomNum % 10 !== 0 && !enteringSecretRoom) {
            // '상'(high) 또는 '중'(mid) 등급 문으로 들어왔을 때만 진짜 엘리트 방
            if (portal.difficultyClass === 'high' || portal.difficultyClass === 'mid') {
                this.isEliteRoom = true;
            } else {
                this.isEliteRoom = false;
            }
        } else {
            this.isEliteRoom = false;
        }

        // [3차 피드백] 스폰 방식(패턴) 결정 연산
        // 1스테이지에서 2스테이지로 넘어갈 때는 무조건 방식 1
        if (this.roomNum === 1) {
            this.spawnMethod = 1;
        } else {
            // 입장 방향을 제외한 나머지 3개 스폰 대상 포털 추출 (비밀방 포털인 경우엔 4방향 전부 검토)
            const targetPortals = this.portals.filter(p => p.direction !== this.lastEnteredPortalDir);
            
            if (targetPortals.length > 0) {
                // 시계 방향 정렬 순서 준비 (겹쳤을 때 플레이어 입장 방향의 왼쪽부터 시계방향순 타이브레이커)
                const dirOrder = ['top', 'right', 'bottom', 'left'];
                let entryIdx = dirOrder.indexOf(this.lastEnteredPortalDir);
                const pOrder = [
                    dirOrder[(entryIdx + 1) % 4],
                    dirOrder[(entryIdx + 2) % 4],
                    dirOrder[(entryIdx + 3) % 4]
                ];

                // 3개 포털 정렬 (1순위: 숫자 내림차순, 2순위: pOrder 인덱스가 작을수록 우선)
                const sortedPortals = [...targetPortals].sort((a, b) => {
                    if (b.scoreValue !== a.scoreValue) {
                        return b.scoreValue - a.scoreValue; // 숫자 높은 것이 먼저
                    }
                    return pOrder.indexOf(a.direction) - pOrder.indexOf(b.direction);
                });

                let chosenIdx = sortedPortals.findIndex(p => p.direction === portal.direction);
                if (chosenIdx === 0) {
                    this.spawnMethod = 3;
                } else if (chosenIdx === 1) {
                    this.spawnMethod = 2;
                } else {
                    this.spawnMethod = 1;
                }
            } else {
                this.spawnMethod = 1;
            }
        }

        // 스폰 제어 변수들 다음 방 진입 대비 리셋
        this.spawnedInRoom = 0;
        this.method2DelayDone = false;
        this.roomRewardSpawned = false; // [신규] 다음 방 진입 시 보상 스폰 플래그 리셋

        // [글리치 비밀방 층수 룰 적용] 비밀방에 들어설 때는 roomNum(층수)을 올리지 않고 동결!
        if (enteringSecretRoom) {
            this.showFloatingText("🔮 SECRET CHASM REACHED (ROOM LEVEL FREEZE)", this.player.x, this.player.y - 45, '#b026ff');
        } else {
            this.roomNum++; // 일반 방 진행 시에만 정상 층수 가산
            this.inSecretRoom = false; // 비밀방 룰에서 복귀
        }
        
        // 100 스테이지 달성 시 최종 승리 클리어
        if (this.roomNum > 100) {
            this.triggerGameClear();
            return;
        }

        // 플레이어 캐릭터 좌표를 해당 포털 방향의 정반대 문 앞으로 워프 이동 (비밀 포털은 맵 중앙 워프)
        if (portal.direction === 'secret') {
            this.player.x = 400;
            this.player.y = 450; // 중앙 장치(400, 300)와 겹쳐서 즉시 충돌 소멸되는 현상 완벽 방지
            this.lastEnteredPortalDir = 'center';
        } else if (portal.direction === 'top') {
            this.player.x = 400;
            this.player.y = 510;
            this.lastEnteredPortalDir = 'bottom';
        } else if (portal.direction === 'bottom') {
            this.player.x = 400;
            this.player.y = 70;
            this.lastEnteredPortalDir = 'top';
        } else if (portal.direction === 'left') {
            this.player.x = 710;
            this.player.y = 300;
            this.lastEnteredPortalDir = 'right';
        } else if (portal.direction === 'right') {
            this.player.x = 70;
            this.player.y = 300;
            this.lastEnteredPortalDir = 'left';
        }

        // [비밀방 출구 포털 룰 적용] 비밀방에 있을 때는 단 하나의 탈출구 문만 랜덤 방향에 생성
        if (this.inSecretRoom) {
            const directions = ['top', 'bottom', 'left', 'right'];
            const chosenDir = directions[Math.floor(Math.random() * 4)];
            const exitPortal = new RoomPortal(chosenDir, this.getRandomScoreValue());
            
            // 100% 무작위 보상 배정 (스탯, 무기, 장비)
            let types = ['stat', 'weapon', 'equipment'];
            exitPortal.portalType = types[Math.floor(Math.random() * 3)];
            // 난이도는 현재 층수 기준 중간(mid) 이상(high)으로 설정
            exitPortal.difficultyClass = Math.random() < 0.5 ? 'mid' : 'high';
            exitPortal.active = false; // 격퇴 전까지 활성화 잠금

            this.portals = [exitPortal];
        } else {
            // 다음 방의 문 상태 초기화 (전부 몬스터 처치 전까지 잠금 붉은색)
            this.portals = [
                new RoomPortal('top', this.getRandomScoreValue()),
                new RoomPortal('bottom', this.getRandomScoreValue()),
                new RoomPortal('left', this.getRandomScoreValue()),
                new RoomPortal('right', this.getRandomScoreValue())
            ];
            
            // [신규 기획] 다음 방 포털 특화 유형 무작위 분배 (25% 확률로 상점 포털 대체 출현)
            let types = ['stat', 'stat', 'weapon', 'equipment'];
            if (Math.random() < 0.25) {
                types[0] = 'shop';
            }
            types.sort(() => 0.5 - Math.random());
            this.portals.forEach((p, idx) => {
                p.portalType = types[idx];
            });

            this.rankPortals(); // 등급 랭킹화
            this.portals.forEach(p => p.active = false);
        }

        // 탄환 전체 청소 및 기존 몬스터 삭제
        this.bullets = [];
        this.particles = [];
        this.potions = []; // [추가] 방 이동 시 드롭된 물약 청소
        this.coinsList = []; // [W-08 신규 구현] 방 이동 시 코인 청소
        this.secretWalls = []; // [Phase 7 신규 구현] 방 이동 시 비밀 벽 청소
        this.secretGlitchDevices = []; // 비밀방 상호작용 디바이스 청소
        this.rewardChests = []; // [추가] 이전 방 상자들 삭제
        this.vendingMachines = []; // [추가] 이전 방 자판기들 삭제
        this.secretVendingMachines = []; // [네온 암시장] 비밀 자판기 청소
        this.traps = []; // [신규] 함정 리스트 청소
        this.player.perfectClearFlag = true; // [추가] 새 방에 진입 시 퍼펙트 플래그 리셋!
        this.hasRerolledThisRoom = false;   // [신규 기획] 새 방 진입 시 리롤 사용 플래그 리셋!
        this.player.burstRemaining = 0;     // [신규] 방 이동 시 비동기 잔상 사격 완전 차단 리셋!
        this.obstacles = []; // [신규] 이전 방 장애물 청소

        // [신규] 25등분 격자 기반 랜덤 장애물 생성 기믹 (비밀방 차원 상점에서는 쾌적함을 위해 장애물 생성 예외적 원천 방지)
        if (this.roomNum > 1 && this.roomNum % 10 !== 0 && !enteringSecretRoom) {
            let stageGroup = Math.floor((this.roomNum - 1) / 20);
            let maxObstacles = Math.min(5, stageGroup + 1);
            let obstacleCount = 0;
            for (let i = 0; i < maxObstacles; i++) {
                if (Math.random() < 0.5) {
                    obstacleCount++;
                } else {
                    break;
                }
            }
            let candidates = [
                { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 },
                { col: 1, row: 2 },                     { col: 3, row: 2 },
                { col: 1, row: 3 }, { col: 2, row: 3 }, { col: 3, row: 3 }
            ];
            candidates.sort(() => 0.5 - Math.random());
            for (let i = 0; i < Math.min(obstacleCount, candidates.length); i++) {
                let cell = candidates[i];
                this.obstacles.push(new NeonObstacle(cell.col, cell.row));
            }
        }

        // 5번 방 주기마다 보스전 활성화 (5, 10, 15... 100)
        // 10의 배수는 무조건 보스방으로 기동!
        if (enteringSecretRoom) {
            // 비밀방은 보스 및 몬스터 스폰을 전면 스킵하고 보상 디바이스 소환
            this.monsters = [];
            this.spawnQueue = [];
            this.secretGlitchDevices.push(new SecretGlitchDevice(400, 300));
        } else if (this.roomNum % 10 === 0) {
            this.setupBossRoom();
        } else {
            // 일반 혹은 엘리트 몬스터 스폰 큐 예약
            this.queueSequentialSpawns(scoreBonus);
        }

        // [Phase 7 신규 구현] 비밀 균열 벽 스폰 (기본 10% 확률로 완화 + 치트 연동)
        // 보스방(10의 배수), 첫 시작방(roomNum === 1), 또는 비밀방 안(inSecretRoom)에서는 절대 스폰하지 않음
        let shouldSpawnSecret = false;
        if (this.roomNum % 10 !== 0 && this.roomNum > 1 && !enteringSecretRoom && !this.inSecretRoom) {
            if (this.forceSecretWallNextRoom) {
                shouldSpawnSecret = true;
                this.forceSecretWallNextRoom = false; // 치트 소모
                // 치트 UI 동기화 해제 처리
                const cheatCheckbox = document.getElementById('cheat-forcesecret');
                if (cheatCheckbox) cheatCheckbox.checked = false;
            } else if (Math.random() < 0.10) {
                shouldSpawnSecret = true;
            }
        }

        if (shouldSpawnSecret) {
            // [요건 반영] 비밀방 입구가 노골적이지 않도록 구석 모퉁이가 아닌 외곽 테두리 4방향 벽면에 완벽 매설
            let spots = [
                { wallX: 250, wallY: 40, dir: 'top' },    // 상단 벽면
                { wallX: 550, wallY: 560, dir: 'bottom' }, // 하단 벽면
                { wallX: 40, wallY: 180, dir: 'left' },    // 좌측 벽면
                { wallX: 760, wallY: 420, dir: 'right' }   // 우측 벽면
            ];
            
            // 격자 장애물과 간섭 차단을 위한 안전한 후보지만 필터링
            let safeSpots = spots.filter(spot => {
                for (let obs of this.obstacles) {
                    let distWall = Math.hypot(spot.wallX - obs.x, spot.wallY - obs.y);
                    if (distWall <= 85) { // 안전 마진 85px 상향 정교화
                        return false; 
                    }
                }
                return true;
            });
            
            let chosenSpot = safeSpots.length > 0 
                ? safeSpots[Math.floor(Math.random() * safeSpots.length)]
                : spots[Math.floor(Math.random() * spots.length)];
            
            // 비밀 균열 외벽 생성 (방향 정보 전달)
            this.secretWalls.push(new SecretWall(chosenSpot.wallX, chosenSpot.wallY, chosenSpot.dir));
            // 보물 상자는 위치 노출 방지를 위해 평소에 생성하지 않음 (스펙 변경으로 삭제 완료)
        }

        this.updateHUD();
        Sound.play('powerup');
    }

    // 보스 소환 설정
    setupBossRoom() {
        this.currentSpawnTotal = 1;
        this.currentSpawnRemaining = 1;
        
        // 보스는 문이 아닌 중앙 부근에서 출현시킴
        const boss = new Monster(400, 200, Math.floor(this.roomNum / 5), this.roomNum);
        boss.makeBoss(this.roomNum);
        this.monsters.push(boss);

        // 보스 출현 경고음 및 화면 강한 진동
        this.shakeScreen(90, 8); // 보스룸 진입 시 1.5초간 대진동
        this.bossWarningTimer = 180; // 3초간 경보 빔 유지

        // 긴박한 사이렌 저음 경고음 3회 틱틱 재생
        Sound.play('boss_alert');
        setTimeout(() => Sound.play('boss_alert'), 450);
        setTimeout(() => Sound.play('boss_alert'), 900);
    }

    // 몬스터 순차 스폰 큐 준비
    queueSequentialSpawns(totalCount) {
        this.spawnQueue = [];
        this.currentSpawnTotal = totalCount;
        this.currentSpawnRemaining = totalCount;
        
        // 보스 몬스터가 아닌 일반 방의 경우 이전 진입 포털을 제외한 나머지 3개 문 방향을 추출
        const spawnDirections = ['top', 'bottom', 'left', 'right'].filter(dir => dir !== this.lastEnteredPortalDir);
        
        let remainingToSpawn = totalCount;

        // [엘리트 기믹] 만약 엘리트 방이고 다음 방이 5의 배수 방이면 처음에 녹색 거대 엘리트 몬스터 스폰 예약 삽입
        if (this.isEliteRoom) {
            let eliteCount = Math.floor(this.roomNum / 35) + 1; // 35스테이지 단위당 마릿수 확장
            for (let e = 0; e < eliteCount; e++) {
                let randomDir = spawnDirections[Math.floor(Math.random() * spawnDirections.length)];
                let spawnCoords = this.getSpawnCoordinates(randomDir);
                this.spawnQueue.push({
                    size: 1,
                    x: spawnCoords.x,
                    y: spawnCoords.y,
                    delay: 20,
                    forceElite: true // 엘리트 속성 소환 유도
                });
            }
        }
        
        // 1마리 ~ 5마리 사이의 몬스터 팩(Pac) 단위로 소량 쪼개어 스폰 큐에 담아 순차 출현
        while (remainingToSpawn > 0) {
            let pacSize = Math.floor(Math.random() * 5) + 1; // 1~5마리
            pacSize = Math.min(pacSize, remainingToSpawn);
            
            // 3곳 입구 중 무작위 방향 1곳 선택
            let randomDir = spawnDirections[Math.floor(Math.random() * spawnDirections.length)];
            let spawnCoords = this.getSpawnCoordinates(randomDir);

            this.spawnQueue.push({
                size: pacSize,
                x: spawnCoords.x,
                y: spawnCoords.y,
                delay: 30 // 30프레임 간격 (약 0.5초 주기로 순차 스폰하도록 연장)
            });

            remainingToSpawn -= pacSize;
        }

        this.spawnTimer = 0;
    }

    // 방향별 정확한 스폰 시작 좌표 획득
    getSpawnCoordinates(direction) {
        // 문 입구의 중앙 부근 좌표
        if (direction === 'top') return { x: 400, y: 55 };
        if (direction === 'bottom') return { x: 400, y: 525 };
        if (direction === 'left') return { x: 55, y: 300 };
        return { x: 725, y: 300 }; // right
    }

    // 매 프레임마다 스폰 큐에서 몬스터 한 묶음씩 뿜어내기
    processSpawnQueue() {
        if (this.spawnQueue.length === 0) return;

        // [3차 피드백] 방식 3: 10마리 이상 스폰되면 정지하고 다 처치되면 소환 재개
        if (this.spawnMethod === 3 && this.spawnedInRoom >= 10) {
            // 필드의 몬스터가 전부 소탕될 때까지 다음 팩 스폰을 보류(정지)
            if (this.monsters.length > 0) {
                return; // 정지 상태 유지
            } else {
                // 적이 전부 소탕되었으므로 이번 방 스폰 누적 마리수를 리셋하여 다음 스폰 활성화
                this.spawnedInRoom = 0;
            }
        }

        this.spawnTimer++;
        
        let currentPac = this.spawnQueue[0];
        if (this.spawnTimer >= currentPac.delay) {
            // 이번 주기 몬스터 소환
            for (let i = 0; i < currentPac.size; i++) {
                // 소환 흩어짐 폭을 더 넓게 설정하여 과도한 뭉침 방지 (80px 반경 분산)
                let rx = currentPac.x + (Math.random() * 80 - 40);
                let ry = currentPac.y + (Math.random() * 80 - 40);
                
                // 5개 방마다 몬스터 등급 티어 상승 계산식
                let currentTier = Math.floor((this.roomNum - 1) / 5) + 1;
                let enemy = new Monster(rx, ry, currentTier, this.roomNum);

                // 강제 엘리트 몬스터 처리
                if (currentPac.forceElite) {
                    enemy.makeElite();
                }
                
                this.monsters.push(enemy);

                // 소환되는 문 입구 스파크 파티클 효과 연출
                for (let k = 0; k < 6; k++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 2 + 1;
                    this.particles.push(new Particle(rx, ry, enemy.color, 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 25));
                }
            }

            // 스폰된 몬스터 개수를 카운터에 기록
            this.spawnedInRoom += currentPac.size;

            // [3차 피드백] 방식 2: 10마리 스폰 도달 시 다음 소환 타이밍을 임시 2초(120프레임)로 지연
            if (this.spawnMethod === 2 && this.spawnedInRoom >= 10 && !this.method2DelayDone) {
                // 현재 타이머를 -90으로 당겨서, 다음 소환까지 120프레임(2초)이 걸리도록 강제 지연
                this.spawnTimer = -90; 
                this.method2DelayDone = true; // 지연 먹임 처리
            } else {
                this.spawnTimer = 0;
            }

            // 이번 스폰 팩 완료 처리 및 큐에서 제거
            this.spawnQueue.shift();
            
            // 소환 피드백 화면 진동
            this.shakeScreen(5, 2);
        }
    }

    // 마력 풀 충전 시 발동 가능한 플레이어 장착 마법 특수기
    triggerMagicSkill() {
        if (this.player.magicType === 'explosion') {
            // [개선] 100% 전체 소모가 아닌 고정 100 MP 이상 시 시전 가능
            if (this.player.mp < 100) {
                this.showFloatingText("NEED 100+ MP", this.player.x, this.player.y - 20, '#ff0055');
                return;
            }

            // [신규 기획] Mana Helm 5레벨 돌파: 20% 확률로 마나 무료 시전!
            let isFreeMana = false;
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                isFreeMana = true;
                this.showFloatingText("FREE MANA CAST!", this.player.x, this.player.y - 30, '#00f0ff');
            }

            // [개선] 마력 100 MP 고정 차감 (maxMp가 크면 연속 시전 가능)
            if (!isFreeMana) {
                this.player.mp = Math.max(0, this.player.mp - 100);
            }
            this.shakeScreen(40, 10);
            Sound.play('explosion');

            const explosionRadius = 180 + (this.player.atk * 1.5); // 데미지에 비례한 파괴 반경
            const explosionDamage = this.player.atk * 3.5; // 폭발적 한방 피해량

            // 마법 네온 충격파 고리 파티클 생성
            this.particles.push(new Particle(this.player.x, this.player.y, '#b026ff', explosionRadius, 0, 0, 45, 'explosionRing'));

            // 반경 내 모든 몬스터 피해 적용
            for (let i = this.monsters.length - 1; i >= 0; i--) {
                let m = this.monsters[i];
                let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                if (dist < explosionRadius) {
                    let finalDmg = explosionDamage;
                    if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                    m.hp -= finalDmg;
                    m.flashTimer = 8;
                    // 플레이어 중심 바깥으로 강력한 넉백 기동
                    let angle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                    m.knockbackX = Math.cos(angle) * 8;
                    m.knockbackY = Math.sin(angle) * 8;
                    
                    // 폭발 파티클 조각
                    for (let k = 0; k < 8; k++) {
                        let spd = Math.random() * 5 + 2;
                        this.particles.push(new Particle(m.x, m.y, '#b026ff', 3, Math.cos(angle + Math.random() - 0.5) * spd, Math.sin(angle + Math.random() - 0.5) * spd, 30));
                    }
                }
            }
            // 문 및 게이지 강제 갱신
            this.updateHUD();
        } 
        else if (this.player.magicType === 'timeWarp') {
            // [수정] 이미 활성화된 상태라면 수동 비활성화 차단 (마나가 0이 될 때까지 강제 사용)
            if (this.timeDilationActive) {
                this.showFloatingText("CANNOT STOP WARP", this.player.x, this.player.y - 25, '#ff0055');
                return;
            }

            // [개선] 50 MP가 아닌 100 MP 이상일 때 발동 가능하게 밸런스 상향 일치
            if (this.player.mp < 100) {
                this.showFloatingText("NEED 100+ MP", this.player.x, this.player.y - 20, '#ff0055');
                return;
            }
            
            // [신규 기획] Mana Helm 5레벨 돌파: 20% 확률로 마나 무료 시전! (시간 왜곡 지속 소모 면제)
            this.timeWarpFreeCastActive = false;
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                this.timeWarpFreeCastActive = true;
                this.showFloatingText("FREE MANA WARP!", this.player.x, this.player.y - 30, '#00f0ff');
            }
            
            this.timeDilationActive = true;
            this.shakeScreen(25, 4);
            this.showFloatingText("🔮 TIME WARP ACTIVE", this.player.x, this.player.y - 30, '#b026ff');
            
            // 시간왜곡 발동 피드백 아르페지오 사운드 재생
            Sound.play('victory');
        }
    }

    // [모델 C] 플레이어의 보상 카드 빌드 시너지를 감지해 대미지 곱연산 배율 및 텍스트/파편 효과 적용
    checkBuildSynergy(type = 'gun') {
        const p = this.player;
        let synergyMultiplier = 1.0;
        let synergyName = "";
        let synergyColor = "#00f0ff";
        
        if (type === 'gun') {
            // 1. [네온 탄막 초토화 폭격기 (Neon Bomber)]
            // 조건: 멀티샷 3발 이상, 유도 추적탄 보유, 스플래시 대폭발 반경 보유
            if (p.multishot >= 3 && p.homing && p.splashRadius > 0) {
                synergyMultiplier = 1.35; // 2차 밸런싱 패치 (1.8 -> 1.35 하향)
                synergyName = "💥 NEON BOMBER!";
                synergyColor = '#ffdf00'; // 황금 옐로우
            }
            // 2. [샷건 전탄 집중 화력 (Shotgun Burst)]
            // 조건: 멀티샷 2발 이상, 힘(ATK) 25 이상 (폭격기 하위 호환)
            else if (p.multishot >= 2 && p.atk >= 25) {
                synergyMultiplier = 1.10; // 2차 밸런싱 패치 (1.2 -> 1.10 하향)
                synergyName = "🏹 SHOTGUN BURST!";
                synergyColor = '#00f0ff'; // 시안
            }
        } else if (type === 'sword') {
            // 3. [질풍의 마력 네온 검사 (Neon Tempest)]
            // 조건: 검 또는 듀얼 소유, 공격속도(지능) 1.6 이상, 힘(공격력) 20 이상
            if ((p.weaponType === 'sword' || p.weaponType === 'dual') && p.aspd >= 1.6 && p.atk >= 20) {
                synergyMultiplier = 1.25; // 2차 밸런싱 패치 (1.5 -> 1.25 하향)
                synergyName = "🪓 NEON TEMPEST!";
                synergyColor = '#b026ff'; // 퍼플
            }
            // 4. [차원 유도 환영검 (Spectral Blade)]
            // 조건: 검 또는 듀얼 소유, 유도 추적 보유
            else if ((p.weaponType === 'sword' || p.weaponType === 'dual') && p.homing) {
                synergyMultiplier = 1.15; // 2차 밸런싱 패치 (1.3 -> 1.15 하향)
                synergyName = "🔮 SPECTRAL BLADE!";
                synergyColor = '#ff0055'; // 마젠타
            }
        }

        // 시너지가 성사되었고 60fps 중 약 1.5% 확률로 전투를 저해하지 않는 팝업 피드백 연출
        if (synergyMultiplier > 1.0 && Math.random() < 0.015) {
            this.showFloatingText(synergyName, p.x, p.y - 30, synergyColor);
            
            // 시너지 발동 오라 네온 파티클
            for (let k = 0; k < 4; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 2 + 1;
                this.particles.push(new Particle(p.x, p.y, synergyColor, 3, Math.cos(angle) * speed, Math.sin(angle) * speed, 25));
            }
        }

        return synergyMultiplier;
    }

    // 화면 진동 함수
    shakeScreen(frames, intensity) {
        this.shakeTimer = frames;
        this.shakeIntensity = intensity;
    }

    // --------------------------------------------------------------------------
    // 8. 60FPS 메인 게임 루프 엔진
    // --------------------------------------------------------------------------
    gameLoop() {
        const currentTime = performance.now();
        let deltaTime = currentTime - this.lastTime;
        
        // 브라우저 백그라운드 탭 전환 등으로 인한 과도한 시간 누적 방지 (최대 100ms 가드)
        if (deltaTime > 100) {
            deltaTime = this.timestep;
        }
        
        this.lastTime = currentTime;
        this.accumulatedTime += deltaTime;

        // 누적 시간이 60FPS 타임스텝보다 크면 그만큼만 update 실행 (고주사율에서도 60FPS 속도 보장)
        while (this.accumulatedTime >= this.timestep) {
            if (this.isPlaying) {
                this.update();
            }
            this.accumulatedTime -= this.timestep;
        }

        // 렌더링은 사용자의 모니터 프레임에 맞춰 매끄럽게 수행
        this.render();

        // 루프 ID를 보관하여 중복 재구동 시 안전하게 캔슬할 수 있도록 바인딩합니다.
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    // 데이터 갱신 및 물리/충돌 검사 총괄
    update() {
        // [신규 추가] 1. 통합 오버레이 일시정지(Freeze) 체크 및 동결 엔진
        let isOverlayOpen = false;
        const rewardOverlay = document.getElementById('reward-overlay');
        const detailOverlay = document.getElementById('card-detail-overlay');
        const shopOverlay = document.getElementById('shop-confirm-overlay');
        const resultOverlay = document.getElementById('result-overlay');
        const startOverlay = document.getElementById('start-overlay');
        const cheatOverlay = document.getElementById('cheat-overlay');
        const optionOverlay = document.getElementById('option-overlay'); // [신규] 시스템 옵션 모달 연동
        const secretShopOverlay = document.getElementById('secret-shop-overlay'); // [결함 수정] 네온 암시장 모달 검증 변수 추가
        
        if ((rewardOverlay && !rewardOverlay.classList.contains('hidden')) ||
            (detailOverlay && !detailOverlay.classList.contains('hidden')) ||
            (shopOverlay && !shopOverlay.classList.contains('hidden')) ||
            (resultOverlay && !resultOverlay.classList.contains('hidden')) ||
            (startOverlay && !startOverlay.classList.contains('hidden')) ||
            (cheatOverlay && !cheatOverlay.classList.contains('hidden')) ||
            (optionOverlay && !optionOverlay.classList.contains('hidden')) ||
            (secretShopOverlay && !secretShopOverlay.classList.contains('hidden'))) { // [결함 수정] 암시장 오버레이 조건식 반영
            isOverlayOpen = true;
        }

        // 레이어 팝업이 활성화되어 있으면 즉시 루프를 리턴 차단하여 물리적인 시간을 완벽하게 얼려버립니다.
        if (isOverlayOpen) {
            return;
        }

        // [신규 기믹] 보상 상자 획득 시 3선택1 카드 보상창 팝업 지연 연출 업데이트
        if (this.rewardSelectorDelayTimer > 0) {
            this.rewardSelectorDelayTimer--;
            if (this.rewardSelectorDelayTimer === 0) {
                this.rewardSelectorDelayTimer = -1;
                this.triggerRewardSelector(this.rewardSelectorIsFromHiddenChest);
            }
        }

        this.player.update();
        if (this.vendingCooldown > 0) this.vendingCooldown--; // [신규 기획] 자판기 구매 쿨타임 매 프레임 감쇠
        if (this.bossWarningTimer > 0) this.bossWarningTimer--; // [v0.95] 보스 경보 타이머 프레임 감소

        // [신규] 프레임 기반 점사/난무 연속 격발 처리 (잔상 사격 버그 박멸 완료)
        if (this.player.burstRemaining > 0 && !isOverlayOpen) {
            this.player.burstIntervalTimer++;
            if (this.player.burstIntervalTimer >= 5) { // 약 0.08초 간격 (5프레임)
                this.player.burstIntervalTimer = 0;
                this.player.burstRemaining--;
                
                if (this.player.burstType === 'gun') {
                    // 총 탄환 팩 격발
                    let isLightning = this.player.weaponType === 'lightning';
                    let isFire = this.player.weaponType === 'fire';
                    let isIce = this.player.weaponType === 'ice';
                    let isDual = this.player.weaponType === 'dual';
                    
                    let synergyMult = this.checkBuildSynergy('gun');
                    let helmDmgBonus = (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) ? 1.25 : 1.0;
                    let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
                    
                    // [2차 밸런스 패치] 멀티샷 및 점사 개수에 따른 대미지 역보정(감쇄) 연동 적용
                    let multishotDmgFactor = Math.max(0.5, 1.0 - (this.player.multishot - 1) * 0.08);
                    let burstDmgFactor = Math.max(0.6, 1.0 - (this.player.burstCount - 1) * 0.05);
                    
                    let finalDamage = this.player.atk * (isLightning ? 0.9 : 1.0) * synergyMult * helmDmgBonus * speedRingDmgBonus * multishotDmgFactor * burstDmgFactor;

                    for (let angle of this.player.burstBulletsToLaunch) {
                        let bulletIsLightning = isLightning;
                        let bulletIsFire = isFire;
                        let bulletIsIce = isIce;
                        if (isDual) {
                            let randType = Math.random();
                            if (randType < 0.25) bulletIsLightning = true;
                            else if (randType < 0.5) bulletIsFire = true;
                            else if (randType < 0.75) bulletIsIce = true;
                        }

                        let speed = bulletIsLightning ? 8.5 : (bulletIsFire ? 6.2 : (bulletIsIce ? 7.5 : 7.0));
                        let vx = Math.cos(angle) * speed;
                        let vy = Math.sin(angle) * speed;
                        let bulletLife = this.player.range / speed;
                        
                        let bulletRadius = bulletIsLightning ? 5.5 : (bulletIsFire ? 7.0 : (bulletIsIce ? 5.0 : 4));
                        if (this.player.equipLevels.gloves >= 5 && !bulletIsLightning && !bulletIsFire && !bulletIsIce) {
                            bulletRadius = 4.8;
                        }
                        
                        this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                            pierce: this.player.pierceCount + (bulletIsIce ? 1 : 0),
                            homing: this.player.homing,
                            homingSpeed: this.player.homingAngleSpeed,
                            splash: this.player.splashRadius + (bulletIsFire ? 30 : 0),
                            color: bulletIsFire ? '#ff5e00' : (bulletIsIce ? '#00f0ff' : (bulletIsLightning ? '#ffdf00' : '#00f0ff')),
                            radius: bulletRadius,
                            life: bulletLife,
                            isLightning: bulletIsLightning,
                            isFire: bulletIsFire,
                            isIce: bulletIsIce,
                            bounceLimit: (!bulletIsLightning && !bulletIsFire && !bulletIsIce) ? this.player.wallBounceLimit : 0,
                            monsterBounceLimit: (!bulletIsLightning && !bulletIsFire && !bulletIsIce) ? this.player.monsterBounceLimit : 0
                        }));
                    }
                    Sound.play('shoot');
                    this.shakeScreen(3, (isLightning || isFire || isIce) ? 1.5 : 1.2);
                } 
                else if (this.player.burstType === 'whip') {
                    // [W-02 채찍(Whip) 점사/난무 연속 격발 처리]
                    let synergyMult = this.checkBuildSynergy('gun');
                    let helmDmgBonus = (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) ? 1.25 : 1.0;
                    let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
                    
                    let multishotDmgFactor = Math.max(0.5, 1.0 - (this.player.multishot - 1) * 0.08);
                    let burstDmgFactor = Math.max(0.6, 1.0 - (this.player.burstCount - 1) * 0.05);
                    
                    let baseDmg = this.player.atk * 0.75;
                    let finalDamage = baseDmg * synergyMult * helmDmgBonus * speedRingDmgBonus * multishotDmgFactor * burstDmgFactor;

                    for (let angle of this.player.burstBulletsToLaunch) {
                        let speed = 9.0;
                        let vx = Math.cos(angle) * speed;
                        let vy = Math.sin(angle) * speed;
                        let bulletLife = 200 / speed; // 그랩 사거리 약 200px
                        
                        this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                            color: '#ff00aa',
                            radius: 6,
                            life: bulletLife,
                            isWhip: true,
                            pierce: this.player.pierceCount,
                            homing: this.player.homing,
                            homingSpeed: this.player.homingAngleSpeed,
                            splash: this.player.splashRadius,
                            bounceLimit: this.player.wallBounceLimit,
                            monsterBounceLimit: this.player.monsterBounceLimit
                        }));
                        
                        // 사슬 네온 조각들
                        for (let i = 0; i < 4; i++) {
                            this.particles.push(new Particle(this.player.x, this.player.y, '#ff00aa', 1.8, vx * 0.5, vy * 0.5, 10, 'dust'));
                        }
                    }
                    Sound.play('slash');
                    this.shakeScreen(4, 1.5);
                }
                else if (this.player.burstType === 'sword' || this.player.burstType === 'spear') {
                    // 검/창 난무 격발
                    let isSpear = this.player.burstType === 'spear';
                    if (isSpear) {
                        let sAngle = this.player.angle;
                        for (let i = 0; i < 6; i++) {
                            let distOffset = i * 8;
                            let px = this.player.x + Math.cos(sAngle) * distOffset;
                            let py = this.player.y + Math.sin(sAngle) * distOffset;
                            let vx = Math.cos(sAngle) * 3;
                            let vy = Math.sin(sAngle) * 3;
                            this.particles.push(new Particle(px, py, '#00f0ff', 1.8, vx, vy, 12, 'dust'));
                        }
                        Sound.play('slash');
                        this.shakeScreen(4, 1.8);
                    } else {
                        this.player.isSlashActive = true;
                        this.player.slashTimer = 12;
                        this.player.slashAngle = this.player.angle;
                        
                        Sound.play('slash');
                        this.shakeScreen(5, 2.5);

                        let sAngle = this.player.angle;
                        for (let i = -5; i <= 5; i++) {
                            let offset = sAngle + (i * 0.15);
                            let px = this.player.x + Math.cos(offset) * 25;
                            let py = this.player.y + Math.sin(offset) * 25;
                            let vx = Math.cos(offset) * 2;
                            let vy = Math.sin(offset) * 2;
                            this.particles.push(new Particle(px, py, '#b026ff', 2, vx, vy, 15, 'slashWave'));
                        }
                    }

                    let synergyMult = this.checkBuildSynergy('sword');
                    let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
                    let baseMult = isSpear ? 1.35 : 1.2;
                    let weaponDmg = this.player.atk * baseMult * synergyMult * this.player.swordDmgUpgrade * speedRingDmgBonus;

                    for (let angle of this.player.burstBulletsToLaunch) {
                        let speed = isSpear ? 10.0 : 6.0;
                        let vx = Math.cos(angle) * speed;
                        let vy = Math.sin(angle) * speed;
                        
                        this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, weaponDmg, true, {
                            pierce: Math.min(5, this.player.pierceCount + (isSpear ? 2 : 1)),
                            homing: this.player.homing,
                            homingSpeed: this.player.homingAngleSpeed,
                            splash: this.player.splashRadius,
                            color: isSpear ? '#00f0ff' : '#b026ff',
                            radius: isSpear ? 6 : 5,
                            isSpear: isSpear
                        }));
                    }
                }
            }
        }

        // [W-10 함정설치 지뢰/레이저 주기적 드롭 및 설치]
        if (this.player.hasTrap && !isOverlayOpen) {
            // 지뢰 설치: 가만히 있지 않고 움직이는 동안 2초(120프레임) 마다 발밑에 매설
            if (!this.player.isStopped) {
                this.mineInstallTimer = (this.mineInstallTimer || 0) + 1;
                if (this.mineInstallTimer >= 120) {
                    this.mineInstallTimer = 0;
                    this.traps.push(new NeonTrap(this.player.x, this.player.y, 'mine', this.player));
                    this.showFloatingText("MINE PLACED! 🪤", this.player.x, this.player.y - 25, '#ffdf00');
                }
            } else {
                this.mineInstallTimer = 0;
            }

            // 레이저 트립와이어 설치: 전투 중이고 몬스터가 있을 때 6초(360프레임) 마다 플레이어 위치 부근에 벽 가로지르도록 매설
            if (this.monsters.length > 0 || this.spawnQueue.length > 0) {
                this.laserInstallTimer = (this.laserInstallTimer || 0) + 1;
                if (this.laserInstallTimer >= 360) {
                    this.laserInstallTimer = 0;
                    
                    let type = Math.random() < 0.5 ? 'laser_h' : 'laser_v';
                    let lx = this.player.x;
                    let ly = this.player.y;
                    
                    // 벽 밖으로 삐져나가는 것 방지
                    lx = Math.max(50, Math.min(750, lx));
                    ly = Math.max(50, Math.min(550, ly));
                    
                    this.traps.push(new NeonTrap(lx, ly, type, this.player));
                    this.showFloatingText("LASER WIRE SET! ⚡", this.player.x, this.player.y - 25, '#00f0ff');
                }
            } else {
                this.laserInstallTimer = 0;
            }
        }

        // 함정 실시간 물리 및 격발 검사 업데이트
        for (let i = this.traps.length - 1; i >= 0; i--) {
            let trap = this.traps[i];
            trap.update(this.monsters, this);
            if (!trap.active) {
                this.traps.splice(i, 1);
            }
        }

        // [E-09 공속 반지 10레벨 속사 초월 트래킹]
        let canShoot = (this.player.weaponType === 'gun' || this.player.weaponType === 'lightning' || this.player.weaponType === 'fire' || this.player.weaponType === 'ice' || this.player.weaponType === 'whip' || this.player.weaponType === 'dual');
        if (this.mouse.isDown && canShoot && !isOverlayOpen) {
            this.player.continuousShootTimer = (this.player.continuousShootTimer || 0) + 1;
            
            // 10레벨 초월 속사 연속 3초(180프레임) 돌파 시 노란 네온 파티클 오버라이드 격발
            if (this.player.equipLevels.ring_aspd === 10 && this.player.continuousShootTimer >= 180) {
                if (Math.random() < 0.35) {
                    this.particles.push(new Particle(
                        this.player.x + (Math.random() * 24 - 12),
                        this.player.y + (Math.random() * 24 - 12),
                        '#ffdf00', 1.8, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 12, 'spark'
                    ));
                }
                if (this.player.continuousShootTimer === 180) {
                    this.showFloatingText("⚡ LIMIT OVER! ⚡", this.player.x, this.player.y - 35, '#ffdf00');
                    Sound.play('victory');
                }
            }
        } else {
            this.player.continuousShootTimer = 0;
        }

        // [추가] 시간 왜곡 마법 가동 시 마력(MP) 소모 및 파티클 기믹 처리
        if (this.timeDilationActive) {
            // 매 프레임 마력 감쇄 (약 6초간 유지: 100 MP / 360 프레임 = 프레임당 약 0.278)
            let mpDrain = 0.278;
            
            // [신규 기획] Mana Ring 10레벨 초월: 시간 왜곡 마나 유지비 50% 절감!
            if (this.player.equipLevels.ring_mp === 10) {
                mpDrain *= 0.5;
            }
            
            // [신규 기획] Mana Helm 5레벨 돌파 무료 시전 적용 시 마나 감쇄 없음!
            if (this.timeWarpFreeCastActive) {
                mpDrain = 0;
            }

            this.player.mp = Math.max(0, this.player.mp - mpDrain);
            
            // 시간 감속 공간에서 뿜어져 나오는 보랏빛 네온 공간 기믹 파티클
            if (Math.random() < 0.2) {
                let angle = Math.random() * Math.PI * 2;
                let radius = Math.random() * 50 + 10;
                let px = this.player.x + Math.cos(angle) * radius;
                let py = this.player.y + Math.sin(angle) * radius;
                this.particles.push(new Particle(
                    px, py, 
                    '#b026ff', 1.5, 
                    -Math.cos(angle) * 0.4, -Math.sin(angle) * 0.4, 20, 'dust'
                ));
            }

            if (this.player.mp <= 0) {
                this.timeDilationActive = false;
                this.timeWarpFreeCastActive = false; // 무료 시전 비활성화
                this.showFloatingText("TIME FLOW RESTORED", this.player.x, this.player.y - 30, '#00f0ff');
                Sound.play('powerup');
            }
        }

        // 펫(공전 드론) 업데이트 루프 실행
        for (let pet of this.pets) {
            pet.update(this.player, this.bullets, this.monsters, this.bullets, this.particles);
        }
        
        // 1. 순차 스폰 실시간 연산
        this.processSpawnQueue();

        // 2. 콤보 타이머 차감
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
            }
        }

        // 3. 플레이어 이동 및 스태미너 가동 연산
        let dx = 0;
        let dy = 0;

        if (!isOverlayOpen && this.player.hp > 0) {
            if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
            if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
            if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
            if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        }

        // 8방향 대각선 이동 시 루트2 정규화 속도 보정 적용
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        // Shift 달리기 가속 및 스태미너 소모 물리 연산
        let currentSpeed = this.player.ms;
        // [E-08 신규 구현] Speed Ring 10레벨 초월: 초신성 기동 50% 폭발적 가속 보정!
        if (this.player.supernovaTimer > 0) {
            currentSpeed *= 1.5;
        }
        const isSprinting = this.keys['shift'] && this.player.stamina > 3 && (dx !== 0 || dy !== 0);

        if (isSprinting) {
            currentSpeed *= 1.6; // 질주 시 60% 가속
            this.player.stamina = Math.max(0, this.player.stamina - 0.75); // 스태미너 고속 소모
            
            // 질주 먼지 파티클
            if (Math.random() < 0.25) {
                let dAngle = this.player.angle + Math.PI + (Math.random() * 0.5 - 0.25);
                this.particles.push(new Particle(
                    this.player.x - Math.cos(this.player.angle) * 8, 
                    this.player.y - Math.sin(this.player.angle) * 8, 
                    'rgba(0, 240, 255, 0.4)', 2, 
                    Math.cos(dAngle) * 0.8, Math.sin(dAngle) * 0.8, 20, 'dust'
                ));
            }
        } else {
            // 서 있거나 그냥 걸을 때 스테미너 속도 점진적 자연 회복
            let staminaRegen = 0.35 + (this.player.aspd * 0.05); // 지능(공격속도) 보상 카드와도 연결
            this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + staminaRegen);
        }

        // 플레이어 캐릭터 위치 이동
        this.player.x += dx * currentSpeed;
        this.player.y += dy * currentSpeed;

        // 맵 벽 경계선 제한 충돌 처리 (정사각형 방 내부 구조 #08090e)
        // 캔버스 크기: 800 * 600, 벽 마진 경계: 40px 두께
        const wallMargin = 40;
        this.player.x = Math.max(wallMargin + this.player.radius, Math.min(800 - wallMargin - this.player.radius, this.player.x));
        this.player.y = Math.max(wallMargin + this.player.radius, Math.min(600 - wallMargin - this.player.radius, this.player.y));

        // 마우스 커서 각도에 맞춰 조준 각도 갱신
        let pMouseAngle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
        this.player.angle = pMouseAngle;

        // [5-3단계] 플레이어와 격자 장애물 지형 충돌 처리 (슬라이딩 물리)
        // 25등분 격자에 생성된 네온 장벽들과 충돌했을 때 자연스럽게 미끄러지도록 슬라이딩 물리 판정을 가합니다.
        for (let obs of this.obstacles) {
            let distX = this.player.x - obs.x;
            let distY = this.player.y - obs.y;
            
            // NeonObstacle 크기(width: 80, height: 65)와 플레이어 반경(radius)을 고려한 한계 겹침 거리 계산
            let minXDist = (obs.width / 2) + this.player.radius - 2;
            let minYDist = (obs.height / 2) + this.player.radius - 2;
            
            if (Math.abs(distX) < minXDist && Math.abs(distY) < minYDist) {
                // 겹친 정도(overlap)를 계산하여 덜 겹친 축 방향으로 비껴내기
                let overlapX = minXDist - Math.abs(distX);
                let overlapY = minYDist - Math.abs(distY);
                
                if (overlapX < overlapY) {
                    this.player.x += distX > 0 ? overlapX : -overlapX;
                } else {
                    this.player.y += distY > 0 ? overlapY : -overlapY;
                }
            }
        }

        // [Phase 7 신규 구현] 플레이어와 비밀 균열 벽 지형 충돌 처리 (슬라이딩 물리)
        for (let wall of this.secretWalls) {
            let distX = this.player.x - wall.x;
            let distY = this.player.y - wall.y;
            
            let minXDist = (wall.width / 2) + this.player.radius - 2;
            let minYDist = (wall.height / 2) + this.player.radius - 2;
            
            if (Math.abs(distX) < minXDist && Math.abs(distY) < minYDist) {
                let overlapX = minXDist - Math.abs(distX);
                let overlapY = minYDist - Math.abs(distY);
                
                if (overlapX < overlapY) {
                    this.player.x += distX > 0 ? overlapX : -overlapX;
                } else {
                    this.player.y += distY > 0 ? overlapY : -overlapY;
                }
            }
        }

        // [Phase 7 신규 구현] 비밀 벽 무적 타이머 프레임 감쇠
        for (let wall of this.secretWalls) {
            if (wall.hitCooldown > 0) wall.hitCooldown--;
        }

        // [추가] 플레이어가 현재 이동 키를 누르지 않고 가만히 서 있는지 감지
        this.player.isStopped = (dx === 0 && dy === 0);

        if (this.mouse.isDown && this.player.hp > 0 && this.player.shootCooldown <= 0 && (this.player.weaponType === 'gun' || this.player.weaponType === 'lightning' || this.player.weaponType === 'fire' || this.player.weaponType === 'ice' || this.player.weaponType === 'whip' || this.player.weaponType === 'dual')) {
            this.shootWeapon();
        }
        if (this.mouse.isDown && this.player.hp > 0 && this.player.slashCooldown <= 0 && (this.player.weaponType === 'sword' || this.player.weaponType === 'spear' || this.player.weaponType === 'dual')) {
            this.slashWeapon();
        }

        // [성능 최적화] 화면 내 동시 활성 플레이어 탄환 수 하드 캡(Max 200) 제한
        let playerBullets = this.bullets.filter(b => b.isPlayerBullet);
        if (playerBullets.length > 200) {
            let overflow = playerBullets.length - 200;
            // 배열 앞쪽(가장 오래된 탄환)부터 강제 소멸시킴
            for (let k = 0; k < this.bullets.length && overflow > 0; k++) {
                if (this.bullets[k].isPlayerBullet) {
                    this.bullets.splice(k, 1);
                    k--;
                    overflow--;
                }
            }
        }

        // 5. 탄환 물리 비행 및 유도 연산
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.update(this.monsters);

            // [W-04 검 탄막 절단 기믹]
            if (!b.isPlayerBullet && this.player.isSlashActive) {
                let swordDist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
                if (swordDist < this.player.slashRadius + b.radius) {
                    let targetAngle = Math.atan2(b.y - this.player.y, b.x - this.player.x);
                    let angleDiff = Math.abs(targetAngle - this.player.slashAngle);
                    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                    
                    if (Math.abs(angleDiff) < 1.1) {
                        Sound.play('dodge'); // 튕김 금속 틱음
                        for (let k = 0; k < 4; k++) {
                            let randAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            this.particles.push(new Particle(b.x, b.y, '#b026ff', 1.5, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'));
                        }
                        this.showFloatingText("CUT! ⚔️", b.x, b.y - 15, '#b026ff');
                        this.bullets.splice(i, 1);
                        continue; // 탄환 소멸되었으므로 이후 로직 스킵
                    }
                }
            }

            // [Phase 7 신규 구현] 모든 플레이어 탄환 투사체와 비밀 벽 충돌 검출 (isSpear 한정 버그 수정 완료)
            if (b.isPlayerBullet) {
                for (let j = this.secretWalls.length - 1; j >= 0; j--) {
                    let wall = this.secretWalls[j];
                    let wDist = Math.hypot(wall.x - b.x, wall.y - b.y);
                    if (wDist < 25 + b.radius) { // 바뀐 얇은 벽 형상에 맞춘 기하 충돌 반경 보정
                        if (!wall.hitCooldown) {
                            wall.hitCooldown = 12;
                            wall.hp--;
                            wall.hitCount++;
                            wall.flashTimer = 5;
                            Sound.play('hit');
                            
                            for (let k = 0; k < 4; k++) {
                                let randAngle = Math.random() * Math.PI * 2;
                                let pSpeed = Math.random() * 2 + 1;
                                this.particles.push(new Particle(b.x, b.y, wall.glowColor, 1.5, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'));
                            }
                            
                            // 3회 적중 시 최초 지지직 글리치 오라 개막
                            if (wall.hitCount === 3) {
                                this.showFloatingText(`⚠️ GLITCH DETECTED! 🔮`, wall.x, wall.y - 20, '#b026ff');
                                Sound.play('powerup');
                            } else {
                                this.showFloatingText(`CRACK! 🔨`, wall.x, wall.y - 15, '#b026ff');
                            }
                            
                            this.bullets.splice(i, 1);
                            
                            if (wall.hp <= 0) {
                                Sound.play('explosion');
                                this.shakeScreen(10, 4.5);
                                for (let k = 0; k < 15; k++) {
                                    let randAngle = Math.random() * Math.PI * 2;
                                    let pSpeed = Math.random() * 4 + 1.5;
                                    this.particles.push(new Particle(wall.x, wall.y, '#b026ff', 2.2, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 25, 'spark'));
                                    this.particles.push(new Particle(wall.x, wall.y, '#333333', 1.8, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 15, 'dust'));
                                }
                                this.showFloatingText("GLITCH WALL BROKEN! 💥", wall.x, wall.y - 20, '#b026ff');
                                
                                // 맵 중앙 가용 영역 내 장애물들과 겹치지 않는 안전한 랜덤 좌표 추출
                                let cx = 400, cy = 300;
                                let foundSafe = false;
                                for (let attempt = 0; attempt < 50; attempt++) {
                                    let rx = 100 + Math.random() * 600;
                                    let ry = 100 + Math.random() * 400;
                                    let distToPlayer = Math.hypot(this.player.x - rx, this.player.y - ry);
                                    if (distToPlayer < 100) continue;
                                    
                                    let distToObs = true;
                                    for (let obs of this.obstacles) {
                                        if (Math.hypot(rx - obs.x, ry - obs.y) < 70) {
                                            distToObs = false;
                                            break;
                                        }
                                    }
                                    if (distToObs) {
                                        cx = rx;
                                        cy = ry;
                                        foundSafe = true;
                                        break;
                                    }
                                }
                                
                                // 비밀방 포털 100% 소환
                                let secretPortal = new RoomPortal('secret', 0, cx, cy);
                                secretPortal.difficultyClass = 'high'; // 에픽 보증 등급 부여
                                this.portals.push(secretPortal);
                                this.showFloatingText("🔮 DIMENSIONAL PORTAL OPENED!", cx, cy - 35, '#b026ff');
                                
                                // 포털 소환 보랏빛 차원 파편 솟구침 연출
                                for (let k2 = 0; k2 < 20; k2++) {
                                    let pAngle2 = Math.random() * Math.PI * 2;
                                    let pSpeed2 = Math.random() * 3.5 + 2;
                                    this.particles.push(new Particle(cx, cy, '#b026ff', 2.2, Math.cos(pAngle2) * pSpeed2, Math.sin(pAngle2) * pSpeed2, 28, 'spark'));
                                }
                                
                                this.secretWalls.splice(j, 1);
                            }
                            break;
                        }
                    }
                }
            }
            
            // 화면 밖으로 나가거나 수명이 다하거나 비활성화(소멸 예약)되면 소멸
            if (!b.active || b.x < 35 || b.x > 765 || b.y < 35 || b.y > 565 || b.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }

        // [W-08 시간 왜곡 마법의 석상화 기믹]
        if (this.timeDilationActive) {
            for (let m of this.monsters) {
                // 매 프레임 1% 확률로 몬스터 시간 완전 정지 (2초=120프레임 기절)
                if (Math.random() < 0.01) {
                    m.statusEffects.shock = Math.max(m.statusEffects.shock || 0, 120);
                    this.showFloatingText("TIME STOPPED! ⏳", m.x, m.y - 25, '#b026ff');
                    
                    // 정지 시 은은한 보라 파티클
                    for (let k = 0; k < 3; k++) {
                        this.particles.push(new Particle(m.x, m.y, '#b026ff', 2, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, 15, 'spark'));
                    }
                }
            }
        }

        // 6. 몬스터 거동 및 충돌 판정
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            if (!m || m.dead) continue; // [신규] 사망했거나 존재하지 않는 몬스터 즉시 제외
            
            // 몬스터끼리 과하게 뭉치는 현상 해결 (겹침 방지 Separation 물리 연산 추가)
            for (let j = i - 1; j >= 0; j--) {
                let other = this.monsters[j];
                if (!other || other.dead) continue; // [신규] 사망한 다른 몬스터와는 겹침 방지 연산 건너뜀
                let mDist = Math.hypot(other.x - m.x, other.y - m.y);
                let minDist = m.radius + other.radius;
                if (mDist < minDist) {
                    // 서로 겹쳤을 때 바깥으로 밀어내기 각도 연산
                    let pushAngle = Math.atan2(m.y - other.y, m.x - other.x);
                    let overlap = minDist - mDist;
                    // 아주 부드럽게 양방향으로 25%씩 밀어내어 골고루 펼쳐지게 격리
                    let pushForce = overlap * 0.25; 
                    
                    m.x += Math.cos(pushAngle) * pushForce;
                    m.y += Math.sin(pushAngle) * pushForce;
                    other.x -= Math.cos(pushAngle) * pushForce;
                    other.y -= Math.sin(pushAngle) * pushForce;
                }
            }
            
            m.update(this.player, this.bullets);

            // [5-3단계] 몬스터와 격자 장애물 지형 충돌 처리 (슬라이딩 물리)
            // 격자 내에 배치된 자홍색 홀로그램 장벽들과 몬스터 간의 충돌 판정을 계산하여 미끄러지도록 처리합니다.
            for (let obs of this.obstacles) {
                let distX = m.x - obs.x;
                let distY = m.y - obs.y;
                
                let minXDist = (obs.width / 2) + m.radius - 2;
                let minYDist = (obs.height / 2) + m.radius - 2;
                
                if (Math.abs(distX) < minXDist && Math.abs(distY) < minYDist) {
                    let overlapX = minXDist - Math.abs(distX);
                    let overlapY = minYDist - Math.abs(distY);
                    
                    if (overlapX < overlapY) {
                        m.x += distX > 0 ? overlapX : -overlapX;
                    } else {
                        m.y += distY > 0 ? overlapY : -overlapY;
                    }
                }
            }

            // [충돌 검사 A] 몬스터 본체와 플레이어 캐릭터 본체의 격돌
            let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (dist < m.radius + this.player.radius) {
                this.damagePlayer(m.atk, m.x, m.y);
                
                // 몬스터는 플레이어에게 밀려남 (충돌 반발력)
                let repAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                m.knockbackX = Math.cos(repAngle) * 3;
                m.knockbackY = Math.sin(repAngle) * 3;
            }

            // [충돌 검사 B] 플레이어의 검 휘두르기 히트 박스 판정 (근접 베기)
            if (this.player.isSlashActive) {
                // [Phase 7 신규 구현] 비밀 벽 검풍 베기 충돌 검출
                for (let j = this.secretWalls.length - 1; j >= 0; j--) {
                    let wall = this.secretWalls[j];
                    let wDist = Math.hypot(wall.x - this.player.x, wall.y - this.player.y);
                    if (wDist < this.player.slashRadius + 25) { // 바뀐 벽 모양을 감안하여 리치 소폭 확장 보정
                        let targetAngle = Math.atan2(wall.y - this.player.y, wall.x - this.player.x);
                        let angleDiff = Math.abs(targetAngle - this.player.slashAngle);
                        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                        
                        if (Math.abs(angleDiff) < 1.1) {
                            if (!wall.hitCooldown) {
                                wall.hitCooldown = 12;
                                wall.hp--;
                                wall.hitCount++;
                                wall.flashTimer = 5;
                                Sound.play('hit');
                                
                                for (let k = 0; k < 4; k++) {
                                    let randAngle = Math.random() * Math.PI * 2;
                                    let pSpeed = Math.random() * 2 + 1;
                                    this.particles.push(new Particle(wall.x, wall.y, wall.glowColor, 1.5, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'));
                                }
                                
                                // 3회 적중 시 최초 지지직 글리치 오라 개막
                                if (wall.hitCount === 3) {
                                    this.showFloatingText(`⚠️ GLITCH DETECTED! 🔮`, wall.x, wall.y - 20, '#b026ff');
                                    Sound.play('powerup');
                                } else {
                                    this.showFloatingText(`CRACK! 🔨`, wall.x, wall.y - 15, '#b026ff');
                                }
                                
                                if (wall.hp <= 0) {
                                    Sound.play('explosion');
                                    this.shakeScreen(10, 4.5);
                                    for (let k = 0; k < 15; k++) {
                                        let randAngle = Math.random() * Math.PI * 2;
                                        let pSpeed = Math.random() * 4 + 1.5;
                                        this.particles.push(new Particle(wall.x, wall.y, '#b026ff', 2.2, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 25, 'spark'));
                                        this.particles.push(new Particle(wall.x, wall.y, '#333333', 1.8, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 15, 'dust'));
                                    }
                                    this.showFloatingText("GLITCH WALL BROKEN! 💥", wall.x, wall.y - 20, '#b026ff');
                                    
                                    // 맵 중앙 가용 영역 내 장애물들과 겹치지 않는 안전한 랜덤 좌표 추출
                                    let cx = 400, cy = 300;
                                    let foundSafe = false;
                                    for (let attempt = 0; attempt < 50; attempt++) {
                                        let rx = 100 + Math.random() * 600;
                                        let ry = 100 + Math.random() * 400;
                                        let distToPlayer = Math.hypot(this.player.x - rx, this.player.y - ry);
                                        if (distToPlayer < 100) continue;
                                        
                                        let distToObs = true;
                                        for (let obs of this.obstacles) {
                                            if (Math.hypot(rx - obs.x, ry - obs.y) < 70) {
                                                distToObs = false;
                                                break;
                                            }
                                        }
                                        if (distToObs) {
                                            cx = rx;
                                            cy = ry;
                                            foundSafe = true;
                                            break;
                                        }
                                    }
                                    
                                    // 비밀방 포털 100% 소환
                                    let secretPortal = new RoomPortal('secret', 0, cx, cy);
                                    secretPortal.difficultyClass = 'high'; // 에픽 보증 등급 부여
                                    this.portals.push(secretPortal);
                                    this.showFloatingText("🔮 DIMENSIONAL PORTAL OPENED!", cx, cy - 35, '#b026ff');
                                    
                                    // 포털 소환 보랏빛 차원 파편 솟구침 연출
                                    for (let k2 = 0; k2 < 20; k2++) {
                                        let pAngle2 = Math.random() * Math.PI * 2;
                                        let pSpeed2 = Math.random() * 3.5 + 2;
                                        this.particles.push(new Particle(cx, cy, '#b026ff', 2.2, Math.cos(pAngle2) * pSpeed2, Math.sin(pAngle2) * pSpeed2, 28, 'spark'));
                                    }
                                    
                                    this.secretWalls.splice(j, 1);
                                }
                            }
                        }
                    }
                }



                let swordDist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                if (swordDist < this.player.slashRadius + m.radius) {
                    // 회전 검기 범위 내의 부채꼴 각도 검사
                    let targetAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                    let angleDiff = Math.abs(targetAngle - this.player.slashAngle);
                    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                    // 넓은 근접 110도 스윕 타격 범위
                    if (Math.abs(angleDiff) < 1.1) {
                        // [모델 C] 칼 베기 시너지 곱연산 대미지 배율 적용
                        let synergyMult = this.checkBuildSynergy('sword');
                        
                        // 검 베기 디버프 부여 (vulnerability: 4초간 25% 데미지 증폭)
                        m.statusEffects.vulnerability = 240;

                        // [신규 기획] Mana Helm 10레벨 초월: 마나가 100% 가득 찬 상태일 때 근접 공격 뎀증 25% 가산!
                        let helmDmgBonus = 1.0;
                        if (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) {
                            helmDmgBonus = 1.25;
                        }

                        let finalDmg = this.player.atk * 1.5 * synergyMult * helmDmgBonus;
                        if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;

                        // [신규] 근접 검 베기 물리 타격 시 동결(Frozen) 3배 파쇄 치명타 콤보 판정
                        let hasShattered = false;
                        if (m.isFrozenActive > 0) {
                            if (Math.random() < 0.3) {
                                finalDmg *= 3.0; // 3배 피해 폭증
                                hasShattered = true;
                                m.isFrozenActive = 0;
                                m.statusEffects.shock = 0;
                            }
                        }

                        m.hp -= finalDmg; // 칼은 50% 강력한 계수 피해
                        m.flashTimer = 5;
                        m.knockbackX = Math.cos(targetAngle) * 6; // 대폭 넉백
                        m.knockbackY = Math.sin(targetAngle) * 6;

                        if (hasShattered) {
                            this.showFloatingText("❄️ FREEZE SHATTER! 300% DMG", m.x, m.y - 35, '#00f0ff');
                            this.shakeScreen(12, 5.0);
                            Sound.play('explosion');
                            
                            // 은백색 파쇄 스파크 얼음 파편
                            for (let k = 0; k < 12; k++) {
                                let angle = Math.random() * Math.PI * 2;
                                let speed = Math.random() * 4 + 2;
                                this.particles.push(new Particle(m.x, m.y, '#ffffff', 2.5, Math.cos(angle) * speed, Math.sin(angle) * speed, 20, 'spark'));
                            }
                        }
                        
                        // [신규 기획] Reach Gloves 10레벨 초월: 근접 타격 시 전방 충격파 방출!
                        if (this.player.equipLevels.gloves === 10) {
                            if (!m.hasShockwaveTriggeredThisFrame) {
                                m.hasShockwaveTriggeredThisFrame = true;
                                setTimeout(() => { m.hasShockwaveTriggeredThisFrame = false; }, 200); // 0.2초 쿨다운
                                
                                this.triggerBulletSplash(m.x, m.y, 65, this.player.atk * 0.40 * helmDmgBonus);
                                this.showFloatingText("SHOCKWAVE!", m.x, m.y - 30, '#ffdf00');
                            }
                        }
                        
                        // [Spectral Blade 시너지: 검 베기 타격 시 25% 확률로 유도탄 1발 추가 사출]
                        if (synergyMult >= 1.3 && Math.random() < 0.25) {
                            let bAngle = Math.random() * Math.PI * 2;
                            this.bullets.push(new Bullet(m.x, m.y, Math.cos(bAngle)*5, Math.sin(bAngle)*5, this.player.atk * 0.5, true, {
                                homing: true,
                                color: '#ff0055',
                                radius: 3
                            }));
                        }

                        // 검 타격 보라색 스파크 파티클
                        for (let k = 0; k < 4; k++) {
                            let speed = Math.random() * 4 + 2;
                            this.particles.push(new Particle(m.x, m.y, '#b026ff', 2.5, Math.cos(targetAngle + Math.random() - 0.5) * speed, Math.sin(targetAngle + Math.random() - 0.5) * speed, 20));
                        }
                         // 몬스터 처사 체크
                        if (m.hp <= 0) {
                            this.killMonster(m, i);
                            continue; // 이미 사망 처리되어 몬스터 루프 탈출
                        }
                    }
                }
            }

            // [충돌 검사 C] 탄환 물리 충돌
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                let b = this.bullets[j];
                
                // 플레이어 탄환 -> 몬스터 타격
                if (b.isPlayerBullet) {
                    let bDist = Math.hypot(m.x - b.x, m.y - b.y);
                    if (bDist < m.radius + b.radius) {
                        
                        // [W-02 채찍(Whip) 견인 및 그랩 물리 로직]
                        if (b.isWhip) {
                            let pullAngle = this.player.angle;
                            let pullX = this.player.x + Math.cos(pullAngle) * 35;
                            let pullY = this.player.y + Math.sin(pullAngle) * 35;
                            
                            m.x = pullX;
                            m.y = pullY;
                            
                            // 맵 마진 이탈 방지 가두기
                            const wallMargin = 40;
                            m.x = Math.max(wallMargin + m.radius, Math.min(800 - wallMargin - m.radius, m.x));
                            m.y = Math.max(wallMargin + m.radius, Math.min(600 - wallMargin - m.radius, m.y));
                            
                            // 1.5초 기절(90프레임) 및 백색 플래시
                            m.statusEffects.shock = 90;
                            m.flashTimer = 8;
                            
                            // 3초간 공속 +20% 상승 (최대 3중첩) 연계 버프
                            this.player.whipSpeedStack = Math.min(3, (this.player.whipSpeedStack || 0) + 1);
                            this.player.whipSpeedTimer = 180; // 180프레임 = 3초
                            
                            this.showFloatingText(`GRAB PULL! ⛓️ HASTE [${this.player.whipSpeedStack}/3]`, this.player.x, this.player.y - 30, '#ff00aa');
                            Sound.play('dodge');
                            
                            // 사슬 폭발 조각들
                            for (let k = 0; k < 8; k++) {
                                let angle = Math.random() * Math.PI * 2;
                                let speed = Math.random() * 4 + 2;
                                this.particles.push(new Particle(m.x, m.y, '#ff00aa', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15, 'spark'));
                            }
                            
                            // 사슬 투사체 소멸
                            this.bullets.splice(j, 1);
                            
                            // 데미지 가함
                            m.hp -= b.damage;
                            if (m.hp <= 0) {
                                this.killMonster(m, i);
                            }
                            break; // 몬스터가 사망했거나 탄환이 소멸했으므로 충돌체크 루프 탈출
                        }

                        // [신규] 원소 탄환 성격별 디버프 부여
                        if (b.isFire) {
                            m.statusEffects.burn = 240; // 4초 지속 화상
                            m.statusEffects.burnStack = Math.min(5, (m.statusEffects.burnStack || 0) + 1); // 화상 1중첩 가산
                        } else if (b.isIce) {
                            m.statusEffects.freeze = Math.min(100, (m.statusEffects.freeze || 0) + 25); // 빙결 축적율 +25%
                        } else {
                            if (b.splash > 0) {
                                m.statusEffects.shock = 60; // 기절 1초
                            } else {
                                m.statusEffects.slow = 180; // 감속 3초
                            }
                        }

                        // 데미지 계산 및 백색 깜빡임 피드백 (취약 데미지 증폭)
                        let finalDmg = b.damage;
                        let isSpearTip = false;
                        if (b.isSpear) {
                            let flightDist = Math.hypot(b.x - b.startX, b.y - b.startY);
                            // 사거리의 80% 이상에서 조준 찌르기 타격 시 2배 크리티컬
                            if (flightDist >= this.player.range * 0.80) {
                                finalDmg *= 2.0;
                                isSpearTip = true;
                            }
                        }

                        if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;

                        // [신규] 얼음 동결 완전 정지 상태 시 물리 무기 피격 콤보 판정 (3배 파쇄 피해)
                        let hasShattered = false;
                        if (m.isFrozenActive > 0 && !b.isLightning) {
                            if (Math.random() < 0.3) {
                                finalDmg *= 3.0; // 300% 피해 폭증
                                hasShattered = true;
                                m.isFrozenActive = 0;
                                m.statusEffects.shock = 0;
                            }
                        }

                        m.hp -= finalDmg;
                        m.flashTimer = 5;

                        if (hasShattered) {
                            this.showFloatingText("❄️ FREEZE SHATTER! 300% DMG", m.x, m.y - 35, '#00f0ff');
                            this.shakeScreen(12, 5.0);
                            Sound.play('explosion');
                            
                            // 은백색 파쇄 스파크 파편 사출
                            for (let k = 0; k < 12; k++) {
                                let angle = Math.random() * Math.PI * 2;
                                let speed = Math.random() * 4 + 2;
                                this.particles.push(new Particle(m.x, m.y, '#ffffff', 2.5, Math.cos(angle) * speed, Math.sin(angle) * speed, 20, 'spark'));
                            }
                        }

                        // [W-07 신규 구현] 번개 마법 탄환인 경우 체인 라이트닝(연쇄 벼락) 전이 발동
                        if (b.isLightning) {
                            this.triggerChainLightning(b.x, b.y, m, 4, b.damage * 0.85); // 4회 전이, 85% 감쇄 대미지
                        }
                        
                        // 넉백 발생 (창은 벽꽝을 유도하기 위해 강력한 넉백 7.5 가동)
                        let hitAngle = Math.atan2(m.y - b.y, m.x - b.x);
                        let kbForce = b.isSpear ? 7.5 : 2.0;
                        m.knockbackX = Math.cos(hitAngle) * kbForce;
                        m.knockbackY = Math.sin(hitAngle) * kbForce;

                        if (isSpearTip) {
                            this.showFloatingText("⚡ SPEAR-TIP CRITICAL! ⚡", m.x, m.y - 35, '#00f0ff');
                            this.shakeScreen(8, 3.8);
                        }

                        Sound.play('hit');

                        // 스플래시 범위 폭발 카드 속성 연산 (스플래시 대미지 강화 업그레이드 배율 연동)
                        if (b.splash > 0) {
                            this.triggerBulletSplash(b.x, b.y, b.splash, b.damage * this.player.splashDmgUpgrade);
                        }

                        // 스파크 파티클 생성
                        for (let k = 0; k < 5; k++) {
                            let speed = Math.random() * 3 + 1;
                            this.particles.push(new Particle(b.x, b.y, b.color, 2, Math.cos(hitAngle + Math.random() - 0.5) * speed, Math.sin(hitAngle + Math.random() - 0.5) * speed, 15));
                        }

                        // 관통 횟수 차감 및 소멸
                        if (b.pierce > 0) {
                            b.pierce--;
                        } else if (b.monsterBounceLimit > 0 && b.monsterBounceCount < b.monsterBounceLimit) {
                            b.monsterBounceCount++;
                            
                            // 주변의 다른 유효 몬스터 탐색 (방금 명중한 몬스터 제외)
                            let nextMonster = null;
                            let minDist = Infinity;
                            for (let otherM of this.monsters) {
                                if (otherM === m || otherM.hp <= 0) continue;
                                let distToOther = Math.hypot(otherM.x - b.x, otherM.y - b.y);
                                if (distToOther < minDist && distToOther < 250) {
                                    minDist = distToOther;
                                    nextMonster = otherM;
                                }
                            }
                            
                            if (nextMonster) {
                                let speed = Math.hypot(b.vx, b.vy);
                                let bounceAngle = Math.atan2(nextMonster.y - b.y, nextMonster.x - b.x);
                                b.vx = Math.cos(bounceAngle) * speed;
                                b.vy = Math.sin(bounceAngle) * speed;
                                
                                // 도탄 피드백 시각 효과음 연출
                                this.showFloatingText("M-BOUNCE! 💥", b.x, b.y - 15, '#ff00aa');
                                Sound.play('hit');
                                
                                // 날아갈 수 있도록 탄 수명 연장
                                b.life = Math.max(b.life, this.player.range / speed * 0.6) + 12;
                            } else {
                                this.bullets.splice(j, 1);
                            }
                        } else {
                            this.bullets.splice(j, 1);
                        }

                        // 몬스터 사망 시 정산
                        if (m.hp <= 0) {
                            this.killMonster(m, i);
                            break; // 몬스터가 이미 삭제되었으므로 탄환 히트 체크 루프 탈출
                        }
                    }
                } 
                // 몬스터 탄환 -> 플레이어 피격
                else {
                    let bDist = Math.hypot(this.player.x - b.x, this.player.y - b.y);
                    if (bDist < this.player.radius + b.radius) {
                        this.damagePlayer(b.damage, b.x, b.y);
                        this.bullets.splice(j, 1);
                    }
                }
            }
        }

        // 7. 파티클 이펙트 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 8. 4개 문(포털) 진입 체크 및 보상 시스템 연동
        if (this.monsters.length === 0 && this.spawnQueue.length === 0) {
            // 모든 적 소탕 시점에 보상 스폰 (안전실인 1방 초기 시작 상태는 제외, 비밀방 제외)
            if ((this.roomNum > 1 || this.kills > 0) && !this.inSecretRoom) {
                // 아직 보상 오브젝트가 생성되지 않은 상태일 때 (방금 몬스터 격퇴 완료된 시점)
                if (!this.roomRewardSpawned && this.rewardChests.length === 0 && this.vendingMachines.length === 0 && this.portals.length > 0 && !this.portals[0].active) {
                    this.roomRewardSpawned = true; // [버그 수정] 단 1회 보상 스폰 즉시 잠금
                    
                    // A. 코인 정산 연산 (수정 2: 퍼펙트 보상 30% 하향 적용)
                    let baseCoins = this.currentSpawnTotal * 2;
                    let bonusCoins = 0;
                    if (this.player.perfectClearFlag) {
                        bonusCoins = Math.floor(baseCoins * 0.3); // 30% 보너스
                    }
                    let totalGained = baseCoins + bonusCoins;
                    // [W-08 신규 구현] 방 클리어 코인은 방 중앙(400, 300)에 통통 떨어져 플레이어에게 우수수 자석 흡입되게 함
                    for (let k = 0; k < totalGained; k++) {
                        this.coinsList.push(new NeonCoin(400, 300, 1));
                    }

                    // [수정] 결함 4: 상단 코인 영역 얼마+얼마 표기 및 시각적 맥동 이펙트 작렬!
                    const coinCounter = document.getElementById('coin-counter');
                    const coinGainPopup = document.getElementById('coin-gain-popup');
                    const coinHudItem = coinCounter ? coinCounter.parentElement : null; // .hud-item

                    if (coinGainPopup) {
                        coinGainPopup.innerText = `+${totalGained}`;
                        coinGainPopup.style.color = '#ffdf00';
                        coinGainPopup.style.textShadow = '0 0 10px rgba(255, 223, 0, 0.8)';
                        coinGainPopup.classList.remove('hidden');
                        coinGainPopup.classList.remove('animate');
                        // 리플로우 유도
                        void coinGainPopup.offsetWidth;
                        coinGainPopup.classList.add('animate');
                        
                        // [신규] 팝업 애니메이션 1회성 마비 해결 클린업 타이머 탑재
                        if (coinGainPopup.cleanupTimer) clearTimeout(coinGainPopup.cleanupTimer);
                        coinGainPopup.cleanupTimer = setTimeout(() => {
                            coinGainPopup.classList.remove('animate');
                            coinGainPopup.classList.add('hidden');
                            coinGainPopup.innerText = '';
                        }, 1000);
                    }

                    if (coinHudItem) {
                        coinHudItem.classList.remove('pulse');
                        void coinHudItem.offsetWidth;
                        coinHudItem.classList.add('pulse');
                        setTimeout(() => {
                            coinHudItem.classList.remove('pulse');
                        }, 500);
                    }
                    
                    // B. 안내 연출 최소화 (수정 1: 매번 뜨는 큰 팝업 피로도 방지를 위해 간결한 플로팅 텍스트 처리)
                    if (this.player.perfectClearFlag) {
                        this.showFloatingText(`+${totalGained} COINS (Perfect!)`, this.player.x, this.player.y - 30, '#ffdf00');
                        Sound.play('coin');
                    } else {
                        this.showFloatingText(`+${totalGained} COINS`, this.player.x, this.player.y - 30, '#ffdf00');
                        Sound.play('coin');
                    }

                    // C. 방 테마에 따른 보상 물리 스폰
                    if (this.currentRoomType === 'shop') {
                        // 자판기 타입 랜덤 배정 (스탯 60%, 무기 20%, 방어구 20%)
                        let shopRand = Math.random();
                        let machineType = 'stat';
                        if (shopRand > 0.8) {
                            machineType = 'equipment';
                        } else if (shopRand > 0.6) {
                            machineType = 'weapon';
                        }
                        
                        this.vendingMachines.push(new VendingMachine(400, 300, machineType));
                        this.showFloatingText("VENDING MACHINE ARRIVED!", 400, 240, '#ffdf00');
                        
                        // 상점방은 힐링을 위해 네온 물약 확정 1개 추가 드롭
                        this.potions.push(new NeonPotion(400, 370));
                        
                        // 상점방은 구매 의사 결정을 대기하지 않고 즉시 문을 개방해 둡니다. (돈이 없는 유저 탈출용)
                        this.portals.forEach(p => p.active = true);
                    } else {
                        // 스탯, 무기, 방어구 중 해당 타입의 보상 상자 스폰
                        this.rewardChests.push(new RewardChest(400, 300, this.currentRoomType));
                        this.showFloatingText("REWARD CHEST ARRIVED!", 400, 240, this.currentRoomType === 'stat' ? '#00f0ff' : (this.currentRoomType === 'weapon' ? '#b026ff' : '#ff6c00'));
                    }

                    // [신규 기획] 상자/자판기 스폰 시 화려한 네온 글로우 파티클 분수 격발 (30개)
                    let spawnColor = this.currentRoomType === 'stat' ? '#00f0ff' : (this.currentRoomType === 'weapon' ? '#b026ff' : (this.currentRoomType === 'equipment' ? '#ff6c00' : '#ffdf00'));
                    for (let k = 0; k < 30; k++) {
                        let pAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5; // 하늘 위 방향 부채꼴 분수
                        let pSpeed = Math.random() * 5 + 2.5;
                        this.particles.push(new Particle(400, 300, spawnColor, 2.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 35, 'spark'));
                    }
                }
            } else {
                // 1방 시작 안전실일 경우 즉시 개방
                if (this.portals.length > 0 && !this.portals[0].active) {
                    this.portals.forEach(p => p.active = true);
                }
            }

            // 개방된 문으로 플레이어가 충돌했는지 검사
            for (let p of this.portals) {
                if (p.checkCollision(this.player)) {
                    this.transitionToNextRoom(p);
                    break;
                }
            }
        }

        // [신규 기획] 비밀방 상호작용 디바이스(SecretGlitchDevice) 물리 충돌 감지 및 상호작용 트리거
        for (let i = this.secretGlitchDevices.length - 1; i >= 0; i--) {
            let device = this.secretGlitchDevices[i];
            if (!device.active) continue;
            let dist = Math.hypot(this.player.x - device.x, this.player.y - device.y);
            if (dist < this.player.radius + device.radius) {
                device.active = false;
                this.triggerSecretGlitchReward(device);
                this.secretGlitchDevices.splice(i, 1);
            }
        }

        // [신규 기획] 보상 상자(Reward Chest) 물리 충돌 검사
        for (let i = this.rewardChests.length - 1; i >= 0; i--) {
            let chest = this.rewardChests[i];
            if (!chest.active) continue;
            let dist = Math.hypot(this.player.x - chest.x, this.player.y - chest.y);
            if (dist < this.player.radius + 18) { // 상자 가로폭 충돌 반경 보정
                chest.active = false;
                
                // 네온 파편 스파크 폭발 이펙트
                for (let k = 0; k < 25; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 5 + 2;
                    this.particles.push(new Particle(chest.x, chest.y, chest.color, 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 25));
                }
                Sound.play('victory');
                
                // [신규 기믹] 보상 상자 획득 시 맵 상의 모든 네온코인을 플레이어에게 즉시 끌어당김
                this.coinsList.forEach(coin => {
                    coin.isAttractedToPlayer = true;
                });

                // 바로 카드 오버레이를 띄우지 않고 45프레임(약 0.75초) 지연 후 트리거되도록 딜레이 시스템 활성화
                this.rewardSelectorDelayTimer = 45;
                this.rewardSelectorIsFromHiddenChest = false;
                
                // 상자 삭제
                this.rewardChests.splice(i, 1);
            }
        }

        // [수정] 결함 3: 자판기 상점(Vending Machine) 물리 충돌 및 들이받기 구매 검사
        for (let i = this.vendingMachines.length - 1; i >= 0; i--) {
            let vm = this.vendingMachines[i];
            if (!vm.active) continue;
            let dist = Math.hypot(this.player.x - vm.x, this.player.y - vm.y);
            if (dist < this.player.radius + 24) { // 자판기 물리 충돌 반경
                if (this.vendingCooldown === 0) {
                    let price = vm.getPrice();
                    if (this.player.coins >= price) {
                        let cards = this.generateRewardCardsData(this.currentSpawnTotal);
                        if (cards.length > 0) {
                            let chosenCard = cards[0]; // 1번째 슬롯 카드를 무작위 획득 배정
                            
                            this.player.coins -= price;
                            vm.purchaseCount++;
                            this.vendingCooldown = 60; // 1.0초 쿨다운으로 연사/중복 들이받기 방지
                            
                            Sound.play('powerup');
                            
                            // [수정] 결함 4: 자판기 구매 시 마이너스 코인 연출 상단 결합!
                            const coinGainPopup = document.getElementById('coin-gain-popup');
                            if (coinGainPopup) {
                                coinGainPopup.innerText = `-${price}`;
                                coinGainPopup.style.color = '#ff0055';
                                coinGainPopup.style.textShadow = '0 0 10px rgba(255, 0, 85, 0.8)';
                                coinGainPopup.classList.remove('hidden');
                                coinGainPopup.classList.remove('animate');
                                void coinGainPopup.offsetWidth;
                                coinGainPopup.classList.add('animate');
                                
                                // [신규] 팝업 애니메이션 1회성 마비 해결 클린업 타이머 탑재
                                if (coinGainPopup.cleanupTimer) clearTimeout(coinGainPopup.cleanupTimer);
                                coinGainPopup.cleanupTimer = setTimeout(() => {
                                    coinGainPopup.classList.remove('animate');
                                    coinGainPopup.classList.add('hidden');
                                    coinGainPopup.innerText = '';
                                }, 1000);
                            }
                            
                            // [수정] 결함 해결: 들이받는 즉시 플레이어를 자판기 정반대 방향으로 38px 물리적으로 팅겨나가게 밀어냄! (연속 자동 구매 예방)
                            let bounceAngle = Math.atan2(this.player.y - vm.y, this.player.x - vm.x);
                            this.player.x += Math.cos(bounceAngle) * 38;
                            this.player.y += Math.sin(bounceAngle) * 38;
                            
                            // 맵 경계선 마진 밖으로 탈출하는 것을 방지하기 위해 플레이어 맵 가두기 보정 추가
                            const wallMargin = 40;
                            this.player.x = Math.max(wallMargin + this.player.radius, Math.min(800 - wallMargin - this.player.radius, this.player.x));
                            this.player.y = Math.max(wallMargin + this.player.radius, Math.min(600 - wallMargin - this.player.radius, this.player.y));
                            
                            // 팅겨나갈 때 귀여운 튕김 스파크 6개 발생
                            for (let k = 0; k < 6; k++) {
                                let angle = bounceAngle + (Math.random() * 0.8 - 0.4);
                                let speed = Math.random() * 3 + 1.5;
                                this.particles.push(new Particle(this.player.x, this.player.y, '#ffdf00', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15));
                            }
                            Sound.play('dodge'); // 통 튕기는 회피 효과음 출력
                            
                            // 자판기 위에 카드 모양 퐁 날려보내기 파티클
                            for (let k = 0; k < 15; k++) {
                                let pAngle = -Math.PI/2 + (Math.random() - 0.5) * 1.2;
                                let pSpeed = Math.random() * 4 + 2;
                                this.particles.push(new Particle(vm.x, vm.y - 20, vm.color, 2, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20));
                            }
                            
                            // [수정] 즉시 획득 대신 상점 구매 완료 오버레이 호출하여 유저 승인/확인 유도!
                            this.triggerShopPurchaseConfirmation(chosenCard, vm.color);
                        }
                    } else {
                        // 잔액 부족 알림
                        this.vendingCooldown = 30;
                        Sound.play('hit');
                        this.showFloatingText(`NOT ENOUGH COIN (NEED 🪙${price})`, this.player.x, this.player.y - 30, '#ff0055');
                    }
                }
            }
        }


        // [네온 암시장] 비밀 자판기(SecretVendingMachine) 충돌 감지 및 차원 거래 팝업 호출
        for (let i = this.secretVendingMachines.length - 1; i >= 0; i--) {
            let svm = this.secretVendingMachines[i];
            if (!svm.active) continue;

            // 차원 파티클 아우라 주기적 방출 (15프레임마다 보라빛 파티클 2개)
            svm.particleTimer++;
            if (svm.particleTimer % 15 === 0) {
                for (let k = 0; k < 2; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 0.8 + 0.3;
                    this.particles.push(new Particle(
                        svm.x + (Math.random() - 0.5) * 30,
                        svm.y + (Math.random() - 0.5) * 40,
                        '#b026ff', 1.5,
                        Math.cos(pAngle) * pSpeed,
                        Math.sin(pAngle) * pSpeed,
                        25, 'spark'
                    ));
                }
            }

            let dist = Math.hypot(this.player.x - svm.x, this.player.y - svm.y);
            if (dist < this.player.radius + 26) { // 비밀 자판기 충돌 반경
                if (this.vendingCooldown === 0) {
                    // 최대 체력이 15 이하면 거래 불가 (안전 가드)
                    if (this.player.maxHp <= 15) {
                        this.vendingCooldown = 60;
                        Sound.play('hit');
                        this.showFloatingText("⚠️ 제물이 부족합니다 (Max HP ≤ 15)", this.player.x, this.player.y - 30, '#ff0055');
                    } else {
                        this.vendingCooldown = 60;
                        // 플레이어를 자판기 반대 방향으로 밀어냄 (연속 충돌 방지)
                        let bounceAngle = Math.atan2(this.player.y - svm.y, this.player.x - svm.x);
                        this.player.x += Math.cos(bounceAngle) * 38;
                        this.player.y += Math.sin(bounceAngle) * 38;
                        const wallMargin = 40;
                        this.player.x = Math.max(wallMargin + this.player.radius, Math.min(800 - wallMargin - this.player.radius, this.player.x));
                        this.player.y = Math.max(wallMargin + this.player.radius, Math.min(600 - wallMargin - this.player.radius, this.player.y));

                        // 튕김 파티클 (보라색)
                        for (let k = 0; k < 6; k++) {
                            let angle = bounceAngle + (Math.random() * 0.8 - 0.4);
                            let speed = Math.random() * 3 + 1.5;
                            this.particles.push(new Particle(this.player.x, this.player.y, '#b026ff', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15));
                        }
                        Sound.play('dodge');

                        // 차원 거래 팝업 호출 (에픽/레전더리 확정 카드 생성)
                        this.triggerSecretShopPurchase(svm, i);
                    }
                }
            }
        }

        // [추가] 힐링 물약 자석 블랙홀 흡입 및 업데이트 물리 연산
        for (let i = this.potions.length - 1; i >= 0; i--) {
            let pot = this.potions[i];
            
            // 물약 생성자 속성 누락 대비 방어 코드
            if (pot.vx === undefined) pot.vx = 0;
            if (pot.vy === undefined) pot.vy = 0;
            
            let potDist = Math.hypot(this.player.x - pot.x, this.player.y - pot.y);
            let pullRadius = 70; // 평소 자석 반경 70px
            
            if (this.timeDilationActive) {
                pullRadius = 1000; // 시간 왜곡 시 초강력 블랙홀 흡입
            }
            
            if (potDist < pullRadius) {
                let pullForce = this.timeDilationActive ? 12.0 : 4.0;
                let angleToPlayer = Math.atan2(this.player.y - pot.y, this.player.x - pot.x);
                pot.vx += Math.cos(angleToPlayer) * pullForce * 0.15;
                pot.vy += Math.sin(angleToPlayer) * pullForce * 0.15;
                
                let currentSpeed = Math.hypot(pot.vx, pot.vy);
                let maxSpeed = this.timeDilationActive ? 15.0 : 6.0;
                if (currentSpeed > maxSpeed) {
                    pot.vx = (pot.vx / currentSpeed) * maxSpeed;
                    pot.vy = (pot.vy / currentSpeed) * maxSpeed;
                }
                
                pot.x += pot.vx;
                pot.y += pot.vy;
            } else {
                pot.vx *= 0.95;
                pot.vy *= 0.95;
                pot.x += pot.vx;
                pot.y += pot.vy;
            }
        }

        // [추가] 힐링 물약 실시간 습득 충돌 검사
        for (let i = this.potions.length - 1; i >= 0; i--) {
            let pot = this.potions[i];
            let potDist = Math.hypot(this.player.x - pot.x, this.player.y - pot.y);
            if (potDist < this.player.radius + pot.radius) {
                // 최대 체력의 10% 치유 처리
                let healAmount = this.player.maxHp * 0.10;
                
                // [신규 기획] Health Ring 5레벨 돌파: 힐 포션 치유 효율 50% 버프 적용!
                if (this.player.equipLevels.ring_hp >= 5) {
                    healAmount *= 1.5;
                }
                
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                
                // 치유 성공 텍스트 및 효과음
                this.showFloatingText(`HEAL +${Math.ceil(healAmount)}`, this.player.x, this.player.y - 25, '#39ff14');
                Sound.play('powerup');
                
                // 경쾌한 네온 그린 스파크 파티클 폭발
                for (let k = 0; k < 12; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 3 + 1;
                    this.particles.push(new Particle(pot.x, pot.y, '#39ff14', 2.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20));
                }
                
                // 물약 소멸
                this.potions.splice(i, 1);
            }
        }

        // [W-08 신규 구현] 드롭 코인 실시간 업데이트 및 플레이어 습득 충돌 검사
        for (let i = this.coinsList.length - 1; i >= 0; i--) {
            let coin = this.coinsList[i];
            
            // 코인 물리 및 자석 이동 처리
            coin.update(this.player, this.timeDilationActive);
            
            // 플레이어와 충돌 시 획득
            let dist = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);
            if (dist < this.player.radius + coin.radius) {
                this.player.coins += coin.amount;
                
                // 골드 획득 텍스트
                this.showFloatingText(`+${coin.amount} 🪙`, this.player.x, this.player.y - 25, '#ffdf00');
                Sound.play('coin');
                
                // 황금색 스파크 파티클 연출
                for (let k = 0; k < 6; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 2 + 1;
                    this.particles.push(new Particle(coin.x, coin.y, '#ffdf00', 1.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15));
                }
                
                // [신규 기획] 실시간 코인 HUD 연출 트리거
                const coinCounter = document.getElementById('coin-counter');
                const coinGainPopup = document.getElementById('coin-gain-popup');
                if (coinGainPopup) {
                    coinGainPopup.innerText = `+${coin.amount}`;
                    coinGainPopup.style.color = '#ffdf00';
                    coinGainPopup.style.textShadow = '0 0 10px rgba(255, 223, 0, 0.8)';
                    coinGainPopup.classList.remove('hidden');
                    coinGainPopup.classList.remove('animate');
                    void coinGainPopup.offsetWidth; // 리플로우
                    coinGainPopup.classList.add('animate');
                    
                    // [신규] 팝업 애니메이션 1회성 마비 해결 클린업 타이머 탑재
                    if (coinGainPopup.cleanupTimer) clearTimeout(coinGainPopup.cleanupTimer);
                    coinGainPopup.cleanupTimer = setTimeout(() => {
                        coinGainPopup.classList.remove('animate');
                        coinGainPopup.classList.add('hidden');
                        coinGainPopup.innerText = '';
                    }, 1000);
                }
                
                // 코인 삭제
                this.coinsList.splice(i, 1);
            }
        }
        // [신규] 지연 삭제 사망 마킹된 몬스터들 일괄 Cleanup 정리 연산
        this.monsters = this.monsters.filter(m => !m.dead);

        // 게이지 바 텍스트 실시간 출력 동기화
        this.updateHUD();
    }

    // [신규] W-05 불마법 화상 5중첩 사망 시 사방 연쇄 폭발 트리거
    triggerFireExplosion(x, y) {
        Sound.play('explosion');
        // 불타는 붉은색 파티클 20개 사방으로 폭사
        for (let k = 0; k < 20; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 4 + 1.5;
            this.particles.push(new Particle(x, y, '#ff5e00', 3, Math.cos(angle) * speed, Math.sin(angle) * speed, 25, 'spark'));
        }
        
        const fireExplosionRadius = 120;
        const fireExplosionDmg = this.player.atk * 1.8;
        
        this.showFloatingText("🔥 FIRE EXPLOSION! 🔥", x, y - 30, '#ff5e00');
        this.shakeScreen(10, 4.0);
        
        // 사망 몬스터 주변 적들에게 연쇄 대폭발 데미지
        for (let m of this.monsters) {
            let dist = Math.hypot(m.x - x, m.y - y);
            if (dist < fireExplosionRadius + m.radius) {
                let finalDmg = fireExplosionDmg;
                if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                m.hp -= finalDmg;
                m.flashTimer = 5;
                
                // 넉백 반사
                let angle = Math.atan2(m.y - y, m.x - x);
                m.knockbackX += Math.cos(angle) * 4.5;
                m.knockbackY += Math.sin(angle) * 4.5;
                
                // 전이 화상 스택 1개 자동 축적
                m.statusEffects.burn = 240; // 4초 지속
                m.statusEffects.burnStack = Math.min(5, (m.statusEffects.burnStack || 0) + 1);
            }
        }
    }

    // [신규 기획] 비밀방 글리치 장치 보상 테이블 격발 (꽝 50%, 코인 35%, 체력 거래 15%)
    triggerSecretGlitchReward(device) {
        Sound.play('victory');
        
        // 보랏빛 폭발 파티클 이펙트
        for (let k = 0; k < 30; k++) {
            let pAngle = Math.random() * Math.PI * 2;
            let pSpeed = Math.random() * 5 + 2;
            this.particles.push(new Particle(device.x, device.y, '#b026ff', 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 25));
        }

        let rand = Math.random();
        
        if (rand < 0.50) {
            // 1. 꽝 (50% 확률)
            this.showFloatingText("SYSTEM ERROR: NO REWARD ❌", device.x, device.y - 30, '#ff0055');
            Sound.play('hit');
            this.shakeScreen(15, 5.0);
            
            // 지지직거리는 오작동 스파크 파편 사출
            for (let k = 0; k < 15; k++) {
                let pAngle = Math.random() * Math.PI * 2;
                let pSpeed = Math.random() * 3 + 1;
                this.particles.push(new Particle(device.x, device.y, '#ff0055', 2, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15, 'spark'));
            }
        } 
        else if (rand < 0.85) {
            // 2. 네온 코인 (35% 확률) - 다량의 코인 드롭
            let coinCount = Math.floor(Math.random() * 21) + 40; // 40~60 코인 드롭
            this.showFloatingText(`SYSTEM CRACK: GAINED 🪙 ${coinCount} COINS!`, device.x, device.y - 30, '#ffdf00');
            Sound.play('coin');
            
            // 코인이 방 중앙에서 통통 튕겨 나오도록 드롭
            for (let k = 0; k < coinCount; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 4 + 2;
                let coin = new NeonCoin(device.x, device.y, 1);
                coin.vx = Math.cos(angle) * speed;
                coin.vy = Math.sin(angle) * speed;
                this.coinsList.push(coin);
            }
        } 
        else {
            // 3. 체력 거래 상점 (15% 확률) - 특별 비밀 자판기 소환
            this.showFloatingText("🔮 CHAOTIC BLACK MARKET OPENED!", device.x, device.y - 35, '#b026ff');
            Sound.play('boss_alert');
            
            // 특별 자판기가 방 중앙에 스폰됨 (Max HP 15를 영구 깎고 에픽/레전더리 카드 거래)
            this.secretVendingMachines.push(new SecretVendingMachine(400, 300));
            
            // 소환 스파크 파편
            for (let k = 0; k < 20; k++) {
                let pAngle = Math.random() * Math.PI * 2;
                let pSpeed = Math.random() * 4 + 2;
                this.particles.push(new Particle(400, 300, '#b026ff', 2.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20, 'spark'));
            }
        }

        // 상호작용 완료 시점에 비밀방 탈출구 포털을 즉시 개방하여 탈출할 수 있도록 뚫어줌!
        this.portals.forEach(p => p.active = true);
    }

    // 몬스터 처치 성공
    killMonster(m, index) {
        if (m.dead) return; // [신규] 중복 정산 및 사망 처리 방지
        m.dead = true; // [신규] 지연 삭제 마킹

        // [신규] 사망 시 화상 5중첩이면 연쇄 대폭발 트리거 작동
        if (m.statusEffects && m.statusEffects.burnStack >= 5) {
            this.triggerFireExplosion(m.x, m.y);
        }

        // 지연 삭제 기믹 도입으로 즉각적인 splice는 생략합니다.
        // this.monsters.splice(index, 1);
        this.kills++;
        this.comboCount++;
        this.comboTimer = 180; // 콤보 유효 시간 3초 제공

        // [신규] 콤보 마일스톤 돌파 시 타격감 넘치는 네온 플로팅 연출 추가
        if (this.comboCount >= 5 && this.comboCount % 5 === 0) {
            let comboColor = '#00f0ff';
            let comboTitle = `${this.comboCount} COMBO! 🔥`;
            if (this.comboCount >= 30) {
                comboColor = '#ffdf00'; // 30콤보 이상은 황금색
                comboTitle = `${this.comboCount} COMBO BLASTER! ⚡`;
            }
            if (this.comboCount >= 60) {
                comboColor = '#ff00aa'; // 60콤보 이상은 마젠타
                comboTitle = `${this.comboCount} GODLIKE COMBO! 🔮`;
            }
            this.showFloatingText(comboTitle, this.player.x, this.player.y - 45, comboColor);
            
            // 콤보 돌파 시 플레이어 주변에 이펙트 스파크 방출
            for (let k = 0; k < 5; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 2 + 1;
                this.particles.push(new Particle(this.player.x, this.player.y, comboColor, 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15));
            }
        }
        
        // 점수 획득 (티어 보정치 반영 - 엘리트는 생성 시 이미 scoreValue가 5배임)
        this.score += m.scoreValue * 2;
        
        // 몬스터 처치 시 마력(MP) 게이지 충전
        let mpGain = 4 + (this.player.luk * 0.5); // 운 스탯이 높을수록 마력 충전량 상승
        if (m.isElite) mpGain *= 5; // 엘리트 몬스터 처치 시 MP 충전량 5배!
        
        // [신규 기획] Mana Ring 5레벨 돌파: 처치 시 마나 3% 즉시 환급!
        if (this.player.equipLevels.ring_mp >= 5) {
            mpGain += this.player.maxMp * 0.03;
        }
        
        this.player.mp = Math.min(this.player.maxMp, this.player.mp + mpGain);

        // [W-04 검 흡혈 베기 기믹]
        if (this.player.weaponType === 'sword' || this.player.weaponType === 'spear' || this.player.weaponType === 'dual') {
            if (this.player.hp < this.player.maxHp) {
                let healAmount = Math.max(1, (this.player.maxHp - this.player.hp) * 0.01);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                this.showFloatingText(`LIFESTEAL +${Math.round(healAmount)} ❤️`, this.player.x, this.player.y - 30, '#ff0055');
            }
        }

        // [W-08 신규 구현] 몬스터 처치 시 바닥에 황금 코인 드롭
        let coinDropCount = m.isElite ? 8 : 2;
        // Luck Amulet 5레벨 돌파 보너스 코인은 20개 드롭
        if (m.isElite && this.player.equipLevels.necklace >= 5) {
            coinDropCount += 20;
            this.potions.push(new NeonPotion(m.x, m.y));
            this.showFloatingText(`LUCKY DROP! 🪙`, m.x, m.y - 45, '#ffdf00');
        }
        
        for (let k = 0; k < coinDropCount; k++) {
            this.coinsList.push(new NeonCoin(m.x, m.y, 1));
        }

        // 몬스터 사망 시 흩어지는 빛 파편 (엘리트는 2배 풍성)
        let particleCount = m.isElite ? 25 : 12;
        for (let k = 0; k < particleCount; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * (m.isElite ? 5 : 3) + 1;
            this.particles.push(new Particle(m.x, m.y, m.color, m.isElite ? 4 : 3, Math.cos(angle) * speed, Math.sin(angle) * speed, 30));
        }

        // 엘리트 몬스터 처치 시 강력한 화면 연동 피드백
        if (m.isElite) {
            this.showFloatingText("ELITE DEFEATED!", m.x, m.y - 25, '#39ff14');
            this.shakeScreen(15, 6.5);
            
            // [신규 기획] Luck Amulet 5레벨 돌파: 정예 처치 시 드롭 2배 (물약 추가 드롭 + 특별 코인 20개 환수)
            if (this.player.equipLevels.necklace >= 5) {
                this.potions.push(new NeonPotion(m.x, m.y));
                let luckCoins = 20;
                this.player.coins += luckCoins;
                this.showFloatingText(`+${luckCoins} LUCKY COINS!`, m.x, m.y - 45, '#ffdf00');
                Sound.play('coin');
            }
        } else {
            this.shakeScreen(6, 3);
        }

        // 몬스터 사망 효과음
        Sound.play('hit');
    }

    // 플레이어 피격 연산 (회피 확률 연계 및 신규 장비 초월 마스터리 연계)
    damagePlayer(amount, fromX, fromY) {
        // [신규 추가] 피격 무적 시간이 돌고 있으면 데미지 피격을 전면 면제 처리합니다.
        if (this.player.invincibleTimer > 0) {
            return;
        }

        if (this.player.isGodMode) {
            this.showFloatingText("GOD MODE ACTIVE 🛡️", this.player.x, this.player.y - 20, '#ffdf00');
            return;
        }

        // [신규 기획] Stamina Boots 10레벨 마스터리: 대시 중 완전 무적 회피 관통!
        if (this.player.equipLevels.boots === 10 && this.keys['shift'] && this.player.stamina > 0) {
            this.showFloatingText("INVISIBLE EVD", this.player.x, this.player.y - 20, '#39ff14');
            return;
        }

        // 민첩(evd) 스탯 기반으로 회피 성공 여부 판정
        let evdRate = this.player.evd;
        // [신규 기획] Stamina Boots 5레벨 돌파: 대시 중 EVD 15% 추가 가산!
        if (this.player.equipLevels.boots >= 5 && this.keys['shift'] && this.player.stamina > 0) {
            evdRate += 0.15;
        }

        if (Math.random() < evdRate) {
            // 회피 대성공! 1~2px 붉은색 잔상 실루엣 및 DODGE 피드백 가동
            this.player.triggerEvade(fromX, fromY);
            
            // [신규 기획] Evasion Ring 5레벨 돌파: 회피 대성공 시 주변 적 1.5초간 기절 네온 섬광 작렬!
            if (this.player.equipLevels.ring_evd >= 5) {
                this.showFloatingText("PHANTOM STUN FLASH!", this.player.x, this.player.y - 35, '#ff0055');
                this.particles.push(new Particle(this.player.x, this.player.y, '#ff0055', 40, 0, 0, 20, 'explosionRing'));
                for (let m of this.monsters) {
                    let mDist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                    if (mDist < 120 + m.radius) {
                        m.statusEffects.shock = 90; // 1.5초간 무력화 기절
                    }
                }
            } else {
                this.showFloatingText("DODGE", this.player.x, this.player.y - 20, '#ff0055');
            }
            
            // [E-08 신규 구현] Speed Ring 10레벨 초월: 스치기 회피 성공 시 초신성 3초간 50% 폭발적 가속 활성화!
            if (this.player.equipLevels.ring_speed === 10) {
                this.player.supernovaTimer = 180;
                this.showFloatingText("SUPERNOVA ACCEL! 🌟", this.player.x, this.player.y - 35, '#ffdf00');
            }
            return;
        }

        // 회피에 실패하면 쉴드나 방어율(최대체력/200)을 감산하여 최종 데미지 적용
        // 힘(ATK) 스탯이나 방어 스탯에 의해 경감
        this.player.perfectClearFlag = false; // [신규 기획] 실제로 데미지를 입으면 퍼펙트 클리어 플래그 해제!
        this.player.lastHitTimer = 0;         // [신규 기획] 피격 당했으므로 무사고 타이머 리셋!
        
        let defense = (this.player.maxHp - 100) * 0.15; // 최대 HP가 기본값 100보다 클수록 15% 방어력 감소율 획득
        let finalDamage = Math.max(1, amount - defense);
        
        // [신규 기획] Plate Armor 5레벨 돌파: 체력 30% 이하일 때 최종 데미지 20% 영구 감산 보호!
        if (this.player.equipLevels.armor >= 5 && (this.player.hp / this.player.maxHp) < 0.3) {
            finalDamage *= 0.8;
        }

        this.player.hp = Math.max(0, this.player.hp - finalDamage);
        
        // [신규 추가] 실제 피격 데미지가 정산되었으므로 피격 무적 타이머 45프레임(약 0.75초) 가동
        this.player.invincibleTimer = 45;
        
        // [W-01 가시 탱커 반사 기믹]
        if (this.player.hasThorns) {
            const thornsRadius = 120;
            const reflectDamage = finalDamage; // 받은 대미지 100% 반사
            
            this.particles.push(new Particle(this.player.x, this.player.y, '#ff00aa', thornsRadius, 0, 0, 20, 'explosionRing'));
            this.player.thornsFieldTimer = 180; // 3초간 가시 장막 활성화

            // 10% 확률 보복형 유도 가시 사출 (명중을 유발한 몬스터 좌표 방향)
            if (Math.random() < 0.10) {
                let angle = Math.atan2(fromY - this.player.y, fromX - this.player.x);
                this.bullets.push(new Bullet(this.player.x, this.player.y, Math.cos(angle) * 7.0, Math.sin(angle) * 7.0, this.player.atk * 1.2, true, {
                    homing: true,
                    homingSpeed: 0.15,
                    color: '#ff00aa',
                    radius: 5,
                    life: 120
                }));
                this.showFloatingText("THORN REVENGE! 🌵", this.player.x, this.player.y - 30, '#ff00aa');
            }

            // 반경 120px 내의 모든 적들에게 피해 배분/반사
            for (let i = this.monsters.length - 1; i >= 0; i--) {
                let m = this.monsters[i];
                let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                if (dist < thornsRadius + m.radius) {
                    let fDmg = reflectDamage;
                    if (m.statusEffects.vulnerability > 0) fDmg *= 1.25;
                    m.hp -= fDmg;
                    m.flashTimer = 5;
                    
                    let angle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                    m.knockbackX += Math.cos(angle) * 3.5;
                    m.knockbackY += Math.sin(angle) * 3.5;

                    this.showFloatingText(`REFLECT -${Math.ceil(fDmg)}`, m.x, m.y - 20, '#ff00aa');
                    
                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }
                }
            }
        }

        this.shakeScreen(15, 6);
        Sound.play('hit');

        // 피격 시 붉은 불꽃 파편
        for (let k = 0; k < 8; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 4 + 1;
            this.particles.push(new Particle(this.player.x, this.player.y, '#ff0055', 2.5, Math.cos(angle) * speed, Math.sin(angle) * speed, 20));
        }

        // 캐릭터 사망 시 게임오버 판정 분기
        if (this.player.hp <= 0) {
            // [신규 기획] Plate Armor 10레벨 초월 마스터리: 사망 직전 최대 체력의 50%로 1회 극적 부활!
            if (this.player.equipLevels.armor === 10 && !this.player.resurrected) {
                this.player.resurrected = true;
                this.player.hp = this.player.maxHp * 0.5; // 50% 충전 부활
                this.player.invincibleTimer = 120; // [수정] 부활 즉시 2초간 완전 무적 상태 부여 (다단 피격사 방지)
                this.showFloatingText("GUARDIAN RESURRECTION ACTIVE! (+50% HP)", this.player.x, this.player.y - 30, '#ffdf00');
                Sound.play('victory');
                this.particles.push(new Particle(this.player.x, this.player.y, '#ffdf00', 50, 0, 0, 30, 'explosionRing'));
            } else {
                this.triggerGameOver();
            }
        }
    }

    // 데미지 텍스트 팝업 띄우기용 헬퍼
    showFloatingText(text, x, y, color) {
        // floating text는 Particles에 텍스트 타입으로 임시 활용
        let txtPart = new Particle(x, y, color, 12, 0, -0.6, 40);
        txtPart.type = 'text';
        txtPart.text = text;
        this.particles.push(txtPart);
    }

    // 원거리 스플래시 탄환 범위 데미지 연산
    triggerBulletSplash(x, y, radius, damage) {
        Sound.play('explosion');
        this.particles.push(new Particle(x, y, '#00f0ff', radius, 0, 0, 30, 'explosionRing'));
        
        for (let m of this.monsters) {
            let dist = Math.hypot(m.x - x, m.y - y);
            if (dist < radius + m.radius) {
                // 스플래시 폭발에 의한 기절 상태 부여 (1초)
                m.statusEffects.shock = 60;

                let finalDmg = damage;
                if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                m.hp -= finalDmg;
                m.flashTimer = 5;
                
                // 폭발 밀쳐냄 물리 적용
                let pushAngle = Math.atan2(m.y - y, m.x - x);
                m.knockbackX += Math.cos(pushAngle) * 3.5;
                m.knockbackY += Math.sin(pushAngle) * 3.5;
            }
        }
    }

    // [W-07 신규 구현] 체인 라이트닝(연쇄 벼락) 전이 트리거
    triggerChainLightning(startX, startY, currentEnemy, chainsLeft, damage) {
        if (chainsLeft <= 0 || this.monsters.length === 0) return;
        
        // 전이 타격 노랑 네온 낙뢰 이펙트 파티클
        for (let k = 0; k < 6; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 3 + 1;
            this.particles.push(new Particle(currentEnemy.x, currentEnemy.y, '#ffdf00', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 18, 'spark'));
        }
        
        // 주변 몬스터 중 가장 가까운 다른 몬스터 탐색 (번개 전이 거리 180px 제한)
        let nextTarget = null;
        let minDist = 180; // 최대 전이 거리
        
        for (let other of this.monsters) {
            if (other === currentEnemy) continue;
            let dist = Math.hypot(other.x - currentEnemy.x, other.y - currentEnemy.y);
            if (dist < minDist) {
                minDist = dist;
                nextTarget = other;
            }
        }
        
        if (nextTarget) {
            // 연쇄 번개 전류 와이어 시각 효과 파티클 (두 몬스터 사이에 선 형태로 5개 뿌림)
            let dx = nextTarget.x - currentEnemy.x;
            let dy = nextTarget.y - currentEnemy.y;
            for (let i = 0; i <= 5; i++) {
                let step = i / 5;
                let px = currentEnemy.x + dx * step;
                let py = currentEnemy.y + dy * step;
                this.particles.push(new Particle(px, py, '#ffdf00', 1.8, 0, 0, 15, 'spark'));
            }
            
            // 다음 타겟에게 감전 피해 및 0.75초 기절(Stun) 부여
            let finalDmg = damage;
            if (nextTarget.statusEffects.vulnerability > 0) finalDmg *= 1.25;
            nextTarget.hp -= finalDmg;
            nextTarget.flashTimer = 5;
            nextTarget.statusEffects.shock = Math.max(nextTarget.statusEffects.shock || 0, 45); // 감전 마비
            
            Sound.play('hit');
            
            // 몬스터 처사 체크
            if (nextTarget.hp <= 0) {
                let idx = this.monsters.indexOf(nextTarget);
                if (idx !== -1) {
                    this.killMonster(nextTarget, idx);
                }
            }
            
            // 재귀적으로 다음 전이 격발 (약 0.06초 후 전이되도록 지연 실행 연출 및 생존 검증 추가)
            setTimeout(() => {
                if (this.isPlaying && this.monsters.includes(nextTarget)) {
                    this.triggerChainLightning(currentEnemy.x, currentEnemy.y, nextTarget, chainsLeft - 1, damage * 0.85);
                }
            }, 60);
        }
    }

    // 주무기 탄환 및 마법 격발 메커니즘
    shootWeapon() {
        let isLightning = this.player.weaponType === 'lightning';
        let isFire = this.player.weaponType === 'fire';
        let isIce = this.player.weaponType === 'ice';
        let isWhip = this.player.weaponType === 'whip';
        let isDual = this.player.weaponType === 'dual';
        
        // 번개/불/얼음 마법 격발 시 마력(MP) 소모 및 잔량 차단 체크
        if (isLightning || isFire || isIce) {
            let isFreeMana = false;
            // Mana Helm 5레벨 돌파: 20% 확률 마나 소모 면제 무료 시전
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                isFreeMana = true;
                this.showFloatingText("FREE MANA CAST! 🔮", this.player.x, this.player.y - 30, '#00f0ff');
            }
            
            if (this.player.mp < 3.0 && !isFreeMana) {
                this.player.shootCooldown = 25; // 발사 불능 대기 프레임
                this.showFloatingText("NEED MP! 🔮", this.player.x, this.player.y - 25, '#ffdf00');
                Sound.play('hit');
                return;
            }
            
            if (!isFreeMana) {
                this.player.mp = Math.max(0, this.player.mp - 3.0);
            }
        }

        // 지능(aspd) 및 채찍 버프가 감안된 실효 공격 속도 연산
        let activeAspd = this.player.getEffectiveAspd();
        let cooldownFrames = Math.max(10, 60 / activeAspd);
        
        // E-09 Haste Ring 5레벨 돌파: 시전 딜레이 15% 영구 단축
        if (this.player.equipLevels.ring_aspd >= 5) {
            cooldownFrames *= 0.85;
        }

        // E-09 Haste Ring 10레벨 초월: 3초 연속 사격 시 하한선 해제 (10 -> 3프레임)
        if (this.player.equipLevels.ring_aspd === 10 && this.player.continuousShootTimer >= 180) {
            cooldownFrames = 3;
        }

        this.player.shootCooldown = cooldownFrames;
        
        let startAngle = this.player.angle;
        let bulletsToLaunch = [];

        // 멀티샷(multishot) 부채꼴 살상 각도 배치
        if (this.player.multishot === 1) {
            bulletsToLaunch.push(startAngle);
        } else {
            let arcSpan = this.player.multishotArc; // 부채꼴 퍼짐 각도 범위 (강화 카드 연동)
            let step = arcSpan / (this.player.multishot - 1);
            for (let i = 0; i < this.player.multishot; i++) {
                let targetAngle = startAngle - (arcSpan / 2) + (step * i);
                bulletsToLaunch.push(targetAngle);
            }
        }

        // 점사(burstCount) 횟수에 따른 0.08초 간격 순차 격발 큐 설정
        let fireBulletPack = () => {
            // [모델 C] 투사체 사격 시너지 곱연산 대미지 배율 산출
            let synergyMult = this.checkBuildSynergy('gun');

            // [신규 기획] Mana Helm 10레벨 초월: 마나가 100% 가득 찬 상태일 때 투사체 대미지 25% 가산!
            let helmDmgBonus = 1.0;
            if (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) {
                helmDmgBonus = 1.25;
            }

            // [E-08 신규 구현] Speed Ring 5레벨 돌파: 바람의 상처 2초 달리기 유지 시 공증 10% 가산 보정
            let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;

            // [2차 밸런스 패치] 멀티샷 및 점사 개수에 따른 대미지 역보정(감쇄) 연동 적용
            let multishotDmgFactor = Math.max(0.5, 1.0 - (this.player.multishot - 1) * 0.08);
            let burstDmgFactor = Math.max(0.6, 1.0 - (this.player.burstCount - 1) * 0.05);

            let baseDmg = isWhip ? (this.player.atk * 0.75) : (this.player.atk * (isLightning ? 0.9 : 1.0));
            let finalDamage = baseDmg * synergyMult * helmDmgBonus * speedRingDmgBonus * multishotDmgFactor * burstDmgFactor;

            for (let angle of bulletsToLaunch) {
                if (isWhip) {
                    let speed = 9.0;
                    let vx = Math.cos(angle) * speed;
                    let vy = Math.sin(angle) * speed;
                    let bulletLife = 200 / speed; // 그랩 사거리 약 200px
                    
                    this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                        color: '#ff00aa',
                        radius: 6,
                        life: bulletLife,
                        isWhip: true,
                        pierce: this.player.pierceCount,
                        homing: this.player.homing,
                        homingSpeed: this.player.homingAngleSpeed,
                        splash: this.player.splashRadius,
                        bounceLimit: this.player.wallBounceLimit,
                        monsterBounceLimit: this.player.monsterBounceLimit
                    }));
                    
                    // 사슬 네온 조각들
                    for (let i = 0; i < 4; i++) {
                        this.particles.push(new Particle(this.player.x, this.player.y, '#ff00aa', 1.8, vx * 0.5, vy * 0.5, 10, 'dust'));
                    }
                } else {
                    // dual(치트) 상태일 때는 3종 마법탄 and 일반탄을 섞어서 폭사!
                    let bulletIsLightning = isLightning;
                    let bulletIsFire = isFire;
                    let bulletIsIce = isIce;
                    
                    if (isDual) {
                        let randType = Math.random();
                        if (randType < 0.25) bulletIsLightning = true;
                        else if (randType < 0.5) bulletIsFire = true;
                        else if (randType < 0.75) bulletIsIce = true;
                    }

                    let speed = bulletIsLightning ? 8.5 : (bulletIsFire ? 6.2 : (bulletIsIce ? 7.5 : 7.0));
                    let vx = Math.cos(angle) * speed;
                    let vy = Math.sin(angle) * speed;
                    let bulletLife = this.player.range / speed;
                    
                    let bulletRadius = bulletIsLightning ? 5.5 : (bulletIsFire ? 7.0 : (bulletIsIce ? 5.0 : 4));
                    if (this.player.equipLevels.gloves >= 5 && !bulletIsLightning && !bulletIsFire && !bulletIsIce) {
                        bulletRadius = 4.8;
                    }
                    
                    this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                        pierce: this.player.pierceCount + (bulletIsIce ? 1 : 0), // 얼음탄은 1회 관통력 기본 보정
                        homing: this.player.homing,
                        homingSpeed: this.player.homingAngleSpeed,
                        splash: this.player.splashRadius + (bulletIsFire ? 30 : 0), // 불탄은 기본 30px 스플래시 폭사 반경 장착
                        color: bulletIsFire ? '#ff5e00' : (bulletIsIce ? '#00f0ff' : (bulletIsLightning ? '#ffdf00' : '#00f0ff')),
                        radius: bulletRadius,
                        life: bulletLife,
                        isLightning: bulletIsLightning,
                        isFire: bulletIsFire,
                        isIce: bulletIsIce,
                        bounceLimit: (!bulletIsLightning && !bulletIsFire && !bulletIsIce) ? this.player.wallBounceLimit : 0, // [W-03 총 도탄 옵션 연동]
                        monsterBounceLimit: (!bulletIsLightning && !bulletIsFire && !bulletIsIce) ? this.player.monsterBounceLimit : 0
                    }));
                }
            }
            if (isWhip) {
                Sound.play('slash');
                this.shakeScreen(4, 1.5);
            } else {
                Sound.play('shoot');
                this.shakeScreen(3, (isLightning || isFire || isIce) ? 1.5 : 1.2);
            }
        };

        // [신규] 프레임 기반 틱 격발 예약 (잔상 사격 버그 원천 차단)
        if (this.player.burstCount > 1) {
            this.player.burstRemaining = this.player.burstCount - 1; // 1회는 즉시 발사하므로 1회 차감
            this.player.burstIntervalTimer = 0;
            this.player.burstAngle = startAngle;
            this.player.burstType = isWhip ? 'whip' : 'gun';
            this.player.burstBulletsToLaunch = bulletsToLaunch;
        } else {
            this.player.burstRemaining = 0;
        }

        // 1회 즉시 사격
        fireBulletPack();
    }

    // 근접 검 베기 및 창 찌르기 메커니즘
    slashWeapon() {
        // 공속 쿨타임 적용 (창은 찌르기이므로 쿨타임을 미세하게 짧게 설정 - DPS 극대화)
        let isSpear = this.player.weaponType === 'spear';
        let baseCd = isSpear ? 40 : 50;
        let cooldownFrames = Math.max(isSpear ? 12 : 15, baseCd / this.player.aspd);
        this.player.slashCooldown = cooldownFrames;
        
        // [성능 최적화 및 스코프 결함 수정] 각도 연산 및 선언을 상위 slashWeapon 스코프로 안전하게 인양(Hoisting)
        let startAngle = this.player.angle;
        let anglesToLaunch = [];
        if (this.player.multishot === 1) {
            anglesToLaunch.push(startAngle);
        } else {
            let arcSpan = this.player.multishotArc; // 부채꼴 퍼짐 각도 범위 (강화 카드 연동)
            let step = arcSpan / (this.player.multishot - 1);
            for (let i = 0; i < this.player.multishot; i++) {
                let targetAngle = startAngle - (arcSpan / 2) + (step * i);
                anglesToLaunch.push(targetAngle);
            }
        }
        
        let fireSlashPack = () => {
            if (isSpear) {
                // 창 찌르기 파티클 (일직선상으로 뿜어져 나옴)
                let sAngle = this.player.angle;
                for (let i = 0; i < 6; i++) {
                    let distOffset = i * 8;
                    let px = this.player.x + Math.cos(sAngle) * distOffset;
                    let py = this.player.y + Math.sin(sAngle) * distOffset;
                    let vx = Math.cos(sAngle) * 3;
                    let vy = Math.sin(sAngle) * 3;
                    this.particles.push(new Particle(px, py, '#00f0ff', 1.8, vx, vy, 12, 'dust'));
                }
                Sound.play('slash');
                this.shakeScreen(4, 1.8);
            } else {
                // 베기 작동 모션 트리거
                this.player.isSlashActive = true;
                this.player.slashTimer = 12; // 12프레임간 휘두름 호가 그려짐
                this.player.slashAngle = this.player.angle;
                
                Sound.play('slash');
                this.shakeScreen(5, 2.5);

                // 검풍 베기 파티클
                let sAngle = this.player.angle;
                for (let i = -5; i <= 5; i++) {
                    let offset = sAngle + (i * 0.15);
                    let px = this.player.x + Math.cos(offset) * 25;
                    let py = this.player.y + Math.sin(offset) * 25;
                    let vx = Math.cos(offset) * 2;
                    let vy = Math.sin(offset) * 2;
                    this.particles.push(new Particle(px, py, '#b026ff', 2, vx, vy, 15, 'slashWave'));
                }
            }

            let synergyMult = this.checkBuildSynergy('sword');
            
            // [E-08 신규 구현] Speed Ring 5레벨 돌파: 바람의 상처 2초 달리기 유지 시 공증 10% 가산 보정
            let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;

            // 검기 또는 창 찌르기 대미지 보정 (창은 한방 관통 찌르기이므로 데미지 배율 1.35)
            let baseMult = isSpear ? 1.35 : 1.2;
            let weaponDmg = this.player.atk * baseMult * synergyMult * this.player.swordDmgUpgrade * speedRingDmgBonus;

            for (let angle of anglesToLaunch) {
                let speed = isSpear ? 10.0 : 6.0; // 창은 검기보다 날카롭고 민첩하게 10.0의 속도로 날아감
                let vx = Math.cos(angle) * speed;
                let vy = Math.sin(angle) * speed;
                
                this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, weaponDmg, true, {
                    // 창은 관통을 기본적으로 2회 가산 획득하여 시원하게 관통함
                    pierce: Math.min(5, this.player.pierceCount + (isSpear ? 2 : 1)), 
                    homing: this.player.homing,
                    homingSpeed: this.player.homingAngleSpeed,
                    splash: this.player.splashRadius,
                    color: isSpear ? '#00f0ff' : '#b026ff',
                    radius: isSpear ? 6 : 5,
                    isSpear: isSpear // 창 여부 설정 전달
                }));
            }
        };

        // [신규] 프레임 기반 틱 격발 예약 (잔상 사격 버그 원천 차단)
        if (this.player.burstCount > 1) {
            this.player.burstRemaining = this.player.burstCount - 1; // 1회는 즉시 사출하므로 1회 차감
            this.player.burstIntervalTimer = 0;
            this.player.burstAngle = startAngle;
            this.player.burstType = isSpear ? 'spear' : 'sword';
            this.player.burstBulletsToLaunch = anglesToLaunch;
        } else {
            this.player.burstRemaining = 0;
        }

        // 1회 즉시 난무 격발
        fireSlashPack();
    }


    // HUD 데이터 동기화 및 바 게이지 드로잉
    updateHUD() {
        document.getElementById('room-counter').innerText = `${this.roomNum} / 100`;
        document.getElementById('score-counter').innerText = this.score;
        document.getElementById('monster-counter').innerText = `${this.monsters.length} / ${this.currentSpawnTotal}`;
        
        // [신규 기획] 실시간 보유 네온 코인 동기화
        document.getElementById('coin-counter').innerText = `🪙 ${this.player.coins || 0}`;

        // 생명력 HP 연산
        let hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
        document.getElementById('hp-bar-fill').style.width = `${hpPct}%`;
        document.getElementById('hp-text').innerText = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

        // 스태미너 Stamina 연산
        let stPct = Math.max(0, (this.player.stamina / this.player.maxStamina) * 100);
        document.getElementById('stamina-bar-fill').style.width = `${stPct}%`;
        document.getElementById('stamina-text').innerText = `${Math.ceil(this.player.stamina)} / ${this.player.maxStamina}`;

        // 마력 MP 연산
        let mpPct = Math.max(0, (this.player.mp / this.player.maxMp) * 100);
        document.getElementById('mp-bar-fill').style.width = `${mpPct}%`;
        
        let mpTextStr = `${Math.ceil(this.player.mp)} / ${this.player.maxMp}`;
        if (this.timeDilationActive) {
            mpTextStr = "🔮 TIME WARPING...";
        } else if (this.player.mp >= 100) { // [개선] maxMp 대신 고정치인 100 MP 기준으로 READY 상태 판단
            mpTextStr = this.player.magicType === 'timeWarp' ? "🔮 WARP READY (SPACE)" : "READY (SPACEBAR)";
        }
        document.getElementById('mp-text').innerText = mpTextStr;

        // 세부 스탯 패널 텍스트 동기화
        document.getElementById('stat-atk').innerText = this.player.atk;
        document.getElementById('stat-aspd').innerText = this.player.aspd.toFixed(1);
        document.getElementById('stat-ms').innerText = this.player.ms.toFixed(1);
        document.getElementById('stat-evd').innerText = `${(this.player.evd * 100).toFixed(0)}%`;
        document.getElementById('stat-luk').innerText = this.player.luk.toFixed(1);
        document.getElementById('stat-regen').innerText = `${this.player.hpRegen.toFixed(1)}/s`;
        document.getElementById('stat-range').innerText = `${this.player.range}px`;
        document.getElementById('stat-pets').innerText = `${this.pets.length}기`;

        // 무기 상태 출력
        let wpnStr = "총 (Gun)";
        if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
        if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
        if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
        if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
        if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
        if (this.player.weaponType === 'dual') wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";
        document.getElementById('stat-wpn').innerText = wpnStr;

        document.getElementById('stat-bullets').innerText = `${this.player.multishot} / ${this.player.burstCount}`;
        
        let pText = this.player.pierceCount;
        let hText = this.player.homing ? "O" : "X";
        let sText = this.player.splashRadius > 0 ? `${this.player.splashRadius}px` : "X";
        document.getElementById('stat-effects').innerText = `${pText} / ${hText} / ${sText}`;
    }

    // --------------------------------------------------------------------------
    // 9. 카드 보상 선택 레이아웃 트리거
    // --------------------------------------------------------------------------
    triggerRewardSelector(isFromHiddenChest = false) {
        const overlay = document.getElementById('reward-overlay');
        overlay.classList.remove('hidden');

        // [엘리트/보스 보상 기획 연계] 5의 배수 방 여부 체크
        const isWeaponReward = (this.roomNum % 5 === 0) || isFromHiddenChest;
        let bonusText = "";
        
        if (isFromHiddenChest) {
            bonusText = "🎁 보물상자 발견! 고가치 무기/장비 확정 획득";
            document.getElementById('reward-header').innerText = "보물상자 개방 완료! 상위 무기/장비 선택";
        } else if (isWeaponReward) {
            let classStr = this.lastEnteredPortalClass === 'high' ? "상 [ELITE/BOSS] (Epic/Legendary 확정)" : (this.lastEnteredPortalClass === 'mid' ? "중 [ELITE] (Rare/Epic 보증)" : "하 [NORMAL] (Common/Rare 위주)");
            bonusText = `방 진입 난이도 보상 등급: ${classStr}`;
            document.getElementById('reward-header').innerText = "보스/엘리트 토벌 완료! 상위 무기 카드 선택";
        } else {
            const monsterBonus = this.currentSpawnTotal;
            const multiplierPct = (monsterBonus * 4);
            bonusText = `몬스터 소탕 보너스: +${multiplierPct}% (스탯 등급 강화)`;
            document.getElementById('reward-header').innerText = "방 소탕 완료! 보상을 선택하세요";
        }
        
        document.getElementById('reward-multiplier').innerText = bonusText;

        // 카드 슬롯을 빌드
        const cardContainers = document.querySelectorAll('.reward-card');
        let cardsData = this.generateRewardCardsData(this.currentSpawnTotal, isFromHiddenChest);

        const renderCards = (dataList) => {
            cardContainers.forEach((cardEl, idx) => {
                const data = dataList[idx];
                if (!data) return; // 예외 방지

                cardEl.className = `reward-card card-${data.rarity.toLowerCase()}`;
                
                // 카드 엘리먼트 데이터 채우기
                const rarityTag = cardEl.querySelector('.card-rarity');
                rarityTag.className = `card-rarity ${data.rarity.toLowerCase()}`;
                rarityTag.innerText = data.rarity;

                cardEl.querySelector('.card-icon').innerText = data.icon;
                cardEl.querySelector('.card-title').innerText = data.title;
                cardEl.querySelector('.card-desc').innerText = data.desc;

                // 기존 이벤트 핸들러 제거 후 새로 바인딩
                cardEl.onclick = (e) => {
                    e.stopPropagation();
                    overlay.classList.add('hidden');
                    
                    // [수정] 결함 해결: 카드 클릭 즉시 버프 적용 및 포털 개방! (중복 스폰 버그 원천 봉쇄)
                    this.applyRewardCard(data);
                    
                    // 대형 카드 획득 정보 확인 창 호출
                    this.showAcquiredCardDetail(data);
                };
            });
        };

        // 렌더링 시작
        renderCards(cardsData);

        // [신규 기획] Luck Amulet 10레벨 초월: 보상 카드 방당 1회 무상 리롤 기회 개방
        const rerollBtn = document.getElementById('reroll-btn');
        if (rerollBtn) {
            if (this.player.equipLevels.necklace === 10 && !this.hasRerolledThisRoom) {
                rerollBtn.classList.remove('hidden');
                
                // 리롤 클릭 이벤트
                rerollBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.hasRerolledThisRoom = true;
                    
                    // 리롤 성공 오디오
                    Sound.play('powerup');
                    this.showFloatingText("DESTINY RE-ROLLED!", this.player.x, this.player.y - 35, '#ffdf00');
                    
                    cardsData = this.generateRewardCardsData(this.currentSpawnTotal, isFromHiddenChest);
                    renderCards(cardsData);
                    
                    // 리롤 사용했으므로 버튼 소멸
                    rerollBtn.classList.add('hidden');
                };
            } else {
                rerollBtn.classList.add('hidden');
            }
        }
    }

    // 몬스터 처치량 비례하여 등급 가중치 보정이 연동되는 랜덤 카드 데이터 3종 조각 생성
    generateRewardCardsData(monsterBonus, isFromHiddenChest = false) {
        // 기본 8대 캐릭터 스탯 보상 카드 풀
        const statusCards = [
            { id: 'atk', title: '힘 (ATK) 강화', icon: '⚔️', desc: '공격 피해량을 미세 증가시킵니다.' },
            { id: 'aspd', title: '지능 (SPD) 강화', icon: '⚡', desc: '탄환 연사 주기 및 칼 휘두르는 속도가 빨라집니다.' },
            { id: 'ms', title: '민첩 (MOV) 기동', icon: '🏃', desc: '이동 속도가 강화됩니다.' },
            { id: 'evd', title: '민첩 (EVD) 회피', icon: '🦅', desc: '몬스터 공격 회피율이 상승합니다.' },
            { id: 'hp', title: '체력 (HP) 증대', icon: '❤️', desc: '최대 체력을 늘리고, 현재 체력을 소량 치유합니다.' },
            { id: 'luk', title: '운 (LUK) 축복', icon: '🍀', desc: '다음 보상 시 고등급 카드가 나올 행운이 영구 축적됩니다.' },
            { id: 'stamina', title: '스테미너 증폭', icon: '🔋', desc: '달릴 수 있는 최대 활력이 확장됩니다.' },
            { id: 'hpRegen', title: '체력 재생 (REGEN)', icon: '🩺', desc: '초당 체력 회복 능력을 부여합니다.' },
            { id: 'range', title: '사거리 연장 (RNG)', icon: '🔭', desc: '탄환 사거리 및 검 베기 공격 반경을 연장시킵니다.' }
        ];

        // 무기 변화 및 투사체 궤적 상위 카드 풀
        const weaponCards = [
            { id: 'sword', title: '네온 검(Sword) 융합', icon: '🪓', desc: '주무기에 근접 베기 속성이 추가되어 검과 총 복합 액션이 발현됩니다.' },
            { id: 'spear', title: '네온 창(Spear) 장착', icon: '🔱', desc: '직선상의 깊숙한 관통 찌르기로 적을 멀리 밀치고 벽 격돌 기절을 유도합니다.' },
            { id: 'thorns', title: '네온 가시(Thorns) 장착', icon: '🌵', desc: '피격 대미지를 100% 주변 적에게 반사하고, 10% 확률로 보복 유도 가시를 쏘며, 피격 시 3초간 도발(가시 오라 장막) 필드를 활성화합니다.' },
            { id: 'whip', title: '네온 채찍(Whip) 장착', icon: '🧣', desc: '직선 그랩 사슬을 사출하여 적을 발앞으로 강제 견인하고, 1.5초 기절 및 3초 공속 +20% 상승(최대 3중첩) 버프를 부여합니다.' },
            { id: 'trap', title: '네온 함정(Trap) 설치', icon: '🪤', desc: '이동 흔적상에 2초 주기로 80px 기절 지뢰를 매설하고, 가로/세로 벽 사이에 전류 감전 레이저 트립와이어를 설치합니다.' },
            { id: 'lightning', title: '네온 번개마법 (Lightning)', icon: '⚡', desc: '마나를 소모해 적들 사이를 연쇄 전이하며 단체 감전 기절을 주는 벼락을 발사합니다.' },
            { id: 'fire', title: '네온 불마법 (Fire)', icon: '🔥', desc: '마나(MP)를 소모해 지속적인 화상을 주며 5중첩 시 연쇄 폭발을 일으키는 불꽃을 격발합니다.' },
            { id: 'ice', title: '네온 얼음마법 (Ice)', icon: '❄️', desc: '마나(MP)를 소모해 적을 동결 정지시키며 동결된 적 타격 시 3배 파쇄 피해를 입칩니다.' },
            { id: 'multishot', title: '멀티샷 (Multi-Shot)', icon: '🏹', desc: '한 번 사격 시 부채꼴 형태로 다중 탄환이 뿜어져 나갑니다.' },
            { id: 'burst', title: '점사 (Burst Fire)', icon: '🔫', desc: '마우스 조준 방향으로 다다닥 연속 탄환을 연사합니다.' },
            { id: 'pierce', title: '관통 탄환 (Pierce)', icon: '💎', desc: '탄환이 몬스터에 맞고 소멸하지 않고 관통 횟수를 획득합니다.' },
            { id: 'homing', title: '유도 추적탄 (Homing)', icon: '🔮', desc: '탄환이 주변에서 가장 가까운 적을 유성처럼 유도 비행합니다.' },
            { id: 'splash', title: '스플래시 탄 (Splash)', icon: '💥', desc: '탄환 명중 지점에 네온 대폭발을 발생시켜 다수의 적을 몰살합니다.' },
            { id: 'pet', title: '디펜더 펫 (PET) 동행', icon: '🤖', desc: '주위를 돌며 적 탄환을 막고 유도탄을 사격하는 디펜더 드론을 추가 소환합니다.' },
            { id: 'magic_timewarp', title: '시간 왜곡 마법 (Time Warp)', icon: '🔮', desc: '특수 마법을 마나 소모형 불릿타임 시간 왜곡으로 교체합니다.' },
            { id: 'wall_bounce', title: '네온 도탄 (Wall Bounce)', icon: '🧱', desc: '탄환이 벽이나 장애물에 충돌 시 튕겨 나와 다른 방향으로 계속 날아갑니다.' },
            { id: 'monster_bounce', title: '유도 튕기기 (Monster Bounce)', icon: '🔗', desc: '탄환이 적에 명중 시, 소멸하지 않고 주변의 가까운 적을 향해 전이 유도 도탄 튕김 타격합니다.' }
        ];

        // [신규 기획] 장비 10종 보상 카드 풀
        const equipmentCards = [
            { id: 'equip_armor', title: '최대체력 갑옷', icon: '🛡️', desc: '최대 HP를 강화합니다. (5레벨: 뎀감 20%, 10레벨: 사망 시 부활)' },
            { id: 'equip_boots', title: '최대스테미너 신발', icon: '🥾', desc: '최대 Stamina를 확장합니다. (5레벨: 대시 중 회피 15%, 10레벨: 무적 통과)' },
            { id: 'equip_gloves', title: '공격범위 장갑', icon: '🧤', desc: '공격 물리 사거리를 확장합니다. (5레벨: 크기 20% 업, 10레벨: 충격파 발사)' },
            { id: 'equip_helm', title: '최대마력 투구', icon: '🪖', desc: '최대 MP를 확장합니다. (5레벨: 20% 무료 스킬, 10레벨: MP 100% 시 공격력 25% 업)' },
            { id: 'equip_necklace', title: '행운 목걸이', icon: '📿', desc: '카드 획득 행운(LUK)을 올립니다. (5레벨: 정예 자원 2배, 10레벨: 카드 리롤 기능 개방)' },
            { id: 'equip_ring_mp', title: '마력회복 반지', icon: '💍', desc: '초당 마력 회복량을 강화합니다. (5레벨: 킬 시 마나 3% 환급, 10레벨: 특수기 유지비 50% 절감)' },
            { id: 'equip_ring_hp', title: '체력회복 반지', icon: '💍', desc: '초당 체력 회복량을 강화합니다. (5레벨: 포션 효율 50% 업, 10레벨: 비피격 5초 시 재생 3배)' },
            { id: 'equip_ring_speed', title: '이동속도 반지', icon: '💍', desc: '이동 속도를 올립니다. (5레벨: 달릴 때 공격력 10% 업, 10레벨: 초신성 기동)' },
            { id: 'equip_ring_aspd', title: '공격속도 반지', icon: '💍', desc: '공격/연사 속도를 올립니다. (5레벨: 캐스팅 프레임 15% 단축, 10레벨: 공속 상한 해제)' },
            { id: 'equip_ring_evd', title: '회피증가 반지', icon: '💍', desc: '회피 확률을 강화합니다. (5레벨: 회피 시 주변 기절 섬광, 10레벨: 회피 상한선 75% 확장)' }
        ];

        // [신규 기획] 현재 방 유형(currentRoomType)에 맞춘 특화 보상 풀 배정
        let pool = [];
        let isSpecialReward = (this.currentRoomType === 'weapon' || this.currentRoomType === 'equipment') || isFromHiddenChest;
        
        if (isFromHiddenChest) {
            // 보물상자는 무기와 장비 카드를 골고루 혼합
            pool = [...weaponCards, ...equipmentCards];
        } else if (this.currentRoomType === 'weapon') {
            pool = [...weaponCards];
            
            // 보유 상태에 따른 무기 강화 연계 시너지 카드 동적 해금 주입 (이미 최고 단계 획득 시 풀에서 배제)
            const p = this.player;
            if ((p.weaponType === 'sword' || p.weaponType === 'dual') && p.swordDmgUpgrade < 1.4) {
                pool.push({ id: 'upgrade_sword', title: '[강화] 쾌검술 연마', icon: '🪓', desc: '검기 대미지를 +40% 상향하고 검기 도달 리치 반경을 +10px 연장시킵니다.' });
            }
            if (p.multishot >= 2 && p.multishotArc < 0.55) {
                pool.push({ id: 'upgrade_multishot', title: '[강화] 샷건 전탄 연마', icon: '🏹', desc: '멀티샷의 탄환수를 추가로 +1발 더 늘리고, 부채꼴 퍼짐각을 대폭 넓힙니다.' });
            }
            if (this.pets.length >= 1 && p.petDmgUpgrade < 1.6) {
                pool.push({ id: 'upgrade_pet', title: '[강화] 드론 오버로드', icon: '🤖', desc: '드론의 유도 레이저 대미지를 플레이어 힘(ATK) 스탯의 40% 비례로 크게 늘립니다.' });
            }
            if (p.splashRadius > 0 && p.splashDmgUpgrade < 0.9) {
                pool.push({ id: 'upgrade_splash', title: '[강화] 연쇄 열화 폭발', icon: '💥', desc: '스플래시 대폭발 피해 비율을 90%로 대폭 상향하고 폭발 반경을 +15px 연장시킵니다.' });
            }
            if (p.homing && p.homingAngleSpeed < 0.13) {
                pool.push({ id: 'upgrade_homing', title: '[강화] 초정밀 유도 궤적', icon: '🔮', desc: '유도탄의 선회 회전각을 60% 향상시켜 더욱 급속한 유도 추적이 가능해집니다.' });
            }
        } else if (this.currentRoomType === 'equipment') {
            pool = [...equipmentCards];
        } else {
            // 기본은 스탯(stat) 카드 풀
            pool = [...statusCards];
        }

        // 3개의 유니크한 카드를 선별
        const chosenCards = [];
        const shuffled = pool.sort(() => 0.5 - Math.random());
        const cardsToSelect = Math.min(3, shuffled.length);

        // 보상 등급 보정 (몬스터 처치량 비례 가중치 + 운 스탯 계수 추가)
        let portalLuckBonus = 0;
        if (isFromHiddenChest) {
            portalLuckBonus = 0.9; // Epic, Legendary 확정 등급 보증
        } else if (isSpecialReward) {
            // 진입했던 포털 난이도 상/중/하에 따라 희귀도 고정 보정 대폭 차등화!
            if (this.lastEnteredPortalClass === 'high') portalLuckBonus = 0.9;      // Epic, Legendary 확정
            else if (this.lastEnteredPortalClass === 'mid') portalLuckBonus = 0.45;  // Rare, Epic 위주
            else portalLuckBonus = -0.15; // low 문으로 도망쳐 오면 Common, Rare 중심
        } else {
            // 일반 스탯 방은 몬스터 스폰 수와 플레이어 LUK 스탯 가중치 합산 (LUK 소프트 캡 최대 4.0 제한 적용)
            let cappedLuk = Math.min(4.0, this.player.luk);
            portalLuckBonus = monsterBonus * 0.02 + (cappedLuk - 1) * 0.12;
        }

        // [신규 기획] 행운 목걸이 10레벨 초월: 리롤 성공 시 최소 Rare 등급 확정 추첨 보장 보정치 추가
        if (this.player.equipLevels.necklace === 10 && this.hasRerolledThisRoom) {
            portalLuckBonus += 0.8;
        }
        
        for (let i = 0; i < cardsToSelect; i++) {
            let item = shuffled[i];
            
            // 등급 확률 주입
            let rand = Math.random() + portalLuckBonus; // 보정 상향
            let rarity = 'COMMON';
            let multiplier = 1.0;

            if (rand > 1.45) {
                rarity = 'LEGENDARY';
                multiplier = 3.2; // 3.8에서 3.2로 미세 하향 조율
            } else if (rand > 1.1) {
                rarity = 'EPIC';
                multiplier = 2.0; // 2.4에서 2.0으로 하향
            } else if (rand > 0.75) {
                rarity = 'RARE';
                multiplier = 1.4; // 1.6에서 1.4로 하향
            }

            // [시간 왜곡 레전더리 전용 처리] 
            // 만약 추첨된 카드가 시간 왜곡인데 등급이 레전더리가 아니라면, 레전더리가 아닌 일반 무기 카드로 즉시 교체
            if (item.id === 'magic_timewarp' && rarity !== 'LEGENDARY') {
                const fallbackPool = weaponCards.filter(w => w.id !== 'magic_timewarp');
                item = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
            }

            // 등급별 능력치 증가 수치 계산 바인딩
            let detail = this.getCardSpecificEffect(item.id, rarity, multiplier);
            
            chosenCards.push({
                id: item.id,
                title: `${rarity === 'COMMON' ? '' : '[' + rarity + '] '}${item.title}`,
                desc: detail.desc,
                rarity: rarity,
                icon: item.icon,
                effectValue: detail.value,
                effectData: detail.data
            });
        }

        return chosenCards;
    }

    // 각 카드 ID별 등급 기반 정밀 효과 할당
    getCardSpecificEffect(id, rarity, mult) {
        let value = 0;
        let desc = '';
        let data = null;

        switch (id) {
            case 'atk':
                value = Math.ceil(1.5 * mult); // 종합 밸런스 패치 (기본 2에서 1.5로 하향)
                desc = `공격 피해량이 +${value} 만큼 영구히 상승합니다.`;
                break;
            case 'aspd':
                value = 0.08 * mult; // 종합 밸런스 패치 (기본 0.12에서 0.08로 하향)
                desc = `공격 연사 속도가 +${value.toFixed(2)}배 빨라집니다.`;
                break;
            case 'ms':
                value = 0.18 * mult; // 종합 밸런스 패치 (기본 0.25에서 0.18로 하향)
                desc = `플레이어 이동 속도가 +${value.toFixed(2)} 증가합니다.`;
                break;
            case 'evd':
                value = 0.015 * mult; // 종합 밸런스 패치 (기본 0.02에서 0.015로 하향)
                desc = `적 공격을 물리적으로 비껴낼 회피율이 +${(value * 100).toFixed(0)}% 보강됩니다.`;
                break;
            case 'hp':
                value = Math.ceil(10 * mult); // 종합 밸런스 패치 (기본 15에서 10으로 하향)
                desc = `최대 체력이 +${value} 늘어나며 동시에 실시간 체력을 회복합니다.`;
                break;
            case 'luk':
                value = 0.10 * mult; // 종합 밸런스 패치 (기본 0.15에서 0.10으로 하향)
                desc = `카드 행운 계수가 +${value.toFixed(2)} 올라가 고등급 획득에 크게 기여합니다.`;
                break;
            case 'stamina':
                value = Math.ceil(10 * mult); // 종합 밸런스 패치 (기본 15에서 10으로 하향)
                desc = `최대 대시용 기력이 +${value}만큼 증가합니다.`;
                break;
            case 'sword':
                desc = `주무기에 광역 반원 베기 모션(검)을 영구 장착합니다. (복합 하이브리드 공격 가능)`;
                break;
            case 'spear':
                desc = `일직선상으로 멀리 관통 찌르기(창)를 장착합니다. 적 벽 격돌 기절 및 창끝 2배 크리가 추가됩니다.`;
                break;
            case 'lightning':
                desc = `마나(MP)를 소모해 감전 기절을 거는 광역 연쇄 벼락 마법을 발사합니다.`;
                break;
            case 'fire':
                desc = `마나(MP)를 소모해 지속적인 화상을 주며 5중첩 시 대폭발을 유도하는 화염 탄환을 발사합니다.`;
                break;
            case 'ice':
                desc = `마나(MP)를 소모해 적의 속도를 늦추다 완전히 정지시키며, 동결된 적 타격 시 3배의 깨짐 파쇄 피해를 입힙니다.`;
                break;
            case 'multishot':
                // 상위 카드도 문 난이도 랭킹 계수(mult)의 보정을 연동받도록 설정!
                value = Math.ceil((rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 2 : 3)) * (mult >= 2.0 ? 1.5 : 1.0));
                desc = `격발 탄환 부채꼴 발사수가 +${value}발 추가 장착됩니다.`;
                break;
            case 'burst':
                value = Math.ceil((rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 2 : 3)) * (mult >= 2.0 ? 1.5 : 1.0));
                desc = `클릭 한 번당 고속 연속 점사 횟수가 +${value}회 추가 축적됩니다.`;
                break;
            case 'pierce':
                value = Math.ceil((rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 2 : 3)) * (mult >= 2.0 ? 1.5 : 1.0));
                desc = `탄환이 몬스터를 뚫고 통과할 관통력이 +${value}회 상향됩니다.`;
                break;
            case 'homing':
                desc = `탄환이 자동 회전 탐색하여 근접 적을 유도 추적합니다.`;
                break;
            case 'splash':
                value = Math.ceil(20 + (10 * mult)); // 종합 밸런스 패치 (기본 25+15*mult에서 20+10*mult로 하향)
                desc = `탄환 명중 시 반경 ${value}px 범위에 대폭발을 일으켜 광역 데미지를 입힙니다.`;
                break;
            case 'hpRegen':
                value = 0.3 * mult; // 종합 밸런스 패치 (기본 0.5에서 0.3으로 하향)
                desc = `초당 체력 자연 재생량이 +${value.toFixed(2)} 만큼 영구 증가합니다.`;
                break;
            case 'range':
                value = Math.ceil(30 * mult); // 종합 밸런스 패치 (기본 40에서 30으로 하향)
                desc = `탄환 사거리 및 검의 리치(베기 반경)가 +${value}px 만큼 영구 상승합니다.`;
                break;
            case 'pet':
                desc = `플레이어를 호위하며 적 탄환을 소멸시키고 유도 레이저를 사격하는 공전 드론을 추가 1기 소환합니다.`;
                break;
            case 'magic_timewarp':
                desc = `특수기를 마력 소모형 불릿타임 시간 왜곡으로 영구 교체합니다. 약 6초간 시간이 90% 느리게 흐릅니다.`;
                break;
            case 'wall_bounce':
                value = Math.ceil(rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 2 : (rarity === 'EPIC' ? 3 : 4)));
                desc = `탄환이 벽이나 격자 장애물에 충돌 시 튕겨 도탄하는 제한 횟수가 +${value}회 증가합니다.`;
                break;
            case 'monster_bounce':
                value = Math.ceil(rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 2 : (rarity === 'EPIC' ? 3 : 4)));
                desc = `탄환이 적에 명중했을 때 소멸하는 대신 다른 적으로 튕겨 유도 추격하는 연쇄 횟수가 +${value}회 증가합니다.`;
                break;
            case 'upgrade_sword':
                desc = `검기의 대미지 배율을 +40% 상향시키고, 검풍 리치 타격 반경을 +10px 영구 연장합니다.`;
                break;
            case 'upgrade_multishot':
                desc = `탄환 1발을 부채꼴 궤적에 영구 추가하고, 샷건 부채꼴 퍼짐 각도를 대폭 정교화하여 넓힙니다.`;
                break;
            case 'upgrade_pet':
                desc = `소환된 모든 호위 드론의 탄환 피해량을 플레이어 공격력(ATK) 스탯의 40% 비례로 과부하 강화합니다.`;
                break;
            case 'upgrade_splash':
                desc = `스플래시 대폭발의 피해 비율을 기존 70%에서 90%로 대폭 증폭하고 폭발 반경을 +15px 늘립니다.`;
                break;
            case 'upgrade_homing':
                desc = `유도탄의 실시간 조준 선회 각도를 60% 향상시켜, 적으로 향하는 궤적이 급격하고 정교해집니다.`;
                break;
            case 'equip_armor':
                value = Math.ceil(4 * mult);
                desc = `최대 체력이 +${value} 상승합니다. (현재 레벨: ${this.player.equipLevels.armor} -> ${Math.min(10, this.player.equipLevels.armor + 1)})`;
                break;
            case 'equip_boots':
                value = Math.ceil(4 * mult);
                desc = `최대 스태미너가 +${value} 확장됩니다. (현재 레벨: ${this.player.equipLevels.boots} -> ${Math.min(10, this.player.equipLevels.boots + 1)})`;
                break;
            case 'equip_gloves':
                value = Math.ceil(8 * mult);
                desc = `공격 물리 사거리가 +${value}px 확장됩니다. (현재 레벨: ${this.player.equipLevels.gloves} -> ${Math.min(10, this.player.equipLevels.gloves + 1)})`;
                break;
            case 'equip_helm':
                value = Math.ceil(8 * mult);
                desc = `최대 마력(MP)이 +${value} 확장됩니다. (현재 레벨: ${this.player.equipLevels.helm} -> ${Math.min(10, this.player.equipLevels.helm + 1)})`;
                break;
            case 'equip_necklace':
                value = 0.05 * mult;
                desc = `카드 획득 행운(LUK)이 +${value.toFixed(2)} 올라갑니다. (현재 레벨: ${this.player.equipLevels.necklace} -> ${Math.min(10, this.player.equipLevels.necklace + 1)})`;
                break;
            case 'equip_ring_mp':
                value = 0.3 * mult;
                desc = `초당 마력 회복량이 +${value.toFixed(2)}/s 강화됩니다. (현재 레벨: ${this.player.equipLevels.ring_mp} -> ${Math.min(10, this.player.equipLevels.ring_mp + 1)})`;
                break;
            case 'equip_ring_hp':
                value = 0.15 * mult;
                desc = `초당 체력 회복량이 +${value.toFixed(2)}/s 강화됩니다. (현재 레벨: ${this.player.equipLevels.ring_hp} -> ${Math.min(10, this.player.equipLevels.ring_hp + 1)})`;
                break;
            case 'equip_ring_speed':
                value = 0.015 * mult;
                desc = `이동 속도가 +${(value * 100).toFixed(1)}% 상승합니다. (현재 레벨: ${this.player.equipLevels.ring_speed} -> ${Math.min(10, this.player.equipLevels.ring_speed + 1)})`;
                break;
            case 'equip_ring_aspd':
                value = 0.02 * mult;
                desc = `공격/연사 속도가 +${(value * 100).toFixed(1)}% 빨라집니다. (현재 레벨: ${this.player.equipLevels.ring_aspd} -> ${Math.min(10, this.player.equipLevels.ring_aspd + 1)})`;
                break;
            case 'equip_ring_evd':
                value = 0.01 * mult;
                desc = `피격 물리 회피율이 +${(value * 100).toFixed(0)}% 보강됩니다. (현재 레벨: ${this.player.equipLevels.ring_evd} -> ${Math.min(10, this.player.equipLevels.ring_evd + 1)})`;
                break;
        }

        return { value, desc, data };
    }

    // 선택된 보상 카드 효과 플레이어 스탯에 누적 주입
    applyRewardCard(card) {
        const p = this.player;

        switch (card.id) {
            case 'atk':
                p.atk += card.effectValue;
                break;
            case 'aspd':
                p.aspd += card.effectValue;
                break;
            case 'ms':
                p.ms += card.effectValue;
                break;
            case 'evd':
                // [수정] Evasion Ring 10레벨 초월 시 회피 캡 75%, 그 외에는 60% 수렴 캡 동적 적용
                let maxEvdLimit = p.equipLevels.ring_evd === 10 ? 0.75 : 0.6;
                p.evd = p.evd + card.effectValue * (maxEvdLimit - p.evd);
                break;
            case 'hp':
                p.maxHp += card.effectValue;
                p.hp = Math.min(p.maxHp, p.hp + card.effectValue * 1.5); // 치료 제공
                break;
            case 'luk':
                p.luk += card.effectValue;
                break;
            case 'stamina':
                p.maxStamina += card.effectValue;
                p.stamina = p.maxStamina;
                break;
            case 'sword':
                if (p.weaponType === 'gun' || p.weaponType === 'lightning' || p.weaponType === 'fire' || p.weaponType === 'ice') {
                    p.weaponType = 'sword'; // 사격 및 마법 무기에서 검으로 안전 변경
                } else if (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') {
                    p.weaponType = 'dual'; // 기존 근접 무기가 존재했다면 즉시 하이브리드로 융합!
                }
                break;
            case 'spear':
                if (p.weaponType === 'gun' || p.weaponType === 'lightning' || p.weaponType === 'fire' || p.weaponType === 'ice') {
                    p.weaponType = 'spear'; // 사격 및 마법 무기에서 창으로 안전 변경
                } else if (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') {
                    p.weaponType = 'dual'; // 하이브리드로 융합!
                }
                break;
            case 'thorns':
                p.hasThorns = true;
                this.showFloatingText("THORNS UNLOCKED 🌵", p.x, p.y - 30, '#ff00aa');
                break;
            case 'whip':
                if (p.weaponType === 'gun' || p.weaponType === 'lightning' || p.weaponType === 'fire' || p.weaponType === 'ice') {
                    p.weaponType = 'whip'; // 사격 및 마법 무기에서 채찍으로 안전 변경
                } else if (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') {
                    p.weaponType = 'dual'; // 하이브리드로 융합!
                }
                this.showFloatingText("WHIP UNLOCKED 🧣", p.x, p.y - 30, '#ff00aa');
                break;
            case 'trap':
                p.hasTrap = true;
                this.showFloatingText("TRAPS UNLOCKED 🪤", p.x, p.y - 30, '#ffdf00');
                break;
            case 'lightning':
                p.weaponType = 'lightning'; // 마법 번개무기 강제 장착
                this.showFloatingText("⚡ LIGHTNING MAGIC UNLOCKED! ⚡", p.x, p.y - 30, '#ffdf00');
                break;
            case 'fire':
                p.weaponType = 'fire'; // 불마법 장착
                this.showFloatingText("🔥 FIRE MAGIC UNLOCKED! 🔥", p.x, p.y - 30, '#ff5e00');
                break;
            case 'ice':
                p.weaponType = 'ice'; // 얼음마법 장착
                this.showFloatingText("❄️ ICE MAGIC UNLOCKED! ❄️", p.x, p.y - 30, '#00f0ff');
                break;
            case 'multishot':
                p.multishot = Math.min(16, p.multishot + card.effectValue);
                p.weaponType = (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') ? 'dual' : p.weaponType; // 총 사격 속성 강제 활성화
                break;
            case 'burst':
                p.burstCount = Math.min(10, p.burstCount + card.effectValue);
                p.weaponType = (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') ? 'dual' : p.weaponType;
                break;
            case 'pierce':
                p.pierceCount += card.effectValue;
                p.weaponType = (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') ? 'dual' : p.weaponType;
                break;
            case 'homing':
                p.homing = true;
                p.weaponType = (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') ? 'dual' : p.weaponType;
                break;
            case 'splash':
                p.splashRadius = Math.max(p.splashRadius, card.effectValue);
                p.weaponType = (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') ? 'dual' : p.weaponType;
                break;
            case 'hpRegen':
                p.hpRegen += card.effectValue;
                break;
            case 'range':
                p.range += card.effectValue;
                break;
            case 'pet':
                // 디펜더 드론 소환 (3기 단위로 궤적을 120도씩 비틀고 궤도 층 확장)
                let petAngle = this.pets.length * (Math.PI * 2 / 3);
                let orbitRadius = 45 + Math.floor(this.pets.length / 3) * 15;
                this.pets.push(new Pet(petAngle, orbitRadius));
                break;
            case 'magic_timewarp':
                // [추가] 특수 마법 기술을 시간 왜곡으로 변경
                p.magicType = 'timeWarp';
                this.showFloatingText("TIME WARP UNLOCKED", p.x, p.y - 30, '#b026ff');
                break;
            case 'wall_bounce':
                p.wallBounceLimit += card.effectValue;
                this.showFloatingText(`WALL BOUNCE +${card.effectValue} 🧱`, p.x, p.y - 30, '#00f0ff');
                break;
            case 'monster_bounce':
                p.monsterBounceLimit += card.effectValue;
                this.showFloatingText(`MONSTER BOUNCE +${card.effectValue} 🔗`, p.x, p.y - 30, '#ff00aa');
                break;
            case 'upgrade_sword':
                // [강화] 검기 대미지 계수 +40% (1.0 -> 1.4) 및 리치 확장
                p.swordDmgUpgrade = 1.4;
                p.range += 10;
                this.showFloatingText("SWORD UPGRADED (DMG +40%)", p.x, p.y - 30, '#b026ff');
                break;
            case 'upgrade_multishot':
                // [강화] 멀티샷 1발 추가 및 부채꼴 퍼짐각 연마 (0.45 -> 0.55)
                p.multishot = Math.min(16, p.multishot + 1);
                p.multishotArc = 0.55;
                this.showFloatingText("SHOTGUN HONE (BULLET +1 / ARC WIDEN)", p.x, p.y - 30, '#b026ff');
                break;
            case 'upgrade_pet':
                // [강화] 드론 레이저 비례 대미지 상향 (1.0 -> 1.6)
                p.petDmgUpgrade = 1.6;
                this.showFloatingText("DRONE OVERLOADED (DMG UP)", p.x, p.y - 30, '#39ff14');
                break;
            case 'upgrade_splash':
                // [강화] 스플래시 연쇄 폭발 비율 상향 (0.7 -> 0.9) 및 폭발반경 +15px
                p.splashDmgUpgrade = 0.9;
                p.splashRadius += 15;
                this.showFloatingText("SPLASH CATACLYSM (DMG 90%)", p.x, p.y - 30, '#ff0055');
                break;
            case 'upgrade_homing':
                // [강화] 유도탄 회전 각도 60% 향상 (0.08 -> 0.13 선회율)
                p.homingAngleSpeed = 0.13;
                this.showFloatingText("HOMING PRECISION (STEERING UP)", p.x, p.y - 30, '#00f0ff');
                break;
            case 'equip_armor':
                p.equipLevels.armor = Math.min(10, p.equipLevels.armor + 1);
                p.maxHp += card.effectValue;
                p.hp = Math.min(p.maxHp, p.hp + card.effectValue);
                if (p.equipLevels.armor === 5) {
                    this.showFloatingText("ARMOR LV.5: STEEL WILL (20% DMG REDUCTION UNLOCKED)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.armor === 10) {
                    this.showFloatingText("ARMOR MAX: GUARDIAN RESURRECTION ACTIVE", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_boots':
                p.equipLevels.boots = Math.min(10, p.equipLevels.boots + 1);
                p.maxStamina += card.effectValue;
                p.stamina = p.maxStamina;
                if (p.equipLevels.boots === 5) {
                    this.showFloatingText("BOOTS LV.5: FEATHER DASH (+15% EVD DASH)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.boots === 10) {
                    this.showFloatingText("BOOTS MAX: INVISIBLE TELEPORT DASH UNLOCKED", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_gloves':
                p.equipLevels.gloves = Math.min(10, p.equipLevels.gloves + 1);
                p.range += card.effectValue;
                if (p.equipLevels.gloves === 5) {
                    this.showFloatingText("GLOVES LV.5: OVERSIZED REACH (+20% SIZE)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.gloves === 10) {
                    this.showFloatingText("GLOVES MAX: SHOCKWAVE EMISSION UNLOCKED", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_helm':
                p.equipLevels.helm = Math.min(10, p.equipLevels.helm + 1);
                p.maxMp += card.effectValue;
                if (p.equipLevels.helm === 5) {
                    this.showFloatingText("HELM LV.5: MANA REFLOW (20% FREE CAST)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.helm === 10) {
                    this.showFloatingText("HELM MAX: WISDOM (+25% DMG AT 100% MP)", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_necklace':
                p.equipLevels.necklace = Math.min(10, p.equipLevels.necklace + 1);
                p.luk += card.effectValue;
                if (p.equipLevels.necklace === 5) {
                    this.showFloatingText("LUCK LV.5: GOLDEN ROAD (2X ELITE)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.necklace === 10) {
                    this.showFloatingText("LUCK MAX: RE-ROLL DESTINY UNLOCKED", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_mp':
                p.equipLevels.ring_mp = Math.min(10, p.equipLevels.ring_mp + 1);
                p.mpRegen = (p.mpRegen || 0) + card.effectValue;
                if (p.equipLevels.ring_mp === 5) {
                    this.showFloatingText("MANA RING LV.5: ENERGY CYCLE (+3% MP ON KILL)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_mp === 10) {
                    this.showFloatingText("MANA RING MAX: INFINITE CIRCLE (50% MP CUT)", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_hp':
                p.equipLevels.ring_hp = Math.min(10, p.equipLevels.ring_hp + 1);
                p.hpRegen += card.effectValue;
                if (p.equipLevels.ring_hp === 5) {
                    this.showFloatingText("HP RING LV.5: LIFE BURST (+50% POTION EFF)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_hp === 10) {
                    this.showFloatingText("HP RING MAX: AUTO REPAIR (3X REGEN UNLOCKED)", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_speed':
                p.equipLevels.ring_speed = Math.min(10, p.equipLevels.ring_speed + 1);
                p.ms += card.effectValue * p.ms;
                if (p.equipLevels.ring_speed === 5) {
                    this.showFloatingText("SPEED RING LV.5: WIND SCAR (+10% MOVEMENT DMG)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_speed === 10) {
                    this.showFloatingText("SPEED RING MAX: HYPER SPEED MOTOR UNLOCKED", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_aspd':
                p.equipLevels.ring_aspd = Math.min(10, p.equipLevels.ring_aspd + 1);
                p.aspd += card.effectValue;
                if (p.equipLevels.ring_aspd === 5) {
                    this.showFloatingText("ASPD RING LV.5: FAST SPELL (15% MOTION SPEED)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_aspd === 10) {
                    this.showFloatingText("ASPD RING MAX: OVERLIMIT INFINITE HASTE ACTIVE", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_evd':
                p.equipLevels.ring_evd = Math.min(10, p.equipLevels.ring_evd + 1);
                let currentLimit = p.equipLevels.ring_evd === 10 ? 0.75 : 0.6;
                p.evd = p.evd + card.effectValue * (currentLimit - p.evd); // 복리식 한계 효용 수렴 적용
                if (p.equipLevels.ring_evd === 5) {
                    this.showFloatingText("EVD RING LV.5: PHANTOM FLASH (DODGE -> STUN)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_evd === 10) {
                    this.showFloatingText("EVD RING MAX: GHOST WALKER (75% MAX EVD)", p.x, p.y - 30, '#ffdf00');
                }
                break;
        }

        // [신규 기획] 상자를 열어서 보상 카드 3택1 결정을 완수했으므로, 워프 포털을 활성화하여 진행을 뚫어줍니다!
        this.portals.forEach(p => p.active = true);

        // HUD 및 사운드 발생
        this.updateHUD();
        Sound.play('powerup');
    }

    // --------------------------------------------------------------------------
    // 10. 엔드 게임 상태 트리거 (게임오버 / 클리어)
    // --------------------------------------------------------------------------
    triggerGameOver() {
        if (this.gameOverActive) return; // 중복 호출 원천 방지
        this.gameOverActive = true;
        
        Sound.stopBGM(); // [추가] 사망 시 은은하게 돌던 Synth BGM 루프 즉시 종료
        Sound.play('gameover');
        this.shakeScreen(60, 7); // 강렬한 카메라 사망 흔들림 진동 주입
        
        // 플레이어 캐릭터 사망 시 사방으로 폭사하며 터져 나가는 붉은 네온 파편 파티클 25개 생성
        for (let k = 0; k < 25; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 5 + 2.5; // 사방 폭사 퍼짐 속도
            let life = Math.random() * 45 + 30; // 0.5초 ~ 1.2초 생존
            this.particles.push(new Particle(
                this.player.x, this.player.y, 
                '#ff0055', 2.8, 
                Math.cos(angle) * speed, Math.sin(angle) * speed, 
                life, 'spark'
            ));
        }

        this.showFloatingText("FATAL DAMAGE! ☠️", this.player.x, this.player.y - 45, '#ff0055');

        // [결함 완치] 사망 파티클과 화면 진동이 매끄럽게 흐른 뒤 1.2초 후(1200ms) 자연스럽게 결과 대시보드가 오버랩되게 지연 처리
        setTimeout(() => {
            this.isPlaying = false; // 연출 완료 시점에 루프 정지 지정
            
            document.getElementById('result-title').innerText = "GAME OVER";
            document.getElementById('result-title').className = "text-glow-red";
            document.getElementById('result-message').innerText = "깊고 어두운 미로 속에서 힘이 다해 쓰러졌습니다...";
            
            this.populateResultOverlay();
            this.gameOverActive = false; // 플래그 초기화
        }, 1200);
    }

    triggerGameClear() {
        // [v0.95] 100층 돌파 최종 대성공 극상 연출 (무지개 파편 은하수 및 3연속 victory 팡파르)
        if (this.gameClearActive) return;
        this.gameClearActive = true;

        // 청아한 승리 3연음 아르페지오 팡파르 재생
        Sound.play('victory');
        setTimeout(() => Sound.play('victory'), 600);
        setTimeout(() => Sound.play('victory'), 1200);

        // 100개의 찬란한 무지개빛 은하수 네온 파티클 사방 폭사 물리
        const rainbowColors = ['#ff0055', '#00f0ff', '#b026ff', '#39ff14', '#ffdf00', '#ff5e00'];
        for (let i = 0; i < 100; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 8 + 3; // 폭발적 기하 속도
            let color = rainbowColors[i % rainbowColors.length];
            let size = Math.random() * 3 + 2;
            let life = Math.random() * 120 + 60; // 1~3초 유지
            this.particles.push(new Particle(
                400, 300, // 캔버스 중앙
                color, size,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                life, 'spark'
            ));
        }

        // 화면 극대 대진동
        this.shakeScreen(90, 8);

        // 1.5초간 화려한 축제 연출이 가동된 뒤, 자연스럽게 통계 오버레이를 열고 루프 정지
        setTimeout(() => {
            this.isPlaying = false;
            
            document.getElementById('result-title').innerText = "VICTORY ESCAPE!";
            document.getElementById('result-title').className = "text-glow-green";
            document.getElementById('result-message').innerText = "100개의 미로 방을 돌파하고 네온의 던전을 무사히 탈출했습니다!";
            
            this.populateResultOverlay();
        }, 1500);
    }

    // 모달창 최종 통계 수치 기입
    populateResultOverlay() {
        document.getElementById('res-room').innerText = `${Math.min(100, this.roomNum)} / 100`;
        document.getElementById('res-score').innerText = this.score;
        document.getElementById('res-kills').innerText = this.kills;
        
        let wpnStr = "총 (Gun)";
        if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
        if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
        if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
        if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
        if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
        if (this.player.weaponType === 'dual') wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";
        document.getElementById('res-wpn').innerText = wpnStr;

        // [신규] 랭킹 등록 영역 상태 초기화
        const rankSubmitArea = document.getElementById('rank-submit-area');
        const nicknameInput = document.getElementById('rank-nickname');
        const submitBtn = document.getElementById('submit-rank-btn');
        const feedbackMsg = document.getElementById('rank-feedback-msg');

        if (rankSubmitArea && nicknameInput && submitBtn && feedbackMsg) {
            rankSubmitArea.classList.remove('hidden');
            nicknameInput.value = "";
            nicknameInput.disabled = false;
            submitBtn.disabled = false;
            feedbackMsg.classList.add('hidden');
            feedbackMsg.innerText = "";
            feedbackMsg.className = "rank-feedback-text hidden";
        }

        document.getElementById('result-overlay').classList.remove('hidden');
    }

    // [신규] 명예의 전당 랭킹 등록 비동기 처리
    async submitRanking() {
        const nicknameInput = document.getElementById('rank-nickname');
        const submitBtn = document.getElementById('submit-rank-btn');
        const feedbackMsg = document.getElementById('rank-feedback-msg');

        if (!nicknameInput || !submitBtn || !feedbackMsg) return;

        const name = nicknameInput.value.trim().toUpperCase();
        
        // 유효성 체크
        if (!name || name === "") {
            feedbackMsg.innerText = "⚠️ 닉네임을 입력해 주세요!";
            feedbackMsg.className = "rank-feedback-text error";
            feedbackMsg.classList.remove('hidden');
            return;
        }

        const nameRegex = /^[A-Z0-9]+$/;
        if (!nameRegex.test(name)) {
            feedbackMsg.innerText = "⚠️ 영문 대문자와 숫자만 입력 가능합니다!";
            feedbackMsg.className = "rank-feedback-text error";
            feedbackMsg.classList.remove('hidden');
            return;
        }

        if (name.length < 2 || name.length > 10) {
            feedbackMsg.innerText = "⚠️ 닉네임은 2자 이상 10자 이하로 해주세요!";
            feedbackMsg.className = "rank-feedback-text error";
            feedbackMsg.classList.remove('hidden');
            return;
        }

        // 제출 중 비활성화 처리 (더블클릭 방지)
        nicknameInput.disabled = true;
        submitBtn.disabled = true;
        feedbackMsg.innerText = "⚡ 명예의 전당 등록 중...";
        feedbackMsg.className = "rank-feedback-text success";
        feedbackMsg.classList.remove('hidden');

        try {
            let wpnStr = "총 (Gun)";
            if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
            if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
            if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
            if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
            if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
            if (this.player.weaponType === 'dual') wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";

            const result = await window.RankSystem.addRankRecord(
                name,
                this.score,
                this.roomNum,
                this.kills,
                wpnStr
            );

            if (result.success) {
                if (result.mode === 'online') {
                    feedbackMsg.innerText = "🎉 실시간 파이어베이스 랭킹 등록 완료!";
                } else if (result.mode === 'fallback') {
                    feedbackMsg.innerText = "📢 로컬 저장 및 임시 대기열 등록 완료!";
                } else {
                    feedbackMsg.innerText = "🎉 로컬 랭킹 저장 완료!";
                }
                feedbackMsg.className = "rank-feedback-text success";

                // 1초 뒤에 랭킹 창을 띄우고 등록 폼을 슬라이드 아웃(숨김) 처리
                setTimeout(() => {
                    document.getElementById('rank-submit-area').classList.add('hidden');
                    this.showLeaderboard();
                }, 1000);
            }
        } catch (error) {
            console.error(error);
            feedbackMsg.innerText = "❌ 등록 에러: " + error.message;
            feedbackMsg.className = "rank-feedback-text error";
            nicknameInput.disabled = false;
            submitBtn.disabled = false;
        }
    }

    // [신규] 리더보드 모달 열기 및 실시간 렌더링 (로컬 랭킹 포함 여부 인수 보완)
    async showLeaderboard(includeLocal = true) {
        const overlay = document.getElementById('ranking-modal-overlay');
        const loading = document.getElementById('ranking-loading');
        const empty = document.getElementById('ranking-empty');
        const table = document.getElementById('ranking-table');
        const tbody = document.getElementById('ranking-table-body');

        if (!overlay || !loading || !empty || !table || !tbody) return;

        // 모달 표시 및 초기 상태 지정
        overlay.classList.remove('hidden');
        loading.classList.remove('hidden');
        empty.classList.add('hidden');
        table.classList.add('hidden');
        tbody.innerHTML = "";

        // 필터 버튼들의 UI 상태 동기화 (all: 로컬 포함, online: 온라인만)
        const filterBtns = document.querySelectorAll('.rank-filter-btn');
        filterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter') === (includeLocal ? 'all' : 'online')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        try {
            // 전역 랭킹 시스템에서 Top 10 정보 로드
            const rankings = await window.RankSystem.getTopRankings(10, includeLocal);

            if (rankings.length === 0) {
                loading.classList.add('hidden');
                empty.classList.remove('hidden');
            } else {
                rankings.forEach((rank, index) => {
                    const tr = document.createElement('tr');
                    const rankNum = index + 1;
                    
                    // 1, 2, 3위에 따라 특수 글로우 및 행 스타일 지정
                    if (rankNum === 1) {
                        tr.className = "rank-row-1";
                    } else if (rankNum === 2) {
                        tr.className = "rank-row-2";
                    } else if (rankNum === 3) {
                        tr.className = "rank-row-3";
                    }

                    // 순위 뱃지 설정
                    let rankBadge = `${rankNum}위`;
                    if (rankNum === 1) rankBadge = `<span class="rank-badge badge-1">🏆 1위</span>`;
                    else if (rankNum === 2) rankBadge = `<span class="rank-badge badge-2">🥈 2위</span>`;
                    else if (rankNum === 3) rankBadge = `<span class="rank-badge badge-3">🥉 3위</span>`;

                    // 로컬 임시 데이터 표시용 뱃지
                    const localBadgeHtml = rank.isLocalTemp ? `<span class="local-temp-badge">로컬 랭킹</span>` : "";

                    tr.innerHTML = `
                        <td style="padding: 12px 5px; font-weight: 800;">${rankBadge}</td>
                        <td style="padding: 12px 5px; font-weight: 700; color: #fff;">${rank.name}${localBadgeHtml}</td>
                        <td style="padding: 12px 5px; font-weight: 800; font-family: monospace; font-size: 1rem;">${rank.score.toLocaleString()}</td>
                        <td style="padding: 12px 5px;">${rank.room} / 100</td>
                        <td style="padding: 12px 5px; color: #ff0055; font-weight: 600;">💀 ${rank.kills}</td>
                        <td style="padding: 12px 5px; color: #a0aec0; font-size: 0.8rem;">${rank.date}</td>
                    `;
                    tbody.appendChild(tr);
                });

                loading.classList.add('hidden');
                table.classList.remove('hidden');
            }
        } catch (error) {
            console.error("랭킹 목록 로드 에러:", error);
            loading.classList.add('hidden');
            empty.innerHTML = `<p style="color: #ff0055;">⚠️ 명예의 전당 조회 오류<br>${error.message}</p>`;
            empty.classList.remove('hidden');
        }
    }

    // [신규] 리더보드 모달 닫기
    hideLeaderboard() {
        const overlay = document.getElementById('ranking-modal-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    // --------------------------------------------------------------------------
    // 11. HTML5 Canvas 커스텀 네온 렌더러
    // --------------------------------------------------------------------------
    render() {
        this.ctx.save();
        
        // 화면 진동(Screen Shake) 효과 번역
        if (this.shakeTimer > 0) {
            let dx = (Math.random() * 2 - 1) * this.shakeIntensity;
            let dy = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
            this.shakeTimer--;
        }

        // 배경 페인팅 (어두운 던전 분위기 및 옅은 리프레시 흔적 트레일 연출)
        this.ctx.fillStyle = '#05060a';
        this.ctx.fillRect(0, 0, 800, 600);

        // [시각 효과] 시간 왜곡 작동 시 배경을 은은한 보랏빛 장막으로 덮음
        if (this.timeDilationActive) {
            this.ctx.fillStyle = 'rgba(176, 38, 255, 0.08)';
            this.ctx.fillRect(0, 0, 800, 600);
        }

        // 방 벽 테두리 네온 사각형 그리기 (#08090e 내부 필드 및 외부 마진벽)
        this.ctx.beginPath();
        this.ctx.rect(38, 38, 724, 524);
        this.ctx.strokeStyle = this.timeDilationActive ? 'rgba(176, 38, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.rect(40, 40, 720, 520);
        this.ctx.fillStyle = '#08090e';
        this.ctx.fill();
        
        // 시간 왜곡 시 벽 테두리가 보랏빛 네온으로 맥박치며 번쩍임
        let wallStrokeColor = 'rgba(0, 240, 255, 0.1)';
        if (this.timeDilationActive) {
            wallStrokeColor = `rgba(176, 38, 255, ${0.35 + Math.sin(Date.now() * 0.007) * 0.15})`;
        }
        this.ctx.strokeStyle = wallStrokeColor;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 1. 네온 격자무늬 백그라운드 디자인 드로잉 (어두운 원근감/바둑판)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        this.ctx.lineWidth = 1;
        for (let x = 40; x < 760; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 40);
            this.ctx.lineTo(x, 560);
            this.ctx.stroke();
        }
        for (let y = 40; y < 560; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(40, y);
            this.ctx.lineTo(760, y);
            this.ctx.stroke();
        }

        // [5-5단계] 25등분 격자 장애물 렌더링
        // 방에 스폰된 자홍색 홀로그램 장벽들을 캔버스에 영롱하게 투사합니다.
        this.obstacles.forEach(obs => obs.draw(this.ctx));

        // 2. 4개 문(포털) 렌더링
        this.portals.forEach(p => p.draw(this.ctx));

        // 3. 파티클 이펙트 렌더링
        this.particles.forEach(p => {
            if (p.type === 'text') {
                // 데미지나 회피 등의 둥둥 떠다니는 텍스트 직접 구현
                this.ctx.save();
                this.ctx.globalAlpha = p.alpha;
                this.ctx.font = '800 11px "Outfit"';
                this.ctx.fillStyle = p.color;
                this.ctx.textAlign = 'center';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = p.color;
                this.ctx.fillText(p.text, p.x, p.y);
                this.ctx.restore();
            } else {
                p.draw(this.ctx);
            }
        });

        // 4. 탄환 렌더링
        this.bullets.forEach(b => b.draw(this.ctx));

        // 5. 몬스터 렌더링
        this.monsters.forEach(m => m.draw(this.ctx));

        // 5.5. 플레이어 보조 펫 렌더링
        this.pets.forEach(pet => pet.draw(this.ctx));

        // [추가] 힐링 Potion 물약 렌더링
        this.potions.forEach(pot => pot.draw(this.ctx));

        // [W-08 신규 구현] 드롭된 네온 코인 렌더링
        this.coinsList.forEach(coin => coin.draw(this.ctx));

        // [신규 기획] 보상 상자 및 자판기 렌더링
        this.rewardChests.forEach(chest => chest.draw(this.ctx));
        this.vendingMachines.forEach(vm => vm.draw(this.ctx));

        // [네온 암시장] 비밀 자판기 렌더링 (보라빛 차원 아우라)
        this.secretVendingMachines.forEach(svm => svm.draw(this.ctx));

        // [W-10 함정설치 함정 렌더링]
        this.traps.forEach(trap => trap.draw(this.ctx));

        // [Phase 7 신규 구현] 비밀 균열 벽 렌더링
        this.secretWalls.forEach(wall => wall.draw(this.ctx));

        // [Phase 7 신규 구현] 비밀방 상호작용 디바이스 렌더링
        this.secretGlitchDevices.forEach(device => device.draw(this.ctx));

        // 6. 플레이어 렌더링
        this.player.draw(this.ctx);

        // [3차 피드백] 몬스터가 스폰되는 전투 상황 시 상단 중앙에 스폰 방식 타입 HUD 렌더링
        if (this.monsters.length > 0 || this.spawnQueue.length > 0) {
            this.ctx.save();
            this.ctx.font = '800 11px "Outfit"';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 8;
            
            let methodStr = "SPAWN TYPE: NORMAL (CONTINUOUS)";
            let methodColor = '#00f0ff';
            if (this.spawnMethod === 2) {
                methodStr = "SPAWN TYPE: DELAYED (10 MONSTERS -> 2S BREAK)";
                methodColor = '#ffdf00';
            } else if (this.spawnMethod === 3) {
                methodStr = "SPAWN TYPE: WAVE (10 MONSTERS -> CLEAR TO SPAWN)";
                methodColor = '#b026ff';
            }

            this.ctx.fillStyle = methodColor;
            this.ctx.shadowColor = methodColor;
            this.ctx.fillText(methodStr, 400, 75);
            this.ctx.restore();
        }

        // [비전투 휴식방 안내 텍스트] 첫 방이나 몬스터가 전부 끝났을 때 안내 팝업
        if (this.monsters.length === 0 && this.spawnQueue.length === 0) {
            this.ctx.save();
            this.ctx.font = '600 14px "Outfit"'; // 시인성 개선을 위해 14px로 소폭 상향
            this.ctx.fillStyle = '#39ff14';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#39ff14';
            
            // [결함 완치] Y좌표를 275에서 중앙 오브젝트와 절대 겹치지 않는 상단 공간인 130으로 상향 보정!
            if (this.roomNum === 1 && this.kills === 0) {
                this.ctx.fillText("방의 문(포털)을 통과하여 다음 방으로 전진하세요! (문 위 숫자는 몬스터 수 & 획득 점수)", 400, 130);
            } else if (this.inSecretRoom) {
                this.ctx.fillText("🔮 글리치 보너스 틈새 방에 도달했습니다. 중앙의 장치를 조작하여 보상을 확인하세요.", 400, 130);
            } else {
                this.ctx.fillText("방 소탕 완료! 원하는 문으로 들어가서 탈출을 향해 전진하세요.", 400, 130);
            }
            this.ctx.restore();
        }

        // [v0.95 신규 구현] 보스 경보 발동 시 화면 테두리 붉은색 네온 경보 및 경고 텍스트
        if (this.bossWarningTimer > 0) {
            this.ctx.save();
            
            // 0.5초(30프레임) 주기 명멸 알파값 연산 (0.25 <-> 0.8)
            let warningAlpha = (Math.floor(this.bossWarningTimer / 15) % 2 === 0) ? 0.8 : 0.25;
            
            // 화면 외벽에 두꺼운 8px 네온 붉은 사각형 렌더링
            this.ctx.strokeStyle = `rgba(255, 0, 85, ${warningAlpha})`;
            this.ctx.lineWidth = 8;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#ff0055';
            this.ctx.strokeRect(4, 4, 792, 592);
            
            // 화면 중앙에 거대한 WARNING 네온 붉은 경고 텍스트
            this.ctx.font = '900 36px "Outfit"';
            this.ctx.fillStyle = `rgba(255, 0, 85, ${warningAlpha})`;
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#ff0055';
            this.ctx.fillText("WARNING! BOSS ENCOUNTER 🚨", 400, 240);
            
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    // [수정] 결함 2: 보상 획득 시 대형 카드 획득 정보 팝업 노출 및 아무데나 클릭 시 복귀
    showAcquiredCardDetail(cardData) {
        const detailOverlay = document.getElementById('card-detail-overlay');
        const cardView = document.getElementById('detail-card-view');
        const rarityTag = document.getElementById('detail-card-rarity');
        const iconDiv = document.getElementById('detail-card-icon');
        const titleH3 = document.getElementById('detail-card-title');
        const descP = document.getElementById('detail-card-desc');

        rarityTag.className = `card-rarity ${cardData.rarity.toLowerCase()}`;
        rarityTag.innerText = cardData.rarity;

        iconDiv.innerText = cardData.icon;
        titleH3.innerText = cardData.title;
        descP.innerText = cardData.desc;

        // 등급별 네온 글로우 쉐도우 색상 설정
        let glowColor = 'rgba(0, 240, 255, 0.3)';
        if (cardData.rarity === 'RARE') glowColor = 'rgba(57, 255, 20, 0.4)';
        if (cardData.rarity === 'EPIC') glowColor = 'rgba(176, 38, 255, 0.4)';
        if (cardData.rarity === 'LEGENDARY') glowColor = 'rgba(255, 223, 0, 0.5)';
        
        cardView.style.setProperty('--card-shadow', `0 0 35px ${glowColor}`);
        cardView.className = `reward-card large-card card-${cardData.rarity.toLowerCase()}`;

        detailOverlay.classList.remove('hidden');

        // 화면 아무 곳이나 클릭하면 닫히도록 이벤트 리스너 세팅
        const closeHandler = () => {
            detailOverlay.classList.add('hidden');
            detailOverlay.removeEventListener('click', closeHandler);
        };
        
        // 100ms 딜레이를 주어야 팝업을 연 클릭이 바로 버블링되어 닫히는 현상 방지
        setTimeout(() => {
            detailOverlay.addEventListener('click', closeHandler);
        }, 100);
    }

    // [수정] 결함 3: 상점 상품 구매 들이받기 확인 팝업
    triggerShopPurchaseConfirmation(cardData, themeColor) {
        const shopOverlay = document.getElementById('shop-confirm-overlay');
        const cardView = document.getElementById('shop-card-view');
        const rarityTag = document.getElementById('shop-card-rarity');
        const iconDiv = document.getElementById('shop-card-icon');
        const titleH3 = document.getElementById('shop-card-title');
        const descP = document.getElementById('shop-card-desc');
        const confirmBtn = document.getElementById('shop-confirm-btn');

        rarityTag.className = `card-rarity ${cardData.rarity.toLowerCase()}`;
        rarityTag.innerText = cardData.rarity;

        iconDiv.innerText = cardData.icon;
        titleH3.innerText = cardData.title;
        descP.innerText = cardData.desc;

        // 네온 글로우 바인딩
        cardView.style.setProperty('--card-shadow', `0 0 35px ${themeColor}`);
        cardView.className = `reward-card large-card card-${cardData.rarity.toLowerCase()}`;

        shopOverlay.classList.remove('hidden');

        const handleConfirm = () => {
            shopOverlay.classList.add('hidden');
            
            // 실제로 카드를 획득하여 버프 적용!
            this.applyRewardCard(cardData);
            
            confirmBtn.onclick = null; // [수정] 대입형 onclick 프로퍼티 안전하게 null 처리 해제
            shopOverlay.onclick = null;
        };

        // 확인 버튼 클릭 시 수령
        confirmBtn.onclick = (e) => {
            e.stopPropagation();
            handleConfirm();
        };

        // 오버레이 클릭 시 수령
        setTimeout(() => {
            shopOverlay.onclick = (e) => {
                handleConfirm();
            };
        }, 100);
    }

    // ==========================================================================
    // [네온 암시장] 비밀 자판기 차원 거래 팝업 및 수락/거절 핸들링 함수
    // 에픽/레전더리 확정 카드를 생성하고, Max HP 15 영구 삭감 대가의 거래를 제안합니다.
    // ==========================================================================
    triggerSecretShopPurchase(svm, svmIndex) {
        const overlay = document.getElementById('secret-shop-overlay');
        const iconDiv = document.getElementById('secret-shop-card-icon');
        const titleH3 = document.getElementById('secret-shop-card-title');
        const descP = document.getElementById('secret-shop-card-desc');
        const rarityTag = document.getElementById('secret-shop-card-rarity');
        const acceptBtn = document.getElementById('secret-shop-accept-btn');
        const rejectBtn = document.getElementById('secret-shop-reject-btn');

        // 에픽/레전더리 확정 카드 풀에서 1장 생성 (보물 상자급 고등급 보증)
        let cardsData = this.generateRewardCardsData(this.currentSpawnTotal, true);
        // 카드 중 가장 높은 등급 1장을 선별 (Legendary > Epic > Rare > Common)
        const rarityOrder = { 'LEGENDARY': 4, 'EPIC': 3, 'RARE': 2, 'COMMON': 1 };
        cardsData.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
        let chosenCard = cardsData[0];

        // 모달 UI에 카드 정보 바인딩
        rarityTag.className = `card-rarity ${chosenCard.rarity.toLowerCase()}`;
        rarityTag.innerText = chosenCard.rarity;
        rarityTag.style.background = `rgba(176, 38, 255, 0.2)`;
        rarityTag.style.borderColor = '#b026ff';
        rarityTag.style.color = '#b026ff';
        
        iconDiv.innerText = chosenCard.icon;
        titleH3.innerText = chosenCard.title;
        descP.innerText = chosenCard.desc;

        // 모달 표시
        overlay.classList.remove('hidden');

        // 기존 이벤트 핸들러 안전하게 제거
        acceptBtn.onclick = null;
        rejectBtn.onclick = null;

        // 거래 수락 핸들러: Max HP -15 영구 삭감 + 카드 획득 + 파티클 폭발
        acceptBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.classList.add('hidden');

            // 최대 체력 영구 삭감
            this.player.maxHp -= 15;
            // 현재 체력이 최대 체력을 초과하지 않도록 보정
            if (this.player.hp > this.player.maxHp) {
                this.player.hp = this.player.maxHp;
            }

            // 카드 버프 적용
            this.applyRewardCard(chosenCard);

            // 카드 획득 확인 대형 디테일 오버레이 표시
            this.showAcquiredCardDetail(chosenCard);

            // 보라빛 차원 붕괴 파티클 폭발 (40개 대규모 방출)
            for (let k = 0; k < 40; k++) {
                let pAngle = Math.random() * Math.PI * 2;
                let pSpeed = Math.random() * 6 + 2;
                let pColor = Math.random() > 0.5 ? '#b026ff' : '#d580ff';
                this.particles.push(new Particle(svm.x, svm.y, pColor, 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 35, 'spark'));
            }
            // 어두운 차원 붕괴 잔해 파편
            for (let k = 0; k < 15; k++) {
                let pAngle = Math.random() * Math.PI * 2;
                let pSpeed = Math.random() * 3 + 1;
                this.particles.push(new Particle(svm.x, svm.y, '#333333', 2, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20, 'dust'));
            }

            Sound.play('explosion');
            this.shakeScreen(12, 5.0);
            this.showFloatingText("⚠️ MAX HP -15 SACRIFICED!", svm.x, svm.y - 25, '#ff0055');
            this.showFloatingText("🔮 DARK DEAL COMPLETE!", svm.x, svm.y - 45, '#b026ff');

            // 비밀 자판기 소멸
            svm.active = false;
            this.secretVendingMachines.splice(svmIndex, 1);

            // HUD 갱신
            this.updateHUD();

            // 이벤트 클린업
            acceptBtn.onclick = null;
            rejectBtn.onclick = null;
        };

        // 거래 거절 핸들러: 무해 소멸, 자판기 유지
        rejectBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.classList.add('hidden');
            
            this.showFloatingText("DEAL REJECTED", this.player.x, this.player.y - 30, '#a0aec0');
            Sound.play('dodge');

            // 이벤트 클린업
            acceptBtn.onclick = null;
            rejectBtn.onclick = null;
        };
    }

    // ==========================================================================
    // [신규 기획] 치트/디버그 레이어 제어 및 연동 시스템
    // ==========================================================================
    toggleCheatMenu() {
        const cheatOverlay = document.getElementById('cheat-overlay');
        if (!cheatOverlay) return;
        
        if (cheatOverlay.classList.contains('hidden')) {
            // 메뉴 열기
            this.syncCheatUIFromPlayer();
            cheatOverlay.classList.remove('hidden');
        } else {
            // 메뉴 닫기
            cheatOverlay.classList.add('hidden');
        }
    }

    // 플레이어 스탯 및 상태를 치트 UI에 적용
    syncCheatUIFromPlayer() {
        const p = this.player;
        
        // 1. 기본 스탯 동기화
        document.getElementById('cheat-atk').value = p.atk;
        document.getElementById('cheat-aspd').value = p.aspd.toFixed(2);
        document.getElementById('cheat-ms').value = p.ms.toFixed(2);
        document.getElementById('cheat-evd').value = p.evd.toFixed(2);
        document.getElementById('cheat-luk').value = p.luk.toFixed(2);
        document.getElementById('cheat-regen').value = p.hpRegen.toFixed(2);
        document.getElementById('cheat-hp').value = Math.ceil(p.hp);
        document.getElementById('cheat-max-hp').value = p.maxHp;
        document.getElementById('cheat-mp').value = Math.ceil(p.mp);
        document.getElementById('cheat-max-mp').value = p.maxMp;
        document.getElementById('cheat-stamina').value = Math.ceil(p.stamina);
        document.getElementById('cheat-max-stamina').value = p.maxStamina;

        // 2. 무기 유형 동기화
        const wpnBtns = document.querySelectorAll('.cheat-wpn-btn');
        wpnBtns.forEach(btn => {
            if (btn.getAttribute('data-wpn') === p.weaponType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 3. 투사체 옵션 동기화
        document.getElementById('cheat-multishot').value = p.multishot;
        document.getElementById('cheat-burst').value = p.burstCount;
        document.getElementById('cheat-pierce').value = p.pierceCount;
        document.getElementById('cheat-range').value = p.range;
        document.getElementById('cheat-splash').value = p.splashRadius;
        document.getElementById('cheat-homing').checked = p.homing;
        // [추가] 벽 튕기기 및 몬스터 유도 튕기기 치트 UI 값 연동
        document.getElementById('cheat-wall-bounce').value = p.wallBounceLimit;
        document.getElementById('cheat-monster-bounce').value = p.monsterBounceLimit;

        // 4. 장비 레벨 동기화
        for (let eqKey in p.equipLevels) {
            const slider = document.getElementById(`cheat-eq-${eqKey}`);
            const label = document.getElementById(`cheat-lbl-${eqKey}`);
            if (slider && label) {
                slider.value = p.equipLevels[eqKey];
                label.innerText = p.equipLevels[eqKey];
            }
        }

        // 5. 무적 모드 동기화
        document.getElementById('cheat-godmode').checked = p.isGodMode || false;
        
        // 6. 다음 층 비밀방 강제 동기화
        const cheatSecret = document.getElementById('cheat-forcesecret');
        if (cheatSecret) {
            cheatSecret.checked = this.forceSecretWallNextRoom || false;
        }
    }

    // 치트 메뉴 조작 이벤트 리스너 바인딩
    initCheatSystemEvents() {
        // 모달 닫기
        document.getElementById('cheat-close-btn').addEventListener('click', () => {
            this.toggleCheatMenu();
        });

        // 탭 스위칭
        const tabBtns = document.querySelectorAll('.cheat-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTabId = btn.getAttribute('data-tab');
                
                // 버튼 active 클래스 리셋 및 부여
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // 컨텐트 active 클래스 리셋 및 부여
                const contents = document.querySelectorAll('.cheat-tab-content');
                contents.forEach(c => c.classList.remove('active'));
                document.getElementById(targetTabId).classList.add('active');
            });
        });

        // 스탯 일괄 적용
        document.getElementById('cheat-apply-stats').addEventListener('click', () => {
            const p = this.player;
            p.atk = parseFloat(document.getElementById('cheat-atk').value) || p.atk;
            p.aspd = parseFloat(document.getElementById('cheat-aspd').value) || p.aspd;
            p.ms = parseFloat(document.getElementById('cheat-ms').value) || p.ms;
            p.evd = parseFloat(document.getElementById('cheat-evd').value) || p.evd;
            p.luk = parseFloat(document.getElementById('cheat-luk').value) || p.luk;
            p.hpRegen = parseFloat(document.getElementById('cheat-regen').value) || p.hpRegen;
            
            p.maxHp = parseInt(document.getElementById('cheat-max-hp').value) || p.maxHp;
            p.hp = Math.min(p.maxHp, parseFloat(document.getElementById('cheat-hp').value) || p.hp);
            
            p.maxMp = parseInt(document.getElementById('cheat-max-mp').value) || p.maxMp;
            p.mp = Math.min(p.maxMp, parseFloat(document.getElementById('cheat-mp').value) || p.mp);
            
            p.maxStamina = parseInt(document.getElementById('cheat-max-stamina').value) || p.maxStamina;
            p.stamina = Math.min(p.maxStamina, parseFloat(document.getElementById('cheat-stamina').value) || p.stamina);
            
            this.updateHUD();
            this.showFloatingText("STATS UPDATED! ⚡", p.x, p.y - 40, '#00f0ff');
        });

        // 무기 유형 스위칭
        const wpnBtns = document.querySelectorAll('.cheat-wpn-btn');
        wpnBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const wpnType = btn.getAttribute('data-wpn');
                this.applyWeaponCheat(wpnType);
                
                // 버튼 액티브 동기화
                wpnBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 투사체 옵션 적용
        document.getElementById('cheat-apply-weapons').addEventListener('click', () => {
            const p = this.player;
            p.multishot = parseInt(document.getElementById('cheat-multishot').value) || 1;
            p.burstCount = parseInt(document.getElementById('cheat-burst').value) || 1;
            p.pierceCount = parseInt(document.getElementById('cheat-pierce').value) || 0;
            p.range = parseInt(document.getElementById('cheat-range').value) || 350;
            p.splashRadius = parseInt(document.getElementById('cheat-splash').value) || 0;
            p.homing = document.getElementById('cheat-homing').checked;
            // [추가] 벽 튕기기 및 몬스터 튕기기 설정치 플레이어 스탯에 실시간 갱신
            p.wallBounceLimit = parseInt(document.getElementById('cheat-wall-bounce').value) || 0;
            p.monsterBounceLimit = parseInt(document.getElementById('cheat-monster-bounce').value) || 0;

            this.updateHUD();
            this.showFloatingText("WEAPON SPECS APPLIED! 🏹", p.x, p.y - 40, '#b026ff');
        });

        // 특수 보조 장착
        document.getElementById('cheat-pet-btn').addEventListener('click', () => {
            let petAngle = this.pets.length * (Math.PI * 2 / 3);
            this.pets.push(new Pet(petAngle, 50));
            this.updateHUD();
            this.showFloatingText("PET SUMMONED! 🤖", this.player.x, this.player.y - 40, '#39ff14');
        });

        document.getElementById('cheat-whip-btn').addEventListener('click', () => {
            this.player.whipSpeedStack = 3;
            this.player.whipSpeedTimer = 300;
            this.showFloatingText("WHIP RUSH ACTIVE! 🧣", this.player.x, this.player.y - 40, '#ff6c00');
        });

        document.getElementById('cheat-trap-btn').addEventListener('click', () => {
            this.player.hasTrap = true;
            this.showFloatingText("TRAP MASTER ACTIVE! 🪤", this.player.x, this.player.y - 40, '#ffdf00');
        });

        document.getElementById('cheat-thorns-btn').addEventListener('click', () => {
            this.player.hasThorns = true;
            this.player.thornsFieldTimer = 1800; // 30초 대리 필드
            this.showFloatingText("THORNS AURA BURST! 🌵", this.player.x, this.player.y - 40, '#ff00aa');
        });

        // 장비 슬라이더 실시간 조작 및 적용
        const eqSliders = document.querySelectorAll('.cheat-range-slider');
        eqSliders.forEach(slider => {
            const eqKey = slider.id.replace('cheat-eq-', '');
            const label = document.getElementById(`cheat-lbl-${eqKey}`);
            
            // 실시간 숫자 변경 표기
            slider.addEventListener('input', () => {
                label.innerText = slider.value;
            });
            
            // 변경 완료 시 스탯 및 효과 동기화
            slider.addEventListener('change', () => {
                const targetLvl = parseInt(slider.value);
                this.applyCheatEquipChange(eqKey, targetLvl);
            });
        });

        // 무적 모드 토글
        document.getElementById('cheat-godmode').addEventListener('change', (e) => {
            this.player.isGodMode = e.target.checked;
            const text = this.player.isGodMode ? "GOD MODE ACTIVE 🛡️" : "GOD MODE DEACTIVATED";
            const color = this.player.isGodMode ? '#ffdf00' : '#ff0055';
            this.showFloatingText(text, this.player.x, this.player.y - 40, color);
        });

        // [2차 기획] 다음 층 비밀방 강제 출현 토글
        const cheatSecret = document.getElementById('cheat-forcesecret');
        if (cheatSecret) {
            cheatSecret.addEventListener('change', (e) => {
                this.forceSecretWallNextRoom = e.target.checked;
                const text = this.forceSecretWallNextRoom ? "FORCE SECRET WALL ACTIVE 🔮" : "FORCE SECRET WALL DEACTIVATED";
                const color = this.forceSecretWallNextRoom ? '#b026ff' : '#ff0055';
                this.showFloatingText(text, this.player.x, this.player.y - 40, color);
            });
        }

        // 코인 치트 지급
        document.getElementById('cheat-add-coin-100').addEventListener('click', () => {
            this.addCoinsCheat(100);
        });
        document.getElementById('cheat-add-coin-1000').addEventListener('click', () => {
            this.addCoinsCheat(1000);
        });

        // 방 소탕
        document.getElementById('cheat-clear-room').addEventListener('click', () => {
            this.clearRoomCheat();
        });

        // 스테이지 워프
        document.getElementById('cheat-warp-stage-btn').addEventListener('click', () => {
            const stageVal = parseInt(document.getElementById('cheat-warp-stage-input').value) || 1;
            this.warpStageCheat(stageVal);
        });
    }

    // [신규 추가] 시스템 옵션 모달 조작 이벤트 리스너 바인딩
    initOptionEvents() {
        // 상단 HUD OPTION 버튼 클릭 시 옵션 토글
        const optionBtn = document.getElementById('option-btn');
        if (optionBtn) {
            optionBtn.addEventListener('click', () => {
                // 이미 켜져 있는 걸 닫는 건 허용, 새로 켜는 건 다른 오버레이가 없을 때만 허용
                const optionOverlay = document.getElementById('option-overlay');
                const isAlreadyOpen = optionOverlay && !optionOverlay.classList.contains('hidden');
                if (!isAlreadyOpen) {
                    if (this.checkAnyOverlayOpenExcept('option-overlay')) return;
                }
                this.toggleOptionMenu();
            });
        }
        
        // 옵션 모달 닫기 버튼 클릭
        const closeBtn = document.getElementById('option-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggleOptionMenu();
            });
        }
        
        // 효과음 볼륨 슬라이더 실시간 조작
        const sfxSlider = document.getElementById('volume-sfx');
        const sfxLabel = document.getElementById('volume-sfx-val');
        if (sfxSlider && sfxLabel) {
            sfxSlider.addEventListener('input', () => {
                const val = parseFloat(sfxSlider.value);
                Sound.setSFXVolume(val);
                sfxLabel.innerText = Math.round(val * 100) + '%';
            });
            // 조작을 마칠 때(change) 소리를 체감해 볼 수 있게 레트로 동전 소리를 1회 출력
            sfxSlider.addEventListener('change', () => {
                Sound.play('coin');
            });
        }
        
        // 배경음악 볼륨 슬라이더 실시간 조작
        const bgmSlider = document.getElementById('volume-bgm');
        const bgmLabel = document.getElementById('volume-bgm-val');
        if (bgmSlider && bgmLabel) {
            bgmSlider.addEventListener('input', () => {
                const val = parseFloat(bgmSlider.value);
                Sound.setBGMVolume(val);
                bgmLabel.innerText = Math.round(val * 100) + '%';
            });
        }
        
        // 게임 재시작 버튼 클릭
        const restartBtn = document.getElementById('option-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                // 게임 재시작 후 모달 강제 닫기
                this.toggleOptionMenu();
                this.restartGame();
            });
        }
    }

    // [신규 추가] 시스템 옵션 모달 토글 메소드
    toggleOptionMenu() {
        const optionOverlay = document.getElementById('option-overlay');
        if (!optionOverlay) return;
        
        if (optionOverlay.classList.contains('hidden')) {
            // 옵션 메뉴 열기
            this.syncOptionUIFromSound();
            optionOverlay.classList.remove('hidden');
        } else {
            // 옵션 메뉴 닫기
            optionOverlay.classList.add('hidden');
        }
    }

    // [신규 추가] 임의의 게임 오버레이/모달창이 활성화되어 있는지 여부를 판정하는 헬퍼 함수
    checkAnyOverlayOpen() {
        const overlays = [
            'start-overlay', 'reward-overlay', 'result-overlay', 
            'card-detail-overlay', 'shop-confirm-overlay', 
            'secret-shop-overlay', 'cheat-overlay', 'option-overlay'
        ];
        return overlays.some(id => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        });
    }

    // [신규 추가] 특정 모달(exceptId)을 제외하고 활성화된 다른 오버레이가 있는지 판정하는 헬퍼 함수
    checkAnyOverlayOpenExcept(exceptId) {
        const overlays = [
            'start-overlay', 'reward-overlay', 'result-overlay', 
            'card-detail-overlay', 'shop-confirm-overlay', 
            'secret-shop-overlay', 'cheat-overlay', 'option-overlay'
        ];
        return overlays.some(id => {
            if (id === exceptId) return false;
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        });
    }

    // [신규 추가] Sound 객체의 볼륨 스탯을 옵션 UI 슬라이더에 동기화
    syncOptionUIFromSound() {
        const sfxVal = Sound.sfxVolume;
        const bgmVal = Sound.bgmVolume;
        
        const sfxSlider = document.getElementById('volume-sfx');
        const bgmSlider = document.getElementById('volume-bgm');
        const sfxLabel = document.getElementById('volume-sfx-val');
        const bgmLabel = document.getElementById('volume-bgm-val');
        
        if (sfxSlider && sfxLabel) {
            sfxSlider.value = sfxVal;
            sfxLabel.innerText = Math.round(sfxVal * 100) + '%';
        }
        if (bgmSlider && bgmLabel) {
            bgmSlider.value = bgmVal;
            bgmLabel.innerText = Math.round(bgmVal * 100) + '%';
        }
    }

    // 코인 추가 유틸 치트
    addCoinsCheat(amount) {
        this.player.coins += amount;
        Sound.play('coin');
        this.showFloatingText(`+${amount} 🪙`, this.player.x, this.player.y - 25, '#ffdf00');
        
        // HUD 갱신
        this.updateHUD();
        
        // 실시간 코인 HUD 연출
        const coinGainPopup = document.getElementById('coin-gain-popup');
        if (coinGainPopup) {
            coinGainPopup.innerText = `+${amount}`;
            coinGainPopup.style.color = '#ffdf00';
            coinGainPopup.style.textShadow = '0 0 10px rgba(255, 223, 0, 0.8)';
            coinGainPopup.classList.remove('hidden');
            coinGainPopup.classList.remove('animate');
            void coinGainPopup.offsetWidth; // 리플로우 강제
            coinGainPopup.classList.add('animate');
            
            if (coinGainPopup.cleanupTimer) clearTimeout(coinGainPopup.cleanupTimer);
            coinGainPopup.cleanupTimer = setTimeout(() => {
                coinGainPopup.classList.remove('animate');
                coinGainPopup.classList.add('hidden');
                coinGainPopup.innerText = '';
            }, 1000);
        }
    }

    // 무기 유형 변경 치트
    applyWeaponCheat(wpnType) {
        this.player.weaponType = wpnType;
        this.updateHUD();
        this.showFloatingText(`WEAPON CHANGED: ${wpnType.toUpperCase()}`, this.player.x, this.player.y - 40, '#00f0ff');
    }

    // 장비 레벨 실시간 스탯 누적 변경 보정
    applyCheatEquipChange(equipName, newLevel) {
        const p = this.player;
        const oldLevel = p.equipLevels[equipName] || 0;
        if (oldLevel === newLevel) return;
        
        p.equipLevels[equipName] = newLevel;
        const diff = newLevel - oldLevel;
        
        switch (equipName) {
            case 'armor':
                p.maxHp += diff * 4;
                p.hp = Math.min(p.maxHp, Math.max(1, p.hp + diff * 4));
                break;
            case 'boots':
                p.maxStamina += diff * 4;
                p.stamina = Math.min(p.maxStamina, Math.max(0, p.stamina + diff * 4));
                break;
            case 'gloves':
                p.range += diff * 8;
                break;
            case 'helm':
                p.maxMp += diff * 8;
                break;
            case 'necklace':
                p.luk += diff * 0.05;
                break;
            case 'ring_mp':
                p.mpRegen = (p.mpRegen || 0) + diff * 0.3;
                break;
            case 'ring_hp':
                p.hpRegen += diff * 0.15;
                break;
            case 'ring_speed':
                p.ms += diff * 0.05;
                break;
            case 'ring_aspd':
                p.aspd += diff * 0.02;
                break;
            case 'ring_evd':
                p.evd = Math.min(0.75, Math.max(0, p.evd + diff * 0.01));
                break;
        }
        
        if (newLevel === 5) {
            this.showFloatingText(`${equipName.toUpperCase()} LV.5 SPECIAL UNLOCKED`, p.x, p.y - 40, '#ff5e00');
        } else if (newLevel === 10) {
            this.showFloatingText(`${equipName.toUpperCase()} LV.10 OVERLIMIT ACTIVE`, p.x, p.y - 40, '#ffdf00');
        } else {
            this.showFloatingText(`${equipName.toUpperCase()} -> LV.${newLevel}`, p.x, p.y - 40, '#39ff14');
        }
        
        this.updateHUD();
    }

    // 방 클리어 치트
    clearRoomCheat() {
        if (this.monsters.length === 0 && this.spawnQueue.length === 0) {
            this.showFloatingText("ROOM ALREADY CLEARED", this.player.x, this.player.y - 20, '#ff0055');
            return;
        }
        
        // 폭발 파티클
        for (let m of this.monsters) {
            this.particles.push(new Particle(m.x, m.y, m.color, m.radius * 2, 0, 0, 20, 'explosionRing'));
        }
        
        this.monsters = [];
        this.spawnQueue = [];
        this.currentSpawnRemaining = 0;
        
        Sound.play('explosion');
        this.showFloatingText("CHEAT: ROOM CLEARED! 💥", this.player.x, this.player.y - 40, '#ffdf00');
    }

    // 스테이지 워프 치트
    warpStageCheat(targetStage) {
        if (targetStage < 1 || targetStage > 99) {
            this.showFloatingText("INVALID STAGE (1~99 ONLY)", this.player.x, this.player.y - 20, '#ff0055');
            return;
        }
        
        // 룸 전환용 가상 포털 생성 후 연동
        let mockPortal = { direction: 'top', scoreValue: 0, portalType: 'stat', difficultyClass: 'low' };
        this.roomNum = targetStage - 1; // transitionToNextRoom 내부에서 roomNum++이 되어 타겟 도달
        
        this.toggleCheatMenu(); // 워프 전 치트창 닫기
        this.transitionToNextRoom(mockPortal);
        
        this.showFloatingText(`WARPED TO ROOM ${targetStage} 🌀`, this.player.x, this.player.y - 40, '#ffdf00');
    }
}

// --------------------------------------------------------------------------
// 12. 웹 브라우저 실행 스크립트 연결
// --------------------------------------------------------------------------
window.onload = () => {
    // 엔진 로드
    window.gameEngine = new GameEngine();
};
