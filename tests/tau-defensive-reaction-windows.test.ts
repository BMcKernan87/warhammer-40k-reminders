// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {TAU_SHEETS} from '../src/tau-data.generated';
import {tauIntrinsicReminders} from '../src/tau-intrinsic';
import {tauLoadout,validTauGear} from '../src/tau-loadouts';
import {generate11thReminders} from '../src/reminders-11th';
import type {GeneratedReminder} from '../src/generated-reminders';
import type {RosterInstance} from '../src/roster-instances';

// The November 23 export reproduces App T'au Empire v1.2. These abilities
// have attack/bearer conditions, not an opponent-Shooting-only restriction:
// https://wahapedia.ru/wh40k11ed/factions/t-au-empire/Commander-Shadowsun (000000407/5)
// https://wahapedia.ru/wh40k11ed/factions/t-au-empire/Ghostkeel-Battlesuit (000000420/7)
// https://wahapedia.ru/wh40k11ed/factions/t-au-empire/Commander-In-Enforcer-Battlesuit (000001478/4,6)
// https://wahapedia.ru/wh40k11ed/factions/t-au-empire/Strike-Team
// Suppression Volley (000000411/2) expires at the start of the next own
// turn and explicitly requires its source unit to remain on the battlefield.
// https://wahapedia.ru/wh40k11ed/factions/t-au-empire/Breacher-Team
// https://wahapedia.ru/wh40k11ed/factions/t-au-empire/Tidewall-Shieldline (000000436/4)
// Core 05.03-05.04, 15.08-15.09 and 19.04: normal attack protections,
// end-of-enemy-Movement Overwatch and original surviving Leader abilities.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// A real own-Movement incoming normal attack: Deathmarks / Hyperspace Hunters.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
// Opponent-Movement incoming fire: Aquilon Servo-sentry after Deep Strike,
// publisher pack v1.3 physical PDF p24, including the Aquilons' own turn.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24

const id=(unit:string,n=1)=>unit+'#'+n;
function army(...names:string[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){
  units[unit]=(units[unit]??0)+1;
  instances.push({unit,id:id(unit,units[unit]),models:TAU_SHEETS.find(s=>s.unit===unit)!.sizes[0]});
 }
 return {...newSelection('T’au Empire'),units,instances,detachments2026:['Mont’ka']};
}
function equip(a:ArmySelection,unit:string,prefix:string,items:string[]){
 const squad=a.instances!.find(s=>s.id===id(unit))!;
 const key=(values:readonly string[])=>values.map(v=>v.toLowerCase()).sort().join('|');
 const field=tauLoadout(unit,squad.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)))!;
 const knightGear={...squad.knightGear,[field.name]:field.choices.find(c=>key(c.items)===key(items))!.name};
 expect(validTauGear(unit,knightGear,squad.models)).toBe(true);
 return {...a,instances:a.instances!.map(s=>s.id===squad.id?{...s,knightGear}:s)};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const rows=(a:ArmySelection,title:string,roster?:RosterInstance[])=>tauIntrinsicReminders(a,roster).filter(r=>r.title===title);
const stages=(rs:GeneratedReminder[])=>rs.map(r=>[r.window,r.turn,r.timing].join(':')).sort();
const ranged=['Movement:own:during','Movement:opponent:during','Shooting:own:during','Shooting:opponent:during'].sort();
function identities(rs:GeneratedReminder[],unit:string,title:string,melee=false){
 const stem='11e-tau-native:'+id(unit)+':'+title+':';
 expect(rs.find(r=>r.window==='Movement'&&r.turn==='own')).toMatchObject({id:stem+'Movement:own:end',timing:'during'});
 expect(rs.find(r=>r.window==='Movement'&&r.turn==='opponent')?.id).toBe(stem+'Movement:opponent:during');
 expect(rs.map(r=>r.id)).toEqual(expect.arrayContaining([stem+'Shooting:own:during',stem+'Shooting:opponent:during',...(melee?[stem+'Fight:either:during']:[])]));
 expect(new Set(rs.map(r=>r.id)).size).toBe(rs.length);
}

describe('T’au bespoke protection in every permitted incoming attack window',()=>{
 it('keeps Advanced Guardian Drone on Shadowsun herself during both Movement turns and return fire',()=>{
  const a=army('Commander Shadowsun','Ghostkeel Battlesuit','Strike Team'),rs=rows(a,'Advanced Guardian Drone');
  expect(stages(rs)).toEqual(ranged);
  for(const r of rs){
   expect(r.units).toEqual([id('Commander Shadowsun')]);
   expect(r.summary).toContain('Subtract 1 from Wound rolls for ranged attacks targeting Shadowsun herself');
   expect(r.summary).toContain('protects its bearer');
   expect(r.source).toContain('/Commander-Shadowsun');
  }
  identities(rs,'Commander Shadowsun','Advanced Guardian Drone');
  expect(rows(a,'Advanced Guardian Drone',a.instances!.filter(s=>s.unit!=='Commander Shadowsun'))).toEqual([]);
 });

 it('keeps a Ghostkeel’s two Stealth Drone uses shared across attacks, phases and turns',()=>{
  const a=army('Ghostkeel Battlesuit','Ghostkeel Battlesuit','Commander Shadowsun');
  const all=rows(a,'Stealth Drones'),rs=all.filter(r=>r.units?.includes(id('Ghostkeel Battlesuit')));
  expect(stages(rs)).toEqual([...ranged,'Fight:either:during'].sort());
  for(const r of rs){
   expect(r.units).toEqual([id('Ghostkeel Battlesuit')]);
   expect(r.summary).toContain('after an attack is allocated to this Ghostkeel');
   expect(r.summary).toContain('two uses are shared across all phases and turns');
   expect(r.summary).toContain('does not prevent wounds that were not caused by an allocated attack');
  }
  identities(rs,'Ghostkeel Battlesuit','Stealth Drones',true);
  expect(all.filter(r=>r.units?.includes(id('Ghostkeel Battlesuit',2)))).toHaveLength(5);
  expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
  const surviving=rows(a,'Stealth Drones',a.instances!.filter(s=>s.id!==id('Ghostkeel Battlesuit')));
  expect(surviving).toHaveLength(5);expect(surviving.every(r=>r.units?.join()===id('Ghostkeel Battlesuit',2))).toBe(true);
 });

 it.each([
  ['Breacher Team','Breacher Fire Warrior Shas’ui ·','Breacher Fire Warrior Shas’ui 1'],
  ['Strike Team','Fire Warrior Shas’ui ·','Fire Warrior Shas’ui 1'],
 ])('%s keeps Guardian Drone conditional on its actual bearer and one original formation',(unit,prefix,bearer)=>{
  let a=join(army(unit,unit,'Cadre Fireblade'),'Cadre Fireblade',unit);
  expect(rows(a,'Guardian Drone')).toEqual([]);
  a=equip(a,unit,prefix,['Guardian Drone']);
  const rs=rows(a,'Guardian Drone');expect(stages(rs)).toEqual(ranged);
  for(const r of rs){
   expect(r.units?.sort()).toEqual([id(unit),id('Cadre Fireblade')].sort());
   expect(r.units).not.toContain(id(unit,2));
   expect(r.summary).toContain('While the Guardian Drone bearer survives ('+bearer+')');
   expect(r.summary).toContain('until that attacking unit finishes its attacks');
   expect(r.summary).toContain('equipment token, not a separate model');
  }
  identities(rs,unit,'Guardian Drone');
  const deadLeader=a.instances!.map(s=>s.unit==='Cadre Fireblade'?{...s,models:0}:s);
  const survivingDrone=rows(a,'Guardian Drone',deadLeader);
  expect(survivingDrone).toHaveLength(4);expect(survivingDrone.every(r=>r.units?.join()===id(unit))).toBe(true);
  expect(rows(a,'Guardian Drone',a.instances!.filter(s=>s.id!==id(unit)))).toEqual([]);
  expect(rows(equip(a,unit,prefix,[]),'Guardian Drone')).toEqual([]);
 });

 it.each(['Commander In Coldstar Battlesuit','Commander In Enforcer Battlesuit'])('%s shows Shield Generator only on the equipped model in all attack windows',unit=>{
  let a=join(army(unit,'Crisis Starscythe Battlesuits'),unit,'Crisis Starscythe Battlesuits');
  expect(rows(a,'Shield Generator')).toEqual([]);
  a=equip(a,unit,'Additional weapon or system 1',['Shield generator']);
  const rs=rows(a,'Shield Generator');expect(stages(rs)).toEqual([...ranged,'Fight:either:during'].sort());
  for(const r of rs){
   expect(r.units).toEqual([id(unit)]);
   expect(r.summary).toContain('4+ invulnerable save');
   expect(r.summary).toContain('not shared with other models');
   expect(r.summary).toContain(unit.replace(' In ',' in ')+' 1');
  }
  identities(rs,unit,'Shield Generator',true);
  expect(rows(a,'Shield Generator',a.instances!.filter(s=>s.unit!==unit))).toEqual([]);
  expect(rows(equip(a,unit,'Additional weapon or system 1',[]),'Shield Generator')).toEqual([]);
 });

 it('retains Enforcer Commander for the surviving original Leader but never for a duplicate formation',()=>{
  const leader='Commander In Enforcer Battlesuit',body='Crisis Starscythe Battlesuits';
  let a=army(leader,body,body);expect(rows(a,'Enforcer Commander')).toEqual([]);
  a=join(a,leader,body);
  const rs=rows(a,'Enforcer Commander');expect(stages(rs)).toEqual(ranged);
  for(const r of rs){
   expect(r.units?.sort()).toEqual([id(leader),id(body)].sort());
   expect(r.summary).toContain('Worsen the Armour Penetration of ranged attacks');
   expect(r.summary).toContain('source model must survive');
   expect(r.summary).toContain('until that attacking unit finishes');
  }
  identities(rs,leader,'Enforcer Commander');
  const survivors=a.instances!.filter(s=>s.id!==id(body)),after=rows(a,'Enforcer Commander',survivors);
  expect(stages(after)).toEqual(ranged);expect(after.every(r=>r.units?.join()===id(leader))).toBe(true);
  expect(after.every(r=>r.summary.includes('continues after the bodyguard is destroyed'))).toBe(true);
  expect(rows(a,'Enforcer Commander',a.instances!.filter(s=>s.unit!==leader))).toEqual([]);
 });

 it('rejects an originally illegal Enforcer attachment after the illegal bodyguard is removed',()=>{
  const a=join(army('Commander In Enforcer Battlesuit','Strike Team'),'Commander In Enforcer Battlesuit','Strike Team');
  expect(rows(a,'Enforcer Commander')).toEqual([]);
  expect(rows(a,'Enforcer Commander',a.instances!.filter(s=>s.unit!=='Strike Team'))).toEqual([]);
 });

 it.each([
  ['changed bodyguard identity',(a:ArmySelection)=>a.instances!.map(s=>s.unit==='Crisis Starscythe Battlesuits'?{...s,unit:'Crisis Sunforge Battlesuits'}:s)],
  ['changed original attachment',(a:ArmySelection)=>a.instances!.filter(s=>s.unit!=='Crisis Starscythe Battlesuits').map(s=>({...s,attachedTo:undefined}))],
  ['new attachment recipient',(a:ArmySelection)=>[...a.instances!,{unit:'Commander In Coldstar Battlesuit',id:'new-commander',models:1,attachedTo:id('Crisis Starscythe Battlesuits')}]],
  ['duplicate source identity',(a:ArmySelection)=>[...a.instances!,a.instances![0]]],
  ['retinue instead of original join',(a:ArmySelection)=>a.instances!.map(s=>s.unit==='Commander In Enforcer Battlesuit'?{...s,retinueTo:id('Crisis Starscythe Battlesuits')}:s)],
  ['destroyed source count',(a:ArmySelection)=>a.instances!.map(s=>s.unit==='Commander In Enforcer Battlesuit'?{...s,models:0}:s)],
 ] as const)('does not transfer Enforcer protection through %s',(_label,current)=>{
  const a=join(army('Commander In Enforcer Battlesuit','Crisis Starscythe Battlesuits'),'Commander In Enforcer Battlesuit','Crisis Starscythe Battlesuits');
  expect(rows(a,'Enforcer Commander',current(a))).toEqual([]);
 });

 it('does not give a replacement Enforcer the former Coldstar’s original leading history',()=>{
  const a=join(army('Commander In Coldstar Battlesuit','Crisis Starscythe Battlesuits'),'Commander In Coldstar Battlesuit','Crisis Starscythe Battlesuits');
  const changed=a.instances!.filter(s=>s.unit!=='Crisis Starscythe Battlesuits').map(s=>({...s,unit:'Commander In Enforcer Battlesuit'}));
  expect(rows(a,'Enforcer Commander',changed)).toEqual([]);
 });

 it.each(['Tidewall Droneport','Tidewall Shieldline','Tidewall Gunrig'])('%s retains actual intervening visibility conditions and both old Movement completion identities',unit=>{
  const a=army(unit,'Strike Team'),rs=rows(a,'Tidewall Cover');
  expect(stages(rs)).toEqual(ranged);
  for(const r of rs){
   expect(r.units).toEqual([id(unit)]);
   expect(r.summary).toContain('not fully visible to every model in the attacking unit because of this Tidewall');
   expect(r.summary).toContain('not a blanket aura');
   expect(r.id).toBe('11e-tau-native:'+id(unit)+':Tidewall Cover:'+r.window+':'+r.turn+':'+(r.window==='Movement'?'end':'during'));
  }
  expect(rows(a,'Tidewall Cover',a.instances!.filter(s=>s.unit!==unit))).toEqual([]);
 });

 it('shows a prior Strike Team suppression during the next enemy Movement without reviving it next own Movement',()=>{
  const a=join(army('Strike Team','Strike Team','Cadre Fireblade'),'Cadre Fireblade','Strike Team');
  const title='Suppression Volley · Suppressed enemy attacks';
  const rs=rows(a,title).filter(r=>r.units?.includes(id('Strike Team')));
  expect(stages(rs)).toEqual(['Shooting:own:during','Shooting:opponent:during','Fight:either:during','Movement:opponent:during'].sort());
  for(const r of rs){
   expect(r.units?.sort()).toEqual([id('Strike Team'),id('Cadre Fireblade')].sort());
   expect(r.summary).toContain('enemy Infantry unit suppressed by this Strike Team');
   expect(r.summary).toContain('until the start of your next turn');
   expect(r.summary).toContain('while an original Strike Team model remains on the battlefield');
   expect(r.summary).toContain('normal enemy shooting in their Movement phase');
   expect(r.summary).toContain('does not modify fixed snap-shot Hit rolls');
  }
  const stem='11e-tau-native:'+id('Strike Team')+':'+title+':';
  expect(rs.map(r=>r.id)).toEqual(expect.arrayContaining([stem+'Shooting:opponent:during',stem+'Shooting:own:during',stem+'Fight:either:during']));
  expect(rs.find(r=>r.window==='Movement')?.id).toBe(stem+'Movement:opponent:during');
  expect(rows(a,'Suppression Volley')).toMatchObject([{window:'Shooting',turn:'own',timing:'during'},{window:'Shooting',turn:'own',timing:'during'}]);
 });

 it('ends Strike Team suppression when that source is gone even if its original Fireblade survives',()=>{
  const a=join(army('Strike Team','Strike Team','Cadre Fireblade'),'Cadre Fireblade','Strike Team');
  const title='Suppression Volley · Suppressed enemy attacks';
  const active=a.instances!.filter(s=>s.id!==id('Strike Team'));
  const surviving=rows(a,title,active);expect(surviving).toHaveLength(4);
  expect(surviving.every(r=>r.units?.join()===id('Strike Team',2))).toBe(true);
  expect(surviving.every(r=>!r.units?.includes(id('Cadre Fireblade')))).toBe(true);
  expect(rows(a,title,a.instances!.filter(s=>s.unit!=='Strike Team'))).toEqual([]);
 });

 it.each([
  ['Commander Shadowsun','Advanced Guardian Drone'],
  ['Ghostkeel Battlesuit','Stealth Drones'],
  ['Strike Team','Suppression Volley · Suppressed enemy attacks'],
 ])('expires %s’s source-dependent protection when its explicit model count is zero',(unit,title)=>{
  let a=army(unit,'Cadre Fireblade');
  if(unit==='Strike Team'){
   a=join(a,'Cadre Fireblade',unit);
   a=equip(a,unit,'Fire Warrior Shas’ui ·',['Guardian Drone']);
  }
  expect(rows(a,title).length).toBeGreaterThan(0);
  const current=a.instances!.map(s=>s.unit===unit?{...s,models:0}:s);
  expect(current.find(s=>s.unit==='Cadre Fireblade')?.models).toBe(1);
  expect(rows(a,title,current)).toEqual([]);
  if(unit==='Strike Team'){
   // A surviving attached Fireblade does not become the destroyed Shas’ui
   // or retain that source-dependent suppression or drone equipment.
   expect(rows(a,'Suppression Volley',current)).toEqual([]);
   expect(rows(a,'Guardian Drone',current)).toEqual([]);
  }
 });

 it('keeps end-of-phase Overwatch, equipped Homing Beacon and own-Shooting activations separate from defensive timing',()=>{
  let a=army('Commander Shadowsun','Ghostkeel Battlesuit','Stealth Battlesuits','Riptide Battlesuit','Piranhas');
  a=equip(a,'Stealth Battlesuits','Stealth Shas’ui 1 ·',['Homing beacon']);
  const all=generate11thReminders(a);
  expect(all.find(r=>r.title==='Fire Overwatch · 1CP')).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  expect(rows(a,'Homing Beacon')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
  expect(rows(a,'Drone Harassment Tactics')[0]).toMatchObject({window:'Movement',turn:'own',timing:'end'});
  expect(rows(a,'Nova Charge')).toMatchObject([{window:'Shooting',turn:'own',timing:'during'}]);
  expect(rows(a,'Hero of the Empire').some(r=>r.window==='Movement')).toBe(false);
  expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
 });
});
