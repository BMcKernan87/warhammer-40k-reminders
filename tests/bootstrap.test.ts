import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
describe('application bootstrap',()=>{
  it('has a React entry point and persistent battle state',()=>{
    const app=readFileSync('src/main.tsx','utf8');
    expect(app).toContain('createRoot(');
    expect(app).toContain("localStorage.setItem('w40k-reminders'");
    expect(app).toContain('Gain command CP for both players');
  });
  it('has a configured Pages base path',()=>{
    const config=readFileSync('vite.config.ts','utf8');
    expect(config).toContain("base:'/warhammer-40k-reminders/'");
  });
});
