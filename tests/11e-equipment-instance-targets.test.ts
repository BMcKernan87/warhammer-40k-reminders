import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {matching11thRules,type Rule11th} from '../src/rules-11th-registry';
const rule:Rule11th={id:'tesla-cue',title:'Tesla carbine cue',window:'Shooting',timing:'during',summary:'Equipped model reminder',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'unit',faction:'Necrons',anyUnits:['Immortals'],equipment:{Immortals:'Tesla carbine'},units:['Immortals']};
describe('equipment-specific 11e reminders identify the actual squad',()=>{
 it('targets only the squad with the selected equipment',()=>{
  const army={...newSelection('Necrons'),instances:[{id:'immortals-1',unit:'Immortals',equipment:'Gauss blaster'},{id:'immortals-2',unit:'Immortals',equipment:'Tesla carbine'}]};
  const found=matching11thRules(army,[rule]);
  expect(found).toHaveLength(1);
  expect(found[0].units).toEqual(['immortals-2']);
  expect(found[0].title).toContain('immortals-2');
 });
 it('does not show an equipment cue when no squad has that equipment',()=>{
  const army={...newSelection('Necrons'),instances:[{id:'immortals-1',unit:'Immortals',equipment:'Gauss blaster'}]};
  expect(matching11thRules(army,[rule])).toHaveLength(0);
 });
});
