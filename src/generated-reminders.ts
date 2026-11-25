import {priorityFactionUnitReminders} from './priority-faction-rules';
import {necronEnhancementReminders} from './necron-enhancement-reminders';
import {necronStratagemReminders} from './necron-stratagems';
import {verifiedNecronReminders} from './verified-necrons';
import {selectedEquipment} from './equipment';
import type {ArmySelection} from './catalog';
import type {Phase} from './engine';
import {factionSource} from './sources';
export type ReminderWindow=Phase|'Pre-battle'|'End of opponent turn'|'End of battle round';
export const REMINDER_WINDOWS:readonly ReminderWindow[]=['Pre-battle','Command','Movement','Shooting','Charge','Fight','End of opponent turn','End of battle round'];
export interface GeneratedReminder {id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string;source:string;origin:'army'|'detachment'|'unit';units?:string[]}
export function generateReminders(army:ArmySelection):GeneratedReminder[]{
 const source=factionSource(army).url;
 const result:GeneratedReminder[]=[...priorityFactionUnitReminders(army)];
 if(army.faction==='Necrons'){result.push(...verifiedNecronReminders(army));result.push(...necronStratagemReminders(army));result.push(...necronEnhancementReminders(army));}
 if(army.faction==='Necrons'){

  if(army.detachment==='Awakened Dynasty'&&(army.instances?.some(x=>x.attachedTo)||Object.keys(army.attachments||{}).length>0))result.push({id:'awakened-command-protocols',title:'Command Protocols · +1 to Hit',window:'Shooting',timing:'during',summary:'For each attached unit led by a NECRONS CHARACTER, add 1 to Hit rolls whenever its models attack, including during the Fight phase. Attached units: '+(army.instances?army.instances.filter(x=>x.attachedTo).map(x=>x.id+' + '+x.attachedTo):Object.entries(army.attachments||{}).map(([leader,bodyguard])=>leader+' + '+bodyguard)).join('; ')+'.',source,origin:'detachment'});
  if(army.detachment==='Hypercrypt Legion')result.push({id:'hypercrypt-hyperphasing',title:'Hyperphasing',window:'End of opponent turn',timing:'end',summary:'At the end of the opponent’s turn, eligible units outside Engagement Range can be placed into Strategic Reserves. Limit depends on battle size: Incursion 1, Strike Force 2, Onslaught 3.',source,origin:'detachment'});

 }else if(army.faction==='Space Marines'){
  result.push({id:'marine-oath',title:'Oath of Moment',window:'Command',timing:'start',summary:'At the start of your Command phase, select an enemy unit as your Oath target. Attacks against it can re-roll Hit rolls; check the additional Wound bonus conditions.',source,origin:'army'});
  if(army.detachment==='Gladius Task Force')result.push({id:'gladius-doctrines',title:'Combat Doctrines',window:'Command',timing:'during',summary:'Review the available Combat Doctrine selection, its timing, and whether a doctrine was already used this battle.',source,origin:'detachment'});
 }
 const unitRules:Record<string,Array<{id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string}>>={

 'Canoptek Wraiths':[{id:'wraith-form',title:'Canoptek Wraiths · Wraith Form',window:'Movement',timing:'during',summary:'Each time this unit ends a Normal move, select one enemy unit it moved over during that move; roll one D6 per model in this unit, inflicting 1 mortal wound for each 4+.'}],
 'Immortals':[{id:'immortals-eradication',title:'Immortals · Implacable Eradication',window:'Shooting',timing:'during',summary:'Re-roll Wound rolls of 1; against enemies within range of an objective marker, you can instead re-roll the Wound roll.'}],
 };
 for(const item of army.instances||Object.keys(army.units).map(unit=>({id:unit,unit}))){
  if(army.faction==='Necrons')for(const rule of unitRules[item.unit]||[])result.push({...rule,id:army.instances?rule.id+'-'+item.id:rule.id,title:army.instances?rule.title+' · '+item.id:rule.title,source,origin:'unit',units:[item.id]});
 }
 if(army.faction==='Necrons'){
  const abilities:Record<string,Array<{id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string}>>={

   'Chronomancer':[{id:'chronomancer-chronometron',title:'Chronometron',window:'Shooting',timing:'end',summary:'After this model’s unit shoots, if it is outside Engagement Range it can make a Normal move up to 5 inches; that unit cannot declare a charge this turn.'}],



  };
  for(const item of army.instances||Object.keys(army.units).map(unit=>({id:unit,unit})))for(const rule of abilities[item.unit]||[])result.push({...rule,id:army.instances?rule.id+'-'+item.id:rule.id,title:army.instances?rule.title+' · '+item.id:rule.title,source,origin:'unit',units:[item.id]});
  for(const [leader,bodyguard] of (army.instances?army.instances.filter(x=>x.attachedTo).map(x=>[x.id,x.attachedTo!] as const):Object.entries(army.attachments||{}))){
   const attachmentSource='https://wahapedia.ru/wh40k10ed/factions/necrons/'+encodeURIComponent(leader).replace(/%20/g,'-');
   const effects:Record<string,Array<{id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string}>>={


    'Chronomancer':[{id:'chronomancer-mantle',title:'Timesplinter Mantle · -1 to Hit',window:'Shooting',timing:'during',summary:'While the Chronomancer leads this unit, subtract 1 from Hit rolls for attacks targeting the attached unit, including melee attacks.'}]
   };
   for(const effect of effects[army.instances?army.instances.find(x=>x.id===leader)?.unit||leader:leader]||[])result.push({...effect,id:'attached-'+leader+'-'+bodyguard+'-'+effect.id,title:leader+' + '+bodyguard+' · '+effect.title,source:attachmentSource,origin:'unit',units:[leader,bodyguard]});
  }
 }
 if(army.instances)for(const instance of army.instances){
 if(!instance.weaponCounts)continue;
 const templates:Record<string,string>={
  'Gauss destructor':'48″; 1 attack; BS 3+; S14; AP -4; D6 damage; HEAVY and LETHAL HITS.',
  'Enmitic exterminator':'36″; 6 attacks; BS 3+; S6; AP -1; D1; HEAVY, RAPID FIRE 6 and SUSTAINED HITS 1.',
  'Gauss flayer':'24″; 1 attack; BS 4+; S4; AP 0; D1; LETHAL HITS and RAPID FIRE 1.',
  'Gauss reaper':'12″; 2 attacks; BS 4+; S4; AP -1; D1; LETHAL HITS.',
  'Gauss blaster':'24″; 2 attacks; BS 3+; S5; AP -1; D1; LETHAL HITS.',
  'Tesla carbine':'24″; 2 attacks; BS 3+; S5; AP 0; D1; ASSAULT and SUSTAINED HITS 2.',
  'Warscythe':'Melee; 2 attacks; WS 3+; S8; AP -3; D2; DEVASTATING WOUNDS.',
  'Hyperphase sword and dispersion shield':'Melee; 3 attacks; WS 3+; S6; AP -2; D1; dispersion shield grants a 4+ invulnerable save.'
 };
 for(const [weapon,count] of Object.entries(instance.weaponCounts)){
  if(count===0)continue;
  result.push({id:'equipment-'+instance.id+'-'+weapon,title:instance.id+' · '+count+' × '+weapon,window:instance.unit==='Lychguard'?'Fight':'Shooting',timing:'during',summary:(templates[weapon]||weapon)+ ' Resolve attacks using only the '+count+' equipped model(s).',source,origin:'unit',units:[instance.id]});
 }
}
for(const [id,unit,choice] of army.instances?army.instances.filter(x=>!x.weaponCounts).map(x=>[x.id,x.unit,x.equipment||selectedEquipment(army,x.unit)]):Object.keys(army.units).map(unit=>[unit,unit,selectedEquipment(army,unit)])){if(choice)result.push({id:'equipment-'+id+'-'+choice,title:id+' · '+choice,window:unit==='Lychguard'?'Fight':'Shooting',timing:'during',summary:unit==='Necron Warriors'?(choice==='Gauss flayer'?'Gauss flayer — Range 24″, 1 attack, BS 4+, Strength 4, AP 0, Damage 1. LETHAL HITS and RAPID FIRE 1: within half range, make one additional attack per equipped model; an unmodified Hit roll of 6 automatically wounds.':'Gauss reaper — Range 12″, 2 attacks, BS 4+, Strength 4, AP -1, Damage 1. LETHAL HITS: an unmodified Hit roll of 6 automatically wounds.'):unit==='Immortals'?(choice==='Gauss blaster'?'Gauss blaster — Range 24″, 2 attacks, BS 3+, Strength 5, AP -1, Damage 1. LETHAL HITS: a Critical Hit automatically wounds.':'Tesla carbine — Range 24″, 2 attacks, BS 3+, Strength 5, AP 0, Damage 1. ASSAULT: eligible to shoot after Advancing. SUSTAINED HITS 2: each Critical Hit scores 2 additional hits.'):unit==='Lychguard'?(choice==='Warscythe'?'Warscythe — Melee, 2 attacks, WS 3+, S8, AP -3, Damage 2. DEVASTATING WOUNDS: Critical Wounds inflict mortal wounds instead of normal damage.':'Hyperphase sword — Melee, 3 attacks, WS 3+, S6, AP -2, Damage 1. DISPERSION SHIELD: each bearer has a 4+ invulnerable save.'):unit==='Lokhust Heavy Destroyers'?(choice==='Gauss destructor'?'Gauss destructor — 48″ range, 1 attack, BS 3+, S14, AP -4, Damage 6. HEAVY: +1 to Hit if stationary. LETHAL HITS: Critical Hits automatically wound. Apply the Lokhust Heavy Destroyers wound re-roll ability against MONSTER or VEHICLE targets.':'Enmitic exterminator — 36″ range, 6 attacks, BS 3+, S6, AP -1, Damage 1. HEAVY: +1 to Hit if stationary. RAPID FIRE 6: when the target is within half range, make 6 additional attacks per weapon. SUSTAINED HITS 1: each Critical Hit scores 1 additional hit. Apply the unit’s wound re-roll ability against non-MONSTER, non-VEHICLE targets.'):'Selected weapon loadout: '+choice+'. Weapon-specific reminder coverage is not yet implemented.',source,origin:'unit',units:[id!]});}
 if(army.faction==='Orks')result.push({id:'orks-waaagh',title:'Waaagh!',window:'Command',timing:'start',summary:'Review Waaagh! declaration timing, effects and eligible Orks units in current faction rules.',source,origin:'army'});
 if(army.faction==='Tyranids')result.push({id:'tyranids-shadow',title:'Shadow in the Warp',window:'Command',timing:'during',summary:'Review Shadow in the Warp declaration timing and Battle-shock effects in current faction rules.',source,origin:'army'});

 return result;
}
export function remindersForWindow(army:ArmySelection,window:ReminderWindow):GeneratedReminder[]{return generateReminders(army).filter(r=>r.window===window);}

export function groupedReminders(army:ArmySelection):Array<{window:ReminderWindow;reminders:GeneratedReminder[]}>{return REMINDER_WINDOWS.map(window=>({window,reminders:remindersForWindow(army,window)}));}
