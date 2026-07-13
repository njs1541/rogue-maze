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
        
        let baseRadius = options.radius || 4;
        if (isPlayerBullet && window.gameEngine && window.gameEngine.player) {
            let scaleFactor = Math.sqrt(window.gameEngine.player.atk / 10); // 기본 공격력 10 기준 루트 비례 확대
            baseRadius = baseRadius * scaleFactor;
        }
        this.radius = baseRadius;
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
        this.isEnergyBall = options.isEnergyBall || false; // 에너지볼 여부
        this.isAdvanced = options.isAdvanced || false; // [신규] 하이테크 진화 무기 여부
        this.bounceCount = 0; // 도탄 튕긴 누적 횟수
        this.bounceLimit = options.bounceLimit || 0; // 최대 허용 도탄 횟수
        this.monsterBounceCount = 0; // 몬스터 튕긴 누적 횟수
        this.monsterBounceLimit = options.monsterBounceLimit || 0; // 최대 허용 몬스터 튕기기 횟수
        this.active = true; // [신규] 탄환 활성화 상태 (배열 훼손 방멸용 소멸 예약 플래그)

        // [패시브 아이템 연동]
        if (isPlayerBullet && window.gameEngine && window.gameEngine.player) {
            const player = window.gameEngine.player;
            const passives = player.craftedPassives || [];
            
            // 1. 도탄 관통 기어 (ricochet_director): 도탄 횟수 +1
            if (passives.includes('ricochet_director')) {
                this.bounceLimit += 1;
            }
            // 2. 유도 추적 기어 (homing_thruster): 모든 투사체 유도(homing)화
            if (passives.includes('homing_thruster')) {
                this.homing = true;
            }
            // 3. 자이언트 탄환 셸 (giant_bullet_shell): 투사체 크기 40% 증가
            if (passives.includes('giant_bullet_shell')) {
                this.radius *= 1.4;
            }
            // 4. 고압 충전 코일 (high_charge_coil): 관통 횟수 +1
            if (passives.includes('high_charge_coil')) {
                this.pierce += 1;
            }
            // 5. 나노 플라즈마 코팅 (plasma_coating): 30% 확률로 타격 시 스플래시 발생
            if (passives.includes('plasma_coating') && !this.splash && Math.random() < 0.3) {
                this.splash = 50; // 50px 반경 스플래시 부여
            }
        }

        this.hitMonsters = new Set(); // [최적화] 이미 타격한 몬스터 레퍼런스 저장 (중복 피격 방지)
        this.targetMonster = null;    // [최적화] 캐싱된 유도 대상 몬스터

        // [초월 무기 - 아앤파 댄스 전용] DNA 이중나선 물리/비주얼 관련 상태 주입
        this.isDna = options.isDna || false;
        this.dnaWavePhase = options.dnaWavePhase || 0;
        this.dnaAmplitude = options.dnaAmplitude !== undefined ? options.dnaAmplitude : 16;
        this.dnaFrequency = options.dnaFrequency !== undefined ? options.dnaFrequency : 0.18;
        this.dnaTime = 0;
        this.virtualX = x;
        this.virtualY = y;
        this.isScytheSynergy = options.isScytheSynergy || false;
    }

    update(monsters) {
        // [수정] 시간 왜곡 시 적 탄환 75% 감속 적용
        let timeScale = 1.0;
        if (!this.isPlayerBullet && window.gameEngine && window.gameEngine.timeDilationActive) {
            timeScale = 0.1; // 90% 느려짐 (시간 왜곡 시 압도적 감속)
        }

        this.life -= timeScale;

        // DNA 궤적의 경우 유도 조준 및 거리 탐색의 기본 기준점을 가상 물리 중심으로 전환
        let baseForHomingX = this.isDna ? this.virtualX : this.x;
        let baseForHomingY = this.isDna ? this.virtualY : this.y;

        // 유도탄 로직: 가장 가까운 적을 감지하여 실시간 유도 비행 (타겟 캐싱 최적화)
        if (this.isPlayerBullet && this.homing && monsters.length > 0) {
            // 캐싱된 타겟이 유효한지 검증 (체력이 남아있고, 사망 처리 마킹이 되지 않았는지)
            if (!this.targetMonster || this.targetMonster.hp <= 0 || this.targetMonster.dead) {
                this.targetMonster = null;
                let minDist = Infinity;
                for (let m of monsters) {
                    if (m.hp <= 0) continue;
                    let dist = Math.hypot(m.x - baseForHomingX, m.y - baseForHomingY);
                    if (dist < minDist) {
                        minDist = dist;
                        this.targetMonster = m;
                    }
                }
            }

            if (this.targetMonster) {
                // 적 방향의 목표 각도 연산
                let targetAngle = Math.atan2(this.targetMonster.y - baseForHomingY, this.targetMonster.x - baseForHomingX);
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

        // DNA 궤적 탄환은 가상 중심 좌표를 누적 전진하고 일반 탄환은 실제 좌표를 누적
        if (this.isDna) {
            this.virtualX += this.vx * timeScale;
            this.virtualY += this.vy * timeScale;
        } else {
            this.x += this.vx * timeScale;
            this.y += this.vy * timeScale;
        }

        // 플레이어의 탄환일 때 이동 방향 뒤로 잔상 trail 파티클 생성
        if (this.isPlayerBullet && window.gameEngine) {
            let trailProb = this.isAdvanced ? 0.75 : 0.25; // 진화 무기는 75% 확률, 조잡한 무기는 25% 확률로 트레일 생성
            if (Math.random() < trailProb) {
                window.gameEngine.particles.push(new Particle(
                    this.x, this.y,
                    this.color, this.isAdvanced ? this.radius * 0.9 : this.radius * 0.6,
                    -this.vx * 0.15 + (Math.random() - 0.5) * 0.4, // 탄환 속도 반대 방향 관성 추가로 입체감 부여
                    -this.vy * 0.15 + (Math.random() - 0.5) * 0.4,
                    this.isAdvanced ? 15 : 8, 'trail' // 진화 탄환은 잔상 유지 시간이 길고 선명함
                ));
            }
        }

        // [5-4단계] 탄환과 격자 장애물의 AABB 충돌 및 도탄(Bounce)/소멸 물리 연동
        // 25등분 격자에 소환된 자홍색 홀로그램 장벽들과 탄환의 AABB 충돌을 검출합니다.
        if (window.gameEngine && window.gameEngine.obstacles.length > 0 && this.active) {
            for (let obs of window.gameEngine.obstacles) {
                let currentX = this.isDna ? this.virtualX : this.x;
                let currentY = this.isDna ? this.virtualY : this.y;
                let distX = currentX - obs.x;
                let distY = currentY - obs.y;
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
                            if (this.isDna) {
                                this.virtualX += distX > 0 ? overlapX : -overlapX;
                            } else {
                                this.x += distX > 0 ? overlapX : -overlapX;
                            }
                            this.vx = -this.vx;
                        } else {
                            // 상하 측면 충돌 시 수직 속도 반사 및 밀어내기
                            if (this.isDna) {
                                this.virtualY += distY > 0 ? overlapY : -overlapY;
                            } else {
                                this.y += distY > 0 ? overlapY : -overlapY;
                            }
                            this.vy = -this.vy;
                        }

                        // 튕김 카운트 증가 및 데미지 복리 증폭 (+10%)
                        this.bounceCount++;
                        this.damage *= 1.10; 
                        Sound.play('dodge'); // 통통 튕기는 틱 레트로 효과음

                        // 튕길 때 튀는 3개 자홍색/노란색 네온 스파크 파티클
                        let currentEmitX = this.isDna ? this.virtualX : this.x;
                        let currentEmitY = this.isDna ? this.virtualY : this.y;
                        for (let k = 0; k < 3; k++) {
                            let randAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            window.gameEngine.particles.push(new Particle(
                                currentEmitX, currentEmitY, 
                                '#ff00aa', 1.5, 
                                Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'
                            ));
                        }
                        window.gameEngine.showFloatingText("BOUNCE! 💥", currentEmitX, currentEmitY - 15, '#ff00aa');
                    } else {
                        // 도탄이 불가능하거나 몬스터의 탄환인 경우 즉시 소멸 처리
                        this.active = false;
                        this.life = 0;

                        // 소멸 스파크 파편 효과 연출
                        let currentEmitX = this.isDna ? this.virtualX : this.x;
                        let currentEmitY = this.isDna ? this.virtualY : this.y;
                        for (let k = 0; k < 3; k++) {
                            let randAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            window.gameEngine.particles.push(new Particle(
                                currentEmitX, currentEmitY, 
                                this.color, 1.5, 
                                Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 10, 'spark'
                            ));
                        }
                    }
                    break; // 하나의 장애물과 충돌 시 루프 탈출
                }
            }
        }

        // [수정] 비밀방 균열 벽(SecretWall)도 탄환을 투과시키지 않도록 충돌 감지 및 소멸/도탄 물리 연동
        if (window.gameEngine && window.gameEngine.secretWalls.length > 0 && this.active) {
            for (let j = window.gameEngine.secretWalls.length - 1; j >= 0; j--) {
                let wall = window.gameEngine.secretWalls[j];
                let currentX = this.isDna ? this.virtualX : this.x;
                let currentY = this.isDna ? this.virtualY : this.y;
                let distX = currentX - wall.x;
                let distY = currentY - wall.y;
                let minXDist = (wall.width / 2) + this.radius;
                let minYDist = (wall.height / 2) + this.radius;

                if (Math.abs(distX) < minXDist && Math.abs(distY) < minYDist) {
                    // 충돌 발생!
                    
                    // 플레이어 탄환인 경우 데미지 및 균열 벽 타격 상태 처리
                    if (this.isPlayerBullet) {
                        if (!wall.hitCooldown) {
                            wall.hitCooldown = 12;
                            if (window.gameEngine.player && window.gameEngine.player.equipLevels && window.gameEngine.player.equipLevels.goggles === 10) {
                                wall.hp = 0;
                            } else {
                                wall.hp--;
                            }
                            wall.hitCount++;
                            wall.flashTimer = 5;
                            Sound.play('hit');

                            for (let k = 0; k < 4; k++) {
                                let randAngle = Math.random() * Math.PI * 2;
                                let pSpeed = Math.random() * 2 + 1;
                                window.gameEngine.particles.push(new Particle(
                                    currentX, currentY, 
                                    wall.glowColor, 1.5, 
                                    Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'
                                ));
                            }

                            // 3회 적중 시 최초 지지직 글리치 오라 개막
                            if (wall.hitCount === 3) {
                                window.gameEngine.showFloatingText(`⚠️ GLITCH DETECTED! 🔮`, wall.x, wall.y - 20, '#b026ff');
                                Sound.play('powerup');
                            } else {
                                window.gameEngine.showFloatingText(`CRACK! 🔨`, wall.x, wall.y - 15, '#b026ff');
                            }

                            if (wall.hp <= 0) {
                                Sound.play('explosion');
                                window.gameEngine.shakeScreen(10, 4.5);
                                for (let k = 0; k < 15; k++) {
                                    let randAngle = Math.random() * Math.PI * 2;
                                    let pSpeed = Math.random() * 4 + 1.5;
                                    window.gameEngine.particles.push(new Particle(wall.x, wall.y, '#b026ff', 2.2, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 25, 'spark'));
                                    window.gameEngine.particles.push(new Particle(wall.x, wall.y, '#333333', 1.8, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 15, 'dust'));
                                }
                                window.gameEngine.showFloatingText("GLITCH WALL BROKEN! 💥", wall.x, wall.y - 20, '#b026ff');

                                // 맵 중앙 가용 영역 내 장애물들과 겹치지 않는 안전한 랜덤 좌표 추출
                                let cx = window.gameEngine.mapWidth / 2, cy = window.gameEngine.mapHeight / 2;
                                let foundSafe = false;
                                for (let attempt = 0; attempt < 50; attempt++) {
                                    let rx = 100 + Math.random() * (window.gameEngine.mapWidth - 200);
                                    let ry = 100 + Math.random() * (window.gameEngine.mapHeight - 200);
                                    let distToPlayer = Math.hypot(window.gameEngine.player.x - rx, window.gameEngine.player.y - ry);
                                    if (distToPlayer < 100) continue;

                                    let distToObs = true;
                                    for (let obs of window.gameEngine.obstacles) {
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

                                if (!foundSafe) {
                                    cx = wall.x;
                                    cy = wall.y;
                                }

                                // 비밀방 포털 100% 소환
                                let secretPortal = new RoomPortal('secret', 0, cx, cy);
                                secretPortal.difficultyClass = 'high';
                                window.gameEngine.portals.push(secretPortal);
                                window.gameEngine.showFloatingText("🔮 DIMENSIONAL PORTAL OPENED!", cx, cy - 35, '#b026ff');

                                for (let k2 = 0; k2 < 20; k2++) {
                                    let pAngle2 = Math.random() * Math.PI * 2;
                                    let pSpeed2 = Math.random() * 3.5 + 2;
                                    window.gameEngine.particles.push(new Particle(cx, cy, '#b026ff', 2.2, Math.cos(pAngle2) * pSpeed2, Math.sin(pAngle2) * pSpeed2, 28, 'spark'));
                                }

                                window.gameEngine.secretWalls.splice(j, 1);
                            }
                        }
                    }

                    // 도탄 튕김 물리
                    if (this.isPlayerBullet && this.bounceLimit > 0 && this.bounceCount < this.bounceLimit) {
                        let overlapX = minXDist - Math.abs(distX);
                        let overlapY = minYDist - Math.abs(distY);

                        if (overlapX < overlapY) {
                            if (this.isDna) this.virtualX += distX > 0 ? overlapX : -overlapX;
                            else this.x += distX > 0 ? overlapX : -overlapX;
                            this.vx = -this.vx;
                        } else {
                            if (this.isDna) this.virtualY += distY > 0 ? overlapY : -overlapY;
                            else this.y += distY > 0 ? overlapY : -overlapY;
                            this.vy = -this.vy;
                        }

                        this.bounceCount++;
                        this.damage *= 1.10;
                        Sound.play('dodge');

                        let currentEmitX = this.isDna ? this.virtualX : this.x;
                        let currentEmitY = this.isDna ? this.virtualY : this.y;
                        for (let k = 0; k < 3; k++) {
                            let randAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            window.gameEngine.particles.push(new Particle(
                                currentEmitX, currentEmitY, 
                                '#ff00aa', 1.5, 
                                Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'
                            ));
                        }
                        window.gameEngine.showFloatingText("BOUNCE! 💥", currentEmitX, currentEmitY - 15, '#ff00aa');
                    } else {
                        // 튕김 한도가 다했거나 적 탄환인 경우 즉시 소멸
                        this.active = false;
                        this.life = 0;

                        let currentEmitX = this.isDna ? this.virtualX : this.x;
                        let currentEmitY = this.isDna ? this.virtualY : this.y;
                        for (let k = 0; k < 3; k++) {
                            let randAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            window.gameEngine.particles.push(new Particle(
                                currentEmitX, currentEmitY, 
                                this.color, 1.5, 
                                Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 10, 'spark'
                            ));
                        }
                    }
                    break;
                }
            }
        }

        // [W-03 총 도탄 물리 기믹 연산]
        if (this.isPlayerBullet && this.bounceLimit > 0 && this.bounceCount < this.bounceLimit) {
            const wallMargin = 50;
            let collided = false;
            
            let currentX = this.isDna ? this.virtualX : this.x;
            let currentY = this.isDna ? this.virtualY : this.y;

            let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;

            // 좌우 벽 충돌 감지
            if (currentX < wallMargin + this.radius) {
                currentX = wallMargin + this.radius;
                if (this.isDna) this.virtualX = currentX;
                else this.x = currentX;
                this.vx = -this.vx;
                collided = true;
            } else if (currentX > mapW - wallMargin - this.radius) {
                currentX = mapW - wallMargin - this.radius;
                if (this.isDna) this.virtualX = currentX;
                else this.x = currentX;
                this.vx = -this.vx;
                collided = true;
            }
            
            // 상하 벽 충돌 감지
            if (currentY < wallMargin + this.radius) {
                currentY = wallMargin + this.radius;
                if (this.isDna) this.virtualY = currentY;
                else this.y = currentY;
                this.vy = -this.vy;
                collided = true;
            } else if (currentY > mapH - wallMargin - this.radius) {
                currentY = mapH - wallMargin - this.radius;
                if (this.isDna) this.virtualY = currentY;
                else this.y = currentY;
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
                    let currentEmitX = this.isDna ? this.virtualX : this.x;
                    let currentEmitY = this.isDna ? this.virtualY : this.y;
                    for (let k = 0; k < 3; k++) {
                        let randAngle = Math.random() * Math.PI * 2;
                        let pSpeed = Math.random() * 2 + 1;
                        window.gameEngine.particles.push(new Particle(
                            currentEmitX, currentEmitY, 
                            this.color, 1.5, 
                            Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'
                        ));
                    }
                    window.gameEngine.showFloatingText("BOUNCE! 💥", currentEmitX, currentEmitY - 15, '#ffdf00');
                }
            }
        }

        // DNA 이중나선 궤적용 법선 방향 사인파 변위 최종 좌표 갱신
        if (this.isDna) {
            this.dnaTime += timeScale * this.dnaFrequency;
            let offset = Math.sin(this.dnaTime + this.dnaWavePhase) * this.dnaAmplitude;
            let speed = Math.hypot(this.vx, this.vy);
            if (speed > 0) {
                let px = -this.vy / speed;
                let py = this.vx / speed;
                this.x = this.virtualX + px * offset;
                this.y = this.virtualY + py * offset;
            } else {
                this.x = this.virtualX;
                this.y = this.virtualY;
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
        } else if (this.isEnergyBall) {
            // 에너지볼 전용 이글거리는 에너지 구체 렌더링
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // 하얀 핵심 코어
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#00d0ff'; // 밝은 하늘색 네온 글로우 오라
            ctx.fill();

            // 바깥 테두리 오라 레이어 추가
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.3, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 208, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (this.isFire && this.isAdvanced) {
            // [진화형] 융합 플라즈마포 탄환: 밝은 주황색 오라 + 백색 코어
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 94, 0, 0.35)'; // 외부 주황 오라
            ctx.strokeStyle = '#ff5e00';
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 24;
            ctx.shadowColor = '#ff5e00';
            ctx.fill();
            ctx.stroke();

            // 흰색 고밀도 플라즈마 핵 코어
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fill();
        } else if (this.isIce && !this.isAdvanced) {
            // [조잡형] 크라이오 건 서리 눈결정 탄환
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00f0ff';
            ctx.fill();
            ctx.stroke();

            // 내부에 정교한 6각 눈결정(❄️) 수동 드로잉
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Date.now() * 0.003); // 서서히 회전하며 비행
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0;
            ctx.shadowBlur = 0;
            for (let k = 0; k < 3; k++) {
                ctx.beginPath();
                ctx.rotate(Math.PI / 3);
                ctx.moveTo(-this.radius * 0.8, 0);
                ctx.lineTo(this.radius * 0.8, 0);
                ctx.stroke();
                
                // 잔가지 드로잉
                ctx.beginPath();
                ctx.moveTo(this.radius * 0.4, 0);
                ctx.lineTo(this.radius * 0.6, -this.radius * 0.25);
                ctx.moveTo(this.radius * 0.4, 0);
                ctx.lineTo(this.radius * 0.6, this.radius * 0.25);
                ctx.stroke();
            }
            ctx.restore();
        } else {
            Renderer.drawSprite(
                ctx,
                this.isPlayerBullet ? 'bullet_neon' : 'bullet_enemy',
                this.x,
                this.y,
                this.radius * 2,
                this.radius * 2,
                Math.atan2(this.vy, this.vx) || 0,
                () => {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    
                    // 등급에 따라 네온 아우라 세기 및 모양 차별화
                    if (this.isPlayerBullet) {
                        if (this.isAdvanced) {
                            ctx.shadowBlur = 25; // 진화 무기는 발광 극대화
                            ctx.shadowColor = this.color;
                            ctx.fill();
                            
                            // 진화형 하이테크 탄환 전용 이너 화이트 코어 그리기
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
                            ctx.fillStyle = '#ffffff';
                            ctx.shadowBlur = 0;
                            ctx.fill();
                        } else {
                            ctx.shadowBlur = 8; // 조잡한 무기는 둔탁하고 얇은 네온
                            ctx.shadowColor = this.color;
                            ctx.fill();
                        }
                    } else {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = this.color;
                        ctx.fill();
                    }
                }
            );
        }
        ctx.restore();
    }
}
