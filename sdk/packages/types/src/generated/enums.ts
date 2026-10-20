// @kjfsm/musescore-plugin-sdk-types-generator が自動生成したファイル。手で編集しないこと。
// 再生成するにはリポジトリのルートで `pnpm generate:types` を実行する。


// apiv1 の enum は int で表現されるが、MuseScore のバージョン間で並び替わりうる（例:
// 4.7.2→4.7.3 の ElementType 再採番）。特定の int リテラルに固定せず、実行時にホストの
// 該当プロパティ（例: `host.Element.NOTE`）から解決する前提で「型」だけを表す。
// Tag で enum 種別をブランドし、異なる enum 同士の値比較を型エラーにする。
type EnumValue<Tag extends string> = number & { readonly __enum: Tag };

export type OwnershipName = "PLUGIN" | "SCORE";
export type Ownership = EnumValue<"Ownership">;

export type RewindModeName = "SCORE_START" | "SELECTION_START" | "SELECTION_END";
export type RewindMode = EnumValue<"RewindMode">;

export type InputStateModeName = "INPUT_STATE_INDEPENDENT" | "INPUT_STATE_SYNC_WITH_SCORE";
export type InputStateMode = EnumValue<"InputStateMode">;

export type NoteTypeName = "NORMAL" | "ACCIACCATURA" | "APPOGGIATURA" | "GRACE4" | "GRACE16" | "GRACE32" | "GRACE8_AFTER" | "GRACE16_AFTER" | "GRACE32_AFTER" | "INVALID";
export type NoteType = EnumValue<"NoteType">;

export type PlayEventTypeName = "Auto" | "User";
export type PlayEventType = EnumValue<"PlayEventType">;

export type AccidentalTypeName = "NONE" | "FLAT" | "NATURAL" | "SHARP" | "SHARP2" | "FLAT2" | "SHARP3" | "FLAT3" | "NATURAL_FLAT" | "NATURAL_SHARP" | "SHARP_SHARP" | "FLAT_ARROW_UP" | "FLAT_ARROW_DOWN" | "NATURAL_ARROW_UP" | "NATURAL_ARROW_DOWN" | "SHARP_ARROW_UP" | "SHARP_ARROW_DOWN" | "SHARP2_ARROW_UP" | "SHARP2_ARROW_DOWN" | "FLAT2_ARROW_UP" | "FLAT2_ARROW_DOWN" | "ARROW_DOWN" | "ARROW_UP" | "MIRRORED_FLAT" | "MIRRORED_FLAT2" | "SHARP_SLASH" | "SHARP_SLASH4" | "FLAT_SLASH2" | "FLAT_SLASH" | "SHARP_SLASH3" | "SHARP_SLASH2" | "DOUBLE_FLAT_ONE_ARROW_DOWN" | "FLAT_ONE_ARROW_DOWN" | "NATURAL_ONE_ARROW_DOWN" | "SHARP_ONE_ARROW_DOWN" | "DOUBLE_SHARP_ONE_ARROW_DOWN" | "DOUBLE_FLAT_ONE_ARROW_UP" | "FLAT_ONE_ARROW_UP" | "NATURAL_ONE_ARROW_UP" | "SHARP_ONE_ARROW_UP" | "DOUBLE_SHARP_ONE_ARROW_UP" | "DOUBLE_FLAT_TWO_ARROWS_DOWN" | "FLAT_TWO_ARROWS_DOWN" | "NATURAL_TWO_ARROWS_DOWN" | "SHARP_TWO_ARROWS_DOWN" | "DOUBLE_SHARP_TWO_ARROWS_DOWN" | "DOUBLE_FLAT_TWO_ARROWS_UP" | "FLAT_TWO_ARROWS_UP" | "NATURAL_TWO_ARROWS_UP" | "SHARP_TWO_ARROWS_UP" | "DOUBLE_SHARP_TWO_ARROWS_UP" | "DOUBLE_FLAT_THREE_ARROWS_DOWN" | "FLAT_THREE_ARROWS_DOWN" | "NATURAL_THREE_ARROWS_DOWN" | "SHARP_THREE_ARROWS_DOWN" | "DOUBLE_SHARP_THREE_ARROWS_DOWN" | "DOUBLE_FLAT_THREE_ARROWS_UP" | "FLAT_THREE_ARROWS_UP" | "NATURAL_THREE_ARROWS_UP" | "SHARP_THREE_ARROWS_UP" | "DOUBLE_SHARP_THREE_ARROWS_UP" | "LOWER_ONE_SEPTIMAL_COMMA" | "RAISE_ONE_SEPTIMAL_COMMA" | "LOWER_TWO_SEPTIMAL_COMMAS" | "RAISE_TWO_SEPTIMAL_COMMAS" | "LOWER_ONE_UNDECIMAL_QUARTERTONE" | "RAISE_ONE_UNDECIMAL_QUARTERTONE" | "LOWER_ONE_TRIDECIMAL_QUARTERTONE" | "RAISE_ONE_TRIDECIMAL_QUARTERTONE" | "DOUBLE_FLAT_EQUAL_TEMPERED" | "FLAT_EQUAL_TEMPERED" | "NATURAL_EQUAL_TEMPERED" | "SHARP_EQUAL_TEMPERED" | "DOUBLE_SHARP_EQUAL_TEMPERED" | "QUARTER_FLAT_EQUAL_TEMPERED" | "QUARTER_SHARP_EQUAL_TEMPERED" | "FLAT_17" | "SHARP_17" | "FLAT_19" | "SHARP_19" | "FLAT_23" | "SHARP_23" | "FLAT_31" | "SHARP_31" | "FLAT_53" | "SHARP_53" | "EQUALS_ALMOST" | "EQUALS" | "TILDE" | "SORI" | "KORON" | "TEN_TWELFTH_FLAT" | "TEN_TWELFTH_SHARP" | "ELEVEN_TWELFTH_FLAT" | "ELEVEN_TWELFTH_SHARP" | "ONE_TWELFTH_FLAT" | "ONE_TWELFTH_SHARP" | "TWO_TWELFTH_FLAT" | "TWO_TWELFTH_SHARP" | "THREE_TWELFTH_FLAT" | "THREE_TWELFTH_SHARP" | "FOUR_TWELFTH_FLAT" | "FOUR_TWELFTH_SHARP" | "FIVE_TWELFTH_FLAT" | "FIVE_TWELFTH_SHARP" | "SIX_TWELFTH_FLAT" | "SIX_TWELFTH_SHARP" | "SEVEN_TWELFTH_FLAT" | "SEVEN_TWELFTH_SHARP" | "EIGHT_TWELFTH_FLAT" | "EIGHT_TWELFTH_SHARP" | "NINE_TWELFTH_FLAT" | "NINE_TWELFTH_SHARP" | "SAGITTAL_5V7KD" | "SAGITTAL_5V7KU" | "SAGITTAL_5CD" | "SAGITTAL_5CU" | "SAGITTAL_7CD" | "SAGITTAL_7CU" | "SAGITTAL_25SDD" | "SAGITTAL_25SDU" | "SAGITTAL_35MDD" | "SAGITTAL_35MDU" | "SAGITTAL_11MDD" | "SAGITTAL_11MDU" | "SAGITTAL_11LDD" | "SAGITTAL_11LDU" | "SAGITTAL_35LDD" | "SAGITTAL_35LDU" | "SAGITTAL_FLAT25SU" | "SAGITTAL_SHARP25SD" | "SAGITTAL_FLAT7CU" | "SAGITTAL_SHARP7CD" | "SAGITTAL_FLAT5CU" | "SAGITTAL_SHARP5CD" | "SAGITTAL_FLAT5V7KU" | "SAGITTAL_SHARP5V7KD" | "SAGITTAL_FLAT" | "SAGITTAL_SHARP" | "ONE_COMMA_FLAT" | "ONE_COMMA_SHARP" | "TWO_COMMA_FLAT" | "TWO_COMMA_SHARP" | "THREE_COMMA_FLAT" | "THREE_COMMA_SHARP" | "FOUR_COMMA_FLAT" | "FIVE_COMMA_SHARP" | "END";
export type AccidentalType = EnumValue<"AccidentalType">;

export type AccidentalBracketName = "NONE" | "PARENTHESIS" | "BRACKET" | "BRACE";
export type AccidentalBracket = EnumValue<"AccidentalBracket">;

export type ElementTypeName = "INVALID" | "BRACKET_ITEM" | "PART" | "STAFF" | "SCORE" | "TEXT" | "LAYOUT_BREAK" | "MEASURE_NUMBER" | "MMREST_RANGE" | "INSTRUMENT_NAME" | "BAR_LINE" | "STAFF_LINES" | "SYSTEM_DIVIDER" | "SLUR" | "SLUR_SEGMENT" | "TIE" | "TIE_SEGMENT" | "LAISSEZ_VIB" | "LAISSEZ_VIB_SEGMENT" | "PARTIAL_TIE" | "PARTIAL_TIE_SEGMENT" | "STEM_SLASH" | "ARPEGGIO" | "CHORD_BRACKET" | "ACCIDENTAL" | "LEDGER_LINE" | "STEM" | "HOOK" | "NOTE" | "CLEF" | "KEYSIG" | "AMBITUS" | "TIMESIG" | "REST" | "MMREST" | "DEAD_SLAPPED" | "SYMBOL" | "BREATH" | "MEASURE_REPEAT" | "ARTICULATION" | "ORNAMENT" | "FERMATA" | "CHORDLINE" | "DYNAMIC" | "EXPRESSION" | "BEAM" | "LYRICS" | "FIGURED_BASS" | "FIGURED_BASS_ITEM" | "MARKER" | "JUMP" | "FINGERING" | "TUPLET" | "TEMPO_TEXT" | "STAFF_TEXT" | "SYSTEM_TEXT" | "SOUND_FLAG" | "PLAY_COUNT_TEXT" | "PLAYTECH_ANNOTATION" | "CAPO" | "STRING_TUNINGS" | "TRIPLET_FEEL" | "REHEARSAL_MARK" | "INSTRUMENT_CHANGE" | "STAFFTYPE_CHANGE" | "FRET_DIAGRAM" | "HARMONY" | "HARP_DIAGRAM" | "BEND" | "TREMOLOBAR" | "VOLTA" | "VOLTA_SEGMENT" | "HAIRPIN" | "HAIRPIN_SEGMENT" | "OTTAVA" | "OTTAVA_SEGMENT" | "TRILL" | "TRILL_SEGMENT" | "LET_RING" | "LET_RING_SEGMENT" | "GRADUAL_TEMPO_CHANGE" | "GRADUAL_TEMPO_CHANGE_SEGMENT" | "VIBRATO" | "VIBRATO_SEGMENT" | "PALM_MUTE" | "PALM_MUTE_SEGMENT" | "WHAMMY_BAR" | "WHAMMY_BAR_SEGMENT" | "RASGUEADO" | "RASGUEADO_SEGMENT" | "HARMONIC_MARK" | "HARMONIC_MARK_SEGMENT" | "PICK_SCRAPE" | "PICK_SCRAPE_SEGMENT" | "TEXTLINE" | "TEXTLINE_SEGMENT" | "PEDAL" | "PEDAL_SEGMENT" | "LYRICSLINE" | "LYRICSLINE_SEGMENT" | "PARTIAL_LYRICSLINE" | "PARTIAL_LYRICSLINE_SEGMENT" | "GLISSANDO" | "GLISSANDO_SEGMENT" | "NOTELINE" | "NOTELINE_SEGMENT" | "STAFF_VISIBILITY_INDICATOR" | "SYSTEM_LOCK_INDICATOR" | "SPACER" | "STAFF_STATE" | "NOTEHEAD" | "NOTEDOT" | "IMAGE" | "MEASURE" | "SELECTION" | "LASSO" | "SHADOW_NOTE" | "TAB_DURATION_SYMBOL" | "FSYMBOL" | "PAGE" | "TEXTLINE_BASE" | "BRACKET" | "SEGMENT" | "SYSTEM" | "CHORD" | "HBOX" | "VBOX" | "TBOX" | "FBOX" | "ACTION_ICON" | "BAGPIPE_EMBELLISHMENT" | "STICKING" | "GRACE_NOTES_GROUP" | "GUITAR_BEND" | "GUITAR_BEND_SEGMENT" | "GUITAR_BEND_HOLD" | "GUITAR_BEND_HOLD_SEGMENT" | "GUITAR_BEND_TEXT" | "TREMOLO_TWOCHORD" | "TREMOLO_SINGLECHORD" | "TIME_TICK_ANCHOR" | "PARENTHESIS" | "HAMMER_ON_PULL_OFF" | "HAMMER_ON_PULL_OFF_SEGMENT" | "HAMMER_ON_PULL_OFF_TEXT" | "TAPPING" | "TAPPING_HALF_SLUR" | "TAPPING_HALF_SLUR_SEGMENT" | "TAPPING_TEXT" | "ROOT_ITEM" | "DUMMY" | "MAXTYPE";
export type ElementType = EnumValue<"ElementType">;

export type OrnamentStyleName = "DEFAULT" | "BAROQUE";
export type OrnamentStyle = EnumValue<"OrnamentStyle">;

export type GlissandoStyleName = "CHROMATIC" | "WHITE_KEYS" | "BLACK_KEYS" | "DIATONIC" | "PORTAMENTO";
export type GlissandoStyle = EnumValue<"GlissandoStyle">;

export type AlignVName = "TOP" | "VCENTER" | "BOTTOM" | "BASELINE";
export type AlignV = EnumValue<"AlignV">;

export type AlignHName = "LEFT" | "RIGHT" | "HCENTER" | "JUSTIFY";
export type AlignH = EnumValue<"AlignH">;

export type PlacementVName = "ABOVE" | "BELOW";
export type PlacementV = EnumValue<"PlacementV">;

export type PlacementHName = "LEFT" | "CENTER" | "RIGHT";
export type PlacementH = EnumValue<"PlacementH">;

export type TextPlaceName = "AUTO" | "ABOVE" | "BELOW" | "LEFT";
export type TextPlace = EnumValue<"TextPlace">;

export type DirectionVName = "AUTO" | "UP" | "DOWN";
export type DirectionV = EnumValue<"DirectionV">;

export type DirectionHName = "AUTO" | "LEFT" | "RIGHT";
export type DirectionH = EnumValue<"DirectionH">;

export type OrientationName = "VERTICAL" | "HORIZONTAL";
export type Orientation = EnumValue<"Orientation">;

export type AutoOnOffName = "AUTO" | "ON" | "OFF";
export type AutoOnOff = EnumValue<"AutoOnOff">;

export type AutoCustomHideName = "AUTO" | "CUSTOM" | "HIDE";
export type AutoCustomHide = EnumValue<"AutoCustomHide">;

export type VoiceAssignmentName = "ALL_VOICE_IN_INSTRUMENT" | "ALL_VOICE_IN_STAFF" | "CURRENT_VOICE_ONLY";
export type VoiceAssignment = EnumValue<"VoiceAssignment">;

export type BeamModeName = "INVALID" | "AUTO" | "NONE" | "BEGIN" | "BEGIN16" | "BEGIN32" | "MID" | "END";
export type BeamMode = EnumValue<"BeamMode">;

export type DurationTypeName = "V_LONG" | "V_BREVE" | "V_WHOLE" | "V_HALF" | "V_QUARTER" | "V_EIGHTH" | "V_16TH" | "V_32ND" | "V_64TH" | "V_128TH" | "V_256TH" | "V_512TH" | "V_1024TH" | "V_ZERO" | "V_MEASURE" | "V_INVALID";
export type DurationType = EnumValue<"DurationType">;

export type LayoutBreakTypeName = "PAGE" | "LINE" | "SECTION" | "NOBREAK";
export type LayoutBreakType = EnumValue<"LayoutBreakType">;

export type VeloTypeName = "OFFSET_VAL" | "USER_VAL";
export type VeloType = EnumValue<"VeloType">;

export type BarLineTypeName = "NORMAL" | "DOUBLE" | "START_REPEAT" | "END_REPEAT" | "BROKEN" | "END" | "END_START_REPEAT" | "DOTTED" | "REVERSE_END" | "HEAVY" | "DOUBLE_HEAVY";
export type BarLineType = EnumValue<"BarLineType">;

export type MeasureNumberPlacementName = "ABOVE_SYSTEM" | "BELOW_SYSTEM" | "ON_SYSTEM_OBJECT_STAVES" | "ON_ALL_STAVES";
export type MeasureNumberPlacement = EnumValue<"MeasureNumberPlacement">;

export type NoteHeadTypeName = "HEAD_AUTO" | "HEAD_WHOLE" | "HEAD_HALF" | "HEAD_QUARTER" | "HEAD_BREVIS" | "HEAD_TYPES";
export type NoteHeadType = EnumValue<"NoteHeadType">;

export type NoteHeadSchemeName = "HEAD_AUTO" | "HEAD_NORMAL" | "HEAD_PITCHNAME" | "HEAD_PITCHNAME_GERMAN" | "HEAD_SOLFEGE" | "HEAD_SOLFEGE_FIXED" | "HEAD_SHAPE_NOTE_4" | "HEAD_SHAPE_NOTE_7_AIKIN" | "HEAD_SHAPE_NOTE_7_FUNK" | "HEAD_SHAPE_NOTE_7_WALKER" | "HEAD_SCHEMES";
export type NoteHeadScheme = EnumValue<"NoteHeadScheme">;

export type NoteHeadGroupName = "HEAD_NORMAL" | "HEAD_CROSS" | "HEAD_PLUS" | "HEAD_XCIRCLE" | "HEAD_WITHX" | "HEAD_TRIANGLE_UP" | "HEAD_TRIANGLE_DOWN" | "HEAD_SLASHED1" | "HEAD_SLASHED2" | "HEAD_DIAMOND" | "HEAD_DIAMOND_OLD" | "HEAD_CIRCLED" | "HEAD_CIRCLED_LARGE" | "HEAD_LARGE_ARROW" | "HEAD_BREVIS_ALT" | "HEAD_SLASH" | "HEAD_LARGE_DIAMOND" | "HEAD_SOL" | "HEAD_LA" | "HEAD_FA" | "HEAD_MI" | "HEAD_DO" | "HEAD_RE" | "HEAD_TI" | "HEAD_HEAVY_CROSS" | "HEAD_HEAVY_CROSS_HAT" | "HEAD_DO_WALKER" | "HEAD_RE_WALKER" | "HEAD_TI_WALKER" | "HEAD_DO_FUNK" | "HEAD_RE_FUNK" | "HEAD_TI_FUNK" | "HEAD_DO_NAME" | "HEAD_DI_NAME" | "HEAD_RA_NAME" | "HEAD_RE_NAME" | "HEAD_RI_NAME" | "HEAD_ME_NAME" | "HEAD_MI_NAME" | "HEAD_FA_NAME" | "HEAD_FI_NAME" | "HEAD_SE_NAME" | "HEAD_SOL_NAME" | "HEAD_LE_NAME" | "HEAD_LA_NAME" | "HEAD_LI_NAME" | "HEAD_TE_NAME" | "HEAD_TI_NAME" | "HEAD_SI_NAME" | "HEAD_A_SHARP" | "HEAD_A" | "HEAD_A_FLAT" | "HEAD_B_SHARP" | "HEAD_B" | "HEAD_B_FLAT" | "HEAD_C_SHARP" | "HEAD_C" | "HEAD_C_FLAT" | "HEAD_D_SHARP" | "HEAD_D" | "HEAD_D_FLAT" | "HEAD_E_SHARP" | "HEAD_E" | "HEAD_E_FLAT" | "HEAD_F_SHARP" | "HEAD_F" | "HEAD_F_FLAT" | "HEAD_G_SHARP" | "HEAD_G" | "HEAD_G_FLAT" | "HEAD_H" | "HEAD_H_SHARP" | "HEAD_SWISS_RUDIMENTS_FLAM" | "HEAD_SWISS_RUDIMENTS_DOUBLE" | "HEAD_CUSTOM" | "HEAD_GROUPS" | "HEAD_INVALID";
export type NoteHeadGroup = EnumValue<"NoteHeadGroup">;

export type ClefTypeName = "INVALID" | "G" | "G15_MB" | "G8_VB" | "G8_VA" | "G15_MA" | "G8_VB_O" | "G8_VB_P" | "G_1" | "C1" | "C2" | "C3" | "C4" | "C5" | "C_19C" | "C1_F18C" | "C3_F18C" | "C4_F18C" | "C1_F20C" | "C3_F20C" | "C4_F20C" | "F" | "F15_MB" | "F8_VB" | "F_8VA" | "F_15MA" | "F_B" | "F_C" | "F_F18C" | "F_19C" | "PERC" | "PERC2" | "TAB" | "TAB4" | "TAB_SERIF" | "TAB4_SERIF" | "C4_8VB" | "G8_VB_C" | "MAX";
export type ClefType = EnumValue<"ClefType">;

export type ClefToBarlinePositionName = "AUTO" | "BEFORE" | "AFTER";
export type ClefToBarlinePosition = EnumValue<"ClefToBarlinePosition">;

export type DynamicTypeName = "OTHER" | "PPPPPP" | "PPPPP" | "PPPP" | "PPP" | "PP" | "P" | "MP" | "MF" | "F" | "FF" | "FFF" | "FFFF" | "FFFFF" | "FFFFFF" | "FP" | "PF" | "SF" | "SFZ" | "SFF" | "SFFZ" | "SFFF" | "SFFFZ" | "SFP" | "SFPP" | "RFZ" | "RF" | "FZ" | "M" | "R" | "S" | "Z" | "N" | "LAST";
export type DynamicType = EnumValue<"DynamicType">;

export type DynamicSpeedName = "SLOW" | "NORMAL" | "FAST";
export type DynamicSpeed = EnumValue<"DynamicSpeed">;

export type LineTypeName = "SOLID" | "DASHED" | "DOTTED";
export type LineType = EnumValue<"LineType">;

export type HookTypeName = "NONE" | "HOOK_90" | "HOOK_45" | "HOOK_90T" | "ARROW" | "ARROW_FILLED" | "ROSETTE";
export type HookType = EnumValue<"HookType">;

export type KeyModeName = "UNKNOWN" | "NONE" | "MAJOR" | "MINOR" | "DORIAN" | "PHRYGIAN" | "LYDIAN" | "MIXOLYDIAN" | "AEOLIAN" | "IONIAN" | "LOCRIAN";
export type KeyMode = EnumValue<"KeyMode">;

export type ArpeggioTypeName = "NORMAL" | "UP" | "DOWN" | "BRACKET" | "UP_STRAIGHT" | "DOWN_STRAIGHT";
export type ArpeggioType = EnumValue<"ArpeggioType">;

export type IntervalStepName = "UNISON" | "SECOND" | "THIRD" | "FOURTH" | "FIFTH" | "SIXTH" | "SEVENTH" | "OCTAVE";
export type IntervalStep = EnumValue<"IntervalStep">;

export type IntervalTypeName = "AUTO" | "AUGMENTED" | "MAJOR" | "PERFECT" | "MINOR" | "DIMINISHED";
export type IntervalType = EnumValue<"IntervalType">;

export type InstrumentLabelVisibilityName = "LONG" | "SHORT" | "HIDE";
export type InstrumentLabelVisibility = EnumValue<"InstrumentLabelVisibility">;

export type OrnamentShowAccidentalName = "DEFAULT" | "ANY_ALTERATION" | "ALWAYS";
export type OrnamentShowAccidental = EnumValue<"OrnamentShowAccidental">;

export type PartialSpannerDirectionName = "NONE" | "INCOMING" | "OUTGOING" | "BOTH";
export type PartialSpannerDirection = EnumValue<"PartialSpannerDirection">;

export type ChordStylePresetName = "STANDARD" | "JAZZ" | "LEGACY" | "CUSTOM";
export type ChordStylePreset = EnumValue<"ChordStylePreset">;

export type DisplayCapoChordTypeName = "CONCERT" | "BOTH" | "TRANSPOSED";
export type DisplayCapoChordType = EnumValue<"DisplayCapoChordType">;

export type ParenthesesModeName = "NONE" | "LEFT" | "RIGHT" | "BOTH";
export type ParenthesesMode = EnumValue<"ParenthesesMode">;

export type RepeatPlayCountPresetName = "X_N" | "N_X" | "PLAY_N_TIMES" | "N_REPEATS";
export type RepeatPlayCountPreset = EnumValue<"RepeatPlayCountPreset">;

export type TextStyleTypeName = "DEFAULT" | "TITLE" | "SUBTITLE" | "COMPOSER" | "LYRICIST" | "TRANSLATOR" | "FRAME" | "INSTRUMENT_EXCERPT" | "INSTRUMENT_LONG" | "INSTRUMENT_SHORT" | "INSTRUMENT_CHANGE" | "HEADER" | "FOOTER" | "COPYRIGHT" | "PAGE_NUMBER" | "MEASURE_NUMBER" | "MEASURE_NUMBER_ALTERNATE" | "MMREST_RANGE" | "TEMPO" | "TEMPO_CHANGE" | "METRONOME" | "REPEAT_PLAY_COUNT" | "REPEAT_LEFT" | "REPEAT_RIGHT" | "REHEARSAL_MARK" | "SYSTEM" | "STAFF" | "EXPRESSION" | "DYNAMICS" | "HAIRPIN" | "LYRICS_ODD" | "LYRICS_EVEN" | "HARMONY_A" | "HARMONY_B" | "HARMONY_ROMAN" | "HARMONY_NASHVILLE" | "TUPLET" | "ARTICULATION" | "STICKING" | "FINGERING" | "TAB_FRET_NUMBER" | "LH_GUITAR_FINGERING" | "RH_GUITAR_FINGERING" | "HAMMER_ON_PULL_OFF" | "STRING_NUMBER" | "STRING_TUNINGS" | "FRET_DIAGRAM_FINGERING" | "FRET_DIAGRAM_FRET_NUMBER" | "HARP_PEDAL_DIAGRAM" | "HARP_PEDAL_TEXT_DIAGRAM" | "TEXTLINE" | "SYSTEM_TEXTLINE" | "NOTELINE" | "VOLTA" | "OTTAVA" | "GLISSANDO" | "PEDAL" | "BEND" | "LET_RING" | "WHAMMY_BAR" | "PALM_MUTE" | "USER1" | "USER2" | "USER3" | "USER4" | "USER5" | "USER6" | "USER7" | "USER8" | "USER9" | "USER10" | "USER11" | "USER12" | "TEXT_TYPES" | "IGNORED_TYPES";
export type TextStyleType = EnumValue<"TextStyleType">;

export type FontStyleName = "Undefined" | "Normal";
export type FontStyle = EnumValue<"FontStyle">;

export type PlayingTechniqueTypeName = "Undefined" | "Natural" | "Pizzicato" | "Open" | "Mute" | "Tremolo" | "Detache" | "Martele" | "ColLegno" | "SulPonticello" | "SulTasto" | "Vibrato" | "Legato" | "Distortion" | "Overdrive" | "Harmonics" | "JazzTone" | "HandbellsSwing" | "HandbellsSwingUp" | "HandbellsSwingDown" | "HandbellsEcho1" | "HandbellsEcho2" | "HandbellsDamp" | "HandbellsLV" | "HandbellsR";
export type PlayingTechniqueType = EnumValue<"PlayingTechniqueType">;

export type GradualTempoChangeTypeName = "Undefined" | "Accelerando" | "Allargando" | "Calando" | "Lentando" | "Morendo" | "Precipitando" | "Rallentando" | "Ritardando" | "Smorzando" | "Sostenuto" | "Stringendo";
export type GradualTempoChangeType = EnumValue<"GradualTempoChangeType">;

export type ChangeMethodName = "NORMAL" | "EXPONENTIAL" | "EASE_IN" | "EASE_OUT" | "EASE_IN_OUT";
export type ChangeMethod = EnumValue<"ChangeMethod">;

export type ChangeDirectionName = "INCREASING" | "DECREASING";
export type ChangeDirection = EnumValue<"ChangeDirection">;

export type AccidentalRoleName = "AUTO" | "USER";
export type AccidentalRole = EnumValue<"AccidentalRole">;

export type AccidentalValName = "SHARP3" | "SHARP2" | "SHARP" | "NATURAL" | "FLAT" | "FLAT2" | "FLAT3";
export type AccidentalVal = EnumValue<"AccidentalVal">;

export type KeySigNaturalName = "NONE" | "BEFORE" | "AFTER";
export type KeySigNatural = EnumValue<"KeySigNatural">;

export type CourtesyBarlineModeName = "ALWAYS_SINGLE" | "ALWAYS_DOUBLE" | "DOUBLE_BEFORE_COURTESY";
export type CourtesyBarlineMode = EnumValue<"CourtesyBarlineMode">;

export type FermataTypeName = "Undefined" | "VeryShort" | "Short" | "ShortHenze" | "Normal" | "Long" | "LongHenze" | "VeryLong";
export type FermataType = EnumValue<"FermataType">;

export type ChordLineTypeName = "NOTYPE" | "FALL" | "DOIT" | "PLOP" | "SCOOP";
export type ChordLineType = EnumValue<"ChordLineType">;

export type SlurStyleTypeName = "Undefined" | "Solid" | "Dotted" | "Dashed" | "WideDashed";
export type SlurStyleType = EnumValue<"SlurStyleType">;

export type TappingHandName = "INVALID" | "LEFT" | "RIGHT";
export type TappingHand = EnumValue<"TappingHand">;

export type LHTappingSymbolName = "DOT" | "CIRCLED_T";
export type LHTappingSymbol = EnumValue<"LHTappingSymbol">;

export type RHTappingSymbolName = "T" | "PLUS";
export type RHTappingSymbol = EnumValue<"RHTappingSymbol">;

export type LHTappingShowItemsName = "HALF_SLUR" | "SYMBOL" | "BOTH";
export type LHTappingShowItems = EnumValue<"LHTappingShowItems">;

export type TremoloTypeName = "INVALID_TREMOLO" | "R8" | "R16" | "R32" | "R64" | "BUZZ_ROLL" | "C8" | "C16" | "C32" | "C64";
export type TremoloType = EnumValue<"TremoloType">;

export type TremoloStyleName = "DEFAULT" | "TRADITIONAL" | "TRADITIONAL_ALTERNATE";
export type TremoloStyle = EnumValue<"TremoloStyle">;

export type TremoloChordTypeName = "TremoloNone" | "TremoloSingle" | "TremoloFirstChord" | "TremoloSecondChord";
export type TremoloChordType = EnumValue<"TremoloChordType">;

export type BracketTypeName = "NORMAL" | "BRACE" | "SQUARE" | "LINE" | "NO_BRACKET";
export type BracketType = EnumValue<"BracketType">;

export type GlissandoTypeName = "STRAIGHT" | "WAVY";
export type GlissandoType = EnumValue<"GlissandoType">;

export type JumpTypeName = "DC" | "DC_AL_FINE" | "DC_AL_CODA" | "DS_AL_CODA" | "DS_AL_FINE" | "DS" | "DC_AL_DBLCODA" | "DS_AL_DBLCODA" | "DSS" | "DSS_AL_CODA" | "DSS_AL_DBLCODA" | "DSS_AL_FINE" | "USER";
export type JumpType = EnumValue<"JumpType">;

export type MarkerTypeName = "SEGNO" | "VARSEGNO" | "CODA" | "VARCODA" | "CODETTA" | "FINE" | "TOCODA" | "TOCODASYM" | "DA_CODA" | "DA_DBLCODA" | "USER";
export type MarkerType = EnumValue<"MarkerType">;

export type StaffGroupName = "STANDARD" | "PERCUSSION" | "TAB";
export type StaffGroup = EnumValue<"StaffGroup">;

export type TrillTypeName = "TRILL_LINE" | "UPPRALL_LINE" | "DOWNPRALL_LINE" | "PRALLPRALL_LINE";
export type TrillType = EnumValue<"TrillType">;

export type VibratoTypeName = "NONE" | "GUITAR_VIBRATO" | "GUITAR_VIBRATO_WIDE" | "VIBRATO_SAWTOOTH" | "VIBRATO_SAWTOOTH_WIDE";
export type VibratoType = EnumValue<"VibratoType">;

export type ArticulationTextTypeName = "NO_TEXT" | "SLAP" | "POP" | "TD" | "BD" | "RT" | "PL" | "SB" | "VIB";
export type ArticulationTextType = EnumValue<"ArticulationTextType">;

export type LyricsSyllabicName = "SINGLE" | "BEGIN" | "END" | "MIDDLE";
export type LyricsSyllabic = EnumValue<"LyricsSyllabic">;

export type LyricsDashSystemStartName = "STANDARD" | "UNDER_HEADER" | "UNDER_FIRST_NOTE";
export type LyricsDashSystemStart = EnumValue<"LyricsDashSystemStart">;

export type NoteLineEndPlacementName = "LEFT_EDGE" | "OFFSET_ENDS";
export type NoteLineEndPlacement = EnumValue<"NoteLineEndPlacement">;

export type SpannerSegmentTypeName = "SINGLE" | "BEGIN" | "MIDDLE" | "END";
export type SpannerSegmentType = EnumValue<"SpannerSegmentType">;

export type TiePlacementName = "AUTO" | "INSIDE" | "OUTSIDE";
export type TiePlacement = EnumValue<"TiePlacement">;

export type TieDotsPlacementName = "AUTO" | "BEFORE_DOTS" | "AFTER_DOTS";
export type TieDotsPlacement = EnumValue<"TieDotsPlacement">;

export type TimeSigPlacementName = "NORMAL" | "ABOVE_STAVES" | "ACROSS_STAVES";
export type TimeSigPlacement = EnumValue<"TimeSigPlacement">;

export type TimeSigStyleName = "NORMAL" | "NARROW" | "LARGE";
export type TimeSigStyle = EnumValue<"TimeSigStyle">;

export type TimeSigVSMarginName = "HANG_INTO_MARGIN" | "RIGHT_ALIGN_TO_BARLINE" | "CREATE_SPACE";
export type TimeSigVSMargin = EnumValue<"TimeSigVSMargin">;

export type NoteSpellingTypeName = "STANDARD" | "GERMAN" | "GERMAN_PURE" | "SOLFEGGIO" | "FRENCH";
export type NoteSpellingType = EnumValue<"NoteSpellingType">;

export type KeyName = "C_B" | "G_B" | "D_B" | "A_B" | "E_B" | "B_B" | "F" | "C" | "G" | "D" | "A" | "E" | "B" | "F_S" | "C_S" | "DELTA_ENHARMONIC";
export type Key = EnumValue<"Key">;

export type PreferSharpFlatName = "NONE" | "SHARPS" | "FLATS" | "AUTO";
export type PreferSharpFlat = EnumValue<"PreferSharpFlat">;

export type TransposeModeName = "PLAYBACK_ONLY" | "STANDARD_ONLY" | "TAB_ONLY";
export type TransposeMode = EnumValue<"TransposeMode">;

export type UpdateModeName = "DoNothing" | "Update" | "UpdateAll" | "Layout";
export type UpdateMode = EnumValue<"UpdateMode">;

export type LayoutFlagName = "NO_FLAGS" | "PLAY_EVENTS" | "REBUILD_MIDI_MAPPING";
export type LayoutFlag = EnumValue<"LayoutFlag">;

export type OttavaTypeName = "OTTAVA_8VA" | "OTTAVA_8VB" | "OTTAVA_15MA" | "OTTAVA_15MB" | "OTTAVA_22MA" | "OTTAVA_22MB";
export type OttavaType = EnumValue<"OttavaType">;

export type HairpinTypeName = "INVALID" | "CRESC_HAIRPIN" | "DIM_HAIRPIN" | "CRESC_LINE" | "DIM_LINE";
export type HairpinType = EnumValue<"HairpinType">;

export type TimeSigTypeName = "NORMAL" | "FOUR_FOUR" | "ALLA_BREVE" | "CUT_BACH" | "CUT_TRIPLE";
export type TimeSigType = EnumValue<"TimeSigType">;
