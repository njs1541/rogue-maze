// --------------------------------------------------------------------------
// 12. 웹 브라우저 실행 스크립트 연결 및 UI/UX 바인딩 통합
// --------------------------------------------------------------------------
window.onload = () => {
    // 엔진 로드
    window.gameEngine = new GameEngine();
    
    // UI/UX 시스템 초기화 및 바인딩 가동
    initNeonGameUISystem();
};

// ==========================================================================
// 13. [신규 추가] 카드 도감(Codex) 및 실시간 랭킹 시스템 연동 바인딩
// ==========================================================================

// 카드 도감 데이터 정의
const CODEX_DATA = {
    weapon: [
        { name: "가시 (Thorns)", icon: "🌵", rarity: "rare", desc: "피격 시 입은 피해를 강력한 가시 충격파로 되돌려주고, 주변 적들을 정밀 타격합니다." },
        { name: "채찍 (Whip)", icon: "🪢", rarity: "rare", desc: "전방의 적을 사슬 채찍으로 낚아채 내 앞 지점으로 그랩하여 끌어당기고 마비시킵니다." },
        { name: "네온 총 (Neon Gun)", icon: "🔫", rarity: "common", desc: "빠른 연사력과 튕김(도탄) 궤적으로 전장을 어지럽히는 원거리 기본 화기입니다." },
        { name: "네온 검 (Neon Sword)", icon: "⚔️", rarity: "common", desc: "플레이어 주변 180도를 베어 넘기며 적의 탄막을 소멸시키는 근접 방어 화기입니다." },
        { name: "불마법 (Fire Magic)", icon: "🔥", rarity: "epic", desc: "폭발적이고 파괴적인 지속 화염을 폭사하여 적을 불태우는 고화력 스킬입니다." },
        { name: "얼음마법 (Ice Magic)", icon: "❄️", rarity: "epic", desc: "유도형 한파 고드름을 사출하여 적의 속도를 늦추고 완전히 얼려 정지시킵니다." },
        { name: "번개마법 (Lightning)", icon: "⚡", rarity: "epic", desc: "최초 타격 시 주변 수많은 적들에게 전류를 연쇄적으로 전이시키는 학살 마법입니다." },
        { name: "네온 창 (Neon Spear)", icon: "🔱", rarity: "rare", desc: "정밀 찌르기로 일직선상의 모든 적을 관통하고 벽 충돌 기절(Slam)을 연계합니다." },
        { name: "뇌신검 (Thunder Sword)", icon: "⚡", rarity: "legendary", desc: "[초월진화] 검 Lv.5 + 번개 Lv.5 합체. 휘두를 때마다 3갈래 연쇄 뇌전파를 방출합니다." },
        { name: "화염 산탄총 (Fire Shotgun)", icon: "💥", rarity: "legendary", desc: "[초월진화] 총 Lv.5 + 불마법 Lv.5 합체. 부채꼴 모양의 넓은 화염 스플래시 폭발탄을 사격합니다." }
    ],
    equipment: [
        { name: "방어 갑옷 (Armor)", icon: "🛡️", rarity: "common", desc: "최대 체력(HP)을 증가시킵니다. 5레벨 도발 필드, 10레벨 치명 피해 90% 면역 쉴드를 켭니다." },
        { name: "신속의 부츠 (Boots)", icon: "🥾", rarity: "common", desc: "최대 스태미너를 증가시킵니다. 5레벨 달리기 시 무적 대시, 10레벨 대시 스택 추가 해금." },
        { name: "공격의 장갑 (Gloves)", icon: "🧤", rarity: "common", desc: "공격 범위 및 사거리를 확장합니다. 5레벨 탄환 크기 확대, 10레벨 넉백 피해량 2배 적용." },
        { name: "지혜의 투구 (Helm)", icon: "🪖", rarity: "common", desc: "최대 마력(MP)을 상승시킵니다. 5레벨 20% 마나 프리 시전, 10레벨 마나 완충 시 피해 25% 증폭." },
        { name: "행운의 목걸이 (Necklace)", icon: "📿", rarity: "rare", desc: "행운(LUK) 스탯을 올려 보상 가치를 높이고, 10레벨 시 방 클리어 시 15% 코인 대박이 터집니다." },
        { name: "마력 반지 (Ring MP)", icon: "💍", rarity: "rare", desc: "초당 마력 자연 재생량을 올려줍니다. 5레벨 회피 시 마나 +5 획득, 10레벨 마나 자동 가속." },
        { name: "생명 반지 (Ring HP)", icon: "💍", rarity: "rare", desc: "초당 체력 자연 재생량을 높여줍니다. 5레벨 피격 시 +10 보복 힐, 10레벨 무사고 5초 시 힐 3배." },
        { name: "신속의 반지 (Ring Speed)", icon: "💍", rarity: "rare", desc: "캐릭터의 이동 속도를 올려줍니다. 5레벨 2초 질주 시 바람의 상처 아우라(+10% 힘)가 켜집니다." },
        { name: "공속의 반지 (Ring ASPD)", icon: "💍", rarity: "rare", desc: "공격 속도를 상승시킵니다. 5레벨 치명타 시 이속 30% 증가, 10레벨 정지 시 극 공속 50% 가속." },
        { name: "회피의 반지 (Ring EVD)", icon: "💍", rarity: "rare", desc: "회피율을 % 단위로 가산합니다. 5레벨 퍼펙트 회피 시 1초 무적, 10레벨 회피 한도 75% 돌파." }
    ],
    status: [
        { name: "공격 피해량 (ATK)", icon: "⚔️", rarity: "common", desc: "모든 일반 공격과 마법, 초월 기믹들의 기본 피해량 계수를 결정짓는 핵심 힘 스탯입니다." },
        { name: "공격 속도 (ASPD)", icon: "⚡", rarity: "common", desc: "탄환 사격 딜레이와 검 베기 속도를 끌어올려 단위 초당 누적 딜량을 극대화하는 지능 스탯입니다." },
        { name: "이동 및 대시 속도 (MOV)", icon: "🥾", rarity: "common", desc: "전장의 신속한 기동과 적 탄막 카이팅을 원활하게 도와주는 신속 이동력 능력치입니다." },
        { name: "회피 민첩성 (EVD)", icon: "💨", rarity: "rare", desc: "적 공격에 노출되어 피격 시, 일정 % 확률로 대미지를 무효화하고 반사 잔상을 남기는 민첩 스탯입니다." },
        { name: "보상 행운율 (LUK)", icon: "🍀", rarity: "rare", desc: "방 소탕 완료 보상 카드의 레어도 등장 비율을 향상시키고, 특수 기믹 발동 확률을 증가시킵니다." },
        { name: "체력 재생력 (REG)", icon: "🔋", rarity: "common", desc: "전투가 진행 중일 때, 캐릭터가 움직이지 않고 서 있으면 초당 자연 치유를 돕는 재생 스탯입니다." },
        { name: "탄환 사거리 (RNG)", icon: "🎯", rarity: "common", desc: "발사 탄환의 최대 사정 픽셀과 검 베기의 타격 각도/반경을 비례하여 늘려주는 범위 지수입니다." },
        { name: "디펜더 드론 (PET)", icon: "🤖", rarity: "epic", desc: "플레이어 주변을 공전하며 적 탄막을 소멸시키는 물리 방어막 역할을 하는 인공지능 호위 드론입니다." }
    ]
};

// 통합 UI/UX 시스템 초기화 및 바인딩
function initNeonGameUISystem() {
    try {
        console.log("⚡ Neon Rogue-Maze UI/UX 바인딩 시스템 가동...");

    const ge = window.gameEngine;
    if (!ge) return;

    // 1) 카드 도감 (Codex) 이벤트 바인딩
    const mainCodexBtn = document.getElementById('main-codex-btn');
    const optionCodexBtn = document.getElementById('option-codex-btn');
    const codexOverlay = document.getElementById('card-codex-overlay');
    const codexClose = document.getElementById('codex-modal-close');
    const codexCloseBtn = document.getElementById('codex-modal-close-btn');
    const codexTabs = document.querySelectorAll('.codex-tab-btn');
    const optionOverlay = document.getElementById('option-overlay');

    // 옵션 모달 활성화 중 도감을 열 때 상태 저장용 변수
    let wasOptionOpenBeforeCodex = false;

    // 도감 렌더링 함수
    const renderCodex = (tabType) => {
        const grid = document.getElementById('codex-grid');
        if (!grid) return;
        grid.innerHTML = ''; // 초기화

        const list = CODEX_DATA[tabType] || [];
        list.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = `reward-card ${card.rarity === 'legendary' ? 'card-legendary' : ''}`;
            
            // 전설 등급인 경우 추가 글로우 텍스쳐 스타일 연출
            let glowStyle = '';
            if (card.rarity === 'legendary') {
                glowStyle = 'background: radial-gradient(circle, rgba(176, 38, 255, 0.45) 0%, transparent 70%); border-color: #b026ff;';
            }

            cardEl.innerHTML = `
                <div class="card-glow" style="${glowStyle}"></div>
                <div class="card-inner" style="${card.rarity === 'legendary' ? 'border-color: #b026ff;' : ''}">
                    <span class="card-rarity ${card.rarity}" style="${card.rarity === 'legendary' ? 'background: rgba(176, 38, 255, 0.2); border-color: #b026ff; color: #b026ff;' : ''}">${card.rarity.toUpperCase()}</span>
                    <div class="card-icon" style="${card.rarity === 'legendary' ? 'color: #b026ff;' : ''}">${card.icon}</div>
                    <h3 class="card-title">${card.name}</h3>
                    <p class="card-desc" style="font-size: 0.85rem; line-height: 1.4; color: #a0aec0;">${card.desc}</p>
                </div>
            `;
            grid.appendChild(cardEl);
        });
    };

    // 도감 열기
    const openCodex = () => {
        Sound.play('powerup');
        
        // 만약 시스템 옵션 창이 열려 있는 상태라면
        if (optionOverlay && !optionOverlay.classList.contains('hidden')) {
            wasOptionOpenBeforeCodex = true;
            optionOverlay.classList.add('hidden'); // 잠시 숨겨서 겹침 방지
        } else {
            wasOptionOpenBeforeCodex = false;
        }

        if (codexOverlay) {
            codexOverlay.classList.remove('hidden');
        }
        
        // 기본 탭인 weapon 선택 및 렌더링
        codexTabs.forEach(btn => btn.classList.remove('active'));
        const defaultTabBtn = document.querySelector('.codex-tab-btn[data-tab="weapon"]');
        if (defaultTabBtn) defaultTabBtn.classList.add('active');
        
        renderCodex('weapon');
    };

    // 도감 닫기
    const closeCodex = () => {
        Sound.play('dodge');
        if (codexOverlay) {
            codexOverlay.classList.add('hidden');
        }

        // 도감 열기 전에 옵션 모달이 켜져 있었다면 다시 옵션 모달로 복귀
        if (wasOptionOpenBeforeCodex && optionOverlay) {
            optionOverlay.classList.remove('hidden');
        }
    };

    if (mainCodexBtn) mainCodexBtn.addEventListener('click', openCodex);
    if (optionCodexBtn) optionCodexBtn.addEventListener('click', openCodex);
    if (codexClose) codexClose.addEventListener('click', closeCodex);
    if (codexCloseBtn) codexCloseBtn.addEventListener('click', closeCodex);

    // 도감 탭 전환 바인딩
    codexTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            Sound.play('dodge');
            codexTabs.forEach(btn => btn.classList.remove('active'));
            tab.classList.add('active');
            const targetTab = tab.getAttribute('data-tab');
            renderCodex(targetTab);
        });
    });


    // 2) 실시간 랭킹 리더보드 (Leaderboard) 이벤트 바인딩
    // [중복 리팩토링] 리더보드 UI 이벤트 바인딩과 렌더링은 Game 클래스 내부(this.showLeaderboard 및 init() 내 바인딩)에서
    // 단일 진실 공급원(SSOT)으로 이미 아름답게 처리하고 있으므로, 하단에 중복 등록되어 있던 리스너 및 재정의된 렌더러를 
    // 완전히 청소하여 데이터 중복 노출(2회 렌더링) 현상을 완벽하게 예방합니다.


    // 3) 명예의 전당 랭킹 등록 (Rank Submit) 폼 바인딩
    // [중복 리팩토링] 랭킹 등록 제출(click) 이벤트는 Game 클래스 내부(this.submitRanking)에서 
    // 단일 진실 공급원(SSOT)으로 완벽하게 처리하므로, 하단의 중복 리스너 등록을 지워 
    // 동일 기록이 Firestore 및 로컬 저장소에 2회 중복 제출(더블 저장)되던 결함을 원천 해결합니다.
    const submitBtn = document.getElementById('submit-rank-btn');
    const nicknameInput = document.getElementById('rank-nickname');
    const feedbackMsg = document.getElementById('rank-feedback-msg');

    if (submitBtn && nicknameInput && feedbackMsg) {
        // 인게임 결과 화면 폼 리셋용 유틸리티 바인딩 (결과 화면에서 계속해서 폼 상태를 리셋할 때 사용)
        ge.resetRankingSubmitForm = () => {
            nicknameInput.value = '';
            nicknameInput.disabled = false;
            nicknameInput.style.borderColor = 'rgba(0, 240, 255, 0.4)';
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            feedbackMsg.classList.add('hidden');
            feedbackMsg.innerText = '';
        };
    }

    // 4) 기존 game.js 결과 오버레이 호출 시 랭킹 등록 폼 자동 리셋 훅 결합
    // triggerGameOver 와 triggerGameClear 메소드에 폼 리셋 훅을 결합합니다.
    const originalTriggerGameOver = ge.triggerGameOver;
    ge.triggerGameOver = function() {
        if (originalTriggerGameOver) {
            originalTriggerGameOver.apply(this, arguments);
        }
        if (ge.resetRankingSubmitForm) {
            ge.resetRankingSubmitForm();
        }
    };

    const originalTriggerGameClear = ge.triggerGameClear;
    ge.triggerGameClear = function() {
        if (originalTriggerGameClear) {
            originalTriggerGameClear.apply(this, arguments);
        }
        if (ge.resetRankingSubmitForm) {
            ge.resetRankingSubmitForm();
        }
    };
    } catch (err) {
        alert("🚨 UI 시스템 런타임 오류 감지!\n\n" + err.stack);
    }
}

