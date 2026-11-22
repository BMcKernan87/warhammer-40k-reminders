import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
const faction='https://wahapedia.ru/wh40k10ed/factions/necrons/';
type Entry=Omit<GeneratedReminder,'source'|'origin'> & {unit?:string;detachment?:string;sourceUnit?:string};
const rules:Entry[]=[
 {id:'necron-reanimation',title:'Reanimation Protocols',window:'Command',timing:'end',summary:'At the end of your Command phase, each unit on the battlefield with Reanimation Protocols reanimates D3 wounds: heal damaged models first, then return destroyed models one wound at a time, up to Starting Strength.',},
 {id:'necron-technomancer-heal-verified',unit:'Technomancer',sourceUnit:'Technomancer',title:'Technomancer · repair',window:'Movement',timing:'end',summary:'At the end of your Movement phase, select one friendly NECRONS model within 6 inches of this Technomancer. It regains up to D3 lost wounds; a model can only be selected for this ability once per turn.'},
 {id:'necron-plasmancer-lightning-verified',unit:'Plasmancer',sourceUnit:'Plasmancer',title:'Plasmancer · Living Lightning',window:'Shooting',timing:'during',summary:'In your Shooting phase, choose one visible enemy unit within 18 inches (excluding a lone Lone Operative unit outside 12 inches). Roll four D6; each 4+ causes one mortal wound.'},
 {id:'necron-power-matrix-verified',detachment:'Canoptek Court',title:'Power Matrix',window:'Shooting',timing:'during',summary:'CRYPTEK and CANOPTEK units re-roll Hit rolls of 1. If wholly within your Power Matrix, re-roll any Hit roll instead. Your deployment zone always qualifies; at the start of each phase, control at least half the objectives in No Man’s Land or the enemy deployment zone to extend the matrix there until phase end.'},
 {id:'orikan-stars-verified',unit:'Orikan the Diviner',sourceUnit:'Orikan-The-Diviner',title:'Orikan · The Stars Are Right',window:'Fight',timing:'start',summary:'Once per battle, at the start of the Fight phase, Orikan may triple the Attacks and Strength of his Staff of Tomorrow until phase end; every successful Wound roll for his attacks is a Critical Wound.'},
 {id:'attached-orikan-invulnerable-verified',unit:'Orikan the Diviner',sourceUnit:'Orikan-The-Diviner',title:'Orikan attachment · 4+ invulnerable save',window:'Fight',timing:'during',summary:'While Orikan leads a unit, models in that attached unit have a 4+ invulnerable save. This applies whenever saving throws are made, including against shooting.'},
 {id:'attached-technomancer-fnp-verified',unit:'Technomancer',sourceUnit:'Technomancer',title:'Technomancer attachment · Feel No Pain 5+',window:'Fight',timing:'during',summary:'While the Technomancer leads the attached Bodyguard, all models in that unit have Feel No Pain 5+. For each wound that would be lost, roll D6 and ignore it on 5+; applies in any phase.'},
 {id:'attached-plasmancer-critical-verified',unit:'Plasmancer',sourceUnit:'Plasmancer',title:'Plasmancer attachment · Critical Hits 5+',window:'Shooting',timing:'during',summary:'While the Plasmancer leads its Bodyguard, unmodified ranged Hit rolls of 5+ score Critical Hits for models in that unit.'},
];
export function verifiedNecronReminders(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Necrons')return [];
 return rules.filter(r=>(!r.unit||!!army.units[r.unit])&&(!r.detachment||army.detachment===r.detachment)&&(!r.id.includes('attachment')||!!army.attachments?.[r.unit!])).map(r=>({
 id:r.id,title:r.title,window:r.window,timing:r.timing,summary:r.summary,
 source:r.sourceUnit?faction+r.sourceUnit.replaceAll(' ','-'):faction,
 origin:r.detachment?'detachment':r.unit?'unit':'army',
 units:r.unit?[r.unit,...(r.id.includes('attachment')?[army.attachments![r.unit]!]:[])]:undefined
 }));
}
