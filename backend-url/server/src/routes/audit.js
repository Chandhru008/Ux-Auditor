import { Router } from 'express';
import { auditRepository } from '../store/repository.js';
import AuditOrchestrator from '../services/audit/orchestrator.js';

export function createAuditRoutes(io) {
  const router = Router();
  const orchestrator = new AuditOrchestrator(io);

  router.post('/start', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }
      const result = await orchestrator.startAudit(url);
      res.status(202).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const reports = await auditRepository.find(
        { createdAt: -1 },
        50,
        'url status scores createdAt completedAt progress'
      );
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const report = await auditRepository.findById(req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found' });
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await auditRepository.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
