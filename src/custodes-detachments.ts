import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {CUSTODES_SHEETS,custodesKeywords} from './adeptus-custodes-data';
import {custodesHasRangedWeapon} from './custodes-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {CUSTODES_ARMY_ABILITIES,CUSTODES_STRATAGEMS,CUSTODES_UPGRADES} from './custodes-detachments.generated';

const source='https://wahapedia.ru/wh40k11ed/factions/adeptus-custodes/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const,attacks=['Shooting','Fight'] as const;
type Turn='own'|'opponent'|'either';
const norm=(s:string)=>s.trim().toLowerCase().replace(/[‑–]/g,'-').replaceAll('’',"'");
const rules=new Map(CUSTODES_ARMY_ABILITIES.map(s=>[norm(s.unit),s]));
const own=(s:RosterInstance)=>rules.get(norm(s.unit));
const selected=(army:ArmySelection,s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit];
export function eligibleCustodesUpgrades(army:ArmySelection,unit:string){
 if(army.faction!=='Adeptus Custodes')return [];
 return CUSTODES_UPGRADES.filter(u=>army.detachments2026?.includes(u.detachment)&&u.units.some(name=>norm(name)===norm(unit)));
}
const effects:Record<typeof CUSTODES_STRATAGEMS[number]['id'],string>={
 '000011262004':'When an enemy finishes Falling Back, an Infantry unit that was engaged with it at the start of this phase can use normal shooting against that enemy alone.',
 '000011262002':'When selected to Fall Back, that move leaves this unit eligible to shoot and charge.',
 '000011262003':'When selected to shoot, add 1 Strength to the unit’s ranged attacks against targets within 9″.',
 '000008931003':'After enemy target selection, if this unit has not fought when a model is destroyed, roll a D6 for that model, adding 1 for a Character. On a 3+ leave it in play until the unit has fought or the phase ends, whichever comes first.',
 '000008931002':'After this Character uses its once-per-battle, per-unit datasheet ability, it may use that ability one more time in a later phase. Each Character may receive this Stratagem only once per battle.',
 '000011270003':'When the unit makes an ingress move, incoming attacks suffer −1 to Hit and enemy snap shooting cannot target this unit until the start of your next turn.',
 '000011270004':'After the unit Advances, it can still declare a charge.',
 '000011270002':'When selected to pile in, the unit can move up to D3+3″ during that pile-in.',
 '000011258002':'When selected to fight, the unit may ignore Hit and Wound roll modifiers on melee attacks.',
 '000011258003':'When selected to fight, gain +1 to Wound in melee against targets whose Toughness exceeds this unit’s.',
 '000011258004':'An unengaged eligible unit within 6″ of an enemy can declare a charge. Cap the modified Charge roll at 6. Only target enemies within 6″ and the maximum distance.',
 '000011254004':'At the end of your Movement phase select an objective controlled by your non-Monster, non-Vehicle unit. That objective becomes secured.',
 '000011254002':'After enemy target selection, worsen incoming AP by 1 against this unit until that attacker finishes. Custodian Wardens units are excluded.',
 '000011254003':'Choose a Custodes unit that is not readied. It becomes readied. Each unit can receive this Stratagem only once per battle round.',
 '000011266003':'When the Grav-assault unit is selected to shoot, give its ranged attacks Assault.',
 '000011266002':'When this Grav-assault unit is destroyed, secure an objective it controlled and was within range of at the time. The objective must have no enemy unit within range other than Aircraft.',
 '000011266004':'When selected to shoot, this Grav-assault unit can ignore modifiers to its BS and Hit rolls.',
 '000011242003':'Choose a Custodes unit that is not readied. It becomes readied. Each unit can receive this Stratagem only once per battle round.',
 '000011242002':'When an engaged enemy model selects targets, it suffers −1 to Hit and Wound if it does not direct every attack at the selected Infantry or Mounted unit.',
 '000011242006':'After Advancing, this unit’s ranged attacks gain Assault and it can declare a charge until turn end.',
 '000011242007':'After an enemy ends a move within 8″ of the unengaged Trusted Sentinel unit, your unit can make a Normal move up to D3+3″.',
 '000011242004':'After enemy target selection, worsen incoming AP by 1 against this unit until that attacker finishes. Custodian Wardens units are excluded.',
 '000011242005':'When selected to shoot, the unit can re-roll one Hit roll, one Wound roll and one Damage roll for its ranged attacks.',
 '000011246003':'When a below-starting-strength Trusted Sentinel unit is selected to fight, its non-Character models gain 2 melee Attacks.',
 '000011246002':'When consolidating, choose the objective consolidation mode without its Before Moving restrictions. Leaving engagement range is allowed if all remaining conditions for that mode are met.',
 '000011246004':'After an enemy ends a move within 8″ of the unengaged Trusted Sentinel unit, your unit can make a Normal move up to D3+3″.',
 '000009988004':'When a Terminator unit that made an ingress move this turn declares a charge, it gains +2 to its Charge rolls.',
 '000009988003':'Split this Terminator unit of at least two models into separate single-model units. Each new unit has starting strength 1.',
 '000009988002':'After enemy target selection, reduce the Damage of attacks against this Terminator unit by 1 until that enemy finishes attacking.',
 '000010993004':'When the Dreadnought is selected to move or declares a charge, it gains Mobile.',
 '000010993002':'The selected Dreadnought projects a 6″ aura permitting friendly Adeptus Custodes units to re-roll Hit rolls of 1.',
 '000010993003':'After the Dreadnought Advances, its ranged attacks gain Assault until turn end and the move leaves it eligible to charge.',
 '000008927003':'After the Prosecutor Squad shoots, choose an enemy hit. Attacks into that enemy improve AP by 1 until turn end.',
 '000008927004':'When the Witchseekers shoot, their Torrent attacks gain 1 Attack, or gain 2 Attacks against a Psyker or battle-shocked unit.',
 '000008927002':'When the Vigilator Squad fights, give its attacks either Sustained Hits 1 or Lethal Hits.',
 '000011238004':'After an enemy fights, select an eligible Custodes unit in objective range. It gains Fights First and must be the next friendly unit you select to fight.',
 '000011238003':'After an enemy Falls Back, an unengaged Custodes Infantry unit within 6″ of it can charge. Only target enemies that Fell Back this phase and are within the maximum distance.',
 '000011238002':'When this Infantry unit fights, its melee attacks gain Lethal Hits against Characters and Monsters.',
 '000011250003':'When the Custodes unit Falls Back, it remains eligible to shoot.',
 '000011250004':'Select an unengaged Custodes unit and a visible enemy within 12″. If that enemy declares a charge, its Charge roll suffers −1.',
 '000011250002':'When selected to move, this unit may ignore modifiers to its Move, Advance rolls and Charge rolls until the end of the turn.',
};
const favoured={
 'Conservai':['Emissaries Imperatus','Heralds of the Throne also allows this unit to start an action after Advancing or Falling Back until turn end.'],
 'Calistus':['Solar Watch','Talon Sortie also adds 2″ to Move.'],
 'Salvus':['Aquilan Shield','Gilded Guardians also adds 6″ range to the unit’s ranged attacks.'],
 'Dacatarai':['Dread Host','Enemy units engaged with this unit subtract 2″ from their pile-in and consolidation moves.'],
 'Kaptaris':['Shadowkeepers','Choose an engaged enemy to take Battle-shock at −1. Each enemy can be selected for this effect only once per phase.'],
 'Rendax':['Emperor’s Chosen','You may roll a D6 against one engaged Monster or Vehicle. On 1–2 it suffers 1 mortal wound, on 3–5 D3, and on 6 it suffers 3.'],
} as const;
export function custodesDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adeptus Custodes')return [];
 const members=roster.filter(s=>own(s));
 const sheets=new Map(CUSTODES_SHEETS.map(s=>[norm(s.unit),s]));
 const keywords=new Map(members.map(s=>[s.id,custodesKeywords(army,s)]));
 const kw=(s:RosterInstance,k:string)=>keywords.get(s.id)?.has(k)===true;
 const grouped=new Map<string,RosterInstance[]>();
 for(const s of members){
  const id=s.attachedTo?knightJoinedBodyguard(army,s)?.id??s.id:s.id;
  grouped.set(id,[...(grouped.get(id)??[]),s]);
 }
 const forms=[...grouped].map(([id,group])=>({root:group.find(s=>s.id===id)!,group}));
 type Form=typeof forms[number];
 const roots=(fn:(f:Form)=>boolean)=>forms.filter(fn).map(f=>f.root);
 const some=(f:Form,fn:(s:RosterInstance)=>boolean|undefined)=>f.group.some(fn);
 const has=(d:string)=>army.detachments2026?.includes(d);
 const ranged=(s:RosterInstance)=>custodesHasRangedWeapon(s)||norm(selected(army,s)??'')==='auriferous orb';
 const isGold=(s:RosterInstance)=>!!own(s)&&!own(s)!.nulls;
 const gold=roots(f=>some(f,isGold)),ground=roots(f=>some(f,isGold)&&!some(f,s=>kw(s,'AIRCRAFT'))),sisters=roots(f=>some(f,s=>own(s)?.nulls));
 const canShoot=roots(f=>some(f,isGold)&&some(f,ranged));
 const hasStance=roots(f=>some(f,s=>own(s)?.katah));
 const stanceEligible=has('Emperor’s Chosen')||has('Guardians of the Throne')?gold:hasStance;
 const sentinels=roots(f=>some(f,s=>kw(s,'TRUSTED SENTINEL')));
 const terms=roots(f=>some(f,s=>isGold(s)&&kw(s,'TERMINATOR'))),dreads=roots(f=>some(f,s=>kw(s,'DREADNOUGHT')));
 const noVehicle=roots(f=>some(f,isGold)&&!some(f,s=>kw(s,'VEHICLE')||kw(s,'MONSTER')));
 const goldChars=members.filter(s=>isGold(s)&&kw(s,'CHARACTER'));
 const rows:GeneratedReminder[]=[];
 function add(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,targets:readonly RosterInstance[],origin:GeneratedReminder['origin']='detachment'){
  if(targets.length)rows.push({id:'11e-custodes-'+key+'-'+window,title,turn,window,timing,summary:text,units:targets.map(s=>s.id),source,origin});
 }
 function katah(name:keyof typeof favoured,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,targets=stanceEligible){
  const [host,extra]=favoured[name];
  add('katah-'+name,name+' Ka’tah',window,turn,timing,'Spend this unit’s readied state. '+text+(has(host)?' '+extra:''),targets,'army');
 }
 add('ready','Martial Ka’tah · ready units','Command','own','start','Each listed unit becomes readied. It may spend that state for one ka’tah when its trigger occurs.',hasStance,'army');
 katah('Conservai','Command','own','during','Until turn end, an engaged or battle-shocked unit can start an action, and starting an action does not prevent shooting.');
 katah('Calistus','Movement','own','during','When selected to move, this unit can pass through all types of models on a Normal, Advance or Fall Back move.',stanceEligible.filter(s=>ground.some(g=>g.id===s.id)));
 katah('Salvus','Shooting','own','during','When selected to shoot, the unit may ignore modifiers to its BS, Hit rolls and Wound rolls.',stanceEligible.filter(s=>canShoot.some(t=>t.id===s.id)));
 katah('Dacatarai','Fight','either','start','Re-roll melee Hit rolls of 1 against targets other than Monsters and Vehicles.');
 katah('Kaptaris','Fight','either','start','Melee attacks targeting this unit suffer −1 to Hit.');
 katah('Rendax','Fight','either','during','When selected to fight, the unit’s melee attacks gain Lethal Hits against Monsters and Vehicles.');
 const candidates=members.filter(s=>kw(s,'CHARACTER')&&(isGold(s)||has('Null Maiden Vigil')));
 const warlord=candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
 if(warlord&&own(warlord)?.aquila)add('aquila','Aquila Commander','Start of battle round','either','start','Your designated Aquila Commander Warlord generates 1CP.',[warlord],'army');
 for(const phase of phases)add('aegis','Aegis of the Emperor',phase,'either','during','Models in these units have Feel No Pain 5+ against mortal wounds.',roots(f=>some(f,s=>own(s)?.aegis)),'army');
 if(sisters.length){
  add('daughters-reactions','Daughters of the Abyss · reactive shooting','Movement','either','during','Against a Psychic attack made during a Movement phase, these Anathema units retain Feel No Pain 3+.',sisters,'army');
  add('psychic-null-reactions','Psychic Null · reactive shooting','Movement','either','during','If targeted by Psychic attacks during a Movement phase, Custodes within 6″ of a friendly Anathema aura gain Feel No Pain 5+.',gold,'army');
  for(const phase of attacks){
   add('daughters','Daughters of the Abyss',phase,'either','during','These Anathema Psykana units have Feel No Pain 3+ against Psychic attacks.',sisters,'army');
   add('null','Psychic Null (Aura)',phase,'either','during','A friendly Adeptus Custodes unit within 6″ of one of these Anathema units ('+sisters.map(s=>s.id).join(', ')+') has Feel No Pain 5+ against Psychic attacks.',gold,'army');
  }
 }
 if(has('Null Maiden Vigil'))add('creeping-dread','Creeping Dread (Aura)','Command','opponent','during','In the Battle-shock step, each enemy within 12″ of one or more of these Anathema Psykana units must test at −1 if it is a Psyker or below starting strength.',sisters);
 if(has('Auric Champions')){
  add('dreadful','Assemblage of Might','Command','own','during','Select one enemy as the dreadful foe until your next Command phase. Only Adeptus Custodes Character models gain +1 to Wound against it.',goldChars);
  for(const phase of attacks)add('foe','Assemblage of Might · dreadful foe',phase,phase==='Fight'?'either':'own','during','The listed Character models gain +1 to Wound against your dreadful foe. A surviving Bodyguard does not inherit the bonus when its Character dies.',goldChars.filter(s=>phase==='Fight'||ranged(s)));
 }
 if(has('Lions of the Emperor'))add('wings','On Gilded Wings','Fight','opponent','end','An unengaged friendly Custodes Terminator unit may enter Strategic Reserves.',terms);
 if(has('Might of the Moritoi')){
  add('ancients','Moritoi Ancients · objectives','Command','either','during','At starting strength, the Dreadnought has +2 Objective Control.',dreads);
  for(const phase of attacks)add('ancients','Moritoi Ancients',phase,phase==='Fight'?'either':'own','during','Below starting strength, re-roll Hit rolls of 1. Below half-strength, also re-roll Wound rolls of 1.',dreads);
 }
 if(has('Shadowkeepers'))add('wardens','Wardens of the Dark Cells','Fight','either','during','While in objective range, incoming melee attacks whose Strength exceeds this unit’s Toughness suffer −1 to Wound.',noVehicle);
 if(has('Guardians of the Throne'))add('mastery','Martial Mastery','Fight','either','during','When selected to fight, choose Sustained Hits 1 or Lethal Hits for this unit’s melee attacks.',gold);
 if(has('Honoured Companions'))add('watch-reactions','Companion’s Watch · reactive shooting','Movement','opponent','during','When a Trusted Sentinel in objective range shoots during the opposing Movement phase, re-roll Wound rolls of 1. This applies to Fire Overwatch.',sentinels);
 if(has('Honoured Companions'))for(const phase of attacks)add('watch','Companion’s Watch',phase,phase==='Fight'?'either':'own','during','In objective range, this Trusted Sentinel unit re-rolls Wound rolls of 1.',sentinels);
 if(has('Solar Watch')){
  add('sortie','Talon Sortie','Movement','own','during','After Falling Back, the move leaves this Custodes unit eligible to charge.',ground);
  add('sortie','Talon Sortie','Charge','own','during','Custodes units that Fell Back this turn may still declare a charge.',ground);
 }
 if(has('Emperor’s Chosen'))add('magna-reactions','Magna Imperator · Fire Overwatch','Movement','opponent','end','When selected to Fire Overwatch, the unit may re-roll one Wound roll. The snap-shooting restriction prevents re-rolling a Hit roll.',canShoot);
 if(has('Emperor’s Chosen'))for(const phase of attacks)add('magna','Magna Imperator',phase,phase==='Fight'?'either':'own','during','Whenever this unit is selected to attack, it can re-roll one Hit roll and one Wound roll.',phase==='Fight'?gold:canShoot);
 if(has('Emissaries Imperatus'))add('heralds','Heralds of the Throne','Fight','either','start','Friendly Adeptus Custodes units have Fights First.',gold);
 if(has('Aquilan Shield'))add('gilded','Gilded Guardians','Shooting','opponent','during','In objective range, incoming ranged attacks whose Strength exceeds the unit’s Toughness suffer −1 to Wound.',noVehicle);
 if(has('Grav-Assault Force'))add('shields-reactions','Flare Shields · reactive shooting','Movement','either','during','These units retain their 4+ invulnerable save against ranged attacks made during a Movement phase.',roots(f=>some(f,s=>kw(s,'GRAV-ASSAULT'))));
 if(has('Grav-Assault Force'))add('shields','Flare Shields','Shooting','opponent','during','Grav-assault units have a 4+ invulnerable save against ranged attacks.',roots(f=>some(f,s=>kw(s,'GRAV-ASSAULT'))));
 if(has('Dread Host'))add('wrath','Instruments of the Emperor’s Wrath','Charge','own','during','Friendly Adeptus Custodes units may re-roll Charge rolls.',ground);
 for(const strat of CUSTODES_STRATAGEMS){
  if(!has(strat.detachment))continue;
  const eligible=new Set<string>(strat.units);
  const targetForms=forms.filter(f=>some(f,s=>eligible.has(s.unit)));
  const visible=targetForms.filter(f=>{
   switch(strat.name){
    case 'IN AURAMITE CLAD':return !some(f,s=>s.unit==='Custodian Wardens');
    case 'UNLEASH THE LIONS':return f.group.length>1||(f.root.models??1)>=2||f.root.models===undefined&&!kw(f.root,'CHARACTER');
    case 'MANOEUVRE AND FIRE':case 'PRETERNATURAL RAPIDITY':case "AT SPEAR'S LENGTH":case 'LIGHTNING WRATH':case 'UNLIMITED ENDURANCE':return !some(f,s=>kw(s,'AIRCRAFT'));
    case 'RAPID REACTIONS':case 'TIP OF THE TALON':case 'PRIME TARGET':return some(f,ranged);
    default:return true;
   }
  }).map(f=>f.root);
  const title=strat.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,s=>s.toUpperCase())+' · '+strat.cp+'CP';
  if(strat.name==='GILDED CHAMPION'){
   for(const bearer of goldChars){
    const ability=own(bearer)?.oncePerUnit[0];
    if(!ability)continue;
    const window=ability==='Vengeful Surge'?'Shooting':ability==='Archeotech Teleport-shunter'?'Movement':'Fight';
    add(strat.id+'-'+bearer.id,title,window,window==='Shooting'?'opponent':window==='Movement'?'own':'either',window==='Fight'?'end':'during',ability+': '+effects[strat.id],[bearer]);
   }
  }else for(const w of strat.windows)add(strat.id,title,w.phase,w.turn,strat.timing,effects[strat.id],visible);
 }
 for(const bearer of members){
  const name=selected(army,bearer);
  const u=name&&eligibleCustodesUpgrades(army,bearer.unit).find(o=>norm(o.name)===norm(name));
  if(!u)continue;
  const form=forms.find(f=>f.group.some(s=>s.id===bearer.id))!;
  const emit=(window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,targets=[bearer])=>add(u.id+'-'+bearer.id,bearer.id+' · '+u.name,window,turn,timing,text,targets);
  switch(u.id){
   case '000008930002':emit('Shooting','opponent','during','The bearer has Stealth and Lone Operative. Apply the normal conditions for models in attached units.');break;
   case '000009987002':emit('Movement','own','during','This unit can make an ingress move in your first Movement phase.',[form.root]);break;
   case '000010992002':emit('Fight','either','during','The upgraded Dreadnought’s melee attacks gain 1 Attack, 1 Strength and 1 Damage.');break;
   case '000011269002':emit('Fight','either','during','The bearer’s melee attacks gain Sustained Hits 1.');break;
   case '000011265002':emit('Movement','own','during','Falling Back leaves the upgraded Grav-assault unit eligible to shoot.');break;
   case '000011261002':if(some(form,ranged))emit('Shooting','own','during','The bearer’s unit gains +1 Attack on its ranged attacks.',[form.root]);break;
   case '000011237002':emit('Fight','either','during','This unit may pile in or consolidate up to 4″. When consolidating, it may choose any mode regardless of its Before Moving restrictions.',[form.root]);break;
   case '000011257002':emit('Fight','either','during','If the bearer’s unit charged this turn, the bearer’s attacks re-roll Hit and Wound rolls of 1.');break;
   case '000011249002':emit('Charge','own','start','Choose one friendly Custodes Infantry unit within 6″ of the bearer. If it Advanced this turn, it may still declare a charge.',roots(f=>some(f,s=>isGold(s)&&kw(s,'INFANTRY'))));break;
   case '000011245002':emit('Movement','opponent','during','Enemy units making ingress moves cannot set up within 12″ of the bearer’s unit.',[form.root]);break;
   case '000011253002':emit('Fight','either','during','The bearer’s melee attacks gain Devastating Wounds.');break;
   case '000008926002':for(const phase of attacks)if(phase==='Fight'||some(form,ranged))emit(phase,phase==='Fight'?'either':'own','during','The bearer’s unit gains +1 to Hit. Against a Psyker or battle-shocked unit, it also gains +1 to Wound.',[form.root]);break;
   case '000011241002':for(const phase of attacks)if(phase==='Fight'||ranged(bearer))emit(phase,phase==='Fight'?'either':'own','during','The bearer adds 1 to its Wound rolls against Characters, Monsters and Vehicles.');break;
   case '000010992003':case '000011237003':for(const phase of phases)emit(phase,'either','during','The bearer has Feel No Pain 5+, including against mortal wounds.');break;
   case '000011241003':emit('Fight','either','during','The bearer may also use Emperor’s Light with Extra Attacks: 3 attacks, WS 2+, Strength 5, AP −2, Damage 2.');break;
   case '000008926003':emit('Movement','own','during','Choose a visible enemy within 12″ of this unit. It takes Battle-shock at −1.',[form.root]);break;
   case '000011265003':{
    const passengers=roots(f=>f.group.every(s=>isGold(s)&&kw(s,'INFANTRY')&&!kw(s,'JUMP PACK'))&&f.group.reduce((sum,s)=>sum+(s.models??sheets.get(norm(s.unit))?.sizes[0]??1),0)<=8);
    emit('Movement','own','during','When a friendly Custodes unit disembarks from this upgraded transport, it can re-roll Charge rolls and cannot be targeted by enemy snap shooting until end of turn.',passengers);
    break;
   }
   case '000011269003':emit('Fight','either','during','The bearer’s melee attacks gain Cleave 1.');break;
   case '000011257003':emit('Shooting','own','during','The bearer has a 12″ orb with 3 attacks at BS 2+, Strength 1, AP 0, Damage 1, Anti-non-Monster/Vehicle 2+ and Devastating Wounds. After this unit shoots, choose an enemy hit by the orb. Its attacks suffer −1 to Hit until your next turn.');break;
   case '000011253003':for(const phase of attacks)emit(phase,'either','during','Attacks targeting the bearer’s unit suffer −1 to Hit.',[form.root]);break;
   case '000011261003':for(const phase of phases)emit(phase,'either','start','Once per battle per army, heal D3+3 wounds on this bearer.');break;
   case '000009987003':emit('Movement','opponent','end','Once per phase per army, use Rapid Ingress on the bearer’s unit at −1CP. Other uses in the same phase neither prevent this use nor are prevented by it.',[form.root]);break;
   case '000008930003':for(const phase of phases)emit(phase,'either','end','Once per battle per army, if the bearer was destroyed this phase, roll a D6. On 2+ set it up unengaged as close as possible to its destruction point, with 3 wounds.');break;
   case '000011249003':emit('Movement','own','during','The upgraded unit adds 1 to Advance rolls.',[form.root]);emit('Charge','own','during','The upgraded unit adds 1 to Charge rolls.',[form.root]);break;
   case '000011245003':emit('Charge','opponent','end','Once per phase per upgraded unit, use Heroic Intervention on this unit at −1CP, independently of other uses this phase.',[form.root]);break;
   case '000008930004':for(const phase of phases)emit(phase,'either','start','Once per battle round per army, choose one friendly battle-shocked Custodes unit within 9″ of the bearer. That unit recovers.',gold);break;
   case '000011241004':emit('Pre-battle','either','end','After both armies deploy, redeploy up to three friendly Custodes units, including into Strategic Reserves irrespective of how many units are already there.',gold);break;
   case '000011241005':
    emit('Pre-battle','either','during','The bearer has one extra wound.');
    for(const phase of attacks)emit(phase,'either','during','Once per battle per army, when attacks are allocated to this bearer, give it a 3+ invulnerable save.');
    break;
  }
 }
 return rows;
}
