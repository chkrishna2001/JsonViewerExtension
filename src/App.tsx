import { useState, useEffect, useRef, useMemo } from 'react';
import JsonView from '@uiw/react-json-view';
import { githubLightTheme } from '@uiw/react-json-view/githubLight';
import { githubDarkTheme } from '@uiw/react-json-view/githubDark';

type Tab = 'RAW' | 'TREE' | 'TABLE';

interface SavedQuery {
  id: string;
  name: string;
  query: string;
}

// Multi-Provider AI Settings Types
interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface AiConfig {
  enabled: boolean;
  systemPrompt: string;
  activeProvider: 'local' | 'openai' | 'gemini' | 'anthropic' | 'openrouter';
  providers: {
    local: ProviderConfig;
    openai: ProviderConfig;
    gemini: ProviderConfig;
    anthropic: ProviderConfig;
    openrouter: ProviderConfig;
  };
}

const defaultSystemPrompt = "You are a precise JSONPath generator. Translate natural language requests into a valid JSONPath query starting with '$'. Output ONLY the raw JSONPath query string. No explanations, no markdown formatting (like ```jsonpath), no wrapping quotes. E.g. 'first user email' should translate to '$.users[0].email'.";

const defaultAiConfig: AiConfig = {
  enabled: true,
  systemPrompt: defaultSystemPrompt,
  activeProvider: 'local',
  providers: {
    local: { apiKey: '', baseUrl: '', model: '' },
    openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    gemini: { apiKey: '', baseUrl: '', model: 'gemini-1.5-flash' },
    anthropic: { apiKey: '', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-latest' },
    openrouter: { apiKey: '', baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.5-flash' }
  }
};

// Inline custom SVG Icons for UI Actions
const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const BookmarkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.886L20 10.8l-6.088 1.914L12 18.6l-1.912-5.886L4 10.8l6.088-1.914zM5 3l.637 1.962L7.6 5.6l-1.963.638L5 8.2l-.637-1.962L2.4 5.6l1.963-.638z" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const geminiStaticModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp", "gemini-2.5-flash", "gemini-2.5-pro"];
const openaiStaticModels = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo", "o1-mini", "o1-preview"];
const anthropicStaticModels = ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest", "claude-3-sonnet-20240229", "claude-3-haiku-20240307", "claude-3-opus-20240229"];
const openrouterStaticModels = ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3-8b-instruct:free", "deepseek/deepseek-chat"];

export default function App() {
  const [data, setData] = useState<any>(null);
  const [sourceText, setSourceText] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('TREE');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [query, setQuery] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [tableLimit, setTableLimit] = useState<number>(100);
  const [isExternal, setIsExternal] = useState<boolean>(false);
  const [hoverData, setHoverData] = useState<any>(null);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);

  // Saved Queries states
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [showSavedPanel, setShowSavedPanel] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [newQueryName, setNewQueryName] = useState<string>('');
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);

  // AI Configurations states
  const [aiConfig, setAiConfig] = useState<AiConfig>(defaultAiConfig);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [tempAiConfig, setTempAiConfig] = useState<AiConfig>(defaultAiConfig);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);
  const [aiFetchError, setAiFetchError] = useState<string | null>(null);

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
    // 1. Persistent Theme Loading
    const loadTheme = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['theme'], (result) => {
          if (result.theme) {
            setTheme(result.theme as 'light' | 'dark');
            document.documentElement.setAttribute('data-theme', result.theme as string);
          } else {
            const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
            const sysTheme = darkMatcher.matches ? 'dark' : 'light';
            setTheme(sysTheme);
            document.documentElement.setAttribute('data-theme', sysTheme);
          }
        });
      } else {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') {
          setTheme(saved);
          document.documentElement.setAttribute('data-theme', saved);
        } else {
          const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
          const sysTheme = darkMatcher.matches ? 'dark' : 'light';
          setTheme(sysTheme);
          document.documentElement.setAttribute('data-theme', sysTheme);
        }
      }
    };
    loadTheme();

    // 2. Persistent Saved Queries Loading
    const loadSavedQueries = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['savedQueries'], (result) => {
          if (result.savedQueries) {
            setSavedQueries(result.savedQueries as SavedQuery[]);
          }
        });
      } else {
        try {
          const saved = localStorage.getItem('savedQueries');
          if (saved) {
            setSavedQueries(JSON.parse(saved));
          }
        } catch (e) {
          console.error('Failed to parse saved queries', e);
        }
      }
    };
    loadSavedQueries();

    // 3. Persistent AI Config Loading
    const loadAiConfig = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['aiConfig'], (result) => {
          if (result.aiConfig) {
            setAiConfig(result.aiConfig as AiConfig);
            setTempAiConfig(result.aiConfig as AiConfig);
          }
        });
      } else {
        try {
          const saved = localStorage.getItem('aiConfig');
          if (saved) {
            const parsed = JSON.parse(saved) as AiConfig;
            setAiConfig(parsed);
            setTempAiConfig(parsed);
          }
        } catch (e) {
          console.error('Failed to parse AI config', e);
        }
      }
    };
    loadAiConfig();

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
      const { action, payload, error, sourceAction } = e.data;
      if (action === 'PARSE_SUCCESS') {
        setData(payload);
        setJsonError(null);
        setQueryError(null);
      } else if (action === 'QUERY_SUCCESS') {
        setData(payload);
        setQueryError(null);
      } else if (action === 'ERROR') {
        if (sourceAction === 'PARSE') {
          setJsonError(error);
          setData(null);
        } else if (sourceAction === 'QUERY') {
          setQueryError(error);
          setData(null);
        }
      }
    };

    // Listen to Sandbox Messages
    const handleSandboxMessage = (e: MessageEvent) => {
      const { action, payload, error } = e.data;
      if (action === 'EVAL_JS_SUCCESS') {
        setData(payload);
        setQueryError(null);
      } else if (action === 'EVAL_JS_ERROR') {
        const friendlyError = error && (error.includes('CSP') || error.includes('Function'))
          ? "JavaScript query evaluation is restricted in Firefox due to strict Manifest V3 security policies. Please use standard JSONPath queries instead (starting with '$'), which are fully supported."
          : error;
        setQueryError(friendlyError);
        setData(null);
      }
    };
    window.addEventListener('message', handleSandboxMessage);

    // Listen to Extension Messages
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

  // Query Execution Helper
  const executeQuery = (queryText: string) => {
    setQueryError(null);
    const trimmed = queryText.trim();
    if (!trimmed) {
      processRawData(sourceText);
      return;
    }
    const isJsonPath = trimmed.startsWith('$');
    
    if (isJsonPath && workerRef.current) {
      workerRef.current.postMessage({
        action: 'QUERY',
        payload: {
          data: sourceText,
          query: trimmed,
          isJsonPath
        }
      });
    } else if (!isJsonPath && sandboxRef.current && sandboxRef.current.contentWindow) {
      sandboxRef.current.contentWindow.postMessage({
        action: 'EVAL_JS',
        payload: {
          dataText: sourceText,
          query: trimmed
        }
      }, '*');
    }
  };

  const handleQuery = () => {
    executeQuery(query);
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSourceText(val);
    setJsonError(null);
    processRawData(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setSourceText(text);
        setJsonError(null);
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
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme: newTheme });
    } else {
      localStorage.setItem('theme', newTheme);
    }
  };

  // Saved Queries Persistence & Actions
  const saveSavedQueries = (queries: SavedQuery[]) => {
    setSavedQueries(queries);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ savedQueries: queries });
    } else {
      localStorage.setItem('savedQueries', JSON.stringify(queries));
    }
  };

  const handleSaveQuery = () => {
    const name = newQueryName.trim();
    if (!name) return;

    if (editingQueryId) {
      const updated = savedQueries.map(q => 
        q.id === editingQueryId ? { ...q, name, query } : q
      );
      saveSavedQueries(updated);
      setEditingQueryId(null);
    } else {
      const newQuery: SavedQuery = {
        id: Date.now().toString(),
        name,
        query
      };
      saveSavedQueries([...savedQueries, newQuery]);
    }

    setNewQueryName('');
    setIsSaving(false);
    setShowSavedPanel(true);
  };

  const handleDeleteQuery = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedQueries.filter(q => q.id !== id);
    saveSavedQueries(updated);
    if (editingQueryId === id) {
      setEditingQueryId(null);
      setNewQueryName('');
      setIsSaving(false);
    }
  };

  const handleApplyQuery = (saved: SavedQuery) => {
    setQuery(saved.query);
    setQueryError(null);
    executeQuery(saved.query);
  };

  const handleEditClick = (saved: SavedQuery, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingQueryId(saved.id);
    setNewQueryName(saved.name);
    setQuery(saved.query);
    setIsSaving(true);
  };

  const getMinimalJsonSample = (val: any, depth = 0): any => {
    if (depth > 5) return "...";
    if (val === null) return null;
    if (typeof val !== 'object') {
      if (typeof val === 'string' && val.length > 80) {
        return val.substring(0, 77) + "...";
      }
      return val;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return [];
      return [getMinimalJsonSample(val[0], depth + 1)];
    }
    const pruned: { [key: string]: any } = {};
    const keys = Object.keys(val);
    const limitedKeys = keys.slice(0, 30);
    for (const key of limitedKeys) {
      pruned[key] = getMinimalJsonSample(val[key], depth + 1);
    }
    if (keys.length > 30) {
      pruned["..."] = `(${keys.length - 30} more properties)`;
    }
    return pruned;
  };

  const saveAiConfig = (config: AiConfig) => {
    setAiConfig(config);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ aiConfig: config });
    } else {
      localStorage.setItem('aiConfig', JSON.stringify(config));
    }
  };

  const handleGenerateJsonPath = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;

    setAiGenerating(true);
    setAiError(null);

    try {
      let prunedSchemaStr = "";
      if (data) {
        const prunedSample = getMinimalJsonSample(data);
        prunedSchemaStr = JSON.stringify(prunedSample, null, 2);
      } else if (sourceText.trim()) {
        try {
          const parsed = JSON.parse(sourceText);
          const prunedSample = getMinimalJsonSample(parsed);
          prunedSchemaStr = JSON.stringify(prunedSample, null, 2);
        } catch {
          // ignore parsing error
        }
      }

      const activeProvider = aiConfig.activeProvider;
      const providerConfig = aiConfig.providers[activeProvider];
      const modelName = providerConfig.model;
      const key = providerConfig.apiKey;
      const baseUrl = providerConfig.baseUrl;
      const systemPrompt = aiConfig.systemPrompt;

      const userMessage = prunedSchemaStr 
        ? `Here is the structural schema representing the JSON data:\n${prunedSchemaStr}\n\nTranslate this request into JSONPath: ${prompt}`
        : `Translate this request into JSONPath: ${prompt}`;

      console.log("AI Assist query generation payload sample:", prunedSchemaStr);

      let cleanPath = "";

      if (activeProvider === 'local') {
        const isEdge = navigator.userAgent.indexOf("Edg") !== -1;
        const flagsUrl = isEdge ? "edge://flags" : "chrome://flags";
        const browserName = isEdge ? "Microsoft Edge" : "Chrome";

        const aiObj = (window as any).ai;
        if (!aiObj) {
          throw new Error(`Local Gemini Nano is not detected in your browser. To enable, navigate to <code style='background-color: var(--bg-tertiary); padding: 2px 4px; border-radius: 4px;'>${flagsUrl}</code>, enable <strong>Prompt API for Gemini Nano</strong> and <strong>Optimization Guide On Device Model</strong>, relaunch ${browserName}, and wait a moment for the model to download.<br/><br/>Alternatively, click the ⚙️ Settings icon in the header to select a different AI provider (like Google Gemini, OpenAI, Anthropic, or OpenRouter) and use your own API key.`);
        }

        let session;
        if (aiObj.languageModel) {
          const caps = await aiObj.languageModel.capabilities();
          if (caps.available === 'no') {
            throw new Error(`On-device AI capabilities are disabled. Ensure 'Optimization Guide On Device Model' is set to 'Enabled' in <code style='background-color: var(--bg-tertiary); padding: 2px 4px; border-radius: 4px;'>${flagsUrl}</code>.<br/><br/>Alternatively, click the ⚙️ Settings icon in the header to select a different AI provider and use your own API key.`);
          }
          session = await aiObj.languageModel.create({ systemPrompt });
        } else if (aiObj.assistant) {
          const caps = await aiObj.assistant.capabilities();
          if (caps.available === 'no') {
            throw new Error(`On-device AI capabilities are disabled. Ensure 'Optimization Guide On Device Model' is set to 'Enabled' in <code style='background-color: var(--bg-tertiary); padding: 2px 4px; border-radius: 4px;'>${flagsUrl}</code>.<br/><br/>Alternatively, click the ⚙️ Settings icon in the header to select a different AI provider and use your own API key.`);
          }
          session = await aiObj.assistant.create({ systemPrompt });
        } else {
          throw new Error("Prompt API is not supported in this browser version. Click the ⚙️ Settings icon in the header to select a different AI provider and use your own API key.");
        }

        const response = await session.prompt(userMessage);
        cleanPath = response.trim();
      } 
      
      else if (activeProvider === 'gemini') {
        if (!key) throw new Error("Google Gemini API Key is missing. Open Settings to configure it.");
        
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userMessage }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.1 }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Gemini API returned status ${response.status}`);
        }

        const resData = await response.json();
        cleanPath = resData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      } 
      
      else if (activeProvider === 'openai' || activeProvider === 'openrouter') {
        if (!key) throw new Error(`API Key is missing for ${activeProvider === 'openrouter' ? 'OpenRouter' : 'OpenAI Specification'}. Open Settings to configure it.`);
        
        const endpoint = `${baseUrl}/chat/completions`;
        const headers: { [key: string]: string } = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        };

        if (activeProvider === 'openrouter') {
          headers["HTTP-Referer"] = "https://jsonquerytool.com";
          headers["X-Title"] = "JSON Query Tool";
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage }
            ],
            temperature: 0.1
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API returned status ${response.status}`);
        }

        const resData = await response.json();
        cleanPath = resData?.choices?.[0]?.message?.content?.trim() || "";
      } 
      
      else if (activeProvider === 'anthropic') {
        if (!key) throw new Error("Anthropic API Key is missing. Open Settings to configure it.");
        
        const endpoint = `${baseUrl}/messages`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: modelName,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 100,
            temperature: 0.1
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Anthropic API returned status ${response.status}`);
        }

        const resData = await response.json();
        cleanPath = resData?.content?.[0]?.text?.trim() || "";
      }

      if (cleanPath.startsWith('`')) {
        cleanPath = cleanPath.replace(/`/g, '');
      }
      if (cleanPath.toLowerCase().startsWith('jsonpath')) {
        cleanPath = cleanPath.substring(8).trim();
      }
      if (cleanPath.toLowerCase().startsWith('json')) {
        cleanPath = cleanPath.substring(4).trim();
      }
      
      if (!cleanPath) {
        throw new Error("Received empty response from AI model.");
      }

      setQuery(cleanPath);
      setAiPrompt('');
      setQueryError(null);
    } catch (e: any) {
      console.error("AI Assist generation error", e);
      setAiError(e.message || String(e));
    } finally {
      setAiGenerating(false);
    }
  };

  const handleFetchModels = async (provider: 'gemini' | 'openai' | 'openrouter') => {
    setIsFetchingModels(true);
    setAiFetchError(null);
    setFetchedModels([]);
    
    try {
      const providerConfig = tempAiConfig.providers[provider];
      const key = providerConfig.apiKey;
      const baseUrl = providerConfig.baseUrl;

      if (!key) {
        throw new Error(`API Key is missing for ${provider === 'gemini' ? 'Google Gemini' : provider === 'openai' ? 'OpenAI Specification' : 'OpenRouter'}. Please enter the key first.`);
      }

      if (provider === 'gemini') {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await fetch(endpoint);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Gemini API returned status ${response.status}`);
        }
        const data = await response.json();
        const list = (data?.models || [])
          .map((m: any) => m.name ? m.name.replace("models/", "") : "")
          .filter((name: string) => name !== "");
        
        if (list.length === 0) throw new Error("No models returned by Gemini API.");
        setFetchedModels(list);
      } 
      
      else if (provider === 'openai') {
        if (!baseUrl) throw new Error("API Base URL is missing for OpenAI Specification.");
        const endpoint = `${baseUrl}/models`;
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${key}`
          }
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `OpenAI API returned status ${response.status}`);
        }
        const data = await response.json();
        const list = (data?.data || [])
          .map((m: any) => m.id || "")
          .filter((id: string) => id !== "");
        
        if (list.length === 0) throw new Error("No models returned by OpenAI API.");
        setFetchedModels(list);
      } 
      
      else if (provider === 'openrouter') {
        const endpoint = `https://openrouter.ai/api/v1/models`;
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${key}`
          }
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `OpenRouter API returned status ${response.status}`);
        }
        const data = await response.json();
        const list = (data?.data || [])
          .map((m: any) => m.id || "")
          .filter((id: string) => id !== "");
        
        if (list.length === 0) throw new Error("No models returned by OpenRouter API.");
        setFetchedModels(list);
      }
    } catch (e: any) {
      console.error("Failed to fetch models", e);
      setAiFetchError(e.message || String(e));
    } finally {
      setIsFetchingModels(false);
    }
  };

  const getFilteredSuggestions = (provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter', currentTypedValue: string) => {
    let baseList: string[] = [];
    if (fetchedModels.length > 0 && tempAiConfig.activeProvider === provider) {
      baseList = fetchedModels;
    } else {
      if (provider === 'gemini') baseList = geminiStaticModels;
      else if (provider === 'openai') baseList = openaiStaticModels;
      else if (provider === 'anthropic') baseList = anthropicStaticModels;
      else if (provider === 'openrouter') baseList = openrouterStaticModels;
    }
    
    const query = (currentTypedValue || '').toLowerCase().trim();
    if (!query) {
      return baseList.slice(0, 15);
    }
    
    return baseList.filter(item => item.toLowerCase().includes(query)).slice(0, 15);
  };

  const handleMouseEnter = (e: React.MouseEvent, val: any) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverData(val);
    setHoverPos({ x: Math.min(rect.left, window.innerWidth - 350), y: rect.bottom });
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = window.setTimeout(() => {
      setHoverData(null);
      setHoverPos(null);
    }, 200);
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

  const renderedContent = useMemo(() => {
    if (!data && (jsonError || queryError)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
            {jsonError ? 'JSON Parsing Failed' : 'Query Execution Failed'}
          </h3>
          <p style={{ maxWidth: '500px', fontSize: '0.9rem', margin: 0, fontFamily: 'var(--mono, monospace)', color: 'var(--error-color)' }}>
            {jsonError || queryError}
          </p>
        </div>
      );
    }

    return (
      <>
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
      </>
    );
  }, [data, jsonError, queryError, activeTab, resultText, theme, tableLimit]);

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
          <button 
            className="icon-btn" 
            onClick={() => {
              setTempAiConfig({ ...aiConfig });
              setShowSettingsModal(true);
            }} 
            title="Settings"
            style={{ color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.45rem' }}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {!isExternal && (
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
          <textarea 
            style={{ 
              width: '100%', 
              height: '150px', 
              padding: '0.5rem', 
              fontFamily: 'monospace', 
              border: jsonError ? '1px solid var(--error-color)' : '1px solid var(--border-color)', 
              borderRadius: '4px', 
              backgroundColor: 'var(--bg-secondary)', 
              color: 'var(--text-primary)', 
              resize: 'vertical', 
              boxSizing: 'border-box',
              outline: 'none',
              boxShadow: jsonError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            value={sourceText}
            onChange={handleSourceChange}
            placeholder="Paste your JSON here to begin..."
          />
          {jsonError && (
            <div className="error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Invalid JSON: {jsonError}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.5rem', gap: '0.5rem' }}>
        
        {/* New AI Input Box directly above the main query box */}
        {aiConfig.enabled && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Ask AI to generate a query (e.g. 'get emails of active users')..."
              value={aiPrompt}
              onChange={(e) => {
                setAiPrompt(e.target.value);
                setAiError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateJsonPath()}
              disabled={aiGenerating}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            />
            <button 
              className="btn" 
              onClick={handleGenerateJsonPath} 
              disabled={aiGenerating || !aiPrompt.trim()}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              title="Generate JSONPath Query"
            >
              {aiGenerating ? 'Generating...' : 'Ask AI'}
            </button>
          </div>
        )}

        {aiError && (
          <div style={{ fontSize: '0.75rem', color: 'var(--error-color)', padding: '0.25rem 0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--error-color)', borderRadius: '4px', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: aiError }}>
          </div>
        )}

        {/* Standard query box row (with sparkles button removed!) */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="text" 
            className={`query-input ${queryError ? 'input-error' : ''}`}
            placeholder="Query (e.g. $.users[*] or data.filter(x => x.id === 1))"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setQueryError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleQuery();
              } else if (e.key === 'Escape') {
                setQuery('');
                setQueryError(null);
                processRawData(sourceText);
              }
            }}
          />
          <button 
            className="icon-btn" 
            onClick={() => {
              if (!query.trim()) return;
              setIsSaving(true);
              setNewQueryName('');
              setEditingQueryId(null);
              setShowSavedPanel(true);
            }}
            disabled={!query.trim()}
            style={{ opacity: query.trim() ? 1 : 0.4 }}
            title="Save current query"
          >
            <StarIcon />
          </button>
          <button 
            className="icon-btn" 
            onClick={() => setShowSavedPanel(!showSavedPanel)}
            style={{ position: 'relative', color: showSavedPanel ? 'var(--accent-color)' : 'inherit' }}
            title="Toggle saved queries panel"
          >
            <BookmarkIcon />
            {savedQueries.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                fontSize: '0.65rem',
                borderRadius: '50%',
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {savedQueries.length}
              </span>
            )}
          </button>
          <button className="btn icon-btn" onClick={handleQuery} title="Run query" style={{ display: 'flex', padding: '0.5rem' }}>
            <PlayIcon />
          </button>
        </div>
        {queryError && (
          <div style={{ color: 'var(--error-color)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', fontFamily: 'var(--mono, monospace)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Query Error: {queryError}</span>
          </div>
        )}

        {showSavedPanel && (
          <div className="saved-panel">
            <div className="saved-title">
              <span>Saved Queries ({savedQueries.length})</span>
              <button className="icon-btn" onClick={() => setShowSavedPanel(false)} title="Close panel">
                <CloseIcon />
              </button>
            </div>

            {isSaving && (
              <div className="save-form">
                <input 
                  type="text" 
                  placeholder={editingQueryId ? "Enter new query name..." : "Name this query..."}
                  value={newQueryName}
                  onChange={(e) => setNewQueryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveQuery()}
                  autoFocus
                />
                <button className="icon-btn" onClick={handleSaveQuery} title="Confirm save" disabled={!newQueryName.trim()}>
                  <CheckIcon />
                </button>
                <button className="icon-btn icon-btn-danger" onClick={() => { setIsSaving(false); setEditingQueryId(null); }} title="Cancel">
                  <CloseIcon />
                </button>
              </div>
            )}

            <div className="saved-list">
              {savedQueries.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem 0' }}>
                  No saved queries yet. Enter a query in the text box and click the star ⭐ icon to save it.
                </div>
              ) : (
                savedQueries.map((q) => (
                  <div key={q.id} className="saved-item">
                    <div className="saved-item-details" onClick={() => handleApplyQuery(q)} style={{ cursor: 'pointer' }}>
                      <span className="saved-item-name" title={q.name}>{q.name}</span>
                      <span className="saved-item-query" title={q.query}>{q.query}</span>
                    </div>
                    <div className="saved-item-actions">
                      <button className="icon-btn" onClick={() => handleApplyQuery(q)} title="Apply query">
                        <CheckIcon />
                      </button>
                      <button className="icon-btn" onClick={(e) => handleEditClick(q, e)} title="Edit name/query">
                        <EditIcon />
                      </button>
                      <button className="icon-btn icon-btn-danger" onClick={(e) => handleDeleteQuery(q.id, e)} title="Delete query">
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="tabs" style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <button className={`tab-btn ${activeTab === 'RAW' ? 'active' : ''}`} onClick={() => setActiveTab('RAW')}>Raw Result</button>
        <button className={`tab-btn ${activeTab === 'TREE' ? 'active' : ''}`} onClick={() => setActiveTab('TREE')}>Tree View</button>
        <button className={`tab-btn ${activeTab === 'TABLE' ? 'active' : ''}`} onClick={() => setActiveTab('TABLE')}>Table View</button>
      </div>

      <main className="content">
        {renderedContent}
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                ⚙️ JSON Query Tool Settings
              </h3>
              <button 
                className="icon-btn" 
                onClick={() => setShowSettingsModal(false)}
                title="Close Settings"
              >
                <CloseIcon />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="settings-checkbox-group">
                <input 
                  type="checkbox" 
                  id="enable-ai" 
                  checked={tempAiConfig.enabled}
                  onChange={(e) => setTempAiConfig({ ...tempAiConfig, enabled: e.target.checked })}
                />
                <label htmlFor="enable-ai">Enable AI Query Assist</label>
              </div>

              {tempAiConfig.enabled && (
                <>
                  <div className="settings-form-group">
                    <label htmlFor="ai-provider">AI Provider</label>
                    <select 
                      id="ai-provider"
                      value={tempAiConfig.activeProvider}
                      onChange={(e) => {
                        const provider = e.target.value as any;
                        setTempAiConfig({ ...tempAiConfig, activeProvider: provider });
                        setFetchedModels([]);
                        setAiFetchError(null);
                      }}
                    >
                      <option value="local">Chrome Local AI (Gemini Nano)</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI Specification (Custom Endpoint)</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="openrouter">OpenRouter</option>
                    </select>
                  </div>

                  {tempAiConfig.activeProvider === 'local' && (
                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <p className="settings-info-text" style={{ margin: 0 }}>
                        <strong>Chrome Local AI</strong> runs 100% locally and key-less using Gemini Nano.
                      </p>
                      <p className="settings-info-text" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
                        Ensure <code>chrome://flags/#prompt-api-for-gemini-nano</code> and <code>chrome://flags/#optimization-guide-on-device-model</code> are set to <strong>Enabled</strong> and relaunch your browser.
                      </p>
                    </div>
                  )}

                  {tempAiConfig.activeProvider === 'gemini' && (
                    <>
                      <div className="settings-form-group">
                        <label htmlFor="gemini-key">Google Gemini API Key</label>
                        <input 
                          type="password" 
                          id="gemini-key"
                          placeholder="AIzaSy..."
                          value={tempAiConfig.providers.gemini.apiKey}
                          onChange={(e) => {
                            const updated = { ...tempAiConfig.providers.gemini, apiKey: e.target.value };
                            setTempAiConfig({
                              ...tempAiConfig,
                              providers: { ...tempAiConfig.providers, gemini: updated }
                            });
                          }}
                        />
                      </div>
                      <div className="settings-form-group">
                        <label htmlFor="gemini-model">Model Name</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <input 
                              type="text" 
                              id="gemini-model"
                              value={tempAiConfig.providers.gemini.model}
                              onChange={(e) => {
                                const updated = { ...tempAiConfig.providers.gemini, model: e.target.value };
                                setTempAiConfig({
                                  ...tempAiConfig,
                                  providers: { ...tempAiConfig.providers, gemini: updated }
                                });
                                setActiveSuggestionField('gemini');
                              }}
                              onFocus={() => {
                                setActiveSuggestionField('gemini');
                                setAiFetchError(null);
                              }}
                              onBlur={() => {
                                setTimeout(() => setActiveSuggestionField(null), 200);
                              }}
                              placeholder="e.g. gemini-1.5-flash"
                              autoComplete="off"
                            />
                            {activeSuggestionField === 'gemini' && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 9999,
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
                                marginTop: '4px'
                              }}>
                                {getFilteredSuggestions('gemini', tempAiConfig.providers.gemini.model).map((suggestion) => (
                                  <div
                                    key={suggestion}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      const updated = { ...tempAiConfig.providers.gemini, model: suggestion };
                                      setTempAiConfig({
                                        ...tempAiConfig,
                                        providers: { ...tempAiConfig.providers, gemini: updated }
                                      });
                                      setActiveSuggestionField(null);
                                    }}
                                    style={{
                                      padding: '0.5rem',
                                      cursor: 'pointer',
                                      fontSize: '0.825rem',
                                      borderBottom: '1px solid var(--border-color)',
                                      color: 'var(--text-primary)'
                                    }}
                                    className="suggestion-item"
                                  >
                                    {suggestion}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleFetchModels('gemini')}
                            disabled={isFetchingModels}
                            style={{ padding: '0 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            title="Fetch live models from Gemini API"
                          >
                            {isFetchingModels && activeSuggestionField === 'gemini' ? 'Fetching...' : 'Fetch List'}
                          </button>
                        </div>
                        {aiFetchError && activeSuggestionField === 'gemini' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--error-color)', marginTop: '0.25rem' }}>
                            ⚠️ {aiFetchError}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {tempAiConfig.activeProvider === 'openai' && (
                    <>
                      <div className="settings-form-group">
                        <label htmlFor="openai-url">API Base URL</label>
                        <input 
                          type="text" 
                          id="openai-url"
                          placeholder="https://api.openai.com/v1"
                          value={tempAiConfig.providers.openai.baseUrl}
                          onChange={(e) => {
                            const updated = { ...tempAiConfig.providers.openai, baseUrl: e.target.value };
                            setTempAiConfig({
                              ...tempAiConfig,
                              providers: { ...tempAiConfig.providers, openai: updated }
                            });
                          }}
                        />
                        <span className="settings-info-text">Supports OpenAI, LiteLLM, LM Studio, Ollama, etc.</span>
                      </div>
                      <div className="settings-form-group">
                        <label htmlFor="openai-key">API Key</label>
                        <input 
                          type="password" 
                          id="openai-key"
                          placeholder="sk-..."
                          value={tempAiConfig.providers.openai.apiKey}
                          onChange={(e) => {
                            const updated = { ...tempAiConfig.providers.openai, apiKey: e.target.value };
                            setTempAiConfig({
                              ...tempAiConfig,
                              providers: { ...tempAiConfig.providers, openai: updated }
                            });
                          }}
                        />
                      </div>
                      <div className="settings-form-group">
                        <label htmlFor="openai-model">Model Name</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <input 
                              type="text" 
                              id="openai-model"
                              value={tempAiConfig.providers.openai.model}
                              onChange={(e) => {
                                const updated = { ...tempAiConfig.providers.openai, model: e.target.value };
                                setTempAiConfig({
                                  ...tempAiConfig,
                                  providers: { ...tempAiConfig.providers, openai: updated }
                                });
                                setActiveSuggestionField('openai');
                              }}
                              onFocus={() => {
                                setActiveSuggestionField('openai');
                                setAiFetchError(null);
                              }}
                              onBlur={() => {
                                setTimeout(() => setActiveSuggestionField(null), 200);
                              }}
                              placeholder="e.g. gpt-4o-mini"
                              autoComplete="off"
                            />
                            {activeSuggestionField === 'openai' && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 9999,
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
                                marginTop: '4px'
                              }}>
                                {getFilteredSuggestions('openai', tempAiConfig.providers.openai.model).map((suggestion) => (
                                  <div
                                    key={suggestion}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      const updated = { ...tempAiConfig.providers.openai, model: suggestion };
                                      setTempAiConfig({
                                        ...tempAiConfig,
                                        providers: { ...tempAiConfig.providers, openai: updated }
                                      });
                                      setActiveSuggestionField(null);
                                    }}
                                    style={{
                                      padding: '0.5rem',
                                      cursor: 'pointer',
                                      fontSize: '0.825rem',
                                      borderBottom: '1px solid var(--border-color)',
                                      color: 'var(--text-primary)'
                                    }}
                                    className="suggestion-item"
                                  >
                                    {suggestion}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleFetchModels('openai')}
                            disabled={isFetchingModels}
                            style={{ padding: '0 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            title="Fetch live models from Custom API"
                          >
                            {isFetchingModels && activeSuggestionField === 'openai' ? 'Fetching...' : 'Fetch List'}
                          </button>
                        </div>
                        {aiFetchError && activeSuggestionField === 'openai' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--error-color)', marginTop: '0.25rem' }}>
                            ⚠️ {aiFetchError}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {tempAiConfig.activeProvider === 'anthropic' && (
                    <>
                      <div className="settings-form-group">
                        <label htmlFor="anthropic-url">API Base URL</label>
                        <input 
                          type="text" 
                          id="anthropic-url"
                          value={tempAiConfig.providers.anthropic.baseUrl}
                          onChange={(e) => {
                            const updated = { ...tempAiConfig.providers.anthropic, baseUrl: e.target.value };
                            setTempAiConfig({
                              ...tempAiConfig,
                              providers: { ...tempAiConfig.providers, anthropic: updated }
                            });
                          }}
                        />
                      </div>
                      <div className="settings-form-group">
                        <label htmlFor="anthropic-key">Anthropic API Key</label>
                        <input 
                          type="password" 
                          id="anthropic-key"
                          placeholder="sk-ant-..."
                          value={tempAiConfig.providers.anthropic.apiKey}
                          onChange={(e) => {
                            const updated = { ...tempAiConfig.providers.anthropic, apiKey: e.target.value };
                            setTempAiConfig({
                              ...tempAiConfig,
                              providers: { ...tempAiConfig.providers, anthropic: updated }
                            });
                          }}
                        />
                      </div>
                      <div className="settings-form-group">
                        <label htmlFor="anthropic-model">Model Name</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="text" 
                            id="anthropic-model"
                            value={tempAiConfig.providers.anthropic.model}
                            onChange={(e) => {
                              const updated = { ...tempAiConfig.providers.anthropic, model: e.target.value };
                              setTempAiConfig({
                                ...tempAiConfig,
                                providers: { ...tempAiConfig.providers, anthropic: updated }
                              });
                              setActiveSuggestionField('anthropic');
                            }}
                            onFocus={() => {
                              setActiveSuggestionField('anthropic');
                              setAiFetchError(null);
                            }}
                            onBlur={() => {
                              setTimeout(() => setActiveSuggestionField(null), 200);
                            }}
                            placeholder="e.g. claude-3-5-sonnet-latest"
                            autoComplete="off"
                          />
                          {activeSuggestionField === 'anthropic' && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 9999,
                              backgroundColor: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
                              marginTop: '4px'
                            }}>
                              {getFilteredSuggestions('anthropic', tempAiConfig.providers.anthropic.model).map((suggestion) => (
                                <div
                                  key={suggestion}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    const updated = { ...tempAiConfig.providers.anthropic, model: suggestion };
                                    setTempAiConfig({
                                      ...tempAiConfig,
                                      providers: { ...tempAiConfig.providers, anthropic: updated }
                                    });
                                    setActiveSuggestionField(null);
                                  }}
                                  style={{
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.825rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                  }}
                                  className="suggestion-item"
                                >
                                  {suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {tempAiConfig.activeProvider === 'openrouter' && (
                    <>
                      <div className="settings-form-group">
                        <label htmlFor="openrouter-key">OpenRouter API Key</label>
                        <input 
                          type="password" 
                          id="openrouter-key"
                          placeholder="sk-or-..."
                          value={tempAiConfig.providers.openrouter.apiKey}
                          onChange={(e) => {
                            const updated = { ...tempAiConfig.providers.openrouter, apiKey: e.target.value };
                            setTempAiConfig({
                              ...tempAiConfig,
                              providers: { ...tempAiConfig.providers, openrouter: updated }
                            });
                          }}
                        />
                      </div>
                      <div className="settings-form-group">
                        <label htmlFor="openrouter-model">Model Name</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <input 
                              type="text" 
                              id="openrouter-model"
                              value={tempAiConfig.providers.openrouter.model}
                              onChange={(e) => {
                                const updated = { ...tempAiConfig.providers.openrouter, model: e.target.value };
                                setTempAiConfig({
                                  ...tempAiConfig,
                                  providers: { ...tempAiConfig.providers, openrouter: updated }
                                });
                                setActiveSuggestionField('openrouter');
                              }}
                              onFocus={() => {
                                setActiveSuggestionField('openrouter');
                                setAiFetchError(null);
                              }}
                              onBlur={() => {
                                setTimeout(() => setActiveSuggestionField(null), 200);
                              }}
                              placeholder="e.g. google/gemini-2.5-flash"
                              autoComplete="off"
                            />
                            {activeSuggestionField === 'openrouter' && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 9999,
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
                                marginTop: '4px'
                              }}>
                                {getFilteredSuggestions('openrouter', tempAiConfig.providers.openrouter.model).map((suggestion) => (
                                  <div
                                    key={suggestion}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      const updated = { ...tempAiConfig.providers.openrouter, model: suggestion };
                                      setTempAiConfig({
                                        ...tempAiConfig,
                                        providers: { ...tempAiConfig.providers, openrouter: updated }
                                      });
                                      setActiveSuggestionField(null);
                                    }}
                                    style={{
                                      padding: '0.5rem',
                                      cursor: 'pointer',
                                      fontSize: '0.825rem',
                                      borderBottom: '1px solid var(--border-color)',
                                      color: 'var(--text-primary)'
                                    }}
                                    className="suggestion-item"
                                  >
                                    {suggestion}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleFetchModels('openrouter')}
                            disabled={isFetchingModels}
                            style={{ padding: '0 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            title="Fetch live models from OpenRouter API"
                          >
                            {isFetchingModels && activeSuggestionField === 'openrouter' ? 'Fetching...' : 'Fetch List'}
                          </button>
                        </div>
                        {aiFetchError && activeSuggestionField === 'openrouter' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--error-color)', marginTop: '0.25rem' }}>
                            ⚠️ {aiFetchError}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="settings-form-group" style={{ marginTop: '0.5rem' }}>
                    <label htmlFor="ai-system-prompt">AI System Prompt</label>
                    <textarea 
                      id="ai-system-prompt"
                      rows={3}
                      value={tempAiConfig.systemPrompt}
                      onChange={(e) => setTempAiConfig({ ...tempAiConfig, systemPrompt: e.target.value })}
                      style={{ resize: 'vertical', fontFamily: 'sans-serif', fontSize: '0.8rem', lineHeight: '1.4' }}
                    />
                  </div>
                </>
              )}

              <div className="modal-footer">
                <button 
                  className="btn btn-outline" 
                  onClick={() => setShowSettingsModal(false)}
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button 
                  className="btn" 
                  onClick={() => {
                    saveAiConfig(tempAiConfig);
                    setShowSettingsModal(false);
                    setAiError(null);
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
