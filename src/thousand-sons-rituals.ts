import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {PHASES} from './engine';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {RITUAL_BEARERS,THOUSAND_SONS_REVISION,THOUSAND_SONS_SHEETS} from './thousand-sons-data.generated';
import {eligibleThousandSonsUpgrades} from './thousand-sons-detachment-data';
import {thousandSonsMusterUnits} from './thousand-sons-data';

const sheets=new Map(THOUSAND_SONS_SHEETS.map(s=>[s.unit,s]));
const source='https://wahapedia.ru/wh40k11ed/factions/thousand-sons/#Cabal-of-Sorcerers';
const pick=(army:ArmySelection,s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
function fitted(army:ArmySelection,s:RosterInstance,detachment:string,item:string):boolean{
 return pick(army,s)===item&&eligibleThousandSonsUpgrades(army,s.unit,s.id).some(u=>u.name===item&&u.detachment===detachment);
}
function root(army:ArmySelection,s:RosterInstance):string{return knightJoinedBodyguard(army,s)?.id??s.id;}
const casterLabel=(s:RosterInstance)=>!RITUAL_BEARERS[s.unit]||RITUAL_BEARERS[s.unit]===s.unit?s.id:s.id+' ('+RITUAL_BEARERS[s.unit]+' only)';
export function thousandSonsRitualCasters(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):RosterInstance[]{
 if(army.faction!=='Thousand Sons')return [];
 const legal=new Set(thousandSonsMusterUnits(army));
 const barred=new Set(roster.filter(s=>legal.has(s.unit)&&fitted(army,s,'Hexwarp Thrallband','Noctilith Mantle')).map(s=>root(army,s)));
 const hasAura=army.detachments2026?.includes('Changehost of Deceit')&&roster.some(s=>legal.has(s.unit)&&sheets.get(s.unit)?.keywords?.includes('THOUSAND SONS'));
 return roster.filter(s=>{
  const tags=sheets.get(s.unit)?.keywords??[];
  const conditional=hasAura&&tags.includes('SCINTILLATING LEGIONS')&&tags.includes('PSYKER');
  return legal.has(s.unit)&&!barred.has(root(army,s))&&(Object.hasOwn(RITUAL_BEARERS,s.unit)||conditional);
 });
}

export function thousandSonsRitualReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 const casters=thousandSonsRitualCasters(army,roster);
 if(!casters.length)return [];
 const available=new Set(thousandSonsMusterUnits(army));
 const armyUnits=roster.filter(s=>available.has(s.unit)&&sheets.has(s.unit));
 const recipients=[...new Set(armyUnits.map(s=>root(army,s)))];
 const vehicles=armyUnits.filter(s=>sheets.get(s.unit)?.keywords?.includes('VEHICLE')&&sheets.get(s.unit)?.keywords?.includes('THOUSAND SONS'));
 const legions=armyUnits.filter(s=>sheets.get(s.unit)?.keywords?.includes('SCINTILLATING LEGIONS'));
 const beasts=armyUnits.filter(s=>s.unit==='Mutalith Vortex Beast');
 const auraSources=armyUnits.filter(s=>sheets.get(s.unit)?.keywords?.includes('THOUSAND SONS'));
 const contingent=casters.filter(s=>!Object.hasOwn(RITUAL_BEARERS,s.unit));
 const livingNames=casters.filter(s=>Object.hasOwn(RITUAL_BEARERS,s.unit)).map(casterLabel).join(', ');
 const conditionalText=contingent.length?' Mortal Sorcery grants Cabal to '+contingent.map(s=>s.id).join(', ')+' only while within 6″ of and visible to a friendly Thousand Sons formation, such as '+[...new Set(auraSources.map(s=>root(army,s)))].join(', ')+'.':'';
 const casterIds=casters.map(s=>s.id);
 const out:GeneratedReminder[]=[];
 function emit(key:string,title:string,summary:string,ids=casterIds,url=source){
  out.push({id:'11e-ts-cabal-'+key,title,window:'Shooting',timing:'start',turn:'own',origin:'army',source:url,summary,units:ids});
 }
 emit('test','Cabal of Sorcerers · Psychic tests','Resolve one model and one Ritual at a time. Each model normally gets one attempt this turn. A Ritual already attempted by your army is normally unavailable, even if it failed. Roll 2D6, then decide whether to Channel the Warp by adding one D6. Only if you channel and the test contains doubles or triples does the caster’s unit suffer D3 mortal wounds. If the caster survives, compare the total to Warp Charge. Native casters: '+(livingNames||'none')+'.'+conditionalText,casterIds,THOUSAND_SONS_REVISION.pack);
 const rangeNotes: string[]=[];
 for(const s of casters){
  const label=casterLabel(s);
  if(fitted(army,s,'Grand Coven','Lord of Forbidden Lore'))rangeNotes.push(label+' adds 6″ to its Ritual range.');
  if(fitted(army,s,'Hexwarp Thrallband','Empowered Manifestation'))rangeNotes.push(label+' may add 6″ to its Ritual range while the bearer’s formation is wholly within the Flow of Magic.');
  if(fitted(army,s,'Warpforged Cabal','Warp-cursed Runemaster')&&vehicles.length)rangeNotes.push(label+' adds 6″ within 6″ of a friendly Thousand Sons Vehicle ('+vehicles.map(v=>v.id).join(', ')+').');
 }
 const range=(rangeNotes.length?' '+rangeNotes.join(' '):'')+conditionalText;
 emit('ruin','Destiny’s Ruin · Warp Charge 5','Choose a visible enemy within 24″ of the manifesting model. Until phase end, friendly Thousand Sons and Scintillating Legions models re-roll Hit rolls of 1 against it. On a result of 10+, they may re-roll Hit rolls against it instead.'+range);
 emit('surge','Temporal Surge · Warp Charge 6','Choose an unengaged friendly Thousand Sons or Scintillating Legions formation visible within 24″ of the caster. It may make a Normal move of up to D6″, or up to 6″ on a result of 10+. The recipient cannot charge for the rest of this turn. Eligible formations: '+recipients.join(', ')+'.'+range);
 emit('bolt','Doombolt · Warp Charge 7','A visible enemy within 24″ of the caster suffers D3 mortal wounds, or D3+3 on a result of 11+. An unattached Lone Operative must also be within 12″ of the caster.'+range);
 emit('twist','Twist of Fate · Warp Charge 9','Choose a visible enemy within 24″ of the caster. Friendly Thousand Sons and Scintillating Legions attacks against it improve AP by 1 for this phase, or by 2 on a result of 12+.'+range);
 out.push({id:'11e-ts-cabal-surge-charge',title:'Temporal Surge · Charge restriction',window:'Charge',turn:'own',timing:'during',summary:'If a formation received Temporal Surge this turn, it cannot declare a charge for the rest of the turn.',units:recipients,origin:'army',source});
 for(const s of casters){
  const notes:string[]=[];
  if(s.unit==='Magnus The Red')notes.push('Magnus can attempt two different Rituals in a turn and adds 2 to each Psychic test.');
  if(s.unit==='Ahriman')notes.push('Ahriman adds 1 to each of his Psychic tests.');
  if(s.unit==='Exalted Sorcerer'&&fitted(army,s,'Grand Coven','Incandaeum'))notes.push('Once per battle, select Doombolt for this bearer even if another model has already attempted it this phase.');
  if(s.unit==='Tzaangor Shaman'&&fitted(army,s,'Warpmeld Pact','Warpmeld Dagger'))notes.push('Before determining the total, the bearer may suffer D3 mortal wounds. If it survives, add the wounds suffered to this test.');
  if(fitted(army,s,'Warpforged Cabal','Warp Syphon')&&vehicles.length)notes.push('If a listed friendly Thousand Sons Vehicle is within 6″ when this bearer channels, after rolling the extra D6 and before checking for doubles or triples, deal 1 mortal wound to one such vehicle to re-roll the extra die. Eligible Vehicles: '+vehicles.map(v=>v.id).join(', ')+'.');
  if(fitted(army,s,'Changehost of Deceit','Diabolic Savant')&&legions.length)notes.push('If the bearer channels within 6″ of a friendly Scintillating Legions unit, add 1 to the test. Eligible allies: '+legions.map(v=>v.id).join(', ')+'.');
  if(notes.length)emit('caster-'+s.id,s.id+' · Rituals',notes.join(' '),[s.id],sheets.get(s.unit)!.source);
 }
 if(beasts.length&&livingNames)emit('flare','Mutalith Vortex Beast · Immaterial Flare','A friendly Thousand Sons Psyker that channels within 6″ of one of these beasts may apply +1 to the Psychic test. This modifier does not stack with any other Psychic test modifier. Beasts: '+beasts.map(s=>s.id).join(', ')+'.',casters.filter(s=>Object.hasOwn(RITUAL_BEARERS,s.unit)).map(s=>s.id),THOUSAND_SONS_REVISION.pack);
 for(const prince of casters.filter(s=>s.unit==='Daemon Prince of Tzeentch')){
  const targets=armyUnits.filter(s=>s.id!==prince.id&&Object.hasOwn(RITUAL_BEARERS,s.unit));
  if(!targets.length)continue;
  for(const phase of PHASES)out.push({id:'11e-ts-snare-'+prince.id+'-'+phase,title:prince.id+' · Spirit Snare',window:phase,timing:'during',turn:'either',origin:'unit',source:sheets.get(prince.unit)!.source,units:[prince.id],
   summary:'When a friendly Thousand Sons Psyker model with Cabal of Sorcerers is destroyed within 9″ of one or more Spirit Snare models, choose one such Prince. Its future Psychic tests gain a cumulative +1, capped at +2, for the rest of the battle. Eligible other models: '+targets.map(casterLabel).join(', ')+'.'});
 }
 return out;
}
