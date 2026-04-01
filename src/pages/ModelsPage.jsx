import React, { useState, useEffect, useRef } from 'react';
import { getCategories, saveCategories, getModels, saveModels, getShops, getMasterStock, saveMasterStock, getShopStock, saveShopStock, getWarehouseStock, SIZES_LIST, compressImage } from '../utils/storage_v3';
import { Plus, X, Settings2, Eye, Camera, Tag, Palette, ShieldCheck, Box, PackageOpen, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function ModelsPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [shops, setShops] = useState([]);
  const [masterStock, setMasterStock] = useState({});
  const [shopStock, setShopStock] = useState({});
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  
  // Modals for Categories
  const [isAddCategoryMode, setIsAddCategoryMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState(null);
  const catFileInputRef = useRef(null);
  
  // Modals for Models
  const [isAddModelMode, setIsAddModelMode] = useState(false);
  const [newModelData, setNewModelData] = useState({ name: '', sku: '', colors: [] });
  const [newModelImage, setNewModelImage] = useState(null);
  const [colorInput, setColorInput] = useState('');
  const [newModelStock, setNewModelStock] = useState({}); // { [color]: { [size]: qty } }
  const modelFileInputRef = useRef(null);
  
  // Color injection
  const [isInjectingColor, setIsInjectingColor] = useState(false);
  const [injectColorName, setInjectColorName] = useState('');
  const [injectColorSizes, setInjectColorSizes] = useState([]);
  const [injectColorStock, setInjectColorStock] = useState({});

  // Restock Modal
  const [restockModalData, setRestockModalData] = useState(null);
  const [restockAmount, setRestockAmount] = useState('');

  // Image Viewer
  const [viewingImage, setViewingImage] = useState(null);

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

  const onCatImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const base64 = await compressImage(file);
      setNewCatImage(base64);
    }
  };

  const onModelImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const base64 = await compressImage(file);
      setNewModelImage(base64);
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
      colors: newModelData.colors,
      image: newModelImage // Saving the image with the model
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
    setNewModelImage(null);
    setColorInput('');
  };

  const handleRestockSubmit = () => {
    const v = parseInt(restockAmount || 0, 10);
    if (v === 0 || isNaN(v)) {
      setRestockModalData(null);
      setRestockAmount('');
      return;
    }
    const { modelId, colorName, size, currentQty } = restockModalData;
    const newMasterQty = currentQty + v;

    // Safety check: limit shrinking inventory below what is physically in shops
    const currentShopStock = shopStock;
    let distributedTotal = 0;
    if (currentShopStock[modelId]) {
      Object.keys(currentShopStock[modelId]).forEach(sid => {
        distributedTotal += (currentShopStock[modelId][sid]?.[colorName]?.[size] || 0);
      });
    }

    if (newMasterQty < distributedTotal) {
      alert(`Invalid limit: You cannot lower warehouse inventory below ${distributedTotal} pcs, as these are actively distributed in shops.`);
      return;
    }

    const msData = { ...masterStock };
    if (!msData[modelId]) msData[modelId] = {};
    if (!msData[modelId][colorName]) msData[modelId][colorName] = {};
    
    msData[modelId][colorName][size] = newMasterQty;
    setMasterStock(msData);
    saveMasterStock(msData);

    setRestockModalData(null);
    setRestockAmount('');
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

  // Image Viewer Modal Component
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

  // Calculate Global Summary
  let globalTotalItems = 0;
  Object.values(masterStock).forEach(modelMap => {
    Object.values(modelMap).forEach(colorMap => {
      Object.values(colorMap).forEach(qty => globalTotalItems += qty);
    });
  });

  // ---------- SUB-RENDER: ACTIVE MODEL ----------
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
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
            {activeModel.image && (
              <button 
                onClick={() => setViewingImage(activeModel.image)}
                style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', borderRadius: 8, padding: 8, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ImageIcon size={20} />
              </button>
            )}
            <div>
              <h1 className="title-gradient" style={{ fontSize: '1.4rem' }}>{activeModel.name}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>SKU: {activeModel.sku}</p>
            </div>
          </div>
        </header>



        {activeModel.colors.map(colorObj => {
          return (
            <div key={colorObj.name} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {colorObj.name} Variations
              </div>
              <div style={{ padding: 20 }}>
                {colorObj.sizes.map(size => {
                  const masterQty = mStock[colorObj.name]?.[size] || 0;
                  if (masterQty === 0 && !isEditMode) return null; 
                  
                  let distributedForSize = 0;
                  Object.values(sStock).forEach(shopMap => {
                    distributedForSize += (shopMap[colorObj.name]?.[size] || 0);
                  });
                  const warehouseQty = masterQty - distributedForSize;

                  return (
                    <div key={size} style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, color: 'var(--text-main)', fontWeight: 600 }}>
                         <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>Size {size}</span>
                         <button 
                             className="btn-secondary" 
                             style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
                             onClick={() => {
                               setRestockModalData({ modelId: activeModel.id, colorName: colorObj.name, size, currentQty: masterQty });
                               setRestockAmount('');
                             }}
                           >
                             <Plus size={14} /> Restock
                           </button>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                         <div style={{ flex: 1, background: 'rgba(99, 102, 241, 0.1)', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Currently In Warehouse</span>
                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{warehouseQty}</span>
                         </div>
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
            <label className="form-label" style={{ color: 'var(--primary)', marginBottom: 16 }}><Palette size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/> Append New Color</label>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input type="text" className="input-field" placeholder="Color name (e.g. Red)..." value={injectColorName} onChange={e => setInjectColorName(e.target.value)} />
            </div>

            {injectColorName && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12 }}>
                 <label className="form-label"><Box size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/> Define Sizes & Initial Inventory</label>
                 
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
                         <input type="number" style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', textAlign: 'right', outline: 'none', fontWeight: 'bold' }} placeholder="Qty added..." onChange={(e) => {
                           const v = parseInt(e.target.value || 0, 10);
                           setInjectColorStock({...injectColorStock, [size]: v});
                         }} />
                       </div>
                     ))}
                   </div>
                 )}

                 <button onClick={handleInjectColor} className="btn-primary" style={{ width: '100%', opacity: injectColorSizes.length ? 1 : 0.5 }} disabled={!injectColorSizes.length}>
                    Inject Inventory
                 </button>
              </div>
            )}
          </div>
        )}
        <ImageViewer />
      </div>
    );
  }

  // ---------- SUB-RENDER: ACTIVE CATEGORY ----------
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
              <div key={model.id} className="card" style={{ cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center' }}>
                {model.image ? (
                  <div onClick={(e) => { e.stopPropagation(); setViewingImage(model.image); }} style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={model.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={model.name} />
                  </div>
                ) : (
                  <div onClick={(e) => e.stopPropagation()} style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={24} color="var(--text-muted)" />
                  </div>
                )}
                
                <div style={{ flex: 1 }} onClick={() => setActiveModel(model)}>
                  <div className="card-header" style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>#{model.sku}</span>
                      <div className="card-title">{model.name}</div>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>
                    {model.colors.map(c => c.name).join(' • ')} (Sizes Available)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                    <div style={{ fontWeight: 600 }}>Total Units: {total} pcs</div>
                    <ChevronRight size={18} color="var(--text-muted)"/>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {isAddModelMode && (
          <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setIsAddModelMode(false)}>
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2>Create Warehouse Model Profile</h2>
                <button onClick={() => setIsAddModelMode(false)}><X size={24} color="var(--text-muted)"/></button>
              </div>
              <form onSubmit={handleCreateModel}>
                
                {/* Image Upload for Model */}
                <div className="form-group" style={{ textAlign: 'center', marginBottom: 24 }}>
                  <input type="file" accept="image/*" ref={modelFileInputRef} style={{ display: 'none' }} onChange={onModelImageUpload} />
                  <div onClick={() => modelFileInputRef.current?.click()} style={{ width: 100, height: 100, margin: '0 auto', background: 'rgba(255,255,255,0.05)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                    {newModelImage ? ( <img src={newModelImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> ) : ( <> <Camera size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} /> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model Photo</span> </> )}
                  </div>
                </div>

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
                    <label className="form-label"><Box size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/> Step 2: Define Sizes & Initial Inventory</label>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>Select the available sizes for each color and input the total quantity added to the warehouse database.</p>
                    
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
                                 <input type="number" style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', textAlign: 'right', outline: 'none', fontWeight: 'bold' }} placeholder="Total Items..." onChange={(e) => handleUpdateInitialStock(colorObj.name, size, e.target.value)} />
                               </div>
                             ))}
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ width: '100%', opacity: newModelData.colors.length ? 1 : 0.5 }} disabled={!newModelData.colors.length}><ShieldCheck size={20} /> Create Warehouse Entry</button>
              </form>
            </div>
          </div>
        )}
        <ImageViewer />
      </div>
    );
  }

  // ---------- SUMMARIZED MAIN INVENTORY DASHBOARD ----------
  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* Global Header */}
      <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
        <div>
          <h1 className="title-gradient">Inventory</h1>
          <p style={{ color: 'var(--primary)', fontSize: '1.0rem', fontWeight: 600, marginTop: 4 }}>
            There are {models.length} models with {globalTotalItems} items.
          </p>
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
         Edit mode active. You can add new models and restock the warehouse here.
       </div>
      )}

      {categories.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '10vh', padding: 24 }}>
          {isEditMode ? (
            <div onClick={() => setIsAddCategoryMode(true)} style={{ cursor: 'pointer', animation: 'slideUp 0.3s ease-out forwards' }}>
               <div style={{ width: 100, height: 100, borderRadius: 32, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: 24 }}>
                 <Plus size={48} color="var(--primary)" />
               </div>
               <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Create First Category</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Tap here to start adding your inventory categories.</p>
            </div>
          ) : (
            <div style={{ animation: 'slideUp 0.3s ease-out forwards' }}>
              <PackageOpen size={80} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 24 }} />
              <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Warehouse is Empty</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                There are no items tracked yet.<br/><br/>
                Tap the <strong><Settings2 size={18} style={{ verticalAlign: 'middle', margin: '0 2px', color: 'var(--text-main)' }}/></strong> button at the top right to start tracking items!
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
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{count} models</div>
                </div>
              );
            })}
            
            {isEditMode && (
              <div className="card" onClick={() => setIsAddCategoryMode(true)} style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 16px', background: 'transparent', border: '1px dashed var(--border-color)', cursor: 'pointer' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Plus size={32} color="var(--primary)" />
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>Add Category</div>
              </div>
            )}
          </div>
      )}

      {isAddCategoryMode && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setIsAddCategoryMode(false)}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2>Customize Category</h2>
              <button onClick={() => setIsAddCategoryMode(false)}><X size={24} color="var(--text-muted)"/></button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group" style={{ textAlign: 'center', marginBottom: 24 }}>
                <input type="file" accept="image/*" ref={catFileInputRef} style={{ display: 'none' }} onChange={onCatImageUpload} />
                <div onClick={() => catFileInputRef.current?.click()} style={{ width: 100, height: 100, margin: '0 auto', background: 'rgba(255,255,255,0.05)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                  {newCatImage ? ( <img src={newCatImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> ) : ( <> <Camera size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} /> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upload Pic</span> </> )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input type="text" className="input-field" autoFocus placeholder="e.g. Shoes" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Category</button>
            </form>
          </div>
        </div>
      )}
      <ImageViewer />
    </div>
  );
}
