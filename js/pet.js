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
            if (b.active && !b.isPlayerBullet) {
                let dist = Math.hypot(this.x - b.x, this.y - b.y);
                if (dist < this.radius + b.radius) {
                    // 탄환 제거 예약 (active = false 및 life = 0 처리로 배열 안전 보장)
                    b.active = false;
                    b.life = 0;
                    
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
                // 펫의 발사 공격력: 플레이어 힘(ATK) 스탯의 25% 비례 보정 (드론 강화 연계 배율 연동)
                let petAtk = Math.max(2.0, player.atk * 0.25) * (player.petDmgUpgrade || 1.0);
                let targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
                let fireSpeed = 5.0;
                let vx = Math.cos(targetAngle) * fireSpeed;
                let vy = Math.sin(targetAngle) * fireSpeed;

                // 유도 레이저 사출
                bullets.push(new Bullet(this.x, this.y, vx, vy, petAtk, true, {
                    homing: true,
                    homingSpeed: player.homingAngleSpeed, // 펫 탄환도 유도 강화 연동
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
