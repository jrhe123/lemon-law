import React, { useState } from 'react';
import { DigitalProduct, ConsoleCardProduct } from '../features/products/types';
import { FaDownload, FaGamepad, FaRegCreditCard, FaDesktop } from 'react-icons/fa';

interface ProductCardProps {
  product: DigitalProduct | ConsoleCardProduct;
  type: 'digital' | 'consoleCard' | 'dummy';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, type }) => {
  const game = product.game;
  const [imgIdx, setImgIdx] = useState(0);
  const images = game.images;
  const [hovered, setHovered] = useState(false);

  // tooltip helpers
  const [tip, setTip] = useState<string | null>(null);

  return (
    <div
      style={{
        border: '1px solid #eee',
        borderRadius: 20,
        padding: 18,
        margin: 18,
        width: 370,
        boxShadow: hovered ? '0 12px 36px rgba(106,90,205,0.18)' : '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
        transform: hovered ? 'translateY(-10px) scale(1.04)' : 'translateY(0) scale(1)',
        background: hovered ? 'linear-gradient(120deg, #a18cd1 0%, #fbc2eb 100%)' : '#fff',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeInCard 0.7s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTip(null); }}
    >
      <div style={{ position: 'relative', height: 270, marginBottom: 10 }}>
        <img
          src={images[imgIdx]}
          alt={game.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14, transition: 'all 0.3s' }}
        />
        {images.length > 1 && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 6 }}>
            {images.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setImgIdx(idx)}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: imgIdx === idx ? '#6a5acd' : '#eee',
                  display: 'inline-block',
                  cursor: 'pointer',
                  border: imgIdx === idx ? '2px solid #6a5acd' : '2px solid #eee',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>
      <p style={{ margin: '8px 0 4px 0', fontSize: 18, color: '#6a5acd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '6px 0 0 0' }}>
        <span style={{ color: '#6a5acd', fontWeight: 600, fontSize: 12 }}>${game.price}</span>
        {/* icon+tooltip */}
        <span
          style={{ cursor: 'pointer', color: '#6a5acd', position: 'relative' }}
          onMouseEnter={() => setTip(type === 'digital' ? 'Digital Game' : 'Console Card Game')}
          onMouseLeave={() => setTip(null)}
        >
          {type === 'digital'
            ? React.createElement(FaDesktop as React.ComponentType<any>, { size: 16 })
            : React.createElement(FaRegCreditCard as React.ComponentType<any>, { size: 16 })}
          {tip && (
            <span style={{
              position: 'absolute',
              top: -28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#fff',
              color: '#6a5acd',
              border: '1px solid #eee',
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(106,90,205,0.10)',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}>{tip}</span>
          )}
        </span>
        {/* icon+tooltip */}
        {type === 'consoleCard' && (
          <span
            style={{ cursor: 'pointer', color: '#6a5acd', position: 'relative' }}
            onMouseEnter={() => setTip((product as ConsoleCardProduct).platform)}
            onMouseLeave={() => setTip(null)}
          >
            {React.createElement(FaGamepad as React.ComponentType<any>, { size: 16 })}
            {tip && (
              <span style={{
                position: 'absolute',
                top: -28,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#fff',
                color: '#6a5acd',
                border: '1px solid #eee',
                borderRadius: 6,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(106,90,205,0.10)',
                zIndex: 10,
                whiteSpace: 'nowrap',
              }}>{tip}</span>
            )}
          </span>
        )}
        {/* icon+tooltip */}
        {type === 'digital' && (
          <a
            href={(product as DigitalProduct).downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6a5acd', position: 'relative', display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={() => setTip('Download')}
            onMouseLeave={() => setTip(null)}
          >
            {React.createElement(FaDownload as React.ComponentType<any>, { size: 16 })}
            {tip === 'Download' && (
              <span style={{
                position: 'absolute',
                top: -28,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#fff',
                color: '#6a5acd',
                border: '1px solid #eee',
                borderRadius: 6,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(106,90,205,0.10)',
                zIndex: 10,
                whiteSpace: 'nowrap',
              }}>Download</span>
            )}
          </a>
        )}
      </div>
      <style>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ProductCard; 