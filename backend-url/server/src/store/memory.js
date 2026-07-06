/** In-memory audit store used when MongoDB is unavailable. */
const audits = new Map();

export const memoryStore = {
  isActive: false,

  async create(data) {
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
    audits.set(data._id, doc);
    return doc;
  },

  async findById(id) {
    return audits.get(id) || null;
  },

  async findByIdAndUpdate(id, update) {
    const existing = audits.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...update, updatedAt: new Date() };
    audits.set(id, updated);
    return updated;
  },

  async find() {
    return [...audits.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async findByIdAndDelete(id) {
    const existed = audits.has(id);
    audits.delete(id);
    return existed ? { _id: id } : null;
  },
};

export async function useMemoryStore() {
  memoryStore.isActive = true;
  console.log('Using in-memory audit store (data will not persist across restarts)');
}
