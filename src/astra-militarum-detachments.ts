import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {ASTRA_SHEETS} from './astra-militarum-data';
import {knightHasRangedWeapon} from './imperial-knight-datasheets';
import {knightLoadoutFor,knightWeaponCount} from './knight-loadouts';
import {isWarhound} from './titan-support-data';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {astraAgentName,astraMilitarumKeywords} from './astra-muster-data';
import {astraFormationGroups,astraTransportOptions} from './astra-transports';
import {astraOrderModes,astraOrderTargets} from './astra-orders';
import {astraMilitarumHasRangedWeapon,astraMilitarumModelLoadouts,astraMilitarumWeaponCount} from './astra-militarum-loadouts';
import {ASTRA_STRATAGEMS} from './astra-detachments.generated';
import {eligibleAstraMilitarumUpgrades} from './astra-militarum-detachment-data';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const source='https://wahapedia.ru/wh40k11ed/factions/astra-militarum/';
const matched=new Set(ASTRA_SHEETS.map(s=>s.unit));
const effects:Record<typeof ASTRA_STRATAGEMS[number]['id'],string>={
 '000010913004':'After enemy shooting targets this unengaged Ogryn or Bullgryn unit, it may surge up to D6″ once the enemy finishes shooting.',
 '000010913003':'After the Ratlings shoot, those ranged attacks do not prevent them from being hidden.',
 '000010913002':'When this unit is targeted in range of an objective, worsen incoming AP by 1 until that enemy finishes attacking.',
 '000010792002':'Choose one or more Astra Militarum units within 6″ of this Officer. They can re-roll Advance rolls this phase.',
 '000010792007':'Before it shoots, select a unit that disembarked this turn. Its attacks gain +1 to Wound through the end of the phase.',
 '000010792006':'After the Skirmisher shoots, mark one enemy it hit. That enemy loses Cover and all friendly Armoured Skirmishers gain +2 Strength when shooting it this phase.',
 '000010792005':'Before this Skirmisher shoots, let it re-roll Hit rolls against visible Monsters and Vehicles this phase.',
 '000010792003':'After this Armoured Skirmisher Advances or Falls Back, it can still shoot this turn.',
 '000010792004':'If this unit neither Remained Stationary nor arrived from Reserves this phase, it may make a Normal move of up to D6″.',
 '000009802004':'After these Tempestus troops shoot, choose one enemy hit. Friendly Militarum Tempestus ranged attacks against it gain Ignores Cover.',
 '000009802003':'When shooting an enemy within 12″, improve Strength and AP by 1 on the fitted hot-shot profiles listed for this formation.',
 '000009802002':'For each enemy engaged with the chosen Regiment, roll a D6. Each 2+ inflicts D6 mortal wounds on that enemy, then the Regiment suffers 3D3 mortal wounds.',
 '000008381007':'After the enemy chooses targets, select a Guard Vehicle. This phase, Infantry models in your army gain Cover against ranged attacks when this Vehicle prevents full visibility from every model in the attacking unit.',
 '000008381002':'Select one Regiment and one visible Squadron within 6″ of it. Each unit shares all Orders affecting the other until phase end.',
 '000008381005':'Before either shoots, select one Regiment and one Squadron and designate one enemy. Both units improve ranged AP by 1 against it this phase.',
 '000008381006':'This Officer can issue one Order as if it were your Command phase.',
 '000008381004':'For this Command phase any number of selected Officers can issue Orders to both Regiment and Squadron units.',
 '000008381003':'Once per battle, when this Infantry Regiment is destroyed and is not Battle-shocked, place an identical replacement at full Starting Strength and wounds into Strategic Reserves. Attached Characters are not returned to their former unit. This does not trigger the unit’s vox-caster.',
 '000010917003':'After an enemy ends a move within 8″ of this unengaged Guard Infantry formation, it may make a Normal move up to D3+3″.',
 '000010917002':'Select friendly Guard Infantry or Scout Sentinels. While an enemy is visible and within 6″ of them, its detection range increases by 3″.',
 '000010917004':'Until this phase ends, attacks against this Infantry Smoke unit grant the target Cover. Other targets also gain Cover when models in this unit obstruct full visibility from the attacker.',
 '000010638007':'After enemy target selection, worsen the AP of attacks against the chosen unit by 1 until that attacking unit finishes.',
 '000010638004':'Before this unit shoots, its ranged weapons gain Ignores Cover until the end of the phase.',
 '000010638003':'If the unit is under Duty and Honour! and within range of an objective you control, keep control until the opponent controls it at the start or end of a phase.',
 '000010638002':'This Officer can immediately issue one Order as if it were your Command phase.',
 '000010638005':'Choose a unit under an Order before it shoots. If in range of an objective, its ranged weapons gain Lethal Hits this phase.',
 '000010638006':'While under First Rank, Fire! Second Rank, Fire!, the chosen Infantry gain +1 Strength on their attacks this phase.',
 '000009866003':'Immediately after the Squadron Advances, it remains eligible to shoot this turn.',
 '000009866006':'Before the Squadron shoots, its attacks improve AP by 1 against targets within 12″ for this phase.',
 '000009866002':'Select a non-Officer Squadron below Half-strength. Until round end, its ranged attacks can ignore modifiers to Ballistic Skill and Hit rolls. Ranged weapons other than One Shot gain Hazardous.',
 '000009866004':'Immediately after the Squadron Falls Back, it remains eligible to shoot this turn.',
 '000009866005':'Before the Vehicle moves or charges, allow horizontal movement through terrain when it makes a Normal move, Advances or charges this phase.',
 '000009866007':'Once the enemy has chosen targets, subtract 1 Damage from attacks allocated to the selected Vehicle through phase end.',
 '000009862004':'Before a unit that disembarked this turn shoots, it may re-roll Hit and Wound rolls against targets in range of an objective for this phase.',
 '000009862005':'After an enemy ends a Normal move, Advance or Fall Back within 8″ of this unengaged non-Titanic, non-Aircraft Transport, it can make a Normal move of up to 6″.',
 '000009862006':'When the enemy declares a charge against this unengaged Infantry unit, before the charge move it can embark if every model is within 3″ of a compatible Guard Transport.',
 '000009862003':'After disembarking this phase, the selected Infantry formation can make a Normal move of up to D6″.',
 '000009862007':'An unengaged unit can embark if every model is within 3″ of a compatible Astra Militarum Transport.',
 '000009862002':'Select an Infantry Officer embarked in a Transport. It may issue Orders this phase while embarked, and can order friendly non-Titanic Guard Transports at any range from its carrier.',
 '000009870007':'Move the unengaged Guard Mounted or Walker unit into Strategic Reserves if wholly within 10″ of one or more battlefield edges.',
 '000009870002':'Before the Platoon shoots, give its ranged weapons Precision until the end of the phase.',
 '000009870003':'After an enemy finishes a Normal move, Advance or Fall Back within 8″ of this unengaged Platoon, it can make a Normal move up to 6″.',
 '000009870005':'Through phase end, this Infantry or Mounted unit has Feel No Pain 6+. Enemy attacks suffer −1 to Hit if your unit is the closest eligible target.',
 '000009870004':'From the beginning of the enemy Move Units step until phase end, enemy reinforcements cannot set up within 12″ of the chosen Infantry.',
 '000009870006':'Choose one visible enemy within 12″ of this Grenades unit. Subtract 1 from that enemy’s Charge rolls when it declares a charge.',
 '000009858002':'After the enemy targets this Infantry, roll for each model destroyed before fighting in this phase. On 4+ it fights after the attacking unit, then is removed. Add 2 if the destroyed model is Regiment.',
 '000009858005':'Enemy units engaged with the selected Platoon may be shot as though unengaged from it this phase. Each time such an enemy model loses a wound, roll a D6. Each 4+ destroys one model in your Platoon after that attacking unit finishes.',
 '000009858003':'When this Infantry Officer issues Move! Move! Move! this phase, it can give that Order to any number of eligible Infantry Regiment units at any range.',
 '000009858006':'Before the Platoon shoots, give its ranged weapons +1 Attack against targets within half range this phase.',
 '000009858004':'Before this Character unit shoots, it can re-roll Hit rolls against visible targets within 12″ this phase.',
 '000009858007':'When an enemy ends a Charge move engaged with this Platoon, roll a D6 per model in that enemy unit. Each 5+ inflicts one mortal wound, to a maximum of six.',
 '000010788007':'Before this Guard unit shoots, it may re-roll Hit rolls this phase.',
 '000010788002':'Before this Titanic unit fights, name one engaged enemy. Its melee weapons gain 6 Attacks and improve AP by 2 for the phase, and it can only fight that enemy.',
 '000010788004':'Before this Vehicle moves or charges, it may move horizontally through terrain during Normal moves, Advances and Charges through phase end.',
 '000010788003':'From round two, in your Move Units step, set up the Titanic unit from Reserves wholly within 8″ of a battlefield edge and more than 6″ horizontally from all enemies.',
 '000010788006':'After the Vehicle shoots, select one enemy hit. It must take a Battle-shock test at −1.',
 '000010788005':'After the Titanic unit shoots, one enemy hit cannot receive Cover for the rest of the phase.',
};

export function astraMilitarumDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Astra Militarum')return [];
 const has=(det:string)=>army.detachments2026?.includes(det);
 const rows:GeneratedReminder[]=[];
 const tags=new Map(roster.map(s=>[s.id,astraMilitarumKeywords(army,s)]));
 const tag=(s:RosterInstance,k:string)=>tags.get(s.id)?.has(k)===true;
 function hasRanged(s:RosterInstance){
  if(matched.has(s.unit))return astraMilitarumHasRangedWeapon(s);
  const agentName=astraAgentName(s.unit);
  if(!agentName)return knightHasRangedWeapon(s)||isWarhound(s.unit);
  const agent=ASSIGNED_AGENT_DATA.find(a=>a.sheet.unit===agentName);
  const configured=knightLoadoutFor('Imperial Agents',agentName,s.models);
  return agent?.weapons.some(w=>w.type==='Ranged'&&(!configured||knightWeaponCount({...s,unit:agentName},w.name)>0))===true;
 }
 const forms=astraFormationGroups(army,roster).map(f=>({...f,ranged:f.members.some(hasRanged)}));
 type Form=typeof forms[number];
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const native=forms.filter(f=>f.members.some(s=>matched.has(s.unit)));
 const all=(k:string)=>native.filter(f=>kw(f,k));
 const roots=(list:readonly Form[])=>list.map(f=>f.root);
 const names=(list:readonly Form[])=>roots(list).map(s=>s.id).join(', ');
 const locate=(s:RosterInstance)=>forms.find(f=>f.members.some(m=>m.id===s.id))!;
 const officers=roster.filter(s=>matched.has(s.unit)&&tag(s,'OFFICER'));
 const canOrder=new Map(officers.map(s=>[s.id,astraOrderTargets(army,s,roster)]));
 const actualOfficers=officers.filter(s=>canOrder.get(s.id)?.length);
 const orderable=new Set([...canOrder.values()].flat().map(s=>s.id));
 // Kasrkin's Warrior Elite explicitly issues an Order to its own unit.
 native.filter(f=>f.members.some(s=>s.unit==='Kasrkin')).forEach(f=>orderable.add(f.root.id));
 const orderedBy=(f:Form,order:string)=>f.members.some(s=>s.unit==='Kasrkin'&&order!=='On My Signal!')||actualOfficers.some(s=>astraOrderModes(army,s).includes(order)&&canOrder.get(s.id)?.some(t=>t.id===f.root.id));
 const infantry=all('INFANTRY'),vehicles=all('VEHICLE'),skirmish=all('ARMOURED SKIRMISHER'),reg=all('REGIMENT'),squadrons=all('SQUADRON');
 const transports=all('TRANSPORT');
 const cargoOptions=new Map(astraTransportOptions(army,roster).map(o=>[o.transport.id,new Set(o.passengers)]));
 const carriers=(f:Form)=>transports.filter(t=>cargoOptions.get(t.root.id)?.has(f.root.id));
 const cargo=native.filter(f=>carriers(f).length);
 const shooter=(list:Form[])=>list.filter(f=>f.ranged);
 const to=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],sourceRuleId?:string)=>{
  if(units.length)rows.push({id:'11e-astra-'+key+'-'+window,title,window,turn,timing,summary,source,origin:'detachment',units:[...new Set(units.map(s=>s.id))],sourceRuleId});
 };
 const rule=(key:string,name:string,phase:ReminderWindow,turn:Turn,timing:Timing,body:string,units:Form[])=>to(key,name,phase,turn,timing,body,roots(units));
 if(has('Combined Arms')){
  rule('born-regiment','Born Soldiers · Regiment','Shooting','own','during','Against visible targets other than Monsters and Vehicles, the ranged attacks of models in this Regiment unit gain Lethal Hits.',shooter(reg));
  rule('born-squadron','Born Soldiers · Squadron','Shooting','own','during','Against visible Monsters or Vehicles, ranged attacks by models in this Squadron unit gain Lethal Hits.',shooter(squadrons));
 }
 if(has('Bridgehead Strike')){
  rule('purge','Fire Zone Purge','Shooting','own','during','When selected to shoot after being set up this turn, these Militarum Tempestus units gain +1 to ranged Hit rolls.',shooter(all('MILITARUM TEMPESTUS')));
  if(native.some(f=>f.members.some(s=>s.unit==='Tempestus Scions'&&tag(s,'BATTLELINE'))))rule('purge-oc','Fire Zone Purge · Tempestus Scions','Command','either','during','Your Militarum Tempestus Officer is Warlord. These Scions gain Battleline and +1 Objective Control.',native.filter(f=>f.members.some(s=>s.unit==='Tempestus Scions')));
 }
 if(has('Siege Regiment')){
  const cap=army.battleSize2026==='Incursion'?2:3;
  to('support','Artillery Support','Start of battle round','either','start','Choose one support for this round, affecting up to '+cap+' units. For Creeping Barrage, choose the order and roll individually for enemies more than 12″ from every friendly battlefield model. Each 5+ reduces Move and Charge rolls by 2. Stop rolling when the limit is reached. Incendiary Bombardment removes Cover from eligible enemies at that same distance. Smoke Shells gives selected friendly units Stealth.',roster);
 }
 if(has('Mechanised Assault'))rule('fist','Armoured Fist','Shooting','own','during','When a Guard model shoots during the turn it disembarked, add 1 to its Wound rolls.',shooter(cargo));
 if(has('Hammer of the Emperor'))rule('tread','Iron Tread','Movement','own','during','When advancing, add 6″ to Move without rolling. The Squadron may pass through Engagement Range but must end outside it.',squadrons);
 if(has('Recon Element'))rule('camouflage','Masters of Camouflage','Shooting','opponent','during','The unit has Stealth. Apply it to incoming ranged attacks.',native.filter(f=>!kw(f,'TITANIC')));
 if(has('Grizzled Company'))for(const p of ['Shooting','Fight'] as const)rule('discipline','Ruthless Discipline',p,p==='Fight'?'either':'own','during','While this Guard unit is affected by an Order, re-roll Hit rolls of 1.',native.filter(f=>orderable.has(f.root.id)&&(p==='Fight'||f.ranged)));
 if(has('Steel Hammer'))rule('cannonade','Ceaseless Cannonade','Shooting','own','during','The unit can shoot an engaged enemy, including with Blast, if no other friendly unit is engaged with that enemy. Ignore the Hit penalty for shooting while engaged except when using Indirect Fire.',shooter(native.filter(f=>kw(f,'TITANIC')||kw(f,'SQUADRON'))));
 if(has('Armoured Infantry'))rule('skirmisher','Squadron Command · On My Signal','Movement','opponent','during','While under On My Signal, after an enemy Normal move or Advance ends within 8″, this Armoured Skirmisher can make a Normal move up to D6″. Once per turn per unit.',skirmish.filter(f=>orderedBy(f,'On My Signal!')));
 if(has('Designation Force'))rule('flare','Designated Targets · Signal Flares','Shooting','own','during','Select one visible enemy within 12″ of this unit. While designated, increase that enemy’s detection range by 3″.',native.filter(f=>kw(f,'SCOUT SENTINEL')||f.members.some(s=>s.unit==='Scout Sentinels')||(kw(f,'INFANTRY')&&kw(f,'SMOKE'))));
 const platoons=all('PLATOON');
 const hotShots=['Hot-shot lascarbine','Hot-shot lasgun','Hot-shot laspistol','Hot-shot marksman rifle','Hot-shot volley gun','Sentry hot-shot volley gun'];
 for(const st of ASTRA_STRATAGEMS){
  if(!has(st.detachment))continue;
  for(const {phase,turn} of st.windows){
   let targets=native.filter(f=>f.members.some(s=>st.units.some(n=>n===s.unit))),text=effects[st.id];
   switch(st.id){
    case '000010792002':targets=officers.map(locate);break;
    case '000010792007':case '000009862004':targets=shooter(cargo);break;
    case '000010792006':case '000010792005':case '000010792003':targets=shooter(skirmish);break;
    case '000009802003':{
     targets=targets.filter(f=>f.members.some(s=>hotShots.some(w=>astraMilitarumWeaponCount(s,w)>0)));
     if(targets.length)text+=' '+targets.map(f=>f.root.id+' — '+hotShots.filter(w=>f.members.some(s=>astraMilitarumWeaponCount(s,w)>0)).join(', ')).join('. ')+'.';
     break;
    }
    case '000008381007':{
     const eligible=forms.filter(f=>kw(f,'INFANTRY'));if(!eligible.length)continue;
     targets=vehicles;text+=' Eligible Infantry include '+names(eligible)+'.';break;
    }
    case '000008381002':case '000008381005':{
     const regTarget=st.id==='000008381005'?shooter(reg):reg,squadTarget=st.id==='000008381005'?shooter(squadrons):squadrons;
     if(!regTarget.some(r=>squadTarget.some(s=>s!==r)))continue;
     targets=[...new Set([...regTarget,...squadTarget])];
     text+=' Regiment: '+names(regTarget)+'. Squadron: '+names(squadTarget)+'.';break;
    }
    case '000008381006':case '000010638002':targets=actualOfficers.map(locate);break;
    case '000008381004':if(!reg.length&&!squadrons.length)continue;targets=officers.map(locate);break;
    case '000010917004':targets=infantry.filter(f=>kw(f,'SMOKE'));break;
    case '000010638003':case '000010638005':case '000010638006':
     targets=targets.filter(f=>orderable.has(f.root.id)&&(st.id==='000010638003'?orderedBy(f,'Duty and Honour!'):f.ranged)&&(st.id!=='000010638006'||orderedBy(f,'First Rank, Fire! Second Rank, Fire!')));break;
    case '000009866002':targets=shooter(squadrons.filter(f=>!kw(f,'OFFICER')));break;
    case '000009862006':case '000009862003':targets=cargo.filter(f=>kw(f,'INFANTRY'));break;
    case '000009862007':targets=cargo;break;
    case '000009862002':targets=cargo.filter(f=>f.members.some(s=>tag(s,'OFFICER')&&tag(s,'INFANTRY')));break;
    case '000009858003':{
     const mobile=actualOfficers.filter(s=>tag(s,'INFANTRY')&&astraOrderModes(army,s).includes('Move! Move! Move!')&&canOrder.get(s.id)?.some(t=>reg.some(f=>f.root.id===t.id&&kw(f,'INFANTRY'))));
     targets=mobile.map(locate);break;
    }
    case '000009858005':targets=platoons.filter(f=>forms.some(a=>a!==f&&a.ranged));break;
    case '000009858004':targets=shooter(all('CHARACTER'));break;
    case '000010788007':case '000010638004':targets=shooter(native);break;
   }
   if(phase==='Shooting'&&turn==='own'&&!['000010917002','000009858005'].includes(st.id))targets=shooter(targets);
   if(['000009862006','000009862007','000009862002','000009862003','000010792007','000009862004'].includes(st.id)&&targets.length)
    text+=' Compatible pairs: '+targets.map(f=>f.root.id+' with '+names(carriers(f))).join('. ')+'.';
   const name=st.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,c=>c.toUpperCase());
   to('strat-'+st.id,name+' · '+st.cp+'CP',phase,turn,st.timing,text,roots(targets),st.id);
  }
 }
 for(const bearer of roster){
  const selected=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit]??bearer.enhancement;
  if(!selected)continue;
  const up=eligibleAstraMilitarumUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===selected);
  if(!up)continue;
  const form=locate(bearer),formation=[form.root],recipient=canOrder.get(bearer.id)??[];
  const issue=(window:ReminderWindow,turn:Turn,when:Timing,body:string,units:readonly RosterInstance[]=[bearer])=>
   to(up.id+'-'+bearer.id,bearer.id+' · '+up.name,window,turn,when,body,units,up.id);
  const inbound=(body:string,units:readonly RosterInstance[]=[bearer])=>{for(const p of phases)issue(p,'either','during',body,units)};
  switch(up.id){
   case '000010787002':case '000008380004':case '000010637005':
    // Issue count, recipients and range are printed directly on the Officer’s Order card.
    break;
   case '000009801002':break; // Master Vox multi-recipient targeting is on the native Order card.
   case '000009865002':{
    const eligible=squadrons.filter(f=>recipient.some(s=>s.id===f.root.id));
    if(eligible.length>1)issue('Command','own','during','Once per turn, after issuing an Order to a Squadron, the bearer may issue that same Order to another Squadron.',roots(eligible));
    break;
   }
   case '000009861002':
    issue('Command','own','end','If you control an objective in range of the bearer’s unit or the Transport carrying it, retain control until the opponent controls it at the start or end of a turn.',[form.root,...roots(carriers(form))]);break;
   case '000008380002':issue('Command','either','during','While this formation is Battle-shocked, reduce its models’ Objective Control by 1 instead of setting it to zero.',formation);break;
   case '000009857002':
    if(form.root!==bearer&&kw(form,'REGIMENT'))issue('Pre-battle','either','during','The Officer leads this Regiment. Its unit gains Scouts 6″.',formation);break;
   case '000010791002':{
    const extras=platoons.filter(f=>f!==form);
    if(recipient.some(s=>s.id===form.root.id)&&extras.length)issue('Command','own','during','When the bearer issues an Order to its own unit, it also issues that Order to up to two other Platoons within 3″ of its unit.',roots(extras));
    break;
   }
   case '000010916002':issue('Pre-battle','either','during','These upgraded Scout Sentinels have Infiltrators.',formation);break;
   case '000010912002':issue('Shooting','own','during','When the Ratlings are selected to shoot, add 6″ to enemy units’ detection range until the Ratlings finish shooting.',formation);break;
   case '000010637002':issue('Pre-battle','either','during','The Commissar can lead an Ogryn Squad or Bullgryn Squad and can issue Orders to Ogryn units.',[bearer,...roots(native.filter(f=>f!==form&&(kw(f,'OGRYN')||f.root.unit==='Bullgryn Squad')))]);break;
   case '000009869002':issue('Pre-battle','either','end','After both armies deploy, if the bearer is on the battlefield, redeploy up to three other friendly Guard Infantry units. Strategic Reserves are allowed regardless of existing Reserves.',roots(infantry.filter(f=>f!==form)));break;
   case '000009869003':for(const p of phases)issue(p,'either','start','Once per battle, choose one enemy within 8″ of the bearer’s unit other than a Monster or Vehicle. It must test for Battle-shock.');break;
   case '000010637003':issue('Shooting','own','during','While under the bearer’s Target Weak Spot Order, improve ranged AP by 1 against enemies within 12″.',recipient.filter(s=>locate(s).ranged));break;
   case '000009801003':case '000010916003':issue('Movement','own','during','In your first Movement phase this unit can make an ingress move.',formation);break;
   case '000009865003':inbound('The Vehicle Officer has Feel No Pain 6+.');break;
   case '000010787003':issue('Shooting','own','during','The bearer may re-roll the Damage roll of its ranged attacks.');break;
   case '000009861003':issue('Shooting','own','start','Choose a friendly Transport within 3″ of the Tech-Priest, excluding Aircraft and Titanic models. Its attacks can re-roll Hit rolls this phase.',roots(shooter(transports.filter(f=>!kw(f,'TITANIC')&&!kw(f,'AIRCRAFT')))));break;
   case '000010791003':if(carriers(form).length)issue('Fight','opponent','end','The unengaged bearer’s unit can embark if every model is within 3″ of the same compatible Guard Transport. Possible carriers: '+names(carriers(form))+'.',formation);break;
   case '000009857003':issue('Movement','own','end','The enemy cannot target the bearer’s formation with Fire Overwatch.',formation);break;
   case '000008380003':if(form.root!==bearer&&form.ranged)issue('Shooting','own','during','While this bearer is leading, if its formation Remained Stationary, successful unmodified ranged Hit rolls of 5+ are Critical Hits.',formation);break;
   case '000010912003':inbound('The Commissar bearer has Feel No Pain 4+.');break;
   case '000009865004':issue('Command','either','during','Add 3 to this Vehicle Officer’s Objective Control.');break;
   case '000010787004':issue('Command','own','during','When the bearer uses Omnissiah’s Blessing, its selected friendly Guard Vehicle gains 3″ Move until your next Command phase starts.',roots(vehicles));break;
   case '000010791004':inbound('Friendly Armoured Skirmishers within 3″ of the Enginseer have Feel No Pain 5+.',roots(skirmish));break;
   case '000009861004':if(transports.length)issue('Shooting','opponent','during','While wholly within 3″ of one or more friendly Transport models, this formation has Stealth and Cover.',formation);break;
   case '000010637004':issue('Shooting','opponent','during','While under the bearer’s Move to the Shadows Order, this unit has Stealth against the resolving ranged attacks.',recipient);break;
   case '000009869004':issue('Pre-battle','either','during','Only the bearer gains Scouts 6″. A formation can scout only if every model has Scouts.',[bearer]);break;
   case '000009857004':{
    const kits=astraMilitarumModelLoadouts(bearer);
    const items=kits.filter(m=>astraMilitarumKeywords(army,bearer,m.model).has('OFFICER')).flatMap(m=>m.items);
    const pistols=[...new Set(items.filter(name=>/pistol|laspistol/i.test(name)))];
    if(pistols.length)issue('Shooting','own','during','Add 2 Attacks to the bearer’s fitted pistols: '+pistols.join(', ')+'.');break;
   }
   case '000009865005':if(form.ranged)issue('Shooting','own','during','The bearer’s unit re-rolls ranged Hit rolls of 1.',formation);break;
   case '000009857005':if(form.root!==bearer&&orderable.has(form.root.id))issue('Command','own','during','While the bearer leads, when this unit is issued an Order it also receives Take Cover!.',formation);break;
   case '000008380005':for(const p of phases)issue(p,'either','during','Whenever an enemy is set up within 8″ of the bearer’s unit, it may issue one extra Order outside its normal battle-round allowance.',recipient);break;
   case '000009861005':if(carriers(form).length)issue('Movement','own','during','This formation may disembark after its carrier Advances. Use a shock disembark move.',formation);break;
   case '000009869005':for(const p of ['Movement','Charge'] as const)issue(p,'opponent','during','When enemy Infantry or Mounted finish a Normal move, Advance, charge or Fall Back within 8″, roll a D6. On 4+ apply −1 to their Hit rolls until your next turn starts.');break;
   case '000010791005':issue('Pre-battle','either','end','After both armies deploy, if the bearer’s formation or its carrier is on the battlefield, redeploy up to two Regiment or Squadron units. They may enter Strategic Reserves irrespective of existing Reserves.',roots([...new Set([...reg,...squadrons])]));break;
   case '000010787005':issue('Movement','own','during','When a unit disembarks after this carrier’s Normal move, it makes an assault disembark move.',roots(cargo.filter(f=>carriers(f).includes(form))));break;
  }
 }
 return rows;
}
