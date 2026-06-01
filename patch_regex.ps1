$path = "game.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# ---------------------------------------------------------
# [1] Player.updateWeaponType 메서드 주입
# ---------------------------------------------------------
$pattern1 = 'return baseAspd;\s*\}\s*update\(\)'
$replace1 = @'
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

    update()
'@

if ($content -match $pattern1) {
    $content = $content -replace $pattern1, $replace1
    Write-Host "Successfully injected updateWeaponType!" -ForegroundColor Green
} else {
    Write-Host "Failed to find baseAspd insertion point." -ForegroundColor Red
}

# ---------------------------------------------------------
# [2] GameEngine.shootWeapon 다중 마법 활성화 검사부 개편
# ---------------------------------------------------------
$pattern2 = 'shootWeapon\(\)\s*\{\s*let isLightning = this\.player\.weaponType === ''lightning'';\s*let isFire = this\.player\.weaponType === ''fire'';\s*let isIce = this\.player\.weaponType === ''ice'';\s*let isWhip = false;[\s\S]*?let isDual = this\.player\.weaponType === ''dual'';'
$replace2 = @'
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

if ($content -match $pattern2) {
    $content = $content -replace $pattern2, $replace2
    Write-Host "Successfully patched shootWeapon header!" -ForegroundColor Green
} else {
    $pattern2_double = 'shootWeapon\(\)\s*\{\s*let isLightning = this\.player\.weaponType === "lightning";\s*let isFire = this\.player\.weaponType === "fire";\s*let isIce = this\.player\.weaponType === "ice";\s*let isWhip = false;[\s\S]*?let isDual = this\.player\.weaponType === "dual";'
    if ($content -match $pattern2_double) {
        $content = $content -replace $pattern2_double, $replace2
        Write-Host "Successfully patched shootWeapon header (double quote)!" -ForegroundColor Green
    } else {
        Write-Host "Failed to patch shootWeapon header." -ForegroundColor Red
    }
}

# ---------------------------------------------------------
# [3] GameEngine.fireBulletPack 다중 마법 교차 사격 개편
# ---------------------------------------------------------
$pattern3 = '// dual\(치트\)\s*상태일\s*때는\s*3종\s*마법탄\s*and\s*일반탄을\s*섞어서\s*폭사![\s\S]*?if\s*\(isDual\)\s*\{[\s\S]*?\}'
$replace3 = @'
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

if ($content -match $pattern3) {
    $content = $content -replace $pattern3, $replace3
    Write-Host "Successfully patched fireBulletPack hybrid logic!" -ForegroundColor Green
} else {
    $pattern3_simple = 'let bulletIsLightning = isLightning;[\s\S]*?if\s*\(isDual\)\s*\{\s*let randType = Math\.random\(\);[\s\S]*?\}'
    if ($content -match $pattern3_simple) {
        $content = $content -replace $pattern3_simple, $replace3
        Write-Host "Successfully patched fireBulletPack via simple regex!" -ForegroundColor Green
    } else {
        Write-Host "Failed to patch fireBulletPack hybrid logic." -ForegroundColor Red
    }
}

# ---------------------------------------------------------
# [4] applyRewardCard 보상 카드 개별 획득 부분 교체 (sword, spear, whip, lightning, fire, ice)
# ---------------------------------------------------------

# case 'sword' 치환
$patternSword = 'case\s+''sword'':\s*if\s*\(p\.weaponType\s*===\s*[^)]+\)\s*\{\s*p\.weaponType\s*=\s*[^;]+;\s*\}\s*else\s*if\s*\([\s\S]*?\}\s*break;'
$replaceSword = @'
case 'sword':
                p.weaponLevels.sword = Math.min(5, (p.weaponLevels.sword || 0) + 1);
                this.showFloatingText("SWORD UNLOCKED 🪓", p.x, p.y - 30, '#b026ff');
                p.updateWeaponType();
                break;
'@

if ($content -match $patternSword) {
    $content = $content -replace $patternSword, $replaceSword
    Write-Host "Successfully patched case sword!" -ForegroundColor Green
} else {
    $patternSword_double = 'case\s+"sword":\s*if\s*\(p\.weaponType\s*===\s*[^)]+\)\s*\{\s*p\.weaponType\s*=\s*[^;]+;\s*\}\s*else\s*if\s*\([\s\S]*?\}\s*break;'
    if ($content -match $patternSword_double) {
        $content = $content -replace $patternSword_double, $replaceSword
        Write-Host "Successfully patched case sword (double quote)!" -ForegroundColor Green
    } else {
        Write-Host "Failed to patch case sword." -ForegroundColor Red
    }
}

# case 'spear' 치환
$patternSpear = 'case\s+''spear'':\s*if\s*\(p\.weaponType\s*===\s*[^)]+\)[\s\S]*?SPEAR\s*MAXIMIZED![\s\S]*?\}\s*break;'
$replaceSpear = @'
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

if ($content -match $patternSpear) {
    $content = $content -replace $patternSpear, $replaceSpear
    Write-Host "Successfully patched case spear!" -ForegroundColor Green
} else {
    $patternSpear_double = 'case\s+"spear":\s*if\s*\(p\.weaponType\s*===\s*[^)]+\)[\s\S]*?SPEAR\s*MAXIMIZED![\s\S]*?\}\s*break;'
    if ($content -match $patternSpear_double) {
        $content = $content -replace $patternSpear_double, $replaceSpear
        Write-Host "Successfully patched case spear (double quote)!" -ForegroundColor Green
    } else {
        Write-Host "Failed to patch case spear." -ForegroundColor Red
    }
}

# case 'whip' 치환
$patternWhip = 'case\s+''whip'':\s*if\s*\(p\.weaponType\s*===\s*[^)]+\)[\s\S]*?WHIP\s*MAXIMIZED![\s\S]*?\}\s*break;'
$replaceWhip = @'
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

if ($content -match $patternWhip) {
    $content = $content -replace $patternWhip, $replaceWhip
    Write-Host "Successfully patched case whip!" -ForegroundColor Green
} else {
    $patternWhip_double = 'case\s+"whip":\s*if\s*\(p\.weaponType\s*===\s*[^)]+\)[\s\S]*?WHIP\s*MAXIMIZED![\s\S]*?\}\s*break;'
    if ($content -match $patternWhip_double) {
        $content = $content -replace $patternWhip_double, $replaceWhip
        Write-Host "Successfully patched case whip (double quote)!" -ForegroundColor Green
    } else {
        Write-Host "Failed to patch case whip." -ForegroundColor Red
    }
}

# case 'lightning' 치환
$patternLightning = 'case\s+''lightning'':\s*p\.weaponType\s*=\s*''lightning'';[\s\S]*?break;'
$replaceLightning = @'
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

if ($content -match $patternLightning) {
    $content = $content -replace $patternLightning, $replaceLightning
    Write-Host "Successfully patched case lightning!" -ForegroundColor Green
} else {
    $patternLightning_double = 'case\s+"lightning":\s*p\.weaponType\s*=\s*"lightning";[\s\S]*?break;'
    if ($content -match $patternLightning_double) {
        $content = $content -replace $patternLightning_double, $replaceLightning
        Write-Host "Successfully patched case lightning (double quote)!" -ForegroundColor Green
    } else {
        Write-Host "Failed to patch case lightning." -ForegroundColor Red
    }
}

# case 'fire' 치환
$patternFire = 'case\s+''fire'':\s*p\.weaponType\s*=\s*''fire'';[\s\S]*?break;'
$replaceFire = @'
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

if ($content -match $patternFire) {
    $content = $content -replace $patternFire, $replaceFire
    Write-Host "Successfully patched case fire!" -ForegroundColor Green
} else {
    $patternFire_double = 'case\s+"fire":\s*p\.weaponType\s*=\s*"fire";[\s\S]*?break;'
    if ($content -match $patternFire_double) {
        $content = $content -replace $patternFire_double, $replaceFire
        Write-Host "Successfully patched case fire (double quote)!" -ForegroundColor Green
    } else {
        Write-Host "Failed to patch case fire." -ForegroundColor Red
    }
}

# case 'ice' 치환
$patternIce = 'case\s+''ice'':\s*p\.weaponType\s*=\s*''ice'';[\s\S]*?break;'
$replaceIce = @'
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

if ($content -match $patternIce) {
    $content = $content -replace $patternIce, $replaceIce
    Write-Host "Successfully patched case ice!" -ForegroundColor Green
} else {
    $patternIce_double = 'case\s+"ice":\s*p\.weaponType\s*=\s*"ice";[\s\S]*?break;'
    if ($content -match $patternIce_double) {
        $content = $content -replace $patternIce_double, $replaceIce
        Write-Host "Successfully patched case ice (double quote)!" -ForegroundColor Green
    } else {
        Write-Host "Failed to patch case ice." -ForegroundColor Red
    }
}

# ---------------------------------------------------------
# [5] 스탯창/결과창/Firebase 무기명 일괄 패치
# ---------------------------------------------------------
$patternStatWpn = 'if\s*\(this\.player\.weaponType\s*===\s*[''"]dual['"]\)\s*wpnStr\s*=\s*[''"]검\s*\+\s*총\s*\+\s*창\s*\+\s*원소\s*\(Hybrid\)['"'];'
$replaceStatWpn = @'
if (this.player.weaponType === 'dual') wpnStr = "하이브리드 (Hybrid)";
        if (this.player.weaponType === 'whip') wpnStr = "채찍 (Whip)";
        if (this.player.weaponType === 'icefiredance') wpnStr = "아이스 앤드 파이어 댄스 (Transcendence)";
'@

if ($content -match $patternStatWpn) {
    $content = $content -replace $patternStatWpn, $replaceStatWpn
    Write-Host "Successfully patched weapon name stat display!" -ForegroundColor Green
} else {
    Write-Host "Failed to patch weapon name stat display." -ForegroundColor Red
}

# ---------------------------------------------------------
# [6] applyWeaponCheat 치트 개편
# ---------------------------------------------------------
$patternCheat = 'applyWeaponCheat\s*\(\s*wpnType\s*\)\s*\{[\s\S]*?showFloatingText\([\s\S]*?\);\s*\}'
$replaceCheat = @'
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

if ($content -match $patternCheat) {
    $content = $content -replace $patternCheat, $replaceCheat
    Write-Host "Successfully patched applyWeaponCheat!" -ForegroundColor Green
} else {
    Write-Host "Failed to patch applyWeaponCheat." -ForegroundColor Red
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "Regex patches completed!" -ForegroundColor Cyan
