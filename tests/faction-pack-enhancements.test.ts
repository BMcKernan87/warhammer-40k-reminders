import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026} from '../src/upgrades-2026';
describe('Faction pack enhancements',()=>{
 it.each([['Dread Majesty','Overlord','Starshatter Arsenal',['Fight','Shooting']],['Miniaturised Nebuloscope','Plasmancer','Starshatter Arsenal',['Shooting']],['Demanding Leader','Technomancer','Starshatter Arsenal',['Command']],['Chrono-impedance Fields','Overlord','Starshatter Arsenal',['Command']],['Prelocational Optimiser','Overlord',"The Phaeron's Armoury",['Shooting']]])('generates selected %s', (name,unit,detachment,phases)=>{
 const a={...addSelectionUnit(newSelection('Necrons'),unit as string),detachments2026:[detachment as string]};
 const title=name==='Prelocational Optimiser'?'Relocational Optimiser':name as string;
 expect(generate11thReminders(a).filter(r=>r.title.includes(title))).toHaveLength(0);
 expect(generate11thReminders(selectUpgrade2026(a,unit as string,name as string)).filter(r=>r.title.includes(title)).map(r=>r.window).sort()).toEqual(phases);
 });
 it('rejects Dread Majesty for a Plasmancer',()=>expect(()=>selectUpgrade2026({...addSelectionUnit(newSelection('Necrons'),'Plasmancer'),detachments2026:['Starshatter Arsenal']},'Plasmancer','Dread Majesty')).toThrow());
});
