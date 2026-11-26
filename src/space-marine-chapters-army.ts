import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {spaceMarineCards} from './space-marines-card-data';
import {spaceMarineKeywords,spaceMarinePhysicalModels} from './space-marines-keywords';
import {chapterBattleFormations,chapterPartRoster} from './space-marine-chapters-splits';
import {expandRoster,type RosterInstance} from './roster-instances';

const source='https://wahapedia.ru/wh40k11ed/factions/space-marines/';
export function chapterArmyReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 const rows:GeneratedReminder[]=[],groups=chapterBattleFormations(army,roster);
 const emit=(key:string,title:string,window:ReminderWindow,summary:string,units:string[])=>{
  if(units.length)rows.push({id:'11e-chapter-army-'+key+'-'+window,title,window,turn:'either',timing:'during',summary,units,source,origin:'army'});
 };
 const native=roster.filter(s=>spaceMarineKeywords(army,s).has('ADEPTUS ASTARTES'));
 if(army.faction==='Black Templars')emit('heirs','Heirs of Sigismund','Pre-battle','This army cannot include Adeptus Astartes Psyker models. Its Impulsor, Gladiator Lancer, Gladiator Reaper, Gladiator Valiant, Repulsor and Repulsor Executioner use the Black Templars datasheets, equipment and points. The restriction on Astartes Psykers does not exclude an otherwise eligible Assigned Agent Psyker.',native.map(s=>s.id));
 if(army.faction==='Dark Angels'){
  const ravenwing=native.filter(s=>spaceMarineKeywords(army,s).has('RAVENWING'));
  const deathwing=native.filter(s=>spaceMarineKeywords(army,s).has('DEATHWING'));
  emit('ravenwing','The Ravenwing','Pre-battle','Friendly Adeptus Astartes Mounted units and Vehicle units with Fly have Ravenwing. This explicit grant applies to every actual model in the qualifying unit, including its attached models; it does not grant a Chapter keyword. Selected Ravenwing units: '+ravenwing.map(s=>s.id).join(', ')+'.',ravenwing.map(s=>s.id));
  emit('deathwing','The Deathwing','Pre-battle','Friendly Adeptus Astartes Terminator and Dreadnought units, Bladeguard Ancient, Bladeguard Veteran Squad, Sternguard Veteran Squad, Vanguard Veteran Squad With Jump Packs, Land Raider variants, Repulsor and Repulsor Executioner units have Deathwing. Selected Deathwing units: '+deathwing.map(s=>s.id).join(', ')+'. This army keyword grant is separate from a datasheet ability also named Deathwing.',deathwing.map(s=>s.id));
 }
 if(army.faction==='Space Wolves'){
  const cursed=groups.filter(g=>g.members.some(s=>spaceMarineCards(army.faction)[s.unit]?.factionAbilities.includes('Curse of the Wulfen')));
  const actual=groups.flatMap(g=>{
   const context=g.part?chapterPartRoster(g.part,roster):roster,physical=g.part?.physical??g.members.flatMap(squad=>spaceMarinePhysicalModels(squad,army.faction).map(m=>({...m,squad})));
   return physical.map(m=>({s:m.squad,model:m.model,label:g.root.id,keys:spaceMarineKeywords(army,m.squad,m.model,context)}));
  });
  const characters=[...new Set(actual.filter(m=>m.keys.has('SPACE WOLVES')&&m.keys.has('CHARACTER')&&!m.keys.has('WULFEN')).map(m=>m.s.id))];
  const priests=[...new Set(actual.filter(m=>m.keys.has('WOLF PRIEST')).map(m=>m.s.id))];
  for(const g of cursed)for(const window of ['Command','Movement','Shooting','Charge','Fight','End of your turn','End of opponent turn'] as const)emit('wulfen-'+g.root.id,'Curse of the Wulfen',window,g.root.id+': while this unit is not Battle-shocked and is within 6″ of a friendly Space Wolves Character model without Wulfen, or within 12″ of a friendly Wolf Priest model, it has +1 OC if it has Infantry, or +3 OC if it has Vehicle. '+(characters.length?'Current 6″ sources: '+characters.join(', ')+'. ':'')+(priests.length?'Current 12″ sources: '+priests.join(', ')+'. ':'')+'Measure from an actual surviving eligible model on the battlefield; an embarked or destroyed source cannot supply the range.',g.members.map(s=>s.id));
  const wulfen=actual.filter(m=>m.keys.has('WULFEN'));
  emit('bestial-forms','Bestial Forms','Pre-battle','Each actual Wulfen model takes the space of two models in a transport. Include the actual models of attached Leaders and Supports using their own printed keywords. A Hunting Wolf from Wolf Guard Headtakers is a Beast and does not become Infantry by being in a mixed unit. Current affected formations: '+[...new Set(wulfen.map(m=>m.label))].join(', ')+'.',[...new Set(wulfen.map(m=>m.s.id))]);
 }
 return rows;
}
