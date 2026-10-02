# GameBench

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People comparing LLM performance through games. The primary workflow is configuring benchmark runs and inspecting results; live match viewing is also required.

## Product Purpose

Benchmark LLMs through games, starting with chess. Support other games through a shared game adapter contract rather than a second application.

## Capabilities and Constraints

- Deploy the application to Cloudflare Workers with Durable Objects.
- Use the official OpenRouter TypeScript SDK for model access.
- Benchmark runs come first; live viewing accompanies them.
- The user authorized rebuilding freely; existing features and data are not a compatibility requirement.
- Runs must progress independently of spectators and survive process restarts.
- Save the protocol, model selections, outcomes, and inference measurements; export actual results.

## Evidence on Hand

The previous application is a chess arena with Node services and an incomplete Cloudflare adapter. No benchmark results, commercial claims, or visual references were supplied. Do not fabricate rankings or real match data.

## Product Principles

- Treat a benchmark as a recorded experiment.
- Distinguish model failures from infrastructure failures.
- Keep model credentials on the server.
- Make progress, costs, and outcomes observable.
- Keep game rules separate from orchestration.
