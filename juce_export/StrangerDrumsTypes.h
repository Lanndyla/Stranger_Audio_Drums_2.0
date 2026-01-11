#pragma once

#include <vector>
#include <string>
#include <map>

namespace StrangerDrums {

enum class DrumInstrument {
    Kick,
    Snare,
    HihatClosed,
    HihatOpen,
    Tom1,
    Tom2,
    Crash,
    Ride
};

struct GridStep {
    int step;
    DrumInstrument drum;
    int velocity; // 0-127
};

struct Pattern {
    std::string name;
    int bpm;
    std::string timeSignature;
    int stepCount;
    std::vector<GridStep> grid;
};

struct ArrangementPattern {
    std::string id;
    std::string name;
    int bpm;
    std::vector<GridStep> grid;
    std::string timeSignature;
    int stepCount;
};

// MIDI note mappings (General MIDI Drum Map)
inline std::map<DrumInstrument, int> getMidiNoteMap() {
    return {
        {DrumInstrument::Kick, 36},
        {DrumInstrument::Snare, 38},
        {DrumInstrument::HihatClosed, 42},
        {DrumInstrument::HihatOpen, 46},
        {DrumInstrument::Tom1, 48},
        {DrumInstrument::Tom2, 45},
        {DrumInstrument::Crash, 49},
        {DrumInstrument::Ride, 51}
    };
}

// Time signature utilities
inline int calculateStepCount(const std::string& timeSignature) {
    // Map time signature to step count (2 bars of 16th notes)
    static const std::map<std::string, int> stepCounts = {
        {"4/4", 32},
        {"3/4", 24},
        {"5/4", 40},
        {"6/8", 24},
        {"7/8", 28},
        {"5/8", 20},
        {"9/8", 36},
        {"12/8", 48}
    };
    
    auto it = stepCounts.find(timeSignature);
    return (it != stepCounts.end()) ? it->second : 32;
}

// Check if time signature is compound meter
inline bool isCompoundMeter(const std::string& timeSignature) {
    return timeSignature == "6/8" || 
           timeSignature == "9/8" || 
           timeSignature == "12/8";
}

// Get beat grouping for visual display
inline int getBeatGrouping(const std::string& timeSignature) {
    if (isCompoundMeter(timeSignature)) {
        return 6; // Dotted quarter grouping
    }
    return 4; // Standard 16th note grouping
}

} // namespace StrangerDrums
