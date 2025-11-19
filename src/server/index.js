import 'ses'
import '../core/lockdown'
import './bootstrap'

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import Fastify from 'fastify'
import ws from '@fastify/websocket'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import statics from '@fastify/static'
import multipart from '@fastify/multipart'

import { createServerWorld } from '../core/createServerWorld'
import { getDB } from './db'
import { Storage } from './Storage'
import { assets } from './assets'
import { collections } from './collections'
import { cleaner } from './cleaner'

const rootDir = path.join(__dirname, '../')
const worldDir = path.join(rootDir, process.env.WORLD)
const port = process.env.PORT
const edifyEngineServerUrl = process.env.PUBLIC_EDIFY_ENGINE_SERVER || 'https://edifyengine.com'

// check envs
if (!process.env.WORLD) {
  throw new Error('[envs] WORLD not set')
}
if (!process.env.PORT) {
  throw new Error('[envs] PORT not set')
}
if (!process.env.JWT_SECRET) {
  throw new Error('[envs] JWT_SECRET not set')
}
if (!process.env.ADMIN_CODE) {
  console.warn('[envs] ADMIN_CODE not set - all users will have admin permissions!')
}
if (!process.env.SAVE_INTERVAL) {
  throw new Error('[envs] SAVE_INTERVAL not set')
}
if (!process.env.PUBLIC_MAX_UPLOAD_SIZE) {
  throw new Error('[envs] PUBLIC_MAX_UPLOAD_SIZE not set')
}
if (!process.env.PUBLIC_WS_URL) {
  throw new Error('[envs] PUBLIC_WS_URL not set')
}
if (!process.env.PUBLIC_WS_URL.startsWith('ws')) {
  throw new Error('[envs] PUBLIC_WS_URL must start with ws:// or wss://')
}
if (!process.env.PUBLIC_API_URL) {
  throw new Error('[envs] PUBLIC_API_URL must be set')
}
if (!process.env.ASSETS) {
  throw new Error(`[envs] ASSETS must be set to 'local' or 's3'`)
}
if (!process.env.ASSETS_BASE_URL) {
  throw new Error(`[envs] ASSETS_BASE_URL must be set`)
}
if (process.env.ASSETS === 's3' && !process.env.ASSETS_S3_URI) {
  throw new Error(`[envs] ASSETS_S3_URI must be set when using ASSETS=s3`)
}

const fastify = Fastify({ logger: { level: 'error' } })

// create world folder if needed
await fs.ensureDir(worldDir)

// init assets
await assets.init({ rootDir, worldDir })

// init collections
await collections.init({ rootDir, worldDir })

// init db
const db = await getDB({ worldDir })

// init cleaner
await cleaner.init({ db })

// init storage
const storage = new Storage(path.join(worldDir, '/storage.json'))

// create world
const world = createServerWorld()
await world.init({
  assetsDir: assets.dir,
  assetsUrl: assets.url,
  db,
  assets,
  storage,
  collections: collections.list,
})

fastify.register(cors)
fastify.register(compress)
fastify.get('/', async (req, reply) => {
  const title = world.settings.title || 'World'
  const desc = world.settings.desc || ''
  const image = world.resolveURL(world.settings.image?.url) || ''
  const url = process.env.ASSETS_BASE_URL
  const filePath = path.join(__dirname, 'public', 'index.html')
  let html = fs.readFileSync(filePath, 'utf-8')
  html = html.replaceAll('{url}', url)
  html = html.replaceAll('{title}', title)
  html = html.replaceAll('{desc}', desc)
  html = html.replaceAll('{image}', image)
  reply.type('text/html').send(html)
})
fastify.register(statics, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  decorateReply: false,
  setHeaders: res => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
  },
})
if (world.assetsDir) {
  fastify.register(statics, {
    root: world.assetsDir,
    prefix: '/assets/',
    decorateReply: false,
    setHeaders: res => {
      // all assets are hashed & immutable so we can use aggressive caching
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable') // 1 year
      res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()) // older browsers
    },
  })
}
fastify.register(multipart, {
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
})
fastify.register(ws)
fastify.register(worldNetwork)

const publicEnvs = {}
for (const key in process.env) {
  if (key.startsWith('PUBLIC_')) {
    const value = process.env[key]
    publicEnvs[key] = value
  }
}
const envsCode = `
  if (!globalThis.env) globalThis.env = {}
  globalThis.env = ${JSON.stringify(publicEnvs)}
`
fastify.get('/env.js', async (req, reply) => {
  reply.type('application/javascript').send(envsCode)
})

fastify.post('/api/upload', async (req, reply) => {
  const mp = await req.file()
  // collect into buffer
  const chunks = []
  for await (const chunk of mp.file) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
  // convert to file
  const file = new File([buffer], mp.filename, {
    type: mp.mimetype || 'application/octet-stream',
  })
  // upload
  await assets.upload(file)
})

fastify.get('/api/upload-check', async (req, reply) => {
  const exists = await assets.exists(req.query.filename)
  return { exists }
})

// Edify login endpoint
fastify.post('/api/edify/login', async (req, reply) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email and password are required' })
    }

    // Forward login request to edifyengine backend
    const response = await fetch(`${edifyEngineServerUrl}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return reply.code(response.status).send(data)
    }

    // Return token to client
    return reply.send(data)
  } catch (err) {
    console.error('Error logging in:', err)
    return reply.code(500).send({ message: 'Login failed', error: err.message })
  }
})

// Google auth redirect endpoint
fastify.get('/api/edify/google-auth', async (req, reply) => {
  // Redirect to edifyengine's Google OAuth with special parameter
  const callbackUrl = encodeURIComponent(`${req.protocol}://${req.hostname}${req.hostname === 'localhost' ? ':' + (process.env.PORT || 3000) : ''}/api/edify/google-callback`)
  
  return reply.redirect(`${edifyEngineServerUrl}/api/auth/google?from=hyperfy&callback=${callbackUrl}`)
})

// Google auth callback endpoint
fastify.get('/api/edify/google-callback', async (req, reply) => {
  const token = req.query.token
  
  if (!token) {
    return reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Failed</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'edify-google-auth-error' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `)
  }

  // Send token back to opener window and close popup
  return reply.type('text/html').send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Successful</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'edify-google-auth-success', 
              token: '${token}' 
            }, '*');
            window.close();
          } else {
            // If not in a popup, redirect to home with token
            localStorage.setItem('edifyToken', '${token}');
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `)
})

// Get AI API Key
fastify.get('/api/ai-api-key', async (req, reply) => {
  try {
    // Read from ServerAI instance
    const aiApiKey = world.ai?.apiKey || null
    return reply.send({ AI_API_KEY: aiApiKey })
  } catch (error) {
    console.error('Error reading AI API key:', error)
    return reply.code(500).send({ 
      error: 'Failed to read AI API key',
      message: error.message 
    })
  }
})

// Update AI API Key in .env file
fastify.put('/api/ai-api-key', async (req, reply) => {
  try {
    const { apiKey } = req.body

    if (apiKey === undefined) {
      return reply.code(400).send({ 
        message: 'API key is required' 
      })
    }

    // Find .env file - rootDir is src/, so go up two levels to project root
    const envPath = path.join(rootDir, '.env')

    // Read existing .env file if it exists
    let envContent = ''
    if (await fs.pathExists(envPath)) {
      envContent = await fs.readFile(envPath, 'utf8')
    }

    // Update or add AI_API_KEY
    const lines = envContent.split('\n')
    let aiApiKeyFound = false
    const updatedLines = lines.map(line => {
      if (line.trim().startsWith('AI_API_KEY=')) {
        aiApiKeyFound = true
        return `AI_API_KEY=${apiKey}`
      }
      return line
    })

    // If AI_API_KEY wasn't found, add it
    if (!aiApiKeyFound) {
      // Add a newline if the file doesn't end with one
      if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1] !== '') {
        updatedLines.push('')
      }
      updatedLines.push(`AI_API_KEY=${apiKey}`)
    }

    // Write back to .env file
    await fs.writeFile(envPath, updatedLines.join('\n'), 'utf8')

    // Update process.env for current session
    process.env.AI_API_KEY = apiKey

    // Update ServerAI instance immediately
    if (world.ai) {
      world.ai.apiKey = apiKey
      // Reinitialize client using the same logic as ServerAI.init
      world.ai.client = null
      world.ai.enabled = false
      
      // Reinitialize if provider and model are set
      if (world.ai.provider && world.ai.model && apiKey) {
        // Recreate client based on provider (same logic as ServerAI.init)
        // We'll need to access the client classes, but they're not exported
        // So we'll update the apiKey and the client will be recreated on next AI action
        // The enabled flag will be set when the client is actually created
      }
    }

    return reply.send({
      success: true,
      message: 'AI API key updated successfully.'
    })

  } catch (error) {
    console.error('Error updating AI API key:', error)
    return reply.code(500).send({ 
      message: 'Failed to update AI API key',
      error: error.message 
    })
  }
})

// Edify items endpoint with authentication
fastify.get('/api/edify/items', async (req, reply) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return reply.code(401).send({ message: 'Authentication required' })
    }

    let url, response

    if (req.query.purchasedOnly === 'true') {
      // Use /api/user/purchases for purchased items
      url = `${edifyEngineServerUrl}/api/user/purchases`
      
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch purchases: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Transform purchases data to match items format
      const items = data.purchases.map(purchase => purchase.item)
      
      return reply.send({
        success: true,
        items: items
      })
    } else {
      // Use /api/items for type-filtered items (public endpoint, no auth required)
      const queryParams = new URLSearchParams()
      if (req.query.type) {
        queryParams.append('type', req.query.type)
      }

      const queryString = queryParams.toString()
      url = `${edifyEngineServerUrl}/api/items${queryString ? '?' + queryString : ''}`

      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`)
      }

      const data = await response.json()
      return reply.send({
        success: true,
        items: data.items
      })
    }
  } catch (err) {
    console.error('Error fetching Edify items:', err)
    return reply.code(500).send({ error: err.message })
  }
})

// Demo email endpoint - forwards to edifyengine server
fastify.post('/api/demo-email', async (req, reply) => {
  try {
    const { email } = req.body

    if (!email) {
      return reply.code(400).send({ 
        error: 'Email is required',
        message: 'Please provide a valid email address'
      })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ 
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      })
    }

    // Forward request to edifyengine server
    const response = await fetch(`${edifyEngineServerUrl}/api/demo-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (!response.ok) {
      return reply.code(response.status).send(data)
    }

    return reply.send(data)
  } catch (err) {
    console.error('Error submitting demo email:', err)
    return reply.code(500).send({ 
      error: 'Internal server error',
      message: 'Failed to process email submission'
    })
  }
})

fastify.get('/health', async (request, reply) => {
  try {
    // Basic health check
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }

    return reply.code(200).send(health)
  } catch (error) {
    console.error('Health check failed:', error)
    return reply.code(503).send({
      status: 'error',
      timestamp: new Date().toISOString(),
    })
  }
})

fastify.get('/status', async (request, reply) => {
  try {
    const status = {
      uptime: Math.round(world.time),
      protected: process.env.ADMIN_CODE !== undefined ? true : false,
      connectedUsers: [],
      commitHash: process.env.COMMIT_HASH,
    }
    for (const socket of world.network.sockets.values()) {
      status.connectedUsers.push({
        id: socket.player.data.userId,
        position: socket.player.position.value.toArray(),
        name: socket.player.data.name,
      })
    }

    return reply.code(200).send(status)
  } catch (error) {
    console.error('Status failed:', error)
    return reply.code(503).send({
      status: 'error',
      timestamp: new Date().toISOString(),
    })
  }
})

fastify.setErrorHandler((err, req, reply) => {
  console.error(err)
  reply.status(500).send()
})

try {
  await fastify.listen({ port, host: '0.0.0.0' })
} catch (err) {
  console.error(err)
  console.error(`failed to launch on port ${port}`)
  process.exit(1)
}

async function worldNetwork(fastify) {
  fastify.get('/ws', { websocket: true }, (ws, req) => {
    world.network.onConnection(ws, req.query)
  })
}

console.log(`server listening on port ${port}`)

// Graceful shutdown
process.on('SIGINT', async () => {
  await fastify.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await fastify.close()
  process.exit(0)
})
