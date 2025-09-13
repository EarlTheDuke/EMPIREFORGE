# Overview

This is a turn-based strategy game called "Empire" built as a full-stack web application. The game is inspired by classic Empire games where players control military units on a grid-based map, build cities, produce units, and compete against AI opponents. Players can move different types of units (army, naval vessels), engage in combat, and manage fog of war mechanics. The application features a retro terminal-style UI with a monospace font aesthetic.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with a custom retro/terminal theme featuring dark colors and monospace fonts
- **State Management**: TanStack Query (React Query) for server state management with custom hooks for game operations
- **Routing**: Wouter for lightweight client-side routing
- **Type Safety**: Comprehensive TypeScript with shared schemas between frontend and backend

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **API Design**: RESTful endpoints for game operations (create game, move units, produce units, end turn)
- **Development Server**: Vite integration for hot module replacement in development
- **Error Handling**: Centralized error handling middleware with structured error responses
- **Request Logging**: Custom middleware for API request logging with timing and response capture

## Data Storage Solutions
- **Database**: PostgreSQL with Neon Database as the cloud provider
- **ORM**: Drizzle ORM for type-safe database operations with schema migrations
- **Development Storage**: In-memory storage implementation for rapid development and testing
- **Session Management**: PostgreSQL-based session storage using connect-pg-simple

## Game Logic Architecture
- **Shared Logic**: Game rules and mechanics implemented in shared modules accessible by both client and server
- **Turn Management**: State machine handling player turns and AI turn processing
- **Combat System**: Deterministic combat resolution with 50/50 odds following classic Empire mechanics
- **Map Generation**: Procedural island-based map generation with configurable parameters
- **Fog of War**: Client-side and server-side fog of war implementation for strategic gameplay

## External Dependencies
- **Database**: Neon PostgreSQL for production data persistence
- **UI Components**: Radix UI ecosystem for accessible component primitives
- **Development Tools**: Replit-specific plugins for enhanced development experience
- **Build Tools**: Vite with React plugin, ESBuild for server bundling
- **Validation**: Zod for runtime type validation and schema parsing
- **Utilities**: Date-fns for date manipulation, Nanoid for unique ID generation