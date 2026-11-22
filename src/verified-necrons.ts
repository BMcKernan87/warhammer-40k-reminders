import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
import type {GeneratedReminder} from './generated-reminders';
const faction='https://wahapedia.ru/wh40k10ed/factions/necrons/';
type Entry=Omit<GeneratedReminder,'source'|'origin'> & {unit?:string;detachment?:string;sourceUnit?:string};
const nobleLeaders=new Set(['Overlord','Overlord with Translocation Shroud','Imotekh the Stormlord','Trazyn the Infinite','Lord','Nemesor Zahndrekh','Vargard Obyron']);
const rules:Entry[]=[
 {id:'necron-reanimation',title:'Reanimation Protocols',window:'Command',timing:'end',summary:'At the end of your Command phase, each unit on the battlefield with Reanimation Protocols reanimates D3 wounds: heal damaged models first, then return destroyed models one wound at a time, up to Starting Strength.',},
 {id:'necron-warriors-their-number-is-legion',unit:'Necron Warriors',sourceUnit:'Necron-Warriors',title:'Necron Warriors · Their Number is Legion',window:'Command',timing:'end',summary:'Whenever this unit’s Reanimation Protocols activate, you can re-roll the dice used to determine how many wounds are reanimated. This also applies when another rule activates Reanimation Protocols outside your Command phase; it is not limited to the normal Command-phase activation.'},
 {id:'lychguard-guardian-protocols',unit:'Lychguard',sourceUnit:'Lychguard',title:'Lychguard · Guardian Protocols',window:'Fight',timing:'during',summary:'While a NOBLE model leads this unit, each time an attack targets it, if the attack Strength exceeds this unit’s Toughness, subtract 1 from the Wound roll. Applies to attacks in any phase.'},
 {id:'doomsday-ark-overwhelming-obliteration',unit:'Doomsday Ark',sourceUnit:'Doomsday-Ark',title:'Doomsday Ark · Overwhelming Obliteration',window:'Movement',timing:'during',summary:'If this model Remains Stationary in your Movement phase, its doomsday cannon gains DEVASTATING WOUNDS until the end of the turn.'},
 {id:'doomstalker-sentinel-construct',unit:'Canoptek Doomstalker',sourceUnit:'Canoptek-Doomstalker',title:'Canoptek Doomstalker · Sentinel Construct',window:'Shooting',timing:'during',summary:'When this unit is selected for Fire Overwatch, unmodified Hit rolls of 5+ score hits while resolving that Stratagem.'},
 {id:'lokhust-heavy-optimised-slaughter',unit:'Lokhust Heavy Destroyers',sourceUnit:'Lokhust-Heavy-Destroyers',title:'Lokhust Heavy Destroyers · Optimised for Slaughter',window:'Shooting',timing:'during',summary:'Re-roll Wound rolls of 1 for enmitic exterminator attacks against targets other than MONSTERS and VEHICLES; re-roll Wound rolls of 1 for gauss destructor attacks against MONSTERS or VEHICLES.'},
 {id:'necron-technomancer-heal-verified',unit:'Technomancer',sourceUnit:'Technomancer',title:'Technomancer · repair',window:'Movement',timing:'end',summary:'At the end of your Movement phase, select one friendly NECRONS model within 6 inches of this Technomancer. It regains up to D3 lost wounds; a model can only be selected for this ability once per turn.'},
 {id:'necron-plasmancer-lightning-verified',unit:'Plasmancer',sourceUnit:'Plasmancer',title:'Plasmancer · Living Lightning',window:'Shooting',timing:'during',summary:'In your Shooting phase, choose one visible enemy unit within 18 inches (excluding a lone Lone Operative unit outside 12 inches). Roll four D6; each 4+ causes one mortal wound.'},
 {id:'necron-power-matrix-verified',detachment:'Canoptek Court',title:'Power Matrix',window:'Shooting',timing:'during',summary:'CRYPTEK and CANOPTEK units re-roll Hit rolls of 1. If wholly within your Power Matrix, re-roll any Hit roll instead. Your deployment zone always qualifies; at the start of each phase, control at least half the objectives in No Man’s Land or the enemy deployment zone to extend the matrix there until phase end.'},
 {id:'nightbringer-drain-life',unit:'C’tan Shard of the Nightbringer',sourceUnit:'Ctan-Shard-of-the-Nightbringer',title:'Nightbringer · Drain Life',window:'Fight',timing:'end',summary:'At the end of the Fight phase, roll a D6 for each enemy unit within 6 inches of the Nightbringer; on a 4+, that unit suffers D3 mortal wounds.'},
 {id:'void-dragon-matter-absorption',unit:'C’tan Shard of the Void Dragon',sourceUnit:'Ctan-Shard-of-the-Void-Dragon',title:'Void Dragon · Matter Absorption',window:'Shooting',timing:'start',summary:'At the start of your Shooting phase, select one enemy VEHICLE unit within 12 inches. Roll a D6; on a 2+, it suffers D3 mortal wounds and the Void Dragon regains up to that many lost wounds.'},
 {id:'imotekh-grand-strategist',unit:'Imotekh the Stormlord',sourceUnit:'Imotekh-The-Stormlord',title:'Imotekh · Grand Strategist',window:'Command',timing:'start',summary:'At the start of your Command phase, if Imotekh is on the battlefield, gain 1 CP. Observe the core limit on additional CP gained per battle round.'},
 {id:'imotekh-lord-storm',unit:'Imotekh the Stormlord',sourceUnit:'Imotekh-The-Stormlord',title:'Imotekh · Lord of the Storm',window:'Command',timing:'end',summary:'Once per battle, at the end of your Command phase, roll one D6 for each enemy unit within 12 inches of Imotekh: on 2–5 inflict D3 mortal wounds; on 6 inflict D3+3 mortal wounds.'},
 {id:'orikan-stars-verified',unit:'Orikan the Diviner',sourceUnit:'Orikan-The-Diviner',title:'Orikan · The Stars Are Right',window:'Fight',timing:'start',summary:'Once per battle, at the start of the Fight phase, Orikan may triple the Attacks and Strength of his Staff of Tomorrow until phase end; every successful Wound roll for his attacks is a Critical Wound.'},
 {id:'attached-orikan-invulnerable-verified',unit:'Orikan the Diviner',sourceUnit:'Orikan-The-Diviner',title:'Orikan attachment · 4+ invulnerable save',window:'Fight',timing:'during',summary:'While Orikan leads a unit, models in that attached unit have a 4+ invulnerable save. This applies whenever saving throws are made, including against shooting.'},
 {id:'attached-technomancer-fnp-verified',unit:'Technomancer',sourceUnit:'Technomancer',title:'Technomancer attachment · Feel No Pain 5+',window:'Fight',timing:'during',summary:'While the Technomancer leads the attached Bodyguard, all models in that unit have Feel No Pain 5+. For each wound that would be lost, roll D6 and ignore it on 5+; applies in any phase.'},
 {id:'attached-plasmancer-critical-verified',unit:'Plasmancer',sourceUnit:'Plasmancer',title:'Plasmancer attachment · Critical Hits 5+',window:'Shooting',timing:'during',summary:'While the Plasmancer leads its Bodyguard, unmodified ranged Hit rolls of 5+ score Critical Hits for models in that unit.'},
];
export function verifiedNecronReminders(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Necrons')return [];
 const instances=army.instances?expandRoster(army):null;
 const contextual:GeneratedReminder[]=[];
 if(army.detachment==='Awakened Dynasty'&&army.units['Necron Warriors']){
  for(const squad of (instances?instances.filter(x=>x.unit==='Necron Warriors').map(x=>x.id):['Necron Warriors']))contextual.push({id:'warriors-undying-legions-'+squad,title:'Necron Warriors · Undying Legions reanimation re-roll · '+squad,window:'Fight',timing:'during',summary:'If this squad is selected for Protocol of the Undying Legions after an eligible enemy attack, activate Reanimation Protocols as specified by the Stratagem. Their Number is Legion permits re-rolling the dice determining how many wounds are reanimated. This does not allow a second activation or bypass the Stratagem’s targeting requirements.',source:faction+'Necron-Warriors',origin:'unit',units:[squad]});
 }
 return [...contextual,...rules.filter(r=>(!r.unit||!!army.units[r.unit])&&(!r.detachment||army.detachment===r.detachment)&&(!r.id.startsWith('lychguard-guardian-')||!!(instances?instances.some(x=>x.unit==='Lychguard'&&instances.some(y=>y.attachedTo===x.id&&nobleLeaders.has(y.unit))):Object.entries(army.attachments||{}).some(([leader,bodyguard])=>bodyguard==='Lychguard'&&nobleLeaders.has(leader))))&&(!r.id.startsWith('attached-')||!!army.attachments?.[r.unit!]||!!instances?.some(x=>x.unit===r.unit&&x.attachedTo))).flatMap(r=>{
  if(r.unit&&instances&&!r.id.startsWith('attached-')){
   return instances.filter(x=>x.unit===r.unit&&(!r.id.startsWith('lychguard-guardian-')||instances.some(y=>y.attachedTo===x.id&&nobleLeaders.has(y.unit)))).map(x=>({
    id:r.id+'-'+x.id,title:r.title+' · '+x.id,
    window:r.window,timing:r.timing,summary:r.summary,
    source:r.sourceUnit?faction+r.sourceUnit.replaceAll(' ','-'):faction,
    origin:'unit' as const,units:[x.id]
   }));
  }
  if(r.id.startsWith('attached-')&&instances){
   return instances.filter(x=>x.unit===r.unit&&x.attachedTo).map(x=>({
    id:r.id+'-'+x.id,title:r.title+' · '+x.id+' → '+x.attachedTo,
    window:r.window,timing:r.timing,summary:r.summary,
    source:r.sourceUnit?faction+r.sourceUnit.replaceAll(' ','-'):faction,
    origin:'unit' as const,units:[x.id,x.attachedTo!]
   }));
  }
  return [{id:r.id,title:r.title,window:r.window,timing:r.timing,summary:r.summary,
   source:r.sourceUnit?faction+r.sourceUnit.replaceAll(' ','-'):faction,
   origin:(r.detachment?'detachment':r.unit?'unit':'army') as GeneratedReminder['origin'],
   units:r.unit?[r.unit,...(r.id.startsWith('attached-')&&army.attachments?.[r.unit]?[army.attachments[r.unit]]:[])]:undefined
  }];
 })];
}
