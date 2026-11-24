# Warhammer 40K Reminders

Standalone Warhammer 40,000 reminder companion. Source import and verification are in progress.

## 11th-edition Necron datasheet import

`data/necrons-11e-datasheets.json` is the checked normalized input (52 records from the existing source-linked registry, not a newly verified official download). Update the input only after checking source revisions and errata. `npm run import:datasheets` validates the snapshot and atomically regenerates `src/datasheets-2026.generated.ts`, which the existing roster engine consumes. `npm run check:datasheets` fails if generated output differs; it runs before `npm test`. Invalid, missing or incomplete input does not replace the last good generated file. The snapshot marks its sources as mixed and unreconciled. Raw source extraction and import of abilities, wargear, attachments and detachments are still outstanding.
