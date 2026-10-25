# Third-party notices and asset provenance

Runtime dependencies are installed by npm and pinned in `app/package-lock.json`:

| Package | Version tested | License | Use |
|---|---|---|---|
| React / React DOM | 19.3.1 | MIT | UI |
| Pitchy | 4.1.0 | MIT | Local monophonic frequency/clarity detection |
| @tonejs/midi | 2.0.28 | MIT | MIDI writing and parse-back tests |
| lucide-react | 1.61.0 | ISC | Interface icons |

Their transitive dependencies and license notices remain available in the installed packages. Tooling includes TypeScript, Vite, Vitest, Playwright, Prettier, and axe-core via @axe-core/playwright; axe-core is MPL-2.0. No third-party samples, fonts, trained model weights, or commercial recordings are bundled.

The WAV example and test signals are the original, algorithmically generated synthetic fixtures in the supplied Humline build context. They are not human voices. The application favicon and visual layout were created for this implementation.
