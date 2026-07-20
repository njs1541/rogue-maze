// --------------------------------------------------------------------------
// 2.5. 맵 오프스크린 캐싱 & 통합 네온 렌더러 (MapOffscreenRenderer)
// --------------------------------------------------------------------------
class MapOffscreenRenderer {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.cols = 0;
        this.rows = 0;
        this.tileW = 55;
        this.tileH = 50;
        this.grid = null;
        this.theme = null;
        this.innerWallTiles = []; // 오버레이 Pulse 효과용 (1번 타일 위치 목록)
        this.pulseTime = 0;
    }

    /**
     * 2차원 타일 그리드와 방 테마를 받아 오프스크린 캔버스에 벽면 전체를 프리렌더링(Bake)
     */
    bakeMap(grid, theme) {
        if (!grid || !grid.length) return;
        this.grid = grid;
        this.rows = grid.length;
        this.cols = grid[0].length;
        this.width = this.cols * this.tileW;
        this.height = this.rows * this.tileH;
        this.theme = theme || {
            bgColor: '#05070c',
            innerBgColor: '#090d16',
            outerBorder: 'rgba(0, 240, 255, 0.35)',
            innerBorder: 'rgba(0, 240, 255, 0.7)',
            gridColor: 'rgba(0, 240, 255, 0.05)'
        };

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        this.innerWallTiles = [];

        // 1. 스프라이트 타일셋 체크 (AssetManager 타일셋 이미지 존재 여부)
        const outerSprite = window.AssetManager ? window.AssetManager.get('wall_outer_tile') : null;
        const innerSprite = window.AssetManager ? window.AssetManager.get('wall_inner_tile') : null;

        const hasOuterSprite = outerSprite && outerSprite.complete && outerSprite.naturalWidth > 0;
        const hasInnerSprite = innerSprite && innerSprite.complete && innerSprite.naturalWidth > 0;

        // 2. 외벽 (Type 2) 통합 그리드 렌더링
        this._drawOuterWalls(ctx, hasOuterSprite ? outerSprite : null);

        // 3. 격벽 (Type 1) 모듈형 네온 렌더링
        this._drawInnerWalls(ctx, hasInnerSprite ? innerSprite : null);
    }

    _drawOuterWalls(ctx, sprite) {
        const grid = this.grid;
        const theme = this.theme;
        const tileW = this.tileW;
        const tileH = this.tileH;

        ctx.save();

        // 1) 외벽 영역 전체 베이스 채우기 & 빗금 파이프/해치 패턴
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (grid[r][c] === 2) {
                    const x = c * tileW;
                    const y = r * tileH;

                    if (sprite) {
                        ctx.drawImage(sprite, x, y, tileW, tileH);
                    } else {
                        // 베이스 배경 채우기 (어두운 사이버 섀도우)
                        ctx.fillStyle = '#05060d';
                        ctx.fillRect(x, y, tileW, tileH);

                        // 빗금 사이버 파이프 / 해치 패턴
                        ctx.beginPath();
                        ctx.strokeStyle = theme.outerBorder || 'rgba(255, 0, 85, 0.15)';
                        ctx.lineWidth = 1.0;

                        ctx.moveTo(x, y + 15);
                        ctx.lineTo(x + 35, y + tileH);

                        ctx.moveTo(x, y);
                        ctx.lineTo(x + tileW, y + tileH);

                        ctx.moveTo(x + 20, y);
                        ctx.lineTo(x + tileW, y + 35);

                        ctx.stroke();
                    }
                }
            }
        }

        // 2) 바닥(0) 또는 격벽(1)과 접하는 외벽 경계선(Outer Edge) 렌더링
        ctx.strokeStyle = theme.outerBorder || 'rgba(255, 0, 85, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = theme.outerBorder || 'rgba(255, 0, 85, 0.4)';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (grid[r][c] === 2) {
                    const x = c * tileW;
                    const y = r * tileH;

                    // 상/하/좌/우 중 바닥(0)이나 격벽(1)과 접하는지 체크
                    const topOther = r === 0 || grid[r - 1][c] !== 2;
                    const botOther = r === this.rows - 1 || grid[r + 1][c] !== 2;
                    const leftOther = c === 0 || grid[r][c - 1] !== 2;
                    const rightOther = c === this.cols - 1 || grid[r][c + 1] !== 2;

                    ctx.beginPath();
                    if (topOther) { ctx.moveTo(x, y); ctx.lineTo(x + tileW, y); }
                    if (botOther) { ctx.moveTo(x, y + tileH); ctx.lineTo(x + tileW, y + tileH); }
                    if (leftOther) { ctx.moveTo(x, y); ctx.lineTo(x, y + tileH); }
                    if (rightOther) { ctx.moveTo(x + tileW, y); ctx.lineTo(x + tileW, y + tileH); }
                    ctx.stroke();

                    // 모서리 접속 노드 (Corner Connector Point)
                    if ((topOther && leftOther) || (topOther && rightOther) || (botOther && leftOther) || (botOther && rightOther)) {
                        ctx.fillRect(x + tileW / 2 - 2.5, y + tileH / 2 - 2.5, 5, 5);
                    }
                }
            }
        }

        ctx.restore();
    }

    _drawInnerWalls(ctx, sprite) {
        const grid = this.grid;
        const theme = this.theme;
        const tileW = this.tileW;
        const tileH = this.tileH;

        ctx.save();

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (grid[r][c] === 1) {
                    const x = c * tileW;
                    const y = r * tileH;

                    this.innerWallTiles.push({ x, y, col: c, row: r });

                    if (sprite) {
                        ctx.drawImage(sprite, x, y, tileW, tileH);
                    } else {
                        // 모듈형 자홍/네온 격벽 패널 채우기
                        ctx.fillStyle = theme.innerBgColor || '#14081c';
                        ctx.fillRect(x, y, tileW, tileH);

                        // 패널 내측 테두리
                        ctx.strokeStyle = theme.innerBorder || 'rgba(255, 0, 170, 0.4)';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(x + 2, y + 2, tileW - 4, tileH - 4);

                        // 모듈 코너 앰블럼 (4개 모서리 회로 노드)
                        const cornerSize = 4;
                        ctx.fillStyle = theme.innerBorder || '#ff00aa';
                        ctx.fillRect(x + 4, y + 4, cornerSize, cornerSize);
                        ctx.fillRect(x + tileW - 4 - cornerSize, y + 4, cornerSize, cornerSize);
                        ctx.fillRect(x + 4, y + tileH - 4 - cornerSize, cornerSize, cornerSize);
                        ctx.fillRect(x + tileW - 4 - cornerSize, y + tileH - 4 - cornerSize, cornerSize, cornerSize);

                        // 중앙 하이테크 십자선 (Crossline)
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(255, 0, 170, 0.25)';
                        ctx.lineWidth = 1;
                        ctx.moveTo(x + tileW / 2, y + 6);
                        ctx.lineTo(x + tileW / 2, y + tileH - 6);
                        ctx.moveTo(x + 6, y + tileH / 2);
                        ctx.lineTo(x + tileW - 6, y + tileH / 2);
                        ctx.stroke();

                        // 코어 노드 포인트
                        ctx.fillRect(x + tileW / 2 - 1.5, y + tileH / 2 - 1.5, 3, 3);
                    }
                }
            }
        }

        ctx.restore();
    }

    /**
     * 메인 프레임 렌더링 (단 1회의 drawImage 호출!)
     */
    draw(ctx) {
        if (!this.canvas || !this.width) return;
        ctx.drawImage(this.canvas, 0, 0);

        // 은은한 동적 네온 맥동 오버레이
        this._drawPulseOverlay(ctx);
    }

    _drawPulseOverlay(ctx) {
        if (!this.innerWallTiles.length) return;
        const lowSpec = window.gameEngine && window.gameEngine.lowSpecMode;
        if (lowSpec) return; // 저사양 모드시 오버레이 생략

        this.pulseTime += 0.04;
        const pulse = (Math.sin(this.pulseTime) + 1) * 0.5; // 0.0 ~ 1.0

        ctx.save();
        ctx.beginPath();

        const theme = this.theme;
        const borderColor = theme.innerBorder || 'rgba(255, 0, 170, 0.6)';

        // 격벽 타일들의 외곽 테두리를 단 하나의 Path로 묶어 stroke 1회 수행!
        for (let i = 0; i < this.innerWallTiles.length; i++) {
            const tile = this.innerWallTiles[i];
            ctx.rect(tile.x + 2, tile.y + 2, this.tileW - 4, this.tileH - 4);
        }

        ctx.strokeStyle = borderColor;
        ctx.globalAlpha = 0.2 + pulse * 0.35; // 0.2 ~ 0.55 미세 맥동
        ctx.lineWidth = 2.0;
        ctx.stroke();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 2.5. 격자 기반 맵 타일 벽 클래스 (NeonTileWall)
// --------------------------------------------------------------------------
class NeonTileWall {
    constructor(col, row, type) {
        this.col = col; // 24열 인덱스 (0~23)
        this.row = row; // 18행 인덱스 (0~17)
        this.width = 55;  // 타일 가로 55px (1320px 가로 해상도 정렬)
        this.height = 50; // 타일 세로 50px
        this.type = type; // 1: 내부 격벽 (자홍), 2: 외곽 테두리 및 막힌 영역 (다크)

        // 중심 좌표 계산
        this.x = col * 55 + 27.5;
        this.y = row * 50 + 25;

        // 비주얼 테마 색상 설정
        if (this.type === 1) {
            this.color = '#ff00aa'; 
            this.glowColor = '#ff00aa';
        } else {
            // 외벽은 어두운 회색 네온선
            this.color = 'rgba(255, 255, 255, 0.05)';
            this.glowColor = 'transparent';
        }
        this.pulse = Math.random() * 100;
    }

    draw(ctx) {
        // type 2 (외벽)는 이동 불가 영역을 캔버스 배경과 확실히 구분할 수 있도록 렌더링
        if (this.type === 2) {
            ctx.save();
            // 플레이 불가 외벽은 짙은 청회색으로 채워 시인성 확보
            ctx.fillStyle = '#060810';
            ctx.fillRect(this.x - 27.5, this.y - 25, 55, 50);
            
            // 더 선명하고 굵은 붉은 네온 경고 테두리 (알파값 0.35로 대폭 강화)
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
            ctx.lineWidth = 2.0;
            ctx.strokeRect(this.x - 27.5, this.y - 25, 55, 50);

            // 경고 빗금선들 (여러 개 빗겨 그려 확실히 차단 영역임을 표시)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.18)';
            ctx.lineWidth = 1.2;
            
            // 3개의 경사 빗금선
            ctx.moveTo(this.x - 27.5, this.y - 10);
            ctx.lineTo(this.x + 12.5, this.y + 25);
            
            ctx.moveTo(this.x - 27.5, this.y - 25);
            ctx.lineTo(this.x + 27.5, this.y + 25);
            
            ctx.moveTo(this.x - 12.5, this.y - 25);
            ctx.lineTo(this.x + 27.5, this.y + 10);
            ctx.stroke();
            
            ctx.restore();
            return;
        }

        // type 1 (내부 격벽)은 화려한 자홍색 홀로그램 스타일로 렌더링
        // [최적화] shadowBlur 대신 고성능 겹쳐 그리기(Stroke Layering) 기법으로 렉 유발 요인을 완전 제거!
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.04;
        let scale = 1.0 + Math.sin(this.pulse) * 0.03; // 홀로그램 맥동 효과
        
        // 저사양/성능 최적화 모드가 아닐 때만 은은한 아우라 번짐선 1차 렌더링
        const lowSpec = window.gameEngine && window.gameEngine.lowSpecMode;
        if (!lowSpec) {
            ctx.beginPath();
            ctx.rect(-26.5 * scale, -24 * scale, 53 * scale, 48 * scale);
            ctx.fillStyle = 'rgba(255, 0, 170, 0.05)';
            ctx.strokeStyle = 'rgba(255, 0, 170, 0.22)';
            ctx.lineWidth = 4.5; // 두꺼운 네온 아우라 번짐선
            ctx.fill();
            ctx.stroke();
        } else {
            // 저사양 모드인 경우 심플 채우기만
            ctx.beginPath();
            ctx.rect(-26.5 * scale, -24 * scale, 53 * scale, 48 * scale);
            ctx.fillStyle = 'rgba(255, 0, 170, 0.08)';
            ctx.fill();
        }
        
        // 2차 밝은 코어 중심선 렌더링 (shadowBlur 제거로 렉 현상 박멸)
        ctx.beginPath();
        ctx.rect(-26.5 * scale, -24 * scale, 53 * scale, 48 * scale);
        ctx.strokeStyle = '#ff66cc'; // 매우 밝은 자홍 네온 코어선
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // 내부 데코레이션 X 격자선
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 170, 0.2)';
        ctx.lineWidth = 1;
        ctx.moveTo(-26.5 * scale, -24 * scale);
        ctx.lineTo(26.5 * scale, 24 * scale);
        ctx.moveTo(26.5 * scale, -24 * scale);
        ctx.lineTo(-26.5 * scale, 24 * scale);
        ctx.stroke();
        
        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6. 방(Room) 및 충돌 경계선 렌더링 클래스
// --------------------------------------------------------------------------
class RoomPortal {
    constructor(direction, scoreValue, x = null, y = null) {
        this.direction = direction; // 'top', 'bottom', 'left', 'right', 'secret'
        this.scoreValue = scoreValue; // 이 문을 지나갈 때의 몬스터 마릿수이자 점수
        this.width = 75;
        this.height = 18;
        this.active = true; // 현재 포털 활성화 상태 (전부 격퇴 시)
        this.difficultyClass = 'low'; // 'high', 'mid', 'low' 랭킹 등급 저장
        this.portalType = 'stat'; // 'stat', 'weapon', 'equipment', 'shop' - 신규 특화 속성 추가

        // 회전 처리를 위해 left, right는 세로 방향 문 크기 설정
        if (direction === 'left' || direction === 'right') {
            this.width = 18;
            this.height = 75;
        }

        // [신규] 2차원 그리드 프리셋별 스폰 위치 바인딩
        if (window.gameEngine && window.gameEngine.currentMapPreset && direction !== 'secret') {
            const presetName = window.gameEngine.currentMapPreset;
            const spawnInfo = PORTAL_SPAWN_INFOS[presetName] && PORTAL_SPAWN_INFOS[presetName][direction];
            if (spawnInfo) {
                // 문 스프라이트가 중앙 정렬로 그려지도록 오프셋 계산
                this.x = spawnInfo.x - this.width / 2;
                this.y = spawnInfo.y - this.height / 2;
                this.gridX = spawnInfo.gridX;
                this.gridY = spawnInfo.gridY;

                // [수정] 포탈이 외벽 가장자리 부근인 경우 외형 보정 연산 적용 (가변 cols, rows 동적 연산)
                let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 1200;
                let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 900;
                let cols = (window.gameEngine && window.gameEngine.mapEngine && window.gameEngine.mapEngine.cols) || 40;
                let rows = (window.gameEngine && window.gameEngine.mapEngine && window.gameEngine.mapEngine.rows) || 30;

                if (direction === 'left' && this.gridX <= 1) {
                    this.x = 50 - this.width / 2;
                } else if (direction === 'right' && this.gridX >= cols - 2) {
                    this.x = mapW - 50 - this.width / 2;
                } else if (direction === 'top' && this.gridY <= 1) {
                    this.y = 50 - this.height / 2;
                } else if (direction === 'bottom' && this.gridY >= rows - 2) {
                    this.y = mapH - 50 - this.height / 2;
                }
                return;
            }
        }

        // 예외 방어코드 (비밀방 차원문 및 상수가 로드되지 않은 시점)
        let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 1200;
        let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 900;

        // 방향별 좌표 바인딩 (동적 맵 크기에 비례하여 wallMargin = 50에 일치)
        if (direction === 'top') {
            this.x = mapW / 2 - this.width / 2;
            this.y = 50 - this.height / 2;
        } else if (direction === 'bottom') {
            this.x = mapW / 2 - this.width / 2;
            this.y = mapH - 50 - this.height / 2;
        } else if (direction === 'left') {
            this.x = 50 - this.width / 2;
            this.y = mapH / 2 - 75 / 2;
        } else if (direction === 'right') {
            this.x = mapW - 50 - this.width / 2;
            this.y = mapH / 2 - 75 / 2;
        } else if (direction === 'secret') {
            this.x = x;
            this.y = y;
            this.width = 40;
            this.height = 40;
            this.radius = 20; // 원형 포털 반경
            this.portalType = 'secret_room'; // 비밀방 차원 상점 진입 테마 매핑
        }
    }

    draw(ctx) {
        ctx.save();
        
        // [비밀 차원 포털 렌더링 예외 처리]
        if (this.direction === 'secret') {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // 뱅글뱅글 회전하는 프레임 각도 계산
            let spinAngle = (Date.now() * 0.005) % (Math.PI * 2);
            ctx.rotate(spinAngle);
            
            // 영롱한 차원 네온 서클 색상 분기
            let portalColor = '#b026ff';
            let portalGlow = '#b026ff';
            let portalBg = 'rgba(176, 38, 255, 0.18)';
            
            if (this.portalType === 'error_sector') {
                portalColor = '#ff00aa'; // 차원 붕괴 포털: 마젠타/자홍색
                portalGlow = '#ff00aa';
                portalBg = 'rgba(255, 0, 170, 0.18)';
            } else if (this.portalType === 'clear') {
                portalColor = '#00f0ff'; // 일반 탈출구: 청록색
                portalGlow = '#00f0ff';
                portalBg = 'rgba(0, 240, 255, 0.18)';
            }
            
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = portalBg;
            ctx.strokeStyle = portalColor;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = portalGlow;
            ctx.fill();
            ctx.stroke();
            
            // 내부 소용돌이 나선 이펙트 라인 3개
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            for (let k = 0; k < 3; k++) {
                let angleOffset = (k * Math.PI * 2) / 3;
                ctx.moveTo(0, 0);
                let targetX = Math.cos(angleOffset) * this.radius * 0.8;
                let targetY = Math.sin(angleOffset) * this.radius * 0.8;
                ctx.quadraticCurveTo(
                    Math.cos(angleOffset + 0.6) * this.radius * 0.5,
                    Math.sin(angleOffset + 0.6) * this.radius * 0.5,
                    targetX, targetY
                );
            }
            ctx.stroke();
            
            ctx.restore();
            
            // 포털 상단 공중 부유 홀로그램 크리스탈 아이콘
            ctx.save();
            ctx.font = '13px "Outfit", "Noto Sans KR"';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = portalGlow;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let iconText = "🔮";
            if (this.portalType === 'clear') iconText = "🚪";
            ctx.fillText(iconText, this.x, this.y - this.radius - 12);
            ctx.restore();
            
            ctx.restore();
            return; // 기존 직사각형 문 렌더링 로직 통째로 패스
        }
        
        // ---------------------------------------------------------
        // [수정] 차원문(RoomPortal) UI/UX 전면 개편 렌더링 시작
        // ---------------------------------------------------------
        
        // 포털 타입별 전용 네온 광채 컬러 정의 (잠김 상태는 일괄 붉은색)
        let color = '#ff0055'; 
        let bgStyle = 'rgba(255, 0, 85, 0.12)';
        
        if (this.active) {
            if (this.portalType === 'stat') {
                color = '#00f0ff'; // 청록색
                bgStyle = 'rgba(0, 240, 255, 0.12)';
            } else if (this.portalType === 'weapon') {
                color = '#b026ff'; // 보라색
                bgStyle = 'rgba(176, 38, 255, 0.12)';
            } else if (this.portalType === 'equipment') {
                color = '#ff6c00'; // 주황색
                bgStyle = 'rgba(255, 108, 0, 0.12)';
            } else if (this.portalType === 'shop') {
                color = '#ffdf00'; // 노란색
                bgStyle = 'rgba(255, 223, 0, 0.12)';
            }
        }

        const lowSpec = window.gameEngine && window.gameEngine.lowSpecMode;

        // 1. 지지 프레임(Frame Anchor Bracket) 및 게이트 패드 렌더링
        ctx.save();
        let isOuterWall = (this.gridX === 0 || this.gridX === 23 || this.gridY === 0 || this.gridY === 17);
        
        if (isOuterWall) {
            // [외곽 문]: 외벽용 다크 메탈릭 프레임
            ctx.strokeStyle = 'rgba(24, 30, 48, 0.85)';
            ctx.lineWidth = 2;
            if (this.direction === 'top' || this.direction === 'bottom') {
                ctx.strokeRect(this.x - 4, this.y - 2, 4, this.height + 4);
                ctx.strokeRect(this.x + this.width, this.y - 2, 4, this.height + 4);
                ctx.fillStyle = color;
                ctx.fillRect(this.x - 3, this.y + this.height / 2 - 2, 2, 4);
                ctx.fillRect(this.x + this.width + 1, this.y + this.height / 2 - 2, 2, 4);
            } else {
                ctx.strokeRect(this.x - 2, this.y - 4, this.width + 4, 4);
                ctx.strokeRect(this.x - 2, this.y + this.height, this.width + 4, 4);
                ctx.fillStyle = color;
                ctx.fillRect(this.x + this.width / 2 - 2, this.y - 3, 4, 2);
                ctx.fillRect(this.x + this.width / 2 - 2, this.y + this.height + 1, 4, 2);
            }
        } else {
            // [내부 격벽 문]: 자홍색 격벽 도킹 프레임 & 회로 어댑터
            let wallColor = 'rgba(255, 0, 170, 0.8)';
            let wallGlow = 'rgba(255, 102, 204, 0.9)';
            
            // 바닥 게이트 패드 (은은한 아우라)
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 170, 0.035)';
            ctx.fillRect(this.x - 4, this.y - 4, this.width + 8, this.height + 8);
            ctx.restore();
            
            ctx.strokeStyle = wallColor;
            ctx.lineWidth = 2;
            
            if (this.direction === 'top' || this.direction === 'bottom') {
                // 가로 문: 좌우 앵커 브래킷
                ctx.strokeRect(this.x - 4, this.y - 2, 4, this.height + 4);
                ctx.strokeRect(this.x + this.width, this.y - 2, 4, this.height + 4);
                
                // 가로형 격벽 연결 회로선 (좌우로 18px 뻗어나감)
                ctx.strokeStyle = 'rgba(255, 0, 170, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.x - 4, this.y + this.height / 2);
                ctx.lineTo(this.x - 22, this.y + this.height / 2);
                ctx.moveTo(this.x + this.width + 4, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width + 22, this.y + this.height / 2);
                ctx.stroke();
                
                // 도킹 노드 포인트
                ctx.fillStyle = wallGlow;
                ctx.fillRect(this.x - 3, this.y + this.height / 2 - 1.5, 2, 3);
                ctx.fillRect(this.x + this.width + 1, this.y + this.height / 2 - 1.5, 2, 3);
            } else {
                // 세로 문: 상하 앵커 브래킷
                ctx.strokeRect(this.x - 2, this.y - 4, this.width + 4, 4);
                ctx.strokeRect(this.x - 2, this.y + this.height, this.width + 4, 4);
                
                // 세로형 격벽 연결 회로선 (상하로 18px 뻗어나감)
                ctx.strokeStyle = 'rgba(255, 0, 170, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y - 4);
                ctx.lineTo(this.x + this.width / 2, this.y - 22);
                ctx.moveTo(this.x + this.width / 2, this.y + this.height + 4);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height + 22);
                ctx.stroke();
                
                // 도킹 노드 포인트
                ctx.fillStyle = wallGlow;
                ctx.fillRect(this.x + this.width / 2 - 1.5, this.y - 3, 3, 2);
                ctx.fillRect(this.x + this.width / 2 - 1.5, this.y + this.height + 1, 3, 2);
            }
        }
        ctx.restore();

        // 2. 겹쳐 그리기(Stroke Layering)를 통한 네온 아우라 효과
        if (!lowSpec) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.12;
            ctx.lineWidth = 7;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.globalAlpha = 0.28;
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }

        // 3. 포털 메인 에너지 실드 박스 드로잉
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = bgStyle;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        if (!lowSpec) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
        }
        ctx.fill();
        ctx.stroke();
        
        // 코어선 드로잉
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.width - 1, this.height - 1);
        ctx.restore();

        // 4. 에너지 흐름 효과 또는 잠김 상태 빗금 렌더링
        if (this.active) {
            // 활성화 상태: 흐르는 에너지 효과 및 스캔라인
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.clip();
            
            let timeOffset = (Date.now() * 0.06) % 100;
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.5;
            
            if (this.direction === 'top' || this.direction === 'bottom') {
                // 가로 주사선
                let lineX1 = this.x + (this.width * (timeOffset / 100));
                ctx.beginPath();
                ctx.moveTo(lineX1, this.y);
                ctx.lineTo(lineX1, this.y + this.height);
                ctx.stroke();
                
                let lineX2 = this.x + (this.width * (((timeOffset + 50) % 100) / 100));
                ctx.beginPath();
                ctx.moveTo(lineX2, this.y);
                ctx.lineTo(lineX2, this.y + this.height);
                ctx.stroke();
            } else {
                // 세로 주사선
                let lineY1 = this.y + (this.height * (timeOffset / 100));
                ctx.beginPath();
                ctx.moveTo(this.x, lineY1);
                ctx.lineTo(this.x + this.width, lineY1);
                ctx.stroke();
                
                let lineY2 = this.y + (this.height * (((timeOffset + 50) % 100) / 100));
                ctx.beginPath();
                ctx.moveTo(this.x, lineY2);
                ctx.lineTo(this.x + this.width, lineY2);
                ctx.stroke();
            }
            
            // 내부 도트 격자선 데코레이션
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.05;
            ctx.lineWidth = 1;
            if (this.direction === 'top' || this.direction === 'bottom') {
                for (let j = this.x + 8; j < this.x + this.width; j += 8) {
                    ctx.beginPath();
                    ctx.moveTo(j, this.y);
                    ctx.lineTo(j, this.y + this.height);
                    ctx.stroke();
                }
            } else {
                for (let j = this.y + 8; j < this.y + this.height; j += 8) {
                    ctx.beginPath();
                    ctx.moveTo(this.x, j);
                    ctx.lineTo(this.x + this.width, j);
                    ctx.stroke();
                }
            }
            ctx.restore();
        } else {
            // 잠김 상태: 홀로그램 빗금선
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.clip();
            
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.22)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            if (this.direction === 'top' || this.direction === 'bottom') {
                for (let k = -this.height; k < this.width; k += 10) {
                    ctx.moveTo(this.x + k, this.y);
                    ctx.lineTo(this.x + k + this.height, this.y + this.height);
                }
            } else {
                for (let k = -this.width; k < this.height; k += 10) {
                    ctx.moveTo(this.x, this.y + k);
                    ctx.lineTo(this.x + this.width, this.y + k + this.width);
                }
            }
            ctx.stroke();
            
            // LOCKED 텍스트 연출
            ctx.fillStyle = 'rgba(255, 0, 85, 0.45)';
            ctx.font = '900 8px "Outfit"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("LOCKED", this.x + this.width / 2, this.y + this.height / 2);
            ctx.restore();
        }

        // 둥근 사각형 그리기 보조 함수
        const drawRoundedRect = (gCtx, rx, ry, rw, rh, rRad) => {
            gCtx.beginPath();
            gCtx.moveTo(rx + rRad, ry);
            gCtx.lineTo(rx + rw - rRad, ry);
            gCtx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rRad);
            gCtx.lineTo(rx + rw, ry + rh - rRad);
            gCtx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rRad, ry + rh);
            gCtx.lineTo(rx + rRad, ry + rh);
            gCtx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rRad);
            gCtx.lineTo(rx, ry + rRad);
            gCtx.quadraticCurveTo(rx, ry, rx + rRad, ry);
            gCtx.closePath();
        };

        // 5. 몬스터 마릿수(점수) 네온 배지 & 텍스트 렌더링
        let textX = this.x + this.width / 2;
        let textY = this.y + this.height / 2;
        
        // 시인성을 위해 방향별 텍스트 출력 좌표 약간의 보정 오프셋 적용
        if (this.direction === 'top') textY -= 15;
        if (this.direction === 'bottom') textY += 15;
        if (this.direction === 'left') textX -= 18;
        if (this.direction === 'right') textX += 18;

        let badgeW = 24;
        let badgeH = 15;
        let badgeX = textX - badgeW / 2;
        let badgeY = textY - badgeH / 2;

        ctx.save();
        drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
        ctx.fillStyle = 'rgba(5, 6, 12, 0.88)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.0;
        if (!lowSpec) {
            ctx.shadowBlur = 6;
            ctx.shadowColor = color;
        }
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = '800 11px "Outfit"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.scoreValue, textX, textY);
        ctx.restore();

        // 6. 활성화 시 전용 네온 아이콘 부유 홀로그램 배지 렌더링
        if (this.active) {
            ctx.save();
            
            let icon = '📊';
            if (this.portalType === 'weapon') icon = '⚔️';
            if (this.portalType === 'equipment') icon = '🛡️';
            if (this.portalType === 'shop') icon = '🎰';

            let iconX = this.x + this.width / 2;
            let iconY = this.y + this.height / 2;
            
            if (this.direction === 'top') iconY += 17;
            if (this.direction === 'bottom') iconY -= 17;
            if (this.direction === 'left') iconX += 18;
            if (this.direction === 'right') iconX -= 18;

            let iconBadgeW = 20;
            let iconBadgeH = 20;
            let iconBadgeX = iconX - iconBadgeW / 2;
            let iconBadgeY = iconY - iconBadgeH / 2;

            drawRoundedRect(ctx, iconBadgeX, iconBadgeY, iconBadgeW, iconBadgeH, 5);
            ctx.fillStyle = 'rgba(5, 6, 12, 0.88)';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.0;
            if (!lowSpec) {
                ctx.shadowBlur = 6;
                ctx.shadowColor = color;
            }
            ctx.stroke();

            ctx.font = '12px "Outfit", "Noto Sans KR"';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, iconX, iconY);
            ctx.restore();
        }

        // 7. [ELITE] 마커 네온 배지 렌더링
        let nextRoomNum = window.gameEngine ? window.gameEngine.roomNum + 1 : 2;
        if (this.active && nextRoomNum % 5 === 0 && nextRoomNum % 10 !== 0) {
            if (this.difficultyClass === 'high' || this.difficultyClass === 'mid') {
                ctx.save();
                
                let eliteX = this.x + this.width / 2;
                let eliteY = this.y + this.height / 2;
                
                // 기존 아이콘 출력과의 마찰을 회피하기 위해 오프셋을 더 확장 적용
                if (this.direction === 'top') eliteY += 32;
                if (this.direction === 'bottom') eliteY -= 32;
                if (this.direction === 'left') eliteX += 34;
                if (this.direction === 'right') eliteX -= 34;

                let eliteColor = '#39ff14'; // 네온 그린
                ctx.font = '800 9px "Outfit"';
                ctx.fillStyle = eliteColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                let eliteText = "ELITE";
                let textWidth = ctx.measureText(eliteText).width;
                let eliteBadgeW = textWidth + 8;
                let eliteBadgeH = 13;
                let eliteBadgeX = eliteX - eliteBadgeW / 2;
                let eliteBadgeY = eliteY - eliteBadgeH / 2;

                drawRoundedRect(ctx, eliteBadgeX, eliteBadgeY, eliteBadgeW, eliteBadgeH, 3);
                ctx.fillStyle = 'rgba(5, 6, 12, 0.9)';
                ctx.fill();
                ctx.strokeStyle = eliteColor;
                ctx.lineWidth = 1.0;
                if (!lowSpec) {
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = eliteColor;
                }
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.fillText(eliteText, eliteX, eliteY);
                ctx.restore();
            }
        }

        ctx.restore();
    }

    // 플레이어가 문 안으로 깊숙이 진입했는지 영역 충돌 판단
    checkCollision(player) {
        if (!this.active) return false;
        
        if (this.direction === 'secret') {
            // 원형 포털과의 기하 충돌 판정
            return Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius;
        }
        
        // [수정] 포탈이 외곽 경계선에 걸쳐 있는 경우 및 가변 그리드 상에서의 문 진입 충돌 판단
        const pLeft = player.x - player.radius;
        const pRight = player.x + player.radius;
        const pTop = player.y - player.radius;
        const pBottom = player.y + player.radius;
        
        let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 1200;
        let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 900;
        let cols = (window.gameEngine && window.gameEngine.mapEngine && window.gameEngine.mapEngine.cols) || 40;
        let rows = (window.gameEngine && window.gameEngine.mapEngine && window.gameEngine.mapEngine.rows) || 30;

        const triggerMargin = 55; // 50px 경계선에 접근했을 때 문 진입 트리거 인식
        const expandMargin = 15; // 오프셋 영역 여유분

        if (this.direction === 'left') {
            if (this.gridX === undefined || this.gridX <= 2) {
                if (pLeft <= triggerMargin && player.y > this.y - expandMargin && player.y < this.y + this.height + expandMargin) return true;
            }
        } else if (this.direction === 'right') {
            if (this.gridX === undefined || this.gridX >= cols - 3) {
                if (pRight >= mapW - triggerMargin && player.y > this.y - expandMargin && player.y < this.y + this.height + expandMargin) return true;
            }
        } else if (this.direction === 'top') {
            if (this.gridY === undefined || this.gridY <= 3) {
                if (pTop <= triggerMargin && player.x > this.x - expandMargin && player.x < this.x + this.width + expandMargin) return true;
            }
        } else if (this.direction === 'bottom') {
            if (this.gridY === undefined || this.gridY >= rows - 4) {
                if (pBottom >= mapH - triggerMargin && player.x > this.x - expandMargin && player.x < this.x + this.width + expandMargin) return true;
            }
        }
        
        // 내부에 위치한 포탈의 유연한 AABB 충돌 검사
        return player.x + player.radius > this.x - expandMargin &&
               player.x - player.radius < this.x + this.width + expandMargin &&
               player.y + player.radius > this.y - expandMargin &&
               player.y - player.radius < this.y + this.height + expandMargin;
    }
}

// --------------------------------------------------------------------------
// 6.5. 맵 클리어 힐링 물약 클래스 (Neon Healing Potion)
// --------------------------------------------------------------------------
class NeonPotion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 10;
        this.color = '#39ff14'; // 네온 초록색
        this.pulse = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        this.pulse += 0.05;
        let scale = 1.0 + Math.sin(this.pulse) * 0.1;

        // 반짝이는 외부 오라 구체
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 내부 십자가 힐링 마크 렌더링
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        // 가로 선
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        // 세로 선
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.5.5. 드롭된 황금 네온 코인 클래스 (Neon Coin)
// --------------------------------------------------------------------------
class NeonCoin {
    constructor(x, y, amount = 1) {
        this.x = x;
        this.y = y;
        // 사방으로 통통 튕기는 속도
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.radius = 6;
        this.amount = amount;
        this.color = '#ffdf00'; // 황금색 네온
        this.pulse = Math.random() * 10;
        this.friction = 0.95; // 통통 튕기고 정지하는 마찰력
        this.isAttractedToPlayer = false; // [신규 기믹] 보상 상자 획득 시 전체 흡입 플래그
    }

    update(player, timeDilationActive) {
        // 통통 튕기며 서서히 감속 처리 (바닥에 안착)
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;

        // 자석 물리 기믹 연산
        let dist = Math.hypot(player.x - this.x, player.y - this.y);
        let pullRadius = 70; // 평소 자석 반경 70px
        
        // 시간 왜곡 중일 때는 맵 전역(무한) 자석 블랙홀 발동!
        if (timeDilationActive) {
            pullRadius = 1000; 
        }

        const isMovingToPlayer = this.isAttractedToPlayer || dist < pullRadius;

        // [수정] 내부 격벽 장애물(isTileWall) 충돌 감지 및 물리 반사 처리 (벽 갇힘 원천 봉쇄)
        // 플레이어에게 끌려가는 도중(isMovingToPlayer === true)일 때는 벽 통과를 허용하여 충돌 처리를 스킵합니다.
        if (!isMovingToPlayer && window.gameEngine && window.gameEngine.isTileWall) {
            const checkRadius = this.radius || 6;
            
            // X축 충돌 검사
            if (window.gameEngine.isTileWall(this.x, this.y) ||
                window.gameEngine.isTileWall(this.x - checkRadius, this.y) ||
                window.gameEngine.isTileWall(this.x + checkRadius, this.y)) {
                this.x -= this.vx; // 이전 위치 복귀
                this.vx = -this.vx * 0.7; // 감속 반사
            }
            
            // Y축 충돌 검사
            if (window.gameEngine.isTileWall(this.x, this.y) ||
                window.gameEngine.isTileWall(this.x, this.y - checkRadius) ||
                window.gameEngine.isTileWall(this.x, this.y + checkRadius)) {
                this.y -= this.vy; // 이전 위치 복귀
                this.vy = -this.vy * 0.7; // 감속 반사
            }
        }

        // 벽 마진선 이탈 방지
        // 플레이어에게 끌려가는 도중(isMovingToPlayer === true)일 때는 맵 경계선을 자연스럽게 통과해 흡수되도록 스킵합니다.
        if (!isMovingToPlayer) {
            const wallMargin = 50;
            let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
            let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;
            if (this.x < wallMargin + this.radius) { this.x = wallMargin + this.radius; this.vx = -this.vx; }
            if (this.x > mapW - wallMargin - this.radius) { this.x = mapW - wallMargin - this.radius; this.vx = -this.vx; }
            if (this.y < wallMargin + this.radius) { this.y = wallMargin + this.radius; this.vy = -this.vy; }
            if (this.y > mapH - wallMargin - this.radius) { this.y = mapH - wallMargin - this.radius; this.vy = -this.vy; }
        }

        // 보상 상자를 먹었을 때의 강제 전체 흡입 상태이거나 자석 범위 내에 있을 경우
        if (isMovingToPlayer) {
            // [버그 수정] 초근접(40px 미만) 도달 시 오르비팅(공전)과 터널링을 완전히 막기 위해 LERP 강제 유도 적용
            if (dist < 40) {
                this.x += (player.x - this.x) * 0.45;
                this.y += (player.y - this.y) * 0.45;
                this.vx = 0;
                this.vy = 0;
                return;
            }

            // 강제 흡입 상태일 때는 최고 가속도와 속도를 주어 번개처럼 날아가도록 세팅
            let pullForce = this.isAttractedToPlayer ? 18.0 : (timeDilationActive ? 12.0 : 4.0);
            
            // 거리 비례 가속
            let angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
            this.vx += Math.cos(angleToPlayer) * pullForce * 0.15;
            this.vy += Math.sin(angleToPlayer) * pullForce * 0.15;
            
            // 속도 상한선 제한 (초광속 방지 및 자연스러움)
            let currentSpeed = Math.hypot(this.vx, this.vy);
            let maxSpeed = this.isAttractedToPlayer ? 22.0 : (timeDilationActive ? 15.0 : 6.0);
            if (currentSpeed > maxSpeed) {
                this.vx = (this.vx / currentSpeed) * maxSpeed;
                this.vy = (this.vy / currentSpeed) * maxSpeed;
            }
            // 마찰 무시하고 강력 흡입
            this.friction = 1.0;
        } else {
            this.friction = 0.95;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        this.pulse += 0.08;
        let scale = 1.0 + Math.sin(this.pulse) * 0.15;

        // 황금빛 글로우 원형 코인
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 223, 0, 0.2)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 코인 내부의 C 심볼 혹은 중앙 노랑 네온 코어
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.5.6. 파괴 가능한 비밀 균열 벽 클래스 (Secret Wall)
// --------------------------------------------------------------------------
class SecretWall {
    constructor(col, row, direction, type) {
        this.col = col;
        this.row = row;
        this.dir = direction; // 'top', 'bottom', 'left', 'right'
        this.type = type; // 1: 내부 격벽 (자홍), 2: 외벽 (다크)
        
        // 격벽 1칸 전체 크기 지정
        this.width = 55;
        this.height = 50;
        
        // 중심 좌표 계산
        this.x = col * 55 + 27.5;
        this.y = row * 50 + 25;
        
        this.hp = 10; // 10회 가격 시 파괴
        this.hitCount = 0; // 누적 적중 공격수
        this.color = 'rgba(255, 255, 255, 0.08)'; // 던전 벽면과 거의 똑같이 동화되는 얇고 어두운 회백색 테두리
        this.glowColor = '#b026ff'; // 글리치 연출용 보랏빛
        this.flashTimer = 0;
        this.hitCooldown = 0; // 무적 시간 프레임
        this.pulse = Math.random() * 100;
    }

    update(game) {
        if (this.hitCooldown > 0) this.hitCooldown--;
        
        // 차원 고글 1레벨 이상 보유 시, 1.5% 확률로 은은한 보랏빛 스파크 방출
        const hasGoggles = game.player && game.player.equipLevels.goggles >= 1;
        if (hasGoggles && Math.random() < 0.015) {
            let rx = this.x + (Math.random() - 0.5) * this.width;
            let ry = this.y + (Math.random() - 0.5) * this.height;
            game.particles.push(new Particle(
                rx, ry, 
                this.glowColor, 
                1.2, 
                (Math.random() - 0.5) * 0.4, 
                (Math.random() - 0.5) * 0.4, 
                15, 
                'spark'
            ));
        }
    }

    draw(ctx) {
        const hasGoggles = window.gameEngine && window.gameEngine.player && window.gameEngine.player.equipLevels.goggles >= 1;
        
        // [완벽 은닉] 한 번도 때리지 않았고 차원 고글도 없는 경우, 기존 NeonTileWall과 100% 동일하게 렌더링
        if (this.hitCount === 0 && !hasGoggles) {
            ctx.save();
            if (this.type === 2) {
                // 외벽(type 2) 원래 렌더링 방식과 동일하게 채우기 및 테두리/빗금 그리기
                ctx.fillStyle = '#060810';
                ctx.fillRect(this.x - 27.5, this.y - 25, 55, 50);
                
                ctx.strokeStyle = 'rgba(255, 0, 85, 0.35)';
                ctx.lineWidth = 2.0;
                ctx.strokeRect(this.x - 27.5, this.y - 25, 55, 50);

                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 0, 85, 0.18)';
                ctx.lineWidth = 1.2;
                
                ctx.moveTo(this.x - 27.5, this.y - 10);
                ctx.lineTo(this.x + 12.5, this.y + 25);
                
                ctx.moveTo(this.x - 27.5, this.y - 25);
                ctx.lineTo(this.x + 27.5, this.y + 25);
                
                ctx.moveTo(this.x - 12.5, this.y - 25);
                ctx.lineTo(this.x + 27.5, this.y + 10);
                ctx.stroke();
            } else {
                // 내부 격벽(type 1) 원래 렌더링 방식과 동일하게 자홍색 홀로그램 그리기
                ctx.translate(this.x, this.y);
                this.pulse += 0.04;
                let scale = 1.0 + Math.sin(this.pulse) * 0.03;
                
                const lowSpec = window.gameEngine && window.gameEngine.lowSpecMode;
                if (!lowSpec) {
                    ctx.beginPath();
                    ctx.rect(-26.5 * scale, -24 * scale, 53 * scale, 48 * scale);
                    ctx.fillStyle = 'rgba(255, 0, 170, 0.05)';
                    ctx.strokeStyle = 'rgba(255, 0, 170, 0.22)';
                    ctx.lineWidth = 4.5;
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.rect(-26.5 * scale, -24 * scale, 53 * scale, 48 * scale);
                    ctx.fillStyle = 'rgba(255, 0, 170, 0.08)';
                    ctx.fill();
                }
                
                ctx.beginPath();
                ctx.rect(-26.5 * scale, -24 * scale, 53 * scale, 48 * scale);
                ctx.strokeStyle = '#ff66cc';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 0, 170, 0.2)';
                ctx.lineWidth = 1;
                ctx.moveTo(-26.5 * scale, -24 * scale);
                ctx.lineTo(26.5 * scale, 24 * scale);
                ctx.moveTo(26.5 * scale, -24 * scale);
                ctx.lineTo(-26.5 * scale, 24 * scale);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        ctx.save();
        
        // 3회 이상 공격당했을 때 글리치 떨림 및 잔상 계산
        let shakeX = 0;
        let shakeY = 0;
        if (this.hitCount >= 3) {
            shakeX = (Math.random() * 2 - 1) * 3;
            shakeY = (Math.random() * 2 - 1) * 3;
        }

        ctx.translate(this.x + shakeX, this.y + shakeY);

        let isGogglesReveal = (this.hitCount === 0 && hasGoggles);

        // 피격 시 백색 깜빡임 피드백
        if (this.flashTimer > 0) {
            this.flashTimer--;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ffffff';
        } else if (isGogglesReveal) {
            // 고글로 탐지된 상태이고 한 번도 안 맞은 경우: 은은한 보랏빛 점선 테두리 및 반투명 채우기
            ctx.fillStyle = 'rgba(176, 38, 255, 0.04)';
            ctx.strokeStyle = 'rgba(176, 38, 255, 0.5)'; // 은은한 보라 테두리
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#b026ff';
        } else {
            // 공격을 받기 시작한 경우: 더 뚜렷한 글리치 보라 테두리 및 반투명 채우기
            ctx.fillStyle = 'rgba(176, 38, 255, 0.08)';
            ctx.strokeStyle = 'rgba(176, 38, 255, 0.7)';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#b026ff';
        }

        ctx.lineWidth = 2.0;
        ctx.beginPath();
        if (isGogglesReveal) {
            ctx.setLineDash([4, 4]); // 점선 효과 적용
        }
        // 타일 1칸 전체 영역(55x50) 사각형 드로잉
        ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        if (isGogglesReveal) {
            ctx.setLineDash([]); // 점선 해제
        }

        // [요구사항 반영] 기존의 얇은 크랙 노이즈 드로잉 방식을 주석처리합니다.
        /* 
        for (let k = 0; k < 3; k++) {
            if (this.width > this.height) { // 가로 벽
                let rx = -this.width / 2 + Math.random() * this.width;
                let ry = -this.height / 2 + Math.random() * this.height;
                ctx.moveTo(rx - 15, ry);
                ctx.lineTo(rx + 15, ry);
            } else { // 세로 벽
                let rx = -this.width / 2 + Math.random() * this.width;
                let ry = -this.height / 2 + Math.random() * this.height;
                ctx.moveTo(rx, ry - 15);
                ctx.lineTo(rx, ry + 15);
            }
        }
        ctx.stroke();
        */

        // [요구사항 반영] 현재 방식으로 생성된 비밀방 위치의 격벽 1칸 전체에 노이즈를 그립니다.
        if (this.hitCount > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.glowColor;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.glowColor;

            // 격벽 1칸 전체 영역 내에 무작위 크랙/글리치 노이즈 선 5개 드로잉
            for (let k = 0; k < 5; k++) {
                let x1 = -this.width / 2 + Math.random() * this.width;
                let y1 = -this.height / 2 + Math.random() * this.height;
                let x2 = x1 + (Math.random() * 24 - 12);
                let y2 = y1 + (Math.random() * 24 - 12);
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        }

        // 3회 이상 타격 시 GLITCH 텍스트 타일 한가운데 노출
        if (this.hitCount >= 3) {
            if (Math.random() < 0.08) {
                ctx.fillStyle = this.glowColor;
                ctx.font = '800 10px "Outfit"';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.glowColor;
                ctx.fillText("GLITCH", 0, 4);
            }
        }

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.5.7. 비밀방 전용 상호작용 글리치 장치 클래스 (Secret Glitch Device)
// --------------------------------------------------------------------------
class SecretGlitchDevice {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 22;
        this.color = '#b026ff'; // 차원 보랏빛 네온 테마
        this.pulse = 0;
        this.active = true;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.05;
        let scale = 1.0 + Math.sin(this.pulse) * 0.08;

        // 글리치 보랏빛 에너지 아우라 서클
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(176, 38, 255, 0.15)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 내부의 뱅글뱅글 핵심 코어
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 상호작용 텍스트 가이드
        ctx.font = '800 10px "Outfit"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText("CRASH TO ACTIVATE", 0, -this.radius - 8);

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.6. 네온 보상 상자 클래스 (Reward Chest)
// --------------------------------------------------------------------------
class RewardChest {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'stat', 'weapon', 'equipment'
        this.width = 36;
        this.height = 26;
        this.color = type === 'stat' ? '#00f0ff' : (type === 'weapon' ? '#b026ff' : '#ff6c00');
        this.pulse = 0;
        this.active = true;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.04;
        let bounceY = Math.sin(this.pulse) * 4;
        let scale = 1.0 + Math.sin(this.pulse) * 0.05;
        ctx.translate(0, bounceY);
        
        // 외부 발광 글로우 사각형
        ctx.beginPath();
        ctx.rect(-this.width/2 * scale, -this.height/2 * scale, this.width * scale, this.height * scale);
        ctx.fillStyle = this.type === 'stat' ? 'rgba(0, 240, 255, 0.15)' : (this.type === 'weapon' ? 'rgba(176, 38, 255, 0.15)' : 'rgba(255, 108, 0, 0.15)');
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 뚜껑선 드로잉
        ctx.beginPath();
        ctx.moveTo(-this.width/2 * scale, -this.height/6 * scale);
        ctx.lineTo(this.width/2 * scale, -this.height/6 * scale);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 자물쇠 네온 링 렌더링
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();

        ctx.restore();
    }
}

class BlueprintChest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.color = '#ffdf00'; // 영구 설계도 상자는 고귀한 네온 골드색
        this.pulse = 0;
        this.active = true;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.05;
        let bounceY = Math.sin(this.pulse) * 5;
        let scale = 1.0 + Math.sin(this.pulse) * 0.06;
        ctx.translate(0, bounceY);
        
        // 외부 발광 글로우 사각형
        ctx.beginPath();
        ctx.rect(-this.width/2 * scale, -this.height/2 * scale, this.width * scale, this.height * scale);
        ctx.fillStyle = 'rgba(255, 223, 0, 0.15)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3.0;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 뚜껑선 드로잉
        ctx.beginPath();
        ctx.moveTo(-this.width/2 * scale, -this.height/8 * scale);
        ctx.lineTo(this.width/2 * scale, -this.height/8 * scale);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 중앙 설계도 문양 렌더링 (📜 모양을 상징하는 가로줄 데코)
        ctx.beginPath();
        ctx.moveTo(-6 * scale, 3 * scale);
        ctx.lineTo(6 * scale, 3 * scale);
        ctx.moveTo(-4 * scale, 7 * scale);
        ctx.lineTo(4 * scale, 7 * scale);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.7. 네온 코인 상점 자판기 클래스 (Vending Machine Shop)
// --------------------------------------------------------------------------
class VendingMachine {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'stat', 'weapon', 'equipment'
        this.width = 38;
        this.height = 56;
        this.color = type === 'stat' ? '#00f0ff' : (type === 'weapon' ? '#b026ff' : '#ff6c00');
        this.purchaseCount = 0;
        this.pulse = 0;
        this.active = true;
    }

    getPrice() {
        // 누적 구매 시마다 가격이 2배로 불어나는 인플레이션 딜레이 연산
        return 40 * Math.pow(2, this.purchaseCount);
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.03;
        let scale = 1.0 + Math.sin(this.pulse) * 0.02;

        // 메인 자판기 세로 박스 바디
        ctx.beginPath();
        ctx.rect(-this.width/2 * scale, -this.height/2 * scale, this.width * scale, this.height * scale);
        ctx.fillStyle = 'rgba(8, 9, 14, 0.9)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 상단 네온 전광판 (자판기 속성 마크)
        ctx.fillStyle = this.color;
        ctx.font = '800 10px "Outfit"';
        ctx.textAlign = 'center';
        ctx.fillText(this.type === 'equipment' ? 'EQUIP' : this.type.toUpperCase(), 0, -this.height/2 * scale + 14);

        // 네온 조명 스크린 창
        ctx.beginPath();
        ctx.rect(-this.width/2 + 5, -this.height/2 + 20, this.width - 10, 16);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fill();

        // 가격 표시 텍스트
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 9px "Outfit"';
        ctx.textAlign = 'center';
        ctx.fillText(`📀 ${this.getPrice()}`, 0, -this.height/2 * scale + 31);

        // 동전 주입구 및 반환구 데코레이션
        ctx.beginPath();
        ctx.rect(this.width/2 - 10, 8, 4, 8);
        ctx.fillStyle = '#555555';
        ctx.fill();

        ctx.restore();
    }
}

// --------------------------------------------------------------------------
// 6.7.1. 네온 암시장 비밀 자판기 클래스 (Secret Black Market Vending Machine)
// 비밀 균열 벽 파괴 시 50% 확률로 출현하는 차원 거래 자판기.
// 코인 대신 최대 체력(Max HP) 15를 영구 바쳐 에픽/레전더리 카드를 확정 획득합니다.
// --------------------------------------------------------------------------
class SecretVendingMachine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 58;
        this.color = '#b026ff'; // 보라빛 네온 테마 컬러
        this.glowColor = '#d580ff'; // 밝은 보라 광휘
        this.pulse = 0;
        this.active = true;
        this.particleTimer = 0; // 차원 파티클 방출 타이머
    }

    // 보라빛 차원 아우라를 뿜는 비밀 자판기 렌더링
    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.04;
        let scale = 1.0 + Math.sin(this.pulse) * 0.03;

        // 차원의 보라빛 아우라 후광 (배경 글로우 원)
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(176, 38, 255, ${0.06 + Math.sin(this.pulse * 0.7) * 0.04})`;
        ctx.fill();

        // 메인 자판기 바디 (어두운 보라 테마)
        ctx.beginPath();
        ctx.rect(-this.width / 2 * scale, -this.height / 2 * scale, this.width * scale, this.height * scale);
        ctx.fillStyle = 'rgba(12, 6, 20, 0.92)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 22;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 상단 차원 포탈 마크 ("⁂ SECRET ⁂")
        ctx.fillStyle = this.glowColor;
        ctx.font = '800 8px "Outfit"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillText('⁂ SECRET ⁂', 0, -this.height / 2 * scale + 12);

        // 중앙 신비로운 보라빛 렌즈 스크린
        ctx.beginPath();
        ctx.rect(-this.width / 2 + 5, -this.height / 2 + 18, this.width - 10, 18);
        ctx.fillStyle = `rgba(176, 38, 255, ${0.08 + Math.sin(this.pulse * 1.3) * 0.06})`;
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fill();

        // 스크린 내 "??" 문양 (어떤 카드가 나올지 미지)
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 10px "Outfit"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fillText('🔮 ??', 0, -this.height / 2 * scale + 30);

        // 하단 경고 가격 표시 (Max HP)
        ctx.fillStyle = '#ff0055';
        ctx.font = '700 8px "Outfit"';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0055';
        ctx.fillText('❤️ -15 HP', 0, this.height / 2 * scale - 5);

        // 동전 주입구 데코 (보라빛)
        ctx.beginPath();
        ctx.rect(this.width / 2 - 10, 8, 4, 8);
        ctx.fillStyle = '#6b3a8a';
        ctx.fill();

        ctx.restore();
    }
}


// --------------------------------------------------------------------------
// 6.7.2. 네온 무기 상인 NPC 클래스 (Weapon Merchant NPC)
// 무기 방 클리어 시 맵 중앙에 생성되는 하이테크 홀로그램 NPC.
// 충돌 시 부품 재료 거래 및 무기 진화(Advanced)가 가능한 UI를 제공합니다.
// --------------------------------------------------------------------------
class WeaponMerchant {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20; // 충돌 반경
        this.width = 32;
        this.height = 48;
        this.color = '#39ff14'; // 네온 그린 (안드로이드/제작 연상)
        this.glowColor = '#94ff70';
        this.pulse = 0;
        this.active = true;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pulse += 0.05;
        let scale = 1.0 + Math.sin(this.pulse) * 0.02;
        let bounceY = Math.sin(this.pulse * 0.8) * 3;
        ctx.translate(0, bounceY);

        // 네온 홀로그램 바닥 아우라
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2 - 2, 24 * scale, 8 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(57, 255, 20, ${0.12 + Math.sin(this.pulse) * 0.04})`;
        ctx.fill();

        // 1. 홀로그램 지지판 (바닥 베이스)
        ctx.beginPath();
        ctx.rect(-16, this.height / 2 - 4, 32, 4);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // 2. 머리 (홀로그램 네온 구체)
        ctx.beginPath();
        ctx.arc(0, -this.height / 2 + 10, 8 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 머리 안의 단말 스캔 라인
        ctx.beginPath();
        ctx.moveTo(-6 * scale, -this.height / 2 + 10);
        ctx.lineTo(6 * scale, -this.height / 2 + 10);
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. 몸통 (마름모 형태 홀로그램 스타일)
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2 + 18);
        ctx.lineTo(14 * scale, 0);
        ctx.lineTo(0, this.height / 2 - 8);
        ctx.lineTo(-14 * scale, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.stroke();

        // 몸통 중앙 에너지 코어
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = this.glowColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.glowColor;
        ctx.fill();

        // 4. 상호작용 머리 위 텍스트 가이드
        ctx.font = '800 9px "Outfit"';
        ctx.fillStyle = '#39ff14';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#39ff14';
        ctx.textAlign = 'center';
        ctx.fillText("WEAPON MERCHANT", 0, -this.height / 2 - 14);

        ctx.font = '800 8px "Outfit"';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 3;
        ctx.shadowColor = '#ffffff';
        ctx.fillText("CRASH TO TRADE", 0, -this.height / 2 - 4);

        ctx.restore();
    }
}


// --------------------------------------------------------------------------
class NeonTrap {
    constructor(x, y, type, player) {
        this.x = x;
        this.y = y;
        this.type = type; // 'mine', 'decoy', 'laser_h', 'laser_v'
        this.player = player;
        this.radius = type === 'mine' ? 12 : (type === 'decoy' ? 6 : 3); // 디코이 크기 억제
        this.active = true;
        this.pulse = 0;
        
        let wpnType = (player && player.equippedWeapons[0]) || '';
        this.isAdvanced = (wpnType === 'proximity_cyber_mine');

        // 근접 감응 폭발 타이머
        this.proximityTriggered = false;
        this.proximityTimer = 0;

        let mapW = (window.gameEngine && window.gameEngine.mapWidth) || 800;
        let mapH = (window.gameEngine && window.gameEngine.mapHeight) || 600;

        if (type === 'laser_h') {
            this.x1 = 40;
            this.x2 = mapW - 40;
            this.y1 = y;
            this.y2 = y;
        } else if (type === 'laser_v') {
            this.x1 = x;
            this.x2 = x;
            this.y1 = 40;
            this.y2 = mapH - 40;
        }
    }

    update(monsters, game) {
        if (!this.active) return;
        this.pulse += 0.05;

        if (this.type === 'mine') {
            if (this.isAdvanced) {
                // 진화형: 근접 감응식 사이버 지뢰 (감지 범위 60px 억제)
                if (!this.proximityTriggered) {
                    for (let m of monsters) {
                        if (m.hp > 0 && !m.dead) {
                            let dist = Math.hypot(m.x - this.x, m.y - this.y);
                            if (dist < 60 + m.radius) { // 감지 범위 60px
                                this.proximityTriggered = true;
                                this.proximityTimer = 0;
                                break;
                            }
                        }
                    }
                } else {
                    this.proximityTimer++;
                    if (this.proximityTimer >= 12) { // 0.2초 지연 폭발
                        this.triggerMine(game);
                    }
                }
            } else {
                // 조잡 지뢰 (실제로는 사용하지 않고 디코이만 사용하지만 예외 처리 방어 구현)
                for (let m of monsters) {
                    let dist = Math.hypot(m.x - this.x, m.y - this.y);
                    if (dist < m.radius + this.radius) {
                        this.triggerMine(game);
                        break;
                    }
                }
            }
        } else if (this.type === 'decoy') {
            // 조잡형: 홀로그램 허상 (어그로 도발은 몬스터 이동 시 적용)
            // 몬스터가 디코이를 밟으면 폭발
            for (let m of monsters) {
                let dist = Math.hypot(m.x - this.x, m.y - this.y);
                if (dist < m.radius + this.radius + 2) {
                    this.triggerMine(game);
                    break;
                }
            }
        } else {
            // 레이저 트립와이어 충돌 감지
            for (let m of monsters) {
                let distToLaser = Infinity;
                if (this.type === 'laser_h') {
                    distToLaser = Math.abs(m.y - this.y);
                } else {
                    distToLaser = Math.abs(m.x - this.x);
                }
                
                if (distToLaser < m.radius + 3) {
                    this.triggerLaser(m, game);
                    break;
                }
            }
        }
    }

    triggerMine(game) {
        this.active = false;
        let trapLvl = this.player.weaponLevels.trap || 1;
        let isDecoy = (this.type === 'decoy');

        // 범위 억제: 디코이 60px, 진화지뢰 60px
        let splashRadius = isDecoy ? 60 : 60;
        let baseDmg = this.player.atk * (isDecoy ? 0.8 : 1.2);
        let damage = baseDmg * (1 + (trapLvl - 1) * 0.15); // 레벨 스케일링
        // 기절 시간: 디코이 1.0초(60프레임), 진화지뢰 1.5초(90프레임)
        let shockDuration = isDecoy ? 60 : 90;
        
        let trapName = isDecoy ? "DECOY DETONATED! 🤖" : "CYBER-MINE DETONATED! 💥";
        let glowColor = isDecoy ? '#ffdf00' : '#00f0ff';
        game.showFloatingText(trapName, this.x, this.y - 25, glowColor);
        game.shakeScreen(12, isDecoy ? 3 : 5);
        Sound.play('explosion');
        
        // 폭발 파티클 (디코이는 노란색, 지뢰는 청색)
                // [鍮꾩＜??怨좊룄?? ?꾩옄湲???컻 湲濡쒖슦 諛??ㅽ뙆??寃⑸컻
        game.particles.push(new Particle(this.x, this.y, glowColor, splashRadius, 0, 0, 20, 'explosionRing'));
        if (!isDecoy) {
            game.particles.push(new Particle(this.x, this.y, '#ffffff', splashRadius * 0.75, 0, 0, 15, 'explosionRing'));
            for (let k = 0; k < 20; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 5 + 3;
                game.particles.push(new Particle(this.x, this.y, glowColor, 1.8, Math.cos(angle) * speed, Math.sin(angle) * speed, 25, 'spark'));
            }
        } else {
            for (let k = 0; k < 12; k++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 4 + 2;
                game.particles.push(new Particle(this.x, this.y, glowColor, 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 20, 'spark'));
            }
        }

        // 범위 내의 모든 적 기절 대폭발
        for (let m of game.monsters) {
            let dist = Math.hypot(m.x - this.x, m.y - this.y);
            if (dist < splashRadius + m.radius) {
                m.statusEffects.shock = Math.max(m.statusEffects.shock || 0, shockDuration);
                let finalDmg = damage;
                if (m.statusEffects.vulnerability > 0) finalDmg *= 1.25;
                m.hp -= finalDmg;
                m.flashTimer = 8;
                
                if (m.hp <= 0) {
                    game.killMonster(m);
                }
                
                // 넉백
                let pushAngle = Math.atan2(m.y - this.y, m.x - this.x);
                m.knockbackX += Math.cos(pushAngle) * 4;
                m.knockbackY += Math.sin(pushAngle) * 4;
            }
        }
    }

    triggerLaser(hitMonster, game) {
        this.active = false;
        let trapLvl = this.player.weaponLevels.trap || 1;
        game.showFloatingText("TRIPWIRE DETONATED! ⚡", hitMonster.x, hitMonster.y - 25, '#00f0ff');
        game.shakeScreen(8, 3);
        
        // 체인 라이트닝 전류 마비 격발 (1레벨: 4회 ~ 5레벨: 8회 전이, 레벨별 대미지 스케일링)
        let chains = 3 + trapLvl;
        let damage = this.player.atk * 1.0 * (1 + (trapLvl - 1) * 0.15);
        game.triggerChainLightning(this.x, this.y, hitMonster, chains, damage);
        
        // 번개 스파크
        for (let k = 0; k < 8; k++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 3 + 1.5;
            game.particles.push(new Particle(hitMonster.x, hitMonster.y, '#00f0ff', 2, Math.cos(angle) * speed, Math.sin(angle) * speed, 15, 'spark'));
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        
        if (this.type === 'mine') {
            ctx.translate(this.x, this.y);
            let scale = 1.0 + Math.sin(this.pulse) * 0.1;
            
            if (this.isAdvanced) {
                // 진화형: 세련된 청색 네온 지뢰
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
                ctx.strokeStyle = '#00f0ff';
                ctx.lineWidth = 1.8;
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#00f0ff';
                ctx.fill();
                ctx.stroke();

                // 빨간색/청색 뇌관 점멸 (감지 시 빨간색 격렬 점멸)
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                if (this.proximityTriggered) {
                    ctx.fillStyle = (Math.floor(Date.now() / 40) % 2 === 0) ? '#ff0055' : 'rgba(255, 0, 85, 0.1)';
                } else {
                    ctx.fillStyle = '#00f0ff';
                }
                ctx.fill();
            } else {
                // 조잡 지뢰 (노란색)
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 223, 0, 0.2)';
                ctx.strokeStyle = '#ffdf00';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#ffdf00';
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ff0055';
                ctx.fill();
            }
        } else if (this.type === 'decoy') {
            // 조잡형: 플레이어 30% 크기 반투명 노란색 홀로그램 허상
            ctx.translate(this.x, this.y);
            
            // 약간 지글거리는 노이즈 연출
            let scaleX = 0.3 * (1.0 + (Math.random() - 0.5) * 0.08);
            let scaleY = 0.3;
            ctx.scale(scaleX, scaleY);
            if (this.player) {
                ctx.rotate(this.player.angle || 0);
            }
            
            ctx.beginPath();
            let r = 15; // 플레이어 radius 가정
            ctx.moveTo(r, 0);
            ctx.lineTo(-r * 0.8, -r * 0.7);
            ctx.lineTo(-r * 0.5, 0);
            ctx.lineTo(-r * 0.8, r * 0.7);
            ctx.closePath();

            ctx.fillStyle = 'rgba(255, 223, 0, 0.18)'; // 반투명 노란색
            ctx.strokeStyle = '#ffdf00';
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffdf00';
            ctx.setLineDash([3, 5]); // 점선 효과 홀로그램 묘사
            ctx.fill();
            ctx.stroke();
        } else {
            // 레이저 트립와이어
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
            
            let alpha = 0.45 + Math.sin(this.pulse) * 0.2;
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
            ctx.lineWidth = 2.0;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f0ff';
            ctx.stroke();
            
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.arc(this.x1, this.y1, 4, 0, Math.PI * 2);
            ctx.arc(this.x2, this.y2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}
