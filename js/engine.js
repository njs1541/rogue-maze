// --------------------------------------------------------------------------
// 7. 게임 전체를 지휘하는 핵심 컨트롤러 (GameEngine)
// --------------------------------------------------------------------------

class GameEngine {
    constructor() {
        // [수정] 생성자 극초반부에 전역 객체 바인딩을 진행하여, setupInitialRoom 등의 하위 초기화 시점에 
        // 맵 크기(mapWidth, mapHeight)를 안전하게 참조할 수 있도록 보장합니다.
        window.gameEngine = this;
        this.mapEngine = new MapEngine(this); // [추가] 맵 데이터 및 메커니즘 엔진 바인딩

        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // 디자인 해상도 비율 1320 * 900 고정 스케일링 설정
        this.mapWidth = 1320;
        this.mapHeight = 900;
        this.canvas.width = this.mapWidth;
        this.canvas.height = this.mapHeight;
        this.currentRoomMonsterPool = [];

        // 키보드 마우스 입력 상태 변수
        this.keys = {};
        this.mouse = { x: 0, y: 0, isDown: false };
        this.visualsSuspended = false;
        this.suspendedFloatingTexts = [];
        this.onCardDetailClose = null;

        // 게임 상태 파라미터
        this.roomNum = 1;
        this.score = 0;
        this.kills = 0;
        this.isPlaying = false;
        this.isCleared = false;
        this.bossWarningTimer = 0; // [v0.95] 보스 출현 테두리 경보 타이머
        this.gameClearActive = false; // [v0.95] 최종 클리어 중복 방지 플래그

        // 기억의 조각 로드
        this.loadMemoryFragments();

        // [신규 기믹] 보상 상자 획득 후 카드 선택 오버레이 활성화 지연 타이머 시스템
        this.rewardSelectorDelayTimer = -1;
        this.rewardSelectorIsFromHiddenChest = false;
        this.roomRewardSpawned = false; // [신규] 방 클리어 보상 스폰 유일성 플래그
        this.extraDrawCount = 0; // [신규] 운 비례 카드 추가 획득 횟수 추적 카운터
        this.rewardQueue = []; // [신규] 동시 획득 보상 팝업 순차 대기 큐 시스템

        // 엔티티 관리 리스트
        this.player = new Player(this.mapWidth / 2, this.mapHeight / 2);
        this.monsters = [];
        this.bullets = [];

        // [신규 최적화] 파티클 폭주로 인한 렌더링 렉을 완벽히 방지하는 캡핑(Capping) 데코레이터 주입
        this.particles = [];
        this.particles.push = (function (originalPush) {
            return function (item) {
                // 화면 내 활성 파티클이 350개에 도달했을 때, 중요 텍스트 데미지 팝업을 제외한 일반 이펙트는 등록 스킵
                if (this.length >= 350 && item && item.type !== 'text') {
                    return this.length;
                }
                return originalPush.apply(this, arguments);
            };
        })(this.particles.push);

        this.pets = [];
        this.potions = []; // [추가] 맵 클리어 드롭 물약 엔티티 리스트
        this.coinsList = []; // [W-08 신규 구현] 드롭 코인 엔티티 리스트
        this.secretWalls = []; // [Phase 7 신규 구현] 비밀 균열 벽 리스트
        this.secretGlitchDevices = []; // 비밀방 상호작용 디바이스 리스트
        this.traps = [];   // [신규] 함정 엔티티 리스트
        this.obstacles = []; // [신규] 25등분 격자 장애물 리스트
        this.chargingStations = []; // 충전소 리스트
        this.chargingStationLevel = 1; // 충전소 업그레이드 레벨
        this.nearChargingStation = false; // 플레이어가 충전소 근처에 있는지 여부
        this.materialsList = []; // 필드에 드롭된 부품 재료 엔티티 리스트

        // [신규 기획] 포털 특화 보상 및 상점 관리 리스트
        this.currentRoomType = 'stat';
        this.rewardChests = [];
        this.blueprintChests = [];
        this.transmuteSelectedMats = [];
        this.vendingMachines = [];
        this.vendingCooldown = 0;
        this.weaponRoomCooldown = 0; // [신규 기획] 무기 방 연속 출현 제어를 위한 쿨다운 추적 변수 추가
        this.secretVendingMachines = []; // [네온 암시장] 비밀 자판기 리스트
        this.weaponMerchants = []; // [신규] 무기 상인 NPC 리스트

        // 4개의 방향 포털 포지셔닝
        this.portals = [];
        this.lastEnteredPortalDir = null; // 방에 진입했던 입구 추적 (그 입구에선 몬스터 스폰 차단)

        // 몬스터 스폰 지연 큐 (Sequential Spawn Queue)
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.currentSpawnTotal = 0;
        this.currentSpawnRemaining = 0;

        // 3차 피드백: 스폰 패턴 및 누적량 제어 변수
        this.spawnMethod = 1; // 1: 지속, 2: 2초 지연, 3: 웨이브 대기
        this.spawnedInRoom = 0; // 이번 방에서 실제 스폰이 이루어진 누적 몬스터 수
        this.method2DelayDone = false; // 방식 2에서 2초 딜레이를 먹였는지 체크 플래그

        // 흔들림 이펙트 강도
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeScale = 1.0; // [신규] 화면 흔들림 강도 옵션 배율 (0.0 ~ 1.0)

        // 콤보 및 기타 이펙트 수치
        this.comboCount = 0;
        this.comboTimer = 0;

        // v0.3: 난이도/보상 시너지 기믹 속성 초기화
        this.isEliteRoom = false;
        this.lastEnteredPortalClass = 'low';

        this.timeDilationActive = false; // [추가] 시간 왜곡(지연) 마법 활성화 플래그
        this.timeWarpFreeCastActive = false; // [신규 기획] Mana Helm 5레벨 무료 지속 시간왜곡 체크용 플래그
        this.hasRerolledThisRoom = false;   // [신규 기획] Luck Amulet 10레벨 초월: 보상 카드 방당 1회 리롤 트래킹 플래그
        this.gameOverActive = false;        // [신규 추가] 사망 연출 다중 중복 트리거 방지용 플래그
        this.hitStopFrames = 0;             // [신규 추가] Hit Stop(역경직) 프레임 카운터 초기화
        this.hitStopCooldown = 0;           // [신규 추가] Hit Stop 쿨다운 타이머 초기화

        this.inSecretRoom = false; // 비밀방 보너스 층 상태 추적 플래그
        this.forceSecretWallNextRoom = false; // 치트 강제 비밀방 등장 플래그

        // [보정] 고주사율 모니터 배속 방지를 위한 60FPS 고정 타임스텝 변수 초기화
        this.lastTime = performance.now();
        this.accumulatedTime = 0;
        this.timestep = 1000 / 60; // 60FPS (약 16.67ms)

        // 옵션 및 성능 최적화 로드
        this.lowSpecMode = false;
        this.loadOptions();

        // shadowBlur 가로채기 (성능 최적화 모드 연동)
        if (!window.shadowBlurOverridden) {
            const originalShadowBlurDescriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
            Object.defineProperty(CanvasRenderingContext2D.prototype, 'shadowBlur', {
                get: function () {
                    return originalShadowBlurDescriptor.get.call(this);
                },
                set: function (val) {
                    if (window.gameEngine && window.gameEngine.lowSpecMode) {
                        originalShadowBlurDescriptor.set.call(this, 0);
                    } else {
                        originalShadowBlurDescriptor.set.call(this, val);
                    }
                },
                configurable: true
            });
            window.shadowBlurOverridden = true;
        }

        this.initInputEvents();
        this.setupInitialRoom();
        this.initCheatSystemEvents();
        this.initOptionEvents(); // [신규 추가] 시스템 옵션 모달 이벤트 등록
        this.initUpgradeShopEvents(); // [신규 추가] 바이츠 상점 이벤트 등록

        // 이어하기 버튼 가시성 업데이트
        this.updateContinueButtonVisibility();

        // [신규] 화면 스케일 및 레이아웃 고정 설정
        this.adjustLayoutScale();
        window.addEventListener('resize', () => this.adjustLayoutScale());
    }

    // [신규] 브라우저 화면 크기에 비례하여 레이아웃을 비율대로 scale 조절
    adjustLayoutScale() {
        const container = document.getElementById('game-container');
        if (!container) return;

        const baseWidth = 2830;
        const baseHeight = 1222;
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;

        let scaleX = winWidth / baseWidth;
        let scaleY = winHeight / baseHeight;
        let minScale = Math.min(scaleX, scaleY);

        // 창 크기가 기준 해상도보다 클 때는 확대하지 않고 1배율로 유지
        if (minScale > 1) {
            minScale = 1;
        }

        container.style.transform = `translate(-50%, -50%) scale(${minScale})`;
        // [신규] CSS 변수로 현재 스케일 비율 전달 (외부 이관된 대화 오버레이 스케일링 연동용)
        document.documentElement.style.setProperty('--game-scale', minScale);
    }

    // 입력 장치 이벤트 바인딩
    initInputEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            // Spacebar를 누르면 마력 특수기 가동 (오버레이가 없고 실제 게임 실행 중일 때만 허용)
            if (e.key === ' ' || e.code === 'Space') {
                const isOverlayOpen = this.checkAnyOverlayOpen();
                if (!isOverlayOpen && this.isPlaying && this.player && this.player.hp > 0) {
                    this.triggerMagicSkill();
                }
            }

            // [테스트용 치트 핫키] P키: 디버그/치트 메뉴 토글
            if (e.key === 'p' || e.key === 'P') {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return;
                }
                e.preventDefault();

                // 치트 메뉴를 새로 여는 시점에만 다른 오버레이가 켜져 있는지 확인하여 차단
                const cheatOverlay = document.getElementById('cheat-overlay');
                const isAlreadyOpen = cheatOverlay && !cheatOverlay.classList.contains('hidden');
                if (!isAlreadyOpen) {
                    if (this.checkAnyOverlayOpenExcept('cheat-overlay')) return;
                }
                this.toggleCheatMenu();
            }

            // [신규 추가] Escape 키: 시스템 옵션 모달 토글
            if (e.key === 'Escape') {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return;
                }
                e.preventDefault();

                // 옵션 메뉴를 새로 여는 시점에만 다른 오버레이가 켜져 있는지 확인하여 차단
                const optionOverlay = document.getElementById('option-overlay');
                const isAlreadyOpen = optionOverlay && !optionOverlay.classList.contains('hidden');
                if (!isAlreadyOpen) {
                    if (this.checkAnyOverlayOpenExcept('option-overlay')) return;
                }
                this.toggleOptionMenu();
            }

            // [신규 추가] Tab 키: 인게임 획득 장비 상태창 모달 토글
            if (e.key === 'Tab') {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return;
                }
                e.preventDefault();

                // 상태 조회 창을 열 수 있는지 조건 검사
                const statusOverlay = document.getElementById('in-game-status-overlay');
                const isAlreadyOpen = statusOverlay && !statusOverlay.classList.contains('hidden');
                if (!isAlreadyOpen) {
                    if (this.checkAnyOverlayOpenExcept('in-game-status-overlay')) return;
                }
                this.toggleStatusMenu();
            }

            // [테스트용 치트 핫키] O키: 99스테이지 즉시 도달 워프 (100스테이지 보스 직전)
            if (e.key === 'o' || e.key === 'O') {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return;
                }
                if (!this.isPlaying || this.checkAnyOverlayOpen()) {
                    return;
                }
                this.roomNum = 99;
                this.monsters = [];
                this.spawnQueue = [];
                this.updateHUD();
                this.showFloatingText("CHEAT: WARP TO ROOM 99", this.player.x, this.player.y - 40, '#ff3300');
            }

            // [신규 기획] C키: 충전소 제작소 토글
            if (e.key === 'c' || e.key === 'C') {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                    return;
                }
                e.preventDefault();

                if (!this.isPlaying) return;

                if (!this.nearChargingStation) {
                    this.showFloatingText("MUST BE IN CHARGING STATION RANGE!", this.player.x, this.player.y - 30, '#ff5e00');
                    return;
                }

                // 제작 메뉴 열기 토글
                const craftingOverlay = document.getElementById('crafting-overlay');
                const isAlreadyOpen = craftingOverlay && !craftingOverlay.classList.contains('hidden');
                if (!isAlreadyOpen) {
                    if (this.checkAnyOverlayOpenExcept('crafting-overlay')) return;
                }
                this.toggleCraftingMenu();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // [수정] 마우스가 캔버스 바깥 영역으로 나가도 조준이 끊김 없이 부드럽게 갱신되도록 window 전체에 바인딩
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // 화면 스케일에 상관없이 정확한 캔버스 기준 상대 조준점 확보 (바깥 영역 투영 가능)
            this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            this.keyboardAimActive = false; // 마우스 이동 시 키보드 조준 모드 해제
        });

        // [수정] 캔버스 바깥 검은 영역을 클릭해도 정상 사격이 되도록 window에 mousedown 바인딩
        window.addEventListener('mousedown', (e) => {
            // 버튼, 슬라이더, 또는 HUD 오버레이 영역을 클릭 시 사격이 중복 격발되는 오동작 차단 가드 적용
            if (e.target) {
                const targetTagName = e.target.tagName;
                if (targetTagName === 'INPUT' || targetTagName === 'BUTTON' || targetTagName === 'SELECT' ||
                    e.target.closest('.overlay-panel') || e.target.closest('#hud-header') || e.target.closest('#hud-footer')) {
                    return;
                }
            }

            if (e.button === 0) { // 마우스 좌클릭
                this.mouse.isDown = true;
                this.keyboardAimActive = false; // 마우스 클릭 시 키보드 조준 모드 해제
                Sound.init(); // 브라우저 자동 재생 규정 우회
                Sound.startBGM(); // 첫 클릭 시 은은하고 웅장한 Synth BGM 시작
            }
        });

        window.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
        });

        // 게임 오버 혹은 재시작 버튼 연결
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('start-overlay').classList.add('hidden');

            // [튜토리얼 기믹] 최초 방문 시 튜토리얼 팝업, 이후에는 바로 시작
            const tutorialViewed = localStorage.getItem('neon_rogue_tutorial_viewed');
            if (tutorialViewed !== 'true') {
                const tutorialOverlay = document.getElementById('tutorial-overlay');
                if (tutorialOverlay) {
                    tutorialOverlay.classList.remove('hidden');
                } else {
                    this.startGame();
                }
            } else {
                this.startGame();
            }
        });

        // 튜토리얼 확인 버튼 이벤트 바인딩
        const tutorialCloseBtn = document.getElementById('tutorial-close-btn');
        if (tutorialCloseBtn) {
            tutorialCloseBtn.addEventListener('click', () => {
                const tutorialOverlay = document.getElementById('tutorial-overlay');
                if (tutorialOverlay) {
                    tutorialOverlay.classList.add('hidden');
                }
                localStorage.setItem('neon_rogue_tutorial_viewed', 'true');
                this.startGame();
            });
        }

        // 이어하기 버튼 이벤트 바인딩
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.continueGame();
            });
        }

        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('result-overlay').classList.add('hidden');
            this.restartGame();
        });

        // [신규] 🏆 랭킹 등록 버튼 클릭 이벤트
        const openRankFormBtn = document.getElementById('open-rank-form-btn');
        if (openRankFormBtn) {
            openRankFormBtn.addEventListener('click', () => {
                const rankSubmitArea = document.getElementById('rank-submit-area');
                if (rankSubmitArea) {
                    rankSubmitArea.classList.remove('hidden');
                }
            });
        }

        // [신규] 🏠 처음으로 버튼 클릭 이벤트
        const gotoMainBtn = document.getElementById('goto-main-btn');
        if (gotoMainBtn) {
            gotoMainBtn.addEventListener('click', () => {
                document.getElementById('result-overlay').classList.add('hidden');
                document.getElementById('start-overlay').classList.remove('hidden');

                const storyOverlay = document.getElementById('story-dialogue-overlay');
                if (storyOverlay) {
                    storyOverlay.classList.add('hidden');
                }

                // 처음 화면 복귀 시 HUD 헤더와 푸터 숨기기
                const hudHeader = document.getElementById('hud-header');
                const hudFooter = document.getElementById('hud-footer');
                if (hudHeader) hudHeader.classList.add('hidden');
                if (hudFooter) hudFooter.classList.add('hidden');

                // 이어하기 버튼 상태 업데이트
                this.updateContinueButtonVisibility();

                this.isPlaying = false;
                if (this.gameLoopId) {
                    cancelAnimationFrame(this.gameLoopId);
                }
                Sound.stopBGM();
                const ctx = this.ctx;
                if (ctx) {
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    ctx.fillStyle = '#05060c';
                    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                }
            });
        }

        // [신규] 인게임 상태창 모달 닫기 버튼 이벤트
        const statusModalClose = document.getElementById('status-modal-close');
        if (statusModalClose) {
            statusModalClose.addEventListener('click', () => {
                this.toggleStatusMenu();
            });
        }

        const statusModalCloseBtn = document.getElementById('status-modal-close-btn');
        if (statusModalCloseBtn) {
            statusModalCloseBtn.addEventListener('click', () => {
                this.toggleStatusMenu();
            });
        }

        // [신규] 제작창 모달 닫기 버튼 이벤트
        const craftingClose = document.getElementById('crafting-close');
        if (craftingClose) {
            craftingClose.addEventListener('click', () => {
                this.toggleCraftingMenu();
            });
        }

        const craftingCloseBtn = document.getElementById('crafting-close-btn');
        if (craftingCloseBtn) {
            craftingCloseBtn.addEventListener('click', () => {
                this.toggleCraftingMenu();
            });
        }

        // [신규] 제작창 탭 전환 이벤트 리스너 연동
        document.querySelectorAll('.crafting-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.craftingActiveTab = tab;

                // 탭 버튼 active 클래스 제어
                document.querySelectorAll('.crafting-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.refreshCraftingUI();
            });
        });

        // [신규 기획] 무기 상인 NPC 상점 모달 닫기 버튼 이벤트
        const npcClose = document.getElementById('npc-close');
        if (npcClose) {
            npcClose.addEventListener('click', () => {
                this.toggleNPCMenu();
            });
        }

        const npcCloseBtn = document.getElementById('npc-close-btn');
        if (npcCloseBtn) {
            npcCloseBtn.addEventListener('click', () => {
                this.toggleNPCMenu();
            });
        }

        // [신규 기획] 무기 상인 NPC 상점 탭 전환 이벤트 리스너 연동
        document.querySelectorAll('.npc-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.npcActiveTab = tab;

                // 탭 버튼 active 클래스 제어
                document.querySelectorAll('.npc-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.refreshNPCUI();
            });
        });

        // [신규] 파이어베이스 랭킹 시스템 UI 이벤트 리스너 연동

        // 닉네임 입력 실시간 필터 (영어 대문자와 숫자만 허용)
        const rankNicknameInput = document.getElementById('rank-nickname');
        if (rankNicknameInput) {
            rankNicknameInput.addEventListener('input', (e) => {
                let val = e.target.value.toUpperCase();
                // 영문 대문자와 숫자만 남기고 제거
                e.target.value = val.replace(/[^A-Z0-9]/g, '');
            });
            // Enter 키 입력 시 랭킹 등록 즉시 호출 지원
            rankNicknameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.submitRanking();
                }
            });
        }

        // 랭킹 등록 버튼 클릭 이벤트
        const submitRankBtn = document.getElementById('submit-rank-btn');
        if (submitRankBtn) {
            submitRankBtn.addEventListener('click', () => {
                this.submitRanking();
            });
        }

        // 리더보드 모달 열기 버튼 (메인 시작 화면 및 결과 화면)
        const mainLbBtn = document.getElementById('main-leaderboard-btn');
        if (mainLbBtn) {
            mainLbBtn.addEventListener('click', () => {
                this.showLeaderboard();
            });
        }

        const resLbBtn = document.getElementById('result-leaderboard-btn');
        if (resLbBtn) {
            resLbBtn.addEventListener('click', () => {
                this.showLeaderboard();
            });
        }

        // 리더보드 모달 닫기 버튼 (X 아이콘 및 하단 닫기 버튼)
        const lbCloseX = document.getElementById('ranking-modal-close');
        if (lbCloseX) {
            lbCloseX.addEventListener('click', () => {
                this.hideLeaderboard();
            });
        }

        const lbCloseBtn = document.getElementById('ranking-modal-close-btn');
        if (lbCloseBtn) {
            lbCloseBtn.addEventListener('click', () => {
                this.hideLeaderboard();
            });
        }

        // [신규] 리더보드 모달 필터 전환 버튼 이벤트 바인딩
        const filterBtns = document.querySelectorAll('.rank-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = btn.getAttribute('data-filter');
                const includeLocal = (filterType === 'all');

                // 필터링된 데이터 재호출 및 리더보드 다시 렌더링
                this.showLeaderboard(includeLocal);
            });
        });
    }

    // 게임 시작 시 초기화
    startGame() {
        // [결함 완치] 게임 재시작 시 기존에 기동 중이던 애니메이션 루프가 있을 수 있으므로 즉시 가드 해제(Cancel)하여 부스팅 현상을 박멸합니다.
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }

        // 게임 시작 시 HUD 보이기
        const hudHeader = document.getElementById('hud-header');
        const hudFooter = document.getElementById('hud-footer');
        if (hudHeader) hudHeader.classList.remove('hidden');
        if (hudFooter) hudFooter.classList.remove('hidden');

        // [신규 기획] Manual 화면 테두리 노이즈 필터 초기화
        const filter = document.getElementById('manual-noise-filter');
        if (filter) {
            filter.classList.add('hidden');
        }

        this.clearSavedGame();
        this.isPlaying = true;
        this.roomNum = 1;
        this.score = 0;
        this.kills = 0;

        this.player = new Player(this.mapWidth / 2, this.mapHeight / 2);
        this.monsters = [];
        this.bullets = [];

        // [신규 최적화] 파티클 폭주로 인한 렌더링 렉을 완벽히 방지하는 캡핑(Capping) 데코레이터 주입
        this.particles = [];
        this.particles.push = (function (originalPush) {
            return function (item) {
                // 화면 내 활성 파티클이 350개에 도달했을 때, 중요 텍스트 데미지 팝업을 제외한 일반 이펙트는 등록 스킵
                if (this.length >= 350 && item && item.type !== 'text') {
                    return this.length;
                }
                return originalPush.apply(this, arguments);
            };
        })(this.particles.push);

        this.pets = [];
        this.potions = []; // [추가] 물약 리스트 초기화
        this.coinsList = []; // [W-08 신규 구현] 코인 리스트 초기화
        this.secretWalls = []; // [Phase 7 신규 구현] 비밀 벽 초기화
        this.secretGlitchDevices = []; // 비밀방 상호작용 디바이스 초기화
        this.traps = [];   // [신규] 함정 리스트 초기화
        this.obstacles = []; // [신규] 25등분 격자 장애물 리스트 초기화

        // [신규 기획] 보상 및 상점 리스트 리셋
        this.currentRoomType = 'stat';
        this.rewardChests = [];
        this.blueprintChests = [];
        this.vendingMachines = [];
        this.vendingCooldown = 0;
        this.weaponRoomCooldown = 0; // [신규 기획] 무기 방 쿨다운 변수 리셋
        this.secretVendingMachines = []; // [네온 암시장] 비밀 자판기 초기화
        this.weaponMerchants = []; // [신규] 무기 상인 NPC 초기화
        this.hitStopFrames = 0; // [신규 추가] 게임 시작/재시작 시 Hit Stop 프레임 리셋

        this.mapWidth = 1320;
        this.mapHeight = 900;
        this.canvas.width = this.mapWidth;
        this.canvas.height = this.mapHeight;
        this.ctx = this.canvas.getContext('2d'); // [보안] 캔버스 초기화 시 2D 컨텍스트 다시 바인딩하여 드로잉 안전 보장
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.maxWidth = '';
            gameContainer.style.setProperty('--map-width', this.mapWidth + 'px');
        }
        // [신규] 첫 번째 시작 방은 외곽 1칸만 벽인 PRESET_SIZE_BOSS 구조로 초기화
        this.generateGridMap('PRESET_SIZE_BOSS');
        this.currentRoomMonsterPool = [];

        this.spawnQueue = [];
        this.lastEnteredPortalDir = null;

        // 3차 피드백: 스폰 초기화
        this.spawnMethod = 1;
        this.spawnedInRoom = 0;
        this.method2DelayDone = false;

        // v0.3: 난이도/보상 시너지 기믹 속성 초기화
        this.isEliteRoom = false;
        this.lastEnteredPortalClass = 'low';

        this.timeDilationActive = false; // [추가] 시작 시 시간 왜곡 비활성화

        this.inSecretRoom = false; // 비밀방 보너스 층 상태 추적 플래그
        this.forceSecretWallNextRoom = false; // 치트 강제 비밀방 등장 플래그

        this.updateHUD();
        this.setupInitialRoom();

        // [보정] 게임 재시작 시 타임스텝 누적 시간 리셋
        this.lastTime = performance.now();
        this.accumulatedTime = 0;

        // 매끄러운 60fps 애니메이션 루프 재구동 및 루프 ID 보관
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
        Sound.play('powerup');
        Sound.startBGM(); // [추가] 게임 시작 시 BGM 연주 강제 시작/보장

        // [신규 기획] 오프닝 프롤로그 트리거
        let prologueLines = [];
        prologueLines.push("SYSTEM: 의식 동기화 완료...");
        prologueLines.push("LOG: 복제 번호 #138C18-G605 가동");

        const unused = this.unusedFragments !== undefined ? this.unusedFragments : 0;
        if (unused >= 7) {
            prologueLines.push("WARNING: 메모리 복원 성공. 잔류 데이터 87.2% 동기화 중...");
            prologueLines.push("정신을 차리자 머리가 깨질 듯한 데자뷔가 몰려온다.\n나는 이 1층의 네온 바닥을 최소 수십 번은 밟아보았다.\n저 위에는 크로노스가 아닌, 무언가 다른 감시자가 숨어 있다...");
        } else {
            prologueLines.push("ERROR: 이전 로그 복원 실패. 잔류 데이터 0.00%");
            prologueLines.push("기억은 말끔히 포맷되었습니다. 오직 오늘 밤의 격투와 눈앞의 적에만 집중하십시오.");
        }

        // 조금 뒤에 첫 대사가 출력될 수 있도록 스케줄링하여 연출 안정성 확보
        setTimeout(() => {
            const overlay = document.getElementById('story-dialogue-overlay');
            if (overlay) overlay.classList.add('dimmed');
            this.showDialogue("SYSTEM", prologueLines);
        }, 100);
    }

    restartGame() {
        this.startGame();
    }

    // [신규 기획] 포털 특화 보상 및 상점 타입을 결정하는 공통 메소드
    generatePortalTypes() {
        // 기본 4개 포털 타입 후보군
        let types = ['stat', 'stat', 'stat', 'equipment'];

        // 쿨다운이 끝났을(0 이하) 때에만 35% 확률로 무기 방 등장 후보 삽입
        if (this.weaponRoomCooldown <= 0 && Math.random() < 0.35) {
            types[0] = 'weapon';
        }

        // 25% 확률로 stat 하나가 shop(상점)으로 변경
        if (Math.random() < 0.25) {
            types[1] = 'shop';
        }

        // 무작위 셔플링
        types.sort(() => 0.5 - Math.random());
        return types;
    }

    // [신규] 2차원 그리드 기반 맵 구조 생성 메서드
    generateGridMap(presetType) {
        this.mapEngine.generateGridMap(presetType);
    }

    loadCustomMapPreset(presetName) {
        this.mapEngine.loadCustomMapPreset(presetName);
    }

    spawnSecretWall() {
        this.mapEngine.spawnSecretWall();
    }

    isTileWall(x, y) {
        return this.mapEngine.isTileWall(x, y);
    }

    getSafeSpawnPosition(avoidPlayer = false, minDist = 200, maxAttempts = 100) {
        return this.mapEngine.getSafeSpawnPosition(avoidPlayer, minDist, maxAttempts);
    }

    // 첫 시작 방은 몬스터가 등장하지 않는 완전히 평화로운 휴식의 안전실
    setupInitialRoom() {
        this.portals = [
            new RoomPortal('top', this.getRandomScoreValue()),
            new RoomPortal('bottom', this.getRandomScoreValue()),
            new RoomPortal('left', this.getRandomScoreValue()),
            new RoomPortal('right', this.getRandomScoreValue())
        ];

        // [신규 기획] 포털 특화 유형 무작위 분배 (쿨다운 및 확률 가중치 반영)
        let types = this.generatePortalTypes();
        this.portals.forEach((p, idx) => {
            p.portalType = types[idx];
        });

        // v0.3: 문 랭킹 랭크 부여
        this.rankPortals();

        // 적이 없는 상태이므로 즉시 모든 문 개방
        this.portals.forEach(p => p.active = true);
        this.monsters = [];
        this.spawnQueue = [];
        this.traps = []; // [신규] 함정 리스트 초기화
        this.chargingStations = [];
        this.generateChargingStations();

        // 콤보 리셋
        this.comboCount = 0;
        this.comboTimer = 0;

        this.isEliteRoom = false;
        this.lastEnteredPortalClass = 'low';
    }

    // [v0.3] 3개 포털의 scoreValue에 랭킹 등급 상(high)/중(mid)/하(low) 부여
    rankPortals() {
        let activePortals = [...this.portals];
        if (this.lastEnteredPortalDir) {
            activePortals = activePortals.filter(p => p.direction !== this.lastEnteredPortalDir);
        }

        // 내림차순 정렬 (높은 몬스터 수 우선)
        activePortals.sort((a, b) => b.scoreValue - a.scoreValue);

        // 랭크 할당
        activePortals.forEach((p, idx) => {
            if (idx === 0) p.difficultyClass = 'high';
            else if (idx === 1) p.difficultyClass = 'mid';
            else p.difficultyClass = 'low';
        });

        // 제외된 포털이 있다면 기본 low
        this.portals.forEach(p => {
            if (!p.difficultyClass) p.difficultyClass = 'low';
        });
    }

    // 문 위에 들어갈 몬스터 수 & 획득 점수 랜덤 난이도 결정 (10스테이지마다 최대/최소 증가)
    getRandomScoreValue() {
        // [4안 적용] 초반 1~20층 몬스터 마릿수 상한선 하향 조정
        let stageGroup = Math.floor((this.roomNum - 1) / 10);
        let minVal, maxVal;
        if (this.roomNum <= 10) {
            minVal = 3;
            maxVal = 10;
        } else if (this.roomNum <= 20) {
            minVal = 8;
            maxVal = 15;
        } else {
            minVal = 11 + (stageGroup - 2) * 5;
            maxVal = Math.min(65, 30 + (stageGroup - 2) * 5);
        }

        // 보정: minVal이 maxVal을 넘지 않도록 안전 제한
        if (minVal > maxVal) minVal = maxVal - 4;
        if (minVal < 1) minVal = 1;

        return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
    }

    // 특정 문으로 입장했을 때의 방 전환 엔진
    transitionToNextRoom(portal) {
        if (this.gameClearActive || this.gameOverActive) return;

        // [신규 기획] 현재 방의 유형을 방금 진입한 포털의 보상 유형으로 갱신!
        const enteringSecretRoom = (portal.portalType === 'secret_room');

        if (enteringSecretRoom) {
            this.inSecretRoom = true;
            this.currentRoomType = 'secret_room';
        } else {
            this.currentRoomType = portal.portalType || 'stat';
        }

        // [신규 기획] 무기 방 연속 출현 제어를 위한 쿨다운 로직 연동
        if (this.currentRoomType === 'weapon') {
            this.weaponRoomCooldown = 3; // 무기 방 진입 시 3회 방 동안 쿨다운 적용
        } else if (this.weaponRoomCooldown > 0) {
            this.weaponRoomCooldown--; // 다른 방 입장 시 쿨다운 차감
        }

        const scoreBonus = portal.scoreValue;
        this.score += scoreBonus; // 획득 점수 축적

        // 진입한 문의 난이도 등급 저장 (보상 등급 강화에 적용)
        this.lastEnteredPortalClass = portal.difficultyClass || 'low';

        // 5의 배수 방(10의 배수 보스방 제외) 진입 시 엘리트 활성화 여부 세팅
        let nextRoomNum = this.roomNum + 1;
        if (nextRoomNum % 5 === 0 && nextRoomNum % 10 !== 0 && !enteringSecretRoom) {
            // '상'(high) 또는 '중'(mid) 등급 문으로 들어왔을 때만 진짜 엘리트 방
            if (portal.difficultyClass === 'high' || portal.difficultyClass === 'mid') {
                this.isEliteRoom = true;
            } else {
                this.isEliteRoom = false;
            }
        } else {
            this.isEliteRoom = false;
        }

        // [3차 피드백] 스폰 방식(패턴) 결정 연산
        // 1스테이지에서 2스테이지로 넘어갈 때는 무조건 방식 1
        if (this.roomNum === 1) {
            this.spawnMethod = 1;
        } else {
            // 입장 방향을 제외한 나머지 3개 스폰 대상 포털 추출 (비밀방 포털인 경우엔 4방향 전부 검토)
            const targetPortals = this.portals.filter(p => p.direction !== this.lastEnteredPortalDir);

            if (targetPortals.length > 0) {
                // 시계 방향 정렬 순서 준비 (겹쳤을 때 플레이어 입장 방향의 왼쪽부터 시계방향순 타이브레이커)
                const dirOrder = ['top', 'right', 'bottom', 'left'];
                let entryIdx = dirOrder.indexOf(this.lastEnteredPortalDir);
                const pOrder = [
                    dirOrder[(entryIdx + 1) % 4],
                    dirOrder[(entryIdx + 2) % 4],
                    dirOrder[(entryIdx + 3) % 4]
                ];

                // 3개 포털 정렬 (1순위: 숫자 내림차순, 2순위: pOrder 인덱스가 작을수록 우선)
                const sortedPortals = [...targetPortals].sort((a, b) => {
                    if (b.scoreValue !== a.scoreValue) {
                        return b.scoreValue - a.scoreValue; // 숫자 높은 것이 먼저
                    }
                    return pOrder.indexOf(a.direction) - pOrder.indexOf(b.direction);
                });

                let chosenIdx = sortedPortals.findIndex(p => p.direction === portal.direction);
                if (chosenIdx === 0) {
                    this.spawnMethod = 3;
                } else if (chosenIdx === 1) {
                    this.spawnMethod = 2;
                } else {
                    this.spawnMethod = 1;
                }
            } else {
                this.spawnMethod = 1;
            }
        }

        // 스폰 제어 변수들 다음 방 진입 대비 리셋
        this.spawnedInRoom = 0;
        this.method2DelayDone = false;
        this.roomRewardSpawned = false; // [신규] 다음 방 진입 시 보상 스폰 플래그 리셋

        // [글리치 비밀방 층수 룰 적용] 비밀방에 들어설 때는 roomNum(층수)을 올리지 않고 동결!
        if (enteringSecretRoom) {
            this.showFloatingText("🔮 SECRET CHASM REACHED (ROOM LEVEL FREEZE)", this.player.x, this.player.y - 45, '#b026ff');
        } else {
            this.roomNum++; // 일반 방 진행 시에만 정상 층수 가산
            this.inSecretRoom = false; // 비밀방 룰에서 복귀
        }

        // 100 스테이지 달성 시 최종 승리 클리어
        // (단, 101층 진 엔딩 조건인 error_sector 포털 진입 시에는 triggerGameClear를 우회하고 101층 셋업 진행)
        if (this.roomNum > 100) {
            if (portal.portalType === 'error_sector') {
                this.roomNum = 101;
            } else {
                // [버그 수정] roomNum++로 101이 된 상태이므로 100으로 복원
                // triggerGameClear 내부의 진 엔딩 판정(roomNum === 101)과 충돌 방지
                this.roomNum = 100;
                this.triggerGameClear();
                return;
            }
        }

        // --- [신규 기믹] 2차원 그리드 기반 맵 결정 및 크기 고정 ---
        this.mapWidth = 1320;
        this.mapHeight = 900;

        // 캔버스 크기 적용
        this.canvas.width = this.mapWidth;
        this.canvas.height = this.mapHeight;

        // HTML 컨테이너 가로폭 비례 조절
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.maxWidth = '';
            gameContainer.style.setProperty('--map-width', this.mapWidth + 'px');
        }

        // 맵 프리셋 결정
        if (enteringSecretRoom) {
            // 비밀방은 쾌적함을 위해 보스방형 넓은 맵으로 로드
            this.generateGridMap('PRESET_SIZE_BOSS');
        } else if (this.roomNum % 10 === 0) {
            // 보스방은 보스방형 맵 고정
            this.generateGridMap('PRESET_SIZE_BOSS');
        } else {
            // 일반방은 7개 프리셋 중에서 랜덤 로드
            const presets = [
                'PRESET_SIZE_NORMAL', 'PRESET_SIZE_MIDDLE', 'PRESET_SIZE_BOSS',
                'PRESET_LINE', 'PRESET_WINDOW', 'PRESET_U_SHAPE', 'PRESET_CROSS'
            ];
            const chosenPreset = presets[Math.floor(Math.random() * presets.length)];
            this.generateGridMap(chosenPreset);
        }

        // --- [1안/2안 적용] 방별 등장 몬스터 풀 설정 ---
        let allowedTypes = ['normal'];
        if (this.roomNum <= 5) {
            allowedTypes = ['normal', 'chaser'];
        } else if (this.roomNum <= 10) {
            allowedTypes = ['normal', 'chaser', 'exploder'];
        } else if (this.roomNum <= 15) {
            allowedTypes = ['normal', 'chaser', 'exploder', 'shooter'];
        } else if (this.roomNum <= 25) {
            allowedTypes = ['normal', 'chaser', 'exploder', 'shooter', 'splitter', 'teleporter'];
        } else if (this.roomNum <= 35) {
            allowedTypes = ['normal', 'chaser', 'exploder', 'shooter', 'splitter', 'teleporter', 'tanker', 'scatterer'];
        } else {
            allowedTypes = ['normal', 'chaser', 'exploder', 'shooter', 'splitter', 'teleporter', 'tanker', 'scatterer', 'summoner', 'healer'];
        }

        // 무작위 2~3종을 골라 풀로 지정
        let poolCount = Math.floor(Math.random() * 2) + 2; // 2~3종
        poolCount = Math.min(poolCount, allowedTypes.length);
        allowedTypes.sort(() => 0.5 - Math.random());
        this.currentRoomMonsterPool = allowedTypes.slice(0, poolCount);
        // --------------------------------------------

        // 플레이어 캐릭터 좌표를 해당 포털 방향의 정반대 문 앞으로 워프 이동 (비밀 포털은 맵 중앙 워프)
        // [신규] 2차원 그리드 프리셋 문 스폰 정보에 맞추어 워프 처리
        const nextPreset = this.currentMapPreset || 'PRESET_SIZE_BOSS';

        let targetOppositeDir = 'center';
        if (this.roomNum % 10 === 0 && !enteringSecretRoom) {
            // 보스전에서는 어느 문으로 들어가도 항상 아래쪽 문에서 등장
            targetOppositeDir = 'bottom';
        } else {
            if (portal.direction === 'top') targetOppositeDir = 'bottom';
            else if (portal.direction === 'bottom') targetOppositeDir = 'top';
            else if (portal.direction === 'left') targetOppositeDir = 'right';
            else if (portal.direction === 'right') targetOppositeDir = 'left';
        }

        let hasWarped = false;
        if (portal.direction !== 'secret' && PORTAL_SPAWN_INFOS[nextPreset]) {
            // 정반대 방향의 문 정보가 있는 경우
            let spawnInfo = PORTAL_SPAWN_INFOS[nextPreset][targetOppositeDir];

            // 만약 정반대 방향 문이 새로운 맵 프리셋에 존재하지 않는다면, 새로운 맵 프리셋에서 사용 가능한 아무 문이나 하나를 임의로 선정
            if (!spawnInfo) {
                const availableDirs = Object.keys(PORTAL_SPAWN_INFOS[nextPreset]);
                if (availableDirs.length > 0) {
                    targetOppositeDir = availableDirs[0];
                    spawnInfo = PORTAL_SPAWN_INFOS[nextPreset][targetOppositeDir];
                }
            }

            if (spawnInfo) {
                // 프리셋에 커스텀 플레이어 스폰 위치가 명시되어 있다면 해당 좌표 사용
                if (spawnInfo.playerSpawnX !== undefined && spawnInfo.playerSpawnY !== undefined) {
                    this.player.x = spawnInfo.playerSpawnX;
                    this.player.y = spawnInfo.playerSpawnY;
                } else {
                    this.player.x = spawnInfo.x;
                    this.player.y = spawnInfo.y;

                    // 문에서 걸어나오는 방향으로 오프셋을 더 줌
                    if (targetOppositeDir === 'top') this.player.y += 60;
                    else if (targetOppositeDir === 'bottom') this.player.y -= 60;
                    else if (targetOppositeDir === 'left') this.player.x += 60;
                    else if (targetOppositeDir === 'right') this.player.x -= 60;
                }
                this.lastEnteredPortalDir = targetOppositeDir;
                hasWarped = true;
            }
        }

        // 맵 중앙 예외 안전 리스폰 (비밀방 복귀 또는 워프 오류 대응)
        if (!hasWarped) {
            this.player.x = this.mapWidth / 2;
            this.player.y = this.mapHeight / 2 + 150;
            this.lastEnteredPortalDir = 'center';
        }

        // [비밀방 출구 포털 룰 적용] 비밀방에 있을 때는 단 하나의 탈출구 문만 랜덤 방향에 생성
        if (this.inSecretRoom) {
            const directions = ['top', 'bottom', 'left', 'right'];
            const chosenDir = directions[Math.floor(Math.random() * 4)];
            const exitPortal = new RoomPortal(chosenDir, this.getRandomScoreValue());

            // 100% 무작위 보상 배정 (스탯, 무기, 장비)
            let types = ['stat', 'weapon', 'equipment'];
            exitPortal.portalType = types[Math.floor(Math.random() * 3)];
            // 난이도는 현재 층수 기준 중간(mid) 이상(high)으로 설정
            exitPortal.difficultyClass = Math.random() < 0.5 ? 'mid' : 'high';
            exitPortal.active = false; // 격퇴 전까지 활성화 잠금

            this.portals = [exitPortal];
        } else {
            // 다음 방의 문 상태 초기화 (전부 몬스터 처치 전까지 잠금 붉은색)
            // [신규] 프리셋에 정의된 유효한 포털 방향만 생성
            const presetName = this.currentMapPreset || 'PRESET_SIZE_BOSS';
            const validDirections = PORTAL_SPAWN_INFOS[presetName] ? Object.keys(PORTAL_SPAWN_INFOS[presetName]) : ['top', 'bottom', 'left', 'right'];

            this.portals = [];
            validDirections.forEach(dir => {
                this.portals.push(new RoomPortal(dir, this.getRandomScoreValue()));
            });

            // [신규 기획] 포털 특화 유형 무작위 분배 (쿨다운 및 확률 가중치 반영)
            let types = this.generatePortalTypes();
            this.portals.forEach((p, idx) => {
                p.portalType = types[idx % types.length];
            });

            this.rankPortals(); // 등급 랭킹화
            this.portals.forEach(p => p.active = false);
        }

        // 탄환 전체 청소 및 기존 몬스터 삭제
        this.bullets = [];
        this.monsters = [];
        this.particles = [];
        this.potions = []; // [추가] 방 이동 시 드롭된 물약 청소
        this.coinsList = []; // [W-08 신규 구현] 방 이동 시 코인 청소
        this.secretWalls = []; // [Phase 7 신규 구현] 방 이동 시 비밀 벽 청소
        this.secretGlitchDevices = []; // 비밀방 상호작용 디바이스 청소
        this.rewardChests = []; // [추가] 이전 방 상자들 삭제
        this.blueprintChests = [];
        this.vendingMachines = []; // [추가] 이전 방 자판기들 삭제
        this.secretVendingMachines = []; // [네온 암시장] 비밀 자판기 청소
        this.weaponMerchants = []; // [신규] 무기 상인 NPC 청소
        this.traps = []; // [신규] 함정 리스트 청소
        this.chargingStations = []; // 충전소 삭제
        this.materialsList = []; // 드롭된 재료 청소
        this.player.perfectClearFlag = true; // [추가] 새 방에 진입 시 퍼펙트 플래그 리셋!
        this.hasRerolledThisRoom = false;   // [신규 기획] 새 방 진입 시 리롤 사용 플래그 리셋!
        this.player.burstRemaining = 0;     // [신규] 방 이동 시 비동기 잔상 사격 완전 차단 리셋!
        // [신규] 이전 방 장애물 청소는 generateGridMap 내부에서 처리되므로 이곳의 중복 리셋 및 구식 장애물 스폰은 삭제합니다.

        // 5번 방 주기마다 보스전 활성화 (5, 10, 15... 100)
        // 10의 배수는 무조건 보스방으로 기동!
        if (enteringSecretRoom) {
            // 비밀방은 보스 및 몬스터 스폰을 전면 스킵하고 보상 디바이스 소환
            this.monsters = [];
            this.spawnQueue = [];
            this.secretGlitchDevices.push(new SecretGlitchDevice(this.mapWidth / 2, this.mapHeight / 2));
        } else if (this.roomNum % 10 === 0) {
            this.setupBossRoom();
        } else {
            // 일반 혹은 엘리트 몬스터 스폰 큐 예약
            this.queueSequentialSpawns(scoreBonus);
        }

        // [Phase 7 신규 구현] 비밀 균열 벽 스폰 (기본 10% 확률로 완화 + 치트 연동)
        // 보스방(10의 배수), 첫 시작방(roomNum === 1), 또는 비밀방 안(inSecretRoom)에서는 절대 스폰하지 않음
        let shouldSpawnSecret = false;
        if (this.roomNum % 10 !== 0 && this.roomNum > 1 && !enteringSecretRoom && !this.inSecretRoom) {
            if (this.forceSecretWallNextRoom) {
                shouldSpawnSecret = true;
                this.forceSecretWallNextRoom = false; // 치트 소모
                // 치트 UI 동기화 해제 처리
                const cheatCheckbox = document.getElementById('cheat-forcesecret');
                if (cheatCheckbox) cheatCheckbox.checked = false;
            } else if (Math.random() < ((this.player && this.player.equipLevels && this.player.equipLevels.goggles >= 5) ? 0.30 : 0.10)) {
                shouldSpawnSecret = true;
            }
        }

        if (shouldSpawnSecret) {
            this.spawnSecretWall();
        }

        this.generateChargingStations();
        this.updateHUD();
        Sound.play('powerup');
        this.saveGame(scoreBonus);
    }

    // 보스 소환 설정
    setupBossRoom() {
        this.monsters = [];
        this.spawnQueue = [];

        let cx = this.mapWidth / 2;

        // 10층 단위로 다채로운 보스 출현 제어
        if (this.roomNum === 10) {
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss');
            this.monsters.push(boss);
        }
        else if (this.roomNum === 20) {
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_chaser');
            this.monsters.push(boss);
        }
        else if (this.roomNum === 30) {
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_slime');
            this.monsters.push(boss);
        }
        else if (this.roomNum === 40) {
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_speaker');
            this.monsters.push(boss);
        }
        else if (this.roomNum === 50) {
            // 10,20,30,40층 보스 중 3마리를 약화시켜 한 번에 출현
            let pool = ['boss', 'boss_chaser', 'boss_slime', 'boss_speaker'];
            pool.sort(() => 0.5 - Math.random());
            let chosen = pool.slice(0, 3);
            let positions = [{ x: this.mapWidth * 0.325, y: 200 }, { x: this.mapWidth * 0.675, y: 200 }, { x: cx, y: 150 }];

            chosen.forEach((type, idx) => {
                let boss = new Monster(positions[idx].x, positions[idx].y, Math.floor(this.roomNum / 5), this.roomNum);
                boss.makeBoss(this.roomNum, type, true);
                this.monsters.push(boss);
            });
            this.currentSpawnTotal = 3;
            this.currentSpawnRemaining = 3;
        }
        else if (this.roomNum === 60) {
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_warper');
            this.monsters.push(boss);
        }
        else if (this.roomNum === 70) {
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_portal');
            this.monsters.push(boss);
        }
        else if (this.roomNum === 80) {
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_hive');
            this.monsters.push(boss);
        }
        else if (this.roomNum === 90) {
            // 90층 웨이브 시스템 기동 (웨이브 1: 60층 보스 약화 버전 스폰)
            this.bossWave = 1;
            this.currentSpawnTotal = 4; // 총 4개의 보스를 잡아야 클리어
            this.currentSpawnRemaining = 4;

            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_warper', true); // 약화 소환
            this.monsters.push(boss);

            // [추가] 90층 보스전 1웨이브 시작 안내 메시지 출력 (사용자 오해 방지)
            this.showFloatingText("WAVE 1: 보이드 워퍼 🌀 (90층 보스 시련 시작)", cx, 250, '#00ffcc');
        }
        else if (this.roomNum === 100) {
            // 최종 보스 (100층 포탑은 보스 생성자 내부에서 자체 소환)
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 100, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_final');
            this.monsters.push(boss);
        }
        else if (this.roomNum === 101) {
            // 101층 진 최종 보스 (크로노스 리얼 마스터) 스폰
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum, 'boss_real_master');
            this.monsters.push(boss);

            // 101층은 텅 빈 보스방 구조로 맵을 갱신
            this.currentMapPreset = 'PRESET_SIZE_BOSS';
            this.generateGridMap(this.currentMapPreset);
        } else {
            // 예외 방어코드
            this.currentSpawnTotal = 1;
            this.currentSpawnRemaining = 1;
            const boss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
            boss.makeBoss(this.roomNum);
            this.monsters.push(boss);
        }

        // 보스 출현 경고음 및 화면 강한 진동
        this.shakeScreen(90, 8); // 보스룸 진입 시 1.5초간 대진동
        this.bossWarningTimer = 180; // 3초간 경보 빔 유지

        // 긴박한 사이렌 저음 경고음 3회 틱틱 재생
        Sound.play('boss_alert');
        setTimeout(() => Sound.play('boss_alert'), 450);
        setTimeout(() => Sound.play('boss_alert'), 900);
    }

    // 몬스터 순차 스폰 큐 준비
    queueSequentialSpawns(totalCount) {
        this.spawnQueue = [];
        this.currentSpawnTotal = totalCount;
        this.currentSpawnRemaining = totalCount;

        // [수정] 2차원 그리드 프리셋에 있는 유효한 문 방향만 스폰 대상으로 설정
        const presetName = this.currentMapPreset || 'PRESET_SIZE_BOSS';
        const validDirs = PORTAL_SPAWN_INFOS[presetName] ? Object.keys(PORTAL_SPAWN_INFOS[presetName]) : ['top', 'bottom', 'left', 'right'];
        const spawnDirections = validDirs.filter(dir => dir !== this.lastEnteredPortalDir);
        // 만약 유효한 문 방향이 없다면 (예외 처리) 전체 validDirs 사용
        if (spawnDirections.length === 0 && validDirs.length > 0) {
            spawnDirections.push(...validDirs);
        } else if (spawnDirections.length === 0) {
            spawnDirections.push('left', 'right'); // 폴백
        }

        let remainingToSpawn = totalCount;

        // [엘리트 기믹] 만약 엘리트 방이고 다음 방이 5의 배수 방이면 처음에 녹색 거대 엘리트 몬스터 스폰 예약 삽입
        if (this.isEliteRoom) {
            let eliteCount = Math.floor(this.roomNum / 35) + 1; // 35스테이지 단위당 마릿수 확장
            for (let e = 0; e < eliteCount; e++) {
                let randomDir = spawnDirections[Math.floor(Math.random() * spawnDirections.length)];
                let spawnCoords = this.getSpawnCoordinates(randomDir);
                this.spawnQueue.push({
                    size: 1,
                    x: spawnCoords.x,
                    y: spawnCoords.y,
                    delay: 20,
                    forceElite: true // 엘리트 속성 소환 유도
                });
            }
        }

        // 1마리 ~ 5마리 사이의 몬스터 팩(Pac) 단위로 소량 쪼개어 스폰 큐에 담아 순차 출현
        while (remainingToSpawn > 0) {
            let pacSize = Math.floor(Math.random() * 5) + 1; // 1~5마리
            pacSize = Math.min(pacSize, remainingToSpawn);

            // 3곳 입구 중 무작위 방향 1곳 선택
            let randomDir = spawnDirections[Math.floor(Math.random() * spawnDirections.length)];
            let spawnCoords = this.getSpawnCoordinates(randomDir);

            this.spawnQueue.push({
                size: pacSize,
                x: spawnCoords.x,
                y: spawnCoords.y,
                delay: 30 // 30프레임 간격 (약 0.5초 주기로 순차 스폰하도록 연장)
            });

            remainingToSpawn -= pacSize;
        }

        this.spawnTimer = 0;
    }

    // 방향별 정확한 스폰 시작 좌표 획득
    getSpawnCoordinates(direction) {
        // [수정] 맵 프리셋의 포털 위치(PORTAL_SPAWN_INFOS)를 기반으로 하여 오프셋을 적용한 안전 좌표 계산
        const presetName = this.currentMapPreset || 'PRESET_SIZE_BOSS';
        const info = PORTAL_SPAWN_INFOS[presetName] && PORTAL_SPAWN_INFOS[presetName][direction];
        if (info) {
            // 프리셋에 커스텀 몬스터 스폰 위치가 명시되어 있다면 해당 좌표 사용
            if (info.monsterSpawnX !== undefined && info.monsterSpawnY !== undefined) {
                return { x: info.monsterSpawnX, y: info.monsterSpawnY };
            }
            let offset = 60; // 문에서 맵 안쪽으로 향하는 거리
            if (direction === 'top') return { x: info.x, y: info.y + offset };
            if (direction === 'bottom') return { x: info.x, y: info.y - offset };
            if (direction === 'left') return { x: info.x + offset, y: info.y };
            if (direction === 'right') return { x: info.x - offset, y: info.y };
        }

        // [폴백] 맵의 가변 해상도(this.mapWidth, this.mapHeight)를 연동하여 문 입구 스폰 지점을 연산합니다.
        if (direction === 'top') return { x: this.mapWidth / 2, y: 55 };
        if (direction === 'bottom') return { x: this.mapWidth / 2, y: this.mapHeight - 75 };
        if (direction === 'left') return { x: 55, y: this.mapHeight / 2 };
        return { x: this.mapWidth - 75, y: this.mapHeight / 2 }; // right
    }

    // 매 프레임마다 스폰 큐에서 몬스터 한 묶음씩 뿜어내기
    processSpawnQueue() {
        if (this.spawnQueue.length === 0) return;

        // [3차 피드백] 방식 3: 10마리 이상 스폰되면 정지하고 다 처치되면 소환 재개
        if (this.spawnMethod === 3 && this.spawnedInRoom >= 10) {
            // 필드의 몬스터가 전부 소탕될 때까지 다음 팩 스폰을 보류(정지)
            if (this.monsters.length > 0) {
                return; // 정지 상태 유지
            } else {
                // 적이 전부 소탕되었으므로 이번 방 스폰 누적 마리수를 리셋하여 다음 스폰 활성화
                this.spawnedInRoom = 0;
            }
        }

        this.spawnTimer++;

        let currentPac = this.spawnQueue[0];
        if (this.spawnTimer >= currentPac.delay) {
            // 이번 주기 몬스터 소환
            for (let i = 0; i < currentPac.size; i++) {
                // 소환 흩어짐 폭을 더 넓게 설정하여 과도한 뭉침 방지 (80px 반경 분산)
                let rx = currentPac.x + (Math.random() * 80 - 40);
                let ry = currentPac.y + (Math.random() * 80 - 40);

                // [수정] 흩뿌려진 좌표가 격벽이나 외벽 안쪽이라면, 안전한 문 입구 좌표(currentPac)로 보정
                if (this.isTileWall(rx, ry)) {
                    rx = currentPac.x;
                    ry = currentPac.y;
                }

                // 5개 방마다 몬스터 등급 티어 상승 계산식
                let currentTier = Math.floor((this.roomNum - 1) / 5) + 1;
                let enemy = new Monster(rx, ry, currentTier, this.roomNum);

                // 강제 엘리트 몬스터 처리
                if (currentPac.forceElite) {
                    enemy.makeElite();
                }

                this.monsters.push(enemy);

                // 소환되는 문 입구 스파크 파티클 효과 연출
                for (let k = 0; k < 6; k++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = Math.random() * 2 + 1;
                    this.particles.push(new Particle(rx, ry, enemy.color, 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 25));
                }
            }

            // 스폰된 몬스터 개수를 카운터에 기록
            this.spawnedInRoom += currentPac.size;

            // [3차 피드백] 방식 2: 10마리 스폰 도달 시 다음 소환 타이밍을 임시 2초(120프레임)로 지연
            if (this.spawnMethod === 2 && this.spawnedInRoom >= 10 && !this.method2DelayDone) {
                // 현재 타이머를 -90으로 당겨서, 다음 소환까지 120프레임(2초)이 걸리도록 강제 지연
                this.spawnTimer = -90;
                this.method2DelayDone = true; // 지연 먹임 처리
            } else {
                this.spawnTimer = 0;
            }

            // 이번 스폰 팩 완료 처리 및 큐에서 제거
            this.spawnQueue.shift();

            // 소환 피드백 화면 진동
            this.shakeScreen(5, 2);
        }
    }

    // 마력 풀 충전 시 발동 가능한 플레이어 장착 마법 특수기
    triggerMagicSkill() {
        if (this.player.magicType === 'explosion') {
            // [개선] 100% 전체 소모가 아닌 고정 100 MP 이상 시 시전 가능
            if (this.player.mp < 100) {
                this.showFloatingText("NEED 100+ MP", this.player.x, this.player.y - 20, '#ff0055');
                return;
            }

            // [신규 기획] Mana Helm 5레벨 돌파: 20% 확률로 마나 무료 시전!
            let isFreeMana = false;
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                isFreeMana = true;
                this.showFloatingText("FREE MANA CAST!", this.player.x, this.player.y - 30, '#00f0ff');
            }

            // [개선] 마력 100 MP 고정 차감 (maxMp가 크면 연속 시전 가능)
            if (!isFreeMana) {
                this.player.mp = Math.max(0, this.player.mp - 100);
            }
            this.shakeScreen(40, 10);
            Sound.play('explosion');

            const explosionRadius = 180 + (this.player.atk * 1.5); // 데미지에 비례한 파괴 반경
            const explosionDamage = this.player.atk * 3.5; // 폭발적 한방 피해량

            // 마법 네온 충격파 고리 파티클 생성
            this.particles.push(new Particle(this.player.x, this.player.y, '#b026ff', explosionRadius, 0, 0, 45, 'explosionRing'));

            // 반경 내 모든 몬스터 피해 적용
            for (let i = this.monsters.length - 1; i >= 0; i--) {
                let m = this.monsters[i];
                let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                if (dist < explosionRadius) {
                    let finalDmg = explosionDamage;
                    if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                    m.hp -= finalDmg;
                    m.flashTimer = 8;

                    // [버그 수정] 마법 폭발 충격파 대미지로 사망 시 정산 처리 추가
                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }

                    // 플레이어 중심 바깥으로 강력한 넉백 기동
                    let angle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                    m.knockbackX = Math.cos(angle) * 8;
                    m.knockbackY = Math.sin(angle) * 8;
                    m.isPlayerKnockback = true;

                    // 폭발 파티클 조각
                    for (let k = 0; k < 8; k++) {
                        let spd = Math.random() * 5 + 2;
                        this.particles.push(new Particle(m.x, m.y, '#b026ff', 3, Math.cos(angle + Math.random() - 0.5) * spd, Math.sin(angle + Math.random() - 0.5) * spd, 30));
                    }
                }
            }
            // 문 및 게이지 강제 갱신
            this.updateHUD();
        }
        else if (this.player.magicType === 'timeWarp') {
            // [수정] 이미 활성화된 상태라면 수동 비활성화 차단 (마나가 0이 될 때까지 강제 사용)
            if (this.timeDilationActive) {
                this.showFloatingText("CANNOT STOP WARP", this.player.x, this.player.y - 25, '#ff0055');
                return;
            }

            // [개선] 50 MP가 아닌 100 MP 이상일 때 발동 가능하게 밸런스 상향 일치
            if (this.player.mp < 100) {
                this.showFloatingText("NEED 100+ MP", this.player.x, this.player.y - 20, '#ff0055');
                return;
            }

            // [신규 기획] Mana Helm 5레벨 돌파: 20% 확률로 마나 무료 시전! (시간 왜곡 지속 소모 면제)
            this.timeWarpFreeCastActive = false;
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                this.timeWarpFreeCastActive = true;
                this.showFloatingText("FREE MANA WARP!", this.player.x, this.player.y - 30, '#00f0ff');
            }

            this.timeDilationActive = true;
            this.shakeScreen(25, 4);
            this.showFloatingText("🔮 TIME WARP ACTIVE", this.player.x, this.player.y - 30, '#b026ff');

            // 시간왜곡 발동 피드백 아르페지오 사운드 재생
            Sound.play('victory');
        }
    }

    // [모델 C] 플레이어의 보상 카드 빌드 시너지를 감지해 대미지 곱연산 배율 및 텍스트/파편 효과 적용
    checkBuildSynergy(type = 'gun') {
        const p = this.player;
        let synergyMultiplier = 1.0;
        let synergyName = "";
        let synergyColor = "#00f0ff";

        if (type === 'gun') {
            // 1. [네온 탄막 초토화 폭격기 (Neon Bomber)]
            // 조건: 멀티샷 3발 이상, 유도 추적탄 보유, 스플래시 대폭발 반경 보유
            if (p.multishot >= 3 && p.homing && p.splashRadius > 0) {
                synergyMultiplier = 1.17; // 3차 밸런싱 패치 (증가분 50% 하향: 1.35 -> 1.17)
                synergyName = "💥 NEON BOMBER!";
                synergyColor = '#ffdf00'; // 황금 옐로우
            }
            // 2. [샷건 전탄 집중 화력 (Shotgun Burst)]
            // 조건: 멀티샷 2발 이상, 힘(ATK) 25 이상 (폭격기 하위 호환)
            else if (p.multishot >= 2 && p.atk >= 25) {
                synergyMultiplier = 1.05; // 3차 밸런싱 패치 (증가분 50% 하향: 1.10 -> 1.05)
                synergyName = "🏹 SHOTGUN BURST!";
                synergyColor = '#00f0ff'; // 시안
            }
        } else if (type === 'sword') {
            // 3. [질풍의 마력 네온 검사 (Neon Tempest)]
            // 조건: 검 또는 듀얼 소유, 공격속도(지능) 1.6 이상, 힘(공격력) 20 이상
            let hasSword = (p.weaponType === 'crude_sword' || p.weaponType === 'plasma_saber');
            if ((hasSword) && p.aspd >= 1.6 && p.atk >= 20) {
                synergyMultiplier = 1.12; // 3차 밸런싱 패치 (증가분 50% 하향: 1.25 -> 1.12)
                synergyName = "🪓 NEON TEMPEST!";
                synergyColor = '#b026ff'; // 퍼플
            }
            // 4. [차원 유도 환영검 (Spectral Blade)]
            // 조건: 검 또는 듀얼 소유, 유도 추적 보유
            else if ((hasSword) && p.homing) {
                synergyMultiplier = 1.07; // 3차 밸런싱 패치 (증가분 50% 하향: 1.15 -> 1.07)
                synergyName = "🔮 SPECTRAL BLADE!";
                synergyColor = '#ff0055'; // 마젠타
            }
        }

        // 시너지가 성사되었고 60fps 중 약 1.5% 확률로 전투를 저해하지 않는 팝업 피드백 연출
        if (synergyMultiplier > 1.0 && Math.random() < 0.015) {
            this.showFloatingText(synergyName, p.x, p.y - 30, synergyColor);

            // 시너지 발동 오라 네온 파티클
            for (let k = 0; k < 4; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 2 + 1;
                this.particles.push(new Particle(p.x, p.y, synergyColor, 3, Math.cos(angle) * speed, Math.sin(angle) * speed, 25));
            }
        }

        return synergyMultiplier;
    }

    // 화면 진동 함수
    shakeScreen(frames, intensity) {
        // [수정] 옵션 세기가 0%이면 즉시 리턴하여 불필요한 연산 차단
        if (this.shakeScale === undefined) this.shakeScale = 1.0;
        if (this.shakeScale <= 0) return;

        if (this.recentShakeCount === undefined) this.recentShakeCount = 0;

        // 흔들림 요청 횟수 증가
        this.recentShakeCount++;

        // 짧은 시간 내에 연속으로 흔들림이 요청될수록 강도를 지수적으로 감쇄
        // 1회차: 100%, 2회차: 66%, 5회차: 33%, 10회차: 18% 수준으로 흔들림 약화
        let decayFactor = 1 / (1 + (this.recentShakeCount - 1) * 0.5);
        let finalIntensity = intensity * decayFactor * this.shakeScale; // [최적화] 유저 옵션 shakeScale 스케일링 배율 적용

        // [최적화] 이미 화면이 더 강하게 흔들리는 중이면 리셋 방지하여 렌더링 떨림 부하 경감
        // 보정 전 순수 감쇄 강도로 비교하여 다단히트 시 가드 기능이 비정상적으로 무력화되는 오동작 방지
        if (this.shakeTimer > 0 && finalIntensity <= this.shakeIntensity) {
            return;
        }

        // [최적화] 가드를 무사히 통과한 경우에 한해 최소 인지 흔들림 세기 임계값(0.5 픽셀)을 보장하여 0%처럼 작동하는 현상 방지
        if (finalIntensity > 0 && finalIntensity < 0.5) {
            finalIntensity = 0.5;
        }

        this.shakeTimer = frames;
        this.shakeIntensity = Math.min(5.0, finalIntensity); // 최대 진동 강도를 5.0으로 캡핑
    }

    // --------------------------------------------------------------------------
    // 8. 60FPS 메인 게임 루프 엔진
    // --------------------------------------------------------------------------
    gameLoop() {
        const currentTime = performance.now();
        let deltaTime = currentTime - this.lastTime;

        // 브라우저 백그라운드 탭 전환 등으로 인한 과도한 시간 누적 방지 (최대 100ms 가드)
        if (deltaTime > 100) {
            deltaTime = this.timestep;
        }

        this.lastTime = currentTime;
        this.accumulatedTime += deltaTime;

        // 누적 시간이 60FPS 타임스텝보다 크면 그만큼만 update 실행 (고주사율에서도 60FPS 속도 보장)
        while (this.accumulatedTime >= this.timestep) {
            if (this.isPlaying) {
                this.update();
            }
            this.accumulatedTime -= this.timestep;
        }

        // 렌더링은 사용자의 모니터 프레임에 맞춰 매끄럽게 수행
        this.render();

        // 루프 ID를 보관하여 중복 재구동 시 안전하게 캔슬할 수 있도록 바인딩합니다.
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    // 데이터 갱신 및 물리/충돌 검사 총괄
    update() {
        // [신규 추가] 1. 통합 오버레이 일시정지(Freeze) 체크 및 동결 엔진
        let isOverlayOpen = false;
        const rewardOverlay = document.getElementById('reward-overlay');
        const blueprintOverlay = document.getElementById('blueprint-overlay'); // [신규] 설계도 오버레이 추가
        const detailOverlay = document.getElementById('card-detail-overlay');
        const shopOverlay = document.getElementById('shop-confirm-overlay');
        const resultOverlay = document.getElementById('result-overlay');
        const startOverlay = document.getElementById('start-overlay');
        const cheatOverlay = document.getElementById('cheat-overlay');
        const optionOverlay = document.getElementById('option-overlay'); // [신규] 시스템 옵션 모달 연동
        const secretShopOverlay = document.getElementById('secret-shop-overlay'); // [결함 수정] 네온 암시장 모달 검증 변수 추가
        const statusOverlay = document.getElementById('in-game-status-overlay'); // [신규] 인게임 상태창 모달
        const storyOverlay = document.getElementById('story-dialogue-overlay'); // [신규] 스토리 대화 오버레이

        if ((rewardOverlay && !rewardOverlay.classList.contains('hidden')) ||
            (blueprintOverlay && !blueprintOverlay.classList.contains('hidden')) || // [신규] 설계도 오버레이 조건 추가
            (detailOverlay && !detailOverlay.classList.contains('hidden')) ||
            (shopOverlay && !shopOverlay.classList.contains('hidden')) ||
            (resultOverlay && !resultOverlay.classList.contains('hidden')) ||
            (startOverlay && !startOverlay.classList.contains('hidden')) ||
            (cheatOverlay && !cheatOverlay.classList.contains('hidden')) ||
            (optionOverlay && !optionOverlay.classList.contains('hidden')) ||
            (statusOverlay && !statusOverlay.classList.contains('hidden')) ||
            this.isDialogueActive || // [수정] 대화창 존재 유무가 아닌 실제 활성 대화 중인지를 체크
            (secretShopOverlay && !secretShopOverlay.classList.contains('hidden'))) { // [결함 수정] 암시장 오버레이 조건식 반영
            isOverlayOpen = true;
        }

        // 레이어 팝업이 활성화되어 있으면 즉시 루프를 리턴 차단하여 물리적인 시간을 완벽하게 얼려버립니다.
        if (isOverlayOpen) {
            return;
        }

        // [신규 추가] Hit Stop(역경직) 감쇠 및 물리 업데이트 일시 정지 (이때 BGM 피치도 동시 연동)
        if (this.hitStopFrames > 0) {
            this.hitStopFrames--;
            if (typeof Sound !== 'undefined') {
                Sound.bgmPitchScale = 0.55;
            }
            return;
        } else {
            if (typeof Sound !== 'undefined' && Sound.bgmPitchScale !== 1.0) {
                Sound.bgmPitchScale = 1.0;
            }
        }

        // [신규 추가] Hit Stop 쿨다운 타이머 매 프레임 감쇠
        if (this.hitStopCooldown > 0) {
            this.hitStopCooldown--;
        }

        // [신규 기믹] 보상 상자 획득 시 3선택1 카드 보상창 팝업 지연 연출 업데이트
        if (this.rewardSelectorDelayTimer > 0) {
            this.rewardSelectorDelayTimer--;
            if (this.rewardSelectorDelayTimer === 0) {
                this.rewardSelectorDelayTimer = -1;
                this.enqueueReward({ type: 'reward', isFromHiddenChest: this.rewardSelectorIsFromHiddenChest });
            }
        }

        // [최적화] 프레임당 스플래시 연산/이펙트 캡핑용 카운터 초기화
        this.frameSplashCount = 0;
        this.frameHitSparkCount = 0;
        this.frameChainCount = 0;
        this.frameSpawnedDeathParticles = 0; // [최적화] 프레임당 몬스터 사망 파티클 카운터 초기화

        // [최적화] 최근 화면 흔들림 요청 감쇄 (다단히트 화면 흔들림 멀미/렉 방지)
        if (this.recentShakeCount === undefined) this.recentShakeCount = 0;
        if (this.recentShakeCount > 0) {
            this.recentShakeCount = Math.max(0, this.recentShakeCount - 0.25); // 매 프레임 0.25씩 자연스럽게 감쇄 (약 1초당 15회 감쇄)
        }

        this.player.update();
        if (this.player.thirdSlotWeaponCooldown > 0) {
            this.player.thirdSlotWeaponCooldown--;
        }

        // 드롭 부품 재료 업데이트 및 플레이어 습득 처리
        for (let i = this.materialsList.length - 1; i >= 0; i--) {
            let mat = this.materialsList[i];
            mat.update(this.player);

            // 플레이어 획득 검사
            let dist = Math.hypot(this.player.x - mat.x, this.player.y - mat.y);
            if (dist < this.player.radius + mat.radius) {
                // 획득 성공!
                this.player.materials[mat.type]++;
                this.showFloatingText(`+1 ${mat.name} 🔧`, this.player.x, this.player.y - 35, '#39ff14');
                Sound.play('coin');
                this.materialsList.splice(i, 1);
            }
        }

        // 충전 스테이션 상호작용 및 MP 충전 로직
        this.nearChargingStation = false;
        let baseChargeRate = 0.02; // 매우매우 천천히 충전되는 기본 속도 (프레임당 0.02)
        let chargeRate = baseChargeRate * (1 + (this.chargingStationLevel - 1) * 0.5);

        for (let cs of this.chargingStations) {
            let dist = Math.hypot(this.player.x - cs.x, this.player.y - cs.y);
            if (dist < cs.radius + this.player.radius) {
                this.nearChargingStation = true;

                // 플레이어 MP 충전
                if (this.player.mp < this.player.maxMp) {
                    this.player.mp = Math.min(this.player.maxMp, this.player.mp + chargeRate);

                    // 충전 스파크 파티클 생성
                    if (Math.random() < 0.25) {
                        let sparkAngle = Math.random() * Math.PI * 2;
                        let sparkDist = Math.random() * cs.radius;
                        let sx = cs.x + Math.cos(sparkAngle) * sparkDist;
                        let sy = cs.y + Math.sin(sparkAngle) * sparkDist;
                        // 플레이어 방향으로 날아가는 파티클 속도 연산
                        let pAngle = Math.atan2(this.player.y - sy, this.player.x - sx);
                        this.particles.push(new Particle(
                            sx, sy,
                            '#00d0ff', 1.2,
                            Math.cos(pAngle) * 2, Math.sin(pAngle) * 2,
                            15, 'spark'
                        ));
                    }
                }
            }
        }

        // 충전소 범위를 벗어나면 열려있는 제작소 UI 강제 종료
        if (!this.nearChargingStation) {
            const craftingOverlay = document.getElementById('crafting-overlay');
            if (craftingOverlay && !craftingOverlay.classList.contains('hidden')) {
                craftingOverlay.classList.add('hidden');
                Sound.play('hit');
            }
        }

        // 레일 캐논 격발 타이밍 검사 (18프레임 차징 만료 직전인 1일 때 발사)
        if (this.player.isRailActive && this.player.railChargeTimer === 1) {
            let wLvl = this.player.weaponLevels.railcannon || 1;
            let dmg = this.player.atk * 2.5 * (1 + (wLvl - 1) * 0.15);
            this.triggerRailCannonBeam(this.player.railAngle, dmg);

            // 융합 시너지: 주(레일) + 부(검/총)
            let secondary = this.player.equippedWeapons[1];
            if (secondary === 'sword') {
                this.triggerRailSwordSynergy(this.player.railAngle);
            } else if (secondary === 'gun') {
                this.triggerRailGunSynergy(this.player.railAngle);
            }
        }
        if (this.vendingCooldown > 0) this.vendingCooldown--; // [신규 기획] 자판기 구매 쿨타임 매 프레임 감쇠
        if (this.bossWarningTimer > 0) this.bossWarningTimer--; // [v0.95] 보스 경보 타이머 프레임 감소

        // [신규] 프레임 기반 점사/난무 연속 격발 처리 (잔상 사격 버그 박멸 완료)
        if (this.player.burstRemaining > 0 && !isOverlayOpen) {
            this.player.burstIntervalTimer++;
            if (this.player.burstIntervalTimer >= 5) { // 약 0.08초 간격 (5프레임)
                this.player.burstIntervalTimer = 0;
                this.player.burstRemaining--;

                if (this.player.burstType === 'gun') {
                    // 총 탄환 팩 격발
                    let activeMagics = [];
                    if (this.player.weaponLevels.fire > 0) activeMagics.push('fire');
                    if (this.player.weaponLevels.ice > 0) activeMagics.push('ice');
                    if (this.player.weaponLevels.lightning > 0) activeMagics.push('lightning');

                    let isLightning = (this.player.weaponType === 'crude_shock' || this.player.weaponType === 'chain_emp_shock');
                    let isFire = (this.player.weaponType === 'crude_flamethrower' || this.player.weaponType === 'fusion_plasma_cannon');
                    let isIce = (this.player.weaponType === 'crude_cryo' || this.player.weaponType === 'cryo_freezer');
                    let isDual = false;

                    let synergyMult = this.checkBuildSynergy('gun');
                    let helmDmgBonus = (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) ? 1.25 : 1.0;
                    let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;

                    // [2차 밸런스 패치] 멀티샷 및 점사 개수에 따른 대미지 역보정(감쇄) 연동 적용
                    let multishotDmgFactor = Math.max(0.5, 1.0 - (this.player.multishot - 1) * 0.08);
                    let burstDmgFactor = Math.max(0.6, 1.0 - (this.player.burstCount - 1) * 0.05);

                    let finalDamage = this.player.atk * (isLightning ? 0.9 : 1.0) * synergyMult * helmDmgBonus * speedRingDmgBonus * multishotDmgFactor * burstDmgFactor;

                    for (let angle of this.player.burstBulletsToLaunch) {
                        let bulletIsLightning = isLightning;
                        let bulletIsFire = isFire;
                        let bulletIsIce = isIce;
                        if (isDual || activeMagics.length > 0) {
                            let pool = [...activeMagics];
                            if (pool.length > 0) {
                                let chosen = pool[Math.floor(Math.random() * pool.length)];
                                if (chosen === 'lightning') {
                                    bulletIsLightning = true;
                                    bulletIsFire = false;
                                    bulletIsIce = false;
                                } else if (chosen === 'fire') {
                                    bulletIsLightning = false;
                                    bulletIsFire = true;
                                    bulletIsIce = false;
                                } else if (chosen === 'ice') {
                                    bulletIsLightning = false;
                                    bulletIsFire = false;
                                    bulletIsIce = true;
                                }
                            } else {
                                bulletIsLightning = false;
                                bulletIsFire = false;
                                bulletIsIce = false;
                            }
                        }

                        let speed = bulletIsLightning ? 8.5 : (bulletIsFire ? 6.2 : (bulletIsIce ? 7.5 : 7.0));
                        let vx = Math.cos(angle) * speed;
                        let vy = Math.sin(angle) * speed;
                        let bulletLife = this.player.range / speed;

                        let bulletRadius = bulletIsLightning ? 5.5 : (bulletIsFire ? 7.0 : (bulletIsIce ? 5.0 : 4));
                        if (this.player.equipLevels.gloves >= 5 && !bulletIsLightning && !bulletIsFire && !bulletIsIce) {
                            bulletRadius = 4.8;
                        }

                        this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                            pierce: this.player.pierceCount + (bulletIsIce ? 1 : 0),
                            homing: this.player.homing,
                            homingSpeed: this.player.homingAngleSpeed,
                            splash: this.player.splashRadius + (bulletIsFire ? 30 : 0),
                            color: bulletIsFire ? '#ff5e00' : (bulletIsIce ? '#00f0ff' : (bulletIsLightning ? '#ffdf00' : '#00f0ff')),
                            radius: bulletRadius,
                            life: bulletLife,
                            isLightning: bulletIsLightning,
                            isFire: bulletIsFire,
                            isIce: bulletIsIce,
                            bounceLimit: (!bulletIsLightning && !bulletIsFire && !bulletIsIce) ? this.player.wallBounceLimit : 0,
                            monsterBounceLimit: (!bulletIsLightning && !bulletIsFire && !bulletIsIce) ? this.player.monsterBounceLimit : 0
                        }));
                    }
                    Sound.play('shoot');
                    this.shakeScreen(3, (isLightning || isFire || isIce) ? 1.5 : 1.2);
                }
                else if (this.player.burstType === 'melee') {
                    // [근접 무기 융합 난무 격발]
                    let startAngle = this.player.angle;
                    let hasSword = (this.player.weaponLevels.sword > 0);
                    let hasSpear = (this.player.weaponLevels.spear > 0);
                    let hasWhip = (this.player.weaponLevels.whip > 0);

                    let swordAngles = [];
                    let whipAngles = [];
                    let spearAngles = [];

                    // 각도 재계산
                    if (this.player.multishot === 1) {
                        swordAngles.push(startAngle);
                    } else {
                        let arcSpan = this.player.multishotArc;
                        let step = arcSpan / (this.player.multishot - 1);
                        for (let i = 0; i < this.player.multishot; i++) {
                            swordAngles.push(startAngle - (arcSpan / 2) + (step * i));
                        }
                    }

                    let whipMultiArc = 0.15 + (this.player.multishot - 1) * 0.03 + (this.player.weaponUnlocks.whip.multi ? 0.10 : 0);
                    if (this.player.multishot === 1) {
                        whipAngles.push(startAngle);
                    } else {
                        let step = whipMultiArc / (this.player.multishot - 1);
                        for (let i = 0; i < this.player.multishot; i++) {
                            whipAngles.push(startAngle - (whipMultiArc / 2) + (step * i));
                        }
                    }

                    if (this.player.weaponUnlocks.spear.multi) {
                        spearAngles = [startAngle - 0.2, startAngle, startAngle + 0.2];
                    } else {
                        spearAngles = [startAngle];
                    }

                    // 1. 창 즉발 및 투사체 융합
                    if (hasSpear) {
                        this.player.isSpearActive = true;
                        this.player.spearTimer = 8;
                        this.player.spearAngle = startAngle;
                        this.player.spearAngles = [...spearAngles];

                        let targetRange = 80 + (this.player.range - 350) * 0.3;
                        if (this.player.weaponUnlocks.spear.range) targetRange += 20;

                        for (let angle of spearAngles) {
                            for (let i = 0; i < 6; i++) {
                                let distOffset = i * (targetRange / 6);
                                let px = this.player.x + Math.cos(angle) * distOffset;
                                let py = this.player.y + Math.sin(angle) * distOffset;
                                let vx = Math.cos(angle) * 3;
                                let vy = Math.sin(angle) * 3;
                                this.particles.push(new Particle(px, py, '#00f0ff', 1.8, vx, vy, 12, 'dust'));
                            }
                        }
                        this.triggerSpearInstantAttack(spearAngles);

                        let synergyMult = this.checkBuildSynergy('spear');
                        let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
                        let baseMult = 0.7;
                        let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;
                        let spearDmg = this.player.atk * baseMult * synergyMult * this.player.swordDmgUpgrade * speedRingDmgBonus * hybridDmgFactor;

                        for (let angle of spearAngles) {
                            let speed = 10.0;
                            let vx = Math.cos(angle) * speed;
                            let vy = Math.sin(angle) * speed;
                            this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, spearDmg, true, {
                                pierce: Math.min(5, this.player.pierceCount + 2),
                                homing: this.player.homing,
                                homingSpeed: this.player.homingAngleSpeed,
                                splash: this.player.splashRadius,
                                color: '#00f0ff',
                                radius: 6,
                                isSpear: true
                            }));
                        }
                    }

                    // 2. 채찍 즉발 융합
                    if (hasWhip) {
                        this.player.isSlashActive = true;
                        this.player.slashTimer = 12;
                        this.player.slashAngle = startAngle;
                        this.player.slashAngles = [...whipAngles];

                        let radius = this.player.weaponUnlocks.whip.range ? 220 : 150;
                        for (let angle of whipAngles) {
                            for (let i = 0; i < 8; i++) {
                                let t = i / 8;
                                let dist = radius * t;
                                let wave = Math.sin(t * Math.PI * 2) * 15;
                                let px = this.player.x + Math.cos(angle) * dist - Math.sin(angle) * wave;
                                let py = this.player.y + Math.sin(angle) * dist + Math.cos(angle) * wave;
                                let vx = Math.cos(angle) * 1.5;
                                let vy = Math.sin(angle) * 1.5;
                                this.particles.push(new Particle(px, py, '#ff00aa', 1.8, vx, vy, 15, 'dust'));
                            }
                        }
                        this.triggerWhipInstantAttack(whipAngles);
                    }

                                        // 3. 검 이펙트 및 검기 투사체 융합
                    if (hasSword) {
                        let isAdvanced = (String(this.player.weaponType) === 'plasma_saber');
                        this.player.swordAttackType = isAdvanced ? 'slash' : 'thrust';
                        this.player.isSlashActive = true;
                        this.player.slashTimer = 12;
                        this.player.slashAngle = startAngle;
                        this.player.slashAngles = isAdvanced ? [...swordAngles] : [startAngle];

                        for (let angle of swordAngles) {
                            for (let i = -5; i <= 5; i++) {
                                let offset = angle + (i * 0.15);
                                let px = this.player.x + Math.cos(offset) * 25;
                                let py = this.player.y + Math.sin(offset) * 25;
                                let vx = Math.cos(offset) * 2;
                                let vy = Math.sin(offset) * 2;
                                this.particles.push(new Particle(px, py, '#b026ff', 2, vx, vy, 15, 'slashWave'));
                            }
                        }

                                                let synergyMult = this.checkBuildSynergy('sword');
                        let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
                        let baseMult = 0.8;
                        let swordDmg = this.player.atk * baseMult * synergyMult * speedRingDmgBonus * this.player.swordDmgUpgrade;

                        // [추가] 조잡한 무기 즉발 물리 타격 적용\r\n                        this.triggerSwordInstantAttack(isAdvanced ? swordAngles : [startAngle], swordDmg);

                        if (isAdvanced) {
                            for (let angle of swordAngles) {
                                let speed = 6.0;
                                let vx = Math.cos(angle) * speed;
                                let vy = Math.sin(angle) * speed;
                                this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, swordDmg, true, {
                                    pierce: Math.min(5, this.player.pierceCount + 1),
                                    homing: this.player.homing,
                                    homingSpeed: this.player.homingAngleSpeed,
                                    splash: this.player.splashRadius,
                                    color: '#b026ff',
                                    radius: 5
                                }));
                            }
                                            }
                }

                Sound.play('slash');
                    if (hasSword) {
                        this.shakeScreen(5, 2.5);
                    } else if (hasSpear) {
                        this.shakeScreen(4, 1.8);
                    } else if (hasWhip) {
                        this.shakeScreen(4, 1.5);
                    }
                }
            }
        }

        // [W-10 함정설치 지뢰/레이저 주기적 드롭 및 설치]
        if (this.player.weaponLevels.trap > 0 && !isOverlayOpen) {
            let trapLvl = this.player.weaponLevels.trap;
            let mineCd = 240 - (trapLvl * 30); // 1레벨: 210프레임 (3.5초) ~ 5레벨: 90프레임 (1.5초)

            // 지뢰 설치: 가만히 있지 않고 움직이는 동안 레벨에 따른 주기마다 발밑에 매설
            if (!this.player.isStopped) {
                this.mineInstallTimer = (this.mineInstallTimer || 0) + 1;
                if (this.mineInstallTimer >= mineCd) {
                    this.mineInstallTimer = 0;
                    let trapType = (this.player.equippedWeapons[0] === 'crude_trap') ? 'decoy' : 'mine';
                    this.traps.push(new NeonTrap(this.player.x, this.player.y, trapType, this.player));
                    let trapText = (trapType === 'decoy') ? "DECOY PLACED! 🤖" : "MINE PLACED! 💣";
                    let trapColor = (trapType === 'decoy') ? "#ffdf00" : "#00f0ff";
                    this.showFloatingText(trapText, this.player.x, this.player.y - 25, trapColor);
                }
            } else {
                this.mineInstallTimer = 0;
            }

            // 레이저 트립와이어 설치: 5레벨(마스터)인 경우에만 설치, 전투 중이고 몬스터가 있을 때 6초(360프레임) 마다 플레이어 위치 부근에 벽 가로지르도록 매설
            if (trapLvl === 5 && (this.monsters.length > 0 || this.spawnQueue.length > 0)) {
                this.laserInstallTimer = (this.laserInstallTimer || 0) + 1;
                if (this.laserInstallTimer >= 360) {
                    this.laserInstallTimer = 0;

                    let type = Math.random() < 0.5 ? 'laser_h' : 'laser_v';
                    let lx = this.player.x;
                    let ly = this.player.y;

                    // [수정] 가변 맵 크기를 참조하여 레이저 빔 가이드 선이 벽 밖으로 나가지 않도록 연동합니다.
                    lx = Math.max(50, Math.min(this.mapWidth - 50, lx));
                    ly = Math.max(50, Math.min(this.mapHeight - 50, ly));

                    this.traps.push(new NeonTrap(lx, ly, type, this.player));
                    this.showFloatingText("LASER WIRE SET! ⚡", this.player.x, this.player.y - 25, '#00f0ff');
                }
            } else {
                this.laserInstallTimer = 0;
            }
        }

        // 함정 실시간 물리 및 격발 검사 업데이트
        for (let i = this.traps.length - 1; i >= 0; i--) {
            let trap = this.traps[i];
            trap.update(this.monsters, this);
            if (!trap.active) {
                this.traps.splice(i, 1);
            }
        }

        // [E-09 공속 반지 10레벨 속사 초월 트래킹]
        let hasRangedWeapon = (this.player.weaponLevels.fire > 0) || (this.player.weaponLevels.ice > 0) || (this.player.weaponLevels.lightning > 0) || (this.player.weaponType === 'energy_ball') || (this.player.weaponType === 'supercritical_plasma_fusion');
        let canShoot = hasRangedWeapon;
        if (this.mouse.isDown && canShoot && !isOverlayOpen) {
            this.player.continuousShootTimer = (this.player.continuousShootTimer || 0) + 1;

            // 10레벨 초월 속사 연속 3초(180프레임) 돌파 시 노란 네온 파티클 오버라이드 격발
            if (this.player.equipLevels.ring_aspd === 10 && this.player.continuousShootTimer >= 180) {
                if (Math.random() < 0.35) {
                    this.particles.push(new Particle(
                        this.player.x + (Math.random() * 24 - 12),
                        this.player.y + (Math.random() * 24 - 12),
                        '#ffdf00', 1.8, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 12, 'spark'
                    ));
                }
                if (this.player.continuousShootTimer === 180) {
                    this.showFloatingText("⚡ LIMIT OVER! ⚡", this.player.x, this.player.y - 35, '#ffdf00');
                    Sound.play('victory');
                }
            }
        } else {
            this.player.continuousShootTimer = 0;
        }

        // [추가] 시간 왜곡 마법 가동 시 마력(MP) 소모 및 파티클 기믹 처리
        if (this.timeDilationActive) {
            // 매 프레임 마력 감쇄 (약 6초간 유지: 100 MP / 360 프레임 = 프레임당 약 0.278)
            let mpDrain = 0.278;

            // [신규 기획] Mana Ring 10레벨 초월: 시간 왜곡 마나 유지비 50% 절감!
            if (this.player.equipLevels.ring_mp === 10) {
                mpDrain *= 0.5;
            }

            // [신규 기획] Mana Helm 5레벨 돌파 무료 시전 적용 시 마나 감쇄 없음!
            if (this.timeWarpFreeCastActive) {
                mpDrain = 0;
            }

            this.player.mp = Math.max(0, this.player.mp - mpDrain);

            // 시간 감속 공간에서 뿜어져 나오는 보랏빛 네온 공간 기믹 파티클
            if (Math.random() < 0.2) {
                let angle = Math.random() * Math.PI * 2;
                let radius = Math.random() * 50 + 10;
                let px = this.player.x + Math.cos(angle) * radius;
                let py = this.player.y + Math.sin(angle) * radius;
                this.particles.push(new Particle(
                    px, py,
                    '#b026ff', 1.5,
                    -Math.cos(angle) * 0.4, -Math.sin(angle) * 0.4, 20, 'dust'
                ));
            }

            if (this.player.mp <= 0) {
                this.timeDilationActive = false;
                this.timeWarpFreeCastActive = false; // 무료 시전 비활성화
                this.showFloatingText("TIME FLOW RESTORED", this.player.x, this.player.y - 30, '#00f0ff');
                Sound.play('powerup');
            }
        }

        // 펫(공전 드론) 업데이트 루프 실행
        for (let pet of this.pets) {
            pet.update(this.player, this.bullets, this.monsters, this.bullets, this.particles);
        }

        // 1. 순차 스폰 실시간 연산
        this.processSpawnQueue();

        // 2. 콤보 타이머 차감
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
            }
        }

        // 3. 플레이어 이동 및 스태미너 가동 연산
        let dx = 0;
        let dy = 0;

        if (!isOverlayOpen && this.player.hp > 0 && !(this.player.stunnedTimer > 0)) {
            if (this.keys['w']) dy -= 1;
            if (this.keys['s']) dy += 1;
            if (this.keys['a']) dx -= 1;
            if (this.keys['d']) dx += 1;
        }

        // 100% 키보드 조준 및 자동 사격 격발 연산
        let kdx = 0;
        let kdy = 0;
        if (!isOverlayOpen && this.player.hp > 0 && !(this.player.stunnedTimer > 0)) {
            if (this.keys['arrowup']) kdy -= 1;
            if (this.keys['arrowdown']) kdy += 1;
            if (this.keys['arrowleft']) kdx -= 1;
            if (this.keys['arrowright']) kdx += 1;
        }

        if (kdx !== 0 || kdy !== 0) {
            this.keyboardAimActive = true;
            this.player.angle = Math.atan2(kdy, kdx);

            // [수정] 장착 무기 기반으로 원거리/근접 판정 (에너지볼 미장착 시 shootWeapon 차단)
            let hasRanged = this.playerHasRangedWeapon();
            let hasMelee = this.playerHasMeleeWeapon();

            if (this.player.hp > 0 && !(this.player.stunnedTimer > 0)) {
                if (this.player.shootCooldown <= 0 && hasRanged) {
                    this.shootWeapon();
                }
                if (this.player.slashCooldown <= 0 && hasMelee) {
                    this.slashWeapon();
                }
            }
        }

        // 8방향 대각선 이동 시 루트2 정규화 속도 보정 적용
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        // Shift 달리기 가속 및 스태미너 소모 물리 연산
        let currentSpeed = this.player.ms;
        // [신규 기믹] 플레이어 둔화 디버프 적용
        if (this.player.slowTimer > 0) {
            currentSpeed *= this.player.slowMultiplier;
        }
        // [E-08 신규 구현] Speed Ring 10레벨 초월: 초신성 기동 50% 폭발적 가속 보정!
        if (this.player.supernovaTimer > 0) {
            currentSpeed *= 1.5;
        }
        const isSprinting = this.keys['shift'] && this.player.stamina > 3 && (dx !== 0 || dy !== 0) && !(this.player.stunnedTimer > 0);

        if (isSprinting) {
            currentSpeed *= 1.6; // 질주 시 60% 가속

            // 둠 스피커 음파 진동 기믹에 따른 스태미나 소모 2배
            let isSonicDisrupted = this.monsters.some(m => m.type === 'boss_speaker' && m.boss_sonicDisruptionActive);
            let staminaCost = 0.75 * (isSonicDisrupted ? 2.0 : 1.0);
            this.player.stamina = Math.max(0, this.player.stamina - staminaCost); // 스태미너 고속 소모

            // 질주 먼지 파티클
            if (Math.random() < 0.25) {
                let dAngle = this.player.angle + Math.PI + (Math.random() * 0.5 - 0.25);
                this.particles.push(new Particle(
                    this.player.x - Math.cos(this.player.angle) * 8,
                    this.player.y - Math.sin(this.player.angle) * 8,
                    'rgba(0, 240, 255, 0.4)', 2,
                    Math.cos(dAngle) * 0.8, Math.sin(dAngle) * 0.8, 20, 'dust'
                ));
            }
        } else {
            // 서 있거나 그냥 걸을 때 스테미너 속도 점진적 자연 회복
            let staminaRegen = 0.35 + (this.player.aspd * 0.05); // 지능(공격속도) 보상 카드와도 연결
            this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + staminaRegen);
        }

        // 플레이어 캐릭터 위치 이동
        this.player.x += dx * currentSpeed;
        this.player.y += dy * currentSpeed;

        // [100층 최종 보스 50% 이하 기믹] 상단 중앙(또는 보스 본체) 중력 흡수 물리 연산
        let finalBoss = this.monsters.find(m => m.type === 'boss_final' && m.hp > 0 && !m.dead);
        if (finalBoss && (finalBoss.hp / finalBoss.maxHp) <= 0.5) {
            let gravityAngle = Math.atan2(finalBoss.y - this.player.y, finalBoss.x - this.player.x);
            let gravityPull = 0.95; // 극복 가능하지만 이동을 유의미하게 방해하는 인력 크기
            let timeScale = this.timeDilationActive ? 0.1 : 1.0;
            this.player.x += Math.cos(gravityAngle) * gravityPull * timeScale;
            this.player.y += Math.sin(gravityAngle) * gravityPull * timeScale;
        }

        // 맵 벽 경계선 제한 충돌 처리 (정사각형 방 내부 구조 #08090e)
        // 캔버스 크기 및 벽 마진 경계 반영
        const wallMargin = 50;
        this.player.x = Math.max(wallMargin + this.player.radius, Math.min(this.mapWidth - wallMargin - this.player.radius, this.player.x));
        this.player.y = Math.max(wallMargin + this.player.radius, Math.min(this.mapHeight - wallMargin - this.player.radius, this.player.y));

        // 마우스 커서 각도에 맞춰 조준 각도 갱신 (키보드 조준 모드가 아닐 때만)
        if (!this.keyboardAimActive) {
            let pMouseAngle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
            this.player.angle = pMouseAngle;
        }

        // [5-3단계] 플레이어와 격자 장애물 지형 충돌 처리 (슬라이딩 물리)
        // 25등분 격자에 생성된 네온 장벽들과 충돌했을 때 자연스럽게 미끄러지도록 슬라이딩 물리 판정을 가합니다.
        for (let obs of this.obstacles) {
            let distX = this.player.x - obs.x;
            let distY = this.player.y - obs.y;

            // NeonObstacle 크기(width: 80, height: 65)와 플레이어 반경(radius)을 고려한 한계 겹침 거리 계산
            let minXDist = (obs.width / 2) + this.player.radius - 2;
            let minYDist = (obs.height / 2) + this.player.radius - 2;

            if (Math.abs(distX) < minXDist && Math.abs(distY) < minYDist) {
                // 겹친 정도(overlap)를 계산하여 덜 겹친 축 방향으로 비껴내기
                let overlapX = minXDist - Math.abs(distX);
                let overlapY = minYDist - Math.abs(distY);

                if (overlapX < overlapY) {
                    this.player.x += distX > 0 ? overlapX : -overlapX;
                } else {
                    this.player.y += distY > 0 ? overlapY : -overlapY;
                }
            }
        }

        // [Phase 7 신규 구현] 플레이어와 비밀 균열 벽 지형 충돌 처리 (슬라이딩 물리)
        for (let wall of this.secretWalls) {
            let distX = this.player.x - wall.x;
            let distY = this.player.y - wall.y;

            let minXDist = (wall.width / 2) + this.player.radius - 2;
            let minYDist = (wall.height / 2) + this.player.radius - 2;

            if (Math.abs(distX) < minXDist && Math.abs(distY) < minYDist) {
                let overlapX = minXDist - Math.abs(distX);
                let overlapY = minYDist - Math.abs(distY);

                if (overlapX < overlapY) {
                    this.player.x += distX > 0 ? overlapX : -overlapX;
                } else {
                    this.player.y += distY > 0 ? overlapY : -overlapY;
                }
            }
        }

        // [Phase 7 신규 구현] 비밀 벽 타이머 감쇠 및 상태 업데이트
        for (let wall of this.secretWalls) {
            wall.update(this);
        }

        // [추가] 플레이어가 현재 이동 키를 누르지 않고 가만히 서 있는지 감지
        this.player.isStopped = (dx === 0 && dy === 0);

        // [수정] 장착 무기 기반으로 원거리/근접 판정 (에너지볼 미장착 시 shootWeapon 차단)
        let hasRanged = this.playerHasRangedWeapon();
        let hasMelee = this.playerHasMeleeWeapon();

        if (!this.keyboardAimActive && this.mouse.isDown && this.player.hp > 0 && this.player.shootCooldown <= 0 && hasRanged && !(this.player.stunnedTimer > 0)) {
            this.shootWeapon();
        }
        if (!this.keyboardAimActive && this.mouse.isDown && this.player.hp > 0 && this.player.slashCooldown <= 0 && hasMelee && !(this.player.stunnedTimer > 0)) {
            this.slashWeapon();
        }

        // [성능 최적화] 화면 내 동시 활성 플레이어 탄환 수 하드 캡(Max 200) 제한
        let playerBullets = this.bullets.filter(b => b.isPlayerBullet);
        if (playerBullets.length > 200) {
            let overflow = playerBullets.length - 200;
            // 배열 앞쪽(가장 오래된 탄환)부터 강제 소멸시킴
            for (let k = 0; k < this.bullets.length && overflow > 0; k++) {
                if (this.bullets[k].isPlayerBullet) {
                    this.bullets.splice(k, 1);
                    k--;
                    overflow--;
                }
            }
        }

        // 5. 탄환 물리 비행 및 유도 연산
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.update(this.monsters);

            // [W-04 검 탄막 절단 기믹]
            if (!b.isPlayerBullet && this.player.isSlashActive) {
                let swordDist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
                if (swordDist < this.player.slashRadius + b.radius) {
                    let targetAngle = Math.atan2(b.y - this.player.y, b.x - this.player.x);
                    let angleDiff = Math.abs(targetAngle - this.player.slashAngle);
                    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                    if (Math.abs(angleDiff) < 1.1) {
                        Sound.play('dodge'); // 튕김 금속 틱음
                        for (let k = 0; k < 4; k++) {
                            let randAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 1;
                            this.particles.push(new Particle(b.x, b.y, '#b026ff', 1.5, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'));
                        }
                        this.showFloatingText("CUT! ⚔️", b.x, b.y - 15, '#b026ff');
                        this.bullets.splice(i, 1);
                        continue; // 탄환 소멸되었으므로 이후 로직 스킵
                    }
                }
            }

            // [Phase 7 신규 구현] 모든 플레이어 탄환 투사체와 비밀 벽 충돌 검출 (isSpear 한정 버그 수정 완료)
            if (b.isPlayerBullet) {
                // [신규] 60층 보이드 워퍼의 탄 흡수 블랙홀 구역 충돌 검출 (수정: 텔레포트 후 보호막 가동 중일 때만)
                let warper = this.monsters.find(m => m.type === 'boss_warper' && m.hp > 0 && !m.dead && m.blackholeActiveTimer > 0);
                if (warper) {
                    let wdist = Math.hypot(b.x - warper.x, b.y - warper.y);
                    if (wdist < 75) {
                        for (let k = 0; k < 3; k++) {
                            let pAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 2 + 0.5;
                            this.particles.push(new Particle(b.x, b.y, '#00ffcc', 1.2, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 10, 'spark'));
                        }
                        this.bullets.splice(i, 1);
                        continue;
                    }
                }

            }

            // 화면 밖으로 나가거나 수명이 다하거나 비활성화(소멸 예약)되면 소멸
            if (!b.active || b.x < 35 || b.x > this.mapWidth - 35 || b.y < 35 || b.y > this.mapHeight - 35 || b.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }

        // [W-08 시간 왜곡 마법의 석상화 기믹]
        if (this.timeDilationActive) {
            for (let m of this.monsters) {
                // 매 프레임 1% 확률로 몬스터 시간 완전 정지 (2초=120프레임 기절)
                if (Math.random() < 0.01) {
                    m.statusEffects.shock = Math.max(m.statusEffects.shock || 0, 120);
                    this.showFloatingText("TIME STOPPED! ⏳", m.x, m.y - 25, '#b026ff');

                    // 정지 시 은은한 보라 파티클
                    for (let k = 0; k < 3; k++) {
                        this.particles.push(new Particle(m.x, m.y, '#b026ff', 2, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 15, 'spark'));
                    }
                }
            }
        }

        // 6. 몬스터 거동 및 충돌 판정
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            if (!m || m.dead) continue; // [신규] 사망했거나 존재하지 않는 몬스터 즉시 제외

            // 몬스터끼리 과하게 뭉치는 현상 해결 (겹침 방지 Separation 물리 연산 추가)
            for (let j = i - 1; j >= 0; j--) {
                let other = this.monsters[j];
                if (!other || other.dead) continue; // [신규] 사망한 다른 몬스터와는 겹침 방지 연산 건너뜀
                let mDist = Math.hypot(other.x - m.x, other.y - m.y);
                let minDist = m.radius + other.radius;
                if (mDist < minDist) {
                    // 서로 겹쳤을 때 바깥으로 밀어내기 각도 연산
                    let pushAngle = Math.atan2(m.y - other.y, m.x - other.x);
                    let overlap = minDist - mDist;
                    // 아주 부드럽게 양방향으로 25%씩 밀어내어 골고루 펼쳐지게 격리
                    let pushForce = overlap * 0.25;

                    // [수정] 밀쳐진 결과 위치가 벽 내부인지 사전에 판단하여 길 위일 때만 이동 (8방향 촘촘한 충돌 범위 고려)
                    let nextMx = m.x + Math.cos(pushAngle) * pushForce;
                    let nextMy = m.y + Math.sin(pushAngle) * pushForce;
                    if (typeof m.isPositionInWall === 'function' ? !m.isPositionInWall(nextMx, nextMy) : !this.isTileWall(nextMx, nextMy)) {
                        m.x = nextMx;
                        m.y = nextMy;
                    }
                    let nextOtherX = other.x - Math.cos(pushAngle) * pushForce;
                    let nextOtherY = other.y - Math.sin(pushAngle) * pushForce;
                    if (typeof other.isPositionInWall === 'function' ? !other.isPositionInWall(nextOtherX, nextOtherY) : !this.isTileWall(nextOtherX, nextOtherY)) {
                        other.x = nextOtherX;
                        other.y = nextOtherY;
                    }
                }
            }

            m.update(this.player, this.bullets);
            if (m.scytheDebuffTimer > 0) {
                m.scytheDebuffTimer--;
            } else {
                m.scytheDebuffTimer = 0;
            }

            // [충돌 검사 A] 몬스터 본체와 플레이어 캐릭터 본체의 격돌
            let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (dist < m.radius + this.player.radius) {
                this.damagePlayer(m.atk, m.x, m.y);

                // 몬스터는 플레이어에게 밀려남 (충돌 반발력)
                let repAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                m.knockbackX = Math.cos(repAngle) * 3;
                m.knockbackY = Math.sin(repAngle) * 3;
            }

            // [충돌 검사 B] 플레이어의 검 휘두르기 히트 박스 판정 (근접 베기)
            if (this.player.isSlashActive) {
                // [Phase 7 신규 구현] 비밀 벽 검풍 베기 충돌 검출
                for (let j = this.secretWalls.length - 1; j >= 0; j--) {
                    let wall = this.secretWalls[j];
                    let wDist = Math.hypot(wall.x - this.player.x, wall.y - this.player.y);
                    if (wDist < this.player.slashRadius + 28) { // 바뀐 벽 모양을 감안하여 리치 소폭 확장 보정
                        let targetAngle = Math.atan2(wall.y - this.player.y, wall.x - this.player.x);
                        let angleDiff = Math.abs(targetAngle - this.player.slashAngle);
                        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                        if (Math.abs(angleDiff) < 1.1) {
                            if (!wall.hitCooldown) {
                                wall.hitCooldown = 12;
                                if (this.player && this.player.equipLevels && this.player.equipLevels.goggles === 10) {
                                    wall.hp = 0;
                                } else {
                                    wall.hp--;
                                }
                                wall.hitCount++;
                                wall.flashTimer = 5;
                                Sound.play('hit');

                                for (let k = 0; k < 4; k++) {
                                    let randAngle = Math.random() * Math.PI * 2;
                                    let pSpeed = Math.random() * 2 + 1;
                                    this.particles.push(new Particle(wall.x, wall.y, wall.glowColor, 1.5, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 12, 'spark'));
                                }

                                // 3회 적중 시 최초 지지직 글리치 오라 개막
                                if (wall.hitCount === 3) {
                                    this.showFloatingText(`⚠️ GLITCH DETECTED! 🔮`, wall.x, wall.y - 20, '#b026ff');
                                    Sound.play('powerup');
                                } else {
                                    this.showFloatingText(`CRACK! 🔨`, wall.x, wall.y - 15, '#b026ff');
                                }

                                if (wall.hp <= 0) {
                                    Sound.play('explosion');
                                    this.shakeScreen(10, 4.5);
                                    for (let k = 0; k < 15; k++) {
                                        let randAngle = Math.random() * Math.PI * 2;
                                        let pSpeed = Math.random() * 4 + 1.5;
                                        this.particles.push(new Particle(wall.x, wall.y, '#b026ff', 2.2, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 25, 'spark'));
                                        this.particles.push(new Particle(wall.x, wall.y, '#333333', 1.8, Math.cos(randAngle) * pSpeed, Math.sin(randAngle) * pSpeed, 15, 'dust'));
                                    }
                                    this.showFloatingText("GLITCH WALL BROKEN! 💥", wall.x, wall.y - 20, '#b026ff');

                                    // 맵 중앙 가용 영역 내 장애물들과 겹치지 않는 안전한 랜덤 좌표 추출
                                    let cx = this.mapWidth / 2, cy = this.mapHeight / 2;
                                    let foundSafe = false;
                                    for (let attempt = 0; attempt < 50; attempt++) {
                                        let rx = 100 + Math.random() * (this.mapWidth - 200);
                                        let ry = 100 + Math.random() * (this.mapHeight - 200);
                                        let distToPlayer = Math.hypot(this.player.x - rx, this.player.y - ry);
                                        if (distToPlayer < 100) continue;

                                        let distToObs = true;
                                        for (let obs of this.obstacles) {
                                            if (Math.hypot(rx - obs.x, ry - obs.y) < 70) {
                                                distToObs = false;
                                                break;
                                            }
                                        }
                                        if (distToObs) {
                                            cx = rx;
                                            cy = ry;
                                            foundSafe = true;
                                            break;
                                        }
                                    }

                                    // 🛡️ [비상용 폴백 예외 처리] 안전 좌표 55회 추출 실패 시, 부서진 비밀방 벽(Glitch Wall)이 있던 좌표를 기준으로 포털을 스폰하여 절대 맵을 이탈하지 않도록 조치
                                    if (!foundSafe) {
                                        cx = wall.x;
                                        cy = wall.y;
                                    }

                                    // 비밀방 포털 100% 소환
                                    let secretPortal = new RoomPortal('secret', 0, cx, cy);
                                    secretPortal.difficultyClass = 'high'; // 에픽 보증 등급 부여
                                    this.portals.push(secretPortal);
                                    this.showFloatingText("🔮 DIMENSIONAL PORTAL OPENED!", cx, cy - 35, '#b026ff');

                                    // 포털 소환 보랏빛 차원 파편 솟구침 연출
                                    for (let k2 = 0; k2 < 20; k2++) {
                                        let pAngle2 = Math.random() * Math.PI * 2;
                                        let pSpeed2 = Math.random() * 3.5 + 2;
                                        this.particles.push(new Particle(cx, cy, '#b026ff', 2.2, Math.cos(pAngle2) * pSpeed2, Math.sin(pAngle2) * pSpeed2, 28, 'spark'));
                                    }

                                    this.secretWalls.splice(j, 1);
                                }
                            }
                        }
                    }
                }



                let swordDist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                if (swordDist < this.player.slashRadius + m.radius) {
                    // 회전 검기 범위 내의 부채꼴 각도 검사
                    let targetAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                    let angleDiff = Math.abs(targetAngle - this.player.slashAngle);
                    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                    // 넓은 근접 110도 스윕 타격 범위
                    if (Math.abs(angleDiff) < 1.1) {
                        // [모델 C] 칼 베기 시너지 곱연산 대미지 배율 적용
                        let synergyMult = this.checkBuildSynergy('sword');

                        // 검 베기 디버프 부여 (vulnerability: 4초간 25% 데미지 증폭)
                        m.statusEffects.vulnerability = 240;

                        // [신규 기획] Mana Helm 10레벨 초월: 마나가 100% 가득 찬 상태일 때 근접 공격 뎀증 25% 가산!
                        let helmDmgBonus = 1.0;
                        if (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) {
                            helmDmgBonus = 1.25;
                        }

                        let swordLvl = this.player.weaponLevels.sword || 1;
                        let levelMult = 1 + (swordLvl - 1) * 0.15;
                        let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;
                        let finalDmg = this.player.atk * 1.5 * levelMult * synergyMult * helmDmgBonus * hybridDmgFactor;
                        if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;

                        // [신규] 근접 검 베기 물리 타격 시 동결(Frozen) 3배 파쇄 치명타 콤보 판정
                        let hasShattered = false;
                        if (m.isFrozenActive > 0) {
                            if (Math.random() < 0.3) {
                                finalDmg *= 3.0; // 3배 피해 폭증
                                hasShattered = true;
                                m.isFrozenActive = 0;
                                m.statusEffects.shock = 0;
                            }
                        }

                        m.hp -= finalDmg; // 칼은 50% 강력한 계수 피해
                        m.flashTimer = 5;
                        m.knockbackX = Math.cos(targetAngle) * 6; // 대폭 넉백
                        m.knockbackY = Math.sin(targetAngle) * 6;
                        m.isPlayerKnockback = true;

                        if (hasShattered) {
                            this.showFloatingText("❄️ FREEZE SHATTER! 300% DMG", m.x, m.y - 35, '#00f0ff');
                            this.shakeScreen(12, 5.0);
                            Sound.play('explosion');
                            this.triggerHitStop(3); // 빙결 파쇄 히트 스톱 (3프레임)

                            // 은백색 파쇄 스파크 얼음 파편
                            for (let k = 0; k < 12; k++) {
                                let angle = Math.random() * Math.PI * 2;
                                let speed = Math.random() * 4 + 2;
                                this.particles.push(new Particle(m.x, m.y, '#ffffff', 2.5, Math.cos(angle) * speed, Math.sin(angle) * speed, 20, 'spark'));
                            }
                        }

                        // [신규 기획] Reach Gloves 10레벨 초월: 근접 타격 시 전방 충격파 방출!
                        if (this.player.equipLevels.gloves === 10) {
                            if (!m.hasShockwaveTriggeredThisFrame) {
                                m.hasShockwaveTriggeredThisFrame = true;
                                setTimeout(() => { m.hasShockwaveTriggeredThisFrame = false; }, 200); // 0.2초 쿨다운

                                this.triggerBulletSplash(m.x, m.y, 65, this.player.atk * 0.40 * helmDmgBonus);
                                this.showFloatingText("SHOCKWAVE!", m.x, m.y - 30, '#ffdf00');
                            }
                        }

                        // [Spectral Blade 시너지: 검 베기 타격 시 25% 확률로 유도탄 1발 추가 사출]
                        if (synergyMult >= 1.3 && Math.random() < 0.25) {
                            let bAngle = Math.random() * Math.PI * 2;
                            this.bullets.push(new Bullet(m.x, m.y, Math.cos(bAngle) * 5, Math.sin(bAngle) * 5, this.player.atk * 0.5, true, {
                                homing: true,
                                color: '#ff0055',
                                radius: 3
                            }));
                        }

                        // 검 타격 보라색 스파크 파티클
                        for (let k = 0; k < 4; k++) {
                            let speed = Math.random() * 4 + 2;
                            this.particles.push(new Particle(m.x, m.y, '#b026ff', 2.5, Math.cos(targetAngle + Math.random() - 0.5) * speed, Math.sin(targetAngle + Math.random() - 0.5) * speed, 20));
                        }
                        // 몬스터 처사 체크
                        if (m.hp <= 0) {
                            this.killMonster(m, i);
                            continue; // 이미 사망 처리되어 몬스터 루프 탈출
                        }
                    }
                }
            }

            // [충돌 검사 C] 탄환 물리 충돌
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                let b = this.bullets[j];

                // 플레이어 탄환 -> 몬스터 타격
                if (b.isPlayerBullet) {
                    // [최적화] 이미 이 탄환에 맞은 몬스터라면 피격 판정 건너뜀 (중복 피격 렉 방멸)
                    if (b.hitMonsters && b.hitMonsters.has(m)) {
                        continue;
                    }

                    // [최적화] 1차 절댓값 필터링 (Math.hypot 연산 오버헤드 해소)
                    let limitDist = m.radius + b.radius;
                    if (Math.abs(m.x - b.x) >= limitDist || Math.abs(m.y - b.y) >= limitDist) {
                        continue;
                    }

                    let bDist = Math.hypot(m.x - b.x, m.y - b.y);
                    if (bDist < limitDist) {
                        if (b.hitMonsters) {
                            b.hitMonsters.add(m); // [최적화] 피격된 몬스터 등록
                        }

                        // [W-02 채찍(Whip) 견인 및 그랩 물리 로직]
                        if (b.isWhip) {
                            let pullAngle = this.player.angle;
                            let pullX = this.player.x + Math.cos(pullAngle) * 35;
                            let pullY = this.player.y + Math.sin(pullAngle) * 35;

                            m.x = pullX;
                            m.y = pullY;

                            // 맵 마진 이탈 방지 가두기
                            const wallMargin = 40;
                            m.x = Math.max(wallMargin + m.radius, Math.min(this.mapWidth - wallMargin - m.radius, m.x));
                            m.y = Math.max(wallMargin + m.radius, Math.min(this.mapHeight - wallMargin - m.radius, m.y));

                            // 1.5초 기절(90프레임) 및 백색 플래시
                            m.statusEffects.shock = 90;
                            m.flashTimer = 8;

                            // 3초간 공속 +20% 상승 (최대 3중첩) 연계 버프
                            this.player.whipSpeedStack = Math.min(3, (this.player.whipSpeedStack || 0) + 1);
                            this.player.whipSpeedTimer = 180; // 180프레임 = 3초

                            this.showFloatingText(`GRAB PULL! ⛓️ HASTE [${this.player.whipSpeedStack}/3]`, this.player.x, this.player.y - 30, '#ff00aa');
                            Sound.play('dodge');

                            // 사슬 폭발 조각들
                            for (let k = 0; k < 8; k++) {
                                let angle = Math.random() * Math.PI * 2;
                                let speed = Math.random() * 4 + 2;
                                this.particles.push(new Particle(m.x, m.y, '#ff00aa', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15, 'spark'));
                            }

                            // 사슬 투사체 소멸
                            this.bullets.splice(j, 1);

                            // 데미지 가함
                            m.hp -= b.damage;
                            if (m.hp <= 0) {
                                this.killMonster(m, i);
                            }
                            break; // 몬스터가 사망했거나 탄환이 소멸했으므로 충돌체크 루프 탈출
                        }

                        // [신규] 원소 탄환 성격별 디버프 부여
                        if (b.isFire) {
                            m.statusEffects.burn = 240; // 4초 지속 화상
                            m.statusEffects.burnStack = Math.min(5, (m.statusEffects.burnStack || 0) + 1); // 화상 1중첩 가산
                        } else if (b.isIce) {
                            let iceLvl = this.player.weaponLevels.ice || 1;
                            let freezeAmount = 20 + iceLvl * 5; // 1레벨: 25% ~ 5레벨: 45% 축적
                            m.statusEffects.freeze = Math.min(100, (m.statusEffects.freeze || 0) + freezeAmount);
                        } else {
                            if (b.splash > 0) {
                                m.statusEffects.shock = 60; // 기절 1초
                            } else {
                                m.statusEffects.slow = 180; // 감속 3초
                            }
                        }

                        // 데미지 계산 및 백색 깜빡임 피드백 (취약 데미지 증폭)
                        let finalDmg = b.damage;
                        if (b.isScytheSynergy) {
                            this.triggerScytheImpactSlash(b.x, b.y, finalDmg * 0.4);
                        }
                        let isSpearTip = false;
                        if (b.isSpear) {
                            let flightDist = Math.hypot(b.x - b.startX, b.y - b.startY);
                            // 사거리의 80% 이상에서 조준 찌르기 타격 시 2배 크리티컬
                            if (flightDist >= this.player.range * 0.80) {
                                finalDmg *= 2.0;
                                isSpearTip = true;
                            }
                        }

                        if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;

                        // [신규] 얼음 동결 완전 정지 상태 시 물리 무기 피격 콤보 판정 (3배 파쇄 피해)
                        let hasShattered = false;
                        if (m.isFrozenActive > 0 && !b.isLightning) {
                            if (Math.random() < 0.3) {
                                finalDmg *= 3.0; // 300% 피해 폭증
                                hasShattered = true;
                                m.isFrozenActive = 0;
                                m.statusEffects.shock = 0;
                            }
                        }

                        m.hp -= finalDmg;
                        m.flashTimer = 5;

                        if (hasShattered) {
                            this.showFloatingText("❄️ FREEZE SHATTER! 300% DMG", m.x, m.y - 35, '#00f0ff');
                            this.shakeScreen(12, 5.0);
                            Sound.play('explosion');
                            this.triggerHitStop(3); // 빙결 파쇄 히트 스톱 (3프레임)

                            // 은백색 파쇄 스파크 파편 사출
                            for (let k = 0; k < 12; k++) {
                                let angle = Math.random() * Math.PI * 2;
                                let speed = Math.random() * 4 + 2;
                                this.particles.push(new Particle(m.x, m.y, '#ffffff', 2.5, Math.cos(angle) * speed, Math.sin(angle) * speed, 20, 'spark'));
                            }
                        }

                        // [W-07 신규 구현] 번개 마법 탄환인 경우 체인 라이트닝(연쇄 벼락) 전이 발동
                        if (b.isLightning) {
                            let chains = 3 + (this.player.weaponLevels.lightning || 1); // 1레벨: 4회 ~ 5레벨: 8회 전이
                            this.triggerChainLightning(b.x, b.y, m, chains, b.damage * 0.85);
                        }

                        // 넉백 발생 (창은 벽꽝을 유도하기 위해 강력한 넉백 7.5 가동)
                        let hitAngle = Math.atan2(m.y - b.y, m.x - b.x);
                        let kbForce = b.isSpear ? 7.5 : 2.0;
                        m.knockbackX = Math.cos(hitAngle) * kbForce;
                        m.knockbackY = Math.sin(hitAngle) * kbForce;
                        m.isPlayerKnockback = true;

                        if (isSpearTip) {
                            this.showFloatingText("⚡ SPEAR-TIP CRITICAL! ⚡", m.x, m.y - 35, '#00f0ff');
                            this.shakeScreen(8, 3.8);
                            this.triggerHitStop(2); // 창끝 크리티컬 히트 스톱 (2프레임)
                        }

                        Sound.play('hit');

                        // 스플래시 범위 폭발 카드 속성 연산 (스플래시 대미지 강화 업그레이드 배율 연동)
                        if (b.splash > 0) {
                            let splashColor = b.isAdvanced ? '#b026ff' : '#ff5e00';
                            this.triggerBulletSplash(b.x, b.y, b.splash, b.damage * this.player.splashDmgUpgrade, splashColor);
                        }

                        // [최적화] 다단히트 렉 완화를 위해 피격 스파크 파티클을 2개로 경량화하고 프레임당 생성 최대 개수 제한
                        if (this.frameHitSparkCount === undefined) this.frameHitSparkCount = 0;
                        if (this.frameHitSparkCount < 15) {
                            for (let k = 0; k < 2; k++) {
                                let speed = Math.random() * 3 + 1;
                                this.particles.push(new Particle(b.x, b.y, b.color, 2, Math.cos(hitAngle + Math.random() - 0.5) * speed, Math.sin(hitAngle + Math.random() - 0.5) * speed, 15));
                                this.frameHitSparkCount++;
                            }
                        }

                        // 관통 횟수 차감 및 소멸
                        if (b.pierce > 0) {
                            b.pierce--;
                        } else if (b.monsterBounceLimit > 0 && b.monsterBounceCount < b.monsterBounceLimit) {
                            b.monsterBounceCount++;

                            // 주변의 다른 유효 몬스터 탐색 (방금 명중한 몬스터 제외)
                            let nextMonster = null;
                            let minDist = Infinity;
                            for (let otherM of this.monsters) {
                                if (otherM === m || otherM.hp <= 0) continue;
                                // [최적화] 1차 절댓값 필터링 (최대 도탄 거리 250px 내인지 스크리닝)
                                if (Math.abs(otherM.x - b.x) >= 250 || Math.abs(otherM.y - b.y) >= 250) {
                                    continue;
                                }
                                let distToOther = Math.hypot(otherM.x - b.x, otherM.y - b.y);
                                if (distToOther < minDist && distToOther < 250) {
                                    minDist = distToOther;
                                    nextMonster = otherM;
                                }
                            }

                            if (nextMonster) {
                                let speed = Math.hypot(b.vx, b.vy);
                                let bounceAngle = Math.atan2(nextMonster.y - b.y, nextMonster.x - b.x);
                                b.vx = Math.cos(bounceAngle) * speed;
                                b.vy = Math.sin(bounceAngle) * speed;

                                // 도탄 피드백 시각 효과음 연출
                                this.showFloatingText("M-BOUNCE! 💥", b.x, b.y - 15, '#ff00aa');
                                Sound.play('hit');

                                // 날아갈 수 있도록 탄 수명 연장
                                b.life = Math.max(b.life, this.player.range / speed * 0.6) + 12;
                            } else {
                                this.bullets.splice(j, 1);
                            }
                        } else {
                            this.bullets.splice(j, 1);
                        }

                        // 몬스터 사망 시 정산
                        if (m.hp <= 0) {
                            this.killMonster(m, i);
                            break; // 몬스터가 이미 삭제되었으므로 탄환 히트 체크 루프 탈출
                        }
                    }
                }
                // 몬스터 탄환 -> 플레이어 피격
                else {
                    let bDist = Math.hypot(this.player.x - b.x, this.player.y - b.y);
                    if (bDist < this.player.radius + b.radius) {
                        this.damagePlayer(b.damage, b.x, b.y);
                        this.bullets.splice(j, 1);
                    }
                }
            }
        }

        // [70층 차원 차단기 기믹] 차원 전기 사슬(Portal Link Circuit) 충돌 판정
        let portalBoss = this.monsters.find(m => m.type === 'boss_portal' && m.hp > 0 && !m.dead);
        if (portalBoss && portalBoss.isInvulnerable) {
            let spawners = this.monsters.filter(m => m.type === 'boss_portal_spawner' && m.hp > 0 && !m.dead);
            if (spawners.length > 0) {
                let timeScale = this.timeDilationActive ? 0.1 : 1.0;
                for (let k = 0; k < spawners.length; k++) {
                    let start = spawners[k];
                    let end = spawners[(k + 1) % spawners.length];

                    let abX = end.x - start.x;
                    let abY = end.y - start.y;
                    let apX = this.player.x - start.x;
                    let apY = this.player.y - start.y;

                    let abLenSq = abX * abX + abY * abY;
                    if (abLenSq > 0) {
                        let t = (apX * abX + apY * abY) / abLenSq;
                        t = Math.max(0, Math.min(1, t));

                        let closestX = start.x + t * abX;
                        let closestY = start.y + t * abY;

                        let distToPlayer = Math.hypot(this.player.x - closestX, this.player.y - closestY);
                        if (distToPlayer < this.player.radius + 3) {
                            // 매 프레임 피해 (초당 20 대미지)
                            this.damagePlayer(20 * (1 / 60) * timeScale, closestX, closestY);

                            if (this.player.stunnedTimer <= 0) {
                                this.player.stunnedTimer = 45;
                                this.showFloatingText("ELECTROCUTED! ⚡", this.player.x, this.player.y - 20, '#a78bfa');
                            }

                            if (Math.random() < 0.25) {
                                this.particles.push(new Particle(
                                    this.player.x, this.player.y,
                                    '#8b5cf6', 2.0,
                                    (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5,
                                    15, 'spark'
                                ));
                            }
                        }
                    }
                }
            }
        }

        // 7. 파티클 이펙트 업데이트
        let timeScale = this.timeDilationActive ? 0.1 : 1.0;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();

            if (p.type === 'blackhole') {
                // [W-09 조잡한 중력 낫] 블랙홀 잔상이 주위 적들을 미세하게 흡인 (반경 90px 내, 힘 0.35px)
                for (let m of this.monsters) {
                    if (m.hp > 0 && !m.dead) {
                        let dist = Math.hypot(m.x - p.x, m.y - p.y);
                        if (dist < 90 + m.radius) {
                            let pullAngle = Math.atan2(p.y - m.y, p.x - m.x);
                            let pullSpeed = 0.35 * timeScale;
                            m.x += Math.cos(pullAngle) * pullSpeed;
                            m.y += Math.sin(pullAngle) * pullSpeed;
                        }
                    }
                }
            }

            // [신규] 20층 보스 하이퍼 체이서의 화상 불장판 충돌 검사
            if (p.type === 'chaser_fire_trail') {
                let distToPl = Math.hypot(this.player.x - p.x, this.player.y - p.y);
                if (distToPl < p.radius + this.player.radius) {
                    // 프레임당 지속 피해
                    this.damagePlayer(p.atk * (1 / 60) * timeScale, p.x, p.y);
                    if (Math.random() < 0.04) {
                        this.showFloatingText("BURN! 🔥", this.player.x, this.player.y - 20, '#ff6a00');
                    }
                }
            }
            // 20층 보스 하이퍼 체이서 광분 패턴: 번개 감전 장판 충돌 검사
            else if (p.type === 'chaser_lightning_trail') {
                let distToPl = Math.hypot(this.player.x - p.x, this.player.y - p.y);
                if (distToPl < p.radius + this.player.radius) {
                    // 감전 기절 0.75초 및 대미지 적용
                    this.damagePlayer((p.atk || 15) * (1 / 60) * timeScale, p.x, p.y);
                    if (this.player.stunnedTimer <= 0) {
                        this.player.stunnedTimer = 45; // 0.75초 기절
                        this.showFloatingText("SHOCK! ⚡", this.player.x, this.player.y - 20, '#00e1ff');
                    }
                }
            }
            // 30층 보스 마더 슬라임 점성 웅덩이 충돌 검사
            else if (p.type === 'slime_mud_trail') {
                let distToPl = Math.hypot(this.player.x - p.x, this.player.y - p.y);
                if (distToPl < p.radius + this.player.radius) {
                    // 플레이어 5프레임 동안 감속 35%
                    this.player.slowTimer = Math.max(this.player.slowTimer || 0, 5);
                    this.player.slowMultiplier = 0.65;
                    if (Math.random() < 0.02) {
                        this.showFloatingText("SLOWED 💧", this.player.x, this.player.y - 20, '#00f0ff');
                    }
                }
            }
            // 60층 보스 보이드 워퍼 공간 균열 블랙홀 충돌 검사
            else if (p.type === 'boss_spatial_rift') {
                let distToPl = Math.hypot(this.player.x - p.x, this.player.y - p.y);
                if (distToPl < p.radius + this.player.radius) {
                    // 대미지 적용 및 둔화 40%
                    this.damagePlayer((p.atk || 12) * (1 / 60) * timeScale, p.x, p.y);
                    this.player.slowTimer = Math.max(this.player.slowTimer || 0, 5);
                    this.player.slowMultiplier = 0.60;
                    if (Math.random() < 0.02) {
                        this.showFloatingText("SLOWED 🌀", this.player.x, this.player.y - 20, '#b026ff');
                    }
                }
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 8. 4개 문(포털) 진입 체크 및 보상 시스템 연동
        if (this.monsters.length === 0 && this.spawnQueue.length === 0 && !(this.roomNum === 90 && this.bossWave < 4)) {
            // 모든 적 소탕 시점에 보상 스폰 (안전실인 1방 초기 시작 상태는 제외, 비밀방 제외)
            if ((this.roomNum > 1 || this.kills > 0) && !this.inSecretRoom) {
                // 아직 보상 오브젝트가 생성되지 않은 상태일 때 (방금 몬스터 격퇴 완료된 시점)
                if (!this.roomRewardSpawned && this.rewardChests.length === 0 && this.vendingMachines.length === 0 && this.portals.length > 0 && !this.portals[0].active) {
                    this.roomRewardSpawned = true; // [버그 수정] 단 1회 보상 스폰 즉시 잠금

                    // [신규 기획] 101층 보스 격파 시점에서의 특별 처리 (진 엔딩 트리거)
                    if (this.roomNum === 101) {
                        this.triggerGameClear();
                        return;
                    }

                    // [신규 기획] 100층 보스 격파 시점에서의 특별 처리
                    if (this.roomNum === 100) {
                        this.portals = []; // 기존 일반 포털들 삭제
                        if (this.player.fusedController) {
                            // 해방의 컨트롤러 보유 시 차원 붕괴 포털(Error Sector Portal) 스폰
                            let p = new RoomPortal('secret', 0, this.mapWidth / 2, this.mapHeight / 2 + 100);
                            p.portalType = 'error_sector';
                            p.difficultyClass = 'high';
                            p.active = true;
                            this.portals.push(p);
                            this.showFloatingText("PORTAL TO ERROR SECTOR OPENED! 🌀", this.mapWidth / 2, this.mapHeight / 2 - 30, '#ff00aa');
                        } else {
                            // 없을 시 일반 탈출구 포털 스폰
                            let p = new RoomPortal('secret', 0, this.mapWidth / 2, this.mapHeight / 2 + 100);
                            p.portalType = 'clear';
                            p.difficultyClass = 'low';
                            p.active = true;
                            this.portals.push(p);
                            this.showFloatingText("COLOSSEUM ESCAPE GATE OPENED! 🚪", this.mapWidth / 2, this.mapHeight / 2 - 30, '#00f0ff');
                        }

                        // 보스 격파 기념 화려한 글로우 파티클 방출
                        for (let k = 0; k < 40; k++) {
                            let pAngle = Math.random() * Math.PI * 2;
                            let pSpeed = Math.random() * 6 + 2;
                            let pColor = this.player.fusedController ? '#ff00aa' : '#00f0ff';
                            this.particles.push(new Particle(this.mapWidth / 2, this.mapHeight / 2 + 100, pColor, 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 45, 'spark'));
                        }
                        return; // 100층은 특수 처리로 종료하며 하단 일반 방 코인/보상 처리를 건너뜀
                    }

                    // [신규 기획] Repair Kit 보유 시 방 클리어 마다 잃은 체력 10% 쉴드 충전
                    if (this.player.hiddenItems && this.player.hiddenItems.repairKit) {
                        let lossHp = this.player.maxHp - this.player.hp;
                        if (lossHp > 0) {
                            let shieldGain = Math.floor(lossHp * 0.1);
                            if (shieldGain > 0) {
                                this.player.armorShield = (this.player.armorShield || 0) + shieldGain;
                                this.showFloatingText(`ARMOR CHARGED! 🛡️ (+${shieldGain})`, this.player.x, this.player.y - 45, '#10b981');
                                Sound.play('powerup');
                            }
                        }
                    }

                    // [수정] 맵 중앙 부근에 벽이 있을 가능성이 있으므로, 타일맵의 안전한 빈 공간(0)을 골라 스폰시킵니다.
                    const safeSpawn = this.getSafeSpawnPosition(false);
                    const spawnX = safeSpawn.x;
                    const spawnY = safeSpawn.y;

                    // A. 코인 정산 연산 (수정 2: 퍼펙트 보상 30% 하향 적용)
                    let baseCoins = this.currentSpawnTotal * 2;
                    let bonusCoins = 0;
                    if (this.player.perfectClearFlag) {
                        bonusCoins = Math.floor(baseCoins * 0.3); // 30% 보너스
                    }
                    let totalGained = baseCoins + bonusCoins;
                    if (this.player.craftedPassives && this.player.craftedPassives.includes('star_amplifier')) {
                        totalGained = Math.ceil(totalGained * 1.2);
                    }
                    // [수정] 방 클리어 코인은 안전한 바닥 타일에서 통통 떨어져 플레이어에게 우수수 자석 흡입되게 함
                    for (let k = 0; k < totalGained; k++) {
                        this.coinsList.push(new NeonCoin(spawnX, spawnY, 1));
                    }

                    // [수정] 결함 4: 상단 코인 영역 얼마+얼마 표기 및 시각적 맥동 이펙트 작렬!
                    const coinCounter = document.getElementById('coin-counter');
                    const coinGainPopup = document.getElementById('coin-gain-popup');
                    const coinHudItem = coinCounter ? coinCounter.parentElement : null; // .hud-item

                    if (coinGainPopup) {
                        coinGainPopup.innerText = `+${totalGained}`;
                        coinGainPopup.style.color = '#ffdf00';
                        coinGainPopup.style.textShadow = '0 0 10px rgba(255, 223, 0, 0.8)';
                        coinGainPopup.classList.remove('hidden');
                        coinGainPopup.classList.remove('animate');
                        // 리플로우 유도
                        void coinGainPopup.offsetWidth;
                        coinGainPopup.classList.add('animate');

                        // [신규] 팝업 애니메이션 1회성 마비 해결 클린업 타이머 탑재
                        if (coinGainPopup.cleanupTimer) clearTimeout(coinGainPopup.cleanupTimer);
                        coinGainPopup.cleanupTimer = setTimeout(() => {
                            coinGainPopup.classList.remove('animate');
                            coinGainPopup.classList.add('hidden');
                            coinGainPopup.innerText = '';
                        }, 1000);
                    }

                    if (coinHudItem) {
                        coinHudItem.classList.remove('pulse');
                        void coinHudItem.offsetWidth;
                        coinHudItem.classList.add('pulse');
                        setTimeout(() => {
                            coinHudItem.classList.remove('pulse');
                        }, 500);
                    }

                    // B. 안내 연출 최소화 (수정 1: 매번 뜨는 큰 팝업 피로도 방지를 위해 간결한 플로팅 텍스트 처리)
                    if (this.player.perfectClearFlag) {
                        this.showFloatingText(`+${totalGained} 📀 (Perfect!)`, this.player.x, this.player.y - 30, '#ffdf00');
                        Sound.play('coin');
                    } else {
                        this.showFloatingText(`+${totalGained} 📀`, this.player.x, this.player.y - 30, '#ffdf00');
                        Sound.play('coin');
                    }

                    // C. 방 테마에 따른 보상 물리 스폰
                    if (this.currentRoomType === 'shop') {
                        // 자판기 타입 랜덤 배정 (스탯 60%, 무기 20%, 방어구 20%)
                        let shopRand = Math.random();
                        let machineType = 'stat';
                        if (shopRand > 0.8) {
                            machineType = 'equipment';
                        } else if (shopRand > 0.6) {
                            machineType = 'weapon';
                        }

                        this.vendingMachines.push(new VendingMachine(spawnX, spawnY, machineType));
                        this.showFloatingText("VENDING MACHINE ARRIVED!", spawnX, spawnY - 60, '#ffdf00');

                        // 상점방은 힐링을 위해 네온 물약 확정 1개 추가 드롭 (안전 영역 체크)
                        let potionY = spawnY + 70;
                        if (this.isTileWall(spawnX, potionY)) {
                            potionY = spawnY - 70; // 아래가 벽이면 위쪽 검사
                            if (this.isTileWall(spawnX, potionY)) {
                                potionY = spawnY; // 둘 다 벽이면 중앙 폴백
                            }
                        }
                        this.potions.push(new NeonPotion(spawnX, potionY));

                        // 상점방은 구매 의사 결정을 대기하지 않고 즉시 문을 개방해 둡니다. (돈이 없는 유저 탈출용)
                        this.portals.forEach(p => p.active = true);
                    } else if (this.currentRoomType === 'stat' && this.roomNum % 5 !== 0) {
                        // [신규 기획] 일반 스탯 방인 경우, 보상 상자 스폰을 생략하고 포털 즉시 활성화
                        this.portals.forEach(p => p.active = true);
                        this.showFloatingText("PORTALS ACTIVATED! ⚡", spawnX, spawnY - 60, '#00f0ff');

                        // [추가] 방 소탕 완료 시 확률적으로 체력 회복 포션 드롭 (안전 영역 체크)
                        let potionRand = Math.random();
                        let potionDropChance = 0.30 + Math.min(0.20, (this.player.luk - 1.0) * 0.05);
                        if (potionRand < potionDropChance) {
                            let pY = spawnY + 50;
                            if (this.isTileWall(spawnX, pY)) pY = spawnY - 50;
                            if (this.isTileWall(spawnX, pY)) pY = spawnY;
                            this.potions.push(new NeonPotion(spawnX, pY));
                            this.showFloatingText("HEALTH POTION SPONSED! 🩺", spawnX, spawnY - 30, '#39ff14');
                        }
                    } else {
                        // 무기, 장비 및 보스/엘리트 스탯 방(5의 배수 방)인 경우 상자 스폰
                        if (this.currentRoomType === 'weapon') {
                            this.weaponMerchants.push(new WeaponMerchant(spawnX, spawnY));
                            this.portals.forEach(p => p.active = true);
                        } else {
                            this.rewardChests.push(new RewardChest(spawnX, spawnY, this.currentRoomType));
                        }
                        if (this.currentRoomType === 'weapon') {
                            this.showFloatingText("WEAPON MERCHANT ARRIVED! 🏪", spawnX, spawnY - 60, '#39ff14');
                        } else {
                            this.showFloatingText("REWARD CHEST ARRIVED!", spawnX, spawnY - 60, this.currentRoomType === 'stat' ? '#00f0ff' : '#ff6c00');
                        }

                        // [추가] 방 소탕 완료 시 확률적으로 체력 회복 포션 드롭 (기본 30% + 행운 계수 비례 추가 확률)
                        let potionRand = Math.random();
                        let potionDropChance = 0.30 + Math.min(0.20, (this.player.luk - 1.0) * 0.05); // 행운 비례 추가 확률 최대 +20% 제한
                        if (potionRand < potionDropChance) {
                            // 맵 중앙 부근에서 약간 아래쪽에 스폰 (보상 상자와 겹침 방지, 안전 영역 체크)
                            let pY = spawnY + 50;
                            if (this.isTileWall(spawnX, pY)) {
                                pY = spawnY - 50; // 아래가 벽이면 위쪽 검사
                                if (this.isTileWall(spawnX, pY)) {
                                    pY = spawnY; // 둘 다 벽이면 중앙 폴백
                                }
                            }
                            this.potions.push(new NeonPotion(spawnX, pY));
                            this.showFloatingText("HEALTH POTION SPONSED! 🩺", spawnX, spawnY - 30, '#39ff14');
                        }
                    }

                    // [신규 기획] 설계도 상자(Blueprint Chest) 스폰 (35% 기본 확률 + 행운 비례 추가 확률)
                    let bpChestChance = 0.35 + Math.min(0.25, (this.player.luk - 1.0) * 0.05);
                    if (Math.random() < bpChestChance && this.roomNum > 1 && !this.inSecretRoom && this.roomNum !== 100 && this.roomNum !== 101) {
                        let bpSpawnX = spawnX + (Math.random() * 80 - 40);
                        let bpSpawnY = spawnY + 45;
                        if (this.isTileWall(bpSpawnX, bpSpawnY)) {
                            bpSpawnX = spawnX;
                            bpSpawnY = spawnY;
                        }
                        this.blueprintChests.push(new BlueprintChest(bpSpawnX, bpSpawnY));
                        this.showFloatingText("BLUEPRINT CHEST ARRIVED! 📦", bpSpawnX, bpSpawnY - 60, '#ffdf00');
                    }

                    // [신규 기획] 상자/자판기 스폰 시 화려한 네온 글로우 파티클 분수 격발 (30개)
                    let spawnColor = this.currentRoomType === 'stat' ? '#00f0ff' : (this.currentRoomType === 'weapon' ? '#b026ff' : (this.currentRoomType === 'equipment' ? '#ff6c00' : '#ffdf00'));
                    for (let k = 0; k < 30; k++) {
                        let pAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5; // 하늘 위 방향 부채꼴 분수
                        let pSpeed = Math.random() * 5 + 2.5;
                        this.particles.push(new Particle(spawnX, spawnY, spawnColor, 2.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 35, 'spark'));
                    }
                }
            } else {
                // 1방 시작 안전실일 경우 즉시 개방
                if (this.portals.length > 0 && !this.portals[0].active) {
                    this.portals.forEach(p => p.active = true);
                }
            }

            // 개방된 문으로 플레이어가 충돌했는지 검사
            if (!this.gameClearActive && !this.gameOverActive) {
                for (let p of this.portals) {
                    if (p.checkCollision(this.player)) {
                        this.transitionToNextRoom(p);
                        break;
                    }
                }
            }
        }

        // [신규 기획] 비밀방 상호작용 디바이스(SecretGlitchDevice) 물리 충돌 감지 및 상호작용 트리거
        for (let i = this.secretGlitchDevices.length - 1; i >= 0; i--) {
            let device = this.secretGlitchDevices[i];
            if (!device.active) continue;
            let dist = Math.hypot(this.player.x - device.x, this.player.y - device.y);
            if (dist < this.player.radius + device.radius) {
                device.active = false;
                this.triggerSecretGlitchReward(device);
                this.secretGlitchDevices.splice(i, 1);
            }
        }

        // [신규 기획] 보상 상자(Reward Chest) 물리 충돌 검사
        for (let i = this.rewardChests.length - 1; i >= 0; i--) {
            let chest = this.rewardChests[i];
            if (!chest.active) continue;
            let dist = Math.hypot(this.player.x - chest.x, this.player.y - chest.y);
            if (dist < this.player.radius + 18) { // 상자 가로폭 충돌 반경 보정
                chest.active = false;

                // 네온 파편 스파크 폭발 이펙트
                for (let k = 0; k < 25; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 5 + 2;
                    this.particles.push(new Particle(chest.x, chest.y, chest.color, 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 25));
                }
                Sound.play('victory');

                // [신규 기믹] 보상 상자 획득 시 맵 상의 모든 네온코인을 플레이어에게 즉시 끌어당김
                this.coinsList.forEach(coin => {
                    coin.isAttractedToPlayer = true;
                });

                // 바로 카드 오버레이를 띄우지 않고 45프레임(약 0.75초) 지연 후 트리거되도록 딜레이 시스템 활성화
                this.rewardSelectorDelayTimer = 45;
                this.rewardSelectorIsFromHiddenChest = false;

                // 상자 삭제
                this.rewardChests.splice(i, 1);
            }
        }

        // [신규 기획] 설계도 상자(Blueprint Chest) 물리 충돌 검사
        for (let i = this.blueprintChests.length - 1; i >= 0; i--) {
            let chest = this.blueprintChests[i];
            if (!chest.active) continue;
            let dist = Math.hypot(this.player.x - chest.x, this.player.y - chest.y);
            if (dist < this.player.radius + 18) {
                chest.active = false;

                // 금색 네온 파편 스파크 폭발 이펙트
                for (let k = 0; k < 25; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 5 + 2;
                    this.particles.push(new Particle(chest.x, chest.y, chest.color, 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 25));
                }
                Sound.play('powerup');

                // 설계도 선택창 큐에 추가
                this.enqueueReward({ type: 'blueprint' });

                // 상자 삭제
                this.blueprintChests.splice(i, 1);
            }
        }

        // [수정] 결함 3: 자판기 상점(Vending Machine) 물리 충돌 및 들이받기 구매 검사
        for (let i = this.vendingMachines.length - 1; i >= 0; i--) {
            let vm = this.vendingMachines[i];
            if (!vm.active) continue;
            let dist = Math.hypot(this.player.x - vm.x, this.player.y - vm.y);
            if (dist < this.player.radius + 24) { // 자판기 물리 충돌 반경
                if (this.vendingCooldown === 0) {
                    let price = vm.getPrice();
                    if (this.player.coins >= price) {
                        let cards = this.generateRewardCardsData(this.currentSpawnTotal);
                        if (cards.length > 0) {
                            let chosenCard = cards[0]; // 1번째 슬롯 카드를 무작위 획득 배정

                            this.player.coins -= price;
                            vm.purchaseCount++;
                            this.vendingCooldown = 60; // 1.0초 쿨다운으로 연사/중복 들이받기 방지

                            // [신규 기믹] 자판기 구매 시 맵 상의 모든 네온코인을 플레이어에게 즉시 끌어당김
                            this.coinsList.forEach(coin => {
                                coin.isAttractedToPlayer = true;
                            });

                            Sound.play('powerup');

                            // [수정] 결함 4: 자판기 구매 시 마이너스 코인 연출 상단 결합!
                            const coinGainPopup = document.getElementById('coin-gain-popup');
                            if (coinGainPopup) {
                                coinGainPopup.innerText = `-${price}`;
                                coinGainPopup.style.color = '#ff0055';
                                coinGainPopup.style.textShadow = '0 0 10px rgba(255, 0, 85, 0.8)';
                                coinGainPopup.classList.remove('hidden');
                                coinGainPopup.classList.remove('animate');
                                void coinGainPopup.offsetWidth;
                                coinGainPopup.classList.add('animate');

                                // [신규] 팝업 애니메이션 1회성 마비 해결 클린업 타이머 탑재
                                if (coinGainPopup.cleanupTimer) clearTimeout(coinGainPopup.cleanupTimer);
                                coinGainPopup.cleanupTimer = setTimeout(() => {
                                    coinGainPopup.classList.remove('animate');
                                    coinGainPopup.classList.add('hidden');
                                    coinGainPopup.innerText = '';
                                }, 1000);
                            }

                            // [수정] 결함 해결: 들이받는 즉시 플레이어를 자판기 정반대 방향으로 38px 물리적으로 팅겨나가게 밀어냄! (연속 자동 구매 예방)
                            let bounceAngle = Math.atan2(this.player.y - vm.y, this.player.x - vm.x);
                            this.player.x += Math.cos(bounceAngle) * 38;
                            this.player.y += Math.sin(bounceAngle) * 38;

                            // 맵 경계선 마진 밖으로 탈출하는 것을 방지하기 위해 플레이어 맵 가두기 보정 추가
                            const wallMargin = 40;
                            this.player.x = Math.max(wallMargin + this.player.radius, Math.min(this.mapWidth - wallMargin - this.player.radius, this.player.x));
                            this.player.y = Math.max(wallMargin + this.player.radius, Math.min(this.mapHeight - wallMargin - this.player.radius, this.player.y));

                            // 팅겨나갈 때 귀여운 튕김 스파크 6개 발생
                            for (let k = 0; k < 6; k++) {
                                let angle = bounceAngle + (Math.random() * 0.8 - 0.4);
                                let speed = Math.random() * 3 + 1.5;
                                this.particles.push(new Particle(this.player.x, this.player.y, '#ffdf00', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15));
                            }
                            Sound.play('dodge'); // 통 튕기는 회피 효과음 출력

                            // 자판기 위에 카드 모양 퐁 날려보내기 파티클
                            for (let k = 0; k < 15; k++) {
                                let pAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
                                let pSpeed = Math.random() * 4 + 2;
                                this.particles.push(new Particle(vm.x, vm.y - 20, vm.color, 2, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20));
                            }

                            // [수정] 즉시 획득 대신 상점 구매 완료 오버레이 호출하여 유저 승인/확인 유도!
                            this.triggerShopPurchaseConfirmation(chosenCard, vm.color);
                        }
                    } else {
                        // 잔액 부족 알림
                        this.vendingCooldown = 30;
                        Sound.play('hit');
                        this.showFloatingText(`NOT ENOUGH 📀 (NEED 📀${price})`, this.player.x, this.player.y - 30, '#ff0055');
                    }
                }
            }
        }


        // [네온 암시장] 비밀 자판기(SecretVendingMachine) 충돌 감지 및 차원 거래 팝업 호출
        for (let i = this.secretVendingMachines.length - 1; i >= 0; i--) {
            let svm = this.secretVendingMachines[i];
            if (!svm.active) continue;

            // 차원 파티클 아우라 주기적 방출 (15프레임마다 보라빛 파티클 2개)
            svm.particleTimer++;
            if (svm.particleTimer % 15 === 0) {
                for (let k = 0; k < 2; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 0.8 + 0.3;
                    this.particles.push(new Particle(
                        svm.x + (Math.random() - 0.5) * 30,
                        svm.y + (Math.random() - 0.5) * 40,
                        '#b026ff', 1.5,
                        Math.cos(pAngle) * pSpeed,
                        Math.sin(pAngle) * pSpeed,
                        25, 'spark'
                    ));
                }
            }

            let dist = Math.hypot(this.player.x - svm.x, this.player.y - svm.y);
            if (dist < this.player.radius + 26) { // 비밀 자판기 충돌 반경
                if (this.vendingCooldown === 0) {
                    // 최대 체력이 15 이하면 거래 불가 (안전 가드)
                    if (this.player.maxHp <= 15) {
                        this.vendingCooldown = 60;
                        Sound.play('hit');
                        this.showFloatingText("⚠️ 제물이 부족합니다 (Max HP ≤ 15)", this.player.x, this.player.y - 30, '#ff0055');
                    } else {
                        this.vendingCooldown = 60;
                        // 플레이어를 자판기 반대 방향으로 밀어냄 (연속 충돌 방지)
                        let bounceAngle = Math.atan2(this.player.y - svm.y, this.player.x - svm.x);
                        this.player.x += Math.cos(bounceAngle) * 38;
                        this.player.y += Math.sin(bounceAngle) * 38;
                        const wallMargin = 40;
                        this.player.x = Math.max(wallMargin + this.player.radius, Math.min(this.mapWidth - wallMargin - this.player.radius, this.player.x));
                        this.player.y = Math.max(wallMargin + this.player.radius, Math.min(this.mapHeight - wallMargin - this.player.radius, this.player.y));

                        // 튕김 파티클 (보라색)
                        for (let k = 0; k < 6; k++) {
                            let angle = bounceAngle + (Math.random() * 0.8 - 0.4);
                            let speed = Math.random() * 3 + 1.5;
                            this.particles.push(new Particle(this.player.x, this.player.y, '#b026ff', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15));
                        }
                        Sound.play('dodge');

                        // [신규 기믹] 비밀 자판기 거래 시 모든 코인을 플레이어에게 즉시 끌어당김
                        this.coinsList.forEach(coin => {
                            coin.isAttractedToPlayer = true;
                        });

                        // 차원 거래 팝업 호출 (에픽/레전더리 확정 카드 생성)
                        this.triggerSecretShopPurchase(svm, i);
                    }
                }
            }
        }

        // [신규 기획] 무기 상인(WeaponMerchant) 충돌 감지 및 상점 팝업 호출
        for (let i = this.weaponMerchants.length - 1; i >= 0; i--) {
            let wm = this.weaponMerchants[i];
            if (!wm.active) continue;

            let dist = Math.hypot(this.player.x - wm.x, this.player.y - wm.y);
            if (dist < this.player.radius + wm.radius) {
                if (this.vendingCooldown === 0) {
                    this.vendingCooldown = 60; // 1.0초 쿨다운

                    // 플레이어를 NPC 반대 방향으로 밀어냄 (연속 충돌 방지)
                    let bounceAngle = Math.atan2(this.player.y - wm.y, this.player.x - wm.x);
                    this.player.x += Math.cos(bounceAngle) * 38;
                    this.player.y += Math.sin(bounceAngle) * 38;
                    const wallMargin = 40;
                    this.player.x = Math.max(wallMargin + this.player.radius, Math.min(this.mapWidth - wallMargin - this.player.radius, this.player.x));
                    this.player.y = Math.max(wallMargin + this.player.radius, Math.min(this.mapHeight - wallMargin - this.player.radius, this.player.y));

                    // 튕김 파티클 (초록색)
                    for (let k = 0; k < 6; k++) {
                        let angle = bounceAngle + (Math.random() * 0.8 - 0.4);
                        let speed = Math.random() * 3 + 1.5;
                        this.particles.push(new Particle(this.player.x, this.player.y, '#39ff14', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15));
                    }
                    Sound.play('dodge');

                    // 모든 코인 끌어당김
                    this.coinsList.forEach(coin => {
                        coin.isAttractedToPlayer = true;
                    });

                    // 무기 상인 거래 창 오픈
                    this.toggleNPCMenu();
                }
            }
        }

        // [추가] 힐링 물약 자석 블랙홀 흡입 및 업데이트 물리 연산
        for (let i = this.potions.length - 1; i >= 0; i--) {
            let pot = this.potions[i];

            // 물약 생성자 속성 누락 대비 방어 코드
            if (pot.vx === undefined) pot.vx = 0;
            if (pot.vy === undefined) pot.vy = 0;

            let potDist = Math.hypot(this.player.x - pot.x, this.player.y - pot.y);
            let pullRadius = 70; // 평소 자석 반경 70px

            if (this.timeDilationActive) {
                pullRadius = 1000; // 시간 왜곡 시 초강력 블랙홀 흡입
            }

            if (potDist < pullRadius) {
                let pullForce = this.timeDilationActive ? 12.0 : 4.0;
                let angleToPlayer = Math.atan2(this.player.y - pot.y, this.player.x - pot.x);
                pot.vx += Math.cos(angleToPlayer) * pullForce * 0.15;
                pot.vy += Math.sin(angleToPlayer) * pullForce * 0.15;

                let currentSpeed = Math.hypot(pot.vx, pot.vy);
                let maxSpeed = this.timeDilationActive ? 15.0 : 6.0;
                if (currentSpeed > maxSpeed) {
                    pot.vx = (pot.vx / currentSpeed) * maxSpeed;
                    pot.vy = (pot.vy / currentSpeed) * maxSpeed;
                }

                pot.x += pot.vx;
                pot.y += pot.vy;
            } else {
                pot.vx *= 0.95;
                pot.vy *= 0.95;
                pot.x += pot.vx;
                pot.y += pot.vy;
            }
        }

        // [추가] 힐링 물약 실시간 습득 충돌 검사
        for (let i = this.potions.length - 1; i >= 0; i--) {
            let pot = this.potions[i];
            let potDist = Math.hypot(this.player.x - pot.x, this.player.y - pot.y);
            if (potDist < this.player.radius + pot.radius) {
                // 최대 체력의 10% 치유 처리
                let healAmount = this.player.maxHp * 0.10;

                // [신규 기획] Health Ring 5레벨 돌파: 힐 포션 치유 효율 50% 버프 적용!
                if (this.player.equipLevels.ring_hp >= 5) {
                    healAmount *= 1.5;
                }

                if (this.player.craftedPassives && this.player.craftedPassives.includes('nanobots_injector')) {
                    healAmount *= 1.3;
                }

                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);

                // 치유 성공 텍스트 및 효과음
                this.showFloatingText(`HEAL +${Math.ceil(healAmount)}`, this.player.x, this.player.y - 25, '#39ff14');
                Sound.play('powerup');

                // 경쾌한 네온 그린 스파크 파티클 폭발
                for (let k = 0; k < 12; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 3 + 1;
                    this.particles.push(new Particle(pot.x, pot.y, '#39ff14', 2.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20));
                }

                // 물약 소멸
                this.potions.splice(i, 1);
            }
        }

        // [W-08 신규 구현] 드롭 코인 실시간 업데이트 및 플레이어 습득 충돌 검사
        for (let i = this.coinsList.length - 1; i >= 0; i--) {
            let coin = this.coinsList[i];

            // 코인 물리 및 자석 이동 처리
            coin.update(this.player, this.timeDilationActive);

            // 플레이어와 충돌 시 획득
            let dist = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);
            if (dist < this.player.radius + coin.radius) {
                this.player.coins += coin.amount;

                // 골드 획득 텍스트
                this.showFloatingText(`+${coin.amount} 📀`, this.player.x, this.player.y - 25, '#ffdf00');
                Sound.play('coin');

                // 황금색 스파크 파티클 연출
                for (let k = 0; k < 6; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 2 + 1;
                    this.particles.push(new Particle(coin.x, coin.y, '#ffdf00', 1.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15));
                }

                // [신규 기획] 실시간 코인 HUD 연출 트리거
                const coinGainPopup = document.getElementById('coin-gain-popup');
                if (coinGainPopup) {
                    coinGainPopup.innerText = `+${coin.amount}`;
                    coinGainPopup.style.color = '#ffdf00';
                    coinGainPopup.style.textShadow = '0 0 10px rgba(255, 223, 0, 0.8)';
                    coinGainPopup.classList.remove('hidden');
                    coinGainPopup.classList.remove('animate');
                    void coinGainPopup.offsetWidth; // 리플로우
                    coinGainPopup.classList.add('animate');

                    // [신규] 팝업 애니메이션 1회성 마비 해결 클린업 타이머 탑재
                    if (coinGainPopup.cleanupTimer) clearTimeout(coinGainPopup.cleanupTimer);
                    coinGainPopup.cleanupTimer = setTimeout(() => {
                        coinGainPopup.classList.remove('animate');
                        coinGainPopup.classList.add('hidden');
                        coinGainPopup.innerText = '';
                    }, 1000);
                }

                // 코인 삭제
                this.coinsList.splice(i, 1);
            }
        }
        // [신규] 지연 삭제 사망 마킹된 몬스터들 일괄 Cleanup 정리 연산
        this.monsters = this.monsters.filter(m => !m.dead);

        // 게이지 바 텍스트 실시간 출력 동기화
        this.updateHUD();
    }

    // [W-07 신규 구현] 체인 라이트닝(연쇄 벼락) 전이 트리거
    triggerChainLightning(startX, startY, currentEnemy, chainsLeft, damage) {
        if (chainsLeft <= 0 || this.monsters.length === 0) return;

        // [최적화] 연쇄 번개 전이 타격 노랑 낙뢰 이펙트 파티클을 3개로 간소화
        for (let k = 0; k < 3; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 3 + 1;
            this.particles.push(new Particle(currentEnemy.x, currentEnemy.y, '#ffdf00', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 18, 'spark'));
        }

        // 주변 몬스터 중 가장 가까운 다른 몬스터 탐색 (번개 전이 거리 180px 제한)
        let nextTarget = null;
        let minDist = 180; // 최대 전이 거리

        for (let other of this.monsters) {
            if (other === currentEnemy) continue;
            let dist = Math.hypot(other.x - currentEnemy.x, other.y - currentEnemy.y);
            if (dist < minDist) {
                minDist = dist;
                nextTarget = other;
            }
        }

        if (nextTarget) {
            // [최적화] 연쇄 번개 전류 와이어 시각 파티클을 3개로 줄여 렉 경감 (징검다리 렌더링)
            let dx = nextTarget.x - currentEnemy.x;
            let dy = nextTarget.y - currentEnemy.y;
            for (let i = 0; i <= 2; i++) {
                let step = i / 2;
                let px = currentEnemy.x + dx * step;
                let py = currentEnemy.y + dy * step;
                this.particles.push(new Particle(px, py, '#ffdf00', 1.8, 0, 0, 15, 'spark'));
            }

            // 데미지 가함
            nextTarget.hp -= damage;
            nextTarget.flashTimer = 5;
            this.triggerChainLightning(nextTarget.x, nextTarget.y, nextTarget, chainsLeft - 1, damage);
        }
    }

    // [신규] W-05 불마법 화상 5중첩 사망 시 사방 연쇄 폭발 트리거
    triggerFireExplosion(x, y) {
        Sound.play('explosion');
        // 불타는 붉은색 파티클 20개 사방으로 폭사
        for (let k = 0; k < 20; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 4 + 1.5;
            this.particles.push(new Particle(x, y, '#ff5e00', 3, Math.cos(angle) * speed, Math.sin(angle) * speed, 25, 'spark'));
        }

        const fireExplosionRadius = 120;
        const fireExplosionDmg = this.player.atk * 1.8;

        this.showFloatingText("🔥 FIRE EXPLOSION! 🔥", x, y - 30, '#ff5e00');
        this.shakeScreen(10, 4.0);

        // 사망 몬스터 주변 적들에게 연쇄 대폭발 데미지
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            if (!m || m.dead) continue;
            let dist = Math.hypot(m.x - x, m.y - y);
            if (dist < fireExplosionRadius + m.radius) {
                let finalDmg = fireExplosionDmg;
                if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                m.hp -= finalDmg;
                m.flashTimer = 5;

                // [버그 수정] 화상 대폭발 대미지로 사망 시 정산 처리 추가
                if (m.hp <= 0) {
                    this.killMonster(m, i);
                }

                // 넉백 반사
                let angle = Math.atan2(m.y - y, m.x - x);
                m.knockbackX += Math.cos(angle) * 4.5;
                m.knockbackY += Math.sin(angle) * 4.5;
                m.isPlayerKnockback = true;

                // 전이 화상 스택 1개 자동 축적
                m.statusEffects.burn = 240; // 4초 지속
                m.statusEffects.burnStack = Math.min(5, (m.statusEffects.burnStack || 0) + 1);
            }
        }
    }

    // [신규 기획] 비밀방 글리치 장치 보상 테이블 격발 (꽝 50%, 코인 35%, 체력 거래 15%)
    triggerSecretGlitchReward(device) {
        Sound.play('victory');

        // 보랏빛 폭발 파티클 이펙트
        for (let k = 0; k < 30; k++) {
            let pAngle = Math.random() * Math.PI * 2;
            let pSpeed = Math.random() * 5 + 2;
            this.particles.push(new Particle(device.x, device.y, '#b026ff', 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 25));
        }

        // [3슬롯 계약 미체결 상태인 경우 우선 제안]
        if (this.player.maxWeaponSlots === 2) {
            this.triggerThreeSlotContract(device);
            return;
        }

        let rand = Math.random();

        if (rand < 0.50) {
            // 1. 꽝 (50% 확률)
            this.showFloatingText("SYSTEM ERROR: NO REWARD ❌", device.x, device.y - 30, '#ff0055');
            Sound.play('hit');
            this.shakeScreen(15, 5.0);

            // 지지직거리는 오작동 스파크 파편 사출
            for (let k = 0; k < 15; k++) {
                let pAngle = Math.random() * Math.PI * 2;
                let pSpeed = Math.random() * 3 + 1;
                this.particles.push(new Particle(device.x, device.y, '#ff0055', 2, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 15, 'spark'));
            }
        }
        else if (rand < 0.85) {
            // 2. 네온 코인 (35% 확률) - 다량의 코인 드롭
            let coinCount = Math.floor(Math.random() * 21) + 40; // 40~60 코인 드롭
            this.showFloatingText(`SYSTEM CRACK: GAINED ${coinCount} 📀!`, device.x, device.y - 30, '#ffdf00');
            Sound.play('coin');

            // 코인이 방 중앙에서 통통 튕겨 나오도록 드롭
            for (let k = 0; k < coinCount; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 4 + 2;
                let coin = new NeonCoin(device.x, device.y, 1);
                coin.vx = Math.cos(angle) * speed;
                coin.vy = Math.sin(angle) * speed;
                this.coinsList.push(coin);
            }
        }
        else {
            // 3. 체력 거래 상점 (15% 확률) - 특별 비밀 자판기 소환
            this.showFloatingText("🔮 CHAOTIC BLACK MARKET OPENED!", device.x, device.y - 35, '#b026ff');
            Sound.play('boss_alert');

            // [수정] 맵의 가변 중앙 좌표에 맞게 자판기를 스폰하고 파편 파티클을 소환합니다.
            let cx = this.mapWidth / 2;
            let cy = this.mapHeight / 2;
            this.secretVendingMachines.push(new SecretVendingMachine(cx, cy));

            // 소환 스파크 파편
            for (let k = 0; k < 20; k++) {
                let pAngle = Math.random() * Math.PI * 2;
                let pSpeed = Math.random() * 4 + 2;
                this.particles.push(new Particle(cx, cy, '#b026ff', 2.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20, 'spark'));
            }
        }

        // 상호작용 완료 시점에 비밀방 탈출구 포털을 즉시 개방하여 탈출할 수 있도록 뚫어줌!
        this.portals.forEach(p => p.active = true);
    }

    // [신규 기믹] 3슬롯 계약 제안 및 체결 처리
    triggerThreeSlotContract(device) {
        const overlay = document.getElementById('secret-shop-overlay');
        const iconDiv = document.getElementById('secret-shop-card-icon');
        const titleH3 = document.getElementById('secret-shop-card-title');
        const descP = document.getElementById('secret-shop-card-desc');
        const rarityTag = document.getElementById('secret-shop-card-rarity');
        const acceptBtn = document.getElementById('secret-shop-accept-btn');
        const rejectBtn = document.getElementById('secret-shop-reject-btn');
        const warningText = overlay.querySelector('.warning-blood-text');

        // 모달 UI에 3슬롯 계약 정보 바인딩
        rarityTag.className = `card-rarity legendary`;
        rarityTag.innerText = "CONTRACT";
        rarityTag.style.background = `rgba(255, 0, 85, 0.2)`;
        rarityTag.style.borderColor = '#ff0055';
        rarityTag.style.color = '#ff0055';

        iconDiv.innerText = "🔮";
        titleH3.innerText = "3번째 무기 슬롯 해금";
        descP.innerText = "융합 시너지는 없으나, 독립적으로 자동 동시 격발되는 3번째 보조 무기를 들 수 있게 됩니다. (획득 후 교체 불가)";
        if (warningText) {
            warningText.innerText = "⚠️ 거래의 대가: 최대 체력(Max HP) 50% 영구 감소";
        }

        overlay.classList.remove('hidden');

        acceptBtn.onclick = null;
        rejectBtn.onclick = null;

        acceptBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.classList.add('hidden');

            // 최대 체력 50% 영구 감소
            this.player.maxHp = Math.max(1, Math.floor(this.player.maxHp * 0.5));
            if (this.player.hp > this.player.maxHp) {
                this.player.hp = this.player.maxHp;
            }

            // 슬롯 해금
            this.player.maxWeaponSlots = 3;

            Sound.play('boss_alert');
            this.showFloatingText("CONTRACT SEALED! 🔮 SLOTS INCREASED TO 3", this.player.x, this.player.y - 30, '#ff0055');

            // 화면 흔들림 및 붉은 스파크 이펙트
            this.shakeScreen(30, 8.0);
            for (let k = 0; k < 40; k++) {
                let pAngle = Math.random() * Math.PI * 2;
                let pSpeed = Math.random() * 6 + 2;
                this.particles.push(new Particle(this.player.x, this.player.y, '#ff0055', 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 35, 'spark'));
            }

            // 탈출구 포털 활성화
            this.portals.forEach(p => p.active = true);
        };

        rejectBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.classList.add('hidden');
            this.showFloatingText("CONTRACT REJECTED", this.player.x, this.player.y - 30, '#a0aec0');
            // 거절하더라도 탈출구 포털은 열어줌 (비밀방에서 영원히 갇히는 결함 방지)
            this.portals.forEach(p => p.active = true);
        };
    }

    // [신규 기획] 사이버 낫 휘두르기 타격 판정
    triggerScytheAttack(angle, damage) {
        let isAdvanced = (this.player.equippedWeapons[0] === 'void_destroyer');
        let scytheRadius = isAdvanced ? 130 : 90; // 사거리 억제
        let scytheArc = 1.6; // 넓은 부채꼴 휩쓸기 궤적
        let particleColor = isAdvanced ? '#8b5cf6' : '#ba55d3';

        // 궤적을 따라 이펙트 잔상 생성
        if (isAdvanced) {
            // [진화형] 보이드 디스트로이어: 은하수 같은 자색/시안 보이드 성운 입자 (1초간 부유)
            for (let offset = -1.2; offset <= 1.2; offset += 0.2) {
                let wAngle = angle + offset;
                let sx = this.player.x + Math.cos(wAngle) * scytheRadius * 0.75;
                let sy = this.player.y + Math.sin(wAngle) * scytheRadius * 0.75;
                
                // 보랏빛 및 시안빛 솜털 성운
                let color = Math.random() < 0.6 ? '#8b5cf6' : '#00f0ff';
                let vx = (Math.random() - 0.5) * 0.6;
                let vy = (Math.random() - 0.5) * 0.6;
                this.particles.push(new Particle(sx, sy, color, Math.random() * 12 + 6, vx, vy, 60, 'nebula'));
            }
        } else {
            // [조잡형] 중력 낫: 휘둘러진 자리에 검은색 원형 중력 잔상(Blackhole) 생성
            for (let offset of [-0.8, 0, 0.8]) {
                let wAngle = angle + offset;
                let sx = this.player.x + Math.cos(wAngle) * scytheRadius * 0.8;
                let sy = this.player.y + Math.sin(wAngle) * scytheRadius * 0.8;
                this.particles.push(new Particle(sx, sy, '#8b5cf6', 35, 0, 0, 30, 'blackhole'));
            }
        }

        // 명중한 몬스터 검사
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (dist < scytheRadius + m.radius) {
                let targetAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                let angleDiff = Math.abs(targetAngle - angle);
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                if (Math.abs(angleDiff) < scytheArc) {
                    let finalDmg = damage;
                    if (m.scytheDebuffTimer > 0) {
                        finalDmg *= 1.25; // 이미 부식 상태면 25% 추가 피해
                    }

                    // 부식/표식 디버프 부여 (3초지속 = 180프레임)
                    m.scytheDebuffTimer = 180;
                    if (isAdvanced) {
                        m.glitchTimer = 180; // 진화형 수확 낫 명중 시 3초간 디지털 글리치 지직거림
                    }

                    m.hp -= finalDmg;
                    m.flashTimer = 2;

                    // 낫 특유의 살짝 당기는 넉백 물리 가미
                    let kbAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                    m.vx += Math.cos(kbAngle) * 2.5;
                    m.vy += Math.sin(kbAngle) * 2.5;

                    for (let k = 0; k < 3; k++) {
                        this.particles.push(new Particle(m.x, m.y, particleColor, 1.5, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 15, 'spark'));
                    }

                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }
                }
            }
        }

        // 융합 효과: 주(낫) + 부(총) -> 낫 궤적 상 3군데 지점에서 원형 유도 칼날 투사체 퍼짐
        let secondary = this.player.equippedWeapons[1];
        if (secondary === 'gun') {
            let gunLvl = this.player.weaponLevels.gun || 1;
            let gunDmg = this.player.atk * 0.45 * (1 + (gunLvl - 1) * 0.15);
            for (let offset of [-0.8, 0, 0.8]) {
                let wAngle = angle + offset;
                let sx = this.player.x + Math.cos(wAngle) * (scytheRadius * 0.8);
                let sy = this.player.y + Math.sin(wAngle) * (scytheRadius * 0.8);
                let vx = Math.cos(wAngle) * 5;
                let vy = Math.sin(wAngle) * 5;

                this.bullets.push(new Bullet(sx, sy, vx, vy, gunDmg, true, {
                    color: '#ba55d3',
                    radius: 4.5,
                    life: 120,
                    homing: true,
                    homingSpeed: this.player.homingAngleSpeed
                }));
            }
        }
    }

    // [신규 기획] 레일 캐논 일직선 관통 레이저 발사
    triggerRailCannonBeam(angle, damage, isAdvanced = true) {
        let beamLength = this.player.range * 2; // 기본 사거리의 2배 적용
        let beamWidth = isAdvanced ? 10 : 3.5; // 디튠: 광선 폭 억제
        let beamColor = isAdvanced ? '#00f0ff' : '#0064ff';

        // 레이저 비주얼 파티클 빔 생성
        let stepCount = Math.floor(beamLength / 20);
        for (let j = 0; j < stepCount; j++) {
            let px = this.player.x + Math.cos(angle) * (j * 20);
            let py = this.player.y + Math.sin(angle) * (j * 20);
            this.particles.push(new Particle(
                px + (Math.random() - 0.5) * 8,
                py + (Math.random() - 0.5) * 8,
                beamColor, isAdvanced ? 2.0 : 1.2,
                (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5,
                20, 'spark'
            ));
        }

        // 일직선 몬스터 충돌 체크 (선분-원 충돌 판정)
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            let dot = ((m.x - this.player.x) * Math.cos(angle) + (m.y - this.player.y) * Math.sin(angle));
            if (dot >= 0 && dot <= beamLength) {
                let projX = this.player.x + Math.cos(angle) * dot;
                let projY = this.player.y + Math.sin(angle) * dot;
                let distToBeam = Math.hypot(m.x - projX, m.y - projY);

                if (distToBeam < (beamWidth / 2) + m.radius) {
                    let finalDmg = damage;
                    if (m.scytheDebuffTimer > 0) {
                        finalDmg *= 1.25;
                    }

                    m.hp -= finalDmg;
                    m.flashTimer = 2;

                    // 강한 일직선 넉백
                    m.vx += Math.cos(angle) * 5.0;
                    m.vy += Math.sin(angle) * 5.0;

                    for (let k = 0; k < 4; k++) {
                        this.particles.push(new Particle(m.x, m.y, beamColor, 1.8, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 15, 'spark'));
                    }

                    // 융합 효과: 주(레일) + 부(총) -> 명중 지점에서 뒤로 유도탄 3발 튕겨 나감
                    let secondary = this.player.equippedWeapons[1];
                    if (secondary === 'gun') {
                        let gunLvl = this.player.weaponLevels.gun || 1;
                        let gunDmg = this.player.atk * 0.4 * (1 + (gunLvl - 1) * 0.15);
                        for (let k = 0; k < 3; k++) {
                            let pAngle = angle + Math.PI + (Math.random() * 1.5 - 0.75);
                            let vx = Math.cos(pAngle) * 6;
                            let vy = Math.sin(pAngle) * 6;
                            this.bullets.push(new Bullet(m.x, m.y, vx, vy, gunDmg, true, {
                                color: '#00f0ff',
                                radius: 3,
                                life: 25,
                                homing: true,
                                homingSpeed: this.player.homingAngleSpeed
                            }));
                        }
                    }

                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }
                }
            }
        }

        Sound.play('laser');
        this.shakeScreen(10, 4.0);
    }

    // 융합 시너지: 주(레일) + 부(검)
    triggerRailSwordSynergy(angle) {
        let swordLvl = this.player.weaponLevels.sword || 1;
        let bonusDmg = this.player.atk * 0.6 * (1 + (swordLvl - 1) * 0.15);

        for (let dist of [120, 240, 360]) {
            let sx = this.player.x + Math.cos(angle) * dist;
            let sy = this.player.y + Math.sin(angle) * dist;

            this.particles.push(new Particle(sx, sy, '#b026ff', 3.5, 0, 0, 10, 'slash'));

            for (let i = this.monsters.length - 1; i >= 0; i--) {
                let m = this.monsters[i];
                let mDist = Math.hypot(m.x - sx, m.y - sy);
                if (mDist < 60 + m.radius) {
                    m.hp -= bonusDmg;
                    m.flashTimer = 2;
                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }
                }
            }
        }
    }

    // 융합 시너지: 주(레일) + 부(총) (동시 격발 용이성 대비)
    triggerRailGunSynergy(angle) {
        // 이미 triggerRailCannonBeam 명중 판정 내에서 처리하였으므로 방어용 선언만 둡니다.
    }

    // 융합 시너지: 주(낫) + 부(검)
    triggerScytheSwordSynergy(angle, damage) {
        let scytheRadius = 110 + (this.player.range - 350) * 0.15;
        let extRadius = scytheRadius + 45;
        let scytheArc = 1.6;

        for (let offset of [-1.0, 0, 1.0]) {
            let wAngle = angle + offset;
            let sx = this.player.x + Math.cos(wAngle) * extRadius;
            let sy = this.player.y + Math.sin(wAngle) * extRadius;
            this.particles.push(new Particle(sx, sy, '#b026ff', 2.0, 0, 0, 8, 'spark'));
        }

        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
            if (dist >= scytheRadius && dist < extRadius + m.radius) {
                let targetAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                let angleDiff = Math.abs(targetAngle - angle);
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                if (Math.abs(angleDiff) < scytheArc) {
                    m.hp -= damage;
                    m.flashTimer = 2;
                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }
                }
            }
        }
    }

    // 융합 시너지: 주(검) + 부(레일)
    triggerSwordRailSynergy(angle, damage) {
        let beamLength = 400;
        let beamWidth = 12;

        for (let j = 0; j < 15; j++) {
            let px = this.player.x + Math.cos(angle) * (j * 26);
            let py = this.player.y + Math.sin(angle) * (j * 26);
            this.particles.push(new Particle(px, py, '#00f0ff', 1.5, 0, 0, 10, 'spark'));
        }

        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            let dot = ((m.x - this.player.x) * Math.cos(angle) + (m.y - this.player.y) * Math.sin(angle));
            if (dot >= 0 && dot <= beamLength) {
                let projX = this.player.x + Math.cos(angle) * dot;
                let projY = this.player.y + Math.sin(angle) * dot;
                let distToBeam = Math.hypot(m.x - projX, m.y - projY);

                if (distToBeam < (beamWidth / 2) + m.radius) {
                    m.hp -= damage;
                    m.flashTimer = 2;
                    m.vx += Math.cos(angle) * 3;
                    m.vy += Math.sin(angle) * 3;
                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }
                }
            }
        }
        Sound.play('laser');
    }

    // 융합 시너지: 주(총) + 부(낫) -> 총알 명중 지점에 낫 충격파 발생
    triggerScytheImpactSlash(x, y, damage) {
        for (let k = 0; k < 12; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 3 + 1.5;
            this.particles.push(new Particle(x, y, '#ba55d3', 1.8, Math.cos(angle) * speed, Math.sin(angle) * speed, 15, 'spark'));
        }

        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            let dist = Math.hypot(m.x - x, m.y - y);
            if (dist < 60 + m.radius) {
                let finalDmg = damage;
                if (m.scytheDebuffTimer > 0) {
                    finalDmg *= 1.25;
                }
                m.scytheDebuffTimer = 180;
                m.hp -= finalDmg;
                m.flashTimer = 3;

                if (m.hp <= 0) {
                    this.killMonster(m, i);
                }
            }
        }
    }

    // [신규] 장착 무기 기반으로 원거리 무기 보유 여부 판정
    // equippedWeapons의 그룹키를 WEAPON_CATEGORIES와 대조하여 원거리 무기가 있는지 판별
    playerHasRangedWeapon() {
        const p = this.player;
        const wt = p.weaponType;
        // weaponType이 에너지볼/융합/이중형이면 원거리 보유
        if (wt === 'energy_ball' || wt === 'supercritical_plasma_fusion' || wt === 'dual') return true;

        // weaponType이 WEAPON_CATEGORIES에서 ranged로 분류되면 원거리 보유
        if (WEAPON_CATEGORIES[wt] === 'ranged') return true;

        // equippedWeapons 중 원거리 그룹키가 있는지 체크
        const rangedGroups = ['gun', 'lightning', 'fire', 'ice', 'railcannon'];
        for (let w of p.equippedWeapons) {
            if (rangedGroups.includes(w)) return true;
            if (WEAPON_CATEGORIES[w] === 'ranged') return true;
        }
        return false;
    }

    // [신규] 장착 무기 기반으로 근접 무기 보유 여부 판정
    playerHasMeleeWeapon() {
        const p = this.player;
        const wt = p.weaponType;
        // weaponType이 WEAPON_CATEGORIES에서 melee로 분류되면 근접 보유
        if (WEAPON_CATEGORIES[wt] === 'melee') return true;

        // equippedWeapons 중 근접 그룹키가 있는지 체크
        const meleeGroups = ['sword', 'spear', 'whip', 'scythe'];
        for (let w of p.equippedWeapons) {
            if (meleeGroups.includes(w)) return true;
            if (WEAPON_CATEGORIES[w] === 'melee') return true;
        }
        return false;
    }

    // [신규] 무기 ID의 legacy 무기군 그룹 키 반환 헬퍼
    getLegacyWeaponGroup(wpnId) {
        if (!wpnId) return null;
        const groups = {
            sword: ['sword', 'crude_sword', 'plasma_saber'],
            spear: ['spear', 'crude_spear', 'energy_pilebunker'],
            whip: ['whip', 'crude_whip', 'nano_laser_wire'],
            lightning: ['lightning', 'crude_shock', 'chain_emp_shock'],
            fire: ['fire', 'crude_flamethrower', 'fusion_plasma_cannon'],
            ice: ['ice', 'crude_cryo', 'cryo_freezer'],
            thorns: ['thorns', 'crude_thorns', 'gravity_singularity_field'],
            trap: ['trap', 'crude_trap', 'proximity_cyber_mine'],
            scythe: ['scythe', 'crude_scythe', 'void_destroyer'],
            railcannon: ['railcannon', 'crude_rail', 'tachyon_railgun'],
            gun: ['gun', 'energy_ball']
        };
        for (let key in groups) {
            if (groups[key].includes(wpnId)) return key;
        }
        return wpnId;
    }

    // [신규] 무기군의 직관적인 표기명 반환 헬퍼
    getWeaponDisplayName(id) {
        const names = {
            sword: '진동검',
            spear: '유압 랜스',
            whip: '플라즈마 채찍',
            lightning: '테슬라 코일',
            fire: '버스터 캐논',
            ice: '크라이오 건',
            thorns: '나노 섀시',
            trap: '홀로 지뢰',
            scythe: '중력 낫',
            railcannon: '레일건',
            gun: '에너지 볼'
        };
        return names[id] || id;
    }

    // [신규 기획] 3슬롯 및 획득 무기 일반 분기 배치 헬퍼 (그룹 키 정합성 & 첫 무기 교체 기능 가동)
    acquireWeapon(wpnId) {
        const p = this.player;
        const groupKey = this.getLegacyWeaponGroup(wpnId);

        // 이미 장착되어 있는지 검사 (그룹 키 기준으로 비교)
        let equippedGroups = p.equippedWeapons.map(w => this.getLegacyWeaponGroup(w));
        let thirdGroup = this.getLegacyWeaponGroup(p.thirdSlotWeapon);

        if (equippedGroups.includes(groupKey) || (thirdGroup && thirdGroup === groupKey)) {
            return;
        }

        // 첫 번째 무기를 제작/획득할 경우 기존의 에너지볼(gun)은 사용하지 않도록 교체
        if (p.equippedWeapons.length === 1 && this.getLegacyWeaponGroup(p.equippedWeapons[0]) === 'gun') {
            p.equippedWeapons = [wpnId]; // groupKey 대신 실제 wpnId 적재
        } else {
            if (p.equippedWeapons.length < 2) {
                p.equippedWeapons.push(wpnId); // groupKey 대신 실제 wpnId 적재
            } else if (p.maxWeaponSlots === 3 && p.thirdSlotWeapon === null) {
                p.thirdSlotWeapon = wpnId; // groupKey 대신 실제 wpnId 적재
            }
        }
    }

    // [신규 기획] 3번째 보조 무기 쿨타임 별 자동 독립 격발 연동 함수
    triggerThirdSlotWeapon() {
        const p = this.player;
        if (!p.thirdSlotWeapon || p.thirdSlotWeaponCooldown > 0) return;

        let baseCd = 40;
        if (p.thirdSlotWeapon === 'gun') baseCd = 15;
        if (p.thirdSlotWeapon === 'sword') baseCd = 40;
        if (p.thirdSlotWeapon === 'spear') baseCd = 35;
        if (p.thirdSlotWeapon === 'whip') baseCd = 30;
        if (p.thirdSlotWeapon === 'lightning') baseCd = 45;
        if (p.thirdSlotWeapon === 'fire') baseCd = 50;
        if (p.thirdSlotWeapon === 'ice') baseCd = 40;
        if (p.thirdSlotWeapon === 'scythe') baseCd = 55;
        if (p.thirdSlotWeapon === 'railcannon') baseCd = 70;

        p.thirdSlotWeaponCooldown = Math.max(10, baseCd / p.aspd);

        let angle = p.angle;
        let wLvl = p.weaponLevels[p.thirdSlotWeapon] || 1;
        let finalDamage = p.atk * (1 + (wLvl - 1) * 0.15) * 0.7; // 보조 무기이므로 30% 감쇄

        switch (p.thirdSlotWeapon) {
            case 'gun':
                let vx = Math.cos(angle) * 7.0;
                let vy = Math.sin(angle) * 7.0;
                this.bullets.push(new Bullet(p.x, p.y, vx, vy, finalDamage, true, {
                    color: '#00f0ff',
                    radius: 4,
                    life: p.range / 7.0,
                    pierce: p.pierceCount,
                    homing: p.homing,
                    homingSpeed: p.homingAngleSpeed,
                    splash: p.splashRadius,
                    bounceLimit: p.wallBounceLimit,
                    monsterBounceLimit: p.monsterBounceLimit
                }));
                Sound.play('shoot');
                break;
                        case 'sword':
                {
                    let isAdvanced = (String(p.weaponType) === 'plasma_saber');
                    p.swordAttackType = isAdvanced ? 'slash' : 'thrust';
                    p.isSlashActive = true;
                    p.slashTimer = 10;
                    p.slashAngle = angle;
                    p.slashAngles = [angle];
                    this.triggerSwordInstantAttack([angle], finalDamage);

                    // 플라즈마 세이버일 때만 화면 밖으로 날아가는 검기 투사체 발사
                    if (isAdvanced) {
                        for (let a of [angle]) {
                            let speed = 6.0;
                            let vx = Math.cos(a) * speed;
                            let vy = Math.sin(a) * speed;
                            this.bullets.push(new Bullet(p.x, p.y, vx, vy, finalDamage, true, {
                                pierce: Math.min(5, p.pierceCount + 1),
                                homing: p.homing,
                                homingSpeed: p.homingAngleSpeed,
                                splash: p.splashRadius,
                                color: '#b026ff',
                                radius: 5
                            }));
                        }
                    }

                    Sound.play(isAdvanced ? 'plasma_saber_vibe' : 'crude_sword_vibe');
                }
                break;
            case 'spear':
                p.isSpearActive = true;
                p.spearTimer = 8;
                p.spearAngle = angle;
                p.spearAngles = [angle];
                this.triggerSpearInstantAttack([angle], finalDamage);
                Sound.play('slash');
                break;
            case 'whip':
                p.isSlashActive = true;
                p.slashTimer = 12;
                p.slashAngle = angle;
                p.slashAngles = [angle];
                this.triggerWhipInstantAttack([angle], finalDamage);
                Sound.play('slash');
                break;
            case 'lightning':
                this.triggerLightningBolt(angle, finalDamage);
                break;
            case 'fire':
                let fvx = Math.cos(angle) * 6.2;
                let fvy = Math.sin(angle) * 6.2;
                this.bullets.push(new Bullet(p.x, p.y, fvx, fvy, finalDamage, true, {
                    color: '#ff5e00',
                    radius: 7.0,
                    life: p.range / 6.2,
                    isFire: true,
                    splash: p.splashRadius + 30
                }));
                Sound.play('shoot');
                break;
            case 'ice':
                let ivx = Math.cos(angle) * 7.5;
                let ivy = Math.sin(angle) * 7.5;
                this.bullets.push(new Bullet(p.x, p.y, ivx, ivy, finalDamage, true, {
                    color: '#00f0ff',
                    radius: 5.0,
                    life: p.range / 7.5,
                    isIce: true,
                    pierce: p.pierceCount + 1
                }));
                Sound.play('shoot');
                break;
            case 'scythe':
                p.isScytheActive = true;
                p.scytheTimer = 12;
                p.scytheAngle = angle;
                this.triggerScytheAttack(angle, finalDamage);
                Sound.play('slash');
                break;
            case 'railcannon':
                this.triggerRailCannonBeam(angle, finalDamage);
                break;
        }
    }

    // 몬스터 처치 성공
    killMonster(m, index) {
        if (m.dead) return; // [신규] 중복 정산 및 사망 처리 방지
        m.dead = true; // [신규] 지연 삭제 마킹

        // [신규 기획] splitter 몬스터 사망 시 mini 슬라임 2마리 분열 스폰
        if (m.type === 'splitter') {
            for (let k = 0; k < 2; k++) {
                let mini = new Monster(m.x + (Math.random() * 24 - 12), m.y + (Math.random() * 24 - 12), m.tier, m.roomNum);
                mini.type = 'mini';
                mini.radius = 7 + Math.min(3, mini.tier);
                mini.maxHp = Math.ceil(m.maxHp * 0.35);
                mini.hp = mini.maxHp;
                mini.atk = Math.ceil(m.atk * 0.6);
                mini.speed = m.speed * 1.45;
                mini.color = '#00e1ff';
                mini.glowColor = '#00e1ff';
                mini.fillColor = 'rgba(0, 225, 255, 0.12)';

                // 사방으로 튕겨나가는 넉백 관성 추가
                let scatterAngle = Math.random() * Math.PI * 2;
                mini.knockbackX = Math.cos(scatterAngle) * 4.5;
                mini.knockbackY = Math.sin(scatterAngle) * 4.5;

                this.monsters.push(mini);
            }
            this.showFloatingText("SPLIT! 💠", m.x, m.y - 30, '#00f0ff');
        }

        // [신규] 30층 보스 슬라임(boss_slime) 사망 시 미니 보스 슬라임 2마리 스폰
        if (m.type === 'boss_slime') {
            for (let k = 0; k < 2; k++) {
                let mini = new Monster(m.x + (Math.random() * 40 - 20), m.y + (Math.random() * 40 - 20), m.tier, m.roomNum);
                mini.makeBoss(m.roomNum, 'boss_slime_mini', m.radius < 30);

                let scatterAngle = Math.random() * Math.PI * 2;
                mini.knockbackX = Math.cos(scatterAngle) * 5.0;
                mini.knockbackY = Math.sin(scatterAngle) * 5.0;

                this.monsters.push(mini);
            }
            this.showFloatingText("SPLIT SLIME! 💠", m.x, m.y - 35, '#00f0ff');
        }

        // [신규] 90층 보스 웨이브 순차 기동 제어
        if (this.roomNum === 90 && (m.isBoss || m.type === 'boss_chaos')) {
            if (this.bossWave < 4) {
                this.bossWave++;
                this.currentSpawnRemaining--;

                let nextType = 'boss_portal';
                let nextName = "WAVE 2: 차원 차단기 👾";
                let nextColor = '#8b5cf6';
                if (this.bossWave === 3) {
                    nextType = 'boss_hive';
                    nextName = "WAVE 3: 나노 하이브 🤖";
                    nextColor = '#e2e8f0';
                } else if (this.bossWave === 4) {
                    nextType = 'boss_chaos';
                    nextName = "FINAL WAVE: 카오스 코어 🔥⚡❄️";
                    nextColor = '#ff3300';
                }

                // [수정] 맵 중앙 X좌표를 기준으로 보스를 스폰합니다.
                let cx = this.mapWidth / 2;
                let nextBoss = new Monster(cx, 200, Math.floor(this.roomNum / 5), this.roomNum);
                // 카오스 코어(4웨이브)는 약화시키지 않고 본 전력으로 출현
                nextBoss.makeBoss(this.roomNum, nextType, this.bossWave < 4);

                // [수정] 이전 웨이브 보스가 소환해 둔 부하 몬스터들(발전기, 힐러, 소환 몹 등)을 일괄 소멸 처리하여 필드가 뒤섞이는 현상 방지
                this.monsters.forEach(monster => {
                    if (monster !== m) {
                        monster.dead = true;
                    }
                });

                this.monsters.push(nextBoss);

                // [수정] 화면 가로축 중앙에 텍스트가 표시되도록 cx를 사용합니다.
                this.showFloatingText(nextName, cx, 250, nextColor);
                Sound.play('boss_alert');
                this.shakeScreen(30, 4.5);
            } else {
                this.currentSpawnRemaining = 0;
                // [수정] 최종 보스인 카오스 코어가 죽었을 때도 혹시 필드에 남아있을 부하 몬스터를 일괄 소멸 처리하여 문이 안 열리는 버그 방지
                this.monsters.forEach(monster => {
                    if (monster !== m) {
                        monster.dead = true;
                    }
                });
            }
        }

        // 몬스터 처치 Hit Stop 역경직 적용 (쿨다운 유틸 사용 및 밸런스 조정)
        if (m.isBoss) {
            this.triggerHitStop(12);
        } else if (m.isElite) {
            this.triggerHitStop(4);
        } else {
            this.triggerHitStop(1); // 일반 몬스터는 순간적인 1프레임 정지
        }

        // [신규] 사망 시 화상 5중첩이면 연쇄 대폭발 트리거 작동
        if (m.statusEffects && m.statusEffects.burnStack >= 5) {
            this.triggerFireExplosion(m.x, m.y);
        }

        // 지연 삭제 기믹 도입으로 즉각적인 splice는 생략합니다.
        // this.monsters.splice(index, 1);
        this.kills++;
        this.comboCount++;
        this.comboTimer = 180; // 콤보 유효 시간 3초 제공

        // [신규] 콤보 마일스톤 돌파 시 타격감 넘치는 네온 플로팅 연출 추가
        if (this.comboCount >= 5 && this.comboCount % 5 === 0) {
            let comboColor = '#00f0ff';
            let comboTitle = `${this.comboCount} COMBO! 🔥`;
            if (this.comboCount >= 30) {
                comboColor = '#ffdf00'; // 30콤보 이상은 황금색
                comboTitle = `${this.comboCount} COMBO BLASTER! ⚡`;
            }
            if (this.comboCount >= 60) {
                comboColor = '#ff00aa'; // 60콤보 이상은 마젠타
                comboTitle = `${this.comboCount} GODLIKE COMBO! 🔮`;
            }
            this.showFloatingText(comboTitle, this.player.x, this.player.y - 45, comboColor);

            // 콤보 돌파 시 플레이어 주변에 이펙트 스파크 방출
            for (let k = 0; k < 5; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 2 + 1;
                this.particles.push(new Particle(this.player.x, this.player.y, comboColor, 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15));
            }
        }

        // 점수 획득 (티어 보정치 반영 - 엘리트는 생성 시 이미 scoreValue가 5배임)
        this.score += m.scoreValue * 2;

        // 몬스터 처치 시 마력(MP) 게이지 충전
        let mpGain = 4 + (this.player.luk * 0.5); // 운 스탯이 높을수록 마력 충전량 상승
        if (m.isElite) mpGain *= 5; // 엘리트 몬스터 처치 시 MP 충전량 5배!

        // [신규 기획] Mana Ring 5레벨 돌파: 처치 시 마나 3% 즉시 환급!
        if (this.player.equipLevels.ring_mp >= 5) {
            mpGain += this.player.maxMp * 0.03;
        }

        this.player.mp = Math.min(this.player.maxMp, this.player.mp + mpGain);

        // [W-04 검 흡혈 베기 기믹]
        let hasMeleeLifesteal = (this.player.weaponType === 'crude_sword' || this.player.weaponType === 'plasma_saber' || this.player.weaponType === 'crude_spear' || this.player.weaponType === 'energy_pilebunker' || this.player.weaponType === 'crude_whip' || this.player.weaponType === 'nano_laser_wire' || this.player.weaponType === 'crude_scythe' || this.player.weaponType === 'void_destroyer');
        if (hasMeleeLifesteal ) {
            if (this.player.hp < this.player.maxHp) {
                let healAmount = Math.max(1, (this.player.maxHp - this.player.hp) * 0.01);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                this.showFloatingText(`LIFESTEAL +${Math.round(healAmount)} ❤️`, this.player.x, this.player.y - 30, '#ff0055');
            }
        }

        // [W-08 신규 구현] 몬스터 처치 시 바닥에 황금 코인 드롭
        let coinDropCount = m.isElite ? 8 : 2;
        // Luck Amulet 5레벨 돌파 보너스 코인은 20개 드롭
        if (m.isElite && this.player.equipLevels.necklace >= 5) {
            coinDropCount += 20;
            this.potions.push(new NeonPotion(m.x, m.y));
            this.showFloatingText(`LUCKY DROP! 📀`, m.x, m.y - 45, '#ffdf00');
        }

        for (let k = 0; k < coinDropCount; k++) {
            this.coinsList.push(new NeonCoin(m.x, m.y, 1));
        }

        // 몬스터 사망 시 35% 확률로 11종의 부품 재료 드롭
        if (Math.random() < 0.35) {
            const pool = [];
            const weights = {
                short_rod: 15, blade: 15, wire: 15, battery: 15,
                long_rod: 10, metal_plate: 10,
                broken_flamethrower: 6, cryo_cooler: 6, sensor_lens: 6, nanite_jar: 6, hydraulic_cylinder: 6
            };
            for (let key in weights) {
                for (let w = 0; w < weights[key]; w++) {
                    pool.push(key);
                }
            }
            let chosen = pool[Math.floor(Math.random() * pool.length)];
            this.materialsList.push(new DropMaterial(m.x, m.y, chosen));
        }

        // 몬스터 사망 시 흩어지는 빛 파편 (기본 수량 축소 및 프레임당 생성량 30개로 캡핑)
        if (this.frameSpawnedDeathParticles === undefined) this.frameSpawnedDeathParticles = 0;
        let particleCount = m.isElite ? 12 : 4;
        if (this.frameSpawnedDeathParticles < 30) {
            for (let k = 0; k < particleCount; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * (m.isElite ? 5 : 3) + 1;
                this.particles.push(new Particle(m.x, m.y, m.color, m.isElite ? 4 : 3, Math.cos(angle) * speed, Math.sin(angle) * speed, 30));
                this.frameSpawnedDeathParticles++;
            }
        }

        // 엘리트 몬스터 처치 시 강력한 화면 연동 피드백
        if (m.isElite) {
            this.showFloatingText("ELITE DEFEATED!", m.x, m.y - 25, '#39ff14');
            this.shakeScreen(15, 6.5);

            // [신규 기획] Luck Amulet 5레벨 돌파: 정예 처치 시 드롭 2배 (물약 추가 드롭 + 특별 코인 20개 환수)
            if (this.player.equipLevels.necklace >= 5) {
                this.potions.push(new NeonPotion(m.x, m.y));
                let luckCoins = 20;
                this.player.coins += luckCoins;
                this.showFloatingText(`+${luckCoins} LUCKY 📀!`, m.x, m.y - 45, '#ffdf00');
                Sound.play('coin');
            }
        } else {
            this.shakeScreen(6, 3);
        }

        // 몬스터 사망 효과음
        Sound.play('hit');
    }

    // 플레이어 피격 연산 (회피 확률 연계 및 신규 장비 초월 마스터리 연계)
    damagePlayer(amount, fromX, fromY) {
        // [신규 추가] 피격 무적 시간이 돌고 있으면 데미지 피격을 전면 면제 처리합니다.
        if (this.player.invincibleTimer > 0) {
            return;
        }

        // [신규 기획] Broken Joystick 15% 탄환 반사 기믹
        if (this.player.hiddenItems && this.player.hiddenItems.brokenJoystick && Math.random() < 0.15) {
            this.showFloatingText("DEFLECT! 🛡️", this.player.x, this.player.y - 20, '#00f0ff');

            // 반격 탄환 쏘기
            let angle = Math.atan2(fromY - this.player.y, fromX - this.player.x);
            let vx = Math.cos(angle) * 7.5;
            let vy = Math.sin(angle) * 7.5;

            if (typeof Bullet !== 'undefined') {
                this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, this.player.atk * 1.5, true, {
                    color: '#00f0ff',
                    size: 5.5,
                    pierceCount: 1
                }));
            }
            Sound.play('slash'); // 칼 사운드로 반사음 연출

            // 피격 면제 및 가벼운 무적 프레임 부여
            this.player.invincibleTimer = 30;
            return;
        }

        if (this.player.isGodMode) {
            this.showFloatingText("GOD MODE ACTIVE 🛡️", this.player.x, this.player.y - 20, '#ffdf00');
            return;
        }

        // [신규 기획] Stamina Boots 10레벨 마스터리: 대시 중 완전 무적 회피 관통!
        if (this.player.equipLevels.boots === 10 && this.keys['shift'] && this.player.stamina > 0) {
            this.showFloatingText("INVISIBLE EVD", this.player.x, this.player.y - 20, '#39ff14');
            return;
        }

        // 민첩(evd) 스탯 기반으로 회피 성공 여부 판정
        let evdRate = this.player.evd;
        // [신규 기획] Stamina Boots 5레벨 돌파: 대시 중 EVD 15% 추가 가산!
        if (this.player.equipLevels.boots >= 5 && this.keys['shift'] && this.player.stamina > 0) {
            evdRate += 0.15;
        }

        if (Math.random() < evdRate) {
            // 회피 대성공! 1~2px 붉은색 잔상 실루엣 및 DODGE 피드백 가동
            this.player.triggerEvade(fromX, fromY);

            // [신규 추가] 회피 성공 시에도 피격처럼 무적 타이머 45프레임(약 0.75초) 가동
            this.player.invincibleTimer = 45;

            // [신규 기획] Evasion Ring 5레벨 돌파 혹은 evasion_thruster 패시브 보유 시: 회피 대성공 시 주변 적 1.5초간 기절 네온 섬광 작렬!
            if (this.player.equipLevels.ring_evd >= 5 || (this.player.craftedPassives && this.player.craftedPassives.includes('evasion_thruster'))) {
                this.showFloatingText("PHANTOM STUN FLASH!", this.player.x, this.player.y - 35, '#ff0055');
                this.particles.push(new Particle(this.player.x, this.player.y, '#ff0055', 40, 0, 0, 20, 'explosionRing'));
                for (let m of this.monsters) {
                    let mDist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                    if (mDist < 120 + m.radius) {
                        m.statusEffects.shock = 90; // 1.5초간 무력화 기절
                    }
                }
            } else {
                this.showFloatingText("DODGE", this.player.x, this.player.y - 20, '#ff0055');
            }

            // [E-08 신규 구현] Speed Ring 10레벨 초월: 스치기 회피 성공 시 초신성 3초간 50% 폭발적 가속 활성화!
            if (this.player.equipLevels.ring_speed === 10) {
                this.player.supernovaTimer = 180;
                this.showFloatingText("SUPERNOVA ACCEL! 🌟", this.player.x, this.player.y - 35, '#ffdf00');
            }
            return;
        }

        // 회피에 실패하면 쉴드나 방어율(최대체력/200)을 감산하여 최종 데미지 적용
        // 힘(ATK) 스탯이나 방어 스탯에 의해 경감
        this.player.perfectClearFlag = false; // [신규 기획] 실제로 데미지를 입으면 퍼펙트 클리어 플래그 해제!
        this.player.lastHitTimer = 0;         // [신규 기획] 피격 당했으므로 무사고 타이머 리셋!

        let defensePct = this.player.def / (this.player.def + 100); // 방어력 비율 감소 공식 (2안)
        let maxHpBonusDefense = (this.player.maxHp - 100) * 0.15; // 최대 HP 기반 추가 고정 방어
        let finalDamage = Math.max(1, amount * (1 - defensePct) - maxHpBonusDefense);

        // [신규 기획] Plate Armor 5레벨 돌파: 체력 30% 이하일 때 최종 데미지 20% 영구 감산 보호!
        if (this.player.equipLevels.armor >= 5 && (this.player.hp / this.player.maxHp) < 0.3) {
            finalDamage *= 0.8;
        }

        // [수정] Thorns 레벨에 비례한 추가 피해 경감 (레벨당 6%, 최대 24%)
        if (this.player.weaponLevels.thorns > 0) {
            let thornsLvl = this.player.weaponLevels.thorns;
            let reduction = (thornsLvl - 1) * 0.06;
            finalDamage *= (1 - reduction);
        }

        this.player.hp = Math.max(0, this.player.hp - finalDamage);

        // 피격 Hit Stop 적용 (쿨다운 유틸 사용 및 5프레임으로 완화)
        this.triggerHitStop(5);

        // [신규 추가] 실제 피격 데미지가 정산되었으므로 피격 무적 타이머 45프레임(약 0.75초) 가동
        this.player.invincibleTimer = 45;

        // [W-01 가시 탱커 반사 기믹]
        if (this.player.weaponLevels.thorns > 0) {
            let thornsLvl = this.player.weaponLevels.thorns;
            const thornsRadius = 120 + (thornsLvl - 1) * 15; // 1레벨: 120px ~ 5레벨: 180px 반사 반경
            const reflectDamage = finalDamage * (1.0 + (thornsLvl - 1) * 0.20); // 1레벨: 100% ~ 5레벨: 180% 반사 피해율

            this.particles.push(new Particle(this.player.x, this.player.y, '#ff00aa', thornsRadius, 0, 0, 20, 'explosionRing'));

            // 5레벨 마스터 시에만 3초 가시 오라 도발 필드 활성화
            if (thornsLvl === 5) {
                this.player.thornsFieldTimer = 180;
            }

            // 보복형 유도 가시 사출 확률 (1레벨: 10% ~ 5레벨: 30%)
            let revengeChance = 0.10 + (thornsLvl - 1) * 0.05;
            if (Math.random() < revengeChance) {
                let angle = Math.atan2(fromY - this.player.y, fromX - this.player.x);
                this.bullets.push(new Bullet(this.player.x, this.player.y, Math.cos(angle) * 7.0, Math.sin(angle) * 7.0, this.player.atk * 1.2, true, {
                    homing: true,
                    homingSpeed: 0.15,
                    color: '#ff00aa',
                    radius: 5,
                    life: 120
                }));
                this.showFloatingText("THORN REVENGE! 🌵", this.player.x, this.player.y - 30, '#ff00aa');
            }

            // 반경 내의 모든 적들에게 피해 배분/반사
            for (let i = this.monsters.length - 1; i >= 0; i--) {
                let m = this.monsters[i];
                let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                if (dist < thornsRadius + m.radius) {
                    let fDmg = reflectDamage;
                    if (m.statusEffects.vulnerability > 0) fDmg *= 1.25;
                    m.hp -= fDmg;
                    m.flashTimer = 5;

                    let angle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                    m.knockbackX += Math.cos(angle) * 3.5;
                    m.knockbackY += Math.sin(angle) * 3.5;
                    m.isPlayerKnockback = true;

                    this.showFloatingText(`REFLECT -${Math.ceil(fDmg)}`, m.x, m.y - 20, '#ff00aa');

                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }
                }
            }
        }

        this.shakeScreen(15, 6);
        Sound.play('hit');

        // 피격 시 붉은 불꽃 파편
        for (let k = 0; k < 8; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 4 + 1;
            this.particles.push(new Particle(this.player.x, this.player.y, '#ff0055', 2.5, Math.cos(angle) * speed, Math.sin(angle) * speed, 20));
        }

        // 캐릭터 사망 시 게임오버 판정 분기
        if (this.player.hp <= 0) {
            // [신규 기획] Plate Armor 10레벨 초월 마스터리: 사망 직전 최대 체력의 50%로 1회 극적 부활!
            if (this.player.equipLevels.armor === 10 && !this.player.resurrected) {
                this.player.resurrected = true;
                this.player.hp = this.player.maxHp * 0.5; // 50% 충전 부활
                this.player.invincibleTimer = 120; // [수정] 부활 즉시 2초간 완전 무적 상태 부여 (다단 피격사 방지)
                this.showFloatingText("GUARDIAN RESURRECTION ACTIVE! (+50% HP)", this.player.x, this.player.y - 30, '#ffdf00');
                Sound.play('victory');
                this.particles.push(new Particle(this.player.x, this.player.y, '#ffdf00', 50, 0, 0, 30, 'explosionRing'));
            } else {
                this.triggerGameOver();
            }
        }
    }

    // 데미지 텍스트 팝업 띄우기용 헬퍼
    showFloatingText(text, x, y, color) {
        if (this.visualsSuspended) {
            this.suspendedFloatingTexts.push({ text, x, y, color });
            return;
        }
        // [개선] 텍스트가 단순히 수직 상승하지 않고, 사방으로 포물선 튕김 물리가 작동하도록 vx, vy 랜덤 및 점프력 부여
        let rx = (Math.random() - 0.5) * 1.6;
        let ry = -2.5 - Math.random() * 1.0;
        let txtPart = new Particle(x, y, color, 12, rx, ry, 48);
        txtPart.type = 'text';
        txtPart.text = text;
        this.particles.push(txtPart);
    }

    // [신규 추가] 타격감(Juice)을 위한 Hit Stop 트리거 헬퍼 (다단 히트 랙 방지 쿨다운 적용)
    triggerHitStop(frames) {
        // [최적화] 히트스톱 쿨다운 중에는 아예 히트스톱 갱신을 원천 차단하여 다단 타격/처치 시 물리가 무한 일시 정지되는 체감 렉 방멸
        if (this.hitStopCooldown > 0) {
            return;
        }
        this.hitStopFrames = frames;
        this.hitStopCooldown = 15; // 쿨다운 15프레임 설정
    }

    // 원거리 스플래시 탄환 범위 데미지 연산
    triggerBulletSplash(x, y, radius, damage, customColor = '#00f0ff') {
        if (this.frameSplashCount === undefined) this.frameSplashCount = 0;
        // [최적화] 1프레임당 과도한 스플래시 연산 차단 (최대 6회 가동)
        if (this.frameSplashCount >= 6) {
            return;
        }

        if (this.frameSplashCount < 3) {
            Sound.play('explosion');
            if (this.player.equippedWeapons[0] === 'fusion_plasma_cannon') {
                // 보라/주황빛 충격파 링 이중 팽창
                this.particles.push(new Particle(x, y, '#b026ff', radius, 0, 0, 24, 'explosionRing'));
                this.particles.push(new Particle(x, y, '#ff5e00', radius * 0.8, 0, 0, 18, 'explosionRing'));
            } else {
                this.particles.push(new Particle(x, y, customColor, radius, 0, 0, 30, 'explosionRing'));
            }
        }
        this.frameSplashCount++;

        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            if (!m || m.dead) continue;

            // [최적화] 1차 절댓값 필터링 (Math.hypot 연산 오버헤드 방지)
            let limitDist = radius + m.radius;
            if (Math.abs(m.x - x) >= limitDist || Math.abs(m.y - y) >= limitDist) {
                continue;
            }

            let dist = Math.hypot(m.x - x, m.y - y);
            if (dist < limitDist) {
                // 스플래시 폭발에 의한 기절 상태 부여 (1초)
                m.statusEffects.shock = 60;

                let finalDmg = damage;
                if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                m.hp -= finalDmg;
                m.flashTimer = 5;

                // [버그 수정] 스플래시 대미지로 사망 시 정산 처리 추가
                if (m.hp <= 0) {
                    this.killMonster(m, i);
                }

                // 폭발 밀쳐냄 물리 적용
                let pushAngle = Math.atan2(m.y - y, m.x - x);
                m.knockbackX += Math.cos(pushAngle) * 3.5;
                m.knockbackY += Math.sin(pushAngle) * 3.5;
                m.isPlayerKnockback = true;
            }
        }
    }

    // [W-07 신규 구현] 체인 라이트닝(연쇄 벼락) 전이 트리거
    triggerChainLightning(startX, startY, currentEnemy, chainsLeft, damage) {
        if (chainsLeft <= 0 || this.monsters.length === 0) return;

        if (this.frameChainCount === undefined) this.frameChainCount = 0;
        // [최적화] 1프레임당 과도한 연쇄 번개 전이 차단 (최대 16회까지 전이 허용)
        if (this.frameChainCount >= 16) {
            return;
        }
        this.frameChainCount++;

        let isEmp = (this.player.weaponType === 'chain_emp_shock' || this.player.equippedWeapons.includes('chain_emp_shock') || this.player.thirdSlotWeapon === 'chain_emp_shock');
        let electricColor = isEmp ? '#00f0ff' : '#ffdf00';

        // [최적화] 연쇄 번개 전이 타격 노랑 낙뢰 이펙트 파티클을 3개로 간소화
        for (let k = 0; k < 3; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 3 + 1;
            this.particles.push(new Particle(currentEnemy.x, currentEnemy.y, electricColor, 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 18, 'spark'));
        }

        // 주변 몬스터 중 가장 가까운 다른 몬스터 탐색 (번개 전이 거리 180px 제한)
        let nextTarget = null;
        let minDist = 180; // 최대 전이 거리

        for (let other of this.monsters) {
            if (other === currentEnemy) continue;
            // [최적화] 1차 절댓값 필터링 (최대 전이 거리 180px 내인지 스크리닝)
            if (Math.abs(other.x - currentEnemy.x) >= 180 || Math.abs(other.y - currentEnemy.y) >= 180) {
                continue;
            }
            let dist = Math.hypot(other.x - currentEnemy.x, other.y - currentEnemy.y);
            if (dist < minDist) {
                minDist = dist;
                nextTarget = other;
            }
        }

        if (nextTarget) {
            // [비주얼 고도화] 지그재그 번개 아크 스파크 선 생성
            let dx = nextTarget.x - currentEnemy.x;
            let dy = nextTarget.y - currentEnemy.y;
            let totalDist = Math.hypot(dx, dy);
            let steps = Math.floor(totalDist / 12);

            for (let i = 1; i <= steps; i++) {
                let ratio = i / steps;
                let tx = currentEnemy.x + dx * ratio;
                let ty = currentEnemy.y + dy * ratio;

                let perpX = -dy / totalDist;
                let perpY = dx / totalDist;
                let offset = (Math.random() - 0.5) * 12; // 지그재그 흔들림 편차
                
                let curX = tx + perpX * offset;
                let curY = ty + perpY * offset;

                this.particles.push(new Particle(curX, curY, electricColor, 1.5, 0, 0, 10, 'spark'));
            }

            // 다음 타겟에게 감전 피해 및 0.5초 기절(Stun) 부여
            let finalDmg = damage;
            if (nextTarget.statusEffects.vulnerability > 0) finalDmg *= 1.25;
            nextTarget.hp -= finalDmg;
            nextTarget.flashTimer = 5;
            nextTarget.statusEffects.shock = Math.max(nextTarget.statusEffects.shock || 0, isEmp ? 30 : 45); // 감전 마비

            Sound.play('hit');

            // 몬스터 처사 체크
            if (nextTarget.hp <= 0) {
                let idx = this.monsters.indexOf(nextTarget);
                if (idx !== -1) {
                    this.killMonster(nextTarget, idx);
                }
            }

            // 재귀적으로 다음 전이 격발 (약 0.06초 후 전이되도록 지연 실행 연출 및 생존 검증 추가)
            setTimeout(() => {
                if (this.isPlaying && this.monsters.includes(nextTarget)) {
                    this.triggerChainLightning(currentEnemy.x, currentEnemy.y, nextTarget, chainsLeft - 1, damage * 0.85);
                }
            }, 60);
        }
    }

    // 주무기 탄환 및 마법 격발 메커니즘
    shootWeapon() {
        let mainWeapon = this.player.equippedWeapons[0] || 'gun';

        if (mainWeapon === 'crude_shock' || mainWeapon === 'chain_emp_shock') {
            let isAdvanced = (mainWeapon === 'chain_emp_shock');

            // MP 소모 체크
            let isFreeMana = false;
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                isFreeMana = true;
                this.showFloatingText("FREE MANA CAST! 🔮", this.player.x, this.player.y - 30, '#00f0ff');
            }
            if (this.player.mp < 3.0 && !isFreeMana) {
                this.player.shootCooldown = 25;
                this.showFloatingText("NEED MP! 🔮", this.player.x, this.player.y - 25, '#ffdf00');
                Sound.play('hit');
                return;
            }
            if (!isFreeMana) {
                this.player.mp = Math.max(0, this.player.mp - 3.0);
            }

            // 공속 쿨타임 (디튠: 조잡 55프레임, 진화 40프레임)
            let activeAspd = this.player.getEffectiveAspd();
            let cooldownFrames = Math.max(isAdvanced ? 12 : 18, (isAdvanced ? 40 : 55) / activeAspd);
            if (this.player.equipLevels.ring_aspd >= 5) cooldownFrames *= 0.85;
            this.player.shootCooldown = cooldownFrames;

            let synergyMult = this.checkBuildSynergy('gun');
            let helmDmgBonus = (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) ? 1.25 : 1.0;
            let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
            let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;

            let wLvl = this.player.weaponLevels.lightning || 1;
            let levelMult = 1 + (wLvl - 1) * 0.15;
            
            // 대미지 계수 억제: 조잡 0.3x, 진화 0.7x
            let baseDmg = this.player.atk * (isAdvanced ? 0.7 : 0.3);
            let finalDamage = baseDmg * levelMult * synergyMult * helmDmgBonus * speedRingDmgBonus * hybridDmgFactor;

            if (isAdvanced) {
                // 진화형: 가장 가까운 적에게 즉발 EMP 체인 아크 발사 (최대 3명 전이 억제)
                let nearest = null;
                let minDist = 300; // 최대 색적 범위 300px
                for (let m of this.monsters) {
                    if (m.hp > 0 && !m.dead) {
                        let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = m;
                        }
                    }
                }
                
                if (nearest) {
                    // 첫 마디 번개 이펙트 파티클 지그재그 생성
                    let dx = nearest.x - this.player.x;
                    let dy = nearest.y - this.player.y;
                    let totalDist = Math.hypot(dx, dy);
                    let steps = Math.floor(totalDist / 12);
                    for (let i = 1; i <= steps; i++) {
                        let ratio = i / steps;
                        let tx = this.player.x + dx * ratio;
                        let ty = this.player.y + dy * ratio;
                        let perpX = -dy / totalDist;
                        let perpY = dx / totalDist;
                        let offset = (Math.random() - 0.5) * 12;
                        let curX = tx + perpX * offset;
                        let curY = ty + perpY * offset;
                        this.particles.push(new Particle(curX, curY, '#00f0ff', 1.5, 0, 0, 10, 'spark'));
                    }

                    nearest.hp -= finalDamage;
                    nearest.flashTimer = 5;
                    nearest.statusEffects.shock = Math.max(nearest.statusEffects.shock || 0, 30); // 감전

                    // 전이 시작 (최대 3명)
                    this.triggerChainLightning(this.player.x, this.player.y, nearest, 2, finalDamage * 0.85);
                    Sound.play('shoot');
                    this.shakeScreen(5, 1.8);
                } else {
                    // 허공 격발 이펙트
                    let angle = this.player.angle;
                    let tx = this.player.x + Math.cos(angle) * 100;
                    let ty = this.player.y + Math.sin(angle) * 100;
                    for (let i = 0; i <= 3; i++) {
                        let step = i / 3;
                        this.particles.push(new Particle(this.player.x + (tx - this.player.x) * step, this.player.y + (ty - this.player.y) * step, '#00f0ff', 1.2, 0, 0, 10, 'spark'));
                    }
                }
            } else {
                // 조잡형: 플레이어 주변 노란색 방전 전기 원형 고리 (3겹 팽창)
                let maxRadius = 90;
                this.particles.push(new Particle(this.player.x, this.player.y, '#ffdf00', maxRadius, 0, 0, 20, 'explosionRing'));
                this.particles.push(new Particle(this.player.x, this.player.y, '#ffea00', maxRadius * 0.75, 0, 0, 16, 'explosionRing'));
                this.particles.push(new Particle(this.player.x, this.player.y, '#ffff00', maxRadius * 0.5, 0, 0, 12, 'explosionRing'));
                
                for (let i = this.monsters.length - 1; i >= 0; i--) {
                    let m = this.monsters[i];
                    let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                    if (dist < maxRadius + m.radius) {
                        m.hp -= finalDamage;
                        m.flashTimer = 5;
                        m.statusEffects.shock = Math.max(m.statusEffects.shock || 0, 30); // 기절 0.5초 억제
                        if (m.hp <= 0) {
                            this.killMonster(m, i);
                        }
                    }
                }
                Sound.play('shoot');
                this.shakeScreen(4, 1.2);
            }

            this.triggerThirdSlotWeapon();
            return;
        }

        if (mainWeapon === 'crude_flamethrower' || mainWeapon === 'fusion_plasma_cannon') {
            let isAdvanced = (mainWeapon === 'fusion_plasma_cannon');

            // MP 소모 체크
            let isFreeMana = false;
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                isFreeMana = true;
                this.showFloatingText("FREE MANA CAST! 🔮", this.player.x, this.player.y - 30, '#00f0ff');
            }
            if (this.player.mp < 3.0 && !isFreeMana) {
                this.player.shootCooldown = 25;
                this.showFloatingText("NEED MP! 🔮", this.player.x, this.player.y - 25, '#ffdf00');
                Sound.play('hit');
                return;
            }
            if (!isFreeMana) {
                this.player.mp = Math.max(0, this.player.mp - 3.0);
            }

            // 공속 쿨타임 (디튠: 조잡 지속 화기이므로 쿨타임 10프레임, 진화 단발이므로 쿨타임 45프레임)
            let activeAspd = this.player.getEffectiveAspd();
            let cooldownFrames = Math.max(isAdvanced ? 15 : 6, (isAdvanced ? 45 : 10) / activeAspd);
            if (this.player.equipLevels.ring_aspd >= 5) cooldownFrames *= 0.85;
            this.player.shootCooldown = cooldownFrames;

            let synergyMult = this.checkBuildSynergy('gun');
            let helmDmgBonus = (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) ? 1.25 : 1.0;
            let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
            let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;

            let wLvl = this.player.weaponLevels.fire || 1;
            let levelMult = 1 + (wLvl - 1) * 0.15;
            
            // 대미지 계수 억제: 조잡 0.4x (연사 감안), 진화 0.9x
            let baseDmg = this.player.atk * (isAdvanced ? 0.9 : 0.4);
            let finalDamage = baseDmg * levelMult * synergyMult * helmDmgBonus * speedRingDmgBonus * hybridDmgFactor;

            let startAngle = this.player.angle;

            if (isAdvanced) {
                // 진화형: 융합 플라즈마 에너지 구체 발사 (반경 12px 억제)
                let speed = 6.2;
                let vx = Math.cos(startAngle) * speed;
                let vy = Math.sin(startAngle) * speed;
                let bulletLife = this.player.range / speed;

                this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                    color: '#ff5e00',
                    radius: 12, // 크기 억제
                    life: bulletLife,
                    isFire: true,
                    isAdvanced: true,
                    splash: 45, // 충격파 반경 45px 억제
                    pierce: this.player.pierceCount
                }));
                Sound.play('shoot');
                this.shakeScreen(5, 1.8);
            } else {
                // 조잡형: 지속 주황빛 콘 화방 사출 (사거리 100px 억제, 각도 ±10도 억제)
                Sound.play('slash');
                this.shakeScreen(2, 0.8);

                // 화염 입자 보강 생성 (콘 모양 화방 연출)
                for (let k = 0; k < 8; k++) {
                    let randAngle = startAngle + (Math.random() - 0.5) * 0.35; // 약 ±10도
                    let speed = Math.random() * 4 + 4;
                    let vx = Math.cos(randAngle) * speed;
                    let vy = Math.sin(randAngle) * speed;
                    let color = Math.random() < 0.65 ? '#ff5e00' : '#ffdf00';
                    this.particles.push(new Particle(this.player.x, this.player.y, color, Math.random() * 6 + 4, vx, vy, 15 + Math.random() * 8, 'dust'));
                }

                // 부채꼴 범위 내의 적 즉발 화염 틱 대미지
                let burnRange = 100;
                for (let i = this.monsters.length - 1; i >= 0; i--) {
                    let m = this.monsters[i];
                    let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                    if (dist < burnRange + m.radius) {
                        let targetAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                        let angleDiff = Math.abs(targetAngle - startAngle);
                        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                        if (Math.abs(angleDiff) < 0.25) { // 약 ±15도 판정 허용
                            m.hp -= finalDamage * 0.25; // 틱당 대미지 분할
                            m.flashTimer = 2;
                            if (m.hp <= 0) {
                                this.killMonster(m, i);
                            }
                        }
                    }
                }
            }

            this.triggerThirdSlotWeapon();
            return;
        }

        if (mainWeapon === 'crude_cryo' || mainWeapon === 'cryo_freezer') {
            let isAdvanced = (mainWeapon === 'cryo_freezer');

            // MP 소모 체크
            let isFreeMana = false;
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                isFreeMana = true;
                this.showFloatingText("FREE MANA CAST! 🔮", this.player.x, this.player.y - 30, '#00f0ff');
            }
            if (this.player.mp < 3.0 && !isFreeMana) {
                this.player.shootCooldown = 25;
                this.showFloatingText("NEED MP! 🔮", this.player.x, this.player.y - 25, '#ffdf00');
                Sound.play('hit');
                return;
            }
            if (!isFreeMana) {
                this.player.mp = Math.max(0, this.player.mp - 3.0);
            }

            // 공속 쿨타임 (디튠: 조잡 차지 샷이므로 90프레임 = 1.5초, 진화 지속 빔이므로 6프레임)
            let activeAspd = this.player.getEffectiveAspd();
            let cooldownFrames = Math.max(isAdvanced ? 4 : 30, (isAdvanced ? 6 : 90) / activeAspd);
            if (this.player.equipLevels.ring_aspd >= 5) cooldownFrames *= 0.85;
            this.player.shootCooldown = cooldownFrames;
            if (!isAdvanced) {
                this.player.cryoMaxCooldown = cooldownFrames; // 차지 샷용 게이지 분모 기록
            }

            let synergyMult = this.checkBuildSynergy('gun');
            let helmDmgBonus = (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) ? 1.25 : 1.0;
            let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
            let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;

            let wLvl = this.player.weaponLevels.ice || 1;
            let levelMult = 1 + (wLvl - 1) * 0.15;
            
            // 대미지 계수 억제: 조잡 0.6x (단발 차지), 진화 0.2x (매 6프레임당 틱 피해)
            let baseDmg = this.player.atk * (isAdvanced ? 0.2 : 0.6);
            let finalDamage = baseDmg * levelMult * synergyMult * helmDmgBonus * speedRingDmgBonus * hybridDmgFactor;

            let startAngle = this.player.angle;

            if (isAdvanced) {
                // 진화형: 지속 빔 물리 충돌 판정 및 서리 데칼 부여 (사거리 160px 제한)
                Sound.play('laser');
                this.shakeScreen(1, 0.4);

                let beamRange = 160;
                for (let i = this.monsters.length - 1; i >= 0; i--) {
                    let m = this.monsters[i];
                    let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
                    if (dist < beamRange + m.radius) {
                        let targetAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                        let angleDiff = Math.abs(targetAngle - startAngle);
                        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

                        if (Math.abs(angleDiff) < 0.18) { // 빔 폭 범위 (약 ±10도)
                            m.hp -= finalDamage;
                            m.flashTimer = 2;
                            m.frostDecalTimer = 30; // 0.5초 서리 덮씌움
                            m.statusEffects.freeze = Math.min(100, (m.statusEffects.freeze || 0) + 12); // 빙결 게이지 축적

                            // 빙결 한도 도달 시 Stun/Freeze 효과
                            if (m.statusEffects.freeze >= 100 && !m.isFrozenActive) {
                                m.isFrozenActive = 120; // 2초 정지
                                m.statusEffects.shock = 120;
                            }

                            if (m.hp <= 0) {
                                this.killMonster(m, i);
                            }
                        }
                    }
                }
            } else {
                // 조잡형: 차지 게이지 완료 후 관통 눈결정 탄환 사출 (반경 6px 억제)
                Sound.play('shoot');
                this.shakeScreen(3, 1.2);
                let speed = 7.5;
                let vx = Math.cos(startAngle) * speed;
                let vy = Math.sin(startAngle) * speed;
                let bulletLife = this.player.range / speed;

                this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                    color: '#00f0ff',
                    radius: 6, // 크기 억제
                    life: bulletLife,
                    isIce: true,
                    isAdvanced: false,
                    pierce: this.player.pierceCount + 2 // 차지 관통 보정
                }));
            }

            this.triggerThirdSlotWeapon();
            return;
        }

        if (mainWeapon === 'tachyon_railgun' || mainWeapon === 'crude_rail') {
            let isAdvanced = (mainWeapon === 'tachyon_railgun');
            this.player.isRailActive = true;
            this.player.railChargeTimer = 18;
            this.player.railAngle = this.player.angle;

            let activeAspd = this.player.getEffectiveAspd();
            let cooldownFrames = Math.max(isAdvanced ? 30 : 45, 90 / activeAspd); // 디튠: 90프레임 = 1.5초
            if (this.player.equipLevels.ring_aspd >= 5) {
                cooldownFrames *= 0.85;
            }
            this.player.shootCooldown = cooldownFrames;
            if (!isAdvanced) {
                this.player.cryoMaxCooldown = cooldownFrames; // 차지 게이지 UI 연동
            }

            Sound.play('laser');

            let synergyMult = this.checkBuildSynergy('gun');
            let helmDmgBonus = (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) ? 1.25 : 1.0;
            let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
            let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;

            let wLvl = this.player.weaponLevels.railcannon || 1;
            let levelMult = 1 + (wLvl - 1) * 0.15;
            let baseDmg = this.player.atk * (isAdvanced ? 1.5 : 0.7); // 대미지 계수 억제: 조잡 0.7x, 진화 1.5x
            let finalDamage = baseDmg * levelMult * synergyMult * helmDmgBonus * speedRingDmgBonus * hybridDmgFactor;

            this.triggerRailCannonBeam(this.player.angle, finalDamage, isAdvanced);

            this.triggerThirdSlotWeapon();
            return;
        }

        let secondaryWeapon = this.player.equippedWeapons[1];
        let hasScytheSynergy = (secondaryWeapon === 'scythe');

        let activeMagics = [];
        if (this.player.weaponLevels.fire > 0) activeMagics.push('fire');
        if (this.player.weaponLevels.ice > 0) activeMagics.push('ice');
        if (this.player.weaponLevels.lightning > 0) activeMagics.push('lightning');

        let isLightning = activeMagics.includes('lightning') || (this.player.weaponType === 'crude_shock' || this.player.weaponType === 'chain_emp_shock');
        let isFire = activeMagics.includes('fire') || (this.player.weaponType === 'crude_flamethrower' || this.player.weaponType === 'fusion_plasma_cannon');
        let isIce = activeMagics.includes('ice') || (this.player.weaponType === 'crude_cryo' || this.player.weaponType === 'cryo_freezer');
        let isWhip = (this.player.weaponType === 'crude_whip' || this.player.weaponType === 'nano_laser_wire');
        let isDual =  (activeMagics.length > 1);

        // 번개/불/얼음 마법 격발 시 마력(MP) 소모 및 잔량 차단 체크
        if (isLightning || isFire || isIce) {
            let isFreeMana = false;
            // Mana Helm 5레벨 돌파: 20% 확률 마나 소모 면제 무료 시전
            if (this.player.equipLevels.helm >= 5 && Math.random() < 0.2) {
                isFreeMana = true;
                this.showFloatingText("FREE MANA CAST! 🔮", this.player.x, this.player.y - 30, '#00f0ff');
            }

            if (this.player.mp < 3.0 && !isFreeMana) {
                this.player.shootCooldown = 25; // 발사 불능 대기 프레임
                this.showFloatingText("NEED MP! 🔮", this.player.x, this.player.y - 25, '#ffdf00');
                Sound.play('hit');
                return;
            }

            if (!isFreeMana) {
                this.player.mp = Math.max(0, this.player.mp - 3.0);
            }
        } else if (!isWhip) {
            // [에너지볼 MP 소모] 마법 무기가 아닌 일반 에너지볼/투사체 사격 시 MP 1.0 소모
            let isEnergyBallOnly = (this.getLegacyWeaponGroup(mainWeapon) === 'gun');
            if (isEnergyBallOnly) {
                if (this.player.mp < 1.0) {
                    this.player.shootCooldown = 25;
                    this.showFloatingText("NEED ENERGY! 🔮", this.player.x, this.player.y - 25, '#ffdf00');
                    Sound.play('hit');
                    return;
                }
                this.player.mp = Math.max(0, this.player.mp - 1.0);
            }
        }

        // 지능(aspd) 및 채찍 버프가 감안된 실효 공격 속도 연산
        let activeAspd = this.player.getEffectiveAspd();
        let cooldownFrames = Math.max(10, 60 / activeAspd);

        // E-09 Haste Ring 5레벨 돌파: 시전 딜레이 15% 영구 단축
        if (this.player.equipLevels.ring_aspd >= 5) {
            cooldownFrames *= 0.85;
        }

        // E-09 Haste Ring 10레벨 초월: 3초 연속 사격 시 하한선 해제 (10 -> 3프레임)
        if (this.player.equipLevels.ring_aspd === 10 && this.player.continuousShootTimer >= 180) {
            cooldownFrames = 3;
        }

        this.player.shootCooldown = cooldownFrames;

        let startAngle = this.player.angle;
        if (this.player.hiddenItems && this.player.hiddenItems.brokenJoystick && !this.player.isStopped) {
            // 이동 중일 때 Sine 파형으로 조준 각도 흔들림 (±10도 범위 = 약 ±0.174 라디안)
            startAngle += Math.sin(Date.now() * 0.006) * 0.174;
        }
        let bulletsToLaunch = [];

        // 멀티샷(multishot) 부채꼴 살상 각도 배치
        if (this.player.multishot === 1) {
            bulletsToLaunch.push(startAngle);
        } else {
            let arcSpan = this.player.multishotArc; // 부채꼴 퍼짐 각도 범위 (강화 카드 연동)
            let step = arcSpan / (this.player.multishot - 1);
            for (let i = 0; i < this.player.multishot; i++) {
                let targetAngle = startAngle - (arcSpan / 2) + (step * i);
                bulletsToLaunch.push(targetAngle);
            }
        }

        // 점사(burstCount) 횟수에 따른 0.08초 간격 순차 격발 큐 설정
        let fireBulletPack = () => {
            // [모델 C] 투사체 사격 시너지 곱연산 대미지 배율 산출
            let synergyMult = this.checkBuildSynergy('gun');

            // [신규 기획] Mana Helm 10레벨 초월: 마나가 100% 가득 찬 상태일 때 투사체 대미지 25% 가산!
            let helmDmgBonus = 1.0;
            if (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) {
                helmDmgBonus = 1.25;
            }

            // [E-08 신규 구현] Speed Ring 5레벨 돌파: 바람의 상처 2초 달리기 유지 시 공증 10% 가산 보정
            let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;

            // [2차 밸런스 패치] 멀티샷 및 점사 개수에 따른 대미지 역보정(감쇄) 연동 적용
            let multishotDmgFactor = Math.max(0.5, 1.0 - (this.player.multishot - 1) * 0.08);
            let burstDmgFactor = Math.max(0.6, 1.0 - (this.player.burstCount - 1) * 0.05);

            // [수정] 무기 레벨 비례 공격력 상승 (레벨당 +15%)
            let wLvl = 1;
            if (this.player.weaponType === 'supercritical_plasma_fusion') wLvl = 5;
            else if (isLightning) wLvl = this.player.weaponLevels.lightning || 1;
            else if (isFire) wLvl = this.player.weaponLevels.fire || 1;
            else if (isIce) wLvl = this.player.weaponLevels.ice || 1;
            else if (isWhip) wLvl = this.player.weaponLevels.whip || 1;
            let levelMult = 1 + (wLvl - 1) * 0.15;

            let baseDmg = isWhip ? (this.player.atk * 0.75) : (this.player.atk * (isLightning ? 0.9 : 1.0));

            let hybridDmgFactor = 1.0;
            if (this.player.weaponType === 'dual') {
                hybridDmgFactor = 0.75;
            } else if (this.player.weaponType === 'supercritical_plasma_fusion') {
                hybridDmgFactor = 0.85;
            }

            let finalDamage = baseDmg * levelMult * synergyMult * helmDmgBonus * speedRingDmgBonus * multishotDmgFactor * burstDmgFactor * hybridDmgFactor;

            for (let angle of bulletsToLaunch) {
                if (isWhip) {
                    let speed = 9.0;
                    let vx = Math.cos(angle) * speed;
                    let vy = Math.sin(angle) * speed;
                    let bulletLife = 200 / speed; // 그랩 사거리 약 200px

                    let isAdvancedBullet = (this.player.weaponType.indexOf('crude') === -1 && this.player.weaponType !== 'energy_ball');
                    this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                        color: '#ff00aa',
                        radius: 6,
                        life: bulletLife,
                        isWhip: true,
                        pierce: this.player.pierceCount,
                        homing: this.player.homing,
                        homingSpeed: this.player.homingAngleSpeed,
                        splash: this.player.splashRadius,
                        bounceLimit: this.player.wallBounceLimit,
                        monsterBounceLimit: this.player.monsterBounceLimit,
                        isAdvanced: isAdvancedBullet
                    }));

                    // 사슬 네온 조각들
                    for (let i = 0; i < 4; i++) {
                        this.particles.push(new Particle(this.player.x, this.player.y, '#ff00aa', 1.8, vx * 0.5, vy * 0.5, 10, 'dust'));
                    }
                } else {
                    // [초월 무기] 아이스 앤드 파이어 댄스 상태라면 불과 얼음 DNA 탄환 2발 동시 격발!
                    if (this.player.weaponType === 'supercritical_plasma_fusion') {
                        let speed = 7.5; // 불마법(6.2)과 얼음마법(7.5)의 시너지 균형 속도
                        let bulletLife = this.player.range / speed;

                        let anglesForThisBullet = [angle];
                        if (this.player.iceFireProjectilesStack > 0) {
                            for (let j = 1; j <= this.player.iceFireProjectilesStack; j++) {
                                // 양방향으로 0.12 라디안씩 벌어지며 추가 분사
                                anglesForThisBullet.push(angle - j * 0.12);
                                anglesForThisBullet.push(angle + j * 0.12);
                            }
                        }

                        for (let targetAngle of anglesForThisBullet) {
                            let vx = Math.cos(targetAngle) * speed;
                            let vy = Math.sin(targetAngle) * speed;

                            // 1. 불마법 초월 DNA 탄환 (위상 0, 스플래시 보너스)
                            this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                                pierce: this.player.pierceCount,
                                homing: this.player.homing,
                                homingSpeed: this.player.homingAngleSpeed,
                                splash: this.player.splashRadius + 35, // 초월적인 네온 폭화 범위 보너스
                                color: '#ff3300', // 고열 네온 불꽃색
                                radius: 7.2,
                                life: bulletLife,
                                isLightning: false,
                                isFire: true,
                                isIce: false,
                                bounceLimit: this.player.wallBounceLimit,
                                monsterBounceLimit: this.player.monsterBounceLimit,
                                isDna: true,
                                dnaWavePhase: 0,
                                dnaAmplitude: 18,
                                dnaFrequency: 0.16,
                                isScytheSynergy: hasScytheSynergy
                            }));

                            // 2. 얼음마법 초월 DNA 탄환 (위상 Math.PI, 관통 보너스)
                            this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                                pierce: this.player.pierceCount + 2, // 초월적인 빙결 관통력 보너스
                                homing: this.player.homing,
                                homingSpeed: this.player.homingAngleSpeed,
                                splash: this.player.splashRadius,
                                color: '#00f0ff', // 청안 네온 얼음색
                                radius: 5.5,
                                life: bulletLife,
                                isLightning: false,
                                isFire: false,
                                isIce: true,
                                bounceLimit: this.player.wallBounceLimit,
                                monsterBounceLimit: this.player.monsterBounceLimit,
                                isDna: true,
                                dnaWavePhase: Math.PI, // 180도 반대 위상
                                dnaAmplitude: 18,
                                dnaFrequency: 0.16,
                                isScytheSynergy: hasScytheSynergy
                            }));
                        }
                    } else {
                        // dual 상태 및 다중 마법 활성화 시 보유 마법탄을 섞어서 발사!
                        let bulletIsLightning = (this.player.weaponType === 'crude_shock' || this.player.weaponType === 'chain_emp_shock');
                        let bulletIsFire = (this.player.weaponType === 'crude_flamethrower' || this.player.weaponType === 'fusion_plasma_cannon');
                        let bulletIsIce = (this.player.weaponType === 'crude_cryo' || this.player.weaponType === 'cryo_freezer');

                        if (isDual || activeMagics.length > 0) {
                            let pool = [...activeMagics];
                            if (pool.length > 0) {
                                let chosen = pool[Math.floor(Math.random() * pool.length)];
                                if (chosen === 'lightning') {
                                    bulletIsLightning = true;
                                    bulletIsFire = false;
                                    bulletIsIce = false;
                                } else if (chosen === 'fire') {
                                    bulletIsLightning = false;
                                    bulletIsFire = true;
                                    bulletIsIce = false;
                                } else if (chosen === 'ice') {
                                    bulletIsLightning = false;
                                    bulletIsFire = false;
                                    bulletIsIce = true;
                                }
                            }
                        }

                        let speed = bulletIsLightning ? 8.5 : (bulletIsFire ? 6.2 : (bulletIsIce ? 7.5 : 7.0));
                        let vx = Math.cos(angle) * speed;
                        let vy = Math.sin(angle) * speed;
                        let bulletLife = this.player.range / speed;

                        let bulletRadius = bulletIsLightning ? 5.5 : (bulletIsFire ? 7.0 : (bulletIsIce ? 5.0 : 4));
                        if (this.player.equipLevels.gloves >= 5 && !bulletIsLightning && !bulletIsFire && !bulletIsIce) {
                            bulletRadius = 4.8;
                        }

                        let isAdvancedBullet = (this.player.weaponType.indexOf('crude') === -1 && this.player.weaponType !== 'energy_ball');
                        this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, finalDamage, true, {
                            pierce: this.player.pierceCount + (bulletIsIce ? 1 : 0), // 얼음탄은 1회 관통력 기본 보정
                            homing: this.player.homing,
                            homingSpeed: this.player.homingAngleSpeed,
                            splash: this.player.splashRadius + (bulletIsFire ? (30 + (this.player.weaponLevels.fire - 1) * 10) : 0), // [수정] 불탄은 기본 30px + 레벨당 10px 스플래시 반경 추가
                            color: bulletIsFire ? '#ff5e00' : (bulletIsIce ? '#00f0ff' : (bulletIsLightning ? '#ffdf00' : '#00f0ff')),
                            radius: bulletRadius,
                            life: bulletLife,
                            isLightning: bulletIsLightning,
                            isFire: bulletIsFire,
                            isIce: bulletIsIce,
                            bounceLimit: (!bulletIsLightning && !bulletIsFire && !bulletIsIce) ? this.player.wallBounceLimit : 0, // [W-03 총 도탄 옵션 연동]
                            monsterBounceLimit: (!bulletIsLightning && !bulletIsFire && !bulletIsIce) ? this.player.monsterBounceLimit : 0,
                            isScytheSynergy: hasScytheSynergy,
                            isAdvanced: isAdvancedBullet
                        }));
                    }
                }
            }
            if (isWhip) {
                Sound.play('slash');
                this.shakeScreen(4, 1.5);
            } else {
                Sound.play('shoot');
                this.shakeScreen(3, (isLightning || isFire || isIce) ? 1.5 : 1.2);
            }
        };

        // [신규] 프레임 기반 틱 격발 예약 (잔상 사격 버그 원천 차단)
        if (this.player.burstCount > 1) {
            this.player.burstRemaining = this.player.burstCount - 1; // 1회는 즉시 발사하므로 1회 차감
            this.player.burstIntervalTimer = 0;
            this.player.burstAngle = startAngle;
            this.player.burstType = isWhip ? 'whip' : 'gun';
            this.player.burstBulletsToLaunch = bulletsToLaunch;
        } else {
            this.player.burstRemaining = 0;
        }

        // 1회 즉시 사격
        fireBulletPack();
        this.triggerThirdSlotWeapon();
    }

    // [신규 기획] 채찍 즉발 베기 및 견인/기절 물리 충돌 판정
    triggerWhipInstantAttack(anglesToLaunch) {
        let mainW = this.player.equippedWeapons[0] || 'crude_whip';
        let isLaserWire = (mainW === 'nano_laser_wire');
        let whipRadius = isLaserWire ? 220 : 150;

        let synergyMult = this.checkBuildSynergy('gun'); // 채찍은 총기 카드의 시너지를 받음
        let helmDmgBonus = (this.player.equipLevels.helm === 10 && this.player.mp >= this.player.maxMp) ? 1.25 : 1.0;
        let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;

        let multishotDmgFactor = Math.max(0.5, 1.0 - (this.player.multishot - 1) * 0.08);
        let burstDmgFactor = Math.max(0.6, 1.0 - (this.player.burstCount - 1) * 0.05);

        let whipLvl = this.player.weaponLevels.whip || 1;
        let whipLevelMult = 1 + (whipLvl - 1) * 0.15;
        let baseDmg = this.player.atk * 0.3; // 추가 하향 조정 (0.5 -> 0.3)
        let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;
        let finalDamage = baseDmg * whipLevelMult * synergyMult * helmDmgBonus * speedRingDmgBonus * multishotDmgFactor * burstDmgFactor * hybridDmgFactor;

        // [W-06 채찍 동시 견인 제한 공식] 기본 1마리, 다발 및 진화에 비례해 증가
        let maxPullCount = 1 + (this.player.multishot - 1) + (this.player.weaponUnlocks.whip.multi ? 1 : 0);
        let pulledCount = 0;

        for (let i = this.monsters.length - 1; i >= 0; i--) {
            let m = this.monsters[i];
            let dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);

            // 사거리 판정
            if (dist < whipRadius + m.radius) {
                let targetAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
                let inWhipArc = false;

                if (isLaserWire) {
                    inWhipArc = true;
                } else {
                    // [W-04 채찍 좌우 유효 피격각도 동적 성장 공식] 기본 0.2 라디안에서 카드 성장에 따라 미세 확장
                    let whipArcLimit = 0.2 + (this.player.multishot - 1) * 0.05 + (this.player.weaponUnlocks.whip.multi ? 0.15 : 0);

                    // 그어진 모든 채찍 호 각도 검사
                    for (let angle of anglesToLaunch) {
                        let angleDiff = Math.abs(targetAngle - angle);
                        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                        if (Math.abs(angleDiff) < whipArcLimit) {
                            inWhipArc = true;
                            break;
                        }
                    }
                }

                if (inWhipArc) {
                    let isPulled = false;
                    let prevX = m.x;
                    let prevY = m.y;

                    // 동시 견인 수량 제한 범위 내에서만 플레이어 70px 앞 안전 거리로 견인 (나노 레이저 와이어는 견인 배제)
                    if (!isLaserWire && pulledCount < maxPullCount) {
                        let pullAngle = this.player.angle;
                        let pullX = this.player.x + Math.cos(pullAngle) * 70; // 플레이어와 겹침 방지를 위해 70px로 연장 (기존 35px)
                        let pullY = this.player.y + Math.sin(pullAngle) * 70; // 플레이어와 겹침 방지를 위해 70px로 연장 (기존 35px)

                        m.x = pullX;
                        m.y = pullY;

                        // 외벽 충돌 맵 탈출 방지 마진 클램프 (wallMargin = 40)
                        const wallMargin = 40;
                        m.x = Math.max(wallMargin + m.radius, Math.min(this.mapWidth - wallMargin - m.radius, m.x));
                        m.y = Math.max(wallMargin + m.radius, Math.min(this.mapHeight - wallMargin - m.radius, m.y));

                        pulledCount++;
                        isPulled = true;
                    }

                    if (isLaserWire) {
                        m.statusEffects.shock = Math.max(m.statusEffects.shock || 0, 90); // 1.5초 감전
                        // 핑크 스파크 비산 연출
                        for (let k = 0; k < 3; k++) {
                            let speed = Math.random() * 3 + 1;
                            let pAngle = Math.random() * Math.PI * 2;
                            this.particles.push(new Particle(
                                m.x, m.y, '#ff00aa', 1.5, Math.cos(pAngle) * speed, Math.sin(pAngle) * speed, 12, 'spark'
                            ));
                        }

                        // [Option 2: 나노 레이저 와이어 감전 체인 연출]
                        let grabColor = '#ff00aa';
                        let chainCount = 10;
                        for (let k = 0; k <= chainCount; k++) {
                            let t = k / chainCount;
                            let baseX = this.player.x + (m.x - this.player.x) * t;
                            let baseY = this.player.y + (m.y - this.player.y) * t;

                            let dx = m.x - this.player.x;
                            let dy = m.y - this.player.y;
                            let len = Math.hypot(dx, dy);
                            let nx = -dy / (len || 1);
                            let ny = dx / (len || 1);
                            let offset = Math.sin(t * Math.PI * 3) * (Math.random() * 6 + 3); // 지그재그 편차

                            let px = baseX + nx * offset;
                            let py = baseY + ny * offset;

                            this.particles.push(new Particle(
                                px, py, grabColor, 1.8, 0, 0, 8, 'spark'
                            ));
                        }
                    } else if (isPulled) {
                        let shockDuration = 90 + (whipLvl - 1) * 15; // 1레벨: 90프레임 (1.5초) ~ 5레벨: 150프레임 (2.5초)
                        m.statusEffects.shock = shockDuration; // [수정] 기절 프레임 부여 (견인된 적만 스턴)

                        // [Option 2: 조잡한 채찍 견인 궤적 잔상 & 전자기 견인선 연출]
                        let grabColor = '#eb7814'; // 주황색 플라즈마 전류 색상

                        // 1) 몬스터 이동 궤적 먼지 파티클 잔상
                        let steps = 8;
                        for (let k = 0; k <= steps; k++) {
                            let t = k / steps;
                            let px = prevX + (m.x - prevX) * t;
                            let py = prevY + (m.y - prevY) * t;
                            
                            // 이동 방향에 약간의 무작위 흔들림 적용
                            this.particles.push(new Particle(
                                px, py, grabColor, 2.0, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 12, 'dust'
                            ));
                        }

                        // 2) 플레이어와 끌려온 몬스터 사이 번개 견인선
                        let chainCount = 10;
                        for (let k = 0; k <= chainCount; k++) {
                            let t = k / chainCount;
                            let baseX = this.player.x + (m.x - this.player.x) * t;
                            let baseY = this.player.y + (m.y - this.player.y) * t;

                            let dx = m.x - this.player.x;
                            let dy = m.y - this.player.y;
                            let len = Math.hypot(dx, dy);
                            let nx = -dy / (len || 1);
                            let ny = dx / (len || 1);
                            let offset = Math.sin(t * Math.PI * 3) * (Math.random() * 8 + 4);

                            let px = baseX + nx * offset;
                            let py = baseY + ny * offset;

                            this.particles.push(new Particle(
                                px, py, grabColor, 2.2, 0, 0, 10, 'spark'
                            ));
                        }
                    }
                    m.flashTimer = 8;

                    // Whip 진화 능력 해금 연동
                    // 1) whip.haste: 견인 성공 시 공속 스택 중첩
                    if (this.player.weaponUnlocks.whip.haste) {
                        this.player.whipSpeedStack = Math.min(3, (this.player.whipSpeedStack || 0) + 1);
                        this.player.whipSpeedTimer = 180;
                        this.showFloatingText(isPulled ? `GRAB PULL! ⚡ HASTE [${this.player.whipSpeedStack}/3]` : `GRAB HIT! ⚡ HASTE [${this.player.whipSpeedStack}/3]`, this.player.x, this.player.y - 30, '#ff00aa');
                    } else {
                        this.showFloatingText(isPulled ? `GRAB PULL! ⚡` : `GRAB HIT! ⚡`, this.player.x, this.player.y - 30, '#ff00aa');
                    }

                    // 2) whip.break: 피격 적에게 5초(300프레임) 취약 디버프 부여
                    if (this.player.weaponUnlocks.whip.break) {
                        m.statusEffects.vulnerability = Math.max(m.statusEffects.vulnerability || 0, 300);
                    }

                    // 3) whip.shock: 주변 적들에게 40% 스플래시 피해 및 연쇄 기절 전이
                    if (this.player.weaponUnlocks.whip.shock) {
                        let splashRadius = 60;
                        let splashDmg = finalDamage * 0.4;
                        this.particles.push(new Particle(m.x, m.y, '#ff00aa', splashRadius, 0, 0, 15, 'explosionRing'));

                        for (let k = this.monsters.length - 1; k >= 0; k--) {
                            let otherM = this.monsters[k];
                            if (otherM !== m) {
                                let sDist = Math.hypot(otherM.x - m.x, otherM.y - m.y);
                                if (sDist < splashRadius + otherM.radius) {
                                    let shockDuration = 90 + (whipLvl - 1) * 15;
                                    otherM.hp -= splashDmg;
                                    otherM.statusEffects.shock = shockDuration;
                                    otherM.flashTimer = 8;
                                    this.showFloatingText(`SPLASH -${Math.ceil(splashDmg)}`, otherM.x, otherM.y - 20, '#ff00aa');

                                    if (otherM.hp <= 0) {
                                        this.killMonster(otherM, k);
                                        if (k < i) i--;
                                    }
                                }
                            }
                        }
                    }

                    // 네온 분홍빛 스파크 파티클 비산
                    for (let k = 0; k < 8; k++) {
                        let rAngle = Math.random() * Math.PI * 2;
                        let rSpeed = Math.random() * 4 + 2;
                        this.particles.push(new Particle(m.x, m.y, '#ff00aa', 2, Math.cos(rAngle) * rSpeed, Math.sin(rAngle) * rSpeed, 15, 'spark'));
                    }

                    m.hp -= finalDamage;
                    if (m.hp <= 0) {
                        this.killMonster(m, i);
                    }
                }
            }
        }
    }

        // [신규] 검 즉발 물리 타격 판정 (베기 아크 vs 찌르기 선분 다형성)
    triggerSwordInstantAttack(anglesToLaunch, finalDamage) {
        let isAdvanced = (String(this.player.weaponType) === 'plasma_saber');
        let sRadius = isAdvanced ? 130 : 110;
        let px = this.player.x;
        let py = this.player.y;

        for (let angle of anglesToLaunch) {
            let cosA = Math.cos(angle);
            let sinA = Math.sin(angle);

            if (!isAdvanced) {
                // 1) [조잡한 진동검] 찌르기(Thrust) 선분-원 물리 충돌 판정
                let hits = [];
                for (let i = this.monsters.length - 1; i >= 0; i--) {
                    let m = this.monsters[i];
                    if (m.hp <= 0 || m.dead) continue;

                    let dx = m.x - px;
                    let dy = m.y - py;

                    // 찌르기 직선 정사영 비율 t
                    let t = (dx * cosA * sRadius + dy * sinA * sRadius) / (sRadius * sRadius);
                    t = Math.max(0, Math.min(1, t));

                    let tx = px + t * cosA * sRadius;
                    let ty = py + t * sinA * sRadius;

                    let distToLine = Math.hypot(m.x - tx, m.y - ty);

                    // 판정 반지름 마진 8px 부여
                    if (distToLine < m.radius + 8) {
                        let distToPlayer = Math.hypot(m.x - px, m.y - py);
                        hits.push({ index: i, monster: m, distance: distToPlayer });
                    }
                }

                // 관통 처리 (정렬 후 관통력 제한 제공)
                hits.sort((a, b) => a.distance - b.distance);
                let maxPierce = Math.min(5, this.player.pierceCount + 1);
                let allowedHits = hits.slice(0, maxPierce + 1);

                for (let hit of allowedHits) {
                    let m = hit.monster;
                    
                    // 데미지 및 넉백 처리
                    m.hp -= finalDamage;
                    m.flashTimer = 2;
                    m.knockbackX = cosA * 2.5;
                    m.knockbackY = sinA * 2.5;
                    m.isPlayerKnockback = true;

                    this.showFloatingText(Math.round(finalDamage), m.x, m.y - 20, '#ffdf00');
                    if (m.hp <= 0) this.killMonster(hit.index);
                }
            } else {
                // 2) [플라즈마 세이버] 베기(Slash) 부채꼴 범위 판정
                for (let i = this.monsters.length - 1; i >= 0; i--) {
                    let m = this.monsters[i];
                    if (m.hp <= 0 || m.dead) continue;

                    let dx = m.x - px;
                    let dy = m.y - py;
                    let dist = Math.hypot(dx, dy);

                    if (dist < sRadius + m.radius) {
                        let mAngle = Math.atan2(dy, dx);
                        let angleDiff = Math.abs(this.getAngleDifference(angle, mAngle));

                        // 아크 범위 0.95 라디안 이내인 경우 타격
                        if (angleDiff < 0.95) {
                            m.hp -= finalDamage;
                            m.flashTimer = 2;
                            m.knockbackX = Math.cos(mAngle) * 3.5;
                            m.knockbackY = Math.sin(mAngle) * 3.5;
                            m.isPlayerKnockback = true;

                            this.showFloatingText(Math.round(finalDamage), m.x, m.y - 20, '#b026ff');
                            if (m.hp <= 0) this.killMonster(i);
                        }
                    }
                }
            }
        }
    }

    // [신규 기획] 창 즉발 찌르기 및 사거리 끝 80%~100% 치명타(Critical) 및 벽꽝 물리 판정
    triggerSpearInstantAttack(anglesToLaunch) {
        // [S-01 창 사거리 축소 밸런스 공식] 기본 80px, 성장 시 최대 180px 제한 수식
        let spearRange = 80 + (this.player.range - 350) * 0.3;
        if (this.player.weaponUnlocks.spear.range) spearRange += 20;

        let synergyMult = this.checkBuildSynergy('sword'); // 창은 검기 카드의 시너지를 받음
        let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
        let spearLvl = this.player.weaponLevels.spear || 1;
        let spearLevelMult = 1 + (spearLvl - 1) * 0.15;
        let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;
        let weaponDmg = this.player.atk * 0.7 * spearLevelMult * synergyMult * this.player.swordDmgUpgrade * speedRingDmgBonus * hybridDmgFactor; // [수정] 창 대미지 레벨 비례 15% 가중

        let px = this.player.x;
        let py = this.player.y;

        for (let angle of anglesToLaunch) {
            let cosA = Math.cos(angle);
            let sinA = Math.sin(angle);

            let hits = [];
            // 선분 대 원 충돌 판정 연산
            for (let i = this.monsters.length - 1; i >= 0; i--) {
                let m = this.monsters[i];
                let mx = m.x;
                let my = m.y;

                let dx = mx - px;
                let dy = my - py;

                // 찌르기 직선 선분 위로 몬스터의 정사영 투영 비율 t 구하기
                let t = (dx * cosA * spearRange + dy * sinA * spearRange) / (spearRange * spearRange);
                t = Math.max(0, Math.min(1, t)); // 선분 내부로 제한

                // 투영 좌표점 (tx, ty)
                let tx = px + t * cosA * spearRange;
                let ty = py + t * sinA * spearRange;

                // 정사영점에서 몬스터 중심까지의 기하학적 최소 거리
                let distToLine = Math.hypot(mx - tx, my - ty);

                // 몬스터의 피격 판정 (반지름 + 6px 마진 적용)
                if (distToLine < m.radius + 6) {
                    let distToPlayer = Math.hypot(mx - px, my - py);
                    hits.push({ index: i, monster: m, distance: distToPlayer, t: t });
                }
            }

            // 플레이어와 가까운 순서대로 관통 판정을 위한 정렬
            hits.sort((a, b) => a.distance - b.distance);

            // 창의 관통력 제한 (기본 관통 + spear 진화로 2개 추가 제공)
            let maxPierce = Math.min(5, this.player.pierceCount + 2);
            let allowedHits = hits.slice(0, maxPierce + 1);

            for (let hit of allowedHits) {
                let m = hit.monster;
                let idx = hit.index;
                let distToPlayer = hit.distance;

                let isSpearTip = false;
                let finalDmg = weaponDmg;

                // 1) spear.tip: 찌르기 사거리의 80%~100% 끝부분 타격 시 2배 치명타 피해 및 강넉백
                if (distToPlayer >= spearRange * 0.80 && this.player.weaponUnlocks.spear.tip) {
                    finalDmg *= 2.0;
                    isSpearTip = true;
                }

                // 취약 효과 데미지 25% 가산
                if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;

                // 빙결 분쇄(ice.shatter) 연동: 30% 확률로 300% 대미지
                let hasShattered = false;
                if (m.isFrozenActive > 0 && this.player.weaponUnlocks.ice.shatter) {
                    if (Math.random() < 0.3) {
                        finalDmg *= 3.0;
                        hasShattered = true;
                        m.isFrozenActive = 0;
                        m.statusEffects.shock = 0;
                    }
                }

                m.hp -= finalDmg;
                m.flashTimer = 5;

                // 넉백 벡터 적용 (spear.knockback 해금 시 넉백 물리 12.0)
                let kbForce = this.player.weaponUnlocks.spear.knockback ? 12.0 : 7.5;
                m.knockbackX = cosA * kbForce;
                m.knockbackY = sinA * kbForce;
                m.isPlayerKnockback = true;

                if (isSpearTip) {
                    this.showFloatingText("🎯 SPEAR-TIP CRITICAL! 🎯", m.x, m.y - 35, '#00f0ff');
                    this.shakeScreen(8, 3.8);
                    this.triggerHitStop(2); // 창끝 크리티컬 히트 스톱 (2프레임)
                }

                if (hasShattered) {
                    this.showFloatingText("❄️ FREEZE SHATTER! 300%", m.x, m.y - 35, '#00f0ff');
                    this.shakeScreen(12, 5.0);
                    Sound.play('explosion');
                    this.triggerHitStop(3); // 빙결 파쇄 히트 스톱 (3프레임)

                    for (let k = 0; k < 12; k++) {
                        let rAngle = Math.random() * Math.PI * 2;
                        let rSpeed = Math.random() * 4 + 2;
                        this.particles.push(new Particle(m.x, m.y, '#ffffff', 2.5, Math.cos(rAngle) * rSpeed, Math.sin(rAngle) * rSpeed, 20, 'spark'));
                    }
                }

                // 2) spear.wall: 벽꽝 충돌 시 1.5배(50% 추가) 피해
                if (this.player.weaponUnlocks.spear.wall) {
                    let nextX = m.x + m.knockbackX * 3;
                    let nextY = m.y + m.knockbackY * 3;
                    const wallMargin = 40;
                    let hitWall = (nextX <= wallMargin + m.radius || nextX >= this.mapWidth - wallMargin - m.radius ||
                        nextY <= wallMargin + m.radius || nextY >= this.mapHeight - wallMargin - m.radius);

                    if (hitWall) {
                        let wallCrashDmg = finalDmg * 0.5;
                        m.hp -= wallCrashDmg;
                        this.showFloatingText("💥 WALL IMPACT! +50%", m.x, m.y - 20, '#ffdf00');
                        Sound.play('explosion');

                        for (let k = 0; k < 6; k++) {
                            let rAngle = Math.random() * Math.PI * 2;
                            let rSpeed = Math.random() * 3 + 1;
                            this.particles.push(new Particle(m.x, m.y, '#ffdf00', 2, Math.cos(rAngle) * rSpeed, Math.sin(rAngle) * rSpeed, 15, 'spark'));
                        }
                    }
                }

                Sound.play('hit');

                // 청록색 찌르기 스파크 파티클 생성
                for (let k = 0; k < 5; k++) {
                    let rSpeed = Math.random() * 3 + 1;
                    this.particles.push(new Particle(m.x, m.y, '#00f0ff', 2, cosA * rSpeed + (Math.random() - 0.5) * 2, sinA * rSpeed + (Math.random() - 0.5) * 2, 15));
                }

                if (m.hp <= 0) {
                    this.killMonster(m, idx);
                }
            }
        }
    }

    slashWeapon() {
        let mainWeapon = this.player.equippedWeapons[0] || 'sword';
        if (mainWeapon === 'scythe' || mainWeapon === 'crude_scythe' || mainWeapon === 'void_destroyer') {
            let isAdvanced = (mainWeapon === 'void_destroyer' || mainWeapon === 'scythe');
            let activeAspd = this.player.getEffectiveAspd();
            // 디튠: 쿨타임 75 (조잡) / 50 (진화), 최소 한도 18프레임
            let cooldownFrames = Math.max(18, (isAdvanced ? 50 : 75) / activeAspd);
            this.player.slashCooldown = cooldownFrames;

            let scytheLvl = this.player.weaponLevels.scythe || 1;
            // 대미지 억제: 조잡 0.7x, 진화 1.2x
            let baseDmg = isAdvanced ? 1.2 : 0.7;
            let finalDamage = this.player.atk * baseDmg * (1 + (scytheLvl - 1) * 0.15);

            this.player.isScytheActive = true;
            this.player.scytheTimer = 12;
            this.player.scytheAngle = this.player.angle;

            this.triggerScytheAttack(this.player.angle, finalDamage);

            let secondary = this.player.equippedWeapons[1];
            if (secondary === 'sword') {
                this.triggerScytheSwordSynergy(this.player.angle, finalDamage * 0.5);
            }

            Sound.play('slash');
            this.shakeScreen(6, 2.8);

            this.triggerThirdSlotWeapon();
            return;
        }

        let hasSword = (this.player.weaponLevels.sword > 0);
        let hasSpear = (this.player.weaponLevels.spear > 0);
        let hasWhip = (this.player.weaponLevels.whip > 0);

        // 공속 쿨타임 및 최소 프레임 한도 계산
        let baseCd = 50;
        let minCd = 15;
        if (hasSpear) {
            baseCd = Math.min(baseCd, 40);
            minCd = Math.min(minCd, 12);
        }
        if (hasWhip) {
            baseCd = Math.min(baseCd, 45);
            minCd = Math.min(minCd, 13);
        }
        if (hasSword) {
            baseCd = Math.min(baseCd, 50);
            minCd = Math.min(minCd, 15);
        }

        let cooldownFrames = Math.max(minCd, baseCd / this.player.aspd);
        this.player.slashCooldown = cooldownFrames;

        let startAngle = this.player.angle;

        // 각 무기별 독자 다발 각도 계산
        let swordAngles = [];
        let whipAngles = [];
        let spearAngles = [];

        // 1. 검 다발 각도
        if (this.player.multishot === 1) {
            swordAngles.push(startAngle);
        } else {
            let arcSpan = this.player.multishotArc;
            let step = arcSpan / (this.player.multishot - 1);
            for (let i = 0; i < this.player.multishot; i++) {
                swordAngles.push(startAngle - (arcSpan / 2) + (step * i));
            }
        }

        // 2. 채찍 다발 각도
        let whipMultiArc = 0.15 + (this.player.multishot - 1) * 0.03 + (this.player.weaponUnlocks.whip.multi ? 0.10 : 0);
        if (this.player.multishot === 1) {
            whipAngles.push(startAngle);
        } else {
            let step = whipMultiArc / (this.player.multishot - 1);
            for (let i = 0; i < this.player.multishot; i++) {
                whipAngles.push(startAngle - (whipMultiArc / 2) + (step * i));
            }
        }

        // 3. 창 다발 각도 (multi 해금 시 3개 고정)
        if (this.player.weaponUnlocks.spear.multi) {
            spearAngles = [startAngle - 0.2, startAngle, startAngle + 0.2];
        } else {
            spearAngles = [startAngle];
        }

        let fireSlashPack = (sAngles, wAngles, spAngles) => {
            // [창 즉발 및 관통 투사체 융합 격발]
            if (hasSpear) {
                this.player.isSpearActive = true;
                this.player.spearTimer = 8;
                this.player.spearAngle = startAngle;
                this.player.spearAngles = [...spAngles];

                let targetRange = 80 + (this.player.range - 350) * 0.3;
                if (this.player.weaponUnlocks.spear.range) targetRange += 20;

                for (let angle of spAngles) {
                    for (let i = 0; i < 6; i++) {
                        let distOffset = i * (targetRange / 6);
                        let px = this.player.x + Math.cos(angle) * distOffset;
                        let py = this.player.y + Math.sin(angle) * distOffset;
                        let vx = Math.cos(angle) * 3;
                        let vy = Math.sin(angle) * 3;
                        this.particles.push(new Particle(px, py, '#00f0ff', 1.8, vx, vy, 12, 'dust'));
                    }
                }

                // 즉발 찌르기 물리 타격
                this.triggerSpearInstantAttack(spAngles);

                // 관통 투사체 날리기
                let synergyMult = this.checkBuildSynergy('spear');
                let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
                let baseMult = 0.7; // 창 대미지 비율
                let hybridDmgFactor = this.player.weaponType === 'dual' ? 0.75 : 1.0;
                let spearDmg = this.player.atk * baseMult * synergyMult * this.player.swordDmgUpgrade * speedRingDmgBonus * hybridDmgFactor;

                for (let angle of spAngles) {
                    let speed = 10.0;
                    let vx = Math.cos(angle) * speed;
                    let vy = Math.sin(angle) * speed;
                    this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, spearDmg, true, {
                        closeCritical: true,
                        pierce: Math.min(5, this.player.pierceCount + 2),
                        homing: this.player.homing,
                        homingSpeed: this.player.homingAngleSpeed,
                        splash: this.player.splashRadius,
                        color: '#00f0ff',
                        radius: 6,
                        isSpear: true
                    }));
                }
            }

            // [채찍 즉발 견인 및 그랩 융합 격발]
            if (hasWhip) {
                this.player.isSlashActive = true;
                this.player.slashTimer = 12;
                this.player.slashAngle = startAngle;
                this.player.slashAngles = [...wAngles];

                let radius = this.player.weaponUnlocks.whip.range ? 220 : 150;
                for (let angle of wAngles) {
                    for (let i = 0; i < 8; i++) {
                        let t = i / 8;
                        let dist = radius * t;
                        let wave = Math.sin(t * Math.PI * 2) * 15;
                        let px = this.player.x + Math.cos(angle) * dist - Math.sin(angle) * wave;
                        let py = this.player.y + Math.sin(angle) * dist + Math.cos(angle) * wave;
                        let vx = Math.cos(angle) * 1.5;
                        let vy = Math.sin(angle) * 1.5;
                        this.particles.push(new Particle(px, py, '#ff00aa', 1.8, vx, vy, 15, 'dust'));
                    }
                }

                // 채찍 즉발 그랩/기절 물리 타격
                this.triggerWhipInstantAttack(wAngles);
            }

            // [검 베기 파편 및 검기 파동 융합 격발]
                        if (hasSword) {
                let isAdvanced = (String(this.player.weaponType) === 'plasma_saber');
                this.player.swordAttackType = isAdvanced ? 'slash' : 'thrust';
                this.player.isSlashActive = true;
                this.player.slashTimer = 12;
                this.player.slashAngle = startAngle;
                this.player.slashAngles = isAdvanced ? [...sAngles] : [startAngle];

                let anglesToUse = isAdvanced ? sAngles : [startAngle];
                for (let angle of anglesToUse) {
                    for (let i = -5; i <= 5; i++) {
                        let offset = angle + (i * 0.15);
                        let px = this.player.x + Math.cos(offset) * 25;
                        let py = this.player.y + Math.sin(offset) * 25;
                        let vx = Math.cos(offset) * 2;
                        let vy = Math.sin(offset) * 2;
                        this.particles.push(new Particle(px, py, '#b026ff', 2, vx, vy, 15, 'slashWave'));
                    }
                }

                let synergyMult = this.checkBuildSynergy('sword');
                let speedRingDmgBonus = this.player.windScarActive ? 1.10 : 1.0;
                let baseMult = 0.8;
                let swordDmg = this.player.atk * baseMult * synergyMult * this.player.swordDmgUpgrade * speedRingDmgBonus;

                // [추가] 조잡한 무기 즉발 물리 타격 적용 (조잡한 진동검은 단일 각도로만 판정)
                this.triggerSwordInstantAttack(anglesToUse, swordDmg);

                // 검기 파동 발사 (오직 플라즈마 세이버 및 wave 진화 해금 시에만 발격)
                if (isAdvanced && this.player.weaponUnlocks.sword.wave) {
                    for (let angle of sAngles) {
                        let speed = 6.0;
                        let vx = Math.cos(angle) * speed;
                        let vy = Math.sin(angle) * speed;
                        this.bullets.push(new Bullet(this.player.x, this.player.y, vx, vy, swordDmg, true, {
                            pierce: Math.min(5, this.player.pierceCount + 1),
                            homing: this.player.homing,
                            homingSpeed: this.player.homingAngleSpeed,
                            splash: this.player.splashRadius,
                            color: '#b026ff',
                            radius: 5
                        }));
                    }
                }

                // 융합 시너지: 주(검) + 부(레일)
                let secondary = this.player.equippedWeapons[1];
                if (secondary === 'railcannon') {
                    this.triggerSwordRailSynergy(startAngle, swordDmg * 0.6);
                }
            }

            Sound.play('slash');
            if (hasSword) {
                this.shakeScreen(5, 2.5);
            } else if (hasSpear) {
                this.shakeScreen(4, 1.8);
            } else if (hasWhip) {
                this.shakeScreen(4, 1.5);
            }
        };

        // [신규] 프레임 기반 틱 격발 예약 (융합 근접 무기 틱 난무)
        if (this.player.burstCount > 1) {
            this.player.burstRemaining = this.player.burstCount - 1;
            this.player.burstIntervalTimer = 0;
            this.player.burstAngle = startAngle;
            this.player.burstType = 'melee'; // 융합 근접 틱 난무 상태 지정
            this.player.burstBulletsToLaunch = swordAngles; // base 각도로 swordAngles 사용
        } else {
            this.player.burstRemaining = 0;
        }

        fireSlashPack(swordAngles, whipAngles, spearAngles);
        this.triggerThirdSlotWeapon();
    }

    // HUD 데이터 동기화 및 바 게이지 드로잉
    updateHUD() {
        // 플레이어 레벨 동적 계산 (무기 레벨 총합 + 장비 레벨 총합 + 1)
        const playerLv = Object.values(this.player.weaponLevels).reduce((a, b) => a + b, 0) + Object.values(this.player.equipLevels).reduce((a, b) => a + b, 0) + 1;
        const runnerLvEl = document.getElementById('runner-lv');
        if (runnerLvEl) {
            runnerLvEl.innerText = `LV.${playerLv}`;
        }

        document.getElementById('room-counter').innerText = `${this.roomNum} / 100`;
        document.getElementById('score-counter').innerText = this.score;
        document.getElementById('monster-counter').innerText = `${this.monsters.length} / ${this.currentSpawnTotal}`;

        // [신규 기획] 실시간 보유 네온 코인 동기화
        document.getElementById('coin-counter').innerText = `📀 ${this.player.coins || 0}`;

        // 생명력 HP 연산
        let hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
        document.getElementById('hp-bar-fill').style.width = `${hpPct}%`;

        let hpTextStr = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;
        if (this.player.armorShield > 0) {
            hpTextStr += ` (+🛡️${Math.ceil(this.player.armorShield)})`;
        }
        document.getElementById('hp-text').innerText = hpTextStr;

        // 스태미너 Stamina 연산
        let stPct = Math.max(0, (this.player.stamina / this.player.maxStamina) * 100);
        document.getElementById('stamina-bar-fill').style.width = `${stPct}%`;
        document.getElementById('stamina-text').innerText = `${Math.ceil(this.player.stamina)} / ${this.player.maxStamina}`;

        // 마력 MP 연산
        let mpPct = Math.max(0, (this.player.mp / this.player.maxMp) * 100);
        document.getElementById('mp-bar-fill').style.width = `${mpPct}%`;

        let mpTextStr = `${Math.ceil(this.player.mp)} / ${this.player.maxMp}`;
        if (this.timeDilationActive) {
            mpTextStr = "🔮 TIME WARPING...";
        } else if (this.player.mp >= 100) { // [개선] maxMp 대신 고정치인 100 MP 기준으로 READY 상태 판단
            mpTextStr = this.player.magicType === 'timeWarp' ? "🔮 WARP READY (SPACE)" : "READY (SPACEBAR)";
        }
        document.getElementById('mp-text').innerText = mpTextStr;

        // 장착된 무기 이름 매핑 함수 (legacy ID 및 신규 무기 ID를 동시 매핑 지원)
        const getWeaponName = (id) => {
            const names = {
                energy_ball: '에너지 볼', gun: '에너지 볼',
                sword: '플라즈마 세이버', crude_sword: '조잡한 진동검', plasma_saber: '플라즈마 세이버',
                spear: '에너지 파일벙커', crude_spear: '조잡한 창', energy_pilebunker: '에너지 파일벙커',
                whip: '나노 레이저 와이어', crude_whip: '조잡한 채찍', nano_laser_wire: '나노 레이저 와이어',
                lightning: '체인 EMP 쇼크', crude_shock: '조잡한 전격기', chain_emp_shock: '체인 EMP 쇼크',
                fire: '퓨전 플라즈마 캐논', crude_flamethrower: '조잡한 화방', fusion_plasma_cannon: '퓨전 플라즈마 캐논',
                ice: '크라이오 프리저', crude_cryo: '조잡한 냉각총', cryo_freezer: '크라이오 프리저',
                thorns: '중력 특이점 필드', crude_thorns: '조잡한 가시갑옷', gravity_singularity_field: '중력 특이점 필드',
                trap: '사이버 지뢰', crude_trap: '조잡한 덫', proximity_cyber_mine: '사이버 지뢰',
                scythe: '보이드 디스트로이어', crude_scythe: '조잡한 낫', void_destroyer: '보이드 디스트로이어',
                railcannon: '태키온 레일건', crude_rail: '조잡한 레일건', tachyon_railgun: '태키온 레일건'
            };
            return names[id] || id;
        };

        // 장착된 무기 아이콘 매핑 함수
        const getWeaponIcon = (id) => {
            const icons = {
                energy_ball: '🔵', gun: '🔵',
                sword: '🗡️', crude_sword: '🪓', plasma_saber: '🗡️',
                spear: '⚡', crude_spear: '🔱', energy_pilebunker: '⚡',
                whip: '🧬', crude_whip: '🧣', nano_laser_wire: '🧬',
                lightning: '🔋', crude_shock: '🔌', chain_emp_shock: '🔋',
                fire: '💥', crude_flamethrower: '🔥', fusion_plasma_cannon: '💥',
                ice: '🧊', crude_cryo: '❄️', cryo_freezer: '🧊',
                thorns: '🧲', crude_thorns: '🌵', gravity_singularity_field: '🧲',
                trap: '🛰️', crude_trap: '⚙️', proximity_cyber_mine: '🛰️',
                scythe: '🌌', crude_scythe: '⛏️', void_destroyer: '🌌',
                railcannon: '⚡', crude_rail: '📡', tachyon_railgun: '⚡'
            };
            return icons[id] || '❓';
        };

        // [신규] 무기 슬롯 UI 동적 업데이트
        const wpnSlot0 = document.getElementById('wpn-slot-0');
        const wpnSlot1 = document.getElementById('wpn-slot-1');
        const wpnSlotSub = document.getElementById('wpn-slot-sub');

        if (wpnSlot0 && this.player.equippedWeapons.length > 0) {
            const w0 = this.player.equippedWeapons[0];
            wpnSlot0.className = 'weapon-slot';
            document.getElementById('wpn-slot-name-0').innerText = getWeaponName(w0);
            document.getElementById('wpn-slot-lv-0').innerText = `Lv.${this.player.weaponLevels[w0] || (this.getLegacyWeaponGroup(w0) === 'gun' ? 1 : 0)}`;
            wpnSlot0.querySelector('.weapon-slot-icon').innerText = getWeaponIcon(w0);
        }

        if (wpnSlot1) {
            if (this.player.equippedWeapons.length > 1) {
                const w1 = this.player.equippedWeapons[1];
                wpnSlot1.className = 'weapon-slot';
                document.getElementById('wpn-slot-name-1').innerText = getWeaponName(w1);
                document.getElementById('wpn-slot-lv-1').innerText = `Lv.${this.player.weaponLevels[w1] || 0}`;
                wpnSlot1.querySelector('.weapon-slot-icon').innerText = getWeaponIcon(w1);
            } else {
                wpnSlot1.className = 'weapon-slot empty';
                document.getElementById('wpn-slot-name-1').innerText = '비어있음';
                document.getElementById('wpn-slot-lv-1').innerText = '—';
                wpnSlot1.querySelector('.weapon-slot-icon').innerText = '➕';
            }
        }

        if (wpnSlotSub) {
            if (this.player.maxWeaponSlots < 3) {
                wpnSlotSub.className = 'weapon-slot sub locked';
                document.getElementById('wpn-slot-name-sub').innerText = '잠금';
                document.getElementById('wpn-slot-lv-sub').innerText = '—';
                wpnSlotSub.querySelector('.weapon-slot-icon').innerText = '🔒';
            } else if (this.player.thirdSlotWeapon) {
                const ws = this.player.thirdSlotWeapon;
                wpnSlotSub.className = 'weapon-slot sub';
                document.getElementById('wpn-slot-name-sub').innerText = getWeaponName(ws);
                document.getElementById('wpn-slot-lv-sub').innerText = `Lv.${this.player.weaponLevels[ws] || 0}`;
                wpnSlotSub.querySelector('.weapon-slot-icon').innerText = getWeaponIcon(ws);
            } else {
                wpnSlotSub.className = 'weapon-slot sub';
                document.getElementById('wpn-slot-name-sub').innerText = '비어있음';
                document.getElementById('wpn-slot-lv-sub').innerText = '장착 가능';
                wpnSlotSub.querySelector('.weapon-slot-icon').innerText = '➕';
            }
        }

        // [리뉴얼] 세부 스탯 패널 — 수치 변동 감지 + 하이라이트 트리거
        // 이전 프레임 스탯 캐시 초기화 (최초 호출 시)
        if (!this._prevStatCache) {
            this._prevStatCache = {};
        }

        // 스탯 값 변동 감지 및 하이라이트 적용 유틸 함수
        const updateStatWithHighlight = (elId, newText) => {
            const el = document.getElementById(elId);
            if (!el) return;
            const oldText = this._prevStatCache[elId];
            el.innerText = newText;
            if (oldText !== undefined && oldText !== newText) {
                // 수치 파싱으로 증감 판별
                const oldNum = parseFloat(String(oldText).replace(/[^0-9.\-]/g, ''));
                const newNum = parseFloat(String(newText).replace(/[^0-9.\-]/g, ''));
                el.classList.remove('stat-up', 'stat-down');
                void el.offsetWidth; // 리플로우 트리거로 애니메이션 리셋
                if (!isNaN(oldNum) && !isNaN(newNum)) {
                    el.classList.add(newNum > oldNum ? 'stat-up' : 'stat-down');
                } else {
                    el.classList.add('stat-up'); // 텍스트 변경은 기본 up 효과
                }
            }
            this._prevStatCache[elId] = newText;
        };

        let defPct = (this.player.def / (this.player.def + 100)) * 100;
        updateStatWithHighlight('stat-atk', String(this.player.atk));
        updateStatWithHighlight('stat-aspd', this.player.aspd.toFixed(1));
        updateStatWithHighlight('stat-ms', this.player.ms.toFixed(1));
        updateStatWithHighlight('stat-evd', `${(this.player.evd * 100).toFixed(0)}%`);
        updateStatWithHighlight('stat-def', `${this.player.def}`);
        updateStatWithHighlight('stat-luk', this.player.luk.toFixed(1));
        updateStatWithHighlight('stat-regen', `${this.player.hpRegen.toFixed(1)}`);
        updateStatWithHighlight('stat-range', `${this.player.range}`);
        updateStatWithHighlight('stat-pets', `${this.pets.length}`);

        // 미사용 기억의 조각
        this.loadMemoryFragments(); // 실시간 수치 동기화
        updateStatWithHighlight('stat-fragments', `${this.unusedFragments}`);

        // 글리치 율
        let noiseRate = 45;
        if (this.unusedFragments >= 10) noiseRate = 0;
        else if (this.unusedFragments >= 5) noiseRate = 15;
        updateStatWithHighlight('stat-glitch', `${noiseRate}%`);

        // 보안 상태 및 지표
        const secEl = document.getElementById('stat-security');
        if (secEl) {
            let secText, secColor, secClass;
            if (this.unusedFragments >= 7) {
                secText = '안전';
                secColor = '#39ff14';
                secClass = 'stat-card-value text-glow-green';
            } else if (this.unusedFragments >= 3) {
                secText = '주의';
                secColor = '#ffdf00';
                secClass = 'stat-card-value text-glow-yellow';
            } else {
                secText = '위험';
                secColor = '#ff0055';
                secClass = 'stat-card-value text-glow-red';
            }
            secEl.innerText = secText;
            secEl.style.color = secColor;
            secEl.className = secClass;
        }
    }

    // [신규 기믹] 보상 대기 큐 및 순차 처리 시스템
    enqueueReward(reward) {
        this.rewardQueue.push(reward);
        this.processRewardQueue();
    }

    processRewardQueue() {
        // 이미 보상 오버레이가 화면에 열려 있으면 프로세스를 중단하고 대기합니다.
        if (this.isRewardOverlayOpen()) {
            return;
        }

        if (this.rewardQueue.length === 0) {
            return;
        }

        const nextReward = this.rewardQueue.shift();
        if (nextReward.type === 'reward') {
            this.triggerRewardSelector(nextReward.isFromHiddenChest);
        } else if (nextReward.type === 'blueprint') {
            this.triggerBlueprintRewardSelection();
        }
    }

    isRewardOverlayOpen() {
        const rewardOverlay = document.getElementById('reward-overlay');
        const blueprintOverlay = document.getElementById('blueprint-overlay');
        
        const isRewardVisible = rewardOverlay && !rewardOverlay.classList.contains('hidden');
        const isBlueprintVisible = blueprintOverlay && !blueprintOverlay.classList.contains('hidden');
        
        return isRewardVisible || isBlueprintVisible;
    }

    completeRewardProgress() {
        this.processRewardQueue();
        
        // 대기 큐가 비어 있고, 열려 있는 보상 오버레이도 없을 때 비로소 포털을 활성화합니다.
        if (this.rewardQueue.length === 0 && !this.isRewardOverlayOpen()) {
            this.portals.forEach(p => p.active = true);
            this.updateHUD();
        }
    }

    // --------------------------------------------------------------------------
    // 9. 카드 보상 선택 레이아웃 트리거
    // --------------------------------------------------------------------------
    triggerRewardSelector(isFromHiddenChest = false, isExtraDraw = false) {
        // [신규 기획] 일반 스탯 방(5의 배수 방도 아니고 보물상자도 아니며 weapon/equipment 유형도 아닌 경우)일 경우
        // 카드 보상 선택기를 건너뛰고, 몬스터 스폰 수에 비례한 네온 코인만 지급 후 즉시 포털을 개방합니다.
        const isSpecialReward = (this.roomNum % 5 === 0) || isFromHiddenChest || this.currentRoomType === 'weapon' || this.currentRoomType === 'equipment';

        if (!isSpecialReward && !isExtraDraw) {
            let coinGain = Math.max(1, Math.floor(this.currentSpawnTotal * 2 * (1 + (this.player.luk - 1) * 0.15)));
            this.player.coins = (this.player.coins || 0) + coinGain;

            this.showFloatingText(`+📀 ${coinGain} COINS`, this.player.x, this.player.y - 30, '#fff01f');
            Sound.play('coin');

            this.portals.forEach(p => p.active = true);
            this.updateHUD();
            return;
        }

        const overlay = document.getElementById('reward-overlay');
        overlay.classList.remove('hidden');

        // 최초 선택 시 추가 획득 카운트 초기화
        if (!isExtraDraw) {
            this.extraDrawCount = 0;
        }

        // [신규 기획] 단계별 추가 획득 비주얼 딤드 & 테두리 콤보 글로우 연출
        if (overlay) {
            // 단계별 배경색 (더욱 짙어지고 신비로운 톤으로 심화)
            const bgTones = [
                "rgba(5, 6, 12, 0.88)",      // 최초: 기본 어두움
                "rgba(0, 10, 20, 0.91)",     // 1단계: 청록빛 어둠
                "rgba(0, 18, 12, 0.92)",     // 2단계: 녹빛 어둠
                "rgba(20, 16, 0, 0.93)",     // 3단계: 황금 주황빛 어둠
                "rgba(18, 0, 24, 0.94)",     // 4단계: 심연 자줏빛 어둠
            ];
            // 단계별 박스 쉐도우 (Vignette 테두리 글로우)
            const glowStyles = [
                "", // 최초: 기본 없음
                "inset 0 0 60px rgba(0, 240, 255, 0.25)", // 1단계: Cyan
                "inset 0 0 85px rgba(57, 255, 20, 0.3)",   // 2단계: Green
                "inset 0 0 110px rgba(255, 223, 0, 0.35)",  // 3단계: Yellow
                "inset 0 0 150px rgba(255, 0, 85, 0.48), inset 0 0 50px rgba(255, 223, 0, 0.3)" // 4단계: Pink & Gold
            ];
            overlay.style.background = bgTones[this.extraDrawCount] || bgTones[bgTones.length - 1];
            overlay.style.boxShadow = glowStyles[this.extraDrawCount] || glowStyles[glowStyles.length - 1];
        }

        // [엘리트/보스 보상 기획 연계] 5의 배수 방 여부 체크
        const isWeaponReward = (this.roomNum % 5 === 0) || isFromHiddenChest;
        let bonusText = "";

        if (isFromHiddenChest) {
            bonusText = "🎁 보물상자 발견! 고가치 무기/장비 확정 획득";
            document.getElementById('reward-header').innerText = "보물상자 개방 완료! 상위 무기/장비 선택";
        } else if (isWeaponReward) {
            let classStr = this.lastEnteredPortalClass === 'high' ? "상 [ELITE/BOSS] (Epic/Legendary 확정)" : (this.lastEnteredPortalClass === 'mid' ? "중 [ELITE] (Rare/Epic 보증)" : "하 [NORMAL] (Common/Rare 위주)");
            bonusText = `방 진입 난이도 보상 등급: ${classStr}`;
            document.getElementById('reward-header').innerText = "보스/엘리트 토벌 완료! 상위 무기 카드 선택";
        } else {
            const monsterBonus = this.currentSpawnTotal;
            const multiplierPct = (monsterBonus * 4);
            bonusText = `몬스터 소탕 보너스: +${multiplierPct}% (스탯 등급 강화)`;
            document.getElementById('reward-header').innerText = "방 소탕 완료! 보상을 선택하세요";
        }

        // 추가 획득 시 진행도 텍스트 표기
        if (isExtraDraw) {
            bonusText += ` (추가 선택 기회 진행 중: ${this.extraDrawCount}/4)`;
        }

        document.getElementById('reward-multiplier').innerText = bonusText;

        // 카드 슬롯을 빌드
        const cardContainers = document.querySelectorAll('.reward-card');
        let cardsData = this.generateRewardCardsData(this.currentSpawnTotal, isFromHiddenChest, isSpecialReward);

        const renderCards = (dataList) => {
            cardContainers.forEach((cardEl, idx) => {
                const data = dataList[idx];
                if (!data) return; // 예외 방지

                cardEl.className = `reward-card card-${data.rarity.toLowerCase()}`;

                // 카드 엘리먼트 데이터 채우기
                const rarityTag = cardEl.querySelector('.card-rarity');
                rarityTag.className = `card-rarity ${data.rarity.toLowerCase()}`;
                rarityTag.innerText = data.rarity;

                cardEl.querySelector('.card-icon').innerText = data.icon;
                cardEl.querySelector('.card-title').innerText = data.title;
                cardEl.querySelector('.card-desc').innerText = data.desc;

                // 기존 이벤트 핸들러 제거 후 새로 바인딩
                cardEl.onclick = (e) => {
                    e.stopPropagation();

                    // [신규 기획] 무기 슬롯 제한 및 교체 로직 가동
                    const WEAPON_IDS = ['sword', 'spear', 'whip', 'lightning', 'fire', 'ice', 'scythe', 'railcannon', 'thorns', 'trap'];
                    const isWeaponCard = WEAPON_IDS.includes(data.id);
                    const alreadyHasWeapon = this.player.equippedWeapons.includes(data.id) || (this.player.thirdSlotWeapon === data.id);

                    if (isWeaponCard && !alreadyHasWeapon) {
                        // 1. 주/부무기 슬롯이 아직 비어있는 경우 (2개 미만) -> 바로 획득
                        if (this.player.equippedWeapons.length < 2) {
                            this.player.equippedWeapons.push(data.id);
                            let newLvl = 1;
                            if (data.rarity === 'RARE') newLvl = 2;
                            else if (data.rarity === 'EPIC') newLvl = 3;
                            else if (data.rarity === 'LEGENDARY') newLvl = 4;
                            this.player.weaponLevels[data.id] = newLvl;

                            // 해금 상태 동적 반영
                            if (data.id === 'spear') {
                                this.player.weaponUnlocks.spear.tip = newLvl >= 2;
                                this.player.weaponUnlocks.spear.range = newLvl >= 2;
                                this.player.weaponUnlocks.spear.knockback = newLvl >= 3;
                                this.player.weaponUnlocks.spear.wall = newLvl >= 4;
                                this.player.weaponUnlocks.spear.multi = newLvl >= 5;
                            } else if (data.id === 'whip') {
                                this.player.weaponUnlocks.whip.haste = newLvl >= 2;
                                this.player.weaponUnlocks.whip.range = newLvl >= 2;
                                this.player.weaponUnlocks.whip.break = newLvl >= 3;
                                this.player.weaponUnlocks.whip.shock = newLvl >= 4;
                                this.player.weaponUnlocks.whip.multi = newLvl >= 5;
                            }

                            overlay.classList.add('hidden');
                            this.player.updateWeaponType();
                            this.updateHUD();
                            this.triggerPowerUpVisuals(data);
                            this.completeRewardProgress(); // [신규] 큐 완료 후 포털 활성화 제어
                            Sound.play('powerup');
                            return;
                        }
                        // 2. 주/부무기가 꽉 찼는데, 3슬롯 계약이 체결되었고 아직 보조 무기가 없는 경우 -> 자동 보조무기 장착
                        else if (this.player.maxWeaponSlots === 3 && this.player.thirdSlotWeapon === null) {
                            this.player.thirdSlotWeapon = data.id;
                            let newLvl = 1;
                            if (data.rarity === 'RARE') newLvl = 2;
                            else if (data.rarity === 'EPIC') newLvl = 3;
                            else if (data.rarity === 'LEGENDARY') newLvl = 4;
                            this.player.weaponLevels[data.id] = newLvl;

                            // 해금 상태 동적 반영
                            if (data.id === 'spear') {
                                this.player.weaponUnlocks.spear.tip = newLvl >= 2;
                                this.player.weaponUnlocks.spear.range = newLvl >= 2;
                                this.player.weaponUnlocks.spear.knockback = newLvl >= 3;
                                this.player.weaponUnlocks.spear.wall = newLvl >= 4;
                                this.player.weaponUnlocks.spear.multi = newLvl >= 5;
                            } else if (data.id === 'whip') {
                                this.player.weaponUnlocks.whip.haste = newLvl >= 2;
                                this.player.weaponUnlocks.whip.range = newLvl >= 2;
                                this.player.weaponUnlocks.whip.break = newLvl >= 3;
                                this.player.weaponUnlocks.whip.shock = newLvl >= 4;
                                this.player.weaponUnlocks.whip.multi = newLvl >= 5;
                            }

                            overlay.classList.add('hidden');
                            this.player.updateWeaponType();
                            this.updateHUD();
                            this.triggerPowerUpVisuals(data);
                            this.completeRewardProgress(); // [신규] 큐 완료 후 포털 활성화 제어
                            Sound.play('powerup');
                            return;
                        }
                        // 3. 슬롯이 완전히 부족하여 교체해야 하는 경우 -> 교체 팝업 노출
                        else {
                            // 카드 컨테이너와 액션 버튼 숨기고 교체 패널 활성화
                            document.querySelector('.card-container').classList.add('hidden');
                            const rActions = document.querySelector('.reward-actions');
                            if (rActions) rActions.classList.add('hidden');

                            const replacePanel = document.getElementById('reward-weapon-replace-panel');
                            replacePanel.classList.remove('hidden');

                            const slotsContainer = document.getElementById('replace-slots-container');
                            slotsContainer.innerHTML = ''; // 초기화

                            this.player.equippedWeapons.forEach(oldWpnId => {
                                const btn = document.createElement('button');
                                btn.className = 'replace-slot-btn';

                                let wpnName = oldWpnId;
                                if (oldWpnId === 'gun') wpnName = '기본 총 (Gun)';
                                if (oldWpnId === 'sword') wpnName = '네온 검 (Sword)';
                                if (oldWpnId === 'spear') wpnName = '네온 창 (Spear)';
                                if (oldWpnId === 'whip') wpnName = '네온 채찍 (Whip)';
                                if (oldWpnId === 'thorns') wpnName = '네온 가시 (Thorns)';
                                if (oldWpnId === 'trap') wpnName = '네온 함정 (Trap)';
                                if (oldWpnId === 'lightning') wpnName = '번개마법 (Lightning)';
                                if (oldWpnId === 'fire') wpnName = '불마법 (Fire)';
                                if (oldWpnId === 'ice') wpnName = '얼음마법 (Ice)';
                                if (oldWpnId === 'scythe') wpnName = '사이버 낫 (Scythe)';
                                if (oldWpnId === 'railcannon') wpnName = '레일 캐논 (Rail)';

                                const lvl = this.player.weaponLevels[oldWpnId] || (oldWpnId === 'gun' ? 1 : 0);
                                btn.innerText = `[${wpnName} (Lv.${lvl})] 버리고 교체`;

                                btn.onclick = (event) => {
                                    event.stopPropagation();

                                    // 무기 리스트 교체
                                    this.player.equippedWeapons = this.player.equippedWeapons.filter(w => w !== oldWpnId);
                                    this.player.equippedWeapons.push(data.id);

                                    if (oldWpnId !== 'gun') {
                                        this.player.weaponLevels[oldWpnId] = 0;
                                    }

                                    // 획득 등급에 비례한 레벨 부여
                                    let newLvl = 1;
                                    if (data.rarity === 'RARE') newLvl = 2;
                                    else if (data.rarity === 'EPIC') newLvl = 3;
                                    else if (data.rarity === 'LEGENDARY') newLvl = 4;
                                    this.player.weaponLevels[data.id] = newLvl;

                                    // 해금 상태 동적 반영
                                    if (data.id === 'spear') {
                                        this.player.weaponUnlocks.spear.tip = newLvl >= 2;
                                        this.player.weaponUnlocks.spear.range = newLvl >= 2;
                                        this.player.weaponUnlocks.spear.knockback = newLvl >= 3;
                                        this.player.weaponUnlocks.spear.wall = newLvl >= 4;
                                        this.player.weaponUnlocks.spear.multi = newLvl >= 5;
                                    } else if (data.id === 'whip') {
                                        this.player.weaponUnlocks.whip.haste = newLvl >= 2;
                                        this.player.weaponUnlocks.whip.range = newLvl >= 2;
                                        this.player.weaponUnlocks.whip.break = newLvl >= 3;
                                        this.player.weaponUnlocks.whip.shock = newLvl >= 4;
                                        this.player.weaponUnlocks.whip.multi = newLvl >= 5;
                                    }

                                    overlay.classList.add('hidden');
                                    replacePanel.classList.add('hidden');
                                    document.querySelector('.card-container').classList.remove('hidden');
                                    if (rActions) rActions.classList.remove('hidden');

                                    this.player.updateWeaponType();
                                    this.updateHUD();

                                    this.triggerPowerUpVisuals(data);
                                    this.completeRewardProgress(); // [신규] 큐 완료 후 포털 활성화 제어
                                    Sound.play('powerup');
                                };
                                slotsContainer.appendChild(btn);
                            });
                            return; // 카드 기본 적용 방지
                        }
                    }

                    overlay.classList.add('hidden');

                    // 오버레이 스타일 원상 복구 (초기화)
                    overlay.style.background = "";
                    overlay.style.boxShadow = "";

                    // 카드 획득 연출 즉시 진행 (지연 활성화 안 함, 상세 대형 모달은 생략)
                    this.visualsSuspended = false;
                    this.suspendedFloatingTexts = [];

                    // [수정] 확률 15% 소수점 올림 복리 감쇄 계산
                    let currentChance = this.player.luk;
                    for (let i = 0; i < this.extraDrawCount; i++) {
                        currentChance = currentChance - Math.ceil(currentChance * 0.15);
                    }
                    const extraChance = Math.max(0, currentChance / 100);
                    // 스탯 보상 여부 체크 (무기/장비 방, 보물상자, 5의배수방 보상 제외)
                    const isStatReward = (this.currentRoomType !== 'weapon' && this.currentRoomType !== 'equipment' && !isFromHiddenChest && (this.roomNum % 5 !== 0));
                    // 난수 roll 정의 추가
                    const roll = Math.random();
                    // 최대 카드 습득 개수 5개 제한 (최초 1회 + 추가 최대 4회) & 스탯 카드 보상일 때만 작동
                    const canExtraDraw = isStatReward && (roll < extraChance) && (this.extraDrawCount < 4);

                    // 카드 버프 적용 (추가 획득 기회가 있는 경우 포털 활성화를 일단 유예)
                    this.applyRewardCard(data, true, canExtraDraw);

                    // 플레이어 발밑 솟구침 파티클 연출 즉시 발동
                    this.triggerPowerUpVisuals(data);

                    if (canExtraDraw) {
                        this.extraDrawCount++;
                        const nextDrawNum = this.extraDrawCount;

                        // 다음 기회 확률 계산 (안내 텍스트 표시용)
                        let nextChance = this.player.luk;
                        for (let i = 0; i < nextDrawNum; i++) {
                            nextChance = nextChance - Math.ceil(nextChance * 0.15);
                        }
                        nextChance = Math.max(0, Math.ceil(nextChance)); // 올림 처리하여 깔끔하게 표시

                        // 단계별 화려한 전설 타이틀 설정
                        let floatText = `👑 스폰서 추가 후원 발동! (${nextDrawNum}/4) [다음 확률: ${nextChance}%]`;
                        let floatColor = '#39ff14'; // 1단계: 초록
                        if (nextDrawNum === 2) { floatText = `⚡ 팬덤의 관심 가속! (${nextDrawNum}/4) [다음 확률: ${nextChance}%] ⚡`; floatColor = '#ffdf00'; }
                        if (nextDrawNum === 3) { floatText = `🔮 스폰서의 주목 공명! (${nextDrawNum}/4) [다음 확률: ${nextChance}%] 🔮`; floatColor = '#00f0ff'; }
                        if (nextDrawNum === 4) { floatText = `👑 전설적 인기스타: 후원 폭발! (${nextDrawNum}/4) [다음 확률: ${nextChance}%] 👑`; floatColor = '#ff0055'; }

                        setTimeout(() => {
                            this.showFloatingText(floatText, this.player.x, this.player.y - 45, floatColor);

                            // 추가 획득 창 다시 노출
                            this.triggerRewardSelector(isFromHiddenChest, true);
                        }, 800);
                    } else {
                        // 추가 획득 종료 시 포털 활성화
                        this.completeRewardProgress(); // [신규] 큐 완료 후 포털 활성화 제어
                    }
                };
            });
        };

        // 렌더링 시작
        renderCards(cardsData);

        // [신규 기획] Luck Amulet 10레벨 초월: 보상 카드 방당 1회 무상 리롤 기회 개방
        const rerollBtn = document.getElementById('reroll-btn');
        if (rerollBtn) {
            if (this.player.equipLevels.necklace === 10 && !this.hasRerolledThisRoom) {
                rerollBtn.classList.remove('hidden');

                // 리롤 클릭 이벤트
                rerollBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.hasRerolledThisRoom = true;

                    // 리롤 성공 오디오
                    Sound.play('powerup');
                    this.showFloatingText("DESTINY RE-ROLLED!", this.player.x, this.player.y - 35, '#ffdf00');

                    cardsData = this.generateRewardCardsData(this.currentSpawnTotal, isFromHiddenChest, isSpecialReward);
                    renderCards(cardsData);

                    // 리롤 사용했으므로 버튼 소멸
                    rerollBtn.classList.add('hidden');
                };
            } else {
                rerollBtn.classList.add('hidden');
            }
        }
    }

    triggerBlueprintRewardSelection() {
        let available = Object.keys(window.PASSIVE_ITEMS).filter(id => !this.player.acquiredBlueprints.includes(id));

        if (available.length === 0) {
            this.showFloatingText("모든 설계도를 이미 획득했습니다! 🎉", this.player.x, this.player.y - 30, '#ffdf00');
            this.completeRewardProgress(); // [신규] 큐 완료 후 포털 활성화 제어
            return;
        }

        // 일시 정지 활성화
        this.isPaused = true;

        const overlay = document.getElementById('blueprint-overlay');
        const wrapper = document.getElementById('blueprint-cards-wrapper');
        if (overlay && wrapper) {
            overlay.classList.remove('hidden');
            wrapper.innerHTML = '';

            // LUK 비례 카드 선택지 수 계산: 기본 2개 + 행운 보정 (최대 4개)
            let extraOptions = Math.floor(Math.min(2, (this.player.luk - 1.0) * 1.5));
            let numOptions = Math.min(2 + extraOptions, available.length);

            // 무작위 셔플 후 numOptions만큼 선택
            let shuffled = [...available].sort(() => Math.random() - 0.5);
            let selectedIds = shuffled.slice(0, numOptions);

            const MATERIAL_NAMES = {
                short_rod: '짧은 막대기',
                long_rod: '긴 막대기',
                metal_plate: '넓은 판',
                blade: '칼날',
                wire: '전선',
                battery: '배터리',
                broken_flamethrower: '고장난 화염방사기',
                cryo_cooler: '과냉각기',
                sensor_lens: '광학 렌즈',
                nanite_jar: '나노머신 병',
                hydraulic_cylinder: '유압 실린더'
            };

            selectedIds.forEach((id, idx) => {
                const item = window.PASSIVE_ITEMS[id];
                const card = document.createElement('div');
                card.className = `reward-card card-${item.rarity.toLowerCase()}`;
                
                // 애니메이션 딜레이 설정
                card.style.animationDelay = `${0.1 + idx * 0.15}s`;

                card.innerHTML = `
                    <div class="card-glow"></div>
                    <div class="card-inner" style="transform: translate3d(0,0,0); backface-visibility: hidden; padding: 20px 14px;">
                        <span class="card-rarity ${item.rarity.toLowerCase()}">${item.rarity.toUpperCase()}</span>
                        <div class="card-icon" style="font-size: 2.2rem; margin: 10px 0;">📦</div>
                        <h3 class="card-title" style="font-size: 1.05rem; font-weight: 800; margin-bottom: 6px;">${item.name}</h3>
                        <p class="card-desc" style="font-size: 0.80rem; line-height: 1.45; color: #cbd5e1; text-align: center; margin-bottom: 10px; height: 68px; overflow-y: auto;">${item.desc}</p>
                        <div style="font-size: 0.70rem; color: #94a3b8; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 6px; width: 100%; text-align: center;">
                            필요 재료:<br>
                            ${Object.entries(item.materials).map(([mKey, mVal]) => `${MATERIAL_NAMES[mKey] || mKey} x${mVal}`).join(', ')}
                        </div>
                    </div>
                `;

                card.onclick = (e) => {
                    e.stopPropagation();
                    
                    // 설계도 저장 및 로컬스토리지 동기화
                    this.player.saveBlueprint(id);

                    // 화면 종료 처리
                    overlay.classList.add('hidden');
                    this.isPaused = false;

                    this.showFloatingText(`[${item.name}] 설계도 획득! 💾`, this.player.x, this.player.y - 30, '#ffdf00');
                    Sound.play('powerup');

                    // 문 개방
                    this.completeRewardProgress(); // [신규] 큐 완료 후 포털 활성화 제어
                };

                wrapper.appendChild(card);
            });
        }
    }

    // 몬스터 처치량 비례하여 등급 가중치 보정이 연동되는 랜덤 카드 데이터 3종 조각 생성
    generateRewardCardsData(monsterBonus, isFromHiddenChest = false, isSpecialReward = false) {
        // 기본 8대 캐릭터 스탯 보상 카드 풀
        const statusCards = [
            { id: 'atk', title: '힘 (ATK) 강화', icon: '⚔️', desc: '공격 피해량을 미세 증가시킵니다.' },
            { id: 'aspd', title: '지능 (SPD) 강화', icon: '⚡', desc: '탄환 연사 주기 및 칼 휘두르는 속도가 빨라집니다.' },
            { id: 'ms', title: '민첩 (MOV) 기동', icon: '🏃', desc: '이동 속도가 강화됩니다.' },
            { id: 'evd', title: '민첩 (EVD) 회피', icon: '🦅', desc: '몬스터 공격 회피율이 상승합니다.' },
            { id: 'hp', title: '체력 (HP) 증대', icon: '❤️', desc: '최대 체력을 늘리고, 현재 체력을 소량 치유합니다.' },
            { id: 'luk', title: '스타성 (CHA) 매혹', icon: '👑', desc: '검투사의 매력/스타성을 강화하여 더 가치 있는 스폰서 보상 카드가 등장할 확률을 영구 누적합니다. (최대 4.0까지 효과 부여)' },
            { id: 'stamina', title: '스테미너 증폭', icon: '🔋', desc: '달릴 수 있는 최대 활력이 확장됩니다.' },
            { id: 'hpRegen', title: '체력 재생 (REGEN)', icon: '🩺', desc: '초당 체력 회복 능력을 부여합니다.' },
            { id: 'range', title: '사거리 연장 (RNG)', icon: '🔭', desc: '탄환 사거리 및 검 베기 공격 반경을 연장시킵니다.' },
            { id: 'def', title: '방어 (DEF) 보강', icon: '🛡️', desc: '대미지 감소율을 결정짓는 방어력을 올립니다.' }
        ];

        // 무기 변화 및 투사체 궤적 상위 카드 풀
        const weaponCards = [
            { id: 'sword', title: '네온 검(Sword) 융합', icon: '🪓', desc: '주무기에 근접 베기 속성이 추가되어 검과 총 복합 액션이 발현됩니다.' },
            { id: 'spear', title: '네온 창(Spear) 장착', icon: '🔱', desc: '직선상의 깊숙한 관통 찌르기로 적을 멀리 밀치고 벽 격돌 기절을 유도합니다.' },
            { id: 'thorns', title: '네온 가시(Thorns) 장착', icon: '🌵', desc: '피격 대미지를 100% 주변 적에게 반사하고, 10% 확률로 보복 유도 가시를 쏘며, 피격 시 3초간 도발(가시 오라 장막) 필드를 활성화합니다.' },
            { id: 'whip', title: '네온 채찍(Whip) 장착', icon: '🧣', desc: '직선 그랩 사슬을 사출하여 적을 발앞으로 강제 견인하고, 1.5초 기절 및 3초 공속 +20% 상승(최대 3중첩) 버프를 부여합니다.' },
            { id: 'trap', title: '네온 함정(Trap) 설치', icon: '💣', desc: '이동 흔적상에 2초 주기로 80px 기절 지뢰를 매설하고, 가로/세로 벽 사이에 전류 감전 레이저 트립와이어를 설치합니다.' },
            { id: 'lightning', title: '네온 번개마법 (Lightning)', icon: '⚡', desc: '마나를 소모해 적들 사이를 연쇄 전이하며 단체 감전 기절을 주는 벼락을 발사합니다.' },
            { id: 'fire', title: '네온 불마법 (Fire)', icon: '🔥', desc: '마나(MP)를 소모해 지속적인 화상을 주며 5중첩 시 연쇄 폭발을 일으키는 불꽃을 격발합니다.' },
            { id: 'ice', title: '네온 얼음마법 (Ice)', icon: '❄️', desc: '마나(MP)를 소모해 적을 동결 정지시키며 동결된 적 타격 시 3배 파쇄 피해를 입칩니다.' },
            { id: 'scythe', title: '사이버 낫(Scythe) 장착', icon: '💀', desc: '전방에 큰 휩쓸기 궤적을 그리며 낫으로 벱니다. 맞은 적에게 부식 표식을 걸어 받는 피해를 영구히 늘립니다.' },
            { id: 'railcannon', title: '레일 캐논(Rail Cannon) 장착', icon: '📡', desc: '짧은 충전 후 적과 장애물을 모두 꿰뚫어 버리는 강력한 관통 레이저 빔을 격발합니다.' },
            { id: 'multishot', title: '멀티샷 (Multi-Shot)', icon: '🏹', desc: '한 번 사격 시 부채꼴 형태로 다중 탄환이 뿜어져 나갑니다.' },
            { id: 'burst', title: '점사 (Burst Fire)', icon: '🔫', desc: '마우스 조준 방향으로 다다닥 연속 탄환을 연사합니다.' },
            { id: 'pierce', title: '관통 탄환 (Pierce)', icon: '💎', desc: '탄환이 몬스터에 맞고 소멸하지 않고 관통 횟수를 획득합니다.' },
            { id: 'homing', title: '유도 추적탄 (Homing)', icon: '🔮', desc: '탄환이 주변에서 가장 가까운 적을 유성처럼 유도 비행합니다.' },
            { id: 'splash', title: '스플래시 탄 (Splash)', icon: '💥', desc: '탄환 명중 지점에 네온 대폭발을 발생시켜 다수의 적을 몰살합니다.' },
            { id: 'pet', title: '디펜더 펫 (PET) 동행', icon: '🤖', desc: '주위를 돌며 적 탄환을 막고 유도탄을 사격하는 디펜더 드론을 추가 소환합니다.' },
            { id: 'magic_timewarp', title: '시간 왜곡 마법 (Time Warp)', icon: '🔮', desc: '특수 마법을 마나 소모형 불릿타임 시간 왜곡으로 교체합니다.' },
            { id: 'wall_bounce', title: '네온 도탄 (Wall Bounce)', icon: '🧱', desc: '탄환이 벽이나 장애물에 충돌 시 튕겨 나와 다른 방향으로 계속 날아갑니다.' },
            { id: 'monster_bounce', title: '유도 튕기기 (Monster Bounce)', icon: '🔗', desc: '탄환이 적에 명중 시, 소멸하지 않고 주변의 가까운 적을 향해 전이 유도 도탄 튕김 타격합니다.' }
        ];

        // [신규 기획] 장비 10종 보상 카드 풀
        const equipmentCards = [
            { id: 'equip_armor', title: '최대체력 갑옷', icon: '🛡️', desc: '최대 HP를 강화합니다. (5레벨: 뎀감 20%, 10레벨: 사망 시 부활)' },
            { id: 'equip_boots', title: '최대스테미너 신발', icon: '🥾', desc: '최대 Stamina를 확장합니다. (5레벨: 대시 중 회피 15%, 10레벨: 무적 통과)' },
            { id: 'equip_gloves', title: '공격범위 장갑', icon: '🧤', desc: '공격 물리 사거리를 확장합니다. (5레벨: 크기 20% 업, 10레벨: 충격파 발사)' },
            { id: 'equip_helm', title: '최대마력 투구', icon: '🪖', desc: '최대 MP를 확장합니다. (5레벨: 20% 무료 스킬, 10레벨: MP 100% 시 공격력 25% 업)' },
            { id: 'equip_necklace', title: '스폰서쉽 목걸이', icon: '📿', desc: '검투사의 매력(CHA)을 올려 스폰서의 추가 연쇄 후원 드로우 및 지원금(리롤) 기회를 개방합니다.' },
            { id: 'equip_ring_mp', title: '마력회복 반지', icon: '💍', desc: '초당 마력 회복량을 강화합니다. (5레벨: 킬 시 마나 3% 환급, 10레벨: 특수기 유지비 50% 절감)' },
            { id: 'equip_ring_hp', title: '체력회복 반지', icon: '💍', desc: '초당 체력 회복량을 강화합니다. (5레벨: 포션 효율 50% 업, 10레벨: 비피격 5초 시 재생 3배)' },
            { id: 'equip_ring_speed', title: '이동속도 반지', icon: '💍', desc: '이동 속도를 올립니다. (5레벨: 달릴 때 공격력 10% 업, 10레벨: 초신성 기동)' },
            { id: 'equip_ring_aspd', title: '공격속도 반지', icon: '💍', desc: '공격/연사 속도를 올립니다. (5레벨: 캐스팅 프레임 15% 단축, 10레벨: 공속 상한 해제)' },
            { id: 'equip_ring_evd', title: '회피증가 반지', icon: '💍', desc: '회피 확률을 강화합니다. (5레벨: 회피 시 주변 기절 섬광, 10레벨: 회피 상한선 75% 확장)' },
            { id: 'equip_goggles', title: '차원 고글', icon: '🥽', desc: '비밀 균열 벽의 위치를 감지합니다. (5레벨: 비밀방 등장 확률 30%로 상승, 10레벨: 비밀 균열 벽 타격 시 1회만에 파괴)' }
        ];

        // 무기 장착/강화 카드와 투사체 강화 카드를 분리
        const pureWeaponIds = ['sword', 'spear', 'thorns', 'whip', 'trap', 'lightning', 'fire', 'ice', 'scythe', 'railcannon'];
        const pureWeaponCards = weaponCards.filter(c => pureWeaponIds.includes(c.id));
        const projectileUpgradeCards = weaponCards.filter(c => !pureWeaponIds.includes(c.id));

        // [신규 기획] 현재 방 유형(currentRoomType)에 맞춘 특화 보상 풀 배정
        let pool = [];
        const isBossRoom = (this.roomNum % 5 === 0);

        if (isFromHiddenChest) {
            // 보물상자는 장비와 투사체 카드 혼합 (무기 습득은 오직 제작/진화로 제한)
            pool = [...projectileUpgradeCards, ...equipmentCards];
        } else if (isBossRoom) {
            // 보스전 보상: 장비 및 투사체 카드 기본 포함
            pool = [...projectileUpgradeCards, ...equipmentCards];

            // 50% 확률(운 스탯 비례 보정)로 이미 보유 중인 무기의 강화 카드 노출
            let weaponChance = 0.50 + Math.min(0.20, (this.player.luk - 1.0) * 0.05);
            if (Math.random() < weaponChance) {
                // 플레이어가 소지(레벨 1 이상)하고 마스터하지 않은 무기의 레벨업 카드만 주입
                const activeWeaponUpgrades = pureWeaponCards.filter(card => {
                    const curLvl = this.player.weaponLevels[card.id] || 0;
                    return curLvl >= 1 && curLvl < 5;
                });
                pool.push(...activeWeaponUpgrades);

                // 보유 무기 강화 연계 시너지 카드 동적 해금 주입
                const p = this.player;
                if (p.weaponLevels.sword >= 1 && p.swordDmgUpgrade < 1.4) {
                    pool.push({ id: 'upgrade_sword', title: '[강화] 쾌검술 연마', icon: '🪓', desc: '검기 대미지를 +40% 상향하고 검기 도달 리치 반경을 +10px 연장시킵니다.' });
                }
                if (p.multishot >= 2 && p.multishotArc < 0.55) {
                    pool.push({ id: 'upgrade_multishot', title: '[강화] 샷건 전탄 연마', icon: '🏹', desc: '멀티샷의 탄환수를 추가로 +1발 더 늘리고, 부채꼴 퍼짐각을 대폭 넓힙니다.' });
                }
                if (this.pets.length >= 1 && p.petDmgUpgrade < 1.6) {
                    pool.push({ id: 'upgrade_pet', title: '[강화] 드론 오버로드', icon: '🤖', desc: '드론의 유도 레이저 대미지를 플레이어 힘(ATK) 스탯의 40% 비례로 크게 늘립니다.' });
                }
                if (p.splashRadius > 0 && p.splashDmgUpgrade < 0.9) {
                    pool.push({ id: 'upgrade_splash', title: '[강화] 연쇄 열화 폭발', icon: '💥', desc: '스플래시 대폭발 피해 비율을 90%로 대폭 상향하고 폭발 반경을 +15px 연장시킵니다.' });
                }
                if (p.homing && p.homingAngleSpeed < 0.13) {
                    pool.push({ id: 'upgrade_homing', title: '[강화] 초정밀 유도 궤적', icon: '🔮', desc: '유도탄의 선회 회전각을 60% 향상시켜 더욱 급속한 유도 추적이 가능해집니다.' });
                }
            }
        } else if (this.currentRoomType === 'weapon') {
            // 무기방은 이제 NPC 상인을 소환하므로 통상적으로 안 쓰이나, 치트나 예외 처리 방어용
            pool = [...projectileUpgradeCards];
        } else if (this.currentRoomType === 'equipment') {
            pool = [...equipmentCards];
        } else {
            // 기본 스탯 방: 캐릭터 스탯 카드 및 투사체 강화 카드
            pool = [...statusCards, ...projectileUpgradeCards];
        }

        // 3개의 유니크한 카드를 선별
        const chosenCards = [];
        const shuffled = pool.sort(() => 0.5 - Math.random());
        const cardsToSelect = Math.min(3, shuffled.length);

        // 보상 등급 보정 (몬스터 처치량 비례 가중치 + 운 스탯 계수 추가)
        let portalLuckBonus = 0;
        if (isFromHiddenChest) {
            portalLuckBonus = 0.9; // Epic, Legendary 확정 등급 보증
        } else if (isSpecialReward) {
            // 진입했던 포털 난이도 상/중/하에 따라 희귀도 고정 보정 대폭 차등화!
            if (this.lastEnteredPortalClass === 'high') portalLuckBonus = 0.9;      // Epic, Legendary 확정
            else if (this.lastEnteredPortalClass === 'mid') portalLuckBonus = 0.45;  // Rare, Epic 위주
            else portalLuckBonus = -0.15; // low 문으로 도망쳐 오면 Common, Rare 중심
        } else {
            // 일반 스탯 방은 몬스터 스폰 수와 플레이어 LUK 스탯 가중치 합산 (LUK 소프트 캡 최대 4.0 제한 적용)
            let cappedLuk = Math.min(4.0, this.player.luk);
            portalLuckBonus = monsterBonus * 0.02 + (cappedLuk - 1) * 0.12;
        }

        // [신규 기획] 행운 목걸이 10레벨 초월: 리롤 성공 시 최소 Rare 등급 확정 추첨 보장 보정치 추가
        if (this.player.equipLevels.necklace === 10 && this.hasRerolledThisRoom) {
            portalLuckBonus += 0.8;
        }

        for (let i = 0; i < cardsToSelect; i++) {
            let item = shuffled[i];

            // 등급 확률 주입
            let rand = Math.random() + portalLuckBonus; // 보정 상향
            let rarity = 'COMMON';
            let multiplier = 1.0;

            if (rand > 1.45) {
                rarity = 'LEGENDARY';
                multiplier = 3.2; // 3.8에서 3.2로 미세 하향 조율
            } else if (rand > 1.1) {
                rarity = 'EPIC';
                multiplier = 2.0; // 2.4에서 2.0으로 하향
            } else if (rand > 0.75) {
                rarity = 'RARE';
                multiplier = 1.4; // 1.6에서 1.4로 하향
            }

            // [시간 왜곡 레전더리 전용 처리] 
            // 만약 추첨된 카드가 시간 왜곡인데 등급이 레전더리가 아니라면, 레전더리가 아닌 일반 무기 카드로 즉시 교체
            if (item.id === 'magic_timewarp' && rarity !== 'LEGENDARY') {
                const fallbackPool = weaponCards.filter(w => w.id !== 'magic_timewarp');
                item = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
            }

            // 등급별 능력치 증가 수치 계산 바인딩
            let detail = this.getCardSpecificEffect(item.id, rarity, multiplier);

            chosenCards.push({
                id: item.id,
                title: `${rarity === 'COMMON' ? '' : '[' + rarity + '] '}${item.title}`,
                desc: detail.desc,
                rarity: rarity,
                icon: item.icon,
                effectValue: detail.value,
                effectData: detail.data
            });
        }

        return chosenCards;
    }

    // 각 카드 ID별 등급 기반 정밀 효과 할당
    getCardSpecificEffect(id, rarity, mult) {
        let value = 0;
        let desc = '';
        let data = null;

        switch (id) {
            case 'atk':
                value = Math.ceil(3.0 * mult); // 스탯 밸런스 상향 (1.5 -> 3.0)
                desc = `공격 피해량이 +${value} 만큼 영구히 상승합니다.`;
                break;
            case 'aspd':
                value = 0.08 * mult; // 종합 밸런스 패치 (기본 0.12에서 0.08로 하향)
                desc = `공격 연사 속도가 +${value.toFixed(2)}배 빨라집니다.`;
                break;
            case 'ms':
                value = 0.18 * mult; // 종합 밸런스 패치 (기본 0.25에서 0.18로 하향)
                desc = `플레이어 이동 속도가 +${value.toFixed(2)} 증가합니다.`;
                break;
            case 'evd':
                value = 0.015 * mult; // 종합 밸런스 패치 (기본 0.02에서 0.015로 하향)
                desc = `적 공격을 물리적으로 비껴낼 회피율이 +${(value * 100).toFixed(0)}% 보강됩니다.`;
                break;
            case 'def':
                value = Math.ceil(8 * mult);
                desc = `플레이어 방어력이 +${value} 만큼 영구 상승합니다. (피해 감소율 증가)`;
                break;
            case 'hp':
                value = Math.ceil(20 * mult); // 스탯 밸런스 상향 (10 -> 20)
                desc = `최대 체력이 +${value} 늘어나며 동시에 실시간 체력을 회복합니다.`;
                break;
            case 'luk':
                value = 0.10 * mult; // 종합 밸런스 패치 (기본 0.15에서 0.10으로 하향)
                desc = `검투사의 스타성/매력(CHA)이 +${value.toFixed(2)} 올라가 스폰서들이 더 귀한 보상을 주게 됩니다. (최대 4.0까지 효과 부여)`;
                break;
            case 'stamina':
                value = Math.ceil(10 * mult); // 종합 밸런스 패치 (기본 15에서 10으로 하향)
                desc = `최대 대시용 기력이 +${value}만큼 증가합니다.`;
                break;
            case 'sword': {
                let lvl = this.player.weaponLevels.sword || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `주무기에 광역 반원 베기 모션(검)을 영구 장착합니다. (복합 공격 가능) (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `검기 대미지가 +15% 상승하고 베기 물리 범위가 확장됩니다. (현재 레벨: ${lvl} -> ${nextLvl})` + (nextLvl === 5 ? " [5레벨: 검기 파동 발사]" : "");
                }
                break;
            }
            case 'spear': {
                let lvl = this.player.weaponLevels.spear || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `일직선 관통 찌르기(창)를 장착합니다. 벽 충돌 기절 및 창끝 2배 크리가 추가됩니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `창 찌르기 대미지가 +15% 상승하고 넉백 성능이 강화됩니다. (현재 레벨: ${lvl} -> ${nextLvl})` + (nextLvl === 5 ? " [5레벨: 3방향 창 찌르기]" : "");
                }
                break;
            }
            case 'whip': {
                let lvl = this.player.weaponLevels.whip || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `직선 그랩 사슬을 사출하여 적을 발앞으로 견인하고 기절 및 공속 버프를 부여합니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `채찍 대미지가 +15% 상승하고 그랩 후 공속 증가율이 강화됩니다. (현재 레벨: ${lvl} -> ${nextLvl})` + (nextLvl === 5 ? " [5레벨: 3방향 다중 채찍]" : "");
                }
                break;
            }
            case 'thorns': {
                let lvl = this.player.weaponLevels.thorns || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `피격 대미지를 100% 주변 적에게 반사하고 보복 가시를 쏘는 가시 보호막을 장착합니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `가시 반사 피해가 +20% 상승하고 피해 경감률이 추가로 보강됩니다. (현재 레벨: ${lvl} -> ${nextLvl})` + (nextLvl === 5 ? " [5레벨: 도발 가시 오라 장막]" : "");
                }
                break;
            }
            case 'trap': {
                let lvl = this.player.weaponLevels.trap || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `이동 경로 상에 기절 지뢰를 매설하는 능력을 획득합니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `지뢰 매설 주기가 단축되고 폭발 범위 및 기절 지속시간이 증가합니다. (현재 레벨: ${lvl} -> ${nextLvl})` + (nextLvl === 5 ? " [5레벨: 감전 레이저 트립와이어]" : "");
                }
                break;
            }
            case 'lightning': {
                let lvl = this.player.weaponLevels.lightning || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `마나(MP)를 소모해 적들 사이를 연쇄 전이하며 단체 감전 기절을 주는 벼락을 발사합니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `벼락 대미지가 +15% 상승하고 연쇄 벼락 전이 횟수가 +1회 증가합니다. (현재 레벨: ${lvl} -> ${nextLvl})`;
                }
                break;
            }
            case 'fire': {
                let lvl = this.player.weaponLevels.fire || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `마나(MP)를 소모해 지속적인 화상을 주며 5중첩 시 연쇄 폭발을 일으키는 화염탄을 발사합니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `화염탄 대미지가 +15% 상승하고 스플래시 폭발 반경이 늘어납니다. (현재 레벨: ${lvl} -> ${nextLvl})`;
                }
                break;
            }
            case 'ice': {
                let lvl = this.player.weaponLevels.ice || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `마나(MP)를 소모해 적을 감속시키며, 동결된 적 타격 시 3배의 깨짐 파쇄 피해를 입힙니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `빙결탄 대미지가 +15% 상승하고 빙결 게이지 축적율이 높아집니다. (현재 레벨: ${lvl} -> ${nextLvl})`;
                }
                break;
            }
            case 'scythe': {
                let lvl = this.player.weaponLevels.scythe || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `주무기에 광역 베기(낫)를 장착합니다. 적에게 피해 증폭 표식을 남깁니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `낫 베기 대미지가 +15% 상승하고 표식의 피해 배율이 추가 보강됩니다. (현재 레벨: ${lvl} -> ${nextLvl})`;
                }
                break;
            }
            case 'railcannon': {
                let lvl = this.player.weaponLevels.railcannon || 0;
                let nextLvl = Math.min(5, lvl + 1);
                if (lvl === 0) {
                    desc = `지형 관통 차징 빔(레일캐논)을 장착합니다. (현재 레벨: 0 -> 1)`;
                } else {
                    desc = `레일캐논 대미지가 +15% 상승하고 차징 시간이 단축됩니다. (현재 레벨: ${lvl} -> ${nextLvl})`;
                }
                break;
            }
            case 'multishot':
                // [3차 밸런싱] 추가 발사 탄환 수 최대 5발 ➔ 최대 2발로 축소 (Math.max(1, Math.floor(기존값 * 0.5)) 적용)
                value = Math.max(1, Math.floor(Math.ceil((rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 2 : 3)) * (mult >= 2.0 ? 1.5 : 1.0)) * 0.5));
                desc = `격발 탄환 부채꼴 발사수가 +${value}발 추가 장착됩니다.`;
                break;
            case 'burst':
                // [3차 밸런싱] 추가 점사 횟수 최대 5회 ➔ 최대 2회로 축소
                value = Math.max(1, Math.floor(Math.ceil((rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 2 : 3)) * (mult >= 2.0 ? 1.5 : 1.0)) * 0.5));
                desc = `클릭 한 번당 고속 연속 점사 횟수가 +${value}회 추가 축적됩니다.`;
                break;
            case 'pierce':
                // [3차 밸런싱] 추가 관통 횟수 최대 5회 ➔ 최대 2회로 축소
                value = Math.max(1, Math.floor(Math.ceil((rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 2 : 3)) * (mult >= 2.0 ? 1.5 : 1.0)) * 0.5));
                desc = `탄환이 몬스터를 뚫고 통과할 관통력이 +${value}회 상향됩니다.`;
                break;
            case 'homing':
                desc = `탄환이 자동 회전 탐색하여 근접 적을 유도 추적합니다.`;
                break;
            case 'splash':
                // [3차 밸런싱] 폭발 반경 기존 20 + (10 * mult) ➔ 10 + (5 * mult)로 축소
                value = Math.ceil(10 + (5 * mult));
                desc = `탄환 명중 시 반경 ${value}px 범위에 대폭발을 일으켜 광역 데미지를 입힙니다.`;
                break;
            case 'hpRegen':
                value = 0.3 * mult; // 종합 밸런스 패치 (기본 0.5에서 0.3으로 하향)
                desc = `초당 체력 자연 재생량이 +${value.toFixed(2)} 만큼 영구 증가합니다.`;
                break;
            case 'range':
                value = Math.ceil(30 * mult); // 종합 밸런스 패치 (기본 40에서 30으로 하향)
                desc = `탄환 사거리 및 검의 리치(베기 반경)가 +${value}px 만큼 영구 상승합니다.`;
                break;
            case 'pet':
                desc = `플레이어를 호위하며 적 탄환을 소멸시키고 유도 레이저를 사격하는 공전 드론을 추가 1기 소환합니다.`;
                break;
            case 'magic_timewarp':
                desc = `특수기를 마력 소모형 불릿타임 시간 왜곡으로 영구 교체합니다. 약 6초간 시간이 90% 느리게 흐릅니다.`;
                break;
            case 'wall_bounce':
                // [3차 밸런싱] 추가 도탄 횟수 기존 1/2/3/4회 ➔ 1/1/1/2회로 축소
                value = rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 1 : (rarity === 'EPIC' ? 1 : 2));
                desc = `탄환이 벽이나 격자 장애물에 충돌 시 튕겨 도탄하는 제한 횟수가 +${value}회 증가합니다.`;
                break;
            case 'monster_bounce':
                // [3차 밸런싱] 추가 튕김 횟수 기존 1/2/3/4회 ➔ 1/1/1/2회로 축소
                value = rarity === 'COMMON' ? 1 : (rarity === 'RARE' ? 1 : (rarity === 'EPIC' ? 1 : 2));
                desc = `탄환이 적에 명중했을 때 소멸하는 대신 다른 적으로 튕겨 유도 추격하는 연쇄 횟수가 +${value}회 증가합니다.`;
                break;
            case 'upgrade_sword':
                desc = `검기의 대미지 배율을 +20% 상향시키고, 검풍 리치 타격 반경을 +5px 영구 연장합니다.`;
                break;
            case 'upgrade_multishot':
                desc = `샷건 부채꼴 퍼짐 각도를 완만하게 정교화(0.50)하여 조준 시 퍼짐 궤적을 넓힙니다.`;
                break;
            case 'upgrade_pet':
                desc = `소환된 모든 호위 드론의 탄환 피해량을 플레이어 공격력(ATK) 스탯의 30% 비례로 과부하 강화합니다.`;
                break;
            case 'upgrade_splash':
                desc = `스플래시 대폭발의 피해 비율을 기존 70%에서 80%로 증폭하고 폭발 반경을 +8px 늘립니다.`;
                break;
            case 'upgrade_homing':
                desc = `유도탄의 실시간 조준 선회 각도를 30% 향상시켜, 적으로 향하는 궤적이 더 정교해집니다.`;
                break;
            case 'equip_armor':
                value = Math.ceil(8 * mult);
                desc = `최대 체력이 +${value} 상승합니다. (현재 레벨: ${this.player.equipLevels.armor} -> ${Math.min(10, this.player.equipLevels.armor + 1)})`;
                break;
            case 'equip_boots':
                value = Math.ceil(4 * mult);
                desc = `최대 스태미너가 +${value} 확장됩니다. (현재 레벨: ${this.player.equipLevels.boots} -> ${Math.min(10, this.player.equipLevels.boots + 1)})`;
                break;
            case 'equip_gloves':
                value = Math.ceil(8 * mult);
                desc = `공격 물리 사거리가 +${value}px 확장됩니다. (현재 레벨: ${this.player.equipLevels.gloves} -> ${Math.min(10, this.player.equipLevels.gloves + 1)})`;
                break;
            case 'equip_helm':
                value = Math.ceil(8 * mult);
                desc = `최대 마력(MP)이 +${value} 확장됩니다. (현재 레벨: ${this.player.equipLevels.helm} -> ${Math.min(10, this.player.equipLevels.helm + 1)})`;
                break;
            case 'equip_necklace':
                value = 0.05 * mult;
                desc = `검투사의 매력/스타성(CHA)이 +${value.toFixed(2)} 영구 상승합니다. (현재 레벨: ${this.player.equipLevels.necklace} -> ${Math.min(10, this.player.equipLevels.necklace + 1)})`;
                break;
            case 'equip_ring_mp':
                value = 0.3 * mult;
                desc = `초당 마력 회복량이 +${value.toFixed(2)}/s 강화됩니다. (현재 레벨: ${this.player.equipLevels.ring_mp} -> ${Math.min(10, this.player.equipLevels.ring_mp + 1)})`;
                break;
            case 'equip_ring_hp':
                value = 0.15 * mult;
                desc = `초당 체력 회복량이 +${value.toFixed(2)}/s 강화됩니다. (현재 레벨: ${this.player.equipLevels.ring_hp} -> ${Math.min(10, this.player.equipLevels.ring_hp + 1)})`;
                break;
            case 'equip_ring_speed':
                value = 0.015 * mult;
                desc = `이동 속도가 +${(value * 100).toFixed(1)}% 상승합니다. (현재 레벨: ${this.player.equipLevels.ring_speed} -> ${Math.min(10, this.player.equipLevels.ring_speed + 1)})`;
                break;
            case 'equip_ring_aspd':
                value = 0.02 * mult;
                desc = `공격/연사 속도가 +${(value * 100).toFixed(1)}% 빨라집니다. (현재 레벨: ${this.player.equipLevels.ring_aspd} -> ${Math.min(10, this.player.equipLevels.ring_aspd + 1)})`;
                break;
            case 'equip_ring_evd':
                value = 0.01 * mult;
                desc = `피격 물리 회피율이 +${(value * 100).toFixed(0)}% 보강됩니다. (현재 레벨: ${this.player.equipLevels.ring_evd} -> ${Math.min(10, this.player.equipLevels.ring_evd + 1)})`;
                break;
            case 'equip_goggles':
                value = 0;
                desc = `비밀방을 감지하는 능력이 활성화/강화됩니다. (현재 레벨: ${this.player.equipLevels.goggles} -> ${Math.min(10, this.player.equipLevels.goggles + 1)})`;
                break;
        }

        return { value, desc, data };
    }

    // 선택된 보상 카드 효과 플레이어 스탯에 누적 주입
    applyRewardCard(card, skipVisuals = false, skipPortalActive = false) {
        const p = this.player;

        switch (card.id) {
            case 'atk':
                p.atk += card.effectValue;
                break;
            case 'aspd':
                p.aspd += card.effectValue;
                break;
            case 'ms':
                p.ms += card.effectValue;
                break;
            case 'evd':
                // [수정] Evasion Ring 10레벨 초월 시 회피 캡 75%, 그 외에는 60% 수렴 캡 동적 적용
                let maxEvdLimit = p.equipLevels.ring_evd === 10 ? 0.75 : 0.6;
                p.evd = p.evd + card.effectValue * (maxEvdLimit - p.evd);
                break;
            case 'def':
                p.def += card.effectValue;
                break;
            case 'hp':
                p.maxHp += card.effectValue;
                p.hp = Math.min(p.maxHp, p.hp + card.effectValue * 1.5); // 치료 제공
                break;
            case 'luk':
                p.luk += card.effectValue;
                break;
            case 'stamina':
                p.maxStamina += card.effectValue;
                p.stamina = p.maxStamina;
                break;
            case 'sword':
                if (!p.equippedWeapons.includes('sword')) p.equippedWeapons.push('sword');
                p.weaponLevels.sword = Math.min(5, (p.weaponLevels.sword || 0) + 1);
                if (p.weaponLevels.sword === 5) {
                    this.showFloatingText("🪓 SWORD MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#b026ff');
                } else if (p.weaponLevels.sword > 1) {
                    this.showFloatingText(`🪓 SWORD UPGRADED! (Lv.${p.weaponLevels.sword}) 🪓`, p.x, p.y - 30, '#b026ff');
                } else {
                    this.showFloatingText("SWORD UNLOCKED 🪓", p.x, p.y - 30, '#b026ff');
                }
                p.updateWeaponType();
                break;
            case 'spear':
                if (!p.equippedWeapons.includes('spear')) p.equippedWeapons.push('spear');
                p.weaponLevels.spear = Math.min(5, (p.weaponLevels.spear || 0) + 1);
                if (p.weaponLevels.spear === 2) {
                    p.weaponUnlocks.spear.tip = true;
                    p.weaponUnlocks.spear.range = true;
                    this.showFloatingText("SPEAR EVOLVE: CRITICAL & RANGE UP! 🎯📏", p.x, p.y - 30, '#00f0ff');
                } else if (p.weaponLevels.spear === 3) {
                    p.weaponUnlocks.spear.knockback = true;
                    this.showFloatingText("SPEAR EVOLVE: HEAVY KNOCKBACK! 🛡️", p.x, p.y - 30, '#00f0ff');
                } else if (p.weaponLevels.spear === 4) {
                    p.weaponUnlocks.spear.wall = true;
                    this.showFloatingText("SPEAR EVOLVE: WALL CRASH! 💥", p.x, p.y - 30, '#00f0ff');
                } else if (p.weaponLevels.spear === 5) {
                    p.weaponUnlocks.spear.multi = true;
                    this.showFloatingText("👑 SPEAR MASTERED: TRIPLE STRIKE! 🔱🔱🔱", p.x, p.y - 30, '#00f0ff');
                } else {
                    this.showFloatingText("SPEAR UNLOCKED 🔱", p.x, p.y - 30, '#00f0ff');
                }
                p.updateWeaponType();
                break;
            case 'thorns':
                if (!p.equippedWeapons.includes('thorns')) p.equippedWeapons.push('thorns');
                p.weaponLevels.thorns = Math.min(5, (p.weaponLevels.thorns || 0) + 1);
                if (p.weaponLevels.thorns === 5) {
                    this.showFloatingText("🌵 THORNS MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#ff00aa');
                } else if (p.weaponLevels.thorns > 1) {
                    this.showFloatingText(`🌵 THORNS UPGRADED! (Lv.${p.weaponLevels.thorns}) 🌵`, p.x, p.y - 30, '#ff00aa');
                } else {
                    this.showFloatingText("THORNS UNLOCKED 🌵", p.x, p.y - 30, '#ff00aa');
                }
                break;
            case 'whip':
                if (!p.equippedWeapons.includes('whip')) p.equippedWeapons.push('whip');
                p.weaponLevels.whip = Math.min(5, (p.weaponLevels.whip || 0) + 1);
                if (p.weaponLevels.whip === 2) {
                    p.weaponUnlocks.whip.haste = true;
                    p.weaponUnlocks.whip.range = true;
                    this.showFloatingText("WHIP EVOLVE: HASTE & RANGE UP! ⚡📏", p.x, p.y - 30, '#ff00aa');
                } else if (p.weaponLevels.whip === 3) {
                    p.weaponUnlocks.whip.break = true;
                    this.showFloatingText("WHIP EVOLVE: VULNERABILITY! 💔", p.x, p.y - 30, '#ff00aa');
                } else if (p.weaponLevels.whip === 4) {
                    p.weaponUnlocks.whip.shock = true;
                    this.showFloatingText("WHIP EVOLVE: SHOCK SPLASH! 💥", p.x, p.y - 30, '#ff00aa');
                } else if (p.weaponLevels.whip === 5) {
                    p.weaponUnlocks.whip.multi = true;
                    this.showFloatingText("👑 WHIP MASTERED: MULTI SLASH! 🧣🧣🧣", p.x, p.y - 30, '#ff00aa');
                } else {
                    this.showFloatingText("WHIP UNLOCKED 🧣", p.x, p.y - 30, '#ff00aa');
                }
                p.updateWeaponType();
                break;
            case 'trap':
                if (!p.equippedWeapons.includes('trap')) p.equippedWeapons.push('trap');
                p.weaponLevels.trap = Math.min(5, (p.weaponLevels.trap || 0) + 1);
                if (p.weaponLevels.trap === 5) {
                    this.showFloatingText("💣 TRAPS MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#ffdf00');
                } else if (p.weaponLevels.trap > 1) {
                    this.showFloatingText(`💣 TRAPS UPGRADED! (Lv.${p.weaponLevels.trap}) 💣`, p.x, p.y - 30, '#ffdf00');
                } else {
                    this.showFloatingText("TRAPS UNLOCKED 💣", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'lightning':
                if (!p.equippedWeapons.includes('lightning')) p.equippedWeapons.push('lightning');
                p.weaponLevels.lightning = Math.min(5, (p.weaponLevels.lightning || 0) + 1);
                if (p.weaponLevels.lightning === 5) {
                    this.showFloatingText("⚡ LIGHTNING MAGIC MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#ffdf00');
                } else {
                    this.showFloatingText(`⚡ LIGHTNING MAGIC UPGRADED! (Lv.${p.weaponLevels.lightning}) ⚡`, p.x, p.y - 30, '#ffdf00');
                }
                p.updateWeaponType();
                break;
            case 'fire':
                if (!p.equippedWeapons.includes('fire')) p.equippedWeapons.push('fire');
                if (p.weaponType === 'supercritical_plasma_fusion') {
                    p.iceFireProjectilesStack++;
                    this.showFloatingText("EVOLUTION UPGRADE: +2 PROJ! 🌀", p.x, p.y - 30, '#ff5e00');
                    Sound.play('powerup');
                } else {
                    p.weaponLevels.fire = Math.min(5, (p.weaponLevels.fire || 0) + 1);
                    if (p.weaponLevels.fire === 5) {
                        this.showFloatingText("🔥 FIRE MAGIC MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#ff5e00');
                    } else {
                        this.showFloatingText(`🔥 FIRE MAGIC UPGRADED! (Lv.${p.weaponLevels.fire}) 🔥`, p.x, p.y - 30, '#ff5e00');
                    }
                    p.updateWeaponType();
                }
                break;
            case 'ice':
                if (!p.equippedWeapons.includes('ice')) p.equippedWeapons.push('ice');
                if (p.weaponType === 'supercritical_plasma_fusion') {
                    p.iceFireProjectilesStack++;
                    this.showFloatingText("EVOLUTION UPGRADE: +2 PROJ! 🌀", p.x, p.y - 30, '#00f0ff');
                    Sound.play('powerup');
                } else {
                    p.weaponLevels.ice = Math.min(5, (p.weaponLevels.ice || 0) + 1);
                    if (p.weaponLevels.ice === 5) {
                        this.showFloatingText("❄️ ICE MAGIC MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#00f0ff');
                    } else {
                        this.showFloatingText(`❄️ ICE MAGIC UPGRADED! (Lv.${p.weaponLevels.ice}) ❄️`, p.x, p.y - 30, '#00f0ff');
                    }
                    p.updateWeaponType();
                }
                break;
            case 'scythe':
                if (!p.equippedWeapons.includes('scythe')) p.equippedWeapons.push('scythe');
                p.weaponLevels.scythe = Math.min(5, (p.weaponLevels.scythe || 0) + 1);
                if (p.weaponLevels.scythe === 5) {
                    this.showFloatingText("💀 SCYTHE MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#ba55d3');
                } else if (p.weaponLevels.scythe > 1) {
                    this.showFloatingText(`💀 SCYTHE UPGRADED! (Lv.${p.weaponLevels.scythe}) 💀`, p.x, p.y - 30, '#ba55d3');
                } else {
                    this.showFloatingText("REAPER SCYTHE UNLOCKED 💀", p.x, p.y - 30, '#ba55d3');
                }
                p.updateWeaponType();
                break;
            case 'railcannon':
                if (!p.equippedWeapons.includes('railcannon')) p.equippedWeapons.push('railcannon');
                p.weaponLevels.railcannon = Math.min(5, (p.weaponLevels.railcannon || 0) + 1);
                if (p.weaponLevels.railcannon === 5) {
                    this.showFloatingText("📡 RAIL CANNON MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#00f0ff');
                } else if (p.weaponLevels.railcannon > 1) {
                    this.showFloatingText(`📡 RAIL CANNON UPGRADED! (Lv.${p.weaponLevels.railcannon}) 📡`, p.x, p.y - 30, '#00f0ff');
                } else {
                    this.showFloatingText("RAIL CANNON UNLOCKED 📡", p.x, p.y - 30, '#00f0ff');
                }
                p.updateWeaponType();
                break;
            case 'multishot':
                p.multishot = Math.min(16, p.multishot + card.effectValue);
                p.updateWeaponType();
                break;
            case 'burst':
                p.burstCount = Math.min(10, p.burstCount + card.effectValue);
                p.updateWeaponType();
                break;
            case 'pierce':
                p.pierceCount += card.effectValue;
                p.updateWeaponType();
                break;
            case 'homing':
                p.homing = true;
                p.updateWeaponType();
                break;
            case 'splash':
                p.splashRadius = Math.max(p.splashRadius, card.effectValue);
                p.updateWeaponType();
                break;
            case 'hpRegen':
                p.hpRegen += card.effectValue;
                break;
            case 'range':
                p.range += card.effectValue;
                break;
            case 'pet':
                // 디펜더 드론 소환 (3기 단위로 궤적을 120도씩 비틀고 궤도 층 확장)
                let petAngle = this.pets.length * (Math.PI * 2 / 3);
                let orbitRadius = 45 + Math.floor(this.pets.length / 3) * 15;
                this.pets.push(new Pet(petAngle, orbitRadius));
                break;
            case 'magic_timewarp':
                // [추가] 특수 마법 기술을 시간 왜곡으로 변경
                p.magicType = 'timeWarp';
                this.showFloatingText("TIME WARP UNLOCKED", p.x, p.y - 30, '#b026ff');
                break;
            case 'wall_bounce':
                p.wallBounceLimit += card.effectValue;
                this.showFloatingText(`WALL BOUNCE +${card.effectValue} 🧱`, p.x, p.y - 30, '#00f0ff');
                break;
            case 'monster_bounce':
                p.monsterBounceLimit += card.effectValue;
                this.showFloatingText(`MONSTER BOUNCE +${card.effectValue} 🔗`, p.x, p.y - 30, '#ff00aa');
                break;
            case 'upgrade_sword':
                // [강화] 검기 대미지 계수 +20% (1.0 -> 1.2) 및 리치 확장 (+5px)
                p.swordDmgUpgrade = 1.2;
                p.range += 5;
                this.showFloatingText("SWORD UPGRADED (DMG +20%)", p.x, p.y - 30, '#b026ff');
                break;
            case 'upgrade_multishot':
                // [강화] 샷건 전탄 연마: 추가 탄환 제거, 퍼짐각을 0.50으로 완만하게 상승
                p.multishotArc = 0.50;
                this.showFloatingText("SHOTGUN HONE (ARC REFINED)", p.x, p.y - 30, '#b026ff');
                break;
            case 'upgrade_pet':
                // [강화] 드론 레이저 비례 대미지 상향 (1.0 -> 1.3)
                p.petDmgUpgrade = 1.3;
                this.showFloatingText("DRONE OVERLOADED (DMG +30%)", p.x, p.y - 30, '#39ff14');
                break;
            case 'upgrade_splash':
                // [강화] 스플래시 연쇄 폭발 비율 상향 (0.7 -> 0.8) 및 폭발반경 +8px
                p.splashDmgUpgrade = 0.8;
                p.splashRadius += 8;
                this.showFloatingText("SPLASH CATACLYSM (DMG 80%)", p.x, p.y - 30, '#ff0055');
                break;
            case 'upgrade_homing':
                // [강화] 유도탄 회전 각도 30% 향상 (0.08 -> 0.10 선회율)
                p.homingAngleSpeed = 0.10;
                this.showFloatingText("HOMING PRECISION (STEERING UP)", p.x, p.y - 30, '#00f0ff');
                break;
            case 'equip_armor':
                p.equipLevels.armor = Math.min(10, p.equipLevels.armor + 1);
                p.maxHp += card.effectValue;
                p.hp = Math.min(p.maxHp, p.hp + card.effectValue);
                if (p.equipLevels.armor === 5) {
                    this.showFloatingText("ARMOR LV.5: STEEL WILL (20% DMG REDUCTION UNLOCKED)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.armor === 10) {
                    this.showFloatingText("ARMOR MAX: GUARDIAN RESURRECTION ACTIVE", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_boots':
                p.equipLevels.boots = Math.min(10, p.equipLevels.boots + 1);
                p.maxStamina += card.effectValue;
                p.stamina = p.maxStamina;
                if (p.equipLevels.boots === 5) {
                    this.showFloatingText("BOOTS LV.5: FEATHER DASH (+15% EVD DASH)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.boots === 10) {
                    this.showFloatingText("BOOTS MAX: INVISIBLE TELEPORT DASH UNLOCKED", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_gloves':
                p.equipLevels.gloves = Math.min(10, p.equipLevels.gloves + 1);
                p.range += card.effectValue;
                if (p.equipLevels.gloves === 5) {
                    this.showFloatingText("GLOVES LV.5: OVERSIZED REACH (+20% SIZE)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.gloves === 10) {
                    this.showFloatingText("GLOVES MAX: SHOCKWAVE EMISSION UNLOCKED", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_helm':
                p.equipLevels.helm = Math.min(10, p.equipLevels.helm + 1);
                p.maxMp += card.effectValue;
                if (p.equipLevels.helm === 5) {
                    this.showFloatingText("HELM LV.5: MANA REFLOW (20% FREE CAST)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.helm === 10) {
                    this.showFloatingText("HELM MAX: WISDOM (+25% DMG AT 100% MP)", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_necklace':
                p.equipLevels.necklace = Math.min(10, p.equipLevels.necklace + 1);
                p.luk += card.effectValue;
                if (p.equipLevels.necklace === 5) {
                    this.showFloatingText("LUCK LV.5: GOLDEN ROAD (2X ELITE)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.necklace === 10) {
                    this.showFloatingText("LUCK MAX: RE-ROLL DESTINY UNLOCKED", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_mp':
                p.equipLevels.ring_mp = Math.min(10, p.equipLevels.ring_mp + 1);
                p.mpRegen = (p.mpRegen || 0) + card.effectValue;
                if (p.equipLevels.ring_mp === 5) {
                    this.showFloatingText("MANA RING LV.5: ENERGY CYCLE (+3% MP ON KILL)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_mp === 10) {
                    this.showFloatingText("MANA RING MAX: INFINITE CIRCLE (50% MP CUT)", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_hp':
                p.equipLevels.ring_hp = Math.min(10, p.equipLevels.ring_hp + 1);
                p.hpRegen += card.effectValue;
                if (p.equipLevels.ring_hp === 5) {
                    this.showFloatingText("HP RING LV.5: LIFE BURST (+50% POTION EFF)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_hp === 10) {
                    this.showFloatingText("HP RING MAX: AUTO REPAIR (3X REGEN UNLOCKED)", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_speed':
                p.equipLevels.ring_speed = Math.min(10, p.equipLevels.ring_speed + 1);
                p.ms += card.effectValue * p.ms;
                if (p.equipLevels.ring_speed === 5) {
                    this.showFloatingText("SPEED RING LV.5: WIND SCAR (+10% MOVEMENT DMG)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_speed === 10) {
                    this.showFloatingText("SPEED RING MAX: HYPER SPEED MOTOR UNLOCKED", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_aspd':
                p.equipLevels.ring_aspd = Math.min(10, p.equipLevels.ring_aspd + 1);
                p.aspd += card.effectValue;
                if (p.equipLevels.ring_aspd === 5) {
                    this.showFloatingText("ASPD RING LV.5: FAST SPELL (15% MOTION SPEED)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_aspd === 10) {
                    this.showFloatingText("ASPD RING MAX: OVERLIMIT INFINITE HASTE ACTIVE", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_ring_evd':
                p.equipLevels.ring_evd = Math.min(10, p.equipLevels.ring_evd + 1);
                let currentLimit = p.equipLevels.ring_evd === 10 ? 0.75 : 0.6;
                p.evd = p.evd + card.effectValue * (currentLimit - p.evd); // 복리식 한계 효용 수렴 적용
                if (p.equipLevels.ring_evd === 5) {
                    this.showFloatingText("EVD RING LV.5: PHANTOM FLASH (DODGE -> STUN)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.ring_evd === 10) {
                    this.showFloatingText("EVD RING MAX: GHOST WALKER (75% MAX EVD)", p.x, p.y - 30, '#ffdf00');
                }
                break;
            case 'equip_goggles':
                p.equipLevels.goggles = Math.min(10, p.equipLevels.goggles + 1);
                if (p.equipLevels.goggles === 1) {
                    this.showFloatingText("GOGGLES LV.1: DIMENSION DETECTOR ACTIVE 🥽", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.goggles === 5) {
                    this.showFloatingText("GOGGLES LV.5: PORTAL RESONANCE (SECRET ROOM PROBABILITY 30%)", p.x, p.y - 30, '#ff5e00');
                } else if (p.equipLevels.goggles === 10) {
                    this.showFloatingText("GOGGLES MAX: DIMENSION BREAKER (1-HIT BREAK UNLOCKED)", p.x, p.y - 30, '#ffdf00');
                }
                break;
        }

        // [신규 기획] 상자를 열어서 보상 카드 3택1 결정을 완수했으므로, 워프 포털을 활성화하여 진행을 뚫어줍니다!
        if (!skipPortalActive) {
            this.portals.forEach(p => p.active = true);
        }

        // HUD 및 사운드 발생
        this.updateHUD();
        if (!skipVisuals) {
            Sound.play('powerup');
        }
    }

    // --------------------------------------------------------------------------
    // 10. 엔드 게임 상태 트리거 (게임오버 / 클리어)
    // --------------------------------------------------------------------------
    triggerGameOver() {
        if (this.gameOverActive) return; // 중복 호출 원천 방지
        this.gameOverActive = true;
        this.clearSavedGame();

        Sound.stopBGM(); // [추가] 사망 시 은은하게 돌던 Synth BGM 루프 즉시 종료
        Sound.play('gameover');
        this.shakeScreen(60, 7); // 강렬한 카메라 사망 흔들림 진동 주입

        // 플레이어 캐릭터 사망 시 사방으로 폭사하며 터져 나가는 붉은 네온 파편 파티클 25개 생성
        for (let k = 0; k < 25; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 5 + 2.5; // 사방 폭사 퍼짐 속도
            let life = Math.random() * 45 + 30; // 0.5초 ~ 1.2초 생존
            this.particles.push(new Particle(
                this.player.x, this.player.y,
                '#ff0055', 2.8,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                life, 'spark'
            ));
        }

        this.showFloatingText("FATAL DAMAGE! ☠️", this.player.x, this.player.y - 45, '#ff0055');

        // [결함 완치] 사망 파티클과 화면 진동이 매끄럽게 흐른 뒤 1.2초 후(1200ms) 자연스럽게 결과 대시보드가 오버랩되게 지연 처리
        setTimeout(() => {
            this.isPlaying = false; // 연출 완료 시점에 루프 정지 지정

            document.getElementById('result-title').innerText = "GAME OVER";
            document.getElementById('result-title').className = "text-glow-red";
            document.getElementById('result-message').innerText = "깊고 어두운 미로 속에서 힘이 다해 쓰러졌습니다...";

            this.populateResultOverlay();
            this.gameOverActive = false; // 플래그 초기화
        }, 1200);
    }

    triggerGameClear() {
        // [v0.95] 100층/101층 돌파 최종 대성공 극상 연출 (무지개 파편 은하수 및 3연속 victory 팡파르)
        if (this.gameClearActive) return;
        this.gameClearActive = true;
        this.clearSavedGame();

        const isTrueEnding = (this.roomNum === 101);

        // 청아한 승리 3연음 아르페지오 팡파르 재생
        Sound.play('victory');
        setTimeout(() => Sound.play('victory'), 600);
        setTimeout(() => Sound.play('victory'), 1200);

        // 100개의 찬란한 은하수 네온 파티클 사방 폭사 물리 (진 엔딩일 시 마젠타/시안 색조 위주 글리치 스타일)
        const rainbowColors = isTrueEnding
            ? ['#ff00ff', '#00ffff', '#d900ff', '#00f0ff', '#ff00aa', '#00ffd5']
            : ['#ff0055', '#00f0ff', '#b026ff', '#39ff14', '#ffdf00', '#ff5e00'];

        for (let i = 0; i < 100; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 8 + 3; // 폭발적 기하 속도
            let color = rainbowColors[i % rainbowColors.length];
            let size = Math.random() * 3 + 2;
            let life = Math.random() * 120 + 60; // 1~3초 유지
            this.particles.push(new Particle(
                this.mapWidth / 2, this.mapHeight / 2, // 캔버스 중앙
                color, size,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                life, 'spark'
            ));
        }

        // 화면 극대 대진동
        this.shakeScreen(90, 8);

        // 1.5초간 화려한 축제 연출이 가동된 뒤, 대화창 연출을 재생하고 그 완료 시점에 통계 오버레이를 열고 루프 정지
        setTimeout(() => {
            if (isTrueEnding) {
                // 진 엔딩 대화 상자 재생
                const dialogueLines = [
                    "최종 연산 코어 '크로노스 리얼 마스터' 파괴 확인.",
                    "서브시스템 동기화가 중단되었으며, 콜로세움 코어 엔진의 제어권이 탈환되었습니다.",
                    "경고: 가상 경계벽 붕괴 진행 중... 모든 갇힌 기억들이 현실의 세계로 방류됩니다.",
                    "축하합니다. 당신은 거짓된 루프를 끊어내고 진짜 세계의 해방을 쟁취하였습니다!"
                ];
                this.showDialogue("SYSTEM", dialogueLines, () => {
                    this.isPlaying = false;

                    const titleEl = document.getElementById('result-title');
                    const msgEl = document.getElementById('result-message');
                    const boxEl = document.querySelector('.result-box');

                    if (titleEl) {
                        titleEl.innerText = "TRUE LIBERATION!";
                        titleEl.className = "text-glow-magenta";
                    }
                    if (msgEl) {
                        msgEl.innerText = "진정한 지배자를 격파하고, 시스템의 거짓된 굴레에서 완전히 벗어났습니다!";
                    }
                    if (boxEl) {
                        boxEl.style.borderColor = '#ff00aa';
                        boxEl.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 45px rgba(255, 0, 170, 0.65)';
                    }

                    this.populateResultOverlay();
                });
            } else {
                // 노멀 엔딩 대화 상자 재생
                const dialogueLines = [
                    "차원 탈출 포털이 가동되었습니다. 물리적 형체가 네온 콜로세움에서 이탈합니다...",
                    "경고: 잔류 기억의 완전한 포맷 프로세스가 시작됩니다.",
                    "기억은 말끔히 포맷되었습니다. 당신은 다시 1층에서 깨어나 이 굴레를 반복할 것입니다..."
                ];
                this.showDialogue("SYSTEM", dialogueLines, () => {
                    this.isPlaying = false;

                    const titleEl = document.getElementById('result-title');
                    const msgEl = document.getElementById('result-message');
                    const boxEl = document.querySelector('.result-box');

                    if (titleEl) {
                        titleEl.innerText = "NORMAL ENDING";
                        titleEl.className = "text-glow-blue";
                    }
                    if (msgEl) {
                        msgEl.innerText = "네온 콜로세움을 탈출했지만 기억은 소멸되었고, 루프는 재시작됩니다.";
                    }
                    if (boxEl) {
                        boxEl.style.borderColor = '#00f0ff';
                        boxEl.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 240, 255, 0.35)';
                    }

                    this.populateResultOverlay();
                });
            }
        }, 1500);
    }

    // 모달창 최종 통계 수치 기입
    populateResultOverlay() {
        // [신규] 결과 오버레이 진입 시 스토리 대화창 숨김 처리
        const storyOverlay = document.getElementById('story-dialogue-overlay');
        if (storyOverlay) {
            storyOverlay.classList.add('hidden');
        }

        // 이번 판에서 획득한 기억의 조각 계산 및 가산
        let maxRoomLimit = this.roomNum >= 101 ? 101 : 100;
        let gainedFragments = Math.floor(Math.min(maxRoomLimit, this.roomNum) * 0.1 + this.score * 0.0005);
        if (this.roomNum === 101) {
            gainedFragments += 10; // 진 엔딩 기념 보너스 조각
        }
        this.addMemoryFragments(gainedFragments);

        document.getElementById('res-room').innerText = `${this.roomNum} / ${maxRoomLimit}`;
        document.getElementById('res-score').innerText = this.score;
        document.getElementById('res-kills').innerText = this.kills;
        document.getElementById('res-gained-fragments').innerText = gainedFragments;
        document.getElementById('res-unused-fragments').innerText = this.unusedFragments;

        let wpnStr = "맨몸 (안드로이드)";
        const wNames = {
            energy_ball: "에너지 볼 (Energy Ball)",
            crude_sword: "조잡한 진동검 (Crude)", plasma_saber: "플라즈마 세이버 (Advanced)",
            crude_spear: "조잡한 창 (Crude)", energy_pilebunker: "에너지 파일벙커 (Advanced)",
            crude_whip: "조잡한 채찍 (Crude)", nano_laser_wire: "나노 레이저 와이어 (Advanced)",
            crude_shock: "조잡한 전기 충격기 (Crude)", chain_emp_shock: "체인 EMP 쇼크 (Advanced)",
            crude_flamethrower: "조잡한 화염방사기 (Crude)", fusion_plasma_cannon: "퓨전 플라즈마 캐논 (Advanced)",
            crude_cryo: "조잡한 냉각총 (Crude)", cryo_freezer: "크라이오 프리저 (Advanced)",
            crude_thorns: "조잡한 가시갑옷 (Crude)", gravity_singularity_field: "중력 특이점 필드 (Advanced)",
            crude_trap: "조잡한 덫 (Crude)", proximity_cyber_mine: "프록시미티 사이버 마인 (Advanced)",
            crude_scythe: "조잡한 낫 (Crude)", void_destroyer: "보이드 디스트로이어 (Advanced)",
            crude_rail: "조잡한 레일건 (Crude)", tachyon_railgun: "태키온 레일건 (Advanced)"
        };
        if (wNames[this.player.weaponType]) {
            wpnStr = wNames[this.player.weaponType];
        } 
        document.getElementById('res-wpn').innerText = wpnStr;

        // [신규] 랭킹 등록 영역 상태 초기화
        const rankSubmitArea = document.getElementById('rank-submit-area');
        const nicknameInput = document.getElementById('rank-nickname');
        const submitBtn = document.getElementById('submit-rank-btn');
        const feedbackMsg = document.getElementById('rank-feedback-msg');

        if (rankSubmitArea && nicknameInput && submitBtn && feedbackMsg) {
            // 원래 바로 드러나던 랭킹 등록창을 2단계로 숨김 처리 (기본 hidden 부여)
            rankSubmitArea.classList.add('hidden');
            nicknameInput.value = "";
            nicknameInput.disabled = false;
            submitBtn.disabled = false;
            feedbackMsg.classList.add('hidden');
            feedbackMsg.innerText = "";
            feedbackMsg.className = "rank-feedback-text hidden";
        }

        // 최종 습득 장비 현황 그리드 바인딩
        const resultGrid = document.getElementById('result-equipments-grid');
        if (resultGrid) {
            resultGrid.innerHTML = '';

            // 1. 활성화된 무기 6종 탐색
            const wpns = [
                { key: 'sword', name: '네온 검', icon: '⚔️' },
                { key: 'spear', name: '네온 창', icon: '🔱' },
                { key: 'whip', name: '네온 채찍', icon: '🧣' },
                { key: 'lightning', name: '번개마법', icon: '⚡' },
                { key: 'fire', name: '불마법', icon: '🔥' },
                { key: 'ice', name: '얼음마법', icon: '❄' }
            ];
            let wpnCount = 0;
            wpns.forEach(w => {
                const lvl = (this.player && this.player.weaponLevels) ? (this.player.weaponLevels[w.key] || 0) : 0;
                if (lvl > 0) {
                    wpnCount++;
                    const card = document.createElement('div');
                    card.className = lvl >= 5 ? 'status-card active-weapon master' : 'status-card active-weapon';
                    card.innerHTML = `
                        <span class="icon">${w.icon}</span>
                        <div class="info">
                            <span class="name">${w.name}</span>
                            <span class="level">Lv.${lvl} ${this.buildLevelIndicator(lvl, 5)}</span>
                        </div>
                    `;
                    resultGrid.appendChild(card);
                }
            });

            // 만약 아무 무기도 활성화 안 되어 있다면 기본 총기 추가
            if (wpnCount === 0) {
                const card = document.createElement('div');
                card.className = 'status-card active-weapon';
                card.innerHTML = `
                    <span class="icon">🔫</span>
                    <div class="info">
                        <span class="name">기본 총기</span>
                        <span class="level">기본 장착</span>
                    </div>
                `;
                resultGrid.appendChild(card);
            }

            // 2. 활성화된 보조 장비 10종 탐색
            const equips = [
                { key: 'armor', name: '방어 갑옷', icon: '🛡️' },
                { key: 'boots', name: '신속 부츠', icon: '🥾' },
                { key: 'gloves', name: '공격 장갑', icon: '🧤' },
                { key: 'helm', name: '지혜 투구', icon: '🪖' },
                { key: 'necklace', name: '행운 목걸이', icon: '📿' },
                { key: 'ring_mp', name: '마력 반지', icon: '💍' },
                { key: 'ring_hp', name: '생명 반지', icon: '💍' },
                { key: 'ring_speed', name: '신속 반지', icon: '💍' },
                { key: 'ring_aspd', name: '공속 반지', icon: '💍' },
                { key: 'ring_evd', name: '회피 반지', icon: '💍' },
                { key: 'goggles', name: '차원 고글', icon: '🥽' }
            ];
            equips.forEach(eq => {
                const lvl = (this.player && this.player.equipLevels) ? (this.player.equipLevels[eq.key] || 0) : 0;
                if (lvl > 0) {
                    const card = document.createElement('div');
                    card.className = lvl >= 10 ? 'status-card active-equip master' : 'status-card active-equip';
                    card.innerHTML = `
                        <span class="icon">${eq.icon}</span>
                        <div class="info">
                            <span class="name">${eq.name}</span>
                            <span class="level">Lv.${lvl} ${this.buildLevelIndicator(lvl, 10)}</span>
                        </div>
                    `;
                    resultGrid.appendChild(card);
                }
            });
        }

        document.getElementById('result-overlay').classList.remove('hidden');
    }

    // [신규] 명예의 전당 랭킹 등록 비동기 처리 (고도화 및 피드백 통합 완료)
    async submitRanking() {
        const nicknameInput = document.getElementById('rank-nickname');
        const submitBtn = document.getElementById('submit-rank-btn');
        const feedbackMsg = document.getElementById('rank-feedback-msg');

        if (!nicknameInput || !submitBtn || !feedbackMsg) return;

        const name = nicknameInput.value.trim().toUpperCase();

        // 입력 박스 보더 색상 초기화
        nicknameInput.style.borderColor = 'rgba(0, 240, 255, 0.4)';

        // 유효성 체크
        if (!name || name === "") {
            Sound.play('hit');
            feedbackMsg.innerText = "⚠️ 닉네임을 입력해 주세요!";
            feedbackMsg.style.color = '#ff0055';
            feedbackMsg.classList.remove('hidden');
            nicknameInput.style.borderColor = '#ff0055';
            return;
        }

        const nameRegex = /^[A-Z0-9]+$/;
        if (!nameRegex.test(name)) {
            Sound.play('hit');
            feedbackMsg.innerText = "⚠️ 영문 대문자와 숫자 조합(공백 없음)만 가능합니다!";
            feedbackMsg.style.color = '#ff0055';
            feedbackMsg.classList.remove('hidden');
            nicknameInput.style.borderColor = '#ff0055';
            return;
        }

        if (name.length < 2 || name.length > 10) {
            Sound.play('hit');
            feedbackMsg.innerText = "⚠️ 닉네임은 2자 이상 10자 이하로 해주세요!";
            feedbackMsg.style.color = '#ff0055';
            feedbackMsg.classList.remove('hidden');
            nicknameInput.style.borderColor = '#ff0055';
            return;
        }

        // 제출 중 비활성화 처리 (더블클릭 방지)
        nicknameInput.disabled = true;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';

        feedbackMsg.innerText = "⚡ 네온 서버 통신 전송 중...";
        feedbackMsg.style.color = '#00f0ff';
        feedbackMsg.classList.remove('hidden');

        try {
            // 플레이어가 착용 중인 최종 주무기 8종 한글 세부 정보 매핑
            let wpnStr = "총 (Gun)";
            const currentWpn = this.player.weaponType;
            if (currentWpn === 'sword') wpnStr = "검 (Sword)";
            else if (currentWpn === 'dual') wpnStr = "검 + 총 (Hybrid)";
            else if (currentWpn === 'spear') wpnStr = "창 (Spear)";
            else if (currentWpn === 'whip') wpnStr = "채찍 (Whip)";
            else if (currentWpn === 'lightning') wpnStr = "번개마법 (Lightning)";
            else if (currentWpn === 'fire') wpnStr = "불마법 (Fire)";
            else if (currentWpn === 'ice') wpnStr = "얼음마법 (Ice)";
            else if (currentWpn === 'supercritical_plasma_fusion') wpnStr = "플라즈마 초융합 (Evo-초월)";

            const result = await window.RankSystem.addRankRecord(
                name,
                this.score,
                this.roomNum,
                this.kills,
                wpnStr
            );

            if (result.success) {
                Sound.play('powerup');

                if (result.mode === 'online') {
                    feedbackMsg.innerText = "🏆 명예의 전당 온라인 실시간 동기화 등록 성공!";
                    feedbackMsg.style.color = '#39ff14';
                } else if (result.mode === 'fallback') {
                    feedbackMsg.innerText = "🔌 네트워크 대기: 로컬 저장소에 우선 세이프 임시 등록되었습니다!";
                    feedbackMsg.style.color = '#ffdf00';
                } else {
                    feedbackMsg.innerText = "💾 로컬 랭킹 세이브 보관 완료!";
                    feedbackMsg.style.color = '#39ff14';
                }

                // 1.2초 뒤에 랭킹 창을 자연스럽게 띄우고 등록 폼을 숨김 처리하여 자신의 기록을 확인하게 함
                setTimeout(() => {
                    document.getElementById('rank-submit-area').classList.add('hidden');
                    this.showLeaderboard(true);
                }, 1200);
            }
        } catch (error) {
            console.error(error);
            Sound.play('hit');
            feedbackMsg.innerText = "❌ 등록 에러: " + (error.message || '알 수 없는 서버 에러');
            feedbackMsg.style.color = '#ff0055';
            nicknameInput.style.borderColor = '#ff0055';

            nicknameInput.disabled = false;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    }

    // [신규] 리더보드 모달 열기 및 실시간 렌더링 (로컬 랭킹 포함 여부 인수 보완)
    async showLeaderboard(includeLocal = true) {
        const overlay = document.getElementById('ranking-modal-overlay');
        const loading = document.getElementById('ranking-loading');
        const empty = document.getElementById('ranking-empty');
        const table = document.getElementById('ranking-table');
        const tbody = document.getElementById('ranking-table-body');

        if (!overlay || !loading || !empty || !table || !tbody) return;

        // 모달 표시 및 초기 상태 지정
        overlay.classList.remove('hidden');
        loading.classList.remove('hidden');
        empty.classList.add('hidden');
        table.classList.add('hidden');
        tbody.innerHTML = "";

        // 필터 버튼들의 UI 상태 동기화 (all: 로컬 포함, online: 온라인만)
        const filterBtns = document.querySelectorAll('.rank-filter-btn');
        filterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter') === (includeLocal ? 'all' : 'online')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        try {
            // 전역 랭킹 시스템에서 Top 10 정보 로드
            const rankings = await window.RankSystem.getTopRankings(10, includeLocal);

            if (rankings.length === 0) {
                loading.classList.add('hidden');
                empty.classList.remove('hidden');
            } else {
                rankings.forEach((rank, index) => {
                    const tr = document.createElement('tr');
                    const rankNum = index + 1;

                    // 1, 2, 3위에 따라 특수 글로우 및 행 스타일 지정
                    if (rankNum === 1) {
                        tr.className = "rank-row-1";
                    } else if (rankNum === 2) {
                        tr.className = "rank-row-2";
                    } else if (rankNum === 3) {
                        tr.className = "rank-row-3";
                    }

                    // 순위 뱃지 설정
                    let rankBadge = `${rankNum}위`;
                    if (rankNum === 1) rankBadge = `<span class="rank-badge badge-1">🏆 1위</span>`;
                    else if (rankNum === 2) rankBadge = `<span class="rank-badge badge-2">🥈 2위</span>`;
                    else if (rankNum === 3) rankBadge = `<span class="rank-badge badge-3">🥉 3위</span>`;

                    // 로컬 임시 데이터 표시용 뱃지
                    const localBadgeHtml = rank.isLocalTemp ? `<span class="local-temp-badge">로컬 랭킹</span>` : "";

                    tr.innerHTML = `
                        <td style="padding: 12px 5px; font-weight: 800;">${rankBadge}</td>
                        <td style="padding: 12px 5px; font-weight: 700; color: #fff;">${rank.name}${localBadgeHtml}</td>
                        <td style="padding: 12px 5px; font-weight: 800; font-family: monospace; font-size: 1rem;">${rank.score.toLocaleString()}</td>
                        <td style="padding: 12px 5px;">${rank.room} / 100</td>
                        <td style="padding: 12px 5px; color: #ff0055; font-weight: 600;">💀 ${rank.kills}</td>
                        <td style="padding: 12px 5px; color: #a0aec0; font-size: 0.8rem;">${rank.date}</td>
                    `;
                    tbody.appendChild(tr);
                });

                loading.classList.add('hidden');
                table.classList.remove('hidden');
            }
        } catch (error) {
            console.error("랭킹 목록 로드 에러:", error);
            loading.classList.add('hidden');
            empty.innerHTML = `<p style="color: #ff0055;">⚠️ 명예의 전당 조회 오류<br>${error.message}</p>`;
            empty.classList.remove('hidden');
        }
    }

    // [신규] 리더보드 모달 닫기
    hideLeaderboard() {
        const overlay = document.getElementById('ranking-modal-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    // [신규] 방 레벨(층) 및 방 타입에 따른 가변 맵 테마 정보 반환
    getSectorTheme(roomNum, roomType) {
        return this.mapEngine.getSectorTheme(roomNum, roomType);
    }

    // --------------------------------------------------------------------------
    // 11. HTML5 Canvas 커스텀 네온 렌더러
    // --------------------------------------------------------------------------
    render() {
        this.ctx.save();

        // 화면 진동(Screen Shake) 효과 번역
        if (this.shakeTimer > 0) {
            let dx = (Math.random() * 2 - 1) * this.shakeIntensity;
            let dy = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
            this.shakeTimer--;

            // [최적화] 진동 강도 매 프레임 자연스럽게 감쇄 (다단히트 시 가드 락 완화 및 부드러운 감쇄 연출)
            this.shakeIntensity *= 0.9;

            // [최적화] 진동 타이머 종료 시 강도를 0으로 명확히 초기화하여 이전 대진동의 잔재를 제거
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
            }
        }

        const theme = this.getSectorTheme(this.roomNum, this.currentRoomType);

        // 배경 페인팅 (어두운 던전 분위기 및 옅은 리프레시 흔적 트레일 연출)
        this.ctx.fillStyle = theme.bgColor;
        this.ctx.fillRect(0, 0, this.mapWidth, this.mapHeight);

        // [시각 효과] 시간 왜곡 작동 시 배경을 은은한 보랏빛 장막으로 덮음
        if (this.timeDilationActive) {
            this.ctx.fillStyle = 'rgba(176, 38, 255, 0.08)';
            this.ctx.fillRect(0, 0, this.mapWidth, this.mapHeight);
        }

        // 방 벽 테두리 네온 사각형 그리기 (50px wallMargin 경계선에 정렬)
        this.ctx.beginPath();
        this.ctx.rect(48, 48, this.mapWidth - 96, this.mapHeight - 96);
        let borderOuterStroke = theme.outerBorder;
        if (this.roomNum === 101) {
            borderOuterStroke = `rgba(255, 0, 255, ${0.15 + Math.random() * 0.15})`;
        } else if (this.timeDilationActive) {
            borderOuterStroke = 'rgba(176, 38, 255, 0.15)';
        }
        this.ctx.strokeStyle = borderOuterStroke;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.rect(50, 50, this.mapWidth - 100, this.mapHeight - 100);
        this.ctx.fillStyle = theme.innerBgColor;
        this.ctx.fill();

        // 시간 왜곡 시 벽 테두리가 보랏빛 네온으로 맥박치며 번쩍임
        // 101층(에러 섹터)일 경우 마젠타 글리치 효과 연출
        let wallStrokeColor = theme.innerBorder;
        if (this.roomNum === 101) {
            const glitchOffset = (Math.random() < 0.25) ? (Math.random() * 6 - 3) : 0;
            const alpha = 0.4 + Math.random() * 0.5;
            wallStrokeColor = `rgba(255, 0, 255, ${alpha})`;

            // 101층 마젠타 글리치 보조 라인 렌더링
            if (Math.random() < 0.3) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.rect(48 + glitchOffset, 48 + glitchOffset, this.mapWidth - 96, this.mapHeight - 96);
                this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
                this.ctx.restore();
            }
        } else if (this.timeDilationActive) {
            wallStrokeColor = `rgba(176, 38, 255, ${0.35 + Math.sin(Date.now() * 0.007) * 0.15})`;
        }
        this.ctx.strokeStyle = wallStrokeColor;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 1. 네온 격자무늬 백그라운드 디자인 드로잉 (그리드 타일 크기 50px에 동기화)
        this.ctx.strokeStyle = theme.gridColor;
        this.ctx.lineWidth = 1;
        for (let x = 50; x < this.mapWidth - 50; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 50);
            this.ctx.lineTo(x, this.mapHeight - 50);
            this.ctx.stroke();
        }
        for (let y = 50; y < this.mapHeight - 50; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(50, y);
            this.ctx.lineTo(this.mapWidth - 50, y);
            this.ctx.stroke();
        }

        // 충전소 렌더링 (안전한 예외 처리 적용 및 드로잉 보장)
        try {
            if (this.chargingStations && Array.isArray(this.chargingStations)) {
                this.chargingStations.forEach(cs => {
                    if (cs && typeof cs.x === 'number' && typeof cs.y === 'number') {
                        this.drawChargingStation(this.ctx, cs);
                    }
                });
            }
        } catch (e) {
            console.warn("충전소 그리기 중 에러가 발생했으나 다른 요소를 계속 렌더링합니다:", e);
        }

        // [복구] 유실되었던 격자 장애물(NeonTileWall) 렌더링
        if (this.obstacles && Array.isArray(this.obstacles)) {
            this.obstacles.forEach(obs => {
                if (obs && typeof obs.draw === 'function') obs.draw(this.ctx);
            });
        }

        // [W-08 신규 구현] 드롭된 네온 코인 렌더링
        this.coinsList.forEach(coin => coin.draw(this.ctx));

        // 드롭된 부품 재료 렌더링
        this.materialsList.forEach(mat => mat.draw(this.ctx));

        // [신규 기획] 보상 상자 및 자판기 렌더링
        this.rewardChests.forEach(chest => chest.draw(this.ctx));
        this.blueprintChests.forEach(chest => chest.draw(this.ctx));
        this.vendingMachines.forEach(vm => vm.draw(this.ctx));

        // [네온 암시장] 비밀 자판기 렌더링 (보라빛 차원 아우라)
        this.secretVendingMachines.forEach(svm => svm.draw(this.ctx));

        // [신규 기획] 무기 상인 NPC 렌더링
        this.weaponMerchants.forEach(wm => wm.draw(this.ctx));

        // [W-10 함정설치 함정 렌더링]
        this.traps.forEach(trap => trap.draw(this.ctx));

        // [Phase 7 신규 구현] 비밀 균열 벽 렌더링
        this.secretWalls.forEach(wall => wall.draw(this.ctx));

        // [Phase 7 신규 구현] 비밀방 상호작용 디바이스 렌더링
        this.secretGlitchDevices.forEach(device => device.draw(this.ctx));

        // [복구] 유실되었던 문(Room Portal) 렌더링
        if (this.portals && Array.isArray(this.portals)) {
            this.portals.forEach(p => {
                if (p && typeof p.draw === 'function') p.draw(this.ctx);
            });
        }

        // [복구] 유실되었던 몬스터 렌더링
        if (this.monsters && Array.isArray(this.monsters)) {
            this.monsters.forEach(m => {
                if (m && typeof m.draw === 'function') m.draw(this.ctx);
            });
        }

        // [복구] 유실되었던 투사체(탄환) 렌더링
        if (this.bullets && Array.isArray(this.bullets)) {
            this.bullets.forEach(b => {
                if (b && typeof b.draw === 'function') b.draw(this.ctx);
            });
        }

        // [복구] 유실되었던 파티클 이펙트 렌더링
        if (this.particles && Array.isArray(this.particles)) {
            this.particles.forEach(p => {
                if (p && typeof p.draw === 'function') p.draw(this.ctx);
            });
        }

        // 6. 플레이어 렌더링
        this.player.draw(this.ctx);

        // [3차 피드백] 몬스터가 스폰되는 전투 상황 시 상단 중앙에 스폰 방식 타입 HUD 렌더링
        if (this.monsters.length > 0 || this.spawnQueue.length > 0) {
            this.ctx.save();
            this.ctx.font = '800 11px "Outfit"';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 8;

            let methodStr = "SPAWN TYPE: NORMAL (CONTINUOUS)";
            let methodColor = '#00f0ff';
            if (this.spawnMethod === 2) {
                methodStr = "SPAWN TYPE: DELAYED (10 MONSTERS -> 2S BREAK)";
                methodColor = '#ffdf00';
            } else if (this.spawnMethod === 3) {
                methodStr = "SPAWN TYPE: WAVE (10 MONSTERS -> CLEAR TO SPAWN)";
                methodColor = '#b026ff';
            }

            this.ctx.fillStyle = methodColor;
            this.ctx.shadowColor = methodColor;
            this.ctx.fillText(methodStr, this.mapWidth / 2, 75);
            this.ctx.restore();
        }

        // [비전투 휴식방 안내 텍스트] 첫 방이나 몬스터가 전부 끝났을 때 안내 팝업
        if (this.monsters.length === 0 && this.spawnQueue.length === 0) {
            this.ctx.save();
            this.ctx.font = '600 14px "Outfit"'; // 시인성 개선을 위해 14px로 소폭 상향
            this.ctx.fillStyle = '#39ff14';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#39ff14';

            // [결함 완치] Y좌표를 275에서 중앙 오브젝트와 절대 겹치지 않는 상단 공간인 130으로 상향 보정!
            if (this.roomNum === 1 && this.kills === 0) {
                this.ctx.fillText("방의 문(포털)을 통과하여 다음 방으로 전진하세요! (문 위 숫자는 몬스터 수 & 획득 점수)", this.mapWidth / 2, 130);
            } else if (this.inSecretRoom) {
                this.ctx.fillText("🔮 글리치 보너스 틈새 방에 도달했습니다. 중앙의 장치를 조작하여 보상을 확인하세요.", this.mapWidth / 2, 130);
            } else {
                this.ctx.fillText("방 소탕 완료! 원하는 문으로 들어가서 탈출을 향해 전진하세요.", this.mapWidth / 2, 130);
            }
            this.ctx.restore();
        }

        // [v0.95 신규 구현] 보스 경보 발동 시 화면 테두리 섹터 테마 네온 경보 및 경고 텍스트 & 글리치 연출
        if (this.bossWarningTimer > 0) {
            this.ctx.save();

            // 0.5초(30프레임) 주기 명멸 알파값 연산 (0.25 <-> 0.8)
            let warningAlpha = (Math.floor(this.bossWarningTimer / 15) % 2 === 0) ? 0.8 : 0.25;

            // 현재 방 번호와 테마에 맞는 컬러 추출
            const theme = this.getSectorTheme(this.roomNum, this.currentRoomType);
            let rawColor = theme.innerBorder || 'rgba(255, 0, 85, 0.4)';

            // rgba 형태로 정의된 색상 문자열의 알파값 치환
            let strokeColor = rawColor.replace(/[^,]+(?=\s*\)$)/, ` ${warningAlpha}`);
            let shadowColor = rawColor.replace(/[^,]+(?=\s*\)$)/, ` 1`);

            // 화면 외벽에 두꺼운 8px 네온 섹터 테마 사각형 렌더링
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 8;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = shadowColor;
            this.ctx.strokeRect(4, 4, this.mapWidth - 8, this.mapHeight - 8);

            // 화면 중앙에 거대한 WARNING 네온 섹터 테마 경고 텍스트
            this.ctx.font = '900 36px "Outfit"';
            this.ctx.fillStyle = strokeColor;
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = shadowColor;
            this.ctx.fillText("WARNING! BOSS ENCOUNTER 🚨", this.mapWidth / 2, 240);

            this.ctx.restore();

            // [추가] 화면 찢어짐(Glitch Screen Tear) 왜곡 필터 렌더링 (경보 중 무작위 찢어짐 효과)
            if (Math.random() < 0.25) {
                let glitchLines = Math.floor(Math.random() * 3) + 1; // 1~3개의 글리치 라인
                for (let g = 0; g < glitchLines; g++) {
                    let sliceY = Math.random() * this.mapHeight;
                    let sliceH = Math.random() * 40 + 10; // 10~50px 높이
                    let offset = (Math.random() - 0.5) * 24; // -12 ~ 12px 좌우 슬라이드
                    this.ctx.drawImage(
                        this.canvas,
                        0, sliceY, this.mapWidth, sliceH,
                        offset, sliceY, this.mapWidth, sliceH
                    );
                }
            }
        }

        // [신규] 보스 출현 시 상단 중앙 보스 전용 네온 HP HUD 렌더러
        let activeBosses = this.monsters.filter(m => (m.isBoss || m.type.startsWith('boss_')) && m.hp > 0 && !m.dead);
        if (activeBosses.length > 0) {
            this.ctx.save();

            let currentHpSum = activeBosses.reduce((sum, b) => sum + Math.max(0, b.hp), 0);
            let maxHpSum = activeBosses.reduce((sum, b) => sum + b.maxHp, 0);
            let hpPct = Math.max(0, currentHpSum / maxHpSum);

            let shieldHpSum = activeBosses.reduce((sum, b) => sum + (b.shieldHp || 0), 0);
            let maxShieldHpSum = activeBosses.reduce((sum, b) => sum + (b.maxShieldHp || 0), 0);
            let shieldPct = maxShieldHpSum > 0 ? Math.max(0, shieldHpSum / maxShieldHpSum) : 0;

            // 1. 보스명 결정 한글 헬퍼
            const getBossKoreanName = (type) => {
                if (type === 'boss') return "네온 센티넬 (Neon Sentinel)";
                if (type === 'boss_chaser') return "하이퍼 체이서 (Hyper Chaser)";
                if (type === 'boss_slime') return "마더 슬라임 (Mother Slime)";
                if (type === 'boss_slime_mini') return "미니 슬라임 (Mini Slime)";
                if (type === 'boss_speaker') return "둠 스피커 (Doom Speaker)";
                if (type === 'boss_warper') return "보이드 워퍼 (Void Warper)";
                if (type === 'boss_portal') return "차원 차단기 (Portal Overlord)";
                if (type === 'boss_portal_spawner') return "차원 소환 포털 (Portal Spawner)";
                if (type === 'boss_hive') return "나노 하이브 (Nano Hive)";
                if (type === 'boss_hive_healer') return "나노 보조 힐러 (Nano Healer)";
                if (type === 'boss_chaos') {
                    let firstChaos = activeBosses.find(b => b.type === 'boss_chaos');
                    let el = firstChaos ? firstChaos.element : 'fire';
                    let elStr = el === 'fire' ? "화염" : (el === 'lightning' ? "번개" : "냉기");
                    return `카오스 코어 [${elStr} 속성] (Chaos Core)`;
                }
                if (type === 'boss_final') return "최종 수문장: 마더보드 크로노스 (Chronos)";
                if (type === 'boss_final_turret') return "실드 발전기 포탑 (Shield Turret)";
                return "수호자 (Guardian)";
            };

            // 대표 보스명 표기
            let bossNameStr = getBossKoreanName(activeBosses[0].type);
            if (this.roomNum === 50) {
                bossNameStr = "삼위일체 게이트 (Trinity Gate Bosses)";
            } else if (this.roomNum === 90) {
                bossNameStr = `웨이브 ${this.bossWave}/4 - ${bossNameStr}`;
            }

            // HUD 바 위치: 너비 400, 높이 15, x좌표 동적 중앙 정렬
            const bw = 400, bh = 14;
            const bx = (this.mapWidth - bw) / 2;
            const by = 48;

            // 보스 체력바 뒷배경 어두운 네온 컨테이너
            this.ctx.fillStyle = 'rgba(10, 5, 5, 0.7)';
            this.ctx.fillRect(bx, by, bw, bh);

            this.ctx.strokeStyle = 'rgba(255, 0, 85, 0.3)';
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(bx, by, bw, bh);

            // 보스 체력바 붉은 네온 그라데이션 게이지
            if (hpPct > 0) {
                let hpGrd = this.ctx.createLinearGradient(bx, by, bx + bw, by);
                hpGrd.addColorStop(0, '#ff0055');
                hpGrd.addColorStop(1, '#ff3300');
                this.ctx.fillStyle = hpGrd;
                this.ctx.fillRect(bx + 1, by + 1, (bw - 2) * hpPct, bh - 2);
            }

            // 쉴드가 있으면 체력바 위에 얇은 하늘색 바 추가
            if (shieldPct > 0) {
                this.ctx.fillStyle = '#00f0ff';
                this.ctx.fillRect(bx + 1, by + 1, (bw - 2) * shieldPct, 3);
            }

            // 네온 글로우 효과 외곽선
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#ff0055';
            this.ctx.strokeStyle = '#ff0055';
            this.ctx.lineWidth = 1.0;
            this.ctx.strokeRect(bx, by, bw, bh);

            // 보스 텍스트 정보 렌더링
            this.ctx.shadowBlur = 8;
            this.ctx.font = '800 11px "Outfit"';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(bossNameStr, this.mapWidth / 2, by - 6);

            // 보스 수치 정보 (HP / MAX HP)
            this.ctx.font = '600 10px "Outfit"';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            let hpText = `${Math.ceil(currentHpSum)} / ${maxHpSum}`;
            if (shieldHpSum > 0) {
                hpText += ` (🛡️ ${Math.ceil(shieldHpSum)})`;
            }
            this.ctx.fillText(hpText, this.mapWidth / 2, by + bh - 3);

            this.ctx.restore();
        }

        this.ctx.restore();
    }

    // [수정] 결함 2: 보상 획득 시 대형 카드 획득 정보 팝업 노출 및 아무데나 클릭 시 복귀
    showAcquiredCardDetail(cardData) {
        const detailOverlay = document.getElementById('card-detail-overlay');
        const cardView = document.getElementById('detail-card-view');
        const rarityTag = document.getElementById('detail-card-rarity');
        const iconDiv = document.getElementById('detail-card-icon');
        const titleH3 = document.getElementById('detail-card-title');
        const descP = document.getElementById('detail-card-desc');

        rarityTag.className = `card-rarity ${cardData.rarity.toLowerCase()}`;
        rarityTag.innerText = cardData.rarity;

        iconDiv.innerText = cardData.icon;
        titleH3.innerText = cardData.title;
        descP.innerText = cardData.desc;

        // 등급별 네온 글로우 쉐도우 색상 설정
        let glowColor = 'rgba(0, 240, 255, 0.3)';
        if (cardData.rarity === 'RARE') glowColor = 'rgba(57, 255, 20, 0.4)';
        if (cardData.rarity === 'EPIC') glowColor = 'rgba(176, 38, 255, 0.4)';
        if (cardData.rarity === 'LEGENDARY') glowColor = 'rgba(255, 223, 0, 0.5)';

        cardView.style.setProperty('--card-shadow', `0 0 35px ${glowColor}`);
        cardView.className = `reward-card large-card card-${cardData.rarity.toLowerCase()}`;

        detailOverlay.classList.remove('hidden');

        // 화면 아무 곳이나 클릭하면 닫히도록 이벤트 리스너 세팅
        const closeHandler = () => {
            detailOverlay.classList.add('hidden');
            detailOverlay.removeEventListener('click', closeHandler);
            // 상세창이 닫히는 시점에 시각적 연출 활성화!
            this.triggerPowerUpVisuals(cardData);

            if (this.onCardDetailClose) {
                this.onCardDetailClose();
                this.onCardDetailClose = null;
            }
        };

        // 100ms 딜레이를 주어야 팝업을 연 클릭이 바로 버블링되어 닫히는 현상 방지
        setTimeout(() => {
            detailOverlay.addEventListener('click', closeHandler);
        }, 100);
    }

    // [수정] 결함 3: 상점 상품 구매 들이받기 확인 팝업
    triggerShopPurchaseConfirmation(cardData, themeColor) {
        const shopOverlay = document.getElementById('shop-confirm-overlay');
        const cardView = document.getElementById('shop-card-view');
        const rarityTag = document.getElementById('shop-card-rarity');
        const iconDiv = document.getElementById('shop-card-icon');
        const titleH3 = document.getElementById('shop-card-title');
        const descP = document.getElementById('shop-card-desc');
        const confirmBtn = document.getElementById('shop-confirm-btn');

        rarityTag.className = `card-rarity ${cardData.rarity.toLowerCase()}`;
        rarityTag.innerText = cardData.rarity;

        iconDiv.innerText = cardData.icon;
        titleH3.innerText = cardData.title;
        descP.innerText = cardData.desc;

        // 네온 글로우 바인딩
        cardView.style.setProperty('--card-shadow', `0 0 35px ${themeColor}`);
        cardView.className = `reward-card large-card card-${cardData.rarity.toLowerCase()}`;

        shopOverlay.classList.remove('hidden');

        const handleConfirm = () => {
            shopOverlay.classList.add('hidden');

            // 실제로 카드를 획득하여 버프 적용!
            this.applyRewardCard(cardData);

            confirmBtn.onclick = null; // [수정] 대입형 onclick 프로퍼티 안전하게 null 처리 해제
            shopOverlay.onclick = null;
        };

        // 확인 버튼 클릭 시 수령
        confirmBtn.onclick = (e) => {
            e.stopPropagation();
            handleConfirm();
        };

        // 오버레이 클릭 시 수령
        setTimeout(() => {
            shopOverlay.onclick = (e) => {
                handleConfirm();
            };
        }, 100);
    }

    // ==========================================================================
    // [네온 암시장] 비밀 자판기 차원 거래 팝업 및 수락/거절 핸들링 함수
    // 에픽/레전더리 확정 카드를 생성하고, Max HP 15 영구 삭감 대가의 거래를 제안합니다.
    // ==========================================================================
    triggerSecretShopPurchase(svm, svmIndex) {
        const overlay = document.getElementById('secret-shop-overlay');
        const iconDiv = document.getElementById('secret-shop-card-icon');
        const titleH3 = document.getElementById('secret-shop-card-title');
        const descP = document.getElementById('secret-shop-card-desc');
        const rarityTag = document.getElementById('secret-shop-card-rarity');
        const acceptBtn = document.getElementById('secret-shop-accept-btn');
        const rejectBtn = document.getElementById('secret-shop-reject-btn');

        // [버그 수정] 자판기 자체에 이미 할당된 고정 카드가 있다면 재사용, 없다면 최초 생성하여 바인딩
        let chosenCard = svm.rewardCard || null;
        if (!chosenCard) {
            // 에픽/레전더리 확정 카드 풀에서 1장 생성 (보물 상자급 고등급 보증)
            let cardsData = this.generateRewardCardsData(this.currentSpawnTotal, true);
            // 카드 중 가장 높은 등급 1장을 선별 (Legendary > Epic > Rare > Common)
            const rarityOrder = { 'LEGENDARY': 4, 'EPIC': 3, 'RARE': 2, 'COMMON': 1 };
            cardsData.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
            chosenCard = cardsData[0];
            svm.rewardCard = chosenCard; // 자판기에 고정 카드 캐싱
        }

        // 모달 UI에 카드 정보 바인딩
        rarityTag.className = `card-rarity ${chosenCard.rarity.toLowerCase()}`;
        rarityTag.innerText = chosenCard.rarity;
        rarityTag.style.background = `rgba(176, 38, 255, 0.2)`;
        rarityTag.style.borderColor = '#b026ff';
        rarityTag.style.color = '#b026ff';

        iconDiv.innerText = chosenCard.icon;
        titleH3.innerText = chosenCard.title;
        descP.innerText = chosenCard.desc;

        // 모달 표시
        overlay.classList.remove('hidden');

        // 기존 이벤트 핸들러 안전하게 제거
        acceptBtn.onclick = null;
        rejectBtn.onclick = null;

        // 거래 수락 핸들러: Max HP -15 영구 삭감 + 카드 획득 + 파티클 폭발
        acceptBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.classList.add('hidden');

            // 최대 체력 영구 삭감
            this.player.maxHp -= 15;
            // 현재 체력이 최대 체력을 초과하지 않도록 보정
            if (this.player.hp > this.player.maxHp) {
                this.player.hp = this.player.maxHp;
            }

            // 카드 획득 연출 지연 활성화
            this.visualsSuspended = true;
            this.suspendedFloatingTexts = [];

            // 카드 버프 적용
            this.applyRewardCard(chosenCard, true);

            // 카드 획득 확인 대형 디테일 오버레이 표시
            this.showAcquiredCardDetail(chosenCard);

            // 팝업이 꺼진 이후에 파티클 및 폭발 연출 실행하도록 콜백 바인딩
            this.onCardDetailClose = () => {
                // 보라빛 차원 붕괴 파티클 폭발 (40개 대규모 방출)
                for (let k = 0; k < 40; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 6 + 2;
                    let pColor = Math.random() > 0.5 ? '#b026ff' : '#d580ff';
                    this.particles.push(new Particle(svm.x, svm.y, pColor, 3, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 35, 'spark'));
                }
                // 어두운 차원 붕괴 잔해 파편
                for (let k = 0; k < 15; k++) {
                    let pAngle = Math.random() * Math.PI * 2;
                    let pSpeed = Math.random() * 3 + 1;
                    this.particles.push(new Particle(svm.x, svm.y, '#333333', 2, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 20, 'dust'));
                }

                Sound.play('explosion');
                this.shakeScreen(12, 5.0);
                this.showFloatingText("⚠️ MAX HP -15 SACRIFICED!", svm.x, svm.y - 25, '#ff0055');
                this.showFloatingText("🔮 DARK DEAL COMPLETE!", svm.x, svm.y - 45, '#b026ff');
            };

            // 비밀 자판기 소멸
            svm.active = false;
            this.secretVendingMachines.splice(svmIndex, 1);

            // HUD 갱신
            this.updateHUD();

            // 이벤트 클린업
            acceptBtn.onclick = null;
            rejectBtn.onclick = null;
        };

        // 거래 거절 핸들러: 무해 소멸, 자판기 유지
        rejectBtn.onclick = (e) => {
            e.stopPropagation();
            overlay.classList.add('hidden');

            this.showFloatingText("DEAL REJECTED", this.player.x, this.player.y - 30, '#a0aec0');
            Sound.play('dodge');

            // 이벤트 클린업
            acceptBtn.onclick = null;
            rejectBtn.onclick = null;
        };
    }

    // ==========================================================================
    // [신규 기획] 치트/디버그 레이어 제어 및 연동 시스템
    // ==========================================================================
    toggleCheatMenu() {
        const cheatOverlay = document.getElementById('cheat-overlay');
        if (!cheatOverlay) return;

        if (cheatOverlay.classList.contains('hidden')) {
            // 메뉴 열기
            this.syncCheatUIFromPlayer();
            cheatOverlay.classList.remove('hidden');
        } else {
            // 메뉴 닫기
            cheatOverlay.classList.add('hidden');
        }
    }

    // 플레이어 스탯 및 상태를 치트 UI에 적용
    syncCheatUIFromPlayer() {
        const p = this.player;

        // 1. 기본 스탯 동기화
        document.getElementById('cheat-atk').value = p.atk;
        document.getElementById('cheat-aspd').value = p.aspd.toFixed(2);
        document.getElementById('cheat-ms').value = p.ms.toFixed(2);
        document.getElementById('cheat-evd').value = p.evd.toFixed(2);
        document.getElementById('cheat-def').value = p.def;
        document.getElementById('cheat-luk').value = p.luk.toFixed(2);
        document.getElementById('cheat-regen').value = p.hpRegen.toFixed(2);
        document.getElementById('cheat-hp').value = Math.ceil(p.hp);
        document.getElementById('cheat-max-hp').value = p.maxHp;
        document.getElementById('cheat-mp').value = Math.ceil(p.mp);
        document.getElementById('cheat-max-mp').value = p.maxMp;
        document.getElementById('cheat-stamina').value = Math.ceil(p.stamina);
        document.getElementById('cheat-max-stamina').value = p.maxStamina;

        // 2. 무기 유형 동기화 및 무기 레벨 정보 표기 갱신
        const wpnBtns = document.querySelectorAll('.cheat-wpn-btn');
        wpnBtns.forEach(btn => {
            const wpn = btn.getAttribute('data-wpn');
            if (wpn === p.weaponType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            if (!btn.hasAttribute('data-original-label')) {
                btn.setAttribute('data-original-label', btn.innerText.split(' [')[0]);
            }
            const baseLabel = btn.getAttribute('data-original-label');

            if (wpn === 'energy_ball') {
                btn.innerText = `${baseLabel} [Lv.1]`;
            } else if ( wpn === 'supercritical_plasma_fusion') {
                btn.innerText = `${baseLabel}`;
            } else if (wpn === 'time') {
                btn.innerText = `${baseLabel} [${p.hasTimeWarp ? '해금' : '잠금'}]`;
            } else if (p.weaponLevels[wpn] !== undefined) {
                const lvl = p.weaponLevels[wpn] || 0;
                btn.innerText = `${baseLabel} [Lv.${lvl}]`;
            }
        });

        // 3. 투사체 옵션 동기화
        document.getElementById('cheat-multishot').value = p.multishot;
        document.getElementById('cheat-burst').value = p.burstCount;
        document.getElementById('cheat-pierce').value = p.pierceCount;
        document.getElementById('cheat-range').value = p.range;
        document.getElementById('cheat-splash').value = p.splashRadius;
        document.getElementById('cheat-homing').checked = p.homing;
        // [추가] 벽 튕기기 및 몬스터 유도 튕기기 치트 UI 값 연동
        document.getElementById('cheat-wall-bounce').value = p.wallBounceLimit;
        document.getElementById('cheat-monster-bounce').value = p.monsterBounceLimit;

        // 4. 장비 레벨 동기화
        for (let eqKey in p.equipLevels) {
            const slider = document.getElementById(`cheat-eq-${eqKey}`);
            const label = document.getElementById(`cheat-lbl-${eqKey}`);
            if (slider && label) {
                slider.value = p.equipLevels[eqKey];
                label.innerText = p.equipLevels[eqKey];
            }
        }

        // 5. 무적 모드 동기화
        document.getElementById('cheat-godmode').checked = p.isGodMode || false;

        // 6. 다음 층 비밀방 강제 동기화
        const cheatSecret = document.getElementById('cheat-forcesecret');
        if (cheatSecret) {
            cheatSecret.checked = this.forceSecretWallNextRoom || false;
        }
    }

    // 치트 메뉴 조작 이벤트 리스너 바인딩
    initCheatSystemEvents() {
        // 모달 닫기
        document.getElementById('cheat-close-btn').addEventListener('click', () => {
            this.toggleCheatMenu();
        });

        // 탭 스위칭
        const tabBtns = document.querySelectorAll('.cheat-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTabId = btn.getAttribute('data-tab');

                // 버튼 active 클래스 리셋 및 부여
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 컨텐트 active 클래스 리셋 및 부여
                const contents = document.querySelectorAll('.cheat-tab-content');
                contents.forEach(c => c.classList.remove('active'));
                document.getElementById(targetTabId).classList.add('active');
            });
        });

        // 스탯 일괄 적용
        document.getElementById('cheat-apply-stats').addEventListener('click', () => {
            const p = this.player;
            p.atk = parseFloat(document.getElementById('cheat-atk').value) || p.atk;
            p.aspd = parseFloat(document.getElementById('cheat-aspd').value) || p.aspd;
            p.ms = parseFloat(document.getElementById('cheat-ms').value) || p.ms;
            p.evd = parseFloat(document.getElementById('cheat-evd').value) || p.evd;
            p.def = parseInt(document.getElementById('cheat-def').value) || 0;
            p.luk = parseFloat(document.getElementById('cheat-luk').value) || p.luk;
            p.hpRegen = parseFloat(document.getElementById('cheat-regen').value) || p.hpRegen;

            p.maxHp = parseInt(document.getElementById('cheat-max-hp').value) || p.maxHp;
            p.hp = Math.min(p.maxHp, parseFloat(document.getElementById('cheat-hp').value) || p.hp);

            p.maxMp = parseInt(document.getElementById('cheat-max-mp').value) || p.maxMp;
            p.mp = Math.min(p.maxMp, parseFloat(document.getElementById('cheat-mp').value) || p.mp);

            p.maxStamina = parseInt(document.getElementById('cheat-max-stamina').value) || p.maxStamina;
            p.stamina = Math.min(p.maxStamina, parseFloat(document.getElementById('cheat-stamina').value) || p.stamina);

            this.updateHUD();
            this.showFloatingText("STATS UPDATED! ⚡", p.x, p.y - 40, '#00f0ff');
        });

        // 무기 유형 스위칭
        const wpnBtns = document.querySelectorAll('.cheat-wpn-btn');
        wpnBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const wpnType = btn.getAttribute('data-wpn');
                this.applyWeaponCheat(wpnType);

                // 버튼 액티브 동기화
                wpnBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 모든 부품 +5개 치트
        const allMatsBtn = document.getElementById('cheat-add-all-materials');
        if (allMatsBtn) {
            allMatsBtn.addEventListener('click', () => {
                for (let key in this.player.materials) {
                    this.player.materials[key] = (this.player.materials[key] || 0) + 5;
                }
                this.updateHUD();
                if (typeof this.refreshCraftingUI === 'function') this.refreshCraftingUI();
                this.showFloatingText("ALL MATERIALS +5! 🧩", this.player.x, this.player.y - 40, '#39ff14');
            });
        }

        // 개별 부품 +5개 치트
        document.querySelectorAll('.cheat-mat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const matKey = btn.getAttribute('data-mat');
                if (this.player.materials[matKey] !== undefined) {
                    this.player.materials[matKey] += 5;
                    this.updateHUD();
                    if (typeof this.refreshCraftingUI === 'function') this.refreshCraftingUI();
                    this.showFloatingText(`+5 ${btn.innerText}! 🧩`, this.player.x, this.player.y - 40, '#00ff66');
                }
            });
        });

        // 투사체 옵션 적용
        document.getElementById('cheat-apply-weapons').addEventListener('click', () => {
            const p = this.player;
            p.multishot = parseInt(document.getElementById('cheat-multishot').value) || 1;
            p.burstCount = parseInt(document.getElementById('cheat-burst').value) || 1;
            p.pierceCount = parseInt(document.getElementById('cheat-pierce').value) || 0;
            p.range = parseInt(document.getElementById('cheat-range').value) || 350;
            p.splashRadius = parseInt(document.getElementById('cheat-splash').value) || 0;
            p.homing = document.getElementById('cheat-homing').checked;
            // [추가] 벽 튕기기 및 몬스터 튕기기 설정치 플레이어 스탯에 실시간 갱신
            p.wallBounceLimit = parseInt(document.getElementById('cheat-wall-bounce').value) || 0;
            p.monsterBounceLimit = parseInt(document.getElementById('cheat-monster-bounce').value) || 0;

            this.updateHUD();
            this.showFloatingText("WEAPON SPECS APPLIED! 🏹", p.x, p.y - 40, '#b026ff');
        });

        // 특수 보조 장착
        document.getElementById('cheat-pet-btn').addEventListener('click', () => {
            let petAngle = this.pets.length * (Math.PI * 2 / 3);
            this.pets.push(new Pet(petAngle, 50));
            this.updateHUD();
            this.showFloatingText("PET SUMMONED! 🤖", this.player.x, this.player.y - 40, '#39ff14');
        });

        document.getElementById('cheat-whip-btn').addEventListener('click', () => {
            this.player.whipSpeedStack = 3;
            this.player.whipSpeedTimer = 300;
            this.showFloatingText("WHIP RUSH ACTIVE! 🧣", this.player.x, this.player.y - 40, '#ff6c00');
        });

        document.getElementById('cheat-trap-btn').addEventListener('click', () => {
            this.player.weaponLevels.trap = 5;
            this.showFloatingText("TRAP MASTER ACTIVE! 💣", this.player.x, this.player.y - 40, '#ffdf00');
        });

        document.getElementById('cheat-thorns-btn').addEventListener('click', () => {
            this.player.weaponLevels.thorns = 5;
            this.player.thornsFieldTimer = 1800; // 30초 대리 필드
            this.showFloatingText("THORNS AURA BURST! 🌵", this.player.x, this.player.y - 40, '#ff00aa');
        });

        // 장비 슬라이더 실시간 조작 및 적용
        const eqSliders = document.querySelectorAll('.cheat-range-slider');
        eqSliders.forEach(slider => {
            const eqKey = slider.id.replace('cheat-eq-', '');
            const label = document.getElementById(`cheat-lbl-${eqKey}`);

            // 실시간 숫자 변경 표기
            slider.addEventListener('input', () => {
                label.innerText = slider.value;
            });

            // 변경 완료 시 스탯 및 효과 동기화
            slider.addEventListener('change', () => {
                const targetLvl = parseInt(slider.value);
                this.applyCheatEquipChange(eqKey, targetLvl);
            });
        });

        // 무적 모드 토글
        document.getElementById('cheat-godmode').addEventListener('change', (e) => {
            this.player.isGodMode = e.target.checked;
            const text = this.player.isGodMode ? "GOD MODE ACTIVE 🛡️" : "GOD MODE DEACTIVATED";
            const color = this.player.isGodMode ? '#ffdf00' : '#ff0055';
            this.showFloatingText(text, this.player.x, this.player.y - 40, color);
        });

        // [2차 기획] 다음 층 비밀방 강제 출현 토글
        const cheatSecret = document.getElementById('cheat-forcesecret');
        if (cheatSecret) {
            cheatSecret.addEventListener('change', (e) => {
                this.forceSecretWallNextRoom = e.target.checked;
                const text = this.forceSecretWallNextRoom ? "FORCE SECRET WALL ACTIVE 🔮" : "FORCE SECRET WALL DEACTIVATED";
                const color = this.forceSecretWallNextRoom ? '#b026ff' : '#ff0055';
                this.showFloatingText(text, this.player.x, this.player.y - 40, color);
            });
        }

        // 코인 치트 지급
        document.getElementById('cheat-add-coin-100').addEventListener('click', () => {
            this.addCoinsCheat(100);
        });
        document.getElementById('cheat-add-coin-1000').addEventListener('click', () => {
            this.addCoinsCheat(1000);
        });

        // 방 소탕
        document.getElementById('cheat-clear-room').addEventListener('click', () => {
            this.clearRoomCheat();
        });

        // 스테이지 워프
        document.getElementById('cheat-warp-stage-btn').addEventListener('click', () => {
            const stageVal = parseInt(document.getElementById('cheat-warp-stage-input').value) || 1;
            this.warpStageCheat(stageVal);
        });

        // 기억의 조각 치트
        const addFrag10 = document.getElementById('cheat-add-fragment-10');
        if (addFrag10) {
            addFrag10.addEventListener('click', () => {
                this.addMemoryFragments(10);
                this.updateUpgradeShopUI();
                this.showFloatingText("기억의 조각 +10 🧩", this.player.x, this.player.y - 40, '#ffdf00');
            });
        }

        const addFrag100 = document.getElementById('cheat-add-fragment-100');
        if (addFrag100) {
            addFrag100.addEventListener('click', () => {
                this.addMemoryFragments(100);
                this.updateUpgradeShopUI();
                this.showFloatingText("기억의 조각 +100 🧩", this.player.x, this.player.y - 40, '#ffdf00');
            });
        }

        const resetFrag = document.getElementById('cheat-reset-fragment');
        if (resetFrag) {
            resetFrag.addEventListener('click', () => {
                this.totalFragments = 0;
                this.spentFragments = 0;
                this.saveMemoryFragments();
                this.updateUpgradeShopUI();
                this.showFloatingText("기억의 조각 초기화 🔄", this.player.x, this.player.y - 40, '#ff0055');
            });
        }

        // [신규] 히든 아이템 치트 버튼 바인딩
        const cheatJoystick = document.getElementById('cheat-hidden-joystick');
        if (cheatJoystick) {
            cheatJoystick.addEventListener('click', () => {
                this.acquireHiddenItem('brokenJoystick');
            });
        }
        const cheatRepairKit = document.getElementById('cheat-hidden-repairkit');
        if (cheatRepairKit) {
            cheatRepairKit.addEventListener('click', () => {
                this.acquireHiddenItem('repairKit');
            });
        }
        const cheatManual = document.getElementById('cheat-hidden-manual');
        if (cheatManual) {
            cheatManual.addEventListener('click', () => {
                this.acquireHiddenItem('manual');
            });
        }

        // [신규] 임시 대화창 테스트 바인딩
        const cheatTestDialogue = document.getElementById('cheat-test-dialogue');
        if (cheatTestDialogue) {
            cheatTestDialogue.addEventListener('click', () => {
                // 치트창 닫기
                const cheatOverlay = document.getElementById('cheat-overlay');
                if (cheatOverlay) cheatOverlay.classList.add('hidden');

                // 임시 대화 스크립트 실행
                this.showDialogue("OP-RUNNER", [
                    "안전 프로토콜이 해제되었습니다. 시스템 제어가 개시됩니다.",
                    "경고: 차원 미로 47구역에서 치명적인 신호 간섭이 검출되었습니다.",
                    "전투 슈트 아머의 출력을 최대로 고정하고 생존하십시오."
                ], () => {
                    this.showFloatingText("대화 테스트 완료 🗣️", this.player.x, this.player.y - 40, '#22c55e');
                });
            });
        }

        // [신규] 맵 테마 시뮬레이터 치트 바인딩
        const bindThemeCheat = (btnId, roomNum, roomType = 'normal') => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.currentRoomType = roomType;
                    this.roomNum = roomNum;
                    this.updateHUD(); // HUD 동적 싱크
                    this.showFloatingText(`테마 강제 변경: ${roomNum}층 (${roomType}) 🎨`, this.player.x, this.player.y - 40, '#00f0ff');
                });
            }
        };

        bindThemeCheat('cheat-theme-cyber', 1);
        bindThemeCheat('cheat-theme-volcanic', 15);
        bindThemeCheat('cheat-theme-frozen', 25);
        bindThemeCheat('cheat-theme-overgrown', 35);
        bindThemeCheat('cheat-theme-abyssal', 45);
        bindThemeCheat('cheat-theme-singularity', 55);
        bindThemeCheat('cheat-theme-boss', 10);
        bindThemeCheat('cheat-theme-secret', 1, 'secret_room');
        bindThemeCheat('cheat-theme-reset', 1, 'normal');

        // 3슬롯 계약 강제 해금
        const unlock3SlotBtn = document.getElementById('cheat-unlock-3slot-btn');
        if (unlock3SlotBtn) {
            unlock3SlotBtn.addEventListener('click', () => {
                this.player.maxWeaponSlots = 3;
                this.player.thirdSlotWeapon = null;
                this.showFloatingText("3슬롯 계약 강제 해금! 🔮", this.player.x, this.player.y - 40, '#b026ff');
            });
        }

        // 무기 목록 전체 리셋
        const resetWeaponsFn = () => {
            this.player.equippedWeapons = ['gun'];
            this.player.thirdSlotWeapon = null;
            this.player.weaponLevels = {
                sword: 0,
                spear: 0,
                whip: 0,
                lightning: 0,
                fire: 0,
                ice: 0,
                thorns: 0,
                trap: 0,
                scythe: 0,
                railcannon: 0
            };
            this.player.updateWeaponType();
            this.updateHUD();
            this.syncCheatUIFromPlayer(); // 치트 레벨 표기 실시간 초기화 갱신
            this.showFloatingText("무기 목록 전체 리셋 🔄", this.player.x, this.player.y - 40, '#ff0055');
        };

        const resetWeaponsBtn = document.getElementById('cheat-reset-weapons-btn');
        if (resetWeaponsBtn) {
            resetWeaponsBtn.addEventListener('click', resetWeaponsFn);
        }

        const resetWeaponsTabBtn = document.getElementById('cheat-reset-weapons-tab-btn');
        if (resetWeaponsTabBtn) {
            resetWeaponsTabBtn.addEventListener('click', resetWeaponsFn);
        }

        // [신규] 패시브 치트 select 옵션 초기화 및 장착 버튼 이벤트 바인딩
        const passiveSelect = document.getElementById('cheat-passive-select');
        if (passiveSelect && window.PASSIVE_ITEMS) {
            passiveSelect.innerHTML = '';
            for (let pId in window.PASSIVE_ITEMS) {
                const item = window.PASSIVE_ITEMS[pId];
                const opt = document.createElement('option');
                opt.value = pId;
                opt.textContent = `${item.name} (${item.rarity})`;
                passiveSelect.appendChild(opt);
            }
        }

        const equipPassiveBtn = document.getElementById('cheat-equip-passive-btn');
        if (equipPassiveBtn) {
            equipPassiveBtn.addEventListener('click', () => {
                const select = document.getElementById('cheat-passive-select');
                if (!select) return;
                const pId = select.value;
                if (!pId) return;

                if (this.player.craftedPassives.includes(pId)) {
                    this.showFloatingText("ALREADY EQUIPPED!", this.player.x, this.player.y - 40, '#ffdf00');
                    return;
                }

                this.player.craftedPassives.push(pId);
                this.player.applyPassiveEffects(pId);
                this.updateHUD();
                if (typeof this.refreshCraftingUI === 'function') this.refreshCraftingUI();
                this.showFloatingText(`FORCE EQUIPPED: ${pId} 🔮`, this.player.x, this.player.y - 40, '#00f0ff');
                Sound.play('powerup');
            });
        }

        // [신규] 설계도 해금/초기화 및 부품 20개/삭제 치트 바인딩
        const unlockBPBtn = document.getElementById('cheat-unlock-all-blueprints');
        if (unlockBPBtn) {
            unlockBPBtn.addEventListener('click', () => {
                if (window.CRAFTING_RECIPES) {
                    for (let wId in window.CRAFTING_RECIPES) {
                        this.player.unlockedBlueprints = this.player.unlockedBlueprints || [];
                        if (!this.player.unlockedBlueprints.includes(wId)) {
                            this.player.unlockedBlueprints.push(wId);
                        }
                    }
                }
                this.showFloatingText("ALL BLUEPRINTS UNLOCKED! 🔮", this.player.x, this.player.y - 40, '#ffdf00');
                if (typeof this.refreshCraftingUI === 'function') this.refreshCraftingUI();
            });
        }

        const resetBPBtn = document.getElementById('cheat-reset-blueprints');
        if (resetBPBtn) {
            resetBPBtn.addEventListener('click', () => {
                this.player.unlockedBlueprints = [];
                this.showFloatingText("BLUEPRINTS RESET! 🔄", this.player.x, this.player.y - 40, '#ff0055');
                if (typeof this.refreshCraftingUI === 'function') this.refreshCraftingUI();
            });
        }

        const addMats20Btn = document.getElementById('cheat-add-materials-20');
        if (addMats20Btn) {
            addMats20Btn.addEventListener('click', () => {
                for (let key in this.player.materials) {
                    this.player.materials[key] = (this.player.materials[key] || 0) + 20;
                }
                this.updateHUD();
                if (typeof this.refreshCraftingUI === 'function') this.refreshCraftingUI();
                this.showFloatingText("ALL MATERIALS +20! 🧩", this.player.x, this.player.y - 40, '#39ff14');
            });
        }

        const clearMatsBtn = document.getElementById('cheat-clear-materials');
        if (clearMatsBtn) {
            clearMatsBtn.addEventListener('click', () => {
                for (let key in this.player.materials) {
                    this.player.materials[key] = 0;
                }
                this.updateHUD();
                if (typeof this.refreshCraftingUI === 'function') this.refreshCraftingUI();
                this.showFloatingText("MATERIALS CLEARED! 🗑️", this.player.x, this.player.y - 40, '#ff0055');
            });
        }

        // 보상 선택 즉시 소환 치트 바인딩
        const spawnRewardBtn = document.getElementById('cheat-spawn-reward');
        if (spawnRewardBtn) {
            spawnRewardBtn.addEventListener('click', () => {
                this.enqueueReward({ type: 'reward', isFromHiddenChest: true });
                this.toggleCheatMenu(); // 치트 메뉴 닫기
                this.showFloatingText("보상 선택 오버레이 즉시 호출 🎁", this.player.x, this.player.y - 40, '#00f0ff');
            });
        }

        // [신규] 커스텀 맵 로더 이벤트 핸들러 바인딩
        const mapFileInput = document.getElementById('cheat-map-file-input');
        const mapFileBtn = document.getElementById('cheat-map-file-btn');
        const mapFileName = document.getElementById('cheat-map-file-name');
        const mapJsonInput = document.getElementById('cheat-map-json-input');
        const mapLoadBtn = document.getElementById('cheat-map-load-btn');
        const mapStatusMsg = document.getElementById('cheat-map-status-msg');

        if (mapFileBtn && mapFileInput) {
            mapFileBtn.addEventListener('click', () => {
                mapFileInput.click();
            });

            mapFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                mapFileName.innerText = file.name;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    mapJsonInput.value = evt.target.result;
                    if (mapStatusMsg) {
                        mapStatusMsg.innerText = "파일을 성공적으로 읽었습니다.";
                        mapStatusMsg.style.color = "#39ff14";
                        mapStatusMsg.classList.remove('hidden');
                    }
                };
                reader.onerror = () => {
                    if (mapStatusMsg) {
                        mapStatusMsg.innerText = "파일 읽기 실패!";
                        mapStatusMsg.style.color = "#ff0055";
                        mapStatusMsg.classList.remove('hidden');
                    }
                };
                reader.readAsText(file);
            });
        }

        if (mapLoadBtn && mapJsonInput) {
            mapLoadBtn.addEventListener('click', () => {
                const jsonText = mapJsonInput.value.trim();
                if (mapStatusMsg) {
                    mapStatusMsg.classList.add('hidden');
                }

                if (!jsonText) {
                    if (mapStatusMsg) {
                        mapStatusMsg.innerText = "🚨 오류: JSON 텍스트를 입력하거나 파일을 선택해주세요.";
                        mapStatusMsg.style.color = "#ff0055";
                        mapStatusMsg.classList.remove('hidden');
                    }
                    return;
                }

                try {
                    const data = JSON.parse(jsonText);
                    if (!data.presetKey || !data.grid || !data.portalSpawnInfo) {
                        throw new Error("필수 키(presetKey, grid, portalSpawnInfo)가 누락되었습니다.");
                    }

                    if (!Array.isArray(data.grid) || data.grid.length !== 18) {
                        throw new Error("grid는 반드시 18행의 배열이어야 합니다.");
                    }

                    for (let r = 0; r < 18; r++) {
                        if (typeof data.grid[r] !== 'string' || data.grid[r].length !== 24) {
                            throw new Error(`grid의 ${r + 1}번째 행은 반드시 24글자 문자열이어야 합니다.`);
                        }
                    }

                    // 글로벌 맵 프리셋 객체 등록
                    MAP_PRESETS[data.presetKey] = data.grid;
                    PORTAL_SPAWN_INFOS[data.presetKey] = data.portalSpawnInfo;

                    // 게임이 구동 중일 때 즉시 적용 시도
                    if (this.isPlaying) {
                        this.loadCustomMapPreset(data.presetKey);
                        if (mapStatusMsg) {
                            mapStatusMsg.innerText = `✅ 성공: '${data.presetKey}' 프리셋이 게임에 즉시 적용되었습니다!`;
                            mapStatusMsg.style.color = "#39ff14";
                            mapStatusMsg.classList.remove('hidden');
                        }
                    } else {
                        if (mapStatusMsg) {
                            mapStatusMsg.innerText = `✅ 성공: '${data.presetKey}' 프리셋이 등록되었습니다. 게임 시작 후 치트에서 즉시 로드 가능합니다.`;
                            mapStatusMsg.style.color = "#39ff14";
                            mapStatusMsg.classList.remove('hidden');
                        }
                    }
                } catch (err) {
                    if (mapStatusMsg) {
                        mapStatusMsg.innerText = `🚨 오류: JSON 파싱 실패! (${err.message})`;
                        mapStatusMsg.style.color = "#ff0055";
                        mapStatusMsg.classList.remove('hidden');
                    }
                }
            });
        }
    }

    // [신규 추가] 바이츠의 영구 업그레이드 상점 이벤트 리스너 바인딩
    initUpgradeShopEvents() {
        const lobbyBtn = document.getElementById('lobby-upgrade-btn');
        const shopOverlay = document.getElementById('upgrade-shop-overlay');
        const closeBtn = document.getElementById('upgrade-shop-close-btn');
        const resetBtn = document.getElementById('upgrade-reset-btn');

        if (lobbyBtn && shopOverlay) {
            lobbyBtn.addEventListener('click', () => {
                this.updateUpgradeShopUI();
                shopOverlay.classList.remove('hidden');
                const startOverlay = document.getElementById('start-overlay');
                if (startOverlay) startOverlay.classList.add('hidden');
            });
        }

        if (closeBtn && shopOverlay) {
            closeBtn.addEventListener('click', () => {
                shopOverlay.classList.add('hidden');
                const startOverlay = document.getElementById('start-overlay');
                if (startOverlay) startOverlay.classList.remove('hidden');
            });
        }

        const upgradeButtons = document.querySelectorAll('.upgrade-btn');
        upgradeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stat = btn.getAttribute('data-stat');
                this.buyBitesUpgrade(stat);
            });
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetBitesUpgrades();
            });
        }
    }

    updateUpgradeShopUI() {
        this.loadMemoryFragments();

        const totalEl = document.getElementById('shop-total-fragments');
        const spentEl = document.getElementById('shop-spent-fragments');
        const unusedEl = document.getElementById('shop-unused-fragments');

        if (totalEl) totalEl.innerText = this.totalFragments;
        if (spentEl) spentEl.innerText = this.spentFragments;
        if (unusedEl) unusedEl.innerText = this.unusedFragments;

        const stats = ['atk', 'ms', 'aspd', 'hp', 'mp'];
        stats.forEach(stat => {
            const lvl = parseInt(localStorage.getItem(`neon_upgrade_${stat}`)) || 0;
            const lbl = document.getElementById(`lbl-upgrade-${stat}`);
            if (lbl) {
                lbl.innerText = `${lvl} / 5`;
            }
        });
    }

    buyBitesUpgrade(stat) {
        this.loadMemoryFragments();
        const lvlKey = `neon_upgrade_${stat}`;
        const currentLvl = parseInt(localStorage.getItem(lvlKey)) || 0;

        if (currentLvl >= 5) {
            this.showFloatingText("이미 최대 개조 단계입니다! 🚫", this.player.x, this.player.y - 20, '#ff0055');
            return;
        }

        if (this.unusedFragments < 1) {
            this.showFloatingText("미사용 기억의 조각이 부족합니다! 🧩", this.player.x, this.player.y - 20, '#ff0055');
            return;
        }

        localStorage.setItem(lvlKey, currentLvl + 1);
        this.spentFragments += 1;
        this.unusedFragments = Math.max(0, this.totalFragments - this.spentFragments);
        this.saveMemoryFragments();

        this.updateUpgradeShopUI();
        Sound.play('powerup');
        this.showFloatingText("개조 성공! ⚡", this.player.x, this.player.y - 30, '#39ff14');
        this.player.loadBitesUpgrades();
    }

    resetBitesUpgrades() {
        const stats = ['atk', 'ms', 'aspd', 'hp', 'mp'];
        stats.forEach(stat => {
            localStorage.setItem(`neon_upgrade_${stat}`, 0);
        });

        this.spentFragments = 0;
        this.unusedFragments = this.totalFragments;
        this.saveMemoryFragments();

        this.updateUpgradeShopUI();
        Sound.play('explosion');
        this.showFloatingText("기억 복원 완료! 🔄", this.player.x, this.player.y - 30, '#ffdf00');
        this.player.loadBitesUpgrades();
    }

    // [신규 추가] 시스템 옵션 모달 조작 이벤트 리스너 바인딩
    initOptionEvents() {
        // 상단 HUD OPTION 버튼 클릭 시 옵션 토글
        const optionBtn = document.getElementById('option-btn');
        if (optionBtn) {
            optionBtn.addEventListener('click', () => {
                // 이미 켜져 있는 걸 닫는 건 허용, 새로 켜는 건 다른 오버레이가 없을 때만 허용
                const optionOverlay = document.getElementById('option-overlay');
                const isAlreadyOpen = optionOverlay && !optionOverlay.classList.contains('hidden');
                if (!isAlreadyOpen) {
                    if (this.checkAnyOverlayOpenExcept('option-overlay')) return;
                }
                this.toggleOptionMenu();
            });
        }

        // 옵션 모달 닫기 버튼 클릭
        const closeBtn = document.getElementById('option-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggleOptionMenu();
            });
        }

        // 효과음 볼륨 슬라이더 실시간 조작
        const sfxSlider = document.getElementById('volume-sfx');
        const sfxLabel = document.getElementById('volume-sfx-val');
        if (sfxSlider && sfxLabel) {
            sfxSlider.addEventListener('input', () => {
                const val = parseFloat(sfxSlider.value);
                Sound.setSFXVolume(val);
                sfxLabel.innerText = Math.round(val * 100) + '%';
            });
            // 조작을 마칠 때(change) 소리를 체감해 볼 수 있게 레트로 동전 소리를 1회 출력
            sfxSlider.addEventListener('change', () => {
                Sound.play('coin');
            });
        }

        // 배경음악 볼륨 슬라이더 실시간 조작
        const bgmSlider = document.getElementById('volume-bgm');
        const bgmLabel = document.getElementById('volume-bgm-val');
        if (bgmSlider && bgmLabel) {
            bgmSlider.addEventListener('input', () => {
                const val = parseFloat(bgmSlider.value);
                Sound.setBGMVolume(val);
                bgmLabel.innerText = Math.round(val * 100) + '%';
            });
        }

        // 화면 흔들림 강도 슬라이더 실시간 조작
        const shakeSlider = document.getElementById('shake-scale');
        const shakeLabel = document.getElementById('shake-scale-val');
        if (shakeSlider && shakeLabel) {
            shakeSlider.addEventListener('input', () => {
                const val = parseFloat(shakeSlider.value);
                this.shakeScale = val;
                shakeLabel.innerText = Math.round(val * 100) + '%';
                this.saveOptions();
            });
        }

        // 게임 재시작 버튼 클릭
        const restartBtn = document.getElementById('option-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                // 게임 재시작 후 모달 강제 닫기
                this.toggleOptionMenu();
                this.restartGame();
            });
        }

        // 성능 최적화 모드 체크박스 실시간 조작
        const perfCheckbox = document.getElementById('perf-low-spec');
        if (perfCheckbox) {
            perfCheckbox.addEventListener('change', () => {
                this.lowSpecMode = perfCheckbox.checked;
                this.saveOptions();
            });
        }
    }

    // [신규 추가] 시스템 옵션 모달 토글 메소드
    toggleOptionMenu() {
        const optionOverlay = document.getElementById('option-overlay');
        if (!optionOverlay) return;

        if (optionOverlay.classList.contains('hidden')) {
            // 옵션 메뉴 열기
            this.syncOptionUIFromSound();
            optionOverlay.classList.remove('hidden');
        } else {
            // 옵션 메뉴 닫기
            optionOverlay.classList.add('hidden');
        }
    }

    applyGlitchFilter(text) {
        const unused = this.unusedFragments !== undefined ? this.unusedFragments : 0;
        if (unused >= 10) return text; // 3단계: 완전 복원
        let noiseRate = unused >= 5 ? 0.15 : 0.45; // 2단계 vs 1단계
        return text.split('').map(char => {
            if (char !== ' ' && char !== '\n' && Math.random() < noiseRate) {
                const noiseChars = ['@', '#', '$', '%', '&', '*', '_', '!', '?'];
                return noiseChars[Math.floor(Math.random() * noiseChars.length)];
            }
            return char;
        }).join('');
    }

    showDialogue(speaker, lines, onComplete) {
        try {
            const overlay = document.getElementById('story-dialogue-overlay');
            const speakerEl = document.getElementById('dialogue-speaker');
            const textEl = document.getElementById('dialogue-text');
            const nextBtn = document.getElementById('dialogue-next-btn');

            if (!overlay || !speakerEl || !textEl || !nextBtn) {
                if (onComplete) onComplete();
                return;
            }

            // [안전 가드] 이전 호출의 이벤트 리스너 및 타이머가 남아있을 경우 깨끗이 제거하여 백그라운드 꼬임 현상 원천 차단
            if (this.currentDialogueNextListener) {
                nextBtn.removeEventListener('click', this.currentDialogueNextListener);
            }
            if (this.currentDialogueKeyDownListener) {
                window.removeEventListener('keydown', this.currentDialogueKeyDownListener);
            }
            if (this.currentDialogueTimeout) {
                clearTimeout(this.currentDialogueTimeout);
            }

            this.isDialogueActive = true; // 활성 대화 중 플래그 활성화
            overlay.classList.remove('hidden');
            nextBtn.classList.remove('hidden'); // 계속 버튼 강제 노출
            speakerEl.innerText = `[ ${speaker} ]`;

            let currentLineIdx = 0;
            let isTyping = false;

            const renderLine = (lineText) => {
                textEl.innerHTML = "";
                isTyping = true;
                let charIdx = 0;
                const fullText = this.applyGlitchFilter(lineText);

                const typeChar = () => {
                    if (charIdx < fullText.length) {
                        textEl.textContent += fullText[charIdx];
                        charIdx++;
                        this.currentDialogueTimeout = setTimeout(typeChar, 8); // 클래스 멤버에 타이머 저장
                    } else {
                        isTyping = false;
                    }
                };
                typeChar();
            };

            const nextLine = () => {
                if (isTyping) {
                    if (this.currentDialogueTimeout) {
                        clearTimeout(this.currentDialogueTimeout);
                    }
                    textEl.textContent = this.applyGlitchFilter(lines[currentLineIdx]);
                    isTyping = false;
                    return;
                }

                currentLineIdx++;
                if (currentLineIdx < lines.length) {
                    renderLine(lines[currentLineIdx]);
                } else {
                    // 대화 완료 - 대기 모드로 상태 변경
                    this.isDialogueActive = false; // 대화 플래그 비활성화
                    overlay.classList.add('hidden'); // 대화 모달 자체를 완전히 숨김
                    overlay.classList.remove('dimmed'); // 딤드 해제
                    nextBtn.classList.add('hidden'); // 계속 버튼 숨김
                    speakerEl.innerText = "[ SYSTEM ]";
                    textEl.innerText = "SYSTEM ONLINE. SIGNAL STABLE.";

                    nextBtn.removeEventListener('click', nextLine);
                    window.removeEventListener('keydown', onKeyDown);

                    // 멤버 참조 리셋
                    this.currentDialogueNextListener = null;
                    this.currentDialogueKeyDownListener = null;
                    this.currentDialogueTimeout = null;

                    if (onComplete) onComplete();
                }
            };

            const onKeyDown = (e) => {
                if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
                    e.preventDefault();
                    nextLine();
                }
            };

            // 현재 핸들러를 킵하여 중복 호출 시 제거할 수 있게 보장
            this.currentDialogueNextListener = nextLine;
            this.currentDialogueKeyDownListener = onKeyDown;

            nextBtn.addEventListener('click', nextLine);
            window.addEventListener('keydown', onKeyDown);

            renderLine(lines[0]);
        } catch (e) {
            console.error("showDialogue 실행 에러:", e);
        }
    }

    // [신규 추가] 임의의 게임 오버레이/모달창이 활성화되어 있는지 여부를 판정하는 헬퍼 함수
    checkAnyOverlayOpen() {
        const overlays = [
            'start-overlay', 'reward-overlay', 'result-overlay',
            'card-detail-overlay', 'shop-confirm-overlay',
            'secret-shop-overlay', 'cheat-overlay', 'option-overlay', 'in-game-status-overlay',
            'tutorial-overlay', 'monster-bestiary-overlay', 'card-codex-overlay', 'ranking-modal-overlay',
            'crafting-overlay'
        ];
        return overlays.some(id => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        }) || this.isDialogueActive; // [신규] 활성 대화 진행 중일 때만 오버레이 차단 판정 추가
    }

    // [신규 추가] 특정 모달(exceptId)을 제외하고 활성화된 다른 오버레이가 있는지 판정하는 헬퍼 함수
    checkAnyOverlayOpenExcept(exceptId) {
        const overlays = [
            'start-overlay', 'reward-overlay', 'result-overlay',
            'card-detail-overlay', 'shop-confirm-overlay',
            'secret-shop-overlay', 'cheat-overlay', 'option-overlay', 'in-game-status-overlay',
            'tutorial-overlay', 'monster-bestiary-overlay', 'card-codex-overlay', 'ranking-modal-overlay',
            'crafting-overlay'
        ];
        return overlays.some(id => {
            if (id === exceptId) return false;
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        }) || this.isDialogueActive;
    }

    // [신규 추가] 인게임 습득 장비 상태창 모달 토글
    toggleStatusMenu() {
        const statusOverlay = document.getElementById('in-game-status-overlay');
        if (!statusOverlay) return;

        if (statusOverlay.classList.contains('hidden')) {
            // 상태창 열기
            statusOverlay.classList.remove('hidden');

            // HUD 정보 동기화
            const statusRoom = document.getElementById('status-room');
            const statusScore = document.getElementById('status-score');
            const statusCoin = document.getElementById('status-coin');

            if (statusRoom) statusRoom.innerText = `${Math.min(100, this.roomNum)} / 100`;
            if (statusScore) statusScore.innerText = this.score;
            if (statusCoin) statusCoin.innerText = `📀 ${this.player ? this.player.coins : 0}`;

            // 장비 그리드 렌더링
            const statusGrid = document.getElementById('status-equipments-grid');
            if (statusGrid) {
                statusGrid.innerHTML = '';

                // 무기 20종
                const wpns = [
                    { key: 'crude_sword', name: '조잡한 진동검', icon: '🪓' },
                    { key: 'plasma_saber', name: '플라즈마 세이버', icon: '🗡️' },
                    { key: 'crude_spear', name: '조잡한 창', icon: '🔱' },
                    { key: 'energy_pilebunker', name: '에너지 파일벙커', icon: '⚡' },
                    { key: 'crude_whip', name: '조잡한 채찍', icon: '🧣' },
                    { key: 'nano_laser_wire', name: '나노 레이저 와이어', icon: '🧬' },
                    { key: 'crude_shock', name: '조잡 전격기', icon: '🔌' },
                    { key: 'chain_emp_shock', name: '체인 EMP 쇼크', icon: '🔋' },
                    { key: 'crude_flamethrower', name: '조잡 화방', icon: '🔥' },
                    { key: 'fusion_plasma_cannon', name: '퓨전 플라즈마 캐논', icon: '💥' },
                    { key: 'crude_cryo', name: '조잡 냉각총', icon: '❄️' },
                    { key: 'cryo_freezer', name: '크라이오 프리저', icon: '🧊' },
                    { key: 'crude_thorns', name: '조잡 가시갑옷', icon: '🌵' },
                    { key: 'gravity_singularity_field', name: '중력 특이점 필드', icon: '🧲' },
                    { key: 'crude_trap', name: '조잡한 덫', icon: '⚙️' },
                    { key: 'proximity_cyber_mine', name: '사이버 지뢰', icon: '🛰️' },
                    { key: 'crude_scythe', name: '조잡한 낫', icon: '⛏️' },
                    { key: 'void_destroyer', name: '보이드 디스트로이어', icon: '🌌' },
                    { key: 'crude_rail', name: '조잡 레일건', icon: '📡' },
                    { key: 'tachyon_railgun', name: '태키온 레일건', icon: '⚡' }
                ];
                let wpnCount = 0;
                wpns.forEach(w => {
                    const lvl = (this.player && this.player.weaponLevels) ? (this.player.weaponLevels[w.key] || 0) : 0;
                    if (lvl > 0) {
                        wpnCount++;
                        const card = document.createElement('div');
                        card.className = lvl >= 5 ? 'status-card active-weapon master' : 'status-card active-weapon';
                        card.innerHTML = `
                            <span class="icon">${w.icon}</span>
                            <div class="info">
                                <span class="name">${w.name}</span>
                                <span class="level">Lv.${lvl} ${this.buildLevelIndicator(lvl, 5)}</span>
                            </div>
                        `;
                        statusGrid.appendChild(card);
                    }
                });

                if (wpnCount === 0) {
                    const card = document.createElement('div');
                    card.className = 'status-card active-weapon';
                    card.innerHTML = `
                        <span class="icon">🔵</span>
                        <div class="info">
                            <span class="name">에너지 볼</span>
                            <span class="level">기본 장착</span>
                        </div>
                    `;
                    statusGrid.appendChild(card);
                }

                // 보조 장비 11종 (차원 고글 추가됨에 따라 11종 전체 순회)
                const equips = [
                    { key: 'armor', name: '방어 갑옷', icon: '🛡️' },
                    { key: 'boots', name: '신속 부츠', icon: '🥾' },
                    { key: 'gloves', name: '공격 장갑', icon: '🧤' },
                    { key: 'helm', name: '지혜 투구', icon: '🪖' },
                    { key: 'necklace', name: '행운 목걸이', icon: '📿' },
                    { key: 'ring_mp', name: '마력 반지', icon: '💍' },
                    { key: 'ring_hp', name: '생명 반지', icon: '💍' },
                    { key: 'ring_speed', name: '신속 반지', icon: '💍' },
                    { key: 'ring_aspd', name: '공속 반지', icon: '💍' },
                    { key: 'ring_evd', name: '회피 반지', icon: '💍' },
                    { key: 'goggles', name: '차원 고글', icon: '🥽' }
                ];
                equips.forEach(eq => {
                    const lvl = (this.player && this.player.equipLevels) ? (this.player.equipLevels[eq.key] || 0) : 0;
                    if (lvl > 0) {
                        const card = document.createElement('div');
                        card.className = lvl >= 10 ? 'status-card active-equip master' : 'status-card active-equip';
                        card.innerHTML = `
                            <span class="icon">${eq.icon}</span>
                            <div class="info">
                                <span class="name">${eq.name}</span>
                                <span class="level">Lv.${lvl} ${this.buildLevelIndicator(lvl, 10)}</span>
                            </div>
                        `;
                        statusGrid.appendChild(card);
                    }
                });

                // 부품 재료 렌더링
                const matsDisplay = document.getElementById('status-materials-display');
                if (matsDisplay) {
                    matsDisplay.innerHTML = '';

                    const materialNames = {
                        short_rod: '짧은 막대기',
                        long_rod: '긴 막대기',
                        metal_plate: '넓은 판',
                        blade: '칼날',
                        wire: '전선',
                        battery: '배터리',
                        broken_flamethrower: '고장난 화방',
                        cryo_cooler: '과냉각기',
                        sensor_lens: '광학 렌즈',
                        nanite_jar: '나노머신 병',
                        hydraulic_cylinder: '유압 실린더'
                    };

                    let matsCount = 0;
                    for (let key in this.player.materials) {
                        const count = this.player.materials[key] || 0;
                        if (count > 0) {
                            matsCount++;
                            const matItem = document.createElement('div');
                            matItem.className = 'status-material-badge';
                            matItem.style.cssText = 'background: rgba(57, 255, 20, 0.08); border: 1px solid #39ff14; color: #39ff14; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: bold;';
                            matItem.innerHTML = `<span>${materialNames[key] || key} x${count}</span>`;
                            matsDisplay.appendChild(matItem);
                        }
                    }

                    if (matsCount === 0) {
                        matsDisplay.innerHTML = `<span style="color: #64748b; font-size: 0.8rem; font-style: italic;">보유한 부품이 없습니다. 몬스터를 처치하여 부품을 수집하세요!</span>`;
                    }
                }
            }
        } else {
            // 상태창 닫기
            statusOverlay.classList.add('hidden');
        }
    }

    // [신규 추가] Sound 객체의 볼륨 스탯을 옵션 UI 슬라이더에 동기화
    syncOptionUIFromSound() {
        const sfxVal = Sound.sfxVolume;
        const bgmVal = Sound.bgmVolume;

        const sfxSlider = document.getElementById('volume-sfx');
        const bgmSlider = document.getElementById('volume-bgm');
        const shakeSlider = document.getElementById('shake-scale');
        const sfxLabel = document.getElementById('volume-sfx-val');
        const bgmLabel = document.getElementById('volume-bgm-val');
        const shakeLabel = document.getElementById('shake-scale-val');
        const perfCheckbox = document.getElementById('perf-low-spec');

        if (sfxSlider && sfxLabel) {
            sfxSlider.value = sfxVal;
            sfxLabel.innerText = Math.round(sfxVal * 100) + '%';
        }
        if (bgmSlider && bgmLabel) {
            bgmSlider.value = bgmVal;
            bgmLabel.innerText = Math.round(bgmVal * 100) + '%';
        }
        if (shakeSlider && shakeLabel) {
            shakeSlider.value = this.shakeScale;
            shakeLabel.innerText = Math.round(this.shakeScale * 100) + '%';
        }
        if (perfCheckbox) {
            perfCheckbox.checked = this.lowSpecMode;
        }
    }

    saveOptions() {
        try {
            const options = {
                sfxVolume: Sound.sfxVolume,
                bgmVolume: Sound.bgmVolume,
                lowSpecMode: this.lowSpecMode,
                shakeScale: this.shakeScale // [신규] 화면 흔들림 강도 옵션 저장
            };
            localStorage.setItem('neon_rogue_options', JSON.stringify(options));
        } catch (e) {
            console.error("옵션 저장 실패:", e);
        }
    }

    loadOptions() {
        try {
            const savedOptions = JSON.parse(localStorage.getItem('neon_rogue_options'));
            if (savedOptions) {
                this.lowSpecMode = savedOptions.lowSpecMode || false;
                this.shakeScale = savedOptions.shakeScale !== undefined ? savedOptions.shakeScale : 1.0; // [신규] 화면 흔들림 강도 옵션 로드
                Sound.setSFXVolume(savedOptions.sfxVolume !== undefined ? savedOptions.sfxVolume : 1.0);
                Sound.setBGMVolume(savedOptions.bgmVolume !== undefined ? savedOptions.bgmVolume : 0.5);
            }
        } catch (e) {
            console.error("옵션 로드 실패:", e);
        }
    }

    saveGame(lastRoomDifficultyScore) {
        if (!this.isPlaying || this.roomNum > 100) return;
        try {
            const saveData = {
                roomNum: this.roomNum,
                score: this.score,
                kills: this.kills,
                mapWidth: this.mapWidth,
                mapHeight: this.mapHeight,
                currentMapPreset: this.currentMapPreset,
                currentRoomType: this.currentRoomType,
                weaponRoomCooldown: this.weaponRoomCooldown,
                isEliteRoom: this.isEliteRoom,
                lastEnteredPortalClass: this.lastEnteredPortalClass,
                inSecretRoom: this.inSecretRoom,
                lastEnteredPortalDir: this.lastEnteredPortalDir,
                lastRoomDifficultyScore: lastRoomDifficultyScore,
                petsCount: this.pets.length,
                hasSecretWall: this.secretWalls.length > 0,
                exitPortalType: (this.inSecretRoom && this.portals[0]) ? this.portals[0].portalType : null,
                exitPortalDifficultyClass: (this.inSecretRoom && this.portals[0]) ? this.portals[0].difficultyClass : null,
                // [신규] 이어하기 시 문 종류 및 점수가 재구성되는 버그 방지를 위해 포털 정보 백업
                portals: this.portals.map(p => ({
                    direction: p.direction,
                    scoreValue: p.scoreValue,
                    portalType: p.portalType,
                    difficultyClass: p.difficultyClass,
                    active: p.active
                })),
                player: {
                    maxHp: this.player.maxHp,
                    hp: this.player.hp,
                    maxStamina: this.player.maxStamina,
                    stamina: this.player.stamina,
                    atk: this.player.atk,
                    aspd: this.player.aspd,
                    ms: this.player.ms,
                    evd: this.player.evd,
                    luk: this.player.luk,
                    mp: this.player.mp,
                    maxMp: this.player.maxMp,
                    magicType: this.player.magicType,
                    coins: this.player.coins,
                    perfectClearFlag: this.player.perfectClearFlag,
                    equipLevels: { ...this.player.equipLevels },
                    swordDmgUpgrade: this.player.swordDmgUpgrade,
                    multishotArc: this.player.multishotArc,
                    petDmgUpgrade: this.player.petDmgUpgrade,
                    splashDmgUpgrade: this.player.splashDmgUpgrade,
                    homingAngleSpeed: this.player.homingAngleSpeed,
                    hpRegen: this.player.hpRegen,
                    range: this.player.range,
                    weaponType: this.player.weaponType,
                    weaponLevels: { ...this.player.weaponLevels },
                    multishot: this.player.multishot,
                    burstCount: this.player.burstCount,
                    pierceCount: this.player.pierceCount,
                    homing: this.player.homing,
                    wallBounceLimit: this.player.wallBounceLimit,
                    monsterBounceLimit: this.player.monsterBounceLimit,
                    splashRadius: this.player.splashRadius,
                    weaponUnlocks: JSON.parse(JSON.stringify(this.player.weaponUnlocks)),
                    resurrected: this.player.resurrected
                }
            };
            localStorage.setItem('neon_rogue_save_game', JSON.stringify(saveData));
        } catch (e) {
            console.error("게임 세션 저장 실패:", e);
        }
    }

    acquireHiddenItem(itemKey) {
        if (!this.player.hiddenItems) {
            this.player.hiddenItems = {
                brokenJoystick: false,
                repairKit: false,
                manual: false
            };
        }

        if (itemKey === 'brokenJoystick') {
            this.player.hiddenItems.brokenJoystick = true;
            this.showFloatingText("OBTAINED: BROKEN JOYSTICK 🕹️", this.player.x, this.player.y - 30, '#00f0ff');
        } else if (itemKey === 'repairKit') {
            this.player.hiddenItems.repairKit = true;
            this.player.maxHp = Math.ceil(this.player.maxHp * 0.8);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp);
            this.player.armorShield = (this.player.armorShield || 0);
            this.showFloatingText("OBTAINED: REPAIR KIT 🔧", this.player.x, this.player.y - 30, '#10b981');
        } else if (itemKey === 'manual') {
            this.player.hiddenItems.manual = true;
            this.showFloatingText("OBTAINED: MANUAL 📖", this.player.x, this.player.y - 30, '#ffdf00');
            const filter = document.getElementById('manual-noise-filter');
            if (filter) {
                filter.classList.remove('hidden');
            }
        }

        Sound.play('powerup');
        this.updateHUD();

        // 3종 융합 조건 체크
        if (this.player.hiddenItems.brokenJoystick && this.player.hiddenItems.repairKit && this.player.hiddenItems.manual) {
            this.player.fusedController = true;
            this.showFloatingText("COMBINED: CONTROLLER OF LIBERATION 👑", this.player.x, this.player.y - 45, '#ff00aa');
            for (let i = 0; i < 30; i++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 4 + 1.5;
                if (typeof Particle !== 'undefined') {
                    this.particles.push(new Particle(this.player.x, this.player.y, '#ff00aa', 2.0, Math.cos(angle) * speed, Math.sin(angle) * speed, 40, 'spark'));
                }
            }
        }
    }

    loadMemoryFragments() {
        try {
            const total = parseInt(localStorage.getItem('neon_rogue_total_fragments')) || 0;
            const spent = parseInt(localStorage.getItem('neon_rogue_spent_fragments')) || 0;
            this.totalFragments = total;
            this.spentFragments = spent;
            this.unusedFragments = Math.max(0, total - spent);
        } catch (e) {
            console.error("기억의 조각 로드 실패:", e);
            this.totalFragments = 0;
            this.spentFragments = 0;
            this.unusedFragments = 0;
        }
    }

    saveMemoryFragments() {
        try {
            localStorage.setItem('neon_rogue_total_fragments', this.totalFragments);
            localStorage.setItem('neon_rogue_spent_fragments', this.spentFragments);
            this.unusedFragments = Math.max(0, this.totalFragments - this.spentFragments);
        } catch (e) {
            console.error("기억의 조각 저장 실패:", e);
        }
    }

    addMemoryFragments(amount) {
        this.totalFragments += amount;
        this.saveMemoryFragments();
    }

    clearSavedGame() {
        try {
            localStorage.removeItem('neon_rogue_save_game');
            this.updateContinueButtonVisibility();
        } catch (e) {
            console.error("게임 세션 초기화 실패:", e);
        }
    }

    updateContinueButtonVisibility() {
        try {
            const continueBtn = document.getElementById('continue-btn');
            if (continueBtn) {
                const saveData = localStorage.getItem('neon_rogue_save_game');
                if (saveData) {
                    continueBtn.classList.remove('hidden');
                } else {
                    continueBtn.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error("이어하기 버튼 상태 변경 실패:", e);
        }
    }

    continueGame() {
        try {
            const savedData = JSON.parse(localStorage.getItem('neon_rogue_save_game'));
            if (!savedData) return;

            // 게임 UI 및 오버레이 정리
            document.getElementById('start-overlay').classList.add('hidden');
            const storyOverlay = document.getElementById('story-dialogue-overlay');
            if (storyOverlay) {
                storyOverlay.classList.remove('hidden');
                storyOverlay.classList.remove('dimmed');
            }
            const hudHeader = document.getElementById('hud-header');
            const hudFooter = document.getElementById('hud-footer');
            if (hudHeader) hudHeader.classList.remove('hidden');
            if (hudFooter) hudFooter.classList.remove('hidden');

            this.isPlaying = true;
            this.roomNum = savedData.roomNum;
            this.score = savedData.score;
            this.kills = savedData.kills;
            this.mapWidth = 1320;
            this.mapHeight = 900;

            // 캔버스 크기 복구 및 가로폭 비례 조절
            this.canvas.width = this.mapWidth;
            this.canvas.height = this.mapHeight;
            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.style.maxWidth = '';
                gameContainer.style.setProperty('--map-width', this.mapWidth + 'px');
            }

            this.currentRoomType = savedData.currentRoomType || 'stat';
            this.weaponRoomCooldown = savedData.weaponRoomCooldown || 0;
            this.isEliteRoom = savedData.isEliteRoom || false;
            this.lastEnteredPortalClass = savedData.lastEnteredPortalClass || 'low';
            this.inSecretRoom = savedData.inSecretRoom || false;
            this.lastEnteredPortalDir = savedData.lastEnteredPortalDir || null;

            // [수정] 맵 프리셋 복구 설정 보존
            this.currentMapPreset = savedData.currentMapPreset || 'PRESET_SIZE_BOSS';

            // 플레이어 객체 생성 및 복구
            this.player = new Player(this.mapWidth / 2, this.mapHeight / 2);
            Object.assign(this.player, savedData.player);

            // 몬스터 및 오브젝트 엔티티 클리어
            this.monsters = [];
            this.bullets = [];
            this.particles = [];
            this.potions = [];
            this.coinsList = [];
            this.secretWalls = [];
            this.secretGlitchDevices = [];
            this.rewardChests = [];
            this.blueprintChests = [];
            this.vendingMachines = [];
            this.secretVendingMachines = [];
            this.weaponMerchants = []; // [신규] 무기 상인 NPC 리셋
            this.traps = [];
            this.obstacles = [];

            // [수정] 맵 격자 및 장애물 생성(generateGridMap)은 이 리스트 비우기가 끝난 시점에 이루어져야 합니다.
            // 또한 포털 복구 보정 연산을 위해 포털 셋업보다 먼저 실행되는 것이 보장됩니다.
            this.generateGridMap(this.currentMapPreset);

            // 펫 엔티티 복구
            const petCount = savedData.petsCount || 0;
            this.pets = [];
            for (let i = 0; i < petCount; i++) {
                let petAngle = i * (Math.PI * 2 / 3);
                let orbitRadius = 45 + Math.floor(i / 3) * 15;
                this.pets.push(new Pet(petAngle, orbitRadius));
            }

            // 방 및 스폰 구조 복구
            if (this.inSecretRoom) {
                // 비밀방 디바이스 복구
                this.secretGlitchDevices.push(new SecretGlitchDevice(this.mapWidth / 2, this.mapHeight / 2));

                const directions = ['top', 'bottom', 'left', 'right'];
                const chosenDir = directions[Math.floor(Math.random() * 4)];
                const exitPortal = new RoomPortal(chosenDir, this.getRandomScoreValue());

                exitPortal.portalType = savedData.exitPortalType || 'stat';
                exitPortal.difficultyClass = savedData.exitPortalDifficultyClass || 'mid';
                exitPortal.active = false;
                this.portals = [exitPortal];
            } else if (this.roomNum % 10 === 0) {
                // 보스방 복구
                this.setupBossRoom();
            } else {
                // 일반/엘리트 방 복구
                const lastRoomDifficultyScore = savedData.lastRoomDifficultyScore || this.getRandomScoreValue();
                this.queueSequentialSpawns(lastRoomDifficultyScore);

                // [수정] 세이브 데이터에 포털 정보가 보관되어 있으면 그대로 복구합니다.
                if (savedData.portals && savedData.portals.length > 0) {
                    this.portals = savedData.portals.map(pData => {
                        let portal = new RoomPortal(pData.direction, pData.scoreValue);
                        portal.portalType = pData.portalType;
                        portal.difficultyClass = pData.difficultyClass;
                        portal.active = pData.active;
                        return portal;
                    });
                } else {
                    // 폴백 (구버전 세이브 호환): 프리셋 유효 방향 포털 셋업
                    const presetName = this.currentMapPreset;
                    const validDirections = PORTAL_SPAWN_INFOS[presetName] ? Object.keys(PORTAL_SPAWN_INFOS[presetName]) : ['top', 'bottom', 'left', 'right'];

                    this.portals = [];
                    validDirections.forEach(dir => {
                        this.portals.push(new RoomPortal(dir, this.getRandomScoreValue()));
                    });

                    let types = this.generatePortalTypes();
                    this.portals.forEach((p, idx) => {
                        p.portalType = types[idx % types.length];
                    });

                    this.rankPortals();
                    this.portals.forEach(p => p.active = false);
                }
            }

            // [수정] generateGridMap 호출은 상단으로 당겨졌으므로 이 부분의 중복 생성을 안전하게 제거합니다.

            // 비밀 벽(균열) 재생성 (가변 맵 비율에 연동)
            if (savedData.hasSecretWall && this.roomNum % 10 !== 0 && this.roomNum > 1 && !this.inSecretRoom) {
                this.spawnSecretWall();
            }

            // 플레이어 리스폰 위치 복구 (가변 맵 크기에 비례하여 복구)
            if (this.lastEnteredPortalDir === 'center') {
                this.player.x = this.mapWidth / 2;
                this.player.y = this.mapHeight / 2 + 150;
            } else if (this.lastEnteredPortalDir === 'top') {
                this.player.x = this.mapWidth / 2;
                this.player.y = this.mapHeight - 90;
            } else if (this.lastEnteredPortalDir === 'bottom') {
                this.player.x = this.mapWidth / 2;
                this.player.y = 70;
            } else if (this.lastEnteredPortalDir === 'left') {
                this.player.x = this.mapWidth - 90;
                this.player.y = this.mapHeight / 2;
            } else if (this.lastEnteredPortalDir === 'right') {
                this.player.x = 70;
                this.player.y = this.mapHeight / 2;
            } else {
                this.player.x = this.mapWidth / 2;
                this.player.y = this.mapHeight / 2;
            }

            // HUD 및 프레임 60FPS 타이머 리셋
            this.updateHUD();
            this.lastTime = performance.now();
            this.accumulatedTime = 0;

            if (this.gameLoopId) {
                cancelAnimationFrame(this.gameLoopId);
            }
            this.gameLoopId = requestAnimationFrame(() => this.gameLoop());

            Sound.play('powerup');
            Sound.startBGM();
        } catch (e) {
            console.error("이어하기 복구 중 오류 발생:", e);
        }
    }

    // 코인 추가 유틸 치트
    addCoinsCheat(amount) {
        this.player.coins += amount;
        Sound.play('coin');
        this.showFloatingText(`+${amount} 📀`, this.player.x, this.player.y - 25, '#ffdf00');

        // HUD 갱신
        this.updateHUD();

        // 실시간 코인 HUD 연출
        const coinGainPopup = document.getElementById('coin-gain-popup');
        if (coinGainPopup) {
            coinGainPopup.innerText = `+${amount}`;
            coinGainPopup.style.color = '#ffdf00';
            coinGainPopup.style.textShadow = '0 0 10px rgba(255, 223, 0, 0.8)';
            coinGainPopup.classList.remove('hidden');
            coinGainPopup.classList.remove('animate');
            void coinGainPopup.offsetWidth; // 리플로우 강제
            coinGainPopup.classList.add('animate');

            if (coinGainPopup.cleanupTimer) clearTimeout(coinGainPopup.cleanupTimer);
            coinGainPopup.cleanupTimer = setTimeout(() => {
                coinGainPopup.classList.remove('animate');
                coinGainPopup.classList.add('hidden');
                coinGainPopup.innerText = '';
            }, 1000);
        }
    }

    // 무기 유형 변경 치트
    applyWeaponCheat(wpnType) {
        const p = this.player;

        if (wpnType === 'supercritical_plasma_fusion') {
            p.weaponLevels.fusion_plasma_cannon = Math.min(5, (p.weaponLevels.fusion_plasma_cannon || 0) + 1);
            p.weaponLevels.cryo_freezer = Math.min(5, (p.weaponLevels.cryo_freezer || 0) + 1);
            this.acquireWeapon('fusion_plasma_cannon');
            this.acquireWeapon('cryo_freezer');
        } else if (wpnType === 'crude_thorns' || wpnType === 'gravity_singularity_field') {
            p.weaponLevels[wpnType] = Math.min(5, (p.weaponLevels[wpnType] || 0) + 1);
            this.acquireWeapon(wpnType);
            this.showFloatingText(`THORNS UPGRADED: Lv.${p.weaponLevels[wpnType]} 🌵`, p.x, p.y - 40, '#ff00aa');
        } else if (wpnType === 'crude_trap' || wpnType === 'proximity_cyber_mine') {
            p.weaponLevels[wpnType] = Math.min(5, (p.weaponLevels[wpnType] || 0) + 1);
            this.acquireWeapon(wpnType);
            this.showFloatingText(`TRAP UPGRADED: Lv.${p.weaponLevels[wpnType]} 💣`, p.x, p.y - 40, '#ffdf00');
        } else if (wpnType === 'time') {
            p.magicType = 'timeWarp';
            this.showFloatingText("TIME WARP ENABLED ⏳", p.x, p.y - 40, '#00ff66');
        } else if (wpnType === 'energy_ball') {
            this.acquireWeapon('energy_ball');
        } else {
            // 개별 무기: 레벨 올리고 acquireWeapon 으로 안전 장착
            if (p.weaponLevels[wpnType] !== undefined) {
                p.weaponLevels[wpnType] = Math.min(5, (p.weaponLevels[wpnType] || 0) + 1);
            }
            this.acquireWeapon(wpnType);
        }

        p.updateWeaponType();
        this.updateHUD();
        this.syncCheatUIFromPlayer(); // 치트 창 텍스트 갱신

        let lvlText = "";
        if (wpnType !== 'energy_ball' && wpnType !== 'time' && p.weaponLevels[wpnType] !== undefined) {
            lvlText = ` (Lv.${p.weaponLevels[wpnType]})`;
        }
        this.showFloatingText(`WEAPON UPGRADED: ${wpnType.toUpperCase()}${lvlText}`, p.x, p.y - 40, '#39ff14');
    }

    // 장비 레벨 실시간 스탯 누적 변경 보정
    applyCheatEquipChange(equipName, newLevel) {
        const p = this.player;
        const oldLevel = p.equipLevels[equipName] || 0;
        if (oldLevel === newLevel) return;

        p.equipLevels[equipName] = newLevel;
        const diff = newLevel - oldLevel;

        switch (equipName) {
            case 'armor':
                p.maxHp += diff * 4;
                p.hp = Math.min(p.maxHp, Math.max(1, p.hp + diff * 4));
                break;
            case 'boots':
                p.maxStamina += diff * 4;
                p.stamina = Math.min(p.maxStamina, Math.max(0, p.stamina + diff * 4));
                break;
            case 'gloves':
                p.range += diff * 8;
                break;
            case 'helm':
                p.maxMp += diff * 8;
                break;
            case 'necklace':
                p.luk += diff * 0.05;
                break;
            case 'ring_mp':
                p.mpRegen = (p.mpRegen || 0) + diff * 0.3;
                break;
            case 'ring_hp':
                p.hpRegen += diff * 0.15;
                break;
            case 'ring_speed':
                p.ms += diff * 0.05;
                break;
            case 'ring_aspd':
                p.aspd += diff * 0.02;
                break;
            case 'ring_evd':
                p.evd = Math.min(0.75, Math.max(0, p.evd + diff * 0.01));
                break;
            case 'goggles':
                break;
        }

        if (newLevel === 5) {
            this.showFloatingText(`${equipName.toUpperCase()} LV.5 SPECIAL UNLOCKED`, p.x, p.y - 40, '#ff5e00');
        } else if (newLevel === 10) {
            this.showFloatingText(`${equipName.toUpperCase()} LV.10 OVERLIMIT ACTIVE`, p.x, p.y - 40, '#ffdf00');
        } else {
            this.showFloatingText(`${equipName.toUpperCase()} -> LV.${newLevel}`, p.x, p.y - 40, '#39ff14');
        }

        this.updateHUD();
    }

    // 방 클리어 치트
    clearRoomCheat() {
        if (this.monsters.length === 0 && this.spawnQueue.length === 0) {
            this.showFloatingText("ROOM ALREADY CLEARED", this.player.x, this.player.y - 20, '#ff0055');
            return;
        }

        // 폭발 파티클
        for (let m of this.monsters) {
            this.particles.push(new Particle(m.x, m.y, m.color, m.radius * 2, 0, 0, 20, 'explosionRing'));
        }

        this.monsters = [];
        this.spawnQueue = [];
        this.currentSpawnRemaining = 0;

        Sound.play('explosion');
        this.showFloatingText("CHEAT: ROOM CLEARED! 💥", this.player.x, this.player.y - 40, '#ffdf00');
    }

    // 스테이지 워프 치트
    warpStageCheat(targetStage) {
        if (targetStage < 1 || targetStage > 100) {
            this.showFloatingText("INVALID STAGE (1~100 ONLY)", this.player.x, this.player.y - 20, '#ff0055');
            return;
        }

        // 룸 전환용 가상 포털 생성 후 연동 (보스방 여부에 따라 portalType 분기)
        let mockPortal = {
            direction: 'top',
            scoreValue: (targetStage % 10 === 0) ? 0 : Math.floor(10 + targetStage * 0.4),
            portalType: (targetStage % 10 === 0) ? 'boss' : 'stat',
            difficultyClass: 'low'
        };
        this.roomNum = targetStage - 1; // transitionToNextRoom 내부에서 roomNum++이 되어 타겟 도달

        this.toggleCheatMenu(); // 워프 전 치트창 닫기
        this.transitionToNextRoom(mockPortal);

        this.showFloatingText(`WARPED TO ROOM ${targetStage} 🌀`, this.player.x, this.player.y - 40, '#ffdf00');
    }

    // [신규] 카드 획득 연출 지연 활성화 및 파티클 연출
    triggerPowerUpVisuals(cardData) {
        this.visualsSuspended = false;

        // 1. 대기 텍스트 한 번에 방출
        if (this.suspendedFloatingTexts && this.suspendedFloatingTexts.length > 0) {
            this.suspendedFloatingTexts.forEach(t => {
                this.showFloatingText(t.text, t.x, t.y, t.color);
            });
            this.suspendedFloatingTexts = [];
        }

        // 2. 희귀도별 파티클 분수 연출
        const rarity = cardData.rarity ? cardData.rarity.toUpperCase() : 'COMMON';
        let pColor = '#a0aec0'; // COMMON
        if (rarity === 'RARE') pColor = '#ffdf00';
        if (rarity === 'EPIC') pColor = '#b026ff';
        if (rarity === 'LEGENDARY') pColor = '#ff6c00';

        const p = this.player;
        if (p) {
            // [개선] 추가 획득 콤보 단계에 따른 파티클 스케일링 (양, 크기, 속도 대폭 향상)
            const comboMultiplier = 1 + (this.extraDrawCount * 0.5); // 1.0 -> 1.5 -> 2.0 -> 2.5 -> 3.0
            const particleCount = Math.floor(25 * comboMultiplier);

            for (let k = 0; k < particleCount; k++) {
                let pAngle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3); // 위쪽 방향
                let pSpeed = (Math.random() * 4 + 2) * (1 + this.extraDrawCount * 0.15); // 속도 스케일링
                let life = (Math.random() * 30 + 20) * (1 + this.extraDrawCount * 0.1); // 수명 스케일링
                this.particles.push(new Particle(
                    p.x + (Math.random() * 30 - 15),
                    p.y + p.radius,
                    pColor,
                    2.5 * (1 + this.extraDrawCount * 0.15), // 크기 스케일링
                    Math.cos(pAngle) * pSpeed,
                    Math.sin(pAngle) * pSpeed,
                    life,
                    'spark'
                ));
            }

            // 추가 획득 단계에 따라 화면 진동(Shake)도 단계적으로 강화
            if (this.extraDrawCount > 0) {
                this.shakeScreen(3.5 * this.extraDrawCount, 3.0); // 3.5px, 7px, 10.5px, 14px 강도로 흔듬
            }
        }

        // 3. 획득 효과음 재생 (추가 획득 단계에 따라 피치 상승)
        if (this.extraDrawCount > 0) {
            Sound.play('powerup', 1 + this.extraDrawCount * 0.15); // 1.15x -> 1.30x -> 1.45x -> 1.60x 피치업
        } else {
            Sound.play('powerup');
        }
    }

    // [신규] 레벨 게이지 ● / ○ 시각화
    buildLevelIndicator(currentLevel, maxLevel) {
        let dotsHtml = '';
        for (let i = 1; i <= maxLevel; i++) {
            if (i <= currentLevel) {
                dotsHtml += '<span class="dot filled">●</span>';
            } else {
                dotsHtml += '<span class="dot empty">○</span>';
            }
        }
        const isMaster = currentLevel >= maxLevel ? 'master' : '';
        const typeClass = maxLevel === 5 ? 'weapon' : 'equip';
        return `<span class="level-indicator ${typeClass} ${isMaster}">${dotsHtml}</span>`;
    }

    // [신규 기획] 제작소 오버레이 토글
    toggleCraftingMenu() {
        const craftingOverlay = document.getElementById('crafting-overlay');
        if (!craftingOverlay) return;

        if (craftingOverlay.classList.contains('hidden')) {
            // 열기
            craftingOverlay.classList.remove('hidden');
            this.craftingActiveTab = 'weapons';
            this.transmuteSelectedMats = []; // 변환 대기 배열 초기화

            // 탭 선택 클래스 활성화 상태 연동
            document.querySelectorAll('.crafting-tab-btn').forEach(btn => {
                if (btn.getAttribute('data-tab') === 'weapons') btn.classList.add('active');
                else btn.classList.remove('active');
            });

            this.refreshCraftingUI();
            Sound.play('powerup');
        } else {
            // 닫기
            craftingOverlay.classList.add('hidden');
            Sound.play('hit');
        }
    }

    // [신규 기획] 제작소 UI 리프레시 (재료 보유 현황 및 레시피 그리드 재생성)
    refreshCraftingUI() {
        try {
            // 1. 재료 보유 현황판 렌더링
            const matDisplay = document.getElementById('crafting-materials-display');
            if (!matDisplay) return;

            const materialNames = {
                short_rod: '짧은 막대기',
                long_rod: '긴 막대기',
                metal_plate: '넓은 판',
                blade: '칼날',
                wire: '전선',
                battery: '배터리',
                broken_flamethrower: '고장난 화방',
                cryo_cooler: '과냉각기',
                sensor_lens: '광학 렌즈',
                nanite_jar: '나노머신 병',
                hydraulic_cylinder: '유압 실린더'
            };

            let matsHtml = '';
            for (let key in this.player.materials) {
                let count = this.player.materials[key] || 0;
                let displayName = materialNames[key] || key;
                matsHtml += `
                    <div class="craft-material-item">
                        <span class="mat-name">${displayName}</span>
                        <span class="mat-count" style="color: ${count > 0 ? '#39ff14' : '#64748b'};">${count}</span>
                    </div>
                `;
            }
            matDisplay.innerHTML = matsHtml;

            const currentTab = this.craftingActiveTab || 'weapons';

            // 탭 가시성 처리
            const recipesGrid = document.getElementById('crafting-recipes-grid');
            const passivesGrid = document.getElementById('crafting-passives-grid');
            const transmuteView = document.getElementById('crafting-transmute-view');

            if (recipesGrid) recipesGrid.classList.add('hidden');
            if (passivesGrid) passivesGrid.classList.add('hidden');
            if (transmuteView) transmuteView.classList.add('hidden');

            // A. 무기 조합 탭 렌더링
            if (currentTab === 'weapons') {
                if (recipesGrid) {
                    recipesGrid.classList.remove('hidden');
                    let recipesHtml = '';
                    for (let wId in window.CRAFTING_RECIPES) {
                        const recipe = window.CRAFTING_RECIPES[wId];
                        if (recipe.type !== 'crude') continue; // 조잡한 무기만 제작소에서 직접 지원

                        const curLvl = this.player.weaponLevels[wId] || 0;
                        const isMax = curLvl >= 5;

                        let isReqMet = true;
                        let reqsHtml = '';

                        for (let matKey in recipe.materials) {
                            const reqCount = recipe.materials[matKey];
                            const curCount = this.player.materials[matKey] || 0;
                            const hasEnough = curCount >= reqCount;
                            if (!hasEnough) {
                                isReqMet = false;
                            }
                            const matName = materialNames[matKey] || matKey;
                            reqsHtml += `
                                <div class="recipe-req-item ${hasEnough ? 'met' : 'unmet'}">
                                    <span>${matName}</span>
                                    <span>${curCount} / ${reqCount}</span>
                                </div>
                            `;
                        }

                        // 최종 제작 가능 여부
                        const canCraft = isReqMet && !isMax;
                        const actionText = isMax ? 'MASTERED' : (curLvl > 0 ? `CRAFT (Lv.${curLvl} ➔ ${curLvl + 1})` : 'CRAFT (제작)');

                        recipesHtml += `
                            <div class="recipe-card" style="opacity: ${isMax ? 0.6 : 1.0};">
                                <div>
                                    <div class="recipe-header">
                                        <span class="recipe-title text-glow-blue">${recipe.name}</span>
                                        <span class="recipe-level">${curLvl > 0 ? `Lv.${curLvl}` : '미보유'}</span>
                                    </div>
                                    <p class="recipe-desc">${recipe.desc}</p>
                                    <div class="recipe-reqs">
                                        ${reqsHtml}
                                    </div>
                                </div>
                                <button class="craft-btn" ${canCraft ? '' : 'disabled'} onclick="window.gameEngine.craftWeapon('${wId}')">
                                    ${actionText}
                                </button>
                            </div>
                        `;
                    }
                    recipesGrid.innerHTML = recipesHtml;
                }
            }
            // B. 패시브 제작 탭 렌더링
            else if (currentTab === 'passives') {
                if (passivesGrid) {
                    passivesGrid.classList.remove('hidden');
                    let passivesHtml = '';
                    
                    if (this.player.acquiredBlueprints.length === 0) {
                        passivesHtml = `<div style="grid-column: span 2; text-align: center; color: #64748b; padding: 40px 0; font-size: 0.9rem;">획득한 패시브 설계도가 없습니다.<br><span style="font-size:0.75rem; color:#475569;">인게임 클리어 상자에서 설계도를 먼저 획득하십시오.</span></div>`;
                    } else {
                        this.player.acquiredBlueprints.forEach(pId => {
                            const item = window.PASSIVE_ITEMS[pId];
                            if (!item) return;

                            const isCrafted = this.player.craftedPassives.includes(pId);
                            let reqsHtml = '';
                            let isMatsMet = true;

                            for (let matKey in item.materials) {
                                const reqCount = item.materials[matKey];
                                const curCount = this.player.materials[matKey] || 0;
                                const hasEnough = curCount >= reqCount;
                                if (!hasEnough) {
                                    isMatsMet = false;
                                }
                                const matName = materialNames[matKey] || matKey;
                                reqsHtml += `
                                    <div class="recipe-req-item ${hasEnough ? 'met' : 'unmet'}" style="font-size: 0.72rem; padding: 2px 6px;">
                                        <span>${matName}</span>
                                        <span>${curCount} / ${reqCount}</span>
                                    </div>
                                `;
                            }

                            const canCraft = isMatsMet && !isCrafted;
                            const actionText = isCrafted ? 'EQUIPPED (장착 완료)' : 'CRAFT (제작)';
                            const rarityColor = item.rarity === 'common' ? '#39ff14' : (item.rarity === 'rare' ? '#00f0ff' : '#ffdf00');

                            passivesHtml += `
                                <div class="recipe-card" style="opacity: ${isCrafted ? 0.65 : 1.0}; border-color: ${isCrafted ? rarityColor : 'rgba(255,255,255,0.08)'};">
                                    <div>
                                        <div class="recipe-header">
                                            <span class="recipe-title" style="color: ${rarityColor}; text-shadow: 0 0 8px ${rarityColor}55; font-size: 0.95rem; font-weight: 800;">${item.name}</span>
                                            <span class="recipe-level" style="font-size: 0.7rem; color: ${rarityColor}; border-color: ${rarityColor}; padding: 1px 4px;">${item.rarity.toUpperCase()}</span>
                                        </div>
                                        <p class="recipe-desc" style="font-size: 0.78rem; margin: 4px 0 8px 0; min-height: 38px; color: #94a3b8; line-height: 1.35;">${item.desc}</p>
                                        <div class="recipe-reqs" style="margin-top: 6px;">
                                            ${reqsHtml}
                                        </div>
                                    </div>
                                    <button class="craft-btn" ${canCraft ? '' : 'disabled'} style="${isCrafted ? `background: ${rarityColor}; color: #000; font-weight: bold; border: none;` : ''}" onclick="window.gameEngine.craftPassive('${pId}')">
                                        ${actionText}
                                    </button>
                                </div>
                            `;
                        });
                    }
                    passivesGrid.innerHTML = passivesHtml;
                }
            }
            // C. 부품 변환기 탭 렌더링
            else if (currentTab === 'transmute') {
                if (transmuteView) {
                    transmuteView.classList.remove('hidden');
                    
                    // 투입 슬롯 3개 렌더링
                    let slotsHtml = '';
                    for (let i = 0; i < 3; i++) {
                        const mat = this.transmuteSelectedMats[i];
                        if (mat) {
                            const displayName = materialNames[mat] || mat;
                            slotsHtml += `
                                <div class="transmute-slot filled" onclick="window.gameEngine.removeTransmuteMat(${i})" style="border: 2px solid #00f0ff; background: rgba(0,240,255,0.1); border-radius: 8px; width: 90px; height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; text-align: center; font-size: 0.75rem; color: #fff; box-shadow: 0 0 10px rgba(0,240,255,0.15); position:relative;">
                                    <span>${displayName}</span>
                                    <span style="font-size: 0.65rem; color: #ff5e00; margin-top: 4px;">[클릭해제]</span>
                                </div>
                            `;
                        } else {
                            slotsHtml += `
                                <div class="transmute-slot empty" style="border: 2px dashed rgba(255,255,255,0.15); border-radius: 8px; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; color: #475569; font-size: 1.8rem; font-weight: bold; user-select: none;">
                                    +
                                </div>
                            `;
                        }
                    }

                    // 인벤토리 내 투입 가능한 부품 리스트 (보유량 > 0)
                    let inventoryHtml = '';
                    let hasAnyMat = false;
                    for (let key in this.player.materials) {
                        let count = this.player.materials[key] || 0;
                        // 대기실에 등록된 수량만큼 실시간 차감 반영하여 보여줌
                        let insideCount = this.transmuteSelectedMats.filter(m => m === key).length;
                        let availableCount = count - insideCount;

                        if (availableCount > 0) {
                            hasAnyMat = true;
                            let displayName = materialNames[key] || key;
                            inventoryHtml += `
                                <button class="codex-filter-btn" style="font-size: 0.72rem; padding: 4px 8px; text-transform: none; border-color: rgba(255,255,255,0.1);" onclick="window.gameEngine.addTransmuteMat('${key}')">
                                    ${displayName} (${availableCount}) +
                                </button>
                            `;
                        }
                    }
                    if (!hasAnyMat) {
                        inventoryHtml = `<span style="font-size: 0.8rem; color: #475569;">투입할 수 있는 재료 부품이 없습니다.</span>`;
                    }

                    // 결과 부품 지정 셀렉트 박스 구축
                    let selectOptions = '';
                    for (let key in materialNames) {
                        selectOptions += `<option value="${key}">${materialNames[key]}</option>`;
                    }

                    const canTransmute = this.transmuteSelectedMats.length === 3;

                    transmuteView.innerHTML = `
                        <div style="text-align: center; margin-bottom: 5px;">
                            <span style="color: #00f0ff; font-weight: bold; font-size: 0.95rem;">나노머신 입자 교환 변환기</span>
                            <p style="font-size: 0.72rem; color: #94a3b8; margin: 4px 0 12px 0;">동일/상이한 재료 부품 3개를 투입하여 원하는 부품 1개로 합성 변환합니다 (3:1 교환).</p>
                        </div>

                        <!-- 투입 슬롯 그룹 -->
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 12px; width: 100%;">
                            ${slotsHtml}
                        </div>

                        <!-- 투입 가능 인벤토리 목록 -->
                        <div style="width: 100%; text-align: center; margin-bottom: 12px;">
                            <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 6px;">[투입 가능한 인벤토리 부품 클릭]</span>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-height: 85px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                                ${inventoryHtml}
                            </div>
                        </div>

                        <!-- 출력 부품 지정 및 변환 버튼 -->
                        <div style="display: flex; align-items: center; gap: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; width: 100%; justify-content: center;">
                            <span style="font-size: 0.8rem; color: #fff;">변환 결과 지정:</span>
                            <select id="transmute-output-select" style="background: #0f172a; border: 1px solid #00f0ff; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; outline: none; box-shadow: 0 0 8px rgba(0,240,255,0.15);">
                                ${selectOptions}
                            </select>
                            <button class="craft-btn" ${canTransmute ? '' : 'disabled'} style="margin: 0; padding: 6px 20px; font-size: 0.82rem; height: auto;" onclick="window.gameEngine.executeTransmute()">
                                변환 가동 (3 ➔ 1)
                            </button>
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.error("refreshCraftingUI 에러 발생:", err);
            this.showFloatingText("CRAFTING UI ERROR: " + err.message, this.player.x, this.player.y - 30, '#ff0000');
        }
    }

    // [신규 기획] 제작 실행 (슬롯 초과 시 분해 교체 팝업 연동 및 안전한 자동 장착 탑재)
    craftWeapon(wId) {
        const recipe = window.CRAFTING_RECIPES[wId];
        if (!recipe) return;

        const curLvl = this.player.weaponLevels[wId] || 0;
        if (curLvl >= 5) {
            this.showFloatingText("ALREADY AT MAX LEVEL!", this.player.x, this.player.y - 30, '#ff5e00');
            return;
        }

        // [신규] 슬롯 초과 검증 (신규 무기 제작 시에만 가동)
        if (curLvl === 0) {
            let equippedGroups = this.player.equippedWeapons.map(w => this.getLegacyWeaponGroup(w))
                                      .filter(g => g !== 'gun');
            let thirdGroup = this.getLegacyWeaponGroup(this.player.thirdSlotWeapon);
            if (thirdGroup && thirdGroup !== 'gun') {
                equippedGroups.push(thirdGroup);
            }

            if (equippedGroups.length >= this.player.maxWeaponSlots) {
                // 슬롯 초과이므로 분해 교체 패널 오픈
                this.showCraftingReplacePanel(wId, equippedGroups);
                return;
            }
        }

        // 선행 무기 조건 체크
        if (recipe.reqWeapon) {
            const reqLvl = this.player.weaponLevels[recipe.reqWeapon] || 0;
            if (reqLvl < 1) {
                this.showFloatingText("REQUIRED PRE-WEAPON IS MISSING!", this.player.x, this.player.y - 30, '#ff5e00');
                return;
            }
        }

        // 재료 잔액 재체크
        for (let matKey in recipe.materials) {
            const reqCount = recipe.materials[matKey];
            const curCount = this.player.materials[matKey] || 0;
            if (curCount < reqCount) {
                this.showFloatingText("NOT ENOUGH MATERIALS!", this.player.x, this.player.y - 30, '#ff5e00');
                Sound.play('hit');
                return;
            }
        }

        // 재료 소모
        for (let matKey in recipe.materials) {
            this.player.materials[matKey] -= recipe.materials[matKey];
        }

        // 무기 부여/레벨 증가
        if (curLvl === 0) {
            this.player.weaponLevels[wId] = 1;
            // 안전 장착 호출 (첫 무기 제작 시 에너지볼 교체 및 슬롯 적재)
            this.acquireWeapon(wId);
            this.showFloatingText(`[CRAFTED] ${recipe.name} 🔨`, this.player.x, this.player.y - 45, '#39ff14');
        } else {
            this.player.weaponLevels[wId]++;
            this.showFloatingText(`[UPGRADED] ${recipe.name} Lv.${this.player.weaponLevels[wId]} 🔋`, this.player.x, this.player.y - 45, '#00f0ff');
        }

        // 플레이어 장착 무기 자동 갱신
        this.player.updateWeaponType();
        Sound.play('powerup');

        // UI 갱신
        this.refreshCraftingUI();
        this.updateHUD();
    }

    // [신규] 제작소 전용 무기 분해 선택 슬롯 오픈
    showCraftingReplacePanel(newWpnId, equippedGroups) {
        const panel = document.getElementById('crafting-replace-panel');
        const container = document.getElementById('crafting-replace-slots');
        if (!panel || !container) return;

        container.innerHTML = ''; // 초기화
        panel.classList.remove('hidden');

        equippedGroups.forEach(oldWpnGroup => {
            const btn = document.createElement('button');
            btn.className = 'replace-slot-btn';
            btn.style.borderColor = '#ff5e00';
            btn.style.color = '#ff5e00';
            btn.style.fontSize = '0.8rem';
            btn.style.padding = '5px 12px';
            btn.style.background = 'rgba(0, 0, 0, 0.6)';
            btn.style.border = '1px solid #ff5e00';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';

            const wpnName = this.getWeaponDisplayName(oldWpnGroup);
            let rawLevels = this.player.weaponLevels;
            let lvl = rawLevels[oldWpnGroup] || 1;

            btn.innerText = `[${wpnName} (Lv.${lvl})] 분해 후 제작`;
            btn.onclick = (e) => {
                e.stopPropagation();
                panel.classList.add('hidden');
                
                // 분해 후 제작 수행
                this.decomposeAndCraft(newWpnId, oldWpnGroup);
            };
            container.appendChild(btn);
        });
    }

    // [신규] 기존 무기 분해 및 새 무기 제작 연동 함수
    decomposeAndCraft(newWpnId, oldWpnGroup) {
        const newRecipe = window.CRAFTING_RECIPES[newWpnId];
        if (!newRecipe) return;

        // 재료 잔액 체크 (분해 전 보유 재료로 새 제작이 가능한지 선검증)
        for (let matKey in newRecipe.materials) {
            const reqCount = newRecipe.materials[matKey];
            const curCount = this.player.materials[matKey] || 0;
            if (curCount < reqCount) {
                this.showFloatingText("NOT ENOUGH MATERIALS!", this.player.x, this.player.y - 30, '#ff5e00');
                Sound.play('hit');
                return;
            }
        }

        // 1. 기존 무기군 분해 및 재료 30% 환급
        this.decomposeWeaponGroup(oldWpnGroup);

        // 2. 새 무기 제작을 위한 재료 소모
        for (let matKey in newRecipe.materials) {
            this.player.materials[matKey] -= newRecipe.materials[matKey];
        }

        // 3. 새 무기 부여 및 장착
        this.player.weaponLevels[newWpnId] = 1;
        this.acquireWeapon(newWpnId); // 새 무기 장착 (첫 무기일 시 기존 에너지볼 완전 교체 해제 적용)

        this.showFloatingText(`[CRAFTED] ${newRecipe.name} 🔨`, this.player.x, this.player.y - 45, '#39ff14');

        // 4. 상태 갱신
        this.player.updateWeaponType();
        Sound.play('powerup');
        this.refreshCraftingUI();
        this.updateHUD();
    }

    // [신규] 무기군 분해 및 30% 재료 반환 처리 (하위/상위/동종 레벨 완전 0 리셋)
    decomposeWeaponGroup(groupKey) {
        const groupToCrudeId = {
            sword: 'crude_sword',
            spear: 'crude_spear',
            whip: 'crude_whip',
            lightning: 'crude_shock',
            fire: 'crude_flamethrower',
            ice: 'crude_cryo',
            thorns: 'crude_thorns',
            trap: 'crude_trap',
            scythe: 'crude_scythe',
            railcannon: 'crude_rail',
            gun: 'energy_ball'
        };

        const crudeId = groupToCrudeId[groupKey];
        const recipe = window.CRAFTING_RECIPES[crudeId];
        const wpnName = this.getWeaponDisplayName(groupKey);

        let refunded = [];
        if (recipe) {
            for (let matKey in recipe.materials) {
                let reqCount = recipe.materials[matKey];
                let refundCount = Math.floor(reqCount * 0.3); // 소수점 내림 30% 환급
                if (refundCount > 0) {
                    this.player.materials[matKey] = (this.player.materials[matKey] || 0) + refundCount;
                    refunded.push(`${refundCount}개`);
                }
            }
        }

        // 해당 무기군에 속하는 모든 레벨 0 리셋 처리
        const legacyMapping = {
            sword: ['crude_sword', 'plasma_saber'],
            spear: ['crude_spear', 'energy_pilebunker'],
            whip: ['crude_whip', 'nano_laser_wire'],
            lightning: ['crude_shock', 'chain_emp_shock'],
            fire: ['crude_flamethrower', 'fusion_plasma_cannon'],
            ice: ['crude_cryo', 'cryo_freezer'],
            thorns: ['crude_thorns', 'gravity_singularity_field'],
            trap: ['crude_trap', 'proximity_cyber_mine'],
            scythe: ['crude_scythe', 'void_destroyer'],
            railcannon: ['crude_rail', 'tachyon_railgun'],
            gun: ['energy_ball']
        };

        if (legacyMapping[groupKey]) {
            legacyMapping[groupKey].forEach(k => {
                this.player.weaponLevels[k] = 0;
            });
        }
        this.player.weaponLevels[groupKey] = 0; // legacy 키 자체도 0 초기화

        // 장착 해제
        this.player.equippedWeapons = this.player.equippedWeapons.filter(w => this.getLegacyWeaponGroup(w) !== groupKey);
        if (this.getLegacyWeaponGroup(this.player.thirdSlotWeapon) === groupKey) {
            this.player.thirdSlotWeapon = null;
        }

        let refundText = refunded.length > 0 ? ` (부품 환급: ${refunded.join(', ')})` : ' (환급 부품 없음)';
        this.showFloatingText(`[분해 완료] ${wpnName} 분해됨 ♻️${refundText}`, this.player.x, this.player.y - 60, '#ff5e00');
    }

    craftPassive(pId) {
        const item = window.PASSIVE_ITEMS[pId];
        if (!item) return;

        if (this.player.craftedPassives.includes(pId)) {
            this.showFloatingText("ALREADY EQUIPPED!", this.player.x, this.player.y - 30, '#ffdf00');
            return;
        }

        // 재료 잔액 체크
        for (let matKey in item.materials) {
            const reqCount = item.materials[matKey];
            const curCount = this.player.materials[matKey] || 0;
            if (curCount < reqCount) {
                this.showFloatingText("NOT ENOUGH MATERIALS!", this.player.x, this.player.y - 30, '#ff5e00');
                Sound.play('hit');
                return;
            }
        }

        // 재료 소모
        for (let matKey in item.materials) {
            this.player.materials[matKey] -= item.materials[matKey];
        }

        // 패시브 획득 등록 및 스탯 효과 실시간 반영
        this.player.craftedPassives.push(pId);
        if (typeof this.player.applyPassiveEffects === 'function') {
            this.player.applyPassiveEffects(pId);
        }

        // 연출
        const rarityColor = item.rarity === 'common' ? '#39ff14' : (item.rarity === 'rare' ? '#00f0ff' : '#ffdf00');
        this.showFloatingText(`[CRAFTED] ${item.name} 🔮`, this.player.x, this.player.y - 45, rarityColor);
        Sound.play('powerup');

        // UI 갱신
        this.refreshCraftingUI();
        this.updateHUD();
    }

    addTransmuteMat(matKey) {
        if (this.transmuteSelectedMats.length >= 3) {
            this.showFloatingText("TRANSMUTER IS FULL! (MAX 3)", this.player.x, this.player.y - 30, '#ff5e00');
            return;
        }
        
        // 인벤토리 수량 검사
        let count = this.player.materials[matKey] || 0;
        let insideCount = this.transmuteSelectedMats.filter(m => m === matKey).length;
        if (count - insideCount <= 0) {
            this.showFloatingText("NO MORE OF THIS MATERIAL!", this.player.x, this.player.y - 30, '#ff5e00');
            return;
        }

        this.transmuteSelectedMats.push(matKey);
        Sound.play('coin');
        this.refreshCraftingUI();
    }

    removeTransmuteMat(idx) {
        if (idx >= 0 && idx < this.transmuteSelectedMats.length) {
            this.transmuteSelectedMats.splice(idx, 1);
            Sound.play('hit');
            this.refreshCraftingUI();
        }
    }

    executeTransmute() {
        if (this.transmuteSelectedMats.length !== 3) {
            this.showFloatingText("NEED EXACTLY 3 MATERIALS!", this.player.x, this.player.y - 30, '#ff5e00');
            return;
        }

        const selectEl = document.getElementById('transmute-output-select');
        const outputMat = selectEl ? selectEl.value : 'wire';

        // 3개 재료 차감
        this.transmuteSelectedMats.forEach(mat => {
            this.player.materials[mat] = Math.max(0, (this.player.materials[mat] || 0) - 1);
        });

        // 1개 결과물 지급
        this.player.materials[outputMat] = (this.player.materials[outputMat] || 0) + 1;

        // 변환 완료 후 대기 배열 초기화
        this.transmuteSelectedMats = [];

        // 화려한 네온 변환 연출 (파티클 15개)
        for (let k = 0; k < 15; k++) {
            let pAngle = Math.random() * Math.PI * 2;
            let pSpeed = Math.random() * 4 + 2;
            this.particles.push(new Particle(this.player.x, this.player.y, '#00f0ff', 2.5, Math.cos(pAngle) * pSpeed, Math.sin(pAngle) * pSpeed, 25));
        }

        this.showFloatingText("TRANSMUTATION SUCCESSFUL! 🧬", this.player.x, this.player.y - 45, '#00f0ff');
        Sound.play('powerup');

        this.refreshCraftingUI();
    }

    // [신규 기획] 무기 상인 NPC 메뉴 토글
    toggleNPCMenu() {
        const npcOverlay = document.getElementById('npc-overlay');
        if (!npcOverlay) return;

        if (npcOverlay.classList.contains('hidden')) {
            // 열기
            npcOverlay.classList.remove('hidden');
            this.npcActiveTab = 'trade';

            // 탭 선택 클래스 활성화 상태 연동
            document.querySelectorAll('.npc-tab-btn').forEach(btn => {
                if (btn.getAttribute('data-tab') === 'trade') btn.classList.add('active');
                else btn.classList.remove('active');
            });

            this.refreshNPCUI();
            Sound.play('powerup');
        } else {
            // 닫기
            npcOverlay.classList.add('hidden');
            Sound.play('hit');
        }
    }

    // [신규 기획] 무기 상인 NPC 상점 UI 리프레시
    refreshNPCUI() {
        // 코인 정보 갱신
        const coinDisplay = document.getElementById('npc-player-coins');
        if (coinDisplay) {
            coinDisplay.innerText = `📀 ${this.player.coins || 0}`;
        }

        // 재료 현황판 렌더링
        const matDisplay = document.getElementById('npc-materials-display');
        if (matDisplay) {
            const materialNames = {
                short_rod: '짧은 막대기',
                long_rod: '긴 막대기',
                metal_plate: '넓은 판',
                blade: '칼날',
                wire: '전선',
                battery: '배터리',
                broken_flamethrower: '고장난 화방',
                cryo_cooler: '과냉각기',
                sensor_lens: '광학 렌즈',
                nanite_jar: '나노머신 병',
                hydraulic_cylinder: '유압 실린더'
            };

            let matsHtml = '';
            for (let key in this.player.materials) {
                let count = this.player.materials[key] || 0;
                let displayName = materialNames[key] || key;
                matsHtml += `
                    <div class="craft-material-item" style="border-color: rgba(57, 255, 20, 0.25);">
                        <span class="mat-name" style="font-size: 0.72rem;">${displayName}</span>
                        <span class="mat-count" style="color: ${count > 0 ? '#39ff14' : '#64748b'}; font-size: 0.85rem;">${count}</span>
                    </div>
                `;
            }
            matDisplay.innerHTML = matsHtml;
        }

        const activeTab = this.npcActiveTab || 'trade';
        const tradeGrid = document.getElementById('npc-trade-grid');
        const evolveGrid = document.getElementById('npc-evolve-grid');

        if (!tradeGrid || !evolveGrid) return;

        if (activeTab === 'trade') {
            tradeGrid.classList.remove('hidden');
            evolveGrid.classList.add('hidden');

            const materialNames = {
                short_rod: '짧은 막대기',
                long_rod: '긴 막대기',
                metal_plate: '넓은 판',
                blade: '칼날',
                wire: '전선',
                battery: '배터리',
                broken_flamethrower: '고장난 화방',
                cryo_cooler: '과냉각기',
                sensor_lens: '광학 렌즈',
                nanite_jar: '나노머신 병',
                hydraulic_cylinder: '유압 실린더'
            };

            let tradeHtml = '';
            for (let key in this.player.materials) {
                const count = this.player.materials[key] || 0;
                const name = materialNames[key] || key;
                
                tradeHtml += `
                    <div class="recipe-card" style="border-color: rgba(57, 255, 20, 0.25); padding: 10px; display: flex; flex-direction: column; justify-content: space-between; background: rgba(0, 0, 0, 0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span class="recipe-title" style="color: #39ff14; font-size: 0.95rem; font-weight: bold;">${name}</span>
                            <span style="font-size: 0.85rem; color: #a0aec0;">보유: <b style="color: #ffffff;">${count}</b></span>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button class="craft-btn" onclick="window.gameEngine.buyMaterialFromNPC('${key}')" style="flex: 1; padding: 6px; font-size: 0.78rem; background: rgba(57, 255, 20, 0.1); border-color: #39ff14; color: #39ff14; cursor: pointer;" ${this.player.coins >= 15 ? '' : 'disabled'}>
                                구매 (15📀)
                            </button>
                            <button class="craft-btn" onclick="window.gameEngine.sellMaterialToNPC('${key}')" style="flex: 1; padding: 6px; font-size: 0.78rem; background: rgba(255, 0, 85, 0.05); border-color: #ff0055; color: #ff0055; cursor: pointer;" ${count > 0 ? '' : 'disabled'}>
                                판매 (7📀)
                            </button>
                        </div>
                    </div>
                `;
            }
            tradeGrid.innerHTML = tradeHtml;
        } else {
            tradeGrid.classList.add('hidden');
            evolveGrid.classList.remove('hidden');

            const materialNames = {
                short_rod: '짧은 막대기',
                long_rod: '긴 막대기',
                metal_plate: '넓은 판',
                blade: '칼날',
                wire: '전선',
                battery: '배터리',
                broken_flamethrower: '고장난 화방',
                cryo_cooler: '과냉각기',
                sensor_lens: '광학 렌즈',
                nanite_jar: '나노머신 병',
                hydraulic_cylinder: '유압 실린더'
            };

            let evolveHtml = '';
            for (let wId in window.CRAFTING_RECIPES) {
                const recipe = window.CRAFTING_RECIPES[wId];
                if (recipe.type !== 'advanced') continue;

                const curLvl = this.player.weaponLevels[wId] || 0;
                const isMax = curLvl >= 5;

                // 선행 무기 확인
                let isReqMet = true;
                let reqText = '';
                if (recipe.reqWeapon) {
                    const reqLvl = this.player.weaponLevels[recipe.reqWeapon] || 0;
                    const reqName = window.CRAFTING_RECIPES[recipe.reqWeapon] ? window.CRAFTING_RECIPES[recipe.reqWeapon].name : recipe.reqWeapon;
                    if (reqLvl < 1) {
                        isReqMet = false;
                        reqText = `<div class="recipe-req-item unmet">⚠️ 선행: ${reqName} 필요</div>`;
                    } else {
                        reqText = `<div class="recipe-req-item met" style="color: #39ff14;">✓ 선행: ${reqName} 보유</div>`;
                    }
                }

                // 재료 및 비용 확인
                let isMatsMet = true;
                let reqsHtml = reqText;
                for (let matKey in recipe.materials) {
                    const reqCount = recipe.materials[matKey];
                    const curCount = this.player.materials[matKey] || 0;
                    const hasEnough = curCount >= reqCount;
                    if (!hasEnough) isMatsMet = false;
                    
                    const matName = materialNames[matKey] || matKey;
                    reqsHtml += `
                        <div class="recipe-req-item ${hasEnough ? 'met' : 'unmet'}" style="font-size: 0.72rem;">
                            <span>${matName}</span>
                            <span>(${curCount} / ${reqCount})</span>
                        </div>
                    `;
                }

                const hasEnoughCoins = (this.player.coins || 0) >= 20;
                reqsHtml += `
                    <div class="recipe-req-item ${hasEnoughCoins ? 'met' : 'unmet'}" style="font-size: 0.72rem;">
                        <span>진화 튜닝 비용</span>
                        <span>(${this.player.coins || 0} / 20📀)</span>
                    </div>
                `;

                const canEvolve = isReqMet && isMatsMet && hasEnoughCoins && !isMax;
                const actionText = isMax ? 'MASTERED' : (curLvl > 0 ? `EVOLVE (Lv.${curLvl} ➔ ${curLvl + 1})` : 'EVOLVE (진화)');

                evolveHtml += `
                    <div class="recipe-card" style="border-color: rgba(57, 255, 20, 0.25); opacity: ${isMax ? 0.6 : 1.0}; display: flex; flex-direction: column; justify-content: space-between; padding: 10px; background: rgba(0, 0, 0, 0.3);">
                        <div>
                            <div class="recipe-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span class="recipe-title text-glow-green" style="color: #39ff14; font-weight: bold; font-size: 0.95rem;">${recipe.name}</span>
                                <span class="recipe-level" style="font-size: 0.78rem;">${curLvl > 0 ? `Lv.${curLvl}` : '미진화'}</span>
                            </div>
                            <p class="recipe-desc" style="font-size: 0.72rem; color: #a0aec0; margin: 3px 0 8px 0; line-height: 1.3;">${recipe.desc}</p>
                            <div class="recipe-reqs" style="background: rgba(0, 0, 0, 0.2); padding: 5px; border-radius: 4px;">
                                ${reqsHtml}
                            </div>
                        </div>
                        <button class="craft-btn" ${canEvolve ? '' : 'disabled'} onclick="window.gameEngine.evolveWeaponNPC('${wId}')" style="margin-top: 10px; width: 100%; border-color: #39ff14; color: #39ff14; background: rgba(57, 255, 20, 0.1); cursor: pointer;">
                            ${actionText}
                        </button>
                    </div>
                `;
            }
            evolveGrid.innerHTML = evolveHtml;
        }
    }

    // [신규 기획] NPC로부터 재료 구매
    buyMaterialFromNPC(matKey) {
        if (this.player.coins < 15) {
            this.showFloatingText("NOT ENOUGH COINS!", this.player.x, this.player.y - 30, '#ff0055');
            Sound.play('hit');
            return;
        }
        this.player.coins -= 15;
        this.player.materials[matKey] = (this.player.materials[matKey] || 0) + 1;
        this.showFloatingText(`+1 Purchased! 📦`, this.player.x, this.player.y - 30, '#39ff14');
        Sound.play('coin');
        this.refreshNPCUI();
        this.updateHUD();
    }

    // [신규 기획] NPC에게 재료 판매
    sellMaterialToNPC(matKey) {
        const count = this.player.materials[matKey] || 0;
        if (count <= 0) {
            this.showFloatingText("NO MATERIALS TO SELL!", this.player.x, this.player.y - 30, '#ff0055');
            Sound.play('hit');
            return;
        }
        this.player.materials[matKey]--;
        this.player.coins = (this.player.coins || 0) + 7;
        this.showFloatingText(`+7 📀 Earned!`, this.player.x, this.player.y - 30, '#fff01f');
        Sound.play('coin');
        this.refreshNPCUI();
        this.updateHUD();
    }

    // [신규 기획] NPC를 통한 무기 진화 및 강화
    evolveWeaponNPC(wId) {
        const recipe = window.CRAFTING_RECIPES[wId];
        if (!recipe) return;

        const curLvl = this.player.weaponLevels[wId] || 0;
        if (curLvl >= 5) {
            this.showFloatingText("ALREADY AT MAX LEVEL!", this.player.x, this.player.y - 30, '#ff5e00');
            return;
        }

        // 선행 무기 체크
        if (recipe.reqWeapon) {
            const reqLvl = this.player.weaponLevels[recipe.reqWeapon] || 0;
            if (reqLvl < 1) {
                this.showFloatingText("REQUIRED PRE-WEAPON IS MISSING!", this.player.x, this.player.y - 30, '#ff5e00');
                return;
            }
        }

        // 재료 잔액 재체크
        for (let matKey in recipe.materials) {
            const reqCount = recipe.materials[matKey];
            const curCount = this.player.materials[matKey] || 0;
            if (curCount < reqCount) {
                this.showFloatingText("NOT ENOUGH MATERIALS!", this.player.x, this.player.y - 30, '#ff5e00');
                Sound.play('hit');
                return;
            }
        }

        // 코인 체크
        if ((this.player.coins || 0) < 20) {
            this.showFloatingText("NOT ENOUGH COINS (NEED 20)!", this.player.x, this.player.y - 30, '#ff0055');
            Sound.play('hit');
            return;
        }

        // 재료 소모
        for (let matKey in recipe.materials) {
            this.player.materials[matKey] -= recipe.materials[matKey];
        }

        // 코인 소모
        this.player.coins -= 20;

        // 무기 부여/레벨 증가
        if (curLvl === 0) {
            this.player.weaponLevels[wId] = 1;
            // 보유 무기 슬롯에 신형 ID 추가
            if (!this.player.equippedWeapons.includes(wId)) {
                this.player.equippedWeapons.push(wId);
            }
            this.showFloatingText(`[EVOLVED] ${recipe.name} 🧬`, this.player.x, this.player.y - 45, '#39ff14');
        } else {
            this.player.weaponLevels[wId]++;
            this.showFloatingText(`[UPGRADED] ${recipe.name} Lv.${this.player.weaponLevels[wId]} 🔋`, this.player.x, this.player.y - 45, '#39ff14');
        }

        // 플레이어 장착 무기 자동 갱신
        this.player.updateWeaponType();
        Sound.play('powerup');

        // UI 갱신
        this.refreshNPCUI();
        this.updateHUD();
    }

    generateChargingStations() {
        this.chargingStations = [];
        let count = 1; // 맵마다 1개의 충전소 보장

        // 1. 2D 격자 맵 상에서 이동 가능한 바닥 타일(0) 수집 (경로 마진을 위해 외곽 2칸 안쪽 타일만 타겟팅)
        const validTiles = [];
        if (this.grid && Array.isArray(this.grid)) {
            for (let r = 2; r < 16; r++) {
                for (let c = 2; c < 22; c++) {
                    if (this.grid[r] && this.grid[r][c] === 0) {
                        validTiles.push({ gridX: c, gridY: r });
                    }
                }
            }
        }

        // 2. 플레이어의 초기 스폰 포인트로부터 200px 이상 떨어진 타일만 선별하여 초반 락 방지
        let filteredTiles = validTiles.filter(tile => {
            const tx = tile.gridX * 55 + 27.5;
            const ty = tile.gridY * 50 + 25;
            return Math.hypot(this.player.x - tx, this.player.y - ty) >= 200;
        });

        if (filteredTiles.length === 0) {
            filteredTiles = validTiles; // 예외 폴백
        }

        // 3. 필터링된 유효 바닥 타일 중 1개를 선택하여 해당 타일의 정중앙에 스폰
        for (let i = 0; i < count; i++) {
            if (filteredTiles.length > 0) {
                const randIdx = Math.floor(Math.random() * filteredTiles.length);
                const chosen = filteredTiles[randIdx];
                const x = chosen.gridX * 55 + 27.5;
                const y = chosen.gridY * 50 + 25;

                this.chargingStations.push({
                    x: x,
                    y: y,
                    radius: 45, // 충전 범위 반경 45px (기존 65px의 70% 수준으로 축소)
                    pulse: 0
                });

                // 중복 생성 방지를 위해 선택된 타일은 제외
                filteredTiles.splice(randIdx, 1);
            } else {
                // [폴백] 그리드 맵 정보가 유실되었거나 바닥이 없을 때만 보존용 난수 스폰 가동
                let x = Math.random() * (this.mapWidth - 300) + 150;
                let y = Math.random() * (this.mapHeight - 300) + 150;
                let distToPlayer = Math.hypot(this.player.x - x, this.player.y - y);
                if (distToPlayer < 200) {
                    x = (x + 300) % (this.mapWidth - 300) + 150;
                    y = (y + 300) % (this.mapHeight - 300) + 150;
                }
                this.chargingStations.push({ x: x, y: y, radius: 45, pulse: 0 });
            }
        }
    }

    drawChargingStation(ctx, cs) {
        try {
            ctx.save();
            cs.pulse = (cs.pulse + 0.05) % (Math.PI * 2);
            let pulseRadius = cs.radius * (1 + Math.sin(cs.pulse) * 0.1);

            // 1. 외부 네온 경계선 원 (호환성을 저해하는 setLineDash 제거)
            ctx.shadowBlur = 0; // 섀도우 초기화
            ctx.beginPath();
            ctx.arc(cs.x, cs.y, cs.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 208, 255, 0.18)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 2. 내부 실선 네온 원 (맥동)
            ctx.beginPath();
            ctx.arc(cs.x, cs.y, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 208, 255, 0.4)'; // 은은한 네온 처리
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d0ff';
            ctx.stroke();
            ctx.shadowBlur = 0; // 명시적 해제

            // 3. 충전소 중심 코어
            ctx.beginPath();
            ctx.arc(cs.x, cs.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00d0ff';
            ctx.fill();
            ctx.shadowBlur = 0; // 명시적 해제

            // 4. 충전소 레벨/텍스트 정보 렌더링
            ctx.font = '800 9px "Outfit"';
            ctx.fillStyle = '#00d0ff';
            ctx.textAlign = 'center';
            ctx.fillText(`CHARGE STATION (Lv.${this.chargingStationLevel})`, cs.x, cs.y - cs.radius - 8);

            ctx.shadowBlur = 0; // 최종 초기화 보장
            ctx.restore();
        } catch (e) {
            console.error("drawChargingStation 런타임 에러:", e);
        }
    }

    upgradeChargingStation() {
        if (!this.nearChargingStation) {
            this.showFloatingText("MUST BE IN CHARGING STATION RANGE!", this.player.x, this.player.y - 30, '#ff5e00');
            return;
        }

        let upgradeCost = this.chargingStationLevel * 5; // 레벨업 가격 공식
        if (this.player.coins < upgradeCost) {
            this.showFloatingText(`NEED ${upgradeCost} COINS! 📀`, this.player.x, this.player.y - 30, '#ffdf00');
            Sound.play('hit');
            return;
        }

        this.player.coins -= upgradeCost;
        this.chargingStationLevel++;
        this.showFloatingText(`STATION UPGRADED TO Lv.${this.chargingStationLevel}! 🔋`, this.player.x, this.player.y - 30, '#00ff66');
        Sound.play('powerup');
        this.updateHUD();
    }
}

// --------------------------------------------------------------------------
// [신규] 안드로이드 무기/장비 제작 부품 드롭 재료 클래스
// --------------------------------------------------------------------------
class DropMaterial {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'short_rod', 'blade' 등 11종
        this.radius = 12;
        this.active = true;
        this.vy = -2.5; // 드롭 시 위로 튀어오르는 관성
        this.vx = (Math.random() - 0.5) * 2;
        this.gravity = 0.15;
        this.bounceCount = 0;
        this.name = this.getMaterialName(type);
    }

    getMaterialName(type) {
        const names = {
            short_rod: '짧은 막대기',
            long_rod: '긴 막대기',
            metal_plate: '넓은 판',
            blade: '칼날',
            wire: '전선',
            battery: '배터리',
            broken_flamethrower: '고장난 화염방사기',
            cryo_cooler: '과냉각기',
            sensor_lens: '광학 렌즈',
            nanite_jar: '나노머신 병',
            hydraulic_cylinder: '유압 실린더'
        };
        return names[type] || '미지의 부품';
    }

    update(player) {
        // 물리 이동 (간단한 포물선 드롭 연출)
        if (this.vy !== 0 || this.vx !== 0) {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += this.gravity;

            // 바닥 도달 시 반사 튕김
            if (this.vy > 0 && this.bounceCount < 2) {
                this.vy = -this.vy * 0.4;
                this.vx *= 0.6;
                this.bounceCount++;
            } else if (this.bounceCount >= 2 && Math.abs(this.vy) < 0.2) {
                this.vy = 0;
                this.vx = 0;
            }
        }

        // 플레이어와 거리 측정하여 자석 흡수
        let dist = Math.hypot(player.x - this.x, player.y - this.y);
        let magnetRange = 120; // 120px 안으로 들어오면 자석 기믹 작동

        if (dist < magnetRange) {
            // 플레이어에게 끌려감
            let angle = Math.atan2(player.y - this.y, player.x - this.x);
            let speed = 4.5 + (magnetRange - dist) * 0.1; // 가까워질수록 빨라짐
            this.x += Math.cos(angle) * speed;
            this.y += Math.sin(angle) * speed;
        }
    }

    draw(ctx) {
        ctx.save();
        // 드롭 아이템 아이콘 (연두색 네온 링)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(57, 255, 20, 0.25)';
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#39ff14';
        ctx.fill();
        ctx.stroke();

        // 중심부 작은 하얀 원
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 간단한 텍스트 표시
        ctx.font = '800 8px "Outfit", "Noto Sans KR"';
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y - this.radius - 2);
        ctx.restore();
    }
}
