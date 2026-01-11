#pragma once

#include "StrangerDrumsTypes.h"
#include <JuceHeader.h>

namespace StrangerDrums {

class MidiExporter {
public:
    static juce::MidiFile exportPattern(const Pattern& pattern, int bpm) {
        juce::MidiFile midiFile;
        midiFile.setTicksPerQuarterNote(480);
        
        juce::MidiMessageSequence track;
        auto noteMap = getMidiNoteMap();
        
        // Add tempo
        track.addEvent(juce::MidiMessage::tempoMetaEvent(
            static_cast<int>(60000000.0 / bpm)
        ));
        
        // Add time signature
        auto [num, denom] = parseTimeSignature(pattern.timeSignature);
        track.addEvent(juce::MidiMessage::timeSignatureMetaEvent(num, denom));
        
        // Ticks per 16th note
        const int ticksPerStep = 120; // 480 / 4
        
        // Add notes
        for (const auto& gs : pattern.grid) {
            auto it = noteMap.find(gs.drum);
            if (it != noteMap.end()) {
                int midiNote = it->second;
                int startTick = gs.step * ticksPerStep;
                int duration = ticksPerStep;
                
                track.addEvent(juce::MidiMessage::noteOn(10, midiNote, 
                    static_cast<uint8_t>(gs.velocity)), startTick);
                track.addEvent(juce::MidiMessage::noteOff(10, midiNote), 
                    startTick + duration);
            }
        }
        
        track.updateMatchedPairs();
        midiFile.addTrack(track);
        
        return midiFile;
    }
    
    static juce::MidiFile exportArrangement(
        const std::vector<ArrangementPattern>& arrangement, 
        int bpm
    ) {
        juce::MidiFile midiFile;
        midiFile.setTicksPerQuarterNote(480);
        
        juce::MidiMessageSequence track;
        auto noteMap = getMidiNoteMap();
        
        // Add tempo
        track.addEvent(juce::MidiMessage::tempoMetaEvent(
            static_cast<int>(60000000.0 / bpm)
        ));
        
        const int ticksPerStep = 120;
        int currentTick = 0;
        std::string currentTimeSignature;
        
        for (const auto& pattern : arrangement) {
            // Add time signature change if needed
            if (pattern.timeSignature != currentTimeSignature) {
                auto [num, denom] = parseTimeSignature(pattern.timeSignature);
                track.addEvent(
                    juce::MidiMessage::timeSignatureMetaEvent(num, denom),
                    currentTick
                );
                currentTimeSignature = pattern.timeSignature;
            }
            
            // Add notes for this pattern
            for (const auto& gs : pattern.grid) {
                auto it = noteMap.find(gs.drum);
                if (it != noteMap.end()) {
                    int midiNote = it->second;
                    int startTick = currentTick + (gs.step * ticksPerStep);
                    int duration = ticksPerStep;
                    
                    track.addEvent(juce::MidiMessage::noteOn(10, midiNote,
                        static_cast<uint8_t>(gs.velocity)), startTick);
                    track.addEvent(juce::MidiMessage::noteOff(10, midiNote),
                        startTick + duration);
                }
            }
            
            // Advance to next pattern
            currentTick += pattern.stepCount * ticksPerStep;
        }
        
        track.updateMatchedPairs();
        midiFile.addTrack(track);
        
        return midiFile;
    }
    
    static bool saveToFile(const juce::MidiFile& midiFile, const juce::File& file) {
        juce::FileOutputStream stream(file);
        if (stream.openedOk()) {
            midiFile.writeTo(stream);
            return true;
        }
        return false;
    }

private:
    static std::pair<int, int> parseTimeSignature(const std::string& ts) {
        size_t slashPos = ts.find('/');
        if (slashPos != std::string::npos) {
            int num = std::stoi(ts.substr(0, slashPos));
            int denom = std::stoi(ts.substr(slashPos + 1));
            return {num, denom};
        }
        return {4, 4};
    }
};

} // namespace StrangerDrums
