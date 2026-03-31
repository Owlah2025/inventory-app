import React, { useState, useEffect, useRef } from 'react';
import { getCategories, saveCategories, getModels, saveModels, getShops, getInventory, saveInventory, compressImage } from '../utils/storage_v2';
import { Plus, X, Minus, ChevronRight, PackageOpen, Settings2, Eye, Camera, Tag, Palette, Trash2 } from 'lucide-react';

export default function ModelsPage() {
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [models, setModels] = useState([]);
  const [shops, setShops] = useState([]);
  const [inventory, setInventory] = useState({});
  
  // Navigation states
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  
  // Creation states
  const [isAddCategoryMode, setIsAddCategoryMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState(null);
  
  const [isAddModelMode, setIsAddModelMode] = useState(false);
  const [newModelData, setNewModelData] = useState({ name: '', sku: '', colors: [] });
  const [colorInput, setColorInput] = useState('');
  const [newModelDist, setNewModelDist] = useState({}); // { [locationId]: { [color]: qty } }

  const fileInputRef = useRef(null);

  useEffect(() => {
    setCategories(getCategories());
    setModels(getModels());
    setShops(getShops());
    setInventory(getInventory());
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
    if (c && !newModelData.colors.includes(c)) {
      setNewModelData({ ...newModelData, colors: [...newModelData.colors, c] });
    }
    setColorInput('');
  };

  const removeColor = (c) => {
    setNewModelData({ ...newModelData, colors: newModelData.colors.filter(col => col !== c) });
  };

  const handleUpdateDist = (locId, color, val) => {
    const v = parseInt(val || 0, 10);
    const dist = { ...newModelDist };
    if (!dist[locId]) dist[locId] = {};
    dist[locId][color] = v;
    setNewModelDist(dist);
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

    const invData = { ...inventory };
    invData[id] = newModelDist; // Save the complex grid map
    setInventory(invData);
    saveInventory(invData);

    setIsAddModelMode(false);
    setNewModelData({ name: '', sku: '', colors: [] });
    setNewModelDist({});
    setColorInput('');
  };

  const getModelTotals = (model) => {
    let total = 0;
    const inv = inventory[model.id] || {};
    // Sum across all locations (shops + warehouse) and all colors
    Object.values(inv).forEach(locMap => {
      Object.values(locMap).forEach(qty => {
        total += (qty || 0);
      });
    });
    return total;
  };

  const getModelColorBreakdown = (model) => {
    const breakdown = {};
    model.colors.forEach(c => breakdown[c] = 0);
    const inv = inventory[model.id] || {};
    Object.values(inv).forEach(locMap => {
      Object.entries(locMap).forEach(([color, qty]) => {
        if (breakdown[color] !== undefined) breakdown[color] += (qty || 0);
      });
    });
    return breakdown;
  };

  // Views rendering
  if (activeModel) {
    const totals = getModelTotals(activeModel);
    const colorBreakdown = getModelColorBreakdown(activeModel);
    const inv = inventory[activeModel.id] || {};
    
    return (
      <div className="page" style={{ animation: 'none' }}>
        <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
          <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={() => setActiveModel(null)}>
            Back
          </button>
          <div style={{ textAlign: 'right' }}>
            <h1 className="title-gradient" style={{ fontSize: '1.4rem' }}>{activeModel.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>SKU: {activeModel.sku}</p>
          </div>
        </header>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary)', color: '#fff' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Total Found Everywhere</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{totals}</div>
        </div>

        <h3 style={{ marginBottom: 12, marginTop: 24 }}>By Color</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {Object.entries(colorBreakdown).map(([color, qty]) => (
            <div key={color} className="card" style={{ marginBottom: 0, padding: 12, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{color}</span>
              <span style={{ fontWeight: 700 }}>{qty}</span>
            </div>
          ))}
        </div>

        <h3 style={{ marginBottom: 12, marginTop: 24 }}>By Location</h3>
        {[...shops, { id: 'warehouse', name: 'Warehouse (Unassigned)' }].map(loc => {
           const locMap = inv[loc.id] || {};
           const locTotal = Object.values(locMap).reduce((a,b) => a+b, 0);
           if (locTotal === 0 && !isEditMode) return null; // hide empty locations in view mode

           return (
             <div key={loc.id} className="card" style={{ marginBottom: 12 }}>
               <div style={{ fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 12 }}>
                 {loc.name} <span className="badge" style={{ float: 'right' }}>{locTotal} items</span>
               </div>
               
               {activeModel.colors.map(color => (
                 <div key={color} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                   <div style={{ color: 'var(--text-muted)' }}>{color}</div>
                   {isEditMode ? (
                     <div className="stepper">
                        <input 
                          type="number" 
                          style={{ width: 60, textAlign: 'center', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }}
                          value={locMap[color] || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value || 0, 10);
                            const updatedInv = { ...inventory };
                            if (!updatedInv[activeModel.id]) updatedInv[activeModel.id] = {};
                            if (!updatedInv[activeModel.id][loc.id]) updatedInv[activeModel.id][loc.id] = {};
                            updatedInv[activeModel.id][loc.id][color] = val;
                            setInventory(updatedInv);
                            saveInventory(updatedInv);
                            
                            // force re-render logic via state
                          }}
                        />
                     </div>
                   ) : (
                     <div style={{ fontWeight: 600 }}>{locMap[color] || 0}</div>
                   )}
                 </div>
               ))}
             </div>
           );
        })}
      </div>
    );
  }

  if (activeCategory) {
    const categoryModels = models.filter(m => m.categoryId === activeCategory.id);
    return (
      <div className="page" style={{ animation: 'none' }}>
        <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
          <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={() => setActiveCategory(null)}>
            Back
          </button>
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
          categoryModels.map(model => (
            <div key={model.id} className="card" onClick={() => setActiveModel(model)} style={{ cursor: 'pointer' }}>
              <div className="card-header" style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>#{model.sku}</span>
                  <div className="card-title">{model.name}</div>
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                {model.colors.join(' • ')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <div style={{ fontWeight: 600 }}>Total: {getModelTotals(model)} pcs</div>
                <ChevronRight size={18} color="var(--text-muted)"/>
              </div>
            </div>
          ))
        )}

        {isAddModelMode && (
          <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setIsAddModelMode(false)}>
            <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2>Create Model in {activeCategory.name}</h2>
                <button onClick={() => setIsAddModelMode(false)}><X size={24} color="var(--text-muted)"/></button>
              </div>
              <form onSubmit={handleCreateModel}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Unique ID (SKU)</label>
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

                <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                  <label className="form-label"><Palette size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}/> Model Colors/Variations</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {newModelData.colors.map(col => (
                      <span key={col} className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary)', color: '#fff', padding: '6px 12px' }}>
                        {col} <X size={14} onClick={() => removeColor(col)} style={{ cursor: 'pointer' }} />
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" className="input-field" placeholder="Type a color (Black, White...)" value={colorInput} onChange={e => setColorInput(e.target.value)} />
                    <button className="btn-secondary" onClick={addColor}>Add</button>
                  </div>
                </div>

                {newModelData.colors.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Initial Stock Distribution</h3>
                    
                    {[...shops, { id: 'warehouse', name: 'Warehouse (Unassigned)' }].map(loc => (
                      <div key={loc.id} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-muted)' }}>{loc.name}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {newModelData.colors.map(color => (
                            <div key={color} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '4px 8px' }}>
                              <span style={{ flex: 1, fontSize: '0.85rem' }}>{color}:</span>
                              <input type="number" style={{ width: 50, background: 'transparent', border: 'none', color: '#fff', textAlign: 'right', outline: 'none', fontWeight: 'bold' }} placeholder="0" onChange={(e) => handleUpdateDist(loc.id, color, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ width: '100%', opacity: newModelData.colors.length ? 1 : 0.5 }} disabled={!newModelData.colors.length}>Create Inventory Logic</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Categories View
  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
        <div>
          <h1 className="title-gradient">Inventory Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select a category part to browse.</p>
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
           Customization Mode Active. You can assign numbers and tweak models now!
         </div>
      )}

      {categories.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '15vh', padding: 24 }}>
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
              <div 
                key={cat.id} 
                className="card" 
                style={{ 
                  position: 'relative', 
                  marginBottom: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center', 
                  padding: '24px 16px' 
                }} 
                onClick={() => setActiveCategory(cat)}
              >
                {isEditMode && (
                  <button 
                    style={{ position: 'absolute', top: 8, right: 8, padding: 8, background: 'rgba(0,0,0,0.5)', color: 'var(--danger)', borderRadius: '50%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete the entire category "${cat.name}" and all its assigned models forever?`)) {
                        const newCats = categories.filter(c => c.id !== cat.id);
                        setCategories(newCats);
                        saveCategories(newCats);
                        
                        const newModels = models.filter(m => m.categoryId !== cat.id);
                        setModels(newModels);
                        saveModels(newModels);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
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
            <div 
              className="card" 
              onClick={() => setIsAddCategoryMode(true)} 
              style={{ 
                marginBottom: 0, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center', 
                padding: '24px 16px', 
                background: 'transparent', 
                border: '1px dashed var(--border-color)', 
                cursor: 'pointer' 
              }}
            >
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
                  {newCatImage ? (
                    <img src={newCatImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <Camera size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upload Pic</span>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category / Part Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  autoFocus 
                  placeholder="e.g. Shoes"
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Part</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
