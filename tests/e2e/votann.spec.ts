import {test,expect,type Page} from '@playwright/test';

async function add(page:Page,unit:string){
 await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
 await page.getByRole('button',{name:'Add',exact:true}).click();
}
const hearthkyn='Hearthkyn Warriors',master='Brôkhyr Iron-master',thunderkyn='Brôkhyr Thunderkyn',fortress='Hekaton Land Fortress';
for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
 test('Kin muster at 1,000 and 2,000, reopen mixed gear and print whole formations at '+viewport.width+'px',async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize(viewport);
  await page.goto('./');
  await page.getByLabel('Army faction').selectOption('Leagues of Votann');
  await page.getByLabel('2026 battle size').selectOption('Incursion');
  await page.getByRole('checkbox',{name:/Dêlve Assault Shift/}).check();
  for(const unit of ['Grimnyr',hearthkyn,'Sagitaur','Sagitaur',thunderkyn,master,fortress,'Hernkyn Pioneers','Cthonian Beserks'])await add(page,unit);
  await page.getByLabel('Warlord',{exact:true}).selectOption(master+'#1');
  await page.getByLabel('Models for squad '+thunderkyn+'#1',{exact:true}).selectOption('6');
  await page.getByLabel('11th upgrade for squad Grimnyr#1',{exact:true}).selectOption('Multiwave System Jammer');
  await page.getByLabel('Warrior 1 firearm for '+hearthkyn+'#1',{exact:true}).selectOption('Magna-rail rifle');
  await expect(page.getByLabel('Attach squad Grimnyr#1')).toHaveValue(hearthkyn+'#1');
  await expect(page.getByLabel('Attach squad '+master+'#1')).toHaveValue(thunderkyn+'#1');
  const findings=page.getByRole('region',{name:'Roster validation findings'});
  await expect(page.getByText('Recorded 11th-edition total: 1000 points',{exact:true})).toBeVisible();
  await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);
  await page.getByLabel('2026 battle size').selectOption('Strike Force');
  for(const unit of ['Hernkyn Yaegirs','Kapricus Carrier','Kapricus Carrier',fortress,'Einhyr Hearthguard','Kâhl','Einhyr Champion','Cthonian Earthshakers'])await add(page,unit);
  await page.getByLabel('Models for squad Einhyr Hearthguard#1',{exact:true}).selectOption('10');
  await expect(page.getByText('Recorded 11th-edition total: 2000 points',{exact:true})).toBeVisible();
  await expect(findings.getByText('ERROR',{exact:true})).toHaveCount(0);
  page.once('dialog',dialog=>dialog.accept('Second army'));
  await page.getByRole('button',{name:'New army'}).click();
  await page.getByLabel('Saved army').selectOption('default');
  await page.reload();
  await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue(master+'#1');
  await expect(page.getByLabel('Warrior 1 firearm for '+hearthkyn+'#1',{exact:true})).toHaveValue('Magna-rail rifle');
  await expect(page.getByLabel('Attach squad '+master+'#1')).toHaveValue(thunderkyn+'#1');
  await expect(page.getByLabel('11th upgrade for squad Grimnyr#1')).toHaveValue('Multiwave System Jammer');
  await page.getByRole('button',{name:'Play reminders'}).click();
  await page.getByLabel('Show phase').selectOption('Movement');
  const phase=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
  const overwatch=phase.locator('.check').filter({has:page.getByText('Fire Overwatch · 1CP',{exact:true})});
  await expect(overwatch.locator('.rule-subjects')).toContainText(thunderkyn+'#1');
  await expect(overwatch.locator('.rule-subjects')).not.toContainText(master+'#1');
  await expect(overwatch.locator('.rule-subjects')).not.toContainText('Cthonian Beserks#1');
  await page.emulateMedia({media:'print'});
  const print=page.getByRole('region',{name:'Printable army reminders'});
  await expect(print.locator('h3')).toHaveCount(11);
  const carrier=print.getByText('Kapricus Carrier · Declare passengers',{exact:true}).first().locator('..');
  await expect(carrier).toContainText('Hernkyn Yaegirs#1 (split half)');
  const heavy=print.getByText('Hekaton Land Fortress · Declare passengers',{exact:true}).first().locator('..');
  await expect(heavy).toContainText(thunderkyn+'#1');
  await expect(heavy).not.toContainText('Einhyr Hearthguard#1');
 });
}
