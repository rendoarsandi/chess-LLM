/**
 * Manual tests for chess utilities
 * Run these tests manually to verify chess logic
 */

import { Chess } from "chess.js";
import {
  createChessFromFen,
  getLegalMovesUCI,
  makeMove,
  isMoveLegal,
  getGameStatus,
} from "../lib/chess-utils";

// Test 1: Create chess from FEN
export function testCreateChessFromFen() {
  console.log("Test 1: Create chess from FEN");
  
  const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const chess = createChessFromFen(startFen);
  
  console.assert(chess.fen() === startFen, "FEN should match");
  console.log("✓ Test 1 passed");
}

// Test 2: Get legal moves
export function testGetLegalMoves() {
  console.log("\nTest 2: Get legal moves");
  
  const chess = new Chess();
  const legalMoves = getLegalMovesUCI(chess);
  
  console.assert(legalMoves.length === 20, "Should have 20 legal moves at start");
  console.assert(legalMoves.includes("e2e4"), "Should include e2e4");
  console.log("✓ Test 2 passed");
}

// Test 3: Make valid move
export function testMakeValidMove() {
  console.log("\nTest 3: Make valid move");
  
  const chess = new Chess();
  const result = makeMove(chess, "e2e4");
  
  console.assert(result.success === true, "Move should succeed");
  console.assert(result.move?.san === "e4", "SAN should be e4");
  console.log("✓ Test 3 passed");
}

// Test 4: Make invalid move
export function testMakeInvalidMove() {
  console.log("\nTest 4: Make invalid move");
  
  const chess = new Chess();
  const result = makeMove(chess, "e2e5");
  
  console.assert(result.success === false, "Move should fail");
  console.assert(result.error !== undefined, "Should have error message");
  console.log("✓ Test 4 passed");
}

// Test 5: Check move legality
export function testIsMoveLegal() {
  console.log("\nTest 5: Check move legality");
  
  const chess = new Chess();
  
  console.assert(isMoveLegal(chess, "e2e4") === true, "e2e4 should be legal");
  console.assert(isMoveLegal(chess, "e2e5") === false, "e2e5 should be illegal");
  console.log("✓ Test 5 passed");
}

// Test 6: Detect checkmate
export function testCheckmate() {
  console.log("\nTest 6: Detect checkmate");
  
  // Fool's mate
  const chess = new Chess();
  makeMove(chess, "f2f3");
  makeMove(chess, "e7e5");
  makeMove(chess, "g2g4");
  const result = makeMove(chess, "d8h4");
  
  console.assert(result.isGameOver === true, "Game should be over");
  console.assert(result.gameOverReason === "checkmate", "Should be checkmate");
  console.assert(result.winner === "black", "Black should win");
  console.log("✓ Test 6 passed");
}

// Test 7: Get game status
export function testGameStatus() {
  console.log("\nTest 7: Get game status");
  
  const chess = new Chess();
  const status = getGameStatus(chess);
  
  console.assert(status.turn === "w", "Should be white's turn");
  console.assert(status.isCheck === false, "Should not be in check");
  console.assert(status.isGameOver === false, "Game should not be over");
  console.log("✓ Test 7 passed");
}

// Run all tests
export function runAllTests() {
  console.log("=== Running Chess Utils Tests ===\n");
  
  try {
    testCreateChessFromFen();
    testGetLegalMoves();
    testMakeValidMove();
    testMakeInvalidMove();
    testIsMoveLegal();
    testCheckmate();
    testGameStatus();
    
    console.log("\n=== All tests passed! ===");
  } catch (error) {
    console.error("\n=== Test failed! ===");
    console.error(error);
  }
}

// Uncomment to run tests
// runAllTests();

