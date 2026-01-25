import { Application, Container } from 'pixi.js'
import { BoardRenderer } from './BoardRenderer'
import { TokenRenderer } from './TokenRenderer'
import { BoardGeometry, createBoardGeometry } from '@/lib/game/boardGeometry'
import type { BoardSetup, Player, PlayerColor } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'

export class PixiApp {
  private app: Application
  private boardRenderer: BoardRenderer | null = null
  private tokenRenderer: TokenRenderer | null = null
  private geometry: BoardGeometry | null = null
  private container: HTMLElement
  private resizeObserver: ResizeObserver | null = null
  private isInitialized = false
  private unsubscribers: (() => void)[] = []

  constructor(container: HTMLElement) {
    this.container = container
    this.app = new Application()
  }

  async init(): Promise<void> {
    if (this.isInitialized) return

    const width = this.container.clientWidth || 800
    const height = this.container.clientHeight || 800

    await this.app.init({
      width,
      height,
      backgroundColor: 0xf5f5dc,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    // Add canvas to container
    this.container.appendChild(this.app.canvas)

    // Create geometry
    this.geometry = createBoardGeometry(width, height, 20)

    // Create renderers
    this.boardRenderer = new BoardRenderer(this.app, this.geometry)
    this.tokenRenderer = new TokenRenderer(this.app, this.geometry)

    // Setup resize observer
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        this.handleResize(width, height)
      }
    })
    this.resizeObserver.observe(this.container)

    // Subscribe to store changes
    this.setupStoreSubscriptions()

    this.isInitialized = true
  }

  private handleResize(width: number, height: number): void {
    if (!this.app || width === 0 || height === 0) return

    this.app.renderer.resize(width, height)

    // Recreate geometry with new dimensions
    this.geometry = createBoardGeometry(width, height, 20)
    const state = useGameStore.getState()

    // Re-apply board setup to new geometry (needed for safe spaces)
    if (state.boardSetup) {
      this.geometry.setBoardSetup(state.boardSetup)
    }

    // Update renderers with new geometry
    if (this.boardRenderer) {
      this.boardRenderer.setGeometry(this.geometry)
      this.boardRenderer.render()
      // Redraw starting markers if players are loaded
      if (state.players.length > 0) {
        this.boardRenderer.updateStartingMarkers(state.players)
      }
    }

    if (this.tokenRenderer) {
      this.tokenRenderer.setGeometry(this.geometry)
      this.tokenRenderer.updateTokens(state.players)
    }
  }

  private setupStoreSubscriptions(): void {
    // Subscribe to players changes to update tokens and starting markers
    const unsubPlayers = useGameStore.subscribe(
      (state) => state.players,
      (players) => {
        if (this.tokenRenderer) {
          this.tokenRenderer.updateTokens(players)
        }
        // Update starting position markers to use actual player abs_starting_index
        if (this.boardRenderer && players.length > 0) {
          this.boardRenderer.updateStartingMarkers(players)
        }
      }
    )
    this.unsubscribers.push(unsubPlayers)

    // Subscribe to board setup changes
    const unsubBoardSetup = useGameStore.subscribe(
      (state) => state.boardSetup,
      (boardSetup) => {
        if (boardSetup && this.geometry) {
          this.geometry.setBoardSetup(boardSetup)
          if (this.boardRenderer) {
            this.boardRenderer.render()
          }
        }
      },
      { fireImmediately: true }
    )
    this.unsubscribers.push(unsubBoardSetup)

    // Subscribe to highlighted tokens
    const unsubHighlighted = useGameStore.subscribe(
      (state) => state.highlightedTokens,
      (highlighted) => {
        if (this.tokenRenderer) {
          this.tokenRenderer.setHighlightedTokens(
            highlighted.map((h) => h.tokenId)
          )
        }
      }
    )
    this.unsubscribers.push(unsubHighlighted)

    // Subscribe to selected token
    const unsubSelected = useGameStore.subscribe(
      (state) => state.selectedTokenId,
      (selectedId) => {
        if (this.tokenRenderer) {
          this.tokenRenderer.setSelectedToken(selectedId)
        }
      }
    )
    this.unsubscribers.push(unsubSelected)
  }

  // Initialize board with setup data
  initializeBoard(boardSetup: BoardSetup, players: Player[]): void {
    if (!this.geometry || !this.boardRenderer || !this.tokenRenderer) return

    this.geometry.setBoardSetup(boardSetup)
    this.boardRenderer.render()
    // Update starting markers using actual player positions from backend
    if (players.length > 0) {
      this.boardRenderer.updateStartingMarkers(players)
    }
    this.tokenRenderer.updateTokens(players)
  }

  // Get the board renderer for animations
  getBoardRenderer(): BoardRenderer | null {
    return this.boardRenderer
  }

  // Get the token renderer for animations
  getTokenRenderer(): TokenRenderer | null {
    return this.tokenRenderer
  }

  // Get geometry for position calculations
  getGeometry(): BoardGeometry | null {
    return this.geometry
  }

  // Get the Pixi application
  getApp(): Application {
    return this.app
  }

  // Set token click handler
  setTokenClickHandler(handler: (tokenId: string) => void): void {
    if (this.tokenRenderer) {
      this.tokenRenderer.setClickHandler(handler)
    }
  }

  // Cleanup
  destroy(): void {
    // Unsubscribe from store
    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    // Destroy renderers
    if (this.tokenRenderer) {
      this.tokenRenderer.destroy()
      this.tokenRenderer = null
    }

    if (this.boardRenderer) {
      this.boardRenderer.destroy()
      this.boardRenderer = null
    }

    // Only clean up Pixi resources if init() completed
    if (this.isInitialized) {
      // Remove canvas from container
      if (this.app.canvas && this.app.canvas.parentNode) {
        this.app.canvas.parentNode.removeChild(this.app.canvas)
      }

      // Destroy Pixi app
      this.app.destroy(true, { children: true, texture: true })
    }

    this.isInitialized = false
  }
}
