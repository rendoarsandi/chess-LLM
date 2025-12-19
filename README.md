# ChessLLM

A full-stack chess application where users can play against an AI powered by Google's Gemini 2.5 Flash model. The project is built as a monorepo using modern web technologies.

## 🚀 Tech Stack

### Client
- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Chess Logic:** chess.js, react-chessboard
- **Routing:** React Router 7

### Server
- **Runtime:** Node.js
- **Framework:** Hono
- **Database:** SQLite (via Better SQLite3)
- **ORM:** Drizzle ORM
- **AI Integration:** Google Generative AI (Gemini 2.5 Flash)
- **Testing:** Vitest

## 🛠️ Prerequisites

- Node.js (v20 or later recommended)
- npm (v10 or later)
- A Google Gemini API Key

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/rendoarsandi/chess-LLM.git
    cd chess-LLM
    ```

2.  **Install dependencies:**
    This project is configured with workspaces, so running `npm install` in the root will install dependencies for both client and server.
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the `server` directory (`server/.env`) and add your Google Gemini API Key:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Database Setup:**
    Initialize the SQLite database.
    ```bash
    npm run db:push
    ```

## 🏃‍♂️ Running the Application

You can run both the client and server concurrently from the root directory:

```bash
npm run dev
```

- **Client:** http://localhost:5173
- **Server:** http://localhost:3000

## 📂 Project Structure

```
chessllm/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components (Chessboard, GameHistory, etc.)
│   │   ├── lib/            # Utilities
│   │   └── ...
│   └── ...
├── server/                 # Hono backend
│   ├── src/
│   │   ├── db/             # Database schema and configuration
│   │   ├── game/           # Game logic and AI integration
│   │   └── ...
│   └── drizzle/            # Drizzle migrations
├── conductor/              # Project documentation and planning
└── ...
```

## 🧪 Testing

To run backend tests:

```bash
npm test -w server
```

## 📝 License

This project is licensed under the ISC License.
