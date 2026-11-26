import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {orkLoadout} from '../src/ork-loadouts';
import {orkVehicleDatasheetReminders as sheet} from '../src/ork-vehicle-datasheets';
function army(...units:string[]){
 const counts:Record<string,number>={};
 return {...newSelection('Orks'),units:counts,instances:units.map(unit=>({id:unit+'#'+(counts[unit]=(counts[unit]??0)+1),unit}))};
}
describe('specialist Ork vehicle datasheets',()=>{
 it.each([
  ['Dakkajet','Strafing Run','Shooting','own','without Fly'],
  ['Burna-bommer','Burna Bomb','Fight','opponent','36″'],
  ['Blitza-bommer','Boom Bomb','Fight','opponent','D3+3'],
  ['Wazbom Blastajet','Go fer da Weak Spot','Shooting','own','Monsters and Vehicles'],
  ['Warbuggies','Drive-by Skorchin’','Movement','own','Fire Overwatch'],
  ['Wartrakks','Bust ’Em','Shooting','own','until end of turn'],
  ['Gunwagon','Mobile Arsenal','Shooting','own','Hit rolls of 1'],
  ['Deffkoptas','Aerial Manoover','Fight','opponent','unengaged'],
  ['Battlewagon','Mobile Fortress','Movement','either','Ranged attacks'],
  ['Deff Dread','Dread ’Ard','Fight','either','by 1'],
  ['Killa Kans','Spiteful Power Trip','Fight','either','every model'],
  ['Mek Gunz','Madcap Artillery','Shooting','own','2″ Move'],
 ])('%s resolves %s against the correct unit',(unit,title,phase,turn,text)=>{
  const found=sheet(army(unit,'Callidus Assassin')).find(r=>r.title.includes(title)&&r.window===phase);
  expect(found).toMatchObject({turn,units:[unit+'#1']});expect(found?.summary).toContain(text);
 });
 it('requires another Speed Freeks unit to enable Lone Operative and keeps the busted target in the Fight phase',()=>{
  expect(sheet(army('Wartrakks','Wartrakks')).some(r=>r.title.includes('Speednob Support'))).toBe(false);
  const output=sheet(army('Wartrakks','Warbikers','Boyz'));
  expect(output.find(r=>r.title.includes('Speednob Support'))?.summary).toContain('Warbikers#1');
  expect(output.find(r=>r.title.includes('busted enemy'))?.units).toEqual(['Wartrakks#1','Warbikers#1']);
 });
 it('emits the Force Field exclusively on the fitted aircraft and identifies loss of Smoke',()=>{
  const a=army('Wazbom Blastajet','Wazbom Blastajet');
  const b={...a,instances:a.instances.map((s,i)=>i?{...s,knightGear:{'Force field':'Blastajet Force Field'}}:s)};
  const field=sheet(b).filter(r=>r.title.includes('Blastajet Force Field'));
  expect(field.map(r=>r.window)).toEqual(['Movement','Shooting','Fight']);
  expect(field.every(r=>r.units?.join()==='Wazbom Blastajet#2'&&r.summary.includes('Smoke'))).toBe(true);
 });
 it('displays only equipped Madcap Artillery results and conditions mixed guns on casualties',()=>{
  const a=army('Mek Gunz'),keys=orkLoadout('Mek Gunz',2)!.slots.map(s=>s.name);
  const same={...a,instances:[{...a.instances[0],models:2,knightGear:Object.fromEntries(keys.map(k=>[k,'Traktor Kannon']))}]};
  expect(sheet(same).find(r=>r.title.includes('Madcap Artillery'))?.summary).toContain('cannot take to the skies');
  const mixed={...a,instances:[{...a.instances[0],models:2,knightGear:{[keys[0]]:'Bubblechukka'}}]};
  const conditional=sheet(mixed).find(r=>r.title.includes('Madcap Artillery'))!;
  expect(conditional.summary).toContain('If casualties');
  expect(conditional.summary).toContain('Smasha Gun');expect(conditional.summary).toContain('Bubblechukka');
  expect(conditional.summary).not.toContain('Kustom Mega-kannon');
 });
});
