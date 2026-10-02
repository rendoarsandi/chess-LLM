# Verification record

This rebuild was verified from a Termux/Android host. Native Cloudflare and browser checks belong on supported desktop/CI hosts; their npm commands now reject Android before starting those runtimes.

| Check                                                     | Result                                                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript and ESLint (`npm run check`)                   | Passed after the final UI fixes                                                                                                   |
| Sequential core/API/provider suite (`npm run test:light`) | 12 tests passed in 3 files                                                                                                        |
| Client and Worker builds (`npm run build`)                | Passed                                                                                                                            |
| OpenRouter public catalogue via the official SDK          | Loaded successfully without paid inference                                                                                        |
| Full browser workflow                                     | Earlier run passed both tests: setup, streamed reasoning, public viewing, pause/resume, replay, unattended completion, and export |
| Later browser confirmation                                | Interrupted by the Termux crash; final contrast/control fixes were not recaptured                                                 |
| Cloudflare deployment dry run                             | Passed in an isolated Linux checkout with frontend assets and both DO bindings                                                    |
| Real Cloudflare lifecycle test                            | Could not start: workerd's allocator failed on the Android host's address-space limits; routed to Linux CI                        |
| Design detector                                           | No findings in its one pass                                                                                                       |
| Independent UI finish verdict                             | Three reported fixes scored resolved from source and numerical evidence; no whole-surface approval claimed                        |
| Git whitespace check                                      | Passed                                                                                                                            |

No paid model inference or external deployment was performed. Fixtures are explicitly synthetic and run in separate ephemeral databases.

The final UI fixes hide management controls from unconnected spectators, raise placeholder contrast to 5.04:1 on white, and maintain at least 4.53:1 for board coordinate labels including highlighted squares and the empty board's opacity. The reviewer scored those three fixes ready to ship based on source and contrast calculations. Existing captures cover Empty, Setup, and Live on desktop/mobile before those final adjustments; Results and Methodology have no final visual verdict.

GitHub Actions runs static checks, core tests, builds, real Durable Object lifecycle checks, deployment bundling, and browser tests on Linux. This local record does not claim that CI has already executed.
