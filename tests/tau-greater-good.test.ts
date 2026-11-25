// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {TAU_SHEETS,TAU_GREATER_GOOD_UNITS} from '../src/tau-data.generated';
import {tauGreaterGoodFormations,tauObserverFormations,tauGuidedFormations,tauMarkerlightFormations,tauGreaterGoodReminders} from '../src/tau-greater-good';
import {tauLoadout,validTauGear,tauModelLoadouts} from '../src/tau-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const id=(name:string)=>name+'#1';
function army(names:string[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:TAU_SHEETS.find(s=>s.unit===unit)?.sizes[0]??1});}
 return {...newSelection('T’au Empire'),units,instances};
}
function equip(a:ArmySelection,unit:string,items:string[]){
 const s=a.instances!.find(s=>s.id===id(unit))!,key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
 const slot=tauLoadout(unit,s.models)!.slots.find(f=>f.choices.some(c=>key(c.items)===key(items)));
 if(!slot)throw Error('No legal equipment '+unit+' / '+items.join(', '));
 const knightGear={...s.knightGear,[slot.name]:slot.choices.find(c=>key(c.items)===key(items))!.name};expect(validTauGear(unit,knightGear,s.models)).toBe(true);
 return {...a,instances:a.instances!.map(x=>x.id===s.id?{...x,knightGear}:x)};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const rootIds=(groups:ReturnType<typeof tauGreaterGoodFormations>)=>groups.map(g=>g.root.id);

it('has exactly the current30 native army-rule recipients, excluding Kroot, Vespid and all Tidewalls',()=>{
 const a=army(TAU_SHEETS.map(s=>s.unit)),groups=tauGreaterGoodFormations(a);
 expect(groups).toHaveLength(30);expect(groups.map(g=>g.root.unit).sort()).toEqual([...TAU_GREATER_GOOD_UNITS].sort());
 for(const name of ['Kroot Carnivores','Krootox Riders','Kroot Farstalkers','Vespid Stingwings','Tidewall Shieldline','Tidewall Gunrig','Tidewall Droneport'])expect(rootIds(groups)).not.toContain(id(name));
 expect(rootIds(groups)).toContain(id('Ethereal'));expect(rootIds(groups)).toContain(id('Manta'));
});
it('allows a gunless Ethereal to Observe and gives Guided attack eligibility only when actually armed',()=>{
 let a=army(['Ethereal','Crisis Sunforge Battlesuits']);
 expect(rootIds(tauObserverFormations(a))).toContain(id('Ethereal'));expect(rootIds(tauGuidedFormations(a))).not.toContain(id('Ethereal'));
 a=equip(a,'Ethereal',['Gun drone','Twin pulse carbine']);
 expect(rootIds(tauGuidedFormations(a))).toContain(id('Ethereal'));expect(tauModelLoadouts(a.instances![0])).toHaveLength(1);
 const row=tauGreaterGoodReminders(a).find(r=>r.timing==='start')!;expect(row.summary).toContain('gunless Ethereal');
});
it('selects Observers at the start of the phase and marks visible targets before those Observers shoot',()=>{
 const rows=tauGreaterGoodReminders(army(['Strike Team','Pathfinder Team','Crisis Fireknife Battlesuits']));
 const choose=rows.find(r=>r.title.endsWith('Select Observers'))!,spot=rows.find(r=>r.title.endsWith('Mark Spotted targets'))!;
 expect(choose).toMatchObject({window:'Shooting',turn:'own',timing:'start'});
 expect(choose.summary).toContain('cannot also be a Guided unit');
 expect(spot.summary).toContain('has not been selected to shoot');expect(spot.summary).toContain('neither Battle-shocked nor a Fortification');expect(spot.summary).toContain('one visible enemy');expect(spot.summary).toContain('marked only once per phase');expect(spot.summary).toContain('may shoot after');expect(spot.summary).toContain('no one-to-one pairing');
});
it('limits Guided bonuses to Spotted targets without old split-fire penalties or out-of-phase carryover',()=>{
 const rows=tauGreaterGoodReminders(army(['Strike Team','Crisis Fireknife Battlesuits'])),row=rows.find(r=>r.title.endsWith('Guided attacks'))!;
 expect(row.summary).toContain('Ballistic Skill');expect(row.summary).toContain('Ignores Cover');expect(row.summary).toContain('one or more Spotted');expect(row.summary).toContain('no Ballistic Skill penalty');expect(row.summary).toContain('do not apply to Overwatch');
 expect(rows.every(r=>r.window==='Shooting'&&r.turn==='own')).toBe(true);
});
it('uses one actual attached formation and leaves a duplicate unjoined squad separate',()=>{
 const a=join(army(['Strike Team','Strike Team','Cadre Fireblade']),'Cadre Fireblade','Strike Team'),groups=tauGreaterGoodFormations(a);
 expect(rootIds(groups)).toEqual([id('Strike Team'),'Strike Team#2']);
 expect(groups[0].members.map(s=>s.id)).toEqual([id('Strike Team'),id('Cadre Fireblade')]);expect(groups[1].members.map(s=>s.id)).toEqual(['Strike Team#2']);
});
it('gets Markerlight from the real drone bearer and expires that grant in a surviving-bodyguard snapshot',()=>{
 let a=join(army(['Crisis Sunforge Battlesuits','Crisis Sunforge Battlesuits','Commander In Coldstar Battlesuit']),'Commander In Coldstar Battlesuit','Crisis Sunforge Battlesuits');
 expect(tauMarkerlightFormations(a)).toEqual([]);
 a=equip(a,'Commander In Coldstar Battlesuit',['Marker drone']);
 const groups=tauMarkerlightFormations(a);expect(rootIds(groups)).toEqual([id('Crisis Sunforge Battlesuits')]);
 expect(groups[0].members.map(s=>s.id)).toContain(id('Commander In Coldstar Battlesuit'));
 const active=a.instances!.filter(s=>s.unit!=='Commander In Coldstar Battlesuit');expect(tauMarkerlightFormations(a,active)).toEqual([]);expect(tauGuidedFormations(a,active)).toHaveLength(2);
});
it('does not give a Kroot unit an army rule through an illegal Ethereal attachment or invent separate Drone Observers',()=>{
 const a=join(equip(army(['Kroot Carnivores','Ethereal']),'Ethereal',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine']),'Ethereal','Kroot Carnivores');
 const groups=tauGreaterGoodFormations(a);expect(groups).toHaveLength(1);expect(groups[0].members.map(s=>s.id)).toEqual([id('Ethereal')]);expect(tauGreaterGoodReminders({...a,faction:'Necrons'})).toEqual([]);
 const ids=tauGreaterGoodReminders(a).map(r=>r.id);expect(new Set(ids).size).toBe(ids.length);
});
