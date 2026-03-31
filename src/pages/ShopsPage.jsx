import React, { useState, useEffect } from 'react';
import { getShops, saveShops, getModels, getShopStock, SIZES_LIST } from '../utils/storage_v3';
import { Plus, X, Store, AlertCircle } from 'lucide-react';

export default function ShopsPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [shops, setShops] = useState([]);
  const [models, setModels] = useState([]);
  const [shopStock, setShopStock] = useState({});
  const [activeShop, setActiveShop] = useState(null);
  
  const [newShopName, setNewShopName] = useState('');
  const [isAddShopMode, setIsAddShopMode] = useState(false);

  useEffect(() => {
    setShops(getShops());
    setModels(getModels());
    setShopStock(getShopStock());
  }, []);

  const handleCreateShop = (e) => {
    e.preventDefault();
    if (!newShopName) return;
    const s = [...shops, { id: 'shop_' + Date.now(), name: newShopName }];
    setShops(s);
    saveShops(s);
    setNewShopName('');
    setIsAddShopMode(false);
  };

  const handleDeleteShop = (e, shop) => {
    e.stopPropagation();
    if (window.confirm(`Are you absolutely sure you want to permanently delete ${shop.name}? All distributed inventory mapped to this location will be orphaned!`)) {
      const s = shops.filter(x => x.id !== shop.id);
      setShops(s);
      saveShops(s);
      
      // We don't necessarily delete the shopStock mapping to prevent complete data destruction on accidental deletion,
      // but the shop is gone. 
    }
  };

  if (activeShop) {
    // Generate the view for this specifically allocated shop
    // Only show models that physically have > 0 stock allocated to this shop in any size/color
    
    const assignedModels = [];
    
    models.forEach(m => {
      let hasAnyStockInShop = false;
      const thisModelStock = shopStock[m.id]?.[activeShop.id] || {};
      
      // Calculate total holding for this shop to see if we should render the card
      Object.keys(thisModelStock).forEach(colorName => {
        Object.values(thisModelStock[colorName]).forEach(qty => {
          if (qty > 0) hasAnyStockInShop = true;
        });
      });
      
      if (hasAnyStockInShop) assignedModels.push(m);
    });

    return (
      <div className="page" style={{ animation: 'none', paddingBottom: 100 }}>
        <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
          <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={() => setActiveShop(null)}>Back</button>
          <div style={{ textAlign: 'right' }}>
            <h1 className="title-gradient" style={{ fontSize: '1.4rem' }}>{activeShop.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Location Overview</p>
          </div>
        </header>

        {assignedModels.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 100, color: 'var(--text-muted)' }}>
             <Store size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
             <p>This shop is completely empty.</p>
             <p style={{ fontSize: '0.85rem' }}>Assign stock to this location from the <strong>Master Inventory</strong> page.</p>
          </div>
        ) : (
          assignedModels.map(model => {
            const mStock = shopStock[model.id]?.[activeShop.id] || {};
            
            // Calculate total items assigned to this specific shop globally for this model
            let totalItemsInShop = 0;
            Object.values(mStock).forEach(cMap => {
              Object.values(cMap).forEach(q => totalItemsInShop += q);
            });

            return (
              <div key={model.id} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>#{model.sku}</span> {model.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{totalItemsInShop} pcs held</div>
                </div>
                
                <div style={{ padding: 20 }}>
                  {model.colors.map(colorObj => {
                    const colorStock = mStock[colorObj.name] || {};
                    // if this shop has 0 of this color completely, hide the color block
                    let totalOfThisColor = 0;
                    Object.values(colorStock).forEach(q => totalOfThisColor += q);
                    if (totalOfThisColor === 0) return null;

                    return (
                      <div key={colorObj.name} style={{ marginBottom: 20 }}>
                         <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>{colorObj.name} Variations</div>
                         
                         <div style={{ display: 'grid', gap: 8 }}>
                            {colorObj.sizes.map(size => {
                              const qty = colorStock[size] || 0;
                              if (qty === 0) return null; // Don't show sizes this shop doesn't have
                              
                              const isLowStock = qty <= 2;

                              return (
                                <div key={size} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLowStock ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 12, border: isLowStock ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent' }}>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', width: 32 }}>{size}</span>
                                      {isLowStock && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: 8 }}>
                                          <AlertCircle size={12}/> Low Restock Needed
                                        </span>
                                      )}
                                   </div>
                                   <div style={{ fontWeight: 800, fontSize: '1.2rem', color: isLowStock ? 'var(--danger)' : 'var(--primary)' }}>
                                      {qty} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>pcs</span>
                                   </div>
                                </div>
                              )
                            })}
                         </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
       <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
        <div>
          <h1 className="title-gradient">Locations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage physical storefronts.</p>
        </div>
        <button className="btn-secondary" style={{ background: isEditMode ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setIsEditMode(!isEditMode)}>
          Edit
        </button>
      </header>

      {isEditMode && (
        <button className="btn-primary" style={{ width: '100%', marginBottom: 20 }} onClick={() => setIsAddShopMode(true)}>
          <Plus size={20} /> Register New Location
        </button>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {shops.map(shop => {
          // Calculate global distribution to this shop to show on the tile
          let globalItemsCount = 0;
          Object.values(shopStock).forEach(modelMap => {
             const mStock = modelMap[shop.id] || {};
             Object.values(mStock).forEach(colorMap => {
               Object.values(colorMap).forEach(qty => globalItemsCount += qty);
             });
          });

          return (
            <div key={shop.id} className="card" onClick={() => !isEditMode && setActiveShop(shop)} style={{ marginBottom: 0, padding: 20, display: 'flex', alignItems: 'center', cursor: isEditMode ? 'default' : 'pointer' }}>
               <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                 <Store size={24} color="var(--primary)" />
               </div>
               <div style={{ flex: 1 }}>
                 <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 4 }}>{shop.name}</div>
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{globalItemsCount} items currently assigned</div>
               </div>
               
               {isEditMode ? (
                  <button style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: 12, borderRadius: 12, color: 'var(--danger)' }} onClick={(e) => handleDeleteShop(e, shop)}>
                    <X size={20} />
                  </button>
               ) : (
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: 20, fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    Enter
                  </div>
               )}
            </div>
          )
        })}
      </div>

      {isAddShopMode && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setIsAddShopMode(false)}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2>Add New Location</h2>
              <button onClick={() => setIsAddShopMode(false)}><X size={24} color="var(--text-muted)"/></button>
            </div>
            <form onSubmit={handleCreateShop}>
              <div className="form-group">
                <label className="form-label">Location / Shop Name</label>
                <input type="text" className="input-field" autoFocus placeholder="e.g. Downtown Store" value={newShopName} onChange={e => setNewShopName(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Register</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
