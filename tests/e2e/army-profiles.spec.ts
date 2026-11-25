import {test,expect} from '@playwright/test';
test('mobile builder equipment choices persist across profiles without showing legacy reminders',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await page.getByLabel('Select unit').selectOption('Immortals');
 await page.getByRole('button',{name:'Add',exact:true}).click();
 await page.getByRole('button',{name:'Play reminders'}).click();
 await expect(page.getByText('11th-edition army setup')).toBeVisible();
 await page.getByRole('button',{name:'Edit army'}).click();
 await page.getByLabel('Equipment for Immortals').selectOption('Tesla carbine');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await expect(page.getByRole('heading',{name:'Phase reminders'})).toBeVisible();
 await page.getByRole('button',{name:'Edit army'}).click();
 page.once('dialog',dialog=>dialog.accept('Orks army'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Army faction').selectOption('Orks');
 await page.getByLabel('Saved army').selectOption('default');
 await expect(page.getByLabel('Equipment for Immortals')).toHaveValue('Tesla carbine');
 await expect(page.getByLabel('Army faction')).toHaveValue('Necrons');
});
test('print contains all phases even when current phase is filtered',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('./');
 await page.getByRole('button',{name:'Play reminders'}).click();

 const phases=page.locator('.print-sheet h3');
 await expect(phases).toHaveCount(7);
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.print-sheet')).toBeVisible();
 await expect(page.locator('.print-sheet h3')).toContainText(['Pre-battle','Command','Movement','Shooting','Charge','Fight','End of opponent turn']);
});
