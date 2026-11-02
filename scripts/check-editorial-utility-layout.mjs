import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("fursay-optimized-site/css/editorial-20261102-v1.css", "utf8");
const navScript = readFileSync("fursay-optimized-site/js/editorial-nav-20261102-v1.js", "utf8");
const mobile = css.slice(css.lastIndexOf("@media(max-width:900px)"));
assert.match(mobile, /body\.picture-world #mainNav\{height:auto!important;flex-wrap:wrap!important\}/);
assert.doesNotMatch(mobile, /#mainNav[^}]*position\s*:/);
assert.match(mobile, /body\.picture-world \.editorial-utility-links[^}]*position:static;[^}]*flex:1 0 100%;[^}]*flex-wrap:wrap/);
assert.match(mobile, /body\.picture-world \.hero,body\.picture-world\.world-home \.hero,body\.picture-world\.world-koko \.hero,body\.picture-world\.world-arabic \.hero\{margin-top:max\(76px,calc\(var\(--editorial-nav-height, 0px\) \+ 40px\)\)!important\}/);
assert.match(navScript, /ResizeObserver\(measure\)\.observe\(nav\)/);
assert.match(navScript, /addEventListener\('resize',measure\)/);
assert.match(navScript, /measure\(\);if\(window\.ResizeObserver\)/);
console.log("Editorial utility navigation flow contract passed.");
