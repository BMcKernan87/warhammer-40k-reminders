import data from '../data/necron-stratagem-windows.json';
import type {GeneratedReminder} from './generated-reminders';

type SourceWindow = [NonNullable<GeneratedReminder['turn']>, GeneratedReminder['timing']];
const stratagems = data.rules as unknown as Record<string,{id:string; windows:Record<string,SourceWindow>}>;

export function applyStratagemWindow(rule:GeneratedReminder): GeneratedReminder {
  // Carryover effects can last beyond the phase in which the CP was spent.
  if (!/\b\d+\s*CP\b/i.test(rule.title)) return rule;
  const name = rule.title.split(' · ').map(part => part.trim().replace(/[’‘]/g,"'").toLowerCase()).find(part => Object.hasOwn(stratagems,part));
  if (!name) return rule;
  const source = stratagems[name];
  const window = source.windows[rule.window];
  if (!window) return rule;
  return {...rule,turn:window[0],timing:window[1],sourceRuleId:source.id};
}
