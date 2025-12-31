import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = 3000;

app.get("/status/:slug", async (req, res) => {
  const slug = req.params.slug;
  const url = `https://chargefinder.com/de/stromtankstelle-eschborn-taunus-lidl-filiale-eschborn/${slug}`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent: "Mozilla/5.0",
      locale: "de-DE",
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    const text = await page.evaluate(() => document.body.innerText || "");

    // "3 / 6" gibi oranları yakala
    const matches = [...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)].map(m => ({
      available: Number(m[1]),
      total: Number(m[2]),
    }));

    res.json({
      ok: true,
      slug,
      fetchedAt: new Date().toISOString(),
      ratiosFound: matches,
      totalConnectors: matches.reduce((s, x) => s + x.total, 0),
      availableConnectors: matches.reduce((s, x) => s + x.available, 0),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
