// [신규] 치명적 런타임 오류 및 비동기 거부(Promise Rejection) 감지 디버그 핸들러
(function registerFatalErrorHandler() {
    function showGlobalErrorOverlay(title, message, stack) {
        const overlay = document.getElementById('error-overlay');
        const detailsText = document.getElementById('error-details-text');
        const copyBtn = document.getElementById('error-copy-btn');
        const refreshBtn = document.getElementById('error-refresh-btn');
        const closeBtn = document.getElementById('error-close-btn');

        if (!overlay || !detailsText) {
            console.error("FATAL ERROR (Overlay UI Missing):", title, message, stack);
            return;
        }

        const formattedError = `[ERROR TYPE]: ${title}\n[MESSAGE]: ${message}\n\n[STACK TRACE]:\n${stack || 'No stack trace available.'}`;
        detailsText.innerText = formattedError;
        overlay.classList.remove('hidden');

        // 복사 버튼 기능 바인딩
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(formattedError).then(() => {
                copyBtn.innerText = "📋 복사 완료!";
                copyBtn.style.borderColor = "#39ff14";
                copyBtn.style.color = "#39ff14";
                setTimeout(() => {
                    copyBtn.innerText = "📋 오류 복사";
                    copyBtn.style.borderColor = "#00f0ff";
                    copyBtn.style.color = "#00f0ff";
                }, 2000);
            }).catch(err => {
                console.error("클립보드 복사 실패:", err);
            });
        };

        // 새로고침 버튼 기능 바인딩
        refreshBtn.onclick = (e) => {
            e.stopPropagation();
            window.location.reload();
        };

        // 닫기 버튼 기능 바인딩
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.classList.add('hidden');
        };
    }

    // 일반 런타임 에러 감시
    window.addEventListener('error', function (event) {
        let title = "Runtime Exception";
        let message = "Unknown execution error";
        let stack = "";

        const filename = event.filename ? event.filename.split('/').pop() : 'inline';
        const line = event.lineno || 0;
        const col = event.colno || 0;

        // CORS/외부 스크립트 보안 제약으로 인한 에러 메시지 은닉 감지 (Script error.)
        if (event.message === "Script error." || (!event.filename && event.lineno === 0)) {
            title = "CORS Script Error (보안 정책)";
            message = "외부 CDN 스크립트 또는 로컬 파일(file://) 보안 제한으로 인해 상세 에러 메시지가 차단되었습니다.\n\n" +
                      "👉 해결 방법:\n" +
                      "1. HTML에서 외부 스크립트 로드 시 crossorigin=\"anonymous\" 속성이 필요합니다.\n" +
                      "2. 로컬 파일(file://)로 직접 여는 대신 로컬 웹서버(start_server.ps1)를 구동하여 접속해 주세요.";
            stack = `at ${event.filename || 'external-script'}:${line}:${col}`;
        } else {
            const error = event.error;
            if (error instanceof Error) {
                title = error.name || "Runtime Exception";
                message = error.message || event.message || "Unknown execution error";
                stack = error.stack || `at ${event.filename || 'unknown'}:${line}:${col}`;
            } else if (typeof error === 'string') {
                message = error;
                stack = `at ${event.filename || 'unknown'}:${line}:${col}`;
            } else if (error && typeof error === 'object') {
                title = error.name || "Runtime Exception Object";
                message = error.message || JSON.stringify(error);
                stack = error.stack || `at ${event.filename || 'unknown'}:${line}:${col}`;
            } else {
                message = event.message || "Unknown execution error";
                stack = `at ${event.filename || 'external-script'}:${line}:${col}`;
            }
        }

        showGlobalErrorOverlay(title, `${message} (${filename}:${line}행)`, stack);
    });

    // 비동기 Promise 에러 감시
    window.addEventListener('unhandledrejection', function (event) {
        let title = "Unhandled Promise Rejection";
        let message = "Asynchronous promise rejected without catch";
        let stack = "No async stack trace available.";

        const reason = event.reason;
        if (reason instanceof Error) {
            title = reason.name || "Unhandled Promise Rejection";
            message = reason.message || "Asynchronous promise rejected without catch";
            stack = reason.stack || "No async stack trace available.";
        } else if (typeof reason === 'string') {
            message = reason;
        } else if (reason && typeof reason === 'object') {
            // Firebase Error 등 커스텀 에러 객체 완벽 캡처
            title = reason.code || reason.name || "Promise Rejection Object";
            message = reason.message || JSON.stringify(reason);
            stack = reason.stack || "No async stack trace available.";
        } else if (reason !== undefined && reason !== null) {
            message = String(reason);
        }

        showGlobalErrorOverlay(title, message, stack);
    });

    // 디버그 수동 트리거용 Shift 키 단축키 (콘솔 및 수동 에러 연출)
    window.addEventListener('keydown', function(e) {
        if (e.shiftKey && e.key === 'F8') {
            console.warn("[디버그] Shift+F8 입력: 가상 테스트 동기식 런타임 오류를 발생시킵니다.");
            throw new Error("[TEST] 사용자에 의해 트리거된 디버그용 가상 시스템 예외입니다!");
        }
        if (e.shiftKey && e.key === 'F9') {
            console.warn("[디버그] Shift+F9 입력: 가상 테스트 비동기 Promise 예외를 발생시킵니다.");
            Promise.reject(new Error("[TEST] 비동기 프로미스 거부 테스트 예외입니다!"));
        }
    });
})();

window.onload = async () => {
    console.log("게임 초기화 시작...");
    
    // 1. 그래픽 에셋 매니저 사전 로드 (실패해도 네온 가동 인프라 확보)
    if (window.AssetManager) {
        await window.AssetManager.init();
    }

    // 2. 엔진 로드
    window.gameEngine = new GameEngine();
    
    // UI/UX 시스템 초기화 및 바인딩 가동
    initNeonGameUISystem();

    // 3. [신규 추가] 방향키 연동 캐릭터 걷기 애니메이션 데모 가동
    if (window.KeyboardWalkCharacter) {
        window.keyboardWalkCharacter = new KeyboardWalkCharacter();
    }

    // 4. [보안/자가진단] 실시간 캔버스 가시성 및 활성 오버레이 콘솔 감시 도구 가동
    setInterval(() => {
        if (!window.gameEngine) return;
        const activeOverlays = [];
        const overlays = [
            'start-overlay', 'reward-overlay', 'result-overlay',
            'card-detail-overlay', 'shop-confirm-overlay',
            'secret-shop-overlay', 'cheat-overlay', 'option-overlay', 'in-game-status-overlay',
            'tutorial-overlay', 'monster-bestiary-overlay', 'card-codex-overlay', 'ranking-modal-overlay',
            'crafting-overlay', 'story-dialogue-overlay'
        ];
        overlays.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden')) {
                activeOverlays.push(`${id} (Z-Index: ${window.getComputedStyle(el).zIndex})`);
            }
        });

        const container = document.getElementById('game-container');
        const containerVis = container ? `Disp: ${window.getComputedStyle(container).display}, Vis: ${window.getComputedStyle(container).visibility}, Opacity: ${window.getComputedStyle(container).opacity}` : 'MISSING';

        const canvasContainer = document.getElementById('canvas-container');
        const canvasContVis = canvasContainer ? `Disp: ${window.getComputedStyle(canvasContainer).display}, Vis: ${window.getComputedStyle(canvasContainer).visibility}, Opacity: ${window.getComputedStyle(canvasContainer).opacity}` : 'MISSING';

        const canvas = document.getElementById('game-canvas');
        const canvasVis = canvas ? `Size: ${canvas.width}x${canvas.height}, Display: ${window.getComputedStyle(canvas).display}, Vis: ${window.getComputedStyle(canvas).visibility}, Opacity: ${window.getComputedStyle(canvas).opacity}` : 'MISSING';
        
        console.log(`[자가진단] 활성 오버레이: [${activeOverlays.join(', ') || '없음'}], GameContainer: [${containerVis}], CanvasContainer: [${canvasContVis}], Canvas: [${canvasVis}], 대화방: [Active=${window.gameEngine.isDialogueActive}, Playing=${window.gameEngine.isPlaying}]`);
    }, 1500); // 1.5초 주기로 콘솔 자동 진단 출력
};

// ==========================================================================
// 13. [신규 추가] 카드 도감(Codex) 및 실시간 랭킹 시스템 연동 바인딩
// ==========================================================================

// 카드 도감 데이터 정의
const CODEX_DATA = {
    weapon: [
        // 1차 조잡한 무기군
        { name: "조잡한 검 (Crude Sword)", icon: "🪓", rarity: "common", desc: "짧은 막대기와 칼날을 조합. 플레이어 전방을 넓게 휘두르며 적의 투사체를 파괴합니다." },
        { name: "조잡한 창 (Crude Spear)", icon: "🔱", rarity: "common", desc: "긴 막대기와 칼날을 조합. 정밀 관통 찌르기로 적들을 꿰뚫고 기절을 연계합니다." },
        { name: "조잡한 채찍 (Crude Whip)", icon: "🧣", rarity: "common", desc: "전선과 긴 막대기를 조합. 전방의 적들을 S자 형태로 후려치며 감속시킵니다." },
        { name: "조잡한 전기 충격기 (Crude Shock)", icon: "🔌", rarity: "common", desc: "전선과 배터리, 짧은 막대기를 조합. 전류를 방출해 근접한 적들을 마비시킵니다." },
        { name: "조잡한 화염방사기 (Crude Flamethrower)", icon: "🔥", rarity: "common", desc: "고장난 화방과 배터리, 짧은 막대기 조합. 전방에 불안정한 지속 불꽃을 발사합니다." },
        { name: "조잡한 냉각총 (Crude Cryo)", icon: "❄️", rarity: "common", desc: "과냉각기와 배터리, 짧은 막대기 조합. 냉기를 뿜어 적들을 둔화하고 빙결시킵니다." },
        { name: "조잡한 가시갑옷 (Crude Thorns)", icon: "🌵", rarity: "common", desc: "넓은 판과 칼날을 조합. 피격 시 충격파 반사를 유발하는 보호용 외골격 갑옷입니다." },
        { name: "조잡한 덫 (Crude Trap)", icon: "⚙️", rarity: "common", desc: "넓은 판과 배터리, 전선 조합. 바닥에 근접 감지 함정을 배치하여 광역 스네어를 겁니다." },
        { name: "조잡한 낫 (Crude Scythe)", icon: "⛏️", rarity: "common", desc: "긴 막대기와 넓은 판, 칼날 조합. 플레이어 주변을 회전하며 적들을 쓸어버리는 회전 낫입니다." },
        { name: "조잡한 레일건 (Crude Railgun)", icon: "📡", rarity: "common", desc: "배터리와 전선, 넓은 판 조합. 에너지를 모아 전방을 길게 꿰뚫는 관통 레이저를 발사합니다." },
        
        // 2차 진화형 하이테크 무기군
        { name: "플라즈마 세이버 (Plasma Saber)", icon: "🗡️", rarity: "legendary", desc: "조잡한 검에서 진화. 고농축 에너지가 흐르는 초발광 네온 광선검으로 적을 일도양단합니다." },
        { name: "에너지 파일벙커 (Energy Pilebunker)", icon: "⚡", rarity: "legendary", desc: "조잡한 창에서 진화. 실린더식 압축 초강력 충격파를 방출하여 일직선의 적을 초토화합니다." },
        { name: "나노 레이저 와이어 (Nano Laser Wire)", icon: "🧬", rarity: "legendary", desc: "조잡한 채찍에서 진화. 분자 단위의 나노 레이저 선을 휘둘러 닿는 적들을 즉시 절단합니다." },
        { name: "체인 EMP 쇼크 (Chain EMP Shock)", icon: "🔋", rarity: "legendary", desc: "조잡한 전기 충격기에서 진화. 연쇄 EMP 전자기 전도 펄스를 분사해 다수 기체를 무력화합니다." },
        { name: "퓨전 플라즈마 캐논 (Fusion Plasma Cannon)", icon: "💥", rarity: "legendary", desc: "조잡한 화염방사기에서 진화. 핵융합 핵플라즈마 광역 탄환을 고속으로 사격합니다." },
        { name: "크라이오 프리저 (Cryo Freezer)", icon: "🧊", rarity: "legendary", desc: "조잡한 냉각총에서 진화. 절대영도 과냉각 고리를 분사하여 적 무리를 즉시 빙결 큐브 상태로 만듭니다." },
        { name: "중력 특이점 필드 (Gravity Singularity)", icon: "🧲", rarity: "legendary", desc: "조잡한 가시갑옷에서 진화. 플레이어 주변 중력장을 붕괴시켜 적들을 무자비하게 끌어당깁니다." },
        { name: "프록시미티 사이버 마인 (Cyber Mine)", icon: "🛰️", rarity: "legendary", desc: "조잡한 덫에서 진화. 다중 유도 신관 지뢰를 다량 매설해 기습적인 지능형 화망을 구성합니다." },
        { name: "보이드 디스트로이어 (Void Destroyer)", icon: "🌌", rarity: "legendary", desc: "조잡한 낫에서 진화. 허공의 힘(보이드 차원)으로 시공간을 가르며 주변 모든 적을 소멸시킵니다." },
        { name: "태키온 레일건 (Tachyon Railgun)", icon: "⚡", rarity: "legendary", desc: "조잡한 레일건에서 진화. 타키온 가속 입자를 뿜어 사거리 무제한의 초음속 광선포를 연사합니다." }
    ],
    status: [
        { name: "공격 피해량 (ATK)", icon: "⚔️", rarity: "common", desc: "모든 일반 공격과 마법, 초월 기믹들의 기본 피해량 계수를 결정짓는 핵심 힘 스탯입니다." },
        { name: "공격 속도 (ASPD)", icon: "⚡", rarity: "common", desc: "탄환 사격 딜레이와 검 베기 속도를 끌어올려 단위 초당 누적 딜량을 극대화하는 지능 스탯입니다." },
        { name: "이동 및 대시 속도 (MOV)", icon: "🥾", rarity: "common", desc: "전장의 신속한 기동과 적 탄막 카이팅을 원활하게 도와주는 신속 이동력 능력치입니다." },
        { name: "회피 민첩성 (EVD)", icon: "💨", rarity: "rare", desc: "적 공격에 노출되어 피격 시, 일정 % 확률로 대미지를 무효화하고 반사 잔상을 남기는 민첩 스탯입니다." },
        { name: "방어력 (DEF)", icon: "🛡️", rarity: "common", desc: "비율 감소 공식을 사용하여 적에게 받는 모든 피해량을 차감하고 생존 확률을 높입니다." },
        { name: "스타성/매력 (CHA)", icon: "👑", rarity: "rare", desc: "검투사의 아레나 스타성입니다. 수치가 높을수록 흥분한 관객과 스폰서가 더 희귀한 등급의 보상 카드를 투척하고, 포션 보급 상자를 드롭할 확률이 비약적으로 향상됩니다." },
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
        desc: "네온 콜로세움 예선전의 가장 기초적인 연습용 표적기입니다. 특별한 살상 무기는 없지만 무리를 지어 몰려들며 검투사의 체력을 야금야금 갉아먹습니다. 가벼운 무빙과 기본 사격으로 처치해 시청률의 기초를 다지십시오.",
        hp: "15 ~ (층 비례 인플레이션)",
        atk: "5 ~ (층 비례 인플레이션)",
        speed: "1.2 ~ 2.2 (방 번호에 따라 점진적 증가)",
        tier: "방 1부터 출현",
        ability: "기본형 플레이어 추적 및 단순 개체 돌격"
    },
    {
        id: "chaser",
        name: "돌격형 몬스터 (Chaser)",
        type: "chaser",
        icon: "🔸",
        color: "#ffaa00",
        desc: "관객들의 도파민을 끌어올리기 위해 설계된 초가속 돌격형 머신입니다. 날렵한 화살촉 모양을 띠고 있으며, 2~3초마다 격렬한 네온 대시 엔진을 스파크와 함께 분사하며 검투사 방향으로 맹렬히 질주합니다. 돌진 타이밍을 꺾는 회피가 핵심입니다.",
        hp: "일반 몬스터 대비 75% 수준",
        atk: "5 ~ (돌격 시 피격 주의)",
        speed: "1.68 ~ 3.08 (대시 시 순간 돌발 가속)",
        tier: "방 4부터 출현 (낮은 확률로 방 3 이하)",
        ability: "네온 제트 엔진 조준 대시 돌격"
    },
    {
        id: "shooter",
        name: "원거리 몬스터 (Shooter)",
        type: "shooter",
        icon: "🔷",
        color: "#b026ff",
        desc: "보라색 장갑판 뒤에 숨어 안전거리를 필사적으로 유지하는 비열한 원거리 스나이퍼 봇입니다. 검투사의 조준각을 흐리기 위해 도망다니며, 사격 게이지가 완충되면 날카로운 구체 탄환을 사격합니다. 관객들이 지루함을 표하기 전에 빠르게 차단해야 합니다.",
        hp: "일반 몬스터 대비 120% 수준",
        atk: "3.5 ~ (원거리 보라색 탄환)",
        speed: "0.96 ~ 1.76 (좌우 회전 회피 무빙)",
        tier: "방 7부터 출현 (낮은 확률로 방 6 이하)",
        ability: "교활한 거리 유지 무빙 및 충전식 단발 사격"
    },
    {
        id: "exploder",
        name: "자폭 스파크 (Exploder)",
        type: "exploder",
        icon: "💛",
        color: "#ffea00",
        desc: "아레나에 기습적인 긴장감을 불어넣는 1회용 폭발 장치입니다. 노란색 마름모 몸체로 검투사에게 자석처럼 달라붙은 후 1초간 격렬하게 동체를 점멸하며 정지합니다. 대지를 뒤흔드는 광역 폭발을 유발하므로 점멸 즉시 대시로 피해야 합니다.",
        hp: "일반 몬스터 대비 80% 수준",
        atk: "1.5배의 치명적인 자폭 피해",
        speed: "1.44 ~ 2.64 (매우 민첩함)",
        tier: "방 4부터 출현",
        ability: "근접 시 1초 과충전 점멸 후 대폭사"
    },
    {
        id: "splitter",
        name: "분열 슬라임 (Splitter)",
        type: "splitter",
        icon: "🌐",
        color: "#00f0ff",
        desc: "경기 시간을 강제로 늘려 검투사를 피곤하게 만드는 연성 액체금속 생명체입니다. 기본 맷집이 강화되어 있으며, 처치하더라도 동체가 둘로 쪼개져 2마리의 미니 슬라임으로 세포 분열합니다. 분열된 파편까지 완전히 쓸어 담아야 경기장이 정화됩니다.",
        hp: "일반 몬스터 대비 150% 수준",
        atk: "5 ~ (층 비례 인플레이션)",
        speed: "0.84 ~ 1.54 (다소 느림)",
        tier: "방 7부터 출현",
        ability: "사망 시 신속한 미니 슬라임 2개체로 자가 분열"
    },
    {
        id: "mini",
        name: "미니 슬라임 (Mini)",
        type: "mini",
        icon: "💠",
        color: "#00e1ff",
        desc: "분열되거나 링 위의 소환사에 의해 바닥에 무더기로 급조되는 소형 펄스 구체입니다. 한 대만 쳐도 흩어질 만큼 약하지만, 극도로 작고 45% 빠른 이속으로 정신없이 돌진해와 검투사의 연산력과 컨트롤을 방해합니다.",
        hp: "일반 몬스터 대비 35% 수준",
        atk: "일반 몬스터 대비 60% 수준",
        speed: "1.74 ~ 3.19 (극단적인 돌진 속도)",
        tier: "분열 및 소환 시 출현",
        ability: "초소형 바디 및 초고속 돌격 공격"
    },
    {
        id: "scatterer",
        name: "방사 사격자 (Scatterer)",
        type: "scatterer",
        icon: "💗",
        color: "#ff00aa",
        desc: "십자 회전 날개를 달아 화려한 탄막 연출을 돕는 투기장 전용 억제 봇입니다. 검투사의 무빙 쇼를 유도하기 위해 주기적으로 3방향의 핑크빛 네온 탄환을 부채꼴 모양으로 넓게 뿌립니다. 탄막의 빈틈 사이를 포착해 찔러 넣는 공략이 필요합니다.",
        hp: "일반 몬스터 대비 110% 수준",
        atk: "부채꼴 3방향 방사형 사격",
        speed: "1.02 ~ 1.87 (보통)",
        tier: "방 10부터 출현",
        ability: "3방향 부채꼴 다발 네온 탄막 살포"
    },
    {
        id: "teleporter",
        name: "차원 도약자 (Teleporter)",
        type: "teleporter",
        icon: "💚",
        color: "#00ffcc",
        desc: "관객들에게 깜짝 놀랄 만한 기습 장면을 선사하기 위해 투입된 공간 위상 왜곡 머신입니다. 모래시계 모양을 취하고 있으며, 3초마다 투명하게 위상을 풀었다가 검투사의 후방 및 측면 사각지대로 불쑥 텔레포트해 등뒤를 타격합니다.",
        hp: "일반 몬스터 대비 90% 수준",
        atk: "5 ~ (층 비례 인플레이션)",
        speed: "1.14 ~ 2.09 (기본 추적 속도)",
        tier: "방 13부터 출현",
        ability: "3초 주기 검투사 근방 위상 전이 텔레포트"
    },
    {
        id: "tanker",
        name: "중장갑 탱커 (Tanker)",
        type: "tanker",
        icon: "⬜",
        color: "#e2e8f0",
        desc: "두꺼운 장갑 방패를 전면에 고정한 투기장의 철벽 방어 장치입니다. 매우 둔중하지만 일반 개체의 3배에 달하는 체력을 자랑하며, 검투사의 어떤 타격이나 넉백 충격에도 뒤로 밀려나지 않는 완전한 넉백 면제 장치를 탑재하여 돌파를 가로막습니다.",
        hp: "일반 몬스터 대비 300% (3배)",
        atk: "8 ~ (몸뚱이 충돌 시 큰 피해)",
        speed: "0.72 ~ 1.32 (매우 묵직하고 느림)",
        tier: "방 16부터 출현",
        ability: "넉백 완전 면제 및 3배의 초강력 특수 방패 장갑"
    },
    {
        id: "summoner",
        name: "차원 소환사 (Summoner)",
        type: "summoner",
        icon: "💜",
        color: "#8b5cf6",
        desc: "오각형 본체 중앙에 차원 홀을 열어 미니 봇(Mini)들을 연속으로 소환해대는 서포트 타겟입니다. 직접적인 무기는 없으나 플레이어를 교활하게 피하며 끝없이 머릿수를 늘립니다. 관객들의 야유가 쏟아지기 전에 1순위로 격파해야 합니다.",
        hp: "일반 몬스터 대비 130% 수준",
        atk: "직접 공격 없음 (소환 전담)",
        speed: "0.9 ~ 1.65 (도망 이동)",
        tier: "방 20부터 출현",
        ability: "도망 이동 및 주기적 미니 봇 무한 소환"
    },
    {
        id: "healer",
        name: "나노 치유사 (Healer)",
        type: "healer",
        icon: "💚",
        color: "#10b981",
        desc: "아군의 치료 요청을 받고 투입되는 모빌 나노 구급 유닛입니다. 손상된 다른 위협체들의 외골격을 3초마다 초록색 파동으로 급속 치료하여 경기를 장기전으로 모는 주범입니다. 화려한 검무를 뽐내며 신속하게 가장 먼저 척살하십시오.",
        hp: "일반 몬스터 대비 110% 수준",
        atk: "직접 공격 없음 (아군 광역 힐 전담)",
        speed: "0.96 ~ 1.76 (도망 이동)",
        tier: "방 22부터 출현",
        ability: "3초 주기 광역 복구 파동 방출 (몬스터 체력 힐)"
    },
    {
        id: "elite",
        name: "엘리트 몬스터 (Elite)",
        type: "elite",
        icon: "🟢",
        color: "#39ff14",
        desc: "스폰서들의 고액 돌발 베팅으로 난입한 특수 불법 튜닝 전투 머신입니다. 몸집이 1.5배로 커지고 형체가 초록빛으로 격렬하게 흔들리며 체력 3배, 공격력 2배 사양으로 격하합니다. 쓰러뜨리면 리더보드 점수와 연쇄 카드 콤보 확률이 큰 폭으로 폭증합니다.",
        hp: "일반/추격/사격 몬스터의 3배",
        atk: "해당 개체 기본 공격력의 2배",
        speed: "기본 타입 속도와 동일",
        tier: "모든 방에서 낮은 확률로 난입",
        ability: "3배 체력, 1.5배 크기, 2배 위력, 처치 시 리스크 상금 5배 기여"
    },
    {
        id: "boss",
        name: "네온 센티넬 (Neon Sentinel)",
        type: "boss",
        icon: "👑",
        color: "#ff3300",
        desc: "매 5층 관문을 통제하는 아레나 공식 예선 수문장입니다. 본체 외부로 시계/반시계 역회전하는 이중 점선 톱니 링을 가동하며 3방향 부채꼴 탄막을 지면 가득 쏟아내는 중화력 사양으로, 격투 쇼의 첫 번째 대형 장벽 역할을 수행합니다.",
        hp: "100 + 방 번호 * 12 (층 비례 인플레이션)",
        atk: "15 + 방 번호 * 0.8",
        speed: "1.0 + 층 비례 속도 상승",
        tier: "매 5의 배수 방 (5, 15, 25... 100층 최종전 보조)",
        ability: "이중 역회전 기계식 링 전개 및 부채꼴 광역 융단 사격"
    },
    {
        id: "boss_chaser",
        name: "하이퍼 체이서 (Hyper Chaser)",
        type: "boss_chaser",
        icon: "⚡",
        color: "#ffaa00",
        desc: "10층 아레나의 최고 인기스타이자 초기동형 챔피언급 안드로이드입니다. 초속 무빙을 기본 탑재하고 있으며, 1.5초 간격으로 검투사의 경로를 예측해 붉은 유도 선을 그린 뒤 단숨에 찌르는 화려한 돌격을 가해 아레나 분위기를 절정으로 몰고 갑니다.",
        hp: "120 + 방 번호 * 14 (층 비례 인플레이션)",
        atk: "18 + 방 번호 * 0.9",
        speed: "1.5 + 층 비례 속도 상승",
        tier: "10층 단위 보스",
        ability: "예측 조준선 궤적 전개 후 음속 돌격 대시 공격"
    },
    {
        id: "boss_slime",
        name: "마더 슬라임 (Mother Slime)",
        type: "boss_slime",
        icon: "🦠",
        color: "#00f0ff",
        desc: "30층 바이오돔 링을 제압하고 있는 거대 융합 슬라임 챔피언입니다. 사방으로 펄스 탄막을 흩뿌리며 숨통을 조이고, 체력이 다해 터지는 순간 두 마리의 소형 슬라임 챔피언으로 자가 복제 분열을 감행해 2라운드 난전을 강요합니다.",
        hp: "150 + 방 번호 * 16 (층 비례 인플레이션)",
        atk: "12 + 방 번호 * 0.7",
        speed: "0.7 + 층 비례 속도 상승",
        tier: "30층 보스",
        ability: "8방향 탄막 방사 및 사망 시 소형 보스 2개체 세포 분열"
    },
    {
        id: "boss_speaker",
        name: "둠 스피커 (Doom Speaker)",
        type: "boss_speaker",
        icon: "📢",
        color: "#ff00aa",
        desc: "40층 사운드 아레나를 수호하는 데시벨의 제왕입니다. 맵 중앙에 묵직하게 고정된 채 지진파 충격 링을 지속 방출하여 검투사를 아레나 구석으로 밀쳐내며(넉백), 동시에 붉은 레이저 트랩과 파괴 음파 탄막을 난사해 무대를 어지럽힙니다.",
        hp: "140 + 방 번호 * 15 (층 비례 인플레이션)",
        atk: "14 + 방 번호 * 0.8",
        speed: "1.0 (중앙 구역 고정 성향)",
        tier: "40층 보스",
        ability: "광역 음파 밀쳐내기 링 방출 및 레이저 트랩 시스템 전개"
    },
    {
        id: "boss_warper",
        name: "보이드 워퍼 (Void Warper)",
        type: "boss_warper",
        icon: "🌀",
        color: "#00ffcc",
        desc: "60층 초감각 특수 격투 무대의 왕좌를 차지했던 공간 기동 챔피언입니다. 주기적으로 완벽하게 자취를 감췄다가 검투사의 뒤나 사각지대 균열을 열고 불쑥 나타나며 치명타 칼날을 긋고, 맵 중앙에 강력한 블랙홀 중력 인력을 형성해 플레이어를 구속합니다.",
        hp: "180 + 방 번호 * 18 (층 비례 인플레이션)",
        atk: "16 + 방 번호 * 0.9",
        speed: "1.1 (도약 위주)",
        tier: "60층 보스",
        ability: "차원 은신 워프 급습 참격 및 중앙 끌어당김 블랙홀 기동"
    },
    {
        id: "boss_portal",
        name: "차원 차단기 (Dimensional Gate)",
        type: "boss_portal",
        icon: "⛩️",
        color: "#8b5cf6",
        desc: "70층 무대 장치를 철옹성으로 틀어쥔 아레나 거대 가드 벽입니다. 본체 주변에 전류를 공급하는 3개의 차원 발전기를 형성하고 무적 실드 장막을 활성화합니다. 발전기를 점사해 폭파하지 않으면 본체에 흠집조차 낼 수 없는 전략적 장애물입니다.",
        hp: "220 + 방 번호 * 20 (층 비례 인플레이션)",
        atk: "10 + 방 번호 * 0.5",
        speed: "0.8 (둔중함)",
        tier: "70층 보스",
        ability: "무적 실드 전개 (발전기 파괴로 해제) 및 차원문 포격 사격"
    },
    {
        id: "boss_hive",
        name: "나노 하이브 (Nano Hive)",
        type: "boss_hive",
        icon: "🛸",
        color: "#e2e8f0",
        desc: "80층에 등장하는 신소재 스마트 장갑 보스입니다. 본체 내구도 외에 자가 회복력을 탑재한 50%의 나노 실드 보호막을 두르고 있으며, 주기적으로 수리 전담 헬퍼 드론들을 사출해 자신의 실드를 고속 복구하므로 극딜과 타겟 전환이 요구됩니다.",
        hp: "250 + 방 번호 * 22 (층 비례 인플레이션)",
        atk: "20 + 방 번호 * 1.0",
        speed: "0.7 (넉백 면제)",
        tier: "80층 보스",
        ability: "자동 복구형 나노 보호막 운용, 수리 드론 방출, 넉백 완전 면제"
    },
    {
        id: "boss_chaos",
        name: "카오스 코어 (Chaos Core)",
        type: "boss_chaos",
        icon: "☄️",
        color: "#ff3300",
        desc: "90층 극단 원소 무대의 혼돈의 제어핵입니다. 10초 주기마다 자신의 속성을 화염(지속 화상), 번개(광속 전류 전이), 냉기(행동 동결)로 급속 튜닝하며 해당 속성에 특화된 사선 탄막과 치명적인 원소 필드를 아레나 전체에 뿌려댑니다.",
        hp: "300 + 방 번호 * 25 (층 비례 인플레이션)",
        atk: "22 + 방 번호 * 1.1",
        speed: "1.2",
        tier: "90층 보스",
        ability: "10초 주기 속성 튜닝 (화염/뇌격/냉각) 및 원소 폭풍 탄막 사격"
    },
    {
        id: "boss_final",
        name: "크로노스 (Chronos Motherboard)",
        type: "boss_final",
        icon: "👁️",
        color: "#ff0055",
        desc: "네온 콜로세움 100층 파이널 챔피언십 링 위에 우뚝 선 메인 프레임 통제 인공지능입니다. 벽면 고정식 거대 코어로 화면의 절반 이상을 쓸어버리는 파멸의 레이저 스윙 사격과 촘촘한 코어 보호 포탑을 가동하여 검투사의 최종 자유를 가로막습니다.",
        hp: "500 + 방 번호 * 30 (층 비례 인플레이션)",
        atk: "25 + 방 번호 * 1.2",
        speed: "0 (이동 불가 벽면 고정)",
        tier: "100층 최종 보스",
        ability: "파멸의 광선 레이저 휩쓸기 스윙, 무한 융합 탄막, 코어 보호 터렛 운용"
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

        let list = [];
        if (tabType === 'passives') {
            list = Object.values(window.PASSIVE_ITEMS || {}).map(item => ({
                name: item.name,
                icon: "🔮",
                rarity: item.rarity,
                desc: item.desc
            }));
        } else {
            list = CODEX_DATA[tabType] || [];
        }

        list.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = `reward-card ${card.rarity === 'legendary' ? 'card-legendary' : (card.rarity === 'epic' ? 'card-epic' : (card.rarity === 'rare' ? 'card-rare' : ''))}`;
            
            let glowStyle = '';
            let borderStyle = '';
            if (card.rarity === 'legendary') {
                glowStyle = 'background: radial-gradient(circle, rgba(176, 38, 255, 0.45) 0%, transparent 70%); border-color: #b026ff;';
                borderStyle = 'border-color: #b026ff;';
            } else if (card.rarity === 'epic') {
                glowStyle = 'background: radial-gradient(circle, rgba(255, 108, 0, 0.35) 0%, transparent 70%); border-color: #ff6c00;';
                borderStyle = 'border-color: #ff6c00;';
            } else if (card.rarity === 'rare') {
                glowStyle = 'background: radial-gradient(circle, rgba(0, 240, 255, 0.3) 0%, transparent 70%); border-color: #00f0ff;';
                borderStyle = 'border-color: #00f0ff;';
            } else {
                glowStyle = 'background: radial-gradient(circle, rgba(57, 255, 20, 0.15) 0%, transparent 70%); border-color: #39ff14;';
                borderStyle = 'border-color: #39ff14;';
            }

            const rarityColor = card.rarity === 'common' ? '#39ff14' : (card.rarity === 'rare' ? '#00f0ff' : (card.rarity === 'epic' ? '#ff6c00' : '#b026ff'));

            cardEl.innerHTML = `
                <div class="card-glow" style="${glowStyle}"></div>
                <div class="card-inner" style="${borderStyle}">
                    <span class="card-rarity ${card.rarity}" style="background: rgba(255,255,255,0.05); border-color: ${rarityColor}; color: ${rarityColor};">${card.rarity.toUpperCase()}</span>
                    <div class="card-icon" style="color: ${rarityColor};">${card.icon}</div>
                    <h3 class="card-title" style="font-size: 1.0rem; font-weight: 800;">${card.name}</h3>
                    <p class="card-desc" style="font-size: 0.76rem; line-height: 1.4; color: #a0aec0; height: 95px; overflow-y: auto;">${card.desc}</p>
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
        } else if (monsterType === 'boss' || monsterType.startsWith('boss_')) {
            previewMonster.makeBoss(5, monsterType);
            previewMonster.radius = monsterType === 'boss_final' ? 32 : 25; // 110x110 캔버스에 알맞게 크기 보정
        } else {
            previewMonster.type = monsterType;
            previewMonster.radius = 16;
            switch(monsterType) {
                case 'chaser':
                    previewMonster.color = '#ffaa00';
                    previewMonster.glowColor = '#ffaa00';
                    break;
                case 'shooter':
                    previewMonster.color = '#b026ff';
                    previewMonster.glowColor = '#b026ff';
                    break;
                case 'exploder':
                    previewMonster.color = '#ffea00';
                    previewMonster.glowColor = '#ffea00';
                    break;
                case 'splitter':
                    previewMonster.color = '#00f0ff';
                    previewMonster.glowColor = '#00f0ff';
                    break;
                case 'mini':
                    previewMonster.color = '#00e1ff';
                    previewMonster.glowColor = '#00e1ff';
                    previewMonster.radius = 10;
                    break;
                case 'scatterer':
                    previewMonster.color = '#ff00aa';
                    previewMonster.glowColor = '#ff00aa';
                    break;
                case 'teleporter':
                    previewMonster.color = '#00ffcc';
                    previewMonster.glowColor = '#00ffcc';
                    break;
                case 'tanker':
                    previewMonster.color = '#e2e8f0';
                    previewMonster.glowColor = '#a0aec0';
                    previewMonster.radius = 20;
                    previewMonster.isTanker = true;
                    break;
                case 'summoner':
                    previewMonster.color = '#8b5cf6';
                    previewMonster.glowColor = '#8b5cf6';
                    break;
                case 'healer':
                    previewMonster.color = '#10b981';
                    previewMonster.glowColor = '#10b981';
                    break;
                default:
                    previewMonster.color = '#ff0055';
                    previewMonster.glowColor = '#ff0055';
                    break;
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

                // Shooter/Scatterer 충전 연출용 shootCooldown 강제 차감 루프
                if (previewMonster.type === 'shooter' || previewMonster.type === 'scatterer') {
                    if (previewMonster.shootCooldown === undefined || previewMonster.shootCooldown <= 0) {
                        previewMonster.shootCooldown = 100;
                    }
                    previewMonster.shootCooldown -= 0.5;
                }

                // Healer 광역 힐 링 애니메이션 반복 연출
                if (previewMonster.type === 'healer') {
                    if (previewMonster.healRingTimer === undefined || previewMonster.healRingTimer <= 0) {
                        previewMonster.healRingTimer = 20;
                    }
                    previewMonster.healRingTimer -= 0.2;
                }

                // Exploder 자폭 임박 경고 핵 점멸 반복 연출
                if (previewMonster.type === 'exploder') {
                    previewMonster.explodeTimer = 30; // 항상 경고 모드 유지
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

