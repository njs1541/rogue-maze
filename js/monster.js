// --------------------------------------------------------------------------
// 5. 몬스터 클래스 (다양한 티어 및 AI)
// --------------------------------------------------------------------------
class Monster {
    constructor(x, y, tier, roomNum = 1) {
        this.x = x;
        this.y = y;
        this.tier = tier;
        this.roomNum = roomNum;
        
        let roomFactor = 1.0 + Math.log10(roomNum) * 1.2 + (roomNum / 20) * 0.6;
        let weaponRoomMultiplier = (window.gameEngine && window.gameEngine.currentRoomType === 'weapon') ? 1.25 : 1.0;

        // 기본 스탯 스케일링
        this.maxHp = Math.ceil((15 + (tier - 1) * 4) * roomFactor * weaponRoomMultiplier);
        this.atk = Math.ceil((5 + (tier - 1) * 1.5) * roomFactor * weaponRoomMultiplier);
        this.speed = 1.2 + Math.min(1.2, (tier - 1) * 0.1);
        if (roomNum >= 50) this.speed = Math.min(2.2, this.speed);
        
        this.scoreValue = tier;
        this.isElite = false;
        this.isBoss = false;

        // 1. 방 번호에 따른 몬스터 타입 무작위 배정
        let typeRand = Math.random();
        if (roomNum < 4) {
            this.type = 'normal';
        } else if (roomNum < 7) {
            this.type = typeRand < 0.5 ? 'normal' : (typeRand < 0.8 ? 'chaser' : 'exploder');
        } else if (roomNum < 11) {
            this.type = typeRand < 0.35 ? 'normal' : (typeRand < 0.6 ? 'chaser' : (typeRand < 0.75 ? 'shooter' : (typeRand < 0.9 ? 'exploder' : 'splitter')));
        } else if (roomNum < 16) {
            this.type = typeRand < 0.25 ? 'normal' : (typeRand < 0.45 ? 'chaser' : (typeRand < 0.6 ? 'shooter' : (typeRand < 0.7 ? 'exploder' : (typeRand < 0.8 ? 'splitter' : (typeRand < 0.9 ? 'teleporter' : 'scatterer')))));
        } else if (roomNum < 22) {
            this.type = typeRand < 0.2 ? 'normal' : (typeRand < 0.35 ? 'chaser' : (typeRand < 0.5 ? 'shooter' : (typeRand < 0.6 ? 'exploder' : (typeRand < 0.7 ? 'splitter' : (typeRand < 0.8 ? 'teleporter' : (typeRand < 0.9 ? 'scatterer' : (typeRand < 0.95 ? 'tanker' : 'summoner')))))));
        } else {
            this.type = typeRand < 0.15 ? 'normal' : (typeRand < 0.28 ? 'chaser' : (typeRand < 0.4 ? 'shooter' : (typeRand < 0.5 ? 'exploder' : (typeRand < 0.6 ? 'splitter' : (typeRand < 0.7 ? 'teleporter' : (typeRand < 0.8 ? 'scatterer' : (typeRand < 0.88 ? 'tanker' : (typeRand < 0.94 ? 'summoner' : 'healer'))))))));
        }

        // 2. 타입별 세부 속성 및 네온 색상 보정
        this.color = '#ff0055';
        this.glowColor = '#ff0055';
        this.fillColor = 'rgba(255, 0, 85, 0.12)';

        switch(this.type) {
            case 'normal':
                this.radius = 12 + Math.min(8, tier);
                break;
            case 'chaser':
                this.radius = 9 + Math.min(5, tier);
                this.speed *= 1.35;
                this.maxHp = Math.ceil(this.maxHp * 0.75);
                this.color = '#ffaa00';
                this.glowColor = '#ffaa00';
                this.fillColor = 'rgba(255, 170, 0, 0.12)';
                this.dashCooldown = 60;
                break;
            case 'shooter':
                this.radius = 14 + Math.min(6, tier);
                this.maxHp = Math.ceil(this.maxHp * 1.2);
                this.speed *= 0.8;
                this.color = '#b026ff';
                this.glowColor = '#b026ff';
                this.fillColor = 'rgba(176, 38, 255, 0.12)';
                this.shootCooldown = 80 + Math.random() * 40;
                break;
            case 'exploder':
                this.radius = 11 + Math.min(5, tier);
                this.maxHp = Math.ceil(this.maxHp * 0.8);
                this.speed *= 1.2;
                this.color = '#ffea00';
                this.glowColor = '#ffea00';
                this.fillColor = 'rgba(255, 234, 0, 0.12)';
                this.explodeTimer = -1;
                break;
            case 'splitter':
                this.radius = 15 + Math.min(7, tier);
                this.maxHp = Math.ceil(this.maxHp * 1.5);
                this.speed *= 0.7;
                this.color = '#00f0ff';
                this.glowColor = '#00f0ff';
                this.fillColor = 'rgba(0, 240, 255, 0.12)';
                break;
            case 'mini':
                this.radius = 7 + Math.min(3, tier);
                this.maxHp = Math.ceil(this.maxHp * 0.35);
                this.speed *= 1.45;
                this.color = '#00e1ff';
                this.glowColor = '#00e1ff';
                this.fillColor = 'rgba(0, 225, 255, 0.12)';
                break;
            case 'scatterer':
                this.radius = 14 + Math.min(6, tier);
                this.maxHp = Math.ceil(this.maxHp * 1.1);
                this.speed *= 0.85;
                this.color = '#ff00aa';
                this.glowColor = '#ff00aa';
                this.fillColor = 'rgba(255, 0, 170, 0.12)';
                this.shootCooldown = 120 + Math.random() * 60;
                break;
            case 'teleporter':
                this.radius = 11 + Math.min(5, tier);
                this.maxHp = Math.ceil(this.maxHp * 0.9);
                this.speed *= 0.95;
                this.color = '#00ffcc';
                this.glowColor = '#00ffcc';
                this.fillColor = 'rgba(0, 255, 204, 0.12)';
                this.teleportCooldown = 180 + Math.random() * 120;
                break;
            case 'tanker':
                this.radius = 20 + Math.min(10, tier);
                this.maxHp = Math.ceil(this.maxHp * 3.0);
                this.speed *= 0.6;
                this.color = '#e2e8f0';
                this.glowColor = '#a0aec0';
                this.fillColor = 'rgba(226, 232, 240, 0.12)';
                this.isTanker = true;
                break;
            case 'summoner':
                this.radius = 15 + Math.min(5, tier);
                this.maxHp = Math.ceil(this.maxHp * 1.3);
                this.speed *= 0.75;
                this.color = '#8b5cf6';
                this.glowColor = '#8b5cf6';
                this.fillColor = 'rgba(139, 92, 246, 0.12)';
                this.summonCooldown = 240 + Math.random() * 120;
                break;
            case 'healer':
                this.radius = 13 + Math.min(5, tier);
                this.maxHp = Math.ceil(this.maxHp * 1.1);
                this.speed *= 0.8;
                this.color = '#10b981';
                this.glowColor = '#10b981';
                this.fillColor = 'rgba(16, 185, 129, 0.12)';
                this.healCooldown = 180 + Math.random() * 60;
                break;
        }
        
        this.hp = this.maxHp; // 최종 갱신
        
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
    makeBoss(roomNum, specificType = null, isWeakened = false) {
        this.isBoss = true;
        this.type = specificType || 'boss';
        
        let roomFactor = 1.0 + (roomNum - 1) * 0.05;
        let scaleHp = 1.0;
        let scaleAtk = 1.0;
        let scaleRadius = 1.0;

        if (isWeakened) {
            scaleHp = 0.35;
            scaleAtk = 0.60;
            scaleRadius = 0.65;
        }

        const parseHex = (hex, alpha) => {
            let r = parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // 기본 타입값에 따른 스탯 세팅
        switch (this.type) {
            case 'boss': // 10층 보스: 네온 센티넬
                this.radius = Math.ceil(35 * scaleRadius);
                this.maxHp = Math.ceil((100 + roomNum * 12) * roomFactor * scaleHp);
                this.atk = Math.ceil((15 + roomNum * 0.8) * roomFactor * scaleAtk);
                this.speed = (1.0 + Math.min(1.0, roomNum * 0.01));
                this.color = '#ff3300';
                this.glowColor = '#ff3300';
                this.shootCooldown = 50;
                break;
            case 'boss_chaser': // 20층 보스: 하이퍼 체이서
                this.radius = Math.ceil(32 * scaleRadius);
                this.maxHp = Math.ceil((120 + roomNum * 14) * roomFactor * scaleHp);
                this.atk = Math.ceil((18 + roomNum * 0.9) * roomFactor * scaleAtk);
                this.speed = (1.5 + Math.min(0.8, roomNum * 0.01));
                this.color = '#ffaa00';
                this.glowColor = '#ffaa00';
                this.dashCooldown = 90;
                this.isDashing = 0; // 대시 활성화 프레임 수
                break;
            case 'boss_slime': // 30층 보스: 마더 슬라임
                this.radius = Math.ceil(40 * scaleRadius);
                this.maxHp = Math.ceil((150 + roomNum * 16) * roomFactor * scaleHp);
                this.atk = Math.ceil((12 + roomNum * 0.7) * roomFactor * scaleAtk);
                this.speed = (0.7 + Math.min(0.5, roomNum * 0.005));
                this.color = '#00f0ff';
                this.glowColor = '#00f0ff';
                this.shootCooldown = 60;
                this.hasSplit = false;
                break;
            case 'boss_slime_mini': // 30층 분열 미니 슬라임 보스
                this.radius = Math.ceil(22 * scaleRadius);
                this.maxHp = Math.ceil((80 + roomNum * 8) * roomFactor * scaleHp);
                this.atk = Math.ceil((8 + roomNum * 0.5) * roomFactor * scaleAtk);
                this.speed = (1.3 + Math.min(0.8, roomNum * 0.01));
                this.color = '#00e1ff';
                this.glowColor = '#00e1ff';
                this.shootCooldown = 40;
                break;
            case 'boss_speaker': // 40층 보스: 둠 스피커
                this.radius = Math.ceil(35 * scaleRadius);
                this.maxHp = Math.ceil((140 + roomNum * 15) * roomFactor * scaleHp);
                this.atk = Math.ceil((14 + roomNum * 0.8) * roomFactor * scaleAtk);
                this.speed = 1.0;
                this.color = '#ff00aa';
                this.glowColor = '#ff00aa';
                this.shootCooldown = 45;
                this.laserTimer = 180;
                this.isFixedToCenter = false;
                break;
            case 'boss_warper': // 60층 보스: 보이드 워퍼
                this.radius = Math.ceil(33 * scaleRadius);
                this.maxHp = Math.ceil((180 + roomNum * 18) * roomFactor * scaleHp);
                this.atk = Math.ceil((16 + roomNum * 0.9) * roomFactor * scaleAtk);
                this.speed = 1.1;
                this.color = '#00ffcc';
                this.glowColor = '#00ffcc';
                this.teleportCooldown = 150;
                this.blackholeTimer = 180; // 블랙홀 흡수 구역 타이머
                break;
            case 'boss_portal': // 70층 보스: 차원 차단기
                this.radius = Math.ceil(36 * scaleRadius);
                this.maxHp = Math.ceil((220 + roomNum * 20) * roomFactor * scaleHp);
                this.atk = Math.ceil((10 + roomNum * 0.5) * roomFactor * scaleAtk);
                this.speed = 0.8;
                this.color = '#8b5cf6';
                this.glowColor = '#8b5cf6';
                this.portalSpawned = false;
                this.isInvulnerable = true; // 무적상태 기본 탑재
                break;
            case 'boss_portal_spawner': // 70층 포털 발전기 (부하)
                this.isBoss = false; // 체력바 합산 제외
                this.radius = Math.ceil(24 * scaleRadius);
                this.maxHp = Math.ceil((70 + roomNum * 5) * roomFactor * scaleHp);
                this.atk = 0;
                this.speed = 0;
                this.color = '#a78bfa';
                this.glowColor = '#a78bfa';
                this.summonCooldown = 180;
                break;
            case 'boss_hive': // 80층 보스: 나노 하이브
                this.radius = Math.ceil(38 * scaleRadius);
                this.maxHp = Math.ceil((250 + roomNum * 22) * roomFactor * scaleHp);
                this.atk = Math.ceil((20 + roomNum * 1.0) * roomFactor * scaleAtk);
                this.speed = 0.7;
                this.color = '#e2e8f0';
                this.glowColor = '#a0aec0';
                this.shieldHp = Math.ceil(this.maxHp * 0.5);
                this.maxShieldHp = this.shieldHp;
                this.shieldRechargeTimer = 300;
                this.spawnHealerCooldown = 120;
                this.isTanker = true; // 넉백 완전면제 상속
                break;
            case 'boss_hive_healer': // 80층 보스 보조 힐러 (부하)
                this.isBoss = false;
                this.radius = 12;
                this.maxHp = Math.ceil((40 + roomNum * 2) * roomFactor * scaleHp);
                this.atk = 0;
                this.speed = 1.8;
                this.color = '#10b981';
                this.glowColor = '#10b981';
                this.healCooldown = 120;
                break;
            case 'boss_chaos': // 90층 최종 고유 보스: 카오스 코어
                this.radius = Math.ceil(35 * scaleRadius);
                this.maxHp = Math.ceil((300 + roomNum * 25) * roomFactor * scaleHp);
                this.atk = Math.ceil((22 + roomNum * 1.1) * roomFactor * scaleAtk);
                this.speed = 1.2;
                this.color = '#ff3300';
                this.glowColor = '#ff3300';
                this.element = 'fire'; // 'fire' -> 'lightning' -> 'ice'
                this.elementTimer = 600; // 10초 주기
                this.shootCooldown = 40;
                break;
            case 'boss_final': // 100층 최종 보스: 마더보드 크로노스
                this.radius = Math.ceil(45 * scaleRadius);
                this.maxHp = Math.ceil((500 + roomNum * 30) * roomFactor * scaleHp);
                this.atk = Math.ceil((25 + roomNum * 1.2) * roomFactor * scaleAtk);
                this.speed = 0; // 벽면 고정
                this.color = '#ff0055';
                this.glowColor = '#ff0055';
                this.isInvulnerable = true; // 1페이즈 무적
                this.phase = 1;
                this.turretsSpawned = false;
                this.shootCooldown = 50;
                this.laserWarningTimer = 0;
                this.laserActiveTimer = 0;
                this.laserX = 400;
                break;
            case 'boss_final_turret': // 100층 최종보스 실드 포탑 (부하)
                this.isBoss = false;
                this.radius = 20;
                this.maxHp = Math.ceil((120 + roomNum * 5) * roomFactor * scaleHp);
                this.atk = Math.ceil(15 * roomFactor * scaleAtk);
                this.speed = 0;
                this.color = '#ff4444';
                this.glowColor = '#ff4444';
                this.shootCooldown = 60;
                break;
        }

        this.hp = this.maxHp;
        this.fillColor = parseHex(this.color, 0.12);
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
                let fLvl = (window.gameEngine && window.gameEngine.player) ? (window.gameEngine.player.weaponLevels.fire || 1) : 1;
                let burnDmg = 1.2 * (this.statusEffects.burnStack || 1) * (1 + (fLvl - 1) * 0.15);
                this.hp -= burnDmg;
                this.flashTimer = 3;
                
                // [버그 수정] 화상 도트뎀으로 사망 시 정상적으로 사망 처리 정산 진행
                if (this.hp <= 0 && window.gameEngine) {
                    window.gameEngine.killMonster(this);
                }
                
                if (window.gameEngine && Math.random() < 0.4) {
                    window.gameEngine.particles.push(new Particle(this.x, this.y, '#ff5e00', 1.8, (Math.random()-0.5)*0.8, -Math.random()*1.0, 15, 'spark'));
                }
            }
            if (this.statusEffects.burn <= 0) {
                this.statusEffects.burnStack = 0;
            }
        }

        // [신규] 완전 동결(Frozen) 기절 판정 및 정지 상태 타이머 감쇠
        if (this.statusEffects.freeze >= 100) {
            this.statusEffects.freeze = 0;
            let iceLvl = (window.gameEngine && window.gameEngine.player) ? (window.gameEngine.player.weaponLevels.ice || 1) : 1;
            let freezeDuration = 120 + iceLvl * 30; // 1레벨: 150프레임 (2.5초) ~ 5레벨: 270프레임 (4.5초)
            this.statusEffects.shock = Math.max(this.statusEffects.shock || 0, freezeDuration); // 2.5초~4.5초 스턴
            this.isFrozenActive = freezeDuration; // 얼음껍질 렌더링 유지
            if (window.gameEngine) {
                window.gameEngine.showFloatingText("FROZEN! ❄️", this.x, this.y - 25, '#00f0ff');
                Sound.play('hit');
            }
        }
        if (this.isFrozenActive > 0) {
            this.isFrozenActive -= timeScale;
        }

        // 넉백 감쇠 처리 및 이동도 시간 지연 영향 받음
        if (this.isTanker) {
            this.knockbackX = 0;
            this.knockbackY = 0;
        }
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
        this.angle = angle; // [추가] 렌더링 방향 업데이트를 위해 각도 저장

        // Slow (감속) 상태에 따른 실제 이동 속도 연산
        let activeSpeed = this.speed * timeScale;
        if (this.statusEffects.slow > 0) {
            activeSpeed *= 0.6; // 40% 속도 추가 감소
        }
        if (this.statusEffects.freeze > 0) {
            // [신규] 빙결 게이지 축적율에 따른 추가 비례 감속 (최대 50% 감속)
            activeSpeed *= (1 - (this.statusEffects.freeze / 200));
        }

        // 보스 및 보조 몬스터 AI 제어 분기
        if (this.isBoss || this.type.startsWith('boss_')) {
            const wallMargin = 40;

            switch (this.type) {
                case 'boss': // 10층 네온 센티넬 (기존 보스)
                    if (dist > 100) {
                        this.x += Math.cos(angle) * activeSpeed;
                        this.y += Math.sin(angle) * activeSpeed;
                    }
                    this.shootCooldown -= timeScale;
                    if (this.shootCooldown <= 0) {
                        this.shootCooldown = 90 - Math.min(40, this.tier * 3);
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
                    break;

                case 'boss_chaser': // 20층 하이퍼 체이서
                    if (this.dashCooldown > 0) {
                        this.dashCooldown -= timeScale;
                    }

                    if (this.isDashing > 0) {
                        this.isDashing -= timeScale;
                        // 돌진 중 강한 전진 속도 부여
                        this.x += Math.cos(this.dashAngle) * activeSpeed * 2.8;
                        this.y += Math.sin(this.dashAngle) * activeSpeed * 2.8;

                        // 돌진 경로에 화상 장판 스폰 (5프레임 주기로 스폰하여 최적화)
                        if (window.gameEngine && Math.floor(Date.now() / 83) % 2 === 0) {
                            // 장판 역할을 하는 주황색 입자를 스폰. engine.js 업데이트 루프에서 이 입자들과 플레이어 충돌 검사
                            let trail = new Particle(this.x, this.y, '#ff6a00', 16, 0, 0, 180, 'chaser_fire_trail');
                            trail.atk = this.atk * 0.4; // 밟았을 때 대미지
                            window.gameEngine.particles.push(trail);
                        }
                    } else {
                        // 일반 플레이어 추격
                        this.x += Math.cos(angle) * activeSpeed;
                        this.y += Math.sin(angle) * activeSpeed;
                        this.dashAngle = angle; // 돌진 방향 계속 조준

                        if (this.dashCooldown <= 0 && dist < 280) {
                            this.isDashing = 30; // 30프레임 (0.5초) 돌진
                            this.dashCooldown = 100 + Math.random() * 50; // 돌진 쿨타임
                            Sound.play('boss_alert');
                        }
                    }
                    break;

                case 'boss_slime': // 30층 마더 슬라임
                    if (dist > 80) {
                        this.x += Math.cos(angle) * activeSpeed;
                        this.y += Math.sin(angle) * activeSpeed;
                    }
                    this.shootCooldown -= timeScale;
                    if (this.shootCooldown <= 0) {
                        this.shootCooldown = 75 - Math.min(25, this.tier * 2);
                        // 8방향 탄막 발사
                        for (let i = 0; i < 8; i++) {
                            let bAngle = (i * Math.PI / 4);
                            let vx = Math.cos(bAngle) * 2.5;
                            let vy = Math.sin(bAngle) * 2.5;
                            bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.7, false, {
                                color: '#00f0ff',
                                radius: 5.5
                            }));
                        }
                        Sound.play('shoot');
                    }
                    break;

                case 'boss_slime_mini': // 30층 분열 슬라임 (미니 보스)
                    this.x += Math.cos(angle) * activeSpeed;
                    this.y += Math.sin(angle) * activeSpeed;

                    this.shootCooldown -= timeScale;
                    if (this.shootCooldown <= 0) {
                        this.shootCooldown = 50;
                        // 4방향 십자성 탄막
                        for (let i = 0; i < 4; i++) {
                            let bAngle = angle + (i * Math.PI / 2);
                            let vx = Math.cos(bAngle) * 3.0;
                            let vy = Math.sin(bAngle) * 3.0;
                            bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.6, false, {
                                color: '#00e1ff',
                                radius: 4.5
                            }));
                        }
                        Sound.play('shoot');
                    }
                    break;

                case 'boss_speaker': // 40층 둠 스피커
                    if (!this.isFixedToCenter) {
                        // 맵 중앙으로 이동
                        let cx = 400 - this.x;
                        let cy = 300 - this.y;
                        let cdist = Math.hypot(cx, cy);
                        if (cdist > 5) {
                            this.x += (cx / cdist) * activeSpeed * 1.5;
                            this.y += (cy / cdist) * activeSpeed * 1.5;
                        } else {
                            this.x = 400;
                            this.y = 300;
                            this.isFixedToCenter = true;
                            this.rotationAngle = 0;
                        }
                    } else {
                        // 중앙 고정 회전 탄막
                        this.shootCooldown -= timeScale;
                        if (this.shootCooldown <= 0) {
                            this.shootCooldown = 28;
                            this.rotationAngle = (this.rotationAngle || 0) + 0.12;
                            // 회전하는 6방향 교차 탄막 난사
                            for (let i = 0; i < 6; i++) {
                                let bAngle = this.rotationAngle + (i * Math.PI * 2 / 6);
                                let vx = Math.cos(bAngle) * 2.3;
                                let vy = Math.sin(bAngle) * 2.3;
                                bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.6, false, {
                                    color: '#ff00aa',
                                    radius: 5
                                }));
                            }
                            Sound.play('shoot');
                        }

                        // 격자 레이저 가동 관리
                        this.laserTimer -= timeScale;
                        if (this.laserTimer <= 0) {
                            // 레이저 상태 돌입
                            this.gridLaserActive = 100; // 100프레임 기동 (65프레임 경고선, 35프레임 실 발사 대미지)
                            this.laserTimer = 280 + Math.random() * 80;
                            Sound.play('boss_alert');
                        }
                    }

                    if (this.gridLaserActive > 0) {
                        this.gridLaserActive -= timeScale;
                        // 실 발사 구간 (35프레임 이내)에 진입 시 플레이어 충돌 판정
                        if (this.gridLaserActive <= 35 && this.gridLaserActive > 0 && window.gameEngine) {
                            let pl = window.gameEngine.player;
                            // 격자 레이저 라인: 가로 X줄 (100, 200, 300, 400, 500, 600, 700), 세로 Y줄 (100, 200, 300, 400, 500)
                            // 플레이어 좌표가 해당 축 범위 (두께 20px)에 걸리면 지속 틱 대미지
                            let isHit = false;
                            const thickness = 10; // 중심 기준 좌우 10px씩 총 20px
                            for (let lx = 100; lx <= 700; lx += 100) {
                                if (Math.abs(pl.x - lx) < thickness + pl.radius) isHit = true;
                            }
                            for (let ly = 100; ly <= 500; ly += 100) {
                                if (Math.abs(pl.y - ly) < thickness + pl.radius) isHit = true;
                            }
                            if (isHit) {
                                window.gameEngine.damagePlayer(this.atk * 0.08 * timeScale, this.x, this.y); // 프레임당 틱 대미지
                            }
                        }
                    }
                    break;

                case 'boss_warper': // 60층 보이드 워퍼
                    // 플레이어와 거리 카이팅 (거리 180~250px 유지)
                    if (dist < 180) {
                        this.x -= Math.cos(angle) * activeSpeed * 0.9;
                        this.y -= Math.sin(angle) * activeSpeed * 0.9;
                    } else if (dist > 250) {
                        this.x += Math.cos(angle) * activeSpeed;
                        this.y += Math.sin(angle) * activeSpeed;
                    }

                    this.teleportCooldown -= timeScale;
                    if (this.teleportCooldown <= 0 && dist < 350) {
                        this.teleportCooldown = 200 + Math.random() * 60;
                        let warpAngle = Math.random() * Math.PI * 2;
                        let warpDist = 160 + Math.random() * 80;
                        let targetX = player.x + Math.cos(warpAngle) * warpDist;
                        let targetY = player.y + Math.sin(warpAngle) * warpDist;

                        targetX = Math.max(wallMargin + this.radius, Math.min(800 - wallMargin - this.radius, targetX));
                        targetY = Math.max(wallMargin + this.radius, Math.min(600 - wallMargin - this.radius, targetY));

                        // 텔레포트 파티클 이펙트
                        if (window.gameEngine) {
                            for (let k = 0; k < 12; k++) {
                                let pAngle = Math.random() * Math.PI * 2;
                                let pSpeed = Math.random() * 3 + 1;
                                window.gameEngine.particles.push(new Particle(this.x, this.y, '#00ffcc', 2.0, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15, 'spark'));
                            }
                            // 플레이어를 내 앞 70px 위치로 강제 워프 풀링
                            let pullX = targetX + Math.cos(warpAngle + Math.PI) * 70;
                            let pullY = targetY + Math.sin(warpAngle + Math.PI) * 70;
                            
                            pullX = Math.max(wallMargin + player.radius, Math.min(800 - wallMargin - player.radius, pullX));
                            pullY = Math.max(wallMargin + player.radius, Math.min(600 - wallMargin - player.radius, pullY));

                            player.x = pullX;
                            player.y = pullY;
                            // 플레이어에게 0.3초 (18프레임) 역경직 스턴 부여
                            player.lastHitTimer = 0; // 피격 타이머 리셋 및 스턴 유도용
                            if (player.statusEffects) {
                                player.stamina = Math.max(0, player.stamina - 15); // 스태미너 탈취
                            }
                            window.gameEngine.showFloatingText("VOID PULL! 🌀", player.x, player.y - 30, '#00ffcc');
                            Sound.play('dodge');
                        }

                        this.x = targetX;
                        this.y = targetY;
                    }

                    // 탄 흡수 블랙홀 구역 (항상 보스 주변에 유지됨, engine.js에서 탄환을 삭제)
                    break;

                case 'boss_portal': // 70층 차원 차단기
                    // 포털 스폰이 아직 안 되었다면 즉시 모퉁이에 4개 포털 생성
                    if (!this.portalSpawned && window.gameEngine) {
                        const portalSpots = [
                            { x: 150, y: 150 },
                            { x: 650, y: 150 },
                            { x: 150, y: 450 },
                            { x: 650, y: 450 }
                        ];
                        portalSpots.forEach(spot => {
                            let spawner = new Monster(spot.x, spot.y, this.tier, this.roomNum);
                            spawner.makeBoss(this.roomNum, 'boss_portal_spawner', true);
                            window.gameEngine.monsters.push(spawner);
                        });
                        this.portalSpawned = true;
                        window.gameEngine.showFloatingText("배리어가 활성화되었습니다! 포털을 파괴하세요!", this.x, this.y - 45, '#8b5cf6');
                    }

                    // 무적 상태 동기화 (엔진 내에 포털 스패너 몬스터가 한 마리라도 생존해있다면 무적)
                    if (window.gameEngine) {
                        let spawnersAlive = window.gameEngine.monsters.some(m => m.type === 'boss_portal_spawner' && m.hp > 0 && !m.dead);
                        this.isInvulnerable = spawnersAlive;
                    }

                    // 도망 다니는 이동 AI
                    if (dist < 220) {
                        this.x -= Math.cos(angle) * activeSpeed * 0.95;
                        this.y -= Math.sin(angle) * activeSpeed * 0.95;
                    } else {
                        // 플레이어 주변을 서서히 선회
                        let orbitAngle = angle + Math.PI / 2;
                        this.x += Math.cos(orbitAngle) * activeSpeed * 0.45;
                        this.y += Math.sin(orbitAngle) * activeSpeed * 0.45;
                    }
                    break;

                case 'boss_portal_spawner': // 70층 포털 발전기 (부하)
                    this.summonCooldown -= timeScale;
                    if (this.summonCooldown <= 0 && window.gameEngine) {
                        this.summonCooldown = 180 + Math.random() * 60;
                        let types = ['normal', 'chaser', 'shooter'];
                        let chosenType = types[Math.floor(Math.random() * 3)];
                        let spawnCoords = { x: this.x + (Math.random() * 20 - 10), y: this.y + (Math.random() * 20 - 10) };
                        let enemy = new Monster(spawnCoords.x, spawnCoords.y, this.tier, this.roomNum);
                        enemy.type = chosenType;
                        // 스탯 보정
                        if (chosenType === 'chaser') {
                            enemy.color = '#ffaa00';
                            enemy.speed *= 1.3;
                        } else if (chosenType === 'shooter') {
                            enemy.color = '#b026ff';
                            enemy.shootCooldown = 90;
                        }
                        window.gameEngine.monsters.push(enemy);

                        // 소환 파티클
                        for (let k = 0; k < 6; k++) {
                            let pAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            window.gameEngine.particles.push(new Particle(this.x, this.y, '#a78bfa', 1.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15));
                        }
                        Sound.play('powerup');
                    }
                    break;

                case 'boss_hive': // 80층 나노 하이브
                    // 플레이어 추격
                    this.x += Math.cos(angle) * activeSpeed;
                    this.y += Math.sin(angle) * activeSpeed;

                    // 실드 자연 재생 메커니즘
                    if (this.shieldRechargeTimer > 0) {
                        this.shieldRechargeTimer -= timeScale;
                    } else {
                        // 피격되지 않고 5초 경과 시 매초 실드 6% 재생
                        this.shieldHp = Math.min(this.maxShieldHp, this.shieldHp + (this.maxShieldHp * 0.06 / 60) * timeScale);
                    }

                    // 힐러 소환
                    this.spawnHealerCooldown -= timeScale;
                    if (this.spawnHealerCooldown <= 0 && window.gameEngine) {
                        this.spawnHealerCooldown = 280 + Math.random() * 60;
                        let healerCount = window.gameEngine.monsters.filter(m => m.type === 'boss_hive_healer' && m.hp > 0).length;
                        if (healerCount < 2) {
                            let healer = new Monster(this.x, this.y, this.tier, this.roomNum);
                            healer.makeBoss(this.roomNum, 'boss_hive_healer', true);
                            window.gameEngine.monsters.push(healer);
                            Sound.play('powerup');
                        }
                    }
                    break;

                case 'boss_hive_healer': // 80층 보스 보조 힐러 (부하)
                    // 필드의 보스 하이브를 찾아 그 주변을 졸졸 따름
                    if (window.gameEngine) {
                        let hive = window.gameEngine.monsters.find(m => m.type === 'boss_hive' && m.hp > 0);
                        if (hive) {
                            let hx = hive.x - this.x;
                            let hy = hive.y - this.y;
                            let hdist = Math.hypot(hx, hy);
                            if (hdist > 60) {
                                this.x += (hx / hdist) * activeSpeed * 1.3;
                                this.y += (hy / hdist) * activeSpeed * 1.3;
                            } else {
                                // 보스 근처 선회
                                let orbitAngle = Math.atan2(hy, hx) + Math.PI / 2;
                                this.x += Math.cos(orbitAngle) * activeSpeed * 0.7;
                                this.y += Math.sin(orbitAngle) * activeSpeed * 0.7;
                            }

                            // 치유 파동 가동
                            this.healCooldown -= timeScale;
                            if (this.healCooldown <= 0) {
                                this.healCooldown = 120 + Math.random() * 40;
                                let healed = false;
                                if (hive.hp < hive.maxHp) {
                                    hive.hp = Math.min(hive.maxHp, hive.hp + hive.maxHp * 0.07);
                                    healed = true;
                                }
                                if (hive.shieldHp < hive.maxShieldHp) {
                                    hive.shieldHp = Math.min(hive.maxShieldHp, hive.shieldHp + hive.maxShieldHp * 0.12);
                                    healed = true;
                                }
                                if (healed) {
                                    Sound.play('powerup');
                                    // 힐 파티클
                                    for (let k = 0; k < 6; k++) {
                                        let pAngle = Math.random() * Math.PI * 2;
                                        let pSpeed = Math.random() * 1.5 + 0.5;
                                        window.gameEngine.particles.push(new Particle(hive.x, hive.y, '#10b981', 1.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15));
                                    }
                                }
                            }
                        } else {
                            // 보스가 없으면 플레이어를 향해 자포자기 돌진
                            this.x += Math.cos(angle) * activeSpeed;
                            this.y += Math.sin(angle) * activeSpeed;
                        }
                    }
                    break;

                case 'boss_chaos': // 90층 카오스 코어
                    // 플레이어 카이팅 추격
                    if (dist > 140) {
                        this.x += Math.cos(angle) * activeSpeed;
                        this.y += Math.sin(angle) * activeSpeed;
                    }

                    // 속성 변환 시스템
                    this.elementTimer -= timeScale;
                    if (this.elementTimer <= 0) {
                        this.elementTimer = 600; // 10초 주기
                        if (this.element === 'fire') {
                            this.element = 'lightning';
                            this.color = '#b026ff'; // 보라색
                            this.glowColor = '#b026ff';
                        } else if (this.element === 'lightning') {
                            this.element = 'ice';
                            this.color = '#00f0ff'; // 하늘색
                            this.glowColor = '#00f0ff';
                        } else {
                            this.element = 'fire';
                            this.color = '#ff3300'; // 빨간색
                            this.glowColor = '#ff3300';
                        }
                        if (window.gameEngine) {
                            let title = `ELEMENT: ${this.element.toUpperCase()}! 🔥`;
                            if (this.element === 'lightning') title = `ELEMENT: LIGHTNING! ⚡`;
                            if (this.element === 'ice') title = `ELEMENT: FROST! ❄️`;
                            window.gameEngine.showFloatingText(title, this.x, this.y - 35, this.color);
                            Sound.play('powerup');
                        }
                    }

                    // 속성 전용 격발 AI
                    this.shootCooldown -= timeScale;
                    if (this.shootCooldown <= 0) {
                        this.shootCooldown = 40 + Math.random() * 20;

                        if (this.element === 'fire') {
                            // 화염구: 탄속은 느리지만 피격 판정이 크고 폭발 대미지를 주는 화염구 3발
                            for (let i = -1; i <= 1; i++) {
                                let bAngle = angle + (i * 0.22);
                                let vx = Math.cos(bAngle) * 2.2;
                                let vy = Math.sin(bAngle) * 2.2;
                                bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 1.1, false, {
                                    color: '#ff3300',
                                    radius: 9,
                                    splashRadius: 40 // 스플래시 속성 주입
                                }));
                            }
                        } else if (this.element === 'lightning') {
                            // 번개: 탄속이 매우 빠른 감전 투사체 4발 연사
                            for (let i = -1.5; i <= 1.5; i += 1) {
                                let bAngle = angle + (i * 0.15);
                                let vx = Math.cos(bAngle) * 4.6;
                                let vy = Math.sin(bAngle) * 4.6;
                                let bullet = new Bullet(this.x, this.y, vx, vy, this.atk * 0.65, false, {
                                    color: '#b026ff',
                                    radius: 4.5
                                });
                                bullet.isStunner = true; // [W-08/10] 피격 시 마비 45프레임 유도 속성 마크
                                bullets.push(bullet);
                            }
                        } else if (this.element === 'ice') {
                            // 냉기: 플레이어의 탈출 경로를 막는 6방향 원형 냉동 포탄 방사
                            for (let i = 0; i < 6; i++) {
                                let bAngle = angle + (i * Math.PI / 3);
                                let vx = Math.cos(bAngle) * 2.6;
                                let vy = Math.sin(bAngle) * 2.6;
                                let bullet = new Bullet(this.x, this.y, vx, vy, this.atk * 0.75, false, {
                                    color: '#00f0ff',
                                    radius: 5.5
                                });
                                bullet.isSlower = true; // [W-08/10] 피격 시 플레이어 감속 속성 마크
                                bullets.push(bullet);
                            }
                        }
                        Sound.play('shoot');
                    }
                    break;

                case 'boss_final': // 100층 최종 보스
                    this.x = 400;
                    this.y = 100; // 벽면 고정

                    // 1페이즈 포탑 소환 제어
                    if (!this.turretsSpawned && window.gameEngine) {
                        let leftTurret = new Monster(200, 150, this.tier, this.roomNum);
                        leftTurret.makeBoss(this.roomNum, 'boss_final_turret', true);
                        
                        let rightTurret = new Monster(600, 150, this.tier, this.roomNum);
                        rightTurret.makeBoss(this.roomNum, 'boss_final_turret', true);

                        window.gameEngine.monsters.push(leftTurret);
                        window.gameEngine.monsters.push(rightTurret);
                        this.turretsSpawned = true;
                        window.gameEngine.showFloatingText("보호막 발생기 가동! 발전기를 파괴하세요!", this.x, this.y - 45, '#ff0055');
                    }

                    // 1페이즈 / 2페이즈 실드 판정
                    if (window.gameEngine) {
                        let turretsAlive = window.gameEngine.monsters.some(m => m.type === 'boss_final_turret' && m.hp > 0 && !m.dead);
                        if (this.phase === 1 && !turretsAlive) {
                            this.phase = 2;
                            this.isInvulnerable = false;
                            window.gameEngine.showFloatingText("WARNING: CORE EXPOSED! 🚨", this.x, this.y - 45, '#ff0055');
                            Sound.play('explosion');
                            window.gameEngine.shakeScreen(60, 6);
                        }
                        this.isInvulnerable = (this.phase === 1);
                    }

                    // 페이즈별 탄막 사격
                    this.shootCooldown -= timeScale;
                    if (this.shootCooldown <= 0) {
                        this.shootCooldown = this.phase === 1 ? 55 : 35; // 2페이즈에 딜링 주기가 빨라짐

                        if (this.phase === 1) {
                            // 1페이즈: 플레이어를 향한 빠른 교차 2연사
                            let vx1 = Math.cos(angle - 0.15) * 3.5;
                            let vy1 = Math.sin(angle - 0.15) * 3.5;
                            bullets.push(new Bullet(this.x, this.y, vx1, vy1, this.atk * 0.7, false, {
                                color: '#ff3300',
                                radius: 5
                            }));
                            let vx2 = Math.cos(angle + 0.15) * 3.5;
                            let vy2 = Math.sin(angle + 0.15) * 3.5;
                            bullets.push(new Bullet(this.x, this.y, vx2, vy2, this.atk * 0.7, false, {
                                color: '#ff3300',
                                radius: 5
                            }));
                        } else {
                            // 2페이즈: 나선형 양방향 탄막 + 유도탄 스폰
                            this.rotationAngle = (this.rotationAngle || 0) + 0.15;
                            for (let i = 0; i < 2; i++) {
                                let bAngle = this.rotationAngle + (i * Math.PI);
                                let vx = Math.cos(bAngle) * 2.5;
                                let vy = Math.sin(bAngle) * 2.5;
                                bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.7, false, {
                                    color: '#ff0055',
                                    radius: 5
                                }));
                            }

                            // 15% 확률로 유도구체(Homing Ball) 발사
                            if (Math.random() < 0.15 && window.gameEngine) {
                                let homingBullet = new Bullet(this.x, this.y, Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, this.atk * 1.2, false, {
                                    color: '#ffdd00',
                                    radius: 8.5
                                });
                                homingBullet.homing = true; // 유도 속성 마킹 (engine에서 플레이어 추적 처리)
                                bullets.push(homingBullet);
                            }
                        }
                        Sound.play('shoot');
                    }

                    // 2페이즈 전용: 세로형 거대 청소 레이저 가동 (Sweep Laser)
                    if (this.phase === 2) {
                        if (this.laserWarningTimer <= 0 && this.laserActiveTimer <= 0) {
                            // 레이저 쿨타임 가동 확률 (약 3초마다)
                            if (Math.random() < 0.007) {
                                this.laserWarningTimer = 70; // 1.1초 경고선 렌더링
                                this.laserX = player.x; // 현재 플레이어의 X좌표 조준 고정
                                Sound.play('boss_alert');
                            }
                        }

                        if (this.laserWarningTimer > 0) {
                            this.laserWarningTimer -= timeScale;
                            if (this.laserWarningTimer <= 0) {
                                this.laserActiveTimer = 35; // 0.6초간 실제 레이저 발사
                                if (window.gameEngine) {
                                    Sound.play('explosion');
                                    window.gameEngine.shakeScreen(30, 4.0);
                                }
                            }
                        }

                        if (this.laserActiveTimer > 0) {
                            this.laserActiveTimer -= timeScale;
                            // 레이저 빔 영역: 조준된 [laserX - 40 ~ laserX + 40]
                            if (window.gameEngine) {
                                let pl = window.gameEngine.player;
                                if (Math.abs(pl.x - this.laserX) < 40 + pl.radius && pl.y > 40 && pl.y < 560) {
                                    // 닿으면 지속 틱 데미지 (프레임당 보스 공격력의 12%)
                                    window.gameEngine.damagePlayer(this.atk * 0.12 * timeScale, this.x, this.y);
                                }
                            }
                        }
                    }
                    break;

                case 'boss_final_turret': // 100층 최종보스 실드 발전기 포탑 (부하)
                    // Y: 150 고정형 포탑
                    this.shootCooldown -= timeScale;
                    if (this.shootCooldown <= 0) {
                        this.shootCooldown = 65 + Math.random() * 25;
                        // 플레이어 조준 3방향 부채꼴 발사
                        for (let i = -1; i <= 1; i++) {
                            let bAngle = angle + (i * 0.2);
                            let vx = Math.cos(bAngle) * 3.2;
                            let vy = Math.sin(bAngle) * 3.2;
                            bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.75, false, {
                                color: '#ff4444',
                                radius: 4.5
                            }));
                        }
                        Sound.play('shoot');
                    }
                    break;
            }

            // 보스 이탈 방지 처리 (벽 마진 적용)
            if (this.type !== 'boss_final' && this.type !== 'boss_final_turret') {
                this.x = Math.max(wallMargin + this.radius, Math.min(800 - wallMargin - this.radius, this.x));
                this.y = Math.max(wallMargin + this.radius, Math.min(600 - wallMargin - this.radius, this.y));
            }
            return;
        }

        // 일반 몬스터 AI 제어
        if (this.type === 'exploder' && this.explodeTimer >= 0) {
            this.explodeTimer -= timeScale;
            if (this.explodeTimer <= 0) {
                this.hp = 0;
                this.dead = true;
                
                const explodeRadius = 100;
                const explodeDmg = this.atk * 1.5;
                
                let distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
                if (distToPlayer < explodeRadius + player.radius) {
                    if (window.gameEngine) {
                        window.gameEngine.damagePlayer(explodeDmg, this.x, this.y);
                    }
                }
                
                if (window.gameEngine && window.gameEngine.monsters) {
                    for (let other of window.gameEngine.monsters) {
                        if (other === this || other.dead || other.hp <= 0) continue;
                        let distToOther = Math.hypot(other.x - this.x, other.y - this.y);
                        if (distToOther < explodeRadius + other.radius) {
                            let finalDmg = explodeDmg;
                            if (other.statusEffects && other.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                            other.hp -= finalDmg;
                            other.flashTimer = 5;
                            
                            // [버그 수정] 자폭 피해로 다른 몬스터 사망 시 사망 처리 정산 진행
                            if (other.hp <= 0) {
                                window.gameEngine.killMonster(other);
                            }
                            
                            let knockAngle = Math.atan2(other.y - this.y, other.x - this.x);
                            other.knockbackX += Math.cos(knockAngle) * 5.0;
                            other.knockbackY += Math.sin(knockAngle) * 5.0;
                        }
                    }
                }
                
                if (window.gameEngine) {
                    Sound.play('explosion');
                    window.gameEngine.shakeScreen(10, 4.0);
                    window.gameEngine.showFloatingText("💥 BOOM! 💥", this.x, this.y - 30, '#ffea00');
                    for (let k = 0; k < 15; k++) {
                        let pAngle = Math.random() * Math.PI * 2;
                        let pSpeed = Math.random() * 4 + 1.5;
                        window.gameEngine.particles.push(new Particle(this.x, this.y, '#ffea00', 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 25, 'spark'));
                    }
                }
            }
            
            const wallMargin = 40;
            this.x = Math.max(wallMargin + this.radius, Math.min(800 - wallMargin - this.radius, this.x));
            this.y = Math.max(wallMargin + this.radius, Math.min(600 - wallMargin - this.radius, this.y));
            return;
        }

        if (this.type === 'normal' || this.type === 'splitter' || this.type === 'mini' || this.type === 'tanker') {
            this.x += Math.cos(angle) * activeSpeed;
            this.y += Math.sin(angle) * activeSpeed;
        } 
        else if (this.type === 'chaser') {
            this.dashCooldown -= timeScale;
            if (this.dashCooldown <= 0 && dist < 220) {
                this.knockbackX = Math.cos(angle) * 7;
                this.knockbackY = Math.sin(angle) * 7;
                this.dashCooldown = 120 + Math.random() * 60;
            } else {
                this.x += Math.cos(angle) * activeSpeed;
                this.y += Math.sin(angle) * activeSpeed;
            }

            if (Math.hypot(this.knockbackX, this.knockbackY) > 3.0 && Math.random() < 0.4 && window.gameEngine) {
                let tailAngle = this.angle + Math.PI + (Math.random() - 0.5) * 0.5;
                let pSpeed = Math.random() * 2 + 1;
                window.gameEngine.particles.push(new Particle(
                    this.x - Math.cos(this.angle) * this.radius,
                    this.y - Math.sin(this.angle) * this.radius,
                    '#ffaa00', 1.5,
                    Math.cos(tailAngle) * pSpeed, Math.sin(tailAngle) * pSpeed, 15, 'spark'
                ));
            }
        } 
        else if (this.type === 'shooter') {
            if (dist > 220) {
                this.x += Math.cos(angle) * activeSpeed;
                this.y += Math.sin(angle) * activeSpeed;
            } else if (dist < 150) {
                this.x -= Math.cos(angle) * activeSpeed * 0.9;
                this.y -= Math.sin(angle) * activeSpeed * 0.9;
            } else {
                let sideAngle = angle + Math.PI / 2;
                this.x += Math.cos(sideAngle) * activeSpeed * 0.5;
                this.y += Math.sin(sideAngle) * activeSpeed * 0.5;
            }

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
        else if (this.type === 'exploder') {
            if (dist < 100) {
                this.explodeTimer = 60;
                Sound.play('boss_alert');
            } else {
                this.x += Math.cos(angle) * activeSpeed;
                this.y += Math.sin(angle) * activeSpeed;
            }
        }
        else if (this.type === 'scatterer') {
            if (dist > 220) {
                this.x += Math.cos(angle) * activeSpeed;
                this.y += Math.sin(angle) * activeSpeed;
            } else if (dist < 150) {
                this.x -= Math.cos(angle) * activeSpeed * 0.9;
                this.y -= Math.sin(angle) * activeSpeed * 0.9;
            } else {
                let sideAngle = angle + Math.PI / 2;
                this.x += Math.cos(sideAngle) * activeSpeed * 0.5;
                this.y += Math.sin(sideAngle) * activeSpeed * 0.5;
            }

            this.shootCooldown -= timeScale;
            if (this.shootCooldown <= 0) {
                this.shootCooldown = 120 + Math.random() * 60;
                for (let i = -1; i <= 1; i++) {
                    let bAngle = angle + (i * 0.22);
                    let vx = Math.cos(bAngle) * 3.0;
                    let vy = Math.sin(bAngle) * 3.0;
                    bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.6, false, {
                        color: '#ff00aa',
                        radius: 5
                    }));
                }
                Sound.play('shoot');
            }
        }
        else if (this.type === 'teleporter') {
            this.x += Math.cos(angle) * activeSpeed;
            this.y += Math.sin(angle) * activeSpeed;

            this.teleportCooldown -= timeScale;
            if (this.teleportCooldown <= 0 && dist < 350) {
                this.teleportCooldown = 180 + Math.random() * 120;
                
                let warpAngle = Math.random() * Math.PI * 2;
                let warpDist = 150 + Math.random() * 100;
                let targetX = player.x + Math.cos(warpAngle) * warpDist;
                let targetY = player.y + Math.sin(warpAngle) * warpDist;

                const margin = 50;
                targetX = Math.max(margin + this.radius, Math.min(800 - margin - this.radius, targetX));
                targetY = Math.max(margin + this.radius, Math.min(600 - margin - this.radius, targetY));

                if (window.gameEngine) {
                    for (let k = 0; k < 6; k++) {
                        let pAngle = Math.random() * Math.PI * 2;
                        let pSpeed = Math.random() * 2 + 1;
                        window.gameEngine.particles.push(new Particle(this.x, this.y, '#00ffcc', 2.0, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15, 'spark'));
                    }
                }

                this.x = targetX;
                this.y = targetY;

                if (window.gameEngine) {
                    for (let k = 0; k < 6; k++) {
                        let pAngle = Math.random() * Math.PI * 2;
                        let pSpeed = Math.random() * 2 + 1;
                        window.gameEngine.particles.push(new Particle(this.x, this.y, '#00ffcc', 2.0, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15, 'spark'));
                    }
                    this.showFloatingText("WARP! 💚", this.x, this.y - 25, '#00ffcc');
                    Sound.play('dodge');
                }
            }
        }
        else if (this.type === 'summoner') {
            if (dist < 250) {
                this.x -= Math.cos(angle) * activeSpeed * 0.95;
                this.y -= Math.sin(angle) * activeSpeed * 0.95;
            } else {
                let sideAngle = angle + Math.PI / 2;
                this.x += Math.cos(sideAngle) * activeSpeed * 0.4;
                this.y += Math.sin(sideAngle) * activeSpeed * 0.4;
            }

            this.summonCooldown -= timeScale;
            if (this.summonCooldown <= 0 && dist < 300) {
                this.summonCooldown = 240 + Math.random() * 120;
                
                if (window.gameEngine && window.gameEngine.monsters) {
                    let mini = new Monster(this.x, this.y, this.tier, this.roomNum);
                    mini.type = 'mini';
                    mini.radius = 7 + Math.min(3, mini.tier);
                    mini.maxHp = Math.ceil(this.maxHp * 0.35);
                    mini.hp = mini.maxHp;
                    mini.atk = Math.ceil(this.atk * 0.6);
                    mini.speed = this.speed * 1.45;
                    mini.color = '#00e1ff';
                    mini.glowColor = '#00e1ff';
                    mini.fillColor = 'rgba(0, 225, 255, 0.12)';
                    
                    let scatterAngle = Math.random() * Math.PI * 2;
                    mini.knockbackX = Math.cos(scatterAngle) * 4.5;
                    mini.knockbackY = Math.sin(scatterAngle) * 4.5;
                    
                    window.gameEngine.monsters.push(mini);
                    
                    for (let k = 0; k < 10; k++) {
                        let pAngle = Math.random() * Math.PI * 2;
                        let pSpeed = Math.random() * 3 + 1;
                        window.gameEngine.particles.push(new Particle(this.x, this.y, '#8b5cf6', 2.0, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20, 'spark'));
                    }
                    this.showFloatingText("SUMMON! 💠", this.x, this.y - 25, '#8b5cf6');
                    Sound.play('powerup');
                }
            }
        }
        else if (this.type === 'healer') {
            if (dist < 220) {
                this.x -= Math.cos(angle) * activeSpeed * 0.95;
                this.y -= Math.sin(angle) * activeSpeed * 0.95;
            } else {
                let sideAngle = angle + Math.PI / 2;
                this.x += Math.cos(sideAngle) * activeSpeed * 0.4;
                this.y += Math.sin(sideAngle) * activeSpeed * 0.4;
            }

            this.healCooldown -= timeScale;
            if (this.healCooldown <= 0) {
                this.healCooldown = 180 + Math.random() * 60;
                
                const healRadius = 150;
                const healAmount = 10 + this.tier * 2;
                let healedAny = false;
                
                if (window.gameEngine && window.gameEngine.monsters) {
                    for (let other of window.gameEngine.monsters) {
                        if (other === this || other.dead || other.hp <= 0) continue;
                        let distToOther = Math.hypot(other.x - this.x, other.y - this.y);
                        if (distToOther < healRadius) {
                            if (other.hp < other.maxHp) {
                                other.hp = Math.min(other.maxHp, other.hp + healAmount);
                                healedAny = true;
                                
                                for (let k = 0; k < 3; k++) {
                                    let pAngle = Math.random() * Math.PI * 2;
                                    let pSpeed = Math.random() * 1.5 + 0.5;
                                    window.gameEngine.particles.push(new Particle(other.x, other.y, '#10b981', 1.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15, 'spark'));
                                }
                            }
                        }
                    }
                }

                if (healedAny) {
                    this.showFloatingText("HEAL! 💚", this.x, this.y - 25, '#10b981');
                    Sound.play('powerup');
                    this.healRingTimer = 20;
                }
            }
            if (this.healRingTimer > 0) {
                this.healRingTimer -= timeScale;
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
            
            // [버그 수정] 벽 격돌 피해로 사망 시 사망 처리 정산 진행
            if (this.hp <= 0 && window.gameEngine) {
                window.gameEngine.killMonster(this);
            }
            
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

        // 피격 깜빡임 및 상태이상 색상/스타일 계산
        let fillColor, strokeColor, glowColor, lineWidth;
        lineWidth = this.isBoss ? 4.0 : 2.5;

        if (this.flashTimer > 0) {
            fillColor = 'rgba(255, 255, 255, 0.8)';
            strokeColor = '#ffffff';
            glowColor = '#ffffff';
            ctx.shadowBlur = 20;
        } else if (this.statusEffects.shock >= 120) {
            // [W-08 시간 완전 정지 - 회색조 석상화 렌더링]
            fillColor = 'rgba(80, 80, 80, 0.45)';
            strokeColor = '#555555';
            glowColor = '#333333';
            ctx.shadowBlur = 6;
        } else {
            fillColor = this.isBoss ? 'rgba(255, 51, 0, 0.12)' : 
                        (this.type === 'chaser' ? 'rgba(255, 170, 0, 0.12)' : 
                        (this.type === 'shooter' ? 'rgba(176, 38, 255, 0.12)' : 'rgba(255, 0, 85, 0.12)'));
            strokeColor = this.color;
            glowColor = this.glowColor;
            ctx.shadowBlur = 12;
        }
        ctx.shadowColor = glowColor;

        // 몬스터 타입별 기하학적 네온 렌더링
        if (this.isBoss || this.type.startsWith('boss_')) {
            ctx.shadowColor = glowColor;
            ctx.strokeStyle = strokeColor;
            ctx.fillStyle = fillColor;
            ctx.lineWidth = lineWidth;

            switch (this.type) {
                case 'boss': // 10층 네온 센티넬 (기존 보스)
                    // 1. 외부 역회전 링 1 (시계 방향 회전 점선 링)
                    let angle1 = (Date.now() * 0.0015);
                    ctx.save();
                    ctx.rotate(angle1);
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 1.8;
                    ctx.setLineDash([8, 12]);
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 1.35, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                    
                    // 2. 외부 역회전 링 2 (반시계 방향 회전 8각 톱니 링)
                    let angle2 = -(Date.now() * 0.0025);
                    ctx.save();
                    ctx.rotate(angle2);
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 2.0;
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        let a = i * Math.PI / 4;
                        let r1 = this.radius * 1.1;
                        let r2 = this.radius * 1.25;
                        ctx.lineTo(Math.cos(a - 0.1) * r1, Math.sin(a - 0.1) * r1);
                        ctx.lineTo(Math.cos(a - 0.05) * r2, Math.sin(a - 0.05) * r2);
                        ctx.lineTo(Math.cos(a + 0.05) * r2, Math.sin(a + 0.05) * r2);
                        ctx.lineTo(Math.cos(a + 0.1) * r1, Math.sin(a + 0.1) * r1);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    ctx.restore();
                    
                    // 3. 본체 구체
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    if (this.flashTimer <= 0) ctx.stroke();

                    // 4. 플레이어를 째려보는 눈(코어)
                    let eyeAngle = this.angle || 0;
                    let eyeDist = this.radius * 0.35;
                    let ex = Math.cos(eyeAngle) * eyeDist;
                    let ey = Math.sin(eyeAngle) * eyeDist;

                    ctx.save();
                    ctx.translate(ex, ey);
                    ctx.beginPath();
                    ctx.arc(0, 0, 10, 0, Math.PI * 2);
                    ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
                    ctx.fill();

                    // 흰색 동공
                    ctx.beginPath();
                    ctx.arc(0, 0, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    ctx.restore();
                    break;

                case 'boss_chaser': // 20층 하이퍼 체이서 (화살촉 비행체형)
                    ctx.save();
                    ctx.rotate(this.angle || 0);

                    // 삼중 화살촉 본체 데칼
                    ctx.beginPath();
                    ctx.moveTo(this.radius * 1.4, 0);
                    ctx.lineTo(-this.radius * 1.0, -this.radius * 0.9);
                    ctx.lineTo(-this.radius * 0.5, 0);
                    ctx.lineTo(-this.radius * 1.0, this.radius * 0.9);
                    ctx.closePath();
                    ctx.fill();
                    if (this.flashTimer <= 0) ctx.stroke();

                    // 엔진 플레임 이펙트 (돌진 중일 때는 웅장한 로켓 부스터)
                    let flameLen = this.isDashing > 0 ? (35 + Math.random() * 20) : (12 + Math.random() * 6);
                    ctx.beginPath();
                    ctx.moveTo(-this.radius * 0.6, -8);
                    ctx.lineTo(-this.radius * 0.6 - flameLen, 0);
                    ctx.lineTo(-this.radius * 0.6, 8);
                    ctx.closePath();
                    ctx.fillStyle = this.isDashing > 0 ? '#ff3300' : 'rgba(255, 170, 0, 0.4)';
                    ctx.shadowColor = this.isDashing > 0 ? '#ff3300' : '#ffaa00';
                    ctx.fill();

                    ctx.restore();
                    break;

                case 'boss_slime': // 30층 마더 슬라임
                case 'boss_slime_mini': // 30층 분열 미니 슬라임 보스
                    ctx.save();
                    let slimePulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.08;
                    let slimePulseY = 1.0 - Math.sin(Date.now() * 0.006) * 0.08;
                    ctx.scale(slimePulse, slimePulseY);

                    // 본체 버블
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    if (this.flashTimer <= 0) ctx.stroke();

                    // 중심 대칭형 이중 눈/코어 장식
                    let offset = this.radius * 0.3;
                    ctx.beginPath();
                    ctx.arc(-offset, -5, this.radius * 0.18, 0, Math.PI * 2);
                    ctx.arc(offset, -5, this.radius * 0.18, 0, Math.PI * 2);
                    ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
                    ctx.fill();
                    ctx.restore();
                    break;

                case 'boss_speaker': // 40층 둠 스피커
                    ctx.save();
                    // 외부 마젠타 8방향 십자성 회전 링
                    let rotAngle = (Date.now() * 0.002);
                    ctx.rotate(rotAngle);
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        let a = i * Math.PI / 4;
                        ctx.lineTo(Math.cos(a) * this.radius * 1.35, Math.sin(a) * this.radius * 1.35);
                        ctx.lineTo(Math.cos(a + 0.12) * this.radius * 0.6, Math.sin(a + 0.12) * this.radius * 0.6);
                    }
                    ctx.closePath();
                    ctx.fill();
                    if (this.flashTimer <= 0) ctx.stroke();
                    ctx.restore();

                    // 내부 스피커 코일 안구
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
                    ctx.fillStyle = '#0a0a14';
                    ctx.strokeStyle = strokeColor;
                    ctx.fill();
                    ctx.stroke();

                    // 맥박 치는 스피커 파동
                    ctx.beginPath();
                    let waveRadius = this.radius * (0.15 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.25);
                    ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
                    ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
                    ctx.fill();

                    // [둠 스피커 격자 레이저 렌더러]
                    if (this.gridLaserActive > 0) {
                        ctx.save();
                        // 보스 로컬좌표를 전역 화면(0,0) 좌표로 되돌림
                        ctx.translate(-this.x, -this.y);

                        // 65프레임 이상이면 빨간색 점선 경고 격자
                        if (this.gridLaserActive > 35) {
                            ctx.strokeStyle = 'rgba(255, 0, 85, 0.45)';
                            ctx.lineWidth = 1.5;
                            ctx.setLineDash([4, 6]);
                            ctx.shadowBlur = 4;
                            ctx.shadowColor = '#ff0055';
                        } else {
                            // 35프레임 이하면 치명적인 굵은 네온 마젠타 레이저 빔
                            ctx.strokeStyle = 'rgba(255, 0, 170, 0.85)';
                            ctx.lineWidth = 12;
                            ctx.shadowBlur = 18;
                            ctx.shadowColor = '#ff00aa';
                        }

                        // 가로 세로 격자 그리기
                        for (let lx = 100; lx <= 700; lx += 100) {
                            ctx.beginPath();
                            ctx.moveTo(lx, 40);
                            ctx.lineTo(lx, 560);
                            ctx.stroke();
                        }
                        for (let ly = 100; ly <= 500; ly += 100) {
                            ctx.beginPath();
                            ctx.moveTo(40, ly);
                            ctx.lineTo(760, ly);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }
                    break;

                case 'boss_warper': // 60층 보이드 워퍼
                    ctx.save();
                    let warpRot = (Date.now() * 0.0035);
                    ctx.rotate(warpRot);

                    // 삼중 역방향 날카로운 모래시계 겹침 데칼
                    for (let k = 0; k < 3; k++) {
                        ctx.save();
                        ctx.rotate(k * Math.PI / 3);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-this.radius * 0.9, -this.radius * 1.15);
                        ctx.lineTo(this.radius * 0.9, -this.radius * 1.15);
                        ctx.closePath();
                        ctx.fill();
                        if (this.flashTimer <= 0) ctx.stroke();

                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-this.radius * 0.9, this.radius * 1.15);
                        ctx.lineTo(this.radius * 0.9, this.radius * 1.15);
                        ctx.closePath();
                        ctx.fill();
                        if (this.flashTimer <= 0) ctx.stroke();
                        ctx.restore();
                    }
                    ctx.restore();

                    // 중심 차원 균열 안구
                    ctx.beginPath();
                    ctx.arc(0, 0, 6, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();

                    // [보이드 워퍼 탄 흡수 블랙홀 구역 그리기]
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(0, 0, 75, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 255, 204, 0.04)';
                    ctx.strokeStyle = 'rgba(0, 255, 204, 0.35)';
                    ctx.lineWidth = 1.0;
                    ctx.setLineDash([3, 5]);
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#00ffcc';
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                    break;

                case 'boss_portal': // 70층 차원 차단기
                    ctx.save();
                    let portalRot = (Date.now() * 0.0018);
                    ctx.rotate(portalRot);

                    // 영롱한 정오각형 삼중 회전 장막
                    for (let k = 0; k < 3; k++) {
                        ctx.save();
                        ctx.rotate(k * Math.PI * 2 / 15);
                        ctx.beginPath();
                        for (let i = 0; i < 5; i++) {
                            let a = (i * Math.PI * 2 / 5);
                            let x = Math.cos(a) * this.radius * (1.0 - k * 0.15);
                            let y = Math.sin(a) * this.radius * (1.0 - k * 0.15);
                            if (i === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        }
                        ctx.closePath();
                        ctx.fill();
                        if (this.flashTimer <= 0) ctx.stroke();
                        ctx.restore();
                    }
                    ctx.restore();

                    // 중앙 코어 블랙홀
                    ctx.beginPath();
                    ctx.arc(0, 0, 8, 0, Math.PI * 2);
                    ctx.fillStyle = '#050510';
                    ctx.fill();

                    // 무적 상태 시 거대 배리어 보랏빛 글로우 드로잉
                    if (this.isInvulnerable) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
                        ctx.strokeStyle = '#8b5cf6';
                        ctx.lineWidth = 3.5;
                        ctx.shadowBlur = 25;
                        ctx.shadowColor = '#8b5cf6';
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
                        ctx.fill();
                        ctx.restore();
                    }
                    break;

                case 'boss_portal_spawner': // 70층 소환 포털 장치 (부하)
                    // 은은한 도넛 형태의 차원 문 회전
                    ctx.save();
                    let spawnerRot = (Date.now() * 0.001);
                    ctx.rotate(spawnerRot);
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(167, 139, 250, 0.15)';
                    ctx.fill();

                    ctx.lineWidth = 2.0;
                    ctx.setLineDash([5, 8]);
                    if (this.flashTimer <= 0) ctx.stroke();
                    ctx.restore();

                    // 내부 차원의 검은 소용돌이
                    ctx.beginPath();
                    let vortexRad = this.radius * 0.6 + Math.sin(Date.now() * 0.009) * 2;
                    ctx.arc(0, 0, vortexRad, 0, Math.PI * 2);
                    ctx.fillStyle = '#090815';
                    ctx.fill();
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                    break;

                case 'boss_hive': // 80층 나노 하이브 (두꺼운 이중 팔각형)
                    ctx.save();
                    let hiveRot = (Date.now() * 0.0007);
                    ctx.rotate(hiveRot);

                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        let a = i * Math.PI / 4;
                        let x = Math.cos(a) * this.radius;
                        let y = Math.sin(a) * this.radius;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    if (this.flashTimer <= 0) ctx.stroke();

                    // 내부 보조 구조선
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        let a = i * Math.PI / 4;
                        let x = Math.cos(a) * this.radius * 0.65;
                        let y = Math.sin(a) * this.radius * 0.65;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    if (this.flashTimer <= 0) ctx.stroke();
                    ctx.restore();

                    // [나노 하이브 전용 재생 쉴드 링 렌더러]
                    if (this.shieldHp > 0) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
                        // 쉴드 용량 비례 불투명 알파값 조절
                        let shieldAlpha = 0.3 + (this.shieldHp / this.maxShieldHp) * 0.55;
                        ctx.strokeStyle = `rgba(0, 240, 255, ${shieldAlpha})`;
                        ctx.lineWidth = 3.8;
                        ctx.shadowBlur = 20;
                        ctx.shadowColor = '#00f0ff';
                        ctx.stroke();
                        ctx.restore();
                    }
                    break;

                case 'boss_hive_healer': // 80층 힐러 드론 (부하)
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
                    ctx.fill();
                    if (this.flashTimer <= 0) ctx.stroke();

                    // 중심 십자 모양
                    ctx.beginPath();
                    let hSize = this.radius * 0.45;
                    ctx.rect(-hSize, -2.2, hSize * 2, 4.4);
                    ctx.rect(-2.2, -hSize, 4.4, hSize * 2);
                    ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
                    ctx.fill();
                    break;

                case 'boss_chaos': // 90층 카오스 코어
                    ctx.save();
                    let chaosRot = (Date.now() * 0.0028);
                    ctx.rotate(chaosRot);

                    // 세 정삼각형이 겹친 코어 구조
                    for (let i = 0; i < 3; i++) {
                        ctx.save();
                        ctx.rotate(i * Math.PI / 3);
                        ctx.beginPath();
                        ctx.moveTo(0, -this.radius * 1.2);
                        ctx.lineTo(this.radius * 1.03, this.radius * 0.6);
                        ctx.lineTo(-this.radius * 1.03, this.radius * 0.6);
                        ctx.closePath();
                        ctx.fill();
                        if (this.flashTimer <= 0) ctx.stroke();
                        ctx.restore();
                    }
                    ctx.restore();

                    // 중심 다각형의 밝은 속성 핵
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
                    ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
                    ctx.fill();
                    break;

                case 'boss_final': // 100층 최종 보스
                    ctx.save();
                    // 최종보스 본체: 거대한 기계제어 판넬 형상(반원 및 날개구조)
                    // 날개 드로잉
                    ctx.beginPath();
                    ctx.moveTo(-110, -35);
                    ctx.lineTo(-this.radius * 1.5, this.radius * 0.3);
                    ctx.lineTo(this.radius * 1.5, this.radius * 0.3);
                    ctx.lineTo(110, -35);
                    ctx.fillStyle = 'rgba(255, 0, 85, 0.08)';
                    ctx.fill();
                    ctx.stroke();

                    // 본체 반원 아크
                    ctx.beginPath();
                    ctx.arc(0, -30, this.radius * 1.15, 0, Math.PI, true);
                    ctx.closePath();
                    ctx.fill();
                    if (this.flashTimer <= 0) ctx.stroke();
                    ctx.restore();

                    // 중심 코어 안구 (2페이즈 폭주시에는 격렬한 진동 및 붉은 폭사 장막)
                    ctx.beginPath();
                    let finalCoreRad = this.radius * 0.35 + (this.phase === 2 ? Math.sin(Date.now() * 0.02) * 3 : 0);
                    ctx.arc(0, -25, finalCoreRad, 0, Math.PI * 2);
                    ctx.fillStyle = this.phase === 2 ? '#ff0055' : strokeColor;
                    ctx.fill();

                    // 1페이즈 보호막 장막 렌더러
                    if (this.isInvulnerable) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(0, -10, 115, 0, Math.PI * 2);
                        // 보랏빛-자홍색 무지개빛 배리어 링
                        ctx.strokeStyle = `rgba(255, 0, 85, ${0.45 + Math.sin(Date.now() * 0.01) * 0.2})`;
                        ctx.lineWidth = 4.0;
                        ctx.shadowBlur = 30;
                        ctx.shadowColor = '#ff0055';
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.arc(0, -10, 115, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(255, 0, 85, 0.05)';
                        ctx.fill();
                        ctx.restore();
                    }

                    // [최종보스 2페이즈 거대 세로 청소 레이저 드로잉]
                    if (this.phase === 2) {
                        if (this.laserWarningTimer > 0) {
                            ctx.save();
                            ctx.translate(-this.x, -this.y); // 전역좌표 변환
                            
                            // 빨간색 반투명 점선 경고 세로 막대기 기둥
                            ctx.fillStyle = 'rgba(255, 0, 85, 0.15)';
                            ctx.fillRect(this.laserX - 40, 40, 80, 520);
                            
                            ctx.strokeStyle = 'rgba(255, 0, 85, 0.6)';
                            ctx.lineWidth = 2.0;
                            ctx.setLineDash([6, 8]);
                            ctx.beginPath();
                            ctx.moveTo(this.laserX - 40, 40);
                            ctx.lineTo(this.laserX - 40, 560);
                            ctx.moveTo(this.laserX + 40, 40);
                            ctx.lineTo(this.laserX + 40, 560);
                            ctx.stroke();
                            ctx.restore();
                        }

                        if (this.laserActiveTimer > 0) {
                            ctx.save();
                            ctx.translate(-this.x, -this.y); // 전역좌표 변환
                            
                            // 굵은 흰색-빨간색 초강력 빔 기둥
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                            ctx.fillRect(this.laserX - 35, 40, 70, 520);
                            
                            ctx.strokeStyle = '#ff0055';
                            ctx.lineWidth = 10;
                            ctx.shadowBlur = 35;
                            ctx.shadowColor = '#ff0055';
                            ctx.strokeRect(this.laserX - 38, 40, 76, 520);
                            ctx.restore();
                        }
                    }
                    break;

                case 'boss_final_turret': // 100층 최종보스 실드 포탑
                    ctx.save();
                    ctx.rotate(this.angle || 0);

                    // 삼각 기둥 형태의 포탑
                    ctx.beginPath();
                    ctx.moveTo(this.radius * 1.2, 0);
                    ctx.lineTo(-this.radius * 0.8, -this.radius * 0.85);
                    ctx.lineTo(-this.radius * 0.8, this.radius * 0.85);
                    ctx.closePath();
                    ctx.fill();
                    if (this.flashTimer <= 0) ctx.stroke();

                    // 뒤쪽 지지대
                    ctx.beginPath();
                    ctx.arc(-this.radius * 0.3, 0, this.radius * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = '#100c1e';
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                    break;
            }
        } else if (this.type === 'normal') {
            // [일반 몬스터] 회전하는 3개의 삼각 파편과 중심 구체
            // 1. 중심핵 구체
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            // 2. 중심핵 내부 안구
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
            ctx.fill();

            // 3. 회전하는 3개의 삼각 파편
            let baseAngle = (Date.now() * 0.0035);
            for (let i = 0; i < 3; i++) {
                let a = baseAngle + (i * Math.PI * 2 / 3);
                let dist = this.radius * 0.95;
                let px = Math.cos(a) * dist;
                let py = Math.sin(a) * dist;
                
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(a);
                
                ctx.beginPath();
                ctx.moveTo(this.radius * 0.22, 0);
                ctx.lineTo(-this.radius * 0.15, -this.radius * 0.15);
                ctx.lineTo(-this.radius * 0.15, this.radius * 0.15);
                ctx.closePath();
                
                ctx.fillStyle = fillColor;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = lineWidth * 0.8;
                ctx.fill();
                if (this.flashTimer <= 0) ctx.stroke();
                ctx.restore();
            }

        } else if (this.type === 'chaser') {
            // [돌격형 몬스터] 이동 각도를 바라보는 날렵한 화살촉 형태
            ctx.save();
            ctx.rotate(this.angle || 0);

            ctx.beginPath();
            ctx.moveTo(this.radius * 1.3, 0); // 전면 기수
            ctx.lineTo(-this.radius * 0.8, -this.radius * 0.75); // 좌현 날개
            ctx.lineTo(-this.radius * 0.4, 0); // 배기구 홈
            ctx.lineTo(-this.radius * 0.8, this.radius * 0.75); // 우현 날개
            ctx.closePath();

            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            // 기체 중앙 원형 코어
            ctx.beginPath();
            ctx.arc(-this.radius * 0.1, 0, this.radius * 0.28, 0, Math.PI * 2);
            ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
            ctx.fill();
            ctx.restore();

        } else if (this.type === 'shooter') {
            // [원거리 사격 몬스터] 육각형 방어막 장막 및 충전 발광 안구
            ctx.save();
            let rotAngle = (Date.now() * 0.001);
            ctx.rotate(rotAngle);

            // 1. 육각형 장막 렌더링
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                let a = (i * Math.PI / 3);
                let x = Math.cos(a) * this.radius;
                let y = Math.sin(a) * this.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();
            ctx.restore();

            // 2. 내부 코어 안구 (사격 임박 충전 시 흰색 깜빡임)
            let coreRadius = this.radius * 0.35;
            let isCharging = this.shootCooldown <= 30; // 사격 30프레임 이내
            ctx.beginPath();
            ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
            
            if (isCharging && Math.floor(Date.now() / 45) % 2 === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 18;
            } else {
                ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
            }
            ctx.fill();

        } else if (this.type === 'exploder') {
            // [자폭 몬스터] 회전하는 마름모와 깜빡이는 핵
            ctx.save();
            let rotAngle = (Date.now() * 0.0035);
            ctx.rotate(rotAngle);

            ctx.beginPath();
            ctx.moveTo(this.radius * 1.3, 0);
            ctx.lineTo(0, -this.radius * 0.7);
            ctx.lineTo(-this.radius * 1.3, 0);
            ctx.lineTo(0, this.radius * 0.7);
            ctx.closePath();

            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            let isWarning = this.explodeTimer > 0;
            let flashSpeed = isWarning ? 60 : 250;
            let corePulse = Math.floor(Date.now() / flashSpeed) % 2 === 0;

            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
            if (corePulse) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 15;
            } else {
                ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
            }
            ctx.fill();
            ctx.restore();

        } else if (this.type === 'splitter') {
            // [분열 슬라임] 출렁이는 물방울 형태 (시간에 따라 스케일 변경)
            ctx.save();
            let pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.1;
            let pulseY = 1.0 - Math.sin(Date.now() * 0.005) * 0.1;
            ctx.scale(pulse, pulseY);

            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            ctx.beginPath();
            ctx.arc(-this.radius * 0.3, 0, 3, 0, Math.PI * 2);
            ctx.arc(this.radius * 0.3, 0, 3, 0, Math.PI * 2);
            ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
            ctx.fill();
            ctx.restore();

        } else if (this.type === 'mini') {
            // [미니 슬라임] 아주 작은 구체
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth * 0.8;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

        } else if (this.type === 'scatterer') {
            // [방사 사격자] 회전하는 4방향 십자 날개
            ctx.save();
            let rotAngle = (Date.now() * 0.002);
            ctx.rotate(rotAngle);

            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                let a = i * Math.PI / 2;
                ctx.lineTo(Math.cos(a) * this.radius * 1.3, Math.sin(a) * this.radius * 1.3);
                ctx.lineTo(Math.cos(a + 0.15) * this.radius * 0.5, Math.sin(a + 0.15) * this.radius * 0.5);
            }
            ctx.closePath();

            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
            ctx.fill();
            ctx.restore();

        } else if (this.type === 'teleporter') {
            // [차원 도약자] 이중 삼각형 모래시계형 2개 겹침
            ctx.save();
            let rotAngle = (Date.now() * 0.003);
            ctx.rotate(rotAngle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-this.radius * 0.9, -this.radius * 1.1);
            ctx.lineTo(this.radius * 0.9, -this.radius * 1.1);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-this.radius * 0.9, this.radius * 1.1);
            ctx.lineTo(this.radius * 0.9, this.radius * 1.1);
            ctx.closePath();
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();

        } else if (this.type === 'tanker') {
            // [중장갑 탱커] 두꺼운 이중 팔각형 구조
            ctx.save();
            let rotAngle = (Date.now() * 0.0008);
            ctx.rotate(rotAngle);

            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                let a = i * Math.PI / 4;
                let x = Math.cos(a) * this.radius;
                let y = Math.sin(a) * this.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth * 1.5;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                let a = i * Math.PI / 4;
                let x = Math.cos(a) * this.radius * 0.6;
                let y = Math.sin(a) * this.radius * 0.6;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth * 0.8;
            if (this.flashTimer <= 0) ctx.stroke();
            ctx.restore();

        } else if (this.type === 'summoner') {
            // [차원 소환사] 오각형 장막 + 내부 차원 구멍
            ctx.save();
            let rotAngle = (Date.now() * 0.0012);
            ctx.rotate(rotAngle);

            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                let a = (i * Math.PI * 2 / 5);
                let x = Math.cos(a) * this.radius;
                let y = Math.sin(a) * this.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            let pulse = this.radius * 0.35 + Math.sin(Date.now() * 0.008) * 2;
            ctx.beginPath();
            ctx.arc(0, 0, pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#05060c';
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
            ctx.restore();

        } else if (this.type === 'healer') {
            // [나노 치유사] 구형 보호막 내부 십자가 마크
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.fill();
            if (this.flashTimer <= 0) ctx.stroke();

            ctx.beginPath();
            let size = this.radius * 0.4;
            let thick = 2.5;
            ctx.rect(-size, -thick, size * 2, thick * 2);
            ctx.rect(-thick, -size, thick * 2, size * 2);
            ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : strokeColor;
            ctx.fill();

            if (this.healRingTimer > 0) {
                ctx.save();
                ctx.beginPath();
                let currentRadius = this.radius + (20 - this.healRingTimer) * 6;
                ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(16, 185, 129, ' + (this.healRingTimer / 20) + ')';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.restore();
            }
        }

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
