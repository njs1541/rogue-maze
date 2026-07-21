// --------------------------------------------------------------------------
// SpawnManager: 5대 다채로운 몬스터 스폰 시스템 (5-Spawn System) 제어 모듈
// --------------------------------------------------------------------------

const SpawnManager = {
    // 활성화된 네온 소환진(Rift Zones) 관리 배열
    activeRiftZones: [],
    // 4문 일제 소환 트리거 대기 상태 플래그
    isAmbushArmed: false,

    /**
     * 1. 입구 문 팩 스폰 (Portal Pac Spawn)
     */
    triggerPortalPacSpawn(gameEngine, count = 3) {
        if (!gameEngine || !gameEngine.monsters) return;
        let doors = this.getSpawnDoors(gameEngine);
        if (doors.length === 0) return;

        let curRoom = (gameEngine && gameEngine.roomNum) || 1;
        let tier = Math.min(10, Math.floor((curRoom - 1) / 10) + 1);

        for (let i = 0; i < count; i++) {
            let door = doors[Math.floor(Math.random() * doors.length)];
            let m = new Monster(door.x + (Math.random() * 40 - 20), door.y + (Math.random() * 40 - 20), tier, curRoom);
            gameEngine.monsters.push(m);

            if (gameEngine.particles) {
                for (let k = 0; k < 10; k++) {
                    let angle = Math.random() * Math.PI * 2;
                    let spd = Math.random() * 3 + 1.5;
                    gameEngine.particles.push(new Particle(m.x, m.y, '#00f0ff', 2, Math.cos(angle) * spd, Math.sin(angle) * spd, 18, 'spark'));
                }
            }
        }

        if (gameEngine.showFloatingText && gameEngine.player) {
            gameEngine.showFloatingText("🚪 PORTAL PAC SPAWN! (3마리 입구 소환)", gameEngine.player.x, gameEngine.player.y - 35, '#00f0ff');
        }
    },

    /**
     * 2. 바닥 네온 소환진 기습 스폰 (Rift Zone Spawn - 1.5초 바닥 예고 룬 점멸 후 출현)
     */
    triggerRiftZoneSpawn(gameEngine, count = 2) {
        if (!gameEngine || !gameEngine.monsters) return;
        let curRoom = (gameEngine && gameEngine.roomNum) || 1;

        for (let i = 0; i < count; i++) {
            let pos = this.getRandomEmptyFloorPos(gameEngine);
            if (!pos) continue;

            // 1.5초(90프레임) 예고 객체 생성
            let riftObj = {
                x: pos.x,
                y: pos.y,
                timer: 90,
                maxTimer: 90,
                radius: 30,
                roomNum: curRoom
            };
            this.activeRiftZones.push(riftObj);

            // 파티클 엔진에 1.5초 지속 바닥 예고 룬 생성
            if (gameEngine.particles) {
                let warningP = new Particle(pos.x, pos.y, '#ff007f', 32, 0, 0, 90, 'rift_warning_ring');
                warningP.riftObj = riftObj;
                gameEngine.particles.push(warningP);
            }
        }

        if (gameEngine.showFloatingText && gameEngine.player) {
            gameEngine.showFloatingText("⚡ RIFT ZONE AMBUSH! (1.5초 네온 룬 예고 중)", gameEngine.player.x, gameEngine.player.y - 35, '#ff007f');
        }
    },

    /**
     * 3. 필드 미리 배치 스폰 (Pre-Spawned Field)
     */
    triggerPreSpawnedField(gameEngine, count = 4) {
        if (!gameEngine || !gameEngine.monsters) return;
        let curRoom = (gameEngine && gameEngine.roomNum) || 1;
        let tier = Math.min(10, Math.floor((curRoom - 1) / 10) + 1);

        for (let i = 0; i < count; i++) {
            let pos = this.getRandomEmptyFloorPos(gameEngine);
            if (!pos) continue;
            let m = new Monster(pos.x, pos.y, tier, curRoom);
            gameEngine.monsters.push(m);
        }

        if (gameEngine.showFloatingText && gameEngine.player) {
            gameEngine.showFloatingText("🛡️ PRE-SPAWNED FIELD! (4마리 선배치 휴면)", gameEngine.player.x, gameEngine.player.y - 35, '#00f5d4');
        }
    },

    /**
     * 4. 3문 릴레이 쇄도 스폰 (3-Door Relay Rush)
     */
    triggerRelayRushSpawn(gameEngine, count = 5) {
        if (!gameEngine) return;
        let doors = this.getSpawnDoors(gameEngine);
        if (doors.length === 0) return;

        let curRoom = (gameEngine && gameEngine.roomNum) || 1;
        let tier = Math.min(10, Math.floor((curRoom - 1) / 10) + 1);

        let spawned = 0;
        let interval = setInterval(() => {
            if (spawned >= count || !gameEngine.monsters) {
                clearInterval(interval);
                return;
            }
            let door = doors[spawned % doors.length];
            let m = new Monster(door.x + (Math.random() * 20 - 10), door.y + (Math.random() * 20 - 10), tier, curRoom);
            gameEngine.monsters.push(m);
            spawned++;
        }, 350);

        if (gameEngine.showFloatingText && gameEngine.player) {
            gameEngine.showFloatingText("⚠️ 3-DOOR RELAY RUSH! (5마리 릴레이 출현)", gameEngine.player.x, gameEngine.player.y - 35, '#ffb703');
        }
    },

    /**
     * 5. 트리거 기습 4문 일제 소환 대기 (Arm Ambush)
     */
    arm4DoorAmbush(gameEngine) {
        this.isAmbushArmed = true;
        if (gameEngine && gameEngine.showFloatingText && gameEngine.player) {
            gameEngine.showFloatingText("🔒 4-DOOR AMBUSH ARMED! (방 중앙/충전소 도달 시 일제 앰부시)", gameEngine.player.x, gameEngine.player.y - 35, '#ff0055');
        }
    },

    /**
     * 5. 트리거 기습 4문 일제 소환 격발 (Trigger Ambush Attack)
     */
    trigger4DoorAmbush(gameEngine) {
        if (!gameEngine || !gameEngine.monsters) return;
        this.isAmbushArmed = false; // 대기 해제
        let doors = this.getAllDoors(gameEngine);
        let curRoom = (gameEngine && gameEngine.roomNum) || 1;
        let tier = Math.min(10, Math.floor((curRoom - 1) / 10) + 1);

        doors.forEach(door => {
            for (let i = 0; i < 2; i++) {
                let m = new Monster(door.x + (Math.random() * 30 - 15), door.y + (Math.random() * 30 - 15), tier, curRoom);
                gameEngine.monsters.push(m);

                if (gameEngine.particles) {
                    for (let k = 0; k < 8; k++) {
                        let angle = Math.random() * Math.PI * 2;
                        let spd = Math.random() * 4 + 2;
                        gameEngine.particles.push(new Particle(door.x, door.y, '#ff0055', 2.5, Math.cos(angle) * spd, Math.sin(angle) * spd, 22, 'spark'));
                    }
                }
            }
        });

        if (gameEngine.showFloatingText && gameEngine.player) {
            gameEngine.showFloatingText("🚨 4-DOOR AMBUSH ATTACK! (8마리 문 일제 앰부시)", gameEngine.player.x, gameEngine.player.y - 40, '#ff0055');
        }
    },

    /**
     * 프레임 업데이트: 예고 룬 카운트다운 및 트리거 앰부시 감시
     */
    update(gameEngine) {
        if (!gameEngine || !gameEngine.monsters) return;

        // 1. 소환진 기습 예고 룬 타이머 처리 및 출현
        for (let i = this.activeRiftZones.length - 1; i >= 0; i--) {
            let r = this.activeRiftZones[i];
            r.timer--;
            if (r.timer <= 0) {
                let curRoom = r.roomNum || 1;
                let tier = Math.min(10, Math.floor((curRoom - 1) / 10) + 1);
                let m = new Monster(r.x, r.y, tier, curRoom);

                let ambushTypes = ['chaser', 'exploder', 'shooter'];
                m.type = ambushTypes[Math.floor(Math.random() * ambushTypes.length)];
                gameEngine.monsters.push(m);

                if (gameEngine.particles) {
                    for (let k = 0; k < 12; k++) {
                        let angle = Math.random() * Math.PI * 2;
                        let spd = Math.random() * 4 + 1.5;
                        gameEngine.particles.push(new Particle(r.x, r.y, '#ff007f', 2.5, Math.cos(angle) * spd, Math.sin(angle) * spd, 20, 'spark'));
                    }
                }

                this.activeRiftZones.splice(i, 1);
            }
        }

        // 2. 트리거 앰부시 감시 (플레이어가 맵 중앙 180px 이내 도달 또는 충전소 근처 도달 시)
        if (this.isAmbushArmed && gameEngine.player) {
            let px = gameEngine.player.x;
            let py = gameEngine.player.y;
            let cx = (gameEngine.mapWidth || 2200) / 2;
            let cy = (gameEngine.mapHeight || 1500) / 2;
            let distToCenter = Math.hypot(px - cx, py - cy);

            if (distToCenter < 180 || gameEngine.nearChargingStation) {
                this.trigger4DoorAmbush(gameEngine);
            }
        }
    },

    // 헬퍼: 맵 문 포털 위치 가져오기
    getSpawnDoors(gameEngine) {
        let all = this.getAllDoors(gameEngine);
        if (all.length <= 1) return all;
        return all.slice(1);
    },

    getAllDoors(gameEngine) {
        let presetName = (gameEngine && gameEngine.currentMapPreset) || 'PRESET_SIZE_NORMAL';
        let doors = [];

        if (typeof PORTAL_SPAWN_INFOS !== 'undefined' && PORTAL_SPAWN_INFOS[presetName]) {
            let infos = PORTAL_SPAWN_INFOS[presetName];
            for (let dir in infos) {
                if (infos[dir] && typeof infos[dir].x === 'number') {
                    doors.push({ x: infos[dir].x, y: infos[dir].y });
                }
            }
        }

        if (doors.length === 0) {
            let mapW = (gameEngine && gameEngine.mapWidth) || 2200;
            let mapH = (gameEngine && gameEngine.mapHeight) || 1500;
            doors = [
                { x: mapW / 2, y: 120 },        // top
                { x: mapW / 2, y: mapH - 120 }, // bottom
                { x: 120, y: mapH / 2 },        // left
                { x: mapW - 120, y: mapH / 2 }  // right
            ];
        }

        return doors;
    },

    // 헬퍼: 맵 빈 floor 위치 추첨
    getRandomEmptyFloorPos(gameEngine) {
        let mapW = (gameEngine && gameEngine.mapWidth) || 2200;
        let mapH = (gameEngine && gameEngine.mapHeight) || 1500;

        for (let i = 0; i < 30; i++) {
            let rx = 200 + Math.random() * (mapW - 400);
            let ry = 200 + Math.random() * (mapH - 400);

            let inWall = false;
            if (gameEngine && gameEngine.isTileWall) {
                inWall = gameEngine.isTileWall(rx, ry);
            }

            if (!inWall) {
                return { x: rx, y: ry };
            }
        }
        return { x: mapW / 2, y: mapH / 2 };
    }
};

window.SpawnManager = SpawnManager;
