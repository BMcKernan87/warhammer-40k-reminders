import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
describe('production bootstrap',()=>{
  it('loads the React entry under the configured Pages path',()=>{
    expect(readFileSync('index.html','utf8')).toContain('/src/main.tsx');
    expect(readFileSync('vite.config.ts','utf8')).toContain("base:'/warhammer-40k-reminders/'");
  });
});
