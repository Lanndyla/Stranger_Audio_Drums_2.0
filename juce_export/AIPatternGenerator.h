#pragma once

#include "StrangerDrumsTypes.h"
#include <JuceHeader.h>

namespace StrangerDrums {

class AIPatternGenerator {
public:
    AIPatternGenerator(const juce::String& apiKey) 
        : openAIKey() {}
    
    // Async pattern generation
    void generatePattern(
        const juce::String& style,
        const juce::String& type,
        const juce::String& timeSignature,
        int complexity,
        const juce::String& secondaryStyle = "",
        int styleMix = 0,
        std::function<void(const Pattern&)> onSuccess = nullptr,
        std::function<void(const juce::String&)> onError = nullptr
    ) {
        int stepCount = calculateStepCount(timeSignature.toStdString());
        
        juce::String prompt = buildPrompt(style, type, timeSignature, 
            stepCount, complexity, secondaryStyle, styleMix);
        
        // Create async request
        juce::Thread::launch([=]() {
            auto result = makeOpenAIRequest(prompt);
            
            if (result.wasOk()) {
                auto pattern = parseResponse(result.getValue(), timeSignature, stepCount);
                if (onSuccess) {
                    juce::MessageManager::callAsync([=]() {
                        onSuccess(pattern);
                    });
                }
            } else {
                if (onError) {
                    juce::MessageManager::callAsync([=]() {
                        onError(result.getError());
                    });
                }
            }
        });
    }

private:
    juce::String openAIKey;
    
    juce::String buildPrompt(
        const juce::String& style,
        const juce::String& type,
        const juce::String& timeSignature,
        int stepCount,
        int complexity,
        const juce::String& secondaryStyle,
        int styleMix
    ) {
        juce::String prompt = "Generate a " + type + " drum pattern in " + 
            style + " style";
        
        if (secondaryStyle.isNotEmpty() && styleMix > 0) {
            prompt += " mixed with " + secondaryStyle + 
                " (" + juce::String(styleMix) + "% influence)";
        }
        
        prompt += ". Time signature: " + timeSignature + 
            ". Steps: " + juce::String(stepCount) + 
            ". Complexity: " + juce::String(complexity) + "%.\n\n";
        
        prompt += "Available drums: kick, snare, hihat_closed, hihat_open, "
            "tom_1, tom_2, crash, ride.\n\n";
        
        prompt += "Return ONLY a JSON array of objects with format: "
            "{\"step\": 0-" + juce::String(stepCount - 1) + 
            ", \"drum\": \"name\", \"velocity\": 60-127}";
        
        return prompt;
    }
    
    juce::Result<juce::String> makeOpenAIRequest(const juce::String& prompt) {
        juce::URL url("https://api.openai.com/v1/chat/completions");
        
        juce::DynamicObject::Ptr requestBody = new juce::DynamicObject();
        requestBody->setProperty("model", "gpt-4o");
        requestBody->setProperty("max_tokens", 2000);
        
        juce::Array<juce::var> messages;
        juce::DynamicObject::Ptr message = new juce::DynamicObject();
        message->setProperty("role", "user");
        message->setProperty("content", prompt);
        messages.add(juce::var(message.get()));
        requestBody->setProperty("messages", messages);
        
        juce::String jsonBody = juce::JSON::toString(juce::var(requestBody.get()));
        
        url = url.withPOSTData(jsonBody);
        
        juce::StringPairArray headers;
        headers.set("Authorization", "Bearer " + openAIKey);
        headers.set("Content-Type", "application/json");
        
        auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
            .withExtraHeaders(headers.getDescription());
        
        if (auto stream = url.createInputStream(options)) {
            juce::String response = stream->readEntireStreamAsString();
            return juce::Result<juce::String>::ok(response);
        }
        
        return juce::Result<juce::String>::fail("Failed to connect to OpenAI");
    }
    
    Pattern parseResponse(
        const juce::String& response, 
        const juce::String& timeSignature,
        int stepCount
    ) {
        Pattern pattern;
        pattern.timeSignature = timeSignature.toStdString();
        pattern.stepCount = stepCount;
        
        auto json = juce::JSON::parse(response);
        auto content = json["choices"][0]["message"]["content"].toString();
        
        // Extract JSON array from response
        int start = content.indexOf("[");
        int end = content.lastIndexOf("]") + 1;
        if (start >= 0 && end > start) {
            auto arrayJson = juce::JSON::parse(content.substring(start, end));
            
            if (auto* arr = arrayJson.getArray()) {
                for (const auto& item : *arr) {
                    GridStep gs;
                    gs.step = static_cast<int>(item["step"]);
                    gs.velocity = static_cast<int>(item["velocity"]);
                    gs.drum = parseDrumName(item["drum"].toString());
                    
                    if (gs.step >= 0 && gs.step < stepCount) {
                        pattern.grid.push_back(gs);
                    }
                }
            }
        }
        
        return pattern;
    }
    
    DrumInstrument parseDrumName(const juce::String& name) {
        if (name == "kick") return DrumInstrument::Kick;
        if (name == "snare") return DrumInstrument::Snare;
        if (name == "hihat_closed") return DrumInstrument::HihatClosed;
        if (name == "hihat_open") return DrumInstrument::HihatOpen;
        if (name == "tom_1") return DrumInstrument::Tom1;
        if (name == "tom_2") return DrumInstrument::Tom2;
        if (name == "crash") return DrumInstrument::Crash;
        if (name == "ride") return DrumInstrument::Ride;
        return DrumInstrument::Kick;
    }
};

} // namespace StrangerDrums
