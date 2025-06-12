import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchProductsStart, fetchNextPage } from '../features/products/productsSlice';
import ProductCard from '../components/ProductCard';
import { RootState } from '../app/store';
import { DigitalProduct, ConsoleCardProduct, DummyProduct } from '../features/products/types';
import { FaGamepad, FaRegCreditCard, FaRobot, FaSearch } from 'react-icons/fa';
import axios from 'axios';

const TABS = [
  { key: 'digital', label: 'Digital Game', icon: FaGamepad },
  { key: 'consoleCard', label: 'Console Card Game', icon: FaRegCreditCard },
  { key: 'Dummy', label: 'Dummy Game', icon: FaRegCreditCard },
];

const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, 
    digital, consoleCard, dummy, 
    digitalHasMore, consoleCardHasMore, 
    digitalPage, consoleCardPage, dummyPage, dummyHasMore 
  } = useAppSelector((state: RootState) => state.products);
  const [tab, setTab] = useState<'digital' | 'consoleCard' | 'dummy'>('dummy');
  const loader = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  // AI Chat Bot
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('Recommend a game for me!');
  const [chatUserId, setChatUserId] = useState('u1');
  const [chatOutput, setChatOutput] = useState('');
  const [chatStatus, setChatStatus] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // init load
    dispatch(fetchProductsStart({ type: tab, page: 1 }));
  }, [dispatch, tab]);

  // infinite scroll
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !loading) {
      if (tab === 'digital' && digitalHasMore) {
        dispatch(fetchNextPage({ type: 'digital', page: digitalPage + 1 }));
      } else if (tab === 'consoleCard' && consoleCardHasMore) {
        dispatch(fetchNextPage({ type: 'consoleCard', page: consoleCardPage + 1 }));
      } 
      // else if (tab === 'dummy' && dummyHasMore) {
      //   dispatch(fetchNextPage({ type: 'dummy', page: dummyPage + 1 }));
      // }
    }
  }, [dispatch, tab, loading, digitalHasMore, consoleCardHasMore, dummyHasMore, digitalPage, consoleCardPage, dummyPage]);

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '20px',
      threshold: 1.0,
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loader.current) observer.observe(loader.current);
    return () => {
      if (loader.current) observer.unobserve(loader.current);
    };
  }, [handleObserver]);

  // global search
  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    setShowSearchModal(true);
    try {
      const res = await axios.get(`http://localhost:3000/products/es-search?keyword=${encodeURIComponent(search)}&page=1&itemsPerPage=10`);
      setSearchResult(res.data.data);
    } catch (e: any) {
      setSearchError(e.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    setChatOutput('');
    setChatStatus('Connecting...');
    const ws = new window.WebSocket('ws://' + window.location.hostname + ':3002');
    wsRef.current = ws;
    ws.onopen = () => {
      setChatStatus('Connected.');
      ws.send(JSON.stringify({ input: chatInput, userId: chatUserId }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'token') {
        setChatOutput(prev => prev + msg.data);
      } else if (msg.type === 'end') {
        setChatStatus('Done.');
      } else if (msg.type === 'error') {
        setChatStatus('Error: ' + msg.data);
      }
    };
    ws.onerror = () => {
      setChatStatus('WebSocket error.');
    };
    ws.onclose = () => {
      setChatStatus(s => s + ' (Connection closed)');
    };
  };
  const handleCloseChat = () => {
    setShowChat(false);
    setChatInput('');
    setChatOutput('');
    setChatStatus('');
    wsRef.current?.close();
  };

  // 响应式样式
  const containerStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: 16,
    position: 'relative',
    minHeight: '100vh',
    boxSizing: 'border-box',
    fontSize: 13,
    fontFamily: 'system-ui, Arial, sans-serif',
    background: '#f7f8fa',
  };
  const productListStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    minHeight: 300,
    justifyContent: 'center',
    gap: 16,
  };
  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(30, 34, 54, 0.92)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflowY: 'auto',
    paddingTop: 40,
    animation: 'fadeInModal 0.3s',
  };
  const searchCardStyle: React.CSSProperties = {
    border: '1px solid #eee',
    borderRadius: 14,
    margin: 10,
    padding: 12,
    width: 340,
    background: '#fff',
    boxShadow: '0 2px 8px rgba(106,90,205,0.10)',
    maxWidth: '95vw',
    fontSize: 13,
  };
  // 响应式媒体查询
  const responsiveStyle = `
    @media (max-width: 900px) {
      .product-list { gap: 8px; }
      .product-card, .search-card { width: 98vw !important; min-width: 0 !important; }
      .tab-bar { font-size: 12px !important; }
    }
    @media (max-width: 600px) {
      .container { padding: 4px !important; }
      .tab-bar { font-size: 11px !important; }
      .search-bar input, .search-bar button { font-size: 12px !important; }
      .ai-chat-bot { right: 6px !important; bottom: 6px !important; }
      .ai-chat-modal { right: 0 !important; left: 0 !important; width: 100vw !important; border-radius: 0 !important; }
      .tab-label { display: none !important; }
      .search-btn { border-radius: 50% !important; width: 38px !important; height: 38px !important; padding: 0 !important; min-width: 0 !important; }
      .search-btn-text { display: none !important; }
      .search-btn-icon { display: inline-block !important; }
    }
    .search-btn {
      background: linear-gradient(90deg, #6a5acd 0%, #a18cd1 100%);
      color: #fff;
      font-weight: 700;
      border: none;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(106,90,205,0.10);
      padding: 7px 20px;
      font-size: 14px;
      letter-spacing: 1px;
      transition: background 0.2s;
      min-width: 80px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .search-btn:hover {
      background: linear-gradient(90deg, #a18cd1 0%, #6a5acd 100%);
      filter: brightness(1.08);
    }
    .search-btn-icon { display: none; }
    .tab-label { display: inline; margin-left: 6px; }
    .ai-chat-bot-btn {
      background: linear-gradient(120deg, #6a5acd 0%, #a18cd1 100%);
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 54px;
      height: 54px;
      box-shadow: 0 4px 16px rgba(106,90,205,0.18);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      transition: all 0.2s;
      border: 2px solid #fff;
    }
    .ai-chat-bot-btn:hover {
      filter: brightness(1.08);
      box-shadow: 0 8px 32px rgba(106,90,205,0.22);
    }
    .ai-chat-modal {
      font-size: 13px !important;
    }
  `;

  return (
    <div className="container" style={containerStyle}>
      <style>{responsiveStyle}</style>
      {/* search bar */}
      <div className="search-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 12, marginBottom: 24, flexWrap: 'wrap', gap: 6 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search game name..."
          style={{ padding: '6px 12px', fontSize: 13, borderRadius: 6, border: '1px solid #ccc', width: 200, marginRight: 8, maxWidth: '90vw' }}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button
          onClick={handleSearch}
          className="search-btn"
          disabled={searchLoading}
        >
          <span className="search-btn-text">{searchLoading ? 'Searching...' : 'Search'}</span>
          <span className="search-btn-icon">{React.createElement(FaSearch as React.ComponentType<any>, { size: 16 })}</span>
        </button>
      </div>
      {/* search modal */}
      {showSearchModal && (
        <div style={modalStyle}>
          <button
            onClick={() => setShowSearchModal(false)}
            style={{
              position: 'fixed',
              top: 18,
              right: 24,
              zIndex: 10000,
              background: 'linear-gradient(90deg, #a18cd1 0%, #6a5acd 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 700,
              padding: '6px 18px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(106,90,205,0.10)',
              letterSpacing: 1,
            }}
          >
            Close
          </button>
          <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', marginTop: 18 }}>
            <h2 style={{ color: '#fff', margin: '0 0 12px 0', textAlign: 'center', fontWeight: 700, fontSize: 20 }}>Search Result</h2>
            {searchLoading && <div style={{ color: '#fff', textAlign: 'center', marginBottom: 12 }}>Searching...</div>}
            {searchError && <div style={{ color: 'red', textAlign: 'center', marginBottom: 12 }}>{searchError}</div>}
            <div className="product-list" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
              {searchResult && searchResult.length === 0 && <span style={{ color: '#fff' }}>No result</span>}
              {searchResult && searchResult.map((item: any) => (
                <div className="search-card" key={item.id} style={searchCardStyle}>
                  <img src={item.images?.[0]} alt={item.name} style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 10, marginBottom: 6 }} />
                  <div style={{ fontWeight: 700, color: '#6a5acd', fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                  <div style={{ color: '#6a5acd', fontWeight: 600, fontSize: 12 }}>${item.price}</div>
                  <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{item.type === 'digital' ? 'Digital Game' : 'Console Card Game'}</div>
                </div>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes fadeInModal {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}
      {/* original tab and product list */}
      <div className="tab-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '2px solid #eee', marginBottom: 16, position: 'relative', height: 48 }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              onClick={() => setTab(t.key as 'digital' | 'consoleCard' | 'dummy')}
              style={{
                padding: '7px 18px',
                cursor: 'pointer',
                borderBottom: tab === t.key ? '2px solid #6a5acd' : '2px solid transparent',
                color: tab === t.key ? '#6a5acd' : '#333',
                fontWeight: tab === t.key ? 600 : 400,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                margin: '0 8px',
                transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
                position: 'relative',
                zIndex: 1,
                background: tab === t.key ? 'linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%)' : 'transparent',
                borderRadius: tab === t.key ? '8px 8px 0 0' : '8px',
                boxShadow: tab === t.key ? '0 2px 8px rgba(106,90,205,0.10)' : 'none',
                transform: tab === t.key ? 'scale(1.03)' : 'scale(1)',
                animation: tab === t.key ? 'tabActiveAnim 0.4s' : undefined,
              }}
            >
              {Icon && React.createElement(Icon as React.ComponentType<any>, { size: 14 })}
              <span className="tab-label">{t.label}</span>
            </div>
          );
        })}
        <style>{`
          @keyframes tabActiveAnim {
            from { opacity: 0.5; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1.03); }
          }
        `}</style>
      </div>
      {error && <p style={{ color: 'red', fontSize: 12 }}>{error}</p>}
      <div className="product-list" style={productListStyle}>
        {tab === 'digital' && digital.map((item: DigitalProduct) => (
          <ProductCard key={item.game_id} product={item} type="digital" />
        ))}
        {tab === 'consoleCard' && consoleCard.map((item: ConsoleCardProduct) => (
          <ProductCard key={item.game_id} product={item} type="consoleCard" />
        ))}
        {tab === 'dummy' && dummy.map((item: DummyProduct) => (
          <div key={item.game_id}>dummy {item.game_id}</div>
        ))}
      </div>
      <div ref={loader} style={{ height: 32, margin: 10, textAlign: 'center', fontSize: 12 }}>
        {loading && <span>Loading...</span>}
        {!loading && ((tab === 'digital' && !digitalHasMore) || (tab === 'consoleCard' && !consoleCardHasMore)) && <span>No more games</span>}
      </div>
      {/* AI Chat Bot */}
      <div className="ai-chat-bot" style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 10001 }}>
        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="ai-chat-bot-btn"
            title="AI Chat Bot"
          >
            {React.createElement(FaRobot as React.ComponentType<any>, { size: 26 })}
          </button>
        )}
        {showChat && (
          <div className="ai-chat-modal" style={{
            position: 'fixed',
            right: 18,
            bottom: 80,
            width: 340,
            maxWidth: '98vw',
            maxHeight: '70vh',
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(106,90,205,0.18)',
            zIndex: 10002,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeInCard 0.4s',
            fontSize: 13,
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, #a18cd1 0%, #6a5acd 100%)', borderRadius: '14px 14px 0 0' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center' }}>{React.createElement(FaRobot as React.ComponentType<any>, { size: 15, style: { marginRight: 6 } })}AI Chat Bot</span>
              <button onClick={handleCloseChat} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>×</button>
            </div>
            <div style={{ padding: 10, flex: 1, overflowY: 'auto', fontSize: 13, color: '#333', background: '#fafaff' }}>
              <div style={{ minHeight: 60, whiteSpace: 'pre-wrap', marginBottom: 6 }}>{chatOutput}</div>
              <div style={{ color: '#888', fontSize: 11 }}>{chatStatus}</div>
            </div>
            <div style={{ padding: 8, borderTop: '1px solid #eee', background: '#fafaff', display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask me anything..."
                style={{ flex: 1, padding: '6px 8px', fontSize: 13, borderRadius: 6, border: '1px solid #ccc' }}
                onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
              />
              <button
                onClick={handleSendChat}
                style={{ padding: '6px 12px', fontSize: 13, borderRadius: 6, border: 'none', background: 'linear-gradient(90deg, #a18cd1 0%, #6a5acd 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home; 