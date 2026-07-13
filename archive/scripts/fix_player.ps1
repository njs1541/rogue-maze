$path = "js/player.js"
$lines = [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)

# Remove the extra closing brace at the end
# Find the last non-empty line
$lastNonEmpty = $lines.Count - 1
while ($lastNonEmpty -ge 0 -and $lines[$lastNonEmpty].Trim() -eq '') {
    $lastNonEmpty--
}

# The last three non-empty lines should be: ctx.restore(); then } then }
# We need to remove one of the trailing }
$newLines = New-Object System.Collections.Generic.List[string]
$removed = $false
for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    if (-not $removed -and $lines[$i].Trim() -eq '}') {
        $removed = $true
        Write-Host "Removed extra closing brace at line $($i + 1)"
        continue
    }
    $newLines.Insert(0, $lines[$i])
}

[System.IO.File]::WriteAllLines($path, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "Done. New line count: $($newLines.Count)"
