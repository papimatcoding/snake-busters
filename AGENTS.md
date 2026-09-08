# Working on Snake Busters

- Read README.md first. Keep it current after every functional change, including current status, verification and the next concrete step.
- GitHub repository: `papimatcoding/snake-busters`. Keep changes scoped to this game.
- This is a dependency-free static Canvas game. `dist/` contains authored source and must stay tracked.
- Keep simulation in `dist/engine.js` independent from the DOM; input/rendering/audio belong in `dist/game.js`.
- Preserve the `.openai/hosting.json` project identity and use Sites skills for hosting tasks. Never create a replacement Site to update an existing one.
- Verify meaningful gameplay changes with `node --test tests/engine.test.mjs` and JavaScript syntax checks. Document untested behavior honestly.
- Prioritize feel, clarity and fair build choices. Do not add monetization, analytics, accounts or pretend-online opponents without a request.
- Local scores are untrusted; never treat them as an authoritative competitive leaderboard.
