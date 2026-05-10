import { JSONPath } from 'jsonpath-plus';

self.onmessage = (e: MessageEvent) => {
  const { action, payload, id } = e.data;
  
  try {
    if (action === 'PARSE') {
      const parsed = JSON.parse(payload);
      self.postMessage({ action: 'PARSE_SUCCESS', payload: parsed, id });
    } else if (action === 'QUERY') {
      const { data, query, isJsonPath } = payload;
      let result;
      
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      if (isJsonPath) {
        result = JSONPath({ path: query, json: parsedData });
      } else {
        throw new Error("Queries must be valid JSONPath starting with '$'. JS evaluation is disabled in extensions.");
      }
      
      self.postMessage({ action: 'QUERY_SUCCESS', payload: result, id });
    }
  } catch (error: any) {
    self.postMessage({ action: 'ERROR', error: error.message, id });
  }
};
