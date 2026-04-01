import React, { useState, useEffect } from 'react';
import { getModels, getMasterStock, getShopStock, getShops, saveShopStock } from '../utils/storage_v3';
import { Box, AlertCircle, PackageOpen, Settings2, Eye, Image as ImageIcon, X } from 'lucide-react';

export default function WarehousePage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [models, setModels] = useState([]);
  const [shops, setShops] = useState([]);
  const [masterStock, setMasterStock] = useState({});
  const [shopStock, setShopStock] = useState({});
  
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    setModels(getModels());
    setShops(getShops());
    setMasterStock(getMasterStock());
    setShopStock(getShopStock());
  }, []);

  const updateShopDistribution = (modelId, color, size, shopId, val) => {
    const v = parseInt(val || 0, 10);
    
    // Check if we exceed master
    const masterQty = masterStock[modelId]?.[color]?.[size] || 0;
    
    const currentShopStock = shopStock;
    let otherShopsTotal = 0;
    
    // Sum everything EXCEPT the shop we are currently editing
    if (currentShopStock[modelId]) {
      Object.keys(currentShopStock[modelId]).forEach(sid => {
        if (sid !== shopId) {
          otherShopsTotal += (currentShopStock[modelId]?.[sid]?.[color]?.[size] || 0);
        }
      });
    }
    
    if (otherShopsTotal + v > masterQty) {
      alert(`Cannot assign ${v}. Only ${masterQty - otherShopsTotal} pieces left in Inventory!`);
      return;
    }

    const newShopStock = { ...currentShopStock };
    if (!newShopStock[modelId]) newShopStock[modelId] = {};
    if (!newShopStock[modelId][shopId]) newShopStock[modelId][shopId] = {};
    if (!newShopStock[modelId][shopId][color]) newShopStock[modelId][shopId][color] = {};
    
    newShopStock[modelId][shopId][color][size] = v;
    setShopStock(newShopStock);
    saveShopStock(newShopStock);
  };

  const ImageViewer = () => {
    if (!viewingImage) return null;
    return (
      <div className="modal-overlay" onClick={() => setViewingImage(null)}>
        <div style={{ background: '#000', padding: 12, borderRadius: 16, position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button style={{ position: 'absolute', top: -40, right: 0, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setViewingImage(null)}>
            <X size={32} />
          </button>
          <img src={viewingImage} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, objectFit: 'contain' }} alt="Model Photo" />
        </div>
      </div>
    );
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
       <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
        <div>
          <h1 className="title-gradient">Distribution</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Assign available inventory into shops.</p>
        </div>
        <button 
          className="btn-secondary" 
          style={{ width: 44, height: 44, padding: 0, borderRadius: '50%', background: isEditMode ? 'var(--primary)' : 'rgba(255,255,255,0.1)', border: 'none' }}
          onClick={() => setIsEditMode(!isEditMode)}
        >
          {isEditMode ? <Settings2 size={20} color="#fff" /> : <Eye size={20} color="var(--text-muted)" />}
        </button>
      </header>

      {isEditMode && (
       <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed var(--primary)', padding: 12, borderRadius: 8, marginBottom: 20, color: 'var(--primary-hover)', fontSize: '0.9rem', textAlign: 'center' }}>
         Distribution Mode Active. Modify shop allocations here!
       </div>
      )}

      {models.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 100, color: 'var(--text-muted)' }}>
          <PackageOpen size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 16 }} />
          <p>Inventory is completely empty.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {models.map(model => {
            const mStock = masterStock[model.id] || {};
            const sStockMap = shopStock[model.id] || {};
            
            let hasAnyMasterStock = false;
            let totalRemaining = 0;

            model.colors.forEach(c => {
               c.sizes.forEach(s => {
                  const initialQty = mStock[c.name]?.[s] || 0;
                  if (initialQty > 0) hasAnyMasterStock = true;
                  
                  let distributed = 0;
                  Object.values(sStockMap).forEach(shop => {
                     distributed += (shop[c.name]?.[s] || 0);
                  });
                  totalRemaining += (initialQty - distributed);
               });
            });

            if (!hasAnyMasterStock) return null;

            return (
              <div key={model.id} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
                <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                     {model.image && (
                        <div onClick={(e) => { e.stopPropagation(); setViewingImage(model.image); }} style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                          <img src={model.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={model.name} />
                        </div>
                     )}
                     <div>
                       <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>#{model.sku}</span> {model.name}
                     </div>
                   </div>
                   <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{totalRemaining} available</div>
                </div>

                <div style={{ padding: 20 }}>
                  {model.colors.map(colorObj => {
                     let colorHasAnyMaster = false;
                     colorObj.sizes.forEach(s => {
                        if ((mStock[colorObj.name]?.[s] || 0) > 0) colorHasAnyMaster = true;
                     });

                     if (!colorHasAnyMaster) return null;

                     return (
                        <div key={colorObj.name} style={{ marginBottom: 20 }}>
                           <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>{colorObj.name} Variations</div>
                           <div style={{ display: 'grid', gap: 16 }}>
                              {colorObj.sizes.map(size => {
                                 const masterQty = mStock[colorObj.name]?.[size] || 0;
                                 if (masterQty === 0) return null; // Unused size 
                                 
                                 let distributedForSize = 0;
                                 Object.values(sStockMap).forEach(shopMap => {
                                    distributedForSize += (shopMap[colorObj.name]?.[size] || 0);
                                 });

                                 const warehouseQty = masterQty - distributedForSize;
                                 const isLowStock = warehouseQty <= 2;

                                 return (
                                    <div key={size} style={{ background: isLowStock ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: isLowStock ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent' }}>
                                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                             <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', width: 32 }}>{size}</span>
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                             <span style={{ fontWeight: 800, fontSize: '1.2rem', color: isLowStock ? 'var(--danger)' : 'var(--primary)' }}>
                                                {warehouseQty} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>available to assign</span>
                                             </span>
                                             <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(from total: {masterQty})</span>
                                          </div>
                                       </div>

                                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                         {shops.map(shop => {
                                           const sQty = sStockMap[shop.id]?.[colorObj.name]?.[size] || 0;
                                           return (
                                             <div key={shop.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{shop.name}</span>
                                                {isEditMode ? (
                                                  <input 
                                                    type="number"
                                                    style={{ width: 45, background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border-color)', outline: 'none', color: '#fff', textAlign: 'right', fontWeight: 'bold' }}
                                                    value={sQty}
                                                    onChange={(e) => updateShopDistribution(model.id, colorObj.name, size, shop.id, e.target.value)}
                                                  />
                                                ) : (
                                                  <span style={{ fontWeight: 800, color: '#fff' }}>{sQty}</span>
                                                )}
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
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ImageViewer />
    </div>
  )
}
