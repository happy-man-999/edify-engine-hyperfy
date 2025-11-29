import { css } from '@firebolt-dev/css'
import { MenuIcon, MicIcon, MicOffIcon, SettingsIcon, VRIcon } from './Icons'
import {
  BookTextIcon,
  BoxIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CirclePlusIcon,
  CodeIcon,
  DownloadIcon,
  EarthIcon,
  UsersIcon,
  InfoIcon,
  LayersIcon,
  ListTreeIcon,
  LoaderPinwheelIcon,
  MessageSquareTextIcon,
  Move3DIcon,
  OctagonXIcon,
  PinIcon,
  RocketIcon,
  SaveIcon,
  SearchIcon,
  SparkleIcon,
  SquareCheckBigIcon,
  SquareIcon,
  SquareMenuIcon,
  TagIcon,
  Trash2Icon,
  UserXIcon,
  ShieldBanIcon,
  Volume2Icon,
  HammerIcon,
  CircleArrowRightIcon,
  RotateCwIcon,
  EyeIcon,
  EyeOffIcon,
  WalletIcon,
} from 'lucide-react'
import { cls } from './cls'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  FieldBtn,
  FieldCurve,
  FieldFile,
  FieldNumber,
  FieldRange,
  FieldSwitch,
  FieldText,
  FieldTextarea,
  FieldToggle,
  FieldVec3,
  FieldColor,
} from './Fields'
import { HintContext, HintProvider } from './Hint'
import { useFullscreen } from './useFullscreen'
import { downloadFile } from '../../core/extras/downloadFile'
import { exportApp } from '../../core/extras/appTools'
import { hashFile } from '../../core/utils-client'
import { cloneDeep, isArray, isBoolean, sortBy } from 'lodash-es'
import { storage } from '../../core/storage'
import { ScriptEditor } from './ScriptEditor'
import { NodeHierarchy } from './NodeHierarchy'
import { AppsList } from './AppsList'
import { DEG2RAD, RAD2DEG } from '../../core/extras/general'
import * as THREE from '../../core/extras/three'
import { isTouch } from '../utils'
import { uuid } from '../../core/utils'
import { useRank } from './useRank'
import { Ranks } from '../../core/extras/ranks'
import { useSolanaSystem } from './useSolanaSystem'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

const mainSectionPanes = ['prefs']
const worldSectionPanes = ['world', 'docs', 'apps', 'add', 'edify', 'solana', 'wallets']
const appSectionPanes = ['app', 'script', 'nodes', 'meta']

const e1 = new THREE.Euler(0, 0, 0, 'YXZ')
const q1 = new THREE.Quaternion()

/**
 * frosted
 * 
background: rgba(11, 10, 21, 0.85); 
border: 0.0625rem solid #2a2b39;
backdrop-filter: blur(5px);
 *
 */

export function Sidebar({ world, ui }) {
  const player = world.entities.player
  const { isAdmin, isBuilder } = useRank(world, player)
  const [livekit, setLiveKit] = useState(() => world.livekit.status)
  useEffect(() => {
    const onLiveKitStatus = status => {
      setLiveKit({ ...status })
    }
    world.livekit.on('status', onLiveKitStatus)
    return () => {
      world.livekit.off('status', onLiveKitStatus)
    }
  }, [])
  const activePane = ui.active ? ui.pane : null
  return (
    <HintProvider>
      <div
        className='sidebar'
        css={css`
          position: absolute;
          font-size: 1rem;
          top: calc(2rem + env(safe-area-inset-top));
          right: calc(2rem + env(safe-area-inset-right));
          bottom: calc(2rem + env(safe-area-inset-bottom));
          left: calc(2rem + env(safe-area-inset-left));
          display: flex;
          gap: 0.625rem;
          z-index: 1; // above chat etc
          @media all and (max-width: 1200px) {
            top: calc(1rem + env(safe-area-inset-top));
            right: calc(1rem + env(safe-area-inset-right));
            bottom: calc(1rem + env(safe-area-inset-bottom));
            left: calc(1rem + env(safe-area-inset-left));
          }
          .sidebar-sections {
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            gap: 0.625rem;
          }
        `}
      >
        <div className='sidebar-sections'>
          <Section active={activePane} bottom>
            <Btn
              active={activePane === 'prefs'}
              suspended={ui.pane === 'prefs' && !activePane}
              onClick={() => world.ui.togglePane('prefs')}
            >
              <MenuIcon size='1.25rem' />
            </Btn>
            <Btn
              active={activePane === 'players'}
              suspended={ui.pane === 'players' && !activePane}
              onClick={() => world.ui.togglePane('players')}
            >
              <UsersIcon size='1.25rem' />
            </Btn>
            {isTouch && (
              <Btn
                onClick={() => {
                  world.emit('sidebar-chat-toggle')
                }}
              >
                <MessageSquareTextIcon size='1.25rem' />
              </Btn>
            )}
            {livekit.available && !livekit.connected && (
              <Btn disabled>
                <MicOffIcon size='1.25rem' />
              </Btn>
            )}
            {livekit.available && livekit.connected && (
              <Btn
                muted={livekit.mic && (livekit.level === 'disabled' || livekit.muted)}
                onClick={() => {
                  world.livekit.setMicrophoneEnabled()
                }}
              >
                {livekit.mic && livekit.level !== 'disabled' && !livekit.muted ? (
                  <MicIcon size='1.25rem' />
                ) : (
                  <MicOffIcon size='1.25rem' />
                )}
              </Btn>
            )}
            {world.xr.supportsVR && (
              <Btn
                onClick={() => {
                  world.xr.enter()
                }}
              >
                <VRIcon size='1.25rem' />
              </Btn>
            )}
          </Section>
          <Section active={activePane} top bottom>
            <Btn
              active={activePane === 'edify'}
              suspended={ui.pane === 'edify' && !activePane}
              onClick={() => world.ui.togglePane('edify')}
            >
              <span
                css={css`
                  font-size: 1.25rem;
                  font-weight: 600;
                  color: inherit;
                `}
              >
                E
              </span>
            </Btn>
            <Btn
              active={activePane === 'solana'}
              suspended={ui.pane === 'solana' && !activePane}
              onClick={() => world.ui.togglePane('solana')}
            >
              <HammerIcon size='1.25rem' />
            </Btn>
            {isAdmin && (
              <Btn
                active={activePane === 'wallets'}
                suspended={ui.pane === 'wallets' && !activePane}
                onClick={() => world.ui.togglePane('wallets')}
              >
                <WalletIcon size='1.25rem' />
              </Btn>
            )}
            {isBuilder && (
              <>
                <Btn
                  active={activePane === 'world'}
                  suspended={ui.pane === 'world' && !activePane}
                  onClick={() => world.ui.togglePane('world')}
                >
                  <EarthIcon size='1.25rem' />
                </Btn>
                {/* <Btn
                active={activePane === 'docs'}
                suspended={ui.pane === 'docs' && !activePane}
                onClick={() => world.ui.togglePane('docs')}
              >
                <BookTextIcon size='1.25rem' />
              </Btn> */}
                <Btn
                  active={activePane === 'apps'}
                  suspended={ui.pane === 'apps' && !activePane}
                  onClick={() => world.ui.togglePane('apps')}
                >
                  <LayersIcon size='1.25rem' />
                </Btn>
                <Btn
                  active={activePane === 'add'}
                  suspended={ui.pane === 'add' && !activePane}
                  onClick={() => world.ui.togglePane('add')}
                >
                  <CirclePlusIcon size='1.25rem' />
                </Btn>
              </>
            )}
          </Section>
          {ui.app && (
            <Section active={activePane} top bottom>
              <Btn
                active={activePane === 'app'}
                suspended={ui.pane === 'app' && !activePane}
                onClick={() => world.ui.togglePane('app')}
              >
                <SquareMenuIcon size='1.25rem' />
              </Btn>
              <Btn
                active={activePane === 'script'}
                suspended={ui.pane === 'script' && !activePane}
                onClick={() => world.ui.togglePane('script')}
              >
                <CodeIcon size='1.25rem' />
              </Btn>
              <Btn
                active={activePane === 'nodes'}
                suspended={ui.pane === 'nodes' && !activePane}
                onClick={() => world.ui.togglePane('nodes')}
              >
                <ListTreeIcon size='1.25rem' />
              </Btn>
              <Btn
                active={activePane === 'meta'}
                suspended={ui.pane === 'meta' && !activePane}
                onClick={() => world.ui.togglePane('meta')}
              >
                <TagIcon size='1.25rem' />
              </Btn>
            </Section>
          )}
        </div>
        {ui.pane === 'prefs' && <Prefs world={world} hidden={!ui.active} />}
        {ui.pane === 'world' && <World world={world} hidden={!ui.active} />}
        {ui.pane === 'apps' && <Apps world={world} hidden={!ui.active} />}
        {ui.pane === 'add' && <Add world={world} hidden={!ui.active} />}
        {ui.pane === 'edify' && <Edify world={world} hidden={!ui.active} />}
        {ui.pane === 'solana' && <SolanaWallet world={world} hidden={!ui.active} />}
        {ui.pane === 'wallets' && <Wallets world={world} hidden={!ui.active} />}
        {ui.pane === 'app' && <App key={ui.app.data.id} world={world} hidden={!ui.active} />}
        {ui.pane === 'script' && <Script key={ui.app.data.id} world={world} hidden={!ui.active} />}
        {ui.pane === 'nodes' && <Nodes key={ui.app.data.id} world={world} hidden={!ui.active} />}
        {ui.pane === 'meta' && <Meta key={ui.app.data.id} world={world} hidden={!ui.active} />}
        {ui.pane === 'players' && <Players world={world} hidden={!ui.active} />}
      </div>
    </HintProvider>
  )
}

function Section({ active, top, bottom, children }) {
  return (
    <div
      className={cls('sidebar-section', { active, top, bottom })}
      css={css`
        background: rgba(11, 10, 21, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 2rem;
        padding: 0.6875rem 0;
        pointer-events: auto;
        position: relative;
        &.active {
          background: rgba(11, 10, 21, 0.9);
        }
      `}
    >
      {children}
    </div>
  )
}

function Btn({ disabled, suspended, active, muted, children, ...props }) {
  return (
    <div
      className={cls('sidebar-btn', { disabled, suspended, active, muted })}
      css={css`
        width: 2.75rem;
        height: 1.875rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        position: relative;
        .sidebar-btn-dot {
          display: none;
          position: absolute;
          top: 0.8rem;
          right: 0.2rem;
          width: 0.3rem;
          height: 0.3rem;
          border-radius: 0.15rem;
          background: white;
        }
        &:hover {
          cursor: pointer;
          color: white;
        }
        &.active {
          color: white;
          .sidebar-btn-dot {
            display: block;
          }
        }
        &.suspended {
          .sidebar-btn-dot {
            display: block;
            /* background: rgb(26, 151, 241); */
          }
        }
        &.disabled {
          color: rgba(255, 255, 255, 0.3);
        }
        &.muted {
          color: #ff4b4b;
        }
      `}
      {...props}
    >
      {children}
      <div className='sidebar-btn-dot' />
    </div>
  )
}

function Content({ width = '20rem', hidden, children }) {
  return (
    <div
      className={cls('sidebar-content', { hidden })}
      css={css`
        width: ${width};
        pointer-events: auto;
        .sidebar-content-main {
          background: rgba(11, 10, 21, 0.85);
          border: 0.0625rem solid #2a2b39;
          backdrop-filter: blur(5px);
          border-radius: 1rem;
          display: flex;
          align-items: stretch;
        }
        &.hidden {
          opacity: 0;
          pointer-events: none;
        }
      `}
    >
      <div className='sidebar-content-main'>{children}</div>
      <Hint />
    </div>
  )
}

function Pane({ width = '20rem', hidden, children }) {
  return (
    <div
      className={cls('sidebarpane', { hidden })}
      css={css`
        width: ${width};
        max-width: 100%;
        display: flex;
        flex-direction: column;
        .sidebarpane-content {
          pointer-events: auto;
          max-height: 100%;
          display: flex;
          flex-direction: column;
        }
        &.hidden {
          opacity: 0;
          pointer-events: none;
        }
      `}
    >
      <div className='sidebarpane-content'>{children}</div>
      <Hint />
    </div>
  )
}

function Hint() {
  const { hint } = useContext(HintContext)
  if (!hint) return null
  return (
    <div
      className='hint'
      css={css`
        margin-top: 0.25rem;
        background: rgba(11, 10, 21, 0.85);
        border: 0.0625rem solid #2a2b39;
        backdrop-filter: blur(5px);
        border-radius: 1rem;
        min-width: 0;
        padding: 1rem;
        font-size: 0.9375rem;
      `}
    >
      <span>{hint}</span>
    </div>
  )
}

function Group({ label }) {
  return (
    <>
      <div
        css={css`
          height: 0.0625rem;
          background: rgba(255, 255, 255, 0.05);
          margin: 0.6rem 0;
        `}
      />
      {label && (
        <div
          css={css`
            font-weight: 500;
            line-height: 1;
            padding: 0.75rem 0 0.75rem 1rem;
            margin-top: -0.6rem;
          `}
        >
          {label}
        </div>
      )}
    </>
  )
}

const shadowOptions = [
  { label: 'None', value: 'none' },
  { label: 'Low', value: 'low' },
  { label: 'Med', value: 'med' },
  { label: 'High', value: 'high' },
]
function Prefs({ world, hidden }) {
  const player = world.entities.player
  const { isAdmin, isBuilder } = useRank(world, player)
  const [name, setName] = useState(() => player.data.name)
  const [dpr, setDPR] = useState(world.prefs.dpr)
  const [shadows, setShadows] = useState(world.prefs.shadows)
  const [postprocessing, setPostprocessing] = useState(world.prefs.postprocessing)
  const [bloom, setBloom] = useState(world.prefs.bloom)
  const [ao, setAO] = useState(world.prefs.ao)
  const [music, setMusic] = useState(world.prefs.music)
  const [sfx, setSFX] = useState(world.prefs.sfx)
  const [voice, setVoice] = useState(world.prefs.voice)
  const [ui, setUI] = useState(world.prefs.ui)
  const [canFullscreen, isFullscreen, toggleFullscreen] = useFullscreen()
  const [actions, setActions] = useState(world.prefs.actions)
  const [stats, setStats] = useState(world.prefs.stats)
  const changeName = name => {
    if (!name) return setName(player.data.name)
    player.setName(name)
  }
  const dprOptions = useMemo(() => {
    const width = world.graphics.width
    const height = world.graphics.height
    const dpr = window.devicePixelRatio
    const options = []
    const add = (label, dpr) => {
      options.push({
        // label: `${Math.round(width * dpr)} x ${Math.round(height * dpr)}`,
        label,
        value: dpr,
      })
    }
    add('0.5x', 0.5)
    add('1x', 1)
    if (dpr >= 2) add('2x', 2)
    if (dpr >= 3) add('3x', dpr)
    return options
  }, [])
  useEffect(() => {
    const onPrefsChange = changes => {
      if (changes.dpr) setDPR(changes.dpr.value)
      if (changes.shadows) setShadows(changes.shadows.value)
      if (changes.postprocessing) setPostprocessing(changes.postprocessing.value)
      if (changes.bloom) setBloom(changes.bloom.value)
      if (changes.ao) setAO(changes.ao.value)
      if (changes.music) setMusic(changes.music.value)
      if (changes.sfx) setSFX(changes.sfx.value)
      if (changes.voice) setVoice(changes.voice.value)
      if (changes.ui) setUI(changes.ui.value)
      if (changes.actions) setActions(changes.actions.value)
      if (changes.stats) setStats(changes.stats.value)
    }
    world.prefs.on('change', onPrefsChange)
    return () => {
      world.prefs.off('change', onPrefsChange)
    }
  }, [])
  return (
    <Pane hidden={hidden}>
      <div
        className='prefs noscrollbar'
        css={css`
          overflow-y: auto;
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          padding: 0.6rem 0;
        `}
      >
        <FieldText label='Name' hint='Change your name' value={name} onChange={changeName} />
        <Group label='Interface' />
        <FieldRange
          label='Scale'
          hint='Change the scale of the user interface'
          min={0.5}
          max={1.5}
          step={0.1}
          value={ui}
          onChange={ui => world.prefs.setUI(ui)}
        />
        <FieldToggle
          label='Fullscreen'
          hint='Toggle fullscreen. Not supported in some browsers'
          value={isFullscreen}
          onChange={value => toggleFullscreen(value)}
          trueLabel='Enabled'
          falseLabel='Disabled'
        />
        {isBuilder && (
          <FieldToggle
            label='Build Prompts'
            hint='Show or hide action prompts when in build mode'
            value={actions}
            onChange={actions => world.prefs.setActions(actions)}
            trueLabel='Visible'
            falseLabel='Hidden'
          />
        )}
        <FieldToggle
          label='Stats'
          hint='Show or hide performance stats'
          value={world.prefs.stats}
          onChange={stats => world.prefs.setStats(stats)}
          trueLabel='Visible'
          falseLabel='Hidden'
        />
        {!isTouch && (
          <FieldBtn
            label='Hide Interface'
            note='Z'
            hint='Hide the user interface. Press Z to re-enable.'
            onClick={() => world.ui.toggleVisible()}
          />
        )}
        <Group label='Graphics' />
        <FieldSwitch
          label='Resolution'
          hint='Change your display resolution'
          options={dprOptions}
          value={dpr}
          onChange={dpr => world.prefs.setDPR(dpr)}
        />
        <FieldSwitch
          label='Shadows'
          hint='Change the quality of shadows in the world'
          options={shadowOptions}
          value={shadows}
          onChange={shadows => world.prefs.setShadows(shadows)}
        />
        <FieldToggle
          label='Post-processing'
          hint='Enable or disable all postprocessing effects'
          trueLabel='On'
          falseLabel='Off'
          value={postprocessing}
          onChange={postprocessing => world.prefs.setPostprocessing(postprocessing)}
        />
        <FieldToggle
          label='Bloom'
          hint='Enable or disable the bloom effect'
          trueLabel='On'
          falseLabel='Off'
          value={bloom}
          onChange={bloom => world.prefs.setBloom(bloom)}
        />
        {world.settings.ao && (
          <FieldToggle
            label='Ambient Occlusion'
            hint='Enable or disable the ambient occlusion effect'
            trueLabel='On'
            falseLabel='Off'
            value={ao}
            onChange={ao => world.prefs.setAO(ao)}
          />
        )}
        <Group label='Audio' />
        <FieldRange
          label='Music'
          hint='Adjust general music volume'
          min={0}
          max={2}
          step={0.05}
          value={music}
          onChange={music => world.prefs.setMusic(music)}
        />
        <FieldRange
          label='SFX'
          hint='Adjust sound effects volume'
          min={0}
          max={2}
          step={0.05}
          value={sfx}
          onChange={sfx => world.prefs.setSFX(sfx)}
        />
        <FieldRange
          label='Voice'
          hint='Adjust global voice chat volume'
          min={0}
          max={2}
          step={0.05}
          value={voice}
          onChange={voice => world.prefs.setVoice(voice)}
        />
      </div>
    </Pane>
  )
}

function WorldControls({ world }) {
  const [isRestarting, setIsRestarting] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Handle token expiration - clear token and navigate to Edify sign in
  const handleTokenExpiration = () => {
    localStorage.removeItem('edifyToken')
    world.ui.togglePane('add')
    // Show login in Add section - this will be handled by the Add component
    // which shows EdifyLogin when there's no token
  }

  // Helper to check response and handle token expiration
  const checkResponseAndHandleToken = async (response) => {
    if (response.status === 401) {
      handleTokenExpiration()
      throw new Error('Session expired. Please sign in again.')
    }
    return response
  }

  // Get dropletId from current domain
  const getDropletId = async () => {
    const token = localStorage.getItem('edifyToken')
    if (!token) {
      throw new Error('Not authenticated. Please log in to Edify Engine.')
    }

    const edifyEngineUrl = globalThis.env?.PUBLIC_EDIFY_ENGINE_URL || 'https://edifyengine.com'
    const hostname = window.location.hostname
    
    // Try to fetch user droplets and find matching one
    try {
      const response = await fetch(`${edifyEngineUrl}/api/user/droplets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      await checkResponseAndHandleToken(response)

      if (!response.ok) {
        throw new Error('Failed to fetch droplets')
      }

      const data = await response.json()
      const droplets = data.droplets || []
      
      // Find droplet matching current domain
      const currentDroplet = droplets.find(droplet => {
        const subdomain = droplet.subdomain ? `${droplet.subdomain}.edifyengine.com` : null
        const customDomain = droplet.customDomain
        return (subdomain && hostname === subdomain) || (customDomain && hostname === customDomain)
      })

      if (!currentDroplet) {
        throw new Error('Could not find droplet for current domain')
      }

      return currentDroplet.dropletId
    } catch (error) {
      console.error('Error getting droplet ID:', error)
      throw error
    }
  }

  const handleRestartClick = async () => {
    if (isRestarting) return
    
    const confirmed = window.confirm('Are you sure you want to restart this world? This will temporarily take the world offline while it restarts.')
    if (!confirmed) return
    
    setIsRestarting(true)
    try {
      const token = localStorage.getItem('edifyToken')
      if (!token) {
        alert('Not authenticated. Please log in to Edify Engine.')
        return
      }

      const dropletId = await getDropletId()
      const edifyEngineUrl = globalThis.env?.PUBLIC_EDIFY_ENGINE_URL || 'https://edifyengine.com'
      
      const response = await fetch(`${edifyEngineUrl}/api/user/droplets/${dropletId}/restart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      await checkResponseAndHandleToken(response)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to restart droplet')
      }

      alert('Restart initiated! Your world is restarting.')
    } catch (error) {
      console.error('Error restarting world:', error)
      alert('Restart failed: ' + error.message)
      setIsRestarting(false)
    }
  }

  const handleBackupClick = async () => {
    if (isBackingUp) return
    
    const snapshotName = window.prompt('Enter a name for the snapshot:', `backup-${new Date().toISOString().slice(0, 10)}`)
    if (!snapshotName) return
    
    setIsBackingUp(true)
    try {
      const token = localStorage.getItem('edifyToken')
      if (!token) {
        alert('Not authenticated. Please log in to Edify Engine.')
        return
      }

      const dropletId = await getDropletId()
      const edifyEngineUrl = globalThis.env?.PUBLIC_EDIFY_ENGINE_URL || 'https://edifyengine.com'
      
      const response = await fetch(`${edifyEngineUrl}/api/user/droplets/${dropletId}/backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ snapshotName })
      })

      await checkResponseAndHandleToken(response)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to backup droplet')
      }

      alert('Snapshot creation initiated! Your droplet will be powered off, snapshotted, and powered back on.')
    } catch (error) {
      console.error('Error creating backup:', error)
      alert('Backup failed: ' + error.message)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleEditorClick = () => {
    const hostname = window.location.hostname
    const editorUrl = `https://${hostname}/editor`
    window.open(editorUrl, '_blank')
  }

  const handleDeleteClick = async () => {
    if (isDeleting) return
    
    const confirmed = window.confirm('Are you sure you want to delete this world? This action cannot be undone and will permanently remove the world and all its data.')
    if (!confirmed) return
    
    setIsDeleting(true)
    try {
      const token = localStorage.getItem('edifyToken')
      if (!token) {
        alert('Not authenticated. Please log in to Edify Engine.')
        return
      }

      const dropletId = await getDropletId()
      const edifyEngineUrl = globalThis.env?.PUBLIC_EDIFY_ENGINE_URL || 'https://edifyengine.com'
      
      const response = await fetch(`${edifyEngineUrl}/api/admin/droplets/${dropletId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      await checkResponseAndHandleToken(response)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete droplet')
      }

      alert('World deleted successfully.')
      // Optionally redirect to home
      window.location.href = edifyEngineUrl
    } catch (error) {
      console.error('Error deleting world:', error)
      alert('Delete failed: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0 1rem;
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}
    >
      <div
        css={css`
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        `}
      >
        <button
          onClick={handleRestartClick}
          disabled={isRestarting}
          css={css`
            flex: 1;
            min-width: 6rem;
            padding: 0.5rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: all 0.2s;
            &:hover:not(:disabled) {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.2);
            }
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          `}
          title="Restart World"
        >
          <RotateCwIcon 
            size='1rem' 
            css={css`
              ${isRestarting ? 'animation: spin 1s linear infinite;' : ''}
            `}
          />
          Restart
        </button>
      </div>
      <div
        css={css`
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        `}
      >
        <button
          onClick={handleBackupClick}
          disabled={isBackingUp}
          css={css`
            flex: 1;
            min-width: 6rem;
            padding: 0.5rem;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: all 0.2s;
            &:hover:not(:disabled) {
              background: rgba(59, 130, 246, 0.2);
              border-color: rgba(59, 130, 246, 0.4);
            }
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          `}
          title="Create Backup"
        >
          <SaveIcon 
            size='1rem' 
            css={css`
              ${isBackingUp ? 'animation: spin 1s linear infinite;' : ''}
            `}
          />
          Backup
        </button>
        <button
          onClick={handleEditorClick}
          css={css`
            flex: 1;
            min-width: 6rem;
            padding: 0.5rem;
            background: rgba(147, 51, 234, 0.1);
            border: 1px solid rgba(147, 51, 234, 0.3);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: all 0.2s;
            &:hover {
              background: rgba(147, 51, 234, 0.2);
              border-color: rgba(147, 51, 234, 0.4);
            }
          `}
          title="Open Editor"
        >
          <CodeIcon size='1rem' />
          Editor
        </button>
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          css={css`
            flex: 1;
            min-width: 6rem;
            padding: 0.5rem;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: all 0.2s;
            &:hover:not(:disabled) {
              background: rgba(239, 68, 68, 0.2);
              border-color: rgba(239, 68, 68, 0.4);
            }
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          `}
          title="Delete World"
        >
          <Trash2Icon 
            size='1rem' 
            css={css`
              ${isDeleting ? 'animation: spin 1s linear infinite;' : ''}
            `}
          />
          Delete
        </button>
      </div>
    </div>
  )
}

const voiceChatOptions = [
  { label: 'Disabled', value: 'disabled' },
  { label: 'Spatial', value: 'spatial' },
  { label: 'Global', value: 'global' },
]
const rankOptions = [
  { label: 'Admins', value: 2 },
  { label: 'Builders', value: 1 },
  { label: 'Visitors', value: 0 },
]
function World({ world, hidden }) {
  const player = world.entities.player
  const { isAdmin } = useRank(world, player)
  const [title, setTitle] = useState(world.settings.title)
  const [desc, setDesc] = useState(world.settings.desc)
  const [image, setImage] = useState(world.settings.image)
  const [avatar, setAvatar] = useState(world.settings.avatar)
  const [customAvatars, setCustomAvatars] = useState(world.settings.customAvatars)
  const [voice, setVoice] = useState(world.settings.voice)
  const [playerLimit, setPlayerLimit] = useState(world.settings.playerLimit)
  const [ao, setAO] = useState(world.settings.ao)
  const [rank, setRank] = useState(world.settings.rank)
  useEffect(() => {
    const onChange = changes => {
      if (changes.title) setTitle(changes.title.value)
      if (changes.desc) setDesc(changes.desc.value)
      if (changes.image) setImage(changes.image.value)
      if (changes.avatar) setAvatar(changes.avatar.value)
      if (changes.customAvatars) setCustomAvatars(changes.customAvatars.value)
      if (changes.voice) setVoice(changes.voice.value)
      if (changes.playerLimit) setPlayerLimit(changes.playerLimit.value)
      if (changes.ao) setAO(changes.ao.value)
      if (changes.rank) setRank(changes.rank.value)
    }
    world.settings.on('change', onChange)
    return () => {
      world.settings.off('change', onChange)
    }
  }, [])
  return (
    <Pane hidden={hidden}>
      <div
        className='world'
        css={css`
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          display: flex;
          flex-direction: column;
          min-height: 12rem;
          .world-head {
            height: 3.125rem;
            padding: 0 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
          }
          .world-title {
            font-weight: 500;
            font-size: 1rem;
            line-height: 1;
          }
          .world-content {
            flex: 1;
            padding: 0.5rem 0;
            overflow-y: auto;
          }
        `}
      >
        <div className='world-head'>
          <div className='world-title'>World</div>
        </div>
        <div className='world-content noscrollbar'>
          <FieldText
            label='Title'
            hint='Change the title of this world. Shown in the browser tab and when sharing links'
            placeholder='World'
            value={title}
            onChange={value => world.settings.set('title', value, true)}
          />
          <FieldText
            label='Description'
            hint='Change the description of this world. Shown in previews when sharing links to this world'
            value={desc}
            onChange={value => world.settings.set('desc', value, true)}
          />
          <FieldFile
            label='Image'
            hint='Change the image of the world. This is shown when loading into or sharing links to this world.'
            kind='image'
            value={image}
            onChange={value => world.settings.set('image', value, true)}
            world={world}
          />
          <FieldFile
            label='Default Avatar'
            hint='Change the default avatar everyone spawns into the world with'
            kind='avatar'
            value={avatar}
            onChange={value => world.settings.set('avatar', value, true)}
            world={world}
          />
          {isAdmin && world.settings.hasAdminCode && (
            <FieldToggle
              label='Custom Avatars'
              hint='Allow visitors to drag and drop custom VRM avatars.'
              trueLabel='On'
              falseLabel='Off'
              value={customAvatars}
              onChange={value => world.settings.set('customAvatars', value, true)}
            />
          )}
          <FieldSwitch
            label='Voice Chat'
            hint='Set the base voice chat mode. Apps are able to modify this using custom rules.'
            options={voiceChatOptions}
            value={voice}
            onChange={voice => world.settings.set('voice', voice, true)}
          />
          <FieldNumber
            label='Player Limit'
            hint='Set a maximum number of players that can be in the world at one time. Zero means unlimited.'
            value={playerLimit}
            onChange={value => world.settings.set('playerLimit', value, true)}
          />
          <FieldToggle
            label='Ambient Occlusion'
            hint={`Improves visuals by approximating darkened corners etc. When enabled, users also have an option to disable this on their device for performance.`}
            trueLabel='On'
            falseLabel='Off'
            value={ao}
            onChange={value => world.settings.set('ao', value, true)}
          />
          {isAdmin && world.settings.hasAdminCode && (
            <FieldToggle
              label='Free Build'
              hint='Allow everyone to build (and destroy) things in the world.'
              trueLabel='On'
              falseLabel='Off'
              value={rank >= Ranks.BUILDER}
              onChange={value => world.settings.set('rank', value ? Ranks.BUILDER : Ranks.VISITOR, true)}
            />
          )}
          {/* <FieldBtn
          label='Set Spawn'
          hint='Sets the location players spawn to the location you are currently standing'
          onClick={() => {
            world.network.send('spawnModified', 'set')
          }}
        /> */}
          {/* <FieldBtn
          label='Clear Spawn'
          hint='Resets the spawn point to origin'
          onClick={() => {
            world.network.send('spawnModified', 'clear')
          }}
        /> */}
          <Group label='AI API Key' />
          <AIApiKeyInput />
          <Group label='World Controls' />
          <WorldControls world={world} />
        </div>
      </div>
    </Pane>
  )
}

function AIApiKeyInput() {
  const [aiApiKey, setAiApiKey] = useState('')
  const [isLoadingAiKey, setIsLoadingAiKey] = useState(false)
  const [isSavingAiKey, setIsSavingAiKey] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  // Fetch AI API key on mount
  useEffect(() => {
    const fetchAiApiKey = async () => {
      setIsLoadingAiKey(true)
      try {
        const response = await fetch('/api/ai-api-key')
        if (response.ok) {
          const data = await response.json()
          setAiApiKey(data.AI_API_KEY || '')
        }
      } catch (error) {
        console.error('Error fetching AI API key:', error)
      } finally {
        setIsLoadingAiKey(false)
      }
    }
    fetchAiApiKey()
  }, [])

  // Save AI API key
  const handleSaveAiApiKey = async () => {
    setIsSavingAiKey(true)
    try {
      const response = await fetch('/api/ai-api-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey: aiApiKey })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'AI API key saved successfully')
      } else {
        const data = await response.json()
        alert('Failed to save: ' + (data.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving AI API key:', error)
      alert('Failed to save AI API key: ' + error.message)
    } finally {
      setIsSavingAiKey(false)
    }
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0 1rem;
      `}
    >
      <div
        css={css`
          display: flex;
          gap: 0.5rem;
          align-items: center;
        `}
      >
        <div
          css={css`
            flex: 1;
            position: relative;
            display: flex;
            align-items: center;
          `}
        >
          <input
            type={showApiKey ? 'text' : 'password'}
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            placeholder={isLoadingAiKey ? 'Loading...' : 'Enter AI API Key'}
            disabled={isLoadingAiKey || isSavingAiKey}
            css={css`
              flex: 1;
              padding: 0.5rem;
              padding-right: 2.5rem;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 0.5rem;
              color: white;
              font-size: 0.875rem;
              &::placeholder {
                color: rgba(255, 255, 255, 0.5);
              }
              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }
              &:focus {
                outline: none;
                border-color: rgba(255, 255, 255, 0.3);
              }
            `}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            disabled={isLoadingAiKey || isSavingAiKey}
            css={css`
              position: absolute;
              right: 0.5rem;
              background: transparent;
              border: none;
              color: rgba(255, 255, 255, 0.6);
              cursor: pointer;
              padding: 0.25rem;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: color 0.2s;
              &:hover:not(:disabled) {
                color: rgba(255, 255, 255, 0.9);
              }
              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }
            `}
            title={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showApiKey ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
        <button
          onClick={handleSaveAiApiKey}
          disabled={isSavingAiKey || isLoadingAiKey}
          css={css`
            padding: 0.5rem 1rem;
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
            &:hover:not(:disabled) {
              background: rgba(59, 130, 246, 0.3);
              border-color: rgba(59, 130, 246, 0.4);
            }
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          `}
        >
          {isSavingAiKey ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

const appsState = {
  query: '',
  perf: false,
  scrollTop: 0,
}
function Apps({ world, hidden }) {
  const contentRef = useRef()
  const [query, setQuery] = useState(appsState.query)
  const [perf, setPerf] = useState(appsState.perf)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    contentRef.current.scrollTop = appsState.scrollTop
  }, [])
  useEffect(() => {
    appsState.query = query
    appsState.perf = perf
  }, [query, perf])
  return (
    <Pane width={perf ? '40rem' : '20rem'} hidden={hidden}>
      <div
        className='apps'
        css={css`
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 17rem;
          .apps-head {
            height: 3.125rem;
            padding: 0 0.6rem 0 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
          }
          .apps-title {
            flex: 1;
            font-weight: 500;
            font-size: 1rem;
            line-height: 1;
          }
          .apps-search {
            display: flex;
            align-items: center;
            input {
              margin-left: 0.5rem;
              width: 5rem;
              font-size: 0.9375rem;
              &::placeholder {
                color: #5d6077;
              }
              &::selection {
                background-color: white;
                color: rgba(0, 0, 0, 0.8);
              }
            }
          }
          .apps-toggle {
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 0 0 1rem;
            color: #5d6077;
            &:hover {
              cursor: pointer;
            }
            &.active {
              color: white;
            }
          }
          .apps-content {
            flex: 1;
            overflow-y: auto;
          }
        `}
      >
        <div className='apps-head'>
          <div className='apps-title'>Apps</div>
          <label className='apps-search'>
            <SearchIcon size='1.125rem' />
            <input type='text' placeholder='Search' value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <div className={cls('apps-toggle', { active: perf })} onClick={() => setPerf(!perf)}>
            <RocketIcon size='1.125rem' />
          </div>
        </div>
        <div
          ref={contentRef}
          className='apps-content noscrollbar'
          onScroll={e => {
            appsState.scrollTop = contentRef.current.scrollTop
          }}
        >
          <AppsList world={world} query={query} perf={perf} refresh={refresh} setRefresh={setRefresh} />
        </div>
      </div>
    </Pane>
  )
}

function Add({ world, hidden }) {
  // note: multiple collections are supported by the engine but for now we just use the 'default' collection.
  const collection = world.collections.get('default')
  const span = 4
  const gap = '0.5rem'
  const add = blueprint => {
    blueprint = cloneDeep(blueprint)
    blueprint.id = uuid()
    blueprint.version = 0
    world.blueprints.add(blueprint, true)
    const transform = world.builder.getSpawnTransform(true)
    world.builder.toggle(true)
    world.builder.control.pointer.lock()
    setTimeout(() => {
      const data = {
        id: uuid(),
        type: 'app',
        blueprint: blueprint.id,
        position: transform.position,
        quaternion: transform.quaternion,
        scale: [1, 1, 1],
        mover: world.network.id,
        uploader: null,
        pinned: false,
        state: {},
      }
      const app = world.entities.add(data, true)
      world.builder.select(app)
    }, 100)
  }
  return (
    <Pane hidden={hidden}>
      <div
        className='add'
        css={css`
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          display: flex;
          flex-direction: column;
          min-height: 17rem;
          .add-head {
            height: 3.125rem;
            padding: 0 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .add-title {
            font-weight: 500;
            font-size: 1rem;
            line-height: 1;
          }
          .add-content {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
          }
          .add-items {
            display: flex;
            align-items: stretch;
            flex-wrap: wrap;
            gap: ${gap};
          }
          .add-item {
            flex-basis: calc((100% / ${span}) - (${gap} * (${span} - 1) / ${span}));
            cursor: pointer;
          }
          .add-item-image {
            width: 100%;
            aspect-ratio: 1;
            background-color: #1c1d22;
            background-size: cover;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 0.7rem;
            margin: 0 0 0.4rem;
          }
          .add-item-name {
            text-align: center;
            font-size: 0.875rem;
          }
        `}
      >
        <div className='add-head'>
          <div className='add-title'>Add</div>
        </div>
        <div className='add-content noscrollbar'>
          <div className='add-items'>
            {collection.blueprints.map(blueprint => (
              <div className='add-item' key={blueprint.id} onClick={() => add(blueprint)}>
                <div
                  className='add-item-image'
                  css={css`
                    background-image: url(${world.resolveURL(blueprint.image?.url)});
                  `}
                ></div>
                <div className='add-item-name'>{blueprint.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Pane>
  )
}

function Edify({ world, hidden }) {
  return (
    <Pane hidden={hidden}>
      <div
        className='edify'
        css={css`
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 17rem;
          padding: 1rem;
          overflow-y: auto;
        `}
      >
        <EdifyItems world={world} onClose={() => world.ui.togglePane(null)} />
      </div>
    </Pane>
  )
}

function SolanaWallet({ world, hidden }) {
  const { wallet } = useSolanaSystem(world)
  const { setVisible } = useWalletModal()
  const isConnected = wallet?.connected && wallet?.publicKey

  const handleConnect = () => {
    // Open the wallet selection modal
    // The modal will handle wallet selection and connection
    setVisible(true)
  }

  const handleDisconnect = async () => {
    try {
      if (wallet) {
        await wallet.disconnect()
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  return (
    <Pane hidden={hidden}>
      <div
        className='solana-wallet'
        css={css`
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 17rem;
          padding: 1rem;
          overflow-y: auto;
        `}
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: 1rem;
          `}
        >
          <div
            css={css`
              font-size: 1rem;
              font-weight: 500;
              margin-bottom: 0.5rem;
            `}
          >
            Solana Wallet
          </div>

          {!isConnected ? (
            <>
              <div
                css={css`
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  padding: 0.75rem;
                  background: rgba(255, 255, 255, 0.05);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 0.5rem;
                  font-size: 0.875rem;
                  color: rgba(255, 255, 255, 0.8);
                `}
              >
                <InfoIcon size='1rem' />
                <span>You'll sign as builder of this world</span>
              </div>
              <button
                onClick={handleConnect}
                disabled={!wallet || wallet.connecting}
                css={css`
                  padding: 0.75rem 1.5rem;
                  background: linear-gradient(135deg, #9945ff 0%, #14f195 100%);
                  border: none;
                  border-radius: 0.5rem;
                  color: white;
                  font-size: 0.9375rem;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  &:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(153, 69, 255, 0.4);
                  }
                  &:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                  }
                `}
              >
                {wallet?.connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </>
          ) : (
            <>
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: 0.75rem;
                  padding: 1rem;
                  background: rgba(20, 241, 149, 0.1);
                  border: 1px solid rgba(20, 241, 149, 0.3);
                  border-radius: 0.5rem;
                `}
              >
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #14f195;
                  `}
                >
                  <div
                    css={css`
                      width: 0.5rem;
                      height: 0.5rem;
                      background: #14f195;
                      border-radius: 50%;
                      animation: pulse 2s infinite;
                      @keyframes pulse {
                        0%, 100% {
                          opacity: 1;
                        }
                        50% {
                          opacity: 0.5;
                        }
                      }
                    `}
                  />
                  Connected
                </div>
                <div
                  css={css`
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                  `}
                >
                  <div
                    css={css`
                      font-size: 0.75rem;
                      color: rgba(255, 255, 255, 0.6);
                    `}
                  >
                    Wallet Address:
                  </div>
                  <div
                    css={css`
                      font-size: 0.875rem;
                      font-family: monospace;
                      color: rgba(255, 255, 255, 0.9);
                      word-break: break-all;
                    `}
                  >
                    {wallet.publicKey?.toString()}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                css={css`
                  padding: 0.75rem 1.5rem;
                  background: rgba(239, 68, 68, 0.1);
                  border: 1px solid rgba(239, 68, 68, 0.3);
                  border-radius: 0.5rem;
                  color: #ef4444;
                  font-size: 0.9375rem;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  &:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.5);
                  }
                `}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>
    </Pane>
  )
}

const edifyTypes = [
  { value: 'my-purchases', label: 'My Purchases', icon: '🛒', isPurchaseFilter: true },
  { value: 'app', label: 'App', icon: '📱' },
  { value: 'bundle', label: 'Bundle', icon: '📦' },
  { value: 'template', label: 'Template', icon: '📋' },
  { value: 'world', label: 'World', icon: '🌍' },
  { value: 'asset', label: 'Asset', icon: '🎨' },
  { value: 'service', label: 'Service', icon: '⚙️' },
  { value: '3d-object', label: '3D Object', icon: '🧊' },
]

function EdifyLogin({ onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Listen for Google auth messages from popup
    const handleMessage = async (event) => {
      if (event.data.type === 'edify-google-auth-success' && event.data.token) {
        localStorage.setItem('edifyToken', event.data.token)
        
        // Check and update admin status after sign-in
        try {
          const authToken = storage.get('authToken')
          if (authToken) {
            const checkResponse = await fetch('/api/edify/check-admin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ authToken, edifyToken: event.data.token }),
            })

            if (checkResponse.ok) {
              const checkData = await checkResponse.json()
              if (checkData.changed) {
                console.log('Admin status updated:', checkData.rank)
              }
            }
          }
        } catch (err) {
          console.error('Error checking admin status:', err)
        }
        
        onLoginSuccess()
      } else if (event.data.type === 'edify-google-auth-error') {
        setError('Google authentication failed. Please try again.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onLoginSuccess])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Call the login endpoint
      const response = await fetch('/api/edify/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      // Store token in localStorage
      localStorage.setItem('edifyToken', data.token)
      
      // Check and update admin status after sign-in
      try {
        const authToken = storage.get('authToken')
        if (authToken) {
          const checkResponse = await fetch('/api/edify/check-admin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ authToken, edifyToken: data.token }),
          })

          if (checkResponse.ok) {
            const checkData = await checkResponse.json()
            if (checkData.changed) {
              console.log('Admin status updated:', checkData.rank)
            }
          }
        }
      } catch (err) {
        console.error('Error checking admin status:', err)
      }
      
      // Call success callback
      onLoginSuccess()
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignin = () => {
    // Open Google auth in a popup window
    const width = 500
    const height = 600
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    
    const popup = window.open(
      '/api/edify/google-auth',
      'Google Sign In',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    // Fallback if popup is blocked
    if (!popup) {
      window.location.href = '/api/edify/google-auth'
    }
  }

  return (
    <div
      className='edify-login'
      css={css`
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.5rem 0;
        
        .edify-login-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .edify-back-btn {
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          color: rgba(255, 255, 255, 0.8);
          &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: white;
          }
        }
        
        .edify-login-title {
          flex: 1;
          font-size: 1.125rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .edify-login-subtitle {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.5rem;
        }
        
        .edify-login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .edify-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .edify-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .edify-input {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          color: white;
          font-size: 0.9375rem;
          outline: none;
          transition: all 0.2s;
          
          &:focus {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(100, 100, 255, 0.5);
          }
          
          &::placeholder {
            color: rgba(255, 255, 255, 0.3);
          }
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
        
        .edify-error {
          padding: 0.75rem;
          background: rgba(255, 75, 75, 0.1);
          border: 1px solid rgba(255, 75, 75, 0.3);
          border-radius: 0.5rem;
          color: #ff4b4b;
          font-size: 0.875rem;
        }
        
        .edify-submit-btn {
          padding: 0.75rem;
          background: linear-gradient(135deg, rgba(100, 100, 255, 0.8) 0%, rgba(200, 100, 255, 0.8) 100%);
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, rgba(100, 100, 255, 1) 0%, rgba(200, 100, 255, 1) 100%);
            transform: translateY(-1px);
          }
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
        
        .edify-divider {
          position: relative;
          text-align: center;
          margin: 0.5rem 0;
          
          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            width: 100%;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
          }
          
          span {
            position: relative;
            padding: 0 0.75rem;
            background: rgba(11, 10, 21, 0.95);
            font-size: 0.8125rem;
            color: rgba(255, 255, 255, 0.5);
          }
        }
        
        .edify-google-btn {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          color: rgba(0, 0, 0, 0.87);
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 1);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }
          
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          svg {
            flex-shrink: 0;
          }
        }
      `}
    >
      <div className='edify-login-header'>
        <div className='edify-back-btn' onClick={onClose}>
          <ChevronDownIcon size='1.125rem' style={{ transform: 'rotate(90deg)' }} />
        </div>
        <div className='edify-login-title'>Sign in to Edify</div>
      </div>
      
      <div className='edify-login-subtitle'>
        Sign in with your Edify account to access your items
      </div>
      
      <form className='edify-login-form' onSubmit={handleSubmit}>
        {error && (
          <div className='edify-error'>{error}</div>
        )}
        
        <div className='edify-form-group'>
          <label className='edify-label'>Email Address</label>
          <input
            type='email'
            className='edify-input'
            placeholder='Enter your email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete='email'
          />
        </div>
        
        <div className='edify-form-group'>
          <label className='edify-label'>Password</label>
          <input
            type='password'
            className='edify-input'
            placeholder='Enter your password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete='current-password'
          />
        </div>
        
        <button
          type='submit'
          className='edify-submit-btn'
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
        
        <div className='edify-divider'>
          <span>Or continue with</span>
        </div>
        
        <button
          type='button'
          className='edify-google-btn'
          onClick={handleGoogleSignin}
          disabled={isLoading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
            <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
            <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </form>
    </div>
  )
}

function EdifyItems({ world, onClose }) {
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const span = 3
  const gap = '0.5rem'

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('edifyToken')
      
      if (!token) {
        setShowLogin(true)
        setLoading(false)
        return
      }

      // Verify token by making a request to backend
      try {
        const response = await fetch('/api/edify/verify-token', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Token is expired or invalid, remove it and show login
            localStorage.removeItem('edifyToken')
            setIsAuthenticated(false)
            setShowLogin(true)
            setLoading(false)
            return
          }
          throw new Error('Failed to verify token')
        }

        const data = await response.json()
        if (data.success) {
          // Token is valid
          setIsAuthenticated(true)
          setShowLogin(false)
        } else {
          throw new Error(data.message || 'Token verification failed')
        }
      } catch (err) {
        console.error('Error verifying token:', err)
        // On error, remove token and show login
        localStorage.removeItem('edifyToken')
        setIsAuthenticated(false)
        setShowLogin(true)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Fetch items when type is selected
  useEffect(() => {
    if (!selectedType || !isAuthenticated) return

    const fetchItems = async () => {
      const token = localStorage.getItem('edifyToken')
      
      try {
        setLoading(true)
        setError(null)
        
        // Build query parameters based on selected type
        let queryParams = ''
        if (selectedType === 'my-purchases') {
          queryParams = '?purchasedOnly=true'
        } else {
          queryParams = `?type=${selectedType}`
        }
        
        const response = await fetch(`/api/edify/items${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Token is invalid, remove it and show login
            localStorage.removeItem('edifyToken')
            setIsAuthenticated(false)
            setShowLogin(true)
            return
          }
          throw new Error(`Failed to fetch items: ${response.statusText}`)
        }

        const data = await response.json()
        const itemsArray = data.items || []
        setItems(itemsArray)
      } catch (err) {
        console.error('Error fetching Edify items:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [selectedType, isAuthenticated])

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true)
    setShowLogin(false)
    
    // Check and update admin status after sign-in
    try {
      const authToken = storage.get('authToken')
      const edifyToken = localStorage.getItem('edifyToken')
      
      if (authToken && edifyToken) {
        const response = await fetch('/api/edify/check-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ authToken, edifyToken }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.changed) {
            // Admin status was updated, the rank change will be received via entityModified
            console.log('Admin status updated:', data.rank)
          }
        }
      }
    } catch (err) {
      console.error('Error checking admin status:', err)
    }
  }

  useEffect(() => {
    let filtered = items

    // Only filter by search query (type filtering is done server-side)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        item =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
          item.type?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
      )
    }

    setFilteredItems(filtered)
  }, [searchQuery, items])

  const handleItemClick = async item => {
    if (item.downloadAssets) {
      try {
        console.log('Downloading .hyp file from:', item.downloadAssets)
        
        // Fetch the .hyp file from the URL
        const response = await fetch(item.downloadAssets)
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`)
        }
        
        // Get the file as a blob
        const blob = await response.blob()
        
        // Extract filename from URL or use item title
        const urlParts = item.downloadAssets.split('/')
        const filename = urlParts[urlParts.length - 1] || `${item.title || 'item'}.hyp`
        
        // Create a File object from the blob
        const file = new File([blob], filename, { type: 'application/octet-stream' })
        
        // Enable builder mode
        world.builder.toggle(true)
        
        // Get spawn transform (at reticle position)
        const transform = world.builder.getSpawnTransform(true)
        
        // Add the app to the world
        await world.builder.addApp(file, transform)
        
        console.log('Successfully added item to world:', item.title)
        
        // Close the sidebar after successful addition
        onClose()
      } catch (error) {
        console.error('Error adding item to world:', error)
        // Show user-facing error notification
        alert(`Failed to add item to world: ${error.message}`)
      }
    }
    else {
      // Open Edify Engine store page in new tab for unpurchased items
      const edifyEngineUrl = globalThis.env?.PUBLIC_EDIFY_ENGINE_URL || 'https://edifyengine.com'
      const storeUrl = `${edifyEngineUrl}/store?id=${item._id}`
      window.open(storeUrl, '_blank')
    }
  }

  // Show login page if not authenticated
  if (showLogin && !isAuthenticated) {
    return <EdifyLogin onClose={onClose} onLoginSuccess={handleLoginSuccess} />
  }

  if (loading) {
    return (
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: rgba(255, 255, 255, 0.6);
        `}
      >
        Loading items...
      </div>
    )
  }

  if (error) {
    return (
      <div
        css={css`
          padding: 1rem;
          color: #ff4b4b;
          text-align: center;
        `}
      >
        Error: {error}
      </div>
    )
  }

  // Show type selection screen
  if (!selectedType) {
    return (
      <div
        className='edify-types'
        css={css`
          display: flex;
          flex-direction: column;
          gap: 1rem;
          .edify-types-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .edify-back-btn {
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
            color: rgba(255, 255, 255, 0.8);
            &:hover {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.2);
              color: white;
            }
          }
          .edify-types-title {
            flex: 1;
            font-size: 1rem;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
          }
          .edify-types-grid {
            display: flex;
            align-items: stretch;
            flex-wrap: wrap;
            gap: ${gap};
          }
          .edify-type-item {
            flex-basis: calc((100% / ${span}) - (${gap} * (${span} - 1) / ${span}));
            cursor: pointer;
            transition: transform 0.2s;
            &:hover {
              transform: translateY(-2px);
            }
          }
          .edify-type-box {
            width: 100%;
            aspect-ratio: 1;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.7rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: all 0.2s;
            &:hover {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.2);
            }
          }
          .edify-type-icon {
            font-size: 2rem;
          }
          .edify-type-label {
            font-size: 0.875rem;
            font-weight: 500;
            text-align: center;
            word-wrap: break-word;
            overflow-wrap: break-word;
            padding: 0 0.5rem;
          }
          .edify-type-count {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.5);
          }
        `}
      >
        <div className='edify-types-header'>
          <div className='edify-back-btn' onClick={onClose}>
            <ChevronDownIcon size='1.125rem' style={{ transform: 'rotate(90deg)' }} />
          </div>
          <div className='edify-types-title'>Select Type</div>
        </div>
        <div className='edify-types-grid'>
          {edifyTypes.map(type => (
            <div className='edify-type-item' key={type.value} onClick={() => setSelectedType(type.value)}>
              <div className='edify-type-box'>
                <div className='edify-type-icon'>{type.icon}</div>
                <div className='edify-type-label'>{type.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className='edify-items'
      css={css`
        display: flex;
        flex-direction: column;
        gap: 1rem;
        .edify-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .edify-back-btn {
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          color: rgba(255, 255, 255, 0.8);
          &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: white;
          }
        }
        .edify-search {
          flex: 1;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          gap: 0.5rem;
          input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: white;
            font-size: 0.9375rem;
            &::placeholder {
              color: #5d6077;
            }
            &::selection {
              background-color: white;
              color: rgba(0, 0, 0, 0.8);
            }
          }
        }
        .edify-list {
          display: flex;
          align-items: stretch;
          flex-wrap: wrap;
          gap: ${gap};
        }
        .edify-item {
          flex-basis: calc((100% / ${span}) - (${gap} * (${span} - 1) / ${span}));
          cursor: pointer;
          transition: transform 0.2s;
          &:hover {
            transform: translateY(-2px);
          }
        }
        .edify-item-image {
          width: 100%;
          aspect-ratio: 1;
          background-color: #1c1d22;
          background-size: cover;
          background-position: center;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 0.7rem;
          margin: 0 0 0.4rem;
        }
        .edify-item-name {
          text-align: center;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.2rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3;
        }
        .edify-item-type {
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: capitalize;
        }
        .edify-item-price {
          text-align: center;
          font-size: 0.75rem;
          color: #4ade80;
          margin-top: 0.2rem;
        }
        .edify-empty {
          text-align: center;
          padding: 2rem;
          color: rgba(255, 255, 255, 0.5);
        }
      `}
    >
      <div className='edify-header'>
        <div
          className='edify-back-btn'
          onClick={() => {
            setSelectedType(null)
            setSearchQuery('')
          }}
        >
          <ChevronDownIcon size='1.125rem' style={{ transform: 'rotate(90deg)' }} />
        </div>
        <div className='edify-search'>
          <SearchIcon size='1rem' />
          <input
            type='text'
            placeholder='Search items...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className='edify-empty'>
          {searchQuery ? 'No items found matching your search.' : 'No items available.'}
        </div>
      ) : (
        <div className='edify-list'>
          {filteredItems.map(item => (
            <div className='edify-item' key={item._id} onClick={() => handleItemClick(item)}>
              <div
                className='edify-item-image'
                css={css`
                  background-image: url(${item.image});
                `}
              />
              <div className='edify-item-name'>{item.title}</div>
              <div className='edify-item-type'>{item.type}</div>
              {item.priceUSD > 0 ? (
                <div className='edify-item-price'>${item.priceUSD.toFixed(2)}</div>
              ) : (
                <div className='edify-item-price'>Free</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Wallets({ world, hidden }) {
  const [walletAddresses, setWalletAddresses] = useState([])
  const [newAddress, setNewAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isEdifySigned, setIsEdifySigned] = useState(false)

  useEffect(() => {
    // Check if user is Edify-signed
    const token = localStorage.getItem('edifyToken')
    setIsEdifySigned(!!token)
  }, [])

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const token = localStorage.getItem('edifyToken')
        if (!token) {
          setError('Not authenticated. Please log in to Edify Engine.')
          setLoading(false)
          return
        }
        
        const response = await fetch('/api/edify/wallets', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Token is expired or invalid, remove it
            localStorage.removeItem('edifyToken')
            setError('Session expired. Please sign in through the Edify panel.')
            setLoading(false)
            return
          }
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to fetch wallet addresses')
        }

        const data = await response.json()
        setWalletAddresses(data.walletAddresses || [])
      } catch (err) {
        console.error('Error fetching wallet addresses:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchWallets()
  }, [])

  const handleAddAddress = () => {
    if (!newAddress.trim()) return
    
    const trimmedAddress = newAddress.trim()
    if (walletAddresses.includes(trimmedAddress)) {
      setError('This wallet address already exists')
      return
    }
    
    setWalletAddresses([...walletAddresses, trimmedAddress])
    setNewAddress('')
    setError(null)
  }

  const handleRemoveAddress = (address) => {
    setWalletAddresses(walletAddresses.filter(addr => addr !== address))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const token = localStorage.getItem('edifyToken')
      if (!token) {
        setError('Not authenticated. Please log in to Edify Engine.')
        return
      }
      
      const response = await fetch('/api/edify/wallets', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ walletAddresses })
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token is expired or invalid, remove it
          localStorage.removeItem('edifyToken')
          setError('Session expired. Please sign in through the Edify panel.')
          setSaving(false)
          return
        }
        const data = await response.json()
        throw new Error(data.message || 'Failed to save wallet addresses')
      }

      const data = await response.json()
      setWalletAddresses(data.walletAddresses || [])
      alert('Wallet addresses saved successfully!')
    } catch (err) {
      console.error('Error saving wallet addresses:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Pane hidden={hidden}>
      <div
        className='wallets'
        css={css`
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          display: flex;
          flex-direction: column;
          min-height: 12rem;
          .wallets-head {
            height: 3.125rem;
            padding: 0 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .wallets-back-btn {
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
            color: rgba(255, 255, 255, 0.8);
            &:hover {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.2);
              color: white;
            }
          }
          .wallets-title {
            flex: 1;
            font-weight: 500;
            font-size: 1rem;
            line-height: 1;
          }
          .wallets-content {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .wallets-add {
            display: flex;
            gap: 0.5rem;
          }
          .wallets-input {
            flex: 1;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            &::placeholder {
              color: rgba(255, 255, 255, 0.5);
            }
            &:focus {
              outline: none;
              border-color: rgba(255, 255, 255, 0.3);
            }
          }
          .wallets-btn {
            padding: 0.75rem 1rem;
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
            &:hover:not(:disabled) {
              background: rgba(59, 130, 246, 0.3);
              border-color: rgba(59, 130, 246, 0.4);
            }
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
          .wallets-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .wallets-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
          }
          .wallets-address {
            flex: 1;
            font-size: 0.875rem;
            font-family: monospace;
            word-break: break-all;
            color: rgba(255, 255, 255, 0.9);
          }
          .wallets-remove {
            padding: 0.25rem 0.5rem;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 0.375rem;
            color: white;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
            &:hover {
              background: rgba(239, 68, 68, 0.3);
              border-color: rgba(239, 68, 68, 0.4);
            }
          }
          .wallets-error {
            padding: 0.75rem;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 0.5rem;
            color: rgba(239, 68, 68, 0.9);
            font-size: 0.875rem;
          }
          .wallets-loading {
            padding: 2rem;
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.875rem;
          }
        `}
      >
        <div className='wallets-head'>
          <div className='wallets-back-btn' onClick={() => world.ui.togglePane(null)}>
            ←
          </div>
          <div className='wallets-title'>Wallet Addresses</div>
        </div>
        <div className='wallets-content noscrollbar'>
          {loading ? (
            <div className='wallets-loading'>Loading...</div>
          ) : (
            <>
              {error && <div className='wallets-error'>{error}</div>}
              {!isEdifySigned && (
                <div
                  css={css`
                    padding: 0.75rem;
                    background: rgba(255, 193, 7, 0.1);
                    border: 1px solid rgba(255, 193, 7, 0.3);
                    border-radius: 0.5rem;
                    color: rgba(255, 193, 7, 0.9);
                    font-size: 0.875rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                  `}
                >
                  <InfoIcon size='1rem' />
                  <span>You must be signed in through Edify to edit wallet addresses</span>
                </div>
              )}
              <div className='wallets-add'>
                <input
                  type='text'
                  className='wallets-input'
                  placeholder='Enter wallet address'
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddAddress()}
                  disabled={!isEdifySigned}
                />
                <button
                  className='wallets-btn'
                  onClick={handleAddAddress}
                  disabled={!newAddress.trim() || !isEdifySigned}
                >
                  Add
                </button>
              </div>
              <div className='wallets-list'>
                {walletAddresses.length === 0 ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    No wallet addresses added yet
                  </div>
                ) : (
                  walletAddresses.map((address, index) => (
                    <div key={index} className='wallets-item'>
                      <div className='wallets-address'>{address}</div>
                      <button
                        className='wallets-remove'
                        onClick={() => handleRemoveAddress(address)}
                        disabled={!isEdifySigned}
                        css={css`
                          ${!isEdifySigned ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                        `}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                className='wallets-btn'
                onClick={handleSave}
                disabled={saving || !isEdifySigned}
                style={{ marginTop: 'auto' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </Pane>
  )
}

const extToType = {
  glb: 'model',
  vrm: 'avatar',
}
const allowedModels = ['glb', 'vrm']
let showTransforms = false

function App({ world, hidden }) {
  const { setHint } = useContext(HintContext)
  const app = world.ui.state.app
  const [pinned, setPinned] = useState(app.data.pinned)
  const [transforms, setTransforms] = useState(showTransforms)
  const [blueprint, setBlueprint] = useState(app.blueprint)
  useEffect(() => {
    showTransforms = transforms
  }, [transforms])
  useEffect(() => {
    window.app = app
    const onModify = bp => {
      if (bp.id === blueprint.id) setBlueprint(bp)
    }
    world.blueprints.on('modify', onModify)
    return () => {
      world.blueprints.off('modify', onModify)
    }
  }, [])
  const frozen = blueprint.frozen // TODO: disable code editor, model change, metadata editing, flag editing etc
  const download = async () => {
    try {
      const file = await exportApp(app.blueprint, world.loader.loadFile)
      downloadFile(file)
    } catch (err) {
      console.error(err)
    }
  }
  const changeModel = async file => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!allowedModels.includes(ext)) return
    // immutable hash the file
    const hash = await hashFile(file)
    // use hash as glb filename
    const filename = `${hash}.${ext}`
    // canonical url to this file
    const url = `asset://${filename}`
    // cache file locally so this client can insta-load it
    const type = extToType[ext]
    world.loader.insert(type, url, file)
    // update blueprint locally (also rebuilds apps)
    const version = blueprint.version + 1
    world.blueprints.modify({ id: blueprint.id, version, model: url })
    // upload model
    await world.network.upload(file)
    // broadcast blueprint change to server + other clients
    world.network.send('blueprintModified', { id: blueprint.id, version, model: url })
  }
  const toggleKey = async (key, value) => {
    value = isBoolean(value) ? value : !blueprint[key]
    if (blueprint[key] === value) return
    const version = blueprint.version + 1
    world.blueprints.modify({ id: blueprint.id, version, [key]: value })
    world.network.send('blueprintModified', { id: blueprint.id, version, [key]: value })
  }
  const togglePinned = () => {
    const pinned = !app.data.pinned
    app.data.pinned = pinned
    world.network.send('entityModified', { id: app.data.id, pinned })
    setPinned(pinned)
  }
  return (
    <Pane hidden={hidden}>
      <div
        className='app'
        css={css`
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          display: flex;
          flex-direction: column;
          min-height: 1rem;
          .app-head {
            height: 3.125rem;
            padding: 0 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
          }
          .app-title {
            flex: 1;
            font-weight: 500;
            font-size: 1rem;
            line-height: 1;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
          }
          .app-btn {
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.8);
            &:hover {
              cursor: pointer;
              color: white;
            }
          }
          .app-toggles {
            padding: 0.5rem 1.4rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .app-toggle {
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6f7289;
            &:hover:not(.disabled) {
              cursor: pointer;
            }
            &.active {
              color: white;
            }
            &.disabled {
              color: #434556;
            }
          }
          .app-transforms {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .app-transforms-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.4rem;
            &:hover {
              cursor: pointer;
            }
          }
          .app-content {
            flex: 1;
            overflow-y: auto;
          }
        `}
      >
        <div className='app-head'>
          <div className='app-title'>{app.blueprint.name}</div>
          <div
            className='app-btn'
            onClick={download}
            onPointerEnter={() => setHint('Download this app')}
            onPointerLeave={() => setHint(null)}
          >
            <DownloadIcon size='1.125rem' />
          </div>
          {!frozen && (
            <AppModelBtn value={blueprint.model} onChange={changeModel}>
              <div
                className='app-btn'
                onPointerEnter={() => setHint('Change this apps base model')}
                onPointerLeave={() => setHint(null)}
              >
                <BoxIcon size='1.125rem' />
              </div>
            </AppModelBtn>
          )}
          {!blueprint.scene && (
            <div
              className='app-btn'
              onClick={() => {
                world.ui.setApp(null)
                app.destroy(true)
              }}
              onPointerEnter={() => setHint('Delete this app')}
              onPointerLeave={() => setHint(null)}
            >
              <Trash2Icon size='1.125rem' />
            </div>
          )}
        </div>
        {!blueprint.scene && (
          <div className='app-toggles'>
            <div
              className={cls('app-toggle', { active: blueprint.disabled })}
              onClick={() => toggleKey('disabled')}
              onPointerEnter={() => setHint('Disable this app so that it is no longer active in the world.')}
              onPointerLeave={() => setHint(null)}
            >
              <OctagonXIcon size='1.125rem' />
              {/* {blueprint.disabled ? <SquareIcon size='1.125rem' /> : <SquareCheckBigIcon size='1.125rem' />} */}
            </div>
            <div
              className={cls('app-toggle', { active: pinned })}
              onClick={() => togglePinned()}
              onPointerEnter={() => setHint("Pin this app so it can't accidentally be moved.")}
              onPointerLeave={() => setHint(null)}
            >
              <PinIcon size='1.125rem' />
            </div>
            <div
              className={cls('app-toggle', { active: blueprint.preload })}
              onClick={() => toggleKey('preload')}
              onPointerEnter={() => setHint('Preload this app before entering the world.')}
              onPointerLeave={() => setHint(null)}
            >
              <LoaderPinwheelIcon size='1.125rem' />
            </div>
            <div
              className={cls('app-toggle', { active: blueprint.unique })}
              onClick={() => toggleKey('unique')}
              onPointerEnter={() => setHint('Make this app unique so that new duplicates are not linked to this one.')}
              onPointerLeave={() => setHint(null)}
            >
              <SparkleIcon size='1.125rem' />
            </div>
          </div>
        )}
        <div className='app-content noscrollbar'>
          {!blueprint.scene && (
            <div className='app-transforms'>
              <div className='app-transforms-btn' onClick={() => setTransforms(!transforms)}>
                <ChevronsUpDownIcon size='1rem' />
              </div>
              {transforms && <AppTransformFields app={app} />}
            </div>
          )}
          <AppFields world={world} app={app} blueprint={blueprint} />
        </div>
      </div>
    </Pane>
  )
}

function AppTransformFields({ app }) {
  const [position, setPosition] = useState(app.root.position.toArray())
  const [rotation, setRotation] = useState(app.root.rotation.toArray().map(n => n * RAD2DEG))
  const [scale, setScale] = useState(app.root.scale.toArray())
  return (
    <>
      <FieldVec3
        label='Position'
        dp={2}
        smallStep={0.01}
        step={0.1}
        bigStep={1}
        value={position}
        onChange={value => {
          console.log(value)
          setPosition(value)
          app.modify({ position: value })
          app.world.network.send('entityModified', {
            id: app.data.id,
            position: value,
          })
        }}
      />
      <FieldVec3
        label='Rotation'
        dp={2}
        smallStep={0.1}
        step={1}
        bigStep={5}
        value={rotation}
        onChange={value => {
          setRotation(value)
          value = q1.setFromEuler(e1.fromArray(value.map(n => n * DEG2RAD))).toArray()
          app.modify({ quaternion: value })
          app.world.network.send('entityModified', {
            id: app.data.id,
            quaternion: value,
          })
        }}
      />
      <FieldVec3
        label='Scale'
        dp={2}
        smallStep={0.01}
        step={0.1}
        bigStep={1}
        value={scale}
        onChange={value => {
          setScale(value)
          app.modify({ scale: value })
          app.world.network.send('entityModified', {
            id: app.data.id,
            scale: value,
          })
        }}
      />
    </>
  )
}

// todo: blueprint models need migrating to file object format so
// we can replace needing this and instead use MenuItemFile, but
// that will also somehow need to support both model and avatar kinds.
function AppModelBtn({ value, onChange, children }) {
  const [key, setKey] = useState(0)
  const handleDownload = e => {
    if (e.shiftKey) {
      e.preventDefault()
      const file = world.loader.getFile(value)
      if (!file) return
      downloadFile(file)
    }
  }
  const handleChange = e => {
    setKey(n => n + 1)
    onChange(e.target.files[0])
  }
  return (
    <label
      className='appmodelbtn'
      css={css`
        overflow: hidden;
        input {
          position: absolute;
          top: -9999px;
        }
      `}
      onClick={handleDownload}
    >
      <input key={key} type='file' accept='.glb,.vrm' onChange={handleChange} />
      {children}
    </label>
  )
}

function AppFields({ world, app, blueprint }) {
  const [fields, setFields] = useState(() => app.fields)
  const props = blueprint.props
  useEffect(() => {
    app.onFields = setFields
    return () => {
      app.onFields = null
    }
  }, [])
  const modify = (key, value) => {
    if (props[key] === value) return
    const bp = world.blueprints.get(blueprint.id)
    const newProps = { ...bp.props, [key]: value }
    // update blueprint locally (also rebuilds apps)
    const id = bp.id
    const version = bp.version + 1
    world.blueprints.modify({ id, version, props: newProps })
    // broadcast blueprint change to server + other clients
    world.network.send('blueprintModified', { id, version, props: newProps })
  }
  return fields.map(field => (
    <AppField key={field.key} world={world} props={props} field={field} value={props[field.key]} modify={modify} />
  ))
}

function AppField({ world, props, field, value, modify }) {
  if (field.hidden) {
    return null
  }
  if (field.when && isArray(field.when)) {
    for (const rule of field.when) {
      if (rule.op === 'eq' && props[rule.key] !== rule.value) {
        return null
      }
    }
  }
  if (field.type === 'section') {
    return <Group label={field.label} />
  }
  if (field.type === 'text') {
    return (
      <FieldText
        label={field.label}
        hint={field.hint}
        placeholder={field.placeholder}
        value={value}
        onChange={value => modify(field.key, value)}
      />
    )
  }
  if (field.type === 'textarea') {
    return (
      <FieldTextarea label={field.label} hint={field.hint} value={value} onChange={value => modify(field.key, value)} />
    )
  }
  if (field.type === 'number') {
    return (
      <FieldNumber
        label={field.label}
        hint={field.hint}
        dp={field.dp}
        min={field.min}
        max={field.max}
        step={field.step}
        bigStep={field.bigStep}
        value={value}
        onChange={value => modify(field.key, value)}
      />
    )
  }
  if (field.type === 'file') {
    return (
      <FieldFile
        label={field.label}
        hint={field.hint}
        kind={field.kind}
        value={value}
        onChange={value => modify(field.key, value)}
        world={world}
      />
    )
  }
  if (field.type === 'switch') {
    return (
      <FieldSwitch
        label={field.label}
        hint={field.hint}
        options={field.options}
        value={value}
        onChange={value => modify(field.key, value)}
      />
    )
  }
  if (field.type === 'dropdown') {
    // deprecated, same as switch
    return (
      <FieldSwitch
        label={field.label}
        hint={field.hint}
        options={field.options}
        value={value}
        onChange={value => modify(field.key, value)}
      />
    )
  }
  if (field.type === 'toggle') {
    return (
      <FieldToggle
        label={field.label}
        hint={field.hint}
        trueLabel={field.trueLabel}
        falseLabel={field.falseLabel}
        value={value}
        onChange={value => modify(field.key, value)}
      />
    )
  }
  if (field.type === 'range') {
    return (
      <FieldRange
        label={field.label}
        hint={field.hint}
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={value => modify(field.key, value)}
      />
    )
  }
  if (field.type === 'curve') {
    return (
      <FieldCurve
        label={field.label}
        hint={field.hint}
        yMin={field.yMin}
        yMax={field.yMax}
        value={value}
        onChange={value => modify(field.key, value)}
      />
    )
  }
  if (field.type === 'button') {
    return <FieldBtn label={field.label} hint={field.hint} onClick={field.onClick} />
  }
  if (field.type === 'color') {
    return (
      <FieldColor label={field.label} hint={field.hint} value={value} onChange={value => modify(field.key, value)} />
    )
  }
  return null
}

function Script({ world, hidden }) {
  const app = world.ui.state.app
  const containerRef = useRef()
  const resizeRef = useRef()
  const [handle, setHandle] = useState(null)
  useEffect(() => {
    const elem = resizeRef.current
    const container = containerRef.current
    container.style.width = `${storage.get('code-editor-width', 500)}px`
    let active
    function onPointerDown(e) {
      active = true
      elem.addEventListener('pointermove', onPointerMove)
      elem.addEventListener('pointerup', onPointerUp)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    function onPointerMove(e) {
      let newWidth = container.offsetWidth + e.movementX
      if (newWidth < 250) newWidth = 250
      container.style.width = `${newWidth}px`
      storage.set('code-editor-width', newWidth)
    }
    function onPointerUp(e) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      elem.removeEventListener('pointermove', onPointerMove)
      elem.removeEventListener('pointerup', onPointerUp)
    }
    elem.addEventListener('pointerdown', onPointerDown)
    return () => {
      elem.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])
  return (
    <div
      ref={containerRef}
      className={cls('script', { hidden })}
      css={css`
        pointer-events: auto;
        align-self: stretch;
        background: rgba(11, 10, 21, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 1.375rem;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        min-height: 23.7rem;
        position: relative;
        .script-head {
          height: 3.125rem;
          padding: 0 1rem;
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .script-title {
          flex: 1;
          font-weight: 500;
          font-size: 1rem;
          line-height: 1;
        }
        .script-btn {
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.8);
          &:hover {
            cursor: pointer;
            color: white;
          }
        }
        .script-resizer {
          position: absolute;
          top: 0;
          bottom: 0;
          right: -5px;
          width: 10px;
          cursor: ew-resize;
        }
        &.hidden {
          opacity: 0;
          pointer-events: none;
        }
      `}
    >
      <div className='script-head'>
        <div className='script-title'>Script: {app.blueprint?.name}</div>
        <div className='script-btn' onClick={() => handle?.save()}>
          <SaveIcon size='1.125rem' />
        </div>
      </div>
      <ScriptEditor key={app.data.id} app={app} onHandle={setHandle} />
      <div className='script-resizer' ref={resizeRef} />
    </div>
  )
}

function Nodes({ world, hidden }) {
  const app = world.ui.state.app
  return (
    <Pane hidden={hidden}>
      <div
        className='nodes'
        css={css`
          flex: 1;
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          min-height: 23.7rem;
          display: flex;
          flex-direction: column;
          .nodes-head {
            height: 3.125rem;
            padding: 0 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
          }
          .nodes-title {
            font-weight: 500;
            font-size: 1rem;
            line-height: 1;
          }
        `}
      >
        <div className='nodes-head'>
          <div className='nodes-title'>Nodes</div>
        </div>
        <NodeHierarchy app={app} />
      </div>
    </Pane>
  )
}

function Meta({ world, hidden }) {
  const app = world.ui.state.app
  const [blueprint, setBlueprint] = useState(app.blueprint)
  useEffect(() => {
    window.app = app
    const onModify = bp => {
      if (bp.id === blueprint.id) setBlueprint(bp)
    }
    world.blueprints.on('modify', onModify)
    return () => {
      world.blueprints.off('modify', onModify)
    }
  }, [])
  const set = async (key, value) => {
    const version = blueprint.version + 1
    world.blueprints.modify({ id: blueprint.id, version, [key]: value })
    world.network.send('blueprintModified', { id: blueprint.id, version, [key]: value })
  }
  return (
    <Pane hidden={hidden}>
      <div
        className='meta'
        css={css`
          flex: 1;
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          display: flex;
          flex-direction: column;
          min-height: 1rem;
          .meta-head {
            height: 3.125rem;
            padding: 0 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
          }
          .meta-title {
            font-weight: 500;
            font-size: 1rem;
            line-height: 1;
          }
          .meta-content {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem 0;
          }
        `}
      >
        <div className='meta-head'>
          <div className='meta-title'>Metadata</div>
        </div>
        <div className='meta-content noscrollbar'>
          <FieldText
            label='Name'
            hint='The name of this app'
            value={blueprint.name}
            onChange={value => set('name', value)}
          />
          <FieldFile
            label='Image'
            hint='An image/icon for this app'
            kind='texture'
            value={blueprint.image}
            onChange={value => set('image', value)}
            world={world}
          />
          <FieldText
            label='Author'
            hint='The name of the author that made this app'
            value={blueprint.author}
            onChange={value => set('author', value)}
          />
          <FieldText
            label='URL'
            hint='A url for this app'
            value={blueprint.url}
            onChange={value => set('url', value)}
          />
          <FieldTextarea
            label='Description'
            hint='A description for this app'
            value={blueprint.desc}
            onChange={value => set('desc', value)}
          />
        </div>
      </div>
    </Pane>
  )
}

function getPlayers(world) {
  let players = []
  world.entities.players.forEach(player => {
    players.push(player)
  })
  players = sortBy(players, player => player.enteredAt)
  return players
}
function Players({ world, hidden }) {
  const { setHint } = useContext(HintContext)
  const localPlayer = world.entities.player
  const isAdmin = localPlayer.isAdmin()
  const [players, setPlayers] = useState(() => getPlayers(world))
  useEffect(() => {
    const onChange = () => {
      setPlayers(getPlayers(world))
    }
    world.entities.on('added', onChange)
    world.entities.on('removed', onChange)
    world.livekit.on('speaking', onChange)
    world.livekit.on('muted', onChange)
    world.on('rank', onChange)
    world.on('name', onChange)
    return () => {
      world.entities.off('added', onChange)
      world.entities.off('removed', onChange)
      world.livekit.off('speaking', onChange)
      world.livekit.off('muted', onChange)
      world.off('rank', onChange)
      world.off('name', onChange)
    }
  }, [])
  const toggleBuilder = player => {
    if (player.data.rank === Ranks.BUILDER) {
      world.network.send('modifyRank', { playerId: player.data.id, rank: Ranks.VISITOR })
    } else {
      world.network.send('modifyRank', { playerId: player.data.id, rank: Ranks.BUILDER })
    }
  }
  const toggleMute = player => {
    world.network.send('mute', { playerId: player.data.id, muted: !player.isMuted() })
  }
  const kick = player => {
    world.network.send('kick', player.data.id)
  }
  const teleportTo = player => {
    // behind player 0.6m (capsule size)
    const position = new THREE.Vector3(0, 0, 1)
    position.applyQuaternion(player.base.quaternion)
    position.multiplyScalar(0.6).add(player.base.position)
    localPlayer.teleport({
      position,
      rotationY: player.base.rotation.y,
    })
  }
  return (
    <Pane hidden={hidden}>
      <div
        className='players'
        css={css`
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          display: flex;
          flex-direction: column;
          min-height: 1rem;
          .players-head {
            height: 3.125rem;
            padding: 0 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
          }
          .players-title {
            flex: 1;
            font-weight: 500;
            font-size: 1rem;
            line-height: 1;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
          }
          .players-content {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem 0;
          }
          .players-item {
            display: flex;
            align-items: center;
            padding: 0.1rem 0.5rem 0.1rem 1rem;
            height: 36px;
          }
          .players-name {
            flex: 1;
            display: flex;
            align-items: center;
            span {
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
              margin-right: 0.5rem;
            }
            svg {
              color: rgba(255, 255, 255, 0.6);
            }
          }
          .players-btn {
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.8);
            &:hover:not(.readonly) {
              cursor: pointer;
              color: white;
            }
            &.dim {
              color: #556181;
            }
          }
        `}
      >
        <div className='players-head'>
          <div className='players-title'>Players</div>
        </div>
        <div className='players-content noscrollbar'>
          {players.map(player => (
            <div className='players-item' key={player.data.id}>
              <div className='players-name'>
                <span>{player.data.name}</span>
                {player.speaking && <Volume2Icon size='1rem' />}
                {player.isMuted() && <MicOffIcon size='1rem' />}
              </div>
              {isAdmin && player.isRemote && !player.isAdmin() && world.settings.rank < Ranks.BUILDER && (
                <div
                  className={cls('players-btn', { dim: !player.isBuilder() })}
                  onPointerEnter={() =>
                    setHint(
                      player.isBuilder()
                        ? 'Player is not a builder. Click to allow building.'
                        : 'Player is a builder. Click to revoke.'
                    )
                  }
                  onPointerLeave={() => setHint(null)}
                  onClick={() => toggleBuilder(player)}
                >
                  <HammerIcon size='1.125rem' />
                </div>
              )}
              {player.isRemote && localPlayer.outranks(player) && (
                <div
                  className='players-btn'
                  onPointerEnter={() => setHint('Teleport to player.')}
                  onPointerLeave={() => setHint(null)}
                  onClick={() => teleportTo(player)}
                >
                  <CircleArrowRightIcon size='1.125rem' />
                </div>
              )}
              {player.isRemote && localPlayer.outranks(player) && (
                <div
                  className='players-btn'
                  onPointerEnter={() =>
                    setHint(
                      player.isMuted() ? 'Player is muted. Click to unmute.' : 'Player is not muted. Click to mute.'
                    )
                  }
                  onPointerLeave={() => setHint(null)}
                  onClick={() => toggleMute(player)}
                >
                  {player.isMuted() ? <MicOffIcon size='1.125rem' /> : <MicIcon size='1.125rem' />}
                </div>
              )}
              {player.isRemote && localPlayer.outranks(player) && (
                <div
                  className='players-btn'
                  onPointerEnter={() => setHint('Kick this player.')}
                  onPointerLeave={() => setHint(null)}
                  onClick={() => kick(player)}
                >
                  <UserXIcon size='1.125rem' />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Pane>
  )
}
