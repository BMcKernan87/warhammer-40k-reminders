import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {eligibleKnightUpgrades} from '../src/imperial-knight-detachments';

function army(detachment:string,...units:string[]){
 const counts:Record<string,number>={};
 const instances=units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}));
 return {...newSelection('Imperial Knights'),detachments2026:[detachment],units:counts,instances};
}
const cues=(a:ReturnType<typeof army>)=>generate11thReminders(a).filter(r=>r.id.startsWith('11e-knight-'));
describe('Imperial Knights faction and detachment sheets',()=>{
 it.each([
  ['Dominus Foebreakers','Knight Castellan','000011005003','Shooting','engaged'],
  ['Freeblade Company','Armiger Warglaive','000010756004','Movement','+9″'],
  ['Gate Warden Lance','Knight Paladin','000010498006','Shooting','Remained Stationary'],
  ['Questoris Companions','Knight Errant','000010503005','Command','at least 5'],
  ['Spearhead-at-arms','Armiger Helverin','000010507006','Shooting','worsen the AP'],
  ['Throne-bonded Outriders','Armiger Warglaive','000011009004','Shooting','starting an action'],
  ['Valourstrike Lance','Armiger Helverin','000010494003','Fight','8 attacks'],
  ['Questor Forgepact','Skitarii Rangers','000009762004','Movement','starting an action']
 ])('%s selects actual targets for applicable effects',(detachment,unit,id,phase,effect)=>{
  const r=cues(army(detachment,unit,'Callidus Assassin')).find(row=>row.id==='11e-knight-'+id+'-'+phase);
  expect(r?.units).toEqual([unit+'#1']);
  expect(r?.summary).toContain(effect);
 });
 it('does not confer the Knight army rule or Bondsman on allied priests and Agents',()=>{
  const a=army('Questor Forgepact','Knight Paladin','Armiger Helverin','Tech-Priest Dominus','Callidus Assassin');
  expect(cues(a).find(r=>r.id.includes('-oath-'))?.units).toEqual(['Knight Paladin#1','Armiger Helverin#1']);
  expect(cues(a).find(r=>r.id.includes('-bondsman-'))?.units).toEqual(['Knight Paladin#1']);
  expect(cues(a).find(r=>r.id.includes('-walker-'))?.units).toEqual(['Knight Paladin#1']);
  expect(cues(army('Questor Forgepact','Skitarii Rangers')).filter(r=>r.origin==='army')).toEqual([]);
 });
 it('separates both Full Tilts and their CP costs',()=>{
  const a=cues(army('Valourstrike Lance','Knight Paladin')).find(r=>r.title.includes('Full Tilt'))!;
  const b=cues(army('Freeblade Company','Knight Paladin')).find(r=>r.title.includes('Full Tilt'))!;
  expect(a.title).toContain('2CP');expect(a.summary).toContain('2″');expect(b.title).toContain('1CP');expect(b.summary).toContain('6″');expect(a.id).not.toBe(b.id);
 });
 it('requires both a Bondsman provider and an Armiger for linked abilities; excludes Armigers from Titanic protection',()=>{
  const alone=army('Spearhead-at-arms','Canis Rex','Armiger Helverin');
  expect(cues(alone).some(r=>r.title.includes('Exemplar'))).toBe(false);
  expect(cues(army('Spearhead-at-arms','Knight Paladin','Armiger Helverin')).find(r=>r.title.includes('Exemplar'))?.units).toEqual(['Armiger Helverin#1']);
  expect(cues(army('Questoris Companions','Armiger Helverin')).some(r=>r.title.includes('Courageous Stand'))).toBe(false);
 });
 it('uses real recipients for two-model enhancements and excludes ineligible bearers',()=>{
  const a=army('Valourstrike Lance','Knight Paladin','Knight Errant','Armiger Warglaive');
  const name='Bearer of the Iron Chalice';
  const b={...a,upgrades2026:{'Knight Paladin#1':name}};
  expect(cues(b).find(r=>r.title.includes(name))?.units).toEqual(['Knight Errant#1','Armiger Warglaive#1']);
  expect(eligibleKnightUpgrades(a,'Canis Rex')).toEqual([]);
  expect(eligibleKnightUpgrades(a,'Armiger Warglaive')).toEqual([]);
  const c=army('Throne-bonded Outriders','Armiger Warglaive');
  expect(eligibleKnightUpgrades(c,'Armiger Warglaive').every(u=>u.repeatable)).toBe(true);
  expect(eligibleKnightUpgrades(c,'Armiger Warglaive')).toHaveLength(2);
  expect(eligibleKnightUpgrades(army('Questor Forgepact','Tech-Priest Dominus'),'Tech-Priest Dominus').map(u=>u.name)).toEqual(['Magos Questoris']);
 });
 it('does not print Spearhead multi-Armiger enhancement bonuses when only one Armiger is available',()=>{
  const name='Fables of Nightmare'; const upgrades2026={'Knight Paladin#1':name};
  const a=army('Spearhead-at-arms','Knight Paladin','Armiger Warglaive');
  expect(cues({...a,upgrades2026}).some(r=>r.title.includes(name))).toBe(false);
  const b=army('Spearhead-at-arms','Knight Paladin','Armiger Warglaive','Armiger Helverin');
  expect(cues({...b,upgrades2026}).find(r=>r.title.includes(name))?.units).toEqual(['Armiger Warglaive#1','Armiger Helverin#1']);
 });
 it('blocks a shared Armigers tag even within budget and preserves all earned dispositions',()=>{
  expect(detachmentBudget('Imperial Knights',['Spearhead-at-arms','Throne-bonded Outriders'],'Strike Force').valid).toBe(false);
  expect(detachmentBudget('Imperial Knights',['Questoris Companions'],'Strike Force').dispositions).toEqual(['Take and Hold','Reconnaissance']);
  expect(detachmentBudget('Imperial Knights',['Gate Warden Lance','Dominus Foebreakers'],'Strike Force').dispositions).toEqual(['Take and Hold','Priority Assets']);
 });
});
