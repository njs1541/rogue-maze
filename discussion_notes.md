# 📝 무기 및 장비 개편 기획 노트 (Discussion Notes)

사용자와 함께 소통하며 결정된 사항과 논의할 질문들을 기록해두는 파일입니다.

---

## ⚔️ [1단계] 무기 종류 및 조합/업그레이드 기획

### ⚙️ 세계관 및 기본 시스템
*   **스토리 컨셉**: 플레이어는 맨몸(안드로이드) 상태로 네온 콜로세움에 던져졌습니다.
*   **기본 무기**: `energy_ball` (에너지볼). 충전 스테이션에서 에너지를 공급받으며, 안드로이드 본체의 MP(에너지)를 소모하여 사격합니다.
*   **부품 조합**: 적들을 처치하고 드롭되는 부품 재료를 습득하여 조잡한 등급의 무기를 직접 제작(조합)합니다.
*   **에너지 충전 스테이션 및 제작 연동**: 
    *   맵에 배치된 **에너지 충전 스테이션의 범위 내에 있을 때만** 제작(조합) UI를 열어 무기를 제작할 수 있습니다.
    *   충전 스테이션에 진입 시 MP가 **매우 매우 천천히** 충전됩니다.
    *   수집한 재화(코인)를 사용하여 스테이션의 성능을 강화(충전 속도 업그레이드)할 수 있습니다.
*   **무기 업그레이드**: 스테이지를 진행하며 조우하는 NPC, 특수 방, 숨겨진 방 등을 통해 조잡한 무기를 하이테크 SF 무기로 진화/업그레이드합니다.

### 🛠️ 조합 부품 재료 (총 11종으로 확장 검토)
기존 8종에 SF 및 안드로이드 테마에 적합한 추가 부품 3종을 추가 검토합니다.

1.  `short_rod` (짧은 막대기)
2.  `long_rod` (긴 막대기)
3.  `metal_plate` (넓은 판)
4.  `blade` (칼날)
5.  `wire` (전선)
6.  `battery` (배터리)
7.  `broken_flamethrower` (고장난 화염방사기)
8.  `cryo_cooler` (과냉각기)
9.  **`sensor_lens` (광학 렌즈)** [신규 추가]: 덫 센서, 드론 조준기 등 광학/탐지용 부품.
10. **`nanite_jar` (나노머신 병)** [신규 추가]: 보호막 생성기, 재생 섀시 등 자가 수리/나노 기술용 부품.
11. **`hydraulic_cylinder` (유압 실린더)** [신규 추가]: 유압 엑소 등 기계 관절 및 동력 전달용 부품.

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

---

### 🚀 2차 진화: 하이테크 SF 무기 (Upgrade Weapons)
NPC 상점, 특수 방, 숨겨진 방에서 강화/업그레이드를 통해 최종 진화하는 무기군입니다.

| 조잡한 무기 | 진화형 하이테크 무기 | 내부 ID | 비주얼 & 효과 |
| :--- | :--- | :--- | :--- |
| `crude_sword` | **플라즈마 세이버 (Plasma Saber)** | `plasma_saber` | 보라/시안 그라데이션 광선 잔상이 남는 검 궤적 |
| `crude_spear` | **에너지 파일벙커 (Energy Pilebunker)** | `energy_pilebunker` | 전방 사출 푸른 관통 빔, 타격 시 EMP 스파크 |
| `crude_whip` | **나노 레이저 와이어 (Nano Laser Wire)** | `nano_laser_wire` | 분홍빛 레이저 와이어 360도 회전 베기 및 감전 |
| `crude_shock` | **체인 EMP 쇼크 (Chain EMP Shock)** | `chain_emp_shock` | 적들 사이 전이되는 청백색 전자기 펄스 아크 |
| `crude_flamethrower` | **융합 플라즈마포 (Fusion Plasma Cannon)** | `fusion_plasma_cannon` | 주황빛 플라즈마 코어 투사체 발사, 폭발 충격파 |
| `crude_cryo` | **저온 동결 빔 (Cryo-Freezer)** | `cryo_freezer` | 청록색 서리 냉각 광선 사출, 몬스터 빙결 데칼 |
| `crude_thorns` | **중력 왜곡 역장 (Gravity Singularity Field)** | `gravity_singularity_field` | 자홍색 원형 중력장 생성, 적 유인 및 감속 |
| `crude_trap` | **근접 전자기 지뢰 (Proximity Cyber-Mine)** | `proximity_cyber_mine` | 바닥 매설 지뢰, 밟을 시 스파크 폭발 및 기절 |
| `crude_scythe` | **보이드 디스트로이어 (Void Destroyer)** | `void_destroyer` | 회전하는 검은 자색 홀로그램 칼날 및 입자 |
| `crude_rail` | **태키온 레일건 (Tachyon Railgun)** | `tachyon_railgun` | 조준 가이드선 투영 후 화면 종단 초대형 광선 |

---

## 🛡️ [2단계] 장비 카테고리 및 명칭 조율
(무기 기획 확정 후 이어서 진행 예정)
