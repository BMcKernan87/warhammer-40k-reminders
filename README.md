# Warhammer 40K Reminders

Standalone Warhammer 40,000 reminder companion. Source import and verification are in progress.

## 11th-edition Necron datasheet import

The roster uses the checked snapshot in `data/necrons-11e-datasheets.json`. After reviewing source changes, run `npm run import:datasheets` to regenerate the TypeScript registry. The test suite first checks that the registry agrees with the snapshot.

### Wahapedia export adapter

Run `npm run import:wahapedia -- /tmp/necron-review` to download the 11th-edition tables. Append `--from-dir /path/to/export` to read a local snapshot. The adapter checks the export revision before and after downloading, hashes its inputs, and joins the faction's datasheets, model composition, pricing brackets, keywords, weapon options, attachments and matched-play detachment data. It writes a roster candidate and a separate rules review file. [Wahapedia export](https://wahapedia.ru/wh40k11ed/Last_update.csv)

Run `npm run check:necron-mfm -- /tmp/necron-review` to compare those files with a pinned, independently maintained scrape of the October 14 Munitorum Field Manual v1.6. Supply the snapshot YAML as a second argument to check it offline. The November 23 export matched all 52 current units, 98 price entries, 31 attachment pairs, 12 detachment budgets and force dispositions, and 42 enhancement or upgrade prices. The checker reports discrepancies before a refreshed candidate is promoted. Individual wargear choices, targeting, timing and reminder behavior require their own source checks and tests. [MFM snapshot](https://github.com/richardsolomou/wh40k-11e-mfm/blob/6eed7b100ae508c1faa76a42bf7b55ecabb59107/data/necrons.yaml)

The current [Necrons Faction Pack v1.3, legal from 30 September 2026](https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf) prints **Skyshroud Spearhead** on page 3. The earlier internal `Skysword Spearhead` key is a saved-data alias only; migration keeps roster IDs, equipment, attachments and upgrade selections and coalesces that alias with the canonical name. Page 4 prints **Prelocational Optimiser**, which remains the canonical upgrade name despite the secondary export's `Relocational Optimiser` label. Necron upgrade citations now use this September supplement instead of the superseded June URL. These name and citation checks do not certify every Codex rule or point value: the pack supplements the Codex with seven detachments, eight new datasheets and one Imperial Armour datasheet, and direct access to the current official MFM remains unavailable (HTTP 403).

### Attack windows and surviving formations

The [current core rules](https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf) place Fire Overwatch at the end of the opponent's Movement phase (15.08), allow ranged attacks only with ranged weapons (04.01.01), and define attached ability lifetimes in 19.04. The focused regressions check Movement attack and defence reminders, reject Charge-phase Overwatch, and exclude offensive Shooting prompts for formations without a surviving ranged weapon. They also distinguish a surviving source's unit-wide effect from a destroyed model's personal equipment or save.

[Cryptothralls](https://wahapedia.ru/wh40k11ed/factions/necrons/Cryptothralls) and [Tomb Crawlers](https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Tomb-Crawlers) join the original Bodyguard until the battle ends. Formation checks therefore validate the original roster links before filtering casualties. They preserve surviving Leader/Support and retinue membership, retain the relevant Bodyguard ability source while retinue models survive, and reject originally illegal joins even if later losses remove the conflict. Browser regressions reopen both spellings of a saved Skyshroud army and check its separate squads, physical equipment, attachments, upgrades and all eleven printed phase sections.
