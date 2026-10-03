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

import { Business } from '../../../../core/models/business';
import { BusinessService } from '../../../../core/services/business.service';

import { Explore3dEngineService } from '../../services/explore3d-engine.service';
import { Explore3dPlayerService } from '../../services/explore3d-player.service';
import { Explore3dWorldService } from '../../services/explore3d-world.service';
import { Explore3dBusiness3dService } from '../../services/explore3d-business-3d.service';
import { Explore3dInputService } from '../../services/explore3d-input.service';

import {
  Explore3dChatService,
  GlobalChatMessage,
} from '../../services/explore3d-chat.service';

import { Explore3dCategory } from '../../services/explore3d-category.service';

/* =========================================================
   INTERFACES
========================================================= */

interface ExploreCategoryOption {
  id: Explore3dCategory;
  label: string;
  description: string;
}

/* =========================================================
   COMPONENT
========================================================= */

@Component({
  selector: 'app-explore3d',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './explore3d.component.html',
  styleUrl: './explore3d.component.scss',
  providers: [
    Explore3dEngineService,
    Explore3dPlayerService,
    Explore3dWorldService,
    Explore3dBusiness3dService,
    Explore3dInputService,
    Explore3dChatService,
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

  /**
   * Cached businesses grouped by normalized category.
   * Avoids filtering the full business array every time
   * the player enters a category.
   */
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
     LIFECYCLE STATE
  ========================================================= */

  private destroyed = false;
  private initialized = false;
  private initializing = false;

  private pointerObserver: Observer<PointerInfo> | null = null;

  /**
   * Invalidates an old asynchronous category transition
   * when another transition starts or the component is destroyed.
   */
  private transitionVersion = 0;

  constructor(
    private readonly businessService: BusinessService,
    private readonly engine3d: Explore3dEngineService,
    private readonly player: Explore3dPlayerService,
    @Inject(Explore3dWorldService)
    private readonly world: Explore3dWorldService,
    private readonly business3d: Explore3dBusiness3dService,
    private readonly input: Explore3dInputService,
    private readonly chat: Explore3dChatService,
  ) {}

  /* =========================================================
     TEMPLATE GETTERS
  ========================================================= */

  get isAutoNavigating(): boolean {
    return this.player.isAutoNavigating;
  }

  get destinationBusiness(): Business | null {
    return this.player.destinationBusiness;
  }

  get chatOpen(): boolean {
    return this.chat.chatOpen;
  }

  get chatConnected(): boolean {
    return this.chat.chatConnected;
  }

  get chatConnecting(): boolean {
    return this.chat.chatConnecting;
  }

  get chatMessage(): string {
    return this.chat.chatMessage;
  }

  set chatMessage(value: string) {
    this.chat.chatMessage = value;
  }

  get chatName(): string {
    return this.chat.chatName;
  }

  set chatName(value: string) {
    this.chat.chatName = value;
  }

  get chatMessages(): GlobalChatMessage[] {
    return this.chat.chatMessages;
  }

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

      this.chat.initialize();
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

    // Input service must initialize after the view/DOM exists.
    this.input.initialize();

    this.business3d.setupInteraction(
      this.engine3d.scene,
      (business: Business) => this.openBusiness(business),
    );

    this.engine3d.camera.target = this.player.getCameraTarget();

    /**
     * Mark initialized before registering interactions.
     * The pointer observer checks this flag.
     */
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
     CATEGORY BUILDING INTERACTION
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

        /**
         * Resolve category from the clicked mesh
         * or its parent in the world service.
         */
        const category = this.world.getHubBuildingCategory(pickInfo.pickedMesh);

        if (!category || !this.isValidCategory(category)) {
          return;
        }

        this.onCategorySelected(category);
      },
    );
  }

  /* =========================================================
     CATEGORY VALIDATION
  ========================================================= */

  private isValidCategory(category: Explore3dCategory): boolean {
    return this.categories.some((item) => item.id === category);
  }

  /* =========================================================
     OPEN CATEGORY CONFIRMATION
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

  /* =========================================================
     CANCEL CATEGORY ENTRY
  ========================================================= */

  cancelCategoryEntry(): void {
    if (this.isLoadingCategory || this.destroyed) {
      return;
    }

    this.showCategoryModal = false;
    this.selectedCategory = null;
  }

  /* =========================================================
     CONFIRM CATEGORY ENTRY
  ========================================================= */

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

  /* =========================================================
     BUSINESS CATEGORY CACHE
  ========================================================= */

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
     ENTER CATEGORY WORLD
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

      /**
       * Retrieve the pre-grouped business array
       * instead of filtering every business on every entry.
       */
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
     BUSINESS SELECTION
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

  /* =========================================================
     BUSINESS FEATURES
  ========================================================= */

  getBusinessFeatures(business: Business): string[] {
    const features = business.features;

    if (!features) {
      return [];
    }

    const result: string[] = [];

    if (features.services) result.push('Services');
    if (features.products) result.push('Products');
    if (features.menu) result.push('Menu');
    if (features.booking) result.push('Booking');
    if (features.reservations) result.push('Reservations');
    if (features.inquiries) result.push('Inquiries');
    if (features.ordering) result.push('Ordering');
    if (features.promotions) result.push('Promotions');
    if (features.rooms) result.push('Rooms');
    if (features.requestQuote) result.push('Request Quote');
    if (features.events) result.push('Events');

    return result;
  }

  /* =========================================================
     CHAT WITH BUSINESS
  ========================================================= */

  chatWithBusiness(business: Business): void {
    if (this.destroyed) {
      return;
    }

    this.selectedBusiness = business;
    this.chat.chatOpen = true;
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
     GLOBAL CHAT
  ========================================================= */

  toggleGlobalChat(): void {
    if (this.destroyed) {
      return;
    }

    this.chat.toggle();
  }

  async sendGlobalMessage(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    await this.chat.send();
  }

  /* =========================================================
     DESTROY
  ========================================================= */

  async ngOnDestroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.initialized = false;

    // Invalidate all pending asynchronous transitions.
    this.transitionVersion++;

    this.showCategoryModal = false;
    this.selectedCategory = null;

    this.visibleBusinesses = [];
    this.businesses = [];
    this.businessesByCategory.clear();

    // Remove pointer observer before disposing the scene/engine.
    if (this.pointerObserver) {
      this.engine3d.scene?.onPointerObservable.remove(this.pointerObserver);

      this.pointerObserver = null;
    }

    this.input.dispose();
    this.player.dispose();
    this.business3d.dispose();

    await this.chat.dispose();

    this.engine3d.dispose();
  }
}
