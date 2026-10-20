#pragma once

// unsigned char のような複数単語の基底型を持つ enum のパーステスト用フィクスチャ

enum class NoteType : unsigned char {
    NORMAL        = 0,
    ACCIACCATURA  = 0x1,
    APPOGGIATURA  = 0x2,
    GRACE4        = 0x4,
    GRACE16       = 0x8,
    GRACE32       = 0x10,
    GRACE8_AFTER  = 0x20,
    GRACE16_AFTER = 0x40,
    GRACE32_AFTER = 0x80,
    INVALID       = 0xFF
};

enum class PlayEventType : unsigned char {
    Auto, ///< Play events for all notes are calculated by MuseScore.
    User, ///< Some play events are modified by user.
};

enum AccidentalType : unsigned char {
    NONE,
    FLAT,
    NATURAL,
    SHARP,
    SHARP2,
    FLAT2
};
