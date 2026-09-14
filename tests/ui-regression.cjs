// Run with a local server and PLAYWRIGHT_MODULE pointing to an installed playwright package.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'es-ES' });
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
    await page.route('**/api/funds', async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ json: { errors: [], funds: submitted.entries.map((entry, index) => ({
        ...entry, currency: index === 7 ? 'USD' : 'EUR',
        name: `Fondo de prueba ${index + 1} con nombre largo y clase de acumulación`,
        metadata: { provider: index === 0 ? 'yahoo' : 'morningstar' },
        history: Array.from({ length: 100 }, (_, day) => ({
          date: new Date(Date.UTC(2026, 4, day + 1)).toISOString().slice(0, 10),
          price: 100 + day * 0.2 + Math.sin(day / (index + 1)),
        })),
      })) } });
    });
    await page.goto('http://127.0.0.1:3000');
    const input = page.locator('#fund-identifiers');
    const submit = page.getByRole('button', { name: 'Consultar', exact: true });
    for (const invalid of ['https://www.morningstar.es/0P0001CLDK', 'IE00B4L5Y984']) {
      await input.fill(invalid);
      assert.equal(await submit.isDisabled(), true);
    }
    await input.fill([isins.slice(0, 7), 'aapl'].flat().join('\n'));
    await page.locator('.fund-entry').last().waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.fund-entry').length === 8);
    await submit.click();
    await page.locator('.fund-entry__source').first().waitFor();
    assert.equal(submitted.entries[7].isin, 'AAPL');
    assert.equal(submitted.entries[7].yahooSymbol, 'AAPL');
    assert.equal('currency' in submitted.entries[7], false);
    assert.match(await page.locator('.fund-entry__source').first().innerText(), /Yahoo Finance/);
    await page.getByRole('button', { name: 'Guardar comparación', exact: true }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fondoscope.savedPortfolios.v1')));
    assert.equal(saved[0].entries[7].yahooSymbol, 'AAPL');
    assert.equal('currency' in saved[0].entries[7], false);
    await page.reload();
    await page.locator('.fund-entry__source').first().waitFor();
    assert.equal(await page.locator('#fund-identifiers').inputValue(), [...isins.slice(0, 7), 'AAPL'].join('\n'));
    await page.getByRole('button', { name: 'Comparar fondos', exact: true }).click();
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
    console.log('UI OK: mixed ISIN/Yahoo input, validation, portfolio/URL persistence, 8-asset matrix hover and scroll, both themes, mobile overflow.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
