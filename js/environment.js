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
        ctx.fillText(`📀 ${this.getPrice()}`, 0, -this.height/2 * scale + 31);

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
        let trapLvl = this.player.weaponLevels.trap || 1;
        let splashRadius = 50 + trapLvl * 10; // 1레벨: 60px ~ 5레벨: 100px
        let damage = this.player.atk * 1.5 * (1 + (trapLvl - 1) * 0.15); // 레벨당 15% 대미지 증가
        let shockDuration = 48 + trapLvl * 12; // 1레벨: 60프레임 (1.0초) ~ 5레벨: 108프레임 (1.8초)
        
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

        // 범위 내의 모든 적 기절 대폭발
        for (let m of game.monsters) {
            let dist = Math.hypot(m.x - this.x, m.y - this.y);
            if (dist < splashRadius + m.radius) {
                m.statusEffects.shock = shockDuration; // [수정] 레벨별 기절 시간
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
        let trapLvl = this.player.weaponLevels.trap || 1;
        game.showFloatingText("TRIPWIRE DETONATED! ⚡", hitMonster.x, hitMonster.y - 25, '#00f0ff');
        game.shakeScreen(8, 3);
        
        // 체인 라이트닝 전류 마비 격발 (1레벨: 4회 ~ 5레벨: 8회 전이, 레벨별 대미지 스케일링)
        let chains = 3 + trapLvl;
        let damage = this.player.atk * 1.0 * (1 + (trapLvl - 1) * 0.15);
        game.triggerChainLightning(this.x, this.y, hitMonster, chains, damage);
        
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
