const fs = require('fs');

const filePath = 'c:\\Users\\NZIN\\Downloads\\개인 개발분\\미로찾기\\js\\bullet.js';

try {
    const rawBuffer = fs.readFileSync(filePath);
    
    // 1. UTF-8 디코딩 결과 확인
    const utf8Content = rawBuffer.toString('utf8');
    const utf8FffdCount = (utf8Content.match(/\uFFFD/g) || []).length;
    console.log(`UTF-8 디코딩 시 FFFD() 개수: ${utf8FffdCount}`);

    // 2. EUC-KR 디코딩 결과 확인
    const decoder = new TextDecoder('euc-kr');
    const euckrContent = decoder.decode(rawBuffer);
    const euckrFffdCount = (euckrContent.match(/\uFFFD/g) || []).length;
    console.log(`EUC-KR 디코딩 시 FFFD() 개수: ${euckrFffdCount}`);
    
    if (utf8FffdCount > 0 && euckrFffdCount === 0) {
        console.log('이 파일은 EUC-KR(CP949) 인코딩으로 작성되었습니다.');
        
        // 앞부분 일부 출력해서 한글이 깨지는지 아닌지 육안 검증
        console.log('\n--- EUC-KR 디코딩 샘플 (첫 10줄) ---');
        const lines = euckrContent.split('\n').slice(0, 20);
        console.log(lines.join('\n'));
    } else {
        console.log('EUC-KR로도 해결되지 않거나 다른 인코딩입니다.');
    }
} catch (err) {
    console.error(err);
}
