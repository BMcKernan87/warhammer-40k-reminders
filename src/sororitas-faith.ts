import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {SORORITAS_ACTS_OF_FAITH_UNITS,SORORITAS_REVISION,SORORITAS_SHEETS} from './sororitas-data.generated';
import {eligibleSororitasUpgrades} from './sororitas-detachment-data';
import {sororitasMusterUnits} from './sororitas-army-data';
import {sororitasModelLoadouts,sororitasWeaponCount} from './sororitas-loadouts';
import {sororitasFormations} from './sororitas-transports';
import {expandRoster,type RosterInstance} from './roster-instances';

const faith=new Set<string>(SORORITAS_ACTS_OF_FAITH_UNITS);
const cards=new Map(SORORITAS_SHEETS.map(s=>[s.unit,s]));
const source='https://wahapedia.ru/wh40k11ed/factions/adepta-sororitas/#Acts-of-Faith';
type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const steps:readonly {step:Step;rolls:string}[]=[
 {step:['Command','either','during'],rolls:'a Battle-shock test'},
 {step:['Movement','own','during'],rolls:'an Advance roll, a Battle-shock test (including Desperate Escape), or a saving throw against enemy Overwatch'},
 {step:['Movement','opponent','during'],rolls:'a Battle-shock test, or a Hit, Wound or Damage roll while shooting Overwatch'},
 {step:['Shooting','own','during'],rolls:'a Hit, Wound or Damage roll, a Battle-shock test, or a saving throw against permitted enemy reaction shots'},
 {step:['Shooting','opponent','during'],rolls:'a Battle-shock test, a saving throw, or a Hit, Wound or Damage roll if another rule allows this formation to shoot'},
 {step:['Charge','either','during'],rolls:'a Battle-shock test or a Charge roll, including one made for a permitted Heroic Intervention'},
 {step:['Fight','either','during'],rolls:'a Hit, Wound or Damage roll, a saving throw, or a Battle-shock test'}
];
const key=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');

export function sororitasFaithFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Adepta Sororitas')return [];
 const legal=new Set(sororitasMusterUnits(army));
 return sororitasFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))&&g.members.some(s=>faith.has(s.unit)));
}

export function sororitasFaithReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 const groups=sororitasFaithFormations(army,roster);
 if(!groups.length)return [];
 const result:GeneratedReminder[]=[],native=groups.flatMap(g=>g.members.filter(s=>faith.has(s.unit)));
 const ids=groups.flatMap(g=>g.members.map(s=>s.id));
 const names=groups.map(g=>g.root.id).join(', ');
 const double=army.detachments2026?.includes('Army of Faith');
 const triumph=native.filter(s=>s.unit==='Triumph Of Saint Katherine');
 const emit=(id:string,title:string,[window,turn,timing]:Step,summary:string,units=ids,link=source)=>result.push({id:'11e-sororitas-faith:'+id+':'+window+':'+turn,title,window,turn,timing,summary,units:[...new Set(units)],origin:'army' as const,source:link});
 const pool='Roll one D6 for each newly gained Miracle die and keep its rolled value in the pool, unless a specific rule changes that value.';
 emit('turn','Acts of Faith · Gain a Miracle die',['Start of turn','either','start'],'At the start of each player’s turn, gain one Miracle die. '+pool+(triumph.length?' At the start of your own turn, if '+triumph.map(s=>s.id).join(' or ')+' is on the battlefield, Solemn Procession makes that start-of-turn die a 6 instead of rolling. This does not change the opponent-turn die.':''),ids,SORORITAS_REVISION.pack);
 for(const phase of PHASES)emit('loss','Acts of Faith · A unit is destroyed',[phase,'either','during'],'Each time an Adepta Sororitas unit from your army is destroyed, gain one Miracle die. An attached formation triggers this only when its last model is destroyed, rather than separately for each Bodyguard, Leader or Support component. If an Immolator split it into two units, each half is now a separate unit: destroying all models in one half grants its own die without waiting for the other half. '+pool,ids,SORORITAS_REVISION.pack);
 const cap=double?'Sacred Rites allows up to two Acts of Faith per formation per phase.':'Each formation can perform one Act of Faith per phase.';
 const chalice=triumph.length?' If '+triumph.map(s=>s.id).join(' or ')+' selected Simulacrum of the Ebon Chalice for this battle round, a friendly Adepta Sororitas formation within 6″ can perform up to two Acts of Faith per phase. This is a limit of two, not an additional two.':'';
 const rhetoric=groups.filter(g=>g.members.some(s=>s.unit==='Dialogus'&&s.id!==g.root.id)).map(g=>g.root.id);
 const dialogus=rhetoric.length?' While the attached Dialogus survives in '+rhetoric.join(', ')+', Stirring Rhetoric first changes the Miracle die used for that formation’s Act of Faith to 6. After an Immolator split, this benefits only the half actually containing that Dialogus.':'';
 for(const {step,rolls} of steps)emit('use','Acts of Faith · Substitute one die',step,
  'Before rolling '+rolls+' for an eligible formation ('+names+'), you may spend one Miracle die and use its stored value as an unmodified roll. '+cap+' The allowance is shared by its attached members while a native model supplies Acts of Faith. If the last native source is destroyed by an attack, keep its effect until that attacking unit finishes; after that, an agent left without such a source cannot use it. After an Immolator split, the two resulting halves are separate units with separate phase allowances. For a roll using multiple dice, such as a Charge roll or Battle-shock test, substitute only one die and roll the rest. The spent die is removed. You may use a Miracle die in a re-roll, but a substituted die from the original roll is lost and the original Act of Faith still counts.'+chalice+dialogus);
 const triptychs=native.filter(s=>{
  const chosen=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
  return chosen==='Triptych of the Macharian Crusade'&&eligibleSororitasUpgrades(army,s.unit,s.id).some(u=>u.name===chosen);
 });
 for(const s of triptychs)for(const step of [['Movement','own','end'],['Shooting','opponent','during'],['Shooting','own','during'],['Fight','either','during']] as const)
  emit(s.id+'-triptych','Acts of Faith · Triptych of the Macharian Crusade',step,'When '+s.id+'’s enhancement bearer uses an Act of Faith for its own saving throw, the save automatically succeeds regardless of the substituted Miracle die’s value. Spend that die and count this Act of Faith against the formation’s phase allowance.',[s.id]);
 const symbols=native.filter(s=>sororitasWeaponCount(s,'Simulacrum imperialis')>0);
 if(symbols.length){
  const bearers=symbols.map(s=>{
   const ordinal=new Map<string,number>();
   const selected=sororitasModelLoadouts(s).flatMap(m=>{
    const n=(ordinal.get(m.model)??0)+1;ordinal.set(m.model,n);
    return m.items.some(i=>key(i)===key('Simulacrum imperialis'))?[m.model+' '+n]:[];
   });
   return s.id+' ('+selected.join(', ')+')';
  });
  emit('simulacrum','Simulacrum Imperialis',['Command','own','end'],'At the end of your Command phase, roll one D6 for each objective you control that has at least one unit with a surviving Simulacrum Imperialis bearer within range. On 4+, gain one Miracle die showing that exact result. Roll once per objective, even if several bearer units are there. If split, only the half containing the actual bearer has this ability. Equipped bearers: '+bearers.join('; ')+'.',symbols.map(s=>s.id),cards.get(symbols[0].unit)!.source);
 }
 for(const s of native){
  const uses=s.unit==='Retributor Squad'?2:['Battle Sisters Squad','Dominion Squad','Sanctifiers'].includes(s.unit)?1:0;
  if(!uses)continue;
  const group=groups.find(g=>g.members.some(m=>m.id===s.id))!;
  const split=['Battle Sisters Squad','Dominion Squad'].includes(s.unit)&&roster.some(m=>m.unit==='Immolator');
  for(const phase of PHASES)emit(s.id+'-cherub',uses===2?'Cherubs':'Cherub',[phase,'either','during'],
   (uses===2?'Twice':'Once')+' per battle for '+s.id+', while an original model from this squad remains, after its formation performs an Act of Faith, gain one Miracle die and roll its value. This does not refund the spent die or reset the formation’s Act of Faith allowance.'+(split?' If this squad is split for an Immolator, nominate just one resulting half to retain this Cherub; the other half cannot use it.':''),group.members.map(m=>m.id),cards.get(s.unit)!.source);
 }
 return result;
}
