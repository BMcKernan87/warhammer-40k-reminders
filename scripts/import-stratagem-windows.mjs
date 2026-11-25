// Regenerate from the matched-play review produced by import:wahapedia.
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const phases = ['Command','Movement','Shooting','Charge','Fight'];
export function stratagemWindows(records) {
  const rules = {};
  for (const row of records) {
    const when = row.description.match(/<b>WHEN:<\/b>([\s\S]*?)<b>TARGET:/i)?.[1];
    if (!when) throw Error(row.name + ' has no WHEN clause');
    const text = when.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().split(',')[0];
    const timing = /\bstart of\b/i.test(text) ? 'start' : /\bend of\b/i.test(text) ? 'end' : 'during';
    const windows = {};
    if (/^Any phase\b/i.test(text)) {
      for (const phase of phases) windows[phase] = ['either',timing];
    } else {
      // The broad export turn column conflates “your Shooting phase or the Fight phase”.
      for (const match of text.matchAll(/(?:(your opponent[’']s|your|the)\s+)?(Command|Movement|Shooting|Charge|Fight) phase/gi)) {
        const phase = phases.find(name => name.toLowerCase() === match[2].toLowerCase());
        const subject = match[1]?.toLowerCase();
        windows[phase] = [subject?.includes('opponent') ? 'opponent' : subject === 'your' ? 'own' : 'either', timing];
      }
    }
    if (!Object.keys(windows).length) throw Error(row.name + ' unresolved timing: ' + text);
    const key = row.name.replace(/[’‘]/g,"'").toLowerCase();
    if (rules[key]) throw Error('Ambiguous Stratagem ' + row.name);
    rules[key] = {id:row.id, detachment:row.detachment || null, windows};
  }
  return rules;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [path,out] = process.argv.slice(2);
  if (!path || !out) throw Error('Usage: node scripts/import-stratagem-windows.mjs REVIEW.json OUTPUT.json');
  const review = JSON.parse(readFileSync(path,'utf8'));
  if (review.edition !== 11 || !review.revision || !review.stratagems.length) throw Error('Missing 11th-edition input');
  const rules = stratagemWindows(review.stratagems);
  writeFileSync(out,JSON.stringify({revision:review.revision,rules},null,2)+'\n');
}
