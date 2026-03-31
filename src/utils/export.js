import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getCategories, getModels, getShops, getMasterStock, getShopStock } from './storage_v3';

export const generateInventoryPDFBlob = () => {
  const models = getModels();
  const shops = getShops();
  const masterStock = getMasterStock();
  const shopStock = getShopStock();
  const categories = getCategories();

  const doc = new jsPDF('landscape');

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('Global Master Inventory Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  const tableColumn = ["SKU", "Model Type", "Category", "Color", "Size", "Total Master", "Warehouse", ...shops.map(s => s.name)];
  const tableRows = [];

  models.forEach(model => {
    const catName = categories.find(c => c.id === model.categoryId)?.name || 'Unknown';
    const mStock = masterStock[model.id] || {};
    const sStockMap = shopStock[model.id] || {};

    model.colors.forEach(colorObj => {
      const colorName = colorObj.name;
      
      colorObj.sizes.forEach(size => {
         const initialMasterQty = mStock[colorName]?.[size] || 0;
         if (initialMasterQty === 0) return; // Skip sizes never purchased in master
         
         let totalDistributed = 0;
         const shopCols = shops.map(shop => {
            const qty = sStockMap[shop.id]?.[colorName]?.[size] || 0;
            totalDistributed += qty;
            return qty === 0 ? '-' : qty.toString();
         });
         
         const remainingWarehouse = initialMasterQty - totalDistributed;

         tableRows.push([
           model.sku,
           model.name,
           catName,
           colorName,
           size,
           initialMasterQty.toString(),
           remainingWarehouse === 0 ? '-' : remainingWarehouse.toString(),
           ...shopCols
         ]);
      });
    });
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold' }, // SKU
      4: { fontStyle: 'bold', textColor: [79, 70, 229] }, // Size
      5: { fontStyle: 'bold' }, // Total Master
      6: { fontStyle: 'bold', textColor: [22, 163, 74] } // Warehouse
    }
  });

  return doc.output('blob');
};

export const shareToWhatsAppPDF = async () => {
  try {
    const blob = generateInventoryPDFBlob();
    const file = new File([blob], `Inventory_Master_Report_${new Date().getTime()}.pdf`, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Master Inventory Matrix',
        text: 'Attached is the latest synchronized inventory breakdown mapping all sizes, colors, warehouse stock, and distributed shop allocations.',
        files: [file]
      });
    } else {
      // Fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("PDF downloaded. You can now manually text it using WhatsApp!");
      window.open('https://wa.me/', '_blank');
    }
  } catch (error) {
    console.error('Share error:', error);
    alert('Sharing failed. Please try again.');
  }
};

export const downloadPDF = () => {
  try {
    const blob = generateInventoryPDFBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventory_Master_Report_${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    alert('Download failed. Please try again.');
  }
};
