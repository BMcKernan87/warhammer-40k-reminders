import {describe,it,expect} from 'vitest';
import {NECRON_MFM_JUNE_2026,NECRON_MFM_JUNE_METADATA} from '../src/necron-mfm-june-2026';
describe('historical 11th edition Necron MFM snapshot',()=>{
 it('imports all 52 unique Necron entries without presenting them as current',()=>{
  expect(NECRON_MFM_JUNE_2026).toHaveLength(52);
  expect(new Set(NECRON_MFM_JUNE_2026.map(x=>x.unit)).size).toBe(52);
  expect(NECRON_MFM_JUNE_METADATA.status).toBe('historical');
  expect(NECRON_MFM_JUNE_METADATA.date).toBe('2026-06-17');
 });
 it('retains variable squad sizes and later-copy tiers',()=>{
  const wraiths=NECRON_MFM_JUNE_2026.find(x=>x.unit==='Canoptek Wraiths');
  expect(wraiths?.pointsBySize).toEqual({'3':95,'6':220});
  expect(wraiths?.laterCopyPointsBySize).toEqual({'2':{'3':115,'6':240}});
  const immortals=NECRON_MFM_JUNE_2026.find(x=>x.unit==='Immortals');
  expect(immortals?.pointsBySize).toEqual({'5':70,'10':140});
 });
});
