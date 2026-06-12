// --------------------------------------------------------------------------
// 5. 몬스터 클래스 (다양한 티어 및 AI)
// --------------------------------------------------------------------------
class Monster {
    constructor(x, y, tier, roomNum = 1) {
        this.x = x;
        this.y = y;
        this.tier = tier;
        this.roomNum = roomNum;
        this._hp = 0; // [추가] 내부 체력 변수 초기화
        
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

        // 1. 방 번호에 따른 몬스터 타입 배정 (2안: 방별 몬스터 풀 적용)
        if (window.gameEngine && window.gameEngine.currentRoomMonsterPool && window.gameEngine.currentRoomMonsterPool.length > 0) {
            let pool = window.gameEngine.currentRoomMonsterPool;
            this.type = pool[Math.floor(Math.random() * pool.length)];
        } else {
            // 백업 해금 테이블 (기본 1안 기준 배정)
            let allowedTypes = ['normal'];
            if (roomNum <= 5) {
                allowedTypes = ['normal', 'chaser'];
            } else if (roomNum <= 10) {
                allowedTypes = ['normal', 'chaser', 'exploder'];
            } else if (roomNum <= 15) {
                allowedTypes = ['normal', 'chaser', 'exploder', 'shooter'];
            } else if (roomNum <= 25) {
                allowedTypes = ['normal', 'chaser', 'exploder', 'shooter', 'splitter', 'teleporter'];
            } else if (roomNum <= 35) {
                allowedTypes = ['normal', 'chaser', 'exploder', 'shooter', 'splitter', 'teleporter', 'tanker', 'scatterer'];
            } else {
                allowedTypes = ['normal', 'chaser', 'exploder', 'shooter', 'splitter', 'teleporter', 'tanker', 'scatterer', 'summoner', 'healer'];
            }
            this.type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
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

    // [추가] 외부 코드 수정 없이 무적 및 실드 작동을 가로채기 위한 getter/setter 구현
    get hp() {
        return this._hp;
    }

    set hp(value) {
        // 무적(isInvulnerable) 상태이고 대미지를 입는 상황이면 체력 차감 무효화
        if (this.isInvulnerable && value < this._hp) {
            return;
        }

        // 대미지를 입는 경우 (체력이 감소할 때)
        if (this._hp !== undefined && value < this._hp) {
            let dmg = this._hp - value;

            // 위상 굴절 보호막 (네온 센티넬 기믹) 작동 중이면 대미지 70% 경감
            if (this.boss_refractionShieldActive) {
                let originalDmg = dmg;
                dmg = Math.max(1, Math.floor(dmg * 0.3));
                // 시각적 피드백: 경감된 데미지 표시
                if (window.gameEngine) {
                    window.gameEngine.showFloatingText(
                        `🛡️ SHIELDED! (-${Math.floor(originalDmg - dmg)})`,
                        this.x, this.y - 30, '#ff8800'
                    );
                }
            }

            // 실드(shieldHp)가 있는 경우 실드가 대미지를 우선 차감 흡수
            if (this.shieldHp !== undefined && this.shieldHp > 0) {
                this.shieldRechargeTimer = 300; // 피격 시 실드 재생 타이머 5초 대기 리셋
                if (this.shieldHp >= dmg) {
                    this.shieldHp -= dmg;
                    dmg = 0;
                } else {
                    dmg -= this.shieldHp;
                    this.shieldHp = 0;
                }
            }

            // 실드가 깨지고 남은 대미지만 실제 체력에 가산 차감
            this._hp = Math.max(0, this._hp - dmg);
        } else {
            // 체력을 새로 설정하거나 회복시키는 경우
            this._hp = Math.max(0, value);
        }
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

        // 보스 기믹 및 패턴용 상태 변수들 일괄 초기화
        this.boss_refractionShieldActive = false;
        this.boss_refractionShieldUsed = false;
        this.boss_refractionShieldDuration = 0;
        this.boss_chargeTimer = 0;
        this.boss_speedBuffCount = 0;
        this.boss_trailTimer = 0;
        this.boss_sonicDisruptionActive = false;
        this.boss_spatialRiftTimer = 0;
        this.boss_shieldDischarged = false;
        this.boss_chaosWaveTimer = 0;
        this.boss_finalCoreReset = false;
        this.boss_finalGravityActive = false;

        // 시각 표시 피드백용 필드
        this.boss_warningText = "";
        this.boss_timerText = "";
        this.boss_castProgress = 0;
        this.boss_castMax = 0;
        
        let roomFactor = 1.0 + (roomNum - 1) * 0.05;
        let scaleHp = 1.0;
        let scaleAtk = 1.0;
        let scaleRadius = 1.0;

        this.isWeakened = isWeakened; // 약화 상태를 인스턴스에 저장 (AI 패턴 완화용)

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
                this.shootCooldown = 60; // [추가] 공격 사격 쿨다운
                this.blackholeActiveTimer = 0; // [추가] 탄 흡수 보호막(블랙홀) 한시 활성 타이머
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
                // [수정] 최종 100층 보스방의 동적 너비를 읽어와 레이저 조준 초기값을 설정합니다.
                this.laserX = (window.gameEngine && window.gameEngine.mapWidth / 2) || 400;
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
        // [수정] 보스 몬스터(isBoss 혹은 boss_로 시작하는 부하 보스)는 넉백을 완전히 무시하도록 처리 (위치 고정 버그 및 덜덜거림 버그 방지)
        if (this.isTanker || this.isBoss || this.type.startsWith('boss_')) {
            this.knockbackX = 0;
            this.knockbackY = 0;
        }
        this.x += this.knockbackX * timeScale;
        this.y += this.knockbackY * timeScale;
        this.knockbackX *= 0.85;
        this.knockbackY *= 0.85;

        // Shock (Stun / 기절) 상태 시 이동 및 행동 불능 처리
        // [수정] 보스 몬스터는 기절에 걸리더라도 공격 패턴이나 이동 AI가 멈추지 않도록 무시 처리 (패턴 정지 버그 방지)
        if (this.statusEffects.shock > 0 && !this.isBoss && !this.type.startsWith('boss_')) {
            // 행동 불가 상태에서도 넉백과 벽 충돌 처리는 적용
            const wallMargin = 50;
            let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
            this.x = Math.max(wallMargin + this.radius, Math.min(mapW - wallMargin - this.radius, this.x));
            this.y = Math.max(wallMargin + this.radius, Math.min(mapH - wallMargin - this.radius, this.y));
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
            const wallMargin = 50;

            switch (this.type) {
                case 'boss': // 10층 네온 센티넬 (기존 보스)
                    // 1. 위상 굴절 보호막 기믹 업데이트
                    if (!this.boss_refractionShieldUsed && this.hp <= this.maxHp * 0.8) {
                        this.boss_refractionShieldActive = true;
                        this.boss_refractionShieldUsed = true;
                        this.boss_refractionShieldDuration = 180; // 3초
                        if (window.gameEngine) {
                            window.gameEngine.showFloatingText("🛡️ REFRACTION SHIELD! (70% DMG REDUCTION)", this.x, this.y - 35, '#ff3300');
                            Sound.play('powerup');
                        }
                    }

                    if (this.boss_refractionShieldActive) {
                        this.boss_refractionShieldDuration -= timeScale;
                        this.boss_warningText = "PHASE SHIELD";
                        this.boss_timerText = (this.boss_refractionShieldDuration / 60).toFixed(1) + "s";
                        this.boss_castProgress = this.boss_refractionShieldDuration;
                        this.boss_castMax = 180;
                        if (this.boss_refractionShieldDuration <= 0) {
                            this.boss_refractionShieldActive = false;
                            this.boss_warningText = "";
                            this.boss_timerText = "";
                        }
                    } else {
                        this.boss_warningText = "";
                        this.boss_timerText = "";
                    }

                    // 2. 50% 이하 분노/돌진 사격 패턴 작동
                    {
                        let isFrenzy = this.hp <= this.maxHp * 0.5;
                        let speedMult = isFrenzy ? 1.25 : 1.0;

                        if (isFrenzy) {
                            if (this.boss_chargeTimer === undefined || this.boss_chargeTimer <= 0) this.boss_chargeTimer = 90;
                            this.boss_chargeTimer -= timeScale;

                            if (this.boss_chargeTimer <= 0) {
                                // 대시 돌진 상태 (30프레임 동안)
                                let dashLeft = this.boss_chargeTimer;
                                if (dashLeft > -30) {
                                    let dashAngle = this.boss_dashAngle !== undefined ? this.boss_dashAngle : angle;
                                    this.x += Math.cos(dashAngle) * activeSpeed * 2.8;
                                    this.y += Math.sin(dashAngle) * activeSpeed * 2.8;
                                    this.boss_warningText = "DASHING! 🔥";
                                    this.boss_timerText = "";
                                    
                                    // 돌진 경로 궤적 파티클
                                    if (window.gameEngine && Math.random() < 0.4) {
                                        window.gameEngine.particles.push(new Particle(this.x, this.y, '#ff3300', 3, 0, 0, 15, 'spark'));
                                    }
                                } else {
                                    // 돌진 완료 후 쿨타임 리셋
                                    this.boss_chargeTimer = 90; // 1.5초 후 재돌진
                                    this.boss_warningText = "";
                                }
                            } else if (this.boss_chargeTimer <= 30) {
                                // 돌진 준비 충전 중 (30프레임, 0.5초)
                                this.boss_dashAngle = angle; // 조준 고정
                                this.boss_warningText = "DASH CHARGE";
                                this.boss_timerText = (this.boss_chargeTimer / 60).toFixed(1) + "s";
                                this.boss_castProgress = 30 - this.boss_chargeTimer;
                                this.boss_castMax = 30;
                            } else {
                                // 대기 상태 카이팅 이동
                                if (dist > 100) {
                                    this.x += Math.cos(angle) * activeSpeed;
                                    this.y += Math.sin(angle) * activeSpeed;
                                }
                            }
                        } else {
                            // 50% 이상 일반 카이팅 이동
                            if (dist > 100) {
                                this.x += Math.cos(angle) * activeSpeed;
                                this.y += Math.sin(angle) * activeSpeed;
                            }
                        }

                        // 사격 패턴 (분노 시 쿨다운 가속)
                        this.shootCooldown -= timeScale * speedMult;
                        if (this.shootCooldown <= 0) {
                            this.shootCooldown = 90 - Math.min(40, this.tier * 3);
                            let count = isFrenzy ? 4 : 3;
                            let spread = isFrenzy ? 0.22 : 0.25;
                            let startOffset = -(count - 1) / 2;
                            
                            for (let i = 0; i < count; i++) {
                                let bAngle = angle + ((startOffset + i) * spread);
                                let vx = Math.cos(bAngle) * 2.8;
                                let vy = Math.sin(bAngle) * 2.8;
                                bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.8, false, {
                                    color: '#ff3300',
                                    radius: 6
                                }));
                            }
                            Sound.play('shoot');
                        }
                    }
                    break;

                case 'boss_chaser': // 20층 하이퍼 체이서
                    {
                        if (this.boss_speedBuffCount === undefined) this.boss_speedBuffCount = 0;
                        let chaserSpeed = activeSpeed * (1.0 + this.boss_speedBuffCount * 0.06);
                        let isFrenzy = this.hp <= this.maxHp * 0.5;

                        if (this.dashCooldown > 0) {
                            // 50% 이하 분노 시 돌진 쿨타임 2배 속도로 차감
                            this.dashCooldown -= timeScale * (isFrenzy ? 2.0 : 1.0);
                        }

                        // 타이머 및 가이드 텍스트 갱신
                        if (this.isDashing > 0) {
                            this.isDashing -= timeScale;
                            this.x += Math.cos(this.dashAngle) * chaserSpeed * 2.8;
                            this.y += Math.sin(this.dashAngle) * chaserSpeed * 2.8;

                            this.boss_warningText = isFrenzy ? "⚡ OVERHEAT DASH! ⚡" : "DASHING! 🔥";
                            this.boss_timerText = (this.isDashing / 60).toFixed(1) + "s";
                            this.boss_castProgress = this.isDashing;
                            this.boss_castMax = 30;

                            // 돌진 경로 장판 스폰
                            if (window.gameEngine && Math.floor(Date.now() / 83) % 2 === 0) {
                                let trailType = (isFrenzy && Math.random() < 0.5) ? 'chaser_lightning_trail' : 'chaser_fire_trail';
                                let trailColor = trailType === 'chaser_lightning_trail' ? '#00e1ff' : '#ff6a00';
                                let trail = new Particle(this.x, this.y, trailColor, 16, 0, 0, 180, trailType);
                                trail.atk = this.atk * 0.4;
                                window.gameEngine.particles.push(trail);
                            }
                        } else {
                            this.x += Math.cos(angle) * chaserSpeed;
                            this.y += Math.sin(angle) * chaserSpeed;
                            this.dashAngle = angle;

                            if (this.dashCooldown <= 20 && this.dashCooldown > 0) {
                                this.boss_warningText = "DASH READY";
                                this.boss_castProgress = 20 - this.dashCooldown;
                                this.boss_castMax = 20;
                                this.boss_timerText = (this.dashCooldown / 60).toFixed(1) + "s";
                            } else {
                                this.boss_warningText = "";
                                this.boss_timerText = "";
                            }

                            if (this.dashCooldown <= 0 && dist < 280) {
                                this.isDashing = 30;
                                this.dashCooldown = 100 + Math.random() * 50;
                                this.boss_speedBuffCount = Math.min(5, this.boss_speedBuffCount + 1);
                                if (window.gameEngine) {
                                    window.gameEngine.showFloatingText("OVERDRIVE x" + this.boss_speedBuffCount + " ⚡", this.x, this.y - 35, '#ffaa00');
                                }
                                Sound.play('boss_alert');
                            }
                        }
                    }
                    break;

                case 'boss_slime': // 30층 마더 슬라임
                    {
                        let isFrenzy = this.hp <= this.maxHp * 0.5;
                        let slimeSpeed = activeSpeed * (isFrenzy ? 1.3 : 1.0);

                        // 1. 점성 장판 기믹 업데이트
                        if (this.boss_trailTimer === undefined) this.boss_trailTimer = 0;
                        this.boss_trailTimer -= timeScale;
                        if (this.boss_trailTimer <= 0) {
                            this.boss_trailTimer = 15;
                            if (window.gameEngine) {
                                let trail = new Particle(this.x, this.y, '#00f0ff', 15, 0, 0, 120, 'slime_mud_trail');
                                trail.atk = 0; // 데미지는 없고 둔화만
                                window.gameEngine.particles.push(trail);
                            }
                        }

                        // 이동
                        if (dist > 80) {
                            this.x += Math.cos(angle) * slimeSpeed;
                            this.y += Math.sin(angle) * slimeSpeed;
                        }

                        // 캐스팅 타이머 및 경고 텍스트 표시
                        if (this.shootCooldown <= 20 && this.shootCooldown > 0) {
                            this.boss_warningText = isFrenzy ? "FRENZY SPEW" : "SLIME SPEW";
                            this.boss_castProgress = 20 - this.shootCooldown;
                            this.boss_castMax = 20;
                            this.boss_timerText = (this.shootCooldown / 60).toFixed(1) + "s";
                        } else {
                            this.boss_warningText = "";
                            this.boss_timerText = "";
                        }

                        // 사격
                        this.shootCooldown -= timeScale;
                        if (this.shootCooldown <= 0) {
                            this.shootCooldown = 75 - Math.min(25, this.tier * 2);
                            
                            // 8방향 탄막
                            for (let i = 0; i < 8; i++) {
                                let bAngle = (i * Math.PI / 4);
                                let vx = Math.cos(bAngle) * 2.5;
                                let vy = Math.sin(bAngle) * 2.5;
                                bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.7, false, {
                                    color: '#00f0ff',
                                    radius: 5.5
                                }));
                            }

                            // 50% 이하 폭주 시: 조준 4방향 십자성 탄막 추가 사격 및 잡몹 소환
                            if (isFrenzy) {
                                for (let i = 0; i < 4; i++) {
                                    let bAngle = angle + (i * Math.PI / 2);
                                    let vx = Math.cos(bAngle) * 3.2;
                                    let vy = Math.sin(bAngle) * 3.2;
                                    bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.5, false, {
                                        color: '#00e1ff',
                                        radius: 4.5
                                    }));
                                }

                                // 20% 확률로 일반 미니 슬라임 1마리 소환
                                if (Math.random() < 0.20 && window.gameEngine) {
                                    let mini = new Monster(this.x + (Math.random() * 30 - 15), this.y + (Math.random() * 30 - 15), this.tier, this.roomNum);
                                    mini.type = 'mini';
                                    mini.radius = 7;
                                    mini.maxHp = Math.ceil(this.maxHp * 0.15);
                                    mini.hp = mini.maxHp;
                                    mini.atk = Math.ceil(this.atk * 0.5);
                                    mini.speed = this.speed * 1.3;
                                    mini.color = '#00e1ff';
                                    window.gameEngine.monsters.push(mini);
                                    window.gameEngine.showFloatingText("SPAWN! 💠", this.x, this.y - 35, '#00e1ff');
                                }
                            }
                            Sound.play('shoot');
                        }
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
                    {
                        let isFrenzy = this.hp <= this.maxHp * 0.5;

                        if (!this.isFixedToCenter) {
                            // 맵 중앙으로 이동
                            let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
                            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
                            let cx = mapW / 2 - this.x;
                            let cy = mapH / 2 - this.y;
                            let cdist = Math.hypot(cx, cy);
                            if (cdist > 5) {
                                this.x += (cx / cdist) * activeSpeed * 1.5;
                                this.y += (cy / cdist) * activeSpeed * 1.5;
                            } else {
                                this.x = mapW / 2;
                                this.y = mapH / 2;
                                this.isFixedToCenter = true;
                                this.rotationAngle = 0;
                            }
                        } else {
                            // 중앙 고정 회전 탄막
                            this.shootCooldown -= timeScale;
                            if (this.shootCooldown <= 0) {
                                this.shootCooldown = isFrenzy ? 21 : 28;
                                this.rotationAngle = (this.rotationAngle || 0) + (isFrenzy ? 0.18 : 0.12);
                                
                                // 분노 시 8방향, 평소 6방향
                                let directions = isFrenzy ? 8 : 6;
                                for (let i = 0; i < directions; i++) {
                                    let bAngle = this.rotationAngle + (i * Math.PI * 2 / directions);
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
                            // 약화 상태(다른 보스와 동시 출현)일 때 격자 쿨타임 대폭 증가
                            let gridCoolBase = this.isWeakened ? (isFrenzy ? 280 : 420) : (isFrenzy ? 160 : 280);
                            this.laserTimer -= timeScale;
                            if (this.laserTimer <= 0) {
                                this.gridLaserActive = this.isWeakened ? 80 : 100; // 약화 시 격자 지속 시간 단축
                                this.laserTimer = gridCoolBase + Math.random() * 80;
                                Sound.play('boss_alert');
                            }
                        }

                        // 기믹 적용 및 경고 표시
                        let gridWarnThresh = this.isWeakened ? 45 : 35; // 약화 시 경고 시간 확장
                        if (this.gridLaserActive > 0) {
                            this.boss_sonicDisruptionActive = true;
                            this.gridLaserActive -= timeScale;

                            if (this.gridLaserActive > gridWarnThresh) {
                                this.boss_warningText = "SONIC DISRUPTION";
                                this.boss_timerText = ((this.gridLaserActive - gridWarnThresh) / 60).toFixed(1) + "s";
                                this.boss_castProgress = (this.isWeakened ? 80 : 100) - this.gridLaserActive;
                                this.boss_castMax = (this.isWeakened ? 80 : 100) - gridWarnThresh;
                            } else {
                                this.boss_warningText = "GRID LASER ACTIVE 🚨";
                                this.boss_timerText = (this.gridLaserActive / 60).toFixed(1) + "s";
                                this.boss_castProgress = this.gridLaserActive;
                                this.boss_castMax = gridWarnThresh;
                            }

                            // 실 발사 구간에 진입 시 플레이어 충돌 판정
                            // 격자 간격: 단독 83px (1.2배 확장), 약화 시 120px (완화)
                            let gridSpacing = this.isWeakened ? 120 : 83;
                            let gridThickness = this.isWeakened ? 7 : 12;
                            let gridDmgMult = this.isWeakened ? 0.04 : 0.08;
                            if (this.gridLaserActive <= gridWarnThresh && this.gridLaserActive > 0 && window.gameEngine) {
                                let pl = window.gameEngine.player;
                                let isHit = false;
                                let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
                                let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
                                for (let lx = gridSpacing; lx <= mapW - gridSpacing; lx += gridSpacing) {
                                    if (Math.abs(pl.x - lx) < gridThickness + pl.radius) isHit = true;
                                }
                                for (let ly = gridSpacing; ly <= mapH - gridSpacing; ly += gridSpacing) {
                                    if (Math.abs(pl.y - ly) < gridThickness + pl.radius) isHit = true;
                                }
                                if (isHit) {
                                    window.gameEngine.damagePlayer(this.atk * gridDmgMult * timeScale, this.x, this.y);
                                }
                            }
                        } else {
                            this.boss_sonicDisruptionActive = false;
                            if (this.isFixedToCenter) {
                                this.boss_warningText = "";
                                this.boss_timerText = "";
                            }
                        }
                    }
                    break;

                case 'boss_warper': // 60층 보이드 워퍼
                    {
                        let isFrenzy = this.hp <= this.maxHp * 0.5;

                        // 탄 흡수 보호막 타이머 차감 업데이트
                        if (this.blackholeActiveTimer > 0) {
                            this.blackholeActiveTimer -= timeScale;
                            
                            // 50% 이하 분노 시 블랙홀 흡입 인력 유발 (플레이어를 보스 방향으로 끌어당김)
                            if (isFrenzy && window.gameEngine) {
                                let pl = window.gameEngine.player;
                                let pdx = this.x - pl.x;
                                let pdy = this.y - pl.y;
                                let pdist = Math.hypot(pdx, pdy);
                                if (pdist > 20 && pdist < 400) {
                                    let force = (1.2 * (1.0 - pdist / 400)) * timeScale;
                                    pl.x += (pdx / pdist) * force;
                                    pl.y += (pdy / pdist) * force;
                                }
                            }

                            // 배리어 해제 시 취약 쿨다운 시작 (이 기간 동안 배리어 재발동 불가)
                            if (this.blackholeActiveTimer <= 0) {
                                this.shieldCooldown = isFrenzy ? 120 : 180; // 분노: 2초, 평시: 3초 취약 구간
                                if (window.gameEngine) {
                                    window.gameEngine.showFloatingText("SHIELD DOWN! 💥", this.x, this.y - 35, '#ffdd00');
                                }
                            }
                        }

                        // 배리어 재발동 쿨다운 차감
                        if (this.shieldCooldown === undefined) this.shieldCooldown = 0;
                        if (this.shieldCooldown > 0) {
                            this.shieldCooldown -= timeScale;
                        }

                        // 플레이어와 거리 카이팅 (거리 180~250px 유지)
                        if (dist < 180) {
                            this.x -= Math.cos(angle) * activeSpeed * 0.9;
                            this.y -= Math.sin(angle) * activeSpeed * 0.9;
                        } else if (dist > 250) {
                            this.x += Math.cos(angle) * activeSpeed;
                            this.y += Math.sin(angle) * activeSpeed;
                        }

                        // 평상시 플레이어 조준 3방향 보이드 탄환 사격 패턴
                        this.shootCooldown -= timeScale;
                        if (this.shootCooldown <= 0) {
                            this.shootCooldown = 60 + Math.random() * 40;
                            for (let i = -1; i <= 1; i++) {
                                let bAngle = angle + (i * 0.22);
                                let vx = Math.cos(bAngle) * 3.0;
                                let vy = Math.sin(bAngle) * 3.0;
                                bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.7, false, {
                                    color: '#00ffcc',
                                    radius: 5.5
                                }));
                            }
                            Sound.play('shoot');
                        }

                        // 텔레포트 업데이트 (분노 시 35% 더 빠른 주기로 도약)
                        this.teleportCooldown -= timeScale * (isFrenzy ? 1.35 : 1.0);

                        // 캐스팅 타이머 및 경고 텍스트 표시
                        if (this.blackholeActiveTimer > 0) {
                            this.boss_warningText = "VOID SHIELD 🌀";
                            this.boss_timerText = (this.blackholeActiveTimer / 60).toFixed(1) + "s";
                            this.boss_castProgress = this.blackholeActiveTimer;
                            this.boss_castMax = isFrenzy ? 150 : 90;
                        } else if (this.shieldCooldown > 0) {
                            // 취약 구간 표시 (배리어 없이 데미지 가능)
                            this.boss_warningText = "⚡ VULNERABLE!";
                            this.boss_timerText = (this.shieldCooldown / 60).toFixed(1) + "s";
                            this.boss_castProgress = this.shieldCooldown;
                            this.boss_castMax = isFrenzy ? 120 : 180;
                        } else if (this.teleportCooldown <= 30 && this.teleportCooldown > 0) {
                            this.boss_warningText = "WARP PREPARING";
                            this.boss_timerText = (this.teleportCooldown / 60).toFixed(1) + "s";
                            this.boss_castProgress = 30 - this.teleportCooldown;
                            this.boss_castMax = 30;
                        } else {
                            this.boss_warningText = "";
                            this.boss_timerText = "";
                        }

                        if (this.teleportCooldown <= 0 && dist < 350) {
                            this.teleportCooldown = 200 + Math.random() * 60;
                            let warpAngle = Math.random() * Math.PI * 2;
                            let warpDist = 160 + Math.random() * 80;
                            let targetX = player.x + Math.cos(warpAngle) * warpDist;
                            let targetY = player.y + Math.sin(warpAngle) * warpDist;

                            let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
                            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
                            targetX = Math.max(wallMargin + this.radius, Math.min(mapW - wallMargin - this.radius, targetX));
                            targetY = Math.max(wallMargin + this.radius, Math.min(mapH - wallMargin - this.radius, targetY));

                            // [수정] 텔레포트 목적지가 타일벽 내부인지 체크, 벽이라면 최대 10번 다른 방향으로 재시도
                            if (window.gameEngine && window.gameEngine.isTileWall) {
                                let attempts = 0;
                                while (window.gameEngine.isTileWall(targetX, targetY) && attempts < 10) {
                                    warpAngle = Math.random() * Math.PI * 2;
                                    warpDist = 120 + Math.random() * 120;
                                    targetX = player.x + Math.cos(warpAngle) * warpDist;
                                    targetY = player.y + Math.sin(warpAngle) * warpDist;
                                    targetX = Math.max(wallMargin + this.radius, Math.min(mapW - wallMargin - this.radius, targetX));
                                    targetY = Math.max(wallMargin + this.radius, Math.min(mapH - wallMargin - this.radius, targetY));
                                    attempts++;
                                }
                                // 10번 시도했음에도 벽 내부라면 텔레포트 취소하고 쿨타임만 짧게 설정
                                if (window.gameEngine.isTileWall(targetX, targetY)) {
                                    this.teleportCooldown = 60;
                                    return;
                                }
                            }

                            // 텔레포트 파티클 이펙트 및 공간 균열 기믹 설치
                            if (window.gameEngine) {
                                // 1. 공간 균열 기믹 추가: 원래 있던 자리에 플레이어에게 감속/대미지를 유발하는 균열 설치
                                let rift = new Particle(this.x, this.y, '#b026ff', 30, 0, 0, 90, 'boss_spatial_rift');
                                rift.atk = this.atk * 0.3; // 균열 틱 피해
                                window.gameEngine.particles.push(rift);

                                for (let k = 0; k < 12; k++) {
                                    let pAngle = Math.random() * Math.PI * 2;
                                    let pSpeed = Math.random() * 3 + 1;
                                    window.gameEngine.particles.push(new Particle(this.x, this.y, '#00ffcc', 2.0, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15, 'spark'));
                                }
                                
                                // 텔레포트 도약 직후 360도 8방향 보이드 방사 탄막 발사 패턴
                                for (let i = 0; i < 8; i++) {
                                    let bAngle = (i * Math.PI / 4);
                                    let vx = Math.cos(bAngle) * 2.6;
                                    let vy = Math.sin(bAngle) * 2.6;
                                    bullets.push(new Bullet(targetX, targetY, vx, vy, this.atk * 0.7, false, {
                                        color: '#00ffcc',
                                        radius: 5.5
                                    }));
                                }
                                window.gameEngine.showFloatingText("VOID BURST! 🌀", targetX, targetY - 30, '#00ffcc');
                                Sound.play('shoot');

                                // 텔레포트 도약 성공 시 배리어 재발동 (쿨다운 중이면 배리어 생략)
                                if (this.shieldCooldown <= 0) {
                                    this.blackholeActiveTimer = isFrenzy ? 120 : 75; // 분노: 2초, 평시: 1.25초 (기존 대비 단축)
                                } else {
                                    // 취약 구간 중: 배리어 없이 텔포만 수행
                                    window.gameEngine.showFloatingText("NO SHIELD!", targetX, targetY - 50, '#ffdd00');
                                }
                            }

                            this.x = targetX;
                            this.y = targetY;
                        }
                    }
                    break;

                case 'boss_portal': // 70층 차원 차단기
                    {
                        // 포털 스폰이 아직 안 되었다면 즉시 모퉁이에 4개 포털 생성
                        if (!this.portalSpawned && window.gameEngine) {
                            let mapW = window.gameEngine.mapWidth;
                            let mapH = window.gameEngine.mapHeight;
                            const portalSpots = [
                                { x: 150, y: 150 },
                                { x: mapW - 150, y: 150 },
                                { x: 150, y: mapH - 150 },
                                { x: mapW - 150, y: mapH - 150 }
                            ];
                            portalSpots.forEach(spot => {
                                let spawner = new Monster(spot.x, spot.y, this.tier, this.roomNum);
                                spawner.makeBoss(this.roomNum, 'boss_portal_spawner', true);
                                window.gameEngine.monsters.push(spawner);
                            });
                            this.portalSpawned = true;
                            window.gameEngine.showFloatingText("배리어가 활성화되었습니다! 포털을 파괴하세요!", this.x, this.y - 45, '#8b5cf6');
                        }

                        let spawners = [];
                        if (window.gameEngine) {
                            spawners = window.gameEngine.monsters.filter(m => m.type === 'boss_portal_spawner' && m.hp > 0 && !m.dead);
                        }

                        // 전기 사슬 ON/OFF 주기 제어
                        if (this.chainCycleTimer === undefined) {
                            this.chainCycleTimer = 0;
                            this.chainActive = false; // 초반에는 사슬 비활성 (취약 구간으로 시작)
                            this.chainPhase = 'off'; // 'on' or 'off'
                        }
                        this.chainCycleTimer -= timeScale;

                        if (this.chainCycleTimer <= 0) {
                            if (this.chainPhase === 'off') {
                                // OFF → ON 전환: 사슬 활성화
                                this.chainPhase = 'on';
                                this.chainActive = true;
                                this.chainCycleTimer = spawners.length >= 3 ? 480 : 360; // 3개 이상: 8초, 2개 이하: 6초
                                if (window.gameEngine) {
                                    window.gameEngine.showFloatingText("⚡ CHAIN LINK ACTIVE!", this.x, this.y - 40, '#8b5cf6');
                                    Sound.play('powerup');
                                    window.gameEngine.shakeScreen(15, 2.5);
                                }
                            } else {
                                // ON → OFF 전환: 사슬 해제 (취약 구간)
                                this.chainPhase = 'off';
                                this.chainActive = false;
                                this.chainCycleTimer = spawners.length >= 3 ? 240 : 300; // 3개 이상: 4초, 2개 이하: 5초 취약
                                if (window.gameEngine) {
                                    window.gameEngine.showFloatingText("💥 CHAIN DOWN! ATTACK NOW!", this.x, this.y - 40, '#ffdd00');
                                    Sound.play('hit');
                                }
                            }
                        }

                        // 무적 판정: 스포너가 살아있고 AND 사슬이 활성화 중일 때만
                        this.isInvulnerable = spawners.length > 0 && this.chainActive;

                        // 캐스팅 타이머 및 경고 텍스트 표시
                        if (this.isInvulnerable) {
                            this.boss_warningText = "⚡ CHAIN BARRIER";
                            this.boss_timerText = "BREAK: " + (this.chainCycleTimer / 60).toFixed(1) + "s";
                            this.boss_castProgress = this.chainCycleTimer;
                            this.boss_castMax = spawners.length >= 3 ? 480 : 360;
                        } else if (spawners.length > 0 && !this.chainActive) {
                            // 사슬 해제 중 (취약 구간)
                            this.boss_warningText = "💥 VULNERABLE!";
                            this.boss_timerText = "LINK: " + (this.chainCycleTimer / 60).toFixed(1) + "s";
                            this.boss_castProgress = this.chainCycleTimer;
                            this.boss_castMax = spawners.length >= 3 ? 240 : 300;
                        } else if (spawners.length === 0) {
                            this.boss_warningText = "CORE EXPOSED! 🚨";
                            this.boss_timerText = "";
                            this.boss_castProgress = 0;
                            this.boss_castMax = 0;
                            this.chainActive = false;
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

                        // [추가 기믹]: 발전기 2개 이하 생존 시 직접 조준 3방향 탄막 발사
                        if (spawners.length > 0 && spawners.length <= 2) {
                            if (this.shootCooldown === undefined || this.shootCooldown === null) this.shootCooldown = 60;
                            this.shootCooldown -= timeScale;
                            if (this.shootCooldown <= 0) {
                                this.shootCooldown = 60; // 1초 주기
                                for (let i = -1; i <= 1; i++) {
                                    let bAngle = angle + (i * 0.2);
                                    let vx = Math.cos(bAngle) * 3.0;
                                    let vy = Math.sin(bAngle) * 3.0;
                                    bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.7, false, {
                                        color: '#8b5cf6',
                                        radius: 5.5
                                    }));
                                }
                                Sound.play('shoot');
                            }
                        }
                    }
                    break;

                case 'boss_portal_spawner': // 70층 포털 발전기 (부하)
                    this.summonCooldown -= timeScale;
                    if (this.summonCooldown <= 0 && window.gameEngine) {
                        this.summonCooldown = 240 + Math.random() * 80; // 소환 쿨타임 증가 (기존 180+60 → 240+80)
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
                    {
                        let isFrenzy = this.hp <= this.maxHp * 0.5;

                        // [개선 3] 적응형 이동: 실드 상태에 따라 행동 변화
                        if (this.shieldHp > 0) {
                            // 실드 있음: 느린 직선 추격
                            this.x += Math.cos(angle) * activeSpeed;
                            this.y += Math.sin(angle) * activeSpeed;
                        } else {
                            // 실드 없음: 1.5배 속도 + 지그재그 회피 기동 (실드 재생을 노림)
                            let zigzagPhase = Math.sin(Date.now() * 0.008) * 0.8;
                            let evasionAngle = angle + zigzagPhase;
                            let evasionSpeed = activeSpeed * 1.5;
                            if (dist < 180) {
                                // 근접 시 도주
                                this.x -= Math.cos(evasionAngle) * evasionSpeed;
                                this.y -= Math.sin(evasionAngle) * evasionSpeed;
                            } else {
                                // 원거리 시 측면 기동
                                let sideAngle = angle + Math.PI / 2 * (Math.sin(Date.now() * 0.003) > 0 ? 1 : -1);
                                this.x += Math.cos(sideAngle) * evasionSpeed * 0.7;
                                this.y += Math.sin(sideAngle) * evasionSpeed * 0.7;
                            }
                        }

                        // 실드 자연 재생 메커니즘
                        if (this.shieldRechargeTimer > 0) {
                            this.shieldRechargeTimer -= timeScale;
                        } else {
                            // 피격되지 않고 5초 경과 시 매초 실드 6% 재생
                            this.shieldHp = Math.min(this.maxShieldHp, this.shieldHp + (this.maxShieldHp * 0.06 / 60) * timeScale);
                        }

                        // [개선 2] 실드가 0이 되는 순간: 충격파 + 나노 군집 폭발 (12발 원형 산탄)
                        if (this.shieldHp <= 0 && !this.boss_shieldDischarged) {
                            this.boss_shieldDischarged = true;
                            if (window.gameEngine) {
                                // 주변 120px 내의 플레이어 탄환 삭제
                                window.gameEngine.bullets = window.gameEngine.bullets.filter(b => {
                                    let d = Math.hypot(b.x - this.x, b.y - this.y);
                                    return (b.isEnemyBullet || d >= 120);
                                });

                                // 플레이어 넉백
                                let pl = window.gameEngine.player;
                                let pAngle = Math.atan2(pl.y - this.y, pl.x - this.x);
                                pl.x += Math.cos(pAngle) * 50;
                                pl.y += Math.sin(pAngle) * 50;
                                const margin = 40;
                                pl.x = Math.max(margin + pl.radius, Math.min(window.gameEngine.mapWidth - margin - pl.radius, pl.x));
                                pl.y = Math.max(margin + pl.radius, Math.min(window.gameEngine.mapHeight - margin - pl.radius, pl.y));

                                // 12발 나노 군집 방사 탄막
                                let burstCount = isFrenzy ? 16 : 12;
                                for (let i = 0; i < burstCount; i++) {
                                    let bAngle = (i * Math.PI * 2 / burstCount);
                                    let speed = 2.0 + Math.random() * 0.8;
                                    bullets.push(new Bullet(this.x, this.y, Math.cos(bAngle) * speed, Math.sin(bAngle) * speed, this.atk * 0.5, false, {
                                        color: '#e2e8f0',
                                        radius: 4
                                    }));
                                }

                                window.gameEngine.shakeScreen(20, 6.0);
                                Sound.play('explosion');
                                window.gameEngine.showFloatingText("🧬 NANO SWARM BURST!", this.x, this.y - 45, '#e2e8f0');
                                window.gameEngine.particles.push(new Particle(this.x, this.y, 'rgba(226, 232, 240, 0.4)', 120, 0, 0, 20, 'explosionRing'));
                            }
                        }

                        // 실드 다 차면 충격파 플래그 리셋
                        if (this.shieldHp >= this.maxShieldHp) {
                            this.boss_shieldDischarged = false;
                        }

                        // 실드가 소실된 동안 공격 쿨다운 단축 및 3방향 나노 레이저 사격
                        if (this.shieldHp <= 0) {
                            if (this.boss_hiveShootCooldown === undefined || this.boss_hiveShootCooldown === null) this.boss_hiveShootCooldown = 45;
                            this.boss_hiveShootCooldown -= timeScale * 1.25;
                            if (this.boss_hiveShootCooldown <= 0) {
                                this.boss_hiveShootCooldown = isFrenzy ? 35 : 45;
                                let shootCount = isFrenzy ? 5 : 3;
                                let startOff = -(shootCount - 1) / 2;
                                for (let i = 0; i < shootCount; i++) {
                                    let bAngle = angle + ((startOff + i) * 0.18);
                                    let vx = Math.cos(bAngle) * 3.5;
                                    let vy = Math.sin(bAngle) * 3.5;
                                    bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.75, false, {
                                        color: '#ff4444',
                                        radius: 4.5
                                    }));
                                }
                                Sound.play('shoot');
                            }
                        }

                        // [개선 4] 50% 이하 분노: 나노 지뢰 살포
                        if (isFrenzy) {
                            if (this.boss_mineTimer === undefined) this.boss_mineTimer = 180;
                            this.boss_mineTimer -= timeScale;
                            if (this.boss_mineTimer <= 0 && window.gameEngine) {
                                this.boss_mineTimer = 200 + Math.random() * 60; // 3.3~4.3초 주기
                                let mineCount = window.gameEngine.particles.filter(p => p.type === 'boss_nano_mine' && p.life > 0).length;
                                if (mineCount < 4) {
                                    // 보스 현재 위치에 나노 지뢰 설치
                                    let mine = new Particle(this.x, this.y, '#ff6666', 12, 0, 0, 600, 'boss_nano_mine');
                                    mine.atk = this.atk * 0.6;
                                    mine.mineRadius = 55; // 폭발 반경
                                    window.gameEngine.particles.push(mine);
                                    window.gameEngine.showFloatingText("💀 NANO MINE!", this.x, this.y - 25, '#ff6666');
                                    Sound.play('boss_alert');
                                }
                            }

                            // 나노 지뢰 근접 폭발 판정
                            if (window.gameEngine) {
                                let pl = window.gameEngine.player;
                                window.gameEngine.particles.forEach(p => {
                                    if (p.type === 'boss_nano_mine' && p.life > 0) {
                                        let md = Math.hypot(pl.x - p.x, pl.y - p.y);
                                        if (md < p.mineRadius + pl.radius) {
                                            // 폭발!
                                            window.gameEngine.damagePlayer(p.atk, p.x, p.y);
                                            // 감속 디버프 3초
                                            if (!pl.debuffs) pl.debuffs = {};
                                            pl.debuffs.slow = Math.max(pl.debuffs.slow || 0, 180);
                                            // 폭발 이펙트
                                            window.gameEngine.particles.push(new Particle(p.x, p.y, '#ff4444', 55, 0, 0, 15, 'explosionRing'));
                                            window.gameEngine.shakeScreen(8, 3.0);
                                            Sound.play('explosion');
                                            p.life = 0; // 지뢰 소멸
                                        }
                                    }
                                });
                            }
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

                        // 캐스팅 타이머 및 경고 텍스트 표시
                        if (this.shieldHp > 0) {
                            this.boss_warningText = "NANO SHIELD ACTIVE";
                            this.boss_timerText = "SHIELD: " + Math.round(this.shieldHp);
                            this.boss_castProgress = this.shieldHp;
                            this.boss_castMax = this.maxShieldHp;
                        } else {
                            let warningBase = isFrenzy ? "⚠️ OVERLOAD + MINES" : "SHIELD BROKEN: OVERLOAD 🚨";
                            this.boss_warningText = warningBase;
                            this.boss_timerText = "RECHARGE: " + (this.shieldRechargeTimer / 60).toFixed(1) + "s";
                            this.boss_castProgress = 300 - this.shieldRechargeTimer;
                            this.boss_castMax = 300;
                        }
                    }
                    break;

                case 'boss_hive_healer': // 80층 보스 보조 힐러 (부하)
                    // [개선 1] 힐러: 회복 후 플레이어 돌진 공격 전환
                    if (window.gameEngine) {
                        let hive = window.gameEngine.monsters.find(m => m.type === 'boss_hive' && m.hp > 0);

                        // 돌진 상태 초기화
                        if (this.healerDashTimer === undefined) {
                            this.healerDashTimer = 0;
                            this.healerDashAngle = 0;
                            this.healerMode = 'orbit'; // 'orbit' or 'dash'
                        }

                        if (this.healerMode === 'dash') {
                            // 플레이어를 향해 돌진 중 (빨간색으로 변화)
                            this.color = '#ff4444';
                            this.glowColor = '#ff4444';
                            this.healerDashTimer -= timeScale;
                            this.x += Math.cos(this.healerDashAngle) * activeSpeed * 3.5;
                            this.y += Math.sin(this.healerDashAngle) * activeSpeed * 3.5;

                            // 돌진 중 플레이어 접촉 시 데미지
                            let pl = window.gameEngine.player;
                            let pDist = Math.hypot(pl.x - this.x, pl.y - this.y);
                            if (pDist < this.radius + pl.radius + 5) {
                                window.gameEngine.damagePlayer(this.atk * 1.5, this.x, this.y);
                                window.gameEngine.shakeScreen(8, 3.0);
                                this.healerMode = 'orbit'; // 충돌 후 복귀
                            }

                            // 돌진 시간 초과 시 궤도 복귀
                            if (this.healerDashTimer <= 0) {
                                this.healerMode = 'orbit';
                                this.color = '#10b981';
                                this.glowColor = '#10b981';
                            }

                            // 돌진 궤적 파티클
                            if (Math.random() < 0.4) {
                                window.gameEngine.particles.push(new Particle(this.x, this.y, '#ff4444', 2, 0, 0, 10, 'spark'));
                            }
                        } else if (hive) {
                            // 궤도 모드: 보스 주변 선회
                            this.color = '#10b981';
                            this.glowColor = '#10b981';
                            let hx = hive.x - this.x;
                            let hy = hive.y - this.y;
                            let hdist = Math.hypot(hx, hy);
                            if (hdist > 60) {
                                this.x += (hx / hdist) * activeSpeed * 1.3;
                                this.y += (hy / hdist) * activeSpeed * 1.3;
                            } else {
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
                                    for (let k = 0; k < 6; k++) {
                                        let pAngle = Math.random() * Math.PI * 2;
                                        let pSpeed = Math.random() * 1.5 + 0.5;
                                        window.gameEngine.particles.push(new Particle(hive.x, hive.y, '#10b981', 1.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15));
                                    }

                                    // 회복 완료 후 → 플레이어 돌진 모드 전환!
                                    this.healerMode = 'dash';
                                    this.healerDashTimer = 60; // 1초간 돌진
                                    this.healerDashAngle = Math.atan2(player.y - this.y, player.x - this.x);
                                    window.gameEngine.showFloatingText("⚔️ HEALER CHARGE!", this.x, this.y - 20, '#ff4444');
                                }
                            }
                        } else {
                            // 보스가 없으면 플레이어를 향해 자포자기 돌진
                            this.x += Math.cos(angle) * activeSpeed * 2.0;
                            this.y += Math.sin(angle) * activeSpeed * 2.0;
                        }
                    }
                    break;

                case 'boss_chaos': // 90층 카오스 코어
                    {
                        let isFrenzy = this.hp <= this.maxHp * 0.5;

                        // 플레이어 카이팅 추격
                        if (dist > 140) {
                            this.x += Math.cos(angle) * activeSpeed;
                            this.y += Math.sin(angle) * activeSpeed;
                        }

                        // 속성 변환 시스템
                        this.elementTimer -= timeScale;
                        if (this.elementTimer <= 0) {
                            let oldElement = this.element;
                            this.elementTimer = isFrenzy ? 300 : 600; // 분노 시 5초, 평소 10초
                            
                            if (this.element === 'fire') {
                                this.element = 'lightning';
                                this.color = '#b026ff';
                                this.glowColor = '#b026ff';
                            } else if (this.element === 'lightning') {
                                this.element = 'ice';
                                this.color = '#00f0ff';
                                this.glowColor = '#00f0ff';
                            } else {
                                this.element = 'fire';
                                this.color = '#ff3300';
                                this.glowColor = '#ff3300';
                            }
                            this.boss_prevElement = oldElement; // 이전 원소 기억

                            if (window.gameEngine) {
                                // [추가 기믹]: 카오스 진동파 - 원소 교체 시 화면 흔들림과 플레이어 넉백
                                window.gameEngine.shakeScreen(30, 4.5);
                                let pl = window.gameEngine.player;
                                let pAngle = Math.atan2(pl.y - this.y, pl.x - this.x);
                                pl.x += Math.cos(pAngle) * 25;
                                pl.y += Math.sin(pAngle) * 25;
                                
                                // 경계 벽 가두기 보정
                                const margin = 40;
                                pl.x = Math.max(margin + pl.radius, Math.min(window.gameEngine.mapWidth - margin - pl.radius, pl.x));
                                pl.y = Math.max(margin + pl.radius, Math.min(window.gameEngine.mapHeight - margin - pl.radius, pl.y));

                                let title = `ELEMENT: ${this.element.toUpperCase()}! 🔥`;
                                if (this.element === 'lightning') title = `ELEMENT: LIGHTNING! ⚡`;
                                if (this.element === 'ice') title = `ELEMENT: FROST! ❄️`;
                                window.gameEngine.showFloatingText(title, this.x, this.y - 35, this.color);
                                Sound.play('powerup');
                            }
                        }

                        // 캐스팅 타이머 및 경고 텍스트 표시
                        this.boss_warningText = "ELEMENT: " + this.element.toUpperCase() + (isFrenzy ? " (FRENZY)" : "");
                        this.boss_timerText = "SHIFT: " + (this.elementTimer / 60).toFixed(1) + "s";
                        this.boss_castProgress = this.elementTimer;
                        this.boss_castMax = isFrenzy ? 300 : 600;

                        // 속성 전용 격발 AI
                        this.shootCooldown -= timeScale;
                        if (this.shootCooldown <= 0) {
                            this.shootCooldown = 40 + Math.random() * 20;

                            if (this.element === 'fire') {
                                for (let i = -1; i <= 1; i++) {
                                    let bAngle = angle + (i * 0.22);
                                    let vx = Math.cos(bAngle) * 2.2;
                                    let vy = Math.sin(bAngle) * 2.2;
                                    bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 1.1, false, {
                                        color: '#ff3300',
                                        radius: 9,
                                        splashRadius: 40
                                    }));
                                }
                            } else if (this.element === 'lightning') {
                                // 번개: 5방향 빠른 전기 화살 연사 (마비 유발)
                                for (let i = -2; i <= 2; i++) {
                                    let bAngle = angle + (i * 0.18);
                                    let vx = Math.cos(bAngle) * 3.5;
                                    let vy = Math.sin(bAngle) * 3.5;
                                    let bullet = new Bullet(this.x, this.y, vx, vy, this.atk * 0.7, false, {
                                        color: '#b026ff',
                                        radius: 5.5
                                    });
                                    bullet.isStunner = true; // 피격 시 마비 45프레임 유도 속성
                                    bullets.push(bullet);
                                }
                            } else if (this.element === 'ice') {
                                // 냉기: 6방향 원형 냉동 포탄 방사
                                for (let i = 0; i < 6; i++) {
                                    let bAngle = angle + (i * Math.PI / 3);
                                    let vx = Math.cos(bAngle) * 2.6;
                                    let vy = Math.sin(bAngle) * 2.6;
                                    let bullet = new Bullet(this.x, this.y, vx, vy, this.atk * 0.75, false, {
                                        color: '#00f0ff',
                                        radius: 5.5
                                    });
                                    bullet.isSlower = true; // 피격 시 플레이어 감속 속성
                                    bullets.push(bullet);
                                }
                            }

                            // 50% 이하 분노 시: 이전 원소 추가 발사 (이중 원소 융합 공격)
                            if (isFrenzy && this.boss_prevElement) {
                                let fuseAngle = angle + Math.PI; // 반대 방향
                                let fuseColor = '#ffaa00';
                                if (this.boss_prevElement === 'fire') fuseColor = '#ff3300';
                                else if (this.boss_prevElement === 'lightning') fuseColor = '#b026ff';
                                else if (this.boss_prevElement === 'ice') fuseColor = '#00f0ff';
                                
                                for (let i = -1; i <= 1; i++) {
                                    let bAngle = fuseAngle + (i * 0.3);
                                    let vx = Math.cos(bAngle) * 2.8;
                                    let vy = Math.sin(bAngle) * 2.8;
                                    bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.6, false, {
                                        color: fuseColor,
                                        radius: 5
                                    }));
                                }
                            }
                            Sound.play('shoot');
                        }
                    }
                    break;

                case 'boss_final': // 100층 최종 보스
                    {
                        let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
                        this.x = mapW / 2;
                        this.y = 100; // 벽면 고정

                        // 1페이즈 포탑 소환 제어
                        if (!this.turretsSpawned && window.gameEngine) {
                            let leftTurret = new Monster(mapW * 0.25, 150, this.tier, this.roomNum);
                            leftTurret.makeBoss(this.roomNum, 'boss_final_turret', true);
                            
                            let rightTurret = new Monster(mapW * 0.75, 150, this.tier, this.roomNum);
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

                        // [추가 기믹]: 2페이즈 진입 시 시스템 포맷 (MP 드레인 + 본체 추가 실드 생성)
                        if (this.phase === 2 && !this.boss_finalCoreReset) {
                            this.boss_finalCoreReset = true;
                            if (window.gameEngine) {
                                let pl = window.gameEngine.player;
                                pl.mp = 0; // 마나 번
                                
                                // 보스 본체 실드 부여
                                this.shieldHp = Math.ceil(this.maxHp * 0.20);
                                this.maxShieldHp = this.shieldHp;
                                this.shieldRechargeTimer = 300;

                                Sound.play('explosion');
                                window.gameEngine.showFloatingText("⚡ SYSTEM FORMAT: PLAYER MP DRAINED! ⚡", this.x, this.y - 45, '#ff0055');
                                window.gameEngine.shakeScreen(30, 5.0);
                            }
                        }

                        let isFrenzy75 = this.phase === 2 && this.hp <= this.maxHp * 0.75;
                        let isFrenzy50 = this.phase === 2 && this.hp <= this.maxHp * 0.50;
                        let isFrenzy25 = this.phase === 2 && this.hp <= this.maxHp * 0.25;

                        // [추가 기믹 50% 이하]: 코어 중력 붕괴 (플레이어를 상단 중앙 보스 쪽으로 끌어당김)
                        if (isFrenzy50 && window.gameEngine) {
                            let pl = window.gameEngine.player;
                            let pdx = this.x - pl.x;
                            let pdy = this.y - pl.y;
                            let pdist = Math.hypot(pdx, pdy);
                            if (pdist > 50) {
                                // 위쪽으로 강한 인력, 좌우로 약간의 인력
                                pl.y += (pdy / pdist) * 0.75 * timeScale;
                                pl.x += (pdx / pdist) * 0.35 * timeScale;

                                // 경계 가두기 보정
                                const margin = 40;
                                pl.x = Math.max(margin + pl.radius, Math.min(window.gameEngine.mapWidth - margin - pl.radius, pl.x));
                                pl.y = Math.max(margin + pl.radius, Math.min(window.gameEngine.mapHeight - margin - pl.radius, pl.y));
                            }
                        }

                        // [추가 기믹 75% 이하]: 둠 스피커 기믹 차용한 세로 3선 격자 레이저
                        if (isFrenzy75) {
                            if (this.boss_finalGridTimer === undefined) this.boss_finalGridTimer = 240;
                            this.boss_finalGridTimer -= timeScale;
                            if (this.boss_finalGridTimer <= 0) {
                                this.boss_finalGridActive = 100; // 65경고, 35발사
                                this.boss_finalGridTimer = 240 + Math.random() * 60;
                                Sound.play('boss_alert');

                                // 3개의 세로 격자 레이저 축 설정 (플레이어 주변 기준 조준)
                                if (window.gameEngine) {
                                    let pl = window.gameEngine.player;
                                    this.boss_finalGridLines = [pl.x - 120, pl.x, pl.x + 120];
                                } else {
                                    this.boss_finalGridLines = [mapW * 0.3, mapW * 0.5, mapW * 0.7];
                                }
                            }

                            if (this.boss_finalGridActive > 0) {
                                this.boss_finalGridActive -= timeScale;
                                
                                // 발사 단계(35프레임 이하) 틱 데미지
                                if (this.boss_finalGridActive <= 35 && window.gameEngine) {
                                    let pl = window.gameEngine.player;
                                    let isHit = false;
                                    const thickness = 10;
                                    this.boss_finalGridLines.forEach(lineX => {
                                        if (Math.abs(pl.x - lineX) < thickness + pl.radius && pl.y > 40 && pl.y < window.gameEngine.mapHeight - 40) {
                                            isHit = true;
                                        }
                                    });
                                    if (isHit) {
                                        window.gameEngine.damagePlayer(this.atk * 0.05 * timeScale, this.x, this.y);
                                    }
                                }
                            }
                        }

                        // 실드 재생 연산
                        if (this.shieldHp !== undefined && this.shieldHp > 0) {
                            if (this.shieldRechargeTimer > 0) {
                                this.shieldRechargeTimer -= timeScale;
                            } else {
                                this.shieldHp = Math.min(this.maxShieldHp, this.shieldHp + (this.maxShieldHp * 0.05 / 60) * timeScale);
                            }
                        }

                        // 페이즈별 탄막 사격 (25% 폭주 시 18프레임 주기로 가속)
                        this.shootCooldown -= timeScale;
                        if (this.shootCooldown <= 0) {
                            this.shootCooldown = this.phase === 1 ? 55 : (isFrenzy25 ? 18 : 35);

                            if (this.phase === 1) {
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
                                // 2페이즈: 나선 탄막 (25% 이하 시 3방향, 평소 2방향)
                                this.rotationAngle = (this.rotationAngle || 0) + 0.15;
                                let directions = isFrenzy25 ? 3 : 2;
                                for (let i = 0; i < directions; i++) {
                                    let bAngle = this.rotationAngle + (i * Math.PI * 2 / directions);
                                    let vx = Math.cos(bAngle) * 2.5;
                                    let vy = Math.sin(bAngle) * 2.5;
                                    bullets.push(new Bullet(this.x, this.y, vx, vy, this.atk * 0.7, false, {
                                        color: '#ff0055',
                                        radius: 5
                                    }));
                                }

                                // 유도탄 사출 (25% 이하 시 35% 확률로 증가, 평소 15%)
                                let homingChance = isFrenzy25 ? 0.35 : 0.15;
                                if (Math.random() < homingChance && window.gameEngine) {
                                    let homingBullet = new Bullet(this.x, this.y, Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, this.atk * 1.2, false, {
                                        color: '#ffdd00',
                                        radius: 8.5
                                    });
                                    homingBullet.homing = true;
                                    bullets.push(homingBullet);
                                }
                            }
                            Sound.play('shoot');
                        }

                        // 2페이즈 전용: 세로형 거대 청소 레이저 가동 (Sweep Laser)
                        if (this.phase === 2) {
                            if (this.laserWarningTimer <= 0 && this.laserActiveTimer <= 0) {
                                if (Math.random() < 0.007) {
                                    this.laserWarningTimer = 70;
                                    this.laserX = player.x;
                                    Sound.play('boss_alert');
                                }
                            }

                            if (this.laserWarningTimer > 0) {
                                this.laserWarningTimer -= timeScale;
                                if (this.laserWarningTimer <= 0) {
                                    this.laserActiveTimer = 35;
                                    if (window.gameEngine) {
                                        Sound.play('explosion');
                                        window.gameEngine.shakeScreen(30, 4.0);
                                    }
                                }
                            }

                            if (this.laserActiveTimer > 0) {
                                this.laserActiveTimer -= timeScale;
                                if (window.gameEngine) {
                                    let pl = window.gameEngine.player;
                                    let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
                                    if (Math.abs(pl.x - this.laserX) < 40 + pl.radius && pl.y > 40 && pl.y < mapH - 40) {
                                        window.gameEngine.damagePlayer(this.atk * 0.12 * timeScale, this.x, this.y);
                                    }
                                }
                            }
                        }

                        // 시각적 타이머/경고 상태 노출 갱신
                        if (this.phase === 1) {
                            this.boss_warningText = "SHIELD ACTIVE: DESTROY GENERATORS 🛡️";
                            this.boss_timerText = "";
                        } else {
                            if (this.laserWarningTimer > 0) {
                                this.boss_warningText = "SWEEP LASER CHARGE";
                                this.boss_timerText = (this.laserWarningTimer / 60).toFixed(1) + "s";
                                this.boss_castProgress = 70 - this.laserWarningTimer;
                                this.boss_castMax = 70;
                            } else if (this.laserActiveTimer > 0) {
                                this.boss_warningText = "SWEEP FIRE! 🚨";
                                this.boss_timerText = (this.laserActiveTimer / 60).toFixed(1) + "s";
                                this.boss_castProgress = this.laserActiveTimer;
                                this.boss_castMax = 35;
                            } else if (this.boss_finalGridActive > 0) {
                                if (this.boss_finalGridActive > 35) {
                                    this.boss_warningText = "GRID LASER WARNING";
                                    this.boss_timerText = ((this.boss_finalGridActive - 35) / 60).toFixed(1) + "s";
                                    this.boss_castProgress = 100 - this.boss_finalGridActive;
                                    this.boss_castMax = 65;
                                } else {
                                    this.boss_warningText = "GRID LASER ACTIVE! 🚨";
                                    this.boss_timerText = (this.boss_finalGridActive / 60).toFixed(1) + "s";
                                    this.boss_castProgress = this.boss_finalGridActive;
                                    this.boss_castMax = 35;
                                }
                            } else {
                                if (isFrenzy25) {
                                    this.boss_warningText = "🚨 SYSTEM OVERLOAD";
                                } else if (isFrenzy50) {
                                    this.boss_warningText = "⚠️ GRAVITY DISTORTION";
                                } else if (isFrenzy75) {
                                    this.boss_warningText = "⚡ GRID SYSTEM ONLINE";
                                } else {
                                    this.boss_warningText = "⚡ CORE EXPOSED";
                                }
                                this.boss_timerText = "";
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
                let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
                let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
                this.x = Math.max(wallMargin + this.radius, Math.min(mapW - wallMargin - this.radius, this.x));
                this.y = Math.max(wallMargin + this.radius, Math.min(mapH - wallMargin - this.radius, this.y));
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
            
            const wallMargin = 50;
            let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
            this.x = Math.max(wallMargin + this.radius, Math.min(mapW - wallMargin - this.radius, this.x));
            this.y = Math.max(wallMargin + this.radius, Math.min(mapH - wallMargin - this.radius, this.y));
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
                let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
                let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
                targetX = Math.max(margin + this.radius, Math.min(mapW - margin - this.radius, targetX));
                targetY = Math.max(margin + this.radius, Math.min(mapH - margin - this.radius, targetY));

                // [수정] 텔레포트 목적지가 타일벽 내부인지 체크, 벽이라면 최대 10번 다른 방향으로 재시도
                if (window.gameEngine && window.gameEngine.isTileWall) {
                    let attempts = 0;
                    while (window.gameEngine.isTileWall(targetX, targetY) && attempts < 10) {
                        warpAngle = Math.random() * Math.PI * 2;
                        warpDist = 100 + Math.random() * 150;
                        targetX = player.x + Math.cos(warpAngle) * warpDist;
                        targetY = player.y + Math.sin(warpAngle) * warpDist;
                        targetX = Math.max(margin + this.radius, Math.min(mapW - margin - this.radius, targetX));
                        targetY = Math.max(margin + this.radius, Math.min(mapH - margin - this.radius, targetY));
                        attempts++;
                    }
                    // 10번 시도했음에도 여전히 벽 내부라면 이번 텔레포트는 생략하고 쿨타임만 짧게 설정한 뒤 취소
                    if (window.gameEngine.isTileWall(targetX, targetY)) {
                        this.teleportCooldown = 60;
                        return;
                    }
                }

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
                    window.gameEngine.showFloatingText("WARP! 💚", this.x, this.y - 25, '#00ffcc');
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
                    window.gameEngine.showFloatingText("SUMMON! 💠", this.x, this.y - 25, '#8b5cf6');
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
                    window.gameEngine.showFloatingText("HEAL! 💚", this.x, this.y - 25, '#10b981');
                    Sound.play('powerup');
                    this.healRingTimer = 20;
                }
            }
            if (this.healRingTimer > 0) {
                this.healRingTimer -= timeScale;
            }
        }

        // 맵 벽 경계선 제한 충돌 처리 (몬스터 맵 이탈 방지) 및 창/넉백 벽꽝(Wall Slam) 판정 연동
        const wallMargin = 50;
        let preX = this.x;
        let preY = this.y;
        let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
        let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
        this.x = Math.max(wallMargin + this.radius, Math.min(mapW - wallMargin - this.radius, this.x));
        this.y = Math.max(wallMargin + this.radius, Math.min(mapH - wallMargin - this.radius, this.y));

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
        Renderer.drawSprite(
            ctx,
            `monster_${this.type}`,
            this.x,
            this.y,
            this.radius * 2,
            this.radius * 2,
            this.angle || 0,
            () => {
                this.drawNeon(ctx);
            }
        );
    }

    drawNeon(ctx) {
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

                    // 위상 굴절 보호막 시각 이펙트
                    if (this.boss_refractionShieldActive) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius * 1.55, 0, Math.PI * 2);
                        ctx.strokeStyle = 'rgba(255, 51, 0, 0.75)';
                        ctx.lineWidth = 3.0;
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = '#ff3300';
                        ctx.stroke();
                        ctx.restore();
                    }

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

                        // [수정] 가변 맵 크기(mapWidth, mapHeight)를 참조하여 격자 레이저 선을 화면 끝까지 드로잉합니다.
                        let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
                        let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;

                        // 가로 세로 격자 그리기 (간격: 단독 83px, 약화 시 120px)
                        let gridSp = this.isWeakened ? 120 : 83;
                        for (let lx = gridSp; lx <= mapW - gridSp; lx += gridSp) {
                            ctx.beginPath();
                            ctx.moveTo(lx, 40);
                            ctx.lineTo(lx, mapH - 40);
                            ctx.stroke();
                        }
                        for (let ly = gridSp; ly <= mapH - gridSp; ly += gridSp) {
                            ctx.beginPath();
                            ctx.moveTo(40, ly);
                            ctx.lineTo(mapW - 40, ly);
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
                    if (this.blackholeActiveTimer > 0) {
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
                    }
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

                    // [추가 기믹]: 발전기 간 전기 사슬 그리기 (사슬 활성 시만)
                    if (window.gameEngine) {
                        let spawners = window.gameEngine.monsters.filter(m => m.type === 'boss_portal_spawner' && m.hp > 0 && !m.dead);
                        if (spawners.length > 0) {
                            ctx.save();
                            ctx.translate(-this.x, -this.y); // 전역좌표화

                            if (this.chainActive) {
                                // 사슬 활성: 밝은 보라색 전기선
                                ctx.strokeStyle = 'rgba(139, 92, 246, 0.75)';
                                ctx.lineWidth = 2.5;
                                ctx.shadowBlur = 15;
                                ctx.shadowColor = '#8b5cf6';
                                ctx.setLineDash([4, 4]);
                            } else {
                                // 사슬 비활성: 어두운 점선 (비활성 표시)
                                ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
                                ctx.lineWidth = 1.0;
                                ctx.shadowBlur = 0;
                                ctx.setLineDash([2, 8]);
                            }

                            // 순차적으로 전기 체인 연결
                            for (let i = 0; i < spawners.length; i++) {
                                let start = spawners[i];
                                let end = spawners[(i + 1) % spawners.length];
                                ctx.beginPath();
                                ctx.moveTo(start.x, start.y);
                                ctx.lineTo(end.x, end.y);
                                ctx.stroke();

                                // 사슬 활성 시에만 파티클
                                if (this.chainActive && Math.random() < 0.1) {
                                    let randT = Math.random();
                                    let px = start.x + (end.x - start.x) * randT;
                                    let py = start.y + (end.y - start.y) * randT;
                                    window.gameEngine.particles.push(new Particle(px, py, '#8b5cf6', 1.5, (Math.random()-0.5)*1.0, (Math.random()-0.5)*1.0, 15));
                                }
                            }
                            ctx.restore();
                        }
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
                        // 중력 왜곡 오라 방출 (HP 50% 이하)
                        if (this.hp <= this.maxHp * 0.50) {
                            ctx.save();
                            let baseRadius = (Date.now() * 0.05) % 150 + 50;
                            ctx.beginPath();
                            ctx.arc(0, -25, baseRadius, 0, Math.PI * 2);
                            ctx.strokeStyle = `rgba(139, 92, 246, ${Math.max(0, 1.0 - baseRadius / 200)})`;
                            ctx.lineWidth = 2.0;
                            ctx.shadowBlur = 10;
                            ctx.shadowColor = '#8b5cf6';
                            ctx.stroke();
                            ctx.restore();
                        }

                        // 세로 3선 격자 레이저 렌더링 (HP 75% 이하)
                        if (this.hp <= this.maxHp * 0.75 && this.boss_finalGridActive > 0 && this.boss_finalGridLines) {
                            ctx.save();
                            ctx.translate(-this.x, -this.y); // 전역좌표 변환
                            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;

                            if (this.boss_finalGridActive > 35) {
                                ctx.strokeStyle = 'rgba(255, 0, 85, 0.45)';
                                ctx.lineWidth = 1.5;
                                ctx.setLineDash([4, 6]);
                                ctx.shadowBlur = 4;
                                ctx.shadowColor = '#ff0055';
                            } else {
                                ctx.strokeStyle = 'rgba(255, 0, 170, 0.85)';
                                ctx.lineWidth = 12;
                                ctx.shadowBlur = 18;
                                ctx.shadowColor = '#ff00aa';
                            }

                            this.boss_finalGridLines.forEach(lineX => {
                                ctx.beginPath();
                                ctx.moveTo(lineX, 40);
                                ctx.lineTo(lineX, mapH - 40);
                                ctx.stroke();
                            });
                            ctx.restore();
                        }

                        if (this.laserWarningTimer > 0) {
                            ctx.save();
                            ctx.translate(-this.x, -this.y); // 전역좌표 변환
                            
                            // [수정] 100층 보스방의 동적 Y축 높이(mapH)를 반영하여 레이저를 짤림 없이 드로잉합니다.
                            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;

                            // 빨간색 반투명 점선 경고 세로 막대기 기둥
                            ctx.fillStyle = 'rgba(255, 0, 85, 0.15)';
                            ctx.fillRect(this.laserX - 40, 40, 80, mapH - 80);
                            
                            ctx.strokeStyle = 'rgba(255, 0, 85, 0.6)';
                            ctx.lineWidth = 2.0;
                            ctx.setLineDash([6, 8]);
                            ctx.beginPath();
                            ctx.moveTo(this.laserX - 40, 40);
                            ctx.lineTo(this.laserX - 40, mapH - 40);
                            ctx.moveTo(this.laserX + 40, 40);
                            ctx.lineTo(this.laserX + 40, mapH - 40);
                            ctx.stroke();
                            ctx.restore();
                        }

                        if (this.laserActiveTimer > 0) {
                            ctx.save();
                            ctx.translate(-this.x, -this.y); // 전역좌표 변환
                            
                            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;

                            // 굵은 흰색-빨간색 초강력 빔 기둥
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                            ctx.fillRect(this.laserX - 35, 40, 70, mapH - 80);
                            
                            ctx.strokeStyle = '#ff0055';
                            ctx.lineWidth = 10;
                            ctx.shadowBlur = 35;
                            ctx.shadowColor = '#ff0055';
                            ctx.strokeRect(this.laserX - 38, 40, 76, mapH - 80);
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

            // 보스 머리 위 공통 캐스팅 게이지 바 및 경고 타이머 텍스트 렌더링
            if (this.boss_warningText) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                
                // 1. 경고 텍스트 & 타이머
                ctx.font = '800 11px "Outfit"';
                ctx.fillStyle = '#ff3300';
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#ff3300';
                
                let textY = -this.radius - 16;
                // 최종 보스 머리 위 오프셋 조정
                if (this.type === 'boss_final') textY = -this.radius - 45;

                let displayText = this.boss_warningText + (this.boss_timerText ? " (" + this.boss_timerText + ")" : "");
                ctx.fillText(displayText, 0, textY);

                // 2. 캐스팅 게이지 바
                if (this.boss_castProgress !== undefined && this.boss_castMax !== undefined && this.boss_castMax > 0) {
                    let progress = Math.max(0, Math.min(1.0, this.boss_castProgress / this.boss_castMax));

                    let barW = this.radius * 1.5;
                    let barH = 4.5;
                    let bx = -barW / 2;
                    let by = textY + 6;

                    // 배경 바
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.fillRect(bx, by, barW, barH);

                    // 진행 바
                    ctx.fillStyle = this.boss_warningText.includes("ACTIVE") || this.boss_warningText.includes("SHIELD") ? '#00f0ff' : '#ff3300';
                    ctx.fillRect(bx, by, barW * progress, barH);
                }
                ctx.restore();
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
