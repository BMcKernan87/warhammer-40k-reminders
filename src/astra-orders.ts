import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {PHASES} from './engine';
import {ASTRA_CARDS,ASTRA_PACK} from './astra-militarum-data';
import {ASTRA_OFFICERS} from './astra-militarum-data.generated';
import {astraMilitarumKeywords} from './astra-muster-data';
import {astraFormationGroups,astraTransportOptions} from './astra-transports';
import {astraMilitarumWeaponCount} from './astra-militarum-loadouts';
import {expandRoster,type RosterInstance} from './roster-instances';

const source='https://wahapedia.ru/wh40k11ed/factions/astra-militarum/#Voice-of-Command';
const effects:Readonly<Record<string,string>>={
 'Move! Move! Move!':'+3″ Move',
 'Fix Bayonets!':'+1 Weapon Skill',
 'Take Aim!':'+1 Ballistic Skill',
 'First Rank, Fire! Second Rank, Fire!':'+1 Attack for Rapid Fire weapons',
 'Take Cover!':'improve Save by 1, to a best of 3+',
 'Duty and Honour!':'improve Leadership and Objective Control by 1',
 'Target Weak Spot':'improve the AP of ranged attacks against enemies within 12″ by 1',
 'On My Signal!':'only an Armoured Skirmisher may receive this Order. Once per turn after an enemy finishes a Normal move or Advance within 8″, the recipient may make a Normal move of up to D6″',
 'Move to the Shadows':'while targeted by a ranged attack, gain Stealth until those attacks finish',
};
const hasDet=(army:ArmySelection,name:string)=>army.detachments2026?.includes(name)??false;
const upgrade=(army:ArmySelection,s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
const abhumans=new Set(['Bullgryn Squad','Ogryn Squad','Ratlings']);
const normalize=(s:string)=>s.toUpperCase().replace(/['’]/g,'');
function officerProfile(army:ArmySelection,s:RosterInstance){
 if(army.faction!=='Astra Militarum'||!Object.hasOwn(ASTRA_CARDS,s.unit))return;
 const tags=astraMilitarumKeywords(army,s),pick=upgrade(army,s);
 const promoted=hasDet(army,'Steel Hammer')&&pick==='Battalion Commander'&&tags.has('TITANIC')&&tags.has('CHARACTER');
 const profile=promoted?{count:2,targets:['TITANIC','SQUADRON'],choices:undefined}:ASTRA_OFFICERS[s.unit];
 if(!profile)return;
 const targets=new Set(profile.targets.map(normalize)),choices=new Set(profile.choices??Object.keys(effects).slice(0,6));
 const grizzled=hasDet(army,'Grizzled Company');
 if(hasDet(army,'Armoured Infantry')){
  targets.add('SQUADRON');
  if(!profile.choices)choices.add('On My Signal!');
 }
 if(grizzled&&pick==='Abhuman Detail')targets.add('OGRYN');
 const abhuman=hasDet(army,'Abhuman Auxiliaries')&&tags.has('COMMISSAR');
 if(abhuman)choices.add('Take Aim!');
 if(grizzled&&pick==='Aquilan Eye')choices.add('Target Weak Spot');
 if(grizzled&&pick==='Spec Ops Veteran')choices.add('Move to the Shadows');
 const base=profile.count+(grizzled?1:0);
 return {base,targets,choices,abhuman};
}

export function astraOrderModes(army:ArmySelection,officer:RosterInstance):readonly string[]{
 return [...(officerProfile(army,officer)?.choices??[])];
}

export function astraOrderTargets(army:ArmySelection,officer:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):RosterInstance[]{
 const profile=officerProfile(army,officer);
 if(!profile||!roster.some(s=>s.id===officer.id&&s.unit===officer.unit))return [];
 return astraFormationGroups(army,[...roster]).filter(g=>{
  if(!g.members.some(s=>Object.hasOwn(ASTRA_CARDS,s.unit)))return false;
  return g.members.some(s=>[...astraMilitarumKeywords(army,s)].some(tag=>profile.targets.has(normalize(tag)))||profile.abhuman&&abhumans.has(s.unit));
 }).map(g=>g.root);
}

export function astraOrderReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Astra Militarum')return [];
 const groups=astraFormationGroups(army,[...roster]);
 const cargo=astraTransportOptions(army,[...roster]);
 const out:GeneratedReminder[]=[];
 type Turn=NonNullable<GeneratedReminder['turn']>;
 function emit(id:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,units:string[],url=source){
  if(units.length)out.push({id:'11e-guard-order-'+id+'-'+window+'-'+turn,title,window,turn,timing,summary,units,origin:'army',source:url});
 }
 const orderable=new Set<string>();
 const arrivals:string[]=[];
 for(const s of roster){
  const profile=officerProfile(army,s);
  if(!profile)continue;
  const targets=astraOrderTargets(army,s,roster),ids=targets.map(t=>t.id);
  if(!ids.length)continue;
  for(const id of ids)orderable.add(id);
  const group=groups.find(g=>g.members.some(m=>m.id===s.id));
  if(!group)continue;
  const gear=(name:string)=>group.members.some(m=>astraMilitarumWeaponCount(m,name)>0);
  const choice=upgrade(army,s);
  const range=gear('Master vox')?24:['Leman Russ Commander','Rogal Dorn Commander'].includes(s.unit)||hasDet(army,'Grizzled Company')&&choice==='Laud Hailer'?12:6;
  const menu=[...profile.choices].map(name=>name+' ('+effects[name]+')').join('. ')+'.';
  const count=profile.base+' Order'+(profile.base===1?'':'s')+' per battle round';
  const order= 'Within '+range+'″, issue an Order to an eligible friendly formation. Only Astra Militarum models benefit. Eligible formations: '+ids.join(', ')+'. ';
  const exception=hasDet(army,'Combined Arms')&&choice==='Grand Strategist'?' In your Command phase, this bearer can issue one additional Order.':'';
  const abhuman=profile.abhuman?' The detachment permits this Commissar to issue one Order to an Abhuman unit.':'';
  const servo=s.unit==='Krieg Command Squad'&&gear('Servo-scribes')?' Once per battle, while issuing an Order, the Lord Commissar can issue one additional Order using the servo-scribes.':'';
  const bridge=hasDet(army,'Bridgehead Strike')&&choice==='Bombast-class Vox-array'&&gear('Master vox')?' The fitted vox-array can issue the same Order to up to three eligible Regiment units.':'';
  const issue='This Officer can issue '+count+'. '+order+menu+abhuman+servo+bridge;
  emit(s.id+'-command',s.id+' · Voice of Command','Command','own','during',issue+exception,ids);
  arrivals.push(s.id+' (up to '+profile.base+' per round, '+range+'″) → '+ids.join(', ')+'.');
  const chimeras=cargo.filter(c=>c.transport.unit==='Chimera'&&c.passengers.includes(group.root.id));
  if(chimeras.length)emit(s.id+'-embarked','Mobile Command Vehicle · '+s.id,'Command','own','during','If this Officer is embarked in a listed Chimera, one Officer aboard that transport can issue Orders during your Command phase. Measure the '+range+'″ distance from the Chimera. Eligible carriers: '+chimeras.map(c=>c.transport.id).join(', ')+'. '+order,ids);
  if(s.unit==='Commissar Yarrick')emit(s.id+'-decisive','Commissar Yarrick · Decisive Command','Command','own','during','If Decisive Command is the selected Hero of Hades Hive ability, issue Yarrick’s next Order within 12″. If it is your army’s first Order this Command phase, every other eligible friendly unit within 6″ of the recipient also receives it.',ids,ASTRA_PACK);
  if(s.unit==='Commissar Graves'){
   const regiments=targets.filter(t=>groups.find(g=>g.root.id===t.id)?.members.some(m=>astraMilitarumKeywords(army,m).has('REGIMENT')));
   const riding=regiments.filter(t=>cargo.some(c=>c.passengers.includes(t.id)));
   emit(s.id+'-mechanised','Commissar Graves · Mechanised Spearhead','Movement','own','during','After an eligible friendly Regiment disembarks from a transport within 6″ of Graves, she can issue one Order to that Regiment regardless of her normal allowance.',riding.map(r=>r.id),ASTRA_PACK);
  }
 }
 if(!orderable.size)return out;
 const recipients=[...orderable];
 for(const phase of PHASES)emit('arrival','Voice of Command · After arrival',phase,'either','end','An Officer that disembarked or was set up this phase may issue Orders using its remaining round allowance. Use that Officer’s available Orders and normal target restrictions. '+arrivals.join(' '),recipients);
 emit('duration','Voice of Command · Duration','Command','own','start','Orders normally expire at the start of this phase. A new Order replaces the unit’s previous one unless a rule permits multiple different Orders. A Battle-shocked unit cannot receive an Order and normally loses its existing Order when it becomes Battle-shocked.',recipients);
 for(const {root,members} of groups){
  if(!orderable.has(root.id))continue;
  const unitList=[root.id];
  if(members.some(s=>s.unit==='Field Ordnance Battery'))emit(root.id+'-rearm','Field Ordnance Battery · Rearm, Reload, Fire','Shooting','own','during','If this formation is under an Order and remained stationary this turn, its Heavy weapons gain Sustained Hits 1.',unitList);
  if(members.some(s=>s.unit==='Cadian Recon Squad'))emit(root.id+'-independent','Cadian Recon Squad · Independent Operatives','Command','own','start','Keep this formation’s existing Order through the start of the Command phase. It ends when replaced, when the unit becomes Battle-shocked, or at battle end.',unitList);
  if(members.some(s=>s.unit==='Krieg Command Squad'))for(const phase of PHASES)emit(root.id+'-grim','Krieg Command Squad · Retain Orders',phase,'either','during','While this formation contains its Officer, becoming Battle-shocked does not cancel its existing Orders.',unitList);
  if(members.some(s=>s.attachedTo===root.id&&(s.unit==='Ursula Creed'||s.unit==='Militarum Tempestus Command Squad'&&astraMilitarumWeaponCount(s,'Command rod')>0)))emit(root.id+'-two','Two simultaneous Orders','Command','own','during','While this formation is led by the listed Commander, it can be affected by two different Orders at the same time.',unitList);
 }
 const recon=roster.filter(s=>s.unit==='Cadian Recon Squad'&&astraMilitarumWeaponCount(s,'Vox-relay beacon')>0);
 if(recon.length){
  const relays=groups.filter(g=>orderable.has(g.root.id)&&g.members.some(m=>astraMilitarumKeywords(army,m).has('REGIMENT'))).map(g=>g.root.id);
  emit('beacon','Vox-relay Beacon','Pre-battle','either','start','At battle start you may set up a beacon for each equipped squad outside the enemy deployment zone. Officers may issue Orders to an otherwise eligible Regiment within 6″ of a beacon as if the Officer were within 6″. Remove the token at a phase end if an enemy is within 1″.',relays,ASTRA_PACK);
 }
 return out;
}
