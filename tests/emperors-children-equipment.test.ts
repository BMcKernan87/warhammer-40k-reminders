// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {EMPERORS_CHILDREN_SHEETS,emperorsChildrenAdditionalBodyguards,emperorsChildrenKeywords,emperorsChildrenMusterUnits} from '../src/emperors-children-data';
import {emperorsChildrenHasRangedWeapon,emperorsChildrenLoadout,emperorsChildrenModelLoadouts,emperorsChildrenWeaponCount} from '../src/emperors-children-loadouts';
import {knightLoadoutFor,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const faction='Emperor’s Children';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const count=emperorsChildrenWeaponCount;
function equip(s:RosterInstance,slot:string,choice:string){
 const army:ArmySelection={...newSelection(faction),instances:[s],units:{[s.unit]:1}};
 return setKnightGear(army,s.id,slot,choice).instances![0];
}
function swap(s:RosterInstance,owner:string,items:string[]){
 const sheet=emperorsChildrenLoadout(s.unit,s.models)!,key=(i:readonly string[])=>[...i].sort().join('|');
 const field=sheet.slots.find(f=>f.name.startsWith(owner)&&f.choices.some(c=>key(items)===key(c.items)));
 if(!field)throw Error('Missing physical selection '+s.unit+'/'+owner+'/'+items.join(', '));
 return equip(s,field.name,field.choices.find(c=>key(items)===key(c.items))!.name);
}
it.each(EMPERORS_CHILDREN_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s binds every legal squad size and every weapon exchange to its actual bearer',(unit,sheet)=>{
 for(const [total,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(unit,+total),kit=knightLoadoutFor(faction,unit,+total)!,equipped=emperorsChildrenModelLoadouts(s);
  expect(equipped).toHaveLength(+total);
  expect(equipped.reduce<Record<string,number>>((r,b)=>({...r,[b.model]:(r[b.model]??0)+1}),{})).toEqual(roles);
  for(const field of kit.slots)for(const choice of field.choices){
   const changed=equip(s,field.name,choice.name),initial=equipped.flatMap(b=>b.items);
   for(const item of field.choices[0].items){const n=initial.indexOf(item);expect(n).toBeGreaterThanOrEqual(0);initial.splice(n,1);}
   expect(emperorsChildrenModelLoadouts(changed).flatMap(b=>b.items).sort()).toEqual([...initial,...choice.items].sort());
   expect(validKnightGear(changed,faction)).toBe(true);
  }
 }
});
it('keeps paired Terminator arms mutually exclusive and enforces squad-wide set limits',()=>{
 let squadron=squad('Chaos Terminators',5);
 squadron=swap(squadron,'Chaos Terminator 1 ·',['Paired accursed weapons']);
 expect(()=>swap(squadron,'Terminator Champion',['Paired accursed weapons'])).toThrow();
 squadron=swap(squadron,'Chaos Terminator 2 ·',['Heavy flamer','Power fist']);
 expect(()=>swap(squadron,'Chaos Terminator 3 ·',['Reaper autocannon','Power fist'])).toThrow();
 squadron=swap(squadron,'Chaos Terminator 3 ·',['Combi-weapon','Power fist']);
 squadron=swap(squadron,'Chaos Terminator 4 ·',['Combi-bolter','Power fist']);
 expect(()=>swap(squadron,'Terminator Champion',['Combi-bolter','Power fist'])).toThrow();
 squadron=swap(squadron,'Terminator Champion',['Combi-bolter','Chainfist']);
 expect(count(squadron,'Combi-bolter')).toBe(2);
 const paired=emperorsChildrenModelLoadouts(squadron).find(b=>b.items.includes('Paired accursed weapons'))!;
 expect(paired.items).toEqual(['Paired accursed weapons']);
});
it('reconciles a single Infractor icon, two independent Tormentor special weapons per five, and shrink',()=>{
 let unit=squad('Infractors',10);
 unit=swap(unit,'Infractor 1 ·',['Icon of Excess']);
 expect(()=>swap(unit,'Infractor 2 ·',['Icon of Excess'])).toThrow();
 let guns=squad('Tormentors',10);
 for(const n of [1,2])guns=swap(guns,'Tormentor '+n+' ·',['Meltagun']);
 for(const n of [3,4])guns=swap(guns,'Tormentor '+n+' ·',['Plasma gun']);
 expect(()=>swap(guns,'Tormentor 5 ·',['Meltagun'])).toThrow();
 guns=swap(guns,'Tormentor 3 ·',['Icon of Excess']);
 const small={...guns,models:5,knightGear:resizeKnightComposition(guns,5,faction)};
 expect(count(small,'Meltagun')).toBe(1);expect(count(small,'Plasma gun – standard')).toBe(1);expect(count(small,'Icon of Excess')).toBe(1);
});
it('counts selected Defiler arms at 15 points each, and detects actual Maulerfiend ranged weapons',()=>{
 const arms=EMPERORS_CHILDREN_SHEETS.find(s=>s.unit==='Defiler')!.wargearPoints!;
 let brute=squad('Defiler');
 expect(count(brute,'Excruciator cannon')).toBe(2);
 brute=swap(brute,'',['Hades lascannon','Heavy reaper autocannon']);
 expect(Object.entries(arms).reduce((sum,[name,price])=>sum+count(brute,name)*price,0)).toBe(30);
 brute=swap(brute,'',['Heavy baleflamer','Heavy missile launcher']);
 expect(Object.entries(arms).reduce((sum,[name,price])=>sum+count(brute,name)*price,0)).toBe(0);
 let mauler=squad('Maulerfiend');
 expect(emperorsChildrenHasRangedWeapon(mauler)).toBe(false);
 mauler=swap(mauler,'',['Magma cutters','Magma cutters']);
 expect(count(mauler,'Magma cutters')).toBe(2);expect(emperorsChildrenHasRangedWeapon(mauler)).toBe(true);
});
it('tracks the Disharmonist, up to two blastmasters, and a Lord Kakophonist’s second pistol',()=>{
 let band=squad('Noise Marines');
 band=swap(band,'Disharmonist',['Power sword','Screamer pistol']);
 band=swap(band,'Noise Marine 1 ·',['Blastmaster']);band=swap(band,'Noise Marine 2 ·',['Blastmaster']);
 expect(()=>swap(band,'Noise Marine 3 ·',['Blastmaster'])).toThrow();
 expect(count(band,'Sonic blaster')).toBe(3);expect(count(band,'Blastmaster – varied frequency')).toBe(2);
 const lord=swap(squad('Lord Kakophonist'),'', ['Close combat weapon','Screamer pistol','Screamer pistol']);
 expect(count(lord,'Screamer pistol')).toBe(2);
});
it('binds Legions of Excess equipment to the Emperor’s Children version and gates every allied datasheet at muster',()=>{
 const a:ArmySelection={...newSelection(faction),battleSize2026:'Strike Force',detachments2026:['Carnival of Excess']};
 const ordinary={...a,detachments2026:['Mercurial Host']},withAllies=emperorsChildrenMusterUnits(a),without=emperorsChildrenMusterUnits(ordinary);
 expect(withAllies.filter(u=>!without.includes(u)).sort()).toEqual(['Daemonettes','Fiends','Keeper of Secrets','Seekers','Shalaxi Helbane']);
 expect(withAllies).toContain('Chaos Warhound Titan');expect(emperorsChildrenMusterUnits({...a,battleSize2026:'Incursion'})).not.toContain('Chaos Warhound Titan');
 expect(withAllies).toContain('War Dog Moirax');expect(withAllies).not.toContain('Knight Crusader');
 let host=squad('Daemonettes');
 const options=emperorsChildrenLoadout(host.unit)!.slots;
 host=equip(host,options[0].name,options[0].choices[1].name);host=equip(host,options[1].name,options[1].choices[2].name);
 expect(()=>equip(host,options[2].name,options[2].choices[1].name)).toThrow();
 expect(count(host,'Daemonic Icon')).toBe(1);expect(count(host,'Instrument of Chaos')).toBe(1);
 expect(emperorsChildrenModelLoadouts(host).some(b=>b.items.includes('Daemonic Icon')&&b.items.includes('Instrument of Chaos'))).toBe(false);
 const keeper=swap(squad('Keeper of Secrets'),'', ['Shining aegis']);
 expect(count(keeper,'Shining aegis')).toBe(1);
 expect(emperorsChildrenKeywords(a,keeper)).toContain('LEGIONS OF EXCESS');
 expect(emperorsChildrenKeywords(a,keeper)).not.toContain('EMPEROR’S CHILDREN');
 const hawk=emperorsChildrenKeywords(a,squad('Heldrake'));expect(hawk.has('AIRCRAFT')).toBe(false);
 expect(emperorsChildrenKeywords(a,squad('Fulgrim'))).toContain('MOBILE');
 const patron=squad('Lord Exultant');
 expect(emperorsChildrenAdditionalBodyguards({...a,detachments2026:['Court of the Phoenician'],upgrades2026:{[patron.id]:'Exalted Patron'}},patron)).toEqual(['Flawless Blades']);
 expect(emperorsChildrenAdditionalBodyguards({...ordinary,upgrades2026:{[patron.id]:'Exalted Patron'}},patron)).toEqual([]);
});
