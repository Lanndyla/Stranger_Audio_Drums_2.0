#pragma once

#include "StrangerDrumsTypes.h"
#include <functional>
#include <random>

namespace StrangerDrums {

class DrumSequencer {
public:
    DrumSequencer() : currentStep(0), isPlaying(false), bpm(140) {}
    
    // Pattern management
    void setPattern(const Pattern& pattern) {
        this->pattern = pattern;
        this->stepCount = pattern.stepCount;
    }
    
    Pattern& getPattern() { return pattern; }
    
    // Grid manipulation
    void toggleStep(int step, DrumInstrument drum, int velocity = 100) {
        auto it = std::find_if(pattern.grid.begin(), pattern.grid.end(),
            [step, drum](const GridStep& gs) {
                return gs.step == step && gs.drum == drum;
            });
        
        if (it != pattern.grid.end()) {
            pattern.grid.erase(it);
        } else {
            pattern.grid.push_back({step, drum, velocity});
        }
    }
    
    void clearPattern() {
        pattern.grid.clear();
    }
    
    // Playback control
    void play() { isPlaying = true; }
    void stop() { isPlaying = false; currentStep = 0; }
    void pause() { isPlaying = false; }
    
    bool getIsPlaying() const { return isPlaying; }
    int getCurrentStep() const { return currentStep; }
    
    void setBpm(int newBpm) { bpm = newBpm; }
    int getBpm() const { return bpm; }
    
    // Called by audio thread to advance sequencer
    void advanceStep() {
        if (isPlaying) {
            currentStep = (currentStep + 1) % stepCount;
        }
    }
    
    // Get notes at current step
    std::vector<GridStep> getNotesAtStep(int step) const {
        std::vector<GridStep> notes;
        for (const auto& gs : pattern.grid) {
            if (gs.step == step) {
                notes.push_back(gs);
            }
        }
        return notes;
    }
    
    // Humanize velocities with ghost notes
    void humanize(int variationPercent = 15) {
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> velDist(-variationPercent, variationPercent);
        std::uniform_real_distribution<> ghostDist(0.0, 1.0);
        
        for (auto& gs : pattern.grid) {
            // Vary existing velocities
            int variation = velDist(gen);
            gs.velocity = std::clamp(gs.velocity + variation, 30, 127);
        }
        
        // Add ghost notes
        for (int step = 0; step < stepCount; ++step) {
            // 15% chance for snare ghost note
            if (ghostDist(gen) < 0.15) {
                bool hasSnare = std::any_of(pattern.grid.begin(), pattern.grid.end(),
                    [step](const GridStep& gs) {
                        return gs.step == step && gs.drum == DrumInstrument::Snare;
                    });
                if (!hasSnare) {
                    int ghostVel = 30 + static_cast<int>(ghostDist(gen) * 25);
                    pattern.grid.push_back({step, DrumInstrument::Snare, ghostVel});
                }
            }
            
            // 10% chance for hi-hat ghost note
            if (ghostDist(gen) < 0.10) {
                bool hasHihat = std::any_of(pattern.grid.begin(), pattern.grid.end(),
                    [step](const GridStep& gs) {
                        return gs.step == step && 
                               (gs.drum == DrumInstrument::HihatClosed || 
                                gs.drum == DrumInstrument::HihatOpen);
                    });
                if (!hasHihat) {
                    int ghostVel = 30 + static_cast<int>(ghostDist(gen) * 25);
                    pattern.grid.push_back({step, DrumInstrument::HihatClosed, ghostVel});
                }
            }
        }
    }
    
    // Per-track velocity scaling
    void setTrackVelocity(DrumInstrument drum, float scale) {
        trackVelocities[drum] = std::clamp(scale, 0.0f, 1.0f);
    }
    
    float getTrackVelocity(DrumInstrument drum) const {
        auto it = trackVelocities.find(drum);
        return (it != trackVelocities.end()) ? it->second : 1.0f;
    }
    
    int getScaledVelocity(const GridStep& gs) const {
        return static_cast<int>(gs.velocity * getTrackVelocity(gs.drum));
    }

private:
    Pattern pattern;
    int currentStep;
    int stepCount = 32;
    bool isPlaying;
    int bpm;
    std::map<DrumInstrument, float> trackVelocities;
};

} // namespace StrangerDrums
