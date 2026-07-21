// --------------------------------------------------------------------------
// MonsterAI: FSM State Machine 및 Flyweight Pattern Strategy AI Engine
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

        // 스턴 상태 우선 처리
        if (this.monster.isStunned || this.monster.stunTimer > 0) {
            this.setState('STUN');
            return;
        }

        // 몬스터 체력/거리 기반 자동 상태 판단
        let dist = Math.hypot(player.x - this.monster.x, player.y - this.monster.y);

        switch (this.currentState) {
            case 'STUN':
                if (this.monster.stunTimer <= 0) {
                    this.setState('CHASE');
                }
                break;
            case 'CHASE':
                if (this.monster.type === 'shooter' || this.monster.type === 'plasma_sniper') {
                    if (dist < 200) this.setState('KITING');
                } else if (this.monster.type === 'shadow_assassin' && dist > 150) {
                    this.setState('AMBUSH');
                }
                break;
            case 'KITING':
                if (dist > 320) this.setState('CHASE');
                break;
            case 'AMBUSH':
                if (dist < 100) this.setState('CHASE');
                break;
        }
    }
}

// --------------------------------------------------------------------------
// 2. Flyweight Movement Strategies (전역 싱글톤 공유 객체)
// --------------------------------------------------------------------------
const MovementStrategy = {
    // 1) 기본 추적 (Chase)
    chase: {
        move(monster, player, engine) {
            let dx = player.x - monster.x;
            let dy = player.y - monster.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 0.1) {
                let vx = (dx / dist) * monster.speed;
                let vy = (dy / dist) * monster.speed;

                // 벽 충돌 검사
                let nextX = monster.x + vx;
                let nextY = monster.y + vy;
                if (!engine.isPositionInWall || !engine.isPositionInWall(nextX, nextY, monster.radius)) {
                    monster.x = nextX;
                    monster.y = nextY;
                } else if (!engine.isPositionInWall(nextX, monster.y, monster.radius)) {
                    monster.x = nextX;
                } else if (!engine.isPositionInWall(monster.x, nextY, monster.radius)) {
                    monster.y = nextY;
                }
            }
        }
    },

    // 2) 거리 유지 카이팅 (Kiting)
    kiting: {
        move(monster, player, engine) {
            let dx = monster.x - player.x; // 반대 방향 Vector
            let dy = monster.y - player.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 0.1) {
                let vx = (dx / dist) * monster.speed * 0.9;
                let vy = (dy / dist) * monster.speed * 0.9;

                let nextX = monster.x + vx;
                let nextY = monster.y + vy;
                if (!engine.isPositionInWall || !engine.isPositionInWall(nextX, nextY, monster.radius)) {
                    monster.x = nextX;
                    monster.y = nextY;
                }
            }
        }
    },

    // 3) 은신 및 접근 (Stealth & Ambush)
    stealth: {
        move(monster, player, engine) {
            let dist = Math.hypot(player.x - monster.x, player.y - monster.y);
            monster.opacity = dist > 120 ? 0.15 : 0.95; // 120px 밖 은신 (투명도 15%)
            
            // 은신 시 약간 가속
            let speedMult = dist > 120 ? 1.25 : 1.0;
            let dx = player.x - monster.x;
            let dy = player.y - monster.y;
            if (dist > 0.1) {
                monster.x += (dx / dist) * monster.speed * speedMult;
                monster.y += (dy / dist) * monster.speed * speedMult;
            }
        }
    },

    // 4) 벽 통과 (Wall Phase)
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
    }
};

// --------------------------------------------------------------------------
// 3. Flyweight Attack Strategies (전역 싱글톤 공유 객체)
// --------------------------------------------------------------------------
const AttackStrategy = {
    // 1) 기본 단발 네온 탄환
    singleShot: {
        attack(monster, player, engine) {
            if (!engine || !engine.bullets) return;
            let angle = Math.atan2(player.y - monster.y, player.x - monster.x);
            let bSpeed = 4.5;
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

    // 2) 3Way 산탄
    scatterShot: {
        attack(monster, player, engine) {
            if (!engine || !engine.bullets) return;
            let baseAngle = Math.atan2(player.y - monster.y, player.x - monster.x);
            let angles = [baseAngle - 0.25, baseAngle, baseAngle + 0.25];
            let bSpeed = 4.0;
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

    // 3) 플라즈마 관통 레이저 사격
    laserCharge: {
        attack(monster, player, engine) {
            if (!engine || !engine.bullets) return;
            let angle = Math.atan2(player.y - monster.y, player.x - monster.x);
            let bSpeed = 8.0; // 고속 플라즈마 탄
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
    }
};

window.MonsterFSM = MonsterFSM;
window.MovementStrategy = MovementStrategy;
window.AttackStrategy = AttackStrategy;
