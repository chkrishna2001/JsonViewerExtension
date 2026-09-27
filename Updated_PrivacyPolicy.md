# Privacy Policy for JSON Query Tool

**Last Updated: September 27, 2026**

The JSON Query Tool browser extension ("the Extension") is designed with strict privacy and security in mind. This Privacy Policy outlines our data practices.

### 1. Data Collection and Usage
**The Extension operates primarily locally on your device.** 
When you use the Extension to view or parse JSON data—whether uploaded manually or extracted via the browser context menu—the core processing occurs strictly within your browser using local Web Workers.

**AI Assist Feature:**
If you choose to use the "AI Assist" feature, the Extension will prompt you for explicit consent. Once consent is granted, the structural schema of your active JSON data (keys and minimal structural representation, without full payloads) and your natural language query are sent to your configured AI provider (such as Google Gemini, OpenAI, Anthropic, or OpenRouter) to generate a JSONPath query. **No user-identifiable data or full JSON payloads are transmitted unless they are part of the JSON structure keys.** 

### 2. Website Content and Permissions
The Extension requires host permissions (`<all_urls>`) solely to enable the "Right-Click to Open in JSON Query Tool" context menu feature. This allows the extension to extract JSON text from the active webpage you are viewing. This extracted data is immediately passed to the local viewer tab. Aside from the explicit usage of the AI Assist feature described above, data is **never** sent to any external servers, third parties, or analytics trackers.

### 3. Contact
If you have any questions or concerns about this privacy policy, please open an issue on our GitHub repository.
