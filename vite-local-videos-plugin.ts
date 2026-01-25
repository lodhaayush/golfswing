import { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.avi', '.mkv']

export function localVideosPlugin(): Plugin {
  const projectRoot = process.cwd()

  return {
    name: 'local-videos',
    configureServer(server) {
      // Endpoint to stream a specific video file
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/__local_video/')) {
          return next()
        }

        const filename = decodeURIComponent(req.url.replace('/__local_video/', ''))

        // Security: prevent directory traversal
        const safeName = path.basename(filename)
        const ext = path.extname(safeName).toLowerCase()

        if (!VIDEO_EXTENSIONS.includes(ext)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid video extension' }))
          return
        }

        const filePath = path.join(projectRoot, safeName)

        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'File not found' }))
          return
        }

        const stat = fs.statSync(filePath)
        const fileSize = stat.size

        // Determine content type
        const contentTypes: Record<string, string> = {
          '.mov': 'video/quicktime',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.avi': 'video/x-msvideo',
          '.mkv': 'video/x-matroska',
        }
        const contentType = contentTypes[ext] || 'application/octet-stream'

        // Handle range requests for video streaming
        const range = req.headers.range

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-')
          const start = parseInt(parts[0], 10)
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
          const chunkSize = end - start + 1

          const stream = fs.createReadStream(filePath, { start, end })

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType,
          })

          stream.pipe(res)
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
          })

          fs.createReadStream(filePath).pipe(res)
        }
      })
    },
  }
}
