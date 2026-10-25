# Humline — build context v1

**Status: specification and implementation handoff, not a runnable application.**
Prepared October 23, 2026. Target demo: Sunday, October 25, 2026, America/Toronto. The exact submission hour is unknown.

Humline turns a short hummed melody into editable notes, lets the user hear those notes as instruments, and exports a real MIDI file.

## Start here

Give a coding agent this entire folder and the instructions in [BUILD_PROMPT.md](BUILD_PROMPT.md). A human developer should read that file, then the product, architecture, and audio documents. All paths in this package are relative and portable.

The user explicitly requested recording, hum-to-notes conversion, an editable piano roll, instrument playback, MIDI export, and a polished demo. They asked for a ZIP containing the context and plan before implementation. This package fulfils that preparatory step. It contains no completed app, dependency lockfile, deployed URL, or verified transcription results.

## Contents

- [Context and repository state](docs/01_CONTEXT.md)
- [MVP product specification](docs/02_PRODUCT.md)
- [Architecture and data contract](docs/03_ARCHITECTURE.md)
- [Audio conversion and MIDI details](docs/04_AUDIO.md)
- [Visual design and interaction brief](docs/05_DESIGN.md)
- [Build sequence and effort budget](docs/06_PLAN.md)
- [Acceptance tests and release gates](docs/07_ACCEPTANCE.md)
- [Demo script and fallback procedure](docs/08_DEMO.md)
- [Risks, production path, and sponsor fit](docs/09_DECISIONS.md)
- [Primary-source references](docs/10_SOURCES.md)
- reference/: proposed TypeScript interfaces and CSS tokens, not implementation.
- fixtures/: original synthetic WAV fixtures, expected notes, and an editable project example.
- scripts/: dependency-free fixture generation and package verification.
- MANIFEST.json: file sizes and SHA-256 hashes for archive integrity.

Run the package checker with Node 22 or newer:

~~~sh
node scripts/verify-package.mjs
~~~

This verifies package integrity and fixture structure, not the future app. No secrets, account credentials, user recordings, node_modules, or Git history are included.
