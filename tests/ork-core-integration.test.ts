import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {setKnightGear} from '../src/knight-loadouts';
import {rosterCost2026} from '../src/datasheets-2026';
import {generate11thReminders} from '../src/reminders-11th';
import type {RosterInstance} from '../src/roster-instances';

const army=(instances:RosterInstance[],detachment='War Horde'):ArmySelection=>({
 ...newSelection('Orks'),battleSize2026:'Incursion',detachments2026:[detachment],instances,
});
describe('Ork core and faction rules share the selected roster',()=>{
 it('filters Overwatch, Smokescreen and riled-up ranged attacks by the equipped squad and its formation',()=>{
  let a=army([{id:'pair',unit:'Meganobz'},{id:'mob',unit:'Boyz'},{id:'boss',unit:'Warboss',attachedTo:'mob'},
   {id:'field',unit:'Wazbom Blastajet'},{id:'smoke',unit:'Wazbom Blastajet'}]);
  a=setKnightGear(a,'pair','Meganob 1 · Weapons','Twin Killsaws');
  a=setKnightGear(a,'pair','Meganob 2 · Weapons','Twin Killsaws');
  a=setKnightGear(a,'field','Force field','Blastajet Force Field');
  const sheet=generate11thReminders(a);
  for(const id of ['11e-core-overwatch','11e-orks-riled-assault']){
   const card=sheet.find(r=>r.id===id)!;
   expect(card.units).toContain('mob');
   expect(card.units).not.toContain('boss');
   expect(card.units).not.toContain('pair');
  }
  expect(sheet.find(r=>r.id==='11e-core-smokescreen')?.units).toEqual(['smoke']);
  expect(sheet.filter(r=>r.id==='11e-orks-war-cry')).toHaveLength(1);
  expect(sheet.find(r=>r.id==='11e-orks-war-cry')).toMatchObject({window:'Command',timing:'start',turn:'either'});
  a=setKnightGear(a,'pair','Meganob 2 · Weapons','Kustom Shoota + Power Klaw');
  expect(generate11thReminders(a).find(r=>r.id==='11e-core-overwatch')?.units).toContain('pair');
 });
 it('reserves compulsory aircraft first and applies the Flyboyz exemption for optional formations',()=>{
  const units=[{id:'jet1',unit:'Dakkajet'},{id:'jet2',unit:'Dakkajet'},{id:'walker',unit:'Gorkanaut'},{id:'mob',unit:'Boyz'}];
  const base=army(units);
  const total=rosterCost2026(base).entries.filter(e=>e.unit==='Dakkajet').reduce((n,e)=>n+(e.points??0),0);
  const declaration=(a:ArmySelection)=>generate11thReminders(a).find(r=>r.id==='11e-formation-reserve-declaration');
  expect(declaration(base)).toMatchObject({units:['mob'],summary:expect.stringContaining((500-total)+' points remain')});
  const free=army(units,'Flyboyz');
  expect(declaration(free)?.units).toEqual(['walker','mob']);
  const sheet=generate11thReminders(free);
  const planes=sheet.filter(r=>r.id.startsWith('11e-orks-aircraft-'));
  expect(planes.map(r=>r.window)).toEqual(['Pre-battle','Movement','Shooting','Charge','Fight','End of opponent turn']);
  expect(planes.every(r=>r.units?.join(',')==='jet1,jet2')).toBe(true);
  expect(planes[0].summary).not.toContain('Include its points');
  expect(planes.at(-1)).toMatchObject({turn:'opponent',timing:'end'});
  expect(sheet.find(r=>r.id==='11e-core-rapid-ingress')?.units).not.toContain('jet1');
 });
});
