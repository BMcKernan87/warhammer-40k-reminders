import {describe,it,expect} from 'vitest';
import {validateRuleRecord,validateRuleRegistry} from '../src/rule-registry';
const rule={id:'test-rule',faction:'Orks',scope:'faction',title:'Test',window:'Command',timing:'start',summary:'A concise trigger.',sourceUrl:'https://wahapedia.ru/wh40k10ed/factions/orks/',verification:'reference'};
describe('normalized rules registry',()=>{
 it('accepts source-backed structured reminders',()=>expect(validateRuleRecord(rule)).toBe(true));
 it('rejects missing source and unsupported timing',()=>{expect(validateRuleRecord({...rule,sourceUrl:''})).toBe(false);expect(validateRuleRecord({...rule,window:'Unknown'})).toBe(false);});
 it('requires unit and equipment identity for equipment triggers',()=>expect(validateRuleRecord({...rule,scope:'equipment'})).toBe(false));
 it('rejects duplicate rule IDs',()=>expect(validateRuleRegistry([rule,rule])).toBe(false));
});
