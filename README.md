# Ninh Lốp Trưởng Chess ♟

<div align="center">

![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-0A0A0F?logo=tailwind-css)
![HeroUI](https://img.shields.io/badge/HeroUI-v3.2.4-141A17)
![License](https://img.shields.io/badge/License-MIT-818CF8)

**Học từ chính những nước cờ của bạn**

</div>

---

## ✨ Features

### 🎮 Gameplay
- **Local & Bot Play** - Đấu với Ninh Lốp Trưởng bot phân tầng 4 cấp độ
- **Interactive Board** - Click hoặc kéo quân, legal move hints, last-move highlight
- **Sound Effects** - Move, capture, castling, promotion, victory/defeat sounds
- **Keyboard Shortcuts** - U=undo, H=hint, F=flip, R=resign, N=new game
- **Keyboard Navigation** - Arrow keys để di chuyển trên bàn cờ

### 🤖 AI Features
- **Stockfish Engine** - Phân tích thế cờ và gợi ý nước đi tốt nhất
- **AI Coach** - Quân sư Ninh phân tích nước đi của bạn với nguồn minh bạch
- **Move Annotations** - !!, !, !?, ?!, ?, ?? badges cho từng nước

### 🎨 Design
- **Option C Theme** - Charcoal + Pine + Copper phong cách hiện đại
- **HeroUI Wrapper** - Trải nghiệm UI nhất quán, chuẩn accessibility
- **Quiet Motion** - Micro-animations tinh tế, hỗ trợ prefers-reduced-motion
- **PWA Ready** - Install như native app, offline support

### 📚 Learning
- **Opening Explorer** - 8 khai cuộc phổ biến với ECO codes
- **Move History** - Xem lại với annotations, copy PGN
- **Game Timer** - Theo dõi thời gian chơi
- **Onboarding** - Tips cho người mới

---

## 🚀 Quick Start

```bash
# Clone và cài đặt
npm install

# Chạy dev server
npm run dev

# Build production
npm run build
```

---

## 🎹 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `U` | Undo move |
| `H` | Get hint |
| `F` | Flip board |
| `R` | Resign |
| `N` | New game |
| `↑↓←→` | Navigate squares |
| `Enter` | Select/make move |
| `Tab` | Cycle legal moves |
| `Esc` | Cancel/deselect |

---

## 🛠 Tech Stack

| Category | Tech |
|----------|------|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS + Design Tokens |
| Chess | chess.js + react-chessboard |
| Engine | Stockfish (WASM) |
| Animation | Framer Motion |
| Icons | Lucide React |
| Auth | Supabase (optional) |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── chess/          # Chess game components
│   ├── design-system/   # Button, Card, Input, Badge
│   └── ui/             # Navbar, Layout
├── contexts/           # ChessGameContext, AuthContext
├── hooks/              # useBotMove, useBoardTheme, useKeyboard*
├── pages/              # Home, Play, Learn, Training
├── services/           # Stockfish, Bot, Coach services
└── utils/             # Sound, helpers
```

---

## ⚙️ Environment Variables

```env
# Supabase (optional - for auth & online play)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI Coach (optional)
AI_API_KEY=your-provider-api-key
```

---

## 📄 License

MIT © [ninhhh1011](https://github.com/ninhhh1011)

---

<div align="center">

**Made with ♟ by Claude**

</div>
