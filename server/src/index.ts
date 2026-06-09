import express from 'express'
import cors from 'cors'
import { config } from './config'

// BigInt JSON 序列化修复（Prisma 返回 BigInt 字段）
// @ts-ignore
BigInt.prototype.toJSON = function () { return Number(this) }
import { errorHandler } from './middleware/errorHandler'
import { adminRouter } from './routes/admin'
import { coachRouter } from './routes/coach'
import { playerRouter, publicRouter } from './routes/player'
import { biometricsRouter } from './routes/biometrics'
import { assessmentRouter } from './routes/assessment'
import { physicalTestRouter } from './routes/physicalTest'
import { pipelineRouter } from './routes/pipeline'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

import path from 'path'

// Static files for uploaded avatars, team logos and pet images
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../public')
app.use('/avatars', express.static(path.join(uploadDir, 'avatars')))
app.use('/logos', express.static(path.join(uploadDir, 'logos')))
app.use('/logos', express.static(path.join(uploadDir, 'logos', 'clubs'))) // 兜底：/logos/xxx.svg → clubs/xxx.svg
// Logos also served by nginx in production from client/dist/logos/
app.use('/images', express.static(path.join(uploadDir, 'images')))

app.use('/api', publicRouter)
app.use('/api/admin', adminRouter)
app.use('/api/coach', coachRouter)
app.use('/api/coach', biometricsRouter)
app.use('/api/coach', assessmentRouter)
app.use('/api/coach', physicalTestRouter)
app.use('/api/coach', pipelineRouter)
app.use('/api/player', playerRouter)

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running' })
})

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`)
})

export default app
