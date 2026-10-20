#pragma once

// API_PROPERTY マクロのパースをテストするためのフィクスチャ。
// MuseScore の elements.h に倣った簡略版。

// マクロ定義はクラス外に存在する（パーサはクラスボディのみを処理するため影響しない）。
#define API_PROPERTY_T(type, name, pid) \
    Q_PROPERTY(QVariant name READ name WRITE set_##name)
#define API_PROPERTY_READ_ONLY_T(type, name, pid) \
    Q_PROPERTY(QVariant name READ name)
#define API_PROPERTY(name, pid) \
    Q_PROPERTY(QVariant name READ name WRITE set_##name)
#define API_PROPERTY_READ_ONLY(name, pid) \
    Q_PROPERTY(QVariant name READ name)

namespace mu::engraving::apiv1 {

class EngravingItem {
    Q_OBJECT
};

class Measure : public EngravingItem {
    Q_OBJECT
    API_PROPERTY_READ_ONLY_T(FractionWrapper*, timesigNominal, TIMESIG_NOMINAL)
    API_PROPERTY_READ_ONLY_T(FractionWrapper*, timesigActual, TIMESIG_ACTUAL)
    API_PROPERTY_T(bool, irregular, IRREGULAR)
    API_PROPERTY(repeatCount, REPEAT_COUNT)
    API_PROPERTY_READ_ONLY(actualKey, ACTUAL_KEY)
    API_PROPERTY_T(qreal, userStretch, USER_STRETCH)
    API_PROPERTY_T(int, accidentalType, ACCIDENTAL_TYPE)
    API_PROPERTY_READ_ONLY_T(int, timesigType, TIMESIG_TYPE)
};

}
