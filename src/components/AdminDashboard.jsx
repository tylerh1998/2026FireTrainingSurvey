import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Trash2, LogOut, Printer, X, Eye, Download } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-700 border border-red-400 rounded">
          <h2 className="font-bold">Something went wrong rendering this component.</h2>
          <pre className="mt-2 text-xs overflow-auto">{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const COLORS = ['#dc2626', '#ea580c', '#eab308', '#16a34a', '#2563eb', '#9333ea', '#475569'];

export default function AdminDashboard() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const q = query(collection(db, 'surveys'), orderBy('submittedAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSurveys(data);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      alert("Error fetching data. Are you logged in?");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent modal opening
    if (window.confirm("Are you sure you want to delete this submission?")) {
      try {
        await deleteDoc(doc(db, 'surveys', id));
        setSurveys(surveys.filter(s => s.id !== id));
        if (selectedSurvey?.id === id) setSelectedSurvey(null);
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Failed to delete.");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (surveys.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = [
      "Date Submitted", "Name", "Tenure", "Training Rating", 
      "Goal Rank 1", "Goal Rank 2", "Goal Rank 3", "Goal Rank 4", "Goal Rank 5",
      "Training Type Rank 1", "Training Type Rank 2", "Training Type Rank 3", "Training Type Rank 4", "Training Type Rank 5",
      "Feedback on Recent Training", "Skills Wanted (2027)", "Other Skills", 
      "Saturday Scenarios", "1-on-1 Support", "Open Feedback"
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '';
      const stringified = String(str);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    const rows = surveys.map(s => {
      const date = s.submittedAt ? new Date(s.submittedAt.seconds * 1000).toLocaleString() : 'N/A';
      return [
        escapeCSV(date),
        escapeCSV(s.name),
        escapeCSV(s.tenure),
        escapeCSV(s.trainingRating),
        escapeCSV(s.goalsRank1), escapeCSV(s.goalsRank2), escapeCSV(s.goalsRank3), escapeCSV(s.goalsRank4), escapeCSV(s.goalsRank5),
        escapeCSV(s.trainingTypesRank1), escapeCSV(s.trainingTypesRank2), escapeCSV(s.trainingTypesRank3), escapeCSV(s.trainingTypesRank4), escapeCSV(s.trainingTypesRank5),
        escapeCSV(s.feedbackRecent),
        escapeCSV(Array.isArray(s.skillsMoreTime) ? s.skillsMoreTime.join('; ') : s.skillsMoreTime),
        escapeCSV(s.skillsMoreTimeOther),
        escapeCSV(s.saturdayScenarios),
        escapeCSV(s.oneOnOne),
        escapeCSV(s.openFeedback)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FireTrainingSurvey_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // Compute metrics
  // ----------------------------------------------------
  const totalResponses = surveys.length;
  
  // 1. Overall Training Rating
  const ratingCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  surveys.forEach(s => {
    if (s.trainingRating) ratingCounts[s.trainingRating] += 1;
  });
  const ratingChartData = Object.keys(ratingCounts).map(k => ({
    rating: k, count: ratingCounts[k]
  })).sort((a,b) => a.rating - b.rating);

  // 2. Top Skills
  const skillCounts = {};
  surveys.forEach(s => {
    if (s.skillsMoreTime && Array.isArray(s.skillsMoreTime)) {
      s.skillsMoreTime.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    }
  });
  const skillChartData = Object.keys(skillCounts).map(k => ({
    skill: k.length > 20 ? k.substring(0,20) + '...' : k,
    count: skillCounts[k]
  })).sort((a,b) => b.count - a.count).slice(0, 5);

  // 3. Tenure Breakdown
  const tenureCounts = {};
  surveys.forEach(s => {
    if (s.tenure) tenureCounts[s.tenure] = (tenureCounts[s.tenure] || 0) + 1;
  });
  const tenureChartData = Object.keys(tenureCounts).map(k => ({ name: k, value: tenureCounts[k] }));

  // 4. Saturday Scenarios & 1-on-1 Support
  const saturdayCounts = {};
  const oneOnOneCounts = {};
  surveys.forEach(s => {
    if (s.saturdayScenarios) {
      let shortLabel = s.saturdayScenarios.startsWith('Yes') ? 'Yes' : s.saturdayScenarios.startsWith('No') ? 'No' : 'Neutral';
      saturdayCounts[shortLabel] = (saturdayCounts[shortLabel] || 0) + 1;
    }
    if (s.oneOnOne) {
      let shortLabel = s.oneOnOne.startsWith('Yes') ? 'Yes' : s.oneOnOne.startsWith('No') ? 'No' : 'Maybe';
      oneOnOneCounts[shortLabel] = (oneOnOneCounts[shortLabel] || 0) + 1;
    }
  });
  const saturdayData = Object.keys(saturdayCounts).map(k => ({ name: k, value: saturdayCounts[k] }));
  const oneOnOneData = Object.keys(oneOnOneCounts).map(k => ({ name: k, value: oneOnOneCounts[k] }));

  // 5. Weighted Rankings (Goals & Training Types)
  // Rank 1 = 5 pts, Rank 5 = 1 pt. Score = 6 - rank
  const goalNames = [
    "Learning basics / routines",
    "Core skills (NFPA 1001)",
    "Keeping skills sharp",
    "Pump ops & driving",
    "Leadership / Instructing"
  ];
  const trainingTypeNames = [
    "Hands-on prop work",
    "Outside tactical drills",
    "Equipment practice",
    "Full team mock scenarios",
    "Classroom / Tabletop"
  ];

  const goalsScores = [0, 0, 0, 0, 0];
  const trainingScores = [0, 0, 0, 0, 0];

  const tenureOrder = ['Less than 1 year', '1 to 2 years', '3 to 5 years', '5+ years', '10+ years'];
  const tenureGoalMap = {};
  
  tenureOrder.forEach(t => {
    tenureGoalMap[t] = { tenure: t };
    goalNames.forEach(g => {
      tenureGoalMap[t][g] = 0;
    });
  });

  surveys.forEach(s => {
    // Weighted rankings
    for (let i = 1; i <= 5; i++) {
      let gRank = parseInt(s[`goalsRank${i}`]);
      if (gRank) goalsScores[i-1] += (6 - gRank);

      let tRank = parseInt(s[`trainingTypesRank${i}`]);
      if (tRank) trainingScores[i-1] += (6 - tRank);

      // Track #1 Goal by Tenure
      if (gRank === 1 && s.tenure && tenureGoalMap[s.tenure]) {
        tenureGoalMap[s.tenure][goalNames[i-1]] += 1;
      }
    }
  });

  const goalsData = goalNames.map((name, i) => ({ name, score: goalsScores[i] })).sort((a,b) => b.score - a.score);
  const trainingData = trainingTypeNames.map((name, i) => ({ name, score: trainingScores[i] })).sort((a,b) => b.score - a.score);
  const tenureGoalData = tenureOrder.map(t => tenureGoalMap[t]);


  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      
      {/* Navbar - hidden on print */}
      <nav className="bg-red-600 shadow-md p-4 flex justify-between items-center text-white print:hidden">
        <h1 className="text-xl font-bold">Survey Admin Dashboard</h1>
        <div className="flex space-x-4">
          <button onClick={handleExportCSV} className="flex items-center space-x-2 bg-white text-red-600 hover:bg-gray-100 px-4 py-2 rounded font-semibold transition-colors">
            <Download size={18} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button onClick={handlePrint} className="flex items-center space-x-2 bg-white text-red-600 hover:bg-gray-100 px-4 py-2 rounded font-semibold transition-colors">
            <Printer size={18} />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
          <button onClick={handleLogout} className="flex items-center space-x-2 bg-red-700 hover:bg-red-800 px-4 py-2 rounded transition-colors">
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Print Header - hidden on screen */}
      <div className="hidden print:block mb-8 border-b-2 border-red-600 pb-4">
        <h1 className="text-3xl font-bold text-red-700">2026 Fire Training Plan - Survey Report</h1>
        <p className="text-gray-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 print:py-0 print:px-0">
        
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print:grid-cols-4 print:gap-4 print:mb-6">
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-yellow-400 print:shadow-none print:border print:border-t-4">
            <h3 className="text-gray-500 text-sm font-medium">Total Responses</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalResponses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-red-500 print:shadow-none print:border print:border-t-4">
            <h3 className="text-gray-500 text-sm font-medium">Avg Training Rating</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {totalResponses > 0 
                ? (surveys.reduce((acc, s) => acc + parseInt(s.trainingRating || 0), 0) / totalResponses).toFixed(1) 
                : '0'}/5
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 print:grid-cols-1 print:gap-6 print:break-inside-avoid">
          
          {/* Weighted Goals */}
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:mb-4">
            <h3 className="text-gray-700 text-base font-bold mb-4">Top Personal Goals (Weighted Score)</h3>
            <div className="h-64">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={goalsData} layout="vertical" margin={{ left: 110, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weighted Training Types */}
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:mb-4">
            <h3 className="text-gray-700 text-base font-bold mb-4">Preferred Training Types (Weighted Score)</h3>
            <div className="h-64">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={trainingData} layout="vertical" margin={{ left: 110, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#eab308" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Priorities vs. Tenure (Stacked Bar) */}
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:border print:mb-4 lg:col-span-2">
            <h3 className="text-gray-700 text-base font-bold mb-4">#1 Priority Goal Breakdown by Tenure</h3>
            <div className="h-80">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={tenureGoalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis dataKey="tenure" />
                  <YAxis allowDecimals={false} label={{ value: 'Number of Members', angle: -90, position: 'insideLeft', offset: -5 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  {goalNames.map((goal, idx) => (
                    <Bar key={idx} dataKey={goal} stackId="a" fill={COLORS[idx % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Small Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3 print:gap-4 print:break-inside-avoid">
          
          <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border">
            <h3 className="text-gray-700 text-sm font-bold text-center mb-2">Member Tenure</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tenureChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                    {tenureChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border">
            <h3 className="text-gray-700 text-sm font-bold text-center mb-2">Saturday Scenarios</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={saturdayData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                    {saturdayData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 print:shadow-none print:border">
            <h3 className="text-gray-700 text-sm font-bold text-center mb-2">1-on-1 Support</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={oneOnOneData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                    {oneOnOneData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none print:border print:mt-10 print:break-before-page">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">All Submissions (Click row to view details)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {surveys.map((survey) => (
                  <tr 
                    key={survey.id} 
                    onClick={() => setSelectedSurvey(survey)}
                    className="hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {survey.submittedAt ? new Date(survey.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {survey.name || 'Anonymous'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {survey.tenure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {survey.trainingRating}/5
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium print:hidden">
                      <div className="flex justify-end space-x-3">
                        <span className="text-blue-600 hover:text-blue-900 inline-flex items-center">
                          <Eye size={16} className="mr-1" /> View
                        </span>
                        <button onClick={(e) => handleDelete(e, survey.id)} className="text-red-600 hover:text-red-900 inline-flex items-center">
                          <Trash2 size={16} className="mr-1" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {surveys.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No submissions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal - Hidden on Print */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          {/* Background overlay */}
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={() => setSelectedSurvey(null)}></div>
          
          {/* Modal Panel */}
          <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl w-full max-w-2xl border-t-4 border-red-600 max-h-[90vh] flex flex-col">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                    Survey Details: {typeof selectedSurvey.name === 'object' ? JSON.stringify(selectedSurvey.name) : (selectedSurvey.name || 'Anonymous')}
                  </h3>
                  <button onClick={() => setSelectedSurvey(null)} className="text-gray-400 hover:text-gray-500">
                    <X size={24} />
                  </button>
                </div>
                
                <ErrorBoundary>
                <div className="mt-2 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Submitted</p>
                      <p className="text-sm text-gray-900">
                        {selectedSurvey.submittedAt 
                          ? (selectedSurvey.submittedAt.seconds 
                              ? new Date(selectedSurvey.submittedAt.seconds * 1000).toLocaleString() 
                              : String(selectedSurvey.submittedAt)) 
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Tenure</p>
                      <p className="text-sm text-gray-900">{typeof selectedSurvey.tenure === 'object' ? JSON.stringify(selectedSurvey.tenure) : selectedSurvey.tenure}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-semibold text-gray-500 mb-1">Feedback on Recent Training (Rated {typeof selectedSurvey.trainingRating === 'object' ? JSON.stringify(selectedSurvey.trainingRating) : selectedSurvey.trainingRating}/5)</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{typeof selectedSurvey.feedbackRecent === 'object' ? JSON.stringify(selectedSurvey.feedbackRecent) : (selectedSurvey.feedbackRecent || 'No written feedback provided.')}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-semibold text-gray-500 mb-1">Skills they want MORE time on in 2027:</p>
                    <ul className="list-disc pl-5 text-sm text-gray-900">
                      {Array.isArray(selectedSurvey.skillsMoreTime) ? (
                        selectedSurvey.skillsMoreTime.map((s, idx) => (
                          <li key={idx}>{typeof s === 'object' ? JSON.stringify(s) : s}</li>
                        ))
                      ) : (
                        <li>{typeof selectedSurvey.skillsMoreTime === 'object' ? JSON.stringify(selectedSurvey.skillsMoreTime) : (selectedSurvey.skillsMoreTime || 'None selected')}</li>
                      )}
                      {selectedSurvey.skillsMoreTimeOther && <li>Other: {typeof selectedSurvey.skillsMoreTimeOther === 'object' ? JSON.stringify(selectedSurvey.skillsMoreTimeOther) : selectedSurvey.skillsMoreTimeOther}</li>}
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-semibold text-gray-500 mb-1">Questions / Concerns / Ideas for 2027:</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{typeof selectedSurvey.openFeedback === 'object' ? JSON.stringify(selectedSurvey.openFeedback) : (selectedSurvey.openFeedback || 'No written feedback provided.')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Saturday Scenarios</p>
                      <p className="text-sm text-gray-900">{typeof selectedSurvey.saturdayScenarios === 'object' ? JSON.stringify(selectedSurvey.saturdayScenarios) : selectedSurvey.saturdayScenarios}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-500">Requested 1-on-1?</p>
                      <p className="text-sm text-gray-900">{typeof selectedSurvey.oneOnOne === 'object' ? JSON.stringify(selectedSurvey.oneOnOne) : selectedSurvey.oneOnOne}</p>
                    </div>
                  </div>

                </div>
                </ErrorBoundary>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setSelectedSurvey(null)}
                >
                  Close
                </button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}
