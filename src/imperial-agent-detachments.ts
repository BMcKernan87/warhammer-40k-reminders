import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {NATIVE_AGENT_SHEETS} from './assigned-agent-data';
import {AGENT_STRATAGEMS,AGENT_UPGRADES} from './imperial-agent-detachments.generated';

const source='https://wahapedia.ru/wh40k11ed/factions/imperial-agents/';
const fleet='Imperialis Fleet',xenos='Ordo Xenos, Alien Hunters',hereticus='Ordo Hereticus, Purgation Force',malleus='Ordo Malleus, Daemon Hunters',veiled='Veiled Blade Elimination Force';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Shooting','Fight'] as const;
type Turn='own'|'opponent'|'either';
const normal=(s:string)=>s.trim().toLowerCase().replace(/[‑–]/g,'-').replaceAll('’',"'");
const traits=new Map(NATIVE_AGENT_SHEETS.map(s=>[normal(s.unit),new Set([...(s.keywords??[]),...Object.values(s.modelKeywords??{}).flat()])]));
const kw=(s:RosterInstance,k:string)=>traits.get(normal(s.unit))?.has(k)===true;
const hasDet=(army:ArmySelection,d:string)=>army.faction==='Imperial Agents'&&!!army.detachments2026?.includes(d);
const extremis=(unit:string)=>AGENT_UPGRADES.find(o=>o.detachment===veiled&&o.units.some(u=>normal(u)===normal(unit)));
export function agentExtremisPoints(army:ArmySelection,unit:string):number{
 return hasDet(army,veiled)?extremis(unit)?.points??0:0;
}
export function eligibleAgentUpgrades(army:ArmySelection,unit:string){
 const row=traits.get(normal(unit));
 if(!row?.has('CHARACTER')||row.has('EPIC HERO'))return [];
 return AGENT_UPGRADES.filter(o=>o.detachment!==veiled&&hasDet(army,o.detachment)&&o.units.some(u=>normal(u)===normal(unit)));
}
function eligibleTargets(army:ArmySelection,roster:readonly RosterInstance[]){
 const members=roster.filter(s=>traits.has(normal(s.unit))),groups=new Map<string,RosterInstance[]>();
 for(const s of members){
  const body=s.attachedTo?knightJoinedBodyguard(army,s):undefined;
  const id=body?.id??s.id;
  groups.set(id,[...(groups.get(id)??[]),s]);
 }
 const forms=[...groups.entries()].map(([id,group])=>({root:group.find(s=>s.id===id)!,group}));
 type Form=typeof forms[number];
 const has=(form:Form,k:string)=>form.group.some(s=>kw(s,k));
 const roots=(pred:(f:Form)=>boolean)=>forms.filter(pred).map(f=>f.root);
 const withK=(k:string)=>roots(f=>has(f,k));
 const hunter=(s:RosterInstance)=>kw(s,'ADEPTUS ARBITES')||kw(s,'INQUISITORIAL AGENTS')||kw(s,'ORDO HERETICUS');
 const banisher=(s:RosterInstance)=>kw(s,'INQUISITOR')||kw(s,'INQUISITORIAL AGENTS')||kw(s,'ORDO MALLEUS');
 const attached=roots(f=>f.group.length>1);
 return {members,forms,all:forms.map(f=>f.root),attached,
  deathwatch:withK('DEATHWATCH'),deathwatchInf:roots(f=>has(f,'DEATHWATCH')&&has(f,'INFANTRY')),
  relocatable:roots(f=>has(f,'INQUISITOR')||(has(f,'DEATHWATCH')&&has(f,'INFANTRY'))),
  malleus:roots(f=>f.group.some(banisher)),malleusModels:members.filter(banisher),ordoMalleus:withK('ORDO MALLEUS'),
  terminators:withK('GREY KNIGHTS TERMINATOR SQUAD'),
  hereticus:roots(f=>f.group.some(hunter)),hereticusModels:members.filter(s=>hunter(s)||kw(s,'INQUISITOR')),
  hereticusInf:roots(f=>f.group.some(hunter)&&has(f,'INFANTRY')),
  stun:roots(f=>f.group.some(hunter)&&has(f,'GRENADES')),
  nearby:forms.length>1?roots(f=>f.group.some(hunter)):[],
  voidfarers:withK('VOIDFARERS'),voidCharacters:roots(f=>has(f,'VOIDFARERS')&&has(f,'CHARACTER')),
  character:withK('CHARACTER'),mobileCharacters:roots(f=>has(f,'CHARACTER')&&!has(f,'OFFICIO ASSASSINORUM')),
  infantry:withK('INFANTRY'),infiltrators:roots(f=>has(f,'INFANTRY')&&!has(f,'GREY KNIGHTS TERMINATOR SQUAD')),
  blind:roots(f=>has(f,'GRENADES')||has(f,'VINDICARE ASSASSIN')),
 };
}
type Targets=ReturnType<typeof eligibleTargets>;
type Scope=Exclude<keyof Targets,'forms'|'members'|'hereticusModels'|'malleusModels'>;
type Strat={scope:Scope;text:string;special?:[string,string]};
const stratagem:Record<typeof AGENT_STRATAGEMS[number]['id'],Strat>={
 '000009127002':{scope:'deathwatch',text:'After enemy target selection, worsen the AP of attacks into this unit by 1 until that attacker finishes.'},
 '000009127003':{scope:'deathwatch',text:'Choose Furor, Malleus or Purgatus for this unit, even if already used. It replaces the army’s tactic for this unit until your next Command phase.'},
 '000009127007':{scope:'relocatable',text:'Remove an unengaged unit. In the Reinforcements step of your next Movement phase, return it more than 8″ horizontally from every enemy model.'},
 '000009127005':{scope:'deathwatchInf',text:'Before shooting, grant Assault and Ignores Cover to the unit’s ranged weapons for this phase. It cannot receive either other special ammunition Stratagem this phase.'},
 '000009127004':{scope:'deathwatchInf',text:'Before shooting, add Anti-Infantry 2+ and Anti-Monster 5+ to the unit’s ranged weapons for the phase, excluding weapons with Devastating Wounds. This cannot stack with Dragonfire or Kraken Rounds this phase.'},
 '000009127006':{scope:'deathwatchInf',text:'Before shooting, give the unit’s ranged weapons +6″ range and improve AP by 1 for the phase. The unit cannot also use Dragonfire or Hellfire Rounds this phase.'},
 '000009135002':{scope:'malleus',text:'Ward a controlled objective in the unit’s range. You retain control until the enemy controls it at a turn’s start or end. While warded and held, no enemy Daemon can set up within 6″ of it.'},
 '000009135003':{scope:'malleus',text:'A visible enemy Daemon within 12″ of the selected unit takes Battle-shock. On failure, all friendly Agents gain Devastating Wounds against that Daemon for this phase.'},
 '000009135004':{scope:'terminators',text:'Immediately after the Terminator unit Falls Back, it can shoot and charge for the rest of this turn.'},
 '000009135007':{scope:'terminators',text:'Before selecting this unit to shoot, grant its ranged weapons Lethal Hits and Psychic for the phase.'},
 '000009135005':{scope:'terminators',text:'After enemy target selection, worsen AP by 1 against the targeted Terminator unit until that enemy finishes attacking.'},
 '000009135006':{scope:'ordoMalleus',text:'After enemy target selection, that attacker’s Psychic weapons gain Hazardous for the rest of the phase.'},
 '000009139004':{scope:'voidfarers',text:'For the phase, the unit’s ranged attacks against targets within 12″ gain 1 Strength and improve AP by 1.'},
 '000009139003':{scope:'voidCharacters',text:'Target a Voidfarers Character unit. Agents arriving from Strategic Reserves this turn may set up in the enemy deployment zone this phase. All other arrival restrictions apply.'},
 '000009139007':{scope:'attached',text:'After enemy target selection, for the rest of the phase roll a D6 whenever a Precision attack is allocated to a Character in this attached unit. On 2+ assign it to a remaining Bodyguard model of your choice.'},
 '000009139002':{scope:'all',text:'For the phase, the unit’s attacks against an enemy in range of an objective gain Sustained Hits 1, Lance and Ignores Cover.'},
 '000009139005':{scope:'all',text:'This unit remains eligible to shoot this turn after Advancing or Falling Back.'},
 '000009139006':{scope:'mobileCharacters',text:'After enemy target selection, the Character unit gains a 4+ invulnerable save for the phase. After that attacker finishes, if unengaged it may move up to 6″ as a Normal move with Fly.'},
 '000009131003':{scope:'hereticus',text:'Before this unit attacks, give its weapons Lethal Hits for the rest of the phase.'},
 '000009131005':{scope:'hereticusInf',text:'Select an enemy Character unit on the battlefield. Until your next Command phase, the selected friendly unit gains Precision against it.'},
 '000009131006':{scope:'hereticus',text:'Before selecting this unit to shoot, allow its non-Blast ranged weapons to target enemies within 12″ engaged with friendly units until phase end.'},
 '000009131007':{scope:'nearby',text:'After enemy shooting destroys a different Agents unit within 6″ of this unit, it can shoot after that attacker finishes. Only the attacker may be targeted and it must be an eligible target.'},
 '000009131004':{scope:'hereticusInf',text:'After enemy target selection, give the targeted unit Feel No Pain 5+ for the phase if it is in range of an objective.'},
 '000009131002':{scope:'stun',text:'Choose an unengaged Grenades unit. A visible enemy within 8″, excluding Monsters and Vehicles, takes Battle-shock and suffers −1 to Hit for the phase whether it passes or fails.'},
 '000009758002':{scope:'all',text:'Before attacking, gain re-rolls of 1 to Wound against enemy Character units for the rest of this phase.',special:['OFFICIO ASSASSINORUM','Assassin models may re-roll any Wound roll against the enemy Warlord.']},
 '000009758003':{scope:'character',text:'After enemy target selection, the targeted Character unit has +1 Toughness for this phase.',special:['EVERSOR ASSASSIN','The Eversor also gains Feel No Pain 4+ for the phase.']},
 '000009758007':{scope:'infantry',text:'Declare a charge against one or more enemies within 6″ that this unit could legally charge.',special:['CALLIDUS ASSASSIN','A Callidus that makes this charge gets +1 to Wound in melee for the rest of the turn.']},
 '000009758004':{scope:'infantry',text:'Before this unit shoots, its ranged weapons gain Sustained Hits 1 for the phase.',special:['CULEXUS ASSASSIN','The Culexus also sets the Damage of its ranged weapons to 3.']},
 '000009758005':{scope:'infantry',text:'After enemy target selection, the targeted unit can only be selected for ranged attacks within 18″ for the phase. If it has Lone Operative, the limit is 6″.'},
 '000009758006':{scope:'blind',text:'When an enemy declares a charge targeting the unengaged unit, subtract 1 from that enemy’s Charge rolls for the phase.',special:['VINDICARE ASSASSIN','When the targeted unit is the Vindicare, subtract 2 instead.']},
};

export function agentDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Imperial Agents')return [];
 const t=eligibleTargets(army,roster),rows:GeneratedReminder[]=[];
 function cue(id:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,targets:readonly RosterInstance[]){
  if(targets.length)rows.push({id:'11e-agent-'+id+'-'+window,title,window,turn,timing,summary,source,origin:'detachment',units:targets.map(s=>s.id)});
 }
 if(hasDet(army,veiled)){
  const enhanced=t.members.filter(s=>extremis(s.unit));
  cue('sanction','Extremis Sanction','Pre-battle','either','during','Each selected Assassin receives its specific Extremis ability, with its mandatory points included. Overkill, Soulless Horror and Shieldbreaker are each usable twice per battle, at most once per round.',enhanced);
 }
 if(hasDet(army,xenos)){
  cue('tactics','Deathwatch Mission Tactics','Command','own','start','Choose one unused tactic until the start of your next Command phase. Furor grants Sustained Hits 1, Malleus grants Lethal Hits and Purgatus grants Precision on a critical wound. Each tactic is available once per battle.',t.deathwatch);
  for(const phase of attacks)cue('active-tactic','Deathwatch Mission Tactics',phase,phase==='Fight'?'either':'own','during','Apply the active tactic to your Deathwatch unit’s weapons. Furor gives Sustained Hits 1, Malleus gives Lethal Hits, and Purgatus gives Precision on a critical wound.',t.deathwatch);
  cue('relocation-return','Rapid Tactical Relocation · return','Movement','own','during','If removed by Rapid Tactical Relocation at the end of the opponent’s Fight phase, set the unit up in this Reinforcements step more than 8″ horizontally from all enemies.',t.relocatable);
 }
 if(hasDet(army,hereticus)){
  cue('heresy-overwatch','Root out Heresy · Fire Overwatch','Movement','opponent','end','When these models Fire Overwatch, their ranged weapons still ignore cover. Ordinary snap-shooting hits do not score critical hits.',t.hereticusModels);
  cue('heresy','Root out Heresy','Shooting','own','during','These models’ ranged weapons ignore cover. Against a Chaos unit with five or more models, their attacks also gain Sustained Hits 1. Attached models need a qualifying keyword of their own.',t.hereticusModels);
  cue('heresy','Root out Heresy','Fight','either','during','When these models attack a Chaos unit with at least five models, gain Sustained Hits 1. Apply only to models with a qualifying keyword.',t.hereticusModels);
 }
 if(hasDet(army,malleus))cue('daemon-overwatch','Destroy the Daemonic · Fire Overwatch','Movement','opponent','end','When these models Fire Overwatch against a Daemon, re-roll Wound rolls of 1. The snap-shooting restriction prevents Hit re-rolls.',t.malleusModels);
 if(hasDet(army,malleus))for(const phase of attacks)cue('daemons','Destroy the Daemonic',phase,phase==='Fight'?'either':'own','during','These models re-roll Hit rolls of 1. Against Daemons, they also re-roll Wound rolls of 1. Check the attacking model’s own keywords, including in attached units.',t.malleusModels);
 if(hasDet(army,fleet)){
  cue('costs','At All Costs','Command','own','start','Choose one order until your next Command phase. Eliminate selects one enemy on the battlefield for +1 to Hit against it. Acquire selects one objective, granting Agents in its range improved Leadership and OC by 1 and a 5+ invulnerable save.',t.all);
  for(const phase of attacks){
   cue('eliminate','Eliminate At All Costs',phase,phase==='Fight'?'either':'own','during','If Eliminate is active, attacks into the chosen enemy gain +1 to Hit.',t.all);
   cue('acquire','Acquire At All Costs',phase,phase==='Fight'?'either':'opponent','during','If Acquire is active, Agents in range of the chosen objective gain a 5+ invulnerable save. Their Leadership and Objective Control also improve by 1.',t.all);
  }
 }
 for(const strat of AGENT_STRATAGEMS){
  if(!hasDet(army,strat.detachment))continue;
  const {scope,text,special}=stratagem[strat.id],targets=t[scope];
  const extra=special&&t.members.some(s=>kw(s,special[0]))?' '+special[1]:'';
  const title=strat.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,s=>s.toUpperCase())+' · '+strat.cp+'CP';
  for(const w of strat.windows)cue(strat.id,title,w.phase,w.turn,strat.timing,text+extra,targets);
 }
 for(const bearer of t.members){
  const selected=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit];
  const upgrade=hasDet(army,veiled)&&extremis(bearer.unit)||eligibleAgentUpgrades(army,bearer.unit).find(o=>selected&&normal(o.name)===normal(selected));
  if(!upgrade)continue;
  const form=t.forms.find(f=>f.group.some(s=>s.id===bearer.id))!;
  const emit=(window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,targets=[bearer])=>
   cue(upgrade.id+'-'+bearer.id,bearer.id+' · '+upgrade.name,window,turn,timing,summary,targets);
  switch(upgrade.id){
   case '000009757002':
    if(t.members.some(s=>s.id!==bearer.id&&kw(s,'INFANTRY')))emit('Movement','own','during','Twice per battle, at most once per round, select another friendly unengaged Infantry model on the battlefield. Destroy that model without triggering destruction rules. Reposition the Callidus as close as possible to its former position, outside enemy engagement range.');
    break;
   case '000009757003':emit('Shooting','own','during','When the Culexus uses Explosives, each roll of 3+ inflicts a mortal wound instead of 4+.');break;
   case '000009757004':emit('Charge','opponent','end','Reduce Heroic Intervention on the Eversor by 1CP. This use is permitted after a previous use and allows subsequent uses on other units this phase.');break;
   case '000009757005':emit('Movement','opponent','end','If the Vindicare Fires Overwatch with its exitus rifle, it retains Anti-Monster 4+ and Anti-Vehicle 4+.');emit('Shooting','own','during','The Vindicare’s exitus rifle gains Anti-Monster 4+ and Anti-Vehicle 4+.');break;
   case '000009130002':emit('Movement','opponent','end','When the bearer Fires Overwatch, its ranged weapons retain Devastating Wounds, Melta 1 and Precision.');emit('Shooting','own','during','Only the bearer’s ranged weapons gain Devastating Wounds, Melta 1 and Precision.');break;
   case '000009126002':emit('Shooting','opponent','start','One visible non-Titanic enemy Vehicle within 12″ of the Watch Master takes a Leadership test. On a pass, its attacks suffer −1 to Hit this phase. On a failure, it cannot shoot this phase.');break;
   case '000009134002':emit('Fight','either','during','The bearer’s melee weapons gain one Attack and Anti-Daemon 3+.');break;
   case '000009138002':emit('Pre-battle','either','start','At the start of Declare Battle Formations give up to three Agents Infantry units Infiltrators, excluding Grey Knights Terminator Squads. Characters attached to selected units also gain Infiltrators.',t.infiltrators);break;
   case '000009126003':
    emit('Pre-battle','either','during','Every model in the bearer’s unit has Deep Strike.',[form.root]);
    emit('Movement','opponent','end','Rapid Ingress costs 0CP when targeting the bearer’s unit. It may arrive using Deep Strike subject to the normal arrival rules.',[form.root]);
    break;
   case '000009138003':emit('Pre-battle','either','start','At the start of Declare Battle Formations give up to three Voidfarers units Deep Strike. Characters attached to selected units gain it as well.',t.voidfarers);break;
   case '000009130003':emit('Pre-battle','either','end','After both players finish deployment, redeploy up to three Agents units. Any may enter Strategic Reserves, regardless of how many units are already there.',t.all);break;
   case '000009134003':
    emit('Pre-battle','either','during','Improve the bearer’s Leadership and Wounds characteristics by 1.');
    for(const phase of phases)emit(phase,'either','start','Once per battle, choose one friendly battle-shocked unit within 12″ of the bearer. It recovers from Battle-shock.',t.all);
    break;
   case '000009130004':emit('Movement','opponent','during','An enemy within 6″ of the bearer selected to Fall Back first takes a Leadership test. On failure it must Remain Stationary for the phase.');break;
   case '000009134004':emit('Movement','opponent','end','Once per battle, while the bearer is on the battlefield, use Rapid Ingress on a Grey Knights Terminator Squad for 0CP. Set it up more than 6″ from all enemy units.',t.terminators);break;
   case '000009138004':emit('Fight','either','during','When the bearer is selected to fight, roll three D6. For each 4+, allocate one mortal wound to an enemy within engagement range of the bearer, using Precision.');break;
   case '000009126004':for(const phase of phases)emit(phase,'either','during','The bearer has Feel No Pain 4+ against lost wounds, including mortal wounds.');break;
   case '000009126005':emit('Fight','either','during','The bearer’s melee weapons gain Anti-Infantry 2+ and Anti-Monster 4+.');break;
   case '000009138005':
    emit('Movement','own','during','Once per battle round across these three Stratagems, target the bearer’s unit with Masters of the Void for 0CP.',[form.root]);
    emit('Shooting','own','during','Once per battle round across the three Fleetmaster options, use Violent Acquisition or Close-quarters Barrage on this unit for 0CP.',[form.root]);
    emit('Fight','either','during','Once per battle round across the three Fleetmaster options, use Violent Acquisition on this unit for 0CP.',[form.root]);
    break;
   case '000009130005':
    if(form.root.id!==bearer.id)for(const phase of attacks)emit(phase,phase==='Fight'?'either':'own','during','While this bearer leads the attached unit, its models may re-roll Hit rolls against Psykers.',[form.root]);
    break;
   case '000009134005':
    emit('Command','either','during','Enemies within 9″ of the bearer worsen Leadership by 1.');
    for(const phase of attacks)emit(phase,'either','during','Daemon models attacking from within 9″ of the bearer suffer −1 to Hit and −1 to Wound.');
    break;
  }
 }
 return rows;
}
