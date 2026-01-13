#pragma once

#include <string>
#include <functional>
#include <vector>
#include "StrangerDrumsTypes.h"

namespace StrangerDrums {

struct APIConfig {
    std::string baseUrl = "https://your-replit-app.replit.app";
    std::string apiKey = "";  // X-API-Key for server authentication
    std::string openAiKey = ""; // Optional: personal OpenAI key for AI calls
    int timeoutMs = 30000;
};

struct GenerateRequest {
    std::string style = "Djent";
    int bpm = 120;
    std::string type = "Groove";
    int complexity = 50;
    std::string secondaryStyle = "";
    int styleMix = 70;
    std::string timeSignature = "4/4";
    int stepCount = 32;
};

struct GenerateResponse {
    bool success = false;
    std::string error = "";
    std::string suggestedName = "";
    std::vector<GridStep> grid;
};

struct SmartBeatRequest {
    int bpm = 120;
    std::string style = "Djent";
    std::string rhythmPattern = "moderate";
    int onsetCount = 20;
    float duration = 10.0f;
    std::vector<float> intensity;
    float confidence = 0.8f;
    std::vector<int> beatGrid;
    std::vector<int> accentSteps;
    std::vector<int> downbeatSteps;
};

class StrangerDrumsAPI {
public:
    StrangerDrumsAPI(const APIConfig& config) : m_config(config) {}
    
    void setApiKey(const std::string& key) { m_config.apiKey = key; }
    void setBaseUrl(const std::string& url) { m_config.baseUrl = url; }
    
    std::string buildGenerateUrl() const {
        return m_config.baseUrl + "/api/patterns/generate";
    }
    
    std::string buildSmartBeatUrl() const {
        return m_config.baseUrl + "/api/patterns/smart-beat";
    }
    
    std::string getApiKeyHeader() const {
        return m_config.apiKey;
    }
    
    // Returns headers for HTTP request (use with JUCE URL class)
    // Example: url.withExtraHeaders(api.getRequestHeaders())
    std::string getRequestHeaders() const {
        std::string headers = "Content-Type: application/json\r\n";
        if (!m_config.apiKey.empty()) {
            headers += "X-API-Key: " + m_config.apiKey + "\r\n";
        }
        return headers;
    }
    
    std::string buildGenerateRequestBody(const GenerateRequest& req) const {
        std::string json = "{";
        json += "\"style\":\"" + req.style + "\",";
        json += "\"bpm\":" + std::to_string(req.bpm) + ",";
        json += "\"type\":\"" + req.type + "\",";
        json += "\"complexity\":" + std::to_string(req.complexity) + ",";
        if (!req.secondaryStyle.empty()) {
            json += "\"secondaryStyle\":\"" + req.secondaryStyle + "\",";
            json += "\"styleMix\":" + std::to_string(req.styleMix) + ",";
        }
        json += "\"timeSignature\":\"" + req.timeSignature + "\",";
        json += "\"stepCount\":" + std::to_string(req.stepCount);
        if (!m_config.openAiKey.empty()) {
            json += ",\"apiKey\":\"" + m_config.openAiKey + "\"";
        }
        json += "}";
        return json;
    }
    
    std::string buildSmartBeatRequestBody(const SmartBeatRequest& req) const {
        std::string json = "{";
        json += "\"bpm\":" + std::to_string(req.bpm) + ",";
        json += "\"style\":\"" + req.style + "\",";
        json += "\"rhythmPattern\":\"" + req.rhythmPattern + "\",";
        json += "\"onsetCount\":" + std::to_string(req.onsetCount) + ",";
        json += "\"duration\":" + std::to_string(req.duration) + ",";
        json += "\"confidence\":" + std::to_string(req.confidence) + ",";
        
        json += "\"beatGrid\":[";
        for (size_t i = 0; i < req.beatGrid.size(); ++i) {
            json += std::to_string(req.beatGrid[i]);
            if (i < req.beatGrid.size() - 1) json += ",";
        }
        json += "],";
        
        json += "\"accentSteps\":[";
        for (size_t i = 0; i < req.accentSteps.size(); ++i) {
            json += std::to_string(req.accentSteps[i]);
            if (i < req.accentSteps.size() - 1) json += ",";
        }
        json += "],";
        
        json += "\"downbeatSteps\":[";
        for (size_t i = 0; i < req.downbeatSteps.size(); ++i) {
            json += std::to_string(req.downbeatSteps[i]);
            if (i < req.downbeatSteps.size() - 1) json += ",";
        }
        json += "],";
        
        json += "\"intensity\":[";
        for (size_t i = 0; i < req.intensity.size(); ++i) {
            json += std::to_string(req.intensity[i]);
            if (i < req.intensity.size() - 1) json += ",";
        }
        json += "]";
        
        if (!m_config.openAiKey.empty()) {
            json += ",\"apiKey\":\"" + m_config.openAiKey + "\"";
        }
        json += "}";
        return json;
    }
    
    static DrumInstrument parseDrumString(const std::string& drum) {
        if (drum == "kick") return DrumInstrument::Kick;
        if (drum == "snare") return DrumInstrument::Snare;
        if (drum == "hihat_closed") return DrumInstrument::HihatClosed;
        if (drum == "hihat_open") return DrumInstrument::HihatOpen;
        if (drum == "tom_1") return DrumInstrument::Tom1;
        if (drum == "tom_2") return DrumInstrument::Tom2;
        if (drum == "crash") return DrumInstrument::Crash;
        if (drum == "ride") return DrumInstrument::Ride;
        return DrumInstrument::Kick;
    }
    
private:
    APIConfig m_config;
};

} // namespace StrangerDrums
