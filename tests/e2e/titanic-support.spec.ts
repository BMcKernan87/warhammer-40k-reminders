import {test,expect,type Page} from '@playwright/test';

async function add(page:Page,name:string){
 await page.getByLabel('Select unit',{exact:true}).selectOption(name);
 await page.getByRole('button',{name:'Add',exact:true}).click();
}
test('musters a Warhound and one paid Freeblade, preserves them across battle-size changes and prints targeting costs',async({page})=>{
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Imperial Agents');
 const size=page.getByLabel('2026 battle size'),picker=page.getByLabel('Select unit',{exact:true});
 await size.selectOption('Incursion');
 await expect(picker.locator('option',{hasText:'Warhound Titan'})).toHaveCount(0);
 await size.selectOption('Strike Force');
 await add(page,'Warhound Titan');
 await page.getByLabel('Plasma arm for Warhound Titan#1',{exact:true}).selectOption('Warhound inferno gun');
 await page.getByLabel('Vulcan arm for Warhound Titan#1',{exact:true}).selectOption('Warhound inferno gun');
 await add(page,'Knight Crusader');
 await page.getByLabel('Cannon for Knight Crusader#1',{exact:true}).selectOption('Rapid-fire battle cannon + Questoris heavy stubber');
 await expect(page.getByText('Recorded 11th-edition total: 1510 points',{exact:true})).toBeVisible();
 await size.selectOption('Incursion');
 await page.reload();
 await expect(page.getByLabel('Plasma arm for Warhound Titan#1',{exact:true})).toHaveValue('Warhound inferno gun');
 await expect(page.getByRole('region',{name:'Roster validation findings'})).toContainText('A Warhound costs 1,100 points');
 await size.selectOption('Strike Force');
 await add(page,'Inquisitor');
 const findings=page.getByRole('region',{name:'Roster validation findings'});
 await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.emulateMedia({media:'print'});
 const sheet=page.getByRole('region',{name:'Printable army reminders'});
 await expect(sheet.getByText('Warhound Titan#1 · Ranged weapon profiles',{exact:true}).locator('..')).toContainText('2 × Warhound inferno gun');
 await expect(sheet.getByText('Declare Strategic Reserves',{exact:true}).locator('..').locator('.rule-subjects')).not.toContainText('Warhound');
 await expect(sheet.getByText('Command Re-roll · 1CP',{exact:true}).first().locator('..')).toContainText('Striding Colossus costs 2CP');
 await expect(sheet.getByText('Warhound Titan#1 · Flank Speed',{exact:true})).toBeVisible();
});
