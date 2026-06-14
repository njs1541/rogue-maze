# start_server.ps1
# Node.js가 없는 환경에서 .NET HttpListener를 이용하여 8000 포트에 정적 파일 웹 서버를 구동합니다.

$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "서버가 시작되었습니다: http://localhost:$port/"
    
    # 3분(180초) 동안만 실행한 후 자동 종료하도록 가드 설정 (서버가 영구히 남는 현상 방지)
    $startTime = Get-Date
    
    while ($listener.IsListening) {
        # 180초 타임아웃 체크
        if (((Get-Date) - $startTime).TotalSeconds -gt 180) {
            Write-Host "3분 타임아웃에 도달하여 서버를 자동 종료합니다."
            break
        }
        
        # 비동기적으로 대기하지 않고 짧은 타임아웃으로 컨텍스트 획득 시도 (폴링 방식)
        $contextTask = $listener.GetContextAsync()
        while (-not $contextTask.IsCompleted) {
            Start-Sleep -Milliseconds 100
            if (((Get-Date) - $startTime).TotalSeconds -gt 180) { break }
        }
        
        if (-not $contextTask.IsCompleted) { continue }
        
        $context = $contextTask.Result
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        
        # URL 디코딩 처리 (한글 경로 대응)
        $urlPath = [Uri]::UnescapeDataString($urlPath)
        
        # 현재 디렉터리 기준으로 파일 절대 경로 획득
        $currentDir = Get-Location
        $filePath = Join-Path $currentDir $urlPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "text/html; charset=utf-8"
            
            if ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
            elseif ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
            elseif ($ext -eq ".png") { $contentType = "image/png" }
            elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $contentType = "image/jpeg" }
            elseif ($ext -eq ".gif") { $contentType = "image/gif" }
            elseif ($ext -eq ".ico") { $contentType = "image/x-icon" }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Error $_
} finally {
    $listener.Stop()
    Write-Host "서버가 종료되었습니다."
}
