# Chess AI vs AI - Powered by Google Gemini

A sophisticated chess application where AI agents powered by Google Gemini play against each other or against humans. The AI provides detailed reasoning for each move, tracks illegal moves, and displays opening references.

## Features

### 🤖 AI Models
- **Gemini 2.5 Pro** - Strongest model with deep analysis
- **Gemini 2.5 Flash** - Balanced performance and speed
- **Gemini 2.5 Flash Lite** - Fast responses

### ♟️ Game Modes
- **Human vs AI** - Play against the AI
- **AI vs AI** - Watch two AI agents battle it out

### 🎯 Key Features
- ✅ Full chess rules implementation using chess.js
- ✅ Beautiful chess board with react-chessboard
- ✅ AI reads FEN and PGN positions (no hallucinations)
- ✅ Detailed AI reasoning displayed in real-time
- ✅ Opening reference database with ECO codes
- ✅ Illegal move tracking (5 strikes = automatic loss)
- ✅ Background game processing with Convex
- ✅ Real-time updates and synchronization
- ✅ Move history and analysis
- ✅ Game state persistence

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Convex (serverless backend)
- **AI**: Google Generative AI (Gemini)
- **Chess Engine**: chess.js
- **Chess UI**: react-chessboard

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Google AI API Key ([Get one here](https://makersuite.google.com/app/apikey))
- Convex account ([Sign up here](https://convex.dev))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rendoarsandi/chess-LLM.git
cd chess-llm
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
```env
NEXT_PUBLIC_CONVEX_URL=your-convex-url
CONVEX_DEPLOYMENT=your-convex-deployment
GOOGLE_AI_API_KEY=your-gemini-api-key
```

4. Initialize Convex:
```bash
npx convex dev
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

### Game Flow

1. **Setup**: Choose game mode (Human vs AI or AI vs AI) and select AI models
2. **Start**: Game begins automatically when you click "Start Game"
3. **Play**:
   - In Human vs AI mode, make moves by dragging pieces
   - In AI vs AI mode, watch the game unfold automatically
4. **Analysis**: View AI reasoning, opening references, and move history in real-time
5. **Completion**: Game ends on checkmate, stalemate, draw, or 5 illegal moves

### AI Move Generation

The AI analyzes positions using:
- Current FEN (Forsyth-Edwards Notation)
- Full PGN (Portable Game Notation) history
- Legal moves list (prevents hallucinations)
- Opening database context
- Strategic evaluation

### Illegal Move Tracking

- Each illegal move attempt is recorded
- Players get 5 chances before automatic loss
- All illegal moves are logged with error details
- Prevents AI from making invalid moves

## Project Structure

```
chess-llm/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Main page
│   ├── layout.tsx           # Root layout
│   └── ConvexClientProvider.tsx
├── components/              # React components
│   ├── ChessGame.tsx       # Main chess game component
│   ├── GameInfo.tsx        # Game information panel
│   └── GameSetup.tsx       # Game setup form
├── convex/                  # Convex backend
│   ├── schema.ts           # Database schema
│   ├── games.ts            # Game mutations/queries
│   ├── ai.ts               # AI move generation
│   ├── openings.ts         # Chess opening database
│   ├── gameProcessor.ts    # Background processing
│   └── crons.ts            # Scheduled jobs
├── lib/                     # Utilities
│   └── chess-utils.ts      # Chess logic helpers
└── __tests__/              # Tests
    └── chess-utils.test.ts
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import project to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. Configure environment variables in Vercel:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `GOOGLE_AI_API_KEY`

4. Deploy!

### Deploy Convex Backend

```bash
npx convex deploy
```

Update your Vercel environment variables with the production Convex URL.

## Testing

Run manual tests:
```bash
npm run dev
```

Then test the following scenarios:
- ✅ Create Human vs AI game
- ✅ Create AI vs AI game
- ✅ Make valid moves
- ✅ Attempt illegal moves
- ✅ Complete a game (checkmate/stalemate)
- ✅ View AI reasoning
- ✅ Check opening references
- ✅ Verify illegal move counter

## Configuration

### AI Model Selection

Edit the AI model options in `components/GameSetup.tsx`:
```typescript
const aiModels = [
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Strongest)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanced)" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Fast)" },
];
```

### Opening Database

Add more openings in `convex/openings.ts`:
```typescript
{ eco: "C50", name: "Italian Game", moves: "1. e4 e5 2. Nf3 Nc6 3. Bc4" }
```

## Troubleshooting

### Common Issues

**Issue**: AI not making moves
- Check GOOGLE_AI_API_KEY is set correctly
- Verify API key has proper permissions
- Check browser console for errors

**Issue**: Convex connection failed
- Run `npx convex dev` in a separate terminal
- Verify NEXT_PUBLIC_CONVEX_URL is correct

**Issue**: Illegal moves not tracked
- Check Convex backend is running
- Verify database schema is deployed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for learning and development.

## Acknowledgments

- [chess.js](https://github.com/jhlywa/chess.js) - Chess logic
- [react-chessboard](https://github.com/Clariity/react-chessboard) - Chess UI
- [Convex](https://convex.dev) - Backend platform
- [Google Gemini](https://ai.google.dev) - AI models
- [Next.js](https://nextjs.org) - React framework

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the documentation

---

Built with ❤️ using Next.js, Convex, and Google Gemini
