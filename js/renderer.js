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
        try {
            // 전역 AssetManager 참조
            const img = window.AssetManager ? window.AssetManager.get(assetKey) : null;

            // 이미지가 실제로 유효하고, 완전 로드되었으며, 해상도가 양수인 경우에만 drawImage 실행
            if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                ctx.drawImage(img, -width / 2, -height / 2, width, height);
                ctx.restore();
            } else {
                // 리소스가 비어있거나 로딩 전이면 기존 네온 그래픽으로 자동 폴백
                if (fallbackDrawFn) fallbackDrawFn();
            }
        } catch (e) {
            console.warn(`[Renderer] '${assetKey}' 렌더링 예외 발생, 네온 폴백 실행:`, e);
            if (fallbackDrawFn) {
                try {
                    fallbackDrawFn();
                } catch (err) {
                    console.error("[Renderer] 폴백 드로잉 실행 실패:", err);
                }
            }
        }
    }
};

// 전역 네임스페이스 바인딩
window.Renderer = Renderer;
