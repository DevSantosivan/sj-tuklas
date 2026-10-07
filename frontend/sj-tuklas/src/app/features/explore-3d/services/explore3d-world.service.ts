import { Injectable, signal } from '@angular/core';
import {
  AbstractMesh,
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3,
  Node,
  Texture,
  Observer,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';

import { HubEnvironmentBuilder } from '../worlds/hub/hub-environment.builder';

import { Explore3dCategory } from './explore3d-category.service';
import { CategoryWorldBuilder } from '../worlds/categories/category-world.builder';
import { getServicesWorldConfig } from '../worlds/categories/services/services-world.config';
import type { Explore3dBuildingSelection } from '../models/explore3d-world.types';
import { Explore3dBusinessBillboardService } from './explore3d-business-billboard.service';
import { BusinessService } from '../../../core/services/business.service';

interface HubModelConfig {
  category: Explore3dCategory;
  fileName: string;
  targetSize: number;
  x: number;
  z: number;
  rotationY: number;
}

@Injectable()
export class Explore3dWorldService {
  private scene!: Scene;

  private currentCategory: Explore3dCategory | null = null;

  private worldMeshes: Mesh[] = [];
  private categoryWorldMeshes: Mesh[] = [];

  private hubModelRoots: TransformNode[] = [];
  private categoryModelRoots: TransformNode[] = [];

  // =========================================================
  // HUB GLB STREAMING
  // =========================================================
  private readonly hubModelStates = new Map<
    Explore3dCategory,
    'unloaded' | 'loading' | 'loaded'
  >();
  private readonly hubModelRootsByCategory = new Map<
    Explore3dCategory,
    TransformNode
  >();
  private readonly hubModelCollisionByCategory = new Map<
    Explore3dCategory,
    Mesh
  >();
  private hubModelStreamingObserver?: Observer<Scene>;
  private hubModelStreamingFrame = 0;
  private readonly hubModelLoadDistance = 78;
  private readonly hubModelDisableDistance = 95;

  private categoryTextures: DynamicTexture[] = [];
  private categoryMaterials: StandardMaterial[] = [];

  private hemiLight?: HemisphericLight;
  private directionalLight?: DirectionalLight;

  // Real-time sun / moon
  private sunMesh?: Mesh;
  private moonMesh?: Mesh;
  private sunMaterial?: StandardMaterial;
  private moonMaterial?: StandardMaterial;
  private timeOfDayTimer?: ReturnType<typeof setInterval>;

  private isNight = false;
  private isCreated = false;
  private isDisposed = false;
  private isCreating = false;

  private readonly servicesWorldBuilder = new CategoryWorldBuilder();

  private floorMaterial?: StandardMaterial;
  private floorDarkMaterial?: StandardMaterial;
  private tileLineMaterial?: StandardMaterial;
  private concreteMaterial?: StandardMaterial;
  private concreteDarkMaterial?: StandardMaterial;
  private whiteMaterial?: StandardMaterial;
  private blackMaterial?: StandardMaterial;
  private glassMaterial?: StandardMaterial;
  private metalMaterial?: StandardMaterial;
  private accentMaterial?: StandardMaterial;
  private accentSoftMaterial?: StandardMaterial;

  private readonly hubSize = 150;
  private readonly categoryGroundSize = 180;

  private readonly hubEnvironmentBuilder = new HubEnvironmentBuilder();

  private readonly businessService = new BusinessService();

  private readonly businessBillboardService =
    new Explore3dBusinessBillboardService(this.businessService);
  private readonly hubModels: HubModelConfig[] = [
    {
      category: 'Foods & Drinks',
      fileName: 'foodhouse.glb',
      targetSize: 18,
      x: 0,
      z: -50,
      rotationY: 0,
    },
    {
      category: 'Hotels',
      fileName: 'hotel.glb',
      targetSize: 22,
      x: 58,
      z: -28,
      rotationY: 0,
    },
    {
      category: 'Boarding House',
      fileName: 'boarding.glb',
      targetSize: 18,
      x: -58,
      z: 28,
      rotationY: Math.PI / 2,
    },
    {
      category: 'Shops',
      fileName: 'shop.glb',
      targetSize: 18,
      x: 0,
      z: 50,
      rotationY: Math.PI,
    },
    {
      category: 'Services',
      fileName: 'services.glb',
      targetSize: 18,
      x: -58,
      z: -28,
      rotationY: Math.PI / 2,
    },
  ];

  private readonly categoryWorldOffsets: Record<Explore3dCategory, Vector3> = {
    'Foods & Drinks': new Vector3(300, 0, 0),
    Hotels: new Vector3(650, 0, 0),
    Shops: new Vector3(1000, 0, 0),
    Services: new Vector3(1350, 0, 0),
    'Boarding House': new Vector3(1700, 0, 0),
  };

  private readonly hubSpawnPoints: readonly Vector3[] = [
    // upper-left
    new Vector3(-24, 1.2, -24),

    // upper-right
    new Vector3(24, 1.2, -24),

    // lower-left
    new Vector3(-24, 1.2, 24),

    // lower-right
    new Vector3(24, 1.2, 24),

    // extra safe positions
    new Vector3(-28, 1.2, -18),
    new Vector3(28, 1.2, -18),
    new Vector3(-28, 1.2, 18),
    new Vector3(28, 1.2, 18),
  ];

  public getHubSpawnPoint(): Vector3 {
    const index = Math.floor(Math.random() * this.hubSpawnPoints.length);

    return this.hubSpawnPoints[index].clone();
  }

  // =========================================================
  // CREATE WORLD
  // =========================================================

  async create(scene: Scene): Promise<void> {
    if (this.isCreated || this.isCreating) {
      return;
    }

    this.isCreating = true;
    this.isDisposed = false;
    this.scene = scene;

    // =========================================================
    // SHOW LOADING IMMEDIATELY
    // =========================================================

    this.setLoading(true, 'Loading SJ Tuklas...', 5);

    // =========================================================
    // IMPORTANT
    // Give Angular one browser frame to render
    // the loading screen BEFORE Babylon starts
    // creating the heavy world.
    // =========================================================

    await this.waitForFrame();

    try {
      // =======================================================
      // SCENE
      // =======================================================

      this.setLoading(true, 'Preparing 3D environment...', 12);

      await this.waitForFrame();

      this.scene.collisionsEnabled = true;

      this.configureScene();

      // =======================================================
      // MATERIALS
      // =======================================================

      this.setLoading(true, 'Preparing environment...', 20);

      await this.waitForFrame();

      this.createMaterials();

      // =======================================================
      // LIGHTING
      // =======================================================

      this.setLoading(true, 'Setting up lighting...', 28);

      await this.waitForFrame();

      this.createLighting();

      // =======================================================
      // CATEGORY HUB
      // =======================================================

      this.setLoading(true, 'Building SJ Tuklas plaza...', 36);

      await this.waitForFrame();

      this.createCategoryHub();

      // =======================================================
      // ENVIRONMENT
      // =======================================================

      this.setLoading(true, 'Creating world environment...', 45);

      await this.waitForFrame();

      this.hubEnvironmentBuilder.build(this.scene);

      if (this.isDisposed) {
        return;
      }

      // =======================================================
      // CATEGORY BUILDING GLBs
      // =======================================================

      this.setLoading(true, 'Loading category buildings...', 52);

      await this.waitForFrame();

      // Load all important hub GLBs while the loading screen is visible.
      // This prevents a first-approach hitch during gameplay.
      await this.createHubModelPreviews();
      this.startHubModelStreaming();

      if (this.isDisposed) {
        return;
      }

      // =======================================================
      // BUSINESS BILLBOARDS
      // =======================================================

      this.setLoading(true, 'Loading local businesses...', 78);

      await this.waitForFrame();

      await this.businessBillboardService.create(this.scene);

      if (this.isDisposed) {
        return;
      }

      // =======================================================
      // TIME OF DAY
      // =======================================================

      this.setLoading(true, 'Finalizing world...', 93);

      await this.waitForFrame();

      this.updateTimeOfDay();

      // =======================================================
      // WORLD CREATED
      // =======================================================

      this.isCreated = true;

      // =======================================================
      // FINAL
      // =======================================================

      this.setLoading(true, 'Entering SJ Tuklas...', 97);

      await this.waitForFrame();

      this.setLoading(true, 'World ready', 100);

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 350);
      });

      // =======================================================
      // HIDE LOADING
      // =======================================================

      this.setLoading(false, '', 100);
    } catch (error) {
      console.error('[Explore3dWorldService] Failed to create world:', error);

      // =======================================================
      // ERROR STATE
      // =======================================================

      this.setLoading(true, 'Unable to load 3D world', 100);

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1200);
      });

      this.setLoading(false, '', 100);

      throw error;
    } finally {
      this.isCreating = false;
    }
  }
  // =========================================================
  // PUBLIC STATE
  // =========================================================

  getCurrentCategory(): Explore3dCategory | null {
    return this.currentCategory;
  }

  isInCategoryWorld(): boolean {
    return this.currentCategory !== null;
  }

  getHubBuildingCategory(
    mesh: AbstractMesh | null | undefined,
  ): Explore3dCategory | null {
    if (!mesh) return null;

    let current: Node | null = mesh;

    while (current) {
      const metadata = current.metadata;

      if (metadata?.isHubBuilding === true || metadata?.isHubModel === true) {
        const category = metadata.exploreCategory as
          | Explore3dCategory
          | undefined;

        if (
          category &&
          this.hubModels.some((model) => model.category === category)
        ) {
          return category;
        }
      }

      current = current.parent;
    }

    return null;
  }

  async handleHubBuildingClick(
    mesh: AbstractMesh | null | undefined,
  ): Promise<Explore3dCategory | null> {
    if (!mesh || this.currentCategory !== null) {
      return null;
    }

    const category = this.getHubBuildingCategory(mesh);

    if (!category) {
      return null;
    }

    await this.enterCategoryWorld(category);

    return category;
  }

  getCategoryWorldSelection(mesh: Mesh): Explore3dBuildingSelection | null {
    if (this.currentCategory !== 'Services') return null;

    return this.servicesWorldBuilder.getSelection(mesh);
  }

  getCategoryWorldOffset(category: Explore3dCategory): Vector3 {
    return this.categoryWorldOffsets[category].clone();
  }

  getCategorySpawnPoint(category: Explore3dCategory): Vector3 {
    return this.getCategoryWorldOffset(category).add(new Vector3(0, 1, 65));
  }

  // =========================================================
  // COLLISIONS / MESH TRACKING
  // =========================================================

  private enableSolidCollision(mesh: Mesh): Mesh {
    mesh.checkCollisions = true;
    mesh.isPickable = true;
    return mesh;
  }

  private disableCollision(mesh: Mesh): Mesh {
    mesh.checkCollisions = false;
    mesh.isPickable = false;
    return mesh;
  }

  private addWorldMesh(mesh: Mesh, solid = true): Mesh {
    if (solid) {
      this.enableSolidCollision(mesh);
    } else {
      this.disableCollision(mesh);
    }

    this.worldMeshes.push(mesh);
    return mesh;
  }

  private addCategoryMesh(mesh: Mesh, solid = true): Mesh {
    if (solid) {
      this.enableSolidCollision(mesh);
    } else {
      this.disableCollision(mesh);
    }

    this.categoryWorldMeshes.push(mesh);
    return mesh;
  }

  // =========================================================
  // SCENE
  // =========================================================

  private configureScene(): void {
    this.scene.clearColor = new Color4(0.035, 0.04, 0.05, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0026;
    this.scene.fogColor = new Color3(0.035, 0.04, 0.05);
  }

  // =========================================================
  // MATERIALS
  // =========================================================

  private createMaterials(): void {
    // Main charcoal floor
    this.floorMaterial = new StandardMaterial('worldFloor', this.scene);
    this.floorMaterial.diffuseColor = new Color3(0.12, 0.14, 0.16);
    this.floorMaterial.specularColor = new Color3(0.12, 0.14, 0.16);
    this.floorMaterial.roughness = 0.82;

    // Dark floor panels
    this.floorDarkMaterial = new StandardMaterial('worldFloorDark', this.scene);
    this.floorDarkMaterial.diffuseColor = new Color3(0.075, 0.085, 0.1);
    this.floorDarkMaterial.specularColor = new Color3(0.08, 0.09, 0.1);
    this.floorDarkMaterial.roughness = 0.9;

    // Subtle teal floor accents
    this.tileLineMaterial = new StandardMaterial('tileLines', this.scene);
    this.tileLineMaterial.diffuseColor = new Color3(0.12, 0.34, 0.35);
    this.tileLineMaterial.emissiveColor = new Color3(0.025, 0.11, 0.12);
    this.tileLineMaterial.disableLighting = true;

    this.concreteMaterial = new StandardMaterial('concrete', this.scene);
    this.concreteMaterial.diffuseColor = new Color3(0.68, 0.69, 0.7);
    this.concreteMaterial.specularColor = new Color3(0.08, 0.08, 0.08);

    this.concreteDarkMaterial = new StandardMaterial(
      'concreteDark',
      this.scene,
    );
    this.concreteDarkMaterial.diffuseColor = new Color3(0.2, 0.21, 0.22);

    this.whiteMaterial = new StandardMaterial('architecturalWhite', this.scene);
    this.whiteMaterial.diffuseColor = new Color3(0.88, 0.89, 0.9);
    this.whiteMaterial.specularColor = new Color3(0.18, 0.18, 0.18);

    this.blackMaterial = new StandardMaterial('architecturalBlack', this.scene);
    this.blackMaterial.diffuseColor = new Color3(0.035, 0.038, 0.042);
    this.blackMaterial.specularColor = new Color3(0.12, 0.12, 0.12);

    this.glassMaterial = new StandardMaterial('darkGlass', this.scene);
    this.glassMaterial.diffuseColor = new Color3(0.08, 0.1, 0.11);
    this.glassMaterial.specularColor = new Color3(0.55, 0.55, 0.55);
    this.glassMaterial.alpha = 0.88;

    this.metalMaterial = new StandardMaterial('darkMetal', this.scene);
    this.metalMaterial.diffuseColor = new Color3(0.12, 0.13, 0.14);
    this.metalMaterial.specularColor = new Color3(0.75, 0.75, 0.75);

    this.accentMaterial = new StandardMaterial('softAccent', this.scene);
    this.accentMaterial.diffuseColor = new Color3(0.32, 0.58, 0.58);
    this.accentMaterial.emissiveColor = new Color3(0.08, 0.18, 0.18);

    this.accentSoftMaterial = new StandardMaterial('accentSoft', this.scene);
    this.accentSoftMaterial.diffuseColor = new Color3(0.45, 0.48, 0.49);
  }

  // =========================================================
  // LIGHTING
  // =========================================================

  private createLighting(): void {
    this.hemiLight = new HemisphericLight(
      'worldHemiLight',
      new Vector3(0, 1, 0),
      this.scene,
    );

    this.hemiLight.intensity = 0.72;
    this.hemiLight.groundColor = new Color3(0.04, 0.045, 0.05);
    this.hemiLight.diffuse = new Color3(0.88, 0.89, 0.9);

    this.directionalLight = new DirectionalLight(
      'worldDirectionalLight',
      new Vector3(-0.45, -1, -0.35),
      this.scene,
    );

    this.directionalLight.position = new Vector3(35, 65, 30);
    this.directionalLight.intensity = 0.65;

    // Visible sun
    this.sunMaterial = new StandardMaterial('worldSunMaterial', this.scene);
    this.sunMaterial.diffuseColor = new Color3(1, 0.78, 0.32);
    this.sunMaterial.emissiveColor = new Color3(1, 0.55, 0.08);
    this.sunMaterial.disableLighting = true;

    this.sunMesh = MeshBuilder.CreateSphere(
      'worldSun',
      {
        diameter: 5.5,
        segments: 16,
      },
      this.scene,
    );

    this.sunMesh.material = this.sunMaterial;
    this.sunMesh.isPickable = false;
    this.sunMesh.checkCollisions = false;
    this.sunMesh.isVisible = false;

    // Visible moon
    this.moonMaterial = new StandardMaterial('worldMoonMaterial', this.scene);
    this.moonMaterial.diffuseColor = new Color3(0.82, 0.86, 1);
    this.moonMaterial.emissiveColor = new Color3(0.28, 0.34, 0.52);
    this.moonMaterial.disableLighting = true;

    this.moonMesh = MeshBuilder.CreateSphere(
      'worldMoon',
      {
        diameter: 4.2,
        segments: 16,
      },
      this.scene,
    );

    this.moonMesh.material = this.moonMaterial;
    this.moonMesh.isPickable = false;
    this.moonMesh.checkCollisions = false;
    this.moonMesh.isVisible = false;

    this.startTimeOfDayClock();
  }

  // =========================================================
  // CATEGORY HUB
  // =========================================================

  private createCategoryHub(): void {
    this.createMainTiledFloor();
    this.createOuterFloorFrame();
    this.createCentralPlatform();
    this.createCentralHubDecoration();
    this.createHubCorners();
    this.createHubWalkwayTiles();

    // Social / hangout areas
    // this.createHubHangoutAreas();

    // Lightweight decorative street lights
    this.createHubStreetLights();

    // Solid safety perimeter so players cannot walk/fall outside the hub
    this.createHubPerimeter();

    this.createHubProceduralPreviews();
  }

  // =========================================================
  // MAIN FUTURISTIC FLOOR
  // =========================================================

  private createMainTiledFloor(): void {
    const size = 145;
    const panelCount = 5;
    const panelSize = 28;
    const gap = 0.22;
    const start = -((panelCount - 1) * (panelSize + gap)) / 2;

    // Single solid base handles player collision
    const base = MeshBuilder.CreateBox(
      'hubMainFloor',
      {
        width: size,
        depth: size,
        height: 0.3,
      },
      this.scene,
    );

    base.position.y = -0.17;
    base.material = this.floorDarkMaterial!;
    this.addWorldMesh(base, true);

    // Large alternating panels
    for (let x = 0; x < panelCount; x++) {
      for (let z = 0; z < panelCount; z++) {
        const panel = MeshBuilder.CreateBox(
          `hubFloorPanel_${x}_${z}`,
          {
            width: panelSize,
            depth: panelSize,
            height: 0.08,
          },
          this.scene,
        );

        panel.position.set(
          start + x * (panelSize + gap),
          0.02,
          start + z * (panelSize + gap),
        );

        panel.material =
          (x + z) % 2 === 0 ? this.floorMaterial! : this.floorDarkMaterial!;

        this.addWorldMesh(panel, false);
      }
    }

    // Accent grid lines
    const accentPositions = [-60, -30, 0, 30, 60];

    accentPositions.forEach((position, index) => {
      const horizontal = MeshBuilder.CreateBox(
        `hubFloorAccentH_${index}`,
        {
          width: 140,
          depth: 0.12,
          height: 0.025,
        },
        this.scene,
      );

      horizontal.position.set(0, 0.075, position);
      horizontal.material = this.tileLineMaterial!;
      this.addWorldMesh(horizontal, false);

      const vertical = MeshBuilder.CreateBox(
        `hubFloorAccentV_${index}`,
        {
          width: 0.12,
          depth: 140,
          height: 0.025,
        },
        this.scene,
      );

      vertical.position.set(position, 0.075, 0);
      vertical.material = this.tileLineMaterial!;
      this.addWorldMesh(vertical, false);
    });
  }

  // =========================================================
  // OUTER FLOOR FRAME
  // =========================================================

  private createOuterFloorFrame(): void {
    const size = this.hubSize + 4;

    const frame = MeshBuilder.CreateBox(
      'outerFloorFrame',
      {
        width: size,
        depth: size,
        height: 0.35,
      },
      this.scene,
    );

    frame.position.y = -0.23;
    frame.material = this.blackMaterial!;
    this.addWorldMesh(frame);

    const inner = MeshBuilder.CreateBox(
      'innerFloorFrame',
      {
        width: size - 3,
        depth: size - 3,
        height: 0.08,
      },
      this.scene,
    );

    inner.position.y = 0.08;
    inner.material = this.concreteDarkMaterial!;
    this.addWorldMesh(inner);
  }

  // =========================================================
  // CENTRAL PLATFORM
  // =========================================================

  private createCentralPlatform(): void {
    const base = MeshBuilder.CreateCylinder(
      'centralPlatformBase',
      {
        diameter: 22,
        height: 0.8,
        tessellation: 48,
      },
      this.scene,
    );

    base.position.y = 0.4;
    base.material = this.blackMaterial!;
    this.addWorldMesh(base);

    const platform = MeshBuilder.CreateCylinder(
      'centralPlatform',
      {
        diameter: 19,
        height: 0.65,
        tessellation: 48,
      },
      this.scene,
    );

    platform.position.y = 1.05;
    platform.material = this.concreteMaterial!;
    this.addWorldMesh(platform);

    const inner = MeshBuilder.CreateCylinder(
      'centralPlatformInner',
      {
        diameter: 13,
        height: 0.12,
        tessellation: 48,
      },
      this.scene,
    );

    inner.position.y = 1.42;
    inner.material = this.floorDarkMaterial!;
    this.addWorldMesh(inner);
  }

  // =========================================================
  // CENTRAL HUB DECORATION
  // =========================================================

  private createCentralHubDecoration(): void {
    const ring1 = MeshBuilder.CreateTorus(
      'hubRingOuter',
      {
        diameter: 15.5,
        thickness: 0.16,
        tessellation: 48,
      },
      this.scene,
    );

    ring1.position.y = 1.52;
    ring1.material = this.metalMaterial!;
    this.addWorldMesh(ring1, false);

    const ring2 = MeshBuilder.CreateTorus(
      'hubRingAccent',
      {
        diameter: 11.5,
        thickness: 0.12,
        tessellation: 48,
      },
      this.scene,
    );

    ring2.position.y = 1.57;
    ring2.material = this.accentMaterial!;
    this.addWorldMesh(ring2, false);

    const pillar = MeshBuilder.CreateCylinder(
      'hubPillar',
      {
        diameter: 2.8,
        height: 4.5,
        tessellation: 24,
      },
      this.scene,
    );

    pillar.position.y = 3.6;
    pillar.material = this.blackMaterial!;
    this.addWorldMesh(pillar);

    const cap = MeshBuilder.CreateCylinder(
      'hubPillarCap',
      {
        diameter: 3.8,
        height: 0.35,
        tessellation: 24,
      },
      this.scene,
    );

    cap.position.y = 5.9;
    cap.material = this.whiteMaterial!;
    this.addWorldMesh(cap, false);

    const top = MeshBuilder.CreateSphere(
      'hubTopAccent',
      {
        diameter: 1.15,
        segments: 16,
      },
      this.scene,
    );

    top.position.y = 6.7;
    top.material = this.accentMaterial!;
    this.addWorldMesh(top, false);

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;

      const bar = MeshBuilder.CreateBox(
        `hubBar_${i}`,
        {
          width: 0.12,
          height: 2.6,
          depth: 0.12,
        },
        this.scene,
      );

      bar.position.x = Math.cos(angle) * 6.2;
      bar.position.z = Math.sin(angle) * 6.2;
      bar.position.y = 2.2;
      bar.rotation.y = -angle;
      bar.material = this.metalMaterial!;

      this.addWorldMesh(bar, false);
    }
  }

  // =========================================================
  // HUB CORNERS
  // =========================================================

  private createHubCorners(): void {
    const corners: [number, number][] = [
      [-61, -61],
      [61, -61],
      [-61, 61],
      [61, 61],
    ];

    corners.forEach(([x, z], index) => {
      const base = MeshBuilder.CreateBox(
        `cornerBase_${index}`,
        {
          width: 8,
          depth: 8,
          height: 0.35,
        },
        this.scene,
      );

      base.position.set(x, 0.18, z);
      base.material = this.concreteDarkMaterial!;
      this.addWorldMesh(base);

      const pillar = MeshBuilder.CreateBox(
        `cornerPillar_${index}`,
        {
          width: 1.2,
          depth: 1.2,
          height: 6,
        },
        this.scene,
      );

      pillar.position.set(x, 3.2, z);
      pillar.material = this.whiteMaterial!;
      this.addWorldMesh(pillar);

      const top = MeshBuilder.CreateBox(
        `cornerTop_${index}`,
        {
          width: 5,
          depth: 5,
          height: 0.45,
        },
        this.scene,
      );

      top.position.set(x, 6.35, z);
      top.material = this.blackMaterial!;
      this.addWorldMesh(top);
    });
  }

  // =========================================================
  // HUB WALKWAY
  // =========================================================

  private createHubWalkwayTiles(): void {
    const directions = [
      { x: 0, z: -1 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -1, z: 0 },
    ];

    directions.forEach((direction, index) => {
      for (let i = 0; i < 5; i++) {
        const tile = MeshBuilder.CreateBox(
          `walkway_${index}_${i}`,
          {
            width: 4.2,
            depth: 4.2,
            height: 0.12,
          },
          this.scene,
        );

        tile.position.x = direction.x * (14 + i * 4.8);
        tile.position.z = direction.z * (14 + i * 4.8);
        tile.position.y = 0.1;
        tile.material =
          i % 2 === 0 ? this.concreteMaterial! : this.floorMaterial!;

        this.addWorldMesh(tile);
      }
    });
  }

  // // =========================================================
  // // HUB HANGOUT AREAS
  // // =========================================================

  // private createHubHangoutAreas(): void {
  //   const areas: Array<[number, number, number, number]> = [
  //     [-31, -12, 13, 9],
  //     [31, -12, 13, 9],
  //     [-31, 14, 13, 9],
  //     [31, 14, 13, 9],
  //   ];

  //   areas.forEach(([x, z, width, depth], index) => {
  //     const pad = MeshBuilder.CreateBox(
  //       `hubHangoutPad_${index}`,
  //       {
  //         width,
  //         depth,
  //         height: 0.16,
  //       },
  //       this.scene,
  //     );

  //     pad.position.set(x, 0.12, z);
  //     pad.material = this.concreteDarkMaterial!;
  //     this.addWorldMesh(pad, false);

  //     // Two benches facing each other.
  //     this.createHubBench(
  //       `hubHangoutBenchA_${index}`,
  //       x,
  //       z - depth * 0.27,
  //       width * 0.65,
  //       0,
  //     );

  //     this.createHubBench(
  //       `hubHangoutBenchB_${index}`,
  //       x,
  //       z + depth * 0.27,
  //       width * 0.65,
  //       Math.PI,
  //     );

  //     // Small center table / social point.
  //     const tableTop = MeshBuilder.CreateCylinder(
  //       `hubHangoutTable_${index}`,
  //       {
  //         diameter: 1.7,
  //         height: 0.18,
  //         tessellation: 20,
  //       },
  //       this.scene,
  //     );

  //     tableTop.position.set(x, 1.05, z);
  //     tableTop.material = this.metalMaterial!;
  //     this.addWorldMesh(tableTop, false);

  //     const tableStem = MeshBuilder.CreateCylinder(
  //       `hubHangoutTableStem_${index}`,
  //       {
  //         diameter: 0.22,
  //         height: 0.85,
  //         tessellation: 12,
  //       },
  //       this.scene,
  //     );

  //     tableStem.position.set(x, 0.57, z);
  //     tableStem.material = this.metalMaterial!;
  //     this.addWorldMesh(tableStem, false);

  //     // Small accent strip to visually separate the hangout zone.
  //     const accent = MeshBuilder.CreateBox(
  //       `hubHangoutAccent_${index}`,
  //       {
  //         width: width * 0.72,
  //         depth: 0.12,
  //         height: 0.04,
  //       },
  //       this.scene,
  //     );

  //     accent.position.set(x, 0.23, z - depth / 2 + 0.25);
  //     accent.material = this.accentMaterial!;
  //     this.addWorldMesh(accent, false);
  //   });
  // }

  private createHubBench(
    name: string,
    x: number,
    z: number,
    width: number,
    rotationY: number,
  ): void {
    const seat = MeshBuilder.CreateBox(
      `${name}_seat`,
      {
        width,
        depth: 0.72,
        height: 0.28,
      },
      this.scene,
    );

    seat.position.set(x, 0.92, z);
    seat.rotation.y = rotationY;
    seat.material = this.blackMaterial!;
    this.addWorldMesh(seat, false);

    const back = MeshBuilder.CreateBox(
      `${name}_back`,
      {
        width,
        depth: 0.2,
        height: 1.15,
      },
      this.scene,
    );

    // Backrest is offset along the bench's local Z axis.
    const backOffset = 0.42;

    back.position.set(
      x + Math.sin(rotationY) * backOffset,
      1.25,
      z + Math.cos(rotationY) * backOffset,
    );
    back.rotation.y = rotationY;
    back.material = this.blackMaterial!;
    this.addWorldMesh(back, false);

    const legHeight = 0.78;

    for (const side of [-1, 1]) {
      const leg = MeshBuilder.CreateBox(
        `${name}_leg_${side}`,
        {
          width: 0.18,
          depth: 0.48,
          height: legHeight,
        },
        this.scene,
      );

      const localX = side * (width / 2 - 0.45);
      const localZ = 0;
      const rotatedX =
        localX * Math.cos(rotationY) - localZ * Math.sin(rotationY);
      const rotatedZ =
        localX * Math.sin(rotationY) + localZ * Math.cos(rotationY);

      leg.position.set(x + rotatedX, legHeight / 2, z + rotatedZ);

      leg.rotation.y = rotationY;
      leg.material = this.metalMaterial!;
      this.addWorldMesh(leg, false);
    }
  }

  // =========================================================
  // HUB STREET LIGHTS
  // =========================================================

  private createHubStreetLights(): void {
    const positions: Array<[number, number]> = [
      [-21, -21],
      [21, -21],
      [-21, 21],
      [21, 21],
      [-39, 0],
      [39, 0],
      [0, -36],
      [0, 36],
    ];

    positions.forEach(([x, z], index) => {
      const pole = MeshBuilder.CreateCylinder(
        `hubStreetLightPole_${index}`,
        {
          diameter: 0.16,
          height: 5.5,
          tessellation: 12,
        },
        this.scene,
      );

      pole.position.set(x, 2.75, z);
      pole.material = this.metalMaterial!;
      this.addWorldMesh(pole, false);

      const arm = MeshBuilder.CreateBox(
        `hubStreetLightArm_${index}`,
        {
          width: 1.15,
          depth: 0.14,
          height: 0.14,
        },
        this.scene,
      );

      arm.position.set(x, 5.35, z);
      arm.material = this.metalMaterial!;
      this.addWorldMesh(arm, false);

      const lamp = MeshBuilder.CreateSphere(
        `hubStreetLightLamp_${index}`,
        {
          diameter: 0.42,
          segments: 12,
        },
        this.scene,
      );

      lamp.position.set(x, 5.05, z);
      lamp.material = this.accentMaterial!;
      this.addWorldMesh(lamp, false);
    });
  }

  // =========================================================
  // HUB SAFETY PERIMETER
  // =========================================================

  private createHubPerimeter(): void {
    const limit = this.hubSize / 2 - 1.0;

    const wallHeight = 2.8;
    const wallThickness = 0.65;

    const walls = [
      {
        name: 'north',
        width: this.hubSize - 2,
        depth: wallThickness,
        x: 0,
        z: -limit,
      },
      {
        name: 'south',
        width: this.hubSize - 2,
        depth: wallThickness,
        x: 0,
        z: limit,
      },
      {
        name: 'west',
        width: wallThickness,
        depth: this.hubSize - 2,
        x: -limit,
        z: 0,
      },
      {
        name: 'east',
        width: wallThickness,
        depth: this.hubSize - 2,
        x: limit,
        z: 0,
      },
    ];

    walls.forEach((wall) => {
      // =====================================================
      // MAIN WALL
      // =====================================================

      const barrier = MeshBuilder.CreateBox(
        `hubPerimeter_${wall.name}`,
        {
          width: wall.width,
          depth: wall.depth,
          height: wallHeight,
        },
        this.scene,
      );

      barrier.position.set(wall.x, wallHeight / 2, wall.z);

      // Dark gray wall
      barrier.material = this.concreteDarkMaterial!;

      // IMPORTANT:
      // Player cannot pass through the perimeter.
      this.addWorldMesh(barrier, true);

      // =====================================================
      // BLACK TOP LINING
      // =====================================================

      const topRail = MeshBuilder.CreateBox(
        `hubPerimeterBlackTop_${wall.name}`,
        {
          width:
            wall.width +
            (wall.name === 'north' || wall.name === 'south' ? 0.18 : 0),

          depth:
            wall.depth +
            (wall.name === 'east' || wall.name === 'west' ? 0.18 : 0),

          height: 0.16,
        },
        this.scene,
      );

      topRail.position.set(wall.x, wallHeight + 0.08, wall.z);

      // BLACK LINE
      topRail.material = this.blackMaterial!;

      // Visual only
      this.addWorldMesh(topRail, false);

      // =====================================================
      // BLACK BASE LINE
      // =====================================================

      const baseLine = MeshBuilder.CreateBox(
        `hubPerimeterBlackBase_${wall.name}`,
        {
          width:
            wall.width +
            (wall.name === 'north' || wall.name === 'south' ? 0.08 : 0),

          depth:
            wall.depth +
            (wall.name === 'east' || wall.name === 'west' ? 0.08 : 0),

          height: 0.12,
        },
        this.scene,
      );

      baseLine.position.set(wall.x, 0.06, wall.z);

      baseLine.material = this.blackMaterial!;

      this.addWorldMesh(baseLine, false);
    });

    // =========================================================
    // BLACK CORNER POSTS
    // =========================================================

    const corners: Array<[number, number]> = [
      [-limit, -limit],
      [limit, -limit],
      [-limit, limit],
      [limit, limit],
    ];

    corners.forEach(([x, z], index) => {
      const post = MeshBuilder.CreateBox(
        `hubPerimeterCorner_${index}`,
        {
          width: 1.1,
          depth: 1.1,
          height: 3.5,
        },
        this.scene,
      );

      post.position.set(x, 1.75, z);

      // Solid black corner
      post.material = this.blackMaterial!;

      // Corner posts also block the player.
      this.addWorldMesh(post, true);

      // =====================================================
      // SMALL BLACK CAP
      // =====================================================

      const cap = MeshBuilder.CreateBox(
        `hubPerimeterCornerCap_${index}`,
        {
          width: 1.28,
          depth: 1.28,
          height: 0.16,
        },
        this.scene,
      );

      cap.position.set(x, 3.58, z);

      cap.material = this.blackMaterial!;

      this.addWorldMesh(cap, false);
    });
  }
  // =========================================================
  // HUB PROCEDURAL PREVIEW BUILDINGS
  // =========================================================

  private createHubProceduralPreviews(): void {
    this.createHubPreviewBuilding(
      'hubFoodPreview',
      'Foods & Drinks',
      0,
      -40,
      14,
      11,
      7,
    );

    this.createHubPreviewBuilding('hubShopPreview', 'Shops', 58, 28, 13, 10, 6);

    this.createHubPreviewBuilding(
      'hubServicesPreview',
      'Services',
      -58,
      -28,
      13,
      10,
      6,
    );

    this.createHubPreviewBuilding(
      'hubHotelFallback',
      'Hotels',
      58,
      -28,
      12,
      10,
      5,
    );

    this.createHubPreviewBuilding(
      'hubBoardingFallback',
      'Boarding House',
      -58,
      28,
      12,
      10,
      5,
    );
  }

  private createHubPreviewBuilding(
    name: string,
    category: Explore3dCategory,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
  ): void {
    const metadata = {
      exploreCategory: category,
      isHubBuilding: true,
    };

    const base = MeshBuilder.CreateBox(
      `${name}_base`,
      {
        width: width + 1.2,
        depth: depth + 1.2,
        height: 0.45,
      },
      this.scene,
    );

    base.position.set(x, 0.23, z);
    base.material = this.concreteDarkMaterial!;
    base.metadata = { ...metadata };
    this.addWorldMesh(base);

    const body = MeshBuilder.CreateBox(
      `${name}_body`,
      {
        width,
        depth,
        height,
      },
      this.scene,
    );

    body.position.set(x, height / 2 + 0.45, z);
    body.material = this.whiteMaterial!;
    body.metadata = { ...metadata };
    this.addWorldMesh(body);

    const roof = MeshBuilder.CreateBox(
      `${name}_roof`,
      {
        width: width + 0.8,
        depth: depth + 0.8,
        height: 0.45,
      },
      this.scene,
    );

    roof.position.set(x, height + 0.7, z);
    roof.material = this.blackMaterial!;
    roof.metadata = { ...metadata };
    this.addWorldMesh(roof);

    const glass = MeshBuilder.CreateBox(
      `${name}_glass`,
      {
        width: width * 0.62,
        depth: 0.16,
        height: height * 0.48,
      },
      this.scene,
    );

    glass.position.set(x, height * 0.35 + 0.45, z - depth / 2 - 0.09);
    glass.material = this.glassMaterial!;
    glass.metadata = { ...metadata };
    this.addWorldMesh(glass, false);

    const stripe = MeshBuilder.CreateBox(
      `${name}_stripe`,
      {
        width: width * 0.7,
        depth: 0.2,
        height: 0.35,
      },
      this.scene,
    );

    stripe.position.set(x, height * 0.72 + 0.45, z - depth / 2 - 0.12);
    stripe.material = this.accentMaterial!;
    stripe.metadata = { ...metadata };
    this.addWorldMesh(stripe, false);
  }

  // =========================================================
  // GLB HUB PREVIEWS
  // =========================================================

  private async createHubModelPreviews(): Promise<void> {
    const total = this.hubModels.length;

    for (let index = 0; index < total; index++) {
      if (this.isDisposed) return;

      const config = this.hubModels[index];
      this.hubModelStates.set(config.category, 'loading');

      const progress = 55 + Math.round(((index + 1) / total) * 17);
      this.setLoading(true, `Loading ${config.category} building...`, progress);

      await this.waitForFrame();

      try {
        await this.loadHubModel(config, new Vector3(config.x, 0, config.z));

        if (this.isDisposed) return;

        this.hubModelStates.set(config.category, 'loaded');
        this.hideHubFallback(config.category);

        // Give Babylon one frame to finish the imported resources before
        // the next building starts loading.
        await this.waitForFrame();
      } catch (error) {
        console.warn(
          `[Explore3dWorldService] Failed to load ${config.category}:`,
          error,
        );

        // Keep the procedural fallback visible so one bad GLB does not
        // prevent the rest of the world from becoming playable.
        this.hubModelStates.set(config.category, 'unloaded');
      }
    }

    this.setLoading(true, 'Preparing buildings for gameplay...', 72);
    await this.waitForFrame();
  }

  private startHubModelStreaming(): void {
    if (!this.scene || this.hubModelStreamingObserver) return;

    this.hubModelStreamingObserver = this.scene.onBeforeRenderObservable.add(
      (_scene: Scene) => {
        if (this.isDisposed || this.currentCategory !== null) return;

        this.hubModelStreamingFrame++;
        if (this.hubModelStreamingFrame < 15) return;

        this.hubModelStreamingFrame = 0;
        this.updateHubModelStreaming();
      },
    );
  }

  private updateHubModelStreaming(): void {
    if (!this.scene || this.isDisposed) return;

    const camera = this.scene.activeCamera;
    if (!camera) return;

    const cameraPosition = camera.globalPosition;

    for (const config of this.hubModels) {
      if (this.hubModelStates.get(config.category) !== 'loaded') continue;

      const distance = Vector3.Distance(
        cameraPosition,
        new Vector3(config.x, 0, config.z),
      );

      // GLBs are already loaded. This only controls rendering/collision.
      this.setHubModelEnabled(
        config.category,
        distance <= this.hubModelDisableDistance,
      );
    }
  }

  private setHubModelEnabled(
    category: Explore3dCategory,
    enabled: boolean,
  ): void {
    const root = this.hubModelRootsByCategory.get(category);
    const collider = this.hubModelCollisionByCategory.get(category);

    root?.setEnabled(enabled);
    collider?.setEnabled(enabled);
  }

  private hideHubFallback(category: Explore3dCategory): void {
    const fallbackNames: Record<Explore3dCategory, string> = {
      'Foods & Drinks': 'hubFoodPreview',
      Hotels: 'hubHotelFallback',
      Shops: 'hubShopPreview',
      Services: 'hubServicesPreview',
      'Boarding House': 'hubBoardingFallback',
    };

    const fallbackName = fallbackNames[category];

    for (const mesh of this.worldMeshes) {
      if (mesh.name.startsWith(fallbackName)) {
        mesh.setEnabled(false);
      }
    }
  }

  // =========================================================
  // MODEL TEXTURE QUALITY
  // =========================================================
  private configureModelTextureQuality(): void {
    for (const texture of this.scene.textures) {
      texture.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
      texture.anisotropicFilteringLevel = 2;
    }
  }

  private async loadHubModel(
    config: HubModelConfig,
    position: Vector3,
  ): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync(
      '',
      'assets/3d/buildings/',
      config.fileName,
      this.scene,
    );

    if (this.isDisposed) {
      for (const mesh of result.meshes) {
        if (!mesh.isDisposed()) {
          mesh.dispose(false, true);
        }
      }

      for (const node of result.transformNodes) {
        if (!node.isDisposed()) {
          node.dispose();
        }
      }

      return;
    }

    this.configureModelTextureQuality();

    const root = new TransformNode(
      `hubModel_${config.category.replace(/\W/g, '_')}`,
      this.scene,
    );

    root.rotation.y = config.rotationY;

    const importedNodes: (AbstractMesh | TransformNode)[] = [
      ...result.meshes,
      ...result.transformNodes,
    ];

    for (const node of importedNodes) {
      if (!node.parent) {
        node.parent = root;
      }
    }

    const geometryMeshes = result.meshes.filter(
      (mesh) => mesh.getTotalVertices() > 0,
    );

    if (geometryMeshes.length === 0) {
      root.position.copyFrom(position);
      root.metadata = {
        exploreCategory: config.category,
        isHubModel: true,
      };
      this.hubModelRoots.push(root);
      this.hubModelRootsByCategory.set(config.category, root);
      return;
    }

    root.computeWorldMatrix(true);

    let min = new Vector3(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    );

    let max = new Vector3(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    );

    for (const mesh of geometryMeshes) {
      mesh.computeWorldMatrix(true);

      const bounds = mesh.getBoundingInfo().boundingBox;
      min = Vector3.Minimize(min, bounds.minimumWorld);
      max = Vector3.Maximize(max, bounds.maximumWorld);
    }

    const dimensions = max.subtract(min);
    const largestDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);

    if (largestDimension > 0) {
      root.scaling.setAll(config.targetSize / largestDimension);
    }

    root.computeWorldMatrix(true);

    min.setAll(Number.POSITIVE_INFINITY);
    max.setAll(Number.NEGATIVE_INFINITY);

    for (const mesh of geometryMeshes) {
      mesh.computeWorldMatrix(true);

      const bounds = mesh.getBoundingInfo().boundingBox;
      min = Vector3.Minimize(min, bounds.minimumWorld);
      max = Vector3.Maximize(max, bounds.maximumWorld);

      // Visual meshes do not participate in the collision system.
      // A single simple box collider is created below instead.
      mesh.isPickable = true;
      mesh.checkCollisions = false;
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        exploreCategory: config.category,
        isHubModel: true,
      };
    }

    const center = min.add(max).scale(0.5);

    root.position.set(
      position.x - center.x,
      position.y - min.y,
      position.z - center.z,
    );

    root.metadata = {
      exploreCategory: config.category,
      isHubModel: true,
    };

    this.hubModelRoots.push(root);
    this.hubModelRootsByCategory.set(config.category, root);

    // One cheap collision box instead of collision checks on every GLB mesh.
    const collider = MeshBuilder.CreateBox(
      `hubModelCollider_${config.category.replace(/\W/g, '_')}`,
      {
        width: config.targetSize * 0.72,
        depth: config.targetSize * 0.72,
        height: config.targetSize * 0.65,
      },
      this.scene,
    );

    collider.position.set(
      position.x,
      position.y + (config.targetSize * 0.65) / 2,
      position.z,
    );
    collider.isVisible = false;
    collider.isPickable = false;
    collider.checkCollisions = true;
    this.hubModelCollisionByCategory.set(config.category, collider);
  }

  // =========================================================
  // TEXT LABELS
  // =========================================================

  private createTextLabel(
    name: string,
    text: string,
    width: number,
    height: number,
  ): StandardMaterial {
    const texture = new DynamicTexture(
      `${name}_texture`,
      { width, height },
      this.scene,
      true,
    );

    texture.hasAlpha = true;

    texture.drawText(
      text,
      null,
      height * 0.68,
      'bold 64px Arial',
      '#ffffff',
      'transparent',
      true,
      true,
    );

    texture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
    texture.anisotropicFilteringLevel = 8;

    const material = new StandardMaterial(`${name}_material`, this.scene);

    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(1, 1, 1);
    material.disableLighting = true;
    material.backFaceCulling = false;

    this.categoryTextures.push(texture);
    this.categoryMaterials.push(material);

    return material;
  }

  // =========================================================
  // ENTER CATEGORY WORLD
  // =========================================================

  async enterCategoryWorld(category: Explore3dCategory): Promise<void> {
    if (this.isDisposed || !this.isCreated) return;

    this.clearCategoryWorld();
    this.currentCategory = category;

    this.createCategoryGround();

    switch (category) {
      case 'Foods & Drinks':
        this.createFoodWorld();
        break;

      case 'Hotels':
        await this.createHotelWorld();
        break;

      case 'Shops':
        this.createShopWorld();
        break;

      case 'Services':
        this.createServiceWorld();
        break;

      case 'Boarding House':
        await this.createBoardingWorld();
        break;
    }

    if (this.isDisposed || this.currentCategory !== category) return;

    const offset = this.getCategoryWorldOffset(category);

    for (const mesh of this.categoryWorldMeshes) {
      mesh.position.addInPlace(offset);
    }

    this.updateTimeOfDay();
  }

  // =========================================================
  // CATEGORY GLB LOADER
  // =========================================================

  private async loadCategoryModel(
    category: Explore3dCategory,
    fileName: string,
    targetSize: number,
  ): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync(
      '',
      'assets/3d/buildings/',
      fileName,
      this.scene,
    );

    if (this.isDisposed || this.currentCategory !== category) {
      for (const mesh of result.meshes) {
        if (!mesh.isDisposed()) {
          mesh.dispose(false, true);
        }
      }

      for (const node of result.transformNodes) {
        if (!node.isDisposed()) {
          node.dispose(false, true);
        }
      }

      return;
    }

    this.configureModelTextureQuality();

    const root = new TransformNode(
      `categoryModel_${category.replace(/\W/g, '_')}`,
      this.scene,
    );

    const importedNodes: (AbstractMesh | TransformNode)[] = [
      ...result.meshes,
      ...result.transformNodes,
    ];

    for (const node of importedNodes) {
      if (!node.parent) {
        node.parent = root;
      }
    }

    const geometryMeshes = result.meshes.filter(
      (mesh) => mesh.getTotalVertices() > 0,
    );

    const offset = this.getCategoryWorldOffset(category);

    if (geometryMeshes.length === 0) {
      root.position.copyFrom(offset);
      root.metadata = {
        exploreCategory: category,
        isCategoryModel: true,
      };
      this.categoryModelRoots.push(root);
      return;
    }

    root.computeWorldMatrix(true);

    let min = new Vector3(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    );

    let max = new Vector3(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    );

    for (const mesh of geometryMeshes) {
      mesh.computeWorldMatrix(true);

      const bounds = mesh.getBoundingInfo().boundingBox;
      min = Vector3.Minimize(min, bounds.minimumWorld);
      max = Vector3.Maximize(max, bounds.maximumWorld);
    }

    const dimensions = max.subtract(min);
    const largestDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);

    if (largestDimension > 0) {
      root.scaling.setAll(targetSize / largestDimension);
    }

    root.computeWorldMatrix(true);

    min.setAll(Number.POSITIVE_INFINITY);
    max.setAll(Number.NEGATIVE_INFINITY);

    for (const mesh of geometryMeshes) {
      mesh.computeWorldMatrix(true);

      const bounds = mesh.getBoundingInfo().boundingBox;
      min = Vector3.Minimize(min, bounds.minimumWorld);
      max = Vector3.Maximize(max, bounds.maximumWorld);

      mesh.isPickable = true;
      mesh.checkCollisions = true;
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        exploreCategory: category,
        isCategoryModel: true,
      };
    }

    const center = min.add(max).scale(0.5);

    root.position.set(
      offset.x - center.x,
      offset.y - min.y,
      offset.z - center.z,
    );

    root.metadata = {
      exploreCategory: category,
      isCategoryModel: true,
    };

    this.categoryModelRoots.push(root);
  }

  // =========================================================
  // CATEGORY GROUND
  // =========================================================

  private createCategoryGround(): void {
    const size = this.categoryGroundSize;

    // Single solid base for player collision
    const base = MeshBuilder.CreateBox(
      'categoryGroundBase',
      {
        width: size,
        depth: size,
        height: 0.4,
      },
      this.scene,
    );

    base.position.y = -0.2;
    base.material = this.blackMaterial!;
    this.addCategoryMesh(base, true);

    // Large floor panels
    const panelCount = 5;
    const panelSize = 34;
    const gap = 0.3;
    const totalSize = panelCount * panelSize + (panelCount - 1) * gap;

    const start = -totalSize / 2 + panelSize / 2;

    for (let x = 0; x < panelCount; x++) {
      for (let z = 0; z < panelCount; z++) {
        const panel = MeshBuilder.CreateBox(
          `categoryFloorPanel_${x}_${z}`,
          {
            width: panelSize,
            depth: panelSize,
            height: 0.08,
          },
          this.scene,
        );

        panel.position.set(
          start + x * (panelSize + gap),
          0.02,
          start + z * (panelSize + gap),
        );

        panel.material =
          (x + z) % 2 === 0 ? this.floorMaterial! : this.floorDarkMaterial!;

        this.addCategoryMesh(panel, false);
      }
    }

    // Teal accent grid
    const linePositions = [-72, -36, 0, 36, 72];

    linePositions.forEach((position, index) => {
      const horizontal = MeshBuilder.CreateBox(
        `categoryAccentH_${index}`,
        {
          width: 170,
          depth: 0.12,
          height: 0.025,
        },
        this.scene,
      );

      horizontal.position.set(0, 0.075, position);
      horizontal.material = this.tileLineMaterial!;
      this.addCategoryMesh(horizontal, false);

      const vertical = MeshBuilder.CreateBox(
        `categoryAccentV_${index}`,
        {
          width: 0.12,
          depth: 170,
          height: 0.025,
        },
        this.scene,
      );

      vertical.position.set(position, 0.075, 0);
      vertical.material = this.tileLineMaterial!;
      this.addCategoryMesh(vertical, false);
    });
  }

  // =========================================================
  // FOODS & DRINKS
  // =========================================================

  private createFoodWorld(): void {
    this.createCategoryTitleBlock('FOODS & DRINKS');

    const positions: [number, number][] = [
      [-35, -22],
      [0, -28],
      [35, -22],
      [-20, 22],
      [20, 22],
    ];

    positions.forEach(([x, z], index) => {
      this.createRestaurantBuilding(x, z, index);
    });

    this.createStairsWithRamp(
      'foodCenterStairs',
      0,
      -38,
      7,
      5,
      0.35,
      1.3,
      'north',
    );
  }

  private createRestaurantBuilding(x: number, z: number, index: number): void {
    this.createBuildingBase(`restaurantBase_${index}`, x, z, 15, 12, 1);

    this.createBuildingBody(
      `restaurantBody_${index}`,
      x,
      z,
      14,
      11,
      7,
      this.whiteMaterial!,
    );

    this.createGlassFront(x, z - 5.7, 9, 4.5);

    const roof = MeshBuilder.CreateBox(
      `restaurantRoof_${index}`,
      {
        width: 16,
        depth: 13,
        height: 0.6,
      },
      this.scene,
    );

    roof.position.set(x, 7.6, z);
    roof.material = this.blackMaterial!;
    this.addCategoryMesh(roof);

    this.createBuildingStripe(x, z - 5.85, 11, 0.4);
  }

  // =========================================================
  // HOTELS
  // =========================================================

  private async createHotelWorld(): Promise<void> {
    this.createCategoryTitleBlock('HOTELS');

    try {
      await this.loadCategoryModel('Hotels', 'hotel.glb', 28);
    } catch {
      if (this.isDisposed || this.currentCategory !== 'Hotels') return;

      this.createHotelMain();
      this.createHotelWing(-32, 8, -Math.PI / 2);
      this.createHotelWing(32, 8, Math.PI / 2);
    }

    this.createStairsWithRamp(
      'hotelMainStairs',
      0,
      -35,
      7,
      8,
      0.45,
      1.25,
      'north',
    );
  }

  private createHotelMain(): void {
    const body = MeshBuilder.CreateBox(
      'hotelMain',
      {
        width: 28,
        depth: 14,
        height: 17,
      },
      this.scene,
    );

    body.position.set(0, 8.5, -18);
    body.material = this.whiteMaterial!;
    this.addCategoryMesh(body);

    const glass = MeshBuilder.CreateBox(
      'hotelGlassFront',
      {
        width: 19,
        depth: 0.5,
        height: 13,
      },
      this.scene,
    );

    glass.position.set(0, 7.8, -25.1);
    glass.material = this.glassMaterial!;
    this.addCategoryMesh(glass);

    const roof = MeshBuilder.CreateBox(
      'hotelRoof',
      {
        width: 30,
        depth: 16,
        height: 0.8,
      },
      this.scene,
    );

    roof.position.set(0, 17.3, -18);
    roof.material = this.blackMaterial!;
    this.addCategoryMesh(roof);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const window = MeshBuilder.CreateBox(
          `hotelWindow_${row}_${col}`,
          {
            width: 2.3,
            depth: 0.2,
            height: 1.8,
          },
          this.scene,
        );

        window.position.set(-7.5 + col * 3.8, 4.2 + row * 3, -25.35);

        window.material = this.glassMaterial!;
        this.addCategoryMesh(window, false);
      }
    }
  }

  private createHotelWing(x: number, z: number, rotation: number): void {
    const wing = MeshBuilder.CreateBox(
      `hotelWing_${x}`,
      {
        width: 12,
        depth: 28,
        height: 8,
      },
      this.scene,
    );

    wing.position.set(x, 4, z);
    wing.rotation.y = rotation;
    wing.material = this.concreteMaterial!;
    this.addCategoryMesh(wing);
  }

  // =========================================================
  // SHOPS
  // =========================================================

  private createShopWorld(): void {
    this.createCategoryTitleBlock('SHOPS');

    const positions: [number, number][] = [
      [-40, -20],
      [-20, -20],
      [0, -20],
      [20, -20],
      [40, -20],
      [0, 20],
    ];

    positions.forEach(([x, z], index) => {
      this.createShopBuilding(x, z, index);
    });

    this.createStairsWithRamp(
      'shopCenterStairs',
      0,
      -29,
      6,
      3,
      0.3,
      1.2,
      'north',
    );
  }

  private createShopBuilding(x: number, z: number, index: number): void {
    const body = MeshBuilder.CreateBox(
      `shop_${index}`,
      {
        width: 15,
        depth: 12,
        height: 6.5,
      },
      this.scene,
    );

    body.position.set(x, 3.35, z);
    body.material = this.whiteMaterial!;
    this.addCategoryMesh(body);

    this.createGlassFront(x, z - 6.1, 10, 3.8);

    const roof = MeshBuilder.CreateBox(
      `shopRoof_${index}`,
      {
        width: 16,
        depth: 13,
        height: 0.55,
      },
      this.scene,
    );

    roof.position.set(x, 6.75, z);
    roof.material = this.blackMaterial!;
    this.addCategoryMesh(roof);

    this.createBuildingStripe(x, z - 6.25, 10, 0.35);
  }

  // =========================================================
  // SERVICES WORLD
  // =========================================================

  private createServiceWorld(): void {
    const result = this.servicesWorldBuilder.build(
      this.scene,
      getServicesWorldConfig(),
    );

    result.root.position.copyFrom(this.getCategoryWorldOffset('Services'));
  }

  // =========================================================
  // BOARDING HOUSE
  // =========================================================

  private async createBoardingWorld(): Promise<void> {
    this.createCategoryTitleBlock('BOARDING HOUSE');

    try {
      await this.loadCategoryModel('Boarding House', 'apartment.glb', 22);
    } catch {
      if (this.isDisposed || this.currentCategory !== 'Boarding House') {
        return;
      }

      this.createBoardingMain();
      this.createBoardingBuilding(-30, 18, 0);
      this.createBoardingBuilding(30, 18, 1);
      this.createBoardingBuilding(-30, -24, 2);
      this.createBoardingBuilding(30, -24, 3);
    }

    this.createStairsWithRamp('boardingStairs', 0, 34, 6, 7, 0.4, 1.2, 'south');
  }

  private createBoardingMain(): void {
    const courtyard = MeshBuilder.CreateBox(
      'boardingCourtyard',
      {
        width: 45,
        depth: 35,
        height: 0.35,
      },
      this.scene,
    );

    courtyard.position.y = 0.2;
    courtyard.material = this.concreteMaterial!;
    this.addCategoryMesh(courtyard);

    const center = MeshBuilder.CreateCylinder(
      'boardingCourtyardCenter',
      {
        diameter: 12,
        height: 0.4,
        tessellation: 32,
      },
      this.scene,
    );

    center.position.y = 0.55;
    center.material = this.floorDarkMaterial!;
    this.addCategoryMesh(center);
  }

  private createBoardingBuilding(x: number, z: number, index: number): void {
    const building = MeshBuilder.CreateBox(
      `boardingBuilding_${index}`,
      {
        width: 19,
        depth: 14,
        height: 9,
      },
      this.scene,
    );

    building.position.set(x, 4.6, z);
    building.material = this.whiteMaterial!;
    this.addCategoryMesh(building);

    const roof = MeshBuilder.CreateBox(
      `boardingRoof_${index}`,
      {
        width: 20,
        depth: 15,
        height: 0.6,
      },
      this.scene,
    );

    roof.position.set(x, 9.4, z);
    roof.material = this.blackMaterial!;
    this.addCategoryMesh(roof);

    for (let i = 0; i < 3; i++) {
      const window = MeshBuilder.CreateBox(
        `boardingWindow_${index}_${i}`,
        {
          width: 2.4,
          depth: 0.2,
          height: 2,
        },
        this.scene,
      );

      window.position.set(x - 5 + i * 5, 5, z - 7.15);

      window.material = this.glassMaterial!;
      this.addCategoryMesh(window, false);
    }
  }

  // =========================================================
  // COMMON BUILDINGS
  // =========================================================

  private createBuildingBase(
    name: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(
      name,
      {
        width,
        depth,
        height,
      },
      this.scene,
    );

    mesh.position.set(x, height / 2, z);
    mesh.material = this.concreteDarkMaterial!;
    this.addCategoryMesh(mesh);

    return mesh;
  }

  private createBuildingBody(
    name: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    material: StandardMaterial,
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(
      name,
      {
        width,
        depth,
        height,
      },
      this.scene,
    );

    mesh.position.set(x, height / 2 + 0.6, z);
    mesh.material = material;
    this.addCategoryMesh(mesh);

    return mesh;
  }

  private createGlassFront(
    x: number,
    z: number,
    width: number,
    height: number,
  ): void {
    const glass = MeshBuilder.CreateBox(
      `glassFront_${x}_${z}`,
      {
        width,
        depth: 0.18,
        height,
      },
      this.scene,
    );

    glass.position.set(x, height / 2 + 0.6, z);
    glass.material = this.glassMaterial!;
    this.addCategoryMesh(glass);

    const frame = MeshBuilder.CreateBox(
      `glassFrame_${x}_${z}`,
      {
        width: width + 0.35,
        depth: 0.25,
        height: 0.25,
      },
      this.scene,
    );

    frame.position.set(x, height + 0.72, z);
    frame.material = this.blackMaterial!;
    this.addCategoryMesh(frame, false);
  }

  private createBuildingStripe(
    x: number,
    z: number,
    width: number,
    height: number,
  ): void {
    const stripe = MeshBuilder.CreateBox(
      `buildingStripe_${x}_${z}`,
      {
        width,
        depth: 0.22,
        height,
      },
      this.scene,
    );

    stripe.position.set(x, 4.5, z);
    stripe.material = this.accentMaterial!;
    this.addCategoryMesh(stripe, false);
  }

  // =========================================================
  // STAIRS AND RAMP
  // =========================================================

  private createStairsWithRamp(
    name: string,
    x: number,
    z: number,
    width: number,
    steps: number,
    stepHeight: number,
    stepDepth: number,
    direction: 'north' | 'south' | 'east' | 'west' = 'north',
  ): void {
    const totalHeight = steps * stepHeight;
    const totalDepth = steps * stepDepth;
    const isSideways = direction === 'east' || direction === 'west';

    for (let i = 0; i < steps; i++) {
      const step = MeshBuilder.CreateBox(
        `${name}_step_${i}`,
        {
          width: isSideways ? stepDepth : width,
          depth: isSideways ? width : stepDepth,
          height: (i + 1) * stepHeight,
        },
        this.scene,
      );

      let stepX = x;
      let stepZ = z;

      if (direction === 'north') {
        stepZ = z + i * stepDepth;
      } else if (direction === 'south') {
        stepZ = z - i * stepDepth;
      } else if (direction === 'east') {
        stepX = x + i * stepDepth;
      } else {
        stepX = x - i * stepDepth;
      }

      step.position.set(stepX, ((i + 1) * stepHeight) / 2, stepZ);

      step.material = this.concreteMaterial!;
      this.addCategoryMesh(step);
    }

    const ramp = MeshBuilder.CreateBox(
      `${name}_ramp`,
      {
        width: isSideways ? totalDepth : width * 0.72,
        depth: isSideways ? width * 0.72 : totalDepth,
        height: 0.18,
      },
      this.scene,
    );

    let rampX = x;
    let rampZ = z;

    if (direction === 'north') {
      rampZ = z + totalDepth / 2;
    } else if (direction === 'south') {
      rampZ = z - totalDepth / 2;
    } else if (direction === 'east') {
      rampX = x + totalDepth / 2;
    } else {
      rampX = x - totalDepth / 2;
    }

    ramp.position.set(rampX, totalHeight / 2, rampZ);

    const angle = Math.atan2(totalHeight, totalDepth);

    if (direction === 'north') {
      ramp.rotation.x = angle;
    } else if (direction === 'south') {
      ramp.rotation.x = -angle;
    } else if (direction === 'east') {
      ramp.rotation.z = -angle;
    } else {
      ramp.rotation.z = angle;
    }

    // Keep the ramp collision-enabled but visually hidden.
    ramp.isVisible = false;
    ramp.visibility = 0;
    ramp.isPickable = false;
    ramp.checkCollisions = true;

    this.categoryWorldMeshes.push(ramp);
  }

  // =========================================================
  // CATEGORY TITLE
  // =========================================================

  private createCategoryTitleBlock(title: string): void {
    const platform = MeshBuilder.CreateCylinder(
      'categoryTitlePlatform',
      {
        diameter: 12,
        height: 0.5,
        tessellation: 32,
      },
      this.scene,
    );

    platform.position.set(0, 0.35, 48);
    platform.material = this.blackMaterial!;
    this.addCategoryMesh(platform);

    const bar = MeshBuilder.CreateBox(
      'categoryTitleBar',
      {
        width: 9,
        depth: 0.35,
        height: 3.5,
      },
      this.scene,
    );

    bar.position.set(0, 2.1, 48);
    bar.material = this.whiteMaterial!;
    this.addCategoryMesh(bar, false);

    const accent = MeshBuilder.CreateBox(
      'categoryTitleAccent',
      {
        width: 9.3,
        depth: 0.45,
        height: 0.15,
      },
      this.scene,
    );

    accent.position.set(0, 3.85, 47.75);
    accent.material = this.accentMaterial!;
    this.addCategoryMesh(accent, false);

    const textMaterial = this.createTextLabel(
      `categoryTitle_${title.replace(/\W/g, '_')}`,
      title,
      1024,
      256,
    );

    const textPlane = MeshBuilder.CreatePlane(
      'categoryTitleText',
      {
        width: 10,
        height: 2.5,
      },
      this.scene,
    );

    textPlane.position.set(0, 5.1, 47.5);
    textPlane.material = textMaterial;
    textPlane.isPickable = false;
    textPlane.checkCollisions = false;

    this.categoryWorldMeshes.push(textPlane);
  }

  // =========================================================
  // BACK TO HUB
  // =========================================================

  async backToCategoryHub(): Promise<void> {
    this.clearCategoryWorld();
    this.currentCategory = null;
    this.updateTimeOfDay();
  }

  // =========================================================
  // REAL-TIME DAY / NIGHT
  // =========================================================

  /**
   * Kept for compatibility with existing callers.
   *
   * Day/night is NOT manually controlled anymore.
   * The real Philippine time is always the source of truth.
   */
  setNightMode(_isNight: boolean): void {
    this.updateTimeOfDay();
  }

  /**
   * Kept for compatibility with existing callers.
   *
   * The real Philippine time remains the source of truth.
   */
  toggleNightMode(): void {
    this.updateTimeOfDay();
  }

  private getPhilippineTimeDecimal(): number {
    const parts = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);

    const minute = Number(
      parts.find((part) => part.type === 'minute')?.value ?? 0,
    );

    const second = Number(
      parts.find((part) => part.type === 'second')?.value ?? 0,
    );

    return hour + minute / 60 + second / 3600;
  }

  private updateTimeOfDay(): void {
    if (!this.scene || this.isDisposed) {
      return;
    }

    const time = this.getPhilippineTimeDecimal();

    // Philippine local schedule.
    const sunrise = 6;
    const sunset = 18;

    const automaticNight = time < sunrise || time >= sunset;

    this.isNight = automaticNight;

    if (automaticNight) {
      this.applyNightLighting(time, sunrise, sunset);
    } else {
      this.applyDayLighting(time, sunrise, sunset);
    }
  }
  private applyDayLighting(
    time: number,
    sunrise: number,
    sunset: number,
  ): void {
    const dayProgress = Math.max(
      0,
      Math.min(1, (time - sunrise) / (sunset - sunrise)),
    );

    /*
     * 06:00 = sunrise
     * 12:00 = strongest daylight
     * 18:00 = sunset
     */

    const sunHeight = Math.sin(Math.PI * dayProgress);

    /*
     * Make daytime clearly visible.
     *
     * 06:00 -> ~0.45
     * 09:00 -> ~0.85
     * 12:00 -> 1.00
     * 15:00 -> ~0.85
     * 18:00 -> ~0.45
     */
    const sunStrength = 0.45 + sunHeight * 0.55;

    // =========================================================
    // SKY / BACKGROUND
    // =========================================================

    /*
     * Much brighter than the previous values.
     *
     * Previous:
     * ~0.05 RGB -> visually almost night.
     *
     * Daytime:
     * blue/gray sky with enough brightness to read as daytime.
     */

    const skyR = 0.2 + sunStrength * 0.22;
    const skyG = 0.32 + sunStrength * 0.28;
    const skyB = 0.48 + sunStrength * 0.3;

    this.scene.clearColor = new Color4(skyR, skyG, skyB, 1);

    this.scene.fogColor = new Color3(skyR, skyG, skyB);

    // Keep fog lighter during daytime.
    this.scene.fogDensity = 0.0014;

    // =========================================================
    // HEMISPHERIC LIGHT
    // =========================================================

    if (this.hemiLight) {
      /*
       * Strong global daylight.
       *
       * 06:00 -> around 0.95
       * noon -> around 1.35
       */
      this.hemiLight.intensity = 0.92 + sunStrength * 0.43;

      this.hemiLight.diffuse = new Color3(
        0.92 + sunStrength * 0.08,
        0.94 + sunStrength * 0.06,
        1.0,
      );

      /*
       * Ground receives neutral daylight instead
       * of almost-black night lighting.
       */
      this.hemiLight.groundColor = new Color3(
        0.18 + sunStrength * 0.1,
        0.2 + sunStrength * 0.1,
        0.18 + sunStrength * 0.09,
      );
    }

    // =========================================================
    // SUN POSITION
    // =========================================================

    const angle = dayProgress * Math.PI;

    const sunPosition = new Vector3(
      Math.cos(angle) * 90,
      12 + Math.sin(angle) * 92,
      25,
    );

    // =========================================================
    // DIRECTIONAL SUN LIGHT
    // =========================================================

    if (this.directionalLight) {
      /*
       * Strong actual sunlight.
       *
       * Previous:
       * 0.42 -> 0.74
       *
       * New:
       * ~0.70 -> ~1.15
       */
      this.directionalLight.intensity = 0.7 + sunStrength * 0.45;

      this.directionalLight.position.copyFrom(sunPosition);

      this.directionalLight.direction = sunPosition.scale(-1).normalize();
    }

    // =========================================================
    // VISIBLE SUN
    // =========================================================

    if (this.sunMesh) {
      this.sunMesh.position.copyFrom(sunPosition);

      this.sunMesh.isVisible = true;
    }

    // =========================================================
    // HIDE MOON
    // =========================================================

    if (this.moonMesh) {
      this.moonMesh.isVisible = false;
    }
  }

  private applyNightLighting(
    time: number,
    sunrise: number,
    sunset: number,
  ): void {
    // =========================================================
    // NIGHT SKY
    // =========================================================

    this.scene.clearColor = new Color4(0.012, 0.016, 0.028, 1);

    this.scene.fogColor = new Color3(0.012, 0.016, 0.028);

    this.scene.fogDensity = 0.0032;

    // =========================================================
    // NIGHT HEMISPHERIC LIGHT
    // =========================================================

    if (this.hemiLight) {
      this.hemiLight.intensity = 0.24;

      this.hemiLight.diffuse = new Color3(0.32, 0.38, 0.52);

      this.hemiLight.groundColor = new Color3(0.018, 0.022, 0.035);
    }

    const nightDuration = 24 - sunset + sunrise;

    let nightElapsed: number;

    if (time >= sunset) {
      nightElapsed = time - sunset;
    } else {
      nightElapsed = time + (24 - sunset);
    }

    const nightProgress = Math.max(
      0,
      Math.min(1, nightElapsed / nightDuration),
    );

    const moonAngle = nightProgress * Math.PI;

    const moonPosition = new Vector3(
      Math.cos(moonAngle) * 80,
      16 + Math.sin(moonAngle) * 82,
      -25,
    );

    // =========================================================
    // MOON LIGHT
    // =========================================================

    if (this.directionalLight) {
      this.directionalLight.intensity = 0.16;

      this.directionalLight.position.copyFrom(moonPosition);

      this.directionalLight.direction = moonPosition.scale(-1).normalize();
    }

    // =========================================================
    // SUN
    // =========================================================

    if (this.sunMesh) {
      this.sunMesh.isVisible = false;
    }

    // =========================================================
    // MOON
    // =========================================================

    if (this.moonMesh) {
      this.moonMesh.position.copyFrom(moonPosition);

      this.moonMesh.isVisible = true;
    }
  }
  private startTimeOfDayClock(): void {
    this.stopTimeOfDayClock();

    // Apply immediately.
    this.updateTimeOfDay();

    /*
     * Refresh every minute.
     *
     * Since the actual clock is queried every time,
     * the server/browser timezone does not control
     * the world. Asia/Manila does.
     */
    this.timeOfDayTimer = setInterval(() => {
      if (this.isDisposed || !this.scene) {
        return;
      }

      this.updateTimeOfDay();
    }, 60_000);
  }

  private stopTimeOfDayClock(): void {
    if (this.timeOfDayTimer) {
      clearInterval(this.timeOfDayTimer);

      this.timeOfDayTimer = undefined;
    }
  }

  // =========================================================
  // CLEAR CATEGORY WORLD
  // =========================================================

  private clearCategoryWorld(): void {
    this.servicesWorldBuilder.dispose();

    const meshes = this.categoryWorldMeshes;
    this.categoryWorldMeshes = [];

    for (const mesh of meshes) {
      if (!mesh.isDisposed()) {
        mesh.dispose(false, false);
      }
    }

    const roots = this.categoryModelRoots;
    this.categoryModelRoots = [];

    for (const root of roots) {
      if (!root.isDisposed()) {
        root.dispose(false, true);
      }
    }

    for (const material of this.categoryMaterials) {
      material.dispose(false, false);
    }

    this.categoryMaterials = [];

    for (const texture of this.categoryTextures) {
      texture.dispose();
    }

    this.categoryTextures = [];
  }

  // =========================================================
  // DISPOSE
  // =========================================================

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;

    if (this.scene && this.hubModelStreamingObserver) {
      this.scene.onBeforeRenderObservable.remove(
        this.hubModelStreamingObserver,
      );
      this.hubModelStreamingObserver = undefined;
    }

    this.hubModelStreamingFrame = 0;
    this.hubModelStates.clear();
    this.hubModelRootsByCategory.clear();

    for (const collider of this.hubModelCollisionByCategory.values()) {
      if (!collider.isDisposed()) {
        collider.dispose(false, false);
      }
    }
    this.hubModelCollisionByCategory.clear();

    this.clearCategoryWorld();

    const hubRoots = this.hubModelRoots;
    this.hubModelRoots = [];

    for (const root of hubRoots) {
      if (!root.isDisposed()) {
        root.dispose(false, true);
      }
    }

    const meshes = this.worldMeshes;
    this.worldMeshes = [];

    for (const mesh of meshes) {
      if (!mesh.isDisposed()) {
        mesh.dispose(false, false);
      }
    }

    this.stopTimeOfDayClock();

    this.hemiLight?.dispose();
    this.directionalLight?.dispose();

    this.sunMesh?.dispose(false, true);
    this.moonMesh?.dispose(false, true);

    this.sunMaterial?.dispose();
    this.moonMaterial?.dispose();

    this.hemiLight = undefined;
    this.directionalLight = undefined;
    this.sunMesh = undefined;
    this.moonMesh = undefined;
    this.sunMaterial = undefined;
    this.moonMaterial = undefined;

    this.floorMaterial?.dispose();
    this.floorDarkMaterial?.dispose();
    this.tileLineMaterial?.dispose();
    this.concreteMaterial?.dispose();
    this.concreteDarkMaterial?.dispose();
    this.whiteMaterial?.dispose();
    this.blackMaterial?.dispose();
    this.glassMaterial?.dispose();
    this.metalMaterial?.dispose();
    this.accentMaterial?.dispose();
    this.accentSoftMaterial?.dispose();
    this.businessBillboardService.dispose();

    this.floorMaterial = undefined;
    this.floorDarkMaterial = undefined;
    this.tileLineMaterial = undefined;
    this.concreteMaterial = undefined;
    this.concreteDarkMaterial = undefined;
    this.whiteMaterial = undefined;
    this.blackMaterial = undefined;
    this.glassMaterial = undefined;
    this.metalMaterial = undefined;
    this.accentMaterial = undefined;
    this.accentSoftMaterial = undefined;

    this.currentCategory = null;
    this.isCreated = false;
    this.isCreating = false;
  }

  // =========================================================
  // PORTAL DISTANCE CHECK
  // =========================================================

  isNearReturnPortal(
    portal: AbstractMesh,
    playerPosition: Vector3,
    maxDistance = 8,
  ): boolean {
    const portalPosition = portal.getAbsolutePosition();

    return Vector3.Distance(playerPosition, portalPosition) <= maxDistance;
  }

  // =========================================================
  // LOADING STATE
  // =========================================================

  private readonly loadingState = signal({
    active: true,
    text: 'Loading SJ Tuklas...',
    progress: 0,
  });

  readonly worldLoading = this.loadingState.asReadonly();

  private setLoading(active: boolean, text = '', progress = 0): void {
    this.loadingState.set({
      active,
      text,
      progress: Math.max(0, Math.min(100, Math.round(progress))),
    });
  }

  private waitForFrame(): Promise<void> {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  }
}
