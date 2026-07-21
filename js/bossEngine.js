// --------------------------------------------------------------------------
// BossEngine: 보스 4단계 페이즈, 무적/탄환소멸 & 브레이크 QTE 전용 하이브리드 모듈
// --------------------------------------------------------------------------

const BossEngine = {
    /**
     * 1. 화면 내 보스 적 탄환 및 장판 전면 소멸 연출
     */
    clearBossBullets(gameEngine) {
        if (!gameEngine) return;
        let clearedCount = 0;
        if (gameEngine.bullets && Array.isArray(gameEngine.bullets)) {
            let beforeLen = gameEngine.bullets.length;
            gameEngine.bullets = gameEngine.bullets.filter(b => !b.isEnemy);
            clearedCount = beforeLen - gameEngine.bullets.length;
        }

        if (gameEngine.player) {
            gameEngine.showFloatingText(
                "✨ BULLETS CLEARED! PHASE TRANSITION!",
                gameEngine.player.x,
                gameEngine.player.y - 40,
                '#00f0ff'
            );
        }
        return clearedCount;
    },

    /**
     * 2. 보스 체력 비율에 따른 4단계 페이즈 전환 검사
     */
    updateBossPhase(boss, gameEngine) {
        if (!boss || !boss.isBoss || boss.maxHp <= 0) return;
        if (!boss.phase) boss.phase = 1;
        
        let hpRatio = boss.hp / boss.maxHp;

        // P2 전환 (HP 60% 이하)
        if (hpRatio <= 0.60 && boss.phase === 1) {
            boss.phase = 2;
            boss.invulnerableTimer = 90; // 1.5초 무적
            this.clearBossBullets(gameEngine);
            if (gameEngine) {
                gameEngine.showFloatingText("⚠️ BOSS PHASE 2 ENTERED!", boss.x, boss.y - 50, '#ff007f');
            }
            this.spawnBreakNodes(boss);
        }
        // P3 전환 (HP 40% 이하 - 광폭화 오라)
        else if (hpRatio <= 0.40 && boss.phase === 2) {
            boss.phase = 3;
            boss.isFrenzyAura = true; // 광폭화 오라 가동
            boss.attackCooldownMult = 0.5; // 쿨다운 50% 차감
            if (gameEngine) {
                gameEngine.showFloatingText("🔥 FRENZY AURA ACTIVATED!", boss.x, boss.y - 50, '#ffb703');
            }
        }
        // P4 전환 (HP 30% 이하 - 궁극 페이즈)
        else if (hpRatio <= 0.30 && boss.phase === 3) {
            boss.phase = 4;
            boss.invulnerableTimer = 90; // 1.5초 무적
            this.clearBossBullets(gameEngine);
            if (gameEngine) {
                gameEngine.showFloatingText("🚨 ULTIMATE PHASE 4!", boss.x, boss.y - 50, '#ff0055');
            }
            this.spawnBreakNodes(boss);
        }

        // 무적 타이머 차감
        if (boss.invulnerableTimer > 0) {
            boss.invulnerableTimer--;
        }

        // QTE 브레이크 노드 타이머 차감
        if (boss.breakNodes && boss.breakNodes.length > 0) {
            boss.breakTimer = (boss.breakTimer || 90) - 1;
            if (boss.breakTimer <= 0) {
                boss.breakNodes = []; // 노드 소멸
            }
        }
    },

    /**
     * 3. 보스 페이즈 전환 시 브레이크 노드(Break Nodes) 3개 생성
     */
    spawnBreakNodes(boss) {
        boss.breakNodes = [];
        boss.breakTimer = 90; // 1.5초 제한시간
        let dist = (boss.radius || 25) + 35;
        let angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

        angles.forEach((angle, idx) => {
            boss.breakNodes.push({
                id: idx,
                offsetX: Math.cos(angle) * dist,
                offsetY: Math.sin(angle) * dist,
                hp: 1,
                isHit: false
            });
        });
    },

    /**
     * 4. 브레이크 노드 타격 검사 및 QTE 카운터 스턴 처리
     */
    hitBreakNode(boss, nodeIdx, gameEngine) {
        if (!boss.breakNodes || !boss.breakNodes[nodeIdx]) return;
        boss.breakNodes[nodeIdx].isHit = true;

        // 모든 노드가 파괴되었는지 검사
        let allHit = boss.breakNodes.every(n => n.isHit);
        if (allHit) {
            boss.breakNodes = [];
            boss.isStunned = true;
            boss.stunTimer = 180; // 3초 그로기 무력화 스턴!
            if (gameEngine) {
                gameEngine.showFloatingText("🎯 BOSS BREAK SUCCESS! 3s STUN!", boss.x, boss.y - 50, '#00f5d4');
            }
        }
    },

    /**
     * 5. 보스 VFX 렌더링 (광폭화 오라 & 무적 쉴드 연출)
     */
    drawBossEffects(ctx, boss) {
        if (!ctx || !boss) return;

        // 1) 무적 쉴드 링
        if (boss.invulnerableTimer > 0) {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.3;
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, (boss.radius || 25) + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 2) 광폭화 자색/불꽃 오라 (Phase 3+)
        if (boss.isFrenzyAura) {
            ctx.save();
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4;
            let auraR = (boss.radius || 25) + 12 + Math.sin(Date.now() / 150) * 4;
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, auraR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 3) 브레이크 노드 렌더링
        if (boss.breakNodes && boss.breakNodes.length > 0 && window.TelegraphVFX) {
            boss.breakNodes.forEach(node => {
                let nx = boss.x + node.offsetX;
                let ny = boss.y + node.offsetY;
                window.TelegraphVFX.drawBreakNode(ctx, nx, ny, 10, node.isHit);
            });
        }
    }
};

window.BossEngine = BossEngine;
