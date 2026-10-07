export class MaterialEmbedding {
  constructor({ materialId, textEmbedding }) {
    this.materialId = materialId;
    this.textEmbedding = textEmbedding;
  }
  isReadyForSearch() {
    return !!(this.textEmbedding);
  }
}
