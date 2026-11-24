# Warhammer 40K Reminders

Standalone Warhammer 40,000 reminder companion. Source import and verification are in progress.

## 11th-edition Necron datasheet import

`data/necrons-11e-datasheets.json` is the checked normalized input (52 records from the existing source-linked registry, not a newly verified official download). Update the input only after checking source revisions and errata. `npm run import:datasheets` validates the snapshot and atomically regenerates `src/datasheets-2026.generated.ts`, which the existing roster engine consumes. `npm run check:datasheets` fails if generated output differs; it runs before `npm test`. Invalid, missing or incomplete input does not replace the last good generated file. The snapshot marks its sources as mixed and unreconciled. Raw source extraction and import of abilities, wargear, attachments and detachments are still outstanding.

### Wahapedia export adapter

Run `npm run import:wahapedia -- /tmp/necron-review` to fetch the published 11e relational CSV tables, or append `--from-dir /path/to/export` to use a downloaded snapshot. Powered by [Wahapedia data export](https://wahapedia.ru/wh40k11ed/the-rules/data-export/). The adapter checks a stable export revision, hashes raw inputs, joins source IDs, model costs, abilities, keywords, loadout options, weapons, attachments and detachment records, and emits a normalized candidate plus review JSON. Review and compare the candidate before replacing the checked-in snapshot; no source text or unverified rules are automatically published. Unrecognized prices or missing source data stop the import rather than guessing. CSV schema cross-checked against the MIT-licensed [depot 11e consumer](https://github.com/fjlaubscher/depot). Live CSV access was unavailable during development; fixture tests are not evidence of a successful full export.
