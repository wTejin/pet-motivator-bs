import express from 'express'
import cors from 'cors'
import { config } from './config'
import { errorHandler } from './middleware/errorHandler'
import { adminRouter } from './routes/admin'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/admin', adminRouter)

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running' })
})

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`)
})

export default app
