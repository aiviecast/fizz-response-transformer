// transform-driver.js — kotodama analyzer / ブラウザのグルー例。
// カタログ照合 + 重み付き選択 = Almide(wasm)、transforms.json 読込・LLM 生成 = host。
export async function loadResponseTransformer(wasmUrl) {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const mod = await WebAssembly.compile(bytes);
  const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
  const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
  const enc = new TextEncoder(), dec = new TextDecoder();
  const writeBuf = (allocName, s) => { const b = enc.encode(s); const p = ex[allocName](b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); };
  // catalog = transforms.json の transforms: [{name, weight, ...}]
  const setCatalog = (catalog) => {
    writeBuf("names_alloc", catalog.map((t) => t.name).join("\n"));
    writeBuf("weights_alloc", catalog.map((t) => t.weight ?? 1.0).join("\n"));
  };
  return {
    count(catalog) { setCatalog(catalog); return ex.count(); },
    argmaxWeight(catalog) { setCatalog(catalog); return ex.argmax_weight(); },
    totalWeight(catalog) { setCatalog(catalog); return ex.total_weight(); },
    // candidates(trigger-matcher の出力)から weight に基づき 1 つ選ぶ。value01 ∈ [0,1)。
    // 適用(テキスト生成)は LLM 側 — ここで選ばれた transform の renderer_hint をプロンプトに使う。
    pickCandidate(catalog, candidates, value01) {
      setCatalog(catalog);
      writeBuf("candidates_alloc", candidates.join("\n"));
      const len = ex.pick_candidate_resolve(value01); const p = ex.out_ptr();
      return dec.decode(new Uint8Array(ex.memory.buffer, Number(p), Number(len)));
    },
  };
}
