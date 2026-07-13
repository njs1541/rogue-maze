const fs = require('fs');

const filePath = 'c:\\Users\\NZIN\\Downloads\\개인 개발분\\미로찾기\\js\\bullet.js';

try {
    const rawBuffer = fs.readFileSync(filePath);
    
    // 단순 바이트를 기반으로 16진수 덤프 및 UTF-8 스트링 일부 출력
    console.log('--- Raw Byte Hex Dump (First 100 bytes) ---');
    console.log(rawBuffer.slice(0, 100).toString('hex'));
    
    console.log('\n--- UTF-8 Decoded (First 500 chars) ---');
    console.log(rawBuffer.slice(0, 1000).toString('utf8'));
    
} catch (err) {
    console.error(err);
}
