// --------------------------------------------------------------------------
// 맵 데이터 및 메커니즘 엔진 (MapEngine)
// --------------------------------------------------------------------------

// 40x30 그리드 타일맵 프리셋 데이터 정의 (0: 바닥, 1: 격벽, 2: 외벽)
const MAP_PRESETS = {
    PRESET_SIZE_NORMAL: [
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222000000000000000000000000000000002222",
        "2222000000000000000000000000000000002222",
        "2222000011111100000000000011111100002222",
        "2222000011111100000000000011111100002222",
        "2222000000000000000000000000000000002222",
        "2222000000000000000000000000000000002222",
        "2222000000001111111111111111000000002222",
        "2222000000001111111111111111000000002222",
        "2222000000000000000000000000000000002222",
        "2222000000000000000000000000000000002222",
        "0000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000",
        "2222000000000000000000000000000000002222",
        "2222000000000000000000000000000000002222",
        "2222000000001111111111111111000000002222",
        "2222000000001111111111111111000000002222",
        "2222000000000000000000000000000000002222",
        "2222000000000000000000000000000000002222",
        "2222000011111100000000000011111100002222",
        "2222000011111100000000000011111100002222",
        "2222000000000000000000000000000000002222",
        "2222000000000000000000000000000000002222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222"
    ],
    PRESET_SIZE_MIDDLE: [
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200001111000000000000000000001111000022",
        "2200001111000000000000000000001111000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "0000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200001111000000000000000000001111000022",
        "2200001111000000000000000000001111000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2200000000000000000000000000000000000022",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222"
    ],
    PRESET_SIZE_BOSS: [
        "2222222222222222222002222222222222222222",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "0000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2222222222222222222002222222222222222222"
    ],
    PRESET_LINE: [
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "0000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222",
        "2222222222222222222222222222222222222222"
    ],
    PRESET_WINDOW: [
        "2222222222222222222002222222222222222222",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "0000001111111111111111111111111100000000",
        "0000001111111111111111111111111100000000",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000001111111111111111111111111100000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2222222222222222222002222222222222222222"
    ],
    PRESET_U_SHAPE: [
        "2222222222222222222002222222222222222222",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "0000001111111111111111111111111111111112",
        "0000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000001111111111111111111111111111111112",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2000000000000000000000000000000000000002",
        "2222222222222222222002222222222222222222"
    ],
    PRESET_CROSS: [
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222220000000000000000000000000000222222",
        "2222220000000000000000000000000000222222",
        "2222220000000000000000000000000000222222",
        "2222220000000000000000000000000000222222",
        "0000000000000000000000000000000000000000",
        "0000000000000000000000000000000000000000",
        "2222220000000000000000000000000000222222",
        "2222220000000000000000000000000000222222",
        "2222220000000000000000000000000000222222",
        "2222220000000000000000000000000000222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222",
        "2222222222222222222002222222222222222222"
    ]
};

const PORTAL_SPAWN_INFOS = {
    PRESET_SIZE_NORMAL: {
        top: { x: 2200 / 2, y: 0.5 * 50, gridX: 19, gridY: 0 },
        bottom: { x: 2200 / 2, y: 29.5 * 50, gridX: 19, gridY: 29 },
        left: { x: 0.5 * 55, y: 1500 / 2, gridX: 0, gridY: 14 },
        right: { x: 39.5 * 55, y: 1500 / 2, gridX: 39, gridY: 14 }
    },
    PRESET_SIZE_MIDDLE: {
        top: { x: 2200 / 2, y: 0.5 * 50, gridX: 19, gridY: 0 },
        bottom: { x: 2200 / 2, y: 29.5 * 50, gridX: 19, gridY: 29 },
        left: { x: 0.5 * 55, y: 1500 / 2, gridX: 0, gridY: 14 },
        right: { x: 39.5 * 55, y: 1500 / 2, gridX: 39, gridY: 14 }
    },
    PRESET_SIZE_BOSS: {
        top: { x: 2200 / 2, y: 0.5 * 50, gridX: 19, gridY: 0 },
        bottom: { x: 2200 / 2, y: 29.5 * 50, gridX: 19, gridY: 29 },
        left: { x: 0.5 * 55, y: 1500 / 2, gridX: 0, gridY: 14 },
        right: { x: 39.5 * 55, y: 1500 / 2, gridX: 39, gridY: 14 }
    },
    PRESET_LINE: {
        left: { x: 0.5 * 55, y: 1500 / 2, gridX: 0, gridY: 14 },
        right: { x: 39.5 * 55, y: 1500 / 2, gridX: 39, gridY: 14 }
    },
    PRESET_WINDOW: {
        top: { x: 2200 / 2, y: 0.5 * 50, gridX: 19, gridY: 0 },
        bottom: { x: 2200 / 2, y: 29.5 * 50, gridX: 19, gridY: 29 },
        left: { x: 0.5 * 55, y: 1500 / 2, gridX: 0, gridY: 14 },
        right: { x: 39.5 * 55, y: 1500 / 2, gridX: 39, gridY: 14 }
    },
    PRESET_U_SHAPE: {
        top: { x: 2200 / 2, y: 0.5 * 50, gridX: 19, gridY: 0 },
        bottom: { x: 2200 / 2, y: 29.5 * 50, gridX: 19, gridY: 29 },
        left: { x: 0.5 * 55, y: 1500 / 2, gridX: 0, gridY: 14 },
        right: { x: 39.5 * 55, y: 1500 / 2, gridX: 39, gridY: 14 }
    },
    PRESET_CROSS: {
        top: { x: 2200 / 2, y: 0.5 * 50, gridX: 19, gridY: 0 },
        bottom: { x: 2200 / 2, y: 29.5 * 50, gridX: 19, gridY: 29 },
        left: { x: 0.5 * 55, y: 1500 / 2, gridX: 0, gridY: 14 },
        right: { x: 39.5 * 55, y: 1500 / 2, gridX: 39, gridY: 14 }
    }
};

// 방 레벨(층)에 따른 가변 맵 테마 정의
const SECTOR_THEMES = {
    cyberGrid: { // Sector 1: 1~9층 (시안/청록)
        bgColor: '#05070c',
        innerBgColor: '#090d16',
        outerBorder: 'rgba(0, 240, 255, 0.15)',
        innerBorder: 'rgba(0, 240, 255, 0.4)',
        gridColor: 'rgba(0, 240, 255, 0.04)'
    },
    volcanicCore: { // Sector 2: 11~19층 (용암 오렌지 레드)
        bgColor: '#100505',
        innerBgColor: '#1d0a0a',
        outerBorder: 'rgba(255, 51, 0, 0.2)',
        innerBorder: 'rgba(255, 51, 0, 0.5)',
        gridColor: 'rgba(255, 51, 0, 0.06)'
    },
    frozenVoid: { // Sector 3: 21~29층 (차가운 빙결 스카이블루)
        bgColor: '#050a12',
        innerBgColor: '#0a1322',
        outerBorder: 'rgba(0, 191, 255, 0.18)',
        innerBorder: 'rgba(0, 191, 255, 0.45)',
        gridColor: 'rgba(0, 191, 255, 0.05)'
    },
    overgrownLab: { // Sector 4: 31~39층 (비비드 네온 그린)
        bgColor: '#051008',
        innerBgColor: '#0a1d10',
        outerBorder: 'rgba(57, 255, 20, 0.18)',
        innerBorder: 'rgba(57, 255, 20, 0.45)',
        gridColor: 'rgba(57, 255, 20, 0.05)'
    },
    abyssalRift: { // Sector 5: 41~49층 (심연 마젠타 퍼절)
        bgColor: '#0d0514',
        innerBgColor: '#170a24',
        outerBorder: 'rgba(176, 38, 255, 0.2)',
        innerBorder: 'rgba(176, 38, 255, 0.5)',
        gridColor: 'rgba(176, 38, 255, 0.06)'
    },
    singularityCore: { // Sector 6: 50층 이상 (태양 골든 옐로우)
        bgColor: '#121005',
        innerBgColor: '#201d0a',
        outerBorder: 'rgba(255, 215, 0, 0.22)',
        innerBorder: 'rgba(255, 215, 0, 0.52)',
        gridColor: 'rgba(255, 215, 0, 0.06)'
    },
    voidMarket: { // 특수: 비밀방 (자홍/마젠타 암시장)
        bgColor: '#14051a',
        innerBgColor: '#22092c',
        outerBorder: 'rgba(255, 0, 127, 0.25)',
        innerBorder: 'rgba(255, 0, 127, 0.6)',
        gridColor: 'rgba(255, 0, 127, 0.08)'
    }
};



class MapEngine {
    constructor(gameEngine) {
        this.game = gameEngine; // GameEngine 코어 참조 바인딩
        this.cols = 40;
        this.rows = 30;
        this.mapRenderer = (typeof MapOffscreenRenderer !== 'undefined') ? new MapOffscreenRenderer() : null;
    }

    // 현재 맵 그리드 및 섹터 테마 기반으로 오프스크린 캔버스 재생성(Bake)
    bakeCurrentMap() {
        if (!this.game.grid) return;
        if (!this.mapRenderer && typeof MapOffscreenRenderer !== 'undefined') {
            this.mapRenderer = new MapOffscreenRenderer();
        }
        const theme = this.getSectorTheme(this.game.currentRoomNumber || 1, this.game.currentRoomType);
        if (this.mapRenderer) {
            this.mapRenderer.bakeMap(this.game.grid, theme);
        }
    }

    // 2차원 그리드 기반 맵 구조 생성 메서드
    generateGridMap(presetInput) {
        this.game.obstacles = [];
        let presetData = null;
        let presetKey = typeof presetInput === 'string' ? presetInput : (presetInput ? presetInput.presetKey : 'PRESET_SIZE_BOSS');

        if (typeof presetInput === 'string') {
            presetData = MAP_PRESETS[presetInput] || MAP_PRESETS.PRESET_SIZE_BOSS;
        } else if (presetInput && presetInput.grid) {
            presetData = presetInput.grid;
        } else {
            presetData = MAP_PRESETS.PRESET_SIZE_BOSS;
        }

        this.game.currentMapPreset = presetKey;

        // 문자열 배열 또는 2차원 배열 추출
        const gridLines = Array.isArray(presetData) ? presetData : (presetData.grid || []);
        this.rows = gridLines.length || 30;
        this.cols = gridLines[0] ? gridLines[0].length : 40;

        // 게임 엔진의 mapWidth, mapHeight 동적 업데이트 (타일당 가로 55px, 세로 50px)
        this.game.mapWidth = this.cols * 55;
        this.game.mapHeight = this.rows * 50;

        this.game.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.game.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const tileVal = gridLines[r] && gridLines[r][c] !== undefined ? parseInt(gridLines[r][c]) : 0;
                this.game.grid[r][c] = tileVal;

                // 1(일반 격벽) 또는 2(외벽)인 경우 NeonTileWall 벽 오브젝트 배치
                if (tileVal === 1 || tileVal === 2) {
                    this.game.obstacles.push(new NeonTileWall(c, r, tileVal));
                }
            }
        }

        // [포탈 입구 진입 보장 가드] 문 크기(정확히 2칸 타일)에 맞게 통로 바닥(0) 처리 및 겹치는 장애물 벽 제거
        let portalInfos = (presetInput && presetInput.portalSpawnInfo) ? presetInput.portalSpawnInfo : (PORTAL_SPAWN_INFOS[presetKey] || null);
        if (portalInfos) {
            for (let [dir, info] of Object.entries(portalInfos)) {
                if (info && info.gridX !== undefined && info.gridY !== undefined) {
                    const gx = info.gridX;
                    const gy = info.gridY;

                    if (dir === 'top' || dir === 'bottom') {
                        // 가로 문: 정확히 2칸 (gridX, gridX + 1)
                        for (let c = gx; c <= gx + 1; c++) {
                            if (c >= 0 && c < this.cols && gy >= 0 && gy < this.rows) {
                                this.game.grid[gy][c] = 0;
                            }
                        }
                        this.game.obstacles = this.game.obstacles.filter(obs => {
                            return !(obs.row === gy && (obs.col === gx || obs.col === gx + 1));
                        });
                    } else if (dir === 'left' || dir === 'right') {
                        // 세로 문: 정확히 2칸 (gridY, gridY + 1)
                        for (let r = gy; r <= gy + 1; r++) {
                            if (gx >= 0 && gx < this.cols && r >= 0 && r < this.rows) {
                                this.game.grid[r][gx] = 0;
                            }
                        }
                        this.game.obstacles = this.game.obstacles.filter(obs => {
                            return !(obs.col === gx && (obs.row === gy || obs.row === gy + 1));
                        });
                    }
                }
            }
        }

        // [최적화] 맵 그리드 생성 완료 후 오프스크린 캔버스 1회 프리렌더링(Bake)
        this.bakeCurrentMap();
    }

    // 커스텀 맵 프리셋 런타임 적용 및 즉시 방 재생성 테스트 기능
    loadCustomMapPreset(presetInput) {
        let presetName = typeof presetInput === 'string' ? presetInput : (presetInput ? presetInput.presetKey : null);
        let customObj = typeof presetInput === 'object' ? presetInput : null;

        if (presetName && !MAP_PRESETS[presetName] && !customObj) return;

        // 1. 격자 맵 데이터 파싱 및 장애물 재생성
        this.generateGridMap(customObj || presetName);

        // 2. 플레이어 안전 위치 워프
        this.game.player.x = this.game.mapWidth / 2;
        this.game.player.y = this.game.mapHeight / 2;
        this.game.lastEnteredPortalDir = 'center';

        // 3. 기존 오브젝트 제거
        this.game.bullets = [];
        this.game.monsters = [];
        this.game.particles = [];
        this.game.potions = [];
        this.game.coinsList = [];
        this.game.secretWalls = [];
        this.game.secretGlitchDevices = [];
        this.game.rewardChests = [];
        this.game.vendingMachines = [];
        this.game.secretVendingMachines = [];
        this.game.traps = [];

        // 4. 프리셋 내에 정의된 포털 위치에만 문 생성
        let portalInfo = customObj && customObj.portalSpawnInfo ? customObj.portalSpawnInfo : (presetName && PORTAL_SPAWN_INFOS[presetName] ? PORTAL_SPAWN_INFOS[presetName] : null);
        const validDirections = portalInfo ? Object.keys(portalInfo) : ['top', 'bottom', 'left', 'right'];
        this.game.portals = [];
        validDirections.forEach(dir => {
            this.game.portals.push(new RoomPortal(dir, this.game.getRandomScoreValue()));
        });

        // 포털 유형 지정 및 활성화 상태 리셋 (테스트용으로 몬스터 격퇴 전까지 잠금 처리)
        let types = this.game.generatePortalTypes();
        this.game.portals.forEach((p, idx) => {
            p.portalType = types[idx % types.length];
        });
        this.game.rankPortals();
        this.game.portals.forEach(p => p.active = false);

        // 5. 몬스터 스폰 큐 재생성
        const monsterCount = this.game.getRandomScoreValue();
        this.game.queueSequentialSpawns(monsterCount);

        this.game.updateHUD();
        this.game.showFloatingText("CUSTOM MAP APPLIED! 🛠️", this.game.player.x, this.game.player.y - 40, '#39ff14');

        // [최적화] 커스텀 맵 적용 후 오프스크린 캔버스 1회 Re-bake
        this.bakeCurrentMap();
    }

    // 2차원 그리드 정보를 분석하여 바닥 타일과 접하는 안전한 벽면에 비밀방 균열 벽을 스폰하는 메서드
    spawnSecretWall() {
        let spots = [];
        const rows = this.rows || (this.game.grid ? this.game.grid.length : 30);
        const cols = this.cols || (this.game.grid && this.game.grid[0] ? this.game.grid[0].length : 40);

        // 1) Top (상단)
        let topC = Math.floor(cols * 0.25);
        for (let r = 0; r < rows; r++) {
            if (this.game.grid[r] && this.game.grid[r][topC] === 0) {
                if (r > 0) {
                    let wType = this.game.grid[r - 1] ? this.game.grid[r - 1][topC] : 2;
                    spots.push({
                        col: topC,
                        row: r - 1,
                        wallX: topC * 55 + 27.5,
                        wallY: (r - 1) * 50 + 25,
                        dir: 'top',
                        type: wType
                    });
                }
                break;
            }
        }
        if (spots.filter(s => s.dir === 'top').length === 0) {
            for (let c = 2; c < cols - 2; c++) {
                let found = false;
                for (let r = 0; r < rows; r++) {
                    if (this.game.grid[r] && this.game.grid[r][c] === 0) {
                        if (r > 0) {
                            let wType = this.game.grid[r - 1] ? this.game.grid[r - 1][c] : 2;
                            spots.push({
                                col: c,
                                row: r - 1,
                                wallX: c * 55 + 27.5,
                                wallY: (r - 1) * 50 + 25,
                                dir: 'top',
                                type: wType
                            });
                            found = true;
                        }
                        break;
                    }
                }
                if (found) break;
            }
        }

        // 2) Bottom (하단)
        let botC = Math.floor(cols * 0.6);
        for (let r = rows - 1; r >= 0; r--) {
            if (this.game.grid[r] && this.game.grid[r][botC] === 0) {
                if (r < rows - 1) {
                    let wType = this.game.grid[r + 1] ? this.game.grid[r + 1][botC] : 2;
                    spots.push({
                        col: botC,
                        row: r + 1,
                        wallX: botC * 55 + 27.5,
                        wallY: (r + 1) * 50 + 25,
                        dir: 'bottom',
                        type: wType
                    });
                }
                break;
            }
        }
        if (spots.filter(s => s.dir === 'bottom').length === 0) {
            for (let c = cols - 3; c >= 2; c--) {
                let found = false;
                for (let r = rows - 1; r >= 0; r--) {
                    if (this.game.grid[r] && this.game.grid[r][c] === 0) {
                        if (r < rows - 1) {
                            let wType = this.game.grid[r + 1] ? this.game.grid[r + 1][c] : 2;
                            spots.push({
                                col: c,
                                row: r + 1,
                                wallX: c * 55 + 27.5,
                                wallY: (r + 1) * 50 + 25,
                                dir: 'bottom',
                                type: wType
                            });
                            found = true;
                        }
                        break;
                    }
                }
                if (found) break;
            }
        }

        // 3) Left (좌측)
        let leftR = Math.floor(rows * 0.3);
        for (let c = 0; c < cols; c++) {
            if (this.game.grid[leftR] && this.game.grid[leftR][c] === 0) {
                if (c > 0) {
                    let wType = this.game.grid[leftR][c - 1] !== undefined ? this.game.grid[leftR][c - 1] : 2;
                    spots.push({
                        col: c - 1,
                        row: leftR,
                        wallX: (c - 1) * 55 + 27.5,
                        wallY: leftR * 50 + 25,
                        dir: 'left',
                        type: wType
                    });
                }
                break;
            }
        }
        if (spots.filter(s => s.dir === 'left').length === 0) {
            for (let r = 2; r < rows - 2; r++) {
                let found = false;
                for (let c = 0; c < cols; c++) {
                    if (this.game.grid[r] && this.game.grid[r][c] === 0) {
                        if (c > 0) {
                            let wType = this.game.grid[r][c - 1] !== undefined ? this.game.grid[r][c - 1] : 2;
                            spots.push({
                                col: c - 1,
                                row: r,
                                wallX: (c - 1) * 55 + 27.5,
                                wallY: r * 50 + 25,
                                dir: 'left',
                                type: wType
                            });
                            found = true;
                        }
                        break;
                    }
                }
                if (found) break;
            }
        }

        // 4) Right (우측)
        let rightR = Math.floor(rows * 0.7);
        for (let c = cols - 1; c >= 0; c--) {
            if (this.game.grid[rightR] && this.game.grid[rightR][c] === 0) {
                if (c < cols - 1) {
                    let wType = this.game.grid[rightR][c + 1] !== undefined ? this.game.grid[rightR][c + 1] : 2;
                    spots.push({
                        col: c + 1,
                        row: rightR,
                        wallX: (c + 1) * 55 + 27.5,
                        wallY: rightR * 50 + 25,
                        dir: 'right',
                        type: wType
                    });
                }
                break;
            }
        }
        if (spots.filter(s => s.dir === 'right').length === 0) {
            for (let r = rows - 3; r >= 2; r--) {
                let found = false;
                for (let c = cols - 1; c >= 0; c--) {
                    if (this.game.grid[r] && this.game.grid[r][c] === 0) {
                        if (c < cols - 1) {
                            let wType = this.game.grid[r][c + 1] !== undefined ? this.game.grid[r][c + 1] : 2;
                            spots.push({
                                col: c + 1,
                                row: r,
                                wallX: (c + 1) * 55 + 27.5,
                                wallY: r * 50 + 25,
                                dir: 'right',
                                type: wType
                            });
                            found = true;
                        }
                        break;
                    }
                }
                if (found) break;
            }
        }

        if (spots.length === 0) return;

        // 후보 중 하나를 무작위 선택
        let chosenSpot = spots[Math.floor(Math.random() * spots.length)];

        // 겹치는 기존 격벽 장애물(NeonTileWall) 제거
        this.game.obstacles = this.game.obstacles.filter(obs => !(obs.col === chosenSpot.col && obs.row === chosenSpot.row));

        // 비밀 균열 외벽 생성 (새로운 생성자 스펙: col, row, dir, type)
        this.game.secretWalls.push(new SecretWall(chosenSpot.col, chosenSpot.row, chosenSpot.dir, chosenSpot.type));

        // [최적화] 비밀 벽 스폰으로 인한 격벽 제거 후 오프스크린 캔버스 1회 Re-bake
        this.bakeCurrentMap();
    }

    // 특정 픽셀 좌표가 타일 격벽(1) 또는 외벽(2)에 속해 있는지 판단하는 메서드
    isTileWall(x, y) {
        if (!this.game.grid) return false;
        const c = Math.floor(x / 55); // 가로 타일 너비 55px
        const r = Math.floor(y / 50); // 세로 타일 높이 50px
        const cols = this.cols || (this.game.grid && this.game.grid[0] ? this.game.grid[0].length : 40);
        const rows = this.rows || (this.game.grid ? this.game.grid.length : 30);
        if (c < 0 || c >= cols || r < 0 || r >= rows) return true; // 맵 범위 밖은 벽으로 간주
        const val = this.game.grid[r] ? this.game.grid[r][c] : undefined;
        return val === 1 || val === 2;
    }

    // 그리드 맵의 빈 공간(0인 곳) 중에서 무작위 셀을 선택하여 픽셀 좌표를 반환하는 메서드
    getSafeSpawnPosition(avoidPlayer = false, minDist = 200, maxAttempts = 100) {
        let attempts = 0;
        let safePositions = [];
        const rows = this.rows || (this.game.grid ? this.game.grid.length : 30);
        const cols = this.cols || (this.game.grid && this.game.grid[0] ? this.game.grid[0].length : 40);

        // 1. 우선 빈 타일(0) 수집
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (this.game.grid && this.game.grid[r] && this.game.grid[r][c] === 0) {
                    // 타일 중앙 픽셀 좌표 계산 (55px 가로 너비 보정)
                    const x = c * 55 + 27.5;
                    const y = r * 50 + 25;
                    safePositions.push({ x, y, r, c });
                }
            }
        }

        if (safePositions.length === 0) {
            // 빈 공간이 없다면 기본 맵 중앙 리턴
            return { x: this.game.mapWidth / 2, y: this.game.mapHeight / 2 };
        }

        // 2. 플레이어를 피해야 하는 경우 필터링 시도
        if (avoidPlayer && this.game.player) {
            while (attempts < maxAttempts) {
                const pos = safePositions[Math.floor(Math.random() * safePositions.length)];
                const dx = pos.x - this.game.player.x;
                const dy = pos.y - this.game.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= minDist) {
                    return { x: pos.x, y: pos.y };
                }
                attempts++;
            }
        }

        // 플레이어 피하기를 실패했거나 피할 필요가 없는 경우 랜덤 빈 타일 반환
        const pos = safePositions[Math.floor(Math.random() * safePositions.length)];
        return { x: pos.x, y: pos.y };
    }

    // 가변 맵 테마 정의 반환
    getSectorTheme(roomNum, roomType) {
        // 1. 101층 마젠타 에러 섹터 특별 연출
        if (roomNum === 101) {
            return {
                bgColor: '#000000',
                innerBgColor: '#050005',
                outerBorder: `rgba(255, 0, 255, ${0.15 + Math.random() * 0.15})`,
                innerBorder: 'rgba(255, 0, 255, 0.5)',
                gridColor: 'rgba(255, 0, 255, 0.015)'
            };
        }

        // 2. 비밀방 (Void Market) 테마
        if (roomType === 'secret_room') {
            return SECTOR_THEMES.voidMarket;
        }

        // 3. 보스방 (10의 배수 층) 테마 - 붉은색 사이렌 경보 연출
        if (roomNum > 0 && roomNum % 10 === 0) {
            const blink = 0.3 + Math.sin(Date.now() * 0.008) * 0.2;
            return {
                bgColor: '#0a0303',
                innerBgColor: '#140505',
                outerBorder: `rgba(255, 0, 55, ${blink * 0.7})`,
                innerBorder: `rgba(255, 0, 55, ${blink})`,
                gridColor: 'rgba(255, 0, 55, 0.03)'
            };
        }

        // 4. 일반 섹터 테마 분기
        if (roomNum >= 1 && roomNum <= 9) {
            return SECTOR_THEMES.cyberGrid;
        } else if (roomNum >= 11 && roomNum <= 19) {
            return SECTOR_THEMES.volcanicCore;
        } else if (roomNum >= 21 && roomNum <= 29) {
            return SECTOR_THEMES.frozenVoid;
        } else if (roomNum >= 31 && roomNum <= 39) {
            return SECTOR_THEMES.overgrownLab;
        } else if (roomNum >= 41 && roomNum <= 49) {
            return SECTOR_THEMES.abyssalRift;
        } else {
            // 50층 이상
            return SECTOR_THEMES.singularityCore;
        }
    }
}
