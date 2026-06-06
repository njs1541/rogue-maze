// --------------------------------------------------------------------------
// 4. 플레이어 클래스 (이등변 삼각형 조종 및 스탯)
// --------------------------------------------------------------------------
// 무기 시스템 데이터 선언 (새로운 무기나 융합 무기 추가 시 여기에 등록)
const WEAPON_CATEGORIES = {
    sword: 'melee',
    spear: 'melee',
    whip: 'melee',
    lightning: 'ranged',
    fire: 'ranged',
    ice: 'ranged',
    thorns: 'utility',
    trap: 'utility'
};

const WEAPON_FUSIONS = [
    {
        name: 'icefiredance',
        materials: { fire: 5, ice: 5 }
    }
];

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
        this.def = 0;           // 방어력 (비율 대미지 감소)
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
            ring_evd: 0,
            goggles: 0
        };

        // [신규] Phase 5 물리 기믹 및 초월 상태 변수 선언
        this.thornsFieldTimer = 0;
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
        this.weaponLevels = {
            sword: 0,
            spear: 0,
            whip: 0,
            lightning: 0,
            fire: 0,
            ice: 0,
            thorns: 0,
            trap: 0
        };
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
        this.isSpearActive = false; // 현재 창 찌르기 모션이 화면에 그려지는 중인가?
        this.spearTimer = 0;        // 창 찌르기 지속 프레임 타이머
        this.spearAngle = 0;        // 창 찌르기 각도
        this.spearAngles = [];      // 다중 창 찌르기 각도들
        
        // 무기 진화 해금 속성들 (기본적으로 비활성화 후 무기 중복 획득 시 테크트리에 따라 단계별 해금)
        this.weaponUnlocks = {
            sword: { wave: false },
            whip: { range: false, haste: false, break: false, shock: false, multi: false },
            spear: { range: false, tip: false, knockback: false, wall: false, multi: false },
            ice: { shatter: false }
        };
        
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
        this.iceFireProjectilesStack = 0; // 초월 융합 업그레이드 사출수 스택 초기화
        
        // [신규 보스 기믹용 상태이상 상태 변수]
        this.stunnedTimer = 0;
        this.slowTimer = 0;
        this.slowMultiplier = 1.0;
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

    // [신규] 플레이어가 해금하여 보유한 무기 조합에 맞춤형 대표 무기 상태 자동 분석 갱신
    updateWeaponType() {
        // 1. 초월 융합 조건 체크
        let fused = false;
        for (let recipe of WEAPON_FUSIONS) {
            let match = true;
            for (let mat in recipe.materials) {
                if ((this.weaponLevels[mat] || 0) < recipe.materials[mat]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                this.weaponType = recipe.name;
                fused = true;
                break;
            }
        }

        if (fused) return;

        // 2. 카테고리별 활성화 여부 계산
        let activeMelee = [];
        let activeRanged = [];
        for (let key in this.weaponLevels) {
            if (this.weaponLevels[key] > 0) {
                if (WEAPON_CATEGORIES[key] === 'melee') activeMelee.push(key);
                if (WEAPON_CATEGORIES[key] === 'ranged') activeRanged.push(key);
            }
        }

        let hasMelee = activeMelee.length > 0;
        let hasRanged = activeRanged.length > 0;

        if (hasRanged && hasMelee) {
            this.weaponType = 'dual';
        } else if (hasMelee) {
            // 근접 무기 중 레벨이 높은 순, 같으면 명시적 룰(sword -> spear -> whip 순)에 의해 우선순위 결정
            activeMelee.sort((a, b) => {
                let lvlDiff = (this.weaponLevels[b] || 0) - (this.weaponLevels[a] || 0);
                if (lvlDiff !== 0) return lvlDiff;
                const order = ['sword', 'spear', 'whip'];
                return order.indexOf(a) - order.indexOf(b);
            });
            this.weaponType = activeMelee[0] || 'sword';
        } else if (hasRanged) {
            // 원거리 무기 중 레벨이 높은 순, 같으면 명시적 룰(fire -> ice -> lightning 순)에 의해 우선순위 결정
            activeRanged.sort((a, b) => {
                let lvlDiff = (this.weaponLevels[b] || 0) - (this.weaponLevels[a] || 0);
                if (lvlDiff !== 0) return lvlDiff;
                const order = ['fire', 'ice', 'lightning'];
                return order.indexOf(a) - order.indexOf(b);
            });
            this.weaponType = activeRanged[0] || 'gun';
        } else {
            this.weaponType = 'gun';
        }
    }

    update() {
        // [신규 기믹] 플레이어 상태이상 타이머 감소 처리
        if (this.stunnedTimer > 0) {
            this.stunnedTimer--;
        }
        if (this.slowTimer > 0) {
            this.slowTimer--;
            if (this.slowTimer <= 0) {
                this.slowMultiplier = 1.0;
            }
        }

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
                            
                            // [버그 수정] 가시 장막 오라 피해로 사망 시 사망 처리 정산 진행
                            if (m.hp <= 0 && window.gameEngine) {
                                window.gameEngine.killMonster(m);
                            }
                            
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

        // [신규 연출] 플레이어 질주(Shift 달리기) 시 부드러운 네온 시안 잔상 trail 파티클 생성
        if (isSprinting && Math.random() < 0.35 && window.gameEngine) {
            window.gameEngine.particles.push(new Particle(
                this.x, this.y,
                'rgba(0, 240, 255, 0.35)', this.radius * 0.9,
                (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1,
                15, 'trail'
            ));
        }

        // [신규 연출] 플레이어 회피(Evade) 활성화 중일 때 네온 핫핑크 잔상 trail 파티클 생성
        if (this.evadeActive && Math.random() < 0.5 && window.gameEngine) {
            window.gameEngine.particles.push(new Particle(
                this.x, this.y,
                'rgba(255, 0, 85, 0.4)', this.radius * 0.95,
                (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25,
                20, 'trail'
            ));
        }

        // [수정] 체력 자연 재생 (HP Regen) - 전투 중이면 이동 여부와 관계없이 자연 치유 작동
        let isCombat = window.gameEngine && (window.gameEngine.monsters.length > 0 || window.gameEngine.spawnQueue.length > 0);
        let currentRegen = this.hpRegen;

        // [신규 기획] Health Ring 10레벨 초월: 5초간 피격 무사고 시 REGEN 속도 3배 가속!
        if (this.equipLevels.ring_hp === 10 && this.lastHitTimer >= 300) {
            currentRegen *= 3;
        }

        if (this.hp < this.maxHp && currentRegen > 0 && isCombat) {
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

        // 창 찌르기 모션 타이머 관리 (지속시간 8프레임)
        if (this.isSpearActive) {
            this.spearTimer--;
            if (this.spearTimer <= 0) {
                this.isSpearActive = false;
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

        // 3. 검/채찍을 휘두르는 모션 연출 (베기 활성화 시 궤적 렌더링)
        if (this.isSlashActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            let isWhip = this.weaponType === 'whip';
            let color = isWhip ? 'rgba(255, 0, 170, 0.85)' : 'rgba(176, 38, 255, 0.85)';
            let shadowColor = isWhip ? '#ff00aa' : '#b026ff';
            let radius = isWhip ? (this.weaponUnlocks.whip.range ? 220 : 150) : this.slashRadius;
            
            let drawAngles = this.slashAngles && this.slashAngles.length > 0 ? this.slashAngles : [this.slashAngle];
            for (let angle of drawAngles) {
                if (isWhip) {
                    // [W-03 채찍 S자 파형 궤적 실시간 렌더링]
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    let segments = 20;
                    for (let s = 1; s <= segments; s++) {
                        let t = s / segments;
                        let currentDist = radius * t;
                        // 플레이어부터 조준방향 끝단까지 S자로 출렁이며 굽이치는 Sine 파형 계산
                        let wave = Math.sin(t * Math.PI * 2) * 15 * (this.slashTimer / 12);
                        
                        let sx = Math.cos(angle) * currentDist - Math.sin(angle) * wave;
                        let sy = Math.sin(angle) * currentDist + Math.cos(angle) * wave;
                        ctx.lineTo(sx, sy);
                    }
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3.5 * (this.slashTimer / 12);
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = shadowColor;
                    ctx.stroke();
                } else {
                    // 검 베기 아크 드로잉
                    ctx.beginPath();
                    let start = angle - 1.2;
                    let end = angle + 1.2;
                    ctx.arc(0, 0, radius, start, end);
                    
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 6 * (this.slashTimer / 10);
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = shadowColor;
                    ctx.stroke();
                }
            }
            
            ctx.restore();
        }

        // 4. 창을 찌르는 모션 연출 (찌르기 활성화 시 직선 렌더링)
        if (this.isSpearActive) {
            ctx.save();
            let drawAngles = this.spearAngles && this.spearAngles.length > 0 ? this.spearAngles : [this.spearAngle];
            
            // [S-01 창 사거리 축소 밸런스 공식] 기본 80px, 성장 시 최대 180px 제한 수식
            let targetRange = 80 + (this.range - 350) * 0.3;
            if (this.weaponUnlocks.spear.range) targetRange += 20;
            
            let color = 'rgba(0, 240, 255, 0.95)';
            let shadowColor = '#00f0ff';
            
            for (let angle of drawAngles) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                
                let tx = this.x + Math.cos(angle) * targetRange;
                let ty = this.y + Math.sin(angle) * targetRange;
                ctx.lineTo(tx, ty);
                
                ctx.strokeStyle = color;
                ctx.lineWidth = 5 * (this.spearTimer / 8);
                ctx.shadowBlur = 15;
                ctx.shadowColor = shadowColor;
                ctx.stroke();
                
                // [S-02 창의 끝단 날카로운 다이아몬드(창끝 촉) 글로우 데코 렌더링]
                ctx.save();
                ctx.translate(tx, ty);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(12, 0);    // 창끝 뾰족한 앞
                ctx.lineTo(0, -4.5);  // 위 날
                ctx.lineTo(-12, 0);   // 뒷 끝
                ctx.lineTo(0, 4.5);   // 아래 날
                ctx.closePath();
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f0ff';
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        ctx.restore();
    }
}
