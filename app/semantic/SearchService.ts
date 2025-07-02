import { pipeline, type Pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';
import { filesStore, type FileMap } from '~/lib/stores/files'; // To access all files
import { cosineSimilarity } from '~/utils/vectorMath'; // For similarity calculation
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('SearchService');

const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
// const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'; // Alternative naming if needed

interface Chunk {
  text: string;
  embedding: number[];
  // Optionally, store start/end character offsets or line numbers for precise location
  // startLine?: number;
  // endLine?: number;
}

interface FileEmbeddingData {
  filePath: string;
  chunks: Chunk[];
  lastIndexedTimestamp?: number; // To potentially avoid re-indexing unchanged files
}

export interface SearchResult {
  filePath: string;
  chunkText: string;
  score: number; // Cosine similarity score
  // startLine?: number; // If available from chunk
}

// Simple text splitting function (can be improved)
function splitIntoChunks(text: string, chunkSize = 256, overlap = 30): string[] {
  const sentences = text.split(/(?<=[.?!])\s+/); // Split by sentences
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Start new chunk with overlap from previous sentence if current chunk was not just this sentence
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText.includes(sentence) ? sentence : overlapText + " " + sentence;
    } else {
      currentChunk += (currentChunk.length > 0 ? " " : "") + sentence;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  // Fallback if sentence splitting results in no chunks or very large chunks
  if (chunks.length === 0 || chunks.some(c => c.length > chunkSize * 1.5)) {
    logger.warn("Sentence splitting resulted in large or no chunks, falling back to fixed size split for a file.");
    const fixedChunks: string[] = [];
    for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
        fixedChunks.push(text.substring(i, i + chunkSize));
    }
    return fixedChunks.filter(c => c.trim().length > 10); // Ensure chunks have some substance
  }

  return chunks.filter(c => c.trim().length > 10);
}


class SearchServiceSingleton {
  private embeddingPipeline: Promise<FeatureExtractionPipeline | null> | null = null;
  private fileEmbeddings: Map<string, FileEmbeddingData> = new Map();
  private isIndexing = false;

  constructor() {
    this.initEmbeddingPipeline();
  }

  private async initEmbeddingPipeline(): Promise<void> {
    if (!this.embeddingPipeline) {
      logger.info('Initializing sentence-transformer embedding pipeline...');
      this.embeddingPipeline = pipeline('feature-extraction', EMBEDDING_MODEL, { quantized: true })
        .then(pipe => {
          logger.info('Embedding pipeline loaded successfully.');
          return pipe as FeatureExtractionPipeline;
        })
        .catch(error => {
          logger.error('Failed to load embedding pipeline:', error);
          // In a browser environment, this might fail due to CORS/COOP/COEP headers not being set correctly
          // or if the model files cannot be fetched.
          // Consider adding a specific user notification here.
          return null;
        });
    }
    await this.embeddingPipeline; // Ensure it's awaited if called early
  }

  private async getPipeline(): Promise<FeatureExtractionPipeline | null> {
    if (!this.embeddingPipeline) {
      await this.initEmbeddingPipeline();
    }
    return this.embeddingPipeline;
  }

  public async indexFile(filePath: string, content: string): Promise<void> {
    const pipe = await this.getPipeline();
    if (!pipe) {
      logger.warn(`Cannot index file ${filePath}: embedding pipeline not available.`);
      return;
    }

    // Basic check to avoid re-indexing if content seems unchanged (very naive)
    // const existingData = this.fileEmbeddings.get(filePath);
    // if (existingData && existingData.chunks.length > 0 && existingData.chunks[0].text.startsWith(content.substring(0, 20))) {
    //   // logger.debug(`Skipping indexing for ${filePath} as it seems unchanged.`);
    //   // return;
    // }

    logger.info(`Indexing file: ${filePath}`);
    const textChunks = splitIntoChunks(content);
    if (textChunks.length === 0) {
        logger.info(`No suitable chunks found for ${filePath}, skipping indexing.`);
        this.fileEmbeddings.delete(filePath); // Remove if previously indexed but now empty
        return;
    }

    const chunks: Chunk[] = [];
    for (const text of textChunks) {
      try {
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data as Float32Array);
        chunks.push({ text, embedding });
      } catch (error) {
        logger.error(`Failed to generate embedding for chunk in ${filePath}:`, error, text.substring(0,50));
      }
    }

    if (chunks.length > 0) {
        this.fileEmbeddings.set(filePath, { filePath, chunks, lastIndexedTimestamp: Date.now() });
        logger.info(`Successfully indexed ${chunks.length} chunks for ${filePath}.`);
    } else {
        logger.warn(`No chunks were successfully embedded for ${filePath}.`);
        this.fileEmbeddings.delete(filePath);
    }
  }

  public async startIndexingAllFiles(forceReindex: boolean = false): Promise<void> {
    if (this.isIndexing && !forceReindex) {
      logger.info("Indexing is already in progress.");
      return;
    }
    this.isIndexing = true;
    logger.info("Starting full project indexing...");

    const pipe = await this.getPipeline();
    if (!pipe) {
      logger.error("Full project indexing failed: embedding pipeline not available.");
      this.isIndexing = false;
      return;
    }

    const allFiles = filesStore.get(); // Assumes filesStore is populated
    let indexedCount = 0;
    for (const [filePath, fileData] of Object.entries(allFiles)) {
      if (fileData?.type === 'file' && !fileData.isBinary && fileData.content) {
        // TODO: Add check for lastIndexedTimestamp and content hash to avoid re-indexing unchanged files unless forceReindex
        await this.indexFile(filePath, fileData.content);
        indexedCount++;
      }
    }
    logger.info(`Full project indexing complete. Indexed ${indexedCount} files.`);
    this.isIndexing = false;
  }

  public async search(queryText: string, topK: number = 5): Promise<SearchResult[]> {
    const pipe = await this.getPipeline();
    if (!pipe || this.fileEmbeddings.size === 0) {
      logger.warn('Search cannot be performed: embedding pipeline or indexed files not available.');
      if(this.fileEmbeddings.size === 0 && !this.isIndexing) {
        logger.info("No files indexed. Attempting to index all files now.")
        await this.startIndexingAllFiles(); // Attempt to index if nothing is there
         if (this.fileEmbeddings.size === 0) { // Check again
            return [];
         }
      } else if (this.isIndexing) {
        logger.info("Files are currently being indexed. Please try your search again shortly.");
        return [];
      } else {
        return [];
      }
    }

    logger.info(`Performing semantic search for query: "${queryText}"`);
    const queryEmbeddingOutput = await pipe(queryText, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(queryEmbeddingOutput.data as Float32Array);

    const results: SearchResult[] = [];
    this.fileEmbeddings.forEach(fileData => {
      fileData.chunks.forEach(chunk => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        results.push({ filePath: fileData.filePath, chunkText: chunk.text, score });
      });
    });

    results.sort((a, b) => b.score - a.score); // Sort by score descending
    return results.slice(0, topK);
  }

  // Method to clear embeddings for a specific file, e.g., when deleted
  public clearFileIndex(filePath: string): void {
    if (this.fileEmbeddings.has(filePath)) {
      this.fileEmbeddings.delete(filePath);
      logger.info(`Embeddings cleared for file: ${filePath}`);
    }
  }
}

// Export a singleton instance
export const searchService = new SearchServiceSingleton();
