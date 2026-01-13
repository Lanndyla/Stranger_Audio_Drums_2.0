import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import MidiWriter from "midi-writer-js";

// Initialize OpenAI client with Replit integration env vars
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Pattern CRUD routes
  app.get(api.patterns.list.path, async (req, res) => {
    const patterns = await storage.getPatterns();
    res.json(patterns);
  });

  app.get(api.patterns.get.path, async (req, res) => {
    const pattern = await storage.getPattern(Number(req.params.id));
    if (!pattern) {
      return res.status(404).json({ message: 'Pattern not found' });
    }
    res.json(pattern);
  });

  app.post(api.patterns.create.path, async (req, res) => {
    try {
      const input = api.patterns.create.input.parse(req.body);
      const pattern = await storage.createPattern(input);
      res.status(201).json(pattern);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.patterns.update.path, async (req, res) => {
    try {
      const input = api.patterns.update.input.parse(req.body);
      const pattern = await storage.updatePattern(Number(req.params.id), input);
      if (!pattern) {
        return res.status(404).json({ message: 'Pattern not found' });
      }
      res.json(pattern);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.patterns.delete.path, async (req, res) => {
    await storage.deletePattern(Number(req.params.id));
    res.status(204).send();
  });

  // AI Generation Route
  app.post(api.patterns.generate.path, async (req, res) => {
    try {
      const { style, bpm, type } = api.patterns.generate.input.parse(req.body);
      const { complexity = 50, secondaryStyle, styleMix = 70, timeSignature = "4/4", stepCount = 32, apiKey } = req.body;
      
      // Use personal API key if provided, otherwise use default
      const client = apiKey ? new OpenAI({ apiKey }) : openai;

      let styleDescription = style;
      if (secondaryStyle && secondaryStyle !== "none") {
        styleDescription = `a blend of ${styleMix}% ${style} and ${100 - styleMix}% ${secondaryStyle}`;
      }

      const complexityDesc = complexity < 30 ? "simple and minimal" : 
                            complexity < 60 ? "moderately complex" : 
                            complexity < 80 ? "complex with many notes" : "extremely dense and intricate";

      // Parse time signature for the AI prompt
      const [beatsPerBar, noteValue] = timeSignature.split('/').map(Number);
      const timeSignatureDesc = timeSignature === "4/4" ? "standard 4/4 time" :
                                timeSignature === "3/4" ? "3/4 waltz time" :
                                timeSignature === "5/4" ? "5/4 odd time (like 'Take Five' or Tool)" :
                                timeSignature === "6/8" ? "6/8 compound time" :
                                timeSignature === "7/8" ? "7/8 progressive odd time" :
                                timeSignature === "5/8" ? "5/8 asymmetric time" :
                                timeSignature === "9/8" ? "9/8 compound time" :
                                timeSignature === "12/8" ? "12/8 blues/shuffle feel" : `${timeSignature} time`;

      const prompt = `You are a world-class session drummer. Generate a UNIQUE, realistic drum pattern.

=== PATTERN SPECS ===
Style: ${styleDescription}
BPM: ${bpm}
Type: ${type}
Complexity: ${complexityDesc} (${complexity}%)
Time Signature: ${timeSignature} (${timeSignatureDesc})
Total Steps: ${stepCount} (2 bars of 16th notes)
Request ID: ${Math.random()}

=== VELOCITY RULES (CRITICAL FOR REALISM) ===
- Kick: Main hits 95-120, accents 120-127, ghost kicks 70-85
- Snare: Backbeats 100-120, accents 115-127, ghost notes 40-65
- Hi-hat closed: Downbeats 85-100, upbeats 60-80, ghost 45-60
- Hi-hat open: 90-115 (use sparingly for accents)
- Ride: Bell 95-115, bow 70-95
- Toms: 85-120 (accent fills higher)
- Crash: 100-127 (phrase starts, accents)
- NEVER use identical velocities on consecutive notes of same drum
- Downbeats louder than upbeats (velocity ladder pattern)

=== PATTERN TYPE REQUIREMENTS ===
${type === "Groove" ? `GROOVE: Establish the main beat. Create a 2-bar repeating pattern with:
- Consistent kick/snare backbone
- Slight variation in bar 2 (different hi-hat, added ghost note)
- Should feel like the verse or chorus foundation` : ""}
${type === "Fill" ? `FILL: Transitional drum fill. Requirements:
- Build activity in final 4-8 steps (steps ${stepCount - 8} to ${stepCount - 1})
- Use toms, crashes, rapid snare rolls
- Lead INTO next section - end with crash on step 0 or ${stepCount - 1}
- First half can be simpler groove, second half is the fill` : ""}
${type === "Intro" ? `INTRO: Build anticipation. Requirements:
- Start sparse (fewer drums initially)
- Gradually add elements across the 2 bars
- End with setup for main groove (crash + kick on final beat)
- Consider hi-hat only first bar, add kick/snare in bar 2` : ""}
${type === "Breakdown" ? `BREAKDOWN: Heavy, crushing half-time feel. Requirements:
- Half-time snare (beat 3 of each bar, NOT 2 and 4)
- Syncopated kick following guitar chug rhythm
- Crashes/china on phrase starts (steps 0, 16)
- Space and heaviness over speed
- Think Meshuggah, Lamb of God, Knocked Loose` : ""}

=== GENRE CHARACTERISTICS ===
${style === "Djent" || secondaryStyle === "Djent" ? `DJENT (Meshuggah, Periphery, TesseracT, Animals as Leaders):
- Polyrhythmic kick patterns locking with guitar chugs
- Syncopated kicks with GAPS - never straight 16ths
- Ghost snares throughout (velocity 40-65)
- Ride bell preferred over hi-hat
- Snares on unexpected beats, not just 2/4
- China crashes on riff phrase downbeats
- Common kick groupings: 3s, 5s, 7s over 4/4` : ""}
${style === "Metal" || secondaryStyle === "Metal" ? `METAL (Metallica, Slayer, Pantera):
- Driving double kick sections
- Powerful snare on 2 and 4
- Crash accents on downbeats
- Aggressive, forward-driving energy
- Tom fills between sections` : ""}
${style === "Rock" || secondaryStyle === "Rock" ? `ROCK (AC/DC, Foo Fighters, Queens of the Stone Age):
- Solid kick on 1 and 3
- Snare backbeat on 2 and 4
- Steady 8th-note hi-hat or ride
- Keep it simple but powerful
- Occasional crash on phrase starts` : ""}
${style === "Post-hardcore" || secondaryStyle === "Post-hardcore" ? `POST-HARDCORE (Underoath, Thrice, Alexisonfire):
- Mix of punk energy and metal heaviness
- Driving 8th-note patterns
- Syncopated breakdowns
- Dynamic shifts between soft/loud
- Double kick bursts, not constant` : ""}
${style === "Pop" || secondaryStyle === "Pop" ? `POP (modern dance-pop, EDM-influenced):
- Kick on 1 and 3 (four-on-floor optional)
- Snare/clap on 2 and 4
- Consistent hi-hat 8ths or 16ths
- Keep it simple and danceable
- Minimal fills, steady groove` : ""}
${style === "Blast Beat" || secondaryStyle === "Blast Beat" ? `BLAST BEAT (death metal, black metal):
- KICK on EVERY 16th note (all ${stepCount} steps)
- SNARE alternating with kick accents (every other step)
- Ride or hi-hat constant for intensity
- Velocities 100-127, machine-gun consistent
- Crashes on steps 0 and 16` : ""}
${style === "Jazz" || secondaryStyle === "Jazz" ? `JAZZ (bebop, swing):
- Ride cymbal leads (swing pattern on bow/bell)
- Hi-hat on 2 and 4 (foot)
- Ghost notes on snare throughout
- Kick sparse, "feathering" the beat
- Light, conversational feel` : ""}
${style === "Funk" || secondaryStyle === "Funk" ? `FUNK (James Brown, Tower of Power):
- Heavy accent on beat 1 (kick + crash)
- Syncopated ghost notes everywhere
- 16th-note hi-hat with open accents
- Kick syncopation, not straight
- Snare backbeat with ghosts around it` : ""}
${secondaryStyle && secondaryStyle !== "none" ? `\nBLENDING: Mix ${styleMix}% ${style} with ${100 - styleMix}% ${secondaryStyle}. Use primary genre's core pattern with secondary's flavor elements.` : ""}

=== HUMANIZATION ===
- Add 1-2 ghost snares per bar on offbeats (velocity 40-65)
- Vary hi-hat velocity: downbeats louder (85-95), upbeats softer (60-75)
- Occasional hi-hat open for accent (steps 7, 15, 23, 31 work well)
- No two consecutive same-drum hits with identical velocity
- Kick velocity should follow phrase dynamics (louder at phrase starts)

=== OUTPUT FORMAT ===
Return JSON with:
{
  "grid": [{"step": 0, "drum": "kick", "velocity": 110}, ...],
  "suggestedName": "Creative pattern name"
}

Drums: kick, snare, hihat_closed, hihat_open, tom_1, tom_2, crash, ride
Steps: 0 to ${stepCount - 1}
Target note count: ~${Math.floor((complexity / 100) * (stepCount * 2.5))} notes

Return ONLY valid JSON.`;

      const completion = await client.chat.completions.create({
        model: apiKey ? "gpt-4o" : "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("No content received from AI");

      const result = JSON.parse(content);
      
      if (!result.grid || !Array.isArray(result.grid)) {
        throw new Error("Invalid grid data received from AI");
      }

      res.json(result);
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ message: "Failed to generate pattern" });
    }
  });

  // Export full arrangement as single MIDI
  app.post("/api/patterns/export-arrangement", async (req, res) => {
    try {
      const { bpm, patterns } = req.body;
      
      const mainTrack = new MidiWriter.Track();
      mainTrack.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));
      mainTrack.setTempo(bpm);

      const drumMap: Record<string, number> = {
        'kick': 36,
        'snare': 38,
        'hihat_closed': 42,
        'hihat_open': 46,
        'tom_1': 48,
        'tom_2': 45,
        'crash': 49,
        'ride': 51
      };

      // Process each pattern in sequence using wait accumulation
      let waitSteps = 0;
      let currentTimeSignature = "";
      
      patterns.forEach((pattern: { grid: any[]; timeSignature?: string; stepCount?: number }, patternIndex: number) => {
        const patternTimeSignature = pattern.timeSignature || "4/4";
        const patternStepCount = pattern.stepCount || 32;
        const grid = pattern.grid || [];
        
        // Add time signature meta event if it changed
        if (patternTimeSignature !== currentTimeSignature) {
          const [beatsPerBar, noteValue] = patternTimeSignature.split('/').map(Number);
          mainTrack.setTimeSignature(beatsPerBar, noteValue, 24, 8);
          currentTimeSignature = patternTimeSignature;
        }
        
        // Group by step using pattern's stepCount
        const steps = new Array(patternStepCount).fill(null).map(() => [] as any[]);
        grid.forEach((note: any) => {
          if (note.step >= 0 && note.step < patternStepCount) {
            steps[note.step].push(note);
          }
        });

        steps.forEach((notesInStep) => {
          if (notesInStep.length > 0) {
            const pitches = notesInStep.map((n: any) => drumMap[n.drum]).filter(Boolean);
            if (pitches.length > 0) {
              const eventOptions: any = {
                pitch: pitches,
                duration: '16',
                velocity: notesInStep[0].velocity || 100,
                channel: 10
              };
              
              // Add wait if there were rests before this note
              if (waitSteps > 0) {
                eventOptions.wait = 'T' + (waitSteps * 32);
                waitSteps = 0;
              }
              
              mainTrack.addEvent(new MidiWriter.NoteEvent(eventOptions));
            } else {
              waitSteps++;
            }
          } else {
            waitSteps++;
          }
        });
      });

      const write = new MidiWriter.Writer(mainTrack);
      const fileData = write.buildFile();
      
      res.setHeader('Content-Type', 'audio/midi');
      res.setHeader('Content-Disposition', 'attachment; filename="arrangement.mid"');
      res.send(Buffer.from(fileData));

    } catch (error) {
      console.error("Arrangement Export Error:", error);
      res.status(500).json({ message: "Failed to export arrangement" });
    }
  });

  // Smart Beat - AI pattern generation from audio analysis
  app.post("/api/patterns/smart-beat", async (req, res) => {
    try {
      const { 
        bpm, 
        style, 
        rhythmPattern, 
        onsetCount, 
        duration, 
        intensity, 
        confidence,
        beatGrid,
        accentSteps,
        downbeatSteps,
        apiKey 
      } = req.body;

      const client = apiKey ? new OpenAI({ apiKey }) : openai;

      const densityDesc = rhythmPattern === "sparse" ? "minimal and spacious with lots of room to breathe" :
                          rhythmPattern === "moderate" ? "moderately busy with a good groove" :
                          rhythmPattern === "busy" ? "active and driving with many hits" :
                          "extremely dense and technical";

      const intensityProfile = Array.isArray(intensity) 
        ? intensity.map((v: number, i: number) => `Segment ${i + 1}: ${Math.round(v * 100)}%`).join(", ")
        : "Even intensity throughout";

      const beatGridStr = Array.isArray(beatGrid) && beatGrid.length > 0 
        ? beatGrid.join(", ") 
        : "0, 4, 8, 12, 16, 20, 24, 28";
      const accentStepsStr = Array.isArray(accentSteps) && accentSteps.length > 0 
        ? accentSteps.join(", ") 
        : "0, 8, 16, 24";
      const downbeatStepsStr = Array.isArray(downbeatSteps) && downbeatSteps.length > 0 
        ? downbeatSteps.join(", ") 
        : "0, 16";

      const prompt = `You are a world-class session drummer. Your job is to create drums that LOCK WITH the uploaded audio track.

=== DETECTED RHYTHM FROM AUDIO (FOLLOW THIS!) ===
- BPM: ${bpm}
- Detected beat positions (place KICKS here): [${beatGridStr}]
- Accent/strong beats (place SNARE or CRASH here): [${accentStepsStr}]
- Downbeats (bar starts - add CRASH): [${downbeatStepsStr}]
- Rhythm density: ${rhythmPattern} (${densityDesc})
- Intensity profile: ${intensityProfile}

=== CRITICAL: FOLLOW THE TRACK ===
The uploaded audio has hits at steps: [${beatGridStr}]
YOU MUST place kick drums on these EXACT steps to lock with the track!
- Place KICK on every detected beat position
- Place SNARE on accent steps (typically 4, 12, 20, 28 for backbeat, or use detected accents)
- Add CRASH on downbeat steps (bar starts)
- Fill in hi-hat/ride on remaining steps based on density

=== STYLE: ${style} ===
${style === "Djent" ? `DJENT: Syncopated kicks following the detected rhythm, ghost snares, ride bell.` : ""}
${style === "Metal" ? `METAL: Double kicks where detected, powerful snares, crash accents.` : ""}
${style === "Rock" ? `ROCK: Solid groove, snare on 2/4, steady cymbals.` : ""}
${style === "Post-hardcore" ? `POST-HARDCORE: Dynamic, mix of aggression and groove.` : ""}
${style === "Pop" ? `POP: Clean, danceable, consistent hi-hat.` : ""}
${style === "Blast Beat" ? `BLAST BEAT: Maximum intensity, every step filled.` : ""}
${style === "Jazz" ? `JAZZ: Ride-led, ghost snares, feathered kick.` : ""}
${style === "Funk" ? `FUNK: Heavy pocket, ghost notes, syncopated hats.` : ""}

=== VELOCITY RULES ===
- Kick: 95-120 (accents 120-127)
- Snare: Backbeats 100-120, ghost notes 40-65
- Hi-hat: Downbeats 85-100, upbeats 60-80
- Crash: 100-127
- VARY velocities - no identical consecutive values

=== DENSITY: ${rhythmPattern} ===
${rhythmPattern === "sparse" ? "MINIMAL - kicks on detected beats only, sparse hi-hat, no fills" : ""}
${rhythmPattern === "moderate" ? "BALANCED - kicks on beats, steady hi-hat, occasional ghost notes" : ""}
${rhythmPattern === "busy" ? "ACTIVE - fills, ghost notes, cymbal variety" : ""}
${rhythmPattern === "dense" ? "DENSE - maximum activity, fills, technical patterns" : ""}

=== OUTPUT FORMAT ===
{
  "grid": [{"step": 0, "drum": "kick", "velocity": 110}, ...],
  "style": "${style}",
  "description": "Brief description"
}

Drums: kick, snare, hihat_closed, hihat_open, tom_1, tom_2, crash, ride
Steps: 0-31

REMEMBER: Place kicks on detected steps [${beatGridStr}] to lock with the track!

Return ONLY valid JSON.`;

      const completion = await client.chat.completions.create({
        model: apiKey ? "gpt-4o" : "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("No content received from AI");

      const result = JSON.parse(content);
      
      if (!result.grid || !Array.isArray(result.grid)) {
        throw new Error("Invalid grid data received from AI");
      }

      res.json(result);
    } catch (error) {
      console.error("Smart Beat Error:", error);
      res.status(500).json({ message: "Failed to generate smart beat pattern" });
    }
  });

  // MIDI Export Route
  app.post(api.patterns.exportMidi.path, async (req, res) => {
    try {
      const { bpm, grid, timeSignature = "4/4", stepCount = 32 } = req.body;
      
      const [beatsPerBar, noteValue] = timeSignature.split('/').map(Number);
      
      const track = new MidiWriter.Track();
      track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));
      track.setTempo(bpm);
      track.setTimeSignature(beatsPerBar, noteValue, 24, 8);

      // Map drums to MIDI notes (General MIDI Standard)
      const drumMap: Record<string, number> = {
        'kick': 36,
        'snare': 38,
        'hihat_closed': 42,
        'hihat_open': 46,
        'tom_1': 48, // Hi-Mid Tom
        'tom_2': 45, // Low Tom
        'crash': 49,
        'ride': 51
      };

      // Group by step to handle simultaneous notes
      const steps = new Array(stepCount).fill(null).map(() => [] as any[]);
      
      grid.forEach((note: any) => {
        if (note.step >= 0 && note.step < stepCount) {
          steps[note.step].push(note);
        }
      });

      // 16th notes - track accumulated wait time for rests
      let waitSteps = 0;
      
      steps.forEach((notesInStep, stepIndex) => {
        if (notesInStep.length > 0) {
          const pitches = notesInStep.map((n: any) => drumMap[n.drum]).filter(Boolean);
          if (pitches.length > 0) {
            const eventOptions: any = {
              pitch: pitches,
              duration: '16',
              velocity: notesInStep[0].velocity || 100,
              channel: 10 // Drum channel
            };
            
            // Add wait if there were rests before this note
            if (waitSteps > 0) {
              eventOptions.wait = 'T' + (waitSteps * 32); // 32 ticks per 16th note at 128 PPQ
              waitSteps = 0;
            }
            
            track.addEvent(new MidiWriter.NoteEvent(eventOptions));
          } else {
            waitSteps++;
          }
        } else {
          waitSteps++;
        }
      });

      const write = new MidiWriter.Writer(track);
      const fileData = write.buildFile();
      
      res.setHeader('Content-Type', 'audio/midi');
      res.setHeader('Content-Disposition', 'attachment; filename="pattern.mid"');
      res.send(Buffer.from(fileData));

    } catch (error) {
      console.error("MIDI Export Error:", error);
      res.status(500).json({ message: "Failed to export MIDI" });
    }
  });

  // Seeding
  const existing = await storage.getPatterns();
  if (existing.length === 0) {
    console.log("Seeding database with initial patterns...");
    await storage.createPattern({
      name: "Basic Rock Groove",
      bpm: 120,
      style: "Rock",
      type: "Groove",
      grid: [
        { step: 0, drum: "kick", velocity: 100 },
        { step: 4, drum: "snare", velocity: 100 },
        { step: 8, drum: "kick", velocity: 100 },
        { step: 12, drum: "snare", velocity: 100 },
        { step: 0, drum: "hihat_closed", velocity: 80 },
        { step: 2, drum: "hihat_closed", velocity: 80 },
        { step: 4, drum: "hihat_closed", velocity: 80 },
        { step: 6, drum: "hihat_closed", velocity: 80 },
        { step: 8, drum: "hihat_closed", velocity: 80 },
        { step: 10, drum: "hihat_closed", velocity: 80 },
        { step: 12, drum: "hihat_closed", velocity: 80 },
        { step: 14, drum: "hihat_closed", velocity: 80 },
      ]
    });
    
    await storage.createPattern({
      name: "Djent Syncopation",
      bpm: 140,
      style: "Djent",
      type: "Groove",
      grid: [
        { step: 0, drum: "kick", velocity: 110 },
        { step: 2, drum: "kick", velocity: 100 },
        { step: 4, drum: "snare", velocity: 110 },
        { step: 7, drum: "kick", velocity: 100 },
        { step: 10, drum: "kick", velocity: 100 },
        { step: 12, drum: "snare", velocity: 110 },
        { step: 15, drum: "kick", velocity: 90 },
        { step: 0, drum: "crash", velocity: 100 },
        { step: 0, drum: "ride", velocity: 80 },
        { step: 2, drum: "ride", velocity: 80 },
        { step: 4, drum: "ride", velocity: 80 },
        { step: 6, drum: "ride", velocity: 80 },
        { step: 8, drum: "ride", velocity: 80 },
        { step: 10, drum: "ride", velocity: 80 },
        { step: 12, drum: "ride", velocity: 80 },
        { step: 14, drum: "ride", velocity: 80 },
      ]
    });
  }

  return httpServer;
}
