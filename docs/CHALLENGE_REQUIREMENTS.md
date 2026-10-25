# Challenge requirements and Humline alignment

Source: challenge text pasted by the user in this chat on October 24, 2026. This is a faithful summary for project context, not independently verified event rules. No official event URL, deadline, or additional eligibility conditions were supplied.

## Core requirements

Build toward a real problem for a real user using suitable tools. An app, agent, browser extension, hardware project, or another form is acceptable.

Be able to explain:

1. **Specific user:** a real person, team, or workflow, rather than a broad demographic.
2. **Plain value:** what gets better because the project exists.
3. **Credible production path:** how the project could continue beyond Demo Day. A business plan is not required.

## Technology and sponsor categories

The supplied text explicitly says none of the sponsor platforms is mandatory and Best Overall is open regardless of stack. For a sponsor category, the platform must play a genuine role and materially shape the project.

| Category | Platform use described by the user |
|---|---|
| Best Use of Expo | Mobile apps built with Expo React Native tooling, using the SDK and Build or Update as appropriate |
| Best Use of Clerk | Authentication, user profiles, or sessions implemented with Clerk; sign-up, sign-in, MFA, and social login qualify |
| Best Use of Eon | AI agents tested and benchmarked with Era by Eon; early access supplied at kickoff |
| Best Use of SurrealDB Agent Memory | Agents that need memory use SurrealDB Agent Memory |

Do not invent a requirement to add agents, mobile tooling, or all four sponsors. Prize eligibility and judging outcomes are not guaranteed by an integration alone.

## Humline application

Current value statement: “Turn a hummed melody into editable MIDI for your music software without entering every note manually.”

Proposed specific user profile: a songwriter who captures ideas by humming and finds manual MIDI entry difficult. **An actual user has not yet been identified or interviewed in the recorded context.** Do not claim user validation or quote invented feedback.

The existing browser studio fits a stack-independent submission. Its current transcription algorithm is signal processing, not an autonomous AI agent. Responsive browser layouts do not make it an Expo app.

Clerk authentication and a private cloud melody library are implemented on `codex/clerk-library`. Value: save an edited melody under an account and resume it on another device. Demonstrate with real sign-in, cross-device save/reopen, account management, and verified cross-user isolation once a Clerk development instance is configured (`npm run test:clerk` plus manual checks).

Production evidence still needed includes real-user testing, human-hum quality, physical microphone/output and DAW checks, and a chosen hosted deployment. See [handoff](HANDOFF.md) and [cloud setup](CLOUD_SETUP.md).
