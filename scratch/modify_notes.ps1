$filePath = Join-Path $PSScriptRoot "..\discussion_notes.md"
Write-Host "Target file: $filePath"

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# 1. 1차 제작 테이블 교체
$oldTable = @"
### 🧪 1차 제작: 조잡한 무기 (Crude Weapons)
부품 조합을 통해 1차적으로 제작하는 기본 무기 리스트 및 매핑입니다. (내부 ID 변경 및 레시피 확정)

| 조합 레시피 | 제작 결과 (조잡한 무기) | 내부 ID | 대응하는 기존 무기 |
| :--- | :--- | :--- | :--- |
| 짧은 막대기 + 칼날 | **조잡한 검** | `crude_sword` | `sword` |
| 긴 막대기 + 칼날 | **조잡한 창** | `crude_spear` | `spear` |
| 전선 + 배터리 + 짧은 막대기 | **조잡한 덫** | `crude_trap` | `trap` |
| 넓은 판 + 배터리 + 칼날 | **조잡한 가시갑옷** | `crude_thorns` | `thorns` |
| 배터리 + 전선 | **조잡한 채찍** | `crude_whip` | `whip` |
| 배터리 + 배터리 | **조잡한 전기 충격기** | `crude_shock` | `lightning` |
| 고장난 화염방사기 + 배터리 | **조잡한 화염방사기** | `crude_flamethrower` | `fire` |
| 과냉각기 + 배터리 | **조잡한 동결포** | `crude_cryo` | `ice` |
| 칼날 + 긴 막대기 + 전선 | **조잡한 낫** | `crude_scythe` | `scythe` |
| 배터리 + 배터리 + 전선 | **조잡한 레일건** | `crude_rail` | `railcannon` |
"@

$newTable = @"
### 🧪 1차 제작: 조잡한 무기 (Crude Weapons)
부품 조합을 통해 1차적으로 제작하는 기본 무기 리스트 및 매핑입니다. (내부 ID 변경 및 레시피 확정)

| 조합 레시피 | 제작 결과 (조잡한 무기) | 내부 ID | 대응하는 기존 무기 |
| :--- | :--- | :--- | :--- |
| 짧은 막대기 + 칼날 + 배터리 | **조잡한 진동검** | `crude_sword` | `sword` |
| 긴 막대기 + 칼날 + 유압 실린더 | **조잡한 유압 랜스** | `crude_spear` | `spear` |
| 광학 렌즈 + 전선 + 배터리 | **조잡한 홀로-디코이 지뢰** | `crude_trap` | `trap` |
| 나노머신 병 + 넓은 판 + 배터리 | **조잡한 나노 섀시** | `crude_thorns` | `thorns` |
| 배터리 + 전선 + 유압 실린더 | **조잡한 플라즈마 채찍** | `crude_whip` | `whip` |
| 배터리 + 배터리 + 전선 | **조잡한 테슬라 코일** | `crude_shock` | `lightning` |
| 고장난 화염방사기 + 배터리 + 나노머신 병 | **조잡한 버스터 캐논** | `crude_flamethrower` | `fire` |
| 과냉각기 + 배터리 + 광학 렌즈 | **조잡한 크라이오 건** | `crude_cryo` | `ice` |
| 긴 막대기 + 칼날 + 광학 렌즈 | **조잡한 중력 낫** | `crude_scythe` | `scythe` |
| 배터리 + 배터리 + 전선 + 유압 실린더 | **조잡한 전자기 레일건** | `crude_rail` | `railcannon` |
"@

# 엔터키 표준화 (\r\n -> \n)
$normContent = $content.Replace("`r`n", "`n")
$normOldTable = $oldTable.Replace("`r`n", "`n").Trim()
$normNewTable = $newTable.Replace("`r`n", "`n")

if ($normContent.Contains($normOldTable)) {
    $normContent = $normContent.Replace($normOldTable, $normNewTable)
    Write-Host "1차 제작 테이블 교체 성공"
} else {
    Write-Warning "1차 제작 테이블 매칭 실패, 범위 기반 교체를 시도합니다."
    $tableIndex = $normContent.IndexOf("### 🧪 1차 제작: 조잡한 무기")
    if ($tableIndex -ne -1) {
        $nextHeaderIndex = $normContent.IndexOf("### 🚀 2차 진화: 하이테크 SF 무기", $tableIndex)
        if ($nextHeaderIndex -ne -1) {
            $tablePart = $normContent.Substring($tableIndex, $nextHeaderIndex - $tableIndex)
            $normContent = $normContent.Replace($tablePart, $normNewTable + "`n`n")
            Write-Host "1차 제작 테이블 범위 교체 성공"
        }
    }
}

# 2. 비주얼 상세 기획 부분 교체
$visualHeader = "## 🎨 [2단계] 무기별 비주얼 및 Canvas 렌더링 상세 기획"
$visualIndex = $normContent.IndexOf($visualHeader)

$newVisualSection = @"
## 🎨 [2단계] 무기별 비주얼 및 Canvas 렌더링 상세 기획

개편된 무기 10종의 조잡한 단계(Crude)와 하이테크 진화 단계(Advanced)에 적용할 캔버스 렌더링 방식 및 비주얼 이펙트 상세 정의입니다.

---

### 1. 조잡한 진동검 (Crude Vibro-Blade) & 플라즈마 세이버 (Plasma Saber)
*   **조잡한 단계 (`crude_sword`)**: 
    *   **비주얼 & 메커니즘**: 찌르기와 베기 모션을 캔버스로 그리되, 비주얼 연출을 단순화하여 궤적이 흔들리는 노란색 아크(Arc) 선(두께 3.5px, 반경 110px)으로 묘사하여 고주파 진동 파동 시각화.
    *   **사운드**: 고속 진동 마찰 바람소리.
*   **진화형 (`plasma_saber`)**:
    *   **비주얼**: 네온 보라색과 시안색 그라데이션 광선 베기 궤적(두께 8px, 반경 130px) + 궤적 중심부에 두께 2px의 매우 얇고 눈부신 흰색 코어 궤적을 덧그려 고밀도 레이저 칼날 시각화.
    *   **사운드**: 윙윙거리는 고주파 에너지 슬래시 효과음.

### 2. 조잡한 유압 랜스 (Crude Hydraulic Lance) & 에너지 파일벙커 (Energy Pilebunker)
*   **조잡한 단계 (`crude_spear`)**: 
    *   **비주얼 & 메커니즘**: 찌르기 모션을 캔버스로 그리되, 플레이어 조준 방향으로 순간적으로 쭉 뻗어나가는 주황색 화살표 직선(사거리 100px, 두께 3px)으로만 묘사하여 빠르고 기계적인 피스톤 격발감 연출.
    *   **사운드**: 칙- 쾅! 하는 둔탁한 타격음.
*   **진화형 (`energy_pilebunker`)**:
    *   **비주얼**: 두껍고 화려한 네온 시안/하늘색 빔 라인(사거리 160px, 두께 7.5px) 사출 + 중심에 백색 고농축 에너지 코어선 겹쳐 그리기. 창끝에는 5개의 점으로 이루어진 정교한 다이아몬드형 파일벙커 메카닉 촉 비주얼 및 격발 시 사방으로 비산하는 미세 사이언 스파크 파티클.
    *   **사운드**: 쾅 하는 압축 공기 격발 및 타격음.

### 3. 조잡한 플라즈마 채찍 (Crude Plasma Whip) & 나노 레이저 와이어 (Nano Laser Wire)
*   **조잡한 단계 (`crude_whip`)**: 
    *   **비주얼 & 메커니즘**: 구부러진 회색 케이블 선(두께 2px, 반경 150px) 형태로 그리되, 채찍의 끝부분에만 은은하게 빛나는 노란색 구체(에너지 집속점)가 매달려 원형으로 휘둘러지는 연출.
    *   **사운드**: 찰싹하며 타들어 가는 스파크 타격음.
*   **진화형 (`nano_laser_wire`)**:
    *   **비주얼**: 찬란한 분홍색/네온 자홍색 360도 회전 레이저 와이어(두께 4.5px, 반경 220px) 렌더링. 깔끔한 Sine 곡선 형태의 유연한 S자 파동 궤적 위에 백색 코어 네온 레이저선을 덧그림. 타격 시 몬스터 주변에 감전 핑크 스파크 파티클 생성.
    *   **사운드**: 레이저 전류가 휘감기는 짜릿한 전자음.

### 4. 조잡한 테슬라 코일 (Crude Tesla Coil) & 체인 EMP 쇼크 (Chain EMP Shock)
*   **조잡한 단계 (`crude_shock`)**: 
    *   **비주얼 & 메커니즘**: 플레이어 위치에서 사방으로 얇은 노란색 전기 원형 고리(두께 1.5px, 최대 반경 120px)가 퍼져 나가는 파동으로 묘사하여 광범위 방전 전류를 가시화.
    *   **사운드**: 파지지직 하는 단발 전자기 파동음.
*   **진화형 (`chain_emp_shock`)**:
    *   **비주얼**: 격발 시 플레이어로부터 가장 가까운 적을 시작으로 최대 5명의 적들 사이를 연속해서 타고 흐르는 청백색의 역동적인 전기 아크 체인 렌더링. 전이되는 각 마디(적 위치)마다 밝게 빛나는 사이언 색의 구체 플래시 및 감전 스파크 이펙트 동반.
    *   **사운드**: 파지직하며 연속으로 터지는 전자기 방전음.

### 5. 조잡한 버스터 캐논 (Crude Buster Cannon) & 융합 플라즈마포 (Fusion Plasma Cannon)
*   **조잡한 단계 (`crude_flamethrower`)**: 
    *   **비주얼 & 메커니즘**: 격발 상태를 누르고 있는 동안, 플레이어 레벨별 초당 발사 속도에 따라 플레이어 조준 방향으로 불안정한 주황빛 플라즈마 화염 입자가 방사형(콘 모양)으로 유지되며 일정하게 뿜어져 나오는 지속 투사 방식.
    *   **사운드**: 화염 압축 분출 마찰음.
*   **진화형 (`fusion_plasma_cannon`)**:
    *   **비주얼**: 둥글고 밝은 주황색 오라와 흰색 핵으로 이루어진 거대한 플라즈마 융합 에너지 구체(반경 16px) 발사. 비행 궤적에 주황빛 미세 잔상 파티클을 흩뿌리고, 충돌 시 반경 60px의 보라/주황빛 충격파 원형 고리(Shockwave Ring)가 순간적으로 팽창 후 소멸하는 이펙트.
    *   **사운드**: 폭발적인 포격음 및 에너지 붕괴음.

### 6. 조잡한 크라이오 건 (Crude Cryo Gun) & 저온 동결 빔 (Cryo-Freezer)
*   **조잡한 단계 (`crude_cryo`)**: 
    *   **비주얼 & 메커니즘**: 격발 시 최대 차징 게이지가 다 찰 때까지 대기한 후 발사되는 차지 샷 매커니즘. 차징 완료 후 강하게 발사되는 청록색 서리 눈결정 구체(반경 8px)가 관통하며 높은 확률로 빙결.
    *   **사운드**: 퓨슈우웅- 픽! 하는 차지 냉각 격발음.
*   **진화형 (`cryo_freezer`)**:
    *   **비주얼**: 플레이어 조준 방향으로 하늘색/청록색의 두꺼운 냉각 레이저 빔(두께 10px) 지속 방사. 빔에 피격된 몬스터는 하늘색 반투명 서리 디칼로 몸체가 덮이며, 빙결 상태(이동 불가)가 될 때 눈송이 문양(Ice Decal)이 몬스터 아래 바닥에 그려짐.
    *   **사운드**: 키이잉 하는 냉각 가스 압축 분사음.

### 7. 조잡한 나노 섀시 (Crude Nanite Chassis) & 중력 왜곡 역장 (Gravity Singularity Field)
*   **조잡한 단계 (`crude_thorns`)**: 
    *   **비주얼 & 메커니즘**: 플레이어 주변을 일정한 궤도 속도로 공전하는 3개의 육각형 모양 반투명 에너지 장벽 오라(에메랄드/청록 네온색) 렌더링. 접촉한 적에게 피해를 입히며 플레이어 방어 지원.
    *   **사운드**: 지이잉- 하는 나노 방벽 접촉 차단음.
*   **진화형 (`gravity_singularity_field`)**:
    *   **비주얼**: 플레이어 주변(또는 지정 구역)에 원형의 암자색 중력 공간 형성. 역장의 테두리는 검은색 중심부로 소용돌이치듯 말려 들어가는 궤적선들이 흐르고, 역장 내부는 자홍색 네온 글로우 격자 무늬가 수축/팽창을 반복함. 범위 내 적들의 이동 속도가 대폭 저하되며 중앙으로 강제 흡인됨.
    *   **사운드**: 웅장하게 회전하는 중력 공명음 및 우주적 진동음.

### 8. 조잡한 홀로-디코이 지뢰 (Crude Holo-Decoy Mine) & 근접 전자기 지뢰 (Proximity Cyber-Mine)
*   **조잡한 단계 (`crude_trap`)**: 
    *   **비주얼 & 메커니즘**: 바닥에 플레이어의 30% 크기를 갖는 반투명 노란색 홀로그램 허상(Decoy) 배치. 허상은 지속시간 동안 적의 어그로를 도발하며, 적이 밟거나 접근하면 원형 노란색 전자파 폭발 이펙트와 함께 주위 적들을 기절시킴.
    *   **사운드**: 디지털 허상 노이즈음 및 팡 하는 스파크 폭발음.
*   **진화형 (`proximity_cyber_mine`)**:
    *   **비주얼**: 바닥에 은은한 청색 네온 빛을 내는 세련된 원형 전자 지뢰 매설. 적이 감지 범위에 들어오면 즉시 빨간색으로 격렬하게 깜빡이며 0.2초 충전 타이밍을 준 후, 청색 빛 구체가 구형으로 급팽창하며 터지는 전자기 폭발 글로우 및 격렬한 스파크 연출.
    *   **사운드**: 삐삐빅 소리 후 콰쾅 터지는 전자기 폭사음.

### 9. 조잡한 중력 낫 (Crude Gravity Scythe) & 보이드 디스트로이어 (Void Destroyer)
*   **조잡한 단계 (`crude_scythe`)**: 
    *   **비주얼 & 메커니즘**: 플레이어 주변으로 회전하는 보랏빛 낫 아크 궤적을 그리되, 낫이 휘둘러진 자리에 검은색 원형 중력 잔상(Blackhole Decal)이 0.5초 동안 남아 주위 적들을 아주 미세하게 끌어당기는 기믹.
    *   **사운드**: 슈우욱 하는 무거운 베기 효과음.
*   **진화형 (`void_destroyer`)**:
    *   **비주얼**: 화면의 거의 절반을 휩쓰는 거대하고 어두운 자색 홀로그램 낫 칼날(반경 180px, 두께 12px) 렌더링. 베고 지나간 자리에 밤하늘의 은하수 같은 자색 보이드 성운 입자 잔상이 1초간 남아 부유하며, 피격된 몬스터는 디지털 글리치(찌그러짐) 효과를 겪음.
    *   **사운드**: 공간이 찢어지는 듯한 묵직한 공명 슬래시음.

### 10. 조잡한 전자기 레일건 (Crude Railgun) & 태키온 레일건 (Tachyon Railgun)
*   **조잡한 단계 (`crude_rail`)**: 
    *   **비주얼 & 메커니즘**: 격발 시 얇은 노란색 조준 가이드 선 출력 후, 관통하는 얇은 파란색 스파크 광선 발사. 기본 공격력이 다소 낮지만, 관통 경로상의 몬스터 중심(중앙부)에 정확히 명중할 시 치명적인 크리티컬 데미지 적용.
    *   **사운드**: 찌잉- 팍! 하는 순간 관통 전자기 충격음.
*   **진화형 (`tachyon_railgun`)**:
    *   **비주얼**: 격발 전 화면 끝까지 뻗는 매우 선명한 적색/네온 시안색 점선 조준 레이저선이 타겟들을 타겟팅. 충전 시 플레이어 앞에 고밀도 시안색 구체가 급격히 회전하며 커지고, 격발 순간 화면 전체를 종단하는 초대형 네온 시안 광선 빔(두께 20px) 격발. 화면 전체가 강하게 흔들리며 광선 주변으로 갈라지는 잔가지 전기 아크 번쩍임 연출.
    *   **사운드**: 삐이이잉 차징음 후 광음과 함께 터지는 압도적인 극초음속 격발음.

---

## 🛡️ [3단계] 장비 카테고리 및 명칭 조율
(무기 기획 확정 후 이어서 진행 예정)
"@

if ($visualIndex -ne -1) {
    $prevContent = $normContent.Substring(0, $visualIndex)
    $normContent = $prevContent + $newVisualSection
    Write-Host "비주얼 상세 영역 교체 성공"
} else {
    $normContent = $normContent + "`n`n" + $newVisualSection
    Write-Host "비주얼 상세 영역 추가 성공"
}

# 다시 CRLF로 변경하고 UTF-8 저장
$finalContent = $normContent.Replace("`n", "`r`n")
[System.IO.File]::WriteAllText($filePath, $finalContent, [System.Text.Encoding]::UTF8)
Write-Host "수정 완료"
