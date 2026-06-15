import { readFileSync } from "node:fs";
const mod = await WebAssembly.compile(readFileSync(new URL("../build/rt.wasm", import.meta.url)));
const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
const enc = new TextEncoder(), dec = new TextDecoder();
const writeBuf = (allocName, s) => { const b = enc.encode(s); const p = ex[allocName](b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); };
const setCatalog = (names, weights) => { writeBuf("names_alloc", names.join("\n")); writeBuf("weights_alloc", weights.join("\n")); };
const setCandidates = (c) => writeBuf("candidates_alloc", c.join("\n"));
const pick = (v) => { const len = ex.pick_candidate_resolve(v); const p = ex.out_ptr(); return dec.decode(new Uint8Array(ex.memory.buffer, Number(p), Number(len))); };
const milli = (x) => Math.round(x * 1000);
let ok = true; const ck = (c, m) => { if (!c) { console.error("FAIL " + m); ok = false; } };

const names = ["pivot-to-economy", "meta-ai-tease", "list-parody", "direct", "callback-world-asset"];
const weights = [0.7, 1.1, 1.0, 0.5, 1.2];
setCatalog(names, weights);
ck(ex.count() === 5, "count 5");
ck(ex.argmax_weight() === 4, "argmax 4");
ck(milli(ex.total_weight()) === 4500, "total 4.5");
ck(ex.pick_by_value(0.0) === 0, "pick_by_value lo");
ck(ex.pick_by_value(0.99) === 4, "pick_by_value hi");

setCandidates(["meta-ai-tease", "list-parody"]);
ck(pick(0.4) === "meta-ai-tease", "pick_lo: " + pick(0.4));
ck(pick(0.9) === "list-parody", "pick_hi: " + pick(0.9));

setCandidates(["unknown-x"]);
ck(pick(0.5) === "", "unknown candidate → empty");

// 多重読み: 同じカタログ/候補で pick を複数回 + total を挟んでも安定 (almide#690)
setCandidates(["direct", "list-parody"]);
const a = pick(0.1); ex.total_weight(); const b = pick(0.1);
ck(a === b && a !== "", "multi-read pick stable: " + a);

console.log(ok ? "wasm OK — transform catalog + weighted pick match native" : "FAIL"); if (!ok) process.exit(1);
