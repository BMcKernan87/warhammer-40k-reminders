import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {ASTRA_PACK,ASTRA_SHEETS} from './astra-militarum-data';
import {astraMilitarumHasRangedWeapon,astraMilitarumWeaponCount} from './astra-militarum-loadouts';
import {astraProfileReminders} from './brood-brother-profiles';
import {sharedGuardNamedReminders} from './brood-brother-reminders';
import {broodBrotherSpecialReminders} from './brood-brother-special';
import {guardCardContext,type GuardCardContext} from './guard-card-context';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(ASTRA_SHEETS.map(s=>[s.unit,s]));
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
const incomingRanged=[['Shooting','opponent'],['Movement','own'],['Shooting','own'],['Movement','opponent']] as const;
const incomingAttacks=[['Shooting','opponent'],['Fight','either'],['Movement','own'],['Shooting','own'],['Movement','opponent']] as const;
const sameMember=(a:RosterInstance,b:RosterInstance)=>a.id===b.id&&a.unit===b.unit&&a.attachedTo===b.attachedTo&&a.retinueTo===b.retinueTo;
const hasModels=(s:RosterInstance)=>(s.models??1)>0;

function nativeGuardPersonal(army:ArmySelection,{guards,groups,tags}:GuardCardContext,roster:readonly RosterInstance[]):GeneratedReminder[]{
 const result:GeneratedReminder[]=[];
 const original=expandRoster(army),originalContext=guardCardContext(army,original);
 const originalById=new Map(original.map(s=>[s.id,s])),currentById=new Map(roster.map(s=>[s.id,s]));
 const legalOriginal=(s:RosterInstance)=>hasModels(s)&&!s.retinueTo&&(!s.attachedTo||Boolean(knightJoinedBodyguard(army,s)));
 const originalVehicles=originalContext.guards.filter(s=>originalContext.tags(s).has('ASTRA MILITARUM')&&originalContext.tags(s).has('VEHICLE')&&legalOriginal(s));
 const survivingVehicles=originalVehicles.flatMap(s=>{
  const current=guards.find(m=>hasModels(m)&&sameMember(s,m));
  return current?[current]:[];
 });
 const roots=groups.map(g=>g.body.id);
 const tagged=(tag:string)=>groups.filter(g=>g.members.some(m=>tags(m).has(tag)));
 const regiments=tagged('REGIMENT').map(g=>g.body.id),vehicles=guards.filter(s=>tags(s).has('VEHICLE')).map(s=>s.id);
 const livingVehicles=guards.filter(s=>hasModels(s)&&tags(s).has('VEHICLE')).map(s=>s.id);
 const infantry=tagged('INFANTRY'),groupSize=(members:RosterInstance[])=>members.reduce((n,m)=>n+(m.models??sheets.get(m.unit)?.sizes[0]??1),0);
 const sources=guards.filter(s=>s.unit==='Avenger Strike Fighter');
 function emit(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:string[],source:string){
  if(units.length)result.push({id:['11e-native-guard',key,title,window,turn].join(':'),title,window,turn,timing,summary,units:[...new Set(units)],source,origin:'unit'});
 }
 if(sources.length&&roots.length>1)emit('avengers','Fiery Vengeance','Shooting','opponent','during','Once per turn across all Avengers, if an enemy unit that can Fly destroys another friendly Astra Militarum unit within 6″ of an Avenger, after the attacker finishes one eligible Avenger may shoot that attacker. The attacker must be a legal target. Avenger sources: '+sources.map(s=>s.id).join(', ')+'.',[...sources.map(s=>s.id),...roots],ASTRA_PACK+'#page=26');
 for(const squad of guards){
  const {id,unit}=squad,g=groups.find(group=>group.members.some(m=>m.id===id));
  if(!g)continue;
  const source=sheets.get(unit)!.source;
  const led=knightJoinedBodyguard(army,squad);
  const formation=[...new Set([id,g.body.id])];
  const hasGun=g.members.some(astraMilitarumHasRangedWeapon);
  function add(title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets=[id],page?:number){
   emit(id,title,window,turn,timing,summary,targets,page?ASTRA_PACK+'#page='+page:source);
  }
  if(unit==='Commissar'){
   const friendly=infantry.map(group=>group.body.id);
   for(const phase of phases)add('Summary Execution',phase,'either','start','Once per battle round, choose a Battle-shocked friendly Astra Militarum Infantry unit within 12″. Destroy one model in it, then remove its Battle-shocked status.',[id,...friendly]);
   if(g.members.some(m=>m.id!==id&&tags(m).has('OFFICER')))for(const phase of phases)add('Political Overwatch',phase,'either','during','While another Officer model remains in this formation, you may re-roll its Battle-shock tests.',formation);
  }
  if(unit==='Militarum Tempestus Command Squad'&&hasGun)add('Tempestor Prime','Shooting','own','during','While the Tempestor Prime survives, the formation’s ranged weapons have Sustained Hits 1. Each Critical Hit scores one additional hit.',formation);
  if(unit==='Ogryn Squad')for(const [window,turn,timing] of [['Shooting','own','during'],['Movement','opponent','end']] as const)add('Point-blank Barrage',window,turn,timing,'Against the closest eligible target, improve the AP of this formation’s ranged attacks by 1.',formation);
  if(unit==='Bullgryn Squad')for(const [window,turn,timing] of [['Shooting','opponent','during'],['Movement','own','end'],['Fight','either','during']] as const)add('Wall of Muscle',window,turn,timing,'Subtract 1 from the Damage characteristic of an attack allocated to a model in this formation, including a legally attached model.',formation);
  if(unit==='Ratlings'||unit==='Sly Marbo'){
   const name=unit==='Ratlings'?'Shoot Sharp and Scarper':'Like Fighting a Shadow';
   add(name,'Shooting','own','during','After shooting in your Shooting phase, if unengaged this unit may make a Normal move. If it moves, it cannot declare a charge this turn.',formation);
   add(name,'Charge','own','during','If the unit used its post-shooting Normal move this turn, it cannot declare a charge.',formation);
  }
  if(unit==='Ratlings'){
   if(astraMilitarumWeaponCount(squad,'Ratling Battlemutt'))add('Ratling Battlemutt','Shooting','own','during','Once per battle when this formation is selected to shoot, grant its ranged weapons Lethal Hits until the phase ends. Critical Hits wound automatically.',formation);
   if(astraMilitarumWeaponCount(squad,'Demolition gear'))add('Demolition Gear','Shooting','own','during','While its demolition-gear bearer survives, this formation has Grenades and may use the Explosives Stratagem if otherwise eligible.',formation);
  }
  if(unit==='Nork Deddog'||unit==='Ogryn Bodyguard'){
   const officers=g.members.filter(m=>m.id!==id&&tags(m).has('OFFICER'));
   if(officers.length){
    const models=officers.map(s=>{
     const labels=Object.entries(sheets.get(s.unit)?.modelKeywords??{}).filter(([,keywords])=>keywords.includes('OFFICER')).map(([name])=>name);
     return s.id+(labels.length?' ('+labels.join(', ')+')':'');
    }).join(', ');
    for(const phase of phases)add('Ogryn Bodyguard',phase,'either','during','While this protector and an Officer remain in the same formation, only its Officer models gain Feel No Pain 4+. Eligible Officers: '+models+'.',[id,...officers.map(s=>s.id)]);
   }
   if(unit==='Nork Deddog'&&g.members.some(m=>tags(m).has('COMMAND SQUAD')))add('Thunderous Head-butt','Fight','either','during','When Nork’s formation is selected to fight, choose an enemy engaged with Nork himself. Roll a D6: on 2–5 it suffers D3 mortal wounds, or on 6 D3+3 mortal wounds.');
  }
  if(unit==='Ministorum Priest'){
   if(led)add('War Hymns','Fight','either','during','While the Priest leads this formation, all its melee weapons have Sustained Hits 1. A Critical Hit scores one extra hit.',formation);
   add('Holy Piety','Fight','either','during','If the Priest’s unit is not Battle-shocked, you may re-roll the Hit roll for the Priest’s own melee attacks.');
  }
  if(unit==='Tech-Priest Enginseer'&&vehicles.length){
   const originalSource=originalById.get(id);
   if(hasModels(squad)&&livingVehicles.length&&originalSource&&sameMember(originalSource,squad)&&legalOriginal(originalSource)){
    for(const [window,turn] of incomingRanged)add('Enginseer',window,turn,'during','While this Enginseer is unattached and within 3″ of a friendly Astra Militarum Vehicle unit, the bearer has Lone Operative: enemy models outside 12″ cannot see this bearer or target it with Indirect Fire. This personal protection does not extend to attached models. Nearby Vehicle candidates: '+livingVehicles.join(', ')+'.',[id,...livingVehicles]);
    add('Omnissiah’s Blessing','Command','own','during','Choose one friendly Astra Militarum Vehicle model within 3″. It recovers up to D3 lost wounds and gains a 4+ invulnerable save until the start of your next Command phase. A vehicle model can receive this ability only once per turn.',[id,...livingVehicles]);
   }
   add('Vengeance for the Omnissiah','Fight','either','during','Once a friendly Astra Militarum Vehicle model has been destroyed within 12″ of this Enginseer, its own Enginseer axe has 6 Attacks for the rest of the battle.',[id,...vehicles]);
  }
  if(unit==='Sly Marbo'&&regiments.length)add('One-man Army','Shooting','opponent','during','Once per turn when an enemy makes a ranged attack targeting a friendly Regiment unit within 3″ of Marbo, Marbo may shoot after that enemy finishes. His only target is that attacker, if eligible.',[id,...regiments]);
  if(unit==='Gaunt’s Ghosts'){
   add('Covert Stealth Team','End of opponent turn','opponent','end','If unengaged, the Ghosts may leave for Strategic Reserves. They then gain Deep Strike until your next Shooting phase starts and must make an ingress move in your next Movement phase.',[id],24);
   add('Covert Stealth Team','Movement','own','during','If the Ghosts withdrew at the end of the enemy turn, they must arrive now, even in your first turn. Their temporary Deep Strike permits placement more than 8″ horizontally from every enemy unit.',[id],24);
  }
  if(unit==='Lord Solar Leontus'){
   add('The Lord Solar','Command','own','start','If Leontus is on the battlefield, gain 1CP.');
   add('The Collegiate Astrolex','Pre-battle','either','end','After both armies deploy, redeploy up to three Astra Militarum formations. You may put them into Strategic Reserves regardless of how many units are already there.',[id,...roots]);
  }
  if(unit==='Ursula Creed'&&regiments.length)for(const phase of phases)add('Tactical Genius',phase,'either','during','Once per battle round when a friendly Regiment unit within 12″ of Creed is targeted by a Stratagem, reduce that use by 1CP, to a minimum of 0CP.',[id,...regiments]);
  if(unit==='Tempestus Scions'){
   const text='Re-roll Wound rolls of 1 for this formation’s attacks. Against an enemy within range of an objective marker, you may instead re-roll the whole Wound roll.';
   for(const [window,turn,timing] of [['Shooting','own','during'],['Movement','opponent','end'],['Fight','either','during']] as const)add('Storm Troopers',window,turn,timing,text,formation);
  }
  if(unit==='Tempestus Aquilons'){
   add('Precision Drop','Movement','own','during','When using Deep Strike in your own Movement phase, you may instead set the unit up more than 6″ horizontally from all enemies. If you use this placement it cannot declare a charge this turn.',[id],24);
   add('Precision Drop','Charge','own','during','If the Aquilons used their closer Precision Drop this turn, they cannot declare a charge.',[id],24);
   const weapon=['Sentry flamer','Sentry grenade launcher','Sentry hot-shot volley gun'].find(name=>astraMilitarumWeaponCount(squad,name)>0);
   if(weapon)for(const [turn,timing] of [['own','during'],['opponent','end']] as const)add('Servo-sentry','Movement',turn,timing,'After this unit sets up using Deep Strike'+(turn==='opponent'?' via Rapid Ingress':'')+', the Tempestor Aquilon may immediately shoot only its equipped '+weapon+'.',[id],24);
  }
  if(unit==='Lord Marshal Dreir'||unit==='Commissar Yarrick'){
   const dreir=unit==='Lord Marshal Dreir';
   for(const phase of phases)add(dreir?'Tough to Kill':'Will of Iron',phase,'either','end','The first time this model is destroyed, roll one D6 at the end of that phase. On 2+, return it as close as possible to where it died, outside Engagement Range, with '+(dreir?'D3':'3')+' wounds.',[id],dreir?undefined:13);
   if(dreir)add('Leading the Charge','Fight','either','during','If this formation made a charge move this turn, its melee weapons have Devastating Wounds until the turn ends. A Critical Wound inflicts mortal damage on a single model.',formation);
  }
  if(unit==='Commissar Yarrick'){
   add('Hero of Hades Hive','Command','own','during','Choose Counterstrategist, Decisive Command or Inspiring Hero. Yarrick has the selected ability until your next Command phase starts.',[id],13);
   if(regiments.length)add('Counterstrategist','Movement','opponent','end','If selected, choose an enemy that set up or ended a move within 8″ of Yarrick and a friendly Regiment visible and within 6″ of him. It must not have made a Normal move or been targeted by Fire Overwatch this phase. Choose one response: a Normal move up to D6″, shoot that eligible enemy (only unmodified 6s hit), or surge up to D6″ toward the closest non-Aircraft enemy. A surge requires an unengaged unit that is not Battle-shocked and has not already surged this phase. The September v1.3 faction pack gives the surge option. The November export of the v1.2 app card lists a charge.',[id,...regiments],14);
   for(const phase of phases)add('Inspiring Hero',phase,'either','during','If Yarrick selected this aura, re-roll Leadership and Battle-shock tests for friendly Astra Militarum units within 6″ of him.',[id,...roots],14);
  }
  if(unit==='Commissar Graves'||unit==='Commissar Graves on Foot'){
   const mounted=unit==='Commissar Graves',targets=infantry.filter(group=>groupSize(group.members)>1).map(group=>group.body.id);
   if(targets.length)for(const phase of phases)add('Brutal Disciplinarian',phase,'either','start','Once per turn, choose a Battle-shocked friendly Astra Militarum Infantry unit of at least two surviving models '+(mounted?'visible to Graves and within 24″.':'within 12″ of Graves.')+' Destroy one of its models, then it ceases to be Battle-shocked.',[id,...targets],mounted?15:17);
   if(mounted&&astraMilitarumWeaponCount(squad,'Aquiline Prow'))add('Aquiline Prow','Charge','either','during','After its charge move, choose one enemy engaged with this vehicle. On a D6 roll of 2–3 inflict D3 mortal wounds, on 4–5 inflict 3, and on 6 inflict D3+3.',[id],15);
   if(!mounted)for(const window of ['Movement','Shooting','Charge'] as const)add('Icon of Discipline',window,'own','during','This formation remains eligible to shoot and declare a charge after it Falls Back this turn.',formation,17);
  }
 }
 // The selected model's timed save is independent of the Enginseer's survival.
 // Use original legal identities so new or repurposed roster entries cannot
 // inherit an earlier selection. These IDs are the existing follow-up IDs.
 for(const source of originalContext.guards.filter(s=>s.unit==='Tech-Priest Enginseer'&&legalOriginal(s))){
  const currentSource=currentById.get(source.id);
  if(currentSource&&!sameMember(source,currentSource))continue;
  if(!survivingVehicles.length)continue;
  const summary='Only if '+source.id+' selected one of these original Astra Militarum Vehicle models within 3″ in your last Command phase, and that same selected model survives: it retains a 4+ invulnerable save until the start of your next Command phase. This continues if the Enginseer is destroyed or the selected model moves farther away. Only the selected physical model benefits; other models in its unit and the other listed Vehicles do not. This reminder neither heals again nor activates another blessing.';
  for(const [window,turn] of incomingAttacks)emit(source.id,'Omnissiah’s Blessing',window,turn,'during',summary,[source.id,...survivingVehicles.map(s=>s.id)],sheets.get(source.unit)!.source);
 }
 return result;
}

export function astraDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Astra Militarum')return [];
 const context=guardCardContext(army,roster);
 return [...nativeGuardPersonal(army,context,roster),...sharedGuardNamedReminders(army,context,roster),
  ...broodBrotherSpecialReminders(army,roster,context),...astraProfileReminders(army,roster)];
}
