# Context and repository state

## Accepted direction

The user is entering a hackathon, wants a creative but feasible app by Sunday, and chose Humline after exploring alternatives. They do not want development to depend on interviewing people or arranging meetings. Students are only potential testers, not the target market restriction.

Humline's target user is a beginner songwriter or hobby musician who can hum a musical idea but struggles to turn a voice memo into editable music. Value: capture an idea, correct it visually, hear it with an instrument, and export it to other music tools.

Required features are recording, hum-to-notes conversion, piano-roll editing, instrument playback, MIDI export, and visual polish. The latest request explicitly asks for a context ZIP and plan first. Building the application follows this handoff; it has not happened in this package.

## Repository facts

- Private repository: https://github.com/The-John-Man/humline
- Owner: The-John-Man
- Default branch seen at creation: main
- Confirmed in the preceding setup turn: initial GitHub commit with a short README.
- Local folder inspected for this package: outputs/humline contains README.md and an initialised .git directory pointing to that remote.
- Local README is untracked; this local directory is not a clone of the remote history.
- GitHub CLI was not authenticated during repository setup. The connected GitHub tool could not read the newly created private repo, although browser creation succeeded. Do not assume either issue remains unchanged; check at implementation time.
- Repository creation did not establish an application stack, license, hosting, or team membership.

When connecting local work, authenticate through supported mechanisms and fetch/clone the existing repository before committing. Never force-push a new root history to work around missing access. Authentication is only needed for repository operations, not local MVP development.

## Assumptions, not user mandates

Browser app first; desktop Chrome/Edge primary; responsive smaller screens; one melody; 20-second recordings; local processing; three instrument presets. These defaults reduce weekend risk. The exact deadline hour and team size remain unknown. Plan effort conservatively and keep a demo buffer.
