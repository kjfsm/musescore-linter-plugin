#pragma once

namespace mu::engraving::apiv1 {

class EngravingItem {
    Q_OBJECT
public:
    Q_PROPERTY(int track READ track WRITE setTrack)
};

class Note : public EngravingItem {
    Q_OBJECT
public:
    Q_PROPERTY(int pitch READ pitch WRITE setPitch)
    Q_PROPERTY(int tpc1 READ tpc1)
    Q_PROPERTY(QString pitchName READ pitchName)

    Q_INVOKABLE QString name() const;
    Q_INVOKABLE void mute(bool muted);
    Q_INVOKABLE Note* nextNote();

    enum class NoteType {
        Normal = 0,
        Acciaccatura = 1,
        Appoggiatura = 2
    };
    Q_ENUM(NoteType)
};

}
