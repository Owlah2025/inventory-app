import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getShops, getModels, getInventory } from './storage_v2';

export const exportToPDF = () => {
  const models = getModels();
  const shops = getShops();
  const inventory = getInventory();

  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Advanced Inventory Status', 14, 22);
  
  // Date
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 30);

  if (models.length === 0) {
    doc.setFontSize(14);
    doc.text('No inventory models found.', 14, 50);
    return doc;
  }

  const head = [['Model Name', 'SKU', 'Color', ...shops.map(s => s.name), 'Warehouse', 'Total']];
  const body = [];

  models.forEach(model => {
    model.colors.forEach(color => {
      let colorTotal = 0;
      const row = [model.name, model.sku, color];
      
      const inv = inventory[model.id] || {};
      
      shops.forEach(shop => {
        const qty = inv[shop.id]?.[color] || 0;
        row.push(qty > 0 ? qty.toString() : '-');
        colorTotal += qty;
      });

      const wQty = inv['warehouse']?.[color] || 0;
      row.push(wQty > 0 ? wQty.toString() : '-');
      colorTotal += wQty;
      
      row.push(colorTotal > 0 ? colorTotal.toString() : '0');
      
      body.push(row);
    });
  });

  autoTable(doc, {
    startY: 40,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold' }
    }
  });

  return doc;
};

export const downloadPDF = () => {
  const doc = exportToPDF();
  doc.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const shareToWhatsAppPDF = async () => {
  const doc = exportToPDF();
  const fileName = `Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  
  if (!navigator.canShare || !navigator.share) {
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    alert("Direct file sharing is restricted by your browser. WhatsApp will open so you can manually attach the downloaded file.");
    window.open(`https://wa.me/?text=${encodeURIComponent('Please find the attached Inventory Report.')}`, '_blank');
    return;
  }

  try {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Inventory Report',
        text: 'Please find the attached Inventory Report.'
      });
    } else {
      alert("Failed to share.");
    }
  } catch (error) {
    console.error('Error sharing PDF', error);
  }
};
