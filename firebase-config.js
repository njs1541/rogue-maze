/**
 * ==========================================================================
 * Neon Rogue-Maze - firebase-config.js (실시간 랭킹 시스템 설정 및 연동 API)
 * 
 * * 윈도우 로컬 파일 환경(file://) 및 웹서버 환경 모두에서 CORS 에러 없이 
 *   동작하기 위해 Firebase Compat v8 API를 사용합니다.
 * * 파이어베이스 연결 실패 또는 미설정 시 로컬 저장소(LocalStorage)를 
 *   폴백(Fallback)으로 자동 전환하여 오프라인에서도 즉시 테스트가 가능합니다!
 * ==========================================================================
 */

// --------------------------------------------------------------------------
// 1. Firebase 설정 (본인의 Firebase 프로젝트 설정값으로 변경해 주세요!)
// --------------------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyDf1Ti_w6f8e7F2sluCFKSkgsmC1J1vGF0",
    authDomain: "rogue-maze-1a44b.firebaseapp.com",
    projectId: "rogue-maze-1a44b",
    storageBucket: "rogue-maze-1a44b.firebasestorage.app",
    messagingSenderId: "421089196444",
    appId: "1:421089196444:web:81d8ae242b6f8b10533059"
};

// --------------------------------------------------------------------------
// 2. 랭킹 시스템 코어 클래스 (RankSystem)
// --------------------------------------------------------------------------
class NeonRankSystem {
    constructor() {
        this.db = null;
        this.isOnline = false;
        this.initialized = false;
    }

    // 시스템 초기화
    init() {
        if (this.initialized) return;

        // 1) 파이어베이스 SDK 존재 여부 체크
        if (typeof firebase !== 'undefined') {
            try {
                // 사용자가 설정을 교체하지 않았거나 기본값인 경우 로컬 모드로 자동 전환 (에러 크래시 방지)
                if (firebaseConfig.apiKey === "YOUR_API_KEY_HERE" || !firebaseConfig.apiKey) {
                    console.warn("⚠️ Firebase 설정이 기본값입니다. 로컬 랭킹 모드(LocalStorage)로 시작합니다.");
                    this.isOnline = false;
                } else {
                    // Firebase 초기화
                    firebase.initializeApp(firebaseConfig);
                    this.db = firebase.firestore();
                    this.isOnline = true;
                    console.log("⚡ Firebase Firestore 랭킹 시스템이 성공적으로 온라인 연동되었습니다.");
                }
            } catch (error) {
                console.error("❌ Firebase 초기화 에러 (로컬 랭킹 모드로 대체합니다):", error);
                this.isOnline = false;
            }
        } else {
            console.warn("⚠️ Firebase SDK가 로드되지 않았습니다. 오프라인 로컬 랭킹 모드로 구동됩니다.");
            this.isOnline = false;
        }

        this.initialized = true;
    }

    // 현재 연도와 월을 조합하여 시즌제 컬렉션명 반환 (매월 1일 자동 초기화 효과)
    getCurrentCollectionName() {
        const now = new Date();
        const year = now.getFullYear();
        // 월 포맷팅 (예: 5 -> 05)
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `rankings_${year}_${month}`;
    }

    // 랭킹 최대 개수를 100개로 트리밍(100위 이하 자동 삭제)하는 청소 메소드
    async trimRankingsLimit(collectionName, maxCount = 100) {
        if (!this.isOnline || !this.db) return;

        try {
            // 이번 시즌 랭킹을 점수 높은 순으로 전체 조회
            const snapshot = await this.db.collection(collectionName)
                .orderBy('score', 'desc')
                .get();

            // 만약 100개 초과라면, 100위 밖(index 100부터)의 모든 문서 삭제
            if (snapshot.size > maxCount) {
                const batch = this.db.batch();
                let deleteCount = 0;
                
                snapshot.docs.forEach((doc, index) => {
                    if (index >= maxCount) {
                        batch.delete(doc.ref);
                        deleteCount++;
                    }
                });

                if (deleteCount > 0) {
                    await batch.commit();
                    console.log(`🧹 랭킹 정밀 트리밍 완료: 이번 달 랭킹 100위 바깥 노후 데이터 ${deleteCount}건이 자동 정리되었습니다.`);
                }
            }
        } catch (error) {
            console.error("⚠️ 랭킹 데이터 청소(Trimming) 실패:", error);
        }
    }

    // 랭킹 기록 등록 메소드
    async addRankRecord(name, score, room, kills, weapon) {
        this.init(); // 지연 초기화 보장

        // 입력 문자열 유효성 검사 (영문 대문자 및 숫자만 허용, 길이는 1~10자)
        const nameRegex = /^[A-Z0-9]+$/;
        if (!name || name.trim() === "" || !nameRegex.test(name)) {
            throw new Error("닉네임은 영문 대문자와 숫자 조합(공백 없음)으로만 가능합니다.");
        }
        if (name.length > 10) {
            throw new Error("닉네임은 최대 10자까지만 입력 가능합니다.");
        }

        const record = {
            name: name.trim().toUpperCase(),
            score: parseInt(score) || 0,
            room: parseInt(room) || 1,
            kills: parseInt(kills) || 0,
            weapon: weapon || "총 (Gun)",
            timestamp: this.isOnline ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
        };

        const collectionName = this.getCurrentCollectionName();

        if (this.isOnline && this.db) {
            try {
                // 1) 파이어베이스 보안 규칙 미설정 등으로 인한 무한 펜딩 방지용 5초 타임아웃 프로미스 레이스 적용
                const firestorePromise = this.db.collection(collectionName).add(record);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Firestore 서버 응답 시간 초과 (5초)")), 5000)
                );

                await Promise.race([firestorePromise, timeoutPromise]);

                // 2) 등록 후 최대 100개 상한 유지를 위한 백그라운드 트리밍(Trimming) 호출
                // 비동기로 호출하여 랭킹 제출 시의 랙을 최소화
                this.trimRankingsLimit(collectionName, 100);

                return { success: true, mode: 'online' };
            } catch (error) {
                console.error("❌ Firestore 랭킹 등록 실패. 로컬에 백업 저장합니다:", error);
                this.saveToLocal(record);
                return { success: true, mode: 'fallback', message: "네트워크 오류 또는 권한 문제로 로컬에 임시 저장되었습니다." };
            }
        } else {
            // 오프라인 폴백: LocalStorage 저장
            this.saveToLocal(record);
            return { success: true, mode: 'local' };
        }
    }

    // 랭킹 목록 조회 메소드 (기본 10명 반환)
    async getTopRankings(limitCount = 10) {
        this.init();

        const collectionName = this.getCurrentCollectionName();

        if (this.isOnline && this.db) {
            try {
                // [인덱스 에러 완치] 복합 인덱스 요구 문제를 우회하기 위해 단일 필드 score로만 쿼리!
                // 최대 100개까지 점수 내림차순으로 긁어온 뒤 클라이언트 단에서 2차 병합 정렬을 처리하여 인덱스 에러를 아예 없앱니다!
                const firestorePromise = this.db.collection(collectionName)
                    .orderBy('score', 'desc')
                    .limit(100)
                    .get();

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Firestore 랭킹 로드 시간 초과 (5초)")), 5000)
                );

                const snapshot = await Promise.race([firestorePromise, timeoutPromise]);

                const rankings = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Firestore Timestamp 변환
                    let dateStr = "";
                    if (data.timestamp) {
                        const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                        const monthDay = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                        const time = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                        dateStr = `${monthDay}<br>${time}`;
                    } else {
                        dateStr = "방금 전";
                    }

                    rankings.push({
                        name: data.name,
                        score: data.score,
                        room: data.room,
                        kills: data.kills,
                        weapon: data.weapon,
                        date: dateStr
                    });
                });

                // [변경] 파이어베이스 통신이 정상적으로 완료되었다면 로컬 랭킹을 병합하지 않고
                // 오직 파이어베이스 온라인 데이터 기준으로만 정렬하여 반환합니다.
                rankings.sort((a, b) => b.score - a.score || b.room - a.room);

                // 최종 limitCount로 슬라이싱하여 반환
                return rankings.slice(0, limitCount);
            } catch (error) {
                console.error("❌ Firestore 랭킹 읽기 실패. 로컬 저장소 데이터를 출력합니다:", error);
                return this.getLocalRankings(limitCount);
            }
        } else {
            // 오프라인 로컬 저장소 랭킹 데이터 정렬 후 반환
            return this.getLocalRankings(limitCount);
        }
    }

    // [로컬 폴백 전용] LocalStorage 데이터 저장
    saveToLocal(record) {
        if (typeof record.timestamp !== 'number') {
            record.timestamp = Date.now();
        }

        try {
            const localData = JSON.parse(localStorage.getItem('neon_rogue_rankings')) || [];
            localData.push(record);
            
            // 고득점 순으로 100개까지만 버퍼 유지 (로컬도 100개 상한)
            localData.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (b.room !== a.room) return b.room - a.room;
                return a.timestamp - b.timestamp;
            });

            localStorage.setItem('neon_rogue_rankings', JSON.stringify(localData.slice(0, 100)));
        } catch (e) {
            console.error("LocalStorage 저장 공간 실패:", e);
        }
    }

    // [로컬 폴백 전용] LocalStorage 데이터 읽기
    getLocalRankings(limitCount = 10) {
        try {
            const localData = JSON.parse(localStorage.getItem('neon_rogue_rankings')) || [];
            
            // 테스트용 더미 랭킹 데이터가 없을 시, 플레이를 유도하고 리더보드가 빈 화면이 되지 않게 네온 글로우 봇들 추가
            if (localData.length === 0) {
                const dummyRankers = [
                    { name: "NEON_ALPHA", score: 95000, room: 100, kills: 780, weapon: "검 + 총 + 창 + 원소 (Hybrid)", timestamp: Date.now() - 86400000 * 3 },
                    { name: "CYBER_BOT", score: 54000, room: 78, kills: 420, weapon: "번개마법 (Lightning)", timestamp: Date.now() - 86400000 * 2 },
                    { name: "ROGUE_RUN", score: 28900, room: 45, kills: 231, weapon: "총 (Gun)", timestamp: Date.now() - 86400000 },
                    { name: "SWORD_MSTR", score: 18200, room: 32, kills: 145, weapon: "검 (Sword)", timestamp: Date.now() - 3600000 * 5 }
                ];
                localStorage.setItem('neon_rogue_rankings', JSON.stringify(dummyRankers));
                localData.push(...dummyRankers);
            }

            localData.sort((a, b) => b.score - a.score || b.room - a.room);

            return localData.slice(0, limitCount).map(data => {
                const date = new Date(data.timestamp);
                const monthDay = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                const time = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                const dateStr = `${monthDay}<br>${time}`;
                return {
                    name: data.name,
                    score: data.score,
                    room: data.room,
                    kills: data.kills,
                    weapon: data.weapon,
                    date: dateStr
                };
            });
        } catch (e) {
            console.error("LocalStorage 로드 실패:", e);
            return [];
        }
    }

    // [로컬 폴백 전용] 온라인 랭킹과 로컬 임시 기록 병합
    mergeWithLocal(onlineRanks, limitCount = 10) {
        try {
            const localData = JSON.parse(localStorage.getItem('neon_rogue_rankings')) || [];
            if (localData.length === 0) return onlineRanks;

            // 로컬 임시 데이터 포맷팅
            const formattedLocal = localData.map(data => {
                const date = new Date(data.timestamp);
                const monthDay = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                const time = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                const dateStr = `${monthDay}<br>${time}`;
                return {
                    name: data.name,
                    score: data.score,
                    room: data.room,
                    kills: data.kills,
                    weapon: data.weapon,
                    date: dateStr,
                    isLocalTemp: true
                };
            });

            // 두 배열 합쳐서 고득점 정렬
            const combined = [...onlineRanks, ...formattedLocal];
            
            // 이름과 점수, 방 도달 정보가 완전히 똑같으면 중복 제거 (로컬 등록 기록이 이미 서버에 전송되었을 수 있음)
            const unique = [];
            const seen = new Set();
            for (const item of combined) {
                const key = `${item.name}_${item.score}_${item.room}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(item);
                }
            }

            unique.sort((a, b) => b.score - a.score || b.room - a.room);
            return unique.slice(0, limitCount);
        } catch (e) {
            return onlineRanks;
        }
    }
}

// 전역 바인딩
window.RankSystem = new NeonRankSystem();
