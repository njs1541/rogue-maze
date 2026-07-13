const fs = require('fs');
const path = require('path');

const originalFile = 'c:\\Users\\NZIN\\Downloads\\개인 개발분\\미로찾기\\scratch\\bullet_original.js';
const targetFile = 'c:\\Users\\NZIN\\Downloads\\개인 개발분\\미로찾기\\js\\bullet.js';

try {
    let content = fs.readFileSync(originalFile, 'utf8');

    // 줄 바꿈 표준화 (\r\n -> \n) 하여 매칭 유연성 확보
    content = content.replace(/\r\n/g, '\n');

    // 조잡형 눈결정 렌더링 코드 영역을 정확히 정의
    const targetPattern = `        } else if (this.isIce && !this.isAdvanced) {
            // [조잡형] 크라이오 건 서리 눈결정 탄환
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00f0ff';
            ctx.fill();
            ctx.stroke();

            // 내부에 정교한 6각 눈결정(❄️) 수동 드로잉
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Date.now() * 0.003); // 서서히 회전하며 비행
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0;
            ctx.shadowBlur = 0;
            for (let k = 0; k < 3; k++) {
                ctx.beginPath();
                ctx.rotate(Math.PI / 3);
                ctx.moveTo(-this.radius * 0.8, 0);
                ctx.lineTo(this.radius * 0.8, 0);
                ctx.stroke();
                
                // 잔가지 드로잉
                ctx.beginPath();
                ctx.moveTo(this.radius * 0.4, 0);
                ctx.lineTo(this.radius * 0.6, -this.radius * 0.25);
                ctx.moveTo(this.radius * 0.4, 0);
                ctx.lineTo(this.radius * 0.6, this.radius * 0.25);
                ctx.stroke();
            }
            ctx.restore();`;

    const replacement = `        } else if (this.isIce && !this.isAdvanced) {
            // [조잡형] 크라이오 건 서리 마름모 투사체 그래픽 렌더링
            ctx.translate(this.x, this.y);
            let angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            
            ctx.beginPath();
            ctx.moveTo(this.radius * 2.2, 0);
            ctx.lineTo(0, -this.radius * 0.7);
            ctx.lineTo(-this.radius * 1.5, 0);
            ctx.lineTo(0, this.radius * 0.7);
            ctx.closePath();
            
            ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.8;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f0ff';
            ctx.fill();
            ctx.stroke();`;

    // 치환 실행
    if (content.includes(targetPattern)) {
        content = content.replace(targetPattern, replacement);
        console.log('성공: 대상 렌더링 블록을 치환하였습니다.');
    } else {
        console.error('오류: 대상 패턴을 파일 내에서 찾을 수 없습니다.');
        // 유연한 찾기를 위한 체크
        console.log('파일의 일부 키워드 존재 여부 확인:');
        console.log('isIce && !this.isAdvanced 존재:', content.includes('this.isIce && !this.isAdvanced'));
        process.exit(1);
    }

    // OS의 줄바꿈 스타일에 맞게 \r\n으로 복원 (필요시)
    content = content.replace(/\n/g, '\r\n');

    // 대상 파일에 정상 UTF-8 인코딩으로 저장
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log(`성공: 복구 및 수정된 소스코드를 ${targetFile}에 UTF-8로 저장하였습니다.`);

} catch (err) {
    console.error('에러 발생:', err);
    process.exit(1);
}
