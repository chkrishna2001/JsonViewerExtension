window.addEventListener('message', function(event) {
  const { action, payload, id } = event.data;
  
  if (action === 'EVAL_JS') {
    try {
      const { dataText, query } = payload;
      const data = typeof dataText === 'string' ? JSON.parse(dataText) : dataText;
      // Using new Function is allowed here because of the sandbox CSP
      const queryFunc = new Function('data', `return ${query}`);
      const result = queryFunc(data);
      
      event.source.postMessage({
        action: 'EVAL_JS_SUCCESS',
        payload: result,
        id: id
      }, event.origin);
    } catch (error) {
      event.source.postMessage({
        action: 'EVAL_JS_ERROR',
        error: error.message || String(error),
        id: id
      }, event.origin);
    }
  }
});
