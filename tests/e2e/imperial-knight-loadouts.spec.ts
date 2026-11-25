import {test,expect} from '@playwright/test';

test('equips a paid Crusader cannon, blocks duplicate Destrier arms and restores both Knights on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  await page.getByLabel('Army faction').selectOption('Imperial Knights');
  await page.getByLabel('Select unit',{exact:true}).selectOption('Knight Crusader');
  await page.getByRole('button',{name:'Add',exact:true}).click();
  await expect(page.getByText('Recorded 11th-edition total: 395 points',{exact:true})).toBeVisible();
  const cannon=page.getByLabel('Cannon for Knight Crusader#1',{exact:true});
  await cannon.selectOption('Rapid-fire battle cannon + Questoris heavy stubber');
  await expect(page.getByText('Recorded 11th-edition total: 410 points',{exact:true})).toBeVisible();
  await page.getByLabel('Hull weapon for Knight Crusader#1',{exact:true}).selectOption('Questoris heavy stubber');
  await page.getByLabel('Select unit',{exact:true}).selectOption('Knight Destrier');
  await page.getByRole('button',{name:'Add',exact:true}).click();
  const gatling=page.getByLabel('Gatling arm for Knight Destrier#1',{exact:true});
  const bombard=page.getByLabel('Bombard arm for Knight Destrier#1',{exact:true});
  await gatling.selectOption('Thundershock spear');
  await expect(bombard.locator('option',{hasText:'Thundershock spear'})).toBeDisabled();
  await bombard.selectOption('Bellatus reaper chainsword');
  await page.reload();
  await expect(cannon).toHaveValue('Rapid-fire battle cannon + Questoris heavy stubber');
  await expect(gatling).toHaveValue('Thundershock spear');
  await expect(bombard).toHaveValue('Bellatus reaper chainsword');
  await expect(page.getByText('Recorded 11th-edition total: 675 points',{exact:true})).toBeVisible();
  await cannon.selectOption('Thermal cannon');
  await expect(page.getByText('Recorded 11th-edition total: 660 points',{exact:true})).toBeVisible();
});

test('a 1,000-point Knight lance keeps its Warlord and prints the right firing and reserve reminders',async({page})=>{
  await page.goto('./');
  await page.getByLabel('Army faction').selectOption('Imperial Knights');
  await page.getByLabel('2026 battle size').selectOption('Incursion');
  await page.getByRole('checkbox',{name:/Valourstrike Lance/}).check();
  for(const name of ['Knight Errant','Knight Gallant','Armiger Warglaive','Armiger Moirax']){
    await page.getByLabel('Select unit',{exact:true}).selectOption(name);
    await page.getByRole('button',{name:'Add',exact:true}).click();
  }
  await page.getByLabel('Warlord',{exact:true}).selectOption('Knight Errant#1');
  await expect(page.getByText('Recorded 11th-edition total: 1000 points',{exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('Knight Errant#1');
  await page.getByRole('button',{name:'Play reminders'}).click();
  await page.getByLabel('Show phase').selectOption('Movement');
  const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
  const overwatch=panel.locator('.check').filter({has:page.getByText('Fire Overwatch · 1CP',{exact:true})});
  await expect(overwatch.locator('.rule-subjects')).toContainText('Armiger Moirax#1');
  await expect(overwatch.locator('.rule-subjects')).toContainText('Armiger Warglaive#1');
  await expect(overwatch.locator('.rule-subjects')).not.toContainText('Knight');
  await expect(overwatch).toContainText('Opponent’s turn · end');
  await page.emulateMedia({media:'print'});
  const print=page.getByRole('region',{name:'Printable army reminders'});
  await expect(print.locator('h3')).toHaveCount(11);
  await expect(print.getByText('Declare Strategic Reserves',{exact:true}).locator('..')).toContainText('500 points');
  await expect(print.getByText('Plunging Fire · Towering models',{exact:true}).locator('..').locator('.rule-subjects')).toHaveText('Roster: Knight Errant#1, Knight Gallant#1');
  await expect(print.getByText('Use Bondsman abilities',{exact:true})).toBeVisible();
});

test('saved Knight turn-boundary checkmarks remain independent and print at the proper steps',async({page})=>{
  await page.goto('./');
  await page.getByLabel('Army faction').selectOption('Imperial Knights');
  await page.getByRole('checkbox',{name:/Questoris Companions/}).check();
  await page.getByLabel('Select unit',{exact:true}).selectOption('Knight Paladin');
  await page.getByRole('button',{name:'Add',exact:true}).click();
  await page.evaluate(()=>{
    const key='w40k-reminders-profiles-v1',store=JSON.parse(localStorage.getItem(key)!);
    const army=store.profiles.find((p:{id:string})=>p.id===store.activeId);
    for(const [window,id] of [['Command','heroes'],['Fight','deed']]){
      army.completed.push('sheet:'+JSON.stringify([window,'11e-knight-'+id+'-'+window,['Knight Paladin#1']]));
    }
    localStorage.setItem(key,JSON.stringify(store));
  });
  await page.reload();
  await page.getByRole('button',{name:'Play reminders'}).click();
  const digital=page.getByRole('heading',{name:'Phase reminders'}).locator('..');
  await digital.getByLabel('Show completed reminders').check();
  await digital.getByLabel('Show phase').selectOption('Start of turn');
  await expect(digital.getByRole('checkbox',{name:/Heroes of Legend/})).toBeChecked();
  await digital.getByLabel('Show phase').selectOption('End of your turn');
  await expect(digital.getByRole('checkbox',{name:/Lay Low the Tyrant/})).toBeChecked();
  await digital.getByLabel('Show phase').selectOption('End of opponent turn');
  await expect(digital.getByRole('checkbox',{name:/Lay Low the Tyrant/})).not.toBeChecked();
  await page.emulateMedia({media:'print'});
  const print=page.locator('.print-sheet');
  await expect(print.getByRole('heading',{name:'Start of turn',exact:true}).locator('..').getByText('Heroes of Legend',{exact:true})).toBeVisible();
  await expect(print.getByRole('heading',{name:'Fight',exact:true}).locator('..').getByText('Code Chivalric · Lay Low the Tyrant',{exact:true})).toHaveCount(0);
});
