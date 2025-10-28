import { AccessToken, TrackSource } from 'livekit-server-sdk'

import { System } from './System'
import { uuid } from '../utils'

const levels = ['disabled', 'spatial', 'global']
const levelPriorities = {
  disabled: 1,
  spatial: 2,
  global: 3,
}

export class ServerLiveKit extends System {
  constructor(world) {
    super(world)
    this.roomId = uuid()
    this.wsUrl = process.env.LIVEKIT_WS_URL
    this.apiKey = process.env.LIVEKIT_API_KEY
    this.apiSecret = process.env.LIVEKIT_API_SECRET
    this.modifiers = {} // [playerId] => Set({ level })
    this.levels = {} // [playerId] => level (disabled, spatial, global)
    this.muted = new Set()
    // enabled will be set after async init
    this.enabled = false
  }

  async init() {
    // If API key or secret is missing, try to fetch from edify engine server
    if (!this.apiKey || !this.apiSecret) {
      const edifyEngineServerUrl = process.env.PUBLIC_EDIFY_ENGINE_SERVER || 'https://edifyengine.com'
      try {
        const response = await fetch(`${edifyEngineServerUrl}/api/hyperfy-keys`)
        if (response.ok) {
          const data = await response.json()
          if (data.LIVEKIT_API_KEY && !this.apiKey) {
            this.apiKey = data.LIVEKIT_API_KEY
            console.log('[livekit] Fetched LIVEKIT_API_KEY from edify engine server')
          }
          if (data.LIVEKIT_API_SECRET && !this.apiSecret) {
            this.apiSecret = data.LIVEKIT_API_SECRET
            console.log('[livekit] Fetched LIVEKIT_API_SECRET from edify engine server')
          }
        } else {
          console.warn('[livekit] Failed to fetch keys from edify engine server:', response.statusText)
        }
      } catch (error) {
        console.warn('[livekit] Error fetching keys from edify engine server:', error.message)
      }
    }
    
    // Decide whether to enable or disable LiveKit after fetching keys
    const hasWsUrl = !!this.wsUrl
    const hasApiKey = !!this.apiKey
    const hasApiSecret = !!this.apiSecret
    
    this.enabled = hasWsUrl && hasApiKey && hasApiSecret
    
    if (this.enabled) {
      console.log('[livekit] LiveKit enabled - all required configuration present')
    } else {
      const missing = []
      if (!hasWsUrl) missing.push('LIVEKIT_WS_URL')
      if (!hasApiKey) missing.push('LIVEKIT_API_KEY')
      if (!hasApiSecret) missing.push('LIVEKIT_API_SECRET')
      console.warn(`[livekit] LiveKit disabled - missing required configuration: ${missing.join(', ')}`)
    }
  }

  async serialize(playerId) {
    if (!this.enabled) return null
    const data = {}
    data.wsUrl = this.wsUrl
    data.levels = this.levels
    data.muted = this.muted
    // generate voice access token for the player
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: playerId,
    })
    const videoGrant = {
      room: this.roomId,
      roomJoin: true,
      canSubscribe: true,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO],
      canUpdateOwnMetadata: true,
    }
    at.addGrant(videoGrant)
    data.token = await at.toJwt()
    return data
  }

  setMuted(playerId, muted) {
    if (muted && !this.muted.has(playerId)) {
      this.muted.add(playerId)
      this.world.network.send('mute', { playerId, muted })
      return
    }
    if (!muted && this.muted.has(playerId)) {
      this.muted.delete(playerId)
      this.world.network.send('mute', { playerId, muted })
      return
    }
  }

  addModifier(playerId, level) {
    if (!levels.includes(level)) return console.error(`[livekit] invalid level: ${level}`)
    let modifiers = this.modifiers[playerId]
    if (!modifiers) {
      modifiers = new Set()
      this.modifiers[playerId] = modifiers
    }
    const mod = { playerId, level }
    modifiers.add(mod)
    this.checkLevel(playerId)
    return mod
  }

  updateModifier(mod, level) {
    if (!levels.includes(level)) return console.error(`[livekit] invalid level: ${level}`)
    const playerId = mod.playerId
    const modifiers = this.modifiers[playerId]
    if (!modifiers) return
    if (!modifiers.has(mod)) return console.error('updateModifier: mod not found')
    mod.level = level
    this.checkLevel(playerId)
    return mod
  }

  removeModifier(mod) {
    const playerId = mod.playerId
    const modifiers = this.modifiers[playerId]
    if (!modifiers) return
    modifiers.delete(mod)
    this.checkLevel(playerId)
    return null
  }

  clearModifiers(playerId) {
    delete this.modifiers[playerId]
    this.checkLevel(playerId)
  }

  checkLevel(playerId) {
    const modifiers = this.modifiers[playerId]
    let level = null
    if (modifiers) {
      for (const mod of modifiers) {
        const currPriority = levelPriorities[level] || 0
        const modPriority = levelPriorities[mod.level]
        if (modPriority > currPriority) {
          level = mod.level
        }
      }
    }
    if (this.levels[playerId] === level) {
      return // no change
    }
    this.levels[playerId] = level
    this.world.network.send('liveKitLevel', { playerId, level })
  }
}
