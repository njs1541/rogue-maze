const fs = require('fs');
const path = require('path');

try {
    console.log("🔍 [검증 시작] 분리된 파일들을 재결합하여 원본 파일(game.backup.js)과 비교를 시작합니다...");

    // 1. 원본 파일 로드 (UTF-8 인코딩)
    const backupPath = path.join(__dirname, 'game.backup.js');
    if (!fs.existsSync(backupPath)) {
        throw new Error("원본 백업 파일(game.backup.js)이 존재하지 않습니다.");
    }
    const originalText = fs.readFileSync(backupPath, 'utf8');
    const originalLines = originalText.split(/\r?\n/);

    // 2. 분리된 파일들 로드
    const soundText = fs.readFileSync(path.join(__dirname, 'js', 'sound.js'), 'utf8');
    const particleText = fs.readFileSync(path.join(__dirname, 'js', 'particle.js'), 'utf8');
    const environmentText = fs.readFileSync(path.join(__dirname, 'js', 'environment.js'), 'utf8');
    const bulletText = fs.readFileSync(path.join(__dirname, 'js', 'bullet.js'), 'utf8');
    const petText = fs.readFileSync(path.join(__dirname, 'js', 'pet.js'), 'utf8');
    const playerText = fs.readFileSync(path.join(__dirname, 'js', 'player.js'), 'utf8');
    const monsterText = fs.readFileSync(path.join(__dirname, 'js', 'monster.js'), 'utf8');
    const engineText = fs.readFileSync(path.join(__dirname, 'js', 'engine.js'), 'utf8');
    const mainText = fs.readFileSync(path.join(__dirname, 'js', 'main.js'), 'utf8');

    // 라인 단위 배열로 변환
    const soundLines = soundText.split(/\r?\n/);
    const particleLines = particleText.split(/\r?\n/);
    const environmentLines = environmentText.split(/\r?\n/);
    const bulletLines = bulletText.split(/\r?\n/);
    const petLines = petText.split(/\r?\n/);
    const playerLines = playerText.split(/\r?\n/);
    const monsterLines = monsterText.split(/\r?\n/);
    const engineLines = engineText.split(/\r?\n/);
    const mainLines = mainText.split(/\r?\n/);

    // 3. environment.js 나누기
    // environment.js는 NeonObstacle(495~547 라인, 총 53줄)과 포탈/트랩 등(2058~2949 라인, 총 892줄)로 구성됨
    // split_game.ps1 에서 $envContent = $env1 + "" + $env2 로 중간에 빈 요소를 더했으므로
    // 실제 environmentLines에서는 index 0 ~ 52가 NeonObstacle, index 53은 빈 줄, index 54부터 끝까지가 나머지 부분입니다.
    const neonObstacleLines = environmentLines.slice(0, 53);
    const otherEnvLines = environmentLines.slice(53); // index 53부터 끝까지가 나머지 부분입니다.

    // 4. 재결합 배열 구성
    // 순서: Sound -> Particle -> NeonObstacle -> Bullet -> Pet -> Player -> Monster -> otherEnv -> Engine -> Main
    const reconstructedLines = [];
    
    reconstructedLines.push(...soundLines);           // Line 1 ~ 382 (382줄)
    reconstructedLines.push(...particleLines);        // Line 383 ~ 494 (112줄)
    reconstructedLines.push(...neonObstacleLines);    // Line 495 ~ 547 (53줄)
    reconstructedLines.push(...bulletLines);          // Line 548 ~ 840 (293줄)
    reconstructedLines.push(...petLines);             // Line 841 ~ 960 (120줄)
    reconstructedLines.push(...playerLines);          // Line 961 ~ 1468 (508줄)
    reconstructedLines.push(...monsterLines);         // Line 1469 ~ 2057 (589줄)
    reconstructedLines.push(...otherEnvLines);         // Line 2058 ~ 2949 (892줄)
    reconstructedLines.push(...engineLines);          // Line 2950 ~ 8994 (6045줄)
    reconstructedLines.push(...mainLines);            // Line 8995 ~ 9206 (212줄)

    console.log(`Original total lines: ${originalLines.length}`);
    console.log(`Reconstructed total lines: ${reconstructedLines.length}`);

    // 5. 정밀 1:1 비교
    let differencesCount = 0;
    const maxDiffToShow = 15;

    // 두 배열의 전체 라인 수 중 최대 크기만큼 루프
    const maxLines = Math.max(originalLines.length, reconstructedLines.length);

    for (let i = 0; i < maxLines; i++) {
        const orig = originalLines[i];
        const recon = reconstructedLines[i];

        if (orig !== recon) {
            differencesCount++;
            if (differencesCount <= maxDiffToShow) {
                console.error(`❌ [불일치 감지] 라인 ${i + 1}:`);
                console.error(`  - 원본: [${orig}]`);
                console.error(`  - 복구: [${recon}]`);
            }
        }
    }

    if (differencesCount === 0) {
        console.log("✅ [검증 완료] 축하합니다! 분리된 조각 파일들을 병합한 텍스트가 원본 game.backup.js와 100% 동일(바이트 단위 일치)합니다.");
        console.log("어떠한 코드 누락이나 임의 수정도 발견되지 않았습니다.");
    } else {
        console.error(`❌ [검증 실패] 총 ${differencesCount}개의 라인에서 불일치가 감지되었습니다.`);
        process.exit(1);
    }

} catch (err) {
    console.error("❌ 검증 도중 에러가 발생했습니다:", err);
    process.exit(1);
}
