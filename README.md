# fizz-response-transformer

kotodama の **応答変換カタログ + 重み付き選択**。Almide 1 コアを native + wasm へ。
openaituber `kotodama/personae/*/transforms.json` のカタログ照合・選択を切り出した単一責任部品(§10)。

persona の transforms(`name / weight / renderer_hint …`)をカタログとして扱い、
[fizz-trigger-matcher](https://github.com/aiviecast/fizz-trigger-matcher) が出した候補から **weight に基づいて 1 つ選ぶ**。

> **実際の変換テキスト生成は LLM**(選ばれた transform の `renderer_hint` がプロンプトを誘導)= host の責務。
> ここはカタログ照合・weight 正規化・候補からの決定的選択だけを担う。

カタログは**ペルソナ別データ**なので埋め込まず、`names` / `weights` の並行リストで受け取る。

## API

| 関数 | 説明 |
|---|---|
| `count(names)` / `index_of(names, name)` / `is_known(names, name)` | カタログ照合 |
| `weight_of(names, weights, name)` | weight 取得(未知 -1.0) |
| `total_weight(weights)` / `normalize(weights)` | 合計 / 0..1 正規化(合計 1.0) |
| `argmax_weight(weights)` | 最大 weight の index(先勝ち) |
| `pick_by_value(weights, value01)` | 累積 weight 選択(value01 ∈ [0,1) を weight 比率で index に) |
| `pick_candidate(names, weights, candidates, value01)` | 候補から weight 付き選択した transform 名(無ければ "") |

`pick_*` は決定的(value01 を渡す側が乱数 or 固定値を選ぶ)。

## wasm 境界

host が 3 バッファに書く: カタログ名(改行区切り)/ weight(改行区切りの数値)/ 候補名(改行区切り)。
`from_list(to_list)` コピー経由で文字列化(almide#690 回避)。選択結果は `out_ptr` で読む。
例: [`browser/transform-driver.js`](browser/transform-driver.js)。

## ビルド / テスト

```sh
almide test spec/response_transformer_test.almd
almide build src/main.almd -o build/fizz-response-transformer
almide build src/bridge.almd --target wasm -o build/rt.wasm
node test/wasm-smoke.mjs
```

Almide v0.27.7 で native / wasm とも green。
