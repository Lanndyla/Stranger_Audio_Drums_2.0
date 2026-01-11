STRANGER DRUMS - JUCE C++ PORT
================================

These header files contain the core logic from Stranger Drums, 
ready to use in a JUCE audio plugin project.

FILES:
------
1. StrangerDrumsTypes.h
   - Core data structures (GridStep, Pattern, DrumInstrument)
   - MIDI note mappings
   - Time signature utilities

2. DrumSequencer.h  
   - Main sequencer class
   - Pattern playback control
   - Grid manipulation (toggle steps)
   - Humanize function with ghost notes
   - Per-track velocity control

3. MidiExporter.h
   - Export single patterns to MIDI
   - Export full arrangements to MIDI
   - Handles time signature changes

4. AIPatternGenerator.h
   - OpenAI API integration
   - Async pattern generation
   - Prompt building for different styles

USAGE IN JUCE PROJECT:
----------------------
1. Create new JUCE plugin project with Projucer or CMake
2. Copy these files to your Source/ folder
3. Include JuceHeader.h before the JUCE-dependent headers

Example PluginProcessor.cpp:

    #include "StrangerDrumsTypes.h"
    #include "DrumSequencer.h"
    
    class MyProcessor : public juce::AudioProcessor {
        StrangerDrums::DrumSequencer sequencer;
        
        void processBlock(AudioBuffer<float>& buffer, MidiBuffer& midi) {
            if (sequencer.getIsPlaying()) {
                auto notes = sequencer.getNotesAtStep(sequencer.getCurrentStep());
                for (const auto& note : notes) {
                    int midiNote = StrangerDrums::getMidiNoteMap()[note.drum];
                    midi.addEvent(MidiMessage::noteOn(10, midiNote, 
                        (uint8_t)sequencer.getScaledVelocity(note)), 0);
                }
                sequencer.advanceStep();
            }
        }
    };

REQUIREMENTS:
-------------
- JUCE 7.0+ (or JUCE 8 for WebView UI)
- C++17 or later
- OpenAI API key for AI generation

For the full web version, visit the Replit app!
