import type { Request, Response } from "express";
import { auth } from "../auth/config";

export async function betterAuthHandler(req: Request, res: Response) {
  const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body),
  });

  try {
    const response = await auth.handler(request);
    
    // Copy status
    res.status(response.status);
    
    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Get and send body
    if (response.body) {
      const body = await response.text();
      res.send(body);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}