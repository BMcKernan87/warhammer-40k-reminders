import {expandRoster} from './roster-instances';
import {daemonKeywords,daemonMusterUnits} from './chaos-daemons-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {shadowLegionHasRangedWeapon} from './shadow-legion-cards';
import {chaosKnightHasRangedWeapon} from './chaos-knight-datasheets';
import {PHASES} from './engine';
import {DAEMONIC_PACT_SHEETS} from './daemonic-pact-data.generated';
import {daemonHasRangedWeapon,type DaemonRuleContext} from './daemon-datasheet-context';

const infantry=new Set(DAEMONIC_PACT_SHEETS.filter(s=>s.keywords?.includes('INFANTRY')).map(s=>s.unit));
const greater=new Set(['Skarbrand','Bloodthirster','Shalaxi Helbane','Keeper Of Secrets','Rotigus','Great Unclean One','Kairos Fateweaver','Lord of Change']);
export function daemonUndivided(c:DaemonRuleContext):void {
 const {squad,roster,army,add}=c;
 const {unit,id}=squad,god=c.god(squad);
 const formationIds=(rows:typeof roster)=>[...new Set(rows.map(c.formationId))];
 const all=formationIds(roster);
 if(army.faction==='Chaos Daemons'&&greater.has(unit)){
   const targets=formationIds(roster.filter(s=>c.god(s)===god));
   for(const phase of PHASES)add('Greater Daemon of '+god+' (Aura)',phase,'either','during','Friendly '+god+' daemon units within 6″ of this model count as within the army’s Shadow of Chaos. The aura cannot shorten the bearer’s own arrival distance on a battlefield location outside the Shadow. Eligible formations: '+targets.join(', ')+'.',targets);
 }
 switch(unit){
 case 'Be’lakor':{
   const legal=daemonMusterUnits(army);
   const marines=army.faction==='Chaos Daemons'&&army.detachments2026?.includes('Shadow Legion')?expandRoster(army).filter(s=>legal.includes(s.unit)&&daemonKeywords(army,s).has('HERETIC ASTARTES')):[];
   const alliedIds=(models:typeof roster)=>models.map(s=>knightJoinedBodyguard(army,s)?.id??s.id);
   const targets=[...new Set([...all,...alliedIds(marines)])];
   if(army.faction==='Chaos Daemons')for(const phase of PHASES)add('The Dark Master (Aura)',phase,'either','during','The battlefield within 6″ of Be’lakor is in your army’s Shadow of Chaos. The area does not shorten his own arrival at a location outside the Shadow.');
   add('Shadow Form Abilities','Start of battle round','either','start','Choose Wreathed in Shadows, Pall of Despair or Shadow Lord. Only the selected form applies until this battle round ends.');
   for(const phase of ['Movement','Shooting'] as const)add('Wreathed in Shadows (Aura, Psychic)',phase,phase==='Movement'?'own':'opponent','during','If this form was chosen, enemy ranged attacks may only target friendly Legiones Daemonica or Shadow Legion units within 6″ of Be’lakor if the attacking model is within 18″ of the target. Eligible formations: '+targets.join(', ')+'.',targets);
   add('Pall of Despair (Aura, Psychic)','Command','opponent','during','If this form was chosen, each enemy unit within 9″ that is below starting strength must test in the opponent’s Battle-shock step. A single-model unit counts as below starting strength if it has lost a wound.');
   for(const phase of PHASES)add('Pall of Despair · healing',phase,'either','during','If Pall of Despair was chosen, every time an enemy unit within 9″ fails a Battle-shock test, Be’lakor regains up to D3 lost wounds.');
   for(const phase of ['Shooting','Fight'] as const){
     const affected=phase==='Fight'?targets:[...new Set([...formationIds(roster.filter(daemonHasRangedWeapon)),...alliedIds(marines.filter(s=>shadowLegionHasRangedWeapon(s)||chaosKnightHasRangedWeapon(s)))])];
     add('Shadow Lord (Aura, Psychic)',phase,phase==='Fight'?'either':'own','during','If this form was chosen, friendly Legiones Daemonica or Shadow Legion units within 6″ of Be’lakor re-roll Hit rolls of 1. Eligible formations: '+affected.join(', ')+'.',affected);
   }
   break;
 }
 case 'Daemon Prince of Chaos':
 case 'Daemon Prince Of Chaos With Wings':{
   if(unit==='Daemon Prince of Chaos'){
     const foot=formationIds(roster.filter(s=>infantry.has(s.unit)));
     for(const phase of ['Movement','Shooting'] as const){
       const turn=phase==='Movement'?'own':'opponent';
       if(foot.length)add('Daemonic Lord',phase,turn,'during','Within 3″ of a friendly daemon Infantry formation, this Prince has Lone Operative. Enemy models outside 12″ cannot see or use indirect fire against it. Eligible formations: '+foot.join(', ')+'.',[id]);
       add('Prince of Darkness (Aura)',phase,turn,'during','Friendly daemon units within 6″ have Stealth, granting cover against ranged attacks. Eligible formations: '+all.join(', ')+'.',all);
     }
     for(const phase of PHASES)add('Unholy Vigour',phase,'either','start','Once per battle at the start of any phase, give this model a 3+ invulnerable save until the phase ends.');
   }else{
     add('Malefic Destruction','Fight','either','start','Once per battle, at the start of the Fight phase, this model’s hellforged weapons gain 3 Attacks until phase end.');
     add('Harbinger of Death','Fight','either','during','When selected to fight, give this model’s hellforged weapons one ability for the rest of the phase: Lethal Hits, Precision or Sustained Hits 1.');
   }
   if(god==='Khorne')add('Daemon Prince of Khorne','Fight','either','during','Add 2 to the Strength of this Prince’s hellforged weapons.');
   if(god==='Tzeentch')for(const phase of ['Shooting','Movement'] as const)add('Daemon Prince of Tzeentch',phase,phase==='Shooting'?'own':'opponent',phase==='Shooting'?'during':'end','Add 3 to the Attacks of this Prince’s infernal cannon.');
   if(god==='Nurgle')for(const phase of ['Shooting','Fight','Movement'] as const)add('Daemon Prince of Nurgle',phase,phase==='Movement'?'own':phase==='Fight'?'either':'opponent','during','Add 1 to this Prince’s Toughness.');
   if(god==='Slaanesh')add('Daemon Prince of Slaanesh','Movement','own','during','Increase this Prince’s Move by 2″.');
   break;
 }
 case 'Soul Grinder':
   add('Scuttling Walker','Movement','own','during','On a Normal move or Advance, this model may cross friendly Monsters and Vehicles and terrain features up to 4″ high as though they were absent.');
   if(god){
     const weapon={Khorne:'torrent of burning blood',Tzeentch:'warp gaze',Nurgle:'phlegm bombardment',Slaanesh:'scream of despair'}[god as 'Khorne'|'Tzeentch'|'Nurgle'|'Slaanesh'];
     for(const phase of ['Shooting','Movement'] as const)add('Daemonic Allegiance',phase,phase==='Shooting'?'own':'opponent',phase==='Shooting'?'during':'end','This Soul Grinder has the '+god+' keyword and is equipped with '+weapon+'.');
   }break;
 }
}
