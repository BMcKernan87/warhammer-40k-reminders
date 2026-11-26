import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {GSC_SHEETS} from '../src/gsc-data';
it('prices each Jackal formation using the correct model and requisition bracket and identifies the conflicting source only on affected sizes',()=>{
  const unit='Atalan Jackals';
  const costs=(models:number)=>rosterCost2026({...newSelection('Genestealer Cults'),units:{[unit]:3},
    instances:[1,2,3].map(n=>({unit,id:unit+'#'+n,models}))},GSC_SHEETS);
  expect(costs(5).entries.map(row=>row.points)).toEqual([85,85,95]);
  for(const models of [6,7,8,9]){
    expect(costs(models).entries.map(row=>row.points)).toEqual([160,160,170]);
    expect(costs(models).entries.every(row=>row.priceNote?.includes('10 points lower'))).toBe(true);
  }
  expect(costs(10).entries.map(row=>row.points)).toEqual([150,150,160]);
  expect(costs(10).entries.every(row=>!row.priceNote)).toBe(true);
});
