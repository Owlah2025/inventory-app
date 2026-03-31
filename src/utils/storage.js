const KEYS = {
  SHOPS: 'inventory_shops',
  MODELS: 'inventory_models',
  DISTRIBUTIONS: 'inventory_distributions'
};

const defaultShops = [
  { id: '1', name: 'Shop 1' },
  { id: '2', name: 'Shop 2' }
];

export const getShops = () => {
  const data = localStorage.getItem(KEYS.SHOPS);
  return data ? JSON.parse(data) : defaultShops;
};

export const saveShops = (shops) => {
  localStorage.setItem(KEYS.SHOPS, JSON.stringify(shops));
};

export const getModels = () => {
  const data = localStorage.getItem(KEYS.MODELS);
  return data ? JSON.parse(data) : [];
};

export const saveModels = (models) => {
  localStorage.setItem(KEYS.MODELS, JSON.stringify(models));
};

export const getDistributions = () => {
  // distribution format: { [modelId]: { [shopId]: quantity } }
  const data = localStorage.getItem(KEYS.DISTRIBUTIONS);
  return data ? JSON.parse(data) : {};
};

export const saveDistributions = (distributions) => {
  localStorage.setItem(KEYS.DISTRIBUTIONS, JSON.stringify(distributions));
};
