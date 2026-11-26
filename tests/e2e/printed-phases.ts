import {expect,type Page,type TestInfo} from '@playwright/test';

export async function verifyPrint(page:Page,info:TestInfo){
 const headings=await page.getByRole('region',{name:'Printable army reminders'}).locator('h3').allTextContents();
 expect(headings).toHaveLength(11);
 const pdf=await page.pdf({path:info.outputPath('reminders.pdf'),format:'A4',outline:true,tagged:true});
 expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 // Chromium's tagged output exposes genuine PDF outline entries for each printed phase.
 const bookmarks=Array.from(pdf.toString('latin1').matchAll(/\/Title\s+\(([^)]*)\)/g),m=>m[1]);
 for(const phase of headings)expect(bookmarks).toContain(phase);
}
