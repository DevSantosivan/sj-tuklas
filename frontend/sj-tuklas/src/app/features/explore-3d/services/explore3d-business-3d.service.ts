import { Injectable } from '@angular/core';

import {
  AbstractMesh,
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Observer,
  PointerEventTypes,
  PointerInfo,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from '@babylonjs/core';

import { Business } from '../../../core/models/business';

interface BuildingDimensions {
  width: number;
  height: number;
  depth: number;
}

@Injectable()
export class Explore3dBusiness3dService {
  private readonly businessMeshes = new Map<string, Mesh>();
  private readonly businessMaterials: StandardMaterial[] = [];
  private readonly businessTextures: Texture[] = [];

  private pointerObserver?: Observer<PointerInfo>;
  private interactionScene?: Scene;

  private readonly worldCenter = {
    latitude: 12.352,
    longitude: 121.067,
  };

  private worldOffset = Vector3.Zero();

  setWorldOffset(offset: Vector3): void {
    this.worldOffset.copyFrom(offset);
  }

  /**
   * One Babylon unit represents 10 real-world meters.
   * Keep this value consistent with the world and player services.
   */
  private readonly metersPerBabylonUnit = 10;

  /**
   * Front of each building faces the negative Z direction.
   */
  private readonly wallThickness = 0.25;
  private readonly doorwayWidth = 1.8;
  private readonly doorwayHeight = 2.3;

  // =========================================================
  // PUBLIC
  // =========================================================

  renderBusinesses(scene: Scene, businesses: Business[]): void {
    if (!scene.collisionsEnabled) {
      console.warn(
        'Babylon scene collisions are disabled. Enable scene.collisionsEnabled.',
      );
    }

    for (const business of businesses) {
      if (!business?.id || this.businessMeshes.has(business.id)) {
        continue;
      }

      if (!this.isValidCoordinate(business.latitude, business.longitude)) {
        continue;
      }

      this.createBusiness(scene, business);
    }
  }

  setupInteraction(
    scene: Scene,
    onBusinessSelected: (business: Business) => void,
  ): void {
    // Avoid registering duplicate pointer listeners.
    if (this.pointerObserver && this.interactionScene) {
      this.interactionScene.onPointerObservable.remove(this.pointerObserver);
    }

    this.interactionScene = scene;

    this.pointerObserver = scene.onPointerObservable.add(
      (pointerInfo: PointerInfo) => {
        if (pointerInfo.type !== PointerEventTypes.POINTERPICK) {
          return;
        }

        const pickedMesh = pointerInfo.pickInfo?.pickedMesh;

        if (!pickedMesh) {
          return;
        }

        const business = this.findBusinessFromMesh(pickedMesh);

        if (business) {
          onBusinessSelected(business);
        }
      },
    );
  }

  coordinatesToWorld(latitude: number, longitude: number): Vector3 {
    const latitudeMeters = (latitude - this.worldCenter.latitude) * 111_000;

    const longitudeMeters = (longitude - this.worldCenter.longitude) * 109_000;

    return new Vector3(
      longitudeMeters / this.metersPerBabylonUnit + this.worldOffset.x,
      this.worldOffset.y,
      -latitudeMeters / this.metersPerBabylonUnit + this.worldOffset.z,
    );
  }

  isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  findBusinessFromMesh(mesh: AbstractMesh): Business | null {
    let current: AbstractMesh | null = mesh;

    while (current) {
      const business = current.metadata?.business as Business | undefined;

      if (business) {
        return business;
      }

      current = current.parent instanceof AbstractMesh ? current.parent : null;
    }

    return null;
  }

  dispose(): void {
    if (this.pointerObserver && this.interactionScene) {
      this.interactionScene.onPointerObservable.remove(this.pointerObserver);
    }

    this.pointerObserver = undefined;
    this.interactionScene = undefined;

    // Every generated business mesh is tagged with business metadata.
    const scene = this.businessMeshes.values().next().value?.getScene();

    if (scene) {
      const businessIds = new Set(this.businessMeshes.keys());

      for (const mesh of [...scene.meshes]) {
        const businessId = mesh.metadata?.business?.id;

        if (businessId && businessIds.has(businessId)) {
          mesh.dispose(false, true);
        }
      }
    }

    for (const texture of this.businessTextures) {
      texture.dispose();
    }

    for (const material of this.businessMaterials) {
      material.dispose();
    }

    this.businessTextures.length = 0;
    this.businessMaterials.length = 0;
    this.businessMeshes.clear();
  }

  // =========================================================
  // BUSINESS FACTORY
  // =========================================================

  private createBusiness(scene: Scene, business: Business): void {
    const position = this.coordinatesToWorld(
      business.latitude,
      business.longitude,
    );

    const category = this.normalizeCategory(business.category);

    const dimensions = this.getBuildingDimensions(category);
    const color = this.getCategoryColor(category);

    const building = this.createMainBuilding(
      scene,
      business,
      position,
      dimensions,
      color,
    );

    this.createBuildingCollision(scene, business, position, dimensions);

    this.createFlatRoof(scene, business, position, dimensions);

    this.createCategoryDetails(
      scene,
      business,
      position,
      dimensions,
      category,
      color,
    );

    this.createBusinessSign(scene, business, position, dimensions);

    this.createBusinessLogo(scene, business, position, dimensions);

    this.businessMeshes.set(business.id, building);
  }

  // =========================================================
  // BUILDING DIMENSIONS
  // =========================================================

  private getBuildingDimensions(category: string): BuildingDimensions {
    switch (category) {
      case 'foods & drinks':
        return { width: 7, height: 4.5, depth: 6 };

      case 'hotels':
        return { width: 8, height: 10, depth: 8 };

      case 'shops':
        return { width: 6, height: 5, depth: 6 };

      case 'service':
        return { width: 7, height: 5, depth: 6 };

      case 'boarding house':
        return { width: 7, height: 7, depth: 7 };

      case 'places':
        return { width: 8, height: 5, depth: 8 };

      default:
        return { width: 5, height: 4, depth: 5 };
    }
  }

  // =========================================================
  // MAIN BUILDING
  // =========================================================

  private createMainBuilding(
    scene: Scene,
    business: Business,
    position: Vector3,
    dimensions: BuildingDimensions,
    color: Color3,
  ): Mesh {
    const building = MeshBuilder.CreateBox(
      `business-${business.id}`,
      {
        width: dimensions.width,
        height: dimensions.height,
        depth: dimensions.depth,
      },
      scene,
    );

    building.position.set(position.x, dimensions.height / 2, position.z);

    const material = this.createMaterial(
      `businessMaterial-${business.id}`,
      scene,
      color,
    );

    building.material = material;

    // This box is visual only. Physical collision is handled
    // by separate wall meshes to leave an open doorway.
    building.checkCollisions = false;
    building.isPickable = true;
    building.metadata = { business };

    return building;
  }

  // =========================================================
  // BUILDING COLLISION
  // =========================================================

  private createBuildingCollision(
    scene: Scene,
    business: Business,
    position: Vector3,
    dimensions: BuildingDimensions,
  ): void {
    const halfWidth = dimensions.width / 2;
    const halfDepth = dimensions.depth / 2;
    const halfWall = this.wallThickness / 2;

    const wallColor = new Color3(0.5, 0.5, 0.5);

    // LEFT WALL
    this.createCollisionWall(
      scene,
      business,
      `collision-left-${business.id}`,
      {
        width: this.wallThickness,
        height: dimensions.height,
        depth: dimensions.depth,
      },
      new Vector3(position.x - halfWidth, dimensions.height / 2, position.z),
      wallColor,
    );

    // RIGHT WALL
    this.createCollisionWall(
      scene,
      business,
      `collision-right-${business.id}`,
      {
        width: this.wallThickness,
        height: dimensions.height,
        depth: dimensions.depth,
      },
      new Vector3(position.x + halfWidth, dimensions.height / 2, position.z),
      wallColor,
    );

    // BACK WALL
    this.createCollisionWall(
      scene,
      business,
      `collision-back-${business.id}`,
      {
        width: dimensions.width,
        height: dimensions.height,
        depth: this.wallThickness,
      },
      new Vector3(position.x, dimensions.height / 2, position.z + halfDepth),
      wallColor,
    );

    // FRONT WALL LEFT OF THE DOORWAY
    const sideWidth = (dimensions.width - this.doorwayWidth) / 2;

    if (sideWidth > 0) {
      this.createCollisionWall(
        scene,
        business,
        `collision-front-left-${business.id}`,
        {
          width: sideWidth,
          height: dimensions.height,
          depth: this.wallThickness,
        },
        new Vector3(
          position.x - this.doorwayWidth / 2 - sideWidth / 2,
          dimensions.height / 2,
          position.z - halfDepth,
        ),
        wallColor,
      );

      // FRONT WALL RIGHT OF THE DOORWAY
      this.createCollisionWall(
        scene,
        business,
        `collision-front-right-${business.id}`,
        {
          width: sideWidth,
          height: dimensions.height,
          depth: this.wallThickness,
        },
        new Vector3(
          position.x + this.doorwayWidth / 2 + sideWidth / 2,
          dimensions.height / 2,
          position.z - halfDepth,
        ),
        wallColor,
      );
    }

    // FRONT HEADER ABOVE THE DOOR
    const headerHeight = dimensions.height - this.doorwayHeight;

    if (headerHeight > 0) {
      this.createCollisionWall(
        scene,
        business,
        `collision-front-header-${business.id}`,
        {
          width: this.doorwayWidth,
          height: headerHeight,
          depth: this.wallThickness,
        },
        new Vector3(
          position.x,
          this.doorwayHeight + headerHeight / 2,
          position.z - halfDepth,
        ),
        wallColor,
      );
    }

    // Doorway stays open at ground level.
    // No collision mesh is placed across the entrance.
    void halfWall;
  }

  private createCollisionWall(
    scene: Scene,
    business: Business,
    name: string,
    dimensions: {
      width: number;
      height: number;
      depth: number;
    },
    position: Vector3,
    color: Color3,
  ): Mesh {
    const wall = MeshBuilder.CreateBox(name, dimensions, scene);

    wall.position.copyFrom(position);

    wall.material = this.createMaterial(`material-${name}`, scene, color);

    wall.checkCollisions = true;
    wall.isPickable = true;
    wall.metadata = { business };

    return wall;
  }

  // =========================================================
  // ROOF
  // =========================================================

  private createFlatRoof(
    scene: Scene,
    business: Business,
    position: Vector3,
    dimensions: BuildingDimensions,
  ): void {
    const roof = MeshBuilder.CreateBox(
      `roof-${business.id}`,
      {
        width: dimensions.width + 0.5,
        height: 0.3,
        depth: dimensions.depth + 0.5,
      },
      scene,
    );

    roof.position.set(position.x, dimensions.height + 0.15, position.z);

    roof.material = this.createMaterial(
      `roofMaterial-${business.id}`,
      scene,
      new Color3(0.08, 0.08, 0.08),
    );

    roof.checkCollisions = false;
    roof.isPickable = true;
    roof.metadata = { business };
  }

  // =========================================================
  // CATEGORY DETAILS
  // =========================================================

  private createCategoryDetails(
    scene: Scene,
    business: Business,
    position: Vector3,
    dimensions: BuildingDimensions,
    category: string,
    color: Color3,
  ): void {
    const frontZ = position.z - dimensions.depth / 2 - 0.08;

    // FRONT DOOR DECORATION
    this.createDecorationBox(
      scene,
      business,
      `door-${business.id}`,
      0.9,
      1.9,
      0.12,
      new Vector3(position.x, 0.95, frontZ),
      new Color3(0.08, 0.05, 0.03),
    );

    // SHOP / RESTAURANT AWNING
    if (category === 'foods & drinks' || category === 'shops') {
      this.createDecorationBox(
        scene,
        business,
        `awning-${business.id}`,
        dimensions.width - 0.4,
        0.18,
        0.9,
        new Vector3(
          position.x,
          dimensions.height - 1.15,
          position.z - dimensions.depth / 2 - 0.45,
        ),
        color,
      );
    }

    // HOTEL ENTRANCE DETAIL
    if (category === 'hotels') {
      this.createDecorationBox(
        scene,
        business,
        `hotelEntrance-${business.id}`,
        2.6,
        2.6,
        1.3,
        new Vector3(position.x, 1.3, position.z - dimensions.depth / 2 - 0.55),
        new Color3(0.12, 0.12, 0.14),
      );
    }

    // SERVICE GARAGE DETAIL
    if (category === 'service') {
      this.createDecorationBox(
        scene,
        business,
        `garage-${business.id}`,
        3.2,
        2.6,
        0.15,
        new Vector3(
          position.x - 1.2,
          1.3,
          position.z - dimensions.depth / 2 - 0.1,
        ),
        new Color3(0.18, 0.18, 0.2),
      );
    }

    // WINDOWS
    if (category === 'hotels') {
      for (let floor = 1; floor <= 3; floor++) {
        const y = floor * 2.4 + 1;

        for (let column = -1; column <= 1; column++) {
          this.createWindow(
            scene,
            business,
            position.x + column * 2,
            frontZ,
            y,
            1.2,
            1.3,
          );
        }
      }
    } else {
      const windowY = category === 'boarding house' ? 2 : 2.2;

      this.createWindow(
        scene,
        business,
        position.x - 1.5,
        frontZ,
        windowY,
        1.5,
        1.5,
      );

      this.createWindow(
        scene,
        business,
        position.x + 1.5,
        frontZ,
        windowY,
        1.5,
        1.5,
      );
    }

    // OUTDOOR TABLES FOR FOOD BUSINESSES
    if (category === 'foods & drinks') {
      this.createOutdoorTable(
        scene,
        business,
        position.x - 2.4,
        position.z - 4.1,
      );

      this.createOutdoorTable(
        scene,
        business,
        position.x + 2.4,
        position.z - 4.1,
      );
    }

    // PLANTS
    if (category === 'foods & drinks' || category === 'places') {
      this.createPlant(
        scene,
        business,
        position.x - dimensions.width / 2 - 0.7,
        position.z - dimensions.depth / 2,
      );

      this.createPlant(
        scene,
        business,
        position.x + dimensions.width / 2 + 0.7,
        position.z - dimensions.depth / 2,
      );
    }
  }

  // =========================================================
  // DECORATION BOX
  // =========================================================

  private createDecorationBox(
    scene: Scene,
    business: Business,
    name: string,
    width: number,
    height: number,
    depth: number,
    position: Vector3,
    color: Color3,
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);

    mesh.position.copyFrom(position);

    mesh.material = this.createMaterial(`material-${name}`, scene, color);

    mesh.checkCollisions = false;
    mesh.isPickable = true;
    mesh.metadata = { business };

    return mesh;
  }

  // =========================================================
  // WINDOWS
  // =========================================================

  private createWindow(
    scene: Scene,
    business: Business,
    x: number,
    z: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const windowMesh = MeshBuilder.CreateBox(
      `window-${business.id}-${x}-${z}-${y}`,
      {
        width,
        height,
        depth: 0.1,
      },
      scene,
    );

    windowMesh.position.set(x, y, z);

    windowMesh.material = this.createMaterial(
      `windowMaterial-${business.id}-${x}-${z}-${y}`,
      scene,
      new Color3(0.18, 0.55, 0.75),
    );

    windowMesh.checkCollisions = false;
    windowMesh.isPickable = true;
    windowMesh.metadata = { business };
  }

  // =========================================================
  // BUSINESS SIGN
  // =========================================================

  private createBusinessSign(
    scene: Scene,
    business: Business,
    position: Vector3,
    dimensions: BuildingDimensions,
  ): void {
    const sign = MeshBuilder.CreatePlane(
      `sign-${business.id}`,
      {
        width: Math.min(dimensions.width * 0.85, 5.5),
        height: 1,
      },
      scene,
    );

    sign.position.set(
      position.x,
      dimensions.height - 0.75,
      position.z - dimensions.depth / 2 - 0.15,
    );

    const texture = new DynamicTexture(
      `businessSignTexture-${business.id}`,
      {
        width: 1024,
        height: 256,
      },
      scene,
      true,
    );

    const context = texture.getContext() as CanvasRenderingContext2D;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 1024, 256);

    context.fillStyle = '#111111';
    context.font = 'bold 64px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    context.fillText(this.truncateBusinessName(business.name), 512, 128);

    texture.update();
    this.businessTextures.push(texture);

    const material = new StandardMaterial(`signMaterial-${business.id}`, scene);

    material.diffuseTexture = texture;
    material.backFaceCulling = false;

    this.businessMaterials.push(material);

    sign.material = material;
    sign.checkCollisions = false;
    sign.isPickable = true;
    sign.metadata = { business };
  }

  // =========================================================
  // BUSINESS LOGO
  // =========================================================

  private createBusinessLogo(
    scene: Scene,
    business: Business,
    position: Vector3,
    dimensions: BuildingDimensions,
  ): void {
    if (!business.profileImage) {
      return;
    }

    const logo = MeshBuilder.CreatePlane(
      `logo-${business.id}`,
      {
        width: 1.5,
        height: 1.5,
      },
      scene,
    );

    logo.position.set(
      position.x,
      dimensions.height + 1.15,
      position.z - dimensions.depth / 2 - 0.18,
    );

    const material = new StandardMaterial(`logoMaterial-${business.id}`, scene);

    material.backFaceCulling = false;
    this.businessMaterials.push(material);

    const texture = new Texture(
      business.profileImage,
      scene,
      true,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => {
        material.diffuseTexture = texture;
        material.opacityTexture = texture;
        logo.material = material;
      },
      () => {
        console.warn('Unable to load business logo:', business.profileImage);
      },
    );

    this.businessTextures.push(texture);

    logo.material = material;
    logo.checkCollisions = false;
    logo.isPickable = true;
    logo.metadata = { business };
  }

  // =========================================================
  // OUTDOOR TABLE
  // =========================================================

  private createOutdoorTable(
    scene: Scene,
    business: Business,
    x: number,
    z: number,
  ): void {
    const tableMaterial = this.createMaterial(
      `tableMaterial-${business.id}-${x}-${z}`,
      scene,
      new Color3(0.35, 0.18, 0.08),
    );

    const table = MeshBuilder.CreateCylinder(
      `table-${business.id}-${x}-${z}`,
      {
        diameter: 0.9,
        height: 0.08,
      },
      scene,
    );

    table.position.set(x, 0.8, z);
    table.material = tableMaterial;
    table.checkCollisions = false;
    table.isPickable = true;
    table.metadata = { business };

    const leg = MeshBuilder.CreateCylinder(
      `tableLeg-${business.id}-${x}-${z}`,
      {
        diameter: 0.12,
        height: 0.8,
      },
      scene,
    );

    leg.position.set(x, 0.4, z);
    leg.material = tableMaterial;
    leg.checkCollisions = false;
    leg.isPickable = true;
    leg.metadata = { business };

    this.createChair(scene, business, x - 0.75, z);

    this.createChair(scene, business, x + 0.75, z);
  }

  private createChair(
    scene: Scene,
    business: Business,
    x: number,
    z: number,
  ): void {
    const material = this.createMaterial(
      `chairMaterial-${business.id}-${x}-${z}`,
      scene,
      new Color3(0.25, 0.15, 0.08),
    );

    const seat = MeshBuilder.CreateBox(
      `chairSeat-${business.id}-${x}-${z}`,
      {
        width: 0.5,
        height: 0.12,
        depth: 0.5,
      },
      scene,
    );

    seat.position.set(x, 0.45, z);
    seat.material = material;
    seat.checkCollisions = false;
    seat.isPickable = true;
    seat.metadata = { business };

    const back = MeshBuilder.CreateBox(
      `chairBack-${business.id}-${x}-${z}`,
      {
        width: 0.5,
        height: 0.65,
        depth: 0.1,
      },
      scene,
    );

    back.position.set(x, 0.75, z + 0.2);
    back.material = material;
    back.checkCollisions = false;
    back.isPickable = true;
    back.metadata = { business };
  }

  // =========================================================
  // PLANTS
  // =========================================================

  private createPlant(
    scene: Scene,
    business: Business,
    x: number,
    z: number,
  ): void {
    const pot = MeshBuilder.CreateCylinder(
      `plantPot-${business.id}-${x}-${z}`,
      {
        diameter: 0.45,
        height: 0.5,
      },
      scene,
    );

    pot.position.set(x, 0.25, z);

    pot.material = this.createMaterial(
      `plantPotMaterial-${business.id}-${x}-${z}`,
      scene,
      new Color3(0.45, 0.22, 0.08),
    );

    pot.checkCollisions = false;
    pot.isPickable = true;
    pot.metadata = { business };

    const leaves = MeshBuilder.CreateSphere(
      `plantLeaves-${business.id}-${x}-${z}`,
      {
        diameter: 1,
      },
      scene,
    );

    leaves.position.set(x, 0.9, z);

    leaves.material = this.createMaterial(
      `plantLeavesMaterial-${business.id}-${x}-${z}`,
      scene,
      new Color3(0.08, 0.45, 0.12),
    );

    leaves.checkCollisions = false;
    leaves.isPickable = true;
    leaves.metadata = { business };
  }

  // =========================================================
  // MATERIAL FACTORY
  // =========================================================

  private createMaterial(
    name: string,
    scene: Scene,
    color: Color3,
  ): StandardMaterial {
    const material = new StandardMaterial(name, scene);

    material.diffuseColor = color;
    this.businessMaterials.push(material);

    return material;
  }

  // =========================================================
  // CATEGORY
  // =========================================================

  private normalizeCategory(category: string): string {
    const value = category?.trim().toLowerCase();

    switch (value) {
      case 'food':
      case 'foods':
      case 'foods & drinks':
      case 'food & drinks':
        return 'foods & drinks';

      case 'hotel':
      case 'hotels':
        return 'hotels';

      case 'shop':
      case 'shops':
        return 'shops';

      case 'service':
      case 'services':
        return 'service';

      case 'boarding house':
      case 'boarding houses':
        return 'boarding house';

      case 'place':
      case 'places':
        return 'places';

      default:
        return value || 'other';
    }
  }

  private getCategoryColor(category: string): Color3 {
    switch (this.normalizeCategory(category)) {
      case 'foods & drinks':
        return new Color3(0.9, 0.45, 0.1);

      case 'hotels':
        return new Color3(0.15, 0.65, 0.35);

      case 'shops':
        return new Color3(0.1, 0.4, 0.85);

      case 'service':
        return new Color3(0.55, 0.25, 0.75);

      case 'boarding house':
        return new Color3(0.8, 0.2, 0.25);

      case 'places':
        return new Color3(0.1, 0.65, 0.65);

      default:
        return new Color3(0.45, 0.45, 0.45);
    }
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private truncateBusinessName(name: string): string {
    if (!name) {
      return 'Business';
    }

    return name.length <= 25 ? name : `${name.substring(0, 22)}...`;
  }

  // =========================================================
  // CLEAR BUSINESS MESHES
  // =========================================================

  clearBusinesses(): void {
    for (const mesh of this.businessMeshes.values()) {
      if (!mesh.isDisposed()) {
        mesh.dispose(false, true);
      }
    }

    this.businessMeshes.clear();
  }
}
