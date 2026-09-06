import { Router } from 'express'
import mongoose from 'mongoose'
import { mlServiceAdapter } from '../adapters'

const router = Router()

router.get('/', async (_req, res) => {
  let dbStatus = 'disconnected'

  try {
    const state = mongoose.connection.readyState
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (state === 1) {
      dbStatus = 'connected'
    } else if (state === 2) {
      dbStatus = 'connecting'
    } else if (state === 3) {
      dbStatus = 'disconnecting'
    }
  } catch {
    dbStatus = 'error'
  }

  const mlHealth = await mlServiceAdapter.checkHealth()
  const isDbHealthy = dbStatus === 'connected'
  const isHealthy = isDbHealthy && mlHealth.isHealthy

  res.status(isHealthy ? 200 : (isDbHealthy ? 200 : 503)).json({
    success: isHealthy,
    status: isHealthy ? 'ok' : 'degraded',
    service: 'BIDSHIELD AI Backend',
    database: dbStatus,
    mlService: {
      status: mlHealth.isHealthy ? 'connected' : 'offline',
      models: mlHealth.models,
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export default router
