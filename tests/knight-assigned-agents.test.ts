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

import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';

function armyWith(units:Record<string,number>,detachments2026:string[]=[]){
 return individualArmy({...newSelection('Imperial Knights'),battleSize2026:'Incursion',units,detachments2026});
}
it('counts a mixed Character unit and its unattached Navy Bodyguard exemption at muster',()=>{
 const troops=armyWith({'Rogue Trader Entourage':1,'Voidsmen-at-arms':2,'Knight Paladin':1});
 expect(assignedAgentFindings(troops)).toEqual([]);
 const excess=armyWith({'Navigator':1,'Rogue Trader Entourage':1,'Voidsmen-at-arms':3});
 expect(assignedAgentFindings(excess).map(f=>f.code)).toEqual(['assigned-agents-character']);
 expect(assignedAgentFindings(armyWith({'Voidsmen-at-arms':2})).map(f=>f.code)).toEqual(['assigned-agents-retinue']);
 const withTrader=setInstanceAttachment(troops,'Rogue Trader Entourage#1','Voidsmen-at-arms#1');
 const reminders=generate11thReminders(withTrader);
 const serum=reminders.find(r=>r.title.includes('Healing Serum'));
 expect(serum).toMatchObject({window:'Command',turn:'own',timing:'start',units:['Voidsmen-at-arms#1','Rogue Trader Entourage#1']});
 expect(reminders.filter(r=>r.title.includes('Backroom Deals'))).toHaveLength(1);
 expect(reminders.find(r=>r.title.includes('Voidsmen-at-arms#1')&&r.title.includes('Close Confines'))?.units).toContain('Rogue Trader Entourage#1');
 expect(reminders.some(r=>r.title.includes('Lone Operative')||r.title.includes('Warrant of Trade')||r.title.includes('-+ invulnerable'))).toBe(false);
 const spear=armyWith({'Rogue Trader Entourage':2,'Armiger Warglaive':2},['Spearhead-at-arms']);
 const warrants=assignedAgentReminders(spear).filter(r=>r.title.includes('Warrant of Trade'));
 expect(warrants).toHaveLength(1);
 expect(warrants[0].units).toEqual(['Rogue Trader Entourage#1','Armiger Warglaive#1','Armiger Warglaive#2']);
});
it('changes Inquisitorial recipients and battle effects with Forgepact, an available Leader slot and the selected bearer',()=>{
 const base=armyWith({'Inquisitor Greyfax':1,'Skitarii Rangers':1,'Voidsmen-at-arms':1},['Questor Forgepact']);
 expect(()=>setInstanceAttachment({...base,detachments2026:[]},'Inquisitor Greyfax#1','Skitarii Rangers#1')).toThrow();
 expect(()=>setInstanceAttachment(base,'Inquisitor Greyfax#1','Voidsmen-at-arms#1')).toThrow();
 expect(assignedAgentReminders(base).some(r=>r.title.includes('Psyoculum'))).toBe(false);
 const attached=setInstanceAttachment(base,'Inquisitor Greyfax#1','Skitarii Rangers#1');
 const attachedSheet=generate11thReminders(attached);
 expect(attachedSheet.find(r=>r.title.includes('Psyoculum'))?.units).toEqual(['Skitarii Rangers#1','Inquisitor Greyfax#1']);
 expect(attachedSheet.filter(r=>r.title.includes('No Mercy')).map(r=>r.window).sort()).toEqual(['Fight','Shooting']);
 expect(assignedAgentFindings({...attached,detachments2026:[]}).map(r=>r.code)).toContain('invalid-attachment');
 const solitary=assignedAgentReminders(armyWith({'Navigator':1,'Inquisitor Coteaz':1,'Inquisitor Draxus':1}));
 expect(solitary.find(r=>r.title.includes('Third Eye'))).toMatchObject({window:'Shooting',timing:'start',turn:'own',units:['Navigator#1']});
 expect(solitary.find(r=>r.title.includes('Psychic Veil')&&r.window==='Command')?.units).toEqual(['Inquisitor Draxus#1']);
 expect(solitary.some(r=>r.title.includes('Malefic Wardings')||r.title.includes('Xenos Hunter'))).toBe(false);
 expect(solitary.find(r=>r.title.includes('Glovodan Psyber-eagle')&&r.window==='Command')?.summary).toMatch(/18″.*next Command/);
});
