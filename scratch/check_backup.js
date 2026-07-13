const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\NZIN\\Downloads\\개인 개발분\\미로찾기\\game.backup.js';

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
    
    // 앞부분 20줄 출력 (UTF-8 vs EUC-KR)
    console.log('\n--- UTF-8 디코딩 (앞 10줄) ---');
    console.log(utf8Content.split('\n').slice(0, 10).join('\n'));
    
    console.log('\n--- EUC-KR 디코딩 (앞 10줄) ---');
    console.log(euckrContent.split('\n').slice(0, 10).join('\n'));
} catch (err) {
    console.error(err);
}
