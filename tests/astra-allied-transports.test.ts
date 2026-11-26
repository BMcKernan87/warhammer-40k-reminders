// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';

it('prints the actual Agents transport and its eligible passengers alongside the Guard Chimera',()=>{
 let army:ArmySelection={...newSelection('Astra Militarum'),battleSize2026:'Strike Force',detachments2026:['Combined Arms']};
 for(const unit of ['Cadian Castellan','Cadian Shock Troops','Chimera','Inquisitorial Agents','Inquisitorial Chimera']){
  army=addSelectionUnit(army,unit);
 }
 const cards=generate11thReminders(army);
 const agents=cards.filter(card=>card.title==='Inquisitorial Chimera#1 · embarkation');
 expect(agents).toHaveLength(1);
 expect(agents[0]).toMatchObject({window:'Pre-battle',units:['Inquisitorial Chimera#1']});
 expect(agents[0].summary).toContain('Inquisitorial Agents#1');
 expect(agents[0].summary).not.toContain('Cadian Shock Troops#1');
 const guard=cards.find(card=>card.title==='Chimera#1 · Declare passengers')!;
 expect(guard.summary).toContain('Cadian Shock Troops#1');
 expect(guard.summary).not.toContain('Inquisitorial Agents#1');
 expect(cards.filter(card=>card.title==='Inquisitorial Chimera#1 · disembarkation')).toHaveLength(1);
});
