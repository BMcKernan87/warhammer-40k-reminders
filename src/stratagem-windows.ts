import data from '../data/necron-stratagem-windows.json';
import type {GeneratedReminder} from './generated-reminders';
import {currentNecronDetachment} from './necron-detachment-names';

type SourceWindow = [NonNullable<GeneratedReminder['turn']>, GeneratedReminder['timing']];
const stratagems = data.rules as unknown as Record<string,{id:string;detachment:string|null;windows:Record<string,SourceWindow>}>;
const costsCP=(rule:GeneratedReminder)=>/\b\d+\s*CP\b/i.test(rule.title);
function sourceRecord(rule:GeneratedReminder){
 const name=rule.title.split(' · ').map(part=>part.trim().replace(/[’‘]/g,"'").toLowerCase()).find(part=>Object.hasOwn(stratagems,part));
 return name?stratagems[name]:undefined;
}
export function applyStratagemWindow(rule:GeneratedReminder): GeneratedReminder {
 // Carryover effects can last beyond the phase in which the CP was spent.
 if(!costsCP(rule))return rule;
 const source=sourceRecord(rule),window=source?.windows[rule.window];
 if(!source||!window)return rule;
 return {...rule,turn:window[0],timing:window[1],sourceRuleId:source.id};
}

// Necron detachment activations are backed by the pinned source window
// manifest. A generated CP-spending card must belong to a selected detachment
// and to a published activation window. Non-spending follow-ups retain their
// independent printed expiry and do not become new CP activations.
export function applyNecronStratagemWindow(rule:GeneratedReminder,selected:readonly string[]):GeneratedReminder|undefined{
 if(rule.origin!=='detachment'||!costsCP(rule))return applyStratagemWindow(rule);
 const source=sourceRecord(rule);
 const window=source?.windows[rule.window];
 if(!source?.detachment||!selected.map(currentNecronDetachment).includes(source.detachment)||!window)return;
 return {...rule,turn:window[0],timing:window[1],sourceRuleId:source.id};
}
