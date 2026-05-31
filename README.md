# Ninh Lốp Trưởng Chess

## Overview

Ninh Lốp Trưởng Chess is a React/Vite chess web app focused on fast local play, bot practice, move review, and lightweight training tools.

The brand is intentionally a little meme-flavored, but the product direction is still a clean chess app: the board stays central, the controls stay practical, and Ninh only gáy vừa đủ.

This project is still being improved. Some areas, especially online play, AI coach responses, and automated test coverage, should be treated as in-progress rather than production-complete.

## Features

- Play chess locally or against the Ninh Lốp Trưởng bot.
- Responsive chessboard with click-to-move, drag-to-move, legal move hints, last-move highlight, and king-in-check highlight.
- Bot difficulty settings and compact bot thinking feedback.
- Move history, undo, resign, board flip, and new game controls.
- Stockfish-backed analysis and best-move hints with fallback behavior when the engine is unavailable.
- Quân sư Ninh AI Coach panel for short position advice and hints.
- Lò luyện khai cuộc for opening practice with progress stored locally.
- Tactics/exercise pages and a training dashboard based on local user profile data.
- Supabase-backed login/register flow when Supabase environment variables are configured.
- Experimental online play route using Supabase tables/realtime.

## Tech Stack

- React 19
- Vite 8
- Tailwind CSS
- React Router
- `chess.js` for chess rules and move validation
- `react-chessboard` for board rendering and interaction
- Stockfish integration for engine analysis and bot move selection
- Supabase for authentication, cloud profile data, and experimental online games
- Vitest and Testing Library for automated tests

## Getting Started

Install dependencies:

```bash
npm install
```

Run the Vite dev server:

```bash
npm run dev
```

Run the optional local AI Coach server:

```bash
npm run dev:server
```

Run both frontend and local server:

```bash
npm run dev:all
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run tests:

```bash
npm test
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values you need.

Frontend Supabase configuration:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Optional local AI Coach server configuration:

```env
AI_API_KEY=your-provider-api-key
AI_MODEL=gpt-4o-mini
```

Some Vercel/serverless AI paths also reference Claude-style variables:

```env
CLAUDE_API_KEY=your-claude-api-key
VITE_CLAUDE_API_KEY=your-claude-api-key
```

Supabase is optional for local board/bot practice. Login, cloud sync, and online play need Supabase configuration and the expected database tables.

## Project Structure

```text
api/                 Vercel/serverless coach endpoints and prompt helpers
docs/                Architecture notes, audit notes, and archived implementation notes
public/              Static assets and Stockfish worker files
server/              Optional local Express AI Coach server
src/assets/          Images and app assets
src/components/      Shared UI, chess UI, analysis panels, openings, and training components
src/contexts/        Auth and chess game providers
src/data/            Exercises, openings, levels, and training rules
src/hooks/           Engine, bot, and move-highlight hooks
src/lib/             Supabase client setup
src/pages/           Route-level pages
src/services/        Stockfish, bot, coach, auth, profile, online game, and progress services
src/utils/           Chess move helpers, sound helpers, and social-intent utilities
supabase/            Supabase schema and migration files
```

Important gameplay files:

- `src/contexts/ChessGameContext.tsx`
- `src/components/ChessGameBoard.jsx`
- `src/components/chess/ChessBoardPanel.jsx`
- `src/components/chess/GameLayout.jsx`
- `src/hooks/useBotMove.js`
- `src/services/stockfishService.js`

## Known Issues

- The automated test suite currently has stale expectations around FEN formatting, move highlight styling, engine hook mocks, and evaluation formatting. `npm run build` is the stronger verification signal right now.
- `ChessGameContext.tsx` still carries several responsibilities. It should be split carefully later, but a broad rewrite would be risky.
- Online play is experimental and depends on Supabase setup, realtime behavior, and table policies.
- AI Coach can fall back to mock or generic responses when the API/server is unavailable.
- Some older internal storage keys and archived notes still reference the previous project name.
- Deep analysis and coach panels are intentionally secondary to the board, but mobile polish can still improve.

## Roadmap

- Update stale automated tests to match current board highlighting and engine behavior.
- Continue simplifying chess state architecture in small, testable steps.
- Improve promotion UX beyond automatic queen promotion.
- Harden online play validation and Supabase setup documentation.
- Make AI Coach source/fallback status clearer to users.
- Add real screenshots once the UI stabilizes.
- Keep the meme copy controlled while improving the serious chess experience.
