import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {setKnightGear} from '../src/knight-loadouts';
import {orkCargoFits,orkCargoGroups,orkMusterFindings,orkTransportCapacity} from '../src/ork-muster';
import {eligibleOrkPassengers} from '../src/ork-transports';
import {generate11thReminders} from '../src/reminders-11th';
import {expandRoster,individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';

const build=(units:string[],det='War Horde')=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),{...newSelection('Orks'),detachments2026:[det]} as ArmySelection));
const id=(unit:string)=>unit+'#1';
const lead=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));

it('counts actual Gretchin models at half space, including a legal two-character unit in a Trukk',()=>{
 let a=build(['Trukk','Gretchin','Zodgrod Wortsnagga','Runtherd','Bannernob'],'Runt Swarm');
 a=setInstanceModelCount(lead(lead(a,'Zodgrod Wortsnagga','Gretchin'),'Runtherd','Gretchin'),id('Gretchin'),20);
 const trukk=expandRoster(a)[0],groups=orkCargoGroups(a,trukk);
 expect(groups.map(g=>[g.root.id,g.spaces])).toEqual([[id('Gretchin'),12]]);
 expect(eligibleOrkPassengers(a,trukk).map(s=>s.id)).toEqual([id('Gretchin')]);
 expect(orkMusterFindings(a).some(f=>f.code==='dedicated-transport-passengers')).toBe(false);
 expect(orkCargoFits(a,trukk,[id('Gretchin'),id('Runtherd')])).toBe(false);
 const cues=generate11thReminders({...a,upgrades2026:{[id('Gretchin')]:'Minefield Detail'}});
 const cargo=cues.find(r=>r.title==='Trukk#1 · starting passengers');
 expect(cargo?.summary).toContain('Gretchin#1 + Zodgrod Wortsnagga#1 + Runtherd#1 (12)');
 expect(cues.some(r=>r.title.includes('Trukk#1')&&r.title.includes('Scout'))).toBe(false);
});

it('uses publisher Squiggoth seats and scarce cargo space when combining otherwise eligible groups',()=>{
 let a=build(['Gargantuan Squiggoth','Ghazghkull Thraka','Meganobz','Gretchin','Zodgrod Wortsnagga']);
 a=lead(a,'Zodgrod Wortsnagga','Gretchin');
 const [squiggoth]=expandRoster(a);
 expect(orkCargoGroups(a,squiggoth).map(g=>[g.root.unit,g.spaces])).toEqual([['Ghazghkull Thraka',18],['Meganobz',4],['Gretchin',6]]);
 expect(orkCargoFits(a,squiggoth,[id('Ghazghkull Thraka'),id('Meganobz')])).toBe(false);
 expect(orkCargoFits(a,squiggoth,[id('Meganobz'),id('Gretchin')])).toBe(true);
 a=setKnightGear(a,squiggoth.id,'Gun','Supa-kannon');
 const [armed]=expandRoster(a);
 expect(orkTransportCapacity(armed)).toBe(15);
 const cue=generate11thReminders(a).find(r=>r.title==='Gargantuan Squiggoth#1 · starting passengers');
 expect(cue?.source).toMatch(/warhammer-community.+#page=23/);
 expect(cue?.units).toEqual([armed.id,id('Meganobz'),id('Gretchin')]);
});

it('distinguishes compulsory Aircraft reserves, Flyboyz exemptions and cargo for a Fortification',()=>{
 const planes=['Warboss','Wazbom Blastajet','Wazbom Blastajet','Dakkajet','Trukk','Boyz','Big’ed Bossbunka'];
 let army:ArmySelection={...build(planes),battleSize2026:'Incursion'};
 expect(orkMusterFindings(army).map(f=>f.code)).toContain('compulsory-reserves');
 const normal=generate11thReminders(army);
 expect(normal.find(r=>r.title==='Trukk#1 · starting passengers')?.summary).toContain('must deploy on the battlefield');
 expect(normal.find(r=>r.title==='Big’ed Bossbunka#1 · starting passengers')?.summary).not.toContain('Reserves');
 army={...army,detachments2026:['Flyboyz']};
 expect(orkMusterFindings(army).map(f=>f.code)).not.toContain('compulsory-reserves');
 expect(generate11thReminders(army).find(r=>r.title==='Trukk#1 · starting passengers')?.summary).not.toContain('must deploy');
});

it('prints only whole qualifying Beast Snagga formations across a full 2,000-point mixed army',()=>{
 let a=build(['Gargantuan Squiggoth','Ghazghkull Thraka','Hunta Rig','Beastboss','Beast Snagga Boyz','Painboss','Kill Rig','Trukk','Meganobz','Warboss In Mega Armour','Boyz','Gretchin','Zodgrod Wortsnagga'],'Da Big Hunt');
 for(const [leader,body] of [['Beastboss','Beast Snagga Boyz'],['Painboss','Beast Snagga Boyz'],['Warboss In Mega Armour','Meganobz'],['Zodgrod Wortsnagga','Gretchin']])a=lead(a,leader,body);
 a=setInstanceModelCount(setInstanceModelCount(a,id('Meganobz'),6),id('Beast Snagga Boyz'),20);
 expect(rosterCost2026(a).total).toBe(2000);
 expect(orkMusterFindings(a)).toEqual([]);
 const cues=generate11thReminders(a);
 expect(cues.find(r=>r.title==='Hunta Rig#1 · starting passengers')?.summary).toContain('Beast Snagga Boyz#1 + Beastboss#1 + Painboss#1 (22)');
 expect(cues.some(r=>r.title==='Kill Rig#1 · starting passengers')).toBe(false);
 const emergency=cues.find(r=>r.title==='Destroyed transport · emergency disembark'&&r.window==='Fight');
 expect(emergency?.units).toContain(id('Hunta Rig'));
 expect(emergency?.units).not.toContain(id('Kill Rig'));
 expect(cues.find(r=>r.title==='Trukk#1 · starting passengers')?.units).toEqual([id('Trukk'),id('Boyz'),id('Gretchin')]);
});
