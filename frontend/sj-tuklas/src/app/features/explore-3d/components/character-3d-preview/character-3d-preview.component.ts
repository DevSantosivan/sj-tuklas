import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {
  AnimationGroup,
  ArcRotateCamera,
  Engine,
  HemisphericLight,
  Scene,
  SceneLoader,
  Vector3,
} from '@babylonjs/core';

import '@babylonjs/loaders/glTF';

import { CharacterModelId } from '../explore3d-entry-modal/explore3d-entry-modal.component';

@Component({
  selector: 'appcharacter3dpreview',
  standalone: true,
  imports: [],
  templateUrl: './character-3d-preview.component.html',
  styleUrl: './character-3d-preview.component.scss',
})
export class Character3dPreviewComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input({ required: true }) modelId: CharacterModelId = 'aj';

  @ViewChild('previewCanvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private engine?: Engine;
  private scene?: Scene;
  private camera?: ArcRotateCamera;
  private animationGroups: AnimationGroup[] = [];

  private initialized = false;
  private loading = false;

  private readonly modelSources: Record<
    CharacterModelId,
    { rootUrl: string; fileName: string }
  > = {
    aj: {
      rootUrl: '/assets/3d/aj/',
      fileName: 'aj-character2.glb',
    },
    suit: {
      rootUrl: '/assets/3d/',
      fileName: 'male_character_in_suit.glb',
    },
    brian: {
      rootUrl: '/assets/3d/brian/',
      fileName: 'Brian.glb',
    },
  };

  async ngAfterViewInit(): Promise<void> {
    this.initializeScene();
    this.initialized = true;
    await this.loadCharacter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modelId'] && this.initialized) {
      void this.loadCharacter();
    }
  }

  private initializeScene(): void {
    const canvas = this.canvasRef.nativeElement;

    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor.set(0, 0, 0, 0);

    this.camera = new ArcRotateCamera(
      'characterPreviewCamera',
      -Math.PI / 2,
      Math.PI / 2.15,
      3.2,
      new Vector3(0, 1, 0),
      this.scene,
    );

    this.camera.lowerRadiusLimit = 2.5;
    this.camera.upperRadiusLimit = 4.5;
    this.camera.wheelPrecision = 80;
    this.camera.panningSensibility = 0;
    this.camera.attachControl(canvas, true);

    const light = new HemisphericLight(
      'characterPreviewLight',
      new Vector3(0, 1, 0),
      this.scene,
    );
    light.intensity = 1.25;

    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });
  }

  private async loadCharacter(): Promise<void> {
    if (!this.scene || this.loading) return;

    this.loading = true;

    try {
      this.animationGroups.forEach((animation) => animation.dispose());
      this.animationGroups = [];

      this.scene.meshes
        .filter((mesh) => mesh.name !== '__root__')
        .forEach((mesh) => mesh.dispose());

      const source = this.modelSources[this.modelId];

      const result = await SceneLoader.ImportMeshAsync(
        '',
        source.rootUrl,
        source.fileName,
        this.scene,
      );

      this.animationGroups = result.animationGroups;

      const meshes = result.meshes.filter(
        (mesh) => mesh.getTotalVertices() > 0,
      );

      if (!meshes.length) return;

      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      meshes.forEach((mesh) => {
        mesh.computeWorldMatrix(true);

        const bounds = mesh.getBoundingInfo().boundingBox;
        minY = Math.min(minY, bounds.minimumWorld.y);
        maxY = Math.max(maxY, bounds.maximumWorld.y);
      });

      const height = maxY - minY;
      const centerY = (minY + maxY) / 2;

      result.meshes.forEach((mesh) => {
        mesh.position.y -= centerY;
      });

      if (this.camera) {
        this.camera.target = new Vector3(0, 0, 0);
        this.camera.radius = Math.max(2.8, height * 1.8);
      }

      const idleAnimation =
        this.animationGroups.find((animation) =>
          animation.name.toLowerCase().includes('idle'),
        ) ?? this.animationGroups[0];

      idleAnimation?.start(true);
    } catch (error) {
      console.error('[Character3dPreview] Failed to load model:', error);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.animationGroups.forEach((animation) => animation.dispose());
    this.scene?.dispose();
    this.engine?.dispose();
  }
}
