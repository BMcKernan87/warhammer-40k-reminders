import type {Faction} from './catalog';
import type {ReminderWindow} from './generated-reminders';
export type RuleScope='faction'|'detachment'|'unit'|'equipment'|'enhancement'|'stratagem';
export interface RuleRecord {
 id:string; faction:Faction; scope:RuleScope; title:string; window:ReminderWindow;
 timing:'start'|'during'|'end'; summary:string; sourceUrl:string;
 detachment?:string; unit?:string; equipment?:string; enhancement?:string;
 verification:'reference'|'verified'; checkedAt?:string;
}
export function validateRuleRecord(value:unknown):value is RuleRecord{
 if(!value||typeof value!=='object')return false;
 const r=value as Partial<RuleRecord>;
 return typeof r.id==='string'&&r.id.length>0&&typeof r.faction==='string'&&
 ['faction','detachment','unit','equipment','enhancement','stratagem'].includes(r.scope||'')&&
 typeof r.title==='string'&&r.title.length>0&&
 ['Command','Movement','Shooting','Charge','Fight','End of opponent turn'].includes(r.window||'')&&
 ['start','during','end'].includes(r.timing||'')&&typeof r.summary==='string'&&r.summary.length>0&&
 typeof r.sourceUrl==='string'&&r.sourceUrl.startsWith('https://')&&
 ['reference','verified'].includes(r.verification||'')&&
 (r.scope!=='unit'||typeof r.unit==='string')&&
 (r.scope!=='equipment'||(typeof r.unit==='string'&&typeof r.equipment==='string'))&&
 (r.scope!=='detachment'||typeof r.detachment==='string');
}
export function validateRuleRegistry(records:readonly unknown[]):records is RuleRecord[]{
 return records.every(validateRuleRecord)&&new Set(records.map(r=>(r as RuleRecord).id)).size===records.length;
}
