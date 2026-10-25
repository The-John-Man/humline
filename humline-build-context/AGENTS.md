# Humline implementation guidance

- User intent: build the five-feature musical MVP and make it demo-ready. This folder is the pre-build context package.
- Preserve the real user-audio -> detected-note -> edit -> playback -> MIDI chain.
- Use one canonical note model in beats for editor, playback, persistence, and export.
- Keep pitch detection and note segmentation separate so either can be tested or replaced.
- Never place third-party service credentials in browser code or archives.
- Do not add account requirements, a backend, autonomous agents, social features, or subscriptions to the MVP.
- Make any detector uncertainty visible without pretending clarity is a calibrated probability.
- Keep generated example audio explicitly labelled synthetic. Do not claim it is a person humming.
- Test exported MIDI by parsing it back and comparing it to the edited project.
- Use deterministic tests for audio fixtures and editing rules; validate human recordings separately.
- Prefer a few solid milestones over expanding the feature list. See docs/06_PLAN.md.
- Preserve repository history. The context package does not include Git credentials or a clone.
