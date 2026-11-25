// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';

it('delivers a single copy of each native and equipped Tyranid reminder through the normal phase sheet',()=>{
 const army={...newSelection('Genestealer Cults'),detachments2026:['Final Day'],units:{Mawloc:1,Trygon:1}};
 const rows=generate11thReminders(army);
 expect(rows.filter(r=>r.title==='Terror From The Deep')).toHaveLength(2);
 expect(rows.filter(r=>r.title==='Subterranean Tunnels')).toHaveLength(2);
 expect(rows.filter(r=>r.id.startsWith('11e-final-day-weapon:Mawloc#1:'))).toMatchObject([{window:'Fight'}]);
 expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
 expect(generate11thReminders({...army,detachments2026:['Outlander Claw']}).some(r=>r.id.startsWith('11e-final-day'))).toBe(false);
});
it('includes fitted Guard profiles only with the Brood Brothers permission',()=>{
 const army={...newSelection('Genestealer Cults'),detachments2026:['Brood Brothers Auxilia'],units:{Hellhound:1}};
 const rows=generate11thReminders(army),name=rows.filter(r=>r.units?.includes('Hellhound#1')&&r.summary.includes('Torrent')&&r.window==='Shooting');
 expect(name).toHaveLength(1);
 expect(generate11thReminders({...army,detachments2026:['Final Day']}).some(r=>r.summary.includes('Inferno cannon'))).toBe(false);
});
