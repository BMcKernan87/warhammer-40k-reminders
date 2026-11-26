// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {MECHANICUS_SHEETS,MECHANICUS_DOCTRINA_UNITS} from '../src/mechanicus-data.generated';
import {MECHANICUS_ARMY_SHEETS} from '../src/mechanicus-army-data';
import {mechanicusDoctrinaFormations,mechanicusDoctrinaReminders} from '../src/mechanicus-doctrinas';
import type {RosterInstance} from '../src/roster-instances';

const id=(unit:string)=>unit+'#1';
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:MECHANICUS_ARMY_SHEETS.find(s=>s.unit===unit)?.sizes[0]??1});}
 return {...newSelection('Adeptus Mechanicus'),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const get=(a:ArmySelection,title:string)=>mechanicusDoctrinaReminders(a).filter(r=>r.title===title);

it('selects one round-long imperative for precisely all 34 current native recipients',()=>{
 const a=army(MECHANICUS_SHEETS.map(s=>s.unit));
 expect(new Set(MECHANICUS_DOCTRINA_UNITS)).toEqual(new Set(MECHANICUS_SHEETS.map(s=>s.unit)));
 const choice=get(a,'Doctrina Imperatives · Select an imperative');
 expect(choice).toHaveLength(1);expect(choice[0]).toMatchObject({window:'Start of battle round',turn:'either',timing:'start'});
 expect(choice[0].units).toHaveLength(34);expect(choice[0].summary).toContain('until the round ends');expect(choice[0].source).toContain('14-10');
});
it('shares a native source only with its actual attached ally and expires that source after its last native model',()=>{
 let a=army(['Skitarii Rangers','Skitarii Rangers','Inquisitor','Callidus Assassin']);a=join(a,'Inquisitor','Skitarii Rangers');
 const forms=mechanicusDoctrinaFormations(a);expect(forms).toHaveLength(2);
 expect(forms.find(f=>f.root.id===id('Skitarii Rangers'))!.members.map(s=>s.id)).toEqual([id('Skitarii Rangers'),id('Inquisitor')]);
 const choice=get(a,'Doctrina Imperatives · Select an imperative')[0];
 expect(choice.units).toContain(id('Inquisitor'));expect(choice.units).not.toContain(id('Callidus Assassin'));expect(choice.summary).toContain('last source dies');expect(choice.summary).toContain('until the attacking unit finishes');
 expect(mechanicusDoctrinaReminders(army(['Inquisitor','Callidus Assassin']))).toEqual([]);
});
it('keeps Protector Ballistic Skill separate from own-Shooting Heavy and ignores both in snap shooting',()=>{
 const a=army(['Skitarii Rangers']);
 expect(get(a,'Protector Imperative')).toEqual([expect.objectContaining({window:'Shooting',turn:'own',summary:expect.stringContaining('no model moved more than 3″')})]);
 const snap=get(a,'Doctrina Imperatives · Overwatch')[0];expect(snap).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
 expect(snap.summary).toContain('Ballistic Skill and Heavy bonuses do not change snap shooting');expect(snap.summary).toContain('cannot re-roll Hit rolls or score Critical Hits');
 expect(get(a,'Protector Imperative · Melee defence')[0]).toMatchObject({window:'Fight',turn:'either'});
});
it('emits Conqueror AP during snap shots while preserving Battleline and Cawl conditions',()=>{
 const a=army(['Kataphron Breachers','Belisarius Cawl']);
 const snap=get(a,'Doctrina Imperatives · Overwatch')[0];expect(snap.summary).toContain('improve these snap shots’ AP by 1');
 expect(snap.summary).toContain('within 6″');expect(snap.summary).toContain('Cawl counts as Battleline only while his Mantra');
 const fight=get(a,'Conqueror Imperative').find(r=>r.window==='Fight')!;expect(fight.summary).toContain('Weapon Skill');
});
it('prints only legal normal reaction doctrinas and does not fabricate a reaction for an isolated source',()=>{
 expect(get(army(['Skitarii Rangers']),'Doctrina Imperatives · Reaction shooting')).toEqual([]);
 const a=army(['Skitarii Rangers','Sydonian Skatros','Onager Dunecrawler'],['Eradication Cohort']);
 const row=get(a,'Doctrina Imperatives · Reaction shooting')[0];expect(row.units).toEqual([id('Skitarii Rangers')]);
 expect(row.summary).toContain('normal reaction');expect(row.summary).toContain('Heavy does not add a Hit bonus outside');
});
it('omits ranged-only imperatives for gunless Electro-priests while retaining their melee rule',()=>{
 const a=army(['Fulgurite Electro-priests']);
 expect(get(a,'Protector Imperative')).toEqual([]);expect(get(a,'Doctrina Imperatives · Overwatch')).toEqual([]);
 expect(get(a,'Conqueror Imperative')).toHaveLength(1);expect(get(a,'Conqueror Imperative')[0].window).toBe('Fight');
 expect(get(a,'Conqueror Imperative · Assault')).toEqual([]);
});
it('retains current assault-shooting restrictions and never emits Mechanicus rules for another faction',()=>{
 const a=army(['Skitarii Rangers']);
 expect(get(a,'Conqueror Imperative').find(r=>r.window==='Shooting')!.summary).toContain('cannot then start an action this phase');
 expect(mechanicusDoctrinaReminders({...a,faction:'Necrons'})).toEqual([]);
 const rows=mechanicusDoctrinaReminders(a);expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
});
