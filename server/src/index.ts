import express from 'express'
import cors from 'cors'
import path from 'path'
import { config } from './config'

// BigInt JSON 序列化修复（Prisma 返回 BigInt 字段）
// @ts-ignore
BigInt.prototype.toJSON = function () { return Number(this) }
import { errorHandler } from './middleware/errorHandler'
import { adminRouter } from './routes/admin'
import { coachRouter } from './routes/coach'
import { playerRouter, publicRouter } from './routes/player'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Static files for uploaded avatars, team logos and pet images
app.use('/avatars', express.static('/app/public/avatars'))
app.use('/logos', express.static(path.join(__dirname, '../../client/public/logos')))
app.use('/images', express.static('/app/public/images'))

app.use('/api', publicRouter)
app.use('/api/admin', adminRouter)
app.use('/api/coach', coachRouter)
app.use('/api/player', playerRouter)

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running' })
})

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`)
})

export default app
