import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Step 1: Main Page par jana
    await page.goto('https://game.denver69.fun/Jtv/', { waitUntil: 'networkidle2' });

    // Step 2: Check for "Manage Token" or "Delete"
    const needsDelete = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      // Check agar 'Manage' ya 'Delete' jaisa kuch likha hai
      return links.some(el => el.innerText.toLowerCase().includes('manage') || el.innerText.toLowerCase().includes('delete'));
    });

    if (needsDelete) {
      // Agar Manage option hai toh uspar click karo
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const target = links.find(el => el.innerText.toLowerCase().includes('manage') || el.innerText.toLowerCase().includes('delete'));
        if (target) target.click();
      });
      await new Promise(r => setTimeout(r, 2000)); // Delete action process hone ka wait
      
      // Delete karne ke baad wapas main page par aana agar auto-redirect nahi hua
      await page.goto('https://game.denver69.fun/Jtv/', { waitUntil: 'networkidle2' });
    }

    // Step 3: "Generate Game Token" par click karna
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const genBtn = links.find(el => el.innerText.includes('Generate Game Token'));
      if (genBtn) genBtn.click();
    });

    // Step 4: Wait for Dashboard/M3U source to appear
    // Yahan hum 5-7 second wait karenge taaki server process karle
    await new Promise(r => setTimeout(r, 6000)); 

    // Step 5: Final Source nikalna
    const finalSource = await page.content();

    // Output for debugging
    res.status(200).send(`
      <div style="background:#000; color:#0f0; padding:20px; font-family:monospace;">
        <h2>--- DASHBOARD SOURCE START ---</h2>
        <pre>${finalSource.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        <h2>--- DASHBOARD SOURCE END ---</h2>
      </div>
    `);

  } catch (error) {
    res.status(500).json({ error: "Automation Failed", message: error.message });
  } finally {
    if (browser !== null) await browser.close();
  }
}
