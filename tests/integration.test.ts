import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
describe('reminder UI integration',()=>{
 const app=readFileSync('src/main.tsx','utf8');
 it('uses the validated engine for phase and CP transitions',()=>{
  expect(app).toContain('change(advancePhase)');
  expect(app).toContain('change(gainCommandCp)');
  expect(app).toContain('change(b=>spendCp(b,p,1))');
 });
 it('persists battle state and reminder completion separately',()=>{
  expect(app).toContain('localStorage.setItem(storageKey,JSON.stringify(battle))');
  expect(app).toContain('localStorage.setItem(completionStorageKey,JSON.stringify(completed))');
 });
 it('uses current turn and player when checking reminders',()=>{
  expect(app).toContain('completionKey(r.id,battle)');
  expect(app).toContain('availableRules(battle,faction)');
 });
});
