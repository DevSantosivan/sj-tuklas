import { BusinessType } from '../../../core/data/business-category.data';

export interface Explore3dWorldConfig {
  id: string;
  name: string;
  description: string;
  types: BusinessType[];
  groundColor?: string;
  roadColor?: string;
}

export interface Explore3dWorldPosition {
  x: number;
  z: number;
}

export interface Explore3dBuildingSelection {
  categoryId: string;
  categoryName: string;
  typeId: string;
  typeName: string;
}

export interface Explore3dWorldBuildResult {
  rootName: string;
  buildingCount: number;
}
