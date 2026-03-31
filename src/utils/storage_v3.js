const KEYS = {
  SHOPS: 'inventory_v3_shops',
  CATEGORIES: 'inventory_v3_categories',
  MODELS: 'inventory_v3_models',
  MASTER_STOCK: 'inventory_v3_master', // Total manufacturer stock ever bought
  SHOP_STOCK: 'inventory_v3_distributions' // Distributed chunks
};

const defaultShops = [
  { id: 'shop_1', name: 'Shop 1' },
  { id: 'shop_2', name: 'Shop 2' }
];

export const getShops = () => {
  const data = localStorage.getItem(KEYS.SHOPS);
  return data ? JSON.parse(data) : defaultShops;
};

export const saveShops = (shops) => {
  localStorage.setItem(KEYS.SHOPS, JSON.stringify(shops));
};

export const getCategories = () => {
  const data = localStorage.getItem(KEYS.CATEGORIES);
  return data ? JSON.parse(data) : [];
};

export const saveCategories = (cats) => {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats));
};

export const getModels = () => {
  // model shape: { id, sku, name, categoryId, colors: [ { name: 'Black', sizes: ['S', 'M'] } ] }
  const data = localStorage.getItem(KEYS.MODELS);
  return data ? JSON.parse(data) : [];
};

export const saveModels = (models) => {
  localStorage.setItem(KEYS.MODELS, JSON.stringify(models));
};

export const getMasterStock = () => {
  // { [modelId]: { [color]: { [size]: qty } } }
  const data = localStorage.getItem(KEYS.MASTER_STOCK);
  return data ? JSON.parse(data) : {};
};

export const saveMasterStock = (inv) => {
  localStorage.setItem(KEYS.MASTER_STOCK, JSON.stringify(inv));
};

export const getShopStock = () => {
  // { [modelId]: { [shopId]: { [color]: { [size]: qty } } } }
  const data = localStorage.getItem(KEYS.SHOP_STOCK);
  return data ? JSON.parse(data) : {};
};

export const saveShopStock = (inv) => {
  localStorage.setItem(KEYS.SHOP_STOCK, JSON.stringify(inv));
};

export const SIZES_LIST = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

// Helper to calculate unassigned (warehouse) inventory
export const getWarehouseStock = (modelId, color, size) => {
  const master = getMasterStock()[modelId]?.[color]?.[size] || 0;
  let distributed = 0;
  
  const allShops = getShopStock()[modelId] || {};
  Object.values(allShops).forEach(shopMap => {
    distributed += (shopMap[color]?.[size] || 0);
  });
  
  return master - distributed;
};

export const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  });
};
