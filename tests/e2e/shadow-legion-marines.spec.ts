import {test,expect} from '@playwright/test';

test('Shadow Legion builds legal mixed Terminators and reopens their printed sheet',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Chaos Daemons');
 await page.getByRole('checkbox',{name:/Shadow Legion/}).check();
 await page.getByLabel('Select unit',{exact:true}).selectOption('Chaos Terminator Squad');
 await page.getByRole('button',{name:'Add',exact:true}).click();
 const second=page.getByLabel('Model 2 weapons for Chaos Terminator Squad#1',{exact:true});
 await second.selectOption('Heavy flamer + Power fist');
 const third=page.getByLabel('Model 3 weapons for Chaos Terminator Squad#1',{exact:true});
 await expect(third.locator('option',{hasText:'Reaper autocannon + Power fist'})).toBeDisabled();
 await third.selectOption('Paired accursed weapons');
 await page.reload();
 await expect(second).toHaveValue('Heavy flamer + Power fist');
 await expect(third).toHaveValue('Paired accursed weapons');
 await page.getByRole('button',{name:'Play reminders'}).click();
 const sheet=page.getByRole('heading',{name:'Phase reminders'}).locator('..');
 await sheet.getByLabel('Show phase').selectOption('Shooting');
 await expect(sheet.getByText(/1 × Heavy flamer.*Torrent/)).toBeVisible();
 await expect(sheet.getByText(/Reaper autocannon/)).toHaveCount(0);
 await page.emulateMedia({media:'print'});
 const print=page.locator('.print-sheet');
 await expect(print.getByText('Chaos Terminator Squad#1 · Despoilers',{exact:true}).first()).toBeVisible();
});
