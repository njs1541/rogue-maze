$lines = Get-Content "index.html"
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "targetWidth") {
        Write-Output "$($i + 1): $($lines[$i])"
    }
}
