# 👾 몬스터 종류 세분화 및 다양화 구현 가이드

본 문서는 `rogue-maze` 프로젝트의 몬스터 종류를 최소 10종 이상으로 다양화하고 세분화하기 위한 기획 사양 및 구현 가이드라인입니다. 다른 환경(컴퓨터)으로 코드를 이전하여 작업할 때 참고하실 수 있도록 상세 설계와 코드 수정 위치를 정리했습니다.

---

## 1. 몬스터 라인업 설계 (총 12종)

| 번호 | 타입 ID | 이름 (한글/영문) | 등장 시점 | 주요 기믹 / AI 행동 패턴 | 네온 컬러 & 렌더링 형태 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `normal` | 일반 몬스터 (Normal) | 방 1~ | 기본 추적형. 플레이어를 향해 단순 돌진. | 🔴 붉은색 (`#ff0055`) / 회전 삼각 파편 + 중심핵 |
| 2 | `chaser` | 돌격형 몬스터 (Chaser) | 방 4~ | 대시 돌격형. 속도가 빠르고 2~3초마다 조준 돌진. | 🔸 주황색 (`#ffaa00`) / 날렵한 화살촉 |
| 3 | `shooter` | 원거리 몬스터 (Shooter) | 방 7~ | 저격형. 거리를 유지하며 보라색 탄환 1발 사격. | 🔷 보라색 (`#b026ff`) / 육각형 실드 + 충전 코어 |
| 4 | `exploder` | 자폭 스파크 (Exploder) | 방 4~ | 자폭형. 접근 시 1초(60프레임) 정지 및 점멸 후 폭발. | 💛 노란색 (`#ffea00`) / 마름모 + 점멸 핵 |
| 5 | `splitter` | 분열 슬라임 (Splitter) | 방 7~ | 분열형. 사망 시 2마리의 `mini` 슬라임으로 분열. | 🌐 하늘색 (`#00f0ff`) / 출렁이는 버블 + 두 개의 핵 |
| 6 | `mini` | 미니 슬라임 (Mini) | 분열/소환 | 소형화. 체력은 낮으나 매우 빠른 속도로 돌진. | 💠 짙은 하늘색 (`#00e1ff`) / 아주 작은 구체 |
| 7 | `scatterer` | 방사 사격자 (Scatterer) | 방 10~ | 탄막형. 주기적으로 3방향 부채꼴 탄환 동시 사격. | 💗 마젠타 (`#ff00aa`) / 십자성(Cross) 모양 |
| 8 | `teleporter` | 차원 도약자 (Teleporter) | 방 13~ | 은신/기습. 3~4초마다 주변 무작위 위치로 순간이동. | 💚 민트색 (`#00ffcc`) / 이중 삼각형 모래시계 |
| 9 | `tanker` | 중장갑 탱커 (Tanker) | 방 16~ | 탱커형. 크기가 크고 매우 단단하며 **넉백 면제**. | ⬜ 백색/회색 (`#e2e8f0`) / 두꺼운 팔각형 + 방패 |
| 10 | `summoner` | 차원 소환사 (Summoner) | 방 20~ | 소환형. 도망다니며 주기적으로 `mini` 몬스터 소환. | 💜 바이올렛 (`#8b5cf6`) / 오각형 장막 + 차원 구멍 |
| 11 | `healer` | 나노 치유사 (Healer) | 방 22~ | 서포터. 도망다니며 3초마다 주변 적들의 체력 치유. | 💚 에메랄드 (`#10b981`) / 구형 장막 + 십자가(+) 마크 |
| 12 | `boss` | 보스 몬스터 (Boss) | 매 5의 배수 | 수호자. 시계/반시계 이중 회전 링 및 3방향 부채꼴 연사. | 👑 적색 (`#ff3300`) / 초거대 이중 기계식 링 코어 |

---

## 2. 파일별 구현 가이드 및 수정 포인트

다른 컴퓨터로 소스코드를 가져가신 후 아래 3개의 주요 파일(`js/monster.js`, `js/engine.js`, `js/main.js`)의 가이드 영역을 작업하시면 됩니다.

### ① `js/monster.js` 수정 가이드

#### 1) 생성자 (`constructor`) 내 타입 확률 분배 및 기본 스탯 설정
- `tier`와 `roomNum`에 따라 몬스터의 타입을 결정하는 난이도 곡선을 적용합니다.
- 각 타입에 맞는 `radius`, `speed`, `maxHp`, `atk` 가중치 곱연산을 부여합니다.
- 렌더링 부하를 줄이기 위해 생성 단계에서 네온 스타일의 칠하기 색상(`this.fillColor`)을 정의합니다.

```javascript
// js/monster.js 생성자 예시
constructor(x, y, tier, roomNum = 1) {
    this.x = x;
    this.y = y;
    this.tier = tier;
    this.roomNum = roomNum;
    
    let roomFactor = 1.0 + Math.log10(roomNum) * 1.2 + (roomNum / 20) * 0.6;
    let weaponRoomMultiplier = (window.gameEngine && window.gameEngine.currentRoomType === 'weapon') ? 1.25 : 1.0;

    // 기본 스탯 스케일링
    this.maxHp = Math.ceil((15 + (tier - 1) * 4) * roomFactor * weaponRoomMultiplier);
    this.atk = Math.ceil((5 + (tier - 1) * 1.5) * roomFactor * weaponRoomMultiplier);
    this.speed = 1.2 + Math.min(1.2, (tier - 1) * 0.1);
    if (roomNum >= 50) this.speed = Math.min(2.2, this.speed);
    
    this.scoreValue = tier;
    this.isElite = false;
    this.isBoss = false;

    // 1. 방 번호에 따른 몬스터 타입 무작위 배정
    let typeRand = Math.random();
    if (roomNum < 4) {
        this.type = 'normal';
    } else if (roomNum < 7) {
        this.type = typeRand < 0.5 ? 'normal' : (typeRand < 0.8 ? 'chaser' : 'exploder');
    } else if (roomNum < 11) {
        this.type = typeRand < 0.35 ? 'normal' : (typeRand < 0.6 ? 'chaser' : (typeRand < 0.75 ? 'shooter' : (typeRand < 0.9 ? 'exploder' : 'splitter')));
    } else if (roomNum < 16) {
        this.type = typeRand < 0.25 ? 'normal' : (typeRand < 0.45 ? 'chaser' : (typeRand < 0.6 ? 'shooter' : (typeRand < 0.7 ? 'exploder' : (typeRand < 0.8 ? 'splitter' : (typeRand < 0.9 ? 'teleporter' : 'scatterer')))));
    } else if (roomNum < 22) {
        this.type = typeRand < 0.2 ? 'normal' : (typeRand < 0.35 ? 'chaser' : (typeRand < 0.5 ? 'shooter' : (typeRand < 0.6 ? 'exploder' : (typeRand < 0.7 ? 'splitter' : (typeRand < 0.8 ? 'teleporter' : (typeRand < 0.9 ? 'scatterer' : (typeRand < 0.95 ? 'tanker' : 'summoner')))))));
    } else {
        this.type = typeRand < 0.15 ? 'normal' : (typeRand < 0.28 ? 'chaser' : (typeRand < 0.4 ? 'shooter' : (typeRand < 0.5 ? 'exploder' : (typeRand < 0.6 ? 'splitter' : (typeRand < 0.7 ? 'teleporter' : (typeRand < 0.8 ? 'scatterer' : (typeRand < 0.88 ? 'tanker' : (typeRand < 0.94 ? 'summoner' : 'healer'))))))));
    }

    // 2. 타입별 세부 속성 및 네온 색상 보정
    this.color = '#ff0055';
    this.glowColor = '#ff0055';
    this.fillColor = 'rgba(255, 0, 85, 0.12)';

    switch(this.type) {
        case 'normal':
            this.radius = 12 + Math.min(8, tier);
            break;
        case 'chaser':
            this.radius = 9 + Math.min(5, tier);
            this.speed *= 1.35;
            this.maxHp = Math.ceil(this.maxHp * 0.75);
            this.color = '#ffaa00';
            this.glowColor = '#ffaa00';
            this.fillColor = 'rgba(255, 170, 0, 0.12)';
            this.dashCooldown = 60;
            break;
        case 'shooter':
            this.radius = 14 + Math.min(6, tier);
            this.maxHp = Math.ceil(this.maxHp * 1.2);
            this.speed *= 0.8;
            this.color = '#b026ff';
            this.glowColor = '#b026ff';
            this.fillColor = 'rgba(176, 38, 255, 0.12)';
            this.shootCooldown = 80 + Math.random() * 40;
            break;
        case 'exploder':
            this.radius = 11 + Math.min(5, tier);
            this.maxHp = Math.ceil(this.maxHp * 0.8);
            this.speed *= 1.2;
            this.color = '#ffea00';
            this.glowColor = '#ffea00';
            this.fillColor = 'rgba(255, 234, 0, 0.12)';
            this.explodeTimer = -1;
            break;
        case 'splitter':
            this.radius = 15 + Math.min(7, tier);
            this.maxHp = Math.ceil(this.maxHp * 1.5);
            this.speed *= 0.7;
            this.color = '#00f0ff';
            this.glowColor = '#00f0ff';
            this.fillColor = 'rgba(0, 240, 255, 0.12)';
            break;
        case 'mini':
            this.radius = 7 + Math.min(3, tier);
            this.maxHp = Math.ceil(this.maxHp * 0.35);
            this.speed *= 1.45;
            this.color = '#00e1ff';
            this.glowColor = '#00e1ff';
            this.fillColor = 'rgba(0, 225, 255, 0.12)';
            break;
        case 'scatterer':
            this.radius = 14 + Math.min(6, tier);
            this.maxHp = Math.ceil(this.maxHp * 1.1);
            this.speed *= 0.85;
            this.color = '#ff00aa';
            this.glowColor = '#ff00aa';
            this.fillColor = 'rgba(255, 0, 170, 0.12)';
            this.shootCooldown = 120 + Math.random() * 60;
            break;
        case 'teleporter':
            this.radius = 11 + Math.min(5, tier);
            this.maxHp = Math.ceil(this.maxHp * 0.9);
            this.speed *= 0.95;
            this.color = '#00ffcc';
            this.glowColor = '#00ffcc';
            this.fillColor = 'rgba(0, 255, 204, 0.12)';
            this.teleportCooldown = 180 + Math.random() * 120;
            break;
        case 'tanker':
            this.radius = 20 + Math.min(10, tier);
            this.maxHp = Math.ceil(this.maxHp * 3.0);
            this.speed *= 0.6;
            this.color = '#e2e8f0';
            this.glowColor = '#a0aec0';
            this.fillColor = 'rgba(226, 232, 240, 0.12)';
            this.isTanker = true;
            break;
        case 'summoner':
            this.radius = 15 + Math.min(5, tier);
            this.maxHp = Math.ceil(this.maxHp * 1.3);
            this.speed *= 0.75;
            this.color = '#8b5cf6';
            this.glowColor = '#8b5cf6';
            this.fillColor = 'rgba(139, 92, 246, 0.12)';
            this.summonCooldown = 240 + Math.random() * 120;
            break;
        case 'healer':
            this.radius = 13 + Math.min(5, tier);
            this.maxHp = Math.ceil(this.maxHp * 1.1);
            this.speed *= 0.8;
            this.color = '#10b981';
            this.glowColor = '#10b981';
            this.fillColor = 'rgba(16, 185, 129, 0.12)';
            this.healCooldown = 180 + Math.random() * 60;
            break;
    }
    
    this.hp = this.maxHp; // 최종 갱신
}
```

#### 2) `update(player, bullets)` 내 AI 알고리즘 분기 추가
- **넉백 제어**: `this.isTanker === true`일 경우 넉백 감쇠 직전에 `this.knockbackX = 0; this.knockbackY = 0;`으로 고정하여 넉백 저항을 줍니다.
- **자폭(`exploder`)**: 플레이어와의 거리가 100px 미만일 때 자폭 타이머 `this.explodeTimer = 60`을 기동하여 플레이어를 쫓는 대신 제자리에 멈춥니다. 60프레임 후 체력을 0으로 설정하며 자폭 연쇄 데미지 판정과 노란색 파티클 폭사를 시도합니다.
- **방사 사격자(`scatterer`)**: 3방향 부채꼴 탄환을 발사합니다.
- **차원 도약자(`teleporter`)**: 쿨다운 만료 시 플레이어 주변 150~250px 무작위 좌표로 `x, y`를 워프 시키며 파티클을 뿜습니다.
- **소환사(`summoner`)**: 플레이어와 거리를 유지하며, `mini` 몬스터를 1마리씩 스폰 큐가 아닌 필드 위(`window.gameEngine.monsters.push`)에 다이렉트 소환합니다.
- **치유사(`healer`)**: 플레이어와 거리를 두며, 주기적으로 힐 범위 파동을 내뿜고 범위 내 다른 몬스터들의 체력을 회복시킵니다.

#### 3) `draw(ctx)` 내 프리미엄 기하학 스타일 렌더링 구현
- `exploder` (자폭): 회전하는 마름모와 깜빡이는 점멸핵.
- `splitter` (분열): 스케일 조정을 활용한 말랑말랑한 물방울 형태.
- `scatterer` (방사): 회전하는 4방향 십자 날개.
- `teleporter` (도약): 모래시계형 회전 삼각형 2개 겹침.
- `tanker` (탱커): 단단한 이중 팔각형 구조.
- `summoner` (소환사): 신비로운 오각형 구조와 내부 블랙홀 코어.
- `healer` (치유사): 구체 보호막 내부에 박힌 십자가(+) 마크.

---

### ② `js/engine.js` 수정 가이드

#### 1) `killMonster(m, index)` 내 분열 로직 삽입
몬스터 사망 처리 시점에 분열 몬스터 여부를 검사해 미니 슬라임 2마리를 생성하는 로직을 주입합니다.

```javascript
// js/engine.js의 killMonster 함수 중간 부분
if (m.type === 'splitter') {
    for (let k = 0; k < 2; k++) {
        let mini = new Monster(m.x + (Math.random() * 24 - 12), m.y + (Math.random() * 24 - 12), m.tier, m.roomNum);
        mini.type = 'mini';
        mini.radius = 7 + Math.min(3, mini.tier);
        mini.maxHp = Math.ceil(m.maxHp * 0.35);
        mini.hp = mini.maxHp;
        mini.atk = Math.ceil(m.atk * 0.6);
        mini.speed = m.speed * 1.45;
        mini.color = '#00e1ff';
        mini.glowColor = '#00e1ff';
        mini.fillColor = 'rgba(0, 225, 255, 0.12)';
        
        // 사방으로 튕겨나가는 넉백 관성 추가
        let scatterAngle = Math.random() * Math.PI * 2;
        mini.knockbackX = Math.cos(scatterAngle) * 4.5;
        mini.knockbackY = Math.sin(scatterAngle) * 4.5;
        
        this.monsters.push(mini);
    }
    this.showFloatingText("SPLIT! 💠", m.x, m.y - 30, '#00f0ff');
}
```

---

### ③ `js/main.js` 수정 가이드

#### 1) `BESTIARY_DATA` 도감 목록 정보 확장
도감 모달 UI에 신규 8종의 데이터가 바인딩되도록 객체 리스트를 13종으로 수정 및 확장해 줍니다. (한국어 설명 적용)

```javascript
// js/main.js의 BESTIARY_DATA 예시 추가 데이터
{
    id: "exploder",
    name: "자폭 스파크 (Exploder)",
    type: "exploder",
    icon: "💛",
    color: "#ffea00",
    desc: "위험천만한 노란색 마름모 몬스터입니다. 플레이어에게 바짝 접근하면 자폭 시퀀스에 돌입하여 몸을 격렬하게 깜빡이며 정지합니다. 1초 뒤 범위 내의 적(플레이어)에게 대폭발 피해를 입히고 산화합니다. 깜빡이기 시작할 때 신속히 대시나 카이팅으로 회피해야 합니다.",
    hp: "일반 몬스터 대비 80% 수준",
    atk: "1.5배의 치명적인 자폭 피해",
    speed: "1.44 ~ 2.64 (매우 민첩함)",
    tier: "방 4부터 출현",
    ability: "근접 시 정지 후 1초 카운트다운 폭발"
},
{
    id: "splitter",
    name: "분열 슬라임 (Splitter)",
    type: "splitter",
    icon: "🌐",
    color: "#00f0ff",
    desc: "말랑말랑하게 요동치는 하늘색 버블 형태의 중형 몬스터입니다. 기본 체력이 50%나 높고 느리지만, 처치하는 즉시 2마리의 미니 슬라임으로 분열되어 플레이어를 기습합니다. 분열된 개체까지 완전히 처리해야 방이 정화됩니다.",
    hp: "일반 몬스터 대비 150% 수준",
    atk: "5 ~ (층 비례 인플레이션)",
    speed: "0.84 ~ 1.54 (다소 느림)",
    tier: "방 7부터 출현",
    ability: "사망 시 신속한 미니 슬라임 2개체로 분열"
},
{
    id: "mini",
    name: "미니 슬라임 (Mini)",
    type: "mini",
    icon: "💠",
    color: "#00e1ff",
    desc: "분열되거나 소환사에 의해 출현하는 초소형 슬라임입니다. 체력과 공격력은 매우 약하지만, 크기가 극도로 작아 조준하기 어렵고 기존 속도보다 45%나 빠르게 플레이어를 향해 돌진해 옵니다. 연사형 무기로 빠르게 쓸어 담는 것이 좋습니다.",
    hp: "일반 몬스터 대비 35% 수준",
    atk: "일반 몬스터 대비 60% 수준",
    speed: "1.74 ~ 3.19 (극단적인 돌진 속도)",
    tier: "분열 및 소환 시 출현",
    ability: "극도로 작고 날쌘 몸집으로 돌진"
},
{
    id: "scatterer",
    name: "방사 사격자 (Scatterer)",
    type: "scatterer",
    icon: "💗",
    color: "#ff00aa",
    desc: "사방으로 돌출된 마젠타빛 십자성 형태의 몬스터입니다. 플레이어와 조심스럽게 거리를 유지하며, 주기적으로 3방향의 부채꼴 탄막을 한 번에 동시 발사합니다. 탄막 사이의 사각지대로 피하며 거리를 좁혀 처치해야 합니다.",
    hp: "일반 몬스터 대비 110% 수준",
    atk: "부채꼴 3방향 방사형 사격",
    speed: "1.02 ~ 1.87 (보통)",
    tier: "방 10부터 출현",
    ability: "3방향 부채꼴 다발 탄막 사격"
},
{
    id: "teleporter",
    name: "차원 도약자 (Teleporter)",
    type: "teleporter",
    icon: "💚",
    color: "#00ffcc",
    desc: "회전하는 민트색 모래시계 형태의 몬스터입니다. 플레이어를 은밀히 쫓아오며, 3초 간격으로 흔적을 감춘 뒤 플레이어 주변 150~250px 반경의 사각지대로 불쑥 워프하여 나타납니다. 갑작스러운 텔레포트 피격에 대시를 준비하십시오.",
    hp: "일반 몬스터 대비 90% 수준",
    atk: "5 ~ (층 비례 인플레이션)",
    speed: "1.14 ~ 2.09 (기본 추적 속도)",
    tier: "방 13부터 출현",
    ability: "3초마다 플레이어 근방으로 차원 순간이동"
},
{
    id: "tanker",
    name: "중장갑 탱커 (Tanker)",
    type: "tanker",
    icon: "⬜",
    color: "#e2e8f0",
    desc: "강철빛 네온 팔각형 몸체에 방패형 코어를 가진 거대 적입니다. 느린 이속을 가졌으나 맷집(HP)이 무려 3배에 달하며, 어떤 피격이나 충격에도 밀려나지 않는 완전한 **넉백 면제** 능력을 보유하고 있습니다. 장애물을 끼고 원거리에서 화력을 쏟아부어야 합니다.",
    hp: "일반 몬스터 대비 300% (3배)",
    atk: "8 ~ (몸뚱이 충돌 시 큰 피해)",
    speed: "0.72 ~ 1.32 (매우 묵직하고 느림)",
    tier: "방 16부터 출현",
    ability: "넉백 완전 면제, 3배의 초고체력"
},
{
    id: "summoner",
    name: "차원 소환사 (Summoner)",
    type: "summoner",
    icon: "💜",
    color: "#8b5cf6",
    desc: "사이버네틱 오각형 본체 중앙에 차원 균열을 가진 몬스터입니다. 플레이어가 접근하면 멀어지려 도망다니며, 주기적으로 차원 균열을 열어 미니 슬라임을 필드에 실시간으로 소환해 냅니다. 소환사가 미니 몬스터로 필드를 덮기 전에 1순위로 처단하십시오.",
    hp: "일반 몬스터 대비 130% 수준",
    atk: "직접 공격 없음 (소환 전담)",
    speed: "0.9 ~ 1.65 (도망 이동)",
    tier: "방 20부터 출현",
    ability: "도망 이동 및 주기적 미니 슬라임 소환"
},
{
    id: "healer",
    name: "나노 치유사 (Healer)",
    type: "healer",
    icon: "💚",
    color: "#10b981",
    desc: "에메랄드빛 십자가 구조를 품은 둥근 구형 서포터 몬스터입니다. 전선 뒤에 숨어 플레이어로부터 도망치며, 3~4초마다 초록색 치유 파동 링을 방출하여 반경 내 상처입은 다른 몬스터들의 체력을 회복시킵니다. 전투가 길어지지 않도록 최우선 타겟으로 삼아야 합니다.",
    hp: "일반 몬스터 대비 110% 수준",
    atk: "직접 공격 없음 (아군 광역 힐 전담)",
    speed: "0.96 ~ 1.76 (도망 이동)",
    tier: "방 22부터 출현",
    ability: "3초마다 광역 치유 파동 방출 (주변 적 체력 회복)"
}
```

#### 2) `startMonsterPreview(monsterType)` 캔버스 드로잉 프리뷰 안전 예외 보정
`js/main.js`의 프리뷰 렌더링 코드에 신규 8종의 색상 및 지름(radius) 설정이 누락되지 않도록 추가해주어, 도감 모달을 클릭했을 때 그래픽이 정상적으로 작동하게 합니다.

```javascript
// startMonsterPreview 함수 내부 switch-case 보강
else {
    previewMonster.type = monsterType;
    previewMonster.radius = 16;
    switch(monsterType) {
        case 'chaser':
            previewMonster.color = '#ffaa00';
            previewMonster.glowColor = '#ffaa00';
            break;
        case 'shooter':
            previewMonster.color = '#b026ff';
            previewMonster.glowColor = '#b026ff';
            break;
        case 'exploder':
            previewMonster.color = '#ffea00';
            previewMonster.glowColor = '#ffea00';
            break;
        case 'splitter':
            previewMonster.color = '#00f0ff';
            previewMonster.glowColor = '#00f0ff';
            break;
        case 'mini':
            previewMonster.color = '#00e1ff';
            previewMonster.glowColor = '#00e1ff';
            previewMonster.radius = 10;
            break;
        case 'scatterer':
            previewMonster.color = '#ff00aa';
            previewMonster.glowColor = '#ff00aa';
            break;
        case 'teleporter':
            previewMonster.color = '#00ffcc';
            previewMonster.glowColor = '#00ffcc';
            break;
        case 'tanker':
            previewMonster.color = '#e2e8f0';
            previewMonster.glowColor = '#a0aec0';
            previewMonster.radius = 20;
            previewMonster.isTanker = true;
            break;
        case 'summoner':
            previewMonster.color = '#8b5cf6';
            previewMonster.glowColor = '#8b5cf6';
            break;
        case 'healer':
            previewMonster.color = '#10b981';
            previewMonster.glowColor = '#10b981';
            break;
        default:
            previewMonster.color = '#ff0055';
            previewMonster.glowColor = '#ff0055';
            break;
    }
}
```
