// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {assignedAgentFindings,assignedAgentReminders,ASSIGNED_AGENT_SHEETS} from '../src/knight-assigned-agents';
import {alliedPrices} from '../scripts/import-knight-assigned-agents.mjs';

function agents(size:ArmySelection['battleSize2026'],...units:string[]):ArmySelection{
 return {...newSelection('Imperial Knights'),battleSize2026:size,instances:units.map((unit,i)=>({unit,id:'unit-'+i}))};
}
it('charges the MFM allied pay group and enforces the battle-size Character slots',()=>{
 expect(ASSIGNED_AGENT_SHEETS.find(u=>u.unit==='Vindicare Assassin')?.pointsBySize).toEqual({1:125});
 expect(ASSIGNED_AGENT_SHEETS.find(u=>u.unit==='Eversor Assassin')?.pointsBySize).toEqual({1:110});
 const pair=['Callidus Assassin','Culexus Assassin'];
 expect(assignedAgentFindings(agents('Incursion',...pair)).map(f=>f.code)).toContain('assigned-agents-character');
 expect(assignedAgentFindings(agents('Strike Force',...pair))).toEqual([]);
 expect(assignedAgentFindings(agents('Onslaught',...pair,'Vindicare Assassin'))).toEqual([]);
 const pricing=[['<div class="dsHeaderAoI">AGENTS OF THE IMPERIUM Detachment</div>',''],['YOUR UNIT COSTS',''],['1 model','110'],['<div class="dsHeaderAoI">Assigned Agent</div>',''],['YOUR UNIT COSTS',''],['1 model','125']].map(([description,cost],i)=>({line:String(i),description,cost}));
 expect(alliedPrices(pricing,'Vindicare').pointsBySize).toEqual({1:125});
 expect(()=>alliedPrices(pricing.slice(0,3),'Vindicare')).toThrow(/missing Assigned Agent price group/);
});
it('confines the October Assassin rules to the selected models, triggers and turns',()=>{
 const army=agents('Strike Force','Callidus Assassin','Vindicare Assassin');
 const sheet=assignedAgentReminders(army);
 const find=(name:string,window:string)=>sheet.find(r=>r.title.includes(name)&&r.window===window);
 expect(find('Acrobatic Escape','End of opponent turn')).toMatchObject({turn:'opponent',timing:'end',units:['unit-0']});
 expect(find('Acrobatic Escape return','Movement')?.summary).toContain('including on your first turn');
 const shredder=find('Ranged weapons','Shooting')?.summary;
 expect(shredder).toContain('Blast 2');
 expect(shredder).not.toMatch(/precision/i);
 expect(find('Deadshot','Shooting')?.summary).toContain('+15″');
 expect(find('Shieldbreaker','Shooting')?.units).toEqual(['unit-1']);
 expect(sheet.some(r=>r.title.includes('Soulless Horror')||r.title.includes('Shadow Assignment'))).toBe(false);
 const unleashed=assignedAgentReminders(agents('Strike Force','Eversor Assassin','Culexus Assassin'));
 expect(unleashed.find(r=>r.title.includes('Overkill')&&r.window==='Movement')?.summary).toContain('+6″');
 expect(unleashed.find(r=>r.title.includes('Etheric Emergence')&&r.window==='Charge')?.summary).toContain('cannot declare a charge');
 expect(unleashed.find(r=>r.title.includes('Soulless Horror'))).toMatchObject({window:'Command',turn:'either',timing:'start'});
 expect(new Set(sheet.map(r=>r.id)).size).toBe(sheet.length);
});
