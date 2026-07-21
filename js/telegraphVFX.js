// --------------------------------------------------------------------------
// TelegraphVFX: 60FPS 경량 시각적 예고 및 전조 연출 전용 유틸리티 (Zero-GC Optimization)
// --------------------------------------------------------------------------
const TelegraphVFX = {
    /**
     * 1. 선형 조준 예고 (붉은 레이저 궤적)
     */
    drawLaserAimLine(ctx, startX, startY, targetX, targetY, opacity = 0.8, color = '#ff0055') {
        if (!ctx) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1.0, opacity));
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]); // 점선 레이저 연출
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        
        // 조준점 파티클/조준선 종점 링
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    },

    /**
     * 2. 범위/장판 예고 (바닥 네온 펄스 원형 링)
     */
    drawPulseWarningRing(ctx, x, y, radius, progress = 0.5, color = '#ff0055') {
        if (!ctx) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + progress * 0.5;

        // 외곽 경고 테두리
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 내부 수축/확장 펄스 링
        let currentR = radius * (1 - progress);
        if (currentR > 0) {
            ctx.beginPath();
            ctx.arc(x, y, currentR, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.15 * progress;
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * 3. 캐스팅 게이지 Bar (보스/특수 몬스터 머리 위 표시)
     */
    drawCastingBar(ctx, x, y, label, progress = 0, width = 60, color = '#00f0ff') {
        if (!ctx) return;
        ctx.save();
        let height = 6;
        let startX = x - width / 2;
        let startY = y - 35;

        // 배경 슬롯
        ctx.fillStyle = 'rgba(10, 14, 28, 0.8)';
        ctx.fillRect(startX, startY, width, height);

        // 게이지 채우기
        ctx.fillStyle = color;
        ctx.fillRect(startX, startY, width * Math.max(0, Math.min(1, progress)), height);

        // 테두리
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, startY, width, height);

        // 텍스트 라벨
        if (label) {
            ctx.font = 'bold 9px Orbitron, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, startY - 3);
        }

        ctx.restore();
    },

    /**
     * 4. 보스 페이즈 브레이크 QTE 노드 연출
     */
    drawBreakNode(ctx, x, y, radius = 10, isHit = false) {
        if (!ctx) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? 'rgba(0, 245, 212, 0.8)' : 'rgba(255, 0, 85, 0.8)';
        ctx.fill();

        ctx.strokeStyle = isHit ? '#00f5d4' : '#ff0055';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 십자 조준선
        ctx.beginPath();
        ctx.moveTo(x - radius - 3, y); ctx.lineTo(x + radius + 3, y);
        ctx.moveTo(x, y - radius - 3); ctx.lineTo(x, y + radius + 3);
        ctx.stroke();
        ctx.restore();
    }
};

window.TelegraphVFX = TelegraphVFX;
