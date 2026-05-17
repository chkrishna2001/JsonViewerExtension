import { useState, useEffect, useRef } from 'react';
import JsonView from '@uiw/react-json-view';
import { githubLightTheme } from '@uiw/react-json-view/githubLight';
import { githubDarkTheme } from '@uiw/react-json-view/githubDark';

type Tab = 'RAW' | 'TREE' | 'TABLE';

export default function App() {
  const [data, setData] = useState<any>(null);
  const [sourceText, setSourceText] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('TREE');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [query, setQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [tableLimit, setTableLimit] = useState<number>(100);
  const [isExternal, setIsExternal] = useState<boolean>(false);
  const [hoverData, setHoverData] = useState<any>(null);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const sandboxRef = useRef<HTMLIFrameElement | null>(null);
  const hoverTimeout = useRef<number | null>(null);

  const processRawData = (text: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ action: 'PARSE', payload: text });
    }
  };

  const loadDataFromStorage = () => {
    chrome.storage.local.get(['jsonViewerData'], (result) => {
      if (result.jsonViewerData) {
        setSourceText(result.jsonViewerData as string);
        processRawData(result.jsonViewerData as string);
      }
    });
  };

  useEffect(() => {
    // Detect system theme
    const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };
    updateTheme(darkMatcher);
    darkMatcher.addEventListener('change', updateTheme);

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const isExt = params.get('source') === 'external';
    if (isExt) {
      setIsExternal(true);
      setActiveTab('TREE');
    }

    // Initialize Web Worker
    workerRef.current = new Worker(new URL('./worker/json.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      const { action, payload, error } = e.data;
      if (action === 'PARSE_SUCCESS' || action === 'QUERY_SUCCESS') {
        setData(payload);
        setError(null);
      } else if (action === 'ERROR') {
        setError(error);
      }
    };

    // Listen to Sandbox Messages
    const handleSandboxMessage = (e: MessageEvent) => {
      const { action, payload, error } = e.data;
      if (action === 'EVAL_JS_SUCCESS') {
        setData(payload);
        setError(null);
      } else if (action === 'EVAL_JS_ERROR') {
        setError(error);
      }
    };
    window.addEventListener('message', handleSandboxMessage);

    // Listen to Extension Messages (Background script passing initial data or updates)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'REFRESH_DATA') {
          loadDataFromStorage();
        }
      });
      if (isExt) {
        loadDataFromStorage();
      }
    } else {
      // Mock data for local testing
      const mock = { 
        hello: "world", 
        users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] 
      };
      setSourceText(JSON.stringify(mock, null, 2));
      setData(mock);
    }

    return () => {
      darkMatcher.removeEventListener('change', updateTheme);
      workerRef.current?.terminate();
      window.removeEventListener('message', handleSandboxMessage);
    };
  }, []);

  useEffect(() => {
    if (data !== null) {
      try {
        setResultText(JSON.stringify(data, null, 2));
      } catch {
        setResultText(String(data));
      }
    } else {
      setResultText('');
    }
  }, [data]);

  const handleQuery = () => {
    if (!query.trim()) {
      processRawData(sourceText);
      return;
    }
    const isJsonPath = query.startsWith('$');
    
    if (isJsonPath && workerRef.current) {
      workerRef.current.postMessage({
        action: 'QUERY',
        payload: {
          data: sourceText, // Send raw text to worker to avoid blocking main thread
          query,
          isJsonPath
        }
      });
    } else if (!isJsonPath && sandboxRef.current && sandboxRef.current.contentWindow) {
      // Evaluate arbitrary JS in the sandboxed iframe
      sandboxRef.current.contentWindow.postMessage({
        action: 'EVAL_JS',
        payload: {
          dataText: sourceText,
          query
        }
      }, '*');
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSourceText(val);
    processRawData(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setSourceText(text);
        processRawData(text);
        setActiveTab('TREE');
      };
      reader.readAsText(file);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleMouseEnter = (e: React.MouseEvent, val: any) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverData(val);
    // ensure tooltip doesn't go completely off-screen on the right
    setHoverPos({ x: Math.min(rect.left, window.innerWidth - 350), y: rect.bottom });
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = window.setTimeout(() => {
      setHoverData(null);
      setHoverPos(null);
    }, 200); // Small delay to allow mouse to enter the tooltip
  };

  const renderTable = () => {
    if (!data) return null;
    
    // We expect data to be an array of objects for best table view, 
    // or an object whose values are objects.
    let list: any[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (typeof data === 'object') {
      list = Object.values(data);
    }

    if (list.length === 0 || typeof list[0] !== 'object') {
      return <div>Data must be a collection of objects to display in table view.</div>;
    }

    const visibleList = list.slice(0, tableLimit);
    const columns = Array.from(new Set(visibleList.flatMap(obj => obj ? Object.keys(obj) : [])));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {columns.map(col => <th key={col}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleList.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => {
                    const val = row ? row[col] : undefined;
                    return (
                      <td key={col}>
                        {typeof val === 'object' && val !== null ? (
                          <span 
                            className="object-link" 
                            onMouseEnter={(e) => handleMouseEnter(e, val)}
                            onMouseLeave={handleMouseLeave}
                          >
                            {Array.isArray(val) ? `[Array(${val.length})]` : '{Object}'}
                          </span>
                        ) : String(val ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tableLimit < list.length && (
          <button className="btn" onClick={() => setTableLimit(l => l + 100)} style={{ alignSelf: 'flex-start' }}>
            Load 100 More ({list.length - tableLimit} remaining)
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <iframe ref={sandboxRef} src="/sandbox.html" style={{ display: 'none' }}></iframe>
      <header className="header">
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>JSON Query Tool</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!isExternal && (
            <div>
              <label htmlFor="file-upload" className="btn" style={{ cursor: 'pointer' }}>
                Upload File
              </label>
              <input 
                id="file-upload" 
                type="file" 
                accept=".json" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
            </div>
          )}
          <button className="btn" onClick={toggleTheme}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>

      {!isExternal && (
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
          <textarea 
            style={{ width: '100%', height: '150px', padding: '0.5rem', fontFamily: 'monospace', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
            value={sourceText}
            onChange={handleSourceChange}
            placeholder="Paste your JSON here to begin..."
          />
        </div>
      )}

      <div className="query-bar">
        <input 
          type="text" 
          className="query-input" 
          placeholder="Query (e.g. $.users[*] or data.filter(x => x.id === 1))"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
        />
        <button className="btn" onClick={handleQuery}>Run Query</button>
      </div>

      <div className="tabs" style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <button className={`tab-btn ${activeTab === 'RAW' ? 'active' : ''}`} onClick={() => setActiveTab('RAW')}>Raw Result</button>
        <button className={`tab-btn ${activeTab === 'TREE' ? 'active' : ''}`} onClick={() => setActiveTab('TREE')}>Tree View</button>
        <button className={`tab-btn ${activeTab === 'TABLE' ? 'active' : ''}`} onClick={() => setActiveTab('TABLE')}>Table View</button>
      </div>

      <main className="content">
        {error && <div style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>Error: {error}</div>}
        
        {activeTab === 'RAW' && (
          <textarea 
            className="raw-textarea" 
            value={resultText}
            readOnly
            placeholder="Result will appear here..."
          />
        )}
        
        {activeTab === 'TREE' && data && (
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: '4px' }}>
             <JsonView value={data} style={theme === 'dark' ? githubDarkTheme : githubLightTheme} displayDataTypes={false} />
          </div>
        )}
        
        {activeTab === 'TABLE' && renderTable()}
      </main>

      {hoverData && hoverPos && (
        <div 
          onMouseEnter={() => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
          }}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'fixed',
            top: hoverPos.y + 5,
            left: hoverPos.x,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            padding: '1rem',
            zIndex: 1000,
            width: '350px',
            maxHeight: '400px',
            overflow: 'auto'
          }}
        >
          <JsonView value={hoverData} style={theme === 'dark' ? githubDarkTheme : githubLightTheme} displayDataTypes={false} />
        </div>
      )}
    </div>
  );
}
