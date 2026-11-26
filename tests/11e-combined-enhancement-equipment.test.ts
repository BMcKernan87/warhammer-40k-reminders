import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {matching11thRules,type Rule11th} from '../src/rules-11th-registry';
const rule:Rule11th={id:'combined',title:'Combined selector',window:'Shooting',timing:'during',summary:'Only the upgraded equipped squad',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'unit',faction:'Necrons',anyUnits:['Immortals'],units:['Immortals'],equipment:{Immortals:'Tesla carbine'},enhancements:['Test Enhancement']};
describe('11e combined enhancement and equipment targeting',()=>{
 it('requires both conditions on the same squad',()=>{
  const army={...newSelection('Necrons'),instances:[{id:'immortals-1',unit:'Immortals',equipment:'Tesla carbine'},{id:'immortals-2',unit:'Immortals',equipment:'Gauss blaster'}],upgrades2026:{'immortals-2':'Test Enhancement'}};
  expect(matching11thRules(army,[rule])).toHaveLength(0);
 });
 it('shows the reminder only for the equipped upgraded squad',()=>{
  const army={...newSelection('Necrons'),instances:[{id:'immortals-1',unit:'Immortals',equipment:'Tesla carbine'},{id:'immortals-2',unit:'Immortals',equipment:'Gauss blaster'}],upgrades2026:{'immortals-1':'Test Enhancement'}};
  const found=matching11thRules(army,[rule]);
  expect(found).toHaveLength(1);
  expect(found[0].units).toEqual(['immortals-1']);
 });
});
