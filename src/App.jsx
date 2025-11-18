import React, { useState, useMemo, useEffect } from 'react';
import { Smile, Frown, Meh, FileText, Upload } from 'lucide-react';

// === CONFIRMED IP ADDRESS ===
const API_BASE_URL = 'http://10.56.39.52:5000'; 

// --- Sentiment Utility Functions ---
const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
        case 'Positive':
            return <Smile className="text-green-500" size={20} />;
        case 'Negative':
            return <Frown className="text-red-500" size={20} />;
        default:
            return <Meh className="text-yellow-500" size={20} />;
    }
};

const getSentimentColor = (sentiment) => {
    switch (sentiment) {
        case 'Positive': return 'bg-green-100 text-green-800';
        case 'Negative': return 'bg-red-100 text-red-800';
        default: return 'bg-yellow-100 text-yellow-800';
    }
};

const App = () => {
    const [reviewInput, setReviewInput] = useState(''); 
    const [analyzedResults, setAnalyzedResults] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [source, setSource] = useState('none');

    // --- Core Fetch Logic (Robust version) ---
    const fetchData = async (endpoint, payload = null) => {
        setIsAnalyzing(true);
        setError(null);
        
        const API_URL = `${API_BASE_URL}${endpoint}`;
        
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const options = {
                    method: payload ? 'POST' : 'GET',
                    headers: payload ? { 'Content-Type': 'application/json' } : {},
                    body: payload ? JSON.stringify(payload) : null,
                };

                const response = await fetch(API_URL, options);

                if (!response.ok) {
                    // Try to parse error message from server, fallback to generic status error
                    const errorData = await response.json().catch(() => ({ 
                        error: `Request failed with status ${response.status}` 
                    }));
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }

                const results = await response.json();
                
                // --- CRITICAL CHECK: ENSURE RESULTS IS AN ARRAY ---
                if (!Array.isArray(results)) {
                    throw new Error("Received data is not an array. Check Flask JSON structure.");
                }

                // Sort by compound score for better display
                const sortedResults = results.sort((a, b) => b.compound_score - a.compound_score); 
                
                setAnalyzedResults(sortedResults);
                setSource(endpoint === '/load_data' ? 'csv' : 'input'); // Set source on successful data retrieval
                setIsAnalyzing(false);
                return; // Success, exit function

            } catch (err) {
                // Log full error object for detailed debugging
                console.error(`Attempt ${attempt + 1} failed:`, err); 
                
                let errorMessage = err.message;
                
                // Provide specific CORS advice if the generic "Failed to fetch" is encountered
                if (errorMessage.includes("Failed to fetch")) {
                    errorMessage = "Network request failed. This commonly indicates the Flask server is running but is missing necessary **CORS headers** (Access-Control-Allow-Origin), or the connection is being blocked by a firewall.";
                }

                if (attempt === maxRetries - 1) {
                    // Final attempt failed: display detailed error
                    setError(`Connection Error: ${errorMessage}. Please verify your Flask server's configuration.`);
                    setAnalyzedResults([]);
                    setIsAnalyzing(false);
                    return; 
                }
                
                // Wait with exponential backoff before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                attempt++;
            }
        }
    };

    // --- Auto-load CSV data on component mount ---
    useEffect(() => {
        // Only run once on mount
        fetchData('/load_data');
    }, []); 

    // --- Handlers ---
    
    const handleAnalyzeInput = () => {
        const rawReviews = reviewInput.split('\n').map(r => r.trim()).filter(r => r.length > 0);
        if (rawReviews.length === 0) return;
        fetchData('/analyze', { reviews: rawReviews });
    };

    const handleLoadCSV = () => {
        setReviewInput('');
        fetchData('/load_data');
    };

    // Calculate Summary Statistics
    const sentimentSummary = useMemo(() => {
        if (analyzedResults.length === 0) return {};

        const total = analyzedResults.length;
        const counts = analyzedResults.reduce((acc, curr) => {
            acc[curr.sentiment] = (acc[curr.sentiment] || 0) + 1;
            return acc;
        }, {});

        return {
            total,
            positive: { count: counts['Positive'] || 0, percent: ((counts['Positive'] || 0) / total) * 100 },
            neutral: { count: counts['Neutral'] || 0, percent: ((counts['Neutral'] || 0) / total) * 100 },
            negative: { count: counts['Negative'] || 0, percent: ((counts['Negative'] || 0) / total) * 100 },
        };
    }, [analyzedResults]);

    // StatCard Component
    const StatCard = ({ title, value, percentage, color, icon }) => (
        <div className={`p-4 rounded-xl shadow-lg ${color} transition-shadow duration-300 hover:shadow-xl`}>
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium opacity-80">{title}</h3>
                {icon}
            </div>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {percentage !== undefined && (
                <p className="text-sm mt-1 opacity-90">{percentage.toFixed(1)}% of total</p>
            )}
        </div>
    );

    // ProgressBar Component
    const ProgressBar = ({ positive, neutral, negative }) => {
        const total = positive.percent + neutral.percent + negative.percent;
        
        if (total === 0) return null;

        const p_percent = (positive.percent / total) * 100;
        const n_percent = (neutral.percent / total) * 100;
        const neg_percent = (negative.percent / total) * 100;
        
        return (
            <div className="w-full h-8 flex bg-gray-200 rounded-full overflow-hidden shadow-inner mt-4">
                {p_percent > 0.1 && (
                    <div 
                        className="h-full bg-green-500 transition-all duration-500" 
                        style={{ width: `${p_percent}%` }} 
                        title={`Positive: ${positive.percent.toFixed(1)}%`}
                    ></div>
                )}
                {n_percent > 0.1 && (
                    <div 
                        className="h-full bg-yellow-500 transition-all duration-500" 
                        style={{ width: `${n_percent}%` }} 
                        title={`Neutral: ${neutral.percent.toFixed(1)}%`}
                    ></div>
                )}
                {neg_percent > 0.1 && (
                    <div 
                        className="h-full bg-red-500 transition-all duration-500" 
                        style={{ width: `${neg_percent}%` }} 
                        title={`Negative: ${negative.percent.toFixed(1)}%`}
                    ></div>
                )}
            </div>
        );
    };

    const isCsvLoaded = analyzedResults.length > 0 && analyzedResults[0]?.rating !== undefined;

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Load Google Font and Tailwind CSS */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
            <script src="https://cdn.tailwindcss.com"></script>
            
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                         Review Sentiment Dashboard
                    </h1>
                    <p className="text-lg text-gray-600">Connects to Python/VADER for analysis of text input or CSV files.</p>
                </header>

                {/* Input Area */}
                <div className="bg-white p-6 rounded-2xl shadow-xl mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Source</h2>
                    
                    {/* Text Area */}
                    <textarea
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 h-40 text-gray-700 resize-none"
                        placeholder="Paste your product reviews here (one per line), OR click 'Load from CSV' to process a file..."
                        value={reviewInput}
                        onChange={(e) => setReviewInput(e.target.value)}
                        disabled={isAnalyzing}
                    />
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <button
                            onClick={handleAnalyzeInput}
                            disabled={isAnalyzing || reviewInput.trim().length === 0}
                            className={`flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center
                                ${isAnalyzing || reviewInput.trim().length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
                        >
                            {isAnalyzing && source === 'input' ? 'Analyzing Text...' : (
                                <>
                                    <FileText size={20} className="mr-2" /> 
                                    Analyze Text Input
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleLoadCSV}
                            disabled={isAnalyzing}
                            className={`flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center
                                ${isAnalyzing && source === 'csv' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'}`}
                        >
                            {isAnalyzing && source === 'csv' ? 'Loading CSV...' : (
                                <>
                                    <Upload size={20} className="mr-2" /> 
                                    Load & Analyze from CSV
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-3 italic">
                        Warning: Ensure the *Python Flask API server* is running at <code className="font-mono text-xs">{API_BASE_URL}</code> and the `sample_reviews.csv` file is in the server's working directory.
                    </p>
                </div>
                
                {/* Loading Indicator */}
                {isAnalyzing && (
                    <div className="p-4 mb-8 text-sm text-blue-800 rounded-lg bg-blue-50 border border-blue-200" role="alert">
                        <span className="font-medium">Processing:</span> Analyzing data from {source === 'csv' ? 'CSV' : 'Input'}...
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="p-4 mb-8 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200" role="alert">
                        <span className="font-medium">Error:</span> {error}
                        <p className="mt-2 text-xs font-normal">
                            **TROUBLESHOOTING:** Since your server logs showed `200 OK`, this error means your browser is blocking the response. Please ensure your **Flask app is configured with CORS** (e.g., using `flask_cors`) to allow requests from your frontend's origin.
                        </p>
                    </div>
                )}

                {analyzedResults.length > 0 && (
                    <>
                        {/* Summary Dashboard */}
                        <div className="bg-white p-6 rounded-2xl shadow-xl mb-8">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Sentiment Overview ({source === 'csv' ? 'Loaded from CSV' : 'From Input'})</h2>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <StatCard 
                                    title="Total Reviews" 
                                    value={sentimentSummary.total} 
                                    color="bg-gray-100 text-gray-800"
                                    icon={<Meh className="text-gray-500" size={24} />}
                                />
                                <StatCard 
                                    title="Positive" 
                                    value={sentimentSummary.positive.count} 
                                    percentage={sentimentSummary.positive.percent}
                                    color="bg-green-100 text-green-800"
                                    icon={<Smile className="text-green-600" size={24} />}
                                />
                                <StatCard 
                                    title="Neutral" 
                                    value={sentimentSummary.neutral.count} 
                                    percentage={sentimentSummary.neutral.percent}
                                    color="bg-yellow-100 text-yellow-800"
                                    icon={<Meh className="text-yellow-600" size={24} />}
                                />
                                <StatCard 
                                    title="Negative" 
                                    value={sentimentSummary.negative.count} 
                                    percentage={sentimentSummary.negative.percent}
                                    color="bg-red-100 text-red-800"
                                    icon={<Frown className="text-red-600" size={24} />}
                                />
                            </div>
                            
                            <ProgressBar 
                                positive={sentimentSummary.positive}
                                neutral={sentimentSummary.neutral}
                                negative={sentimentSummary.negative}
                            />
                        </div>

                        {/* Detailed Results Table */}
                        <div className="bg-white p-6 rounded-2xl shadow-xl overflow-x-auto">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Detailed Results (Sorted by Compound Score)</h2>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">#</th>
                                        {isCsvLoaded && (
                                            <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Rating</th>
                                        )}
                                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-5/12 sm:w-6/12">Review</th>
                                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Sentiment</th>
                                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Score (Compound)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {analyzedResults.map((result) => (
                                        <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.id}</td>
                                            {isCsvLoaded && (
                                                <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">{result.rating !== null ? result.rating : '-'}</td>
                                            )}
                                            <td className="px-3 py-4 text-sm text-gray-700 max-w-xs">{result.review}</td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSentimentColor(result.sentiment)}`}>
                                                    {getSentimentIcon(result.sentiment)}
                                                    <span className="ml-1 hidden sm:inline">{result.sentiment}</span>
                                                </span>
                                            </td>
                                            <td className={`px-3 py-4 whitespace-nowrap text-sm text-center font-mono ${result.compound_score > 0.05 ? 'text-green-600' : result.compound_score < -0.05 ? 'text-red-600' : 'text-yellow-600'}`}>
                                                {result.compound_score.toFixed(3)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default App;