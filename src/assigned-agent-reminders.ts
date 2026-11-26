import {isSpaceMarineFaction} from './space-marines-factions';
import {spaceMarineAgentName} from './space-marines-data';
import {spaceMarineMusterUnits} from './space-marines-muster-data';
import {spaceMarineKeywords} from './space-marines-keywords';
import {spaceMarineCargoFormations} from './space-marines-transports';
import {chapterSplitPlans} from './space-marine-chapters-splits';
import {mechanicusMusterUnits} from './mechanicus-army-data';
import {mechanicusKeywords} from './mechanicus-keywords';
import {mechanicusReactionShooting} from './mechanicus-reactions';
import {sororitasReactionShooting} from './sororitas-reactions';
import {sororitasAgentName,sororitasMusterUnits,sororitasKeywords} from './sororitas-army-data';
import {astraAgentName,astraMilitarumKeywords,astraMusterUnits} from './astra-muster-data';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {IMPERIAL_KNIGHT_SHEETS,knightMusterUnits} from './imperial-knights-data';
import {knightWeaponCount,knightLoadoutFor} from './knight-loadouts';
import {rosterCost2026} from './datasheets-2026';
import {ASSIGNED_AGENT_SHEETS,assignedAgentHost} from './assigned-agent-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster} from './roster-instances';
import {weaponAbilityText} from './weapon-abilities-11th';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';

const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Movement','Shooting','Fight'] as const;
const titleCase=(s:string)=>s.replace(/\b[a-z]/g,l=>l.toUpperCase());
function weaponEffect(raw:string,snap:boolean){
 if(raw==='one shot')return 'One Shot (this bearer can fire this weapon once per battle)';
 if(raw==='psychic')return 'Psychic attack';
 if(raw==='psychic assassin')return 'Psychic Assassin sets the animus speculum to 6 attacks against a Psyker unit';
 if(raw.startsWith('blast '))return 'Blast '+raw.slice(6)+' adds '+raw.slice(6)+' attacks per five models in the target';
 return weaponAbilityText(titleCase(raw),snap);
}

export function assignedAgentReminders(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Imperial Agents'&&!assignedAgentHost(army.faction))return [];
 const result:GeneratedReminder[]=[];
 const native=army.faction==='Imperial Agents';
 const guard=army.faction==='Astra Militarum';
 const doubled=native&&army.detachments2026?.includes('Veiled Blade Elimination Force');
 const useLimit=doubled?'Twice per battle, at most once per battle round':'Once per battle';
 const roster=expandRoster(army);
 const parts=isSpaceMarineFaction(army.faction)&&roster.some(s=>s.knightGear?.['Battle formation']==='Split unit')?chapterSplitPlans(army,roster).filter(p=>p.valid).flatMap(p=>p.parts):[];
 const traders=roster.filter(s=>s.unit==='Rogue Trader Entourage');
 for(const squad of roster){
  const unit=isSpaceMarineFaction(army.faction)?spaceMarineAgentName(squad.unit):army.faction==='Adepta Sororitas'?sororitasAgentName(squad.unit):guard?astraAgentName(squad.unit):squad.unit;
  const data=ASSIGNED_AGENT_DATA.find(row=>row.sheet.unit===unit);
  if(!unit||!data)continue;
  const source=data.sheet.source;
  const body=knightJoinedBodyguard(army,squad);
  const part=parts.find(p=>p.physical.some(m=>m.squad.id===squad.id));
  const formation=part?part.members.map(s=>s.id):body?[body.id,...roster.filter(m=>m.attachedTo===body.id&&knightJoinedBodyguard(army,m)).map(m=>m.id)]:[squad.id];
  const core:readonly string[]=data.core;
  const hasGear=(name:string)=>knightWeaponCount(squad,name)>0;
  const configurable=!!knightLoadoutFor(army.faction,squad.unit,squad.models);
  const membersLed=roster.filter(s=>knightJoinedBodyguard(army,s)?.id===squad.id);
  const wholeUnit=body?formation:[squad.id,...membersLed.map(s=>s.id)];
  const emit=(key:string,title:string,window:ReminderWindow,summary:string,turn:GeneratedReminder['turn']='either',timing:GeneratedReminder['timing']='during',units=[squad.id])=>{
   const scope=part?(units.includes(part.originalRootId)?' The affected unit is '+part.root.id+' ('+part.models+' actual models); the other declared part does not receive this unit-scoped effect.':' The source model is assigned to '+part.root.id+'.'):'';
   result.push({id:'11e-agent-'+squad.id+'-'+key+'-'+window,origin:'unit',units,title:squad.id+' · '+title+(part?' · '+part.root.id:''),source,window,turn,timing,summary:summary+scope});
  };
  for(const phase of attacks){
   const snap=phase==='Movement',melee=phase==='Fight';
   const weapons=data.weapons.filter(w=>w.type===(melee?'Melee':'Ranged')&&(!configurable||hasGear(w.name))).map(w=>{
    const effects=w.abilities.split(',').map(k=>k.trim()).filter(Boolean).map(k=>weaponEffect(k,snap)).filter(Boolean);
    return effects.length?w.name+' — '+effects.join('. '):'';
   }).filter(Boolean);
   if(weapons.length)emit('weapons',snap?'Snap shooting':melee?'Melee weapons':'Ranged weapons',phase,(snap?'When this agent snap shoots: ':'')+weapons.join('. '),snap?'opponent':melee?'either':'own');
   if(data.invulnerable!=='-')emit('save',data.invulnerable+'+ invulnerable save',phase,'Models on this datasheet may use their '+data.invulnerable+'+ invulnerable save.'+(unit==='Subductor Squad'?' The Cyber-mastiff is excluded.':''));
  }
  for(const phase of ['Movement','Shooting'] as const){
   if(core.includes('Lone Operative'))emit('lone','Lone Operative',phase,'Enemy models more than 12″ away cannot see this agent or target it with Indirect Fire.');
   if(core.includes('Stealth'))emit('stealth','Stealth',phase,'This agent receives the benefit of cover against ranged attacks.');
  }
  if(core.includes('Infiltrators'))emit('infiltrators','Infiltrators','Pre-battle','During deployment, set up more than 8″ horizontally from the enemy deployment zone and all enemy units.');
  if(core.includes('Deep Strike')){
   emit('reserves','Deep Strike','Pre-battle','You may declare this agent in Strategic Reserves for a Deep Strike ingress.');
   emit('ingress','Deep Strike','Movement','When making an ingress move, this agent may set up anywhere more than 8″ horizontally from all enemies, including in their deployment zone.');
  }
  if(unit==='Voidsmen-at-arms'){
   const leaders=roster.filter(m=>knightJoinedBodyguard(army,m)?.id===squad.id);
   emit('close-confines','Masters of Close Confines','Shooting','When a model in this unit shoots its closest eligible target, critical hits may wound automatically through Lethal Hits.','own','during',[squad.id,...leaders.map(s=>s.id)]);
  }
  if(unit==='Navigator'){
   emit('gaze','Gaze into the Empyrean','Movement','Enemy reinforcements must set up more than 12″ from the Navigator, including when they arrive by Rapid Ingress.');
   emit('third-eye','Third Eye','Shooting','Select a visible enemy within 12″ of the Navigator. It must test for Battle-shock, subtracting 2 if it is Infantry. Failure inflicts 3 mortal wounds.','own','start');
  }
  if(unit==='Rogue Trader Entourage'){
   if(squad.id===traders[0]?.id){
    const led=traders.flatMap(t=>{const b=knightJoinedBodyguard(army,t);return b?[t.id,b.id]:[];});
    if(led.length)emit('deals','Backroom Deals','Pre-battle','When declaring formations, select one Rogue Trader Entourage that is leading. Its entire formation gains Infiltrators and can deploy more than 8″ horizontally from the enemy deployment zone and all enemies.','either','during',led);
    const eligible=isSpaceMarineFaction(army.faction)?spaceMarineMusterUnits(army):army.faction==='Adeptus Mechanicus'?mechanicusMusterUnits(army):army.faction==='Adepta Sororitas'?sororitasMusterUnits(army):guard?astraMusterUnits(army):native?ASSIGNED_AGENT_SHEETS.map(s=>s.unit):knightMusterUnits(army);
    const battleline=roster.filter(s=>{
     const keys=isSpaceMarineFaction(army.faction)?[...spaceMarineKeywords(army,s)]:army.faction==='Adeptus Mechanicus'?[...mechanicusKeywords(army,s)]:army.faction==='Adepta Sororitas'?[...sororitasKeywords(army,s)]:guard?[...astraMilitarumKeywords(army,s)]:[...IMPERIAL_KNIGHT_SHEETS,...ASSIGNED_AGENT_SHEETS].find(row=>row.unit===s.unit)?.keywords;
     return eligible.includes(s.unit)&&keys?.includes('IMPERIUM')&&(keys.includes('BATTLELINE')||(keys.includes('ARMIGER')&&army.detachments2026?.includes('Spearhead-at-arms')));
    });
    if(battleline.length)emit('warrant','Warrant of Trade','Pre-battle','After both armies deploy, redeploy up to D3 friendly Imperium Battleline units. They may enter Strategic Reserves even beyond its normal allowance. Eligible units: '+battleline.map(s=>s.id).join(', ')+'.','either','during',[squad.id,...battleline.map(s=>s.id)]);
   }
   emit('serum','Healing Serum','Command','While the Rejuvenat Adept is alive, if its unit is below Starting Strength, return up to D3 destroyed non-Character models to that unit.','own','start',formation);
  }
  if(unit==='Inquisitor Greyfax'&&body){
   for(const phase of ['Movement','Shooting'] as const)emit('psyoculum','Psyoculum',phase,'Ranged attacks by models in Greyfax’s led unit critically wound Psyker units on an unmodified Wound roll of 4+.','either','during',formation);
   for(const phase of ['Shooting','Fight'] as const)emit('no-mercy','No Mercy',phase,'Models in Greyfax’s led unit gain +1 to Hit when attacking a target below Half-strength.',phase==='Shooting'?'own':'either','during',formation);
  }
  if(unit==='Inquisitor Coteaz'){
   for(const phase of phases)emit('spy','Spy Network',phase,'When your opponent gains a CP from an ability, roll a D6. On 2+, gain 1CP.');
   if(body)for(const phase of attacks)emit('wardings','Malefic Wardings',phase,'Models in Coteaz’s led unit gain a 6+ invulnerable save, improved to 4+ against Psychic Attacks and attacks made by Daemon models.','either','during',formation);
   emit('eagle','Glovodan Psyber-eagle','Command','Choose one enemy unit within 18″ of Coteaz. Until the start of your next Command phase that unit cannot receive the Benefit of Cover.','own');
   for(const phase of ['Movement','Shooting'] as const)emit('eagle-cover','Glovodan Psyber-eagle',phase,'The enemy marked by Coteaz cannot receive the Benefit of Cover until the start of your next Command phase.');
  }
  if(unit==='Inquisitor Draxus'){
   if(body)for(const phase of ['Shooting','Fight'] as const)emit('xenos','Xenos Hunter',phase,'The led unit adds 1 to Hit against targets with neither Imperium nor Chaos.',phase==='Shooting'?'own':'either','during',formation);
   emit('veil','Psychic Veil','Command','Draxus may roll a D6. On 1 her unit suffers D3 mortal wounds. On 2+ it can only be targeted by ranged attacks from models within 18″ until the start of your next Command phase.','own','during',formation);
   for(const phase of ['Movement','Shooting'] as const)emit('veil-range','Psychic Veil',phase,'If Psychic Veil succeeded, only models within 18″ can target this unit with ranged attacks until the start of your next Command phase.','either','during',formation);
  }
  const assassin=data.sheet.keywords.some(k=>k==='OFFICIO ASSASSINORUM');
  if(native&&assassin){
   const nativePrice=(name:string)=>rosterCost2026({...army,units:{[name]:1},instances:[{id:name+'#1',unit:name}],upgrades2026:{}}).total;
   const current=nativePrice(unit);
   const alternates=ASSIGNED_AGENT_SHEETS.filter(s=>s.keywords?.includes('OFFICIO ASSASSINORUM')&&!roster.some(r=>r.unit===s.unit)).filter(s=>{
    const price=nativePrice(s.unit);return current!==null&&price!==null&&price<=current;
   });
   if(alternates.length)emit('assignment','Shadow Assignment','Pre-battle','When declaring formations, you may replace this model with an equal- or lower-cost different Assassin. Available replacements: '+alternates.map(x=>x.unit).join(', ')+'.');
  }
  if(body&&['Inquisitor','Inquisitor Greyfax','Inquisitor Draxus','Inquisitor Coteaz'].includes(unit)){
   const targetSheet=ASSIGNED_AGENT_SHEETS.find(s=>s.unit===body.unit);
   const keys=targetSheet?.keywords??[];
   const carriers=roster.filter(s=>{
    if(isSpaceMarineFaction(army.faction)&&spaceMarineCargoFormations(army,s,roster).some(g=>g.root.id===(part?.root.id??body.id)))return true;
    if(s.unit==='Imperial Rhino')return keys.includes('AGENTS OF THE IMPERIUM')&&keys.includes('INFANTRY')&&!keys.includes('TERMINATOR');
    if(s.unit==='Inquisitorial Chimera')return body.unit==='Inquisitorial Agents';
    if(s.unit==='Sisters of Battle Immolator')return keys.includes('ORDO HERETICUS')&&keys.includes('INFANTRY');
    return s.unit==='Corvus Blackstar'&&keys.includes('DEATHWATCH')&&keys.includes('INFANTRY');
   });
   if(carriers.length)for(const phase of ['Pre-battle','Movement'] as const)emit('authority','Authority of the Inquisition',phase,'While leading, the Inquisitor may embark with its Bodyguard in a transport eligible for that Bodyguard. All passengers must still fit its capacity.','either','during',formation);
  }
  if(unit==='Imperial Navy Breachers'){
   for(const phase of attacks)emit('breaching','Breaching Team',phase,'Models in this unit may re-roll Wound rolls of 1, or any Wound roll when their target is within range of an objective marker.','either','during',wholeUnit);
   for(const phase of ['Movement','Shooting'] as const)emit('cat','CAT Unit',phase,'Once per battle, when selected to shoot, this unit may give its ranged weapons Ignores Cover until phase end.','either','during',wholeUnit);
   emit('skull','Gheistskull','Shooting','Once per battle when targeting this unit with Explosives, you may choose a visible enemy within 18″ of this unit and outside Engagement Range of every friendly unit.','own','during',wholeUnit);
   for(const phase of attacks)emit('shield','Endurant Shield',phase,'Only the Armsman with the Endurant shield has a 4+ invulnerable save.');
  }
  if(unit==='Vigilant Squad')for(const phase of ['Movement','Shooting'] as const)emit('judgement','Merciless Judgement',phase,'This unit adds 1 to Wound on ranged attacks against enemies below Half-strength.','either','during',wholeUnit);
  if(unit==='Subductor Squad')emit('duty','Dedication to Duty','Fight','When a model is destroyed by a melee attack before it has fought this phase, roll a D6. On 4+, it fights after the attacking unit finishes its attacks, then is removed.','either','during',wholeUnit);
  if(unit==='Exaction Squad'){
   emit('law-target','Imperial Law','Start of battle round','At the start of the battle, select one enemy unit for Imperial Law.','either','start',wholeUnit);
   for(const phase of attacks)emit('law','Imperial Law',phase,'Against the selected enemy this unit has Precision'+(phase==='Movement'?' on snap shots.':' and Lethal Hits. Critical hits can wound automatically.'),'either','during',wholeUnit);
   if(hasGear('Arbites medi-kit'))emit('medic','Arbites Medi-kit','Command','If below Starting Strength and the bearer survives, return up to D3 destroyed Exaction Vigilants.','own','start',wholeUnit);
   if(hasGear('Soulguilt scanner'))for(const phase of ['Movement','Shooting'] as const)emit('scanner','Soulguilt Scanner',phase,'While the bearer survives, the unit’s ranged weapons ignore the Benefit of Cover.','either','during',wholeUnit);
  }
  if(hasGear('Nuncio aquila'))emit('nuncio','Nuncio Aquila','Command','Once per battle, at the start of either Command phase, choose an objective within 6″ of the bearer. All enemy units in range of it except Monsters and Vehicles must take a Battle-shock test. Each objective may be targeted only once per turn.','either','start');
  if(unit==='Inquisitorial Agents'){
   if(membersLed.some(s=>s.unit.startsWith('Inquisitor')&&s.unit!=='Inquisitorial Agents'))for(const phase of attacks)emit('loyal','Loyal Henchmen',phase,'While an Inquisitor leads this unit, subtract 1 from Wound rolls for attacks targeting this formation.','either','during',wholeUnit);
   const skulls=knightWeaponCount(squad,'Tome-skull');
   if(skulls)for(const phase of phases)emit('tome','Tome-skull',phase,'At phase start, expend one of this unit’s '+skulls+' Tome-skull'+(skulls===1?'':'s')+' to end Battle-shock on a friendly Agents of the Imperium unit within 6″, or force one enemy within 6″ to take a Battle-shock test. Each skull can be used once per battle.','either','start',wholeUnit);
  }
  if(unit==='Grey Knights Terminator Squad'){
   const inquisitors=membersLed.filter(s=>s.unit.startsWith('Inquisitor'));
   if(inquisitors.length)for(const phase of ['Pre-battle','Movement'] as const)emit('rites','Rites of Teleportation',phase,'The attached Inquisitor models gain Deep Strike when declaring formations and may arrive with their Terminators.','either','during',wholeUnit);
   for(const phase of ['Charge','Fight'] as const)emit('hammerhand','Hammerhand',phase,'Models in this unit that made a Charge move this turn gain Lethal Hits on their melee weapons until turn end. Critical hits may wound automatically.','either','during',wholeUnit);
   if(hasGear('Ancient’s banner'))for(const phase of ['Command','End of battle round'] as const)emit('banner','Ancient’s Banner',phase,'While the banner bearer survives, add 1 to each model’s Objective Control in its unit.','either','during',wholeUnit);
   if(hasGear('Narthecium'))emit('narthecium','Narthecium','Command','Return one destroyed non-Character model to the bearer’s unit.','own','during',wholeUnit);
  }
  if(unit==='Deathwatch Kill Team'||unit==='Aquila Kill Team'){
   for(const phase of ['Shooting','Fight'] as const)emit('alien','Death to the Alien',phase,'Re-roll Hit rolls of 1. Against a target with neither Imperium nor Chaos, you may re-roll the Hit roll instead.','either','during',wholeUnit);
   if(hasGear('Storm shield'))for(const phase of attacks)emit('shield','Astartes Shield',phase,'Only models equipped with a shield gain a 4+ invulnerable save.');
  }
  if(unit==='Aquila Kill Team'){
   for(const phase of attacks)emit('mixed-toughness','Kill Team',phase,'When targeted while the unit contains different Toughness values, use the majority value for the attacking models’ attacks. Use the highest tied value.','either','during',wholeUnit);
   if(roster.some(s=>s.unit==='Imperial Rhino'))for(const phase of ['Pre-battle','Movement'] as const)emit('gravis','Gravis Veteran transport capacity',phase,'Each Gravis Veteran takes two transport spaces and can embark with its unit. Count '+(squad.models===10?12:6)+' spaces for the team, plus any attached models.', 'either','during',wholeUnit);
  }
  if(unit==='Sisters of Battle Squad')emit('faith','Defenders of the Faith','Command','If within range of an objective you control at the end of your Command phase, it stays yours until the enemy has greater Level of Control there at a phase end.','own','end',wholeUnit);
  if(unit==='Sisters of Battle Squad'||unit==='Sanctifiers'){
   for(const phase of phases)emit('cherub',unit==='Sanctifiers'?'Cherub':'Incensor Cherub',phase,'Once per battle this unit may use Command Re-roll for 0CP, even if a different unit already used it this phase.','either','during',wholeUnit);
   if(hasGear('Simulacrum imperialis'))emit('simulacrum','Simulacrum Imperialis','Command','While the bearer survives, improve the Leadership of all models in its unit by 1, including for Battle-shock tests.','either','during',wholeUnit);
  }
  if(unit==='Sanctifiers'){
   if(membersLed.some(s=>(army.faction==='Adepta Sororitas'?sororitasAgentName(s.unit):guard?astraAgentName(s.unit):s.unit)==='Ministorum Priest'))emit('sermon','Ministorum Sermon','Fight','While a Ministorum Priest is in the unit, add 1 to all its models’ melee Wound rolls.','either','during',wholeUnit);
   emit('medic','Salvationist Medikit','Command','While the Salvationist is on the battlefield, return up to D3 destroyed non-Character models to its unit.','own','during',wholeUnit);
   emit('scout','Scouts 6″','Pre-battle','When declaring formations, attached Inquisitor and Ministorum Priest models also gain Scouts 6″. In pre-battle abilities deploy from reserves wholly within your deployment zone, or if already wholly inside it, scout up to 6″ and finish more than 8″ horizontally from enemy units.','either','during',wholeUnit);
  }
  if(unit==='Inquisitor'){
   for(const phase of phases)emit('rosette','Power of the Rosette',phase,'When you target the Inquisitor’s unit with a Stratagem, roll a D6. On 3+, gain 1CP.','either','during',formation);
   if(body&&hasGear('Blessed wardings'))for(const phase of attacks)emit('blessed','Blessed Wardings',phase,'While the Inquisitor leads, models in its unit gain a 6+ invulnerable save.','either','during',formation);
  }
  if(unit==='Ministorum Priest'){
   if(body)emit('hatred','Holy Hatred','Fight','While the Priest supports this unit, its models’ melee weapons gain Sustained Hits 1. Each critical hit scores one extra hit.','either','during',formation);
   emit('zealot','Zealot','Fight','Once per battle, add 3 to the Attacks and Strength of the Priest’s melee weapons until phase end.');
  }
  if(unit==='Inquisitor Kroyle'){
   emit('scout','Scouts 6″','Pre-battle','During pre-battle abilities, deploy from reserves wholly in your deployment zone or scout up to 6″ if already wholly inside it. Finish the move more than 8″ horizontally from enemies.');
   for(const phase of ['Movement','Shooting'] as const)emit('signal','On My Signal, Fire!',phase,'After Kroyle shoots, choose one enemy he hit. Friendly Agents of the Imperium models and Imperium Infantry Battleline models may re-roll Hit rolls against it until the end of the phase. Snap shooting cannot re-roll Hit rolls.');
   emit('tox','Tox-cycler','Shooting','After Kroyle shoots, if his Jindarii tox-cycler scored a hit, permanently improve its Strength and Damage by 2, to at most Damage 6.','own');
  }
  if(unit==='Watch Captain Artemis'){
   for(const phase of phases){
    emit('pain','Feel No Pain 6+',phase,'When Artemis would lose a wound, roll a D6. On a 6 that wound is not lost.');
    emit('unstoppable','Unstoppable Champion',phase,'Once per battle per army, at the end of a phase in which Artemis was destroyed, roll a D6. On 2+ return him with 3 wounds as near as possible to where he was destroyed, unengaged.','either','end');
   }
   for(const phase of ['Shooting','Fight'] as const)emit('instinct','Tactical Instinct',phase,'Each critical hit by this unit scores one extra hit from Sustained Hits 1.',phase==='Shooting'?'own':'either','during',wholeUnit);
  }
  if(unit==='Watch Master'){
   emit('quarry','Purgatus Quarry','Start of battle round','At the start of the first battle round choose up to one enemy as this unit’s hunted target. Select a new target each time the hunted unit is destroyed.','either','start',wholeUnit);
   for(const phase of attacks){
    emit('master','Watch Master',phase,'Only the Watch Master may re-roll '+(phase==='Movement'?'Wound':'Hit and Wound')+' rolls of 1 when attacking a Character unit.');
    emit('hunted','Purgatus Quarry',phase,'When attacking its hunted target, this unit may re-roll Wound rolls of 1.','either','during',wholeUnit);
   }
   const doctrine='Assault allows charging after advancing. Devastator gives ranged attacks Assault. Tactical allows shooting and charging after falling back.';
   emit('acumen','Strategic Acumen','Command','Choose one Combat Doctrine for this unit until your next Command phase. '+doctrine,'own','during',wholeUnit);
   for(const phase of ['Movement','Shooting','Charge'] as const)emit('doctrine','Active Combat Doctrine',phase,doctrine,'own','during',wholeUnit);
  }
  if(unit==='Inquisitorial Chimera'||unit==='Imperial Rhino'){
   emit('firing-deck','Firing Deck 2','Shooting','When selected to shoot, choose up to two passengers whose units have not shot. Fire one ranged weapon per model (excluding One Shot). Their embarked units cannot shoot again this turn.','own');
   if(unit==='Imperial Rhino')emit('repair','Self Repair','Command','The Rhino regains one lost wound.','own','start');
   else emit('rapid-deploy','Rapid Deployment','Movement','Passengers can disembark after this Chimera Advances. They must make a shock disembark move.','own');
  }
  if(unit==='Sisters of Battle Immolator'){
   for(const phase of ['Movement','Shooting'] as const)emit('purge','Purge and Cleanse',phase,'After this model shoots, select an enemy hit by its attacks. It loses the Benefit of Cover until the end of this phase.');
  }
  if(unit==='Corvus Blackstar'){
   emit('cluster','Blackstar Cluster Launcher','Movement','After this model’s Normal move, choose an enemy it passed over. Roll six dice, inflicting one mortal wound for each 4+.','own');
   emit('hover','Hover','Movement','When taking to the skies, do not subtract 2″ from the maximum move distance.','own');
   for(const phase of ['Shooting','Movement'] as const)if(hasGear('Auspex array'))emit('auspex','Auspex Array',phase,'The Blackstar’s ranged attacks ignore the Benefit of Cover.');
   for(const phase of ['Shooting','Fight'] as const)emit('damaged','Damaged 5',phase,'At 5 or fewer wounds remaining, the Blackstar subtracts 1 from its Hit rolls.');
  }
  if(core.includes('Deadly Demise')&&unit!=='Eversor Assassin')for(const phase of phases){
   const damage=unit==='Corvus Blackstar'?'D6':'D3';
   emit('demise','Deadly Demise '+damage,phase,'When destroyed, roll a D6. On 6, every unit within 6″ suffers '+damage+' mortal wounds. Roll damage separately for each unit.');
  }
  if(unit==='Callidus Assassin'){
   for(const phase of phases)emit('reign','Reign of Confusion',phase,'Once per turn, when your opponent targets one of their units within 12″ of this model with a Stratagem, you may increase that use’s cost by 1CP.');
   emit('priority','Fights First','Fight','Resolve this model in the Fights First order.');
   emit('escape','Acrobatic Escape','Fight','At phase end, this model may Fall Back up to D6″ if engaged.','either','end');
   emit('escape','Acrobatic Escape','End of opponent turn','If more than 3″ from all enemies, this model may enter Strategic Reserves. It must make an ingress move in your next Movement phase, even on your first turn.','opponent','end');
   emit('escape','Acrobatic Escape return','Movement','If this model used Acrobatic Escape to enter reserves last turn, it must make an ingress move now, including on your first turn.','own');
  }
  if(unit==='Culexus Assassin'){
   emit('soulless','Soulless Horror','Command',useLimit+' at phase start, each enemy unit within 9″ takes a Battle-shock test at −1, or −2 for a Psyker unit.','either','start');
   emit('etheric','Etheric Emergence','Movement','During your Movement phase, this model may Deep Strike more than 6″ horizontally from all enemies. Choosing this arrival prevents charging this turn.','own');
   emit('etheric','Etheric Emergence','Charge','If this model used Etheric Emergence this turn, it cannot declare a charge.','own');
   for(const phase of phases)emit('abomination','Abomination',phase,'Apply Feel No Pain 2+ against Psychic Attacks.');
  }
  if(unit==='Eversor Assassin'){
   emit('scout','Scouts 9″','Pre-battle','In the Resolve Pre-battle Abilities step, deploy from Strategic Reserves wholly inside your deployment zone, or scout up to 9″ if already wholly inside it. Finish the move more than 8″ horizontally from all enemies.');
   for(const phase of ['Movement','Shooting','Charge'] as const)emit('frenzon','Frenzon',phase,'This model may shoot and declare a charge during a turn in which it Advanced.','own');
   emit('overkill','Overkill','Movement',useLimit+', before making a Normal move, this model may gain +6″ Move and +3 melee Attacks until turn end.','own');
   emit('overkill','Overkill','Fight','If Overkill was activated this turn, add 3 to its melee weapons’ Attacks.','own');
   for(const phase of phases)emit('demise','Deadly Demise D3',phase,'On destruction, roll a D6. On a 6, each unit within 6″ suffers D3 mortal wounds, rolled separately for each unit.');
  }
  if(unit==='Vindicare Assassin'){
   for(const phase of ['Movement','Shooting'] as const){
    emit('deadshot','Deadshot',phase,'When this agent is selected to shoot, enemy units lose Lone Operative for its shooting and Hidden enemies have +15″ detection range.');
    emit('shieldbreaker','Shieldbreaker',phase,useLimit+' when declaring exitus rifle targets, choose a shieldbreaker round. Until phase end, add 1 to that rifle’s Wound rolls and every successful wound is critical.');
   }
  }
  if(army.faction==='Adeptus Mechanicus'){
   const reactions=mechanicusReactionShooting(army,squad,roster);
   if(reactions.length){
    const ids=new Set(['weapons','no-mercy','xenos'].map(key=>'11e-agent-'+squad.id+'-'+key+'-Shooting'));
    for(const row of result.filter(r=>ids.has(r.id)&&r.turn==='own'))result.push({...row,id:row.id+'-mechanicus-reaction',turn:'opponent',summary:'Only when making normal reaction shots through '+reactions.join('; or ')+': '+row.summary});
   }
  }
  if(army.faction==='Adepta Sororitas'){
   const reactions=sororitasReactionShooting(army,squad,roster);
   if(reactions.length){
    const ids=new Set(['weapons','no-mercy','xenos'].map(key=>'11e-agent-'+squad.id+'-'+key+'-Shooting'));
    for(const row of result.filter(r=>ids.has(r.id)&&r.turn==='own'))result.push({...row,id:row.id+'-sororitas-reaction',turn:'opponent',summary:'Only when making normal reaction shots through '+reactions.join('; or ')+': '+row.summary});
   }
  }
 }
 return result;
}
