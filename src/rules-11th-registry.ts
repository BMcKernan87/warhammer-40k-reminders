import type {ArmySelection,Faction} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
/** Data-driven 11e rules. Every entry requires an edition-specific source and explicit selectors. */
export interface Rule11th extends GeneratedReminder{
 faction?:Faction;
 detachments?:readonly string[];
 anyUnits?:readonly string[];
 allUnits?:readonly string[];
 equipment?:Readonly<Record<string,string>>;
 enhancements?:readonly string[];
}
export function matching11thRules(army:ArmySelection,rules:readonly Rule11th[]):GeneratedReminder[]{
 const units=new Set([...Object.entries(army.units).filter(([,count])=>count>0).map(([name])=>name),...(army.instances||[]).map(x=>x.unit)]);
 const detachments=new Set(army.detachments2026||[]);
 return rules.filter(rule=>{
  if(rule.faction&&rule.faction!==army.faction)return false;
  if(rule.detachments&&!rule.detachments.some(d=>detachments.has(d)))return false;
  if(rule.anyUnits&&!rule.anyUnits.some(u=>units.has(u)))return false;
  if(rule.allUnits&&!rule.allUnits.every(u=>units.has(u)))return false;
  if(rule.enhancements&&!rule.enhancements.some(name=>Object.values(army.upgrades2026||{}).includes(name)))return false;
  if(rule.equipment&&!Object.entries(rule.equipment).every(([unit,choice])=>army.equipment?.[unit]===choice||army.instances?.some(x=>x.unit===unit&&x.equipment===choice)))return false;
  return true;
 }).map(({faction:_,detachments:__,anyUnits:___,allUnits:____,equipment:_____,enhancements:______,...reminder})=>({...reminder,units:reminder.units?.filter(u=>units.has(u))}));
}
