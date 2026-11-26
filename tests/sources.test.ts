import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {datasheetReferences,factionSource} from '../src/sources';
describe('Wahapedia source registry',()=>{
 it('links the correct faction source',()=>{expect(factionSource(newSelection()).url).toContain('/factions/necrons/');expect(factionSource(newSelection('Space Marines')).url).toContain('/factions/space-marines/');});
 it('provides datasheet lookup for every selected unit',()=>{const s=addSelectionUnit(newSelection(),'Immortals',2);expect(datasheetReferences(s)).toEqual([{unit:'Immortals',faction:'Necrons',url:'https://wahapedia.ru/wh40k10ed/factions/necrons/datasheets.html',status:'reference'}]);});
 it('does not falsely claim linked rules were verified',()=>expect(factionSource(newSelection()).status).toBe('reference'));
});
