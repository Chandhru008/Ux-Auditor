import mongoose from 'mongoose';
import { AuditReport } from '../models/AuditReport.js';
import { memoryStore } from '../store/memory.js';

function useMemory() {
  return memoryStore.isActive || mongoose.connection.readyState !== 1;
}

export const auditRepository = {
  async create(data) {
    if (useMemory()) return memoryStore.create(data);
    return AuditReport.create(data);
  },

  async findById(id) {
    if (useMemory()) return memoryStore.findById(id);
    return AuditReport.findById(id);
  },

  async findByIdAndUpdate(id, update) {
    if (useMemory()) return memoryStore.findByIdAndUpdate(id, update);
    return AuditReport.findByIdAndUpdate(id, update);
  },

  async find(sort = { createdAt: -1 }, limit = 50, select) {
    if (useMemory()) {
      let results = await memoryStore.find();
      if (select) {
        const fields = select.split(' ').filter(Boolean);
        results = results.map((r) => {
          const picked = {};
          fields.forEach((f) => { if (r[f] !== undefined) picked[f] = r[f]; });
          picked._id = r._id;
          return picked;
        });
      }
      return results.slice(0, limit);
    }
    let q = AuditReport.find().sort(sort).limit(limit);
    if (select) q = q.select(select);
    return q;
  },

  async findByIdAndDelete(id) {
    if (useMemory()) return memoryStore.findByIdAndDelete(id);
    return AuditReport.findByIdAndDelete(id);
  },
};
