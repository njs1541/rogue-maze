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

        // [신규 기획] 무기 방 내 몬스터의 난이도를 25% 상승시켜 리스크 강화
        let weaponRoomMultiplier = 1.0;
        if (window.gameEngine && window.gameEngine.currentRoomType === 'weapon') {
            weaponRoomMultiplier = 1.25;
        }

        // 티어별 기본 체력과 속도, 데미지 스케일링 설정
        this.maxHp = Math.ceil((15 + (tier - 1) * 4) * roomFactor * weaponRoomMultiplier); // 체력 증가율 합리적으로 완화
        this.hp = this.maxHp;
        this.atk = Math.ceil((5 + (tier - 1) * 1.5) * roomFactor * weaponRoomMultiplier); // 공격력 인플레이션 해결
        this.speed = 1.2 + Math.min(1.2, (tier - 1) * 0.1);
        // 후반부 속도 폭주 방지 안전 캡 보정 (50~100층 구간)
        if (roomNum >= 50) {
            this.speed = Math.min(2.2, this.speed);
        }
        this.scoreValue = tier; // 잡았을 때 기여도
        
        // 엘리트 몬스터 기믹용 속성 정의
        this.isElite = false;

        // 몬스터 종류 다양화
        // const monsterTypes = ['normal', 'chaser', 'shooter']; // 추후 몬스터 다양화 확장 시 사용 예정
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
                let fLvl = (window.gameEngine && window.gameEngine.player) ? (window.gameEngine.player.weaponLevels.fire || 1) : 1;
                let burnDmg = 1.2 * (this.statusEffects.burnStack || 1) * (1 + (fLvl - 1) * 0.15);
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

            // [신규 연출] 대시 상태(넉백 가속도가 높을 때) 꽁무니에서 네온 주황 배기 스파크 발사
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
        if (this.isBoss) {
            // [보스 몬스터] 이중 역회전 기계식 링 연출
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
            ctx.fillStyle = fillColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
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
