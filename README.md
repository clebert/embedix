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

All results presented are based on the average of 1000 query repetitions.

| System                    | Node.js | Query Duration | Embedding Size | Document Count |
| ------------------------- | ------- | -------------- | -------------- | -------------- |
| Apple M1 Pro              | v20     | 2.35 ms        | 768            | 10,000         |
| Apple M1 Pro              | v20     | 28.11 ms       | 768            | 100,000        |
| Apple M1 Pro              | v20     | 32.36 ms       | 1000           | 100,000        |
| AWS Lambda (x86/1,769 MB) | v20     | 5.94 ms        | 768            | 10,000         |
| AWS Lambda (ARM/1,769 MB) | v20     | 8.70 ms        | 768            | 10,000         |

**Note:** At 1,769 MB, an AWS Lambda function has the equivalent of one vCPU.
