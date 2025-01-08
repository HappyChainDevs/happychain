import { config } from 'dotenv'
import app from './server'

config()

const port = Number(process.env.PORT) || 3000
console.log(`Server is running on port ${port}`)

app.listen(port)

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down gracefully')
  process.exit(0)
})
