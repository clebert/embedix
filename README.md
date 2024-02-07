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

## AWS Lambda: Best Practices

Embedix is designed to operate seamlessly within an AWS Lambda Node.js environment. The primary
focus is on reducing the cold start time by serializing the state prepared with the
`Store.prepareState` function into two separate files. The resulting first file should comprise the
`init` state in JSON format. This will facilitate rapid store initialization within the Lambda
function. Simultaneously, a second file should encapsulate the `documentEmbeddings` state - a
Float32Array - saved as a binary file. This is designed to be directly loaded into the
`store.documentEmbeddings` Float32Array. As a best practice, it is recommended to use the Node.js
[`filehandle.read([options])`](https://nodejs.org/api/fs.html#filehandlereadoptions) function to
avoid redundant byte duplication at runtime.

It is also advisable to declare the store as a module scope variable outside of the handler function
and initialize it lazily on the first handler call. This enables the reuse of the store instance for
subsequent calls as long as the Lambda function remains warm.

## Performance

All results presented are based on the average of 1,000 query repetitions.

| System                     | Node.js | Query Duration | Embedding Size | Document Count |
| -------------------------- | ------- | -------------- | -------------- | -------------- |
| Apple M1 Pro               | v20     | 2.35 ms        | 768            | 10,000         |
| Apple M1 Pro               | v20     | 28.11 ms       | 768            | 100,000        |
| Apple M1 Pro               | v20     | 32.36 ms       | 1,000          | 100,000        |
| AWS Lambda (x86/1,769 MB)  | v20     | 5.94 ms        | 768            | 10,000         |
| AWS Lambda (x86/10,240 MB) | v20     | 5.21 ms        | 768            | 10,000         |
| AWS Lambda (ARM/1,769 MB)  | v20     | 8.70 ms        | 768            | 10,000         |

**Note:** At 1,769 MB, an AWS Lambda function has the equivalent of one vCPU.
