import { Injectable } from '@angular/core';

import {
  AbstractMesh,
  AssetContainer,
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';

interface TreePosition {
  x: number;
  z: number;
  scale?: number;
  rotationY?: number;
}

interface ObjectPosition {
  x: number;
  z: number;
  rotationY?: number;
}

@Injectable({
  providedIn: 'root',
})
export class HubEnvironmentBuilder {
  private scene?: Scene;
  private environmentRoot?: TransformNode;
  private treeRoot?: TransformNode;
  private treeContainer?: AssetContainer;

  private buildVersion = 0;
  private disposed = true;

  private readonly assetPath = '/assets/3d/hub/';
  private readonly treeFile = 'tree.glb';

  private readonly createdMaterials: StandardMaterial[] = [];
  private readonly treeInstances: TransformNode[] = [];

  private readonly maxTrees = 8;

  /* =========================================================
     TREE POSITIONS
  ========================================================= */

  private readonly treePositions: TreePosition[] = [
    { x: -20, z: -19, scale: 1, rotationY: 0.2 },
    { x: -10, z: -21, scale: 0.9, rotationY: 1.1 },
    { x: 2, z: -21, scale: 1, rotationY: 2.2 },
    { x: 14, z: -20, scale: 0.95, rotationY: 0.6 },

    { x: 21, z: -12, scale: 1, rotationY: 1.7 },
    { x: 21, z: 10, scale: 0.9, rotationY: 2.8 },

    { x: -13, z: 21, scale: 1, rotationY: 1.9 },
    { x: -21, z: 5, scale: 0.95, rotationY: 1.4 },
  ];

  /* =========================================================
     BUILD
  ========================================================= */

  public build(scene: Scene): void {
    this.dispose();

    this.scene = scene;
    this.disposed = false;

    const version = ++this.buildVersion;

    this.environmentRoot = new TransformNode('hub-environment-root', scene);

    this.treeRoot = new TransformNode('hub-tree-root', scene);

    this.treeRoot.parent = this.environmentRoot;

    this.createMaterials();
    this.createLandscape();
    this.createGardenBeds();
    this.createStreetLights();
    this.createBenches();
    this.createCenterSign();

    // Tree loading does not block the initial environment.
    void this.loadAndCreateTrees(version);
  }

  /* =========================================================
     MATERIALS
  ========================================================= */

  private createMaterials(): void {
    this.createMaterial('hub-grass-material', '#78966a');
    this.createMaterial('hub-dark-grass-material', '#5f8055');
    this.createMaterial('hub-concrete-material', '#b9b9b1');
    this.createMaterial('hub-stone-material', '#8e9690');

    this.createMaterial('hub-wood-material', '#806044');
    this.createMaterial('hub-wood-light-material', '#aa8055');
    this.createMaterial('hub-metal-material', '#3c4548');

    this.createMaterial('hub-light-material', '#fff1c7');
    this.createMaterial('hub-sign-material', '#303a3a');
    this.createMaterial('hub-sign-text-material', '#f5f5ed');

    this.createMaterial('hub-flower-material', '#e7b8a7');
    this.createMaterial('hub-leaf-material', '#587b4b');
  }

  private createMaterial(name: string, hex: string): StandardMaterial {
    const scene = this.scene;

    if (!scene) {
      throw new Error('Scene is not initialized.');
    }

    const material = new StandardMaterial(name, scene);

    material.diffuseColor = Color3.FromHexString(hex);
    material.specularColor = new Color3(0.05, 0.05, 0.05);
    material.freeze();

    this.createdMaterials.push(material);

    return material;
  }

  private material(name: string): StandardMaterial {
    const found = this.createdMaterials.find((item) => item.name === name);

    if (!found) {
      throw new Error(`Missing material: ${name}`);
    }

    return found;
  }

  /* =========================================================
     LANDSCAPE
  ========================================================= */

  private createLandscape(): void {
    const scene = this.scene;
    const root = this.environmentRoot;

    if (!scene || !root) return;

    const grass = MeshBuilder.CreateGround(
      'hub-main-grass',
      {
        width: 48,
        height: 48,
        subdivisions: 1,
      },
      scene,
    );

    grass.position.y = -0.04;
    grass.material = this.material('hub-grass-material');
    this.addStaticMesh(grass, root);

    const lawns = [
      { x: -13, z: -7, w: 7, h: 4 },
      { x: 13, z: -7, w: 7, h: 4 },
      { x: -13, z: 8, w: 7, h: 4 },
      { x: 13, z: 8, w: 7, h: 4 },
    ];

    lawns.forEach((item, index) => {
      const lawn = MeshBuilder.CreateGround(
        `hub-lawn-${index}`,
        {
          width: item.w,
          height: item.h,
          subdivisions: 1,
        },
        scene,
      );

      lawn.position.set(item.x, 0.005, item.z);
      lawn.material = this.material('hub-dark-grass-material');

      this.addStaticMesh(lawn, root);
    });

    const plaza = MeshBuilder.CreateGround(
      'hub-central-plaza',
      {
        width: 15,
        height: 10,
        subdivisions: 1,
      },
      scene,
    );

    plaza.position.set(0, 0.015, 0);
    plaza.material = this.material('hub-concrete-material');

    this.addStaticMesh(plaza, root);
  }

  /* =========================================================
     GARDEN BEDS
  ========================================================= */

  private createGardenBeds(): void {
    const scene = this.scene;
    const root = this.environmentRoot;

    if (!scene || !root) return;

    const beds = [
      { x: -13, z: -7, width: 6.5, depth: 0.35 },
      { x: -13, z: -7, width: 0.35, depth: 4 },
      { x: 13, z: -7, width: 6.5, depth: 0.35 },
      { x: 13, z: -7, width: 0.35, depth: 4 },
      { x: -13, z: 8, width: 6.5, depth: 0.35 },
      { x: -13, z: 8, width: 0.35, depth: 4 },
      { x: 13, z: 8, width: 6.5, depth: 0.35 },
      { x: 13, z: 8, width: 0.35, depth: 4 },
    ];

    beds.forEach((bed, index) => {
      const border = MeshBuilder.CreateBox(
        `hub-garden-border-${index}`,
        {
          width: bed.width,
          height: 0.22,
          depth: bed.depth,
        },
        scene,
      );

      border.position.set(bed.x, 0.1, bed.z);
      border.material = this.material('hub-stone-material');

      this.addStaticMesh(border, root);
    });

    const flowers: [number, number][] = [
      [-13, -8],
      [-11, -7],
      [-15, -6],
      [13, -8],
      [11, -7],
      [15, -6],
      [-13, 7],
      [-11, 8],
      [-15, 9],
      [13, 7],
      [11, 8],
      [15, 9],
    ];

    flowers.forEach(([x, z], index) => {
      const plant = MeshBuilder.CreateSphere(
        `hub-plant-${index}`,
        {
          diameter: 0.45,
          segments: 4,
        },
        scene,
      );

      plant.position.set(x, 0.22, z);
      plant.scaling.y = 0.7;

      plant.material = this.material(
        index % 3 === 0 ? 'hub-flower-material' : 'hub-leaf-material',
      );

      this.addStaticMesh(plant, root);
    });
  }

  /* =========================================================
     STREET LIGHTS
  ========================================================= */

  private createStreetLights(): void {
    const scene = this.scene;
    const environmentRoot = this.environmentRoot;

    if (!scene || !environmentRoot) return;

    const positions: ObjectPosition[] = [
      { x: -15, z: -3 },
      { x: 15, z: -3 },
      { x: -15, z: 12 },
      { x: 15, z: 12 },
      { x: -6, z: -12 },
      { x: 6, z: -12 },
      { x: -6, z: 12 },
      { x: 6, z: 12 },
    ];

    positions.forEach((position, index) => {
      const lampRoot = new TransformNode(`hub-streetlight-${index}`, scene);

      lampRoot.parent = environmentRoot;
      lampRoot.position.set(position.x, 0, position.z);

      const pole = MeshBuilder.CreateCylinder(
        `hub-light-pole-${index}`,
        {
          height: 3.8,
          diameter: 0.12,
          tessellation: 6,
        },
        scene,
      );

      pole.position.y = 1.9;
      pole.material = this.material('hub-metal-material');
      pole.parent = lampRoot;
      this.addStaticMesh(pole, lampRoot);

      const arm = MeshBuilder.CreateBox(
        `hub-light-arm-${index}`,
        {
          width: 0.75,
          height: 0.09,
          depth: 0.09,
        },
        scene,
      );

      arm.position.set(0.28, 3.65, 0);
      arm.material = this.material('hub-metal-material');
      arm.parent = lampRoot;
      this.addStaticMesh(arm, lampRoot);

      const lamp = MeshBuilder.CreateSphere(
        `hub-light-head-${index}`,
        {
          diameter: 0.34,
          segments: 6,
        },
        scene,
      );

      lamp.position.set(0.62, 3.58, 0);
      lamp.scaling.y = 0.5;
      lamp.material = this.material('hub-light-material');
      lamp.parent = lampRoot;
      this.addStaticMesh(lamp, lampRoot);

      this.freezeHierarchy(lampRoot);
    });
  }

  /* =========================================================
     MODERN BENCHES
  ========================================================= */

  private createBenches(): void {
    const scene = this.scene;
    const environmentRoot = this.environmentRoot;

    if (!scene || !environmentRoot) return;

    const positions: ObjectPosition[] = [
      { x: -16.5, z: -6, rotationY: Math.PI / 2 },
      { x: 16.5, z: -6, rotationY: -Math.PI / 2 },
      { x: -16.5, z: 10, rotationY: Math.PI / 2 },
      { x: 16.5, z: 10, rotationY: -Math.PI / 2 },
    ];

    positions.forEach((position, index) => {
      const bench = new TransformNode(`hub-bench-${index}`, scene);

      bench.parent = environmentRoot;
      bench.position.set(position.x, 0, position.z);
      bench.rotation.y = position.rotationY ?? 0;

      /* SEAT SLATS */

      [-0.16, 0, 0.16].forEach((z, slatIndex) => {
        const slat = MeshBuilder.CreateBox(
          `hub-bench-seat-${index}-${slatIndex}`,
          {
            width: 1.9,
            height: 0.1,
            depth: 0.13,
          },
          scene,
        );

        slat.position.set(0, 0.58, z);
        slat.material = this.material(
          slatIndex % 2 === 0 ? 'hub-wood-light-material' : 'hub-wood-material',
        );

        slat.parent = bench;
        this.addStaticMesh(slat, bench);
      });

      /* BACKREST SLATS */

      [0.82, 1.04, 1.26].forEach((y, slatIndex) => {
        const back = MeshBuilder.CreateBox(
          `hub-bench-back-${index}-${slatIndex}`,
          {
            width: 1.9,
            height: 0.14,
            depth: 0.1,
          },
          scene,
        );

        back.position.set(0, y, 0.23);
        back.material = this.material(
          slatIndex === 1 ? 'hub-wood-light-material' : 'hub-wood-material',
        );

        back.parent = bench;
        this.addStaticMesh(back, bench);
      });

      /* METAL SUPPORTS AND ARMRESTS */

      [-0.72, 0.72].forEach((x, supportIndex) => {
        const support = new TransformNode(
          `hub-bench-support-${index}-${supportIndex}`,
          scene,
        );

        support.parent = bench;
        support.position.x = x;

        const frontLeg = MeshBuilder.CreateBox(
          `hub-bench-front-leg-${index}-${supportIndex}`,
          {
            width: 0.11,
            height: 0.56,
            depth: 0.12,
          },
          scene,
        );

        frontLeg.position.set(0, 0.28, -0.12);
        frontLeg.material = this.material('hub-metal-material');
        frontLeg.parent = support;
        this.addStaticMesh(frontLeg, support);

        const backLeg = MeshBuilder.CreateBox(
          `hub-bench-back-leg-${index}-${supportIndex}`,
          {
            width: 0.11,
            height: 1.18,
            depth: 0.12,
          },
          scene,
        );

        backLeg.position.set(0, 0.59, 0.2);
        backLeg.material = this.material('hub-metal-material');
        backLeg.parent = support;
        this.addStaticMesh(backLeg, support);

        const armrest = MeshBuilder.CreateBox(
          `hub-bench-armrest-${index}-${supportIndex}`,
          {
            width: 0.16,
            height: 0.1,
            depth: 0.58,
          },
          scene,
        );

        armrest.position.set(0, 0.86, 0.03);
        armrest.material = this.material('hub-wood-light-material');
        armrest.parent = support;
        this.addStaticMesh(armrest, support);

        const foot = MeshBuilder.CreateBox(
          `hub-bench-foot-${index}-${supportIndex}`,
          {
            width: 0.13,
            height: 0.1,
            depth: 0.65,
          },
          scene,
        );

        foot.position.set(0, 0.06, 0.03);
        foot.material = this.material('hub-metal-material');
        foot.parent = support;
        this.addStaticMesh(foot, support);

        this.freezeHierarchy(support);
      });

      this.freezeHierarchy(bench);
    });
  }

  /* =========================================================
     CENTER SIGN
  ========================================================= */

  private createCenterSign(): void {
    const scene = this.scene;
    const environmentRoot = this.environmentRoot;

    if (!scene || !environmentRoot) return;

    const sign = new TransformNode('hub-center-sign-root', scene);

    sign.parent = environmentRoot;
    sign.position.set(0, 0, -4.7);

    const post = MeshBuilder.CreateBox(
      'hub-center-sign-post',
      {
        width: 0.22,
        height: 2.4,
        depth: 0.22,
      },
      scene,
    );

    post.position.y = 1.2;
    post.material = this.material('hub-wood-material');
    post.parent = sign;
    this.addStaticMesh(post, sign);

    const board = MeshBuilder.CreateBox(
      'hub-center-sign-board',
      {
        width: 4.2,
        height: 1.25,
        depth: 0.18,
      },
      scene,
    );

    board.position.y = 2.15;
    board.material = this.material('hub-sign-material');
    board.parent = sign;
    this.addStaticMesh(board, sign);

    const accent = MeshBuilder.CreateBox(
      'hub-center-sign-accent',
      {
        width: 3.5,
        height: 0.06,
        depth: 0.025,
      },
      scene,
    );

    accent.position.set(0, 2.15, -0.105);
    accent.material = this.material('hub-sign-text-material');
    accent.parent = sign;
    this.addStaticMesh(accent, sign);

    this.freezeHierarchy(sign);
  }

  /* =========================================================
     FREEZE STATIC HIERARCHY
  ========================================================= */

  private freezeHierarchy(root: TransformNode): void {
    root.getChildMeshes(false).forEach((mesh) => {
      mesh.computeWorldMatrix(true);
      mesh.freezeWorldMatrix();
    });

    root.computeWorldMatrix(true);
    root.freezeWorldMatrix();
  }

  /* =========================================================
     TREE LOADING
  ========================================================= */

  private async loadAndCreateTrees(version: number): Promise<void> {
    const scene = this.scene;
    const treeRoot = this.treeRoot;

    if (!scene || !treeRoot) return;

    let container: AssetContainer | undefined;

    try {
      container = await SceneLoader.LoadAssetContainerAsync(
        this.assetPath,
        this.treeFile,
        scene,
      );

      if (
        this.disposed ||
        version !== this.buildVersion ||
        scene !== this.scene ||
        treeRoot.isDisposed()
      ) {
        container.dispose();
        return;
      }

      this.treeContainer = container;

      const sourceMeshes = container.meshes.filter(
        (mesh): mesh is Mesh => mesh instanceof Mesh,
      );

      if (sourceMeshes.length === 0) {
        container.dispose();
        this.treeContainer = undefined;
        return;
      }

      container.removeAllFromScene();

      const positions = this.treePositions.slice(0, this.maxTrees);

      for (const [index, position] of positions.entries()) {
        // Spread creation over separate animation frames.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

        if (
          this.disposed ||
          version !== this.buildVersion ||
          scene !== this.scene ||
          !this.treeRoot ||
          this.treeRoot.isDisposed()
        ) {
          return;
        }

        const instanceRoot = new TransformNode(
          `hub-tree-instance-${index}`,
          scene,
        );

        instanceRoot.parent = this.treeRoot;
        instanceRoot.position.set(position.x, 0, position.z);
        instanceRoot.rotation.y = position.rotationY ?? 0;

        const instantiated = container.instantiateModelsToScene(
          (sourceName) => `${sourceName}-tree-${index}`,
          false,
        );

        instantiated.rootNodes.forEach((node) => {
          node.parent = instanceRoot;

          const meshes =
            node instanceof AbstractMesh
              ? [node, ...node.getChildMeshes(false)]
              : node.getChildMeshes(false);

          meshes.forEach((mesh) => {
            mesh.isPickable = false;
            mesh.checkCollisions = false;
            mesh.receiveShadows = false;
            mesh.alwaysSelectAsActiveMesh = false;
          });
        });

        const scale = position.scale ?? 1;
        instanceRoot.scaling.set(scale, scale, scale);

        const treeMeshes = Array.from(
          new Set(
            instantiated.rootNodes.flatMap((node) =>
              node instanceof AbstractMesh
                ? [node, ...node.getChildMeshes(false)]
                : node.getChildMeshes(false),
            ),
          ),
        );

        // Calculate the lowest point of the complete tree.
        instanceRoot.computeWorldMatrix(true);

        treeMeshes.forEach((mesh) => {
          mesh.computeWorldMatrix(true);
        });

        if (treeMeshes.length > 0) {
          const lowestY = Math.min(
            ...treeMeshes.map(
              (mesh) => mesh.getBoundingInfo().boundingBox.minimumWorld.y,
            ),
          );

          // Align the lowest part of the tree with ground level.
          instanceRoot.position.y -= lowestY;
        }

        // Recompute after the vertical adjustment.
        instanceRoot.computeWorldMatrix(true);

        treeMeshes.forEach((mesh) => {
          mesh.computeWorldMatrix(true);
          mesh.freezeWorldMatrix();
        });

        instanceRoot.freezeWorldMatrix();

        this.treeInstances.push(instanceRoot);
      }
    } catch {
      // No console logging.
      if (container && container !== this.treeContainer) {
        container.dispose();
      }

      if (
        !this.disposed &&
        version === this.buildVersion &&
        this.treeContainer === container
      ) {
        this.treeContainer = undefined;
      }
    }
  }

  /* =========================================================
     STATIC MESH HELPER
  ========================================================= */

  private addStaticMesh(mesh: AbstractMesh, parent: TransformNode): void {
    mesh.parent = parent;

    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.receiveShadows = false;
    mesh.alwaysSelectAsActiveMesh = false;
  }

  /* =========================================================
     DISPOSE
  ========================================================= */

  public dispose(): void {
    this.disposed = true;
    this.buildVersion++;

    this.treeInstances.forEach((instance) => {
      if (!instance.isDisposed()) {
        instance.dispose(false, false);
      }
    });

    this.treeInstances.length = 0;

    this.treeContainer?.dispose();
    this.treeContainer = undefined;

    const environmentRoot = this.environmentRoot;

    if (environmentRoot && !environmentRoot.isDisposed()) {
      environmentRoot.dispose(false, false);
    }

    this.environmentRoot = undefined;
    this.treeRoot = undefined;

    this.createdMaterials.forEach((material) => {
      material.dispose(false, true);
    });

    this.createdMaterials.length = 0;

    this.scene = undefined;
  }
}
