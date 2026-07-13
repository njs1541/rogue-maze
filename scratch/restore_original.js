const { execSync } = require('child_process');
const fs = require('fs');

try {
    // git show의 바이트 데이터를 그대로 Buffer로 읽어옵니다.
    const rawBuffer = execSync('git show 0a775ca:js/bullet.js', { encoding: null });
    
    // 복사할 파일 경로
    const targetPath = 'c:\\Users\\NZIN\\Downloads\\개인 개발분\\미로찾기\\scratch\\bullet_original.js';
    
    // 파일에 바이너리 그대로 쓰기
    fs.writeFileSync(targetPath, rawBuffer);
    
    // 파일이 정상적으로 쓰여졌는지 확인하기 위해 UTF-8로 읽어서 한글 확인
    const content = fs.readFileSync(targetPath, 'utf8');
    const fffdCount = (content.match(/\uFFFD/g) || []).length;
    console.log(`bullet_original.js 추출 완료. FFFD() 개수: ${fffdCount}`);
    console.log('--- 파일 상단 10줄 출력 ---');
    console.log(content.split('\n').slice(0, 10).join('\n'));

} catch (err) {
    console.error('에러:', err);
}
