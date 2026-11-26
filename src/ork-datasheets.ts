import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {PHASES} from './engine';
import {eligibleOrkPassengers} from './ork-muster';
import {orkKeywords} from './ork-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {knightWeaponCount} from './knight-loadouts';
import {orkHasRangedWeapon} from './ork-loadouts';
import {equippedWeaponText} from './knight-card-rules';
import {KNIGHT_CARD_STATS as cards} from './ork-card-data.generated';
import {orkVehicleDatasheetReminders} from './ork-vehicle-datasheets';

type Stage=[ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Stage=['Shooting','own','during'],fight:Stage=['Fight','either','during'],move:Stage=['Movement','own','during'],command:Stage=['Command','own','during'];
const charge:Stage=['Charge','either','during'],snap:Stage=['Movement','opponent','end'],incoming:Stage=['Shooting','opponent','during'],incomingSnap:Stage=['Movement','own','end'];
const defended=[incoming,incomingSnap,fight],everyPhase:Stage[]=PHASES.map(phase=>[phase,'either','during']);
interface CardRule {name:string; stages:readonly Stage[]; text:string; bearer?:boolean}
const effect=(name:string,stages:Stage[],text:string,bearer=false):CardRule=>({name,stages,text,bearer});
const ammo=effect('Ammo Runts',[shoot],'Once per battle for this unit, when selected to shoot in your Shooting phase, its ranged attacks add 1 to Hit.');
const moreDakka=effect('More Dakka',[shoot],'This formation’s ranged attacks ignore cover. While riled up, they also gain Sustained Hits 1.');
const moreDakkaSnap=effect('More Dakka',[snap],'This formation’s ranged attacks ignore cover. Snap shooting cannot trigger Sustained Hits.');
const bomb=(repeated:boolean)=>effect(repeated?'Bomb Squigs':'Bomb Squig',[move],(repeated?'Once per turn and twice per battle for this unit':'Once per battle for this unit')+', after a Normal move in your Movement phase, choose a visible enemy within 12″. On a 3+ it suffers D3 mortal wounds.');
const personal:Record<string,CardRule[]>={
 'Warboss':[effect('Boss’ Ammo Runt',[shoot],'Once per battle for this unit, when selected to shoot in your Shooting phase, add 1 to ranged Hit rolls made by the Warboss model only.',true),effect('Might Is Right',[charge,fight],'When its unit charges, the Warboss’s own melee weapons gain 3 Attacks and 2 Strength until turn end.',true)],
 'Warboss In Mega Armour':[effect('Krushin’ Impetus',[charge],'When this formation ends a charge, pick one engaged enemy. Roll once per model in this formation engaged with that enemy. Each 3+ deals one mortal wound.')],
 'Big Mek In Mega Armour':[effect('Fix Dat Armour Up',[command],'Once per battle for this formation, heal 3 wounds in your Command phase.'),moreDakka,moreDakkaSnap],
 'Boss Snikrot':[effect('Kunnin’ Infiltrator',[['Fight','opponent','end']],'At the end of your opponent’s Fight phase, this formation may enter Strategic Reserves if every model in it is hidden and unengaged.'),effect('Deff from the Shadows',[snap],'From the first battle round onwards, at the end of your opponent’s Movement phase, if in Strategic Reserves this unit may make an ingress move without spending CP.')],
 'Mek':[effect('Kustom Dakka',[shoot,snap],'The formation’s ranged attacks gain Ignores Cover.')],
 'Painboy':[effect('Crude Surgery',[command],'In your Command phase this formation heals 3 wounds.'),effect('Catch Dat Red Bit',[command],'Once per battle for this formation when using Crude Surgery, heal an additional D3 wounds.')],
 'Boyz':[ammo,effect('Tide of Muscle',[charge,fight],'After this formation charges, its melee attacks have Lethal Hits until turn end.'),effect('Never Too Busy to Fight',[shoot],'This formation may start an action while engaged, subject to the other action restrictions.')],
 'Gretchin':[effect('Thievin’ Scavengers',[['Movement','own','end']],'At the end of your Movement phase, an objective controlled by this formation becomes secured. It stays yours until the opponent’s Level of Control beats yours at a phase end.')],
 'Tankbustas':[effect('Rokkit Barrage',[shoot],'After this formation shoots in your Shooting phase, select an enemy unit hit. It must make a Battle-shock roll at −1.'),bomb(true)],
 'Nobz':[effect('Get Out da Way!',[charge],'While charging this formation can pass through models, except Monsters and Vehicles.'),ammo],
 'Kommandos':[effect('Found ’Em!',[move],'In your Movement phase choose an enemy within 12″. Its detection range increases by 3″ until turn end. If split before battle, only the half assigned this ability may use it.'),effect('Taktikal Know-wotz',[['Pre-battle','either','during']],'During Declare Battle Formations, you may split the ten Kommandos into two starting units of five. Assign Bomb Squig to one half and Found ’Em! to the other.'),effect('Nowhere to Hide',[shoot,fight],'Add 1 to this formation’s Hit rolls against a hidden unit.'),effect('Bomb Squig',[move],bomb(false).text+' If split before battle, only the half assigned Bomb Squig may use it.')],
 'Stormboyz':[effect('Rokkit Charge',[fight],'When selected to fight after charging this turn, you may give the unit’s melee attacks +1 Attack, +1 Strength and Hazardous.')],
 'Warbikers':[effect('High-speed Carnage',[charge,fight],'After this formation charges, its melee attacks have +1 Strength and +1 Damage until turn end.')],
 'Morkanaut':[effect('Big an’ Shooty',[shoot],'In your Shooting phase this unit’s ranged attacks may re-roll Hit rolls of 1.')],
 'Gorkanaut':[effect('Big an’ Stompy',[fight],'This unit’s melee attacks may re-roll Hit rolls of 1.')],
 'Flash Gitz':[effect('Finderz Keeperz',[shoot],'In your Shooting phase improve the attack’s AP by 1 if either this formation or its target is within range of an objective.')],
 'Stompa':[effect('Waaagh! Effigy',everyPhase,'This unit is always riled up.')],
 'Gargantuan Squiggoth':[effect('Walking Bastion',[shoot,fight],'When attacking this model may ignore modifiers to its BS, WS and Hit rolls.')],
 'Big Mek With Shokk Attack Gun':[moreDakka,moreDakkaSnap],
 'Deffkilla Wartrike':[effect('Fuel-mixa Grot',[move],'Add 1 to Advance rolls for this formation.')],
 'Zodgrod Wortsnagga':[effect('Super Runts',everyPhase,'This formation is riled up.')],
 'Beastboss':[effect('Dodge Dis!',[shoot,fight],'This formation adds 1 to its Hit rolls.')],
 'Painboss':[effect('Hardy Bioniks',defended,'When an attack targets this formation and its Strength exceeds this formation’s Toughness, subtract 1 from the Wound roll.')],
 'Mozrog Skragbad':[effect('One Last Kill',[fight],'If Mozrog is destroyed before its unit is selected to fight this phase, roll D6. On 2+ leave him in play until his unit fights or the phase ends, whichever comes first.',true),effect('Da Bigger Dey Iz…',[fight],'Re-roll melee Wound rolls against Monster or Vehicle units.')],
 'Beast Snagga Boyz':[effect('Mobbed',[charge],'After this formation charges, every engaged enemy Monster or Vehicle unit makes a Battle-shock roll at −1, or −2 if this formation currently contains at least 13 models.')],
 'Squighog Boyz':[bomb(false),effect('Brutal Impact',[charge,fight],'After this formation makes a charge, add 1 to its attacks’ Damage until turn end.')],
 'Hunta Rig':[effect('Tramplasquig Charge',[['Charge','own','during']],'After this unit finishes a charge in your Charge phase, using Crushing Impact on it costs 1 CP less.')],
 'Big’ed Bossbunka':[effect('Fortification',[['Movement','either','during'],['Shooting','either','during']],'Enemies engaged only with Fortifications remain valid shooting targets. Ranged attacks against them take −1 to Hit, except Close-Quarters weapons. When such an enemy Falls Back without Battle-shock, its hazard rolls automatically pass.'),effect('Ramshackle Cover',[incoming,incomingSnap,shoot,snap],'A ranged attack targeting a unit that the attacker cannot fully see because of the Bossbunka grants that target the Benefit of Cover.')],
 'Big Mek':[moreDakka,moreDakkaSnap,effect('Shokk-boosta',[move],'When selected to Advance in your Movement phase, you may change the Advance roll to 6 and move through any models. After that Advance, make a hazard roll for every model in the unit.')],
 'Breaka Boyz':[bomb(true),effect('Trophy Hunters',[charge],'Add 1 to this formation’s Charge rolls.')],
 'Wazdakka Gutsmek':[effect('Full Throttle',[command],'Choose Turbo Engine, Shokk Attack Engine or Pulse Jet. Only that engine applies until your next Command phase begins.'),effect('Turbo Engine',[move,charge],'If Turbo Engine was chosen, Advancing or Falling Back does not prevent this unit charging that turn.'),effect('Shokk Attack Engine',[command],'If Shokk Attack Engine was chosen and this unit is unengaged, it may enter Strategic Reserves in your Command phase.'),effect('Pulse Jet',[move],'If Pulse Jet was chosen, an unengaged unit selected to move can travel up to 18″ + D6 through any models and terrain, ignoring vertical distance. End unengaged. It cannot charge or start an action this turn. Attacks targeting it take −1 to Hit until your next turn starts.')],
 'Bannernob':[effect('Waaagh! Banner',[charge],'Add 1 to this formation’s Charge rolls.')],
 'Bigboss':[effect('Sumfin’ to Prove',[fight],'This formation adds 1 to melee Hit rolls.')],
 'Big Mek Dakkarig':[effect('Even More Dakka',[shoot],'While riled up, this formation’s ranged attacks gain Sustained Hits 1.'),effect('Blitz Dem Gitz!',[shoot],'In your Shooting phase this model’s Blitzkannon has 6 extra attacks when targeting a unit with neither Monster nor Vehicle.',true)],
 'Nazdreg':[effect('Nazdreg’s Know-wotz',[shoot,snap],'Ranged attacks made by this formation ignore cover.'),effect('Supreme Kunnin’',[['Movement','opponent','during']],'Once per phase across your army, after an enemy ends a move within 8″, if this formation is unengaged, it may make a Normal move up to D6″, or up to a fixed 5″ if riled up.')],
 'Rukkatrukk Squigbuggies':[effect('Squig Barrage',[shoot],'After shooting in your Shooting phase, choose one enemy unit hit by this formation’s Squig Launchas that is neither a Monster nor a Vehicle. Until your next turn starts, that unit’s attacks take −1 to Hit.')],
};

export function orkDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Orks')return [];
 const eligible=roster.filter(s=>cards[s.unit]);
 const roots=new Map(eligible.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id??s.id]));
 const root=(s:RosterInstance)=>roots.get(s.id)??s.id;
 const unique=(squads:readonly RosterInstance[])=>[...new Set(squads.map(root))];
 const all=unique(eligible),tags=(s:RosterInstance)=>orkKeywords(army,s);
 const groups=eligible.filter(s=>root(s)===s.id).map(body=>({body,members:eligible.filter(m=>root(m)===body.id)}));
 const matching=(test:(group:typeof groups[number])=>boolean)=>groups.filter(test).map(g=>g.body.id);
 const groupWeapons=(groupId:string)=>[...new Set(eligible.filter(s=>root(s)===groupId).flatMap(s=>cards[s.unit].weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot')&&knightWeaponCount(s,w.name)>0).map(w=>w.name)))];
 const output:GeneratedReminder[]=[];
 for(const squad of eligible){
   const {unit,id}=squad,form=root(squad),stats=cards[unit],group=groups.find(g=>g.body.id===form)!;
   const emit=(name:string,stage:Stage,summary:string,units:string[]=[form],fixedId?:string)=>{
     if(!units.length)return;
     const [window,turn,timing]=stage;
     output.push({id:fixedId??['11e-ork-card',id,name,window,turn].join(':'),title:id+' · '+name,window,turn,timing,summary,units,source:stats.source,origin:'unit'});
   };
   const cargo=eligibleOrkPassengers(army,squad,eligible);
   const firingDeck=stats.core?.find(a=>a.startsWith('Firing Deck '));
   const borrowedGuns=firingDeck?cargo.flatMap(p=>{
     const names=groupWeapons(p.id);
     return names.length?[{id:p.id,names:names.join(', ')}]:[];
   }):[];
   const guns=group.members.some(orkHasRangedWeapon)||borrowedGuns.length>0;
   for(const r of personal[unit]??[])for(const stage of r.stages){
     if(r.name!=='Ramshackle Cover'&&(stage===shoot||stage===snap)&&(!guns||r.bearer&&!orkHasRangedWeapon(squad)))continue;
     emit(r.name,stage,r.text,r.bearer?[id]:[form]);
   }
   const actualCore=stats.core??[];
   const formationHas=(ability:string)=>group.members.every(m=>cards[m.unit].core?.includes(ability));
   if(id===form&&(formationHas('Deep Strike')||group.members.some(m=>m.unit==='Nazdreg'))){
     for(const stage of [['Pre-battle','either','during'],['Movement','either','during']] as Stage[])emit('Deep Strike',stage,'When the whole formation makes an ingress move it can arrive anywhere more than 8″ horizontally from every enemy unit, including inside the opponent’s deployment zone.'+(group.members.some(m=>m.unit==='Nazdreg')?' Nazdreg’s Know-wotz grants the ability to the formation.':''));
   }
   if(id===form&&formationHas('Infiltrators'))emit('Infiltrators',['Pre-battle','either','during'],'During deployment set up anywhere more than 8″ horizontally from enemy models and their deployment zone.');
   if(id===form&&formationHas('Stealth'))for(const stage of [incoming,incomingSnap])emit('Stealth',stage,'Every model in this formation has Stealth. It has the Benefit of Cover against ranged attacks.');
   if(group.members.length===1&&actualCore.includes('Lone Operative'))for(const stage of [incoming,incomingSnap])emit('Lone Operative',stage,'Enemy models outside 12″ cannot see this unjoined unit or target it with indirect fire.');
   const fnp=actualCore.find(a=>a.startsWith('Feel No Pain'));
   if(fnp)for(const stage of everyPhase)emit(fnp,stage,'Whenever a model from this datasheet would lose a wound, on '+fnp.slice(-2)+' it keeps that wound. This protection applies to the '+unit+' models themselves.',[id]);
   if(stats.save&&!(unit==='Wazbom Blastajet'&&knightWeaponCount(squad,'Blastajet Force Field')))for(const stage of defended)emit('Invulnerable save',stage,'When an attack is allocated to a '+unit+' model, you may use its '+stats.save+'+ invulnerable save.',[id]);
   if(stats.demise)for(const stage of everyPhase)emit('Deadly Demise '+stats.demise,stage,'When this model is destroyed, after any emergency disembarkation roll D6. On a 6, each unit within 6″ suffers '+stats.demise+' mortal wound'+(stats.demise==='1'?'':'s')+', rolling random damage separately per unit.',[id]);
   if(stats.damage)for(const stage of guns?[shoot,fight]:[fight])emit('Damaged '+stats.damage.threshold,stage,'When this model has '+stats.damage.threshold+' or fewer wounds left its attacks have −1 to Hit.',[id]);
   if(actualCore.includes('Super-heavy Walker'))emit('Super-heavy Walker',move,'During Normal, Advance or Fall Back moves, this unit may pass through non-Titanic models and terrain sections up to 4″ high. Before moving, you may give its models Mobile for the move. If you do, roll D6 afterwards: on a 1 the unit is Battle-shocked.');
   for(const stage of [shoot,fight,snap]){
     if(stage===snap&&tags(squad).has('TITANIC'))continue;
     const phase=stage===fight?'Fight':'Shooting';
     const text=equippedWeaponText(squad,stats,phase,stage===snap);
     if(text)emit(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles',stage,(stage===snap?'When firing Overwatch: ':'')+text,[id]);
   }
   if(cargo.length){
     const ids=cargo.map(s=>s.id);
     if(unit==='Trukk')emit('Pilin’ Out',['Movement','opponent','during'],'After an enemy ends a move within 8″ of this model in the opponent’s Movement phase, a unit that did not embark this phase may make a rapid disembark. Set each model wholly within 3″, observing this transport’s ingress restrictions if it arrived this turn. The passengers cannot charge this turn. Possible passengers: '+ids.join(', ')+'.',ids);
     if(unit==='Gorkanaut'||unit==='Morkanaut')emit('Gut Hatch',move,'After this model finishes a Normal move in your Movement phase, a passenger that did not embark this phase may make an assault disembark. Set each model wholly within 3″; the passengers remain eligible to charge. Possible passengers: '+ids.join(', ')+'.',ids);
     if(unit==='Stompa')emit('Idol of Belligerence',move,'When a passenger is selected to disembark in your Movement phase it becomes riled up until your next turn starts. Possible passengers: '+ids.join(', ')+'.',ids);
     if(unit==='Hunta Rig')emit('Fully Loaded Butchery',fight,'The Butcha Boyz melee weapon gains 2 Attacks per embarked model, to a maximum bonus of 22. Possible formations: '+ids.join(', ')+'.',[id,...ids]);
     if(unit==='Big’ed Bossbunka')for(const stage of everyPhase)emit('Raucous Occupants',stage,'While within range of your home objective, add the total OC of the models actually embarked to this Bossbunka’s OC. Possible formations: '+ids.join(', ')+'.',[id,...ids]);
     if(firingDeck&&borrowedGuns.length){
       emit(firingDeck,shoot,'When selected to shoot in your Shooting phase, choose up to '+firingDeck.slice(12)+' embarked models whose units have not shot this phase. For each, the transport may fire one equipped ranged weapon other than One Shot. Embarked units cannot then shoot for the rest of the turn. Possible guns: '+borrowedGuns.map(x=>x.id+' ('+x.names+')').join('; ')+'.',[id,...borrowedGuns.map(x=>x.id)]);
     }
     const grots=cargo.filter(p=>groups.find(g=>g.body.id===p.id)?.members.some(m=>m.unit==='Gretchin'));
     if(grots.length)emit('Downtrodden',['Pre-battle','either','during'],'Count each two Gretchin models, rounding up, as one transport space. Other models attached to those formations pay their own transport space. Possible passengers: '+grots.map(g=>g.id).join(', ')+'.',grots.map(g=>g.id));
   }
   if(unit==='Meganobz'){
     for(const stage of defended)emit('Arrogant Invulnerability',stage,'Worsen the AP of attacks targeting this formation by 1.');
     const mobs=eligible.filter(s=>s.unit===unit);
     if(mobs[0].id===id)emit('Krumpin’ Time',fight,'While riled up in the Fight phase, these formations add 1 to Hit rolls: '+unique(mobs).join(', ')+'.',unique(mobs),'11e-orks-meganobz-krumpin');
   }
   if(unit==='Nobz'&&knightWeaponCount(squad,'Paired Krumpas'))emit('Paired Krumpas',fight,knightWeaponCount(squad,'Paired Krumpas')+' Nob model(s) carry Paired Krumpas. Only their Kustom Krumpa attacks may re-roll both Hit and Wound rolls.',[id]);
   if(unit==='Tankbustas'&&knightWeaponCount(squad,'Pulsa Rokkit'))emit('Pulsa Rokkit',shoot,'Once per battle for this formation when selected to shoot in your Shooting phase, choose one enemy Monster or Vehicle within 24″. Its attacks against that target gain +1 AP and Lethal Hits.');
   if(unit==='Big Mek In Mega Armour'&&knightWeaponCount(squad,'Kustom Force Field'))for(const stage of [incoming,incomingSnap])emit('Kustom Force Field',stage,'While the field bearer survives, the formation has a 4+ invulnerable save against ranged attacks.');
   if(unit==='Zodgrod Wortsnagga'&&group.members.some(m=>knightWeaponCount(m,'Scavenged Shivs')))emit('Super Runts · shivs',fight,'Scavenged Shivs equipped in this formation gain 1 Attack, improve WS by 1 and gain 1 Strength.');
   if(unit==='Runtherd'&&group.members.some(m=>m.unit==='Gretchin'))for(const stage of everyPhase)emit('That’ll Learn Ya',stage,'Once per battle round for this formation, when it becomes Battle-shocked and has at least four surviving Gretchin, you may destroy D3 of them to clear Battle-shock.');
   if(unit==='Painboss'&&tags(group.body).has('MOUNTED'))emit('Runnin’ wiv da Herd',move,'While attached to this Mounted unit the Painboss loses Infantry, gains Mobile and Mounted, and gains 4″ Move.',[id]);
   const snagga=matching(g=>g.members.some(m=>tags(m).has('BEAST SNAGGA')));
   if(unit==='Painboss')emit('Push Dat Bit Back In',command,'Once per battle for this unit choose a friendly Beast Snagga formation within 6″. It heals 3 wounds. Candidates: '+snagga.join(', ')+'.',snagga);
   if(unit==='Beastboss on Squigosaur')emit('Thundering Stampede (Aura)',charge,'Friendly Beast Snagga formations within 6″ of the bearer add 1 to Charge rolls: '+snagga.join(', ')+'.',snagga);
   if(['Beastboss','Beastboss on Squigosaur'].includes(unit)||['Warboss','Warboss In Mega Armour','Nazdreg','Deffkilla Wartrike'].includes(unit)){
     const beast=unit.startsWith('Beastboss'),speed=unit==='Deffkilla Wartrike';
     const sameRule=(s:RosterInstance)=>beast?s.unit.startsWith('Beastboss'):speed?s.unit===unit:['Warboss','Warboss In Mega Armour','Nazdreg'].includes(s.unit);
     const givers=unique(eligible.filter(sameRule));
     if(eligible.find(sameRule)?.id===id){
       const targets=beast?snagga:speed?matching(g=>g.members.some(m=>tags(m).has('SPEED FREEKS'))):all;
       const name=beast?'Keep Huntin’!':speed?'Get Back in da Race!':'Intimidating Motivation';
       emit(name,move,'Once per battle round across your army, at the start or end of a move by one of '+givers.join(', ')+', select one eligible friendly unit within 6″. Clear its Battle-shock and rile it up until your next turn starts.'+(speed?' This includes any units embarked within the selected unit.':'')+' Candidates: '+targets.join(', ')+'.',targets);
     }
   }
   if(unit==='Mek'){
     const vehicles=matching(g=>g.members.some(m=>tags(m).has('VEHICLE')&&!tags(m).has('AIRCRAFT')&&!tags(m).has('TITANIC')));
     emit('Clever Know-wotz',move,'At the start or end of this formation’s move in your Movement phase, select one eligible Orks Vehicle model within 3″ of the Mek. Heal D3 wounds on that model and give its attacks +1 to Hit until the start of your next Movement phase. Candidates: '+vehicles.join(', ')+'.',vehicles);
   }
   if(unit==='Ghazghkull Thraka'){
     emit('Makari, Hoist Dat Banner!',move,'Once per battle across your army, select up to the current battle round number of friendly Orks formations. They are riled up until your next turn starts. Candidates: '+all.join(', ')+'.',all);
     emit('Prophet of da Great Waaagh! (Aura)',fight,'Friendly Orks formations within 6″ of Ghazghkull add 1 to melee Hit and Wound rolls. Candidates: '+all.join(', ')+'.',all);
   }
   if(['Ghazghkull Thraka','Big Mek With Shokk Attack Gun','Beastboss on Squigosaur','Mozrog Skragbad'].includes(unit)&&group.members.length===1){
     const beast=unit==='Mozrog Skragbad'||unit==='Beastboss on Squigosaur';
     const nearby=matching(g=>g.body.id!==id&&g.members.some(m=>beast?tags(m).has('BEAST SNAGGA'):tags(m).has('INFANTRY'))&&
       !(beast&&g.members.some(m=>tags(m).has('MONSTER'))&&g.members.some(m=>tags(m).has('CHARACTER')))&&
       !(unit==='Big Mek With Shokk Attack Gun'&&g.members.some(m=>m.unit===unit)));
     const name=unit==='Ghazghkull Thraka'?'Da Grand Warlord’s Ladz':unit==='Big Mek With Shokk Attack Gun'?'Support Shokka':unit==='Mozrog Skragbad'?'Beast Snagga Following':'Boss of da Hunt';
     if(nearby.length)for(const stage of [incoming,incomingSnap])emit(name,stage,'Within 3″ of one of these friendly formations, the unjoined bearer has Lone Operative. Enemies outside 12″ cannot see or target it with indirect fire. Providers: '+nearby.join(', ')+'.',[id]);
   }
 }
 return [...output,...orkVehicleDatasheetReminders(army,eligible)];
}
