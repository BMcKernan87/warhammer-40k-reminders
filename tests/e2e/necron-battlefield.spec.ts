import {test,expect,type Page} from '@playwright/test';
async function add(page:Page,unit:string){await page.getByLabel('Select unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add',exact:true}).click();}
test('Necron Play mode displays roster reminders without battlefield event entry',async({page})=>{
 await page.goto('/');await add(page,'Necron Warriors');await page.getByRole('button',{name:'Play reminders'}).click();
 await expect(page.getByRole('heading',{name:'Phase reminders'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'11th-edition army setup'})).toBeVisible();
 await expect(page.getByLabel('Battlefield unit')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Battle log'})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Other tracked units'})).toHaveCount(0);
});
test('reminder checklist supports current phase and all phases',async({page})=>{
 await page.goto('/');await add(page,'Immortals');await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByRole('button',{name:'Current phase'}).click();
 await expect(page.getByRole('heading',{name:'Phase reminders'})).toBeVisible();
 await page.getByRole('button',{name:'All phases'}).click();
 await expect(page.getByRole('heading',{name:'Phase reminders'})).toBeVisible();
});
