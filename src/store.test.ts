import { beforeAll, describe, expect, test } from '@jest/globals';
import { dirname, join } from 'node:path';
import { Store } from './store.js';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

describe(`Store`, () => {
  beforeAll(async () => {
    Store.wasmModule = await WebAssembly.compile(
      await readFile(join(dirname(fileURLToPath(import.meta.url)), `../lib/store.wasm`)),
    );
  });

  test(`performQuery()`, async () => {
    const state = Store.prepareState([
      { document: `bar`, documentEmbedding: [4, 5, 6] },
      { document: `qux`, documentEmbedding: [-1, -2, -3] },
      { document: `foo`, documentEmbedding: [2, 4, 6] },
      { document: `baz`, documentEmbedding: [6, -3, 0] },
    ]);

    const store = await Store.create(state.init);

    store.documentEmbeddings.set(state.documentEmbeddings);
    store.queryEmbedding.set([1, 2, 3]);

    let queryResults = store.performQuery();

    expect(queryResults).toHaveLength(4);
    expect(queryResults[0]?.document).toBe(`foo`);
    expect(queryResults[0]?.distance).toBeCloseTo(0, 3);
    expect(queryResults[1]?.document).toBe(`bar`);
    expect(queryResults[1]?.distance).toBeCloseTo(0.025, 3);
    expect(queryResults[2]?.document).toBe(`baz`);
    expect(queryResults[2]?.distance).toBeCloseTo(1, 3);
    expect(queryResults[3]?.document).toBe(`qux`);
    expect(queryResults[3]?.distance).toBeCloseTo(2, 3);

    queryResults = store.performQuery({ documentCount: 2 });

    expect(queryResults).toHaveLength(2);
    expect(queryResults[0]?.document).toBe(`foo`);
    expect(queryResults[1]?.document).toBe(`bar`);
  });

  test(`prepareState()`, () => {
    expect(() => Store.prepareState([])).toThrow(`unknown embedding size`);

    expect(() =>
      Store.prepareState([
        { document: `foo`, documentEmbedding: [1, 2, 3] },
        { document: `bar`, documentEmbedding: [4, 5] },
      ]),
    ).toThrow(`illegal embedding size`);
  });
});
