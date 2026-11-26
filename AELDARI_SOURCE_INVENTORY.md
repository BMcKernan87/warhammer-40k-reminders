# Aeldari source inventory

This implementation replaces the four-unit starter catalog with the current matched-play Aeldari roster. It does not close the project’s all-faction source audit.

## Reviewed inputs

| Input | Revision and use |
| --- | --- |
| [Publisher Aeldari Faction Pack](https://assets.warhammer-community.com/eng_14-10_wh40k_-faction_pack_aeldari-seqmcs1mu0-g8gzewikcm.pdf) | Version 1.4, legal from 14 October 2026. Reviewed the current errata, new Exodites/Corsairs, Imperial Armour and FAQ changes. This is a supplement to the Codex, not a complete reproduction of every current card. |
| [Current Aeldari faction index](https://wahapedia.ru/wh40k11ed/factions/aeldari/) and [CSV revision](https://wahapedia.ru/wh40k11ed/Last_update.csv) | Export updated 23 November 2026 at 01:43:36. Source `000000186` contributes 74 matched-play cards; source `000000367` contributes the two current MFM Titans. Legends are excluded. |
| [Munitorum Field Manual](https://mfm.warhammer-community.com/en/aeldari) | Version 1.6, first seen 14 October 2026, independently extracted YAML used by the native and detachment generators. Current core 19.01 FAQ explicitly gives current MFM attachment eligibility precedence where older printed datasheets differ. |
| [Independent relational data](https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core) | Pinned commit `fd1035a4e2ac7330835010e660bdd7216bfa3fd9`; current Aeldari unit records identify 11th edition and 14 October 2026. Used to cross-check physical model profiles, compositions, equipment and every weapon statistic and keyword. |

## Complete faction coverage

| Implemented content | Count |
| --- | ---: |
| Matched-play datasheets | 76 |
| Legal starting strengths | 166 |
| Detachments | 15 |
| Detachment abilities | 17 |
| Stratagems | 78 |
| Enhancements and unit upgrades | 52 |
| Named intrinsic entries | 159 |
| Native core-rule entries | 81 |
| Complete weapon profiles | 364 |

The roster includes 19 Leader and five Support entries. Optional Guardian Support Artillery has its own joining slot; it does not consume the mandatory Support slot or become a mandatory attachment. Thirteen datasheets have later-copy price tables. The Wraithknight pays for each actual heavy wraithcannon.

## Intrinsic and profile coverage

The generated inventory contains **76 datasheets, 159 named intrinsic entries, 81 native core-rule entries and 364 full weapon profiles**. The inventory records each source URL and a SHA-256 of its ability record. Runtime reminders are explicitly implemented by trigger and actual source; raw source paragraphs are not used as generic fallback reminders.

The 159 entries include rules delegated to the native core, army, muster and transport modules. The explicit delegation map names these responsibilities, including Fleet of Foot, Aspect Training, Support Artillery, travelling-player limits, Ynnari army restrictions, actual bearer saves and transport re-embarkation. Tests exercise every named source entry with appropriate formation and equipment variants, then separately check the consequential timing and targeting cases.

## Reconciliations retained in code

- **Three inherited weapon revision labels:** current independent unit cards still reference Chainsabres, the Fire Axe and Kha-vir weapon records labelled `pre-launch-provisional`. Their full profiles exactly agree with the current CSV. The relational adapter checks those exact IDs, old labels, profile names, characteristics and keywords before allowing the records. The profile importer independently checks every resulting statistic and keyword again. These three labels are an explicit source limitation; they are not represented as newly published October weapon records.
- **Conditional weapon rules:** the Leystalker’s Long Rifle has Devastating Wounds only against targets with neither Monster nor Vehicle; Stonesinger’s Song of Waning has Anti-Monster 3+ and Anti-Vehicle 3+, while Venomcrest Spit has Anti against targets with neither keyword. The publisher’s Exodite cards directly confirm these conditions. The reminders keep these conditions in both normal and permitted snap shooting.
- **Conditional saves:** Rangers, Shroud Runners and both Titans have their stated invulnerable saves only against ranged attacks. Howling Banshees use 5+ against ranged and 4+ against melee. Ynnari Wyches use 6+ against ranged and 4+ against melee. Personal shimmershields, mistshields, forceshields and scattershields remain on their actual bearers. A Storm Guardian serpent shield protects its current formation only while its actual platform source remains.
- **Ynnari are distinct cards:** Ynnari Archon’s Shadow Field fails after a failed invulnerable save; it does not inherit the current Drukhari Archon’s non-mortal-wound trigger. Ynnari Reavers fly over enemies only after Normal moves, and their grav-talon grants Lance. Ynnari Raider’s Aethersails adds a fixed 6-inch Advance. Their native rules are not substituted with Power from Pain abilities.
- **Leader and Support lifetime:** original leading benefits survive destruction of the original Bodyguard under current core rules, while destroyed ability sources stop supplying ongoing benefits. Already applied Doom, Guide, Misfortune, Spirit Mark, targeting and movement debuffs retain their printed durations. Fuegan’s first-destruction return remains visible after all live units are removed from a survivor snapshot.
- **Current timing corrections:** Asurmen’s once-per-battle weapon change can trigger when selected to shoot, including permitted Overwatch. Baharroth’s shorter arrival is confined to the owner’s Movement phase and prohibits charging that turn. The Yncarne relocates once in each opponent’s turn, including the first, and cannot elect to regain fewer wounds than its Ethereal Form roll allows. Swooping Hawks use actual Hawks for grenade dice, cap the mortal wounds at six and then lose access to Explosives for that turn.
- **Physical source restrictions:** Aspect Shrine tokens exclude all Character models; Farseer’s Branching Fates and Yvraine’s restoration exclude Support Weapon models. Guardian crew rules cannot be sustained by attached Characters. Firing Deck uses actual embarked model weapon inventories, excludes One Shot weapons, and never imports passenger abilities or gear from the other half of a split unit.
- **Printed names:** current `Vypers` reconciles to MFM/independent `Vyper`; Eldrad’s staff, Fuegan’s axe and Yvraine’s sword have explicitly checked spelling/title aliases. Named-rule matching does not rely on guessed faction keyword aliases.
- **MFM attachment precedence:** the current MFM lists Guardian Defenders and Storm Guardians for Farseer/Eldrad, while older publisher errata also lists Warlock Conclave. The implementation uses the MFM lists. It preserves the MFM’s Farseer Skyrunner → Warlock Skyrunners/Windriders relation despite the current CSV listing only Windriders. A Warlock Skyrunners Support still requires its own eligible Bodyguard; when the Skyrunner Leader joins that Support within Windriders, they share one formation with only one Leader and one Support slot. The discrepant source records are guarded rather than silently rewritten.
- **Exact transport permissions:** the Wave Serpent has 12 Asuryani Infantry spaces, while the Falcon has six Aeldari Infantry spaces. Every actual model must qualify; Wraith Constructs use two spaces. The Wave Serpent’s Ynnari exclusion exception does not independently grant Asuryani to Yvraine or The Visarch. Guardian Support Artillery prevents its joined formation from embarking. Ynnari Venom splits include attached models and assign equipment to one physical half only.
- **Equipment corrections:** printed Dire Avenger Exarch alternatives permit six weapon combinations; the independent flattened options also admitted invalid combinations. The Phantom Titan’s two arms and shoulder mount permit 20 complete combinations, including choices omitted by the independent flattened data. Leystalker retains its printed Hunting Blades. All corrections are source-guarded and tested. An actually selected Ynnari phantasm grenade launcher grants its unit Grenades and enables the corresponding core Explosives reminder; removing it removes that eligibility.
- **Distinct Mistweave choices:** Ghosts of the Webway and Fateful Performance can coexist. Their Mistweave enhancements have different prices and attachment conditions, so saved selections always include the detachment name. Their shared base name still enforces the one-copy limit.
- **Current Battle Focus:** all six Agile Manoeuvres use their current triggers. Guardian Defenders retain their free, independently repeatable Fade Back exception. Spirit Guides is conditional on a surviving nearby actual Asuryani Psyker. Sudden Strike and Flitting Shadows cover opponent-turn charges; Opportunity Seized also covers reactive Fall Back moves in Shooting and Fight phases. Phoenix Gem, Staged Death and Fuegan follow the current rule to rejoin their original Attached unit when possible; no independent-unit exception is imported from another faction.

## Reproduction

All five generators are deterministic and their outputs were compared byte-for-byte:

```sh
node scripts/import-aeldari.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DATA_DIR src/aeldari-native.generated.ts
node scripts/import-aeldari-loadouts.mjs CSV_DIR MFM_DIRECTORY RELATIONAL_DATA_DIR src/aeldari-loadouts.generated.ts
node scripts/import-aeldari-detachments.mjs CSV_DIR MFM_DIRECTORY/aeldari.yaml PUBLISHER_PACK_TEXT src/aeldari-detachments.generated.ts
node scripts/import-aeldari-intrinsic.mjs CSV_DIR src/aeldari-intrinsic.generated.ts
node scripts/import-aeldari-profiles.mjs CSV_DIR RELATIONAL_DATA_DIR src/aeldari-card-profiles.generated.ts
```

The profile importer requires `RELATIONAL_DATA_DIR/aeldari/{units,weapons}.json` and the native relational adapter. The native and detachment generators separately reconcile legal sizes, points, attachments, actual model equipment and detachment selection. Full release acceptance additionally requires the production build, all-faction regression suite, browser tests, printable-sheet review, exact-commit CI and public deployment verification.
