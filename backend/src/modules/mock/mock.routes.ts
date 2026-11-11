import { Router, Request, Response } from 'express';

const router = Router();

// Sample upstream mock endpoints for testing the NexGate gateway
router.get('/weather/current', (req: Request, res: Response) => {
  const city = (req.query.city as string) || 'San Francisco';
  res.json({
    location: city,
    temperatureC: 21,
    temperatureF: 70,
    condition: 'Partly Cloudy',
    humidity: 58,
    windSpeedKph: 14,
    timestamp: new Date().toISOString(),
    source: 'NexGate Mock Weather Upstream Service',
  });
});

router.get('/users', (req: Request, res: Response) => {
  res.json({
    data: [
      { id: 'usr_1', name: 'Alice Walker', role: 'Engineer', status: 'active' },
      { id: 'usr_2', name: 'Bob Roberts', role: 'Architect', status: 'active' },
      { id: 'usr_3', name: 'Charlie Dave', role: 'Security', status: 'review' },
    ],
    total: 3,
    source: 'NexGate Mock User Service',
  });
});

router.all('/echo', (req: Request, res: Response) => {
  res.json({
    receivedMethod: req.method,
    receivedHeaders: req.headers,
    receivedQuery: req.query,
    receivedBody: req.body,
    timestamp: new Date().toISOString(),
  });
});

export default router;
