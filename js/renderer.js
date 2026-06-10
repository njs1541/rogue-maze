/**
 * ==========================================================================
 * Neon Rogue-Maze - renderer.js
 * ==========================================================================
 * 모든 객체의 그리기 로직을 중재하는 공통 추상 렌더러 인터페이스입니다.
 * 고전 스크립트 로딩 방식을 위해 ES Module export 대신 전역 객체(window.Renderer)로 할당합니다.
 */

const Renderer = {
    /**
     * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
     * @param {string} assetKey - AssetManager에 등록된 이미지 키
     * @param {number} x - 중심점 X 좌표
     * @param {number} y - 중심점 Y 좌표
     * @param {number} width - 출력 가로 크기
     * @param {number} height - 출력 세로 크기
     * @param {number} angle - 회전 각도 (Radian)
     * @param {Function} fallbackDrawFn - 이미지가 없을 때 실행할 기존 네온 그래픽 콜백 함수
     */
    drawSprite(ctx, assetKey, x, y, width, height, angle = 0, fallbackDrawFn) {
        // 전역 AssetManager 참조
        const img = window.AssetManager ? window.AssetManager.get(assetKey) : null;

        if (img) {
            // [A] 그래픽 리소스가 존재할 때: 깔끔하게 교체되어 렌더링
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.drawImage(img, -width / 2, -height / 2, width, height);
            ctx.restore();
        } else {
            // [B] 리소스가 없을 때: 기존에 개발된 네온 그래픽 로직을 그대로 보존하여 실행
            fallbackDrawFn();
        }
    }
};

// 전역 네임스페이스 바인딩
window.Renderer = Renderer;
