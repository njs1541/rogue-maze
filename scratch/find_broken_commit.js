const { execSync } = require('child_process');

const filePath = 'js/bullet.js';

// git log --format="%H %s" 로 커밋 해시와 메시지 목록 가져오기
try {
    const logOutput = execSync(`git log --format="%H|%s" -- ${filePath}`, { encoding: 'utf8' });
    const commits = logOutput.trim().split('\n').map(line => {
        const [hash, msg] = line.split('|');
        return { hash, msg };
    });

    console.log(`총 ${commits.length}개의 커밋을 검사합니다...\n`);

    for (const commit of commits) {
        try {
            // 특정 커밋의 파일 내용 읽기
            const fileContent = execSync(`git show ${commit.hash}:${filePath}`, { encoding: 'utf8' });
            
            // FFFD() 개수 세기
            const fffdCount = (fileContent.match(/\uFFFD/g) || []).length;
            
            console.log(`[${commit.hash.slice(0, 7)}] ${commit.msg}`);
            console.log(`  - FFFD() 개수: ${fffdCount}`);
        } catch (err) {
            console.log(`[${commit.hash.slice(0, 7)}] ${commit.msg} - 파일 읽기 실패 (이전 커밋에 존재하지 않을 수 있음)`);
        }
    }
} catch (err) {
    console.error(err);
}
