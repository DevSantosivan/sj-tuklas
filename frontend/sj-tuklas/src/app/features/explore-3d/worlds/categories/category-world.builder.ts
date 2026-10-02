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

import {
  Explore3dBuildingSelection,
  Explore3dWorldConfig,
  Explore3dWorldPosition,
} from '../../models/explore3d-world.types';

export class CategoryWorldBuilder {
  private root?: TransformNode;
  private readonly materials: StandardMaterial[] = [];
  private readonly textures: DynamicTexture[] = [];

  private readonly columns = 4;
  private readonly spacingX = 20;
  private readonly spacingZ = 22;

  build(
    scene: Scene,
    config: Explore3dWorldConfig,
  ): { root: TransformNode; buildingCount: number } {
    this.dispose();

    this.root = new TransformNode(`category-world-${config.id}`, scene);

    this.createGround(scene, config);
    this.createRoad(scene, config);

    config.types.forEach((type, index) => {
      const position = this.getBuildingPosition(index);
      this.createBuilding(scene, config, type, position);
    });

    return {
      root: this.root,
      buildingCount: config.types.length,
    };
  }

  private getBuildingPosition(index: number): Explore3dWorldPosition {
    const column = index % this.columns;
    const row = Math.floor(index / this.columns);

    const totalWidth = (this.columns - 1) * this.spacingX;

    return {
      x: column * this.spacingX - totalWidth / 2,
      z: row * this.spacingZ - 12,
    };
  }

  private createGround(scene: Scene, config: Explore3dWorldConfig): void {
    if (!this.root) return;

    const rows = Math.max(1, Math.ceil(config.types.length / this.columns));

    const width = Math.max(90, (this.columns - 1) * this.spacingX + 35);

    const depth = Math.max(75, rows * this.spacingZ + 45);

    const ground = MeshBuilder.CreateGround(
      `ground-${config.id}`,
      { width, height: depth },
      scene,
    );

    ground.position.y = -0.1;
    ground.checkCollisions = true;
    ground.parent = this.root;
    ground.material = this.createMaterial(
      scene,
      `ground-material-${config.id}`,
      Color3.FromHexString(config.groundColor ?? '#71866b'),
    );
  }

  private createRoad(scene: Scene, config: Explore3dWorldConfig): void {
    if (!this.root) return;

    const rows = Math.max(1, Math.ceil(config.types.length / this.columns));

    const road = MeshBuilder.CreateBox(
      `main-road-${config.id}`,
      {
        width: 9,
        height: 0.12,
        depth: Math.max(70, rows * this.spacingZ + 35),
      },
      scene,
    );

    road.position.set(0, 0.01, 0);
    road.parent = this.root;
    road.checkCollisions = true;
    road.material = this.createMaterial(
      scene,
      `road-material-${config.id}`,
      Color3.FromHexString(config.roadColor ?? '#343b42'),
    );
  }

  private createBuilding(
    scene: Scene,
    config: Explore3dWorldConfig,
    type: Explore3dWorldConfig['types'][number],
    position: Explore3dWorldPosition,
  ): void {
    if (!this.root) return;

    const buildingRoot = new TransformNode(
      `type-${config.id}-${type.id}`,
      scene,
    );

    buildingRoot.position.set(position.x, 0, position.z);
    buildingRoot.parent = this.root;

    const selection: Explore3dBuildingSelection = {
      categoryId: config.id,
      categoryName: config.name,
      typeId: type.id,
      typeName: type.name,
    };

    buildingRoot.metadata = {
      categoryWorldSelection: selection,
    };

    const body = MeshBuilder.CreateBox(
      `building-body-${type.id}`,
      {
        width: 11,
        height: 7,
        depth: 10,
      },
      scene,
    );

    body.position.y = 3.5;
    body.parent = buildingRoot;
    body.checkCollisions = true;
    body.material = this.createMaterial(
      scene,
      `building-material-${type.id}`,
      this.getBuildingColor(type.id),
    );
    body.metadata = { categoryWorldSelection: selection };

    const roof = MeshBuilder.CreateBox(
      `building-roof-${type.id}`,
      {
        width: 12,
        height: 0.7,
        depth: 11,
      },
      scene,
    );

    roof.position.y = 7.35;
    roof.parent = buildingRoot;
    roof.material = this.createMaterial(
      scene,
      `roof-material-${type.id}`,
      new Color3(0.19, 0.23, 0.26),
    );

    const door = MeshBuilder.CreateBox(
      `building-door-${type.id}`,
      {
        width: 2.1,
        height: 3.2,
        depth: 0.2,
      },
      scene,
    );

    door.position.set(0, 1.6, -5.1);
    door.parent = buildingRoot;
    door.material = this.createMaterial(
      scene,
      `door-material-${type.id}`,
      new Color3(0.15, 0.19, 0.22),
    );

    const sign = MeshBuilder.CreateBox(
      `building-sign-${type.id}`,
      {
        width: 9.2,
        height: 1.5,
        depth: 0.25,
      },
      scene,
    );

    sign.position.set(0, 5.9, -5.15);
    sign.parent = buildingRoot;
    sign.material = this.createSignMaterial(
      scene,
      `sign-material-${type.id}`,
      type.name,
    );
    sign.metadata = { categoryWorldSelection: selection };
  }

  private createMaterial(
    scene: Scene,
    name: string,
    color: Color3,
  ): StandardMaterial {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.12, 0.12, 0.12);

    this.materials.push(material);
    return material;
  }

  private createSignMaterial(
    scene: Scene,
    name: string,
    text: string,
  ): StandardMaterial {
    const texture = new DynamicTexture(
      `${name}-texture`,
      { width: 1024, height: 256 },
      scene,
      false,
    );

    texture.hasAlpha = false;

    const context = texture.getContext() as unknown as CanvasRenderingContext2D;

    context.clearRect(0, 0, 1024, 256);
    context.fillStyle = '#17212b';
    context.fillRect(0, 0, 1024, 256);

    let fontSize = 62;

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';

    do {
      context.font = `bold ${fontSize}px Arial`;

      if (context.measureText(text).width <= 940) {
        break;
      }

      fontSize -= 2;
    } while (fontSize > 28);

    context.fillText(text, 512, 128);
    texture.update();

    this.textures.push(texture);

    const material = new StandardMaterial(name, scene);
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.2, 0.2, 0.2);
    material.specularColor = Color3.Black();

    this.materials.push(material);

    return material;
  }
  private getBuildingColor(typeId: string): Color3 {
    const colors: Record<string, string> = {
      'salon-beauty': '#c47da7',
      barbershop: '#6689b9',
      'spa-massage': '#76aaa0',
      'auto-repair': '#bd794c',
      'motorcycle-repair': '#b98a50',
      laundry: '#75aeca',
      'printing-digital': '#8987bd',
      'computer-it': '#5d9caf',
      photography: '#a58ab5',
      'events-entertainment': '#c5a05b',
      'cleaning-services': '#80aa76',
      'construction-contractor': '#b59b65',
      'tutorial-training': '#7897c4',
    };

    return Color3.FromHexString(colors[typeId] ?? '#929ba3');
  }

  getSelection(mesh: Mesh): Explore3dBuildingSelection | null {
    return (
      (mesh.metadata?.['categoryWorldSelection'] as
        | Explore3dBuildingSelection
        | undefined) ?? null
    );
  }

  dispose(): void {
    this.root?.dispose(false, false);
    this.root = undefined;

    for (const material of this.materials) {
      material.dispose(false, false);
    }
    this.materials.length = 0;

    for (const texture of this.textures) {
      texture.dispose();
    }
    this.textures.length = 0;
  }
}
