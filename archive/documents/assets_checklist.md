# 🎮 Neon Rogue-Maze 에셋 체크리스트

이 문서는 게임 개발에 필요한 이미지 및 사운드 에셋의 리스트와 권장 규격을 관리하는 체크리스트입니다. 에셋이 제작되어 프로젝트에 적용될 때마다 체크박스(`[ ]` -> `[x]`)를 업데이트하여 진행 상황을 관리할 수 있습니다.

---

## 1. 🚨 필수 그래픽 에셋 (우선 순위: 높음)
> [!IMPORTANT]
> [assetManager.js](file:///c:/Users/NZIN/Downloads/%EA%B0%9C%EC%9D%B8%20%EA%B0%9C%EB%B0%9C%EB%B6%84/%EB%AF%B8%EB%A1%9C%EC%B0%BE%EA%B8%B0/js/assetManager.js)의 `manifest`에 선언되어 있어 이미지 파일이 없으면 경고(fallback)가 발생하는 핵심 리소스들입니다.
> **배경이 투명한 PNG 포맷**으로 제작해 주세요.

- [ ] **플레이어 기본 이미지** (`player_idle`)
  - **경로**: `assets/graphics/player/idle.png`
  - **인게임 물리 반경**: 16px (지름 32px)
  - **권장 제작 규격**: `64 x 64 px` 또는 `128 x 128 px`
  - **특징**: 이등변 삼각형 형태를 기반으로 한 우주선 또는 네온 기계 코어 콘셉트. 회전 각도가 적용됩니다.
- [ ] **일반 몬스터 이미지** (`monster_normal`)
  - **경로**: `assets/graphics/monsters/normal.png`
  - **인게임 물리 반경**: 13 ~ 20px (지름 26 ~ 40px, 엘리트는 최대 60px)
  - **권장 제작 규격**: `64 x 64 px` 또는 `128 x 128 px`
- [ ] **원거리 몬스터 이미지** (`monster_shooter`)
  - **경로**: `assets/graphics/monsters/shooter.png`
  - **인게임 물리 반경**: 15 ~ 20px (지름 30 ~ 40px, 엘리트는 최대 60px)
  - **권장 제작 규격**: `64 x 64 px` 또는 `128 x 128 px`
- [ ] **탱커 몬스터 이미지** (`monster_tanker`)
  - **경로**: `assets/graphics/monsters/tanker.png`
  - **인게임 물리 반경**: 21 ~ 30px (지름 42 ~ 60px, 엘리트는 최대 90px)
  - **권장 제작 규격**: `128 x 128 px` (거대함 연출)
- [ ] **플레이어 투사체 이미지** (`bullet_neon`)
  - **경로**: `assets/graphics/projectiles/bullet_neon.png`
  - **인게임 물리 반경**: 4px ~ (공격력 스탯에 비례해 비주얼 확대)
  - **권장 제작 규격**: `16 x 16 px` 또는 `32 x 32 px`

---

## 2. 🔍 추가 그래픽 에셋 후보군 (우선 순위: 보통)
> [!NOTE]
> 코드상에 렌더링 호출(Renderer.drawSprite) 구조는 존재하지만 현재는 이미지 자산이 없어 네온 드로잉 코드로 직접(Fallback) 그려지고 있는 항목들입니다.
> 에셋 제작 시 [assetManager.js](file:///c:/Users/NZIN/Downloads/%EA%B0%9C%EC%9D%B8%20%EA%B0%9C%EB%B0%9C%EB%B6%84/%EB%AF%B8%EB%A1%9C%EC%B0%BE%EA%B8%B0/js/assetManager.js)의 `manifest`에 등록한 뒤 사용해야 합니다.

### 일반/엘리트 몬스터 군 (권장 크기: 64 x 64 px)
- [ ] **추격형 몬스터** (`monster_chaser`) - *인게임 지름 18 ~ 28px*
- [ ] **자폭형 몬스터** (`monster_exploder`) - *인게임 지름 22 ~ 32px*
- [ ] **분열형 몬스터** (`monster_splitter`) - *인게임 지름 30 ~ 44px*
- [ ] **미니 몬스터** (`monster_mini`) - *인게임 지름 14 ~ 20px (32x32px 도 무방)*
- [ ] **확산탄 몬스터** (`monster_scatterer`) - *인게임 지름 28 ~ 40px*
- [ ] **텔레포트 몬스터** (`monster_teleporter`) - *인게임 지름 22 ~ 32px*
- [ ] **소환사 몬스터** (`monster_summoner`) - *인게임 지름 30 ~ 40px*
- [ ] **힐러 몬스터** (`monster_healer`) - *인게임 지름 26 ~ 36px*

### 보스 몬스터 군 (권장 크기: 128 x 128 px 또는 256 x 256 px)
- [ ] **10층 보스 (네온 센티넬)** (`monster_boss`) - *인게임 지름 70px*
- [ ] **20층 보스 (하이퍼 체이서)** (`monster_boss_chaser`) - *인게임 지름 64px*
- [ ] **30층 보스 (마더 슬라임)** (`monster_boss_slime`) - *인게임 지름 80px*
- [ ] **기타 40~90층 보스 및 최종보스 (마더보드 크로노스)** - *인게임 지름 70px ~ 90px*

### 투사체 및 환경 에셋 (권장 크기: 16 x 16 px 또는 32 x 32 px)
- [ ] **적 탄환 이미지** (`bullet_enemy`) - *인게임 지름 8px ~ 12px*
- [ ] **비밀방 포털 / 차원 포털 스프라이트**

---

## 3. 🔊 사운드 에셋 현황
> [!TIP]
> 현재 [sound.js](file:///c:/Users/NZIN/Downloads/%EA%B0%9C%EC%9D%B8%20%EA%B0%9C%EB%B0%9C%EB%B6%84/%EB%AF%B8%EB%A1%9C%EC%B0%BE%EA%B8%B0/js/sound.js)는 Web Audio API를 활용해 코드로 실시간 신디사이징 합성음을 만들고 있습니다.
> 따라서 기본 게임 작동에는 오디오 파일이 전혀 필요하지 않습니다.
> 만약 나중에 고품질 오디오 파일(`.wav`, `.mp3`)로 덮어씌우려면 사운드 로직 개편이 필요하며, 아래 효과음들이 대응 대상입니다.

- **현재 재생 방식**: 브라우저 실시간 합성음 (합성 오실레이터 방식)
- **합성 효과음 리스트**:
  - `shoot` (투사체 발사음)
  - `slash` (검 베기 풍압음)
  - `hit` (피격 타격음)
  - `explosion` (폭발음)
  - `dodge` (회피 성공음)
  - `powerup` (카드/강화 획득음)
  - `gameover` (게임오버 패배음)
  - `victory` (스테이지 최종 승리음)
  - `boss_alert` (보스 출현 사이렌 경고음)
  - `coin` (코인 획득 청아한 음색)
