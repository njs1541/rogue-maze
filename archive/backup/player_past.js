// --------------------------------------------------------------------------
// 4. 플레이어 클래스 (이등변 삼각형 조종 및 스탯)
// --------------------------------------------------------------------------
// 무기 시스템 데이터 선언 (새로운 무기나 융합 무기 추가 시 여기에 등록)
const WEAPON_CATEGORIES = {
    energy_ball: 'ranged',
    
    // 1차 조잡한 무기군
    crude_sword: 'melee',
    crude_spear: 'melee',
    crude_whip: 'melee',
    crude_shock: 'ranged',
    crude_flamethrower: 'ranged',
    crude_cryo: 'ranged',
    crude_thorns: 'utility',
    crude_trap: 'utility',
    crude_scythe: 'melee',
    crude_rail: 'ranged',
    
    // 2차 진화형 하이테크 무기군
    plasma_saber: 'melee',
    energy_pilebunker: 'melee',
    nano_laser_wire: 'melee',
    chain_emp_shock: 'ranged',
    fusion_plasma_cannon: 'ranged',
    cryo_freezer: 'ranged',
    gravity_singularity_field: 'utility',
    proximity_cyber_mine: 'utility',
    void_destroyer: 'melee',
    tachyon_railgun: 'ranged'
};

const WEAPON_FUSIONS = [
    {
        name: 'supercritical_plasma_fusion', // 기존 icefiredance ➔ 초임계 플라즈마 융합
        materials: { fusion_plasma_cannon: 5, cryo_freezer: 5 }
    }
];

const CRAFTING_RECIPES = {
    // 1차 조잡한 무기군
    crude_sword: {
        name: '조잡한 검',
        type: 'crude',
        desc: '짧은 막대기와 칼날을 결합한 급조 접근전용 검.',
        materials: { short_rod: 1, blade: 1 }
    },
    crude_spear: {
        name: '조잡한 창',
        type: 'crude',
        desc: '긴 막대기에 칼날을 묶어 사거리를 늘린 창.',
        materials: { long_rod: 1, blade: 1 }
    },
    crude_whip: {
        name: '조잡한 채찍',
        type: 'crude',
        desc: '전선을 꼬아 채찍 형태로 만든 전술 타격 무기.',
        materials: { wire: 2, short_rod: 1 }
    },
    crude_shock: {
        name: '조잡한 전기 충격기',
        type: 'crude',
        desc: '배터리와 전선을 이은 초기 전기 방출기.',
        materials: { battery: 1, wire: 1 }
    },
    crude_flamethrower: {
        name: '조잡한 화염방사기',
        type: 'crude',
        desc: '고장난 화염방사기 부품에 배터리를 연결해 작동시킨 화기.',
        materials: { broken_flamethrower: 1, battery: 1 }
    },
    crude_cryo: {
        name: '조잡한 냉각총',
        type: 'crude',
        desc: '과냉각기를 배터리로 냉각 순환시키는 동결 유도총.',
        materials: { cryo_cooler: 1, battery: 1 }
    },
    crude_thorns: {
        name: '조잡한 가시갑옷',
        type: 'crude',
        desc: '넓은 판에 칼날을 촘촘히 꽂아 신체를 방어하는 가시 갑장.',
        materials: { metal_plate: 2, blade: 1 }
    },
    crude_trap: {
        name: '조잡한 덫',
        type: 'crude',
        desc: '전선과 배터리를 엮어 지나가는 대상을 붙잡는 설치물.',
        materials: { wire: 1, battery: 1, short_rod: 1 }
    },
    crude_scythe: {
        name: '조잡한 낫',
        type: 'crude',
        desc: '긴 막대기와 칼날, 전선을 연결한 사이버네틱 낫.',
        materials: { blade: 1, long_rod: 1, wire: 1 }
    },
    crude_rail: {
        name: '조잡한 레일건',
        type: 'crude',
        desc: '듀얼 배터리와 다중 전선 코일로 발사하는 조잡한 전자기 가속포.',
        materials: { battery: 2, wire: 1 }
    },

    // 2차 진화형 하이테크 무기군
    plasma_saber: {
        name: '플라즈마 세이버',
        type: 'advanced',
        desc: '조잡한 검에서 진화. 고농축 에너지가 흐르는 광선검.',
        reqWeapon: 'crude_sword',
        materials: { sensor_lens: 1, nanite_jar: 1 }
    },
    energy_pilebunker: {
        name: '에너지 파일벙커',
        type: 'advanced',
        desc: '조잡한 창에서 진화. 실린더식 압축 타격으로 꿰뚫는 충격 병기.',
        reqWeapon: 'crude_spear',
        materials: { hydraulic_cylinder: 2, metal_plate: 1 }
    },
    nano_laser_wire: {
        name: '나노 레이저 와이어',
        type: 'advanced',
        desc: '조잡한 채찍에서 진화. 분자 단위 나노 레이저 선으로 절단하는 채찍.',
        reqWeapon: 'crude_whip',
        materials: { nanite_jar: 2, wire: 2 }
    },
    chain_emp_shock: {
        name: '체인 EMP 쇼크',
        type: 'advanced',
        desc: '조잡한 전기 충격기에서 진화. 연쇄 EMP 전자기 펄스 방출총.',
        reqWeapon: 'crude_shock',
        materials: { sensor_lens: 1, battery: 2 }
    },
    fusion_plasma_cannon: {
        name: '퓨전 플라즈마 캐논',
        type: 'advanced',
        desc: '조잡한 화염방사기에서 진화. 핵융합 플라즈마 투사 대포.',
        reqWeapon: 'crude_flamethrower',
        materials: { hydraulic_cylinder: 1, battery: 2 }
    },
    cryo_freezer: {
        name: '크라이오 프리저',
        type: 'advanced',
        desc: '조잡한 냉각총에서 진화. 절대영도 과냉각 고리 분사 빙결총.',
        reqWeapon: 'crude_cryo',
        materials: { cryo_cooler: 1, nanite_jar: 1 }
    },
    gravity_singularity_field: {
        name: '중력 특이점 필드',
        type: 'advanced',
        desc: '조잡한 가시갑옷에서 진화. 중력장을 압축해 가시 중력 오라를 방출하는 장갑.',
        reqWeapon: 'crude_thorns',
        materials: { hydraulic_cylinder: 1, metal_plate: 2 }
    },
    proximity_cyber_mine: {
        name: '프록시미티 사이버 마인',
        type: 'advanced',
        desc: '조잡한 덫에서 진화. 감지 렌즈 기반 근접 감응식 사이버 지뢰.',
        reqWeapon: 'crude_trap',
        materials: { sensor_lens: 1, battery: 1 }
    },
    void_destroyer: {
        name: '보이드 디스트로이어',
        type: 'advanced',
        desc: '조잡한 낫에서 진화. 허공의 힘(보이드)으로 공간을 가르는 파괴의 낫.',
        reqWeapon: 'crude_scythe',
        materials: { nanite_jar: 1, wire: 2 }
    },
    tachyon_railgun: {
        name: '태키온 레일건',
        type: 'advanced',
        desc: '조잡한 레일건에서 진화. 타키온 입자를 빛의 속도로 가속하여 초고속 관통하는 광선포.',
        reqWeapon: 'crude_rail',
        materials: { sensor_lens: 2, battery: 2 }
    }
};

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 24; // 플레이어 캐릭터 크기 1.5배 확대 (기존 16 -> 24)
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

        // [신규 기획] 부품 재료 11종 인벤토리 (기본 0개)
        this.materials = {
            short_rod: 0,
            long_rod: 0,
            metal_plate: 0,
            blade: 0,
            wire: 0,
            battery: 0,
            broken_flamethrower: 0,
            cryo_cooler: 0,
            sensor_lens: 0,
            nanite_jar: 0,
            hydraulic_cylinder: 0
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
        
        // 무기 스탯 (기본 무기 'energy_ball'로 설정)
        this.weaponType = 'energy_ball'; 
        this.equippedWeapons = ['energy_ball']; // [신규] 장착 무기 슬롯 리스트 (기본 'energy_ball' 포함)
        this.maxWeaponSlots = 2;        // [신규] 최대 무기 장착 가능 슬롯
        this.thirdSlotWeapon = null;    // [신규] 3번째 보조 무기 슬롯 (계약 시 고정 장착)
 
        // 무기 기본 레벨 내부 저장소
        const rawLevels = {
            energy_ball: 1,
            crude_sword: 0, crude_spear: 0, crude_whip: 0, crude_shock: 0,
            crude_flamethrower: 0, crude_cryo: 0, crude_thorns: 0, crude_trap: 0,
            crude_scythe: 0, crude_rail: 0,
            plasma_saber: 0, energy_pilebunker: 0, nano_laser_wire: 0, chain_emp_shock: 0,
            fusion_plasma_cannon: 0, cryo_freezer: 0, gravity_singularity_field: 0, proximity_cyber_mine: 0,
            void_destroyer: 0, tachyon_railgun: 0
        };

        // 기존 판타지 무기 ID와 신규 조잡/진화 무기 매핑
        const legacyMapping = {
            sword: ['crude_sword', 'plasma_saber'],
            spear: ['crude_spear', 'energy_pilebunker'],
            whip: ['crude_whip', 'nano_laser_wire'],
            lightning: ['crude_shock', 'chain_emp_shock'],
            fire: ['crude_flamethrower', 'fusion_plasma_cannon'],
            ice: ['crude_cryo', 'cryo_freezer'],
            thorns: ['crude_thorns', 'gravity_singularity_field'],
            trap: ['crude_trap', 'proximity_cyber_mine'],
            scythe: ['crude_scythe', 'void_destroyer'],
            railcannon: ['crude_rail', 'tachyon_railgun'],
            gun: ['energy_ball']
        };

        // Proxy를 활용하여 legacy 무기 ID 요청 시 최댓값 자동 반환 및 값 갱신 시 신규 무기 레벨로 포워딩
        this.weaponLevels = new Proxy(rawLevels, {
            get(target, prop) {
                // legacy ID인 경우 맵핑된 신규 무기 레벨 중 최댓값 반환
                if (legacyMapping[prop]) {
                    let vals = legacyMapping[prop].map(newKey => target[newKey] || 0);
                    return Math.max(...vals);
                }
                return target[prop] !== undefined ? target[prop] : 0;
            },
            set(target, prop, value) {
                // legacy ID에 값을 직접 세팅하려는 경우 (예: 기존 카드 보상 획득 로직 호환)
                if (legacyMapping[prop]) {
                    // 맵핑된 키 중 첫 번째(조잡한 무기군) 또는 더 적합한 쪽에 값을 직접 할당
                    const primaryKey = legacyMapping[prop][0];
                    target[primaryKey] = value;
                    return true;
                }
                target[prop] = value;
                return true;
            },
            ownKeys(target) {
                // keys() 호출 시 legacy 및 new key 모두 노출하여 리액트/HUD 그리기 시 누락 방지
                return [...Object.keys(target), ...Object.keys(legacyMapping)];
            },
            getOwnPropertyDescriptor(target, prop) {
                return {
                    enumerable: true,
                    configurable: true,
                    writable: true
                };
            }
        });
        this.multishot = 1;      // 부채꼴로 동시 발사될 탄환 수
        this.burstCount = 1;     // 한 번 사격 시 연속 점사 횟수
        this.pierceCount = 0;    // 탄환 관통력 개수
        this.homing = false;     // 유도탄 보유 여부
        this.wallBounceLimit = 0; // 벽 튕기기 제한 횟수
        this.monsterBounceLimit = 0; // 몬스터 튕기기 제한 횟수
        this.splashRadius = 0;   // 탄환 명중 시 스플래시 반경 (0 이면 기본 총알)

        // [신규 무기 모션 타이머 및 쿨타임]
        this.scytheCooldown = 0;
        this.railcannonCooldown = 0;
        this.isScytheActive = false;
        this.scytheTimer = 0;
        this.scytheAngle = 0;
        this.isRailActive = false;
        this.railChargeTimer = 0;
        this.railAngle = 0;

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
            crude_sword: { wave: false },
            plasma_saber: { wave: false },
            crude_whip: { range: false, haste: false, break: false, shock: false, multi: false },
            nano_laser_wire: { range: false, haste: false, break: false, shock: false, multi: false },
            crude_spear: { range: false, tip: false, knockback: false, wall: false, multi: false },
            energy_pilebunker: { range: false, tip: false, knockback: false, wall: false, multi: false },
            crude_cryo: { shatter: false },
            cryo_freezer: { shatter: false }
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
        this.burstType = 'energy_ball'; // 'energy_ball' 등 기본 무기 타입
        this.invincibleTimer = 0; // [신규 추가] 피격 무적 쿨타임 타이머
        this.burstBulletsToLaunch = []; // [추가] 점사/난무 연속 격발 탄환 궤적 배열 사전 정의
        this.resurrected = false; // [추가] Plate Armor 10레벨 극적 부활 작동 여부 트래킹
        this.iceFireProjectilesStack = 0; // 초월 융합 업그레이드 사출수 스택 초기화
        
        // [신규 보스 기믹용 상태이상 상태 변수]
        this.stunnedTimer = 0;
        this.slowTimer = 0;
        this.slowMultiplier = 1.0;

        // [신규 기획] 히든 아이템 및 아머 쉴드
        this.hiddenItems = {
            brokenJoystick: false,
            repairKit: false,
            manual: false
        };
        this.fusedController = false;
        this.armorShield = 0;
        this.loadBitesUpgrades();
    }

    loadBitesUpgrades() {
        const upgradeAtk = parseInt(localStorage.getItem('neon_upgrade_atk')) || 0;
        const upgradeMs = parseInt(localStorage.getItem('neon_upgrade_ms')) || 0;
        const upgradeAspd = parseInt(localStorage.getItem('neon_upgrade_aspd')) || 0;
        const upgradeHp = parseInt(localStorage.getItem('neon_upgrade_hp')) || 0;
        const upgradeMp = parseInt(localStorage.getItem('neon_upgrade_mp')) || 0;

        this.atk += upgradeAtk * 3;
        this.ms += upgradeMs * 0.15;
        this.aspd += upgradeAspd * 0.05;
        
        this.maxHp += upgradeHp * 15;
        this.hp = this.maxHp; // 초기 체력 가산 동기화
        
        this.maxMp += upgradeMp * 15;
        this.mp = 0; 
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
            // 근접 무기 중 레벨이 높은 순, 같으면 명시적 룰에 의해 우선순위 결정
            activeMelee.sort((a, b) => {
                let lvlDiff = (this.weaponLevels[b] || 0) - (this.weaponLevels[a] || 0);
                if (lvlDiff !== 0) return lvlDiff;
                const order = ['plasma_saber', 'crude_sword', 'energy_pilebunker', 'crude_spear', 'nano_laser_wire', 'crude_whip', 'void_destroyer', 'crude_scythe'];
                return order.indexOf(a) - order.indexOf(b);
            });
            this.weaponType = activeMelee[0] || 'crude_sword';
        } else if (hasRanged) {
            // 원거리 무기 중 레벨이 높은 순, 같으면 명시적 룰에 의해 우선순위 결정
            activeRanged.sort((a, b) => {
                let lvlDiff = (this.weaponLevels[b] || 0) - (this.weaponLevels[a] || 0);
                if (lvlDiff !== 0) return lvlDiff;
                const order = ['fusion_plasma_cannon', 'crude_flamethrower', 'cryo_freezer', 'crude_cryo', 'chain_emp_shock', 'crude_shock', 'tachyon_railgun', 'crude_rail', 'energy_ball'];
                return order.indexOf(a) - order.indexOf(b);
            });
            this.weaponType = activeRanged[0] || 'energy_ball';
        } else {
            this.weaponType = 'energy_ball';
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
        if (this.scytheCooldown > 0) this.scytheCooldown--;
        if (this.railcannonCooldown > 0) this.railcannonCooldown--;
        
        // 사이버 낫 모션 타이머 관리 (지속시간 12프레임)
        if (this.isScytheActive) {
            this.scytheTimer--;
            if (this.scytheTimer <= 0) {
                this.isScytheActive = false;
            }
        }

        // 레일 캐논 차징/발사 타이머 관리
        if (this.isRailActive) {
            this.railChargeTimer--;
            if (this.railChargeTimer <= 0) {
                this.isRailActive = false;
            }
        }

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

        // [성능/성장 마일스톤 시스템] 한계 돌파 상태에 따른 이펙트 발산
        if (window.gameEngine && window.gameEngine.isPlaying) {
            let isTranscendAtk = this.atk >= 30;
            let isTranscendAspd = this.aspd >= 2.2;

            if (isTranscendAtk && Math.random() < 0.05) {
                // 초월 힘: 붉은 네온 전기 스파크 영구 분출
                window.gameEngine.particles.push(new Particle(this.x, this.y, '#ff0055', 2.0, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, 20, 'spark'));
            }
            if (isTranscendAspd && Math.random() < 0.05) {
                // 초월 공속/지능: 황금빛 네온 전기 스파크 영구 분출
                window.gameEngine.particles.push(new Particle(this.x, this.y, '#ffdf00', 2.0, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, 20, 'spark'));
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

        // [To-Do 3] 10레벨 초월 장비 네온 오라 렌더링
        let masterEquips = [];
        if (this.equipLevels) {
            for (let eq in this.equipLevels) {
                if (this.equipLevels[eq] === 10) {
                    masterEquips.push(eq);
                }
            }
        }

        if (masterEquips.length > 0) {
            ctx.save();
            this.auraPulse = (this.auraPulse || 0) + 0.05;
            let auraRadius = this.radius * (1.3 + Math.sin(this.auraPulse) * 0.15);
            
            let auraColor = 'rgba(255, 223, 0, 0.15)'; // 기본 황금색
            let strokeColor = '#ffdf00';
            
            let firstEq = masterEquips[0];
            if (firstEq === 'armor') { strokeColor = '#ff6c00'; auraColor = 'rgba(255, 108, 0, 0.15)'; } // 주황
            else if (firstEq === 'boots') { strokeColor = '#00f0ff'; auraColor = 'rgba(0, 240, 255, 0.15)'; } // 시안
            else if (firstEq === 'gloves') { strokeColor = '#b026ff'; auraColor = 'rgba(176, 38, 255, 0.15)'; } // 보라
            else if (firstEq === 'helm') { strokeColor = '#ff0055'; auraColor = 'rgba(255, 0, 85, 0.15)'; } // 붉은색
            else if (firstEq === 'goggles') { strokeColor = '#39ff14'; auraColor = 'rgba(57, 255, 20, 0.15)'; } // 녹색
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, auraRadius, 0, Math.PI * 2);
            ctx.fillStyle = auraColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 15;
            ctx.shadowColor = strokeColor;
            ctx.fill();
            ctx.stroke();

            // 점선 궤적 추가 효과
            ctx.beginPath();
            ctx.arc(this.x, this.y, auraRadius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.0;
            ctx.setLineDash([4, 6]);
            ctx.stroke();

            ctx.restore();
        }

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

        Renderer.drawSprite(
            ctx,
            'player_idle',
            this.x,
            this.y,
            this.radius * 2,
            this.radius * 2,
            this.angle || 0,
            () => {
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
                
                let isTranscend = this.atk >= 30 || this.aspd >= 2.2;
                if (isTranscend) {
                    ctx.fillStyle = '#ffdf00'; // 초월 달성 시 황금빛 코어
                    ctx.shadowColor = '#ffdf00';
                    ctx.shadowBlur = 15;
                } else {
                    ctx.fillStyle = '#39ff14'; // 스태미너 가동 시 코어가 빛남
                    ctx.shadowColor = '#39ff14';
                    ctx.shadowBlur = 8;
                }
                ctx.fill();

                ctx.restore();
            }
        );

        // 3. 검/채찍을 휘두르는 모션 연출 (베기 활성화 시 궤적 렌더링)
        if (this.isSlashActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            const wType = String(this.weaponType);
            let isWhip = wType.includes('whip');
            let isAdvanced = !wType.includes('crude') && wType !== 'energy_ball';
            
            let color = isWhip 
                ? (isAdvanced ? 'rgba(255, 0, 170, 0.95)' : 'rgba(235, 120, 20, 0.7)')
                : (isAdvanced ? 'rgba(0, 240, 255, 0.9)' : 'rgba(200, 200, 200, 0.65)');
            let shadowColor = isWhip 
                ? (isAdvanced ? '#ff00aa' : '#eb7814')
                : (isAdvanced ? '#00f0ff' : '#64748b');
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
                        // 조잡한 무기는 S자 왜곡 폭을 키워 엉성하게 흔들림 연출
                        let waveAmp = isAdvanced ? 12 : 24;
                        let wave = Math.sin(t * Math.PI * 2) * waveAmp * (this.slashTimer / 12);
                        
                        let sx = Math.cos(angle) * currentDist - Math.sin(angle) * wave;
                        let sy = Math.sin(angle) * currentDist + Math.cos(angle) * wave;
                        ctx.lineTo(sx, sy);
                    }
                    ctx.strokeStyle = color;
                    let scaleFactor = Math.sqrt(this.atk / 10);
                    ctx.lineWidth = (isAdvanced ? 4.5 : 2.0) * (this.slashTimer / 12) * scaleFactor;
                    ctx.shadowBlur = isAdvanced ? 20 : 6;
                    ctx.shadowColor = shadowColor;
                    ctx.stroke();

                    // 진화형 채찍은 내부에 얇은 화이트 레이어 겹쳐 그려 네온 레이저선 연출
                    if (isAdvanced) {
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        for (let s = 1; s <= segments; s++) {
                            let t = s / segments;
                            let currentDist = radius * t;
                            let wave = Math.sin(t * Math.PI * 2) * 12 * (this.slashTimer / 12);
                            let sx = Math.cos(angle) * currentDist - Math.sin(angle) * wave;
                            let sy = Math.sin(angle) * currentDist + Math.cos(angle) * wave;
                            ctx.lineTo(sx, sy);
                        }
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.2 * (this.slashTimer / 12) * scaleFactor;
                        ctx.shadowBlur = 0;
                        ctx.stroke();
                    }
                } else {
                    // 검 베기 아크 드로잉
                    ctx.beginPath();
                    let start = angle - 1.2;
                    let end = angle + 1.2;
                    ctx.arc(0, 0, radius, start, end);
                    
                    ctx.strokeStyle = color;
                    let scaleFactor = Math.sqrt(this.atk / 10);
                    ctx.lineWidth = (isAdvanced ? 8 : 3.5) * (this.slashTimer / 10) * scaleFactor;
                    ctx.shadowBlur = isAdvanced ? 22 : 5;
                    ctx.shadowColor = shadowColor;
                    ctx.stroke();

                    // 진화형 플라즈마 세이버 전용 내부 화이트 코어 궤적 추가
                    if (isAdvanced) {
                        ctx.beginPath();
                        ctx.arc(0, 0, radius, start, end);
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 2.0 * (this.slashTimer / 10) * scaleFactor;
                        ctx.shadowBlur = 0;
                        ctx.stroke();
                    } else {
                        // 조잡한 검은 외곽에 살짝 엉성한 잔상 톱니라인 오버레이
                        ctx.beginPath();
                        ctx.arc(0, 0, radius + 3, start + 0.1, end - 0.1);
                        ctx.strokeStyle = 'rgba(235, 120, 20, 0.4)';
                        ctx.lineWidth = 1.0;
                        ctx.stroke();
                    }
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
            
            const wType = String(this.weaponType);
            let isAdvanced = !wType.includes('crude') && wType !== 'energy_ball';

            let color = isAdvanced ? 'rgba(0, 240, 255, 0.95)' : 'rgba(239, 120, 40, 0.7)';
            let shadowColor = isAdvanced ? '#00f0ff' : '#ef7828';
            
            for (let angle of drawAngles) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                
                let tx = this.x + Math.cos(angle) * targetRange;
                let ty = this.y + Math.sin(angle) * targetRange;
                ctx.lineTo(tx, ty);
                
                ctx.strokeStyle = color;
                let scaleFactor = Math.sqrt(this.atk / 10);
                ctx.lineWidth = (isAdvanced ? 7.5 : 3.0) * (this.spearTimer / 8) * scaleFactor;
                ctx.shadowBlur = isAdvanced ? 22 : 6;
                ctx.shadowColor = shadowColor;
                ctx.stroke();
                
                if (isAdvanced) {
                    // 에너지 파일벙커 내부 화이트 고농축 코어선 그리기
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(tx, ty);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2.0 * (this.spearTimer / 8) * scaleFactor;
                    ctx.shadowBlur = 0;
                    ctx.stroke();
                }
                
                // [S-02 창의 끝단 날카로운 다이아몬드(창끝 촉) 글로우 데코 렌더링]
                ctx.save();
                ctx.translate(tx, ty);
                ctx.rotate(angle);
                ctx.beginPath();
                
                if (isAdvanced) {
                    // 파일벙커 형태의 세련된 고밀도 촉 장식
                    ctx.moveTo(15, 0);    
                    ctx.lineTo(0, -6);  
                    ctx.lineTo(-4, -2);   
                    ctx.lineTo(-4, 2);   
                    ctx.lineTo(0, 6);   
                } else {
                    // 조잡한 창 형태의 엉성한 쇠조각 삼각형
                    ctx.moveTo(10, 0);    
                    ctx.lineTo(-4, -4);  
                    ctx.lineTo(-10, 0);   
                    ctx.lineTo(-4, 4);   
                }
                ctx.closePath();
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = isAdvanced ? 15 : 4;
                ctx.shadowColor = shadowColor;
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        // 5. 사이버 낫 모션 연출 (베기 활성화 시 거대 궤적 렌더링)
        if (this.isScytheActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            let angle = this.scytheAngle;
            let radius = 110 + (this.range - 350) * 0.15; // 낫은 기본적으로 검보다 매우 김

            ctx.beginPath();
            let start = angle - 1.6;
            let end = angle + 1.6;
            ctx.arc(0, 0, radius, start, end);
            
            ctx.strokeStyle = 'rgba(186, 85, 211, 0.8)'; // 자홍/연보라 네온
            let scaleFactor = Math.sqrt(this.atk / 10);
            ctx.lineWidth = 8 * (this.scytheTimer / 12) * scaleFactor;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ba55d3';
            ctx.stroke();

            // 낫 칼날 비주얼 데코
            ctx.save();
            ctx.rotate(angle + 1.2);
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.quadraticCurveTo(radius + 15, -25, radius - 10, -40);
            ctx.quadraticCurveTo(radius + 5, -20, radius, 0);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ba55d3';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.restore();
        }

        // 6. 레일 캐논 차징 및 발사 번쩍임 연출
        if (this.isRailActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.railAngle);

            // 차징 중 (시간이 많이 남았을 때) vs 격발 순간 (타이머가 0 직전일 때)
            if (this.railChargeTimer > 3) {
                // 차징 구체 시각화
                let chargeRatio = (18 - this.railChargeTimer) / 18; // 18프레임 차징 기준
                let size = 5 + chargeRatio * 12;
                ctx.beginPath();
                ctx.arc(this.radius + 10, 0, size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
                ctx.strokeStyle = '#00f0ff';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f0ff';
                ctx.fill();
                ctx.stroke();
            } else {
                // 격발 순간 번개 스파크 라인 렌더링
                ctx.beginPath();
                ctx.moveTo(this.radius, 0);
                ctx.lineTo(this.radius + 30, 0);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 6;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00f0ff';
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.restore();
    }
}
