const { execSync } = require('child_process');

try {
    // git show 명령어로 raw 버퍼 받아오기 (encoding을 null로 주면 Buffer를 리턴함)
    const rawBuffer = execSync('git show 0a775ca:js/bullet.js', { encoding: null });
    
    // 1. UTF-8 디코딩 결과
    const utf8Content = rawBuffer.toString('utf8');
    const utf8FffdCount = (utf8Content.match(/\uFFFD/g) || []).length;
    console.log(`0a775ca - UTF-8 디코딩 시 FFFD() 개수: ${utf8FffdCount}`);
    
    // 2. EUC-KR 디코딩 결과
    const decoder = new TextDecoder('euc-kr');
    const euckrContent = decoder.decode(rawBuffer);
    const euckrFffdCount = (euckrContent.match(/\uFFFD/g) || []).length;
    console.log(`0a775ca - EUC-KR 디코딩 시 FFFD() 개수: ${euckrFffdCount}`);

    // 앞부분 15줄 출력
    console.log('\n--- EUC-KR 디코딩 앞부분 ---');
    console.log(euckrContent.split('\n').slice(0, 15).join('\n'));

} catch (err) {
    console.error(err);
}
