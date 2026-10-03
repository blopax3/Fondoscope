const assert = require('node:assert/strict');
const { test, expect } = require('@playwright/test');

async function mockFunds(page) {
    await page.route('**/api/funds', async (route) => {
      const submitted = route.request().postDataJSON();
      await route.fulfill({ json: { errors: [], funds: submitted.entries.map((entry, index) => ({
        ...entry, currency: index === 7 ? 'USD' : 'EUR',
        name: `Fondo de prueba ${index + 1} con nombre largo y clase de acumulación`,
        metadata: { provider: index === 0 ? 'yahoo' : 'morningstar' },
        history: Array.from({ length: 100 }, (_, day) => ({
          date: new Date(Date.UTC(2026, 4, day + 1)).toISOString().slice(0, 10),
          price: 100 + day * 0.2 + Math.sin(day / (index + 1)),
        })).slice(index === 1 ? 20 : 0),
      })) } });
    });
}

test('Asset search, saved comparisons, matrix and start link', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const isins = Array.from({ length: 8 }, (_, index) => {
      const base = `IE${String(index).padStart(9, '0')}`;
      const digits = [...base].map((char) => parseInt(char, 36).toString()).join('');
      const sum = [...digits].reverse().reduce((total, char, index) => {
        const digit = Number(char) * (index % 2 ? 1 : 2);
        return total + Math.floor(digit / 10) + digit % 10;
      }, 0);
      return base + ((10 - sum % 10) % 10);
    });
    let submitted;
    await mockFunds(page);
    page.on('request', (request) => { if (request.url().endsWith('/api/funds')) submitted = request.postDataJSON(); });
    await page.route('**/api/search?**', async (route) => {
      const query = new URL(route.request().url()).searchParams.get('q');
      const index = Number(query.replace('fund ', ''));
      const yahoo = query === 'apple';
      await route.fulfill({ json: { results: [{
        identifier: yahoo ? 'AAPL' : isins[index],
        name: yahoo ? 'Apple Inc.' : `Fondo de prueba ${index + 1}`,
        type: yahoo ? 'EQUITY' : 'FUND',
        currency: yahoo ? '' : 'EUR',
        morningstarId: yahoo ? '' : `F00000000${index}`,
        exchange: yahoo ? 'NASDAQ' : '',
        provider: yahoo ? 'yahoo' : 'morningstar',
      }] } });
    });
    await page.goto('/');
    const input = page.locator('#asset-search');
    const submit = page.getByRole('button', { name: 'Consultar', exact: true });
    for (let index = 0; index < 7; index += 1) {
      await input.fill(`fund ${index}`);
      await page.getByRole('option').click();
    }
    await input.fill('Apple');
    await page.getByRole('option').waitFor();
    await input.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.fund-entry').length === 8);
    assert.equal(await input.isDisabled(), true);
    await submit.click();
    await expect(page.locator('.fund-card')).toHaveCount(8);
    assert.equal(submitted.entries[7].isin, 'AAPL');
    assert.equal(submitted.entries[7].yahooSymbol, 'AAPL');
    assert.equal('currency' in submitted.entries[7], false);
    assert.equal(submitted.entries[0].morningstarId, 'F000000000');
    assert.match(await page.locator('.fund-entry__source').first().innerText(), /Yahoo Finance/);
    await page.getByRole('button', { name: 'Guardar comparación', exact: true }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fondoscope.savedPortfolios.v1')));
    assert.equal(saved[0].entries[7].yahooSymbol, 'AAPL');
    assert.equal('currency' in saved[0].entries[7], false);
    assert.equal(saved[0].entries[0].morningstarId, 'F000000000');
    assert.equal(saved[0].entries[0].currency, 'EUR');
    assert.equal(saved[0].rangeKey, '1Y');
    assert.equal(saved[0].commonPeriod, true);
    assert.equal(JSON.parse(new URL(page.url()).searchParams.get('entries'))[0].morningstarId, 'F000000000');
    await page.reload();
    await page.locator('.fund-entry__source').first().waitFor();
    assert.equal(submitted.entries[0].morningstarId, 'F000000000');
    assert.equal(await page.locator('.fund-entry').count(), 8);
    await page.getByRole('button', { name: 'Comparar fondos', exact: true }).click();
    assert.equal(await page.getByLabel('Periodo común').isChecked(), true);
    assert.match(await page.locator('.comparison-period-coverage').innerText(), /21 may 2026/i);
    const scroller = page.locator('.correlation-matrix-panel__scroller');
    await scroller.scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.correlation-matrix tbody td').count(), 64);
    for (const theme of ['dark', 'light']) {
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
      await scroller.evaluate((element) => { element.scrollLeft = 350; });
      await page.waitForTimeout(200);
      const target = page.locator('.correlation-matrix tbody tr').nth(2).locator('td').nth(3);
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await target.hover();
      await page.waitForTimeout(200);
      const header = page.locator('.correlation-matrix tbody th.is-highlighted');
      assert.equal(await header.count(), 1);
      const style = await header.evaluate((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return { background: style.backgroundColor, image: style.backgroundImage,
          topmost: element.contains(document.elementFromPoint(box.right - 10, box.top + box.height / 2)) };
      });
      assert.match(style.background, /^rgb\(/);
      assert.equal(style.image, 'none');
      assert.equal(style.topmost, true);
      await scroller.screenshot({ path: `/tmp/fondoscope-correlation-${theme}.png` });
      await scroller.evaluate((element) => { element.scrollLeft += 30; });
      await page.waitForFunction(() => !document.querySelector('.correlation-matrix .is-highlighted'));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await scroller.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const stickyWidth = await page.locator('.correlation-matrix tbody th').first().evaluate((element) => element.getBoundingClientRect().width);
    assert.ok(stickyWidth <= 160);
    await scroller.screenshot({ path: '/tmp/fondoscope-correlation-mobile.png' });
    assert.deepEqual(errors, []);
    console.log('UI OK: asset search, keyboard selection, Morningstar/Yahoo routing, portfolio/URL persistence, matrix hover and mobile overflow.');
    await page.getByRole('button', { name: 'Cambiar a tema claro', exact: true }).click();
    await page.getByRole('link', { name: 'Fondoscope — volver al inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.fund-entry')).toHaveCount(0);
    await expect(page.locator('.fund-card')).toHaveCount(0);
    await expect(page.locator('.empty-analysis')).toBeVisible();
    await expect(input).toHaveValue('');
    await expect(input).toBeEnabled();
    await expect(submit).toBeDisabled();
    await expect(page.locator('.portfolio-item')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

// Both blocked writes and a full quota must leave saved records consistent with storage.
test('Storage failures are shown when saving or deleting portfolios', async ({ page }) => {
  await mockFunds(page);
  await page.goto('/?identifiers=AAPL');
  await expect(page.locator('.fund-card')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar comparación', exact: true }).click();
  await expect(page.locator('.portfolio-item')).toHaveCount(1);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
  });
  await page.getByLabel('Nombre de cartera (opcional)').fill('Not saved');
  await page.getByRole('button', { name: 'Guardar comparación', exact: true }).click();
  await expect(page.locator('.banner--error')).toHaveText('No se pudo guardar la cartera local.');
  await expect(page.locator('.portfolio-item')).toHaveCount(1);
  await page.locator('.portfolio-item__delete').click();
  await expect(page.locator('.banner--error')).toHaveText('No se pudo eliminar la cartera guardada.');
  await expect(page.locator('.portfolio-item')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.portfolio-item')).toHaveCount(1);
});

test('Strict Mode loads shared links and preserves theme in development', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fondoscope-theme', 'light'));
  await mockFunds(page);
  const entries = encodeURIComponent(JSON.stringify([{ isin: 'AAPL', currency: 'USD', yahooSymbol: 'AAPL' }]));
  await page.goto(`/?entries=${entries}&range=6M&common=0`);
  await expect(page.locator('.fund-card')).toBeVisible();
  await expect(page.locator('.fund-entry')).toHaveCount(1);
  await expect(page.locator('.loading-overlay')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  assert.equal(new URL(page.url()).searchParams.get('range'), '6M');
  assert.equal(new URL(page.url()).searchParams.get('common'), '0');
});
