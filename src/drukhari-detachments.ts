import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {DRUKHARI_NATIVE_SHEETS,DRUKHARI_ALLIED_SHEETS} from './drukhari-data';
import {DRUKHARI_CARDS,drukhariWeaponCount} from './drukhari-loadouts';
import {drukhariKeywords} from './drukhari-keywords';
import {drukhariFormations} from './drukhari-formations';
import {resolvedDrukhariWarlord} from './drukhari-muster';
import {knightJoinedBodyguard} from './leader-eligibility';
import {drukhariCargoFormations,drukhariSplitCargoFormations} from './drukhari-transports';
import {drukhariSelectedDetachments,eligibleDrukhariUpgrades} from './drukhari-upgrades';
import {DRUKHARI_STRATAGEMS} from './drukhari-detachments.generated';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
type Form={root:RosterInstance;members:readonly RosterInstance[];models:number};
const source='https://wahapedia.ru/wh40k11ed/factions/drukhari/';
const pack='https://assets.warhammer-community.com/eng_wh40k_faction_pack_drukhari-p7mpvgnmnn-clii96hzh6.pdf';
const incoming=[['Movement','own'],['Shooting','either'],['Fight','either']] as const;
const native=new Set(DRUKHARI_NATIVE_SHEETS.map(s=>s.unit));
const allies=new Set(DRUKHARI_ALLIED_SHEETS.map(s=>s.unit));
const demise='For an Attached unit, a destroyed-unit trigger occurs only when the last model that began the battle in that formation is destroyed; losing only its Bodyguard or one Character is insufficient.';
const effects:Record<typeof DRUKHARI_STRATAGEMS[number]['id'],string>={
 '000010585006':'After enemy shooting or Fight target selection, spend 1 Pain token. Worsen the AP of attacks targeting this Drukhari formation by 1 until the attacker finishes. At phase end, regain 1 Pain token only if your formation remains on the battlefield and is Haemonculus Covens.',
 '000010585004':'Just after this Haemonculus Covens formation fights, select one non-Vehicle enemy hit by its attacks this phase. That enemy is poisoned for the rest of the battle: at the start of each Command phase, roll one D6 for it; on 4+, it suffers D3 mortal wounds. This lasting enemy effect does not end when its source is destroyed.',
 '000010585003':'Just after this Drukhari formation destroys an enemy unit in the Fight phase, every visible enemy within 9″ of it takes a Battle-shock test, at −1 if your formation is Haemonculus Covens. '+demise,
 '000010585002':'When this Haemonculus model is just destroyed, spend 1–3 Pain tokens; this cannot be used with zero tokens or more than once per battle on the same model. At phase end return that model unengaged, as close as possible to where it was destroyed, with wounds equal to tokens spent. It returns as a separate unit at Starting Strength 1 and is not part of an Attached unit.',
 '000010585007':'Just after an enemy finishes shooting at this Haemonculus Covens formation, it can surge up to D6″. It must be unengaged, not Battle-shocked and not have moved this phase. Select the closest enemy, ignoring Aircraft unless this formation can Fly. Each model must end engaged with that target if possible, otherwise as close as possible; do not engage another enemy. It cannot move again this phase. No casualty or lost wound is required.',
 '000010585005':'Before this Haemonculus Covens formation fights, its attacks against Battle-shocked enemies gain Devastating Wounds until phase end.',
 '000011033004':'When an enemy targets this Wych Cult formation in the opponent’s Shooting phase, it gains a 5+ invulnerable save until phase end.',
 '000011033002':'Before this Wych Cult formation fights, its melee attacks gain Lethal Hits until phase end, including against Monsters and Vehicles.',
 '000011033003':'When this Wych Cult formation is selected to Advance or Fall Back in your Movement phase, that move does not prevent it from starting an action.',
 '000011037002':'When this Kabal or Blades for Hire formation targets a Character unit in your Shooting phase or either Fight phase, its attacks against Character units re-roll Hit rolls of 1 and Wound rolls of 1 until phase end.',
 '000011037004':'Before this Kabalite Warriors formation shoots in your Shooting phase, its ranged attacks gain Ignores Cover until phase end.',
 '000011037003':'After this Kabal or Blades for Hire formation shoots in your Shooting phase, those attacks do not prevent it from being hidden.',
 '000010589003':'Before this Drukhari formation fights, its attacks gain +1 to Hit until phase end. If those attacks destroy your Contract unit, every enemy unit takes a Battle-shock test; gain at most 3 Pain tokens from tests caused by this Stratagem.',
 '000010589006':'Before this Kabalite Warriors or Hand of the Archon formation shoots in your Shooting phase, improve its ranged weapons’ Ballistic Skill and AP by 1 until phase end.',
 '000010589004':'Before this Kabal or Blades for Hire formation shoots in your Shooting phase or fights, its attacks against your Contract unit score Critical Hits on unmodified 5+ until phase end.',
 '000010589005':'In your Command phase, just after completing a Contract, target your actual Archon Warlord and choose a new Contract, including one already completed. Select an enemy unit on the battlefield matching that Contract; Murderous Agenda then applies to the new Contract unit.',
 '000010589002':'After enemy Fight target selection, choose this targeted Kabal or Blades for Hire formation and one other friendly non-Vehicle Drukhari formation. Until phase end, whenever an attack would be allocated to the first formation, if the second is within Engagement Range of the attacking model, make no saving throw; the second suffers mortal wounds equal to that attack’s Damage instead.',
 '000010589007':'After enemy shooting target selection, this Kabal or Blades for Hire formation can be targeted by ranged attacks only from attacking models within 18″ until phase end.',
 '000010575002':'After enemy shooting or Fight target selection, reduce the Damage of attacks allocated to models in this Haemonculus Covens formation by 1, to the normal minimum of 1, until phase end.',
 '000010575004':'At the start of your Shooting phase or either Fight phase, select up to two Drukhari Battleline formations, or one other Drukhari formation. Until phase end, their attacks gain +1 to Hit against Below Half-strength enemies. You may spend 1 Pain token to also gain +1 to Wound against those enemies.',
 '000010575006':'At the start of your Movement phase, select up to two Wyches formations, or one other Drukhari formation, not yet selected to move. Their Advances add 6″ to Move instead of rolling until phase end; this is not cumulative with Reavers’ Matchless Swiftness.',
 '000010575003':'After enemy shooting or Fight target selection, attacks targeting this non-Haemonculus Covens Drukhari formation suffer −1 to Hit until phase end.',
 '000010575005':'At the start of either Fight phase, select up to two Wracks formations, or one other Drukhari formation. Their melee weapons gain Lethal Hits until phase end.',
 '000010575007':'At the end of your Shooting phase, select up to two Kabalite Warriors formations, or one other Drukhari formation excluding Scourges and Aircraft. Each must be unengaged and may make a Normal move up to 6″; it cannot declare a charge that turn.',
 '000009782004':'After enemy Fight target selection, attacks targeting this Drukhari or Harlequins formation suffer −1 to Hit until phase end.',
 '000009782002':'Before this Drukhari or Harlequins formation shoots in your Shooting phase or fights, select Lethal Hits or Sustained Hits 1 for its weapons until phase end.',
 '000009782005':'Just after this Drukhari or Harlequins formation Advances in your Movement phase, it may shoot and declare a charge after that Advance for the rest of the turn.',
 '000009782007':'After an enemy ends a Normal, Advance or Fall Back move in the opponent’s Movement phase, select this Drukhari Infantry or Harlequins Infantry formation within 8″ of it. It may make a Normal move up to D6″, or up to 6″ instead if it is losing the wager. Normal-move restrictions still apply.',
 '000009782006':'In your Movement or Charge phase, just after this Drukhari or Harlequins formation is selected to make a Normal, Advance or Fall Back move, is set up, or declares a charge, enemy units cannot use Fire Overwatch to shoot at it for the rest of the turn.',
 '000009782003':'After enemy Fight target selection, each model in this Drukhari or Harlequins formation destroyed before it has fought may fight on a D6 result of 4+, adding 1 if the formation is losing the wager. Resolve its fight after the attacking unit finishes, then remove it. This lasts until phase end.',
 '000010577005':'Before this Drukhari formation shoots in your Shooting phase, if it disembarked from a Transport this turn, its ranged weapons gain Sustained Hits 1 until phase end, or Sustained Hits 2 if it is Kabalite Warriors or Hand of the Archon.',
 '000010577004':'Just after this Drukhari Infantry formation disembarks from a Transport that made a Normal move in your Movement phase, use Assault Disembark for that disembarkation (Core Rules 18.06). Set it up wholly within 3″ and unengaged; it cannot make a Normal or Advance move, but this disembarkation does not prevent it from charging. All other disembarkation and ingress restrictions still apply.',
 '000010577006':'After an enemy ends a Normal, Advance or Fall Back move in the opponent’s Movement phase, this Drukhari Transport within 8″ may make a Normal move up to 6″. Normal-move restrictions still apply.',
 '000010577002':'After this Drukhari Transport has selected its Fight targets, resolve its fight, then select one enemy targeted by those attacks. Roll one D6 per model actually embarked, adding 1 for each Wracks model; each 5+ causes one mortal wound, to a maximum of 6. Count physical passengers and their actual model keywords, including attached Characters separately.',
 '000010577003':'At the end of either Fight phase, this Drukhari Infantry formation that fought may make a Normal or Fall Back move. Unless it is a Wyches formation, it must end wholly within 3″ horizontally and 5″ vertically of a friendly Drukhari Transport and embark, with room for every model; otherwise it cannot make the move. It may embark within that Transport in a turn it disembarked from that same Transport. Wyches may make the move without embarking.',
 '000010577007':'After enemy shooting target selection, models in this Drukhari Vehicle formation gain a 4+ invulnerable save until phase end.',
 '000010581006':'After an enemy ends a Fall Back move in the opponent’s Movement phase, this unengaged Wych Cult formation within 6″ can declare a charge. It can select only enemy units that Fell Back this phase and are within maximum charge distance. This is the current charge rule, not a reactive Normal move.',
 '000010581007':'After enemy shooting target selection, models in this Wych Cult formation gain a 5+ invulnerable save until phase end.',
 '000010581003':'Before this Drukhari formation fights after making a Charge move this turn, its melee weapons gain Lethal Hits until phase end. If it is a Wyches formation, also improve those weapons’ AP by 1.',
 '000010581005':'At the start of your Movement or Charge phase, this Wych Cult formation may ignore Move, Advance-roll and Charge-roll modifiers for Normal, Advance and Charge moves until phase end. For those move types until turn end, its models may pass horizontally through models, including Engagement Range; Normal and Advance moves must still end unengaged and all moves must end in legal positions.',
 '000010581004':'Just after this Drukhari formation Falls Back in your Movement phase, it may shoot and charge after that Fall Back for the rest of the turn.',
 '000010581002':'After enemy Fight target selection, every model in this Wych Cult formation destroyed before it has fought can fight after the attacking unit finishes, then is removed. No die roll is required. This lasts until phase end.',
 '000011041004':'When this Haemonculus Covens formation is selected to Fall Back in your Movement phase, that move does not prevent it from declaring a charge that turn.',
 '000011041002':'Before this Cronos or Talos formation fights, its attacks against Battle-shocked enemies gain Devastating Wounds until phase end.',
 '000011041003':'Just after this Haemonculus Covens formation destroys an enemy unit in the Fight phase, one visible enemy within 12″ of it takes a Battle-shock test at −1. '+demise,
};

export function drukhariDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Drukhari')return [];
 const detachments=drukhariSelectedDetachments(army),has=(name:string)=>detachments.includes(name),reaper=has('Reaper’s Wager');
 const tag=(s:RosterInstance,k:string,model?:string)=>drukhariKeywords(army,s,model,roster).has(k);
 const legal=(s:RosterInstance)=>native.has(s.unit)||allies.has(s.unit)&&(!reaper||tag(s,'HARLEQUINS'));
 const original=expandRoster(army),active=roster.filter(legal),current={...army,instances:[...active]},warlordId=resolvedDrukhariWarlord(army)?.id;
 const forms:Form[]=drukhariFormations(army,active),originalForms:Form[]=drukhariFormations(army,original.filter(legal));
 const isNative=(f:Form)=>f.members.some(s=>native.has(s.unit));
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const named=(f:Form,...names:string[])=>f.members.some(s=>names.includes(s.unit));
 const weapons=(f:Form,phase:'Shooting'|'Fight')=>f.members.flatMap(s=>(DRUKHARI_CARDS[s.unit]?.weapons??[]).filter(w=>w.phase===phase&&drukhariWeaponCount(s,w.name)>0));
 const ranged=(f:Form)=>weapons(f,'Shooting').length>0;
 const melee=(f:Form)=>weapons(f,'Fight').length>0;
 const roots=(fs:readonly Form[])=>fs.map(f=>f.root),names=(fs:readonly Form[])=>roots(fs).map(s=>s.id).join(', ');
 const dru=forms.filter(isNative),harlequins=forms.filter(f=>!isNative(f)&&kw(f,'HARLEQUINS')),wager=[...dru,...harlequins];
 const wych=dru.filter(f=>kw(f,'WYCH CULT')),covens=dru.filter(f=>kw(f,'HAEMONCULUS COVENS')),kabal=dru.filter(f=>kw(f,'KABAL')||kw(f,'BLADES FOR HIRE'));
 const infantry=dru.filter(f=>kw(f,'INFANTRY')),vehicles=dru.filter(f=>kw(f,'VEHICLE')),transports=vehicles.filter(f=>kw(f,'TRANSPORT'));
 const cargo=(f:Form)=>[...drukhariCargoFormations(army,f.root,active),...drukhariSplitCargoFormations(army,f.root,active)];
 const carriers=(f:Form)=>transports.filter(t=>cargo(t).some(g=>g.members.some(m=>f.members.some(s=>s.id===m.id))));
 const canRide=(f:Form)=>carriers(f).length>0;
 const rows:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],rule?:string,reference=source)=>{
  if(units.length)rows.push({id:'11e-drukhari-det-'+id+'-'+window+'-'+turn+'-'+timing,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],source:reference,sourceRuleId:rule,origin:'detachment'});
 };
 const card=(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,fs:readonly Form[],rule?:string,reference=source)=>emit(id,title,window,turn,timing,summary,roots(fs),rule,reference);
 const snap=(id:string,title:string,body:string,fs:readonly Form[],rule?:string)=>card(id,title,'Movement','opponent','end',body,fs.filter(f=>ranged(f)&&!kw(f,'TITANIC')),rule);
 if(has('Realspace Raiders')){
  const sets=[['Archon','Kabalite Warriors'],['Succubus','Wyches'],['Haemonculus','Wracks']] as const;
  const eligible=sets.filter(([leader,body])=>original.some(s=>native.has(s.unit)&&drukhariKeywords(army,s).has(leader.toUpperCase()))&&original.some(s=>s.unit===body));
  if(eligible.length)card('alliance','Alliance of Agony','Pre-battle','either','during','At the start of the battle gain '+(eligible.length*2)+' Pain tokens: 2 for each present combination ('+eligible.map(s=>s.join(' + ')).join('; ')+'). The units do not need to be attached to each other. Each combination grants its bonus once, regardless of duplicate units.',originalForms.filter(f=>f.members.some(s=>eligible.some(([leader,body])=>s.unit===body||native.has(s.unit)&&drukhariKeywords(army,s).has(leader.toUpperCase())))),'000010572');
 }
 if(has('Skysplinter Assault')){
  const ride=infantry.filter(canRide);
  card('rain-arrival','Rain of Cruelty','Movement','either','during','Whenever this Drukhari formation disembarks from a Transport, its ranged weapons gain Ignores Cover and its melee weapons gain Lance until that turn ends. Apply this to actual disembarking models, including a declared split half, rather than every model in the original roster unit.',ride,'000008714');
  card('rain-ranged','Rain of Cruelty · shooting','Shooting','either','during','If this Drukhari formation disembarked this turn, its ranged weapons have Ignores Cover until turn end.',ride.filter(ranged),'000008714');
  card('rain-melee','Rain of Cruelty · melee','Fight','either','during','If this Drukhari formation disembarked this turn, its melee weapons have Lance until turn end: +1 to Wound only if it also made a Charge move this turn.',ride.filter(melee),'000008714');
  snap('rain-snap','Rain of Cruelty · snap shooting','If this formation disembarked during the current opponent’s turn, its ranged weapons retain Ignores Cover for Fire Overwatch until that turn ends.',ride,'000008714');
 }
 if(reaper){
  card('wager-start','Callous Competition','Pre-battle','either','during','At battle start the Drukhari are winning the wager. Each time a Drukhari or Harlequins formation destroys an enemy unit, that side becomes the winning side and the other side loses. '+demise+' Reaper’s Wager replaces Corsairs and Travelling Players: only Harlequins allies are allowed, up to '+({Incursion:500,'Strike Force':1000,Onslaught:1500}[army.battleSize2026??'Strike Force'])+' points. Harlequins cannot be the Warlord.',originalForms.filter(f=>isNative(f)||f.members.some(s=>drukhariKeywords(army,s).has('HARLEQUINS'))),'000009780',pack);
  for(const phase of ['Shooting','Fight'] as const)card('wager-attacks','Callous Competition · attacks',phase,phase==='Fight'?'either':'own','during','Only Drukhari or Harlequins models’ attacks re-roll Hit rolls of 1 while their side wins the wager, or both Hit rolls of 1 and Wound rolls of 1 while their side loses.',wager.filter(phase==='Fight'?melee:ranged),'000009780',pack);
  snap('wager-snap','Callous Competition · snap shooting','If this formation uses Fire Overwatch, Drukhari or Harlequins models re-roll Wound rolls of 1 only while their side is losing the wager. Snap shooting ignores all Hit re-rolls and cannot score Critical Hits.',wager,'000009780');
 }
 if(has('Spectacle of Spite')){
  card('drugs','Combat Drugs','Command','own','start','At the start of your Command phase choose one Combat Drug not previously chosen this battle, or roll two D6 to select two randomly. Random results may repeat a previously chosen drug, but duplicate active results do not stack. Until your next Command phase starts, only Wych Cult models receive: 1 Adrenalight, +1 melee Attacks; 2 Hypex, +2″ Move; 3 Serpentin, improve melee Weapon Skill by 1; 4 Painbringer, +1 Toughness; 5 Grave Lotus, +1 melee Strength; 6 Splintermind, improve Leadership and ranged Ballistic Skill by 1.',wych,'000010579');
  for(const [phase,turn] of [['Movement','own'],['Shooting','either'],['Fight','either'],['Command','opponent']] as const)card('drug-effects','Combat Drugs · active effects',phase,turn,'during','Apply only the current Combat Drugs to actual Wych Cult models: +1 melee Attacks, +2″ Move, +1 melee Weapon Skill, +1 Toughness, +1 melee Strength, or +1 Leadership and ranged Ballistic Skill according to the selected or rolled results. They last until your next Command phase starts; duplicate results never stack. Other models in the formation do not inherit model-specific drug bonuses.',wych,'000010579');
 }
 if(has('Covenite Coterie'))for(const [phase,turn] of incoming)card('stitchflesh','Stitchflesh Abominations',phase,turn,'during','Attacks targeting this Haemonculus Covens formation suffer −1 to Wound if their Strength is greater than its Toughness.',covens,'000010583');
 if(has('Kabalite Cartel')){
  const originalKabal=originalForms.filter(f=>f.members.some(s=>native.has(s.unit)&&(drukhariKeywords(army,s).has('KABAL')||drukhariKeywords(army,s).has('BLADES FOR HIRE'))));
  card('contract-select','Murderous Agenda · select Contract','Start of battle round','either','start','At the start of battle round 1 choose one Contract and an enemy unit matching it: Trophy Hunters, a Character unit; Sow Fear and Terror, an Infantry or Mounted unit not containing only Characters; or Show of Strength, a Monster or Vehicle unit. That unit remains your Contract unit until completion.',originalKabal,'000010587');
  card('contract-complete','Murderous Agenda · complete Contract','Command','own','start','If your Contract unit is destroyed, complete the Contract and gain 3 Pain tokens. Sow Fear and Terror also completes when all non-Character models in that unit are destroyed. The Contract remains active until this completion step. A new Contract requires Enemies Without Number and an actual Archon Warlord.',originalKabal,'000010587');
  for(const phase of ['Shooting','Fight'] as const)card('contract-attacks','Murderous Agenda · active Contract',phase,phase==='Fight'?'either':'own','during','Until the Contract completes, only Kabal or Blades for Hire models receive its attack benefit: Trophy Hunters grants Precision against the Contract unit; Sow Fear and Terror grants Sustained Hits 1 against Infantry or Mounted units; Show of Strength grants Lethal Hits against Monsters or Vehicles. The latter two benefits are not restricted to the Contract unit.',kabal.filter(phase==='Fight'?melee:ranged),'000010587');
  snap('contract-snap','Murderous Agenda · snap shooting','During Fire Overwatch, only Trophy Hunters can apply: Kabal or Blades for Hire models have Precision against the Contract unit. Snap shooting cannot score Critical Hits, so Sustained Hits and Lethal Hits cannot activate.',kabal,'000010587');
 }
 if(has('Exhibition of Slaughter'))card('exacting','Exacting Cruelty','Fight','either','during','This Wych Cult formation’s melee attacks have Lethal Hits against enemies that are neither Monsters nor Vehicles.',wych.filter(melee),'000011031',pack);
 if(has('Kabalite Agonysts'))card('harvest','Contracted Harvest','Shooting','own','during','This Kabal or Blades for Hire formation’s ranged attacks have Sustained Hits 1 against enemies that are neither Monsters nor Vehicles. It cannot trigger in snap shooting, which cannot score Critical Hits.',kabal.filter(ranged),'000011035',pack);
 if(has('Tools of Torment'))for(const [phase,turn] of incoming)card('artifice','Darkest Artifice',phase,turn,'during','Attacks targeting this Cronos or Talos formation suffer −1 to Wound if their Strength is greater than its Toughness.',dru.filter(f=>named(f,'Cronos','Talos')),'000011039',pack);

 for(const strat of DRUKHARI_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=dru,actors:readonly RosterInstance[]|undefined,body=effects[strat.id];
   switch(strat.id){
    case '000010585004':case '000010585005':targets=covens.filter(melee);break;
    case '000010585003':targets=dru.filter(melee);break;
    case '000010585002':actors=original.filter(s=>native.has(s.unit)&&drukhariKeywords(army,s).has('HAEMONCULUS'));targets=[];break;
    case '000010585007':case '000010575002':targets=covens;break;
    case '000011033004':case '000011033003':case '000010581007':case '000010581005':case '000010581006':targets=wych.filter(f=>!kw(f,'AIRCRAFT'));break;
    case '000011033002':case '000010581002':targets=wych.filter(melee);break;
    case '000011037002':case '000010589004':targets=kabal.filter(phase==='Fight'?melee:ranged);break;
    case '000011037003':targets=kabal.filter(ranged);break;
    case '000011037004':targets=dru.filter(f=>named(f,'Kabalite Warriors')&&ranged(f));break;
    case '000010589003':case '000010575005':case '000010581003':targets=dru.filter(melee);break;
    case '000010589006':targets=dru.filter(f=>named(f,'Kabalite Warriors','Hand of the Archon')&&ranged(f));break;
    case '000010589005':actors=active.filter(s=>s.id===warlordId&&native.has(s.unit)&&tag(s,'ARCHON'));targets=[];break;
    case '000010589002':targets=kabal.filter(f=>dru.some(other=>other.root.id!==f.root.id&&!kw(other,'VEHICLE')));body+=' Other eligible sacrificial formations: '+names(dru.filter(f=>!kw(f,'VEHICLE')))+'.';break;
    case '000010589007':targets=kabal;break;
    case '000010575004':targets=dru.filter(phase==='Fight'?melee:ranged);break;
    case '000010575006':case '000010581004':targets=dru.filter(f=>!kw(f,'AIRCRAFT'));break;
    case '000010575003':targets=dru.filter(f=>!kw(f,'HAEMONCULUS COVENS'));break;
    case '000010575007':targets=dru.filter(f=>!kw(f,'SCOURGES')&&!kw(f,'AIRCRAFT'));break;
    case '000009782004':case '000009782003':targets=wager.filter(melee);break;
    case '000009782002':targets=wager.filter(phase==='Fight'?melee:ranged);break;
    case '000009782005':targets=wager.filter(f=>!kw(f,'AIRCRAFT'));break;
    case '000009782007':targets=wager.filter(f=>kw(f,'INFANTRY'));break;
    case '000009782006':targets=wager;break;
    case '000010577005':targets=infantry.filter(f=>canRide(f)&&ranged(f));break;
    case '000010577004':targets=infantry.filter(canRide);break;
    case '000010577006':targets=transports;break;
    case '000010577002':targets=transports.filter(f=>cargo(f).length>0&&melee(f));break;
    case '000010577003':targets=infantry.filter(f=>melee(f)&&(named(f,'Wyches')||canRide(f)));break;
    case '000010577007':targets=vehicles;break;
    case '000011041004':case '000011041003':targets=covens;break;
    case '000011041002':targets=dru.filter(f=>named(f,'Cronos','Talos')&&melee(f));break;
   }
   if(actors)emit('strat-'+strat.id,strat.name+' · '+strat.cp+' CP',phase,turn,strat.timing,body,actors,strat.id);
   else card('strat-'+strat.id,strat.name+' · '+strat.cp+' CP',phase,turn,strat.timing,body,targets,strat.id);
  }
 }
 if(has('Covenite Coterie'))card('poison-lasting','Poisoner’s Art · lasting poison','Command','either','start','For every enemy still on the battlefield that was poisoned by Poisoner’s Art, roll one D6; on 4+, it suffers D3 mortal wounds. This continues for the rest of the battle even if the original Haemonculus Covens source is destroyed.',originalForms.filter(f=>f.members.some(s=>native.has(s.unit)&&drukhariKeywords(army,s).has('HAEMONCULUS COVENS'))),'000010585004');

 for(const bearer of active){
  const name=current.upgrades2026?.[bearer.id]??current.upgrades2026?.[bearer.unit]??bearer.enhancement;
  const upgrade=eligibleDrukhariUpgrades(current,bearer.unit,bearer.id).find(u=>u.name===name);if(!upgrade)continue;
  const f=forms.find(g=>g.members.some(s=>s.id===bearer.id));if(!f)continue;
  const row=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets:readonly Form[]=[f])=>card('upgrade-'+upgrade.id+'-'+bearer.id+'-'+suffix,upgrade.name+' · '+bearer.id,window,turn,timing,summary,targets,upgrade.id);
  const ownRow=(suffix:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string)=>emit('upgrade-'+upgrade.id+'-'+bearer.id+'-'+suffix,upgrade.name+' · '+bearer.id,window,turn,timing,summary,[bearer],upgrade.id);
  switch(upgrade.id){
   case '000011032002':row('snap','Movement','own','during','Enemy units cannot target this bearer’s formation with snap shooting attacks. This protection covers all snap shooting, not only Fire Overwatch.');break;
   case '000010574002':row('pain','Pre-battle','either','during','This bearer’s formation is always Empowered. At each Pain ability’s printed activation timing, it can activate that ability without spending Pain tokens. Optional token costs for other enhancements or Stratagems are not waived. Only the actual formation containing the surviving bearer receives this benefit.');break;
   case '000010588002':
    ownRow('save','Pre-battle','either','during','Only this Archon bearer has a 3+ Save characteristic; its Bodyguards do not receive that Save.');
    ownRow('heal','Command','either','start','At the start of either player’s Command phase, you may spend 1 Pain token to restore all of this Archon bearer’s lost wounds.');break;
   case '000010576002':
    if(transports.length)for(const [phase,turn] of incoming)row('smoke',phase,turn,'during','While this bearer’s formation is wholly within 6″ of a friendly Drukhari Transport, every model has Stealth and the Benefit of Cover against ranged attacks. Under the current core rules, Stealth gives cover against ranged attacks; cover benefits do not stack. Surviving transport sources: '+names(transports)+'.');break;
   case '000010580002':row('drug','Command','own','start','After selecting your army’s Combat Drugs, roll one D6 for one additional Combat Drug applying only to this bearer’s formation until your next Command phase starts. A result already active has no additional effect.');break;
   case '000009781002':{
    const possible=forms.filter(t=>kw(t,'DEDICATED TRANSPORT')&&[...drukhariCargoFormations(army,t.root,active),...drukhariSplitCargoFormations(army,t.root,active)].some(g=>g.members.some(m=>m.id===bearer.id)));
    if(possible.length)row('scout','Pre-battle','either','during','In Declare Battle Formations, if this bearer actually starts embarked within a Dedicated Transport, that Transport gains Scouts 9″. Count the exact whole formation or selected split half and all other passengers; the grant applies only to the chosen starting transport and persists for that transport. Eligible dedicated carriers: '+names(possible)+'.');break;
   }
   case '000010584002':row('flesh','Command','own','during','When this Haemonculus bearer uses Fleshcraft, it may return up to D3+3 destroyed Bodyguard models to its formation instead of D3+1, up to Starting Strength. This does not return a destroyed Character.');break;
   case '000011040002':for(const [phase,turn] of incoming)row('gnarl',phase,turn,'during','Attacks targeting this bearer’s formation suffer −1 to Wound if their Strength is greater than its Toughness.');break;
   case '000011036002':row('stats','Pre-battle','either','during','This bearer’s formation improves Leadership and Objective Control by 1. This version of Towering Arrogance applies even while the Archon is unattached.');break;
   case '000009781003':
    row('deep','Pre-battle','either','during','Every model in this bearer’s formation has Deep Strike while the bearer remains in that formation.');
    row('arrival','Movement','either','during','When this bearer’s formation is set up using Deep Strike, if it is currently losing the wager, it may re-roll Charge rolls until that turn ends. This does not itself permit charging after ingress or override another charge restriction.');
    row('charge','Charge','own','during','If this formation arrived using Deep Strike this turn while losing the wager, re-roll its Charge rolls until turn end; obey any ingress or other charge restrictions.');break;
   case '000010576003':
    if(transports.length)row('fulcrum','Shooting','either','during','Each time you actually spend 1 Pain token to Empower this bearer’s formation in a Shooting phase, choose one friendly Drukhari Transport within 6″. That Transport’s attacks re-roll Hit rolls until phase end. Free empowerment from Dark Vitality is not a token-spend trigger. Eligible sources: '+names(transports)+'.');break;
   case '000011040003':for(const [phase,turn] of incoming)row('elixir',phase,turn,'during','Every model in this upgraded Cronos or Talos unit has a 5+ invulnerable save.');break;
   case '000011036003':
    for(const phase of ['Shooting','Fight'] as const)row('precision',phase,phase==='Fight'?'either':'own','during','This bearer’s whole formation’s attacks have Precision. Against an Attached enemy, a successful wound can be allocated to a visible Character model as described by Precision.');
    if(ranged(f))row('snap','Movement','opponent','end','If this bearer’s formation uses Fire Overwatch, its attacks retain Precision. Snap shooting cannot score Critical Hits, but Precision does not require one.');break;
   case '000011032003':for(const [phase,turn] of incoming)row('hyperstimm',phase,turn,'during','Every model in this bearer’s formation has +1 Toughness.');break;
   case '000010574003':ownRow('cunning','Command','own','start','If this Archon bearer is on the battlefield, choose one: spend 1 Pain token to gain 1 CP, or roll one D6 and gain 1 CP on 4+. Apply the core cap on CP gained outside the normal Command-phase award.');break;
   case '000010588003':
    row('deep','Pre-battle','either','during','Every model in this bearer’s formation has Deep Strike while the bearer remains in that formation.');
    row('ingress','Movement','opponent','end','You may target this bearer’s formation with Rapid Ingress for 0 CP. Resolve ingress and reserve arrival restrictions normally; this does not waive an arrival restriction or grant an extra use of a Stratagem.');break;
   case '000010580003':row('first','Fight','either','start','Once per battle at the start of the Fight phase, this bearer may give every model in its formation Fights First until phase end.');break;
   case '000010584003':
    for(const phase of ['Shooting','Fight'] as const)ownRow('anti',phase,phase==='Fight'?'either':'own','during','Only this Haemonculus bearer’s weapons have Anti-Beast 2+ and Anti-Monster 4+: unmodified Wound rolls meeting the relevant threshold are Critical Wounds. Bodyguard weapons do not inherit these abilities.');
    if(ranged(f))ownRow('anti-snap','Movement','opponent','end','If this Haemonculus bearer fires during Fire Overwatch, its weapons retain Anti-Beast 2+ and Anti-Monster 4+. Snap shooting prevents Critical Hits, not Critical Wounds.');break;
   case '000010588004':{
    const eligible=originalForms.filter(g=>g.members.some(s=>native.has(s.unit)&&['Kabalite Warriors','Hand of the Archon'].includes(s.unit)));
    if(eligible.length)row('informants','Pre-battle','either','during','At the start of Declare Battle Formations choose up to three Kabalite Warriors and/or Hand of the Archon units; the chosen units gain Infiltrators. This is an optional choice, not an automatic grant to every eligible unit. When forming attachments or Venom splits afterwards, check every actual model’s Infiltrators eligibility. Eligible units: '+names(eligible)+'.');break;
   }
   case '000010574004':ownRow('eye','Fight','either','during','Only this Succubus bearer’s melee weapons have +1 Attacks and +1 AP. Each time its formation is selected to fight, you may spend 1 Pain token to improve those characteristics by 2 instead until phase end; the increased and base bonuses do not stack.');break;
   case '000009781004':
    row('infiltrate','Pre-battle','either','during','Every model in this Harlequins bearer’s formation has Infiltrators and Stealth while the bearer remains in the formation. Infiltrators permits deployment more than 8″ horizontally from the opponent’s deployment zone and all enemy units.');
    for(const [phase,turn] of incoming)row('stealth',phase,turn,'during','Every model in this Harlequins bearer’s formation has Stealth: under the current core rules it receives the Benefit of Cover against ranged attacks. Stealth does not subtract 1 from Hit rolls.');break;
   case '000010576004':row('raider','Fight','either','during','Each time this bearer’s formation destroys an enemy unit in the Fight phase, gain 1 additional Pain token if that enemy was within range of an objective marker when your formation was selected to fight. '+demise);break;
   case '000010580004':row('overwatch','Movement','own','during','Enemy units cannot use Fire Overwatch to shoot at this bearer’s formation. This version of Periapt of Torments does not prohibit every other kind of snap shooting.');break;
   case '000010584004':
    ownRow('wounds','Pre-battle','either','during','Only this Haemonculus bearer has +1 Wounds.');
    for(const [phase,turn] of incoming)row('toughness',phase,turn,'during','Every model in this Haemonculus bearer’s formation has +1 Toughness.');break;
   case '000010580005':ownRow('curse','Fight','either','during','Only this Succubus bearer’s melee weapons improve AP and Damage by 1. Bodyguards do not inherit this weapon benefit.');break;
   case '000010588005':
    {
     const start=original.find(s=>s.id===bearer.id);
     if(bearer.attachedTo&&start?.attachedTo===bearer.attachedTo&&knightJoinedBodyguard(army,start))row('stats','Pre-battle','either','during','While this Archon bearer leads a unit, every model in that formation improves Leadership and Objective Control by 1. Under Core 19.04, the surviving Archon keeps its own while-leading benefit after its Bodyguard is destroyed if it began the battle attached. An Archon that began unattached does not receive this Kabalite Cartel benefit.');
     break;
    }
   case '000010576005':
    if(canRide(f))row('shroud','Movement','either','during','Each time this bearer’s formation disembarks from a Transport, enemy units cannot use Fire Overwatch to shoot at it for the rest of that turn. Apply the protection only to the disembarking formation or split half containing the bearer.');break;
   case '000010584005':
    ownRow('aura','Command','opponent','during','This Haemonculus bearer’s Fear Incarnate range increases by 3″. Use its current 9″ range when applying the printed ability; measure from this actual bearer model.');
    for(const window of ['Command','Movement','Shooting','Charge','Fight'] as const)ownRow('tokens',window,'either','during','Each time a friendly Drukhari formation within 9″ of this Haemonculus bearer fails a Battle-shock test or is destroyed, roll one D6; on 4+, gain 1 Pain token. The bearer must still be present to provide the aura. '+demise);break;
   case '000010574005':ownRow('crucible','Shooting','own','during','Once per battle, this Haemonculus bearer can activate the Crucible and optionally spend 1 Pain token. Each enemy unit within 12″ of the actual bearer takes a Battle-shock test, at −1 if you spent the token. Each Psyker unit failing that test suffers 3 mortal wounds, in addition to normal Power from Pain token gains.');break;
   case '000009781005':ownRow('conductor','Command','own','during','Choose one eligible option: if Drukhari are losing the wager, gain 1 Pain token and make Drukhari the winning side; if Drukhari are winning, discard 1 Pain token and make Harlequins the winning side. The second option requires a token to discard.');break;
  }
 }
 return rows;
}
