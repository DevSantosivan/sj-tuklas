import { Injectable } from '@angular/core';

import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

export type Explore3dCategory =
  | 'Foods & Drinks'
  | 'Hotels'
  | 'Shops'
  | 'Services'
  | 'Boarding House';

interface CategoryDefinition {
  id: Explore3dCategory;
  title: string;
  subtitle: string;
  color: Color3;
  position: Vector3;
  buildingWidth: number;
  buildingDepth: number;
  buildingHeight: number;
}

@Injectable()
export class Explore3dCategoryService {
  private readonly categories: CategoryDefinition[] = [
    {
      id: 'Foods & Drinks',
      title: 'FOODS & DRINKS',
      subtitle: 'Restaurants • Cafes • Food',
      color: new Color3(0.88, 0.38, 0.16),
      position: new Vector3(-28, 0, -20),
      buildingWidth: 10,
      buildingDepth: 8,
      buildingHeight: 5,
    },
    {
      id: 'Hotels',
      title: 'HOTELS',
      subtitle: 'Hotels • Stays • Lodging',
      color: new Color3(0.2, 0.45, 0.85),
      position: new Vector3(0, 0, -30),
      buildingWidth: 11,
      buildingDepth: 9,
      buildingHeight: 7,
    },
    {
      id: 'Shops',
      title: 'SHOPS',
      subtitle: 'Stores • Retail • Shopping',
      color: new Color3(0.65, 0.3, 0.8),
      position: new Vector3(28, 0, -20),
      buildingWidth: 10,
      buildingDepth: 8,
      buildingHeight: 5,
    },
    {
      id: 'Services',
      title: 'SERVICES',
      subtitle: 'Local services',
      color: new Color3(0.15, 0.6, 0.55),
      position: new Vector3(-28, 0, 18),
      buildingWidth: 10,
      buildingDepth: 8,
      buildingHeight: 5,
    },
    {
      id: 'Boarding House',
      title: 'BOARDING HOUSE',
      subtitle: 'Rooms • Boarding • Rentals',
      color: new Color3(0.75, 0.55, 0.2),
      position: new Vector3(28, 0, 18),
      buildingWidth: 11,
      buildingDepth: 9,
      buildingHeight: 6,
    },
  ];

  private categoryRoots: TransformNode[] = [];
  private categoryMeshes: Mesh[] = [];

  private selectionCallback: ((category: Explore3dCategory) => void) | null =
    null;

  // =========================================================
  // CREATE
  // =========================================================

  create(
    scene: Scene,
    onCategorySelected: (category: Explore3dCategory) => void,
  ): void {
    this.dispose();

    scene.collisionsEnabled = true;
    this.selectionCallback = onCategorySelected;

    for (const category of this.categories) {
      this.createCategory(scene, category);
    }

    this.createHubTitle(scene);
    this.createHubDecoration(scene);
  }

  // =========================================================
  // CREATE CATEGORY BUILDING
  // =========================================================

  private createCategory(scene: Scene, category: CategoryDefinition): void {
    const root = new TransformNode(
      `category-${this.getSafeName(category.id)}`,
      scene,
    );

    root.position.copyFrom(category.position);
    root.metadata = {
      exploreCategory: category.id,
      isExploreCategoryRoot: true,
    };

    const building = this.createBuilding(scene, category);
    building.parent = root;

    const roof = this.createRoof(scene, category);
    roof.parent = root;

    const entrance = this.createEntrance(scene, category);
    entrance.parent = root;

    const stairs = this.createStairs(scene, category);
    stairs.parent = root;

    const sign = this.createCategorySign(scene, category);
    sign.parent = root;

    const base = this.createCategoryBase(scene, category);
    base.parent = root;

    // Apply category metadata to every visible mesh.
    // The component can use this metadata after scene picking.
    const childMeshes = root.getChildMeshes(false);

    for (const mesh of childMeshes) {
      mesh.isPickable = true;
      mesh.metadata = {
        ...(mesh.metadata ?? {}),
        exploreCategory: category.id,
        isExploreCategoryBuilding: true,
      };
    }

    this.categoryRoots.push(root);
  }

  // =========================================================
  // BUILDING
  // =========================================================

  private createBuilding(
    scene: Scene,
    category: CategoryDefinition,
  ): TransformNode {
    const buildingRoot = new TransformNode(
      `${this.getSafeName(category.id)}-building-root`,
      scene,
    );

    const wallThickness = 0.35;
    const entranceWidth = 2.4;
    const frontWallWidth = category.buildingWidth;
    const sideWallDepth = category.buildingDepth;
    const doorHeight = 2.8;

    const material = new StandardMaterial(
      `${this.getSafeName(category.id)}-building-material`,
      scene,
    );

    material.diffuseColor = new Color3(0.76, 0.77, 0.74);
    material.specularColor = new Color3(0.05, 0.05, 0.05);

    // LEFT WALL
    const leftWall = MeshBuilder.CreateBox(
      `${category.id}-left-wall`,
      {
        width: wallThickness,
        depth: sideWallDepth,
        height: category.buildingHeight,
      },
      scene,
    );

    leftWall.position.set(
      -(category.buildingWidth / 2) + wallThickness / 2,
      category.buildingHeight / 2,
      0,
    );

    this.configureWall(leftWall, material);
    leftWall.parent = buildingRoot;

    // RIGHT WALL
    const rightWall = MeshBuilder.CreateBox(
      `${category.id}-right-wall`,
      {
        width: wallThickness,
        depth: sideWallDepth,
        height: category.buildingHeight,
      },
      scene,
    );

    rightWall.position.set(
      category.buildingWidth / 2 - wallThickness / 2,
      category.buildingHeight / 2,
      0,
    );

    this.configureWall(rightWall, material);
    rightWall.parent = buildingRoot;

    // BACK WALL
    const backWall = MeshBuilder.CreateBox(
      `${category.id}-back-wall`,
      {
        width: category.buildingWidth,
        depth: wallThickness,
        height: category.buildingHeight,
      },
      scene,
    );

    backWall.position.set(
      0,
      category.buildingHeight / 2,
      -(category.buildingDepth / 2) + wallThickness / 2,
    );

    this.configureWall(backWall, material);
    backWall.parent = buildingRoot;

    // FRONT WALL LEFT OF DOOR
    const frontSideWidth = (frontWallWidth - entranceWidth) / 2;

    const frontLeft = MeshBuilder.CreateBox(
      `${category.id}-front-left`,
      {
        width: frontSideWidth,
        depth: wallThickness,
        height: category.buildingHeight,
      },
      scene,
    );

    frontLeft.position.set(
      -(entranceWidth / 2) - frontSideWidth / 2,
      category.buildingHeight / 2,
      category.buildingDepth / 2 - wallThickness / 2,
    );

    this.configureWall(frontLeft, material);
    frontLeft.parent = buildingRoot;

    // FRONT WALL RIGHT OF DOOR
    const frontRight = MeshBuilder.CreateBox(
      `${category.id}-front-right`,
      {
        width: frontSideWidth,
        depth: wallThickness,
        height: category.buildingHeight,
      },
      scene,
    );

    frontRight.position.set(
      entranceWidth / 2 + frontSideWidth / 2,
      category.buildingHeight / 2,
      category.buildingDepth / 2 - wallThickness / 2,
    );

    this.configureWall(frontRight, material);
    frontRight.parent = buildingRoot;

    // FRONT HEADER ABOVE DOOR
    const frontHeaderHeight = Math.max(
      0.5,
      category.buildingHeight - doorHeight,
    );

    const frontHeader = MeshBuilder.CreateBox(
      `${category.id}-front-header`,
      {
        width: entranceWidth,
        depth: wallThickness,
        height: frontHeaderHeight,
      },
      scene,
    );

    frontHeader.position.set(
      0,
      doorHeight + frontHeaderHeight / 2,
      category.buildingDepth / 2 - wallThickness / 2,
    );

    this.configureWall(frontHeader, material);
    frontHeader.parent = buildingRoot;

    return buildingRoot;
  }

  // =========================================================
  // CONFIGURE WALL COLLISION
  // =========================================================

  private configureWall(mesh: Mesh, material: StandardMaterial): void {
    mesh.material = material;
    mesh.checkCollisions = true;
    mesh.isPickable = true;
    mesh.isVisible = true;
  }

  // =========================================================
  // ROOF
  // =========================================================

  private createRoof(scene: Scene, category: CategoryDefinition): Mesh {
    const roof = MeshBuilder.CreateCylinder(
      `${category.id}-roof`,
      {
        diameter:
          Math.max(category.buildingWidth, category.buildingDepth) * 1.05,
        height: 0.7,
        tessellation: 4,
      },
      scene,
    );

    roof.position.y = category.buildingHeight + 0.35;
    roof.rotation.y = Math.PI / 4;

    const material = new StandardMaterial(
      `${this.getSafeName(category.id)}-roof-material`,
      scene,
    );

    material.diffuseColor = category.color.scale(0.65);
    material.specularColor = new Color3(0.04, 0.04, 0.04);

    roof.material = material;
    roof.checkCollisions = false;
    roof.isPickable = true;

    return roof;
  }

  // =========================================================
  // ENTRANCE DETAIL
  // =========================================================

  private createEntrance(scene: Scene, category: CategoryDefinition): Mesh {
    const entrance = MeshBuilder.CreateBox(
      `${category.id}-entrance`,
      {
        width: 2.2,
        depth: 0.35,
        height: 2.8,
      },
      scene,
    );

    entrance.position.set(0, 1.4, category.buildingDepth / 2 + 0.2);

    const material = new StandardMaterial(
      `${this.getSafeName(category.id)}-entrance-material`,
      scene,
    );

    material.diffuseColor = category.color;
    material.specularColor = new Color3(0.03, 0.03, 0.03);

    entrance.material = material;
    entrance.checkCollisions = false;
    entrance.isPickable = true;

    return entrance;
  }

  // =========================================================
  // STAIRS
  // =========================================================

  private createStairs(
    scene: Scene,
    category: CategoryDefinition,
  ): TransformNode {
    const stairsRoot = new TransformNode(
      `${this.getSafeName(category.id)}-stairs-root`,
      scene,
    );

    const stepCount = 6;
    const stepHeight = 0.25;
    const stepDepth = 0.65;
    const stepWidth = 3.4;
    const frontZ = category.buildingDepth / 2 + 2.5;

    const material = new StandardMaterial(
      `${this.getSafeName(category.id)}-stairs-material`,
      scene,
    );

    material.diffuseColor = category.color.scale(0.85);
    material.specularColor = new Color3(0.04, 0.04, 0.04);

    for (let index = 0; index < stepCount; index++) {
      const height = stepHeight * (index + 1);

      const step = MeshBuilder.CreateBox(
        `${category.id}-step-${index}`,
        {
          width: stepWidth,
          depth: stepDepth,
          height,
        },
        scene,
      );

      step.position.set(0, height / 2, frontZ - index * stepDepth);

      step.material = material;
      step.checkCollisions = true;
      step.isPickable = true;
      step.parent = stairsRoot;
    }

    return stairsRoot;
  }

  // =========================================================
  // BASE
  // =========================================================

  private createCategoryBase(scene: Scene, category: CategoryDefinition): Mesh {
    const base = MeshBuilder.CreateCylinder(
      `${category.id}-base`,
      {
        diameter: Math.max(category.buildingWidth, category.buildingDepth) + 5,
        height: 0.18,
        tessellation: 32,
      },
      scene,
    );

    base.position.y = 0.09;

    const material = new StandardMaterial(
      `${this.getSafeName(category.id)}-base-material`,
      scene,
    );

    material.diffuseColor = category.color.scale(0.75);
    material.specularColor = new Color3(0.02, 0.02, 0.02);

    base.material = material;
    base.checkCollisions = true;
    base.isPickable = true;

    return base;
  }

  // =========================================================
  // CATEGORY SIGN
  // =========================================================

  private createCategorySign(scene: Scene, category: CategoryDefinition): Mesh {
    const sign = MeshBuilder.CreatePlane(
      `${category.id}-sign`,
      {
        width: 9,
        height: 2.5,
      },
      scene,
    );

    sign.position.set(0, category.buildingHeight + 4, 0);

    sign.rotation.y = Math.PI;

    const texture = new DynamicTexture(
      `${this.getSafeName(category.id)}-sign-texture`,
      {
        width: 1024,
        height: 320,
      },
      scene,
      true,
    );

    const context = texture.getContext() as CanvasRenderingContext2D;

    context.fillStyle = '#101820';
    context.fillRect(0, 0, 1024, 320);

    context.fillStyle = category.color.toHexString();
    context.fillRect(0, 0, 22, 320);

    context.fillStyle = '#ffffff';
    context.font = 'bold 64px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(category.title, 520, 105);

    context.fillStyle = '#cbd5e1';
    context.font = '32px Arial';
    context.fillText(category.subtitle, 520, 190);

    texture.update();

    const material = new StandardMaterial(
      `${this.getSafeName(category.id)}-sign-material`,
      scene,
    );

    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.12, 0.12, 0.12);

    sign.material = material;
    sign.checkCollisions = false;
    sign.isPickable = true;

    return sign;
  }

  // =========================================================
  // GET SELECTED CATEGORY FROM PICKED MESH
  // =========================================================

  getCategoryFromMesh(mesh: Mesh | null): Explore3dCategory | null {
    let current: any = mesh;

    while (current) {
      const category = current.metadata?.exploreCategory;

      if (category && this.categories.some((item) => item.id === category)) {
        return category as Explore3dCategory;
      }

      current = current.parent;
    }

    return null;
  }

  // =========================================================
  // SELECT CATEGORY
  // =========================================================

  selectCategory(category: Explore3dCategory): void {
    this.selectionCallback?.(category);
  }

  // =========================================================
  // HUB TITLE
  // =========================================================

  private createHubTitle(scene: Scene): void {
    const title = MeshBuilder.CreatePlane(
      'explore3dHubTitle',
      {
        width: 16,
        height: 3,
      },
      scene,
    );

    title.position = new Vector3(0, 10, 8);
    title.rotation.y = Math.PI;

    const texture = new DynamicTexture(
      'explore3dHubTitleTexture',
      {
        width: 1024,
        height: 256,
      },
      scene,
      true,
    );

    const context = texture.getContext() as CanvasRenderingContext2D;

    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, 1024, 256);

    context.fillStyle = '#ffffff';
    context.font = 'bold 74px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('EXPLORE SAN JOSE', 512, 105);

    context.fillStyle = '#8de4e8';
    context.font = '36px Arial';
    context.fillText('Choose a category to discover', 512, 170);

    texture.update();

    const material = new StandardMaterial('explore3dHubTitleMaterial', scene);

    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.08, 0.08, 0.08);

    title.material = material;
    title.checkCollisions = false;
    title.isPickable = false;

    this.categoryMeshes.push(title);
  }

  // =========================================================
  // HUB DECORATION
  // =========================================================

  private createHubDecoration(scene: Scene): void {
    const center = MeshBuilder.CreateCylinder(
      'explore3dHubCenter',
      {
        diameter: 8,
        height: 0.3,
        tessellation: 32,
      },
      scene,
    );

    center.position = new Vector3(0, 0.15, 0);

    const material = new StandardMaterial('explore3dHubCenterMaterial', scene);

    material.diffuseColor = new Color3(0.05, 0.45, 0.55);

    center.material = material;
    center.checkCollisions = true;
    center.isPickable = true;

    this.categoryMeshes.push(center);
  }

  // =========================================================
  // GET CATEGORIES
  // =========================================================

  getCategories(): Explore3dCategory[] {
    return this.categories.map((category) => category.id);
  }

  // =========================================================
  // SAFE NAME
  // =========================================================

  private getSafeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  }

  // =========================================================
  // DISPOSE
  // =========================================================

  dispose(): void {
    for (const root of this.categoryRoots) {
      if (!root.isDisposed()) {
        root.dispose(false, true);
      }
    }

    this.categoryRoots = [];

    for (const mesh of this.categoryMeshes) {
      if (!mesh.isDisposed()) {
        mesh.dispose(false, true);
      }
    }

    this.categoryMeshes = [];
    this.selectionCallback = null;
  }
}
