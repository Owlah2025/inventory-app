import React from 'react';
import { FileText, Share2, FileDown } from 'lucide-react';
import { downloadPDF, shareToWhatsAppPDF } from '../utils/export';

export default function SettingsPage() {
  return (
    <div className="page">
      <header className="header" style={{ padding: '0 0 20px 0', borderBottom: 'none' }}>
        <div>
          <h1 className="title-gradient">Export Data</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generate & share PDF reports.</p>
        </div>
      </header>

      <div className="card">
        <div className="card-header" style={{ marginBottom: 8 }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="var(--primary)" />
            Share via WhatsApp
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
          Generates a beautiful PDF report of your shops and distribution, and securely opens WhatsApp to share the file directly with the manager.
        </p>
        <button className="btn-primary" style={{ width: '100%', background: '#25D366', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)' }} onClick={shareToWhatsAppPDF}>
          <Share2 size={20} />
          Share to Manager
        </button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header" style={{ marginBottom: 8 }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileDown size={20} color="var(--text-main)" />
            Download PDF
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
          Save the generated PDF locally to your device for offline backup or printing.
        </p>
        <button className="btn-secondary" style={{ width: '100%' }} onClick={downloadPDF}>
          Download PDF Document
        </button>
      </div>
    </div>
  );
}
