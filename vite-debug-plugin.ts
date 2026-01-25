import { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

export function debugLoggerPlugin(): Plugin {
  const logFilePath = path.resolve(process.cwd(), 'debug.log')

  // Clear log file on server start
  fs.writeFileSync(logFilePath, `=== Debug Log Started: ${new Date().toISOString()} ===\n\n`)

  return {
    name: 'debug-logger',
    configureServer(server) {
      server.middlewares.use('/__debug_log', (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk.toString()
          })
          req.on('end', () => {
            // Append to log file
            fs.appendFileSync(logFilePath, body + '\n')
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('OK')
          })
        } else {
          res.writeHead(405)
          res.end('Method not allowed')
        }
      })
    },
  }
}
