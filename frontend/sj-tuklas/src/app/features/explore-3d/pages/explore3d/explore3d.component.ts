import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  Observer,
  PointerEventTypes,
  PointerInfo,
  Vector3,
} from '@babylonjs/core';

import { firstValueFrom } from 'rxjs';

import { Business } from '../../../../core/models/business';
import { GlobalChatMessage } from '../../../../core/models/global-chat-message.model';
import { GlobalChatModeration } from '../../../../core/models/global-chat-moderation.model';

import { BusinessService } from '../../../../core/services/business.service';
import { Explore3dCharacterService } from '../../../../core/services/explore3d-character.service';
import { Explore3dMultiplayerService } from '../../../../core/services/explore3d-multiplayer.service';
import { GlobalChatService } from '../../../../core/services/global-chat.service';

import { Explore3dEngineService } from '../../services/explore3d-engine.service';
import { Explore3dPlayerService } from '../../services/explore3d-player.service';
import { Explore3dWorldService } from '../../services/explore3d-world.service';
import { Explore3dBusiness3dService } from '../../services/explore3d-business-3d.service';
import { Explore3dInputService } from '../../services/explore3d-input.service';
import { Explore3dCategory } from '../../services/explore3d-category.service';

import {
  Explore3dPlayerPosition,
  Explore3dRemotePlayer,
} from '../../../../core/services/explore3d-multiplayer.service';

import { GlobalChatComponent } from '../../components/global-chat/global-chat.component';
import { Explore3dLoadingComponent } from '../../components/explore-3d-loading/explore-3d-loading.component';

/* =========================================================
   INTERFACES
========================================================= */

interface ExploreCategoryOption {
  id: Explore3dCategory;
  label: string;
  description: string;
}

interface CharacterModelResponse {
  username?: string;
  characterModel?: string;
  model?: string;
}

/* =========================================================
   COMPONENT
========================================================= */

@Component({
  selector: 'app-explore3d',
  standalone: true,
  imports: [FormsModule, GlobalChatComponent, Explore3dLoadingComponent],
  templateUrl: './explore3d.component.html',
  styleUrl: './explore3d.component.scss',
  providers: [
    Explore3dEngineService,
    Explore3dPlayerService,
    Explore3dWorldService,
    Explore3dBusiness3dService,
    Explore3dInputService,
  ],
})
export class Explore3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('renderCanvas', { static: true })
  canvas!: ElementRef<HTMLCanvasElement>;

  /* =========================================================
     CATEGORIES
  ========================================================= */

  readonly categories: ExploreCategoryOption[] = [
    {
      id: 'Foods & Drinks',
      label: 'Foods & Drinks',
      description: 'Restaurants, cafés, snacks, and local food spots.',
    },
    {
      id: 'Hotels',
      label: 'Hotels',
      description: 'Hotels and accommodation businesses.',
    },
    {
      id: 'Shops',
      label: 'Shops',
      description: 'Local stores and retail shops.',
    },
    {
      id: 'Services',
      label: 'Services',
      description: 'Local services and professionals.',
    },
    {
      id: 'Boarding House',
      label: 'Boarding House',
      description: 'Boarding houses and long-stay accommodation.',
    },
  ];

  /* =========================================================
     BUSINESS STATE
  ========================================================= */

  businesses: Business[] = [];

  visibleBusinesses: Business[] = [];

  selectedBusiness: Business | null = null;

  private readonly businessesByCategory = new Map<string, Business[]>();

  currentCategory: Explore3dCategory | null = null;

  /* =========================================================
     WORLD STATE
  ========================================================= */

  isInCategoryWorld = false;

  isLoadingCategory = false;

  categoryError = '';

  /* =========================================================
     CATEGORY MODAL
  ========================================================= */

  selectedCategory: Explore3dCategory | null = null;

  showCategoryModal = false;

  /* =========================================================
     MULTIPLAYER STATE
  ========================================================= */

  readonly multiplayerWorldId = 'sj-tuklas-main';

  private characterModel = 'aj';

  private characterUsername = 'Explorer';

  private multiplayerJoining = false;

  private multiplayerJoined = false;

  private multiplayerDestroyed = false;

  private multiplayerSyncTimer: ReturnType<typeof setInterval> | null = null;

  private readonly remoteSyncInterval = 150;

  private readonly remotePlayerIds = new Set<string>();

  private readonly pendingRemotePlayerIds = new Set<string>();

  remotePlayerList: Explore3dRemotePlayer[] = [];

  constructor(
    private readonly businessService: BusinessService,

    private readonly engine3d: Explore3dEngineService,

    private readonly player: Explore3dPlayerService,

    @Inject(Explore3dWorldService)
    private readonly world: Explore3dWorldService,

    private readonly business3d: Explore3dBusiness3dService,

    private readonly input: Explore3dInputService,

    private readonly globalChat: GlobalChatService,

    readonly multiplayer: Explore3dMultiplayerService,

    private readonly characterService: Explore3dCharacterService,
  ) {}

  /* =========================================================
     MULTIPLAYER GETTERS
  ========================================================= */

  get remotePlayers(): Explore3dRemotePlayer[] {
    return this.multiplayer.players();
  }

  get multiplayerConnected(): boolean {
    return this.multiplayer.connected();
  }

  get multiplayerJoiningState(): boolean {
    return this.multiplayer.joining();
  }

  /* =========================================================
     LIFECYCLE STATE
  ========================================================= */

  private destroyed = false;

  private initialized = false;

  private initializing = false;

  private pointerObserver: Observer<PointerInfo> | null = null;

  private transitionVersion = 0;

  /* =========================================================
     GLOBAL CHAT STATE
  ========================================================= */

  globalChatMessages: GlobalChatMessage[] = [];

  globalChatModeration: GlobalChatModeration | null = null;

  globalChatOnline = false;

  globalChatUnreadCount = 0;

  globalChatOpen = false;

  private removeGlobalChatMessageListener: (() => void) | null = null;

  private removeGlobalChatModerationListener: (() => void) | null = null;

  private removeGlobalChatConnectionListener: (() => void) | null = null;

  /* =========================================================
     GLOBAL CHAT GETTERS
  ========================================================= */

  get globalChatConnected(): boolean {
    return this.globalChatOnline;
  }

  get globalChatUnread(): number {
    return this.globalChatUnreadCount;
  }

  get globalChatCurrentUsername(): string {
    return this.characterUsername;
  }

  /* =========================================================
     TEMPLATE GETTERS
  ========================================================= */

  get isAutoNavigating(): boolean {
    return this.player.isAutoNavigating;
  }

  get destinationBusiness(): Business | null {
    return this.player.destinationBusiness;
  }

  /* =========================================================
     WORLD GETTERS
  ========================================================= */

  get isInMainHub(): boolean {
    return !this.isInCategoryWorld;
  }

  get isInsideCategory(): boolean {
    return this.isInCategoryWorld;
  }

  get selectedCategoryDetails(): ExploreCategoryOption | null {
    if (!this.selectedCategory) {
      return null;
    }

    return (
      this.categories.find(
        (category) => category.id === this.selectedCategory,
      ) ?? null
    );
  }

  /* =========================================================
     LIFECYCLE
  ========================================================= */

  async ngAfterViewInit(): Promise<void> {
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);

    if (this.destroyed || this.initializing || this.initialized) {
      return;
    }

    this.initializing = true;

    try {
      await this.initializeBabylon();

      if (this.destroyed || !this.initialized) {
        return;
      }

      await this.loadBusinesses();

      if (this.destroyed) {
        return;
      }

      /*
       * Load authenticated character information.
       *
       * This gives us:
       * - username
       * - character model
       */
      await this.loadCharacterModel();

      if (this.destroyed) {
        return;
      }

      /*
       * NEW GLOBAL CHAT
       */
      this.initializeGlobalChat();

      /*
       * MULTIPLAYER
       */
      void this.initializeMultiplayer();
    } catch (error) {
      console.error('Unable to initialize 3D Explore:', error);

      if (!this.destroyed) {
        this.categoryError = 'Unable to initialize 3D Explore.';
      }
    } finally {
      this.initializing = false;
    }
  }

  /* =========================================================
     GLOBAL CHAT INITIALIZATION
  ========================================================= */

  private initializeGlobalChat(): void {
    if (this.destroyed) {
      return;
    }

    /*
     * NORMAL GLOBAL CHAT MESSAGES
     */
    this.removeGlobalChatMessageListener = this.globalChat.onMessage(
      (message: GlobalChatMessage) => {
        if (this.destroyed) {
          return;
        }

        this.globalChatMessages = [...this.globalChatMessages, message];

        /*
         * Keep browser-side history limited.
         *
         * Backend chat remains intentionally
         * in-memory and has no database table.
         */
        if (this.globalChatMessages.length > 100) {
          this.globalChatMessages = this.globalChatMessages.slice(-100);
        }

        /*
         * Count messages received while
         * the panel is closed.
         */
        if (!this.globalChatOpen) {
          this.globalChatUnreadCount++;
        }
      },
    );

    /*
     * MODERATION EVENTS
     */
    this.removeGlobalChatModerationListener = this.globalChat.onModeration(
      (moderation: GlobalChatModeration) => {
        if (this.destroyed) {
          return;
        }

        this.globalChatModeration = moderation;

        /*
         * Automatically open the chat so
         * the user immediately sees the warning.
         */
        this.globalChatOpen = true;

        this.globalChatUnreadCount = 0;
      },
    );

    /*
     * CONNECTION STATE
     */
    this.removeGlobalChatConnectionListener =
      this.globalChat.onConnectionChange((connected: boolean) => {
        if (this.destroyed) {
          return;
        }

        this.globalChatOnline = connected;
      });

    /*
     * START SIGNALR
     */
    void this.globalChat.connect().catch((error) => {
      if (this.destroyed) {
        return;
      }

      console.error('[Explore3D] Global Chat connection failed:', error);

      this.globalChatOnline = false;
    });
  }

  /* =========================================================
     GLOBAL CHAT ACTIONS
  ========================================================= */

  toggleGlobalChat(): void {
    if (this.destroyed) {
      return;
    }

    this.globalChatOpen = !this.globalChatOpen;

    if (this.globalChatOpen) {
      this.globalChatUnreadCount = 0;
    }
  }

  closeGlobalChat(): void {
    if (this.destroyed) {
      return;
    }

    this.globalChatOpen = false;
  }

  async sendGlobalMessage(message: string): Promise<void> {
    if (this.destroyed || !message.trim()) {
      return;
    }

    try {
      await this.globalChat.sendMessage(message);
    } catch (error) {
      console.error('[Explore3D] Failed to send Global Chat message:', error);
    }
  }

  onGlobalChatOpened(): void {
    if (this.destroyed) {
      return;
    }

    this.globalChatOpen = true;

    this.globalChatUnreadCount = 0;
  }

  /* =========================================================
     INITIALIZE BABYLON
  ========================================================= */

  private async initializeBabylon(): Promise<void> {
    if (this.initialized || this.destroyed) {
      return;
    }

    this.engine3d.initialize(this.canvas.nativeElement);

    if (this.destroyed) {
      return;
    }

    await this.world.create(this.engine3d.scene);

    if (this.destroyed) {
      return;
    }

    await this.player.initialize(this.engine3d.scene, this.engine3d.engine);

    if (this.destroyed) {
      return;
    }

    this.input.initialize();

    this.business3d.setupInteraction(
      this.engine3d.scene,
      (business: Business) => this.openBusiness(business),
    );

    this.engine3d.camera.target = this.player.getCameraTarget();

    this.initialized = true;

    this.setupCategoryEntranceInteraction();

    this.engine3d.startRenderLoop(() => {
      if (this.destroyed || !this.initialized) {
        return;
      }

      const movement = this.input.getMovement(this.engine3d.camera);

      const manualMovement = this.input.hasManualMovement();

      const running = this.input.isRunning();

      const jumpRequested = this.input.consumeJumpRequest();

      this.player.update(
        this.engine3d.camera,
        movement,
        manualMovement,
        running,
        jumpRequested,
      );

      this.engine3d.scene.render();
    });
  }

  /* =========================================================
     MULTIPLAYER
  ========================================================= */

  private async initializeMultiplayer(): Promise<void> {
    if (
      this.destroyed ||
      this.multiplayerDestroyed ||
      this.multiplayerJoining ||
      this.multiplayerJoined
    ) {
      return;
    }

    this.multiplayerJoining = true;

    try {
      /*
       * Character model and username should already
       * be loaded, but loading again here is harmless
       * and keeps multiplayer initialization safe.
       */
      await this.loadCharacterModel();

      if (this.destroyed || this.multiplayerDestroyed) {
        return;
      }

      await this.multiplayer.connect();

      if (this.destroyed || this.multiplayerDestroyed) {
        return;
      }

      const position = this.getLocalPlayerPosition();

      await this.multiplayer.joinWorld(
        this.multiplayerWorldId,
        this.getPlayerDisplayName(),
        this.characterModel,
        position,
      );

      if (this.destroyed || this.multiplayerDestroyed) {
        await this.multiplayer.leaveWorld();

        return;
      }

      this.multiplayerJoined = true;

      this.startMultiplayerSync();

      this.syncRemotePlayers();
    } catch (error) {
      console.error('[Explore3D] Multiplayer initialization failed:', error);

      this.multiplayerJoined = false;
    } finally {
      this.multiplayerJoining = false;
    }
  }

  private async loadCharacterModel(): Promise<void> {
    try {
      const character = await firstValueFrom(
        this.characterService.getMyCharacter(),
      );

      if (this.destroyed || !character) {
        return;
      }

      const data = character as CharacterModelResponse;

      /*
       * Character username
       */
      if (typeof data.username === 'string' && data.username.trim()) {
        this.characterUsername = data.username.trim();
      }

      /*
       * Character model
       */
      const model = data.characterModel ?? data.model;

      if (typeof model === 'string' && model.trim()) {
        this.characterModel = model.trim();
      }
    } catch (error) {
      console.warn(
        '[Explore3D] Character profile unavailable; using defaults.',
        error,
      );

      this.characterUsername = 'Explorer';

      this.characterModel = 'aj';
    }
  }

  private getPlayerDisplayName(): string {
    return this.characterUsername.trim() || 'Explorer';
  }

  /* =========================================================
     LOCAL PLAYER POSITION
  ========================================================= */

  private getLocalPlayerPosition(): Explore3dPlayerPosition {
    const playerMesh = this.player.player;

    return {
      x: playerMesh.position.x,
      y: playerMesh.position.y,
      z: playerMesh.position.z,
      rotationY: playerMesh.rotation.y,
    };
  }

  /* =========================================================
     MULTIPLAYER SYNC
  ========================================================= */

  private startMultiplayerSync(): void {
    if (this.multiplayerSyncTimer || this.destroyed) {
      return;
    }

    this.multiplayerSyncTimer = setInterval(() => {
      if (
        this.destroyed ||
        this.multiplayerDestroyed ||
        !this.multiplayerJoined ||
        !this.multiplayer.connected()
      ) {
        return;
      }

      this.syncRemotePlayers();
    }, this.remoteSyncInterval);
  }

  private stopMultiplayerSync(): void {
    if (this.multiplayerSyncTimer) {
      clearInterval(this.multiplayerSyncTimer);

      this.multiplayerSyncTimer = null;
    }
  }

  private syncRemotePlayers(): void {
    if (
      this.destroyed ||
      this.multiplayerDestroyed ||
      !this.multiplayerJoined
    ) {
      return;
    }

    const players = this.multiplayer.players();

    const currentIds = new Set<string>();

    for (const remotePlayer of players) {
      if (
        !remotePlayer?.userId ||
        remotePlayer.worldId !== this.multiplayerWorldId
      ) {
        continue;
      }

      const playerId = remotePlayer.userId;

      currentIds.add(playerId);

      if (
        !this.remotePlayerIds.has(playerId) &&
        !this.pendingRemotePlayerIds.has(playerId)
      ) {
        this.pendingRemotePlayerIds.add(playerId);

        this.remotePlayerIds.add(playerId);

        this.pendingRemotePlayerIds.delete(playerId);
      }
    }

    this.remotePlayerList = players.filter(
      (remotePlayer) =>
        !!remotePlayer?.userId &&
        remotePlayer.worldId === this.multiplayerWorldId,
    );

    for (const playerId of this.remotePlayerIds) {
      if (!currentIds.has(playerId)) {
        this.remotePlayerIds.delete(playerId);
      }
    }
  }

  /* =========================================================
     CATEGORY INTERACTION
  ========================================================= */

  private setupCategoryEntranceInteraction(): void {
    if (this.pointerObserver || this.destroyed || !this.initialized) {
      return;
    }

    const scene = this.engine3d.scene;

    this.pointerObserver = scene.onPointerObservable.add(
      (pointerInfo: PointerInfo) => {
        if (
          this.destroyed ||
          !this.initialized ||
          this.isLoadingCategory ||
          this.showCategoryModal ||
          this.isInCategoryWorld ||
          this.selectedBusiness
        ) {
          return;
        }

        if (pointerInfo.type !== PointerEventTypes.POINTERPICK) {
          return;
        }

        const pickInfo = pointerInfo.pickInfo;

        if (!pickInfo?.hit || !pickInfo.pickedMesh) {
          return;
        }

        const category = this.world.getHubBuildingCategory(pickInfo.pickedMesh);

        if (!category || !this.isValidCategory(category)) {
          return;
        }

        this.onCategorySelected(category);
      },
    );
  }

  private isValidCategory(category: Explore3dCategory): boolean {
    return this.categories.some((item) => item.id === category);
  }

  /* =========================================================
     CATEGORY MODAL
  ========================================================= */

  onCategorySelected(category: Explore3dCategory): void {
    if (
      this.destroyed ||
      !this.initialized ||
      this.isLoadingCategory ||
      this.isInCategoryWorld ||
      this.showCategoryModal ||
      !this.isValidCategory(category)
    ) {
      return;
    }

    this.selectedBusiness = null;

    this.selectedCategory = category;

    this.showCategoryModal = true;

    this.player.cancelNavigation();
  }

  cancelCategoryEntry(): void {
    if (this.isLoadingCategory || this.destroyed) {
      return;
    }

    this.showCategoryModal = false;

    this.selectedCategory = null;
  }

  async confirmCategoryEntry(): Promise<void> {
    if (this.destroyed || this.isLoadingCategory || !this.selectedCategory) {
      return;
    }

    const category = this.selectedCategory;

    this.showCategoryModal = false;

    this.selectedCategory = null;

    await this.enterCategory(category);
  }

  /* =========================================================
     LOAD BUSINESSES
  ========================================================= */

  private async loadBusinesses(): Promise<void> {
    if (this.destroyed || !this.initialized) {
      return;
    }

    try {
      const result = await this.businessService.getApprovedBusinesses();

      if (this.destroyed) {
        return;
      }

      const approvedBusinesses = (result ?? []).filter(
        (business) =>
          business.status === 'approved' &&
          this.business3d.isValidCoordinate(
            business.latitude,
            business.longitude,
          ),
      );

      this.businesses = approvedBusinesses;

      this.buildBusinessCategoryCache();
    } catch (error) {
      console.error('Unable to load businesses:', error);

      if (!this.destroyed) {
        this.businesses = [];

        this.visibleBusinesses = [];

        this.businessesByCategory.clear();

        this.categoryError = 'Unable to load businesses.';
      }
    }
  }

  private buildBusinessCategoryCache(): void {
    this.businessesByCategory.clear();

    for (const business of this.businesses) {
      const normalized = this.normalizeCategory(business.category);

      if (!normalized) {
        continue;
      }

      let group = this.businessesByCategory.get(normalized);

      if (!group) {
        group = [];

        this.businessesByCategory.set(normalized, group);
      }

      group.push(business);
    }
  }

  private getBusinessesByCategory(category: Explore3dCategory): Business[] {
    return (
      this.businessesByCategory.get(this.normalizeCategory(category)) ?? []
    );
  }

  /* =========================================================
     ENTER CATEGORY
  ========================================================= */

  async enterCategory(category: Explore3dCategory): Promise<void> {
    if (
      this.destroyed ||
      !this.initialized ||
      this.isLoadingCategory ||
      !this.isValidCategory(category)
    ) {
      return;
    }

    this.isLoadingCategory = true;

    this.categoryError = '';

    this.selectedBusiness = null;

    const version = ++this.transitionVersion;

    this.player.cancelNavigation();

    try {
      this.business3d.clearBusinesses();

      this.currentCategory = category;

      this.visibleBusinesses = [];

      await this.world.enterCategoryWorld(category);

      if (this.destroyed || version !== this.transitionVersion) {
        return;
      }

      const worldOffset = this.world.getCategoryWorldOffset(category);

      this.business3d.setWorldOffset(worldOffset);

      this.visibleBusinesses = this.getBusinessesByCategory(category);

      if (this.visibleBusinesses.length > 0) {
        this.business3d.renderBusinesses(
          this.engine3d.scene,
          this.visibleBusinesses,
        );
      }

      if (this.destroyed || version !== this.transitionVersion) {
        return;
      }

      this.player.resetPosition(this.world.getCategorySpawnPoint(category));

      this.engine3d.camera.target = this.player.getCameraTarget();

      this.isInCategoryWorld = true;
    } catch (error) {
      console.error('Unable to enter category world:', error);

      if (this.destroyed || version !== this.transitionVersion) {
        return;
      }

      this.categoryError = 'Unable to load this category. Please try again.';

      this.currentCategory = null;

      this.visibleBusinesses = [];

      this.isInCategoryWorld = false;

      this.business3d.clearBusinesses();

      this.business3d.setWorldOffset(Vector3.Zero());
    } finally {
      if (!this.destroyed && version === this.transitionVersion) {
        this.isLoadingCategory = false;
      }
    }
  }

  /* =========================================================
     BACK TO HUB
  ========================================================= */

  async backToHub(): Promise<void> {
    if (this.destroyed || !this.initialized || this.isLoadingCategory) {
      return;
    }

    this.showCategoryModal = false;

    this.selectedCategory = null;

    this.isLoadingCategory = true;

    this.selectedBusiness = null;

    const version = ++this.transitionVersion;

    this.player.cancelNavigation();

    try {
      this.business3d.clearBusinesses();

      await this.world.backToCategoryHub();

      if (this.destroyed || version !== this.transitionVersion) {
        return;
      }

      this.business3d.setWorldOffset(Vector3.Zero());

      this.player.resetPosition(this.world.getHubSpawnPoint());

      this.engine3d.camera.target = this.player.getCameraTarget();

      this.currentCategory = null;

      this.visibleBusinesses = [];

      this.isInCategoryWorld = false;

      this.categoryError = '';
    } catch (error) {
      console.error('Unable to return to Hub:', error);

      if (!this.destroyed && version === this.transitionVersion) {
        this.categoryError = 'Unable to return to the Hub. Please try again.';
      }
    } finally {
      if (!this.destroyed && version === this.transitionVersion) {
        this.isLoadingCategory = false;
      }
    }
  }

  /* =========================================================
     CATEGORY NORMALIZATION
  ========================================================= */

  private normalizeCategory(value: unknown): string {
    const category = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ');

    switch (category) {
      case 'food':
      case 'foods':
      case 'food and drinks':
      case 'foods and drinks':
      case 'food drinks':
        return 'foods and drinks';

      case 'hotel':
      case 'hotels':
        return 'hotels';

      case 'shop':
      case 'shops':
        return 'shops';

      case 'service':
      case 'services':
        return 'services';

      case 'boarding house':
      case 'boarding houses':
        return 'boarding house';

      default:
        return category;
    }
  }

  /* =========================================================
     BUSINESS
  ========================================================= */

  openBusiness(business: Business): void {
    if (this.destroyed || this.isLoadingCategory || this.showCategoryModal) {
      return;
    }

    if (
      this.isInCategoryWorld &&
      !this.visibleBusinesses.some((item) => item.id === business.id)
    ) {
      return;
    }

    this.selectedBusiness = business;

    this.player.cancelNavigation();
  }

  closeBusiness(): void {
    this.selectedBusiness = null;
  }

  getBusinessFeatures(business: Business): string[] {
    const features = business.features;

    if (!features) {
      return [];
    }

    const result: string[] = [];

    if (features.services) {
      result.push('Services');
    }

    if (features.products) {
      result.push('Products');
    }

    if (features.menu) {
      result.push('Menu');
    }

    if (features.booking) {
      result.push('Booking');
    }

    if (features.reservations) {
      result.push('Reservations');
    }

    if (features.inquiries) {
      result.push('Inquiries');
    }

    if (features.ordering) {
      result.push('Ordering');
    }

    if (features.promotions) {
      result.push('Promotions');
    }

    if (features.rooms) {
      result.push('Rooms');
    }

    if (features.requestQuote) {
      result.push('Request Quote');
    }

    if (features.events) {
      result.push('Events');
    }

    return result;
  }

  /* =========================================================
     CALL BUSINESS
  ========================================================= */

  callBusiness(business: Business): void {
    if (this.destroyed || !business.phone) {
      return;
    }

    window.location.href = `tel:${business.phone}`;
  }

  /* =========================================================
     GO TO BUSINESS
  ========================================================= */

  goToBusiness(business: Business): void {
    if (this.destroyed || this.isLoadingCategory) {
      return;
    }

    if (
      !this.business3d.isValidCoordinate(business.latitude, business.longitude)
    ) {
      return;
    }

    const position = this.business3d.coordinatesToWorld(
      business.latitude,
      business.longitude,
    );

    this.player.goToBusiness(business, position);

    this.closeBusiness();
  }

  /* =========================================================
     BUSINESS DISCOVERY
  ========================================================= */

  showBusinessDiscovery = false;

  toggleBusinessDiscovery(): void {
    this.showBusinessDiscovery = !this.showBusinessDiscovery;
  }

  closeBusinessDiscovery(): void {
    this.showBusinessDiscovery = false;
  }

  /* =========================================================
     FULLSCREEN
  ========================================================= */

  isFullscreen = false;

  async enterExploreFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      this.isFullscreen = true;
    } catch (error) {
      console.warn('[Explore3D] Fullscreen request failed:', error);
    }
  }

  async exitExploreFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      this.isFullscreen = false;
    } catch (error) {
      console.warn('[Explore3D] Exit fullscreen failed:', error);
    }
  }

  private handleFullscreenChange = (): void => {
    this.isFullscreen = !!document.fullscreenElement;
  };

  /* =========================================================
     MULTIPLAYER CLEANUP
  ========================================================= */

  private async disposeMultiplayer(): Promise<void> {
    if (this.multiplayerDestroyed) {
      return;
    }

    this.multiplayerDestroyed = true;

    this.multiplayerJoined = false;

    this.stopMultiplayerSync();

    this.remotePlayerIds.clear();

    this.pendingRemotePlayerIds.clear();

    this.remotePlayerList = [];

    try {
      await this.multiplayer.leaveWorld();
    } catch (error) {
      console.warn('[Explore3D] Error leaving multiplayer world:', error);
    }
  }

  /* =========================================================
     GLOBAL CHAT CLEANUP
  ========================================================= */

  private disposeGlobalChatListeners(): void {
    this.removeGlobalChatMessageListener?.();

    this.removeGlobalChatModerationListener?.();

    this.removeGlobalChatConnectionListener?.();

    this.removeGlobalChatMessageListener = null;

    this.removeGlobalChatModerationListener = null;

    this.removeGlobalChatConnectionListener = null;
  }

  private async disposeGlobalChat(): Promise<void> {
    this.disposeGlobalChatListeners();

    try {
      await this.globalChat.disconnect();
    } catch (error) {
      console.warn('[Explore3D] Error disconnecting Global Chat:', error);
    }

    this.globalChatMessages = [];

    this.globalChatModeration = null;

    this.globalChatOnline = false;

    this.globalChatUnreadCount = 0;

    this.globalChatOpen = false;
  }

  /* =========================================================
     DESTROY
  ========================================================= */

  async ngOnDestroy(): Promise<void> {
    document.removeEventListener(
      'fullscreenchange',
      this.handleFullscreenChange,
    );

    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    this.initialized = false;

    this.transitionVersion++;

    this.showCategoryModal = false;

    this.selectedCategory = null;

    this.visibleBusinesses = [];

    this.businesses = [];

    this.businessesByCategory.clear();

    if (this.pointerObserver) {
      this.engine3d.scene?.onPointerObservable.remove(this.pointerObserver);

      this.pointerObserver = null;
    }

    const multiplayerCleanup = this.disposeMultiplayer();

    const globalChatCleanup = this.disposeGlobalChat();

    this.input.dispose();

    this.player.dispose();

    this.business3d.dispose();

    this.engine3d.dispose();

    await multiplayerCleanup;

    await globalChatCleanup;
  }

  getGlobalChatSenderColor(name: string): string {
    const colors = ['#ffffff', '#d4d4d4', '#b8b8b8', '#a3a3a3', '#e5e5e5'];

    let hash = 0;

    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }
}
