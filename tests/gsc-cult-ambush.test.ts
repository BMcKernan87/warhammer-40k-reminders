// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {gscCultAmbushReminders,gscResurgenceCost} from '../src/gsc-cult-ambush';
import type {RosterInstance} from '../src/roster-instances';
const model=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Genestealer Cults'),instances,battleSize2026:'Incursion'});
const rules=(a:ArmySelection)=>gscCultAmbushReminders(a,a.instances!);
it.each([
 ['Aberrants',5,4,10,8],['Acolyte Hybrids With Autopistols',5,2,10,4],
 ['Acolyte Hybrids With Hand Flamers',5,2,10,4],['Hybrid Metamorphs',5,2,10,4],
 ['Atalan Jackals',5,2,10,6],['Purestrain Genestealers',5,2,10,6],['Neophyte Hybrids',10,3,20,6],
] as const)('%s generates its two published Resurgence costs independently of Characters and army points',(unit,n1,c1,n2,c2)=>{
 const a=model(unit,n1),b={...model(unit,n2),id:unit+'#2'};
 const list=rules(army(a,b,{...model(unit==='Aberrants'?'Abominant':'Primus'),attachedTo:b.id}));
 const row=list.find(r=>r.window==='Fight'&&r.title==='Cult Ambush · replaced units')!;
 expect(row.units).toEqual([a.id,b.id]);
 expect(row.summary).toContain(a.id+' ('+c1+' Resurgence points)');
 expect(row.summary).toContain(b.id+' ('+c2+' Resurgence points)');
 expect(row.summary).toMatch(/excluding Characters.*unused One Shot weapons/);
 expect(gscResurgenceCost(model(unit))).toBe(c1);
});
it('discloses the missing printed cost separately for each legal intermediate Jackal size',()=>{
 for(const n of [6,7,8,9]){
  const jackals=model('Atalan Jackals',n);
  expect(gscResurgenceCost(jackals)).toBeUndefined();
  const row=rules(army(jackals)).find(r=>r.window==='Pre-battle')!;
  expect(row.summary).toContain('no published Resurgence cost at '+n+' models');
  expect(row.summary).not.toMatch(/Jackals#1 \(6 Resurgence/);
 }
});
it('counts only a legitimate Xenocreed Deeds bearer once when calculating starting Resurgence',()=>{
 const units=army(model('Primus'),model('Neophyte Hybrids'));
 units.upgrades2026={'Primus#1':'Deeds That Speak to the Masses'};
 const budget=(a:ArmySelection)=>rules(a).find(r=>r.window==='Pre-battle')?.summary;
 expect(budget(units)).toContain('6 Resurgence points');
 expect(budget({...units,detachments2026:['Xenocreed Congregation']})).toContain('8 Resurgence points');
 expect(budget({...units,detachments2026:['Xenocreed Congregation'],battleSize2026:'Strike Force'})).toContain('12 Resurgence points');
 expect(budget({...units,detachments2026:['Xenocreed Congregation'],upgrades2026:{'Neophyte Hybrids#1':'Deeds That Speak to the Masses'}})).toContain('6 Resurgence points');
});
it('applies the 32 mm marker, enemy denial, subsequent turn, round-one ingress and round-three exemption on the correct turns',()=>{
 const a=army(model('Atalan Jackals'),model('Neophyte Hybrids'));
 const rows=rules(a);
 const entry=rows.find(r=>r.title==='Cult Ambush · arrive at a marker')!;
 expect(entry).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
 expect(entry.summary).toMatch(/round one.*one model in base contact.*wholly within 3″.*reserve-denial/);
 expect(rows.find(r=>r.title==='Cult Ambush · reserve arrival')).toMatchObject({turn:'own',summary:expect.stringMatching(/subsequent turn.*Rapid Ingress cannot.*Jackals still need a marker/)});
 expect(rows.find(r=>r.title==='Cult Ambush · threatened markers')!.summary).toMatch(/other than an Aircraft.*within 8″.*Unused markers remain/);
 expect(rows.find(r=>r.window==='End of battle round')).toBeDefined();
 expect(rules(army(model('Magus'),model('Goliath Truck')))).toEqual([]);
 expect(rules({...a,faction:'Tyranids'})).toEqual([]);
});

it('offers marker ingress to a qualifying Brood Brothers Regiment through Regimental Reinforcements without granting Cult Ambush or Resurgence prices to its allies',()=>{
 const guards=model('Cadian Shock Troops'),tank=model('Rogal Dorn Battle Tank'),artillery=model('Artillery Team');
 const a=army(guards,tank,artillery);
 expect(rules(a)).toHaveLength(0);
 const rows=rules({...a,detachments2026:['Brood Brothers Auxilia']});
 expect(rows.find(r=>r.title==='Cult Ambush · arrive at a marker')?.units).toEqual([guards.id]);
 expect(rows.find(r=>r.title==='Cult Ambush · Resurgence points')).toBeUndefined();
 expect(rows.find(r=>r.title==='Cult Ambush · replaced units')).toBeUndefined();
});
