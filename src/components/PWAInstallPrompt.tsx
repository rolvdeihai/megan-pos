'use client';

import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsIOS(ios);
    setIsStandalone(standalone);

    if (standalone) return;

    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed === 'true') return;

    if (!ios) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    } else {
      const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
      if (isSafari) setShow(true);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('User accepted install');
    setDeferredPrompt(null);
    setShow(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        right: 20,
        background: '#FF6B6B', // your primary color
        color: '#fff',
        padding: '16px',
        borderRadius: 16,
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>
        📱 Install Aplikasi JetNote Pos
      </p>
      <p style={{ margin: '0 0 16px 0', fontSize: 14, opacity: 0.9 }}>
        {isIOS ? (
          <>Tap tombol Bagikan <span style={{ fontSize: 18 }}>⎙</span> lalu pilih <strong>Add to Home Screen</strong>.</>
        ) : (
          <>Install aplikasi untuk akses lebih cepat dan offline.</>
        )}
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.5)',
            padding: '6px 14px',
            borderRadius: 20,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Nanti
        </button>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            style={{
              background: '#fff',
              color: '#FF6B6B',
              border: 'none',
              padding: '6px 18px',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Install
          </button>
        )}
        {isIOS && (
          <button
            onClick={handleDismiss}
            style={{
              background: '#fff',
              color: '#FF6B6B',
              border: 'none',
              padding: '6px 18px',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Mengerti
          </button>
        )}
      </div>
    </div>
  );
}