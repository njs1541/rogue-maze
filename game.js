/**
 * ==========================================================================
 * Neon Rogue-Maze - game.js (핵심 게임 로직 및 엔진)
 * 한국어 주석과 함께 상세하고 구체적으로 구현됨.
 * ==========================================================================
 */

// --------------------------------------------------------------------------
// 1. Web Audio API 기반 효과음 합성기 (SoundSynthesizer)
// --------------------------------------------------------------------------
const Sound = {
    ctx: null,

    // 오디오 컨텍스트 초기화 (브라우저 정책 상 첫 상호작용 시 활성화)
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    // 다양한 레트로 네온 효과음 생성 및 재생
    play(type) {
        this.init();
        if (!this.ctx) return;
        
        // 오디오 컨텍스트가 정지 상태이면 재개
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;

        switch (type) {
            case 'shoot': { // 총탄 발사음 (피치 급하강 레이저)
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
                
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
                
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

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.2);

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
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.05);

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
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

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

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

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
                    
                    gain.gain.setValueAtTime(0.12, now + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);

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

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

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

                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.5);
                });
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
// 3. 무기 및 투사체 정보 정의
// --------------------------------------------------------------------------
class Bullet {
    constructor(x, y, vx, vy, damage, isPlayerBullet, options = {}) {
        this.x = x;
        this.y = y;
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
    }

    update(monsters) {
        // [수정] 시간 왜곡 시 적 탄환 75% 감속 적용
        let timeScale = 1.0;
        if (!this.isPlayerBullet && window.gameEngine && window.gameEngine.timeDilationActive) {
            timeScale = 0.25; // 75% 느려짐
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
                
                // 각도 보간 (매 프레임마다 약 5도씩 조준점 수정)
                let diff = targetAngle - currentAngle;
                // 각도 차이 정규화 (-PI ~ PI)
                diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                
                let newAngle = currentAngle + diff * 0.08;
                let speed = Math.hypot(this.vx, this.vy);
                this.vx = Math.cos(newAngle) * speed;
                this.vy = Math.sin(newAngle) * speed;
            }
        }

        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
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
            if (!b.isPlayerBullet) {
                let dist = Math.hypot(this.x - b.x, this.y - b.y);
                if (dist < this.radius + b.radius) {
                    // 탄환 제거
                    enemyBullets.splice(i, 1);
                    
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
                // 펫의 발사 공격력: 플레이어 힘(ATK) 스탯의 25% 비례 보정
                let petAtk = Math.max(2.0, player.atk * 0.25);
                let targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
                let fireSpeed = 5.0;
                let vx = Math.cos(targetAngle) * fireSpeed;
                let vy = Math.sin(targetAngle) * fireSpeed;

                // 유도 레이저 사출
                bullets.push(new Bullet(this.x, this.y, vx, vy, petAtk, true, {
                    homing: true,
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
        this.aspd = 1.0;        // 지능 (초당 공격 속도)
        this.ms = 3.2;          // 이동속도
        this.evd = 0.05;        // 민첩 (회피율 5%)
        this.luk = 1.0;         // 운 (보상 가중 확률)
        this.mp = 0;            // 마력 (특수기 충전율)
        this.maxMp = 100;
        this.magicType = 'explosion'; // [추가] 마법 기술 유형 ('explosion': 광역 폭발, 'timeWarp': 시간 왜곡)
        
        // 신규 추가 스탯
        this.hpRegen = 0.0;     // 초당 체력 회복량
        this.range = 350;       // 투사체 사정거리 (기본 350px)
        
        // 무기 스탯
        this.weaponType = 'gun'; // 'gun', 'sword', 'dual' (보상 카드로 검 획득 시 진화)
        this.multishot = 1;      // 부채꼴로 동시 발사될 탄환 수
        this.burstCount = 1;     // 한 번 사격 시 연속 점사 횟수
        this.pierceCount = 0;    // 탄환 관통력 개수
        this.homing = false;     // 유도탄 보유 여부
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
    }

    update() {
        // 체력 자연 재생 (HP Regen) - 매 프레임별 치유 비율 반영 (초당 hpRegen 만큼)
        if (this.hp < this.maxHp && this.hpRegen > 0) {
            this.hp = Math.min(this.maxHp, this.hp + (this.hpRegen / 60));
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
        
        // [수정] 몬스터 이중 복합 인플레이션을 완화하는 로그(Log) 스케일링 공식 도입
        let roomFactor = 1.0 + Math.log10(roomNum) * 1.5;

        // 티어별 기본 체력과 속도, 데미지 스케일링 설정
        this.maxHp = Math.ceil((15 + (tier - 1) * 4) * roomFactor); // 체력 증가율 합리적으로 완화
        this.hp = this.maxHp;
        this.atk = Math.ceil((5 + (tier - 1) * 1.5) * roomFactor); // 공격력 인플레이션 해결
        this.speed = 1.2 + Math.min(1.2, (tier - 1) * 0.1);
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
        this.statusEffects = {
            slow: 0,
            vulnerability: 0,
            shock: 0
        };
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
            timeScale = 0.25; // 75% 시간 감속 (몬스터의 액션이 매우 느려짐)
        }

        if (this.flashTimer > 0) this.flashTimer--;

        // 디버프 타이머 차감 (시간 감속 반영)
        if (this.statusEffects.slow > 0) this.statusEffects.slow -= timeScale;
        if (this.statusEffects.vulnerability > 0) this.statusEffects.vulnerability -= timeScale;
        if (this.statusEffects.shock > 0) this.statusEffects.shock -= timeScale;

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

        // 맵 벽 경계선 제한 충돌 처리 (몬스터 맵 이탈 방지)
        const wallMargin = 40;
        this.x = Math.max(wallMargin + this.radius, Math.min(800 - wallMargin - this.radius, this.x));
        this.y = Math.max(wallMargin + this.radius, Math.min(600 - wallMargin - this.radius, this.y));
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
        ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : this.color;
        ctx.fill();

        // 디버프 상태이상 시각 오라 효과 렌더링
        if (this.flashTimer <= 0) {
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
    constructor(direction, scoreValue) {
        this.direction = direction; // 'top', 'bottom', 'left', 'right'
        this.scoreValue = scoreValue; // 이 문을 지나갈 때의 몬스터 마릿수이자 점수
        this.width = 75;
        this.height = 18;
        this.active = true; // 현재 포털 활성화 상태 (전부 격퇴 시)
        this.difficultyClass = 'low'; // 'high', 'mid', 'low' 랭킹 등급 저장

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
        }
    }

    draw(ctx) {
        ctx.save();
        
        // 포털 네온 박스
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        
        let color = this.active ? '#39ff14' : '#ff0055'; // 활성화 시 초록, 전투 중이면 잠겨서 빨강
        ctx.fillStyle = this.active ? 'rgba(57, 255, 20, 0.15)' : 'rgba(255, 0, 85, 0.15)';
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
                
                if (this.direction === 'top') eliteY += 14;
                if (this.direction === 'bottom') eliteY -= 14;
                if (this.direction === 'left') eliteX += 20;
                if (this.direction === 'right') eliteX -= 20;
                
                ctx.fillText("[ELITE]", eliteX, eliteY);
                ctx.restore();
            }
        }

        ctx.restore();
    }

    // 플레이어가 문 안으로 깊숙이 진입했는지 영역 충돌 판단
    checkCollision(player) {
        if (!this.active) return false;
        
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
        
        // 엔티티 관리 리스트
        this.player = new Player(400, 300);
        this.monsters = [];
        this.bullets = [];
        this.particles = [];
        this.pets = [];
        
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
        
        this.initInputEvents();
        this.setupInitialRoom();
    }

    // 입력 장치 이벤트 바인딩
    initInputEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Spacebar를 누르면 마력 특수기 가동
            if (e.key === ' ' || e.code === 'Space') {
                this.triggerMagicSkill();
            }

            // [테스트용 치트 핫키] P키: 모든 스탯 최강 강화 및 디펜더 펫 2기 소환
            if (e.key === 'p') {
                this.player.atk += 10;
                this.player.multishot += 3;
                this.player.burstCount += 2;
                this.player.range += 200;
                this.player.hpRegen += 5.0;
                this.player.weaponType = 'dual'; // 하이브리드 강제 설정

                let petAngle1 = this.pets.length * (Math.PI * 2 / 3);
                this.pets.push(new Pet(petAngle1, 45));
                let petAngle2 = this.pets.length * (Math.PI * 2 / 3);
                this.pets.push(new Pet(petAngle2, 60));

                this.updateHUD();
                this.showFloatingText("CHEAT: GOD BUILD ACTIVATED", this.player.x, this.player.y - 40, '#ffdf00');
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

        // 마우스 조준 방향 계산을 위해 캔버스 기준 상대 좌표 획득
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // 화면 스케일에 상관없이 정확한 캔버스 내 조준점 확보
            this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 마우스 좌클릭
                this.mouse.isDown = true;
                Sound.init(); // 브라우저 자동 재생 규정 우회
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
    }

    // 게임 시작 시 초기화
    startGame() {
        this.isPlaying = true;
        this.roomNum = 1;
        this.score = 0;
        this.kills = 0;
        
        this.player = new Player(400, 300);
        this.monsters = [];
        this.bullets = [];
        this.particles = [];
        this.pets = [];
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

        this.updateHUD();
        this.setupInitialRoom();
        
        // 매끄러운 60fps 애니메이션 루프 재구동
        requestAnimationFrame(() => this.gameLoop());
        Sound.play('powerup');
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
        
        // v0.3: 문 랭킹 랭크 부여
        this.rankPortals();
        
        // 적이 없는 상태이므로 즉시 모든 문 개방
        this.portals.forEach(p => p.active = true);
        this.monsters = [];
        this.spawnQueue = [];
        
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
        const scoreBonus = portal.scoreValue;
        this.score += scoreBonus; // 획득 점수 축적
        
        // 진입한 문의 난이도 등급 저장 (보상 등급 강화에 적용)
        this.lastEnteredPortalClass = portal.difficultyClass || 'low';

        // 5의 배수 방(10의 배수 보스방 제외) 진입 시 엘리트 활성화 여부 세팅
        let nextRoomNum = this.roomNum + 1;
        if (nextRoomNum % 5 === 0 && nextRoomNum % 10 !== 0) {
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
            // 입장 방향을 제외한 나머지 3개 스폰 대상 포털 추출
            const targetPortals = this.portals.filter(p => p.direction !== this.lastEnteredPortalDir);
            
            // 시계 방향 정렬 순서 준비 (겹쳤을 때 플레이어 입장 방향의 왼쪽부터 시계방향순 타이브레이커)
            const dirOrder = ['top', 'right', 'bottom', 'left'];
            let entryIdx = dirOrder.indexOf(this.lastEnteredPortalDir);
            // 시계 방향 정렬 기준 인덱스: (entryIdx + 1) % 4 가 가장 우선순위가 높은 "왼쪽"
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
                // 동률인 경우 시계 방향 우선권
                return pOrder.indexOf(a.direction) - pOrder.indexOf(b.direction);
            });

            // 정렬된 결과 매칭
            // 0번째 (가장 높은 것): 방식 3
            // 1번째 (중간 것): 방식 2
            // 2번째 (가장 낮은 것): 방식 1
            let chosenIdx = sortedPortals.findIndex(p => p.direction === portal.direction);
            if (chosenIdx === 0) {
                this.spawnMethod = 3;
            } else if (chosenIdx === 1) {
                this.spawnMethod = 2;
            } else {
                this.spawnMethod = 1;
            }
        }

        // 스폰 제어 변수들 다음 방 진입 대비 리셋
        this.spawnedInRoom = 0;
        this.method2DelayDone = false;

        this.roomNum++; // 스테이지 증가
        
        // 100 스테이지 달성 시 최종 승리 클리어
        if (this.roomNum > 100) {
            this.triggerGameClear();
            return;
        }

        // 플레이어 캐릭터 좌표를 해당 포털 방향의 정반대 문 앞으로 워프 이동
        if (portal.direction === 'top') {
            this.player.x = 400;
            this.player.y = 510;
            this.lastEnteredPortalDir = 'bottom'; // 아래 문으로 진입한 것과 마찬가지
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

        // 다음 방의 문 상태 초기화 (전부 몬스터 처치 전까지 잠금 붉은색)
        this.portals = [
            new RoomPortal('top', this.getRandomScoreValue()),
            new RoomPortal('bottom', this.getRandomScoreValue()),
            new RoomPortal('left', this.getRandomScoreValue()),
            new RoomPortal('right', this.getRandomScoreValue())
        ];
        this.rankPortals(); // 등급 랭킹화
        this.portals.forEach(p => p.active = false);

        // 탄환 전체 청소 및 기존 몬스터 삭제
        this.bullets = [];
        this.particles = [];

        // 5번 방 주기마다 보스전 활성화 (5, 10, 15... 100)
        // 10의 배수는 무조건 보스방으로 기동!
        if (this.roomNum % 10 === 0) {
            this.setupBossRoom();
        } else {
            // 일반 혹은 엘리트 몬스터 스폰 큐 예약
            this.queueSequentialSpawns(scoreBonus);
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
        this.shakeScreen(30, 8);
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
            if (this.player.mp < this.player.maxMp) return;

            // 마력 소모 및 화면 초토화 흔들림
            this.player.mp = 0;
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
            // 시간 왜곡 토글 처리
            if (this.timeDilationActive) {
                // 이미 활성화된 상태라면 수동 비활성화 (마나는 그대로 유지)
                this.timeDilationActive = false;
                this.showFloatingText("TIME FLOW RESTORED", this.player.x, this.player.y - 30, '#00f0ff');
                Sound.play('powerup');
            } else {
                // 활성화 시도
                if (this.player.mp < this.player.maxMp) {
                    this.showFloatingText("NEED FULL MP", this.player.x, this.player.y - 20, '#ff0055');
                    return;
                }
                
                this.timeDilationActive = true;
                this.shakeScreen(20, 4);
                this.showFloatingText("🔮 TIME WARP ACTIVE", this.player.x, this.player.y - 30, '#b026ff');
                
                // 시간왜곡 발동 피드백 아르페지오 사운드 재생
                Sound.play('victory');
            }
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
                synergyMultiplier = 1.8;
                synergyName = "💥 NEON BOMBER!";
                synergyColor = '#ffdf00'; // 황금 옐로우
            }
            // 2. [샷건 전탄 집중 화력 (Shotgun Burst)]
            // 조건: 멀티샷 2발 이상, 힘(ATK) 25 이상 (폭격기 하위 호환)
            else if (p.multishot >= 2 && p.atk >= 25) {
                synergyMultiplier = 1.2;
                synergyName = "🏹 SHOTGUN BURST!";
                synergyColor = '#00f0ff'; // 시안
            }
        } else if (type === 'sword') {
            // 3. [질풍의 마력 네온 검사 (Neon Tempest)]
            // 조건: 검 또는 듀얼 소유, 공격속도(지능) 1.6 이상, 힘(공격력) 20 이상
            if ((p.weaponType === 'sword' || p.weaponType === 'dual') && p.aspd >= 1.6 && p.atk >= 20) {
                synergyMultiplier = 1.5;
                synergyName = "🪓 NEON TEMPEST!";
                synergyColor = '#b026ff'; // 퍼플
            }
            // 4. [차원 유도 환영검 (Spectral Blade)]
            // 조건: 검 또는 듀얼 소유, 유도 추적 보유
            else if ((p.weaponType === 'sword' || p.weaponType === 'dual') && p.homing) {
                synergyMultiplier = 1.3;
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
        if (!this.isPlaying) return;

        this.update();
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    // 데이터 갱신 및 물리/충돌 검사 총괄
    update() {
        this.player.update();

        // [추가] 시간 왜곡 마법 가동 시 마력(MP) 소모 및 파티클 기믹 처리
        if (this.timeDilationActive) {
            // 매 프레임 마력 감쇄 (약 5초간 유지: 100 MP / 300 프레임 = 프레임당 약 0.33)
            this.player.mp = Math.max(0, this.player.mp - 0.33);
            
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
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;

        // 8방향 대각선 이동 시 루트2 정규화 속도 보정 적용
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        // Shift 달리기 가속 및 스태미너 소모 물리 연산
        let currentSpeed = this.player.ms;
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

        // 4. 주무기 격발 메커니즘 (마우스 클릭 시 사격)
        if (this.mouse.isDown && this.player.shootCooldown <= 0 && (this.player.weaponType === 'gun' || this.player.weaponType === 'dual')) {
            this.shootWeapon();
        }
        if (this.mouse.isDown && this.player.slashCooldown <= 0 && (this.player.weaponType === 'sword' || this.player.weaponType === 'dual')) {
            this.slashWeapon();
        }

        // 5. 탄환 물리 비행 및 유도 연산
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.update(this.monsters);
            
            // 화면 밖으로 나가거나 수명이 다하면 소멸
            if (b.x < 35 || b.x > 765 || b.y < 35 || b.y > 565 || b.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }

        // 6. 몬스터 거동 및 충돌 판정
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            
            // 몬스터끼리 과하게 뭉치는 현상 해결 (겹침 방지 Separation 물리 연산 추가)
            for (let j = i - 1; j >= 0; j--) {
                let other = this.monsters[j];
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

                        let finalDmg = this.player.atk * 1.5 * synergyMult;
                        if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                        m.hp -= finalDmg; // 칼은 50% 강력한 계수 피해
                        m.flashTimer = 5;
                        m.knockbackX = Math.cos(targetAngle) * 6; // 대폭 넉백
                        m.knockbackY = Math.sin(targetAngle) * 6;
                        
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
                        
                        // 탄환 성격별 디버프 부여
                        if (b.splash > 0) {
                            m.statusEffects.shock = 60; // 기절 1초
                        } else {
                            m.statusEffects.slow = 180; // 감속 3초
                        }

                        // 데미지 계산 및 백색 깜빡임 피드백 (취약 데미지 증폭)
                        let finalDmg = b.damage;
                        if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                        m.hp -= finalDmg;
                        m.flashTimer = 5;
                        
                        // 넉백 발생
                        let hitAngle = Math.atan2(m.y - b.y, m.x - b.x);
                        m.knockbackX = Math.cos(hitAngle) * 2;
                        m.knockbackY = Math.sin(hitAngle) * 2;

                        Sound.play('hit');

                        // 스플래시 범위 폭발 카드 속성 연산
                        if (b.splash > 0) {
                            this.triggerBulletSplash(b.x, b.y, b.splash, b.damage * 0.7);
                        }

                        // 스파크 파티클 생성
                        for (let k = 0; k < 5; k++) {
                            let speed = Math.random() * 3 + 1;
                            this.particles.push(new Particle(b.x, b.y, b.color, 2, Math.cos(hitAngle + Math.random() - 0.5) * speed, Math.sin(hitAngle + Math.random() - 0.5) * speed, 15));
                        }

                        // 관통 횟수 차감 및 소멸
                        if (b.pierce > 0) {
                            b.pierce--;
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

        // 8. 4개 문(포털) 진입 체크
        if (this.monsters.length === 0 && this.spawnQueue.length === 0) {
            // 모든 적 소탕 시 문 개방(active) 및 보상 오버레이 띄우기 트리거
            if (this.portals.length > 0 && !this.portals[0].active) {
                this.portals.forEach(p => p.active = true);
                
                // 안전 지대인 1스테이지 시작 방 제외, 전투 끝났을 때만 보상 지급
                if (this.roomNum > 1 || this.kills > 0) {
                    this.triggerRewardSelector();
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

        // 게이지 바 텍스트 실시간 출력 동기화
        this.updateHUD();
    }

    // 몬스터 처치 성공
    killMonster(m, index) {
        this.monsters.splice(index, 1);
        this.kills++;
        this.comboCount++;
        this.comboTimer = 180; // 콤보 유효 시간 3초 제공
        
        // 점수 획득 (티어 보정치 반영 - 엘리트는 생성 시 이미 scoreValue가 5배임)
        this.score += m.scoreValue * 2;
        
        // 몬스터 처치 시 마력(MP) 게이지 충전
        let mpGain = 4 + (this.player.luk * 0.5); // 운 스탯이 높을수록 마력 충전량 상승
        if (m.isElite) mpGain *= 5; // 엘리트 몬스터 처치 시 MP 충전량 5배!
        this.player.mp = Math.min(this.player.maxMp, this.player.mp + mpGain);

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
        } else {
            this.shakeScreen(6, 3);
        }

        // 몬스터 사망 효과음
        Sound.play('hit');
    }

    // 플레이어 피격 연산 (회피 확률 연계)
    damagePlayer(amount, fromX, fromY) {
        // 민첩(evd) 스탯 기반으로 회피 성공 여부 판정
        if (Math.random() < this.player.evd) {
            // 회피 대성공! 1~2px 붉은색 잔상 실루엣 및 DODGE 피드백 가동
            this.player.triggerEvade(fromX, fromY);
            
            // "MISS / DODGE" 데미지 텍스트 팝업 이펙트 연출을 위한 가짜 파티클 생성
            // 텍스트는 캔버스 렌더러에 직접 그리는 방식을 사용하므로 dodge 팝업 띄움
            this.showFloatingText("DODGE", this.player.x, this.player.y - 20, '#ff0055');
            return;
        }

        // 회피에 실패하면 쉴드나 방어율(최대체력/200)을 감산하여 최종 데미지 적용
        // 힘(ATK) 스탯이나 방어 스탯에 의해 경감
        let defense = (this.player.maxHp - 100) * 0.15; // 최대 HP가 기본값 100보다 클수록 15% 방어력 감소율 획득
        let finalDamage = Math.max(1, amount - defense);
        
        this.player.hp = Math.max(0, this.player.hp - finalDamage);
        this.shakeScreen(15, 6);
        Sound.play('hit');

        // 피격 시 붉은 불꽃 파편
        for (let k = 0; k < 8; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 4 + 1;
            this.particles.push(new Particle(this.player.x, this.player.y, '#ff0055', 2.5, Math.cos(angle) * speed, Math.sin(angle) * speed, 20));
        }

        // 캐릭터 사망 시 게임오버
        if (this.player.hp <= 0) {
            this.triggerGameOver();
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

    // 총탄 주무기 발사 메커니즘
    shootWeapon() {
        // 지능(aspd)에 연동한 연사 쿨타임 주기 (기본 초당 1.0번 공격 -> 60프레임 / aspd)
        let cooldownFrames = Math.max(10, 60 / this.player.aspd);
        this.player.shootCooldown = cooldownFrames;
        
        let startAngle = this.player.angle;
        let bulletsToLaunch = [];

        // 멀티샷(multishot) 부채꼴 살상 각도 배치
        if (this.player.multishot === 1) {
            bulletsToLaunch.push(startAngle);
        } else {
            let arcSpan = 0.45; // 부채꼴 퍼짐 각도 범위
            let step = arcSpan / (this.player.multishot - 1);
            for (let i = 0; i < this.player.multishot; i++) {
                let targetAngle = startAngle - (arcSpan / 2) + (step * i);
                bulletsToLaunch.push(targetAngle);
            }
        }

        // 점사(burstCount) 횟수에 따른 0.08초 간격 순차 격발 큐 설정
        // 점사는 매끄럽게 프레임을 쪼개서 bullets list에 주입
        let fireBulletPack = () => {
            // [모델 C] 투사체 사격 시너지 곱연산 대미지 배율 산출
            let synergyMult = this.checkBuildSynergy('gun');
            let finalDamage = this.player.atk * synergyMult; // 시너지 뻥튀기 반영!

            for (let angle of bulletsToLaunch) {
                let speed = 7.0;
                let vx = Math.cos(angle) * speed;
                let vy = Math.sin(angle) * speed;
                let bulletLife = this.player.range / speed;
                
                this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                    pierce: this.player.pierceCount,
                    homing: this.player.homing,
                    splash: this.player.splashRadius,
                    color: '#00f0ff',
                    radius: 4,
                    life: bulletLife
                }));
            }
            Sound.play('shoot');
            this.shakeScreen(3, 1.2);
        };

        // 점사 딜레이 실행
        for (let b = 0; b < this.player.burstCount; b++) {
            if (b === 0) {
                fireBulletPack();
            } else {
                setTimeout(() => {
                    if (this.isPlaying && !this.player.isSlashActive) {
                        fireBulletPack();
                    }
                }, b * 90);
            }
        }
    }

    // 근접 검 베기 메커니즘
    slashWeapon() {
        // 공속 쿨타임 적용
        let cooldownFrames = Math.max(15, 50 / this.player.aspd);
        this.player.slashCooldown = cooldownFrames;
        
        let fireSlashPack = () => {
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

            // [보정 A] 멀티샷 부채꼴 검풍 사출
            let startAngle = this.player.angle;
            let anglesToLaunch = [];
            if (this.player.multishot === 1) {
                anglesToLaunch.push(startAngle);
            } else {
                let arcSpan = 0.45; // 부채꼴 퍼짐 각도 범위
                let step = arcSpan / (this.player.multishot - 1);
                for (let i = 0; i < this.player.multishot; i++) {
                    let targetAngle = startAngle - (arcSpan / 2) + (step * i);
                    anglesToLaunch.push(targetAngle);
                }
            }

            let synergyMult = this.checkBuildSynergy('sword');
            let swordDmg = this.player.atk * 1.2 * synergyMult; // 검기 투사체 기본 피해 계수

            for (let angle of anglesToLaunch) {
                let speed = 6.0;
                let vx = Math.cos(angle) * speed;
                let vy = Math.sin(angle) * speed;
                this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, swordDmg, true, {
                    // [수정] 무제한 99회 관통에서 최대 5회 제한 캡으로 하향 패치 적용
                    pierce: Math.min(5, this.player.pierceCount + 1), 
                    homing: this.player.homing,
                    splash: this.player.splashRadius,
                    color: '#b026ff',
                    radius: 5
                }));
            }
        };

        // [보정 B] burstCount 횟수만큼 검을 시간차 연속 휘두름 (콤보 난무)
        for (let b = 0; b < this.player.burstCount; b++) {
            if (b === 0) {
                fireSlashPack();
            } else {
                setTimeout(() => {
                    if (this.isPlaying && this.player.isSlashActive) {
                        fireSlashPack();
                    }
                }, b * 90);
            }
        }
    }

    // HUD 데이터 동기화 및 바 게이지 드로잉
    updateHUD() {
        document.getElementById('room-counter').innerText = `${this.roomNum} / 100`;
        document.getElementById('score-counter').innerText = this.score;
        document.getElementById('monster-counter').innerText = `${this.monsters.length} / ${this.currentSpawnTotal}`;

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
        } else if (this.player.mp >= this.player.maxMp) {
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
        if (this.player.weaponType === 'dual') wpnStr = "검 + 총 (Hybrid)";
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
    triggerRewardSelector() {
        const overlay = document.getElementById('reward-overlay');
        overlay.classList.remove('hidden');

        // [엘리트/보스 보상 기획 연계] 5의 배수 방 여부 체크
        const isWeaponReward = (this.roomNum % 5 === 0);
        let bonusText = "";
        
        if (isWeaponReward) {
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
        const cardsData = this.generateRewardCardsData(this.currentSpawnTotal);

        cardContainers.forEach((cardEl, idx) => {
            const data = cardsData[idx];
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
                this.applyRewardCard(data);
                overlay.classList.add('hidden');
            };
        });
    }

    // 몬스터 처치량 비례하여 등급 가중치 보정이 연동되는 랜덤 카드 데이터 3종 조각 생성
    generateRewardCardsData(monsterBonus) {
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
            { id: 'multishot', title: '멀티샷 (Multi-Shot)', icon: '🏹', desc: '한 번 사격 시 부채꼴 형태로 다중 탄환이 뿜어져 나갑니다.' },
            { id: 'burst', title: '점사 (Burst Fire)', icon: '🔫', desc: '마우스 조준 방향으로 다다닥 연속 탄환을 연사합니다.' },
            { id: 'pierce', title: '관통 탄환 (Pierce)', icon: '💎', desc: '탄환이 몬스터에 맞고 소멸하지 않고 관통 횟수를 획득합니다.' },
            { id: 'homing', title: '유도 추적탄 (Homing)', icon: '🔮', desc: '탄환이 주변에서 가장 가까운 적을 유성처럼 유도 비행합니다.' },
            { id: 'splash', title: '스플래시 탄 (Splash)', icon: '💥', desc: '탄환 명중 지점에 네온 대폭발을 발생시켜 다수의 적을 몰살합니다.' },
            { id: 'pet', title: '디펜더 펫 (PET) 동행', icon: '🤖', desc: '주위를 돌며 적 탄환을 막고 유도탄을 사격하는 디펜더 드론을 추가 소환합니다.' },
            { id: 'magic_timewarp', title: '시간 왜곡 마법 (Time Warp)', icon: '🔮', desc: '특수 마법을 마나 소모형 불릿타임 시간 왜곡으로 교체합니다.' }
        ];

        // 5의 배수 방을 클리어했을 때만 상위 카드(weaponCards)가 확정 등장하며 일반 방에선 statusCards만 등장!
        const isWeaponReward = (this.roomNum % 5 === 0);
        let pool = isWeaponReward ? weaponCards : statusCards;

        // 3개의 유니크한 카드를 선별
        const chosenCards = [];
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const cardsToSelect = Math.min(3, shuffled.length);

        // 보상 등급 보정 (몬스터 처치량 비례 가중치 + 운 스탯 계수 추가)
        let portalLuckBonus = 0;
        if (isWeaponReward) {
            // 모델 A 융합: 진입했던 포털 난이도 상/중/하에 따라 희귀도 고정 보정 대폭 차등화!
            if (this.lastEnteredPortalClass === 'high') portalLuckBonus = 0.9;      // Epic, Legendary 확정
            else if (this.lastEnteredPortalClass === 'mid') portalLuckBonus = 0.45;  // Rare, Epic 위주
            else portalLuckBonus = -0.15; // low 문으로 도망쳐 오면 Common, Rare 중심
        } else {
            // 일반 방은 몬스터 스폰 수와 플레이어 LUK 스탯 가중치 합산
            portalLuckBonus = monsterBonus * 0.02 + (this.player.luk - 1) * 0.12;
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
                value = Math.ceil(2 * mult); // 기본 3에서 2로 미세 하향 조율 (모델 C 팽팽함 보정)
                desc = `공격 피해량이 +${value} 만큼 영구히 상승합니다.`;
                break;
            case 'aspd':
                value = 0.12 * mult; // 기본 0.2에서 0.12로 하향
                desc = `공격 연사 속도가 +${value.toFixed(2)}배 빨라집니다.`;
                break;
            case 'ms':
                value = 0.25 * mult; // 기본 0.35에서 0.25로 하향
                desc = `플레이어 이동 속도가 +${value.toFixed(2)} 증가합니다.`;
                break;
            case 'evd':
                value = 0.02 * mult; // 기본 0.03에서 0.02로 하향
                desc = `적 공격을 물리적으로 비껴낼 회피율이 +${(value * 100).toFixed(0)}% 보강됩니다.`;
                break;
            case 'hp':
                value = Math.ceil(15 * mult); // 기본 20에서 15로 하향
                desc = `최대 체력이 +${value} 늘어나며 동시에 실시간 체력을 회복합니다.`;
                break;
            case 'luk':
                value = 0.15 * mult; // 기본 0.25에서 0.15로 하향
                desc = `카드 행운 계수가 +${value.toFixed(2)} 올라가 고등급 획득에 크게 기여합니다.`;
                break;
            case 'stamina':
                value = Math.ceil(15 * mult); // 기본 25에서 15로 하향
                desc = `최대 대시용 기력이 +${value}만큼 증가합니다.`;
                break;
            case 'sword':
                desc = `주무기에 광역 반원 베기 모션(검)을 영구 장착합니다. (복합 하이브리드 공격 가능)`;
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
                value = Math.ceil(25 + (15 * mult)); // 기본 35+20*mult에서 25+15*mult로 하향
                desc = `탄환 명중 시 반경 ${value}px 범위에 대폭발을 일으켜 광역 데미지를 입힙니다.`;
                break;
            case 'hpRegen':
                value = 0.5 * mult;
                desc = `초당 체력 자연 재생량이 +${value.toFixed(2)} 만큼 영구 증가합니다.`;
                break;
            case 'range':
                value = Math.ceil(40 * mult);
                desc = `탄환 사거리 및 검의 리치(베기 반경)가 +${value}px 만큼 영구 상승합니다.`;
                break;
            case 'pet':
                desc = `플레이어를 호위하며 적 탄환을 소멸시키고 유도 레이저를 사격하는 공전 드론을 추가 1기 소환합니다.`;
                break;
            case 'magic_timewarp':
                desc = `특수기를 마력 소모형 불릿타임 시간 왜곡으로 영구 교체합니다. 5초간 시간이 75% 느리게 흐릅니다.`;
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
                // [수정] 복리 덧셈에서 '한계 효용 체감 공식' 적용 (EVD 최대 60% 수렴 캡으로 완화)
                p.evd = p.evd + card.effectValue * (0.6 - p.evd);
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
                if (p.weaponType === 'gun') {
                    p.weaponType = 'sword'; // 총에서 칼로 변경
                } else if (p.weaponType === 'sword') {
                    p.weaponType = 'dual'; // 칼이 있었으면 하이브리드 검+총 융합!
                }
                break;
            case 'multishot':
                p.multishot += card.effectValue;
                p.weaponType = p.weaponType === 'sword' ? 'dual' : p.weaponType; // 총 사격 속성 강제 활성화
                break;
            case 'burst':
                p.burstCount += card.effectValue;
                p.weaponType = p.weaponType === 'sword' ? 'dual' : p.weaponType;
                break;
            case 'pierce':
                p.pierceCount += card.effectValue;
                p.weaponType = p.weaponType === 'sword' ? 'dual' : p.weaponType;
                break;
            case 'homing':
                p.homing = true;
                p.weaponType = p.weaponType === 'sword' ? 'dual' : p.weaponType;
                break;
            case 'splash':
                p.splashRadius = Math.max(p.splashRadius, card.effectValue);
                p.weaponType = p.weaponType === 'sword' ? 'dual' : p.weaponType;
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
        }

        // HUD 및 사운드 발생
        this.updateHUD();
        Sound.play('powerup');
    }

    // --------------------------------------------------------------------------
    // 10. 엔드 게임 상태 트리거 (게임오버 / 클리어)
    // --------------------------------------------------------------------------
    triggerGameOver() {
        this.isPlaying = false;
        Sound.play('gameover');
        
        document.getElementById('result-title').innerText = "GAME OVER";
        document.getElementById('result-title').className = "text-glow-red";
        document.getElementById('result-message').innerText = "깊고 어두운 미로 속에서 힘이 다해 쓰러졌습니다...";
        
        this.populateResultOverlay();
    }

    triggerGameClear() {
        this.isPlaying = false;
        Sound.play('victory');
        
        document.getElementById('result-title').innerText = "VICTORY ESCAPE!";
        document.getElementById('result-title').className = "text-glow-green";
        document.getElementById('result-message').innerText = "100개의 미로 방을 돌파하고 네온의 던전을 무사히 탈출했습니다!";
        
        this.populateResultOverlay();
    }

    // 모달창 최종 통계 수치 기입
    populateResultOverlay() {
        document.getElementById('res-room').innerText = `${Math.min(100, this.roomNum)} / 100`;
        document.getElementById('res-score').innerText = this.score;
        document.getElementById('res-kills').innerText = this.kills;
        
        let wpnStr = "총 (Gun)";
        if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
        if (this.player.weaponType === 'dual') wpnStr = "검 + 총 (하이브리드)";
        document.getElementById('res-wpn').innerText = wpnStr;

        document.getElementById('result-overlay').classList.remove('hidden');
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
            this.ctx.font = '600 13px "Outfit"';
            this.ctx.fillStyle = '#39ff14';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#39ff14';
            
            if (this.roomNum === 1 && this.kills === 0) {
                this.ctx.fillText("방의 문(포털)을 통과하여 다음 방으로 전진하세요! (문 위 숫자는 몬스터 수 & 획득 점수)", 400, 275);
            } else {
                this.ctx.fillText("방 소탕 완료! 원하는 문으로 들어가서 탈출을 향해 전진하세요.", 400, 275);
            }
            this.ctx.restore();
        }

        this.ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 12. 웹 브라우저 실행 스크립트 연결
// --------------------------------------------------------------------------
window.onload = () => {
    // 엔진 로드
    window.gameEngine = new GameEngine();
};
