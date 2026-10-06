import { Injectable } from '@angular/core';

import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
} from '@babylonjs/core';

import { Business } from '../../../core/models/business';
import { BusinessService } from '../../../core/services/business.service';

@Injectable({
  providedIn: 'root',
})
export class Explore3dBusinessBillboardService {
  // =========================================================
  // SCENE
  // =========================================================

  private scene?: Scene;

  // =========================================================
  // BILLBOARD
  // =========================================================

  private billboard?: Mesh;
  private billboardFrame?: Mesh;

  private leftPost?: Mesh;
  private rightPost?: Mesh;

  private texture?: DynamicTexture;
  private material?: StandardMaterial;

  // =========================================================
  // CONFIG
  // =========================================================

  /**
   * SOUTH SIDE OF HUB
   */
  private readonly perimeterZ = 66;

  /**
   * Billboard vertical position.
   */
  private readonly billboardY = 13.5;

  /**
   * Move billboard to the LEFT.
   *
   * Negative = left
   * Positive = right
   */
  private readonly billboardX = -38;

  /**
   * Billboard rotation.
   *
   * Math.PI = faces toward the plaza.
   *
   * +15 degrees gives the billboard
   * a slight angle toward the right.
   */
  private readonly billboardRotationY = 0;

  /**
   * Billboard dimensions.
   */
  private readonly billboardWidth = 18;
  private readonly billboardHeight = 8;

  // =========================================================
  // DEPENDENCIES
  // =========================================================

  constructor(private readonly businessService: BusinessService) {}

  // =========================================================
  // CREATE
  // =========================================================

  async create(scene: Scene): Promise<void> {
    this.scene = scene;

    this.clear();

    try {
      const businesses = await this.businessService.getApprovedBusinesses();

      console.log('[Explore3D Billboard] Approved businesses:', businesses);

      if (!businesses?.length) {
        console.warn('[Explore3D Billboard] No approved businesses found.');

        this.createFallbackBillboard();

        return;
      }

      const business = this.getFeaturedBusiness(businesses);

      if (!business) {
        console.warn('[Explore3D Billboard] No featured business found.');

        this.createFallbackBillboard();

        return;
      }

      console.log('[Explore3D Billboard] Featured business:', business);

      await this.createBusinessBillboard(business);
    } catch (error) {
      console.error('[Explore3D Billboard] Failed to load businesses:', error);

      this.createFallbackBillboard();
    }
  }

  // =========================================================
  // FEATURED BUSINESS
  // =========================================================

  private getFeaturedBusiness(businesses: Business[]): Business | null {
    if (!businesses.length) {
      return null;
    }

    return [...businesses].sort((a: any, b: any) => {
      const ratingA = Number(a?.rating ?? 0);
      const ratingB = Number(b?.rating ?? 0);

      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }

      const reviewsA = Number(
        a?.reviews ?? a?.reviewCount ?? a?.totalReviews ?? 0,
      );

      const reviewsB = Number(
        b?.reviews ?? b?.reviewCount ?? b?.totalReviews ?? 0,
      );

      if (reviewsA !== reviewsB) {
        return reviewsB - reviewsA;
      }

      const proA = a?.isPro === true ? 1 : 0;
      const proB = b?.isPro === true ? 1 : 0;

      return proB - proA;
    })[0];
  }

  // =========================================================
  // CREATE BUSINESS BILLBOARD
  // =========================================================

  private async createBusinessBillboard(business: Business): Promise<void> {
    if (!this.scene) {
      return;
    }

    const scene = this.scene;

    const businessId = String((business as any)?.id ?? 'featured-business');

    // -------------------------------------------------------
    // MAIN BOARD
    // -------------------------------------------------------

    const board = MeshBuilder.CreatePlane(
      `explore3dBusinessBillboard_${businessId}`,
      {
        width: this.billboardWidth,
        height: this.billboardHeight,
      },
      scene,
    );

    /**
     * LEFT SIDE + SOUTH SIDE
     */
    board.position.set(this.billboardX, this.billboardY, this.perimeterZ);

    /**
     * Face toward the plaza with a slight angle.
     */
    board.rotation.y = this.billboardRotationY;

    // -------------------------------------------------------
    // BOARD TEXTURE
    // -------------------------------------------------------

    const texture = new DynamicTexture(
      `explore3dBusinessBillboardTexture_${businessId}`,
      {
        width: 2048,
        height: 1024,
      },
      scene,
      true,
    );

    texture.hasAlpha = false;

    const context = texture.getContext() as CanvasRenderingContext2D;

    context.clearRect(0, 0, 2048, 1024);

    // -------------------------------------------------------
    // BACKGROUND
    // -------------------------------------------------------

    context.fillStyle = '#0b0b0b';

    context.fillRect(0, 0, 2048, 1024);

    // -------------------------------------------------------
    // OUTER BORDER
    // -------------------------------------------------------

    context.strokeStyle = '#ffffff';

    context.lineWidth = 14;

    context.strokeRect(20, 20, 2008, 984);

    // -------------------------------------------------------
    // INNER BORDER
    // -------------------------------------------------------

    context.strokeStyle = '#3a3a3a';

    context.lineWidth = 4;

    context.strokeRect(42, 42, 1964, 940);

    // -------------------------------------------------------
    // TOP BRAND BAR
    // -------------------------------------------------------

    context.fillStyle = '#ffffff';

    context.fillRect(60, 60, 1928, 115);

    context.fillStyle = '#111111';

    context.font = 'bold 58px Arial';

    context.textAlign = 'left';

    context.textBaseline = 'middle';

    context.fillText('SJ TUKLAS', 100, 118);

    context.font = 'bold 30px Arial';

    context.textAlign = 'right';

    context.fillText('FEATURED LOCAL BUSINESS', 1945, 118);

    // -------------------------------------------------------
    // IMAGE AREA
    // -------------------------------------------------------

    const imageX = 90;
    const imageY = 215;
    const imageWidth = 720;
    const imageHeight = 690;

    context.fillStyle = '#171717';

    this.roundRect(context, imageX, imageY, imageWidth, imageHeight, 28);

    context.fill();

    context.strokeStyle = '#444444';

    context.lineWidth = 5;

    this.roundRect(context, imageX, imageY, imageWidth, imageHeight, 28);

    context.stroke();

    // -------------------------------------------------------
    // BUSINESS IMAGE
    // -------------------------------------------------------

    const imageUrl = this.getBusinessImageUrl(business);

    if (imageUrl) {
      await this.drawBusinessImage(
        context,
        imageUrl,
        imageX,
        imageY,
        imageWidth,
        imageHeight,
      );
    } else {
      this.drawImagePlaceholder(
        context,
        imageX,
        imageY,
        imageWidth,
        imageHeight,
      );
    }

    // -------------------------------------------------------
    // RIGHT CONTENT
    // -------------------------------------------------------

    const contentX = 875;

    const contentWidth = 1080;

    // -------------------------------------------------------
    // EYEBROW
    // -------------------------------------------------------

    context.fillStyle = '#bdbdbd';

    context.font = 'bold 30px Arial';

    context.textAlign = 'left';

    context.textBaseline = 'top';

    context.fillText('DISCOVER IN SAN JOSE', contentX, 235);

    // -------------------------------------------------------
    // BUSINESS NAME
    // -------------------------------------------------------

    const businessName = this.getBusinessName(business);

    this.drawWrappedText(
      context,
      businessName,
      contentX,
      295,
      contentWidth,
      78,
      2,
      '#ffffff',
      'bold 70px Arial',
    );

    // -------------------------------------------------------
    // CATEGORY
    // -------------------------------------------------------

    const category = this.getCategory(business);

    context.fillStyle = '#bdbdbd';

    context.font = 'bold 34px Arial';

    context.textAlign = 'left';

    context.textBaseline = 'middle';

    context.fillText(category, contentX, 490);

    // -------------------------------------------------------
    // RATING
    // -------------------------------------------------------

    const rating = this.getRating(business);

    const reviewCount = this.getReviewCount(business);

    this.drawRating(context, contentX, 570, rating, reviewCount);

    // -------------------------------------------------------
    // BUSINESS TYPE
    // -------------------------------------------------------

    const businessType = String((business as any)?.businessType ?? '').trim();

    if (businessType) {
      context.fillStyle = '#eeeeee';

      context.font = 'bold 28px Arial';

      context.textAlign = 'left';

      context.textBaseline = 'middle';

      context.fillText(businessType, contentX, 670);
    }

    // -------------------------------------------------------
    // LOCATION
    // -------------------------------------------------------

    const location = this.getBusinessLocation(business);

    if (location) {
      context.fillStyle = '#bdbdbd';

      context.font = '28px Arial';

      context.textAlign = 'left';

      context.textBaseline = 'middle';

      this.drawWrappedText(
        context,
        `San Jose, Occidental Mindoro • ${location}`,
        contentX,
        735,
        contentWidth,
        42,
        2,
        '#bdbdbd',
        '28px Arial',
      );
    }

    // -------------------------------------------------------
    // BADGES
    // -------------------------------------------------------

    let badgeX = contentX;

    const badgeY = 825;

    if ((business as any)?.isPro === true) {
      badgeX = this.drawBadge(
        context,
        'PRO',
        badgeX,
        badgeY,
        '#ffffff',
        '#111111',
      );

      badgeX += 18;
    }

    if (
      (business as any)?.isVerified === true ||
      (business as any)?.verified === true
    ) {
      this.drawBadge(
        context,
        '✓ VERIFIED',
        badgeX,
        badgeY,
        '#eeeeee',
        '#111111',
      );
    }

    // -------------------------------------------------------
    // CTA
    // -------------------------------------------------------

    context.fillStyle = '#ffffff';

    context.font = 'bold 25px Arial';

    context.textAlign = 'right';

    context.textBaseline = 'bottom';

    context.fillText('EXPLORE LOCAL • SJ TUKLAS', 1945, 955);

    texture.update();

    // -------------------------------------------------------
    // MATERIAL
    // -------------------------------------------------------

    const material = new StandardMaterial(
      `explore3dBusinessBillboardMaterial_${businessId}`,
      scene,
    );

    material.diffuseTexture = texture;

    material.backFaceCulling = false;

    material.specularColor = new Color3(0, 0, 0);

    material.emissiveColor = new Color3(0.12, 0.12, 0.12);

    board.material = material;

    // -------------------------------------------------------
    // FRAME
    // -------------------------------------------------------

    this.createBillboardFrame(board);

    // -------------------------------------------------------
    // SAVE REFERENCES
    // -------------------------------------------------------

    this.billboard = board;

    this.texture = texture;

    this.material = material;

    console.log('[Explore3D Billboard] Created featured billboard:', {
      id: businessId,
      name: businessName,
      rating,
      reviews: reviewCount,
      image: imageUrl,
      x: this.billboardX,
      rotation: this.billboardRotationY,
    });
  }

  // =========================================================
  // BILLBOARD FRAME
  // =========================================================

  private createBillboardFrame(board: Mesh): void {
    if (!this.scene) {
      return;
    }

    const scene = this.scene;

    const frameMaterial = new StandardMaterial(
      'explore3dBillboardFrameMaterial',
      scene,
    );

    frameMaterial.diffuseColor = new Color3(0.025, 0.025, 0.025);

    frameMaterial.specularColor = new Color3(0, 0, 0);

    // -------------------------------------------------------
    // POSTS
    // -------------------------------------------------------

    const postHeight = 10;

    const postWidth = 0.65;

    const postZ = this.perimeterZ + 0.25;

    // -------------------------------------------------------
    // LEFT POST
    // -------------------------------------------------------

    const leftPost = MeshBuilder.CreateBox(
      'explore3dBillboardLeftPost',
      {
        width: postWidth,
        height: postHeight,
        depth: postWidth,
      },
      scene,
    );

    leftPost.position.set(
      this.billboardX - this.billboardWidth / 2 + 0.6,
      postHeight / 2,
      postZ,
    );

    leftPost.rotation.y = this.billboardRotationY;

    leftPost.material = frameMaterial;

    // -------------------------------------------------------
    // RIGHT POST
    // -------------------------------------------------------

    const rightPost = MeshBuilder.CreateBox(
      'explore3dBillboardRightPost',
      {
        width: postWidth,
        height: postHeight,
        depth: postWidth,
      },
      scene,
    );

    rightPost.position.set(
      this.billboardX + this.billboardWidth / 2 - 0.6,
      postHeight / 2,
      postZ,
    );

    rightPost.rotation.y = this.billboardRotationY;

    rightPost.material = frameMaterial;

    // -------------------------------------------------------
    // TOP FRAME
    // -------------------------------------------------------

    const topFrame = MeshBuilder.CreateBox(
      'explore3dBillboardTopFrame',
      {
        width: this.billboardWidth + 0.8,
        height: 0.45,
        depth: 0.5,
      },
      scene,
    );

    topFrame.position.set(
      this.billboardX,
      this.billboardY + this.billboardHeight / 2 + 0.1,
      postZ,
    );

    topFrame.rotation.y = this.billboardRotationY;

    topFrame.material = frameMaterial;

    // -------------------------------------------------------
    // BOTTOM FRAME
    // -------------------------------------------------------

    const bottomFrame = MeshBuilder.CreateBox(
      'explore3dBillboardBottomFrame',
      {
        width: this.billboardWidth + 0.8,
        height: 0.45,
        depth: 0.5,
      },
      scene,
    );

    bottomFrame.position.set(
      this.billboardX,
      this.billboardY - this.billboardHeight / 2 - 0.1,
      postZ,
    );

    bottomFrame.rotation.y = this.billboardRotationY;

    bottomFrame.material = frameMaterial;

    // -------------------------------------------------------
    // SAVE REFERENCES
    // -------------------------------------------------------

    this.leftPost = leftPost;

    this.rightPost = rightPost;

    this.billboardFrame = topFrame;

    void bottomFrame;

    console.log('[Explore3D Billboard] Frame created:', {
      x: this.billboardX,
      rotation: this.billboardRotationY,
    });
  }

  // =========================================================
  // FALLBACK BILLBOARD
  // =========================================================

  private createFallbackBillboard(): void {
    if (!this.scene) {
      return;
    }

    const scene = this.scene;

    const board = MeshBuilder.CreatePlane(
      'explore3dBusinessBillboardFallback',
      {
        width: this.billboardWidth,
        height: this.billboardHeight,
      },
      scene,
    );

    board.position.set(this.billboardX, this.billboardY, this.perimeterZ);

    board.rotation.y = this.billboardRotationY;

    const texture = new DynamicTexture(
      'explore3dBusinessBillboardFallbackTexture',
      {
        width: 2048,
        height: 1024,
      },
      scene,
      true,
    );

    const context = texture.getContext() as CanvasRenderingContext2D;

    context.fillStyle = '#0b0b0b';

    context.fillRect(0, 0, 2048, 1024);

    context.strokeStyle = '#ffffff';

    context.lineWidth = 14;

    context.strokeRect(25, 25, 1998, 974);

    context.fillStyle = '#ffffff';

    context.font = 'bold 86px Arial';

    context.textAlign = 'center';

    context.textBaseline = 'middle';

    context.fillText('SJ TUKLAS', 1024, 420);

    context.fillStyle = '#aaaaaa';

    context.font = 'bold 42px Arial';

    context.fillText('DISCOVER LOCAL BUSINESSES', 1024, 530);

    context.font = '32px Arial';

    context.fillText('San Jose, Occidental Mindoro', 1024, 610);

    texture.update();

    const material = new StandardMaterial(
      'explore3dBusinessBillboardFallbackMaterial',
      scene,
    );

    material.diffuseTexture = texture;

    material.backFaceCulling = false;

    material.specularColor = new Color3(0, 0, 0);

    board.material = material;

    this.billboard = board;

    this.texture = texture;

    this.material = material;

    this.createBillboardFrame(board);

    console.log('[Explore3D Billboard] Created fallback billboard.');
  }

  // =========================================================
  // BUSINESS IMAGE
  // =========================================================

  private getBusinessImageUrl(business: Business): string | null {
    const value =
      (business as any)?.image ??
      (business as any)?.profileImage ??
      (business as any)?.imageUrl ??
      (business as any)?.profileImageUrl ??
      (business as any)?.coverImage ??
      (business as any)?.coverImageUrl ??
      null;

    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    return value.trim();
  }

  private async drawBusinessImage(
    context: CanvasRenderingContext2D,
    imageUrl: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<void> {
    try {
      const image = new Image();

      image.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();

        image.onerror = () =>
          reject(new Error('Failed to load business image.'));

        image.src = imageUrl;
      });

      context.save();

      // -----------------------------------------------------
      // Rounded clipping
      // -----------------------------------------------------

      this.roundRect(context, x, y, width, height, 28);

      context.clip();

      // -----------------------------------------------------
      // Cover crop
      // -----------------------------------------------------

      const imageRatio = image.width / image.height;

      const boxRatio = width / height;

      let sourceWidth = image.width;

      let sourceHeight = image.height;

      let sourceX = 0;

      let sourceY = 0;

      if (imageRatio > boxRatio) {
        sourceWidth = image.height * boxRatio;

        sourceX = (image.width - sourceWidth) / 2;
      } else {
        sourceHeight = image.width / boxRatio;

        sourceY = (image.height - sourceHeight) / 2;
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        x,
        y,
        width,
        height,
      );

      context.restore();
    } catch (error) {
      console.warn(
        '[Explore3D Billboard] Business image failed:',
        imageUrl,
        error,
      );

      this.drawImagePlaceholder(context, x, y, width, height);
    }
  }

  // =========================================================
  // IMAGE PLACEHOLDER
  // =========================================================

  private drawImagePlaceholder(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    context.save();

    this.roundRect(context, x, y, width, height, 28);

    context.clip();

    context.fillStyle = '#202020';

    context.fillRect(x, y, width, height);

    context.fillStyle = '#777777';

    context.font = 'bold 42px Arial';

    context.textAlign = 'center';

    context.textBaseline = 'middle';

    context.fillText('LOCAL BUSINESS', x + width / 2, y + height / 2);

    context.restore();
  }

  // =========================================================
  // RATING
  // =========================================================

  private drawRating(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    rating: number,
    reviewCount: number,
  ): void {
    const safeRating = Math.max(
      0,
      Math.min(5, Number.isFinite(rating) ? rating : 0),
    );

    // -------------------------------------------------------
    // Stars
    // -------------------------------------------------------

    context.textAlign = 'left';

    context.textBaseline = 'middle';

    context.font = 'bold 48px Arial';

    context.fillStyle = '#ffffff';

    const stars = this.getStarString(safeRating);

    context.fillText(stars, x, y);

    // -------------------------------------------------------
    // Numeric rating
    // -------------------------------------------------------

    const starWidth = context.measureText(stars).width;

    context.font = 'bold 46px Arial';

    context.fillStyle = '#ffffff';

    context.fillText(
      safeRating > 0 ? safeRating.toFixed(1) : 'New',
      x + starWidth + 28,
      y,
    );

    // -------------------------------------------------------
    // Review count
    // -------------------------------------------------------

    const ratingText =
      safeRating > 0
        ? `from ${reviewCount.toLocaleString()} ${
            reviewCount === 1 ? 'review' : 'reviews'
          }`
        : 'No reviews yet';

    context.fillStyle = '#aaaaaa';

    context.font = '30px Arial';

    const numericWidth = context.measureText(
      safeRating > 0 ? safeRating.toFixed(1) : 'New',
    ).width;

    context.fillText(ratingText, x + starWidth + numericWidth + 55, y);
  }

  // =========================================================
  // STAR STRING
  // =========================================================

  private getStarString(rating: number): string {
    const rounded = Math.round(rating);

    if (rounded <= 0) {
      return '☆ ☆ ☆ ☆ ☆';
    }

    return Array.from({ length: 5 }, (_, index) =>
      index < rounded ? '★' : '☆',
    ).join(' ');
  }

  // =========================================================
  // BADGE
  // =========================================================

  private drawBadge(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    background: string,
    foreground: string,
  ): number {
    context.font = 'bold 27px Arial';

    const paddingX = 24;

    const width = context.measureText(text).width + paddingX * 2;

    const height = 52;

    context.fillStyle = background;

    this.roundRect(context, x, y, width, height, 26);

    context.fill();

    context.fillStyle = foreground;

    context.textAlign = 'center';

    context.textBaseline = 'middle';

    context.fillText(text, x + width / 2, y + height / 2);

    return x + width;
  }

  // =========================================================
  // WRAPPED TEXT
  // =========================================================

  private drawWrappedText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
    color: string,
    font: string,
  ): void {
    context.fillStyle = color;

    context.font = font;

    context.textAlign = 'left';

    context.textBaseline = 'top';

    const words = text.trim().split(/\s+/);

    const lines: string[] = [];

    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      const width = context.measureText(testLine).width;

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);

        currentLine = word;

        if (lines.length >= maxLines) {
          break;
        }
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    lines.forEach((line, index) => {
      context.fillText(line, x, y + index * lineHeight);
    });
  }

  // =========================================================
  // ROUNDED RECTANGLE
  // =========================================================

  private roundRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const r = Math.min(radius, width / 2, height / 2);

    context.beginPath();

    context.moveTo(x + r, y);

    context.lineTo(x + width - r, y);

    context.quadraticCurveTo(x + width, y, x + width, y + r);

    context.lineTo(x + width, y + height - r);

    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);

    context.lineTo(x + r, y + height);

    context.quadraticCurveTo(x, y + height, x, y + height - r);

    context.lineTo(x, y + r);

    context.quadraticCurveTo(x, y, x + r, y);

    context.closePath();
  }

  // =========================================================
  // BUSINESS DATA HELPERS
  // =========================================================

  private getBusinessName(business: Business): string {
    return String((business as any)?.name ?? 'Local Business').trim();
  }

  private getCategory(business: Business): string {
    return String((business as any)?.category ?? 'Business').trim();
  }

  private getRating(business: Business): number {
    const rating = Number((business as any)?.rating ?? 0);

    return Number.isFinite(rating) ? rating : 0;
  }

  private getReviewCount(business: Business): number {
    const count = Number(
      (business as any)?.reviews ??
        (business as any)?.reviewCount ??
        (business as any)?.totalReviews ??
        0,
    );

    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  private getBusinessLocation(business: Business): string {
    return String(
      (business as any)?.location ?? (business as any)?.barangay ?? '',
    ).trim();
  }

  // =========================================================
  // CLEAR
  // =========================================================

  clear(): void {
    if (this.billboardFrame && !this.billboardFrame.isDisposed()) {
      this.billboardFrame.dispose();
    }

    if (this.leftPost && !this.leftPost.isDisposed()) {
      this.leftPost.dispose();
    }

    if (this.rightPost && !this.rightPost.isDisposed()) {
      this.rightPost.dispose();
    }

    if (this.billboard && !this.billboard.isDisposed()) {
      this.billboard.dispose();
    }

    if (this.material) {
      this.material.dispose();
    }

    if (this.texture) {
      this.texture.dispose();
    }

    this.billboard = undefined;

    this.billboardFrame = undefined;

    this.leftPost = undefined;

    this.rightPost = undefined;

    this.texture = undefined;

    this.material = undefined;
  }

  // =========================================================
  // DISPOSE
  // =========================================================

  dispose(): void {
    this.clear();

    this.scene = undefined;
  }
}
