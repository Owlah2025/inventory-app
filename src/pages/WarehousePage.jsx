import React, { useState, useEffect } from 'react';
import { getModels, getMasterStock, getShopStock } from '../utils/storage_v3';
import { Box, AlertCircle, PackageOpen } from 'lucide-react';

export default function WarehousePage() {
  const [models, setModels] = useState([]);
  const [masterStock, setMasterStock] = useState({});
  const [shopStock, setShopStock] = useState({});

  useEffect(() => {
    setModels(getModels());
    setMasterStock(getMasterStock());
    setShopStock(getShopStock());
  }, []);

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
       <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
        <div>
          <h1 className="title-gradient">Warehouse Hub</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Live un-distributed master stock remaining.</p>
        </div>
      </header>

      {models.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 100, color: 'var(--text-muted)' }}>
          <PackageOpen size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 16 }} />
          <p>Warehouse is currently completely empty.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {models.map(model => {
            const mStock = masterStock[model.id] || {};
            const sStockMap = shopStock[model.id] || {};
            
            // Calculate total remaining in warehouse globally for this model to see if we render it
            let hasAnyWarehouseStockRemaining = false;
            let totalRemaining = 0;

            model.colors.forEach(c => {
               c.sizes.forEach(s => {
                  const initialQty = mStock[c.name]?.[s] || 0;
                  if (initialQty > 0) hasAnyWarehouseStockRemaining = true;
                  
                  let distributed = 0;
                  Object.values(sStockMap).forEach(shop => {
                     distributed += (shop[c.name]?.[s] || 0);
                  });
                  totalRemaining += (initialQty - distributed);
               });
            });

            if (!hasAnyWarehouseStockRemaining) return null;

            return (
              <div key={model.id} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
                <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                     <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>#{model.sku}</span> {model.name}
                   </div>
                   <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{totalRemaining} total pcs</div>
                </div>

                <div style={{ padding: 20 }}>
                  {model.colors.map(colorObj => {
                     // Check if this specific color had any initial master stock at all
                     let colorHasAnyMaster = false;
                     colorObj.sizes.forEach(s => {
                        if ((mStock[colorObj.name]?.[s] || 0) > 0) colorHasAnyMaster = true;
                     });

                     if (!colorHasAnyMaster) return null;

                     return (
                        <div key={colorObj.name} style={{ marginBottom: 20 }}>
                           <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>{colorObj.name} Variations</div>
                           <div style={{ display: 'grid', gap: 8 }}>
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
                                    <div key={size} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLowStock ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 12, border: isLowStock ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent' }}>
                                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', width: 32 }}>{size}</span>
                                          {isLowStock && (
                                             <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: 8 }}>
                                               <AlertCircle size={12}/> Critical: Supplier Reorder Needed
                                             </span>
                                          )}
                                       </div>
                                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: isLowStock ? 'var(--danger)' : 'var(--primary)' }}>
                                             {warehouseQty} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>left</span>
                                          </span>
                                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(from init: {masterQty})</span>
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
    </div>
  )
}
