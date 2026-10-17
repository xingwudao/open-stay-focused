# Contributing

Use Node 22+, run `npm ci`, then install Playwright Chromium. Run `npm test`,
`npm run test:browser`, `npm run build` and `npm run package` before submitting
changes. Add regression tests for matching, time accounting or permission bugs.
Keep UI text accessible and render user-controlled data as text, never HTML.

Keep runtime dependency-free and local-first. Do not introduce analytics,
remote code, copied proprietary assets or fixtures containing private data.
Selector changes need small DOM fixtures and a note on which live layouts
were actually verified. Avoid claiming universal social-site compatibility.

Release maintainers should update package and manifest versions together,
verify CI, publish the tested ZIP plus SHA256SUMS, and verify remote assets.
Do not submit to browser stores without an explicit release decision.
