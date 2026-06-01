$path = "game.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# dual 텍스트 단순 치환 (홑따옴표 버전)
$oldStr1 = 'if (this.player.weaponType === ''dual'') wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";'
$newStr1 = 'if (this.player.weaponType === ''dual'') wpnStr = "하이브리드 (Hybrid)";
        if (this.player.weaponType === ''whip'') wpnStr = "채찍 (Whip)";
        if (this.player.weaponType === ''icefiredance'') wpnStr = "아이스 앤드 파이어 댄스 (Transcendence)";'

# dual 텍스트 단순 치환 (쌍따옴표 버전)
$oldStr2 = 'if (this.player.weaponType === "dual") wpnStr = "검 + 총 + 창 + 원소 (Hybrid)";'
$newStr2 = 'if (this.player.weaponType === "dual") wpnStr = "하이브리드 (Hybrid)";
        if (this.player.weaponType === "whip") wpnStr = "채찍 (Whip)";
        if (this.player.weaponType === "icefiredance") wpnStr = "아이스 앤드 파이어 댄스 (Transcendence)";'

# 치환 전후 횟수 카운트
$countBefore = ($content.Split("Hybrid") | Measure-Object).Count - 1
Write-Host "Hybrid string count before patch: $countBefore" -ForegroundColor Yellow

$content = $content.Replace($oldStr1, $newStr1)
$content = $content.Replace($oldStr2, $newStr2)

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "Successfully replaced remaining weapon display names!" -ForegroundColor Green
