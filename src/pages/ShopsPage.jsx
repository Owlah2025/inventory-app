import React, { useState, useEffect } from 'react';
import { getShops, saveShops, getModels, getInventory, saveInventory } from '../utils/storage_v2';
import { Plus, X, Store, Minus, Trash2 } from 'lucide-react';

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [models, setModels] = useState([]);
  const [inventory, setInventory] = useState({});
  const [isAddMode, setIsAddMode] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  
  const [selectedShop, setSelectedShop] = useState(null);

  useEffect(() => {
    setShops(getShops());
    setModels(getModels());
    setInventory(getInventory());
  }, []);

  const handleAddShop = (e) => {
    e.preventDefault();
    if (!newShopName) return;
    const newShops = [...shops, { id: 'shop_' + Date.now().toString(), name: newShopName }];
    setShops(newShops);
    saveShops(newShops);
    setIsAddMode(false);
    setNewShopName('');
  };

  const getShopInventoryDetails = (shopId) => {
    const grouped = [];
    models.forEach(model => {
      const shopInv = inventory[model.id]?.[shopId];
      if (shopInv) {
        const colorsInShop = [];
        Object.entries(shopInv).forEach(([color, qty]) => {
          if (qty > 0) colorsInShop.push({ color, qty });
        });
        if (colorsInShop.length > 0) {
          grouped.push({ model, colors: colorsInShop });
        }
      }
    });
    return grouped;
  };

  const calculateTotalInShop = (grouped) => {
    let total = 0;
    grouped.forEach(g => {
      g.colors.forEach(c => total += c.qty);
    });
    return total;
  };

  const removeFromShop = (modelId, color, shopId) => {
    const inv = { ...inventory };
    if (inv[modelId] && inv[modelId][shopId]) {
      inv[modelId][shopId][color] = 0;
      setInventory(inv);
      saveInventory(inv);
    }
  };

  const adjustQty = (modelId, color, shopId, increment) => {
    const inv = { ...inventory };
    if (!inv[modelId]) inv[modelId] = {};
    if (!inv[modelId][shopId]) inv[modelId][shopId] = {};
    
    const current = inv[modelId][shopId][color] || 0;
    const next = Math.max(0, current + increment);
    inv[modelId][shopId][color] = next;
    
    setInventory(inv);
    saveInventory(inv);
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
        <div>
          <h1 className="title-gradient">Shops</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tap a shop to view its stock.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAddMode(true)}>
          <Plus size={20} />
          Add Shop
        </button>
      </header>

      {shops.map(shop => {
        const details = getShopInventoryDetails(shop.id);
        const totalItemsInShop = calculateTotalInShop(details);
        
        return (
          <div key={shop.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => setSelectedShop(shop)}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: 12, borderRadius: 12 }}>
              <Store size={24} color="var(--primary)" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="card-title">{shop.name}</div>
              <div className="card-subtitle">{details.length} models ({totalItemsInShop} pieces)</div>
            </div>
          </div>
        );
      })}

      {/* Add Shop Modal */}
      {isAddMode && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setIsAddMode(false)}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2>Add New Shop</h2>
              <button onClick={() => setIsAddMode(false)}><X size={24} color="var(--text-muted)"/></button>
            </div>
            <form onSubmit={handleAddShop}>
              <div className="form-group">
                <label className="form-label">Shop Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  autoFocus 
                  placeholder="e.g. Downtown Store"
                  value={newShopName} 
                  onChange={e => setNewShopName(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Save Shop</button>
            </form>
          </div>
        </div>
      )}

      {/* Shop Details Modal */}
      {selectedShop && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setSelectedShop(null)}>
          <div className="modal-content" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2>{selectedShop.name}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Grouped Inventory</p>
              </div>
              <button onClick={() => setSelectedShop(null)}><X size={24} color="var(--text-muted)"/></button>
            </div>

            <div style={{ marginBottom: 24 }}>
              {getShopInventoryDetails(selectedShop.id).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  No items assigned to this shop yet.
                </div>
              ) : (
                getShopInventoryDetails(selectedShop.id).map(({ model, colors }) => (
                  <div key={model.id} className="card" style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{model.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>SKU: {model.sku}</div>
                    
                    {colors.map(({ color, qty }) => (
                      <div key={color} className="dist-row" style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.95rem' }}>{color}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="stepper" style={{ padding: '0 4px' }}>
                            <button type="button" className="stepper-btn" onClick={() => adjustQty(model.id, color, selectedShop.id, -1)}><Minus size={16}/></button>
                            <input 
                              type="number" 
                              style={{ width: 45, textAlign: 'center', background: 'transparent', border: 'none', color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem', outline: 'none' }}
                              value={qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value || 0, 10);
                                if (!isNaN(val)) adjustQty(model.id, color, selectedShop.id, val - qty);
                              }}
                            />
                            <button type="button" className="stepper-btn" onClick={() => adjustQty(model.id, color, selectedShop.id, 1)}><Plus size={16}/></button>
                          </div>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to completely remove the ${color} ${model.name} from this shop?`)) {
                                removeFromShop(model.id, color, selectedShop.id);
                              }
                            }} 
                            style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            
            <button className="btn-secondary" style={{ width: '100%', marginTop: 'auto' }} onClick={() => setSelectedShop(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
