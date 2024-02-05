export class Store<TDocument> {
  static wasmModule?: WebAssembly.Module;

  static async create<TDocument>(init: StoreInit<TDocument>): Promise<Store<TDocument>> {
    return new Store(init, await WebAssembly.instantiate(this.wasmModule!));
  }

  static prepareState<TDocument>(entries: readonly StoreEntry<TDocument>[]): StoreState<TDocument> {
    const embeddingSize = entries[0]?.documentEmbedding.length;

    if (!embeddingSize) {
      throw new Error(`unknown embedding size`);
    }

    const documents = new Array(entries.length);
    const documentEmbeddings = new Float32Array(entries.length * embeddingSize);

    entries.forEach(({ document, documentEmbedding }, index) => {
      if (documentEmbedding.length !== embeddingSize) {
        throw new Error(`illegal embedding size`);
      }

      documents[index] = document;
      documentEmbeddings.set(documentEmbedding, index * embeddingSize);
    });

    return { init: { embeddingSize, documents }, documentEmbeddings };
  }

  readonly documentEmbeddings: Float32Array;
  readonly queryEmbedding: Float32Array;

  readonly #backendPtr: number;
  readonly #indexes: Int32Array;
  readonly #distances: Float32Array;
  readonly #documents: readonly TDocument[];
  readonly #wasmInstance: WebAssembly.Instance;

  private constructor(
    { embeddingSize, documents }: StoreInit<TDocument>,
    wasmInstance: WebAssembly.Instance,
  ) {
    const { memory, create, getDocumentEmbeddingsPtr, getQueryEmbeddingPtr, getQueryResultsPtr } =
      wasmInstance.exports as WasmExports;

    const backendPtr = create(embeddingSize, documents.length);

    this.documentEmbeddings = new Float32Array(
      memory.buffer,
      getDocumentEmbeddingsPtr(backendPtr),
      documents.length * embeddingSize,
    );

    this.queryEmbedding = new Float32Array(
      memory.buffer,
      getQueryEmbeddingPtr(backendPtr),
      embeddingSize,
    );

    this.#backendPtr = backendPtr;

    this.#indexes = new Int32Array(
      memory.buffer,
      getQueryResultsPtr(backendPtr),
      documents.length * 2,
    );

    this.#distances = new Float32Array(
      memory.buffer,
      getQueryResultsPtr(backendPtr),
      documents.length * 2,
    );

    this.#documents = documents;
    this.#wasmInstance = wasmInstance;
  }

  performQuery({
    documentCount = this.#documents.length,
  }: StoreQueryOptions = {}): StoreQueryResult<TDocument>[] {
    const { performQuery } = this.#wasmInstance.exports as WasmExports;

    performQuery(this.#backendPtr);

    const queryResults = new Array<StoreQueryResult<TDocument>>(documentCount);

    for (let index = 0; index < documentCount; index += 1) {
      queryResults[index] = {
        document: this.#documents[this.#indexes[index * 2]!]!,
        distance: this.#distances[index * 2 + 1]!,
      };
    }

    return queryResults;
  }
}

export interface StoreInit<TDocument> {
  readonly embeddingSize: number;
  readonly documents: readonly TDocument[];
}

export interface StoreEntry<TDocument> {
  readonly document: TDocument;
  readonly documentEmbedding: readonly number[] | Float32Array;
}

export interface StoreState<TDocument> {
  init: { embeddingSize: number; documents: TDocument[] };
  documentEmbeddings: Float32Array;
}

export interface StoreQueryOptions {
  readonly documentCount?: number;
}

export interface StoreQueryResult<TDocument> {
  document: TDocument;
  distance: number;
}

interface WasmExports extends WebAssembly.Exports {
  readonly memory: WebAssembly.Memory;

  create(embeddingSize: number, documentCount: number): number;
  getDocumentEmbeddingsPtr(backendPtr: number): number;
  getQueryEmbeddingPtr(backendPtr: number): number;
  getQueryResultsPtr(backendPtr: number): number;
  performQuery(backendPtr: number): void;
}
