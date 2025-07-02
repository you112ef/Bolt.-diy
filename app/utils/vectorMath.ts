/**
 * Calculates the dot product of two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The dot product.
 * @throws Error if vectors are of different lengths or empty.
 */
function dotProduct(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must be of the same length to compute dot product.");
  }
  if (vecA.length === 0) {
    throw new Error("Cannot compute dot product of empty vectors.");
  }
  return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}

/**
 * Calculates the magnitude (or L2 norm) of a vector.
 * @param vec - The vector.
 * @returns The magnitude of the vector.
 */
function magnitude(vec: number[]): number {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Calculates the cosine similarity between two vectors.
 * Cosine similarity measures the cosine of the angle between two non-zero vectors.
 * It ranges from -1 (exactly opposite) to 1 (exactly the same), with 0 indicating orthogonality.
 * For sentence embeddings, values are typically between 0 and 1 (as embeddings are often non-negative or normalized).
 * @param vecA - The first vector (e.g., embedding of a query).
 * @param vecB - The second vector (e.g., embedding of a document chunk).
 * @returns The cosine similarity, a value between -1 and 1.
 * Returns 0 if either vector has zero magnitude to avoid division by zero.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    // console.warn("Cosine similarity called with empty or null vectors.");
    return 0;
  }
  if (vecA.length !== vecB.length) {
    // console.warn("Cosine similarity called with vectors of different lengths.");
    return 0; // Or throw an error, depending on desired strictness
  }

  const magA = magnitude(vecA);
  const magB = magnitude(vecB);

  if (magA === 0 || magB === 0) {
    // console.warn("One or both vectors have zero magnitude. Cosine similarity is 0.");
    return 0; // One of the vectors is a zero vector
  }

  const dotProd = dotProduct(vecA, vecB);

  let similarity = dotProd / (magA * magB);

  // Clamp the value to [-1, 1] to correct for potential floating point inaccuracies
  similarity = Math.max(-1, Math.min(1, similarity));

  return similarity;
}
