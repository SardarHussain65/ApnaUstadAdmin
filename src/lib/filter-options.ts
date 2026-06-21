import { useMemo } from 'react';
import { useCategories, useAdminCities } from '@/lib/api-hooks';

export const useCategoryFilterOptions = () => {
  const { data: categories = [], isLoading } = useCategories({ limit: 100, active: true });
  const options = useMemo(
    () => categories.map((category) => ({ value: category.name, label: category.name })),
    [categories]
  );
  return { options, isLoading };
};

export const useCityFilterOptions = () => {
  const { data: cities = [], isLoading } = useAdminCities();
  const options = useMemo(
    () => cities.map((city) => ({ value: city, label: city })),
    [cities]
  );
  return { options, isLoading };
};
