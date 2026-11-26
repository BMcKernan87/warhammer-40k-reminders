import {weaponRules} from './necron-weapon-cues';
import type {BattleState,Phase} from './engine';
import type {Observation, Signal} from './battlefield-events';
import type {RosterInstance} from './roster-instances';
import {carriesOrb, NECRON_LOADOUTS, necronKeywords} from './necron-wargear';

export interface TriggerContext {
  battle: BattleState;
  bearer: RosterInstance;
  subject?: RosterInstance;
  observation?: Observation;
  roster: RosterInstance[];
  eligibleRoster: RosterInstance[];
  actedThisTurn: (action: Signal) => boolean;
}
export interface TriggerRule {
  id: string;
  title: string;
  units: readonly string[];
  signal: Signal | readonly Signal[];
  text: string | ((ctx: TriggerContext) => string);
  phase?: Phase;
  turn?: 'own' | 'opponent';
  scope?: 'formation' | 'leading' | 'nearby';
  within?: number | ((ctx:TriggerContext)=>number);
  visible?: boolean;
  gear?: (squad: RosterInstance) => boolean;
  when?: (ctx: TriggerContext) => boolean;
  limit?: 'battle' | 'turn' | 'round' | 'plasmacytes';
  shared?: boolean;
}
type Options = Omit<TriggerRule,'id'|'title'|'units'|'signal'|'text'>;
function rule(id: string, title: string, unit: string | string[], signal: TriggerRule['signal'], text: TriggerRule['text'], options: Options = {}): TriggerRule {
  return {id, title, units: typeof unit === 'string' ? [unit] : unit, signal, text, ...options};
}
const ctan = ['C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','C’tan Shard of the Deceiver','Transcendent C’tan'];
const overlords = ['Overlord','Overlord with translocation shroud'];
const atStart = 'phaseStart', atEnd = 'phaseEnd';
const has = (option: string) => (s: RosterInstance) => (s.wargear?.[option] ?? 0) > 0;
const hasPrimary = (s: RosterInstance, name: string) => s.weaponCounts ? (s.weaponCounts[name] ?? 0)>0 : (s.equipment ?? NECRON_LOADOUTS[s.unit]?.primary?.[0]) === name;
const eligibleInfantry=(s:RosterInstance)=>necronKeywords.INFANTRY.has(s.unit);
const armyBattleline = (unit?: RosterInstance) => unit?.unit === 'Necron Warriors' || unit?.unit === 'Immortals';

function hasKeyword(c:TriggerContext,keyword:keyof typeof necronKeywords):boolean {
  if(!c.subject)return false;
  const bodyId=c.subject.retinueTo??c.subject.attachedTo??c.subject.id;
  return c.roster.some(s=>(s.id===bodyId||s.attachedTo===bodyId||s.retinueTo===bodyId)&&necronKeywords[keyword].has(s.unit));
}
function augmentationRange({battle,bearer}:TriggerContext):number {
  const completed=new Set(battle.events.filter(e=>e.observation?.squadId===bearer.id&&e.observation.action==='meleeKill'&&
    !(e.round===battle.round&&e.player===battle.player&&e.phase===battle.phase)).map(e=>e.round+'-'+e.player));
  return Math.min(12,3+3*completed.size);
}
export const BATTLEFIELD_RULES: readonly TriggerRule[] = [
  rule('wraith-form','Wraith Form','Canoptek Wraiths','crossed','Choose one enemy this squad crossed. Roll one die per model in the moving unit. Each 4+ inflicts one mortal wound.'),
  rule('implacable-eradication','Implacable Eradication','Immortals',['shoot','fight'],({observation}) => observation?.onObjective ? 'The target is in range of an objective. You may re-roll each Wound roll.' : 'Re-roll Wound rolls of 1. Against an enemy in range of an objective, you may re-roll each Wound roll.'),
  rule('legion','Their Number is Legion','Necron Warriors','reanimate','You may re-roll the dice that determine how many wounds this unit reanimates.'),
  rule('optimised','Optimised for Slaughter','Lokhust Heavy Destroyers','shoot',({observation}) => 'Re-roll Wound rolls of 1 for the ' + (observation?.target==='other'?'enmitic exterminator':'gauss destructor') + ' against this target.', {
    when: ({bearer, observation}) => !!observation?.target && hasPrimary(bearer, observation.target==='other'?'Enmitic exterminator':'Gauss destructor'),
  }),
  rule('hard-wired','Hard-wired for Destruction','Lokhust Destroyers','shoot',({observation}) => observation?.enemyObjective ? 'Against this closest eligible enemy on an opponent-controlled objective, you may re-roll Hit rolls.' : 'Against the closest eligible enemy, re-roll Hit rolls of 1. An opponent-controlled objective allows full Hit re-rolls.', {when: c=>!!c.observation?.closest}),
  rule('guardian','Guardian Protocols','Lychguard','targeted','A Noble leads this squad and the attack is stronger than the unit’s Toughness. Subtract 1 from its Wound roll.',{
    when:c=>(c.observation?.strength??0)>(c.observation?.toughness??5) && c.roster.some(s=>s.attachedTo===c.bearer.id && ['Overlord','Overlord with translocation shroud','Imotekh the Stormlord','Trazyn the Infinite'].includes(s.unit)),
  }),
  rule('shield','Dispersion Shield','Lychguard','allocated','Shield bearers have a 4+ invulnerable save.',{gear:s=>hasPrimary(s,'Hyperphase sword and dispersion shield')}),
  rule('whirling','Whirling Onslaught','Skorpekh Destroyers','fight',c=>c.actedThisTurn('charged')?'This squad charged this turn. You may re-roll its melee Hit rolls.':'Re-roll melee Hit rolls of 1. A squad that charged this turn may re-roll each Hit roll.'),
  rule('plasmacyte','Plasmacyte',['Ophydian Destroyers','Skorpekh Destroyers'],'fight','Spend one Plasmacyte to give the unit’s melee weapons Devastating Wounds for the rest of this phase.',{gear:has('Plasmacyte'),limit:'plasmacytes'}),
  rule('tunnelling','Tunnelling Horrors','Ophydian Destroyers',atEnd,'If unengaged, this squad may enter Strategic Reserves. It must make an ingress move in your next Movement phase, even on your first turn.',{phase:'Fight',turn:'opponent'}),
  rule('charge-reroll','Relentless Combatants','Triarch Praetorians','chargeRoll','You may re-roll this squad’s Charge roll.'),
  rule('praetorian-fallback','Relentless Combatants','Triarch Praetorians','fallback','This squad may still declare a charge this turn.'),
  rule('tomb-evasion','Evasion Engrams','Tomb Blades',['shot','shotHit'],'You may make a Normal move of up to 6″. Taking the move prevents this squad from declaring a charge this turn.',{turn:'own',phase:'Shooting'}),
  rule('nebuloscope','Nebuloscope','Tomb Blades',['shoot','overwatch'],({bearer})=>{
    const weapons=bearer.modelLoadouts?.filter(row=>row.gear.includes('Nebuloscope')).map(row=>row.primary);
    const assignment=weapons?' Weapons on those bearers: '+weapons.join(', ')+'.':'';
    return 'The ranged weapons of surviving Nebuloscope bearers have Ignores Cover ('+bearer.wargear!.Nebuloscope+' originally equipped).'+assignment;
  },{gear:has('Nebuloscope')}),
  // The current Deathmarks card retains "Reinforcements step" terminology;
  // Core 09/20.04 now resolves ingress during Movement's Move Units step.
  rule('hunters','Hyperspace Hunters','Deathmarks','arrival','When an enemy arrives from reserves in the opponent’s Movement phase, you may shoot that visible enemy unit within 18″ as if it were your Shooting phase, if it is a legal target. All attacks from this reaction must target it. This is normal reactive shooting, not snap shooting. Synaptic disintegrators retain Precision; their Heavy bonus applies only in your Shooting phase.',{scope:'nearby',within:18,visible:true,phase:'Movement',turn:'opponent',limit:'turn'}),
  rule('flesh-hunger','Flesh Hunger','Flayed Ones','fight','Against this below-half-strength target, every successful melee hit is a Critical Hit.',{when:c=>!!c.observation?.belowHalf}),
  rule('tomb-shield-move','Shieldvanes','Tomb Blades','phaseStart','Surviving shieldvane bearers have Move 8″, not 12″.',{phase:'Movement',gear:has('Shieldvanes')}),
  rule('tomb-shield-save','Shieldvanes','Tomb Blades','allocated','Surviving shieldvane bearers have a 3+ Save.',{gear:has('Shieldvanes')}),
  rule('tomb-shadowloom','Shadowloom','Tomb Blades','targeted','Surviving shadowloom bearers have Stealth; the ranged target gains its Stealth cover benefit only if every model in the unit has Stealth.',{gear:has('Shadowloom')}),
  rule('thrall-fight','Systematic Vigour','Cryptothralls','meleeCasualty','If the destroyed Cryptothrall has not fought this phase, roll D6. On 2+, it fights after the enemy unit finishes its attacks, then is removed.'),
  rule('scarab','Self-destruction','Canoptek Scarab Swarms',atStart,'If engaged, one Scarab can be destroyed. Choose an enemy in that model’s Engagement Range. Add 1 to the die against a Vehicle. A 2–5 deals D3 mortal wounds and a 6+ deals 3.',{phase:'Fight'}),
  rule('harassment','Harassment Swarm','Canoptek Macrocytes','enemyAttacks','Subtract 1 from the attacking unit’s Hit rolls while it is within this aura.',{scope:'nearby',within:3,when:c=>c.observation?.target==='other'}),
  rule('macro-mandible','Accelerator Mandible','Canoptek Macrocytes',atStart,'If the Accelerator Mandible bearer survives, choose a friendly Canoptek unit within 3″ of its unit. Improve its Weapon Skill by 1 for this phase.',{phase:'Fight',gear:has('Accelerator mandible')}),
  rule('macro-projector','Nanoscarab Projector','Canoptek Macrocytes','reanimate','If the Nanoscarab Projector bearer survives, it may add one wound to this Reanimation Protocols activation.',{gear:has('Atomiser beam and nanoscarab projector'),scope:'nearby',within:3,limit:'round'}),
  rule('crawlers','Weapon Sentinels','Canoptek Tomb Crawlers','shoot','For these attacks within 12″, you may ignore Ballistic Skill, Hit and Wound modifiers.',{when:c=>c.observation?.range!==undefined && c.observation.range<=12}),
  rule('ghost-repair','Repair Barge','Ghost Ark','enemyWounded','This Ghost Ark may activate the affected Warriors’ Reanimation Protocols.',{scope:'nearby',within:3,when:c=>c.subject?.unit==='Necron Warriors',limit:'turn'}),
  rule('reanimation-beam','Nanoscarab Reanimation Beam','Canoptek Reanimator','reanimate','This activation heals an extra D3 wounds. Multiple copies of the same aura do not add further dice.',{scope:'nearby',within:3}),
  rule('spyder-swarm','Canoptek Swarm','Canoptek Spyders',atStart,'During your Command phase, choose a friendly Scarab Swarm within 6″. Return one destroyed Scarab for each Spyder in this unit.',{phase:'Command',turn:'own',when:c=>c.roster.some(s=>s.unit==='Canoptek Scarab Swarms')}),
  rule('gloom','Gloom Prism','Canoptek Spyders','allocated','Models in the affected unit have Feel No Pain 5+ against these wounds.',{scope:'nearby',within:6,gear:has('Gloom prism'),when:c=>!!c.observation?.psychicOrMortal}),
  rule('sentinel','Sentinel Construct','Canoptek Doomstalker','overwatch','Score Overwatch hits on unmodified rolls of 5+.'),
  rule('doomsday-still','Overwhelming Obliteration','Doomsday Ark','stationary','The doomsday cannon has Devastating Wounds until this turn ends.'),
  rule('doomsday-shoot','Overwhelming Obliteration','Doomsday Ark','shoot','This Ark remained stationary. Its doomsday cannon has Devastating Wounds.',{when:c=>c.actedThisTurn('stationary')}),
  rule('doom-scythe','Atavistic Instigation','Doom Scythe','deathRay','The defender chooses. Standing firm lets successful unmodified 5+ ranged hits against the unit become criticals this phase. Ducking gives its attacks −1 to hit until your next Shooting phase.'),
  rule('invasion','Invasion Beams','Night Scythe',atEnd,'If the transport is empty, an unengaged friendly Necrons Infantry unit wholly within 6″ may embark.',{phase:'Fight',when:c=>c.roster.some(eligibleInfantry)}),
  rule('arcing','Malevolent Arcing','Annihilation Barge','tesla','Roll for the target and each other enemy within 3″ of it. On 5+, that unit takes D3 mortal wounds after this model resolves its attacks against the target.',{phase:'Shooting',turn:'own'}),
  rule('relay','Targeting Relay','Triarch Stalker','shotHit','Choose one enemy this Stalker hit. It cannot receive the Benefit of Cover for the rest of this phase.',{phase:'Shooting',turn:'own'}),
  rule('monolith','Eternity Gate','Monolith',atStart,'During Movement, choose friendly Necrons Infantry on the field or in Strategic Reserves. Put an on-field selection into Strategic Reserves first. The unit can ingress wholly within 6″ of the Monolith, unengaged, including in the enemy deployment zone, without needing a battlefield edge. It cannot make a Charge move this turn.',{phase:'Movement',turn:'own',when:c=>c.battle.round>1&&c.eligibleRoster.some(eligibleInfantry)}),
  rule('gravitic','Gravitic Pulse','Obelisk',atStart,'Choose a visible enemy within 18″. Halve its Move, Advance and Charge rolls this turn. If it can Fly, each time it finishes moving before your next Movement phase, a 4+ inflicts D3 mortal wounds.',{phase:'Movement',turn:'opponent'}),
  rule('vault','Powers of the C’tan','Tesseract Vault','shoot','When selected to shoot in your Shooting phase, choose up to two different C’tan Powers weapons (only one with 1–8 wounds remaining). This model is equipped with those chosen powers in addition to its other weapons until this phase ends.',{phase:'Shooting',turn:'own'}),
  rule('seraptek','Terrifying Monstrosity','Seraptek Heavy Construct',atStart,'Each enemy engaged with any Seraptek with this ability takes one Battle-shock test.',{phase:'Fight'}),
  rule('cover','Ancient Cover','Convergence Of Dominion','allocated','For a ranged attack, the defending model gains cover if this fortification prevents it being fully visible to every model in the attacking unit.',{scope:'nearby',when:c=>!!c.observation?.measurements?.[c.bearer.id]?.blocksSight}),
  rule('necroadjust','Necrodermis',ctan,'allocated','Reduce the Damage characteristic of the attack allocated to this C’tan by 1.'),
  rule('drain','Drain Life',ctan[0],atEnd,'Roll for each enemy unit within 6″. A 4+ inflicts D3 mortal wounds on that unit.',{phase:'Fight'}),
  rule('matter','Matter Absorption',ctan[1],atStart,'Choose an enemy Vehicle within 12″. On 2+, it suffers D3 mortal wounds and the shard regains up to that many lost wounds.',{phase:'Shooting',turn:'own'}),
  rule('displace','Transdimensional Displacement',ctan[3],'advance','This Advance may travel any distance through models. Finish more than 8 inches horizontally from every enemy unit.'),
  rule('command-king','Triarch Abilities','The Silent King',atStart,'Choose Phaeron of the Stars, Phaeron of the Blades or Relentless March for this battle round. Only one is active.',{phase:'Command',when:c=>c.battle.player==='A'}),
  rule('imotekh-cp','Grand Strategist','Imotekh the Stormlord',atStart,'Gain 1 CP for Imotekh being on the battlefield.',{phase:'Command',turn:'own'}),
  rule('imotekh-storm','Lord of the Storm','Imotekh the Stormlord',atEnd,'For each enemy within 12″, roll one die. A 2–5 inflicts D3 mortal wounds and a 6 inflicts D3+3.',{phase:'Command',turn:'own',limit:'battle'}),
  rule('stars','The Stars Are Right','Orikan the Diviner',atStart,'Triple the Attacks and Strength of the Staff of Tomorrow this phase. Each successful Wound roll with Orikan’s attacks is critical.',{phase:'Fight',limit:'battle'}),
  rule('orikan-save','Master Chronomancer','Orikan the Diviner','allocated','Models in this attached unit have a 4+ invulnerable save.',{scope:'leading'}),
  rule('rites','Rites of Reanimation','Technomancer','allocated','Models in this attached unit have Feel No Pain 5+.',{scope:'leading'}),
  rule('tech-heal','Technomancer','Technomancer',atEnd,'Choose a friendly Necrons model within 6″. It recovers up to D3 lost wounds. Each model can receive this repair once per turn.',{phase:'Movement',turn:'own'}),
  rule('harbinger','Harbinger of Destruction','Plasmancer','shoot','A successful unmodified ranged Hit roll of 5+ scores a Critical Hit for the attached unit.',{scope:'leading'}),
  rule('lightning','Living Lightning','Plasmancer',atStart,'During Shooting, choose a visible enemy within 18″. An unattached Lone Operative must be within 12″. Roll four dice, inflicting a mortal wound for each 4+.',{phase:'Shooting',turn:'own'}),
  rule('chronometron','Chronometron','Chronomancer',['shot','shotHit'],'The unengaged unit may make a 5″ Normal move. Taking it prevents a charge this turn.',{scope:'formation',turn:'own',phase:'Shooting',when:c=>!!c.observation?.unengaged}),
  rule('timesplinter-mantle','Timesplinter Mantle','Chronomancer','targeted','This unit has Stealth; subtract 1 from melee Hit rolls against it.',{scope:'formation'}),
  rule('terror','Harbinger of Despair','Psychomancer',atStart,'Choose an enemy unit within 18″. It takes a Battle-shock test with −1 to the result.',{turn:'own',limit:'turn'}),
  rule('geomancer','Tectonic Reverberations','Geomancer',atStart,'During Movement you may pin a visible enemy within 18″. It takes −2 Move and −2 to Charge rolls until your next Movement phase starts.',{phase:'Movement',turn:'own'}),
  rule('warden','Adaptive Strategy','Royal Warden','fallback','This unit may still shoot and declare a charge this turn.',{scope:'formation'}),
  rule('skorpekh-lord','Crimson Harvest','Skorpekh Lord','charged','For an enemy engaged with the Lord at the end of its Charge, roll a die. A 2–5 deals D3 mortal wounds and a 6 deals D3+3.',{scope:'formation'}),
  rule('united','United in Destruction','Skorpekh Lord','fight','Melee weapons in the attached unit have Lethal Hits.',{scope:'leading'}),
  rule('szeras','Mechanical Augmentation','Illuminor Szeras',['shoot','fight','targeted'],c=>c.observation?.action==='targeted'?'Worsen incoming AP by 1 against the affected Battleline unit.':'Improve AP by 1 on attacks from the affected Battleline unit.',{scope:'nearby',within:augmentationRange,when:c=>armyBattleline(c.subject)}),
  rule('atomic','Atomic Energy Manipulator','Illuminor Szeras',atEnd,c=>'The augmentation aura grows to '+Math.min(12,augmentationRange(c)+3)+'″ after this phase.',{phase:'Fight',when:c=>c.actedThisTurn('meleeKill')}),
  rule('nekrosor-aura','Infectious Murder-madness','Nekrosor Ammentar',['shoot','fight'],'Eligible attacking models gain Sustained Hits 1. For a target other than the closest eligible enemy, apply it only to Destroyer Cult models.',{scope:'nearby',within:6,when:c=>!hasKeyword(c,'MONSTER')&&!hasKeyword(c,'TITANIC')&&(hasKeyword(c,'DESTROYER CULT')||!!c.observation?.closest)}),
  rule('nullstone','Nullstone Field Generator','Nekrosor Ammentar','allocated','Models in the affected unit have Feel No Pain 5+ against mortal wounds and Psychic attacks.',{scope:'nearby',within:6,when:c=>!!c.observation?.psychicOrMortal}),
  rule('nodes','Reanimation Nodes','Convergence Of Dominion','allocated','The affected Necrons Infantry unit has Feel No Pain 6+.',{scope:'nearby',within:6,when:c=>hasKeyword(c,'INFANTRY')}),
  rule('fabricator','Fabricator Claw Array','Canoptek Spyders','allocated','The affected Necrons Vehicle unit has Feel No Pain 6+.',{scope:'nearby',within:6,gear:has('Fabricator claw array'),when:c=>hasKeyword(c,'VEHICLE')}),
  rule('obelisk-node','Obelisk Node Control','Geomancer','arrival','An enemy arriving from reserves cannot set up within 12″ of the Geomancer while it is on a controlled objective.',{scope:'nearby',within:12,when:c=>!!c.observation?.measurements?.[c.bearer.id]?.controlledObjective}),
  rule('murder','Prophet of Destruction','Nekrosor Ammentar','killed','Choose another friendly Destroyer Cult unit within 9″. Its models re-roll Wound rolls of 1 for the rest of this phase.'),
  rule('trazyn','Surrogate Hosts','Trazyn the Infinite',atStart,'You may replace another friendly Necrons Infantry Character on the field. Exclude Epic Heroes and Skorpekh Lords. Ignore destruction triggers, restore Trazyn to full wounds and inherit the host’s leadership assignment.',{phase:'Command',turn:'own',when:c=>c.roster.some(s=>['Overlord','Overlord with translocation shroud','Chronomancer','Geomancer','Hexmark Destroyer','Plasmancer','Psychomancer','Royal Warden','Technomancer'].includes(s.unit))}),
  rule('overlord','Implacable Resilience','Overlord','allocated','Reduce incoming Damage by 1 when the attack is allocated to this Overlord model.'),
  rule('will','My Will Be Done',overlords,'stratagem','You may reduce the cost of this use of the Stratagem by 1 CP.',{scope:'formation',limit:'round',shared:true}),
  rule('shroud','Translocation Shroud',overlords[1],['normal','advance','fallback'],'When Advancing, add 6″ to Move instead of rolling. During Normal, Advance or Fall Back moves, the unit’s models may move horizontally through models and terrain, finishing clear of other models and their bases.',{scope:'formation'}),
  rule('orb','Resurrection Orb',[...overlords,'Lokhust Lord','Catacomb Command Barge'],atEnd,c=>c.bearer.unit==='Catacomb Command Barge'?'Choose a friendly Necrons Infantry or Mounted unit within 6″. Activate its Reanimation Protocols with D6 wounds.':'Activate this unit’s Reanimation Protocols with D6 wounds.',{gear:carriesOrb,limit:'battle',when:c=>c.bearer.unit!=='Catacomb Command Barge'||c.roster.some(s=>eligibleInfantry(s)||necronKeywords.MOUNTED.has(s.unit))}),
  rule('lokhust-lead','Destroyer Cult','Lokhust Lord','shoot','Successful unmodified ranged Hit rolls of 5+ are critical for the led unit.',{scope:'leading'}),
  rule('hatred','Driven by Hatred','Lokhust Lord',['shoot','fight'],'Against this below-half-strength enemy, the Lord may re-roll its Hit and Wound rolls.',{when:c=>!!c.observation?.belowHalf}),
  rule('amulet','Nanoscarab Amulet','Lokhust Lord','allocated','This bearer has Feel No Pain 5+.',{gear:has('Nanoscarab amulet')}),
  rule('command-shield','Advanced Quantum Shielding','Catacomb Command Barge','targeted','The attack’s Strength exceeds this Barge’s Toughness. Subtract 1 from the Wound roll.',{when:c=>(c.observation?.strength??0)>(c.observation?.toughness??8)}),
  rule('hex-hits','Inescapable Death','Hexmark Destroyer','overwatch','Overwatch attacks from this Hexmark hit on unmodified rolls of 2+.'),
  rule('tachyon','Tachyon Arrow','Overlord',['shoot','overwatch'],'This Overlord’s tachyon arrow can be fired once per battle, including when using Fire Overwatch. Mark it used when this bearer fires it; returning that bearer to the battlefield does not restore the shot.',{gear:s=>hasPrimary(s,'Tachyon arrow and Overlord’s blade'),limit:'battle'}),
  rule('hex-overwatch','Inescapable Death · free Overwatch','Hexmark Destroyer','overwatch','You may use Fire Overwatch for 0 CP, including after using it on another unit this phase.',{limit:'turn',shared:true}),
  rule('hex-return','Multi-threat Eliminator','Hexmark Destroyer',['enemyAttacked','enemyWounded'],'One Hexmark within 3″ may shoot back at that enemy alone, provided it is an eligible target.',{phase:'Shooting',turn:'opponent',scope:'nearby',within:3,limit:'turn',shared:true}),
  ...weaponRules,
];
