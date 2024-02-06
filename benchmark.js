import { Store } from './lib/store.js';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

Store.wasmModule = await WebAssembly.compile(
  await readFile(join(dirname(fileURLToPath(import.meta.url)), `lib/store.wasm`)),
);

/**
 * @param {number} embeddingSize
 * @param {number} documentCount
 */
async function main(embeddingSize, documentCount) {
  const state = Store.prepareState(createRandomEntries(embeddingSize, documentCount));
  const store = await Store.create(state.init);

  store.documentEmbeddings.set(state.documentEmbeddings);
  store.queryEmbedding.set(createRandomEmbedding(embeddingSize));

  const startTime = performance.now();
  const queryCount = 1000;

  for (let index = 0; index < queryCount; index += 1) {
    store.performQuery();
  }

  const totalTime = performance.now() - startTime;

  console.log(totalTime / queryCount, `ms`);
}

await main(768, 10000);

/**
 * @param {number} embeddingSize
 * @param {number} documentCount
 * @returns {import('./src/store.js').StoreEntry<string>[]}
 */
function createRandomEntries(embeddingSize, documentCount) {
  const entries = new Array(documentCount);

  for (let index = 0; index < entries.length; index += 1) {
    entries[index] = {
      document: String(index),
      documentEmbedding: createRandomEmbedding(embeddingSize),
    };
  }

  return entries;
}

/**
 * @param {number} embeddingSize
 * @returns {Float32Array}
 */
function createRandomEmbedding(embeddingSize) {
  const embedding = new Float32Array(embeddingSize);

  for (let index = 0; index < embedding.length; index += 1) {
    embedding[index] = Math.random();
  }

  return embedding;
}
