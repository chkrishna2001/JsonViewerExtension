# JSON Query Tool

A powerful, high-performance browser extension for viewing, querying, and analyzing JSON data directly in your browser. Built with React, TypeScript, and Vite, this extension leverages Web Workers and Sandboxed Iframes to handle massive JSON payloads without freezing your browser.

## Features

- **Blazing Fast Parsing**: Offloads `JSON.parse()` to a background Web Worker so your browser never hangs, even on large JSON files.
- **Advanced Querying**: Securely evaluate raw JavaScript (e.g., `data.filter(x => x.id === 1)`) or standard JSONPath queries (e.g., `$.users[*]`) directly against your data.
- **Three Dynamic Views**:
  - **Raw Result**: View the raw, formatted string of your data or query output.
  - **Tree View**: An interactive, collapsible node-based viewer for deep inspection.
  - **Table View**: Intelligently maps arrays of objects into a structured table. Hovering over any nested array or object opens a floating popover for quick inspection without losing your place.
- **Deep Browser Integration**:
  - **Context Menu**: Right-click anywhere on a webpage, select "Open in JSON Query Tool", and the extension will automatically extract the nearest JSON container from the page.
  - **Live Reloading**: When opened via the context menu, the extension sets up a `MutationObserver` on the webpage. If the underlying JSON data changes, your viewer updates automatically!
  - **File Interception**: Navigating to a raw `.json` file URL natively opens the extension.
- **Dark/Light Mode**: Fully responsive theming that adapts to your system preferences or can be toggled manually.

## How to Use

### 1. Direct Access & File Upload
- Click the JSON Query Tool extension icon in your browser toolbar.
- You will be presented with an input area where you can paste your raw JSON.
- Alternatively, click the **Upload File** button to select a `.json` file from your computer.

### 2. Context Menu (Right-Click)
- Highlight a JSON snippet on any webpage (or simply right-click near one).
- Select **Open in JSON Query Tool** from the context menu.
- A clean viewer will open in a new tab, strictly displaying your selected data.

### 3. Querying your Data
In the query bar, you can type:
- **JSONPath**: Start your query with a `$` (e.g., `$.items[0].name`).
- **JavaScript**: Write raw JavaScript evaluating the `data` variable (e.g., `data.map(x => x.id)`).

## Installation for Development

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in your browser:
   - **Chrome / Edge**: Go to `chrome://extensions/` (or `edge://extensions/`), enable **Developer Mode**, click **Load unpacked**, and select the generated `dist-chrome/` directory.
   - **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the `manifest.json` file inside the `dist-firefox/` directory.

## Tech Stack
- **React 18**
- **TypeScript**
- **Vite**
- **@uiw/react-json-view**
