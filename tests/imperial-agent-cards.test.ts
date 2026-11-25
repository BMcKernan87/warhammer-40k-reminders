// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {assignedAgentFindings,assignedAgentReminders} from '../src/knight-assigned-agents';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {initialStore,validateStore} from '../src/profiles';
import {NATIVE_AGENT_SHEETS} from '../src/assigned-agent-data';

function native(units:Record<string,number>):ArmySelection{return individualArmy({...newSelection('Imperial Agents'),units});}
function title(army:ArmySelection,name:string){return assignedAgentReminders(army).filter(r=>r.title.endsWith(' · '+name));}
const incursion={'Inquisitor Coteaz':1,'Grey Knights Terminator Squad':1,'Rogue Trader Entourage':1,'Imperial Navy Breachers':1,'Sanctifiers':1,'Ministorum Priest':1,'Sisters of Battle Squad':1,'Imperial Rhino':1,'Deathwatch Kill Team':1,'Watch Captain Artemis':1,'Culexus Assassin':1};

it.each(['Incursion','Strike Force'] as const)('generates a full %s roster with ally formation and bearer boundaries',size=>{
 const larger=size==='Strike Force'?{'Inquisitor':1,'Exaction Squad':2,'Subductor Squad':2,'Imperial Navy Breachers':3,'Ministorum Priest':3,'Inquisitor Draxus':1,'Sanctifiers':3,'Inquisitorial Chimera':1}:{};
 let army:ArmySelection={...native({...incursion,...larger} as Record<string,number>),battleSize2026:size,warlordId:'Inquisitor Coteaz#1'};
 army=setInstanceAttachment(army,'Inquisitor Coteaz#1','Grey Knights Terminator Squad#1');
 army=setInstanceAttachment(army,'Watch Captain Artemis#1','Deathwatch Kill Team#1');
 army=setInstanceAttachment(army,'Rogue Trader Entourage#1','Imperial Navy Breachers#1');
 for(let i=1;i<=army.units['Ministorum Priest'];i++)army=setInstanceAttachment(army,'Ministorum Priest#'+i,'Sanctifiers#'+i);
 army=setKnightGear(army,'Grey Knights Terminator Squad#1','Heavy gunner','Psycannon');
 expect(rosterCost2026(army).total).toBe(size==='Incursion'?1000:2000);
 expect(title(army,'Malefic Wardings').map(r=>r.units)).toEqual(Array(3).fill(['Grey Knights Terminator Squad#1','Inquisitor Coteaz#1']));
 expect(title(army,'Rites of Teleportation').map(r=>r.window).sort()).toEqual(['Movement','Pre-battle']);
 expect(title(army,'Ministorum Sermon')).toHaveLength(army.units['Sanctifiers']);
 expect(title(army,'Endurant Shield')[0].units).toEqual(['Imperial Navy Breachers#1']);
 expect(title(army,'Narthecium')).toHaveLength(0);
 expect(assignedAgentFindings(army)).toEqual([]);
 expect(new Set(assignedAgentReminders(army).map(r=>r.id)).size).toBe(assignedAgentReminders(army).length);
 expect(validateStore(JSON.parse(JSON.stringify(initialStore(army))))).toBe(true);
});

it('prices native and allied troops including fourth-copy and equipped weapon costs',()=>{
 const units={'Sisters of Battle Immolator':4};
 const a=native(units);
 for(const [faction,expected] of [['Imperial Agents',385],['Imperial Knights',445]] as const){
  const roster=setKnightGear({...a,faction},'Sisters of Battle Immolator#4','Turret','Twin multi-melta');
  expect(rosterCost2026(roster).total).toBe(expected);
  const gun=title(roster,'Ranged weapons').find(r=>r.units?.includes('Sisters of Battle Immolator#4'))!;
  expect(gun.summary).toMatch(/Twin multi-melta.*Melta 2/i);
  expect(gun.summary).not.toMatch(/Immolation flamers|Hunter-killer/);
 }
});
it('applies bodyguard- and loadout-dependent rules only to their actual recipients',()=>{
 let a=native({'Inquisitor':1,'Inquisitorial Agents':1,'Imperial Rhino':1});
 expect(title(a,'Blessed Wardings')).toHaveLength(0);
 a=setInstanceAttachment(a,'Inquisitor#1','Inquisitorial Agents#1');
 expect(title(a,'Blessed Wardings')).toHaveLength(3);
 expect(title(a,'Authority of the Inquisition').map(r=>r.window)).toEqual(['Pre-battle','Movement']);
 expect(title(a,'Loyal Henchmen')[0].units).toEqual(['Inquisitorial Agents#1','Inquisitor#1']);
 const psychic=setKnightGear(a,'Inquisitor#1','Inquisitorial gifts','Psychic gifts + Psychic Shock Wave + Force weapon');
 expect(title(psychic,'Blessed Wardings')).toHaveLength(0);
 expect(title(psychic,'Ranged weapons').find(r=>r.units?.includes('Inquisitor#1'))?.summary).toContain('Psychic Shock Wave');
 expect(title(a,'Ranged weapons').find(r=>r.units?.includes('Inquisitor#1'))?.summary).not.toContain('Psychic Shock Wave');
 let b=native({'Exaction Squad':1,'Subductor Squad':1,'Watch Master':1,'Deathwatch Kill Team':1});
 expect(title(b,'Nuncio Aquila')).toHaveLength(0);
 b=setKnightGear(b,'Exaction Squad#1','Proctor equipment','Nuncio aquila');
 expect(title(b,'Nuncio Aquila')).toMatchObject([{turn:'either',window:'Command',timing:'start',units:['Exaction Squad#1']}]);
 expect(title(b,'4+ invulnerable save').find(r=>r.units?.includes('Subductor Squad#1'))?.summary).toContain('Cyber-mastiff is excluded');
 expect(title(b,'Death to the Alien').map(r=>r.window)).toEqual(['Shooting','Fight']);
});
it('applies intrinsic Assassin muster and usage rules only in their proper army or detachment',()=>{
 const a=native({'Vindicare Assassin':1,'Callidus Assassin':1,'Culexus Assassin':1});
 expect(title(a,'Shadow Assignment').find(r=>r.units?.includes('Vindicare Assassin#1'))?.summary).toContain('Eversor Assassin');
 expect(title(a,'Shadow Assignment').find(r=>r.units?.includes('Vindicare Assassin#1'))?.summary).not.toContain('Culexus');
 expect(title({...a,faction:'Imperial Knights'},'Shadow Assignment')).toHaveLength(0);
 expect(title({...a,detachments2026:['Veiled Blade Elimination Force']},'Shieldbreaker')[0].summary).toMatch(/Twice per battle.*once per battle round/);
 expect(title(a,'Shieldbreaker')[0].summary).toMatch(/Once per battle/);

});
it('retains a saved three-unit pre-import roster, including the formerly ambiguous Arbites entry',()=>{
 const legacy={...newSelection('Imperial Agents'),units:{'Arbites':1,'Imperial Navy Breachers':1,'Inquisitor':1}};
 expect(validateStore(initialStore(legacy))).toBe(true);
 expect(()=>addSelectionUnit(legacy,'Arbites',1)).toThrow();
});

it('uses the two independently corroborated Aquila formations, Gravis capacity and actual shield bearers',()=>{
 const unit='Aquila Kill Team';
 const a=native({[unit]:1,'Watch Master':1,'Imperial Rhino':1});
 const formation=setInstanceAttachment(a,'Watch Master#1',unit+'#1');
 const b={...formation,instances:formation.instances?.map(s=>s.unit===unit?{...s,models:10}:s)};
 expect(verifiedUnitSizes2026(a,unit)).toEqual([5,10]);
 const sheet=NATIVE_AGENT_SHEETS.find(r=>r.unit===unit)!;
 expect(sheet.compositionBySize?.[5]['Gravis Veteran']).toBe(1);
 expect(sheet.compositionBySize?.[10]['Deathwatch Veteran with Xenophase Blade and Special-issue Bolt Pistol']).toBe(1);
 for(const [army,points,spaces] of [[a,110,6],[b,210,12]] as const){
  expect(rosterCost2026(army).entries.find(e=>e.unit===unit)?.points).toBe(points);
  expect(title(army,'Gravis Veteran transport capacity')[0].summary).toContain(spaces+' spaces');
  expect(title(army,'Astartes Shield')).toHaveLength(0);
 }
 expect(title(b,'Kill Team').find(r=>r.window==='Fight')?.units).toEqual([unit+'#1','Watch Master#1']);
 expect(rosterCost2026({...a,instances:a.instances?.map(s=>s.unit===unit?{...s,models:6}:s)}).total).toBeNull();
});
