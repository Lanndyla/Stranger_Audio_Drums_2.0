# Drum Pattern Studio

## Overview

This is an AI-powered drum pattern sequencer and generator built for metal and modern music production. Users can create, generate, edit, and save drum patterns through a visual grid interface with real-time audio preview. The app uses OpenAI to generate stylistically appropriate drum patterns based on genre selection (Djent, Metal, Rock, Post-hardcore, etc.) and exports patterns as MIDI files.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack Query for server state, React useState for local UI state
- **UI Components**: Shadcn/ui component library with Radix primitives
- **Styling**: Tailwind CSS with custom "cyber metal" dark theme (neon cyan/magenta accents)
- **Audio Engine**: Tone.js for real-time drum synthesis and playback
- **Fonts**: Orbitron (display), Rajdhani (mono), Inter (body)

### Backend (Express + Node.js)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI API via Replit AI Integrations for pattern generation
- **MIDI Export**: midi-writer-js for creating downloadable MIDI files
- **Build**: esbuild for server bundling, Vite for client

### Data Flow
1. User configures pattern settings (BPM, style, type, complexity)
2. AI generates grid data via `/api/patterns/generate` endpoint
3. Grid data stored as JSONB in PostgreSQL patterns table
4. Audio engine plays patterns in real-time using Tone.js synthesizers
5. Patterns can be exported as MIDI files via `/api/patterns/:id/midi`

### Key Design Decisions
- **Synthesized Audio**: Uses Tone.js synthesizers instead of samples for smaller bundle size and flexibility across drum kits
- **32-Step Grid**: Fixed 32-step sequencer allows for complex polyrhythmic patterns common in metal/djent
- **JSONB Grid Storage**: Pattern grid stored as JSON array of `{step, drum, velocity}` objects for flexible editing
- **Shared Types**: `shared/` directory contains schemas and routes used by both client and server

## External Dependencies

### Database
- **PostgreSQL**: Primary data store for patterns and chat conversations
- **Drizzle ORM**: Type-safe database queries with automatic schema generation
- **Connection**: Uses `DATABASE_URL` environment variable

### AI Services
- **OpenAI API**: Pattern generation via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables
- **Replit AI Integrations**: Pre-configured OpenAI access with image generation support

### Audio Libraries
- **Tone.js**: Web Audio API wrapper for synthesizers, scheduling, and effects
- **midi-writer-js**: Server-side MIDI file generation

### UI Framework
- **Radix UI**: Accessible primitive components (dialogs, dropdowns, sliders, etc.)
- **Shadcn/ui**: Pre-styled component collection built on Radix
- **Lucide React**: Icon library