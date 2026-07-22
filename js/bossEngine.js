// --------------------------------------------------------------------------
// BossEngine: 보스 4단계 페이즈, 무적/탄환소멸 & 브레이크 QTE 전용 하이브리드 모듈 (Zero-Lag Optimized)
// --------------------------------------------------------------------------

const BossEngine = {
    /**
     * 1. 화면 내 보스 적 탄환 및 장판 전면 소멸 연출 (Zero-GC Optimization)
     */
    clearBossBullets(gameEngine) {
        if (!gameEngine || !gameEngine.bullets) return;
        let clearedCount = 0;
        
        // Zero-GC: 기존 배열 순회하며 인플레이스 제어
        for (let i = gameEngine.bullets.length - 1; i >= 0; i--) {
            let b = gameEngine.bullets[i];
            if (!b.isPlayerBullet) {
                clearedCount++;
                if (gameEngine.particles && Math.random() < 0.3) {
                    gameEngine.particles.push(new Particle(b.x, b.y, '#00f0ff', 2, 0, 0, 10, 'spark'));
                }
                gameEngine.bullets.splice(i, 1);
            }
        }

        if (gameEngine.showFloatingText && gameEngine.player && clearedCount > 0) {
            gameEngine.showFloatingText("✨ ALL ENEMY BULLETS CLEARED!", gameEngine.player.x, gameEngine.player.y - 45, '#00f0ff');
            Sound.play('powerup');
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
        if (hpRatio <= 0.605 && boss.phase < 2) {
            boss.phase = 2;
            boss.invulnerableTimer = 270; // 4.5초 제자리 무적 충전
            this.clearBossBullets(gameEngine);
            this.triggerPhaseEffects(boss, gameEngine, 2, "PHASE 2: OVERCHARGED EVOLUTION!", "보스 무적 충전 중 - 4.5초 이내 3개 브레이크 노드를 사격하세요!", '⚡', '#ff007f');
            this.spawnBreakNodes(boss);
        }
        // P3 전환 (HP 40% 이하 - 광폭화 오라)
        else if (hpRatio <= 0.405 && boss.phase < 3) {
            boss.phase = 3;
            boss.isFrenzyAura = true; // 광폭화 오라 가동
            boss.attackCooldownMult = 0.5; // 쿨다운 50% 차감
            this.triggerPhaseEffects(boss, gameEngine, 3, "PHASE 3: FRENZY NEON RAGE!", "보스가 광폭화 오라를 둘렀습니다! 스킬 연사가 시작됩니다!", '🔥', '#ffb703');
        }
        // P4 전환 (HP 30% 이하 - 궁극 페이즈)
        else if (hpRatio <= 0.305 && boss.phase < 4) {
            boss.phase = 4;
            boss.invulnerableTimer = 270; // 4.5초 제자리 무적 충전
            this.clearBossBullets(gameEngine);
            this.triggerPhaseEffects(boss, gameEngine, 4, "PHASE 4: ULTIMATE OVERDRIVE!", "보스의 최후 궁극 오버드라이브 발동! 노드를 파괴해 스턴시키세요!", '🚨', '#ff0055');
            this.spawnBreakNodes(boss);
        }

        // QTE 브레이크 노드 타이머 차감 (270프레임 = 4.5초 제한시간)
        if (boss.breakNodes && boss.breakNodes.length > 0) {
            boss.breakTimer = (boss.breakTimer || 270) - 1;
            if (boss.breakTimer <= 0) {
                boss.breakNodes = []; // 시간 초과 노드 소멸
            }
        }
    },

    /**
     * 페이즈 전환 이펙트 & 충격파 파티클 컷인 & 상단 알림 배너 (Zero-Lag Optimized)
     */
    triggerPhaseEffects(boss, gameEngine, phaseNum, titleText, subtitleText, icon, colorHex) {
        if (!gameEngine) return;

        // 1. 상단 네온 알림 배너 3.2초간 노출
        if (gameEngine.triggerNeonAlertBanner) {
            gameEngine.triggerNeonAlertBanner(titleText, subtitleText, icon, colorHex, 3200);
        }
        if (gameEngine.showFloatingText) {
            gameEngine.showFloatingText(titleText, boss.x, boss.y - 65, colorHex);
        }

        // 2. 화면 충격파 및 경량 6프레임 컷인 (0.1초 - 스터터링 렉 해소)
        gameEngine.shakeScreen(14, 3.5);
        if (gameEngine.triggerHitStop) {
            gameEngine.triggerHitStop(6);
        }
        Sound.play('explosion');

        // 3. 사방 12개 초경량 파티클 분사 (배열 과부하 방지)
        if (gameEngine.particles) {
            gameEngine.particles.push(new Particle(boss.x, boss.y, colorHex, 130, 0, 0, 24, 'explosionRing'));
            for (let k = 0; k < 12; k++) {
                let angle = (Math.PI * 2 / 12) * k;
                let spd = 4.5;
                gameEngine.particles.push(new Particle(boss.x, boss.y, colorHex, 2.5, Math.cos(angle) * spd, Math.sin(angle) * spd, 22, 'spark'));
            }
        }
    },

    /**
     * 3. 보스 페이즈 전환 시 브레이크 노드(Break Nodes) 3개 생성
     */
    spawnBreakNodes(boss) {
        boss.breakNodes = [];
        boss.breakTimer = 270; // 4.5초 여유있는 공략 제한시간
        let dist = (boss.radius || 35) + 45; // 클릭/사격이 쾌적하도록 반경 확장
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
        if (boss.breakNodes[nodeIdx].isHit) return;

        boss.breakNodes[nodeIdx].isHit = true;
        Sound.play('hit');

        // 모든 노드가 파괴되었는지 검사
        let allHit = boss.breakNodes.every(n => n.isHit);
        if (allHit) {
            boss.breakNodes = [];
            boss.isStunned = true;
            boss.stunTimer = 180; // 3초 그로기 무력화 스턴!
            boss.invulnerableTimer = 0; // 무적 즉시 해제!
            if (gameEngine) {
                if (gameEngine.triggerNeonAlertBanner) {
                    gameEngine.triggerNeonAlertBanner("🎯 BOSS BREAK SUCCESS!", "보스가 3초간 무력화 그로기 스턴 상태에 빠집니다!", "💥", "#00f5d4", 2800);
                }
                gameEngine.showFloatingText("🎯 BOSS BREAK SUCCESS! 3s STUN!", boss.x, boss.y - 50, '#00f5d4');
                Sound.play('victory');
                gameEngine.shakeScreen(15, 3.5);
                if (gameEngine.triggerHitStop) {
                    gameEngine.triggerHitStop(6);
                }
                if (gameEngine.particles) {
                    gameEngine.particles.push(new Particle(boss.x, boss.y, '#00f5d4', 110, 0, 0, 20, 'explosionRing'));
                }
            }
        }
    },

    /**
     * 5. 보스 VFX 렌더링 (monster.js draw(ctx) 내부의 로컬 중심 좌표 0,0 기준)
     */
    drawBossEffects(ctx, boss) {
        if (!ctx || !boss) return;

        // 1) 무적 쉴드 링 (로컬 0,0 중심)
        if (boss.invulnerableTimer > 0) {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 4.0;
            ctx.globalAlpha = 0.75 + Math.sin(Date.now() / 80) * 0.25;
            ctx.shadowBlur = 22;
            ctx.shadowColor = '#00f0ff';
            ctx.beginPath();
            ctx.arc(0, 0, (boss.radius || 30) + 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 2) 광폭화 자색/불꽃 오라 (Phase 3+) (로컬 0,0 중심)
        if (boss.isFrenzyAura || (boss.phase && boss.phase >= 3)) {
            ctx.save();
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 3.0;
            ctx.globalAlpha = 0.65 + Math.sin(Date.now() / 100) * 0.25;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff007f';
            let auraR = (boss.radius || 30) + 18 + Math.sin(Date.now() / 120) * 6;
            ctx.beginPath();
            ctx.arc(0, 0, auraR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 3) 브레이크 QTE 노드 렌더링 (로컬 offsetX, offsetY 중심)
        if (boss.breakNodes && boss.breakNodes.length > 0 && window.TelegraphVFX) {
            boss.breakNodes.forEach(node => {
                window.TelegraphVFX.drawBreakNode(ctx, node.offsetX, node.offsetY, 14, node.isHit);
            });
        }
    }
};

window.BossEngine = BossEngine;
