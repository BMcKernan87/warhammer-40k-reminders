// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {SORORITAS_SHEETS,SORORITAS_REVISION,SORORITAS_ACTS_OF_FAITH_UNITS} from '../src/sororitas-data.generated';
import {SORORITAS_CARDS} from '../src/sororitas-card-profiles.generated';
import {SORORITAS_KITS} from '../src/sororitas-loadouts.generated';
import {sororitasKeywords,sororitasMusterUnits} from '../src/sororitas-data';
import {sororitasLoadout,sororitasModelLoadouts,sororitasWeaponCount,sororitasHasRangedWeapon,validSororitasGear,resizeSororitasGear} from '../src/sororitas-loadouts';

const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
const count=sororitasWeaponCount;
function equip(s:RosterInstance,prefix:string,items:string[]){
 const kit=sororitasLoadout(s.unit,s.models)!;
 const field=kit.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('No legal equipment choice: '+s.unit+' / '+prefix+' / '+items.join(', '));
 const choice=field.choices.find(c=>key(c.items)===key(items))!;
 const gear={...s.knightGear,[field.name]:choice.name};
 if(!validSororitasGear(s.unit,gear,s.models))throw Error('Equipment limit exceeded');
 return {...s,knightGear:gear};
}
const cost=(s:RosterInstance)=>Object.entries(SORORITAS_SHEETS.find(row=>row.unit===s.unit)!.wargearPoints??{}).reduce((total,[item,points])=>total+count(s,item)*points,0);

it.each(SORORITAS_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s resolves every physical model and every single permitted exchange at each legal size',(unit,sheet)=>{
 for(const [total,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(unit,+total),kit=sororitasLoadout(unit,+total)!,models=sororitasModelLoadouts(s);
  expect(models).toHaveLength(+total);
  expect(models.reduce<Record<string,number>>((out,m)=>({...out,[m.model]:(out[m.model]??0)+1}),{})).toEqual(roles);
  for(const field of kit.slots)for(const choice of field.choices){
   const changed={...s,knightGear:{[field.name]:choice.name}};
   expect(validSororitasGear(unit,changed.knightGear,+total)).toBe(true);
   const expected=models.flatMap(m=>m.items);
   for(const item of field.choices[0].items){const i=expected.indexOf(item);expect(i).toBeGreaterThanOrEqual(0);expected.splice(i,1);}
   expect(sororitasModelLoadouts(changed).flatMap(m=>m.items).sort()).toEqual([...expected,...choice.items].sort());
  }
 }
});

it('imports exactly the current matched native inventory, actual support permissions and Acts of Faith recipients',()=>{
 const a=newSelection('Adepta Sororitas'),names=SORORITAS_SHEETS.map(s=>s.unit);
 expect(names).toHaveLength(33);expect(new Set(names).size).toBe(33);
 expect(new Set(Object.keys(SORORITAS_CARDS))).toEqual(new Set(names));
 expect(new Set(SORORITAS_KITS.map(k=>k.unit))).toEqual(new Set(names));
 expect(new Set(SORORITAS_ACTS_OF_FAITH_UNITS)).toEqual(new Set(names));
 expect(sororitasMusterUnits(a)).toEqual(names);
 for(const name of ['Battle Sanctum','Celestian Sacresant Aveline','Crusaders','Death Cult Assassins','Repressor'])expect(names).not.toContain(name);
 for(const name of ['Dialogus','Dogmata','Hospitaller','Imagifier'])expect(SORORITAS_SHEETS.find(s=>s.unit===name)?.attachmentRole).toBe('support');
 expect(SORORITAS_SHEETS.find(s=>s.unit==='Ministorum Priest')?.bodyguards).toEqual(['Arco-flagellants','Battle Sisters Squad','Celestian Insidiants','Dominion Squad','Sanctifiers','Sisters Novitiate Squad']);
 for(const name of ['Canoness','Palatine','Ministorum Priest'])expect(SORORITAS_SHEETS.find(s=>s.unit===name)?.bodyguards).not.toContain('Repentia Squad');
 expect(SORORITAS_REVISION).toMatchObject({packVersion:'1.4',manual:'1.6',exportUpdated:'2026-11-23 01:43:36'});
 expect(SORORITAS_REVISION.pack).toContain('14-10');
});

it('keeps the Canoness relic permissions linked to her actual pistol and melee weapon',()=>{
 const c=squad('Canoness'),choices=sororitasLoadout(c.unit)!.slots[0].choices;
 expect(choices).toHaveLength(21);
 for(const choice of choices){
  const items=choice.items.map(i=>i.toLowerCase());
  if(items.includes('null rod')||items.includes('brazier of holy fire'))expect(items).toContain('hallowed chainsword');
  if(items.includes('rod of office'))expect(items).toEqual(expect.arrayContaining(['plasma pistol','power weapon']));
  expect(items.includes('null rod')&&items.includes('brazier of holy fire')).toBe(false);
 }
 expect(count(equip(c,'',['Plasma pistol','Power weapon','Rod of Office']),'Rod of office')).toBe(1);
 expect(()=>equip(c,'',['Blessed blade','Bolt pistol','Null rod'])).toThrow();
 expect(()=>equip(c,'',['Inferno pistol','Power weapon','Rod of Office'])).toThrow();
});

it('permits two Battle Sister specialists but only one heavy gun and a separate locked-boltgun Simulacrum bearer',()=>{
 let team=squad('Battle Sisters Squad',10);
 team=equip(team,'Battle Sister 1 ·',['Multi-melta']);
 team=equip(team,'Battle Sister 2 ·',['Meltagun']);
 expect(count(team,'Multi-melta')).toBe(1);expect(count(team,'Meltagun')).toBe(1);expect(cost(team)).toBe(0);
 expect(()=>equip(team,'Battle Sister 3 ·',['Ministorum flamer'])).toThrow();
 expect(()=>equip(team,'Battle Sister 2 ·',['Heavy bolter'])).toThrow();
 team=equip(team,'Battle Sister 3 ·',['Boltgun','Simulacrum imperialis']);
 expect(()=>equip(team,'Battle Sister 4 ·',['Boltgun','Simulacrum imperialis'])).toThrow();
 expect(()=>equip(team,'Battle Sister 3 ·',['Multi-melta','Simulacrum imperialis'])).toThrow();
 let double=squad('Battle Sisters Squad',10);
 double=equip(double,'Battle Sister 1 ·',['Meltagun']);double=equip(double,'Battle Sister 2 ·',['Meltagun']);
 expect(count(double,'Meltagun')).toBe(2);
});

it('enforces the complete Insidiant specialist limits without putting removed weapons back on those models',()=>{
 let s=squad('Celestian Insidiants',10);
 for(let i=1;i<=2;i++)s=equip(s,'Celestian Insidiant '+i+' ·',['Blessed sword']);
 expect(()=>equip(s,'Celestian Insidiant 3 ·',['Blessed sword'])).toThrow();
 s=equip(s,'Celestian Insidiant 3 ·',['Ministorum hand flamer','Null mace']);s=equip(s,'Celestian Insidiant 4 ·',['Ministorum hand flamer','Null mace']);
 expect(()=>equip(s,'Celestian Insidiant 5 ·',['Ministorum hand flamer','Null mace'])).toThrow();
 for(const [owner,items] of [[5,['Virge of admonition']],[6,['Denuncia oratory','Null mace']],[7,['Condemnor bolt pistol','Null mace','Simulacrum imperialis']]] as const){
  s=equip(s,'Celestian Insidiant '+owner+' ·',[...items]);
  expect(()=>equip(s,'Celestian Insidiant 8 ·',[...items])).toThrow();
 }
 expect(count(s,'Null mace')).toBe(7);expect(count(s,'Condemnor bolt pistol')).toBe(4);
 expect(sororitasModelLoadouts(s).filter(m=>m.items.includes('Blessed sword')).every(m=>m.items.length===1)).toBe(true);
});

it('keeps Sanctifier Missionaries distinct and restricts the two optional ordinary specialists',()=>{
 let s=squad('Sanctifiers',9);
 expect(count(s,'Plasma gun')).toBe(1);expect(count(s,'Ministorum flamer')).toBe(1);expect(count(s,'Holy fire')).toBe(1);
 s=equip(s,'Missionary gunner ·',['Holy fire','Plasma gun','Sanctifier melee weapon']);
 expect(count(s,'Holy fire')).toBe(2);
 expect(()=>equip(s,'Missionary gunner ·',['Holy fire','Meltagun','Sanctifier melee weapon'])).toThrow();
 expect(()=>equip(s,'Missionary with Ministorum flamer ·',['Meltagun','Sanctifier melee weapon'])).toThrow();
 s=equip(s,'Missionary gunner ·',['Meltagun','Sanctifier melee weapon']);
 expect(count(s,'Holy fire')).toBe(1);expect(count(s,'Plasma gun')).toBe(0);expect(count(s,'Ministorum flamer')).toBe(1);
 s=equip(s,'Sanctifier 1 ·',['Ministorum hand flamer','Ministorum hand flamer','Close combat weapon']);
 s=equip(s,'Sanctifier 2 ·',['Ministorum hand flamer','Simulacrum imperialis','Close combat weapon']);
 expect(count(s,'Ministorum hand flamer')).toBe(5);expect(count(s,'Sanctifier melee weapon')).toBe(4);
 expect(()=>equip(s,'Sanctifier 3 ·',['Ministorum hand flamer','Ministorum hand flamer','Close combat weapon'])).toThrow();
 expect(()=>equip(s,'Sanctifier 3 ·',['Ministorum hand flamer','Simulacrum imperialis','Close combat weapon'])).toThrow();
});

it('enforces paired Seraphim pistols per five models and removes excess specialists on resize',()=>{
 let s=squad('Seraphim Squad',10);
 for(let i=1;i<=4;i++)s=equip(s,'Seraphim '+i+' ·',i%2?['Inferno pistol','Inferno pistol']:['Ministorum hand flamer','Ministorum hand flamer']);
 expect(count(s,'Inferno pistol')).toBe(4);expect(count(s,'Ministorum hand flamer')).toBe(4);
 expect(()=>equip(s,'Seraphim 5 ·',['Inferno pistol','Inferno pistol'])).toThrow();
 expect(()=>equip(s,'Seraphim 1 ·',['Inferno pistol','Ministorum hand flamer'])).toThrow();
 const small={...s,models:5,knightGear:resizeSororitasGear(s,5)};
 expect(validSororitasGear(small.unit,small.knightGear??{},5)).toBe(true);
 expect(count(small,'Inferno pistol')+count(small,'Ministorum hand flamer')).toBe(4);
});

it('limits Novitiate banners and flamers, keeps melee exchanges complete, and permits one Mortifier sarcophagus',()=>{
 let s=squad('Sisters Novitiate Squad',10);
 for(const [owner,item] of [[1,'Sacred banner'],[2,'Simulacrum imperialis'],[3,'Ministorum flamer'],[4,'Ministorum flamer']] as const)s=equip(s,'Sister Novitiate '+owner+' ·',['Autopistol','Close combat weapon',item]);
 for(const item of ['Sacred banner','Simulacrum imperialis','Ministorum flamer'])expect(()=>equip(s,'Sister Novitiate 5 ·',['Autopistol','Close combat weapon',item])).toThrow();
 s=equip(s,'Sister Novitiate 5 ·',['Autopistol','Novitiate melee weapons']);
 expect(count(s,'Autogun')).toBe(4);expect(count(s,'Close combat weapon')).toBe(9);
 let engines=equip(squad('Mortifiers',2),'Mortifier 1 ·',['Anchorite sarcophagus']);
 expect(()=>equip(engines,'Mortifier 2 ·',['Anchorite sarcophagus'])).toThrow();
 engines=equip(engines,'Mortifier 1 ·',['Heavy bolter','Mortifier flamer']);engines=equip(engines,'Mortifier 2 ·',['Mortifier flamer','Mortifier flamer']);
 expect(count(engines,'Heavy bolter')).toBe(1);expect(count(engines,'Mortifier flamer')).toBe(3);
});

it('prices the four paid weapon families from actual bearers and preserves later-copy tiers',()=>{
 let dominions=squad('Dominion Squad',10);
 for(let i=1;i<=4;i++)dominions=equip(dominions,'Dominion '+i+' ·',['Meltagun']);
 expect(cost(dominions)).toBe(20);expect(()=>equip(dominions,'Dominion 5 ·',['Meltagun'])).toThrow();
 let paragons=squad('Paragon Warsuits',3);
 for(const role of ['Paragon Superior ·','Paragon 1 ·','Paragon 2 ·'])paragons=equip(paragons,role,['Multi-melta']);
 expect(cost(paragons)).toBe(30);
 let retributors=squad('Retributor Squad',5);
 for(let i=1;i<=4;i++)retributors=equip(retributors,'Retributor '+i+' ·',['Multi-melta']);
 expect(cost(retributors)).toBe(20);
 expect(cost(equip(squad('Immolator'),'',['Twin multi-melta']))).toBe(15);
 expect(SORORITAS_SHEETS.filter(s=>s.wargearPoints)).toHaveLength(4);
 expect(SORORITAS_SHEETS.find(s=>s.unit==='Castigator')?.laterCopyPointsBySize).toEqual({3:{1:185}});
 expect(SORORITAS_SHEETS.find(s=>s.unit==='Hospitaller')?.laterCopyPointsBySize).toEqual({2:{1:75}});
 expect(SORORITAS_SHEETS.find(s=>s.unit==='Immolator')?.laterCopyPointsBySize).toEqual({4:{1:115}});
 expect(SORORITAS_SHEETS.find(s=>s.unit==='Sororitas Rhino')?.laterCopyPointsBySize).toEqual({4:{1:75}});
});

it('retains paired Intranzia guns and both phases of a single Ardent Blade or vindictor',()=>{
 const fraye=squad('Intranzia Fraye');expect(count(fraye,'Heavy bolter')).toBe(2);expect(count(fraye,'Ministorum heavy flamer')).toBe(2);
 for(const [unit,weapon] of [['Saint Celestine','The Ardent Blade'],['Ministorum Priest','Zealot’s vindictor']]){
  expect(count(squad(unit),weapon)).toBe(1);
  const profiles=SORORITAS_CARDS[unit].weapons.filter(w=>w.name===weapon);
  expect(profiles.map(w=>w.phase).sort()).toEqual(['Fight','Shooting']);expect(profiles.every(w=>!w.mode)).toBe(true);
 }
 expect(sororitasHasRangedWeapon(squad('Canoness with Jump Pack'))).toBe(false);
 expect(sororitasHasRangedWeapon(equip(squad('Canoness with Jump Pack'),'',['Ministorum hand flamer','Power weapon']))).toBe(true);
 for(const card of Object.values(SORORITAS_CARDS))for(const weapon of card.weapons){expect(weapon.range).toBeTruthy();expect(weapon.attacks).toBeTruthy();expect(weapon.skill).toBeTruthy();expect(weapon.damage).toBeTruthy();}
 expect(SORORITAS_CARDS['Triumph Of Saint Katherine']).toMatchObject({damage:null,specialDamage:{threshold:6,halveWeaponAttacks:true,maxRelics:1}});
});

it('keeps Celestine’s Character scope off the Geminae and adds Catechism only to a legal native bearer',()=>{
 const a=newSelection('Adepta Sororitas'),saint=squad('Saint Celestine');
 expect(sororitasKeywords(a,saint,'Celestine')).toContain('CHARACTER');
 expect(sororitasKeywords(a,saint,'Geminae Superia')).not.toContain('CHARACTER');
 expect(sororitasKeywords(a,saint,'Geminae Superia')).not.toContain('EPIC HERO');
 const c=squad('Canoness'),enhanced={...a,detachments2026:['Penitent Host'],upgrades2026:{[c.id]:'Catechism of Divine Penitence'}};
 expect(sororitasKeywords(enhanced,c)).toContain('PENITENT');
 const jump=squad('Canoness with Jump Pack');
 expect(sororitasKeywords({...enhanced,upgrades2026:{[jump.id]:'Catechism of Divine Penitence'}},jump)).toContain('PENITENT');
 expect(sororitasKeywords({...enhanced,detachments2026:['Hallowed Martyrs']},c)).not.toContain('PENITENT');
 const ally=squad('Ministorum Priest (Assigned Agent)');
 expect(sororitasKeywords({...enhanced,upgrades2026:{[ally.id]:'Catechism of Divine Penitence'}},ally)).not.toContain('PENITENT');
});
