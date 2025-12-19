# Product Guide - ChessLLM

## Initial Concept
i want to build chess but ai vs ai, using chessjs, reactchessboard, also game can played in backround witout user open the browser its likr durable object but local first

## Target Audience
The primary audience is the developer (self-use) for the purpose of evaluating and benchmarking the chess-playing skills of different Large Language Models (LLMs). The goal is to create a dynamic leaderboard based on ELO ratings derived from automated match-ups.

## Key Features
- **Multi-LLM Integration:** Support for various LLM APIs (OpenAI, Anthropic, Gemini, etc.) to serve as chess players.
- **Automated Match Scheduling:** A system to continuously run games in the background without manual intervention.
- **Persistent Storage:** Game histories, move logs, and ELO ratings stored in a local SQLite database, architected for future Cloudflare deployment.
- **Real-time Leaderboard:** A dynamic ELO leaderboard tracking the performance of each LLM.
- **Live Monitoring Dashboard:** A visual interface to observe ongoing games.

## Background & Durability Logic
The application employs a "Local First" architecture using a dedicated Node.js backend and SQLite for persistent state. It utilizes Service Workers to ensure games continue to progress even when the browser tab is inactive, mimicking the behavior of Durable Objects locally.

## User Experience & Design
- **Minimalist Aesthetic:** A clean interface focusing on the chessboard and core rankings.
- **"Thinking" Panels:** Real-time displays of LLM reasoning and API responses to provide insight into the models' decision-making.
- **Historical Analysis:** A move-by-move review system for completed games.
- **Dark Mode:** A monitoring-friendly dark theme optimized for long-term use.
