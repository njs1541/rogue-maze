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
        { name: "행운의 목걸이 (Necklace)", icon: "📿", rarity: "rare", desc: "행운(LUK) 스탯을 올려 보상 가치를 높이고, 10레벨 시 방 클리어 시 15% 📀 대박이 터집니다." },
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

// 몬스터 도감 데이터 정의
const BESTIARY_DATA = [
    {
        id: "normal",
        name: "일반 몬스터 (Normal)",
        type: "normal",
        icon: "🔴",
        color: "#ff0055",
        desc: "미로의 기본적인 침입자입니다. 아무런 특수 기믹은 없지만, 무리를 지어 플레이어의 위치를 향해 끊임없이 돌진합니다. 기본기에 충실한 카이팅으로 거리를 유지하며 처치하는 것이 바람직합니다.",
        hp: "15 ~ (층 비례 인플레이션)",
        atk: "5 ~ (층 비례 인플레이션)",
        speed: "1.2 ~ 2.2 (방 번호에 따라 점진적 증가)",
        tier: "방 1부터 출현",
        ability: "기본 플레이어 추적"
    },
    {
        id: "chaser",
        name: "돌격형 몬스터 (Chaser)",
        type: "chaser",
        icon: "🔸",
        color: "#ffaa00",
        desc: "날렵한 화살촉 형태를 띤 몬스터입니다. 속도가 40% 빠르고 체력이 25% 낮은 대신, 2~3초마다 플레이어를 조준하고 폭발적인 네온 불꽃을 뿜으며 돌진 대시(Dash) 공격을 시도합니다. 대시 타이밍에 맞춰 피하는 회피 컨트롤이 핵심입니다.",
        hp: "일반 몬스터 대비 75% 수준",
        atk: "5 ~ (돌격 시 피격 주의)",
        speed: "1.68 ~ 3.08 (대시 시 순간 돌발 가속)",
        tier: "방 6부터 출현 (낮은 확률로 방 5 이하)",
        ability: "주기적인 플레이어 방향 대시 돌진"
    },
    {
        id: "shooter",
        name: "원거리 몬스터 (Shooter)",
        type: "shooter",
        icon: "🔷",
        color: "#b026ff",
        desc: "보라색 육각형 실드로 전신을 감싼 원거리 사격형 몬스터입니다. 플레이어와 일정한 안전 거리를 유지하며, 사격 게이지가 완충되면 보라색 구체 탄환을 발사합니다. 플레이어가 다가오면 도망치는 지능적인 무빙을 보여줍니다.",
        hp: "일반 몬스터 대비 120% 수준",
        atk: "3.5 ~ (원거리 보라색 탄환)",
        speed: "0.96 ~ 1.76 (좌우 회전 회피 무빙)",
        tier: "방 11부터 출현 (낮은 확률로 방 10 이하)",
        ability: "거리 유지 카이팅, 보라색 직진 탄환 사격"
    },
    {
        id: "elite",
        name: "엘리트 몬스터 (Elite)",
        type: "elite",
        icon: "🟢",
        color: "#39ff14",
        desc: "미로의 방에 랜덤하게 잠입한 거대 정예 몬스터입니다. 온몸이 네온 초록색으로 격렬하게 진동하며, 크기가 1.5배로 커지고 최대 체력 3배, 공격력 2배가 적용되어 매우 강력합니다. 처치 시 일반 몬스터의 5배에 달하는 리스크 보상을 제공합니다.",
        hp: "일반/추격/사격 몬스터의 3배",
        atk: "해당 개체 기본 공격력의 2배",
        speed: "기본 타입 속도와 동일",
        tier: "모든 방에서 낮은 확률로 난입",
        ability: "3배 체력, 1.5배 크기, 2배 위력, 처치 점수 5배 기여"
    },
    {
        id: "boss",
        name: "보스 몬스터 (Boss)",
        type: "boss",
        icon: "👑",
        color: "#ff3300",
        desc: "미로의 매 5층(5의 배수 방)마다 입구를 지키고 서 있는 대형 수호자입니다. 본체 바깥에 시계 방향으로 돌아가는 점선 링과 반시계 방향으로 돌아가는 8각 톱니 링을 가동하며, 플레이어를 천천히 압박하면서 광역으로 3방향 부채꼴 탄막을 연사합니다.",
        hp: "100 + 방 번호 * 12 (층 비례 인플레이션)",
        atk: "15 + 방 번호 * 0.8",
        speed: "1.0 + 층 비례 속도 상승",
        tier: "매 5의 배수 방 (5, 10, 15... 100층 최종 보스)",
        ability: "이중 역회전 톱니 링 전개, 3방향 부채꼴 탄막 광역 연사"
    }
];

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

    // 1-2) 몬스터 도감 (Bestiary) 이벤트 바인딩
    const mainMonsterBtn = document.getElementById('main-monster-btn');
    const optionMonsterBtn = document.getElementById('option-monster-btn');
    const bestiaryOverlay = document.getElementById('monster-bestiary-overlay');
    const bestiaryClose = document.getElementById('bestiary-modal-close');
    const bestiaryCloseBtn = document.getElementById('bestiary-modal-close-btn');

    let wasOptionOpenBeforeBestiary = false;
    let bestiaryCanvas = document.getElementById('bestiary-monster-canvas');
    let bestiaryCtx = bestiaryCanvas ? bestiaryCanvas.getContext('2d') : null;
    let previewMonster = null;
    let previewAnimationFrameId = null;

    // 실시간 몬스터 렌더링 루프
    const startMonsterPreview = (monsterType) => {
        if (!bestiaryCtx) return;
        if (previewAnimationFrameId) {
            cancelAnimationFrame(previewAnimationFrameId);
        }

        if (typeof Monster === 'undefined') {
            console.error("Monster class is not loaded yet.");
            return;
        }

        let tier = 1;
        if (monsterType === 'boss') tier = 5;
        // x, y, tier, roomNum
        previewMonster = new Monster(55, 55, tier, 1);

        if (monsterType === 'elite') {
            previewMonster.makeElite();
            previewMonster.radius = 22; // 110x110 캔버스에 알맞게 크기 보정
        } else if (monsterType === 'boss') {
            previewMonster.makeBoss(5);
            previewMonster.radius = 28; // 110x110 캔버스에 알맞게 크기 보정
        } else {
            previewMonster.type = monsterType;
            previewMonster.radius = 16;
            // 타입별 색상 고정
            if (monsterType === 'chaser') {
                previewMonster.color = '#ffaa00';
                previewMonster.glowColor = '#ffaa00';
            } else if (monsterType === 'shooter') {
                previewMonster.color = '#b026ff';
                previewMonster.glowColor = '#b026ff';
            } else {
                previewMonster.color = '#ff0055';
                previewMonster.glowColor = '#ff0055';
            }
        }

        const loop = () => {
            if (!bestiaryCtx) return;
            bestiaryCtx.clearRect(0, 0, 110, 110);

            // 미니 사이버펑크 격자 배경 그리기
            bestiaryCtx.fillStyle = '#05060c';
            bestiaryCtx.fillRect(0, 0, 110, 110);

            bestiaryCtx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
            bestiaryCtx.lineWidth = 1;
            for (let i = 15; i < 110; i += 15) {
                bestiaryCtx.beginPath();
                bestiaryCtx.moveTo(i, 0);
                bestiaryCtx.lineTo(i, 110);
                bestiaryCtx.stroke();
                bestiaryCtx.beginPath();
                bestiaryCtx.moveTo(0, i);
                bestiaryCtx.lineTo(110, i);
                bestiaryCtx.stroke();
            }

            if (previewMonster) {
                // 회전 각도 시뮬레이션
                if (!previewMonster.angle) previewMonster.angle = 0;
                previewMonster.angle += 0.02;

                // Shooter 충전 연출용 shootCooldown 강제 차감 루프
                if (previewMonster.type === 'shooter') {
                    if (previewMonster.shootCooldown === undefined || previewMonster.shootCooldown <= 0) {
                        previewMonster.shootCooldown = 100;
                    }
                    previewMonster.shootCooldown -= 0.5;
                }

                // 몬스터 렌더링
                previewMonster.draw(bestiaryCtx);
            }

            previewAnimationFrameId = requestAnimationFrame(loop);
        };

        loop();
    };

    // 도감 상세정보 렌더링
    const renderBestiaryDetail = (monster) => {
        const detailEmpty = document.getElementById('bestiary-detail-empty');
        const detailContent = document.getElementById('bestiary-detail-content');
        if (!detailEmpty || !detailContent) return;

        detailEmpty.classList.add('hidden');
        detailContent.classList.remove('hidden');

        document.getElementById('bestiary-monster-name').innerText = monster.name;
        document.getElementById('bestiary-monster-tier').innerText = `등급: ${monster.tier}`;
        document.getElementById('bestiary-monster-ability').innerText = `특징: ${monster.ability}`;
        document.getElementById('bestiary-monster-desc').innerText = monster.desc;
        
        document.getElementById('bestiary-monster-hp').innerText = monster.hp;
        document.getElementById('bestiary-monster-atk').innerText = monster.atk;
        document.getElementById('bestiary-monster-speed').innerText = monster.speed;

        // 실시간 프리뷰 캔버스 시작
        startMonsterPreview(monster.type);
    };

    // 도감 리스트 렌더링
    const renderBestiaryList = () => {
        const listDiv = document.getElementById('bestiary-list');
        if (!listDiv) return;

        listDiv.innerHTML = '';
        BESTIARY_DATA.forEach(monster => {
            const btn = document.createElement('button');
            btn.className = 'bestiary-item-btn';
            btn.innerHTML = `
                <span class="icon">${monster.icon}</span>
                <span class="name" style="color: ${monster.color};">${monster.name.split(' ')[0]}</span>
            `;
            btn.addEventListener('click', () => {
                // 기존 active 제거
                const activeBtn = listDiv.querySelector('.bestiary-item-btn.active');
                if (activeBtn) activeBtn.classList.remove('active');
                btn.classList.add('active');

                Sound.play('dodge');
                renderBestiaryDetail(monster);
            });
            listDiv.appendChild(btn);
        });
    };

    const openBestiary = () => {
        Sound.play('powerup');
        if (optionOverlay && !optionOverlay.classList.contains('hidden')) {
            wasOptionOpenBeforeBestiary = true;
            optionOverlay.classList.add('hidden');
        } else {
            wasOptionOpenBeforeBestiary = false;
        }

        if (bestiaryOverlay) {
            bestiaryOverlay.classList.remove('hidden');
        }

        // 리스트 렌더링
        renderBestiaryList();

        // 디테일 초기화
        const detailEmpty = document.getElementById('bestiary-detail-empty');
        const detailContent = document.getElementById('bestiary-detail-content');
        if (detailEmpty && detailContent) {
            detailEmpty.classList.remove('hidden');
            detailContent.classList.add('hidden');
        }

        if (previewAnimationFrameId) {
            cancelAnimationFrame(previewAnimationFrameId);
            previewAnimationFrameId = null;
        }
    };

    const closeBestiary = () => {
        Sound.play('dodge');
        if (bestiaryOverlay) {
            bestiaryOverlay.classList.add('hidden');
        }
        if (wasOptionOpenBeforeBestiary && optionOverlay) {
            optionOverlay.classList.remove('hidden');
        }
        if (previewAnimationFrameId) {
            cancelAnimationFrame(previewAnimationFrameId);
            previewAnimationFrameId = null;
        }
    };

    if (mainMonsterBtn) mainMonsterBtn.addEventListener('click', openBestiary);
    if (optionMonsterBtn) optionMonsterBtn.addEventListener('click', openBestiary);
    if (bestiaryClose) bestiaryClose.addEventListener('click', closeBestiary);
    if (bestiaryCloseBtn) bestiaryCloseBtn.addEventListener('click', closeBestiary);


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

