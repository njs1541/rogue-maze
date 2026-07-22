// --------------------------------------------------------------------------
// 2. 파티클 이펙트 엔진 (Particle System)
// --------------------------------------------------------------------------
class Particle {
    constructor(x, y, color, size, vx, vy, life, type = 'spark') {
        this.x = x;
        this.y = y;
        this.startY = y; // [추가] 텍스트 튕김 물리를 위한 시작점 저장
        this.color = color;
        this.size = size;
        this.vx = vx;
        this.vy = vy;
        this.maxLife = life;
        this.life = life;
        this.type = type; // 'spark', 'dust', 'explosionRing', 'slashWave', 'trail'
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // 잔상(trail) 파티클은 감속을 거의 하지 않고 제자리에서 빠르게 소멸
        if (this.type === 'trail') {
            this.vx *= 0.98;
            this.vy *= 0.98;
        } else if (this.type === 'blackhole') {
            this.vx = 0;
            this.vy = 0;
        } else if (this.type === 'nebula') {
            this.vx *= 0.93;
            this.vy *= 0.93;
        } else if (this.type === 'text') {
            // [신규 물리] 데미지 텍스트 튕김 물리 시뮬레이션
            this.vy += 0.15; // 중력 가속
            // 스폰 기준 10px 아래를 가상 지면으로 판정하여 바운싱
            if (this.y > this.startY + 10) {
                this.y = this.startY + 10;
                this.vy = -this.vy * 0.45; // 튕김 탄성
                this.vx *= 0.75; // 마찰 감속
            }
        } else {
            // 일반 파티클은 마찰력으로 서서히 감속
            this.vx *= 0.95;
            this.vy *= 0.95;
        }
        
        this.life--;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    draw(ctx) {
        const isLowSpec = window.gameEngine && window.gameEngine.lowSpecMode;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.type === 'spark') {
            // [개선] 단순 원 대신 십자형(+) 전기 스파크 형태로 날카롭게 렌더링
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.8;
            if (!isLowSpec) {
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.color;
            }
            // 가로선
            ctx.moveTo(this.x - this.size * 1.5, this.y);
            ctx.lineTo(this.x + this.size * 1.5, this.y);
            // 세로선
            ctx.moveTo(this.x, this.y - this.size * 1.5);
            ctx.lineTo(this.x, this.y + this.size * 1.5);
            ctx.stroke();
        } else if (this.type === 'dust') {
            // 부드러운 연기/먼지 입자
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            if (!isLowSpec) {
                ctx.shadowBlur = 2;
                ctx.shadowColor = this.color;
            }
            ctx.fill();
        } else if (this.type === 'explosionRing') {
            // 폭발 충격파 링
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (1 - this.alpha * 0.8), 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3.5 * this.alpha;
            if (!isLowSpec) {
                ctx.shadowBlur = 18;
                ctx.shadowColor = this.color;
            }
            ctx.stroke();
        } else if (this.type === 'slashWave') {
            // [개선] 단순 원 대신 베기 각도에 맞춘 날카로운 초승달 형태 검기
            ctx.save();
            ctx.translate(this.x, this.y);
            let angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            
            ctx.beginPath();
            // 부채꼴 및 초승달 블렌딩 궤적
            ctx.arc(0, 0, this.size, -Math.PI / 2.8, Math.PI / 2.8);
            ctx.quadraticCurveTo(-this.size * 0.3, 0, Math.cos(-Math.PI / 2.8) * this.size, Math.sin(-Math.PI / 2.8) * this.size);
            ctx.closePath();
            
            ctx.fillStyle = this.color;
            if (!isLowSpec) {
                ctx.shadowBlur = 12;
                ctx.shadowColor = this.color;
            }
            ctx.fill();
            ctx.restore();
        } else if (this.type === 'trail') {
            // [신규] 유도탄이나 대시 뒤에 남는 네온 잔상 꼬리
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * this.alpha, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            if (!isLowSpec) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
            }
            ctx.fill();
        } else if (this.type === 'text') {
            // [신규] 텍스트 파편 렌더링 (그림자 및 테두리 효과 가미)
            ctx.font = "bold 13px 'Orbit', 'Inter', sans-serif";
            ctx.fillStyle = this.color;
            ctx.textAlign = 'center';
            if (!isLowSpec) {
                ctx.shadowBlur = 4;
                ctx.shadowColor = '#000000';
            }
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(this.text, this.x, this.y);
            ctx.fillText(this.text, this.x, this.y);
        } else if (this.type === 'blackhole') {
            // [W-09 조잡한 낫] 낫 베기 잔상 블랙홀 데칼
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (1.2 - this.alpha * 0.2), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(10, 5, 20, ${0.85 * this.alpha})`; // 검은 보랏빛 진한 중앙
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
            ctx.lineWidth = 2.0;
            if (!isLowSpec) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#8b5cf6'; // 외곽 보라색 네온 글로우
            }
            ctx.fill();
            ctx.stroke();

            // 중심 소용돌이선 데코
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.life * 0.08);
            ctx.strokeStyle = 'rgba(186, 85, 211, 0.3)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.2) {
                let r = this.size * 0.8 * (1.0 - (a / (Math.PI * 8)));
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.stroke();
            ctx.restore();
        } else if (this.type === 'nebula') {
            // [W-09 진화형] 보이드 디스트로이어 성운 입자
            ctx.beginPath();
            let rad = this.size * (0.8 + Math.sin(this.life * 0.05) * 0.2);
            ctx.arc(this.x, this.y, Math.max(0.5, rad), 0, Math.PI * 2);
            
            // 시안과 자홍 솜털 글로우 그라데이션
            let grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, Math.max(1, rad));
            grad.addColorStop(0, this.color);
            grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = grad;
            if (!isLowSpec) {
                ctx.shadowBlur = 6;
                ctx.shadowColor = this.color;
            }
            ctx.fill();
        } else if (this.type === 'rift_warning_ring') {
            // [신규] 바닥 네온 소환진 1.5초 예고 룬 렌더링
            let progress = 1 - (this.life / this.maxLife);
            if (window.TelegraphVFX) {
                window.TelegraphVFX.drawPulseWarningRing(ctx, this.x, this.y, this.size, progress, this.color);
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2.5;
                if (!isLowSpec) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = this.color;
                }
                ctx.stroke();

                let currentR = this.size * (1 - progress);
                if (currentR > 0) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, currentR, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.globalAlpha = 0.25 * progress;
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }
}
