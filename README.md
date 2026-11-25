# Warhammer 40K Reminders

Standalone Warhammer 40,000 reminder companion. Source import and verification are in progress.

## 11th-edition Necron datasheet import

The roster uses the checked snapshot in `data/necrons-11e-datasheets.json`. After reviewing source changes, run `npm run import:datasheets` to regenerate the TypeScript registry. The test suite first checks that the registry agrees with the snapshot.

### Wahapedia export adapter

Run `npm run import:wahapedia -- /tmp/necron-review` to download the 11th-edition tables. Append `--from-dir /path/to/export` to read a local snapshot. The adapter checks the export revision before and after downloading, hashes its inputs, and joins the faction's datasheets, model composition, pricing brackets, keywords, weapon options, attachments and matched-play detachment data. It writes a roster candidate and a separate rules review file. [Wahapedia export](https://wahapedia.ru/wh40k11ed/Last_update.csv)

Run `npm run check:necron-mfm -- /tmp/necron-review` to compare those files with a pinned, independently maintained scrape of the October 14 Munitorum Field Manual v1.6. Supply the snapshot YAML as a second argument to check it offline. The November 23 export matched all 52 current units, 98 price entries, 31 attachment pairs, 12 detachment budgets and force dispositions, and 42 enhancement or upgrade prices. The checker reports discrepancies before a refreshed candidate is promoted. Individual wargear choices, targeting, timing and reminder behavior require their own source checks and tests. [MFM snapshot](https://github.com/richardsolomou/wh40k-11e-mfm/blob/6eed7b100ae508c1faa76a42bf7b55ecabb59107/data/necrons.yaml)
