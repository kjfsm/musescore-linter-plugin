.pragma library
.import "CheckerBase.js" as CheckerBase

function normalizeHairpinType(type) {
    // 0=cresc hairpin, 2=cresc text line → "cresc"
    // 1=decresc hairpin, 3=dim text line → "decresc"
    return (type === 0 || type === 2) ? "cresc" : "decresc";
}

function cresDecresLabel(kind) {
    return kind === "cresc" ? "クレッシェンド" : "デクレッシェンド";
}

// ヘアピン H の tick 範囲と重なるヘアピンを staff T から探す
function findOverlappingHairpin(targetStaff, startTick, endTick, kind) {
    if (!targetStaff.hairpins) return null;
    for (var i = 0; i < targetStaff.hairpins.length; i++) {
        var hp = targetStaff.hairpins[i];
        if (normalizeHairpinType(hp.hairpinType) !== kind) continue;
        // 重なり判定: 範囲が重なっていればマッチ
        if (hp.startTick < endTick && hp.endTick > startTick) {
            return hp;
        }
    }
    return null;
}

// テキスト cresc/decresc イベントを staff から指定 tick で検索
function findCresDecresTextAtTick(staff, tick, kind) {
    for (var e = 0; e < staff.events.length; e++) {
        var ev = staff.events[e];
        if (ev.type !== "text") continue;
        if (ev.tick !== tick) continue;
        var detected = CheckerBase.isCresDecresText(ev.text);
        if (detected === kind) return ev;
    }
    return null;
}

var checker = {
    id: "cres-decres-sync",
    name: "クレッシェンド/デクレッシェンド同期",
    description: "同一リズムのパート間でクレッシェンド/デクレッシェンドの指示が揃っているか確認します",
    level: "WARN",
    run: function(snapshot) {
        var issues = [];
        var staves = snapshot.staves;
        if (!staves || staves.length < 2) return issues;

        var seen = {};

        // === Part 1: ヘアピンスパナーの同期チェック ===
        for (var s = 0; s < staves.length; s++) {
            var srcStaff = staves[s];
            if (!srcStaff.hairpins) continue;

            for (var h = 0; h < srcStaff.hairpins.length; h++) {
                var hp = srcStaff.hairpins[h];
                var kind = normalizeHairpinType(hp.hairpinType);
                var srcFp = CheckerBase.buildRhythmFingerprintInRange(
                    srcStaff, hp.startTick, hp.endTick
                );
                // 空のフィンガープリント（範囲内にイベントなし）はスキップ
                if (srcFp.length === 0) continue;

                for (var t = 0; t < staves.length; t++) {
                    if (t === s) continue;
                    var tgtStaff = staves[t];
                    // 同一パート内のスタッフは比較しない
                    if (tgtStaff.partName === srcStaff.partName) continue;

                    var tgtFp = CheckerBase.buildRhythmFingerprintInRange(
                        tgtStaff, hp.startTick, hp.endTick
                    );
                    if (tgtFp !== srcFp) continue;

                    // リズム一致 → ヘアピンの存在チェック
                    var match = findOverlappingHairpin(tgtStaff, hp.startTick, hp.endTick, kind);
                    var measure = CheckerBase.tickToMeasure(srcStaff, hp.startTick);

                    if (!match) {
                        // テキストベースの cresc/decresc も確認
                        var textMatch = findCresDecresTextAtTick(tgtStaff, hp.startTick, kind);
                        if (textMatch) continue;

                        var missingKey = tgtStaff.staffIdx + "|" + hp.startTick + "|missing|" + kind;
                        if (seen[missingKey]) continue;
                        seen[missingKey] = true;
                        issues.push({
                            ruleId: "cres-decres-sync",
                            severity: "warning",
                            message: tgtStaff.partName + ": " + measure +
                                "小節目の" + cresDecresLabel(kind) +
                                "が他の同リズムパートと揃っていません（不足）",
                            staffIdx: tgtStaff.staffIdx,
                            partName: tgtStaff.partName,
                            measure: measure,
                            tick: hp.startTick
                        });
                    } else {
                        // 開始位置のズレ
                        if (match.startTick !== hp.startTick) {
                            var startKey = Math.min(s, t) + "|" + Math.max(s, t) +
                                "|" + hp.startTick + "|startMismatch|" + kind;
                            if (!seen[startKey]) {
                                seen[startKey] = true;
                                issues.push({
                                    ruleId: "cres-decres-sync",
                                    severity: "warning",
                                    message: tgtStaff.partName + ": " + measure +
                                        "小節目の" + cresDecresLabel(kind) +
                                        "の開始位置が " + srcStaff.partName + " と異なります",
                                    staffIdx: tgtStaff.staffIdx,
                                    partName: tgtStaff.partName,
                                    measure: measure,
                                    tick: hp.startTick
                                });
                            }
                        }
                        // 終了位置のズレ
                        if (match.endTick !== hp.endTick) {
                            var endKey = Math.min(s, t) + "|" + Math.max(s, t) +
                                "|" + hp.startTick + "|endMismatch|" + kind;
                            if (!seen[endKey]) {
                                seen[endKey] = true;
                                issues.push({
                                    ruleId: "cres-decres-sync",
                                    severity: "warning",
                                    message: tgtStaff.partName + ": " + measure +
                                        "小節目の" + cresDecresLabel(kind) +
                                        "の終了位置が " + srcStaff.partName + " と異なります",
                                    staffIdx: tgtStaff.staffIdx,
                                    partName: tgtStaff.partName,
                                    measure: measure,
                                    tick: hp.startTick
                                });
                            }
                        }
                    }
                }
            }
        }

        // === Part 2: テキストベース cresc/decresc の同期チェック ===
        for (var s2 = 0; s2 < staves.length; s2++) {
            var srcStaff2 = staves[s2];
            for (var e = 0; e < srcStaff2.events.length; e++) {
                var ev = srcStaff2.events[e];
                if (ev.type !== "text") continue;
                var textKind = CheckerBase.isCresDecresText(ev.text);
                if (!textKind) continue;

                // このテキスト位置に既にヘアピンスパナーがあればスキップ（Part 1 で処理済み）
                var hasHairpinAtTick = false;
                if (srcStaff2.hairpins) {
                    for (var hh = 0; hh < srcStaff2.hairpins.length; hh++) {
                        if (srcStaff2.hairpins[hh].startTick === ev.tick) {
                            hasHairpinAtTick = true;
                            break;
                        }
                    }
                }
                if (hasHairpinAtTick) continue;

                // テキスト位置の前後で簡易リズム比較（テキスト tick を中心に 1拍分程度）
                // テキストは端点のみなので、同一 tick での存在チェックに簡略化
                for (var t2 = 0; t2 < staves.length; t2++) {
                    if (t2 === s2) continue;
                    var tgtStaff2 = staves[t2];
                    if (tgtStaff2.partName === srcStaff2.partName) continue;

                    // ターゲットに同 tick の同種テキストがあるか
                    var tgtText = findCresDecresTextAtTick(tgtStaff2, ev.tick, textKind);
                    if (tgtText) continue;

                    // ターゲットに同 tick 開始のヘアピンがあるか
                    var tgtHp = null;
                    if (tgtStaff2.hairpins) {
                        for (var hh2 = 0; hh2 < tgtStaff2.hairpins.length; hh2++) {
                            var hp2 = tgtStaff2.hairpins[hh2];
                            if (hp2.startTick === ev.tick &&
                                normalizeHairpinType(hp2.hairpinType) === textKind) {
                                tgtHp = hp2;
                                break;
                            }
                        }
                    }
                    if (tgtHp) continue;

                    // ターゲットに同 tick で chord があるか（同タイミングで音を出しているか）
                    var hasSameTick = false;
                    for (var te = 0; te < tgtStaff2.events.length; te++) {
                        if (tgtStaff2.events[te].tick === ev.tick &&
                            tgtStaff2.events[te].type === "chord" &&
                            tgtStaff2.events[te].voice === 0) {
                            hasSameTick = true;
                            break;
                        }
                    }
                    if (!hasSameTick) continue;

                    var textMissingKey = tgtStaff2.staffIdx + "|" + ev.tick + "|textMissing|" + textKind;
                    if (seen[textMissingKey]) continue;
                    seen[textMissingKey] = true;
                    issues.push({
                        ruleId: "cres-decres-sync",
                        severity: "warning",
                        message: tgtStaff2.partName + ": " + ev.measure +
                            "小節目の" + cresDecresLabel(textKind) +
                            "が他の同リズムパートと揃っていません（不足）",
                        staffIdx: tgtStaff2.staffIdx,
                        partName: tgtStaff2.partName,
                        measure: ev.measure,
                        tick: ev.tick
                    });
                }
            }
        }

        return issues;
    }
};
