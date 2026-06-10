/**
 * ==========================================================================
 * Neon Rogue-Maze - assetManager.js
 * ==========================================================================
 * 게임 시작 시 에셋을 비동기로 프리로딩하고 관리하는 전역 자산 매니저입니다.
 * 고전 스크립트 로딩 방식을 위해 ES Module export 대신 전역 객체(window.AssetManager)로 할당합니다.
 */

const AssetManager = {
    images: {},
    isLoaded: false,
    
    // 1. 추후 그래픽 리소스가 확보되었을 때 매핑할 파일 경로 정의
    manifest: {
        player_idle: 'assets/graphics/player/idle.png',
        monster_normal: 'assets/graphics/monsters/normal.png',
        monster_shooter: 'assets/graphics/monsters/shooter.png',
        monster_tanker: 'assets/graphics/monsters/tanker.png',
        bullet_neon: 'assets/graphics/projectiles/bullet_neon.png'
    },

    // 2. 비동기 프리로드 엔진
    async init() {
        const promises = [];
        for (const [key, src] of Object.entries(this.manifest)) {
            promises.push(this.loadImage(key, src));
        }
        
        // 에셋 로드가 실패(404 등)하더라도 게임이 실행되도록 catch 처리 (네온 폴백 보장)
        await Promise.all(promises.map(p => p.catch(e => {
            console.warn(`[AssetManager] 네온 그래픽 폴백 사용 예정: ${e.message}`);
        })));
        
        this.isLoaded = true;
        console.log("AssetManager: 초기화 및 자산 체크 완료.");
    },

    loadImage(key, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                this.images[key] = img;
                resolve(img);
            };
            img.onerror = () => {
                this.images[key] = null; // 실패 시 명시적으로 null 처리하여 폴백 유도
                reject(new Error(`경로를 찾을 수 없음: ${src}`));
            };
        });
    },

    // 3. 안전한 에셋 반환 인터페이스
    get(key) {
        return this.images[key] || null;
    }
};

// 전역 네임스페이스 바인딩
window.AssetManager = AssetManager;
