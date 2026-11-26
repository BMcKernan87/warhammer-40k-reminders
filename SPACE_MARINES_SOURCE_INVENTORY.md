# Space Marines — current source inventory and implementation audit

Reviewed 25 November 2026 (America/Denver). This batch implements the current matched-play **Codex Space Marines range, its six core Chapters, the two current Forge World cards, and Deathwatch, including Black Spear Task Force and conditional Deathwatch Support**. The separate Blood Angels, Dark Angels, Black Templars and Space Wolves ranges remain outside this batch.

## Revision and authority

| Source | Revision used | Purpose |
| --- | --- | --- |
| [Space Marines Printed Product Updates](https://assets.warhammer-community.com/eng_14-10_wh40k_printed_product_updates_space_marines_updates-91hillwcff-wzs8qnozam.pdf) | Version 1.1, 14 October 2026 | Primary publisher corrections: Titus’s Righteous Fury; Feirros/Techmarine’s friendly Astartes Vehicle condition; Shrike’s Character/Epic Hero tags; Terminator Librarian’s Character tag. |
| [Space Marines rules — First look](https://www.warhammer-community.com/en-gb/articles/ifgezlgu/space-marines-rules-first-look/) | 10 September 2026 | Primary publisher confirmation of all three new Combat Doctrines, Captain selections independent of the army selection, normal replacement, and simultaneous-doctrine exceptions. Oath of Moment is not the current army rule. |
| [Current Space Marines faction and Books table](https://wahapedia.ru/wh40k11ed/factions/space-marines/) | App-backed 11th edition, app 2.8.1, October 2026 | Current public datasheet, army, Chapter and detachment transcription. The chapter selector also exposes content outside this batch, so explicit source filtering is essential. |
| Wahapedia CSV export | `Last_update.csv`: `2026-11-23 01:43:36` | Structured current unit, ability, profile, equipment, keyword and attachment inputs. The generators retain a source URL for each card and a SHA-256 for every named ability row. |
| [Current Space Marines Munitorum Field Manual](https://mfm.warhammer-community.com/en/space-marines) and [Deathwatch MFM](https://mfm.warhammer-community.com/en/deathwatch) | 1.6; first seen 14 October 2026 | Current matched-play membership, legal strengths, composition-sensitive prices and paid equipment. In particular, Astraeus and Thunderhawk remain current despite incomplete edition metadata in their CSV source record. |
| [Independent relational extraction](https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core/adeptus-astartes) | Commit `fd1035a4e2ac7330835010e660bdd7216bfa3fd9`; audited current records labelled `11th` / `2026-10-14` | Independent unit/composition/weapon/wargear cross-check. All relevant physical records are consolidated in `adeptus-astartes`, including the Codex Chapter characters and Deathwatch. Exact inherited exceptions are enumerated below. |
| [Current 11th-edition Core Rules](https://wahapedia.ru/wh40k11ed/the-rules/core-rules/) | Current page reviewed 25 November 2026 (America/Denver) | Timing, attached-unit lifetimes, healing, model-specific keywords, psychic powers, Hunter profiles, snap shooting, deployment, saves and transport behavior. |

The obsolete June faction pack is not the authority for this implementation. The current publisher update is a corrections document, not a complete free reproduction of every current datasheet. Full card bodies were reconciled through the current public app-backed transcription and the pinned independent extraction; this work did not obtain an authenticated export of the Warhammer app. The CSV `Source.csv` version fields are blank even though the current Books table identifies app 2.8.1, so the audit records these distinct facts rather than inventing CSV revision metadata.

## Exact included scope

| CSV source ID | Current source | Cards | Named entries | Native core entries | Full weapon profiles |
| --- | --- | ---: | ---: | ---: | ---: |
| `000000139` | Space Marines, including current Codex Chapter characters | 85 | 163 | 122 | 386 |
| `000000362` | Current Space Marines Forge World cards | 2 | 3 | 5 | 15 |
| `000000035` | Deathwatch, subject to the chosen Chapter/Deathwatch Support rules | 10 | 20 | 11 | 110 |
| **Total** | | **97** | **186** | **138** | **511** |

The 186 source entries include two identically named Spectrus Helix Gauntlet rows, one classified Datasheet and one Wargear. They produce one equipped-bearer healing reminder, not two uses. The two enhancement-granted melee profiles are additional to the 511 native weapon profiles: **Imperium’s Sword** (A6/WS2+/S7/AP−3/D3) and **The Thief of Secrets** (A6/WS2+/S6/AP−3/D2). Neither replaces a native weapon.

The native roster generator covers 199 legal model counts, including intermediate strengths charged at the next printed points bracket, and actual mixed model compositions. Root integration and the detachment module cover 23 selected detachments, 23 traits, 94 Stratagems and 61 upgrades. Those are separately implemented rules; this intrinsic inventory does not render source paragraphs as an automatic substitute for executable semantics.

Explicitly excluded CSV sources are Space Marines Legends `000000356` (28 cards); Kill Team Cassius / Imperial Agents Legends `000000363` (one card); Blood Angels `000000021` (14); Dark Angels `000000023` (16); Black Templars `000000162` (15); Space Wolves `000000036` (21); and the source-less Example Wargear entry. The Forge World source’s edition field is `0`; it is included only through the two exact names, current MFM presence and current independent 11th-edition records. Black Templars’ duplicate chassis entries are not mistaken for the base Codex chassis.

## Source differences and exact guards

The importers fail when these expected inputs change. They do not silently accept arbitrary legacy rows or substitute an older edition.

| Issue | Evidence and implemented resolution |
| --- | --- |
| Five inherited provisional weapon records | `multi-melta-indomitor-kill-team`, `melta-rifle-indomitor-kill-team`, `fragstorm-grenade-launcher-impulsor`, `storm-bolter-impulsor`, and `fragstorm-grenade-launcher-storm-speeder-hailstrike` retain `pre-launch-provisional` labels. Their exact full profiles are checked against the current cards before the adapter accepts them. The original stale labels are acknowledged here rather than represented as a new independent publication. |
| Missing Indomitor Hunter target restriction | The current [Indomitor card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Indomitor-Kill-Team) explicitly restricts its Melta Rifle and Multi-melta Hunter modes to Monster/Vehicle targets. The CSV profile descriptions omit these restrictions. The exact independent profiles are guarded and the restriction is retained in generated data and rendered profiles. Chainfist and ordinary Eradicator Hunter modes independently carry the same verified restriction. |
| Vanguard plasma profile incomplete in the independent extraction | The independent record contains only the hazardous S8/AP−3/D2 profile. The current [Vanguard Veterans card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Vanguard-Veteran-Squad-With-Jump-Packs) and CSV also contain Standard S7/AP−2/D1. Both modes are emitted after an exact guard on the independent record. |
| Cato Sicarius’s sword differs in the independent extraction | Current [Cato card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Cato-Sicarius) and CSV agree: Strike A4/S6/AP−3/D3; Coup de Grace A6/S5/AP−2/D2; Sweep A9/S5/AP−2/D1 with unrestricted Sustained Hits 1. Exact independent A5/A7/S6 and Infantry-restricted Sweep inputs are guarded before applying these current values. |
| Four invulnerable-save extraction differences | Current CSV has no native invulnerable save for Ballistus, Brutalis or Redemptor Dreadnought, while the independent records incorrectly contain 4. Calgar’s current card/CSV has 4+, while the independent record is null. The exact pairs are guarded. Current live Ballistus, Redemptor and Calgar cards were directly checked; the Brutalis live URL was unavailable to the web retrieval tool, so its current CSV value is the explicit limitation in that check. No unrelated save discrepancy is ignored. |
| Talonstrike Hand Flamer BS | The current [Talonstrike card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Talonstrike-Kill-Team) and CSV print BS7+; the independent record uses `-`. The exact exception retains the printed 7+, while Torrent still automatically hits. |
| Singular printed weapons inside plural independent parent names | Exact name/profile guards normalize `ironhail-heavy-stubber`, `storm-bolter-astraeus`, `storm-bolter-deathwatch-terminator-squad` and `fragstorm-grenade-launcher` to their actual singular printed equipment names. No weapon profile row is discarded. |
| Model aliases | Dainal Komelius is the inherited typo for printed Dainal Kornelius. Vanguard Sergeant/Veteran names are normalized to the current names ending “with Jump Pack.” Composition `profile_name` resolves Talonstrike Sergeant and mixed Decimus roles without inventing extra models. |
| Reiver unit equipment | Both Grav-chutes and Grapnel Launchers are optional equipment on the unit, not on an invented individual bearer. The independent composition’s two model-less slots and the current [Reiver card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Reiver-Squad) are guarded; `spaceMarineWeaponCount` exposes the selected unit item while individual model inventories remain unchanged. The native importer separately guards the inherited old Grapnel wargear metadata. |
| Duplicate price rows and optional Victrix models | Identical chapter-view cost rows are normalized by exact price bands. Actual optional Chapter Ancient/Champion model choices determine equipment and personal Epic Hero tags; the Banner of Macragge belongs to the actual Ancient. |
| Thunderhawk equipment | Its current Hellstrike stock is used. The old cluster-bomb weapon exchange is not treated as another current weapon selection; Thunderhawk Cluster Bombs is still its separate current movement-triggered datasheet ability. |
| Cato’s Leader/Support role | The current printed condition requires Calgar in the army. The MFM attachment list is unconditionally populated as Support. Native data preserves the base Leader role, and root resolves the exact Calgar-dependent Support exception. |

## Rules decisions and module ownership

`space-marines-intrinsic.ts` explicitly handles the named unit rules. `space-marines-datasheet-core.ts` handles native core/deployment rules and actual shield equipment. `space-marines-weapons.ts` renders complete actual equipped profiles, including Hunter restrictions, conditional critical effects, additive Extra Attacks and physical enhancement bearers. Company Heroes’ enhancement weapon belongs to its Ancient, its actual Character model; the Champion and veterans do not inherit it. The two enhancement grants are joined by stable source IDs, avoiding the ASCII/curly apostrophe difference in Imperium’s Sword.

The intrinsic module owns Strategic Acumen, Demi-company Commander, Codex Adept, Master Tactician and Author of the Codex, including already applied effects after source loss. It also owns conditional reminders for Caanok Var’s chosen Scouts recipient and Calgar’s chosen Deep Strike recipient. It never silently grants those abilities to every eligible unit. The native deployment helpers combine actual native, equipped and selected-enhancement grants; manually chosen recipients remain conditional battle reminders.

Root owns general Combat Doctrines and their army selection allowance, Transhuman Strategist, Librarius budgets, muster/Chapter restrictions, Cato’s role and Guilliman’s Warlord requirement. Root also owns all transport abilities: Drop Pod Assault/Deployment Complete, Assault Ramp, Rapid Disembarkation, Combat Embarkation and Aerial Assault. These exact names are explicitly delegated in the named inventory. Ordinary psyker-level marker entries are delegated to the Librarius budget implementation; the individual psychic powers are implemented by the intrinsic module.

The following interactions are deliberate:

- **Source lifetime:** Core 19.04 distinguishes personal model abilities, source-unit abilities and duration-based effects. Surviving original Leaders/Supports retain their own qualifying benefits after the Bodyguard is destroyed. A destroyed source stops conferring a continuous benefit after the attacking unit finishes; an already applied duration-based effect retains its expiry.
- **Duration:** Core 01.02.02’s default is the specified period or granting phase, not an invented full turn. Scanned/detected enemies, Driven from Cover, Hailstrike, Shattered Defences, Signum Array, Forgefather and the corresponding psychic effects expire at their actual phase boundary unless the printed rule specifies longer.
- **Healing:** Core 02.02.04 unit healing can revive destroyed non-Character models one wound at a time after all survivors are healed. Personal model healing cannot revive another model. Artemis’s actual resurrection follows Core 01.02.03 and retains original attachment and Starting Strength.
- **Snap shooting:** No Hit re-rolls, Hit modifiers or Critical Hits. Wound/Damage re-rolls and qualifying Critical Wounds remain available. Own-Shooting-phase-only activations do not trigger in Overwatch or reactive opponent-phase fire. Selected Medusa’s Wrath, Forgefather’s Seekers and Devastator Brethren add the appropriate actual weapon profiles for their reactive shooting rules, with normal/snap conditions stated explicitly.
- **All-model abilities:** Fights First, Lone Operative, Stealth and deployment requirements use the current all-model rules. An enhancement on one Character does not automatically grant these to its Bodyguard. Judiciar and Shrike explicitly grant their stated unit benefits.
- **Black Spear allies:** The restriction requires both AGENTS OF THE IMPERIUM and DEATHWATCH on the actual unit. Current assigned-agent cards use ORDO XENOS without DEATHWATCH; neither a Deathwatch-related name nor ORDO XENOS is silently substituted for the missing keyword.
- **Mixed models and keywords:** Native physical roles and surviving model keywords determine Character, Epic Hero, Infantry, Gravis, Phobos and Tacticus conditions. A unit’s keyword union does not copy a model keyword onto every member. No current source grants DEATHWATCH to a generic attached Captain or Support model; a strict DEATHWATCH-model transport condition therefore remains unsatisfied by such a model unless a specific rule supplies an exception.
- **Chapter-scoped Veteran Recruits:** Its application to a Deathwatch host army, rather than a non-Deathwatch host merely using Deathwatch Support, is an explicit interpretation of the chapter-scoped rule. Deathwatch Support supplies its own restrictions. Root records the Chapter distinction rather than globally banning generic Scouts/Terminators whenever any Deathwatch support is present.
- **Firing Deck:** Enumerates actual physical passenger weapons, excludes One Shot choices and imports neither passenger abilities nor enhancements/personal bearer bonuses. Potential transport eligibility does not assert that a unit is actually embarked.
- **Saves:** Judiciar’s 4+ is melee only; Astraeus’s 5+ is ranged only. Wardens’ Gaius Silva and Metaurus keep distinct personal saves. Relic Shields and Terminator Storm Shields grant a personal extra wound; Lieutenant/Deathwatch Veteran shields and Vanguard Combat Shields grant their actual personal save.

There is no dice engine, gameplay mode or additional manual eligibility checklist. Battlefield choices, ranges, casualties, actual cargo and once-per-battle expenditure remain explicit conditions in the relevant reminder. This avoids fabricating state the roster does not record.

## Verification

- All 97 card names match the included inventory; all 186 named source rows have an explicit executable implementation or named module delegation.
- All 511 native weapon profiles reconcile range, Attacks, BS/WS, Strength, AP, Damage, abilities and Hunter restrictions against the pinned independent records, except the enumerated exact current-card corrections.
- Both intrinsic and profile generators reproduce the checked-in outputs byte for byte from the pinned inputs.
- The weapon adapter reads all 680 independent weapon records. Deliberately changing an attack value in each of five guarded exception families causes rejection; Hunter restriction reconciliation also passed.
- `tests/space-marines-intrinsic.test.ts`: 125 tests pass, including all-card named coverage, concrete source-loss/expiry interactions, original attachment survival, actual optional equipment, complete weapon text, Hunter eligibility, reactive shooting and personal enhancement bearers.
- Occupied Drop Pods use the minimum-cost complete assignment of distinct whole formations across all native Dedicated Transports. Unavoidable reserve costs include attached models, paid equipment, enhancements and later-copy prices. An impossible Incursion roster with two Pods and two full Hellblaster formations correctly requires 670 reserve points against its 500-point allowance. The calculation does not choose cargo for the player.
- Damaged penalties cover permitted normal reactive shooting in either turn; snap shooting explicitly ignores those Hit-roll modifiers.
- Seven complete army fixtures cover Ultramarines and Deathwatch at exactly 2,000 points, and Iron Hands, Raven Guard, Imperial Fists, White Scars and Salamanders with Deathwatch Support at exactly 1,000 points. Each checks individual costs, actual equipment, attachments, upgrades and save/reopen behavior.

## Per-card inventory

The counts below refer to source entries (including the one duplicated Spectrus name) and native weapon profiles. The generated inventory retains each named entry’s exact source URL and row hash.

| Datasheet | Named entries | Core entries | Weapon profiles |
| --- | ---: | ---: | ---: |
| [Adrax Agatone](https://wahapedia.ru/wh40k11ed/factions/space-marines/Adrax-Agatone) | 2 | 1 | 2 |
| [Aethon Shaan](https://wahapedia.ru/wh40k11ed/factions/space-marines/Aethon-Shaan) | 2 | 3 | 2 |
| [Aggressor Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Aggressor-Squad) | 1 | 0 | 5 |
| [Ancient](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ancient) | 2 | 1 | 5 |
| [Ancient In Terminator Armour](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ancient-In-Terminator-Armour) | 2 | 2 | 2 |
| [Apothecary](https://wahapedia.ru/wh40k11ed/factions/space-marines/Apothecary) | 1 | 1 | 3 |
| [Apothecary Biologis](https://wahapedia.ru/wh40k11ed/factions/space-marines/Apothecary-Biologis) | 1 | 1 | 2 |
| [Assault Intercessor Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Assault-Intercessor-Squad) | 1 | 0 | 8 |
| [Assault Intercessors With Jump Packs](https://wahapedia.ru/wh40k11ed/factions/space-marines/Assault-Intercessors-With-Jump-Packs) | 1 | 1 | 7 |
| [Astraeus](https://wahapedia.ru/wh40k11ed/factions/space-marines/Astraeus) | 1 | 2 | 9 |
| [Ballistus Dreadnought](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ballistus-Dreadnought) | 1 | 2 | 5 |
| [Bladeguard Ancient](https://wahapedia.ru/wh40k11ed/factions/space-marines/Bladeguard-Ancient) | 2 | 1 | 2 |
| [Bladeguard Veteran Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Bladeguard-Veteran-Squad) | 1 | 0 | 5 |
| [Brutalis Dreadnought](https://wahapedia.ru/wh40k11ed/factions/space-marines/Brutalis-Dreadnought-UL) | 1 | 2 | 6 |
| [Caanok Var](https://wahapedia.ru/wh40k11ed/factions/space-marines/Caanok-Var) | 2 | 3 | 2 |
| [Captain](https://wahapedia.ru/wh40k11ed/factions/space-marines/Captain) | 3 | 1 | 7 |
| [Captain In Gravis Armour](https://wahapedia.ru/wh40k11ed/factions/space-marines/Captain-In-Gravis-Armour) | 2 | 1 | 7 |
| [Captain In Phobos Armour](https://wahapedia.ru/wh40k11ed/factions/space-marines/Captain-In-Phobos-Armour) | 2 | 5 | 3 |
| [Captain In Terminator Armour](https://wahapedia.ru/wh40k11ed/factions/space-marines/Captain-In-Terminator-Armour) | 2 | 2 | 6 |
| [Captain on Bike](https://wahapedia.ru/wh40k11ed/factions/space-marines/Captain-on-Bike) | 2 | 1 | 6 |
| [Captain Titus](https://wahapedia.ru/wh40k11ed/factions/space-marines/Captain-Titus) | 3 | 2 | 3 |
| [Captain With Jump Pack](https://wahapedia.ru/wh40k11ed/factions/space-marines/Captain-With-Jump-Pack) | 3 | 2 | 8 |
| [Cato Sicarius](https://wahapedia.ru/wh40k11ed/factions/space-marines/Cato-Sicarius) | 3 | 1 | 4 |
| [Chaplain](https://wahapedia.ru/wh40k11ed/factions/space-marines/Chaplain) | 2 | 1 | 2 |
| [Chaplain In Terminator Armour](https://wahapedia.ru/wh40k11ed/factions/space-marines/Chaplain-In-Terminator-Armour) | 3 | 2 | 2 |
| [Chaplain On Bike](https://wahapedia.ru/wh40k11ed/factions/space-marines/Chaplain-On-Bike) | 2 | 1 | 3 |
| [Chaplain With Jump Pack](https://wahapedia.ru/wh40k11ed/factions/space-marines/Chaplain-With-Jump-Pack) | 2 | 2 | 2 |
| [Chief Librarian Tigurius](https://wahapedia.ru/wh40k11ed/factions/space-marines/Chief-Librarian-Tigurius) | 4 | 1 | 3 |
| [Company Heroes](https://wahapedia.ru/wh40k11ed/factions/space-marines/Company-Heroes) | 2 | 0 | 5 |
| [Corvus Blackstar](https://wahapedia.ru/wh40k11ed/factions/space-marines/Corvus-Blackstar) | 2 | 4 | 6 |
| [Darnath Lysander](https://wahapedia.ru/wh40k11ed/factions/space-marines/Darnath-Lysander) | 2 | 2 | 1 |
| [Deathwatch Terminator Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Deathwatch-Terminator-Squad) | 3 | 1 | 13 |
| [Deathwatch Veterans](https://wahapedia.ru/wh40k11ed/factions/space-marines/Deathwatch-Veterans) | 2 | 0 | 14 |
| [Decimus Kill Team](https://wahapedia.ru/wh40k11ed/factions/space-marines/Decimus-Kill-Team) | 2 | 0 | 18 |
| [Desolation Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Desolation-Squad) | 1 | 0 | 6 |
| [Drop Pod](https://wahapedia.ru/wh40k11ed/factions/space-marines/Drop-Pod) | 2 | 2 | 0 |
| [Eliminator Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Eliminator-Squad) | 2 | 2 | 5 |
| [Eradicator Squad with Heavy Bolters](https://wahapedia.ru/wh40k11ed/factions/space-marines/Eradicator-Squad-with-Heavy-Bolters) | 1 | 0 | 3 |
| [Eradicator Squad with Melta Rifles](https://wahapedia.ru/wh40k11ed/factions/space-marines/Eradicator-Squad-with-Melta-Rifles) | 1 | 0 | 6 |
| [Firestrike Servo-turrets](https://wahapedia.ru/wh40k11ed/factions/space-marines/Firestrike-Servo-turrets) | 1 | 0 | 3 |
| [Fortis Kill Team](https://wahapedia.ru/wh40k11ed/factions/space-marines/Fortis-Kill-Team) | 1 | 0 | 20 |
| [Gladiator Lancer](https://wahapedia.ru/wh40k11ed/factions/space-marines/Gladiator-Lancer) | 1 | 2 | 3 |
| [Gladiator Reaper](https://wahapedia.ru/wh40k11ed/factions/space-marines/Gladiator-Reaper) | 1 | 2 | 3 |
| [Gladiator Valiant](https://wahapedia.ru/wh40k11ed/factions/space-marines/Gladiator-Valiant) | 1 | 2 | 4 |
| [Heavy Intercessor Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Heavy-Intercessor-Squad) | 1 | 0 | 4 |
| [Hellblaster Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Hellblaster-Squad) | 1 | 0 | 6 |
| [Impulsor](https://wahapedia.ru/wh40k11ed/factions/space-marines/Impulsor) | 3 | 2 | 8 |
| [Inceptor Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Inceptor-Squad) | 2 | 1 | 4 |
| [Incursor Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Incursor-Squad) | 2 | 1 | 3 |
| [Indomitor Kill Team](https://wahapedia.ru/wh40k11ed/factions/space-marines/Indomitor-Kill-Team) | 1 | 0 | 13 |
| [Infernus Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Infernus-Squad) | 1 | 0 | 3 |
| [Infiltrator Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Infiltrator-Squad) | 2 | 1 | 3 |
| [Intercessor Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Intercessor-Squad) | 2 | 0 | 13 |
| [Invader ATVs](https://wahapedia.ru/wh40k11ed/factions/space-marines/Invader-ATVs) | 1 | 0 | 5 |
| [Invictor Tactical Warsuit](https://wahapedia.ru/wh40k11ed/factions/space-marines/Invictor-Tactical-Warsuit) | 1 | 3 | 6 |
| [Iron Father Feirros](https://wahapedia.ru/wh40k11ed/factions/space-marines/Iron-Father-Feirros) | 3 | 2 | 4 |
| [Judiciar](https://wahapedia.ru/wh40k11ed/factions/space-marines/Judiciar) | 1 | 2 | 2 |
| [Kaius Konorius](https://wahapedia.ru/wh40k11ed/factions/space-marines/Kaius-Konorius) | 2 | 1 | 3 |
| [Kayvaan Shrike](https://wahapedia.ru/wh40k11ed/factions/space-marines/Kayvaan-Shrike) | 2 | 3 | 2 |
| [Kor’sarro Khan](https://wahapedia.ru/wh40k11ed/factions/space-marines/Kor-sarro-Khan) | 2 | 1 | 3 |
| [Land Raider](https://wahapedia.ru/wh40k11ed/factions/space-marines/Land-Raider) | 2 | 2 | 6 |
| [Land Raider Crusader](https://wahapedia.ru/wh40k11ed/factions/space-marines/Land-Raider-Crusader) | 2 | 2 | 6 |
| [Land Raider Redeemer](https://wahapedia.ru/wh40k11ed/factions/space-marines/Land-Raider-Redeemer) | 2 | 2 | 6 |
| [Land Speeder](https://wahapedia.ru/wh40k11ed/factions/space-marines/Land-Speeder) | 1 | 1 | 5 |
| [Librarian](https://wahapedia.ru/wh40k11ed/factions/space-marines/Librarian) | 4 | 1 | 4 |
| [Librarian In Phobos Armour](https://wahapedia.ru/wh40k11ed/factions/space-marines/Librarian-In-Phobos-Armour) | 4 | 5 | 4 |
| [Librarian In Terminator Armour](https://wahapedia.ru/wh40k11ed/factions/space-marines/Librarian-In-Terminator-Armour) | 4 | 2 | 4 |
| [Lieutenant](https://wahapedia.ru/wh40k11ed/factions/space-marines/Lieutenant) | 3 | 1 | 9 |
| [Lieutenant In Phobos Armour](https://wahapedia.ru/wh40k11ed/factions/space-marines/Lieutenant-In-Phobos-Armour) | 2 | 4 | 3 |
| [Lieutenant with Combi-weapon](https://wahapedia.ru/wh40k11ed/factions/space-marines/Lieutenant-with-Combi-weapon) | 2 | 4 | 3 |
| [Marneus Calgar](https://wahapedia.ru/wh40k11ed/factions/space-marines/Marneus-Calgar) | 3 | 2 | 3 |
| [Outrider Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Outrider-Squad) | 1 | 0 | 7 |
| [Redemptor Dreadnought](https://wahapedia.ru/wh40k11ed/factions/space-marines/Redemptor-Dreadnought) | 1 | 2 | 9 |
| [Reiver Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Reiver-Squad) | 4 | 1 | 3 |
| [Repulsor](https://wahapedia.ru/wh40k11ed/factions/space-marines/Repulsor) | 1 | 2 | 7 |
| [Repulsor Executioner](https://wahapedia.ru/wh40k11ed/factions/space-marines/Repulsor-Executioner) | 1 | 2 | 7 |
| [Rhino](https://wahapedia.ru/wh40k11ed/factions/space-marines/Rhino) | 1 | 2 | 3 |
| [Roboute Guilliman](https://wahapedia.ru/wh40k11ed/factions/space-marines/Roboute-Guilliman) | 5 | 1 | 3 |
| [Scout Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Scout-Squad) | 1 | 2 | 9 |
| [Spectrus Kill Team](https://wahapedia.ru/wh40k11ed/factions/space-marines/Spectrus-Kill-Team) | 3 | 2 | 11 |
| [Sternguard Veteran Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Sternguard-Veteran-Squad) | 1 | 0 | 10 |
| [Storm Speeder Hailstrike](https://wahapedia.ru/wh40k11ed/factions/space-marines/Storm-Speeder-Hailstrike) | 1 | 2 | 4 |
| [Storm Speeder Hammerstrike](https://wahapedia.ru/wh40k11ed/factions/space-marines/Storm-Speeder-Hammerstrike) | 1 | 2 | 4 |
| [Storm Speeder Thunderstrike](https://wahapedia.ru/wh40k11ed/factions/space-marines/Storm-Speeder-Thunderstrike) | 2 | 2 | 4 |
| [Suboden Khan](https://wahapedia.ru/wh40k11ed/factions/space-marines/Suboden-Khan) | 2 | 1 | 4 |
| [Talonstrike Kill Team](https://wahapedia.ru/wh40k11ed/factions/space-marines/Talonstrike-Kill-Team) | 1 | 1 | 11 |
| [Techmarine](https://wahapedia.ru/wh40k11ed/factions/space-marines/Techmarine) | 2 | 1 | 3 |
| [Terminator Assault Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Terminator-Assault-Squad) | 3 | 1 | 2 |
| [Terminator Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Terminator-Squad) | 2 | 1 | 9 |
| [Thunderhawk Gunship](https://wahapedia.ru/wh40k11ed/factions/space-marines/Thunderhawk-Gunship) | 2 | 3 | 6 |
| [Tor Garadon](https://wahapedia.ru/wh40k11ed/factions/space-marines/Tor-Garadon) | 2 | 1 | 2 |
| [Vanguard Veteran Squad With Jump Packs](https://wahapedia.ru/wh40k11ed/factions/space-marines/Vanguard-Veteran-Squad-With-Jump-Packs) | 2 | 1 | 7 |
| [Victrix Honour Guard](https://wahapedia.ru/wh40k11ed/factions/space-marines/Victrix-Honour-Guard) | 3 | 0 | 3 |
| [Vulkan He’stan](https://wahapedia.ru/wh40k11ed/factions/space-marines/Vulkan-He-stan) | 2 | 2 | 3 |
| [Wardens of Ultramar](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wardens-of-Ultramar-1) | 2 | 1 | 10 |
| [Watch Captain Artemis](https://wahapedia.ru/wh40k11ed/factions/space-marines/Watch-Captain-Artemis) | 2 | 2 | 2 |
| [Watch Master](https://wahapedia.ru/wh40k11ed/factions/space-marines/Watch-Master) | 3 | 1 | 2 |

## Reproduction and input hashes

Use the complete current CSV export and the pinned relational repository, with its `adeptus-astartes` folder under the relational root:

```sh
node scripts/import-space-marines-intrinsic.mjs CSV_DIR src/space-marines-intrinsic.generated.ts
node scripts/import-space-marines-profiles.mjs CSV_DIR RELATIONAL_ROOT src/space-marines-card-profiles.generated.ts
```

| Input | SHA-256 |
| --- | --- |
| `Last_update.csv` | `fa7e6939e26ad36e179cd3205e056a032606b52e5248361b441a6fb0efd34d21` |
| `Datasheets.csv` | `eccaf2514028c3f58398d8fe6422712d86a0569c7ce6f03a79eeafc7c086bc51` |
| `Datasheets_abilities.csv` | `a9139d3809ca81884839dad900c653230a25cdada26f86b400b3ab91ddbabaff` |
| `Datasheets_models.csv` | `658751b37f052e33497802d4152186e4e6dc439fe1e721639756ef5ca25e110e` |
| `Datasheets_wargear.csv` | `6f7624852f0fd2b0f3d04f5a6a31b5e4ec3ca2ad4afa102ec8c90530dc7345bd` |
| `Source.csv` | `1b9d28d0d8c8c47746088e5f778afe1b4eb39a7e3ac35a7a8d4cce3a276ad9a9` |
| `adeptus-astartes/units.json` | `483e70092ad9104e0f6da3bcd84816eac7775f5d1e040c44c53724291ca2f7fd` |
| `adeptus-astartes/unit-compositions.json` | `2f79ae8a0be7a765460e9226e85588dece4b581e96a75aadea3a8f3ed27e3bbb` |
| `adeptus-astartes/weapons.json` | `40dc31ce80618e0717cd1b7f57c1b0633398ca22ee47d657ca3b22f3023dbe24` |
| `adeptus-astartes/wargear.json` | `8acdcfff3059c101af51a3490bb5e021f478e03cbc54d20cd3547aec3d31ea3f` |
