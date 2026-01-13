# Stranger Drums JUCE Integration Guide

## Overview

This guide explains how to integrate the Stranger Drums AI pattern generation into your JUCE audio plugin.

## API Endpoints

### Base URL
When published, your API will be available at:
```
https://your-app-name.replit.app
```

### Authentication
External API requests require the `X-API-Key` header:
```
X-API-Key: your-server-api-key
```

Set the `STRANGER_DRUMS_API_KEY` environment variable on your Replit server to enable authentication. Browser requests from the web UI are automatically authorized.

### 1. Generate Pattern
**POST** `/api/patterns/generate`

Generates an AI drum pattern based on style, BPM, and complexity settings.

#### Request Body
```json
{
  "style": "Djent",
  "bpm": 120,
  "type": "Groove",
  "complexity": 50,
  "secondaryStyle": "Metal",
  "styleMix": 70,
  "timeSignature": "4/4",
  "stepCount": 32,
  "apiKey": "optional-personal-openai-key"
}
```

#### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| style | string | Yes | Primary genre: Djent, Metal, Rock, Post-hardcore, Pop, Jazz, Funk, Blast Beat |
| bpm | number | Yes | Tempo (60-240) |
| type | string | Yes | Pattern type: Groove, Fill, Breakdown, Intro, Blast Beat |
| complexity | number | No | Pattern density (0-100, default 50) |
| secondaryStyle | string | No | Secondary genre for blending |
| styleMix | number | No | Primary/secondary ratio (0-100, default 70) |
| timeSignature | string | No | Time signature (default "4/4") |
| stepCount | number | No | Number of steps (default 32) |
| apiKey | string | No | Personal OpenAI API key |

#### Response
```json
{
  "grid": [
    {"step": 0, "drum": "kick", "velocity": 110},
    {"step": 4, "drum": "snare", "velocity": 100},
    ...
  ],
  "suggestedName": "Polyrhythmic Groove"
}
```

### 2. Smart Beat (Audio Analysis)
**POST** `/api/patterns/smart-beat`

Generates a pattern that locks with analyzed audio.

#### Request Body
```json
{
  "bpm": 120,
  "style": "Djent",
  "rhythmPattern": "moderate",
  "onsetCount": 20,
  "duration": 10.0,
  "intensity": [0.8, 0.6, 0.9, ...],
  "confidence": 0.85,
  "beatGrid": [0, 4, 8, 12, 16, 20, 24, 28],
  "accentSteps": [0, 8, 16, 24],
  "downbeatSteps": [0, 16]
}
```

## JUCE Implementation Example

### Using JUCE's URL class

```cpp
#include <JuceHeader.h>
#include "StrangerDrumsAPI.h"

class PatternGenerator : public juce::Thread {
public:
    PatternGenerator() : Thread("PatternGenerator") {}
    
    void generatePattern(const StrangerDrums::GenerateRequest& request) {
        currentRequest = request;
        startThread();
    }
    
    void run() override {
        StrangerDrums::APIConfig config;
        config.baseUrl = "https://your-app.replit.app";
        
        StrangerDrums::StrangerDrumsAPI api(config);
        
        juce::URL url(api.buildGenerateUrl());
        juce::String jsonBody = api.buildGenerateRequestBody(currentRequest);
        
        url = url.withPOSTData(jsonBody);
        
        auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
            .withExtraHeaders(api.getRequestHeaders())
            .withConnectionTimeoutMs(30000);
        
        std::unique_ptr<juce::InputStream> stream = url.createInputStream(options);
        
        if (stream != nullptr) {
            juce::String response = stream->readEntireStreamAsString();
            parseResponse(response);
        }
    }
    
private:
    StrangerDrums::GenerateRequest currentRequest;
    
    void parseResponse(const juce::String& json) {
        juce::var parsed = juce::JSON::parse(json);
        
        if (parsed.isObject()) {
            auto* gridArray = parsed["grid"].getArray();
            if (gridArray != nullptr) {
                for (const auto& step : *gridArray) {
                    int stepNum = step["step"];
                    juce::String drum = step["drum"].toString();
                    int velocity = step["velocity"];
                    
                    // Process the step...
                }
            }
        }
    }
};
```

## Drum Instruments

| ID | Name | MIDI Note |
|----|------|-----------|
| kick | Kick Drum | 36 |
| snare | Snare | 38 |
| hihat_closed | Hi-Hat Closed | 42 |
| hihat_open | Hi-Hat Open | 46 |
| tom_1 | High Tom | 48 |
| tom_2 | Low Tom | 45 |
| crash | Crash Cymbal | 49 |
| ride | Ride Cymbal | 51 |

## Time Signatures Supported

- 4/4 (32 steps)
- 3/4 (24 steps)
- 5/4 (40 steps)
- 6/8 (24 steps)
- 7/8 (28 steps)
- 5/8 (20 steps)
- 9/8 (36 steps)
- 12/8 (48 steps)

## Error Handling

The API returns standard HTTP status codes:
- 200: Success
- 400: Bad request (invalid parameters)
- 500: Server error

Always wrap API calls in try-catch and handle network failures gracefully.
