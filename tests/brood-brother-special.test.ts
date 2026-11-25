import {describe,expect,it} from 'vitest';
import {broodBrotherLoadout} from '../src/astra-militarum-loadouts';
import {broodBrotherSpecialReminders as generate} from '../src/brood-brother-special';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
const guard='Brood Brothers Auxilia',troops='Cadian Shock Troops',krieg='Death Korps Of Krieg',wall='Aegis Defence Line';
const squad=(unit:string,models?:number):RosterInstance=>({id:unit+'#1',unit,models});
function fitted(s:RosterInstance,item:string,count=1):RosterInstance{
 const options=broodBrotherLoadout(s.unit,s.models)!.slots;
 const slots=options.filter(slot=>slot.choices.some(c=>c.items.includes(item))).slice(0,count);
 expect(slots).toHaveLength(count);
 return {...s,knightGear:Object.fromEntries(slots.map(slot=>[slot.name,slot.choices.find(c=>c.items.includes(item))!.name]))};
}
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Genestealer Cults'),detachments2026:[guard],instances});
const cards=(a:ArmySelection,prefix:string)=>generate(a,a.instances!).filter(r=>r.title.startsWith(prefix));
describe('fitted Brood Brothers wargear, Kasrkin and fortifications',()=>{
 it('makes one CP roll per targeted formation when two vox-casters survive, and offers the Officer bonus only with an actual Officer',()=>{
  const plain=army(squad(troops,20));
  expect(cards(plain,'Vox-caster')).toHaveLength(0);
  const two=fitted(squad(troops,20),'Vox-caster',2);
  const without=cards(army(two),'Vox-caster');
  expect(without).toHaveLength(5);
  expect(without[0].summary).toContain('just once');
  expect(without[0].summary).not.toContain('Officer');
  const led=army(two,{...squad('Cadian Command Squad'),attachedTo:two.id});
  const withOfficer=cards(led,'Vox-caster');
  expect(withOfficer[0].summary).toContain('within 6″');
  expect(withOfficer.every(r=>r.units?.join()===two.id)).toBe(true);
  expect(cards(led,'Medi-pack')[0]).toMatchObject({window:'Command',turn:'own',timing:'start',units:[two.id]});
 });
 it('resolves one or two Death Korps medi-packs and returns only named troopers',()=>{
  const raw=squad(krieg,20);
  expect(cards(army(raw),'Death Korps Medi-pack')).toHaveLength(0);
  const one=cards(army(fitted(raw,'Death Korps Medi-pack')),'Death Korps Medi-pack');
  expect(one[0].summary).toContain('D3 destroyed Death Korps Troopers');
  expect(one[0].summary).not.toContain('D3+1');
  const two=cards(army(fitted(raw,'Death Korps Medi-pack',2)),'Death Korps Medi-pack');
  expect(two).toHaveLength(1);
  expect(two[0]).toMatchObject({timing:'start',turn:'own',window:'Command'});
  expect(two[0].summary).toContain('D3+1');
 });
 it('selects Kasrkin’s own Order without enabling Officer-issued Orders or multiplying the once-per-round allowance',()=>{
  const a=army(squad('Kasrkin'),squad('Cadian Command Squad'));
  const elite=cards(a,'Warrior Elite');
  expect(elite.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
  for(const r of elite){
   expect(r).toMatchObject({turn:'either',timing:'start',units:['Kasrkin#1']});
   expect(r.summary).toContain('Once per battle round');
   expect(r.summary).toContain('Rapid Fire');
   expect(r.summary).toContain('maximum of 3+');
  }
  expect(cards(a,'Master Vox')).toHaveLength(0);
  const mine=fitted(squad('Kasrkin'),'Melta Mine');
  expect(cards(army(mine),'Melta Mine')).toHaveLength(5);
  expect(cards(army(mine),'Melta Mine')[0].summary).toContain('2D3 against a Vehicle');
  expect(cards(a,'Melta Mine')).toHaveLength(0);
 });
 it('allocates the selected remote mine and the Krieg command squad’s fixed counteragents to the correct bodies',()=>{
  const engineer=fitted(squad('Krieg Combat Engineers'),'Remote Mine');
  const a=army(engineer,squad('Krieg Command Squad'),squad('Neophyte Hybrids'));
  const mine=cards(a,'Remote Mine')[0];
  expect(mine).toMatchObject({units:[engineer.id],window:'Shooting',turn:'own',timing:'start'});
  expect(mine.summary).toContain('within 9″ of the mine bearer');
  expect(cards(a,'Alchemyk Counteragents').every(r=>r.units?.join()==='Krieg Command Squad#1'&&r.summary.includes('mortal wounds'))).toBe(true);
  expect(cards(a,'Regimental Standard')[0].units).toEqual(['Krieg Command Squad#1']);
  expect(cards(a,'Servo-scribes')).toHaveLength(0);
 });
 it('distinguishes the platform and 4+ save for Guard Infantry from general intervening cover and Fortification-only engagement',()=>{
  const a=army(squad(wall),squad('Neophyte Hybrids'),squad(troops),squad('Leman Russ Battle Tank'));
  expect(cards(a,'Emplacement Platform').map(r=>r.units)).toEqual(Array(4).fill([troops+'#1']));
  expect(cards(a,'Defence Line')[0]).toMatchObject({window:'Shooting',units:[troops+'#1']});
  expect(cards(a,'Reinforced Cover')[0]).toMatchObject({turn:'either',units:[wall+'#1']});
  expect(cards(a,'Fortification · shooting')[0].summary).toContain('unless made with a Pistol');
  expect(cards(a,'Fortification · Fall Back')[0].summary).toContain('moving over enemy models still test');
  expect(generate({...a,detachments2026:['Final Day']},a.instances!)).toEqual([]);
 });
});
