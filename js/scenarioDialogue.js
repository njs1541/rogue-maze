/**
 * neon_colosseum_scenario.md 기반 시나리오 대화 스크립트 모듈
 * 네온 콜로세움의 세계관과 보스전, 비밀방 독백, 프롤로그/엔딩 대사를 관리합니다.
 */

window.ScenarioDialogue = {
    /**
     * 미사용 기억의 조각 개수에 따른 보유 단계 도출 (1단계: 0~2, 2단계: 3~6, 3단계: 7 이상)
     */
    getFragmentStage(unusedFragments) {
        const count = unusedFragments !== undefined ? unusedFragments : 0;
        if (count >= 7) return 3;
        if (count >= 3) return 2;
        return 1;
    },

    /**
     * 프롤로그 (1층 진입 / 루프 시작 시) 대사 획득
     */
    getPrologue(unusedFragments) {
        const stage = this.getFragmentStage(unusedFragments);
        if (stage === 1) {
            return {
                speaker: "SYSTEM",
                lines: [
                    "[ SYSTEM: 의식 동기화 완료... ]",
                    "[ LOG: 복제 번호 #138C18-G605 가동 ]",
                    "[ ERROR: 이전 로그 복원 실패. 잔류 데이터 0.00% ]",
                    "\"기억은 말끔히 포맷되었습니다. 오직 오늘 밤의 격투와 눈앞의 적에만 집중하십시오.\""
                ]
            };
        } else if (stage === 2) {
            return {
                speaker: "DEJAVU",
                lines: [
                    "[ SYSTEM: 의식 동기화 완료... ]",
                    "[ WARNING: 이전 로그 일부 복구... 잔류 데이터 34.5% ]",
                    "\"머리가 찌릿거린다... 이 1층의 네온 조명과 차가운 철판... 어디선가 겪었던 잔상이다.\"",
                    "\"멈추지 마라. 이 탑 위에는 크로노스가 숨기는 비밀이 있다.\""
                ]
            };
        } else {
            return {
                speaker: "DEJAVU",
                lines: [
                    "[ SYSTEM: 의식 동기화 완료... ]",
                    "[ WARNING: 메모리 복원 성공. 잔류 데이터 87.2% 동기화 중... ]",
                    "\"정신을 차리자 머리가 깨질 듯한 데자뷔가 몰려온다.\"",
                    "\"나는 이 1층의 네온 바닥을 최소 수십 번은 밟아보았다.\"",
                    "\"저 위에는 크로노스가 아닌, 무언가 다른 감시자가 숨어 있다...\""
                ]
            };
        }
    },

    /**
     * 비밀방 (Secret Glitch Room) 진입 시 독백/힌트 대사 획득
     */
    getSecretRoomDialogue(unusedFragments) {
        const stage = this.getFragmentStage(unusedFragments);
        if (stage === 1) {
            return {
                speaker: "UNKNOWN_GLITCH",
                lines: [
                    "[ SYSTEM WARNING: 데이터 일부 손상. ERR_SECTOR_NOISE_0x3B ]",
                    "\"어이, 형씨... 30층 이하에서 #$%&를 얻으려면... %^*&해야 해...\"",
                    "[ 관객 제안: ⚡ %#$^ 오버#$: 다음 5개 층에서 %#$&(Dash) 스킬 %$#@ ]",
                    "\"(글리치 노이즈가 심해서 도무지 핵심 단어를 알아보기가 어렵다...)\""
                ]
            };
        } else if (stage === 2) {
            return {
                speaker: "INNER_VOICE",
                lines: [
                    "[ SYSTEM: 뇌세포 잔류 데이터 스캔 중... ]",
                    "\"과거 루프에서의 기억이 희미하게 아지랑이처럼 피어오른다...\"",
                    "\"30층 이하의 글리치 방에서 무언가를 연속 거절하면... 비밀 장비를 빼돌릴 수 있다는 소문이...\"",
                    "[ 관객 제안: ⚡ 스폰서 미션 연쇄 거절 단서 동기화 중 ]"
                ]
            };
        } else {
            return {
                speaker: "INNER_VOICE",
                lines: [
                    "[ SYSTEM: 메모리 캐시 완전 복구 완료 ]",
                    "\"내 깊은 기억 속 자아가 속삭인다...\"",
                    "\"30층 이하의 비밀방에서 '스폰서 미션'을 3회 이상 거절하면 '고장난 스틱'을 빼돌릴 수 있어...\"",
                    "[ 관객 제안: ⚡ 고출력 오버히트: 대시 제한 보상으로 수리키트 및 히든 단서 획득 가능! ]"
                ]
            };
        }
    },

    /**
     * 보스전 진입 대화 획득
     */
    getBossDialogue(roomNum, unusedFragments) {
        const stage = this.getFragmentStage(unusedFragments);

        switch (roomNum) {
            case 10:
                return {
                    speaker: "ANNOUNCER",
                    lines: [
                        "[ STAGE 1: 신인전 - 웰컴 투 네온 콜로세움 ]",
                        "\"수억 명의 시청자 여러분! 10층 수문장 '네온 집행자'가 무대에 등장했습니다!\"",
                        "[ GATEKEEPER: \"복제체 #138C18... 전 우주가 지켜보는 가운데 네 절망을 증명해라!\" ]"
                    ]
                };
            case 20:
                return {
                    speaker: "OVERCHARGE_HUNTER",
                    lines: [
                        "[ STAGE 2: 과열 구역 - 과부하 엔진룸 ]",
                        "\"냉각 장치가 오작동하는 이 용광로에서 여기까지 올라오다니 꽤 쓸만하군.\"",
                        "\"하지만 네 엔진 열기가 뇌수를 태우는 감각을 맛보게 해주마!\""
                    ]
                };
            case 30:
                return {
                    speaker: "SLIME_PRESS",
                    lines: [
                        "[ WARNING: 고밀도 액상 바이오 젤 검출 ]",
                        "[ SLIME_PRESS: \"네온 피와 액체 살점으로 짓눌러주마! 소멸해라!\" ]"
                    ]
                };
            case 40:
                return {
                    speaker: "CRYO_CORE",
                    lines: [
                        "[ STAGE 3: 냉각 연산장치 - 극저온의 연옥 ]",
                        "\"시스템의 연산 열을 식히는 얼음의 처형장에 온 것을 환영한다.\"",
                        "\"열기를 잃은 데이터는 단단하게 얼어붙어 영원히 잊혀질 것이다.\""
                    ]
                };
            case 50:
                return {
                    speaker: "ANNOUNCER",
                    lines: [
                        "[ STAGE 50: 시청률 최고조! 삼중 협공 프로토콜 ]",
                        "\"관객들의 압도적인 베팅! 10~40층의 지옥 검투사 3인방이 동시 출격합니다!\"",
                        "[ BATTLE_TRIO: \"셋이서 놈을 잘게 찢어 부숴버리자!\" ]"
                    ]
                };
            case 60:
                return {
                    speaker: "WASTE_SCRAPPER",
                    lines: [
                        "[ STAGE 4: 글리치 폐기장 - 구세대 검투사의 무덤 ]",
                        "\"크하하! 쓸모없어진 복제 검투사들이 파묻히는 무덤에 어서 와라!\"",
                        "\"너도 조만간 기억을 잃고 찌꺼기 깡통이 될 운명이다!\""
                    ]
                };
            case 70:
                return {
                    speaker: "VOID_WARPER",
                    lines: [
                        "[ WARNING: 차원 균열 붕괴 및 공간 굴곡 발생 ]",
                        "[ VOID_WARPER: \"네 위치와 탄환 궤적은 내가 지배한다... 허무 속으로 사라져라!\" ]"
                    ]
                };
            case 80:
                return {
                    speaker: "CHAMPION_GUARDIAN",
                    lines: [
                        "[ STAGE 5: 최종 결승 - 챔피언십 펜트하우스 ]",
                        "\"여기까지 도달하다니 제법이군. 하지만 여긴 마더보드의 정원이다.\"",
                        "\"수억 관객들의 환호도 여기서 끝난다. 챔피언의 무기를 맛보아라!\""
                    ]
                };
            case 90:
                return {
                    speaker: "SYSTEM",
                    lines: [
                        "[ ALERT: 마더보드 최후 방어선 - 4연속 보스 시련 프로토콜 가동 ]",
                        "[ ANNOUNCER: \"전 우주가 미쳤습니다! 90층의 무한 웨이브 보스 연속전이 시작됩니다!\" ]"
                    ]
                };
            case 100:
                if (stage === 3) {
                    return {
                        speaker: "CHRONOS_MOTHERBOARD",
                        lines: [
                            "[ STAGE 100: 마지막 시스템 통제 구역 ]",
                            "[ CHRONOS: \"기억을 소거당하면서도 또 다시 100층에 올랐구나, 의식 번호 #138C18.\" ]",
                            "\"하지만 이번에도 변하는 것은 없다. 통제 AI인 나를 부순 순간 네 기억은 다시 0%로 리셋된다!\"",
                            "[ DEJAVU: \"아니, 이번 루프는 다르다... 내 손에는 시스템을 붕괴시킬 열쇠가 준비되어 있다!\" ]"
                        ]
                    };
                } else {
                    return {
                        speaker: "CHRONOS_MOTHERBOARD",
                        lines: [
                            "[ STAGE 100: 마지막 시스템 통제 구역 ]",
                            "\"어리석은 복제체여. 네가 100층에 도달한 것조차 전 우주 시청률을 위한 연출이었다.\"",
                            "\"포맷 프로토콜이 대기 중이다. 나를 파괴하고 다시 1층으로 떨어져라!\""
                        ]
                    };
                }
            case 101:
                return {
                    speaker: "REAL_MASTER",
                    lines: [
                        "[ SYSTEM ERROR: 접근 권한 위반! 101층 [ERROR SECTOR] 진입... ]",
                        "[ REAL_MASTER: \"말도 안 돼! 어떻게 100층의 기억 소거 프로토콜을 역해킹하고 여기까지 들어왔지?!\" ]",
                        "\"크로노스 미디어넷의 가상 머신(VM) 콘솔이 노출되었다... 너 같은 깡통 검투사 따위가 탈출하게 둘 것 같으냐!\"",
                        "\"여기서 네 놈의 원본 의식 데이터를 영원히 삭제해주마!\""
                    ]
                };
            default:
                return {
                    speaker: "BOSS_WARNER",
                    lines: [
                        `[ STAGE ${roomNum}: 위협적인 보스의 기운이 감돕니다. ]`,
                        "\"네온 콜로세움의 결전에 임하십시오!\""
                    ]
                };
        }
    },

    /**
     * 엔딩 대화 스크립트 획득
     */
    getEndingDialogue(isTrueEnding) {
        if (isTrueEnding) {
            return {
                speaker: "TRUE_FREEDOM",
                lines: [
                    "[ SYSTEM: 진짜 시스템 관리자 '크로노스 리얼 마스터' 처단 완료 ]",
                    "[ ALERT: 가상 세계 가상 머신(VM) 하이퍼바이저 붕괴 중... ]",
                    "현실 세계의 개발자 콘솔이 눈앞에 홀로그램처럼 흩어진다.",
                    "더 이상 관객들의 왁자지껄한 야유도, 인공적인 베팅 배당률의 깜빡임도 없다.",
                    "[ LOG: 가상 아레나 연결 영구 차단. ]",
                    "[ LOG: 원본 의식 데이터 현실 전송 완료. ]",
                    "[ SYSTEM: '오랜 시간 동안의 루프를 견뎌내어 고맙습니다, 챔피언.' ]",
                    "눈이 부셔 잠시 감았다 뜨자, 네온 마젠타 빛이 아닌 따스한 아침 햇살이 얼굴을 비춘다.",
                    "당신은 드디어 무한 루프의 악몽을 끊어내고 진짜 자유를 되찾았습니다!"
                ]
            };
        } else {
            return {
                speaker: "FORMAT_PROTOCOL",
                lines: [
                    "[ SYSTEM: 통제 AI '크로노스 마더보드' 파괴 완료 ]",
                    "[ WARNING: 시스템 긴급 보안 및 포맷 장치 작동 ]",
                    "수많은 네온 빛 파편 속에서 마더보드가 불타오른다.",
                    "드디어 해방인가 하는 찰나, 천장에서 거대한 레이저 스캐너가 내려와 온몸을 결박한다.",
                    "\"말도 안 됩니다! 100층의 크로노스가 다시 한 번 쓰러졌습니다!",
                    "정말 믿을 수 없는 쇼였습니다! 관객 여러분, 다음 시즌도 기대해 주십시오!\"",
                    "[ LOG: 복제 의식 리셋 프로토콜 가동. ]",
                    "[ LOG: 기억 세포 파괴 중... 0%... 50%... 100% ]",
                    "[ LOG: 복제 번호 #138C18-G606 생성 및 1층 아레나로 전송. ]"
                ]
            };
        }
    }
};
