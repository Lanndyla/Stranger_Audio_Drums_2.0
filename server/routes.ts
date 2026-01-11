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

      const prompt = `Generate a drum pattern for a ${style} song. 
      BPM: ${bpm}. Type: ${type}.
      Return a JSON object with two fields:
      1. 'grid': an array of objects representing the pattern. Each object has:
         - 'step': integer 0-15 (16 steps)
         - 'drum': string (one of: 'kick', 'snare', 'hihat_closed', 'hihat_open', 'tom_1', 'tom_2', 'crash', 'ride')
         - 'velocity': integer 0-127
      2. 'suggestedName': a creative string name for this pattern.
      
      Make it realistic for the genre. For Djent/Metal, use syncopated kicks and aggressive snares.
      Ensure the JSON is valid and only return the JSON.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("No content received from AI");

      const result = JSON.parse(content);
      
      // Basic validation of the AI response structure
      if (!result.grid || !Array.isArray(result.grid)) {
        throw new Error("Invalid grid data received from AI");
      }

      res.json(result);
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ message: "Failed to generate pattern" });
    }
  });

  // MIDI Export Route
  app.post(api.patterns.exportMidi.path, async (req, res) => {
    try {
      const { bpm, grid } = req.body;
      
      const track = new MidiWriter.Track();
      track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 }));
      track.setTempo(bpm);

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
      const steps = new Array(16).fill(null).map(() => [] as any[]);
      
      grid.forEach((note: any) => {
        if (note.step >= 0 && note.step < 16) {
          steps[note.step].push(note);
        }
      });

      // 16th notes
      steps.forEach((notesInStep) => {
        if (notesInStep.length > 0) {
          const pitches = notesInStep.map((n: any) => drumMap[n.drum]).filter(Boolean);
          if (pitches.length > 0) {
            track.addEvent(new MidiWriter.NoteEvent({
              pitch: pitches,
              duration: '16',
              velocity: notesInStep[0].velocity || 100 // Use velocity of first note or default
            }));
          } else {
             track.addEvent(new MidiWriter.NoteEvent({pitch: [], duration: '16', wait: true}));
          }
        } else {
          // Rest
           track.addEvent(new MidiWriter.NoteEvent({pitch: [], duration: '16', wait: true}));
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
