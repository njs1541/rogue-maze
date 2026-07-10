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
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.type === 'spark') {
            // [개선] 단순 원 대신 십자형(+) 전기 스파크 형태로 날카롭게 렌더링
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.8;
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
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
            ctx.shadowBlur = 2;
            ctx.shadowColor = this.color;
            ctx.fill();
        } else if (this.type === 'explosionRing') {
            // 폭발 충격파 링
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (1 - this.alpha * 0.8), 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3.5 * this.alpha;
            ctx.shadowBlur = 18;
            ctx.shadowColor = this.color;
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
            ctx.shadowBlur = 12;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.restore();
        } else if (this.type === 'trail') {
            // [신규] 유도탄이나 대시 뒤에 남는 네온 잔상 꼬리
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * this.alpha, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fill();
        } else if (this.type === 'text') {
            // [신규] 텍스트 파편 렌더링 (그림자 및 테두리 효과 가미)
            ctx.font = "bold 13px 'Orbit', 'Inter', sans-serif";
            ctx.fillStyle = this.color;
            ctx.textAlign = 'center';
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#000000';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(this.text, this.x, this.y);
            ctx.fillText(this.text, this.x, this.y);
        }

        ctx.restore();
    }
}
