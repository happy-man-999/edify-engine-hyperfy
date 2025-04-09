import moment from 'moment'
import { writePacket } from '../packets'
import { Socket } from '../Socket'
import { uuid } from '../utils'
import { System } from './System'
import { createJWT, readJWT } from '../utils-server'
import { cloneDeep, isNumber } from 'lodash-es'
import * as THREE from '../extras/three'
import { Ranks } from '../extras/ranks'

const SAVE_INTERVAL = parseInt(process.env.SAVE_INTERVAL || '60') // seconds
const PING_RATE = 10 // seconds
const defaultSpawn = '{ "position": [0, 0, 0], "quaternion": [0, 0, 0, 1] }'

const HEALTH_MAX = 100

/**
 * Server Network System
 *
 * - runs on the server
 * - provides abstract network methods matching ClientNetwork
 *
 */
export class ServerNetwork extends System {
  constructor(world) {
    super(world)
    this.id = 0
    this.ids = -1
    this.sockets = new Map()
    this.socketIntervalId = setInterval(() => this.checkSockets(), PING_RATE * 1000)
    this.saveTimerId = null
    this.dirtyBlueprints = new Set()
    this.dirtyApps = new Set()
    this.isServer = true
    this.queue = []
  }

  init({ db }) {
    this.db = db
  }

  async start() {
    // get spawn
    const spawnRow = await this.db('config').where('key', 'spawn').first()
    this.spawn = JSON.parse(spawnRow?.value || defaultSpawn)
    // hydrate blueprints
    const blueprints = await this.db('blueprints')
    for (const blueprint of blueprints) {
      const data = JSON.parse(blueprint.data)
      this.world.blueprints.add(data, true)
    }
    // hydrate entities
    const entities = await this.db('entities')
    for (const entity of entities) {
      const data = JSON.parse(entity.data)
      data.state = {}
      this.world.entities.add(data, true)
    }
    // hydrate settings
    let settingsRow = await this.db('config').where('key', 'settings').first()
    try {
      const settings = JSON.parse(settingsRow?.value || '{}')
      this.world.settings.deserialize(settings)
      this.world.settings.setHasAdminCode(!!process.env.ADMIN_CODE)
    } catch (err) {
      console.error(err)
    }
    // watch settings changes
    this.world.settings.on('change', this.saveSettings)
    // queue first save
    if (SAVE_INTERVAL) {
      this.saveTimerId = setTimeout(this.save, SAVE_INTERVAL * 1000)
    }
  }

  preFixedUpdate() {
    this.flush()
  }

  send(name, data, ignoreSocketId) {
    // console.log('->>>', name, data)
    const packet = writePacket(name, data)
    this.sockets.forEach(socket => {
      if (socket.id === ignoreSocketId) return
      socket.sendPacket(packet)
    })
  }

  sendTo(socketId, name, data) {
    const socket = this.sockets.get(socketId)
    socket?.send(name, data)
  }

  checkSockets() {
    // see: https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections
    const dead = []
    this.sockets.forEach(socket => {
      if (!socket.alive) {
        dead.push(socket)
      } else {
        socket.ping()
      }
    })
    dead.forEach(socket => socket.disconnect())
  }

  enqueue(socket, method, data) {
    this.queue.push([socket, method, data])
  }

  flush() {
    while (this.queue.length) {
      try {
        const [socket, method, data] = this.queue.shift()
        this[method]?.(socket, data)
      } catch (err) {
        console.error(err)
      }
    }
  }

  getTime() {
    return performance.now() / 1000 // seconds
  }

  save = async () => {
    const counts = {
      upsertedBlueprints: 0,
      upsertedApps: 0,
      deletedApps: 0,
    }
    const now = moment().toISOString()
    // blueprints
    for (const id of this.dirtyBlueprints) {
      const blueprint = this.world.blueprints.get(id)
      try {
        const record = {
          id: blueprint.id,
          data: JSON.stringify(blueprint),
        }
        await this.db('blueprints')
          .insert({ ...record, createdAt: now, updatedAt: now })
          .onConflict('id')
          .merge({ ...record, updatedAt: now })
        counts.upsertedBlueprints++
        this.dirtyBlueprints.delete(id)
      } catch (err) {
        console.log(`error saving blueprint: ${blueprint.id}`)
        console.error(err)
      }
    }
    // app entities
    for (const id of this.dirtyApps) {
      const entity = this.world.entities.get(id)
      if (entity) {
        // it needs creating/updating
        if (entity.data.uploader || entity.data.mover) {
          continue // ignore while uploading or moving
        }
        try {
          const data = cloneDeep(entity.data)
          data.state = null
          const record = {
            id: entity.data.id,
            data: JSON.stringify(entity.data),
          }
          await this.db('entities')
            .insert({ ...record, createdAt: now, updatedAt: now })
            .onConflict('id')
            .merge({ ...record, updatedAt: now })
          counts.upsertedApps++
          this.dirtyApps.delete(id)
        } catch (err) {
          console.log(`error saving entity: ${entity.data.id}`)
          console.error(err)
        }
      } else {
        // it was removed
        await this.db('entities').where('id', id).delete()
        counts.deletedApps++
        this.dirtyApps.delete(id)
      }
    }
    // log
    const didSave = counts.upsertedBlueprints > 0 || counts.upsertedApps > 0 || counts.deletedApps > 0
    if (didSave) {
      console.log(
        `world saved (${counts.upsertedBlueprints} blueprints, ${counts.upsertedApps} apps, ${counts.deletedApps} apps removed)`
      )
    }
    // queue again
    this.saveTimerId = setTimeout(this.save, SAVE_INTERVAL * 1000)
  }

  saveSettings = async () => {
    const data = this.world.settings.serialize()
    const value = JSON.stringify(data)
    await this.db('config')
      .insert({
        key: 'settings',
        value,
      })
      .onConflict('key')
      .merge({
        value,
      })
  }

  async onConnection(ws, params) {
    try {
      // check player limit
      const playerLimit = this.world.settings.playerLimit
      if (isNumber(playerLimit) && playerLimit > 0 && this.sockets.size >= playerLimit) {
        const packet = writePacket('kick', 'player_limit')
        ws.send(packet)
        ws.close()
        return
      }

      // check connection params
      let authToken = params.authToken
      let name = params.name
      let avatar = params.avatar
      const edifyToken = params.edifyToken
      const hostname = params.hostname

      // get or create user
      let user
      if (authToken) {
        try {
          const { userId } = await readJWT(authToken)
          user = await this.db('users').where('id', userId).first()
        } catch (err) {
          console.error('failed to read authToken:', authToken)
        }
      }
      if (!user) {
        user = {
          id: uuid(),
          name: 'Anonymous',
          avatar: null,
          rank: 0,
          createdAt: moment().toISOString(),
        }
        await this.db('users').insert(user)
        authToken = await createJWT({ userId: user.id })
      }

      // Check if user is droplet owner and grant/revoke admin access accordingly
      let initialRank = user.rank
      if (edifyToken && hostname) {
        try {
          const isOwner = await this.checkDropletOwnership(edifyToken, hostname)
          if (isOwner) {
            // Grant admin access if user is owner
            initialRank = Ranks.ADMIN
            // Update user rank in database
            await this.db('users').where('id', user.id).update({ rank: initialRank })
            user.rank = initialRank
          } else {
            // Revoke admin access if user is not owner (even if they were admin before)
            if (user.rank === Ranks.ADMIN) {
              initialRank = Ranks.VISITOR
              await this.db('users').where('id', user.id).update({ rank: initialRank })
              user.rank = initialRank
            }
          }
        } catch (err) {
          console.error('Error checking droplet ownership:', err)
          // On error, revoke admin if they have it
          if (user.rank === Ranks.ADMIN) {
            initialRank = Ranks.VISITOR
            await this.db('users').where('id', user.id).update({ rank: initialRank })
            user.rank = initialRank
          }
        }
      } else {
        // No edifyToken or hostname - revoke admin access if they have it
        if (user.rank === Ranks.ADMIN) {
          initialRank = Ranks.VISITOR
          await this.db('users').where('id', user.id).update({ rank: initialRank })
          user.rank = initialRank
        }
      }

      // disconnect if user already in this world
      if (this.sockets.has(user.id)) {
        const packet = writePacket('kick', 'duplicate_user')
        ws.send(packet)
        ws.close()
        return
      }

      // livekit options
      const livekit = await this.world.livekit.serialize(user.id)

      // create socket
      const socket = new Socket({ id: user.id, ws, network: this })

      // spawn player
      socket.player = this.world.entities.add(
        {
          id: user.id,
          type: 'player',
          position: this.spawn.position.slice(),
          quaternion: this.spawn.quaternion.slice(),
          owner: socket.id, // deprecated, same as userId
          userId: user.id, // deprecated, same as userId
          name: name || user.name,
          health: HEALTH_MAX,
          avatar: user.avatar || this.world.settings.avatar?.url || 'asset://avatar.vrm',
          sessionAvatar: avatar || null,
          rank: initialRank,
          enteredAt: Date.now(),
        },
        true
      )

      // send snapshot
      socket.send('snapshot', {
        id: socket.id,
        serverTime: performance.now(),
        assetsUrl: process.env.ASSETS_BASE_URL,
        apiUrl: process.env.PUBLIC_API_URL,
        maxUploadSize: process.env.PUBLIC_MAX_UPLOAD_SIZE,
        collections: this.world.collections.serialize(),
        settings: this.world.settings.serialize(),
        chat: this.world.chat.serialize(),
        ai: this.world.ai.serialize(),
        blueprints: this.world.blueprints.serialize(),
        entities: this.world.entities.serialize(),
        livekit,
        authToken,
        hasAdminCode: !!process.env.ADMIN_CODE,
      })

      this.sockets.set(socket.id, socket)

      // enter events on the server are sent after the snapshot.
      // on the client these are sent during PlayerRemote.js entity instantiation!
      this.world.events.emit('enter', { playerId: socket.player.data.id })
    } catch (err) {
      console.error(err)
    }
  }

  onChatAdded = async (socket, msg) => {
    this.world.chat.add(msg, false)
    this.send('chatAdded', msg, socket.id)
  }

  onCommand = async (socket, data) => {
    const { args } = data
    // handle slash commands
    const player = socket.player
    const playerId = player.data.id
    const [cmd, arg1, arg2] = args
    // become admin command - DISABLED
    // Admin access is now granted automatically to droplet owners when they sign in through Edify
    if (cmd === 'admin') {
      socket.send('chatAdded', {
        id: uuid(),
        from: null,
        fromId: null,
        body: 'Admin code feature has been disabled. Admin access is granted to droplet owners when signing in through Edify.',
        createdAt: moment().toISOString(),
      })
    }
    if (cmd === 'name') {
      const name = arg1
      if (name) {
        const id = player.data.id
        const userId = player.data.userId
        player.data.name = name
        player.modify({ name })
        this.send('entityModified', { id, name })
        socket.send('chatAdded', {
          id: uuid(),
          from: null,
          fromId: null,
          body: `Name set to ${name}!`,
          createdAt: moment().toISOString(),
        })
        await this.db('users').where('id', userId).update({ name })
      }
    }
    if (cmd === 'spawn') {
      const op = arg1
      this.onSpawnModified(socket, op)
    }
    if (cmd === 'chat') {
      const op = arg1
      if (op === 'clear' && socket.player.isBuilder()) {
        this.world.chat.clear(true)
      }
    }
    if (cmd === 'server') {
      const op = arg1
      if (op === 'stats') {
        function send(body) {
          socket.send('chatAdded', {
            id: uuid(),
            from: null,
            fromId: null,
            body,
            createdAt: moment().toISOString(),
          })
        }
        const stats = await this.world.monitor.getStats()
        send(`CPU: ${stats.currentCPU.toFixed(3)}%`)
        send(
          `Memory: ${stats.currentMemory} / ${stats.maxMemory} MB (${((stats.currentMemory / stats.maxMemory) * 100).toFixed(1)}%)`
        )
      }
    }
    // emit event for all except admin
    if (cmd !== 'admin') {
      this.world.events.emit('command', { playerId, args })
    }
  }

  onModifyRank = async (socket, data) => {
    if (!socket.player.isAdmin()) return
    const { playerId, rank } = data
    if (!playerId) return
    if (!isNumber(rank)) return
    const player = this.world.entities.get(playerId)
    if (!player || !player.isPlayer) return
    player.modify({ rank })
    this.send('entityModified', { id: playerId, rank })
    await this.db('users').where('id', playerId).update({ rank })
  }

  onKick = (socket, playerId) => {
    const player = this.world.entities.get(playerId)
    if (!player) return
    // admins can kick builders + visitors
    // builders can kick visitors
    // visitors cannot kick anyone
    if (socket.player.data.rank <= player.data.rank) return
    const tSocket = this.sockets.get(playerId)
    tSocket.send('kick', 'moderation')
    tSocket.disconnect()
  }

  onMute = (socket, data) => {
    const player = this.world.entities.get(data.playerId)
    if (!player) return
    // admins can mute builders + visitors
    // builders can mute visitors
    // visitors cannot mute anyone
    if (socket.player.data.rank <= player.data.rank) return
    this.world.livekit.setMuted(data.playerId, data.muted)
  }

  onBlueprintAdded = (socket, blueprint) => {
    if (!socket.player.isBuilder()) {
      return console.error('player attempted to add blueprint without builder permission')
    }
    this.world.blueprints.add(blueprint)
    this.send('blueprintAdded', blueprint, socket.id)
    this.dirtyBlueprints.add(blueprint.id)
  }

  onBlueprintModified = (socket, data) => {
    if (!socket.player.isBuilder()) {
      return console.error('player attempted to modify blueprint without builder permission')
    }
    const blueprint = this.world.blueprints.get(data.id)
    // if new version is greater than current version, allow it
    if (data.version > blueprint.version) {
      this.world.blueprints.modify(data)
      this.send('blueprintModified', data, socket.id)
      this.dirtyBlueprints.add(data.id)
    }
    // otherwise, send a revert back to client, because someone else modified before them
    else {
      socket.send('blueprintModified', blueprint)
    }
  }

  onEntityAdded = (socket, data) => {
    if (!socket.player.isBuilder()) {
      return console.error('player attempted to add entity without builder permission')
    }
    const entity = this.world.entities.add(data)
    this.send('entityAdded', data, socket.id)
    if (entity.isApp) this.dirtyApps.add(entity.data.id)
  }

  onEntityModified = async (socket, data) => {
    const entity = this.world.entities.get(data.id)
    if (!entity) return console.error('onEntityModified: no entity found', data)
    entity.modify(data)
    this.send('entityModified', data, socket.id)
    if (entity.isApp) {
      // mark for saving
      this.dirtyApps.add(entity.data.id)
    }
    if (entity.isPlayer) {
      // persist player name and avatar changes
      const changes = {}
      let changed
      if (data.hasOwnProperty('name')) {
        changes.name = data.name
        changed = true
      }
      if (data.hasOwnProperty('avatar')) {
        changes.avatar = data.avatar
        changed = true
      }
      if (changed) {
        await this.db('users').where('id', entity.data.userId).update(changes)
      }
    }
  }

  onEntityEvent = (socket, event) => {
    const [id, version, name, data] = event
    const entity = this.world.entities.get(id)
    entity?.onEvent(version, name, data, socket.id)
  }

  onEntityRemoved = (socket, id) => {
    if (!socket.player.isBuilder()) return console.error('player attempted to remove entity without builder permission')
    const entity = this.world.entities.get(id)
    this.world.entities.remove(id)
    this.send('entityRemoved', id, socket.id)
    if (entity.isApp) this.dirtyApps.add(id)
  }

  onSettingsModified = (socket, data) => {
    if (!socket.player.isBuilder())
      return console.error('player attempted to modify settings without builder permission')
    this.world.settings.set(data.key, data.value)
    this.send('settingsModified', data, socket.id)
  }

  onSpawnModified = async (socket, op) => {
    if (!socket.player.isBuilder()) {
      return console.error('player attempted to modify spawn without builder permission')
    }
    const player = socket.player
    if (op === 'set') {
      this.spawn = { position: player.data.position.slice(), quaternion: player.data.quaternion.slice() }
    } else if (op === 'clear') {
      this.spawn = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] }
    } else {
      return
    }
    const data = JSON.stringify(this.spawn)
    await this.db('config')
      .insert({
        key: 'spawn',
        value: data,
      })
      .onConflict('key')
      .merge({
        value: data,
      })
    socket.send('chatAdded', {
      id: uuid(),
      from: null,
      fromId: null,
      body: op === 'set' ? 'Spawn updated' : 'Spawn cleared',
      createdAt: moment().toISOString(),
    })
  }

  onPlayerTeleport = (socket, data) => {
    this.sendTo(data.networkId, 'playerTeleport', data)
  }

  onPlayerPush = (socket, data) => {
    this.sendTo(data.networkId, 'playerPush', data)
  }

  onPlayerSessionAvatar = (socket, data) => {
    this.sendTo(data.networkId, 'playerSessionAvatar', data.avatar)
  }

  onAi = (socket, action) => {
    // Allow chat action for all users, but require builder for other AI actions
    if (action.name === 'chat') {
      // Add socketId and userId to chat action for response routing
      action.socketId = socket.id
      action.userId = socket.player?.data?.id || socket.id
      this.world.ai.onAction(action)
    } else {
      if (!socket.player.isBuilder()) {
        return console.error('player attempted to use ai but they are not a builder')
      }
      this.world.ai.onAction(action)
    }
  }

  onPing = (socket, time) => {
    socket.send('pong', time)
  }

  onDisconnect = (socket, code) => {
    this.world.livekit.clearModifiers(socket.id)
    socket.player.destroy(true)
    this.sockets.delete(socket.id)
  }

  async checkDropletOwnership(edifyToken, hostname) {
    try {
      const edifyEngineServerUrl = process.env.PUBLIC_EDIFY_ENGINE_SERVER || 'https://edifyengine.com'
      
      if (!hostname) {
        console.warn('Hostname not available, cannot check droplet ownership')
        return false
      }

      // Get user's droplets from Edify Engine
      const response = await fetch(`${edifyEngineServerUrl}/api/user/droplets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${edifyToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      if (!data.success || !data.droplets) {
        return false
      }

      // Find droplet matching current domain (same logic as client-side getDropletId)
      const currentDroplet = data.droplets.find(droplet => {
        const subdomain = droplet.subdomain ? `${droplet.subdomain}.edifyengine.com` : null
        const customDomain = droplet.customDomain
        return (subdomain && hostname === subdomain) || (customDomain && hostname === customDomain)
      })

      // If we found a matching droplet, the user owns it
      return !!currentDroplet
    } catch (err) {
      console.error('Error checking droplet ownership:', err)
      return false
    }
  }

  async updateAdminStatusForUser(userId, edifyToken, hostname) {
    try {
      // Get user from database
      const user = await this.db('users').where('id', userId).first()
      if (!user) {
        return { success: false, message: 'User not found' }
      }

      // Check if user is droplet owner
      let newRank = user.rank
      if (edifyToken && hostname) {
        try {
          const isOwner = await this.checkDropletOwnership(edifyToken, hostname)
          if (isOwner) {
            // Grant admin access if user is owner
            newRank = Ranks.ADMIN
          } else {
            // Revoke admin access if user is not owner
            if (user.rank === Ranks.ADMIN) {
              newRank = Ranks.VISITOR
            }
          }
        } catch (err) {
          console.error('Error checking droplet ownership:', err)
          // On error, revoke admin if they have it
          if (user.rank === Ranks.ADMIN) {
            newRank = Ranks.VISITOR
          }
        }
      } else {
        // No edifyToken or hostname - revoke admin access if they have it
        if (user.rank === Ranks.ADMIN) {
          newRank = Ranks.VISITOR
        }
      }

      // Update rank if it changed
      if (newRank !== user.rank) {
        await this.db('users').where('id', userId).update({ rank: newRank })
        
        // Update player entity rank
        const socket = this.sockets.get(userId)
        if (socket && socket.player) {
          socket.player.modify({ rank: newRank })
          this.send('entityModified', { id: userId, rank: newRank })
        }

        return { success: true, rank: newRank, changed: true }
      }

      return { success: true, rank: newRank, changed: false }
    } catch (err) {
      console.error('Error updating admin status:', err)
      return { success: false, message: err.message }
    }
  }

  onRequestTokenMetadata = async (socket, tokenMint) => {
    try {
      console.log(`Received token metadata request for: ${tokenMint} from socket ${socket.id}`)

      // Get the Solana system
      const solana = this.world.solana
      if (!solana) {
        console.error('Solana system not initialized')
        return
      }

      // Get token metadata from the server's Solana system
      const token = await solana.programs.token(tokenMint)

      if (!token) {
        console.error(`Token metadata not found for: ${tokenMint}`)
        return
      }

      // Extract just the metadata properties
      const metadata = {
        decimals: token.decimals,
        supply: token.supply,
        name: token.name,
        symbol: token.symbol,
        uri: token.uri,
      }

      // Send metadata back to the client
      this.sendTo(socket.id, 'tokenMetadata', {
        tokenMint,
        metadata,
      })

      console.log(`Sent metadata for token: ${tokenMint} to socket ${socket.id}`)
    } catch (error) {
      console.error(`Error processing token metadata request for ${tokenMint}:`, error)
    }
  }
}
