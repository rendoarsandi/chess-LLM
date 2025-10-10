import { Game } from "./components/Game";

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-4">Chess LLM</h1>
      <Game />
    </main>
  );
}
