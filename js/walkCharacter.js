/**
 * Neon Rogue-Maze: 100 Rooms - Keyboard Walk Character Animation Controller
 * 방향키 및 WASD 키 입력에 반응하여 왼쪽 아래 옵션 영역 위에 캐릭터 스프라이트를 재생하는 데모 모듈
 */
console.log("🚀 KeyboardWalkCharacter: 스크립트가 브라우저에 로드되었습니다.");

class KeyboardWalkCharacter {
    constructor() {
        this.canvas = document.getElementById('walk-canvas');
        if (!this.canvas) {
            console.error("❌ KeyboardWalkCharacter: 'walk-canvas' 요소를 찾을 수 없습니다.");
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        console.log("✅ KeyboardWalkCharacter: Canvas 및 2D Context 준비 완료.", this.canvas);
        
        // 이미지 에셋 매핑 객체
        this.images = {
            up: new Image(),
            down: new Image(),
            left: new Image(),
            right: new Image()
        };
        
        // 파일 경로 사전 정의 (walk_run_12f_256.png -> walk_right_12f_256.png 변경사항 반영)
        this.images.up.src = 'assets/walk/walk_back_12f_256.png';
        this.images.down.src = 'assets/walk/walk_front_12f_256.png';
        this.images.left.src = 'assets/walk/walk_left_12f_256.png';
        this.images.right.src = 'assets/walk/walk_right_12f_256.png';
        
        // 이미지 개별 로드 성공 여부 상태
        this.loadedImages = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        Object.keys(this.images).forEach(dir => {
            this.images[dir].onload = () => {
                this.loadedImages[dir] = true;
                console.log(`🖼️ KeyboardWalkCharacter: '${dir}' 스프라이트 시트 로드 완료.`);
            };
            this.images[dir].onerror = (err) => {
                console.error(`❌ KeyboardWalkCharacter: '${dir}' 이미지 로딩 실패. 경로를 다시 확인해주세요.`, err);
            };
        });
        
        // 애니메이션 설정 정보
        this.currentDir = 'down'; // 기본 바라보는 방향
        this.isWalking = false;   // 현재 움직임 여부
        this.currentFrame = 0;    // 0 ~ 11 프레임
        this.totalFrames = 12;    // 총 12 프레임
        this.frameWidth = 256;    // 각 프레임 너비
        this.frameHeight = 256;   // 각 프레임 높이
        this.columns = 4;         // 가로 4열, 세로 3행
        
        this.lastTime = 0;
        this.frameInterval = 100; // 프레임 전환 딜레이 (100ms = 10 FPS)
        
        // 입력 키 버퍼 및 입력 순서 우선순위 유지를 위한 히스토리 어레이
        this.keys = {};
        this.keyHistory = [];
        
        // 키보드 리스너 초기화
        this.initEvents();
        
        // 애니메이션 렌더링 루프 구동
        requestAnimationFrame((t) => this.update(t));
    }
    
    /**
     * 입력 감지 이벤트 리스너 바인딩
     */
    initEvents() {
        window.addEventListener('keydown', (e) => {
            // 사용자 입력 양식(인풋창, 텍스트에리어 등)에 포커스가 가 있는 경우 무시
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                return;
            }
            
            const key = e.key.toLowerCase();
            const mappedDir = this.mapGetKeyDirection(key);
            
            if (mappedDir) {
                if (!this.keys[key]) {
                    this.keys[key] = true;
                    // 가장 나중에 누른 방향이 우선적으로 작동하도록 히스토리의 맨 뒤로 push
                    this.keyHistory.push({ key, dir: mappedDir });
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys[key]) {
                this.keys[key] = false;
                // 해제된 키는 히스토리에서 제외
                this.keyHistory = this.keyHistory.filter(item => item.key !== key);
            }
        });
        
        // 포커스 아웃 시 오동작 방지를 위한 버퍼 강제 초기화
        window.addEventListener('blur', () => {
            this.keys = {};
            this.keyHistory = [];
            this.isWalking = false;
            this.currentFrame = 0;
        });
    }
    
    /**
     * 키보드 값을 방향 string 문자열로 변환
     */
    mapGetKeyDirection(key) {
        switch (key) {
            case 'w':
            case 'arrowup':
                return 'up';
            case 's':
            case 'arrowdown':
                return 'down';
            case 'a':
            case 'arrowleft':
                return 'left';
            case 'd':
            case 'arrowright':
                return 'right';
            default:
                return null;
        }
    }
    
    /**
     * 프레임 업데이트 연산 루프
     */
    update(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const elapsed = timestamp - this.lastTime;
        
        // 활성화된 누적 키 히스토리의 최신 방향에 맞춤
        if (this.keyHistory.length > 0) {
            const activeInput = this.keyHistory[this.keyHistory.length - 1];
            this.currentDir = activeInput.dir;
            this.isWalking = true;
        } else {
            this.isWalking = false;
        }
        
        // 애니메이션 프레임 스킵 연산 처리
        if (this.isWalking) {
            if (elapsed >= this.frameInterval) {
                const steps = Math.floor(elapsed / this.frameInterval);
                this.currentFrame = (this.currentFrame + steps) % this.totalFrames;
                this.lastTime = timestamp - (elapsed % this.frameInterval);
            }
        } else {
            // 정지 시에는 기본 0번째 프레임으로 리셋
            this.currentFrame = 0;
            this.lastTime = timestamp;
        }
        
        this.draw();
        requestAnimationFrame((t) => this.update(t));
    }
    
    /**
     * Canvas 2D 컨텍스트에 걷는 스프라이트 렌더링
     */
    draw() {
        // 이전 프레임 클리어
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const dir = this.currentDir;
        const img = this.images[dir];
        const isLoaded = this.loadedImages[dir];
        
        if (isLoaded) {
            // 4x3 시트 레이아웃 상의 좌표 계산
            const col = this.currentFrame % this.columns;
            const row = Math.floor(this.currentFrame / this.columns);
            
            const sx = col * this.frameWidth;
            const sy = row * this.frameHeight;
            
            this.ctx.drawImage(
                img,
                sx, sy, this.frameWidth, this.frameHeight, // 소스 영역 크롭
                0, 0, this.canvas.width, this.canvas.height // 타겟 캔버스 맞춤 크기 렌더링
            );
        } else {
            // 미완료 상태 안내 텍스트 표시
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
            this.ctx.font = 'bold 11px Outfit, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.fillText("NEON INITIALIZING...", this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.restore();
        }
    }
}

// 윈도우 로드 완료 시 자동 초기화 수행 (다른 스크립트 에러 방지용)
window.addEventListener('load', () => {
    console.log("🚀 KeyboardWalkCharacter: DOM 로드 완료, 자가 초기화 가동");
    if (!window.keyboardWalkCharacter) {
        window.keyboardWalkCharacter = new KeyboardWalkCharacter();
    }
});
