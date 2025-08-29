import React, { useState, useEffect, useRef } from 'react';
import Cytoscape from 'cytoscape';
import './App.css';

// --- ⚠️ IMPORTANT: PASTE YOUR CREDENTIALS HERE ---
const API_URL = process.env.REACT_APP_API_URL;
const API_KEY = process.env.REACT_APP_API_KEY;
// =================================================================================
// --- Reusable Components ---
// =================================================================================

const GraphDisplay = ({ graphData }) => {
  const cyRef = useRef(null);

  useEffect(() => {
    if (graphData.nodes && graphData.nodes.length > 0 && cyRef.current) {
      const cy = Cytoscape({
        container: cyRef.current,
        elements: graphData,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#007bff',
              'label': (ele) => ele.data().address || ele.data().hostname || ele.data().hash_sha256 || ele.data().id,
              'color': '#fff',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': '10px',
              'width': '60px',
              'height': '60px',
              'text-wrap': 'wrap',
              'text-max-width': '50px',
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#6c757d',
              'target-arrow-color': '#6c757d',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '8px',
              'color': '#333'
            }
          }
        ],
        layout: {
          name: 'cose', // A physics-based layout for better aesthetics
          animate: true,
          padding: 30
        }
      });
    }
  }, [graphData]);

  return <div id="cy" ref={cyRef} className="graph-container"></div>;
};

const LogViewer = ({ logs }) => (
  <div className="log-viewer">
    <h3>Related Raw Logs</h3>
    <div className="log-content">
      {logs.length > 0 ? (
        logs.map(log => <pre key={log.id}>{JSON.stringify(log, null, 2)}</pre>)
      ) : (
        <p>No logs found for this indicator.</p>
      )}
    </div>
  </div>
);

// =================================================================================
// --- Main App ---
// =================================================================================

function App() {
  const [iocType, setIocType] = useState('ip');
  const [iocValue, setIocValue] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInvestigate = async () => {
    if (!iocValue) {
      setError('Please enter an indicator value to investigate.');
      return;
    }
    setIsLoading(true);
    setError('');
    setGraphData({ nodes: [], edges: [] }); // Clear previous results
    setLogs([]);

    try {
      // Fetch graph data
      const graphResponse = await fetch(`${API_URL}/api/graph/walk?type=${iocType}&value=${iocValue}&code=${API_KEY}`);
      if (!graphResponse.ok) throw new Error(`Graph API failed with status: ${graphResponse.status}`);
      const graphJson = await graphResponse.json();
      setGraphData(graphJson);

      // Fetch log data
      const logsResponse = await fetch(`${API_URL}/api/logs/search?term=${iocValue}&code=${API_KEY}`);
      if (!logsResponse.ok) throw new Error(`Log Search API failed with status: ${logsResponse.status}`);
      const logsJson = await logsResponse.json();
      setLogs(logsJson);

    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "An unknown error occurred. Check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cyber Threat Intelligence Platform</h1>
      </header>
      <main>
        <div className="search-container">
          <select value={iocType} onChange={e => setIocType(e.target.value)}>
            <option value="ip">IP Address</option>
            <option value="asset">Asset Hostname</option>
            <option value="file">File Hash</option>
          </select>
          <input
            type="text"
            value={iocValue}
            onChange={e => setIocValue(e.target.value)}
            placeholder="Enter IoC value to investigate..."
            onKeyPress={e => e.key === 'Enter' && handleInvestigate()}
          />
          <button onClick={handleInvestigate} disabled={isLoading}>
            {isLoading ? 'Investigating...' : 'Investigate'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
        <div className="results-container">
          <GraphDisplay graphData={graphData} />
          <LogViewer logs={logs} />
        </div>
      </main>
    </div>
  );
}

export default App;