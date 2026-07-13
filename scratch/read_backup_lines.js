const fs = require('fs');

const filePath = 'c:\\Users\\NZIN\\Downloads\\개인 개발분\\미로찾기\\game.backup.js';

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    
    // Line 548 ~ 840 (0-indexed: 547 ~ 839)
    const bulletPart = lines.slice(547, 840).join('\n');
    
    console.log('--- Original game.backup.js Bullet Part (First 500 chars) ---');
    console.log(bulletPart.slice(0, 1000));
} catch (err) {
    console.error(err);
}
