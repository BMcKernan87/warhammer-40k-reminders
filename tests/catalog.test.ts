import {describe,it,expect} from 'vitest';
import {CATALOG,newSelection,addSelectionUnit,removeSelectionUnit,validateSelection} from '../src/catalog';
describe('AoS-style roster builder',()=>{
 it('provides faction-specific detachments and units',()=>{expect(CATALOG.Necrons.units).toContain('Canoptek Wraiths');expect(CATALOG['Space Marines'].units).toContain('Bladeguard Veteran Squad');});
 it('increments a selected unit quantity',()=>{let s=newSelection();s=addSelectionUnit(s,'Immortals');s=addSelectionUnit(s,'Immortals',2);expect(s.units.Immortals).toBe(3);expect(removeSelectionUnit(s,'Immortals').units.Immortals).toBeUndefined();});
 it('rejects invalid faction units and quantities',()=>{expect(()=>addSelectionUnit(newSelection(),'Bladeguard Veteran Squad')).toThrow();expect(()=>addSelectionUnit(newSelection(),'Immortals',0)).toThrow();});
 it('validates saved army configurations',()=>{expect(validateSelection(newSelection())).toBe(true);expect(validateSelection({...newSelection(),units:{'Unknown':1}})).toBe(false);});
});
