"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Chess } from "chess.js";

type Move = {
  moveNumber: number;
  white: string;
  black: string;
};

export function MoveHistory({ pgn }: { pgn: string }) {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });

  const moves: Move[] = [];
  for (let i = 0; i < history.length; i += 2) {
    moves.push({
      moveNumber: i / 2 + 1,
      white: history[i].san,
      black: history[i + 1] ? history[i + 1].san : "",
    });
  }

  return (
    <div className="h-64 overflow-y-auto border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>White</TableHead>
            <TableHead>Black</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {moves.map((move) => (
            <TableRow key={move.moveNumber}>
              <TableCell className="font-medium">{move.moveNumber}</TableCell>
              <TableCell>{move.white}</TableCell>
              <TableCell>{move.black}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}