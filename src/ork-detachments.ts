import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {ORK_ARMY_ABILITIES,ORK_STRATAGEMS,ORK_UPGRADES} from './ork-detachments.generated';
import {ORK_SHEETS,orkKeywords} from './ork-data';
import {orkTransportCanCarry,resolvedOrkWarlord} from './ork-muster';
import {orkHasRangedWeapon} from './ork-loadouts';

const source='https://wahapedia.ru/wh40k11ed/factions/orks/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const,attacks=['Shooting','Fight'] as const;
type Turn='own'|'opponent'|'either';
const norm=(s:string)=>s.toLowerCase().trim().replace(/[‑–]/g,'-').replaceAll('’',"'");
const printed=new Map(ORK_ARMY_ABILITIES.map(s=>[norm(s.unit),s]));
const byUnit=new Map(ORK_SHEETS.map(s=>[norm(s.unit),s]));
const rule=(s:RosterInstance)=>printed.get(norm(s.unit));
const choice=(a:ArmySelection,s:RosterInstance)=>a.upgrades2026?.[s.id]??a.upgrades2026?.[s.unit];
export function eligibleOrkUpgrades(army:ArmySelection,unit:string){
 if(army.faction!=='Orks')return [];
 return ORK_UPGRADES.filter(o=>army.detachments2026?.includes(o.detachment)&&o.units.some(u=>norm(u)===norm(unit)));
}

const rangedUpgrades=new Set(['000011155002','000011155003','000011148007']);
export function orkHasRangedAttack(army:ArmySelection,squad:RosterInstance):boolean {
 if(army.faction!=='Orks')return false;
 if(orkHasRangedWeapon(squad))return true;
 const selected=choice(army,squad);
 return !!selected&&eligibleOrkUpgrades(army,squad.unit).some(u=>rangedUpgrades.has(u.id)&&norm(u.name)===norm(selected));
}

const strats:Record<typeof ORK_STRATAGEMS[number]['id'],string>={
 '000010800004':'After your Wagon charges, each enemy it is engaged with tests for Battle-shock at −1.',
 '000010800002':'An unengaged Infantry unit that was eligible to fight can embark if wholly within 6″ of a transport it fits in.',
 '000010800003':'After the Wagon finishes a Normal move, its passengers may make an assault disembark move.',
 '000011156004':'After enemy target selection, incoming ranged attacks with Strength greater than this unit’s Toughness suffer −1 to Wound. Pay an extra 1CP to apply the penalty regardless of Strength.',
 '000011156002':'When the enemy targets this unit, destroy each model normally unless the unit has not fought. Before it fights, roll a D6 when a model dies, adding 1 if riled up. On 4+ that model remains until the unit fights or phase end.',
 '000011156003':'When selected to attack, re-roll Hit rolls of 1, or any Hit roll if this unit is riled up.',
 '000008869002':'When an engaged enemy Falls Back, it must use Desperate Escape. An enemy Monster or Vehicle also makes three additional hazard rolls per engaged Beast Snagga unit, at −1 if the enemy is battle-shocked.',
 '000008869003':'After enemy shooting costs this unengaged Beast Snagga unit a wound, it may surge up to D6″. Re-roll the distance die if riled up.',
 '000008869004':'Place an unengaged Beast Snagga unit within 6″ of a battlefield edge into Strategic Reserves.',
 '000008878003':'Select a friendly Orks Walker. It becomes riled up until the start of your next turn.',
 '000008878002':'When the enemy targets this Walker, if a model is destroyed before the unit fights, roll a D6. Add 3 if the unit has Deff Dread. On 4+ retain that model until the unit fights or phase end.',
 '000008878004':'When the Walker is selected to move or declares a charge, give it Mobile.',
 '000011152002':'After the Aircraft is destroyed, before rolling for Deadly Demise, forgo that ability. Select an enemy within 12″ and roll eight D6, inflicting a mortal wound on each 4+, then remove the Aircraft.',
 '000011152003':'When selected to shoot, this unit can re-roll ranged Hit rolls against targets with Fly.',
 '000011152004':'After an enemy finishes a move within 8″ of your unengaged Deffkoptas, they may make a Normal move up to D6″, or up to 6″ if riled up.',
 '000008882004':'When this unit is selected to move, it gains +2 to its Advance rolls.',
 '000008882003':'At the start of your Battle-shock step select an Infantry unit still containing at least 13 models. A visible friendly Orks unit within 12″ automatically passes its Battle-shock rolls.',
 '000008882002':'When your Boyz are selected to fight after charging this turn, their melee attacks gain 1 Attack.',
 '000008873004':'After enemy target selection, incoming ranged attacks against this Speed Freeks unit fail on unmodified Hit rolls of 1–3.',
 '000008873002':'Select any number of friendly Orks Infantry units within 3″ of the Squigbuggies. Each selected unit heals 3 wounds.',
 '000008873003':'When selected to shoot, the Speed Freeks unit’s ranged attacks gain Sustained Hits 1.',
 '000011145002':'When the Mek Gunz shoot, choose Lethal Hits, Sustained Hits 1, or both along with Hazardous for the ranged attacks.',
 '000011137004':'When an enemy targets other friendly Orks Infantry within 3″ of the selected Gretchin, a hit against that Infantry ends its attack sequence and causes one mortal wound to the Gretchin instead while a Gretchin model remains on the battlefield.',
 '000011137003':'After an enemy ends a move within 8″ of this unengaged Gretchin unit, make a Normal move up to D6″. An attached Gretchin unit can move up to 6″ instead.',
 '000011137002':'After an enemy attacks, replace the just-destroyed Gretchin with an identical new unit in Strategic Reserves at full starting strength and wounds.',
 '000011141004':'When selected to shoot, this Infantry unit’s ranged attacks gain Sustained Hits 1.',
 '000011141002':'When selected to shoot, the Infantry unit gains +1 to Wound with ranged attacks against targets other than Monsters and Vehicles.',
 '000011141003':'When selected to shoot, improve AP by 1 on ranged attacks into targets within 9″.',
 '000009796004':'If this unit began the phase engaged but is now unengaged, it may make a Normal move up to 6″.',
 '000009796003':'When this unit Advances or Falls Back, that move leaves it eligible to start an action.',
 '000009796002':'Choose an objective the selected unit controls. That objective becomes secured.',
 '000008366006':'When this Mounted or Vehicle unit is selected to move, increase its Move by 2″.',
 '000008366002':'When this attached Infantry unit becomes battle-shocked, spend this Stratagem even though it is battle-shocked. It suffers D3 mortal wounds and is no longer battle-shocked.',
 '000008366007':'When selected to shoot, ranged attacks gain Rapid Fire 1, or increase their existing Rapid Fire value by 1.',
 '000008366005':'When the non-Walker Vehicle that charged this turn is selected to fight, its melee attacks gain Cleave 1, or increase existing Cleave by 1.',
 '000008366004':'When an enemy targets a non-Titanic unit, roll a D6 for a model destroyed before its unit fights, adding 1 if riled up. On 4+ leave that model until the unit fights or phase end.',
 '000008366003':'When the unit is selected to fight, its melee attacks gain Lethal Hits.',
 '000011133004':'After an enemy finishes shooting and hits this unit, shoot using normal shooting. Only that enemy may be targeted.',
 '000011133003':'After shooting, this unengaged unit may make a Normal move up to 6″ that ends within range of an objective. It then cannot declare a charge until turn end.',
 '000011133002':'When the transport shoots, ranged attacks made with weapons selected through Firing Deck gain +1 to Hit.',
};

export function orkDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Orks')return [];
 const members=roster.filter(s=>rule(s)),tags=new Map(members.map(s=>[s.id,orkKeywords(army,s)]));
 const kw=(s:RosterInstance,k:string)=>tags.get(s.id)?.has(k)===true;
 const grouped=new Map<string,RosterInstance[]>();
 for(const s of members){
  const root=s.attachedTo?knightJoinedBodyguard(army,s)?.id??s.id:s.id;
  grouped.set(root,[...(grouped.get(root)??[]),s]);
 }
 const forms=[...grouped].map(([id,group])=>({root:group.find(m=>m.id===id)!,group,count:group.reduce((n,s)=>n+(s.models??byUnit.get(norm(s.unit))?.sizes[0]??1),0)}));
 type Form=typeof forms[number];
 const has=(d:string)=>army.detachments2026?.includes(d);
 const tagged=(f:Form,...keys:string[])=>f.group.some(s=>keys.some(k=>kw(s,k)||norm(s.unit)===norm(k)));
 const roots=(fn:(f:Form)=>boolean)=>forms.filter(fn).map(f=>f.root);
 const get=(s:RosterInstance)=>forms.find(f=>f.group.some(g=>s.id===g.id))!;
 const ranged=(s:RosterInstance)=>orkHasRangedAttack(army,s);
 const shoots=(f:Form)=>f.group.some(ranged);
 const byTag=(...k:string[])=>roots(f=>tagged(f,...k));
 const all=forms.map(f=>f.root),ground=roots(f=>!tagged(f,'AIRCRAFT')),wagons=byTag('WAGON'),rangedForms=roots(shoots);
 const infantry=byTag('INFANTRY'),aircraft=byTag('AIRCRAFT'),gretchin=byTag('GRETCHIN'),freeks=byTag('SPEED FREEKS');
 const psykers=members.filter(s=>rule(s)?.psychic);
 const eligibleTransports=byTag('TRANSPORT');
 const carries=(t:RosterInstance,p:RosterInstance)=>t.id!==p.id&&orkTransportCanCarry(army,t,p);
 const passengers=(t:RosterInstance)=>all.filter(p=>carries(t,p));
 const isEligibleCarrier=(t:RosterInstance)=>passengers(t).length>0;
 const canBoard=(s:RosterInstance)=>eligibleTransports.some(t=>carries(t,s));
 const rows:GeneratedReminder[]=[];
 function add(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,targets:readonly RosterInstance[],origin:GeneratedReminder['origin']='detachment',sourceUrl=source){
  if(targets.length)rows.push({id:'11e-orks-'+key,title,window,turn,timing,summary,units:targets.map(s=>s.id),source:sourceUrl,origin});
 }
 const give=(id:string,title:string,phase:ReminderWindow,turn:Turn,when:GeneratedReminder['timing'],text:string,targets:readonly RosterInstance[])=>add(id+'-'+phase,title,phase,turn,when,text,targets);
 const warlord=resolvedOrkWarlord(army);
 if(warlord&&rule(warlord)?.boss)add('da-boss','Da Boss','Start of battle round','either','start','Your designated Da Boss Warlord grants 1CP.',[warlord],'army');
 add('war-cry','Waaagh! · War Cry (once per battle)','Command','either','start','Once per battle per army, at the start of either Command phase, all friendly units with Waaagh! become riled up through the end of the next turn.',all,'army');
 add('advance','Waaagh! · re-roll advances','Movement','own','during','These units can re-roll Advance rolls. While riled up, an Advance leaves them eligible to declare a charge.',ground,'army');
 add('riled-assault','Waaagh! · riled-up Assault','Shooting','own','during','While riled up, the unit’s ranged attacks gain Assault.',rangedForms,'army');
 add('riled-charge','Waaagh! · charge after advancing','Charge','own','during','If riled up when selected to Advance, the unit can still declare a charge.',ground,'army');
 add('riled-save','Waaagh! · riled-up protection','Shooting','opponent','during','These units have a 5+ invulnerable save while riled up.',all,'army');
 add('riled-save-fight','Waaagh! · riled-up protection','Fight','either','during','These units have a 5+ invulnerable save while riled up.',all,'army');
 for(const p of psykers){
  const level=norm(choice(army,p)??'')==='warphead'?2:1;
  add('psychic-budget-'+p.id,'Unstable Energies · '+p.id,'Start of battle round','either','start','This Psyker has level '+level+'. Across this battle round, the combined levels of the psychic abilities this unit uses may not exceed '+level+'.',[p],'army');
  const f=get(p),card=source+(p.unit==='Kill Rig'?'Kill-Rig':'Weirdboy');
  const test='The unit must be free of Battle-shock to attempt this level 1 power. Roll a D6. On 1 the unit becomes battle-shocked. ';
  if(p.unit==='Weirdboy'){
   add('da-jump-'+p.id,'Da Jump · '+p.id,'Movement','own','during',test+'Once per battle round across your army, put this unit into Strategic Reserves and give it Deep Strike. Follow the normal rules for returning.',[f.root],'unit',card);
   add('warpath-'+p.id,'Warpath · '+p.id,'Fight','either','during','When selected to fight, the unit may use Warpath. '+test+'The Weirdboy’s whole unit gains Psychic on its melee attacks and may re-roll Wound rolls of 1.',[f.root],'unit',card);
  }else if(p.unit==='Kill Rig'){
   add('beastscent-'+p.id,'Beastscent · '+p.id,'Movement','own','during','When a unit disembarks, this Kill Rig can use Beastscent. '+test+'The disembarking unit adds 1 to Wound against Monsters and Vehicles until the end of this turn.',passengers(p),'unit',card);
   add('warpath-'+p.id,'Warpath · '+p.id,'Fight','either','during','When selected to fight, the unit may use Warpath. '+test+'The Kill Rig’s unit gains Psychic and Lethal Hits on its melee attacks.',[f.root],'unit',card);
  }
 }
 if(has('War Horde'))give('stuck','Get Stuck In','Fight','either','during','Friendly Orks melee attacks gain Sustained Hits 1.',all);
 if(has('Da Big Hunt'))for(const phase of attacks)give('hunt','Da Hunt is On',phase,phase==='Shooting'?'own':'either','during','Beast Snagga attacks into Monsters or Vehicles improve AP by 1.',roots(f=>tagged(f,'BEAST SNAGGA')&&(phase==='Fight'||shoots(f))));
 if(has('Kult of Speed')){
  give('junkies','Adrenaline Junkies','Movement','own','during','After an Advance or Fall Back, a Speed Freeks unit gains Assault on its ranged attacks until turn end and the move leaves it eligible to declare a charge.',freeks.filter(s=>!tagged(get(s),'AIRCRAFT')));
  give('junkies-charge','Adrenaline Junkies','Charge','own','during','A Speed Freeks unit that Advanced or Fell Back can still declare a charge.',freeks.filter(s=>!tagged(get(s),'AIRCRAFT')));
 }
 if(has('Dread Mob'))for(const phase of attacks)give('button','Try Dat Button!',phase,phase==='Shooting'?'own':'either','during','Before attacking, roll one or two D6, re-rolling identical results until distinct. Results of 1–2 grant +1 Attack, 3–4 grant +2 Strength, and 5–6 improve AP by 1. After attacking, make one hazard roll if you rolled two dice.',roots(f=>tagged(f,'WALKER')&&!tagged(f,'TITANIC')&&(phase==='Fight'||shoots(f))));
 if(has('Green Tide')){
  give('brutality','Mob-handed Brutality · Boyz','Fight','either','during','Boyz melee attacks gain Sustained Hits 1.',byTag('BOYZ'));
  give('brutality-charge','Mob-handed Brutality · charging Infantry','Fight','either','during','If the Infantry unit charged this turn, its melee attacks gain Lethal Hits against non-Monster, non-Vehicle targets.',infantry);
 }
 if(has('Bully Boyz'))give('savagery','Displays of Savagery','Fight','either','during','Meganobz and Nobz units gain Sustained Hits 1 on their melee attacks.',byTag('MEGANOBZ','NOBZ'));
 if(has('Taktikal Brigade'))give('organised','Suspiciously Well Organised','Movement','own','during','After Falling Back, Boyz, Kommandos and Stormboyz may still charge.',byTag('BOYZ','KOMMANDOS','STORMBOYZ'));
 if(has('Blitz Brigade')){
  give('momentum','Unstoppable Momentum','Movement','own','during','When a Wagon Advances, it may change the Advance roll to 6.',wagons);
  give('momentum','Unstoppable Momentum','Charge','own','during','Wagons may re-roll Charge rolls.',wagons);
 }
 if(has('Wreckas'))give('looting','Wreckin’ and Lootin’','Shooting','own','during','When selected to shoot, this unit re-rolls Hit rolls of 1 if it is in objective range or its target is in objective range.',byTag('BREAKA BOYZ','FLASH GITZ','TANKBUSTAS'));
 if(has('Runt Swarm'))give('sneaky','Sneaky Little Gitz','Movement','own','during','Gretchin that Advance or Fall Back are still eligible to start an action.',gretchin);
 if(has('Shoota Boyz'))give('dakka','Dakka! Dakka! Dakka!','Shooting','own','during','Orks Infantry ranged attacks have Assault and, while riled up, gain 3″ range.',roots(f=>tagged(f,'INFANTRY')&&shoots(f)));
 if(has('Madcap Meks'))give('genius','Unpredictable Genius','Shooting','own','during','When every ranged attack targets the same enemy, roll a D6. On 1, give the target a 4+ invulnerable save until shooting ends. On 2–3, another enemy within 3″ of it suffers D3 mortal wounds. On 4, add 1 to Hit. On 5, the target gains Fly and loses cover until shooting ends. On 6, it loses 1 Toughness until shooting ends.',byTag('BIG MEK','MEK GUNZ','MORKANAUT','WAZBOM BLASTAJET'));
 if(has('Brute Bosses'))for(const phase of phases)give('nails','’Ard as Nails',phase,'either','during','When the Warboss is destroyed before its unit has fought this phase, roll a D6, adding 1 if the unit is riled up. On 3+ retain the model until its unit fights or the phase ends.',members.filter(s=>kw(s,'WARBOSS')));
 if(has('Flyboyz')){
  give('sky-reserves','Skyborne Loons · reserves','Pre-battle','either','during','These Aircraft do not count toward your Strategic Reserves points limit.',aircraft);
  give('loons','Skyborne Loons','Shooting','own','during','Riled-up Aircraft and Deffkoptas gain +1 to Hit on ranged attacks.',byTag('AIRCRAFT','DEFFKOPTAS'));
 }
 if(has('Wurrband')){
  for(const p of psykers){
   const form=get(p);
   const canEmbark=eligibleTransports.some(t=>t.id===p.id&&isEligibleCarrier(t));
   const bySize=canEmbark?'Add a further 1 Strength for every five models in this unit or embarked in the Psyker.':'At full roster strength this formation contributes a further +'+Math.floor(form.count/5)+' Strength. Recount surviving models in groups of five.';
   for(const phase of attacks)give('power-'+p.id,'Powers of da Waaagh! · '+p.id,phase,phase==='Fight'?'either':'own','during','This Psyker model’s Psychic attacks gain +1 Strength. '+bySize,[p]);
   give('roar-'+p.id,'Roar of Mork · psychic level 1','Movement','own','during','If this unit is not battle-shocked, roll a D6, becoming battle-shocked on 1. A non-Monster, non-Vehicle enemy within 12″ tests for Battle-shock at −1 per ten models in your unit.',[p]);
   give('visions-'+p.id,'Visions of Violence · psychic level 1','Fight','either','start','If this unit is not battle-shocked, roll a D6, becoming battle-shocked on 1. The unit gains Fights First.',[form.root]);
  }
 }
 for(const strat of ORK_STRATAGEMS){
  if(!has(strat.detachment))continue;
  const acceptable=new Set<string>(strat.units);
  const targets=roots(f=>{
   if(!f.group.some(s=>acceptable.has(s.unit)))return false;
   switch(strat.id){
    case '000010800002':return canBoard(f.root)&&tagged(f,'INFANTRY');
    case '000010800003':return isEligibleCarrier(f.root);
    case '000008882003':return f.count>=13;
    case '000008873002':return infantry.length>0;
    case '000011137004':return tagged(f,'GRETCHIN')&&forms.some(other=>other.root.id!==f.root.id&&tagged(other,'INFANTRY')&&!tagged(other,'GRETCHIN'));
    case '000008366002':return f.group.length>1&&tagged(f,'INFANTRY');
    case '000011133002':return f.group.some(s=>rule(s)?.firingDeck)&&passengers(f.root).some(p=>shoots(get(p)));
    case '000011156003':case '000011152003':case '000011141002':case '000011141003':case '000011141004':case '000008366007':case '000011133004':return shoots(f)||strat.id==='000011156003';
    default:return true;
   }
  });
  const title=strat.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,s=>s.toUpperCase())+' · '+strat.cp+'CP';
  for(const w of strat.windows){
   const recipients=w.phase==='Shooting'&&strat.id==='000011156003'?targets.filter(s=>shoots(get(s))):targets;
   if(strat.both)for(const when of ['start','end'] as const)add(strat.id+'-'+w.phase+'-'+when,title,w.phase,w.turn,when,strats[strat.id],recipients);
   else give(strat.id,title,w.phase,w.turn,strat.timing,strats[strat.id],recipients);
  }
 }
 for(const bearer of members){
  const selected=choice(army,bearer),u=selected&&eligibleOrkUpgrades(army,bearer.unit).find(o=>norm(o.name)===norm(selected));
  if(!u)continue;
  const form=get(bearer),unit=[form.root],upon=(phase:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,targets=[bearer])=>give(u.id+'-'+bearer.id,bearer.id+' · '+u.name,phase,turn,timing,text,targets);
  switch(u.id){
   case '000011136002':upon('Shooting','opponent','during','The upgraded Gretchin unit reduces its detection range by 3″.',unit);break;
   case '000011132002':upon('Pre-battle','either','end','After deployment, redeploy up to three friendly Orks Infantry units, including into Strategic Reserves regardless of how many units are already there.',infantry);break;
   case '000008872002':upon('Shooting','opponent','during','A unit that is not fully visible to the attacking model because of a model in this upgraded unit has cover against that attack.');break;
   case '000010799002':
    if(passengers(bearer).some(s=>tagged(get(s),'BIG MEK')))upon('Shooting','own','during','While a Big Mek is embarked, the Wagon’s ranged attacks ignore cover, and also gain Sustained Hits 1 while the Wagon is riled up.');break;
   case '000011155002':upon('Shooting','own','during','The bearer may shoot Da Krunch at 24″, with 3 attacks at BS 4+, Strength 5, AP −1 and Damage 1. It has Blast 3, Hazardous, Lethal Hits and Psychic.');break;
   case '000009795002':
    if(form.group.length>1){
     const others=form.group.filter(s=>s.id!==bearer.id);
     if(others.every(s=>rule(s)?.infiltrators))upon('Pre-battle','either','during','The attached bearer gains Infiltrators. The other members already have it, so the formation may deploy using Infiltrators.',unit);
     if(others.every(s=>rule(s)?.stealth))upon('Shooting','opponent','during','The attached bearer gains Stealth. Every member of this formation now has it.',unit);
    }break;
   case '000008877002':upon('Movement','own','during','The bearer gains 2″ Move.');break;
   case '000008881002':upon('Fight','either','during','The bearer gains 1 melee Attack.'+(form.count>=11?' While the unit has at least 11 surviving models, gain 2 instead.':''));break;
   case '000008885002':upon('Movement','opponent','during','Enemies Falling Back while engaged with this unit must use Desperate Escape. If your unit is riled up, those hazard rolls suffer −1.',unit);break;
   case '000011140002':
    if(ranged(bearer))upon('Shooting','own','during','The bearer’s ranged attacks gain Anti-Infantry 4+, Devastating Wounds and Supa-Hazardous. After shooting, make two hazard rolls per Supa-Hazardous weapon used.');break;
   case '000008868002':upon('Movement','own','during','When this unit Falls Back, it remains eligible to charge.',unit);break;
   case '000011144002':
    for(const phase of ['Movement','Shooting','Charge','Fight'] as const)upon(phase,phase==='Shooting'||phase==='Fight'?'either':'own','during','The bearer’s whole unit is riled up. Apply its 5+ invulnerable save, Assault on ranged attacks and permission to charge after Advancing.',unit);break;
   case '000008367002':upon('Fight','either','during','If the bearer’s unit charged this turn, improve the bearer’s melee AP by 1.');break;
   case '000011148002':for(const phase of phases)upon(phase,'either','end','Once per battle per army, if the bearer was destroyed this phase, roll a D6. On 2+ set it up unengaged, as close as possible to where it was destroyed, with 3 wounds.');break;
   case '000011151002':
    upon('Pre-battle','either','during','The upgraded Aircraft has the Character keyword.');
    upon('Movement','own','during','After this Aircraft makes an ingress move, friendly Orks Aircraft and Deffkoptas within 6″ become riled up until the start of your next turn.',byTag('AIRCRAFT','DEFFKOPTAS'));break;
   case '000011136003':upon('Pre-battle','either','end','This unit has Scouts 6″ while it is not embarked.',unit);break;
   case '000008872003':upon('Charge','own','during','The Deffkilla Wartrike’s unit can re-roll Charge rolls.',unit);break;
   case '000011140003':if(shoots(form))upon('Shooting','own','during','The bearer’s unit gains 3″ range on ranged attacks other than Torrent attacks.',unit);break;
   case '000008877003':{
    const walkers=roots(f=>tagged(f,'WALKER')&&!tagged(f,'BIG MEK'));
    if(walkers.length)upon('Shooting','opponent','during','The bearer gains Lone Operative while within 3″ of a friendly Orks Walker other than a Big Mek.');
    upon('Shooting','own','during','Choose a friendly Orks Walker within 3″ of the bearer. Its attacks can re-roll Hit rolls of 1 until end of turn.',byTag('WALKER'));break;
   }
   case '000011144003':upon('Shooting','own','during','When this unit is selected to shoot, optionally roll a D6 for the bearer’s Shokk Attack Gun. On 1 it gains Torrent and the bearer dies after shooting. On 2–5 add one Attack. On 6 gain Sustained Hits 2.');break;
   case '000008367003':upon('Movement','own','during','Once per battle per army, make the bearer’s unit riled up until the start of your next turn.',unit);break;
   case '000008868003':for(const phase of attacks)upon(phase,'either','during','The mounted Beastboss bearer has +1 Toughness.');break;
   case '000011132003':upon('Shooting','own','during','The upgraded Flash Gitz unit’s snazzguns gain Rapid Fire 1.',unit);break;
   case '000008885003':
    if(!tagged(form,'VEHICLE')){upon('Pre-battle','either','during','The bearer’s unit gains Deep Strike.',unit);upon('Movement','own','during','When arriving from reserves, this unit may use Deep Strike.',unit);}break;
   case '000008881003':for(const phase of attacks)upon(phase,'either','during','The upgraded Boyz unit has a 4+ Save.',unit);break;
   case '000010799003':{
    const valid=passengers(bearer).flatMap(p=>get(p).group).filter(s=>kw(s,'WARBOSS'));
    const options=[valid.some(s=>rule(s)?.motivates)?'Intimidating Motivation selects one friendly Orks unit.':'',valid.some(s=>rule(s)?.hunts)?'Keep Huntin’ selects one friendly Beast Snagga unit.':''].filter(Boolean);
    if(options.length)upon('Movement','own','during','The Wagon gains the relevant ability of an embarked Warboss. At the start or end of its move, once per battle round per army, a unit within 6″ recovers from Battle-shock and becomes riled up until your next turn. '+options.join(' '));
    break;
   }
   case '000011148003':upon('Fight','either','during','The bearer’s melee attacks gain +1 Damage.');break;
   case '000011151003':upon('Movement','own','during','This upgraded Aircraft can make an ingress move in your first Movement phase.');break;
   case '000009795003':upon('Fight','either','during','This unit’s melee attacks gain Lethal Hits against non-Monster, non-Vehicle targets.',unit);break;
   case '000011155003':upon('Shooting','own','during','The bearer gains ’Eadbanger at 24″ with 2 attacks at BS 4+, Strength 6, AP −3 and Damage 3. It has Hazardous, Precision and Psychic.');break;
   case '000011148004':{
    const transports=eligibleTransports.filter(t=>!tagged(get(t),'WALKER')&&carries(t,form.root));
    upon('Movement','own','during','While carrying this Warboss, a non-Walker transport gains +2″ Move.',transports);
    for(const phase of attacks)upon(phase,'either','during','While carrying this Warboss, the non-Walker transport has a 5+ invulnerable save.',transports);break;
   }
   case '000011144004':upon('Shooting','own','during','After this unit shoots, choose one enemy hit. Its Leadership rolls suffer −1 until the start of your next turn.');break;
   case '000011155004':
    upon('Pre-battle','either','during','The bearer has psyker level 2 and Deadly Demise D6. It can re-roll psychic rolls.');
    for(const phase of phases)upon(phase,'either','during','If destroyed, use the bearer’s Deadly Demise D6.');break;
   case '000008367004':upon('Movement','own','during','After this unit Falls Back, it can still shoot and declare a charge.',unit);break;
   case '000011148005':for(const phase of attacks)if(phase==='Fight'||ranged(bearer))upon(phase,phase==='Fight'?'either':'own','during','The bearer can re-roll Hit rolls of 1.');break;
   case '000008367005':upon('Movement','own','during','The bearer’s unit has +2″ Move.',unit);break;
   case '000011148006':upon('Movement','opponent','end','Once per battle per army, this unengaged unit can make a Normal move up to D6″. If riled up, it may re-roll the distance die.',unit);break;
   case '000011148007':upon('Shooting','own','during','The bearer has Da Gobshot Thunderbuss at 24″ with 6 attacks at BS 4+, Strength 7, AP −2 and Damage 2, Rapid Fire 6 and Lethal Hits against non-Monster, non-Vehicle targets.');break;
  }
 }
 return rows;
}
