import React, { useState, useEffect, useRef } from 'react';
import { getCategories, saveCategories, getModels, saveModels, getShops, getMasterStock, saveMasterStock, getShopStock, saveShopStock, getWarehouseStock, SIZES_LIST, compressImage } from '../utils/storage_v3';
import { Plus, X, Settings2, Eye, Camera, Tag, Palette, ShieldCheck, Box, PackageOpen, ChevronRight, Trash2 } from 'lucide-react';

export default function ModelsPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [shops, setShops] = useState([]);
  const [masterStock, setMasterStock] = useState({});
  const [shopStock, setShopStock] = useState({});
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  
  const [isAddCategoryMode, setIsAddCategoryMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState(null);
  
  const [isAddModelMode, setIsAddModelMode] = useState(false);
  const [newModelData, setNewModelData] = useState({ name: '', sku: '', colors: [] });
  const [colorInput, setColorInput] = useState('');
  const [newModelStock, setNewModelStock] = useState({}); // { [color]: { [size]: qty } }
  
  const [isInjectingColor, setIsInjectingColor] = useState(false);
  const [injectColorName, setInjectColorName] = useState('');
  const [injectColorSizes, setInjectColorSizes] = useState([]);
  const [injectColorStock, setInjectColorStock] = useState({});
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    setCategories(getCategories());
    setModels(getModels());
    setShops(getShops());
    setMasterStock(getMasterStock());
    setShopStock(getShopStock());
  }, []);

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName) return;
    const newCats = [...categories, { id: 'cat_' + Date.now(), name: newCatName, image: newCatImage }];
    setCategories(newCats);
    saveCategories(newCats);
    setIsAddCategoryMode(false);
    setNewCatName('');
    setNewCatImage(null);
  };

  const onImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const base64 = await compressImage(file);
      setNewCatImage(base64);
    }
  };

  const addColor = (e) => {
    e.preventDefault();
    const c = colorInput.trim();
    if (c && !newModelData.colors.find(col => col.name === c)) {
      setNewModelData({ ...newModelData, colors: [...newModelData.colors, { name: c, sizes: ['S', 'M', 'L', 'XL'] }] });
    }
    setColorInput('');
  };

  const removeColor = (cName) => {
    setNewModelData({ ...newModelData, colors: newModelData.colors.filter(c => c.name !== cName) });
  };

  const toggleSizeForColor = (cName, size) => {
    const updatedColors = newModelData.colors.map(c => {
      if (c.name === cName) {
        const hasSize = c.sizes.includes(size);
        return { ...c, sizes: hasSize ? c.sizes.filter(s => s !== size) : [...c.sizes, size] };
      }
      return c;
    });
    setNewModelData({ ...newModelData, colors: updatedColors });
  };

  const handleUpdateInitialStock = (color, size, val) => {
    const v = parseInt(val || 0, 10);
    const stock = { ...newModelStock };
    if (!stock[color]) stock[color] = {};
    stock[color][size] = v;
    setNewModelStock(stock);
  };

  const handleCreateModel = (e) => {
    e.preventDefault();
    if (!newModelData.name || !newModelData.sku || newModelData.colors.length === 0) {
      alert("Please provide SKU, Name, and at least one color variation.");
      return;
    }
    
    const id = 'model_' + Date.now();
    const updatedModels = [...models, { 
      id, 
      sku: newModelData.sku, 
      name: newModelData.name, 
      categoryId: activeCategory.id,
      colors: newModelData.colors 
    }];
    setModels(updatedModels);
    saveModels(updatedModels);

    const msData = { ...masterStock };
    msData[id] = newModelStock;
    setMasterStock(msData);
    saveMasterStock(msData);

    setIsAddModelMode(false);
    setNewModelData({ name: '', sku: '', colors: [] });
    setNewModelStock({});
    setColorInput('');
  };

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
      alert(`Cannot assign ${v}. Only ${masterQty - otherShopsTotal} pieces left in Warehouse!`);
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

  const updateMasterIntake = (modelId, color, size, val) => {
    const v = parseInt(val || 0, 10);
    
    // Safety check: limit shrinking inventory below what is physically in shops
    const currentShopStock = shopStock;
    let distributedTotal = 0;
    if (currentShopStock[modelId]) {
      Object.keys(currentShopStock[modelId]).forEach(sid => {
        distributedTotal += (currentShopStock[modelId][sid]?.[color]?.[size] || 0);
      });
    }

    if (v < distributedTotal) {
      alert(`Invalid restock limit: You cannot lower master inventory below ${distributedTotal} pcs, as these are actively distributed in shops.`);
      return;
    }

    const msData = { ...masterStock };
    if (!msData[modelId]) msData[modelId] = {};
    if (!msData[modelId][color]) msData[modelId][color] = {};
    
    msData[modelId][color][size] = v;
    setMasterStock(msData);
    saveMasterStock(msData);
  };

  const handleInjectColor = (e) => {
    e.preventDefault();
    if (!injectColorName || injectColorSizes.length === 0) {
      alert("Please provide a color name and select at least one size.");
      return;
    }

    if (activeModel.colors.find(c => c.name.toLowerCase() === injectColorName.toLowerCase())) {
       alert("This color already exists on this model.");
       return;
    }

    const updatedColors = [...activeModel.colors, { name: injectColorName, sizes: injectColorSizes }];
    
    const updatedModels = models.map(m => m.id === activeModel.id ? { ...m, colors: updatedColors } : m);
    setModels(updatedModels);
    saveModels(updatedModels);

    const msData = { ...masterStock };
    if (!msData[activeModel.id]) msData[activeModel.id] = {};
    msData[activeModel.id][injectColorName] = injectColorStock;
    setMasterStock(msData);
    saveMasterStock(msData);

    setActiveModel({ ...activeModel, colors: updatedColors });

    setIsInjectingColor(false);
    setInjectColorName('');
    setInjectColorSizes([]);
    setInjectColorStock({});
  };

  // Sub-renders
  if (activeModel) {
    const mStock = masterStock[activeModel.id] || {};
    const sStock = shopStock[activeModel.id] || {};
    
    let grandTotalMaster = 0;
    activeModel.colors.forEach(c => {
      c.sizes.forEach(s => grandTotalMaster += (mStock[c.name]?.[s] || 0));
    });
    
    let grandTotalDistributed = 0;
    Object.values(sStock).forEach(shopMap => {
      Object.values(shopMap).forEach(colorMap => {
        Object.values(colorMap).forEach(qty => grandTotalDistributed += qty);
      });
    });

    return (
      <div className="page" style={{ animation: 'none', paddingBottom: 100 }}>
        <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
          <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={() => setActiveModel(null)}>Back</button>
          <div style={{ textAlign: 'right' }}>
            <h1 className="title-gradient" style={{ fontSize: '1.4rem' }}>{activeModel.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>SKU: {activeModel.sku}</p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ marginBottom: 0, padding: 16, background: 'var(--primary)', color: '#fff' }}>
             <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Total Master Stock</div>
             <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{grandTotalMaster}</div>
          </div>
          <div className="card" style={{ marginBottom: 0, padding: 16, background: 'rgba(255,255,255,0.05)' }}>
             <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Currently in Warehouse</div>
             <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{grandTotalMaster - grandTotalDistributed}</div>
          </div>
        </div>

        {activeModel.colors.map(colorObj => {
          return (
            <div key={colorObj.name} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {colorObj.name} Variations
              </div>
              <div style={{ padding: 20 }}>
                {colorObj.sizes.map(size => {
                  const masterQty = mStock[colorObj.name]?.[size] || 0;
                  if (masterQty === 0 && !isEditMode) return null; // hide 0 stock in view mode
                  
                  // calculate warehouse remaining
                  let distributedForSize = 0;
                  Object.values(sStock).forEach(shopMap => {
                    distributedForSize += (shopMap[colorObj.name]?.[size] || 0);
                  });
                  const warehouseQty = masterQty - distributedForSize;

                  return (
                    <div key={size} style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, color: 'var(--text-main)', fontWeight: 600 }}>
                         <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>Size {size}</span>
                         {isEditMode ? (
                           <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99, 102, 241, 0.1)', padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                             <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Purchased:</span>
                             <input 
                               type="number"
                               style={{ width: 60, background: 'rgba(255,255,255,0.1)', border: 'none', borderBottom: '1px dashed var(--primary)', outline: 'none', color: '#fff', textAlign: 'center', fontWeight: 'bold' }}
                               value={masterQty}
                               onChange={(e) => updateMasterIntake(activeModel.id, colorObj.name, size, e.target.value)}
                             />
                           </div>
                         ) : (
                           <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Purchased: {masterQty}</span>
                         )}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                         <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Warehouse</span>
                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{warehouseQty}</span>
                         </div>
                         
                         {shops.map(shop => {
                           const sQty = sStock[shop.id]?.[colorObj.name]?.[size] || 0;
                           return (
                             <div key={shop.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{shop.name}</span>
                                {isEditMode ? (
                                  <input 
                                    type="number"
                                    style={{ width: 45, background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border-color)', outline: 'none', color: '#fff', textAlign: 'right', fontWeight: 'bold' }}
                                    value={sQty}
                                    onChange={(e) => updateShopDistribution(activeModel.id, colorObj.name, size, shop.id, e.target.value)}
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

        {isEditMode && (
          <div className="card" style={{ padding: 20, border: '1px dashed var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
            <label className="form-label" style={{ color: 'var(--primary)', marginBottom: 16 }}><Palette size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/> Append New Color to this Model</label>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input type="text" className="input-field" placeholder="Type a color (Black, Blue, Red)..." value={injectColorName} onChange={e => setInjectColorName(e.target.value)} />
            </div>

            {injectColorName && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12 }}>
                 <label className="form-label"><Box size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/> Step 2: Define Sizes & Initial Master Intake</label>
                 
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                   {SIZES_LIST.map(size => {
                     const isActive = injectColorSizes.includes(size);
                     return (
                       <button type="button" key={size} onClick={() => {
                         setInjectColorSizes(isActive ? injectColorSizes.filter(s => s !== size) : [...injectColorSizes, size]);
                       }} style={{ padding: '6px 12px', borderRadius: 8, background: isActive ? '#fff' : 'rgba(255,255,255,0.05)', color: isActive ? '#000' : 'var(--text-muted)', border: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                         {size}
                       </button>
                     )
                   })}
                 </div>

                 {injectColorSizes.length > 0 && (
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                     {injectColorSizes.map(size => (
                       <div key={size} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '4px 8px' }}>
                         <span style={{ width: 40, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{size}:</span>
                         <input type="number" style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', textAlign: 'right', outline: 'none', fontWeight: 'bold' }} placeholder="Master Qty..." onChange={(e) => {
                           const v = parseInt(e.target.value || 0, 10);
                           setInjectColorStock({...injectColorStock, [size]: v});
                         }} />
                       </div>
                     ))}
                   </div>
                 )}

                 <button onClick={handleInjectColor} className="btn-primary" style={{ width: '100%', opacity: injectColorSizes.length ? 1 : 0.5 }} disabled={!injectColorSizes.length}>
                    Inject Original Intake
                 </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (activeCategory) {
    const categoryModels = models.filter(m => m.categoryId === activeCategory.id);
    return (
      <div className="page" style={{ animation: 'none', paddingBottom: 100 }}>
        <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
          <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={() => setActiveCategory(null)}>Back</button>
          <div style={{ textAlign: 'right' }}>
            <h1 className="title-gradient" style={{ fontSize: '1.4rem' }}>{activeCategory.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{categoryModels.length} models</p>
          </div>
        </header>

        {isEditMode && (
          <button className="btn-primary" style={{ width: '100%', marginBottom: 20 }} onClick={() => setIsAddModelMode(true)}>
            <Plus size={20} /> Add New {activeCategory.name} Model
          </button>
        )}

        {categoryModels.length === 0 ? (
          <div style={{ textAlign:'center', marginTop: 100, color: 'var(--text-muted)' }}>
            <PackageOpen size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: 16 }}/>
            <p>No inventory found here.</p>
          </div>
        ) : (
          categoryModels.map(model => {
            let total = 0;
            const mStock = masterStock[model.id] || {};
            model.colors.forEach(c => {
               c.sizes.forEach(s => total += (mStock[c.name]?.[s] || 0));
            });

            return (
              <div key={model.id} className="card" onClick={() => setActiveModel(model)} style={{ cursor: 'pointer' }}>
                <div className="card-header" style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>#{model.sku}</span>
                    <div className="card-title">{model.name}</div>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                  {model.colors.map(c => c.name).join(' • ')} (Sizes Available)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <div style={{ fontWeight: 600 }}>Master Intakes: {total} pcs</div>
                  <ChevronRight size={18} color="var(--text-muted)"/>
                </div>
              </div>
            )
          })
        )}

        {isAddModelMode && (
          <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setIsAddModelMode(false)}>
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2>Create Master Model Profile</h2>
                <button onClick={() => setIsAddModelMode(false)}><X size={24} color="var(--text-muted)"/></button>
              </div>
              <form onSubmit={handleCreateModel}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">SKU ID</label>
                    <div style={{ position: 'relative' }}>
                      <Tag size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 16 }} />
                      <input type="text" className="input-field" style={{ paddingLeft: 36 }} placeholder="e.g. 112" value={newModelData.sku} onChange={e => setNewModelData({...newModelData, sku: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <label className="form-label">Model Name</label>
                    <input type="text" className="input-field" placeholder="e.g. Summer Dress" value={newModelData.name} onChange={e => setNewModelData({...newModelData, name: e.target.value})} />
                  </div>
                </div>

                <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label className="form-label"><Palette size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/> Step 1: Define Colors</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {newModelData.colors.map(col => (
                      <span key={col.name} className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary)', color: '#fff', padding: '6px 12px' }}>
                        {col.name} <X size={14} onClick={() => removeColor(col.name)} style={{ cursor: 'pointer' }} />
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" className="input-field" placeholder="Type a color (Black, Blue)..." value={colorInput} onChange={e => setColorInput(e.target.value)} />
                    <button className="btn-secondary" onClick={addColor}>Add Color</button>
                  </div>
                </div>

                {newModelData.colors.length > 0 && (
                  <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <label className="form-label"><Box size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/> Step 2: Define Sizes & Initial Master Intake</label>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>Select the available sizes for each color and input the total quantity you purchased into the master warehouse database.</p>
                    
                    {newModelData.colors.map(colorObj => (
                      <div key={colorObj.name} style={{ marginBottom: 20 }}>
                         <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 8, color: '#fff' }}>{colorObj.name} Variations</div>
                         
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                           {SIZES_LIST.map(size => {
                             const isActive = colorObj.sizes.includes(size);
                             return (
                               <button type="button" key={size} onClick={() => toggleSizeForColor(colorObj.name, size)} style={{ padding: '6px 12px', borderRadius: 8, background: isActive ? '#fff' : 'rgba(255,255,255,0.05)', color: isActive ? '#000' : 'var(--text-muted)', border: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                                 {size}
                               </button>
                             )
                           })}
                         </div>

                         {colorObj.sizes.length > 0 && (
                           <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
                             {colorObj.sizes.map(size => (
                               <div key={size} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '4px 8px' }}>
                                 <span style={{ width: 40, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{size}:</span>
                                 <input type="number" style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', textAlign: 'right', outline: 'none', fontWeight: 'bold' }} placeholder="Master Qty..." onChange={(e) => handleUpdateInitialStock(colorObj.name, size, e.target.value)} />
                               </div>
                             ))}
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ width: '100%', opacity: newModelData.colors.length ? 1 : 0.5 }} disabled={!newModelData.colors.length}><ShieldCheck size={20} /> Create Master Inventory</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard
  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* Global Header */}
      <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
        <div>
          <h1 className="title-gradient">Master Control</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select a parts category to map stock.</p>
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
         Customization Mode Active. You add initial container stock here!
       </div>
      )}

      {categories.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '10vh', padding: 24 }}>
          {isEditMode ? (
            <div onClick={() => setIsAddCategoryMode(true)} style={{ cursor: 'pointer', animation: 'slideUp 0.3s ease-out forwards' }}>
               <div style={{ width: 100, height: 100, borderRadius: 32, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: 24 }}>
                 <Plus size={48} color="var(--primary)" />
               </div>
               <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Create First Part</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Tap here to start customizing and add your first inventory part.</p>
            </div>
          ) : (
            <div style={{ animation: 'slideUp 0.3s ease-out forwards' }}>
              <PackageOpen size={80} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 24 }} />
              <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Inventory is Empty</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                There are no parts created yet.<br/><br/>
                Tap the <strong><Settings2 size={18} style={{ verticalAlign: 'middle', margin: '0 2px', color: 'var(--text-main)' }}/></strong> button at the top right to enter Customization Mode to start!
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(140px, 1fr)', gap: 16 }}>
            {categories.map(cat => {
              const count = models.filter(m => m.categoryId === cat.id).length;
              return (
                <div key={cat.id} className="card" style={{ position: 'relative', marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 16px' }} onClick={() => setActiveCategory(cat)}>
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', marginBottom: 12 }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <PackageOpen size={32} color="var(--text-muted)" />
                    </div>
                  )}
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>{cat.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{count} items</div>
                </div>
              );
            })}
            
            {isEditMode && (
              <div className="card" onClick={() => setIsAddCategoryMode(true)} style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 16px', background: 'transparent', border: '1px dashed var(--border-color)', cursor: 'pointer' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Plus size={32} color="var(--primary)" />
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>Add Part</div>
              </div>
            )}
          </div>
      )}

      {isAddCategoryMode && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setIsAddCategoryMode(false)}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2>Customize Inventory Part</h2>
              <button onClick={() => setIsAddCategoryMode(false)}><X size={24} color="var(--text-muted)"/></button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group" style={{ textAlign: 'center', marginBottom: 24 }}>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={onImageUpload} />
                <div onClick={() => fileInputRef.current?.click()} style={{ width: 100, height: 100, margin: '0 auto', background: 'rgba(255,255,255,0.05)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                  {newCatImage ? ( <img src={newCatImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> ) : ( <> <Camera size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} /> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upload Pic</span> </> )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category / Part Name</label>
                <input type="text" className="input-field" autoFocus placeholder="e.g. Shoes" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Part</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
