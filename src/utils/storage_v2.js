const KEYS = {
  SHOPS: 'inventory_v2_shops',
  CATEGORIES: 'inventory_v2_categories',
  MODELS: 'inventory_v2_models',
  INVENTORY: 'inventory_v2_data' // stores quantities
};

const defaultShops = [
  { id: 'shop_1', name: 'Shop 1' },
  { id: 'shop_2', name: 'Shop 2' }
];

const defaultCategories = [];

export const getShops = () => {
  const data = localStorage.getItem(KEYS.SHOPS);
  return data ? JSON.parse(data) : defaultShops;
};

export const saveShops = (shops) => {
  localStorage.setItem(KEYS.SHOPS, JSON.stringify(shops));
};

export const getCategories = () => {
  const data = localStorage.getItem(KEYS.CATEGORIES);
  return data ? JSON.parse(data) : defaultCategories;
};

export const saveCategories = (cats) => {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats));
};

export const getModels = () => {
  // model shape: { id, sku, name, categoryId, colors: ['Black', 'White'] }
  const data = localStorage.getItem(KEYS.MODELS);
  return data ? JSON.parse(data) : [];
};

export const saveModels = (models) => {
  localStorage.setItem(KEYS.MODELS, JSON.stringify(models));
};

export const getInventory = () => {
  // inventory shape: { [modelId]: { [locationId]: { [color]: qty } } }
  // locationId is shop.id OR 'warehouse'
  const data = localStorage.getItem(KEYS.INVENTORY);
  return data ? JSON.parse(data) : {};
};

export const saveInventory = (inv) => {
  localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inv));
};

// Helper function to resize image for local storage to prevent quota limits
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
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
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
