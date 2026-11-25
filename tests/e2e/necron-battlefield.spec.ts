import {test,expect,type Page} from '@playwright/test';
async function add(page:Page,unit:string){await page.getByLabel('Select unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add',exact:true}).click();}
test('Necron Play mode displays roster reminders without battlefield event entry',async({page})=>{
 await page.goto('./');await add(page,'Necron Warriors');await page.getByRole('button',{name:'Play reminders'}).click();
 await expect(page.getByRole('heading',{name:'Phase reminders'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'11th-edition army setup'})).toBeVisible();
 await expect(page.getByLabel('Battlefield unit')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Battle log'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Other tracked units'})).toHaveCount(0);
});
test('a Scout army can use any phase immediately and print every phase after checking off a reminder',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('./');
 await page.getByRole('checkbox',{name:/Hand of the Dynasty/}).check();
 await add(page,'Necron Warriors');
 await page.getByLabel('11th upgrade for squad Necron Warriors#1').selectOption('Enlivened Sentinels');
 await page.getByRole('button',{name:'Play reminders'}).click();
 const sheet=page.getByRole('heading',{name:'Phase reminders'}).locator('..');
 await expect(page.getByLabel(/Scout decision/)).toHaveCount(0);
 await sheet.getByLabel('Show phase').selectOption('Pre-battle');
 await expect(sheet.getByRole('heading',{name:'Shooting'})).toHaveCount(0);
 const scout=sheet.getByRole('checkbox',{name:/Scout/i}).first();
 await expect(scout).toBeVisible();
 const title=await scout.getAttribute('id');
 await scout.click();
 await expect(scout).toHaveCount(0);
 await page.reload();
 await page.getByRole('button',{name:'Play reminders'}).click();
 await sheet.getByLabel('Show completed reminders').check();
 await expect(page.locator('[id="'+title+'"]')).toBeChecked();
 await sheet.getByLabel('Show phase').selectOption('End of opponent turn');
 await expect(sheet.getByRole('heading',{name:'End of opponent turn'})).toBeVisible();
 await expect(sheet.getByRole('heading',{name:'Pre-battle'})).toHaveCount(0);
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.print-sheet h3')).toHaveCount(8);
 await expect(page.locator('.print-sheet strong').filter({hasText:/Scout/i}).first()).toBeVisible();
});
