# 測量工具

這兩個手動工具分別記錄行動版 CSS 載入與涵蓋率，以及公開頁面的技術 SEO 基準；不會提交表單或操作購買連結。執行環境需有 Node.js、專案既有的 Playwright 與 Chromium。這些指令會連線至公開網站。

```sh
node scripts/measure/css-waterfall.mjs --runs 3 --out /tmp/fursay-css.json
node scripts/measure/css-waterfall.mjs --slow3g https://fursay.com/koko
node scripts/measure/seo-baseline.mjs --out /tmp/fursay-seo.json
```

CSS 工具每次建立新瀏覽器環境，分開記錄停用快取的載入與先填入快取後的暖快取載入；`--slow3g` 才會套用網路模擬，CPU 不限速。SEO 路徑取自網站結構清單；每個 HTTP 請求（含重新導向）至少間隔 500 毫秒。使用 `--help` 查看選項。

結果需在相同裝置、網路、快取及測量條件下，以多次結果的中位數比較後，才能用於效能判斷；單次結果不是效能宣稱。工具不收集兒童資料或電子郵件。

- [2026-11-04 FUR-010／FUR-011 基準報告](2026-11-04-baseline.md)
