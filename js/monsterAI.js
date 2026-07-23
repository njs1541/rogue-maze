// --------------------------------------------------------------------------
// MonsterAI: 7대 행동 AI 원칙 & 3대 선택 고도화 AI Engine
// (Garbage Collection Zero - 1회 전역 인스턴스 싱글톤 공유)
// --------------------------------------------------------------------------

// 1. FSM (Finite State Machine) 상태 전이 클래스
class MonsterFSM {
    constructor(monster) {
        this.monster = monster;
        this.currentState = 'CHASE'; // 기본 상태: CHASE
        this.stateTimer = 0;
    }

    setState(newState) {
        if (this.currentState === newState) return;
        this.currentState = newState;
        this.stateTimer = 0;
    }

    update(player, gameEngine) {
        this.stateTimer++;

        // 1. 스턴/그로기 상태 우선 처리
        if (this.monster.isStunned || this.monster.stunTimer > 0) {
            this.setState('STUN');
            return;
        }

        let dist = Math.hypot(player.x - this.monster.x, player.y - this.monster.y);
        let mType = this.monster.type;
        let curRoom = (gameEngine && gameEngine.roomNum) || 1;

        // 고도화 3: 층수별 AI 스케일링 적용 (1~20F 기본 / 21~50F 회피 / 51F+ 전면 개방)
        if (curRoom <= 20) {
            // 1~20층: 기본 단순 추적 위주
            if (this.currentState !== 'STUN') this.setState('CHASE');
            return;
        }

        // 2. 몬스터 타입 및 전황 거리 기반 FSM 상태 전환 (21층 이상)
        switch (this.currentState) {
            case 'STUN':
                if (this.monster.stunTimer <= 0) {
                    this.setState('CHASE');
                }
                break;

            case 'CHASE':
                if (mType === 'shooter' || mType === 'plasma_sniper') {
                    if (dist < 220) this.setState('KITING'); // 접근 시 후퇴 카이팅
                } else if (mType === 'shadow_assassin' || mType === 'stalker') {
                    if (dist > 150) this.setState('AMBUSH'); // 시야 밖 매복 은신
                } else if (mType === 'aegis_guardian' || mType === 'shield_tanker') {
                    if (dist < 300) this.setState('SHIELD_DEFENSE'); // 방패 전개
                } else if (mType === 'alpha_leader' || mType === 'swarm_mini' || mType === 'reflector_drone') {
                    this.setState('FLOCKING'); // 군집 대형 및 에스코트 집결
                }
                break;

            case 'KITING':
                if (dist > 330) this.setState('CHASE');
                break;

            case 'AMBUSH':
                if (dist <= 120) this.setState('CHASE'); // 120px 근접 시 쇄도 기습
                break;

            case 'SHIELD_DEFENSE':
                if (dist > 400) this.setState('CHASE');
                break;

            case 'FLOCKING':
                if (dist < 80) this.setState('CHASE'); // 밀착 근접 시 개별 각개전투
                break;
        }
    }
}

// --------------------------------------------------------------------------
// 2. Flyweight Movement Strategies (7대 AI 원칙 & 시너지 포메이션 이동 전략)
// --------------------------------------------------------------------------
const MovementStrategy = {
    // 1) 기본 추적 (Chase) + 원칙 7 (스마트 격벽 접선 슬라이딩 & 척력 밀침)
    chase: {
        move(monster, player, engine) {
            let dx = player.x - monster.x;
            let dy = player.y - monster.y;
            let dist = Math.hypot(dx, dy);
            if (dist <= 0.1) return;

            let vx = (dx / dist) * monster.speed;
            let vy = (dy / dist) * monster.speed;

            // 스마트 격벽 접선 슬라이딩 (Smart Steering)
            MovementStrategy.smartSteering(monster, vx, vy, engine);
            // 동료 몬스터 척력 밀침 (Crowd Avoidance)
            MovementStrategy.applySeparation(monster, engine);
        }
    },

    // 2) 원거리 카이팅 (Kiting) - 원칙 2
    kiting: {
        move(monster, player, engine) {
            let dx = monster.x - player.x; // 반대 방향 Vector
            let dy = monster.y - player.y;
            let dist = Math.hypot(dx, dy);
            if (dist <= 0.1) return;

            let vx = (dx / dist) * monster.speed * 0.95;
            let vy = (dy / dist) * monster.speed * 0.95;

            // 후퇴 시에도 스마트 벽 슬라이딩 및 척력 적용
            MovementStrategy.smartSteering(monster, vx, vy, engine);
            MovementStrategy.applySeparation(monster, engine);
        }
    },

    // 3) 매복 & 은신 접근 (Ambush & Stealth) - 원칙 1
    stealth: {
        move(monster, player, engine) {
            let dist = Math.hypot(player.x - monster.x, player.y - monster.y);
            monster.opacity = dist > 120 ? 0.15 : 0.95; // 120px 밖 은신 (투명도 15%)
            monster.isStealth = dist > 120; // 타겟팅 차단 플래그

            let speedMult = dist > 120 ? 1.3 : 1.0;
            let dx = player.x - monster.x;
            let dy = player.y - monster.y;
            if (dist > 0.1) {
                let vx = (dx / dist) * monster.speed * speedMult;
                let vy = (dy / dist) * monster.speed * speedMult;
                MovementStrategy.smartSteering(monster, vx, vy, engine);
            }
        }
    },

    // 4) 벽 통과 & 지형 활용 (Wall Phase / Terrain Action) - 원칙 3
    wallPhase: {
        move(monster, player, engine) {
            let dx = player.x - monster.x;
            let dy = player.y - monster.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 0.1) {
                monster.x += (dx / dist) * monster.speed;
                monster.y += (dy / dist) * monster.speed;
            }
        }
    },

    // 5) 군집 집결 & 고도화 2: 상호 시너지 에스코트 포메이션 - 원칙 4 & 고도화 2
    flocking: {
        move(monster, player, engine) {
            let dx = player.x - monster.x;
            let dy = player.y - monster.y;
            let dist = Math.hypot(dx, dy);
            if (dist <= 0.1) return;

            let vx = (dx / dist) * monster.speed;
            let vy = (dy / dist) * monster.speed;

            // 시너지 포메이션: 방패 가디언/탱커 뒤로 에스코트 집결
            if (engine.monsters) {
                let shieldTarget = engine.monsters.find(m => m !== monster && (m.type === 'aegis_guardian' || m.type === 'tanker'));
                if (shieldTarget) {
                    // 방패 몬스터의 후방 위치 추종
                    let sAngle = shieldTarget.facingAngle || 0;
                    let targetX = shieldTarget.x - Math.cos(sAngle) * 45;
                    let targetY = shieldTarget.y - Math.sin(sAngle) * 45;

                    let sdx = targetX - monster.x;
                    let sdy = targetY - monster.y;
                    let sdist = Math.hypot(sdx, sdy);
                    if (sdist > 10 && sdist < 300) {
                        vx = (sdx / sdist) * monster.speed * 1.1;
                        vy = (sdy / sdist) * monster.speed * 1.1;
                    }
                }
            }

            MovementStrategy.smartSteering(monster, vx, vy, engine);
            MovementStrategy.applySeparation(monster, engine);
        }
    },

    // 6) 원칙 7: 스마트 격벽 우회 & 접선 슬라이딩 (Tangential Steering & Corner Escape)
    smartSteering(monster, vx, vy, engine) {
        if (!engine.isPositionInWall) {
            monster.x += vx;
            monster.y += vy;
            return;
        }

        let nextX = monster.x + vx;
        let nextY = monster.y + vy;
        let r = monster.radius || 14;

        if (!engine.isPositionInWall(nextX, nextY, r)) {
            monster.x = nextX;
            monster.y = nextY;
            return;
        }

        if (!engine.isPositionInWall(nextX, monster.y, r)) {
            monster.x = nextX;
            return;
        }
        if (!engine.isPositionInWall(monster.x, nextY, r)) {
            monster.y = nextY;
            return;
        }

        let altAngle1 = Math.atan2(vy, vx) + Math.PI / 4;
        let altAngle2 = Math.atan2(vy, vx) - Math.PI / 4;
        let spd = monster.speed;

        let ax1 = monster.x + Math.cos(altAngle1) * spd;
        let ay1 = monster.y + Math.sin(altAngle1) * spd;
        if (!engine.isPositionInWall(ax1, ay1, r)) {
            monster.x = ax1;
            monster.y = ay1;
            return;
        }

        let ax2 = monster.x + Math.cos(altAngle2) * spd;
        let ay2 = monster.y + Math.sin(altAngle2) * spd;
        if (!engine.isPositionInWall(ax2, ay2, r)) {
            monster.x = ax2;
            monster.y = ay2;
        }
    },

    // 7) 원칙 7: 동료 몬스터 척력 밀침 (Soft Crowd Separation Push)
    applySeparation(monster, engine) {
        if (!engine.monsters || engine.monsters.length <= 1) return;
        let sepDist = (monster.radius || 14) * 2.2;
        let pushX = 0;
        let pushY = 0;
        let count = 0;

        for (let i = 0; i < engine.monsters.length; i++) {
            let other = engine.monsters[i];
            if (other === monster || other.isBoss) continue;

            let dx = monster.x - other.x;
            let dy = monster.y - other.y;
            let dist = Math.hypot(dx, dy);

            if (dist > 0.001 && dist < sepDist) {
                pushX += (dx / dist) * (sepDist - dist) * 0.12;
                pushY += (dy / dist) * (sepDist - dist) * 0.12;
                count++;
                if (count > 4) break;
            }
        }

        if (count > 0) {
            let nextX = monster.x + pushX;
            let nextY = monster.y + pushY;
            if (!engine.isPositionInWall || !engine.isPositionInWall(nextX, nextY, monster.radius)) {
                monster.x = nextX;
                monster.y = nextY;
            }
        }
    }
};

// --------------------------------------------------------------------------
// 3. Flyweight Attack Strategies (공격/기믹 & 예측 사격 전략)
// --------------------------------------------------------------------------
const AttackStrategy = {
    // 1) 기본 단발 네온 탄환 사격
    singleShot: {
        attack(monster, player, engine) {
            if (!engine || !engine.bullets) return;
            let angle = Math.atan2(player.y - monster.y, player.x - monster.x);
            let bSpeed = 4.8;
            engine.bullets.push({
                x: monster.x,
                y: monster.y,
                vx: Math.cos(angle) * bSpeed,
                vy: Math.sin(angle) * bSpeed,
                radius: 4,
                color: monster.color || '#ff0055',
                isEnemy: true,
                damage: monster.atk || 10
            });
        }
    },

    // 2) 3Way 산탄 사격
    scatterShot: {
        attack(monster, player, engine) {
            if (!engine || !engine.bullets) return;
            let baseAngle = Math.atan2(player.y - monster.y, player.x - monster.x);
            let angles = [baseAngle - 0.25, baseAngle, baseAngle + 0.25];
            let bSpeed = 4.2;
            angles.forEach(a => {
                engine.bullets.push({
                    x: monster.x,
                    y: monster.y,
                    vx: Math.cos(a) * bSpeed,
                    vy: Math.sin(a) * bSpeed,
                    radius: 3.5,
                    color: monster.color || '#ffaa00',
                    isEnemy: true,
                    damage: Math.ceil((monster.atk || 10) * 0.7)
                });
            });
        }
    },

    // 3) 고도화 1: 예측 사격 AI (Predictive Lead Shooting - 0.5초 선행 조준)
    predictiveLeadShot: {
        attack(monster, player, engine) {
            if (!engine || !engine.bullets) return;

            let bSpeed = 8.5; // 고속 탄환
            let leadTime = 0.45; // 0.45초 선행 추정

            // 플레이어의 이동 속도 벡터 계산 (없을 시 기본 0)
            let pVx = player.vx || 0;
            let pVy = player.vy || 0;

            // 0.45초 뒤 예상 플레이어 좌표
            let targetX = player.x + pVx * leadTime * 60;
            let targetY = player.y + pVy * leadTime * 60;

            let angle = Math.atan2(targetY - monster.y, targetX - monster.x);

            engine.bullets.push({
                x: monster.x,
                y: monster.y,
                vx: Math.cos(angle) * bSpeed,
                vy: Math.sin(angle) * bSpeed,
                radius: 5,
                color: '#00f0ff',
                isEnemy: true,
                damage: Math.ceil((monster.atk || 10) * 1.4)
            });

            // 시각적 리드 조준선 효과 (Telegraph)
            if (engine.particles && Math.random() < 0.5) {
                engine.particles.push(new Particle(monster.x, monster.y, '#00f0ff', 2, Math.cos(angle) * 3, Math.sin(angle) * 3, 12, 'spark'));
            }
        }
    },

    // 4) 플라즈마 관통 레이저 사격
    laserCharge: {
        attack(monster, player, engine) {
            if (!engine || !engine.bullets) return;
            let angle = Math.atan2(player.y - monster.y, player.x - monster.x);
            let bSpeed = 8.5;
            engine.bullets.push({
                x: monster.x,
                y: monster.y,
                vx: Math.cos(angle) * bSpeed,
                vy: Math.sin(angle) * bSpeed,
                radius: 6,
                color: '#00f0ff',
                isEnemy: true,
                damage: Math.ceil((monster.atk || 10) * 1.5)
            });
        }
    },

    // 5) 반응형 반사 방패 (Reflector Barrier) - 원칙 6
    reflectShield: {
        checkReflect(monster, bullet) {
            if (!monster.isShieldActive || !bullet || bullet.isEnemy) return false;

            let mAngle = monster.facingAngle || 0;
            let bAngle = Math.atan2(bullet.vy, bullet.vx);
            let diff = Math.abs(mAngle - (bAngle + Math.PI));

            if (diff < Math.PI / 3) {
                bullet.vx = -bullet.vx * 1.1;
                bullet.vy = -bullet.vy * 1.1;
                bullet.isEnemy = true;
                bullet.color = '#ff007f';
                return true;
            }
            return false;
        }
    },

    // 6) 길목 독/둔화 덫 설치 (Zone Hazards) - 원칙 5
    trapDeploy: {
        attack(monster, player, engine) {
            if (!engine || !engine.enemyHazards) return;
            if (engine.enemyHazards.length >= 6) return;

            engine.enemyHazards.push({
                x: monster.x,
                y: monster.y,
                radius: 28,
                duration: 360,
                type: 'poison_web',
                color: 'rgba(121, 40, 202, 0.4)'
            });
        }
    }
};

window.MonsterFSM = MonsterFSM;
window.MovementStrategy = MovementStrategy;
window.AttackStrategy = AttackStrategy;
