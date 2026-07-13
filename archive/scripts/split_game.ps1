$lines = Get-Content -Path 'game.backup.js' -Encoding utf8

# Helper function to get line range (1-based index)
function Get-Range($start, $end) {
    # $start to $end is inclusive
    # In $lines array, index is 0-based, so line N is index N-1
    return $lines[($start-1)..($end-1)]
}

# 1. sound.js
Get-Range 1 382 | Set-Content -Path 'sound.js' -Encoding utf8

# 2. particle.js
Get-Range 383 494 | Set-Content -Path 'particle.js' -Encoding utf8

# 3. environment.js (Part 1 + Part 2)
$env1 = Get-Range 495 547
$env2 = Get-Range 2058 2949
$envContent = $env1 + "" + $env2
$envContent | Set-Content -Path 'environment.js' -Encoding utf8

# 4. bullet.js
Get-Range 548 840 | Set-Content -Path 'bullet.js' -Encoding utf8

# 5. pet.js
Get-Range 841 960 | Set-Content -Path 'pet.js' -Encoding utf8

# 6. player.js
Get-Range 961 1468 | Set-Content -Path 'player.js' -Encoding utf8

# 7. monster.js
Get-Range 1469 2057 | Set-Content -Path 'monster.js' -Encoding utf8

# 8. engine.js
Get-Range 2950 8994 | Set-Content -Path 'engine.js' -Encoding utf8

# 9. main.js
Get-Range 8995 9206 | Set-Content -Path 'main.js' -Encoding utf8

Write-Host "Split completed successfully!"
