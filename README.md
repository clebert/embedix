# Embedix

> A simple vector store written in TypeScript with a WASM backend.

## Installation

```sh
npm install embedix
```

## Usage Example

```js
import { Store } from 'embedix';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

Store.wasmModule = await WebAssembly.compile(
  await readFile(fileURLToPath(import.meta.resolve(`embedix/store.wasm`))),
);

const state = Store.prepareState([
  { document: `bar`, documentEmbedding: [4, 5, 6] },
  { document: `qux`, documentEmbedding: [-1, -2, -3] },
  { document: `foo`, documentEmbedding: [2, 4, 6] },
  { document: `baz`, documentEmbedding: [6, -3, 0] },
]);

const store = await Store.create(state.init);

store.documentEmbeddings.set(state.documentEmbeddings);
store.queryEmbedding.set([1, 2, 3]);

const queryResults = store.performQuery();

console.log(queryResults);
```

```json
[
  { "document": "foo", "distance": 0 },
  { "document": "bar", "distance": 0.025368094444274902 },
  { "document": "baz", "distance": 1 },
  { "document": "qux", "distance": 2 }
]
```

## Performance

In benchmark tests conducted on an **Apple M1 Pro**, involving embedding vectors of size **768** and
**10,000** documents, **Embedix** was able to perform a single query in approximately **4**
milliseconds.

```sh
npm start
```

```sh
4.314375042915344 ms
```
