# Play Chess with Ninh

A modern, full-featured web-based chess application with AI coaching and Stockfish integration.

[![Live Demo](https://img.shields.io/badge/demo-Live%20Demo-emerald.svg)](https://chess-brown-two.vercel.app/)

## Features

- **Local Play:** Play chess locally on the same device.
- **Bot Play (Stockfish):** Play against "Ngoại lệ của cô ấy" with configurable ELO ratings.
- **Stockfish Analysis:** Real-time engine evaluation and move hints powered by Web Workers.
- **AI Coach:** Get instant, tactical feedback and guidance tailored to your level.
- **Opening Trainer:** Learn and practice popular chess openings.
- **Robust Gameplay:** Includes promotion modals, move history, PGN export, and undo functionality.

## Tech Stack

| Component     | Technology |
|---------------|------------|
| Frontend      | React 18, Vite |
| Styling       | Tailwind CSS 3.x |
| Chess Logic   | chess.js, react-chessboard |
| Engine        | Stockfish WASM (Web Worker) |
| Backend/Auth  | Supabase, Vercel Serverless |

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ninhhh1011/chess.git
   cd chess
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your credentials.

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Refer to `.env.example` for required keys:
- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous API key.

## Folder Structure

- `src/components`: Reusable UI components and chess board elements.
- `src/hooks`: Custom React hooks for logic (e.g., Engine Analysis, Move Highlights).
- `src/contexts`: Global state providers (e.g., ChessGameContext).
- `src/services`: API wrappers and Web Worker integrations (Stockfish, Supabase).
- `src/pages`: Top-level route components.

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## License

This project is open-source and available under the MIT License.
