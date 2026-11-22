import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {matching11thRules,type Rule11th} from '../src/rules-11th-registry';
const source='https://assets.warhammer-community.com/example.pdf';
const rule:Rule11th={id:'sample',title:'Example',window:'Shooting',timing:'during',summary:'Test',source,origin:'unit',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Immortals'],equipment:{Immortals:'Tesla carbine'},units:['Immortals']};
describe('11th edition rule registry',()=>{
 it('requires faction, detachment, unit and selected equipment',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Immortals');
  expect(matching11thRules(base,[rule])).toHaveLength(0);
  const selected={...base,detachments2026:['Hand of the Dynasty'],equipment:{Immortals:'Tesla carbine'}};
  expect(matching11thRules(selected,[rule]).map(r=>r.id)).toEqual(['sample']);
  expect(matching11thRules({...selected,faction:'Orks'},[rule])).toHaveLength(0);
  expect(matching11thRules({...selected,equipment:{Immortals:'Gauss blaster'}},[rule])).toHaveLength(0);
 });
 it('returns only selected eligible units and removes registry selectors from output',()=>{
  const base=addSelectionUnit(newSelection('Necrons'),'Immortals');
  const selected={...base,detachments2026:['Hand of the Dynasty'],equipment:{Immortals:'Tesla carbine'}};
  const result=matching11thRules(selected,[{...rule,units:['Immortals','Necron Warriors']}]);
  expect(result[0].units).toEqual(['Immortals']);
  expect('detachments' in result[0]).toBe(false);
 });
});
