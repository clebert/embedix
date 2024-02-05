import { Store } from './lib/mod.js';
import { readFile } from 'node:fs/promises';

Store.wasmModule = await WebAssembly.compile(await readFile(`./lib/store.wasm`));

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
