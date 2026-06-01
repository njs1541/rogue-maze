$path = "game.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# ---------------------------------------------------------
# [1] Player.updateWeaponType 메서드 주입
# ---------------------------------------------------------
$old1 = @'
        return baseAspd;
    }
'@

$new1 = @'
        return baseAspd;
    }

    // [신규] 플레이어가 해금하여 보유한 무기 조합에 맞춤형 대표 무기 상태 자동 분석 갱신
    updateWeaponType() {
        if (this.weaponLevels.fire === 5 && this.weaponLevels.ice === 5 && this.weaponType === 'icefiredance') {
            return;
        }

        let hasRanged = (this.weaponLevels.fire > 0) || (this.weaponLevels.ice > 0) || (this.weaponLevels.lightning > 0);
        let hasMelee = (this.weaponLevels.sword > 0) || (this.weaponLevels.spear > 0) || (this.weaponLevels.whip > 0);

        if (hasRanged && hasMelee) {
            this.weaponType = 'dual';
        } else if (hasMelee) {
            let highestMelee = 'sword';
            let maxLvl = -1;
            ['sword', 'spear', 'whip'].forEach(type => {
                if ((this.weaponLevels[type] || 0) > maxLvl && (this.weaponLevels[type] || 0) > 0) {
                    maxLvl = this.weaponLevels[type];
                    highestMelee = type;
                }
            });
            this.weaponType = highestMelee;
        } else if (hasRanged) {
            let highestRanged = 'gun';
            let maxLvl = -1;
            ['fire', 'ice', 'lightning'].forEach(type => {
                if ((this.weaponLevels[type] || 0) > maxLvl && (this.weaponLevels[type] || 0) > 0) {
                    maxLvl = this.weaponLevels[type];
                    highestRanged = type;
                }
            });
            this.weaponType = highestRanged;
        } else {
            this.weaponType = 'gun';
        }
    }
'@

# CRLF / LF 호환성을 위해 둘다 변환 시도
$content = $content.Replace($old1, $new1)
$content = $content.Replace(($old1 -replace "`r`n", "`n"), ($new1 -replace "`r`n", "`n"))

# ---------------------------------------------------------
# [2] GameEngine.shootWeapon 다중 마법 활성화 검사부 개편
# ---------------------------------------------------------
$old2 = @'
    shootWeapon() {
        let isLightning = this.player.weaponType === 'lightning';
        let isFire = this.player.weaponType === 'fire';
        let isIce = this.player.weaponType === 'ice';
        let isWhip = false; // 채찍은 즉발형 근접 베기 무기로 개편되었으므로 탄환 발사를 전면 중단함
        let isDual = this.player.weaponType === 'dual';
'@

$new2 = @'
    shootWeapon() {
        let activeMagics = [];
        if (this.player.weaponLevels.fire > 0) activeMagics.push('fire');
        if (this.player.weaponLevels.ice > 0) activeMagics.push('ice');
        if (this.player.weaponLevels.lightning > 0) activeMagics.push('lightning');

        let isLightning = activeMagics.includes('lightning') || this.player.weaponType === 'lightning';
        let isFire = activeMagics.includes('fire') || this.player.weaponType === 'fire';
        let isIce = activeMagics.includes('ice') || this.player.weaponType === 'ice';
        let isWhip = false; // 채찍은 즉발형 근접 베기 무기로 개편되었으므로 탄환 발사를 전면 중단함
        let isDual = this.player.weaponType === 'dual' || (activeMagics.length > 1);
'@

$content = $content.Replace($old2, $new2)
$content = $content.Replace(($old2 -replace "`r`n", "`n"), ($new2 -replace "`r`n", "`n"))

# ---------------------------------------------------------
# [3] GameEngine.fireBulletPack 다중 마법 교차 사격 개편
# ---------------------------------------------------------
$old3 = @'
                    // dual(치트) 상태일 때는 3종 마법탄 and 일반탄을 섞어서 폭사!
                    let bulletIsLightning = isLightning;
                    let bulletIsFire = isFire;
                    let bulletIsIce = isIce;
                    
                    if (isDual) {
                        let randType = Math.random();
                        if (randType < 0.25) bulletIsLightning = true;
                        else if (randType < 0.5) bulletIsFire = true;
                        else if (randType < 0.75) bulletIsIce = true;
                    }
'@

$new3 = @'
                    // dual 상태 및 다중 마법 활성화 시 보유 마법탄을 섞어서 발사!
                    let bulletIsLightning = this.player.weaponType === 'lightning';
                    let bulletIsFire = this.player.weaponType === 'fire';
                    let bulletIsIce = this.player.weaponType === 'ice';
                    
                    if (isDual || activeMagics.length > 0) {
                        let pool = [...activeMagics];
                        if (pool.length > 0) {
                            let chosen = pool[Math.floor(Math.random() * pool.length)];
                            if (chosen === 'lightning') {
                                bulletIsLightning = true;
                                bulletIsFire = false;
                                bulletIsIce = false;
                            } else if (chosen === 'fire') {
                                bulletIsLightning = false;
                                bulletIsFire = true;
                                bulletIsIce = false;
                            } else if (chosen === 'ice') {
                                bulletIsLightning = false;
                                bulletIsFire = false;
                                bulletIsIce = true;
                            }
                        }
                    }
'@

$content = $content.Replace($old3, $new3)
$content = $content.Replace(($old3 -replace "`r`n", "`n"), ($new3 -replace "`r`n", "`n"))

# ---------------------------------------------------------
# [4] applyRewardCard 보상 카드 개별 획득 부분 교체 (sword, spear, whip, lightning, fire, ice)
# ---------------------------------------------------------
# case 'sword' 치환
$oldSword = @'
            case 'sword':
                if (p.weaponType === 'gun' || p.weaponType === 'lightning' || p.weaponType === 'fire' || p.weaponType === 'ice') {
                    p.weaponType = 'sword'; // 사격 및 마법 무기에서 검으로 안전 변경
                } else if (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip') {
                    p.weaponType = 'dual'; // 기존 근접 무기가 존재했다면 즉시 하이브리드로 융합!
                }
                break;
'@

$newSword = @'
            case 'sword':
                p.weaponLevels.sword = Math.min(5, (p.weaponLevels.sword || 0) + 1);
                this.showFloatingText("SWORD UNLOCKED 🪓", p.x, p.y - 30, '#b026ff');
                p.updateWeaponType();
                break;
'@

$content = $content.Replace($oldSword, $newSword)
$content = $content.Replace(($oldSword -replace "`r`n", "`n"), ($newSword -replace "`r`n", "`n"))

# case 'spear' 치환
$oldSpear = @'
            case 'spear':
                if (p.weaponType === 'gun' || p.weaponType === 'lightning' || p.weaponType === 'fire' || p.weaponType === 'ice') {
                    p.weaponType = 'spear'; // 사격 및 마법 무기에서 창으로 안전 변경
                    this.showFloatingText("SPEAR UNLOCKED 🔱", p.x, p.y - 30, '#00f0ff');
                } else if (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip' || p.weaponType === 'dual') {
                    // 이미 근접무기나 창을 가지고 있다면 중복 습득으로 진화 순차 해금!
                    if (p.weaponType !== 'dual' && p.weaponType !== 'spear') {
                        p.weaponType = 'dual'; // 하이브리드로 융합!
                    }
                    
                    // 진화 해금 테크트리: tip -> range -> knockback -> wall -> multi
                    if (!p.weaponUnlocks.spear.tip) {
                        p.weaponUnlocks.spear.tip = true;
                        this.showFloatingText("SPEAR EVOLVE: TIP CRITICAL! 🎯", p.x, p.y - 30, '#00f0ff');
                    } else if (!p.weaponUnlocks.spear.range) {
                        p.weaponUnlocks.spear.range = true;
                        this.showFloatingText("SPEAR EVOLVE: RANGE UP! 📏", p.x, p.y - 30, '#00f0ff');
                    } else if (!p.weaponUnlocks.spear.knockback) {
                        p.weaponUnlocks.spear.knockback = true;
                        this.showFloatingText("SPEAR EVOLVE: HEAVY KNOCKBACK! 🛡️", p.x, p.y - 30, '#00f0ff');
                    } else if (!p.weaponUnlocks.spear.wall) {
                        p.weaponUnlocks.spear.wall = true;
                        this.showFloatingText("SPEAR EVOLVE: WALL CRASH! 💥", p.x, p.y - 30, '#00f0ff');
                    } else if (!p.weaponUnlocks.spear.multi) {
                        p.weaponUnlocks.spear.multi = true;
                        this.showFloatingText("SPEAR EVOLVE: TRIPLE STRIKE! 🔱🔱🔱", p.x, p.y - 30, '#00f0ff');
                    } else {
                        p.atk = Math.round(p.atk * 1.1);
                        this.showFloatingText("SPEAR MAXIMIZED! ATK +10% ⚡", p.x, p.y - 30, '#00f0ff');
                    }
                }
                break;
'@

$newSpear = @'
            case 'spear':
                p.weaponLevels.spear = Math.min(5, (p.weaponLevels.spear || 0) + 1);
                if (p.weaponLevels.spear > 1) {
                    if (!p.weaponUnlocks.spear.tip) {
                        p.weaponUnlocks.spear.tip = true;
                        this.showFloatingText("SPEAR EVOLVE: TIP CRITICAL! 🎯", p.x, p.y - 30, '#00f0ff');
                    } else if (!p.weaponUnlocks.spear.range) {
                        p.weaponUnlocks.spear.range = true;
                        this.showFloatingText("SPEAR EVOLVE: RANGE UP! 📏", p.x, p.y - 30, '#00f0ff');
                    } else if (!p.weaponUnlocks.spear.knockback) {
                        p.weaponUnlocks.spear.knockback = true;
                        this.showFloatingText("SPEAR EVOLVE: HEAVY KNOCKBACK! 🛡️", p.x, p.y - 30, '#00f0ff');
                    } else if (!p.weaponUnlocks.spear.wall) {
                        p.weaponUnlocks.spear.wall = true;
                        this.showFloatingText("SPEAR EVOLVE: WALL CRASH! 💥", p.x, p.y - 30, '#00f0ff');
                    } else if (!p.weaponUnlocks.spear.multi) {
                        p.weaponUnlocks.spear.multi = true;
                        this.showFloatingText("SPEAR EVOLVE: TRIPLE STRIKE! 🔱🔱🔱", p.x, p.y - 30, '#00f0ff');
                    } else {
                        p.atk = Math.round(p.atk * 1.1);
                        this.showFloatingText("SPEAR MAXIMIZED! ATK +10% ⚡", p.x, p.y - 30, '#00f0ff');
                    }
                } else {
                    this.showFloatingText("SPEAR UNLOCKED 🔱", p.x, p.y - 30, '#00f0ff');
                }
                p.updateWeaponType();
                break;
'@

$content = $content.Replace($oldSpear, $newSpear)
$content = $content.Replace(($oldSpear -replace "`r`n", "`n"), ($newSpear -replace "`r`n", "`n"))

# case 'whip' 치환
$oldWhip = @'
            case 'whip':
                if (p.weaponType === 'gun' || p.weaponType === 'lightning' || p.weaponType === 'fire' || p.weaponType === 'ice') {
                    p.weaponType = 'whip'; // 사격 및 마법 무기에서 채찍으로 안전 변경
                    this.showFloatingText("WHIP UNLOCKED 🧣", p.x, p.y - 30, '#ff00aa');
                } else if (p.weaponType === 'sword' || p.weaponType === 'spear' || p.weaponType === 'whip' || p.weaponType === 'dual') {
                    // 이미 근접무기나 채찍을 가지고 있다면 중복 습득으로 진화 순차 해금!
                    if (p.weaponType !== 'dual' && p.weaponType !== 'whip') {
                        p.weaponType = 'dual'; // 하이브리드로 융합!
                    }
                    
                    // 진화 해금 테크트리: haste -> range -> break -> shock -> multi
                    if (!p.weaponUnlocks.whip.haste) {
                        p.weaponUnlocks.whip.haste = true;
                        this.showFloatingText("WHIP EVOLVE: ATTACK HASTE! ⚡", p.x, p.y - 30, '#ff00aa');
                    } else if (!p.weaponUnlocks.whip.range) {
                        p.weaponUnlocks.whip.range = true;
                        this.showFloatingText("WHIP EVOLVE: RANGE UP! 📏", p.x, p.y - 30, '#ff00aa');
                    } else if (!p.weaponUnlocks.whip.break) {
                        p.weaponUnlocks.whip.break = true;
                        this.showFloatingText("WHIP EVOLVE: VULNERABILITY! 💔", p.x, p.y - 30, '#ff00aa');
                    } else if (!p.weaponUnlocks.whip.shock) {
                        p.weaponUnlocks.whip.shock = true;
                        this.showFloatingText("WHIP EVOLVE: SHOCK SPLASH! 💥", p.x, p.y - 30, '#ff00aa');
                    } else if (!p.weaponUnlocks.whip.multi) {
                        p.weaponUnlocks.whip.multi = true;
                        this.showFloatingText("WHIP EVOLVE: MULTI SLASH! 🧣🧣🧣", p.x, p.y - 30, '#ff00aa');
                    } else {
                        // 만렙 달성 이후 중복 획득 시 영구 대미지 +10% 가산 적용
                        p.atk = Math.round(p.atk * 1.1);
                        this.showFloatingText("WHIP MAXIMIZED! ATK +10% ⚡", p.x, p.y - 30, '#ff00aa');
                    }
                }
                break;
'@

$newWhip = @'
            case 'whip':
                p.weaponLevels.whip = Math.min(5, (p.weaponLevels.whip || 0) + 1);
                if (p.weaponLevels.whip > 1) {
                    if (!p.weaponUnlocks.whip.haste) {
                        p.weaponUnlocks.whip.haste = true;
                        this.showFloatingText("WHIP EVOLVE: ATTACK HASTE! ⚡", p.x, p.y - 30, '#ff00aa');
                    } else if (!p.weaponUnlocks.whip.range) {
                        p.weaponUnlocks.whip.range = true;
                        this.showFloatingText("WHIP EVOLVE: RANGE UP! 📏", p.x, p.y - 30, '#ff00aa');
                    } else if (!p.weaponUnlocks.whip.break) {
                        p.weaponUnlocks.whip.break = true;
                        this.showFloatingText("WHIP EVOLVE: VULNERABILITY! 💔", p.x, p.y - 30, '#ff00aa');
                    } else if (!p.weaponUnlocks.whip.shock) {
                        p.weaponUnlocks.whip.shock = true;
                        this.showFloatingText("WHIP EVOLVE: SHOCK SPLASH! 💥", p.x, p.y - 30, '#ff00aa');
                    } else if (!p.weaponUnlocks.whip.multi) {
                        p.weaponUnlocks.whip.multi = true;
                        this.showFloatingText("WHIP EVOLVE: MULTI SLASH! 🧣🧣🧣", p.x, p.y - 30, '#ff00aa');
                    } else {
                        p.atk = Math.round(p.atk * 1.1);
                        this.showFloatingText("WHIP MAXIMIZED! ATK +10% ⚡", p.x, p.y - 30, '#ff00aa');
                    }
                } else {
                    this.showFloatingText("WHIP UNLOCKED 🧣", p.x, p.y - 30, '#ff00aa');
                }
                p.updateWeaponType();
                break;
'@

$content = $content.Replace($oldWhip, $newWhip)
$content = $content.Replace(($oldWhip -replace "`r`n", "`n"), ($newWhip -replace "`r`n", "`n"))

# case 'lightning' 치환
$oldLightning = @'
            case 'lightning':
                p.weaponType = 'lightning'; // 마법 번개무기 강제 장착
                this.showFloatingText("⚡ LIGHTNING MAGIC UNLOCKED! ⚡", p.x, p.y - 30, '#ffdf00');
                break;
'@

$newLightning = @'
            case 'lightning':
                p.weaponLevels.lightning = Math.min(5, (p.weaponLevels.lightning || 0) + 1);
                if (p.weaponLevels.lightning === 5) {
                    this.showFloatingText("⚡ LIGHTNING MAGIC MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#ffdf00');
                } else {
                    this.showFloatingText(`⚡ LIGHTNING MAGIC UPGRADED! (Lv.${p.weaponLevels.lightning}) ⚡`, p.x, p.y - 30, '#ffdf00');
                }
                p.updateWeaponType();
                break;
'@

$content = $content.Replace($oldLightning, $newLightning)
$content = $content.Replace(($oldLightning -replace "`r`n", "`n"), ($newLightning -replace "`r`n", "`n"))

# case 'fire' 치환
$oldFire = @'
            case 'fire':
                p.weaponType = 'fire'; // 불마법 장착
                this.showFloatingText("🔥 FIRE MAGIC UNLOCKED! 🔥", p.x, p.y - 30, '#ff5e00');
                break;
'@

$newFire = @'
            case 'fire':
                if (p.weaponType === 'icefiredance') {
                    p.iceFireProjectilesStack++;
                    this.showFloatingText("EVOLUTION UPGRADE: +2 PROJ! 🌀", p.x, p.y - 30, '#ff5e00');
                    Sound.play('powerup');
                } else {
                    p.weaponLevels.fire = Math.min(5, (p.weaponLevels.fire || 0) + 1);
                    if (p.weaponLevels.fire === 5) {
                        this.showFloatingText("🔥 FIRE MAGIC MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#ff5e00');
                    } else {
                        this.showFloatingText(`🔥 FIRE MAGIC UPGRADED! (Lv.${p.weaponLevels.fire}) 🔥`, p.x, p.y - 30, '#ff5e00');
                    }
                    p.updateWeaponType();
                }
                break;
'@

$content = $content.Replace($oldFire, $newFire)
$content = $content.Replace(($oldFire -replace "`r`n", "`n"), ($newFire -replace "`r`n", "`n"))

# case 'ice' 치환
$oldIce = @'
            case 'ice':
                p.weaponType = 'ice'; // 얼음마법 장착
                this.showFloatingText("❄️ ICE MAGIC UNLOCKED! ❄️", p.x, p.y - 30, '#00f0ff');
                break;
'@

$newIce = @'
            case 'ice':
                if (p.weaponType === 'icefiredance') {
                    p.iceFireProjectilesStack++;
                    this.showFloatingText("EVOLUTION UPGRADE: +2 PROJ! 🌀", p.x, p.y - 30, '#00f0ff');
                    Sound.play('powerup');
                } else {
                    p.weaponLevels.ice = Math.min(5, (p.weaponLevels.ice || 0) + 1);
                    if (p.weaponLevels.ice === 5) {
                        this.showFloatingText("❄️ ICE MAGIC MASTERED! (Lv.5) 👑", p.x, p.y - 30, '#00f0ff');
                    } else {
                        this.showFloatingText(`❄️ ICE MAGIC UPGRADED! (Lv.${p.weaponLevels.ice}) ❄️`, p.x, p.y - 30, '#00f0ff');
                    }
                    p.updateWeaponType();
                }
                break;
'@

$content = $content.Replace($oldIce, $newIce)
$content = $content.Replace(($oldIce -replace "`r`n", "`n"), ($newIce -replace "`r`n", "`n"))

# ---------------------------------------------------------
# [5] 스탯창/결과창/Firebase 무기명 일괄 패치
# ---------------------------------------------------------
$oldStatDisplay = 'if (this.player.weaponType === ''dual'') wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";'
$newStatDisplay = @'
if (this.player.weaponType === 'dual') wpnStr = "하이브리드 (Hybrid)";
        if (this.player.weaponType === 'whip') wpnStr = "채찍 (Whip)";
        if (this.player.weaponType === 'icefiredance') wpnStr = "아이스 앤드 파이어 댄스 (Transcendence)";
'@

$content = $content.Replace($oldStatDisplay, $newStatDisplay)
$content = $content.Replace('if (this.player.weaponType === "dual") wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";', @'
if (this.player.weaponType === "dual") wpnStr = "하이브리드 (Hybrid)";
        if (this.player.weaponType === "whip") wpnStr = "채찍 (Whip)";
        if (this.player.weaponType === "icefiredance") wpnStr = "아이스 앤드 파이어 댄스 (Transcendence)";
'@)

# ---------------------------------------------------------
# [6] applyWeaponCheat 치트 개편
# ---------------------------------------------------------
$oldCheatStr = @'
    applyWeaponCheat(wpnType) {
        this.player.weaponType = wpnType;
        this.updateHUD();
        this.showFloatingText(`WEAPON CHANGED: ${wpnType.toUpperCase()}`, this.player.x, this.player.y - 40, '#00f0ff');
    }
'@

$newCheatStr = @'
    applyWeaponCheat(wpnType) {
        const p = this.player;
        p.weaponLevels = { sword: 0, spear: 0, whip: 0, lightning: 0, fire: 0, ice: 0 };
        if (wpnType === "dual") {
            p.weaponLevels.sword = 5; p.weaponLevels.spear = 5; p.weaponLevels.whip = 5;
            p.weaponLevels.lightning = 5; p.weaponLevels.fire = 5; p.weaponLevels.ice = 5;
        } else if (wpnType === "icefiredance") {
            p.weaponLevels.fire = 5; p.weaponLevels.ice = 5;
        } else if (wpnType === "thorns") {
            p.hasThorns = true; this.showFloatingText("THORNS ENABLED 🌵", p.x, p.y - 40, "#ff00aa"); return;
        } else if (wpnType === "trap") {
            p.hasTrap = true; this.showFloatingText("TRAPS ENABLED 🪤", p.x, p.y - 40, "#ffdf00"); return;
        } else if (wpnType === "time") {
            p.hasTimeWarp = true; this.showFloatingText("TIME WARP ENABLED ⏳", p.x, p.y - 40, "#00ff66"); return;
        } else if (wpnType !== "gun") {
            if (p.weaponLevels.hasOwnProperty(wpnType)) p.weaponLevels[wpnType] = 5;
        }
        p.weaponType = wpnType;
        p.updateWeaponType();
        this.updateHUD();
        this.showFloatingText(`WEAPON CHANGED: ${wpnType.toUpperCase()}`, p.x, p.y - 40, "#00f0ff");
    }
'@

$content = $content.Replace($oldCheatStr, $newCheatStr)

# ---------------------------------------------------------
# [7] 최종 파일 쓰기
# ---------------------------------------------------------
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "All changes successfully restored to game.js!" -ForegroundColor Cyan
