import { Injectable } from '@angular/core';

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
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';

import { HubEnvironmentBuilder } from '../worlds/hub/hub-environment.builder';

import { Explore3dCategory } from './explore3d-category.service';
import { CategoryWorldBuilder } from '../worlds/categories/category-world.builder';
import { getServicesWorldConfig } from '../worlds/categories/services/services-world.config';
import type { Explore3dBuildingSelection } from '../models/explore3d-world.types';

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

  private categoryTextures: DynamicTexture[] = [];
  private categoryMaterials: StandardMaterial[] = [];

  private hemiLight?: HemisphericLight;
  private directionalLight?: DirectionalLight;

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
      rotationY: -Math.PI / 2,
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
      fileName: 'office.glb',
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

  private readonly hubSpawnPoint = new Vector3(0, 1, 0);

  // =========================================================
  // CREATE
  // =========================================================

  async create(scene: Scene): Promise<void> {
    if (this.isCreated || this.isCreating) return;

    this.isCreating = true;
    this.isDisposed = false;
    this.scene = scene;

    try {
      this.scene.collisionsEnabled = true;

      this.configureScene();
      this.createMaterials();
      this.createLighting();
      this.createCategoryHub();

      this.hubEnvironmentBuilder.build(this.scene);

      await this.createHubModelPreviews();

      if (this.isDisposed) return;

      this.updateTimeOfDay();
      this.isCreated = true;
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

  getHubSpawnPoint(): Vector3 {
    return this.hubSpawnPoint.clone();
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
    const fallbackNames: Record<Explore3dCategory, string> = {
      'Foods & Drinks': 'hubFoodPreview',
      Hotels: 'hubHotelFallback',
      Shops: 'hubShopPreview',
      Services: 'hubServicesPreview',
      'Boarding House': 'hubBoardingFallback',
    };

    for (const config of this.hubModels) {
      if (this.isDisposed) return;

      try {
        await this.loadHubModel(config, new Vector3(config.x, 0, config.z));

        const fallbackName = fallbackNames[config.category];

        for (const mesh of this.worldMeshes) {
          if (mesh.name.startsWith(fallbackName)) {
            mesh.setEnabled(false);
          }
        }
      } catch {
        // Keep procedural fallback visible if the GLB cannot load.
      }
    }
  }

  // =========================================================
  // MODEL TEXTURE QUALITY
  // =========================================================
  private configureModelTextureQuality(): void {
    for (const texture of this.scene.textures) {
      texture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
      texture.anisotropicFilteringLevel = 8;
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

      mesh.isPickable = true;
      mesh.checkCollisions = true;
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
  // NIGHT MODE
  // =========================================================

  setNightMode(isNight: boolean): void {
    this.isNight = isNight;
    this.updateTimeOfDay();
  }

  toggleNightMode(): void {
    this.isNight = !this.isNight;
    this.updateTimeOfDay();
  }

  private updateTimeOfDay(): void {
    if (!this.hemiLight || !this.scene) return;

    if (this.isNight) {
      this.scene.clearColor = new Color4(0.018, 0.022, 0.028, 1);
      this.scene.fogColor = new Color3(0.018, 0.022, 0.028);
      this.hemiLight.intensity = 0.38;

      if (this.directionalLight) {
        this.directionalLight.intensity = 0.25;
      }
    } else {
      this.scene.clearColor = new Color4(0.035, 0.04, 0.05, 1);
      this.scene.fogColor = new Color3(0.035, 0.04, 0.05);
      this.hemiLight.intensity = 0.72;

      if (this.directionalLight) {
        this.directionalLight.intensity = 0.65;
      }
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

    this.hemiLight?.dispose();
    this.directionalLight?.dispose();

    this.hemiLight = undefined;
    this.directionalLight = undefined;

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
}
