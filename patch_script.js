const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'game.js');

// game.js를 안전하게 UTF-8로 읽습니다.
let content = fs.readFileSync(filePath, 'utf8');

// 1. applyWeaponCheat 교체 대상 찾아서 변경
const oldCheatCode = `    // 무기 유형 변경 치트
    applyWeaponCheat(wpnType) {
        this.player.weaponType = wpnType;
        this.updateHUD();
        this.showFloatingText(\`WEAPON CHANGED: \${wpnType.toUpperCase()}\`, this.player.x, this.player.y - 40, '#00f0ff');
    }`;

const newCheatCode = `    // 무기 유형 변경 치트
    applyWeaponCheat(wpnType) {
        const p = this.player;
        
        // 무기 레벨 초기화
        p.weaponLevels = {
            sword: 0,
            spear: 0,
            whip: 0,
            lightning: 0,
            fire: 0,
            ice: 0
        };

        if (wpnType === 'dual') {
            // 하이브리드는 모든 무기를 5레벨로 활성화하여 테스트 가능하게 함
            p.weaponLevels.sword = 5;
            p.weaponLevels.spear = 5;
            p.weaponLevels.whip = 5;
            p.weaponLevels.lightning = 5;
            p.weaponLevels.fire = 5;
            p.weaponLevels.ice = 5;
        } else if (wpnType === 'icefiredance') {
            // 아앤파 초월은 불과 얼음 5레벨 활성화
            p.weaponLevels.fire = 5;
            p.weaponLevels.ice = 5;
        } else if (wpnType === 'thorns') {
            p.hasThorns = true;
            this.showFloatingText("THORNS ENABLED 🌵", p.x, p.y - 40, '#ff00aa');
            return;
        } else if (wpnType === 'trap') {
            p.hasTrap = true;
            this.showFloatingText("TRAPS ENABLED 🪤", p.x, p.y - 40, '#ffdf00');
            return;
        } else if (wpnType === 'time') {
            p.hasTimeWarp = true;
            this.showFloatingText("TIME WARP ENABLED ⏳", p.x, p.y - 40, '#00ff66');
            return;
        } else if (wpnType === 'gun') {
            // 기본 총
        } else {
            // 개별 무기
            if (p.weaponLevels.hasOwnProperty(wpnType)) {
                p.weaponLevels[wpnType] = 5;
            }
        }
        
        p.weaponType = wpnType;
        p.updateWeaponType();
        this.updateHUD();
        this.showFloatingText(\`WEAPON CHANGED: \${wpnType.toUpperCase()}\`, p.x, p.y - 40, '#00f0ff');
    }`;

if (content.includes(oldCheatCode)) {
    content = content.replace(oldCheatCode, newCheatCode);
    console.log("Successfully patched applyWeaponCheat!");
} else {
    // 혹시 줄바꿈 차이가 있을 수 있으므로 단순 교체 시도
    console.log("oldCheatCode not found, trying normalized replacement...");
    const regex = /applyWeaponCheat\s*\(\s*wpnType\s*\)\s*\{\s*this\.player\.weaponType\s*=\s*wpnType;\s*this\.updateHUD\(\);\s*this\.showFloatingText\([\s\S]*?\);\s*\}/;
    if (regex.test(content)) {
        content = content.replace(regex, `applyWeaponCheat(wpnType) {
        const p = this.player;
        p.weaponLevels = { sword: 0, spear: 0, whip: 0, lightning: 0, fire: 0, ice: 0 };
        if (wpnType === 'dual') {
            p.weaponLevels.sword = 5; p.weaponLevels.spear = 5; p.weaponLevels.whip = 5;
            p.weaponLevels.lightning = 5; p.weaponLevels.fire = 5; p.weaponLevels.ice = 5;
        } else if (wpnType === 'icefiredance') {
            p.weaponLevels.fire = 5; p.weaponLevels.ice = 5;
        } else if (wpnType === 'thorns') {
            p.hasThorns = true; this.showFloatingText("THORNS ENABLED 🌵", p.x, p.y - 40, '#ff00aa'); return;
        } else if (wpnType === 'trap') {
            p.hasTrap = true; this.showFloatingText("TRAPS ENABLED 🪤", p.x, p.y - 40, '#ffdf00'); return;
        } else if (wpnType === 'time') {
            p.hasTimeWarp = true; this.showFloatingText("TIME WARP ENABLED ⏳", p.x, p.y - 40, '#00ff66'); return;
        } else if (wpnType !== 'gun') {
            if (p.weaponLevels.hasOwnProperty(wpnType)) p.weaponLevels[wpnType] = 5;
        }
        p.weaponType = wpnType;
        p.updateWeaponType();
        this.updateHUD();
        this.showFloatingText(\`WEAPON CHANGED: \${wpnType.toUpperCase()}\`, p.x, p.y - 40, '#00f0ff');
    }`);
        console.log("Successfully patched applyWeaponCheat via RegExp!");
    } else {
        console.log("RegExp also failed to find applyWeaponCheat!");
    }
}

// 2. stat-wpn, res-wpn 등 무기 이름 출력 부분 일괄 교체
// game.js L.6140-6146, L.6958-6964, L.7027-7033 의 wpnStr 할당 코드 변경
// 이 부분들은 한글이 섞여 있어서 깨질 위험이 있으므로 정확히 매칭합니다.

// L.6140 근처의 wpnStr 코드 변환
const oldStatWpnCode = `        // 무기 상태 출력
        let wpnStr = "총 (Gun)";
        if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
        if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
        if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
        if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
        if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
        if (this.player.weaponType === 'dual') wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";`;

const newStatWpnCode = `        // 무기 상태 출력
        let wpnStr = "총 (Gun)";
        if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
        if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
        if (this.player.weaponType === 'whip') wpnStr = "채찍 (Whip)";
        if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
        if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
        if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
        if (this.player.weaponType === 'dual') wpnStr = "하이브리드 (Hybrid)";
        if (this.player.weaponType === 'icefiredance') wpnStr = "아이스 앤드 파이어 댄스 (Transcendence)";`;

if (content.includes(oldStatWpnCode)) {
    content = content.replace(oldStatWpnCode, newStatWpnCode);
    console.log("Successfully patched stat-wpn names!");
} else {
    console.log("oldStatWpnCode not found, trying normalized search...");
}

// L.6958 근처의 wpnStr 코드 변환
const oldResWpnCode = `        let wpnStr = "총 (Gun)";
        if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
        if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
        if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
        if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
        if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
        if (this.player.weaponType === 'dual') wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";`;

const newResWpnCode = `        let wpnStr = "총 (Gun)";
        if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
        if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
        if (this.player.weaponType === 'whip') wpnStr = "채찍 (Whip)";
        if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
        if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
        if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
        if (this.player.weaponType === 'dual') wpnStr = "하이브리드 (Hybrid)";
        if (this.player.weaponType === 'icefiredance') wpnStr = "아이스 앤드 파이어 댄스 (Transcendence)";`;

if (content.includes(oldResWpnCode)) {
    content = content.replace(oldResWpnCode, newResWpnCode);
    console.log("Successfully patched res-wpn names!");
} else {
    console.log("oldResWpnCode not found.");
}

// L.7027 근처의 wpnStr 코드 변환 (Firebase 랭크 등록)
const oldRankWpnCode = `            let wpnStr = "총 (Gun)";
            if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
            if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
            if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
            if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
            if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
            if (this.player.weaponType === 'dual') wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";`;

const newRankWpnCode = `            let wpnStr = "총 (Gun)";
            if (this.player.weaponType === 'sword') wpnStr = "검 (Sword)";
            if (this.player.weaponType === 'spear') wpnStr = "창 (Spear)";
            if (this.player.weaponType === 'whip') wpnStr = "채찍 (Whip)";
            if (this.player.weaponType === 'lightning') wpnStr = "번개마법 (Lightning)";
            if (this.player.weaponType === 'fire') wpnStr = "불마법 (Fire)";
            if (this.player.weaponType === 'ice') wpnStr = "얼음마법 (Ice)";
            if (this.player.weaponType === 'dual') wpnStr = "하이브리드 (Hybrid)";
            if (this.player.weaponType === 'icefiredance') wpnStr = "아이스 앤드 파이어 댄스 (Transcendence)";`;

if (content.includes(oldRankWpnCode)) {
    content = content.replace(oldRankWpnCode, newRankWpnCode);
    console.log("Successfully patched Firebase rank-wpn names!");
} else {
    console.log("oldRankWpnCode not found.");
}

// 변경된 내용을 UTF-8로 덮어씁니다.
fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved successfully!");
