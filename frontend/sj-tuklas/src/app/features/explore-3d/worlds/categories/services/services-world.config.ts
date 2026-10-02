import { BUSINESS_CATEGORIES } from '../../../../../core/data/business-category.data';
import type { Explore3dWorldConfig } from '../../../models/explore3d-world.types';

export const SERVICES_WORLD_ID = 'services';

export function getServicesWorldConfig(): Explore3dWorldConfig {
  const category = BUSINESS_CATEGORIES.find(
    (item) => item.id === SERVICES_WORLD_ID,
  );

  if (!category) {
    throw new Error('Services category was not found.');
  }

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    types: category.types,
    groundColor: '#71866b',
    roadColor: '#343b42',
  };
}
