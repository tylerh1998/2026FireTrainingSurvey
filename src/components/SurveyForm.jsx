import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function SurveyForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ id: null, msg: '' });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    tenure: '',
    goalsRank1: '',
    goalsRank2: '',
    goalsRank3: '',
    goalsRank4: '',
    goalsRank5: '',
    trainingRating: '',
    trainingTypesRank1: '',
    trainingTypesRank2: '',
    trainingTypesRank3: '',
    trainingTypesRank4: '',
    trainingTypesRank5: '',
    feedbackRecent: '',
    skillsMoreTime: [],
    skillsMoreTimeOther: '',
    saturdayScenarios: '',
    oneOnOne: '',
    openFeedback: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Clear error when user types
    if (error.id) setError({ id: null, msg: '' });
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        skillsMoreTime: checked 
          ? [...prev.skillsMoreTime, value]
          : prev.skillsMoreTime.filter(item => item !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    // Check if required fields are filled
    if (!formData.tenure) return { msg: "Please select how long you have been with the department.", id: "field-tenure" };
    
    const goalsRanks = [formData.goalsRank1, formData.goalsRank2, formData.goalsRank3, formData.goalsRank4, formData.goalsRank5];
    if (goalsRanks.some(r => r === '')) return { msg: "Please rank all 5 of your personal goals.", id: "field-goals" };
    const uniqueGoalsRanks = new Set(goalsRanks);
    if (uniqueGoalsRanks.size !== 5) return { msg: "You cannot use the same rank number twice for your personal goals.", id: "field-goals" };

    if (!formData.trainingRating) return { msg: "Please rate our recent training nights.", id: "field-rating" };
    
    const trainingRanks = [formData.trainingTypesRank1, formData.trainingTypesRank2, formData.trainingTypesRank3, formData.trainingTypesRank4, formData.trainingTypesRank5];
    if (trainingRanks.some(r => r === '')) return { msg: "Please rank all 5 of the training types.", id: "field-training-rank" };
    const uniqueTrainingRanks = new Set(trainingRanks);
    if (uniqueTrainingRanks.size !== 5) return { msg: "You cannot use the same rank number twice for the training types.", id: "field-training-rank" };

    if (formData.skillsMoreTime.length === 0) return { msg: "Please select at least one skill area for 2027.", id: "field-skills" };
    if (!formData.saturdayScenarios) return { msg: "Please answer the question about Saturday scenarios.", id: "field-saturday" };
    if (!formData.oneOnOne) return { msg: "Please answer the question about 1-on-1 support.", id: "field-oneonone" };

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      const el = document.getElementById(validationError.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    setError({ id: null, msg: '' });

    try {
      await addDoc(collection(db, 'surveys'), {
        ...formData,
        submittedAt: serverTimestamp()
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Error submitting survey:", err);
      setError({ id: 'global', msg: 'Failed to submit the survey. This could be due to database permissions. If you are the admin, ensure your Firestore rules allow writes.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border-t-4 border-red-600 rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Thank You!</h2>
          <p className="text-gray-700 mb-6">Your feedback has been successfully submitted and will help shape our 2027 training plan.</p>
        </div>
      </div>
    );
  }

  const goalOptions = [
    "Learning the basics & getting comfortable with gear, trucks, and station routines",
    "Completing core firefighter skills & sign-off sheets (NFPA 1001 Level 1)",
    "Keeping skills sharp & staying up-to-date on department guidelines",
    "Pump operations & apparatus driving",
    "Leadership skills, Incident Command, or helping instruct training nights"
  ];

  const trainingTypeOptions = [
    "Hands-on prop work (Live Fire Prop, Door Prop)",
    "Outside tactical drills (Hose lines, ladders, hydrants/water supply)",
    "Equipment practice (Extrication tools, Rescue 42 struts, saws, lighting)",
    "Full team mock scenarios (Responding as a team to simulated calls)",
    "Classroom / Tabletop / Medical practice"
  ];

  const skillAreas = [
    "SCBA Emergencies, Air Management & Decon",
    "Forcible Entry & Door Prop Work",
    "Medical First Responder (MFR) & Patient Care",
    "Bush / Grass Fires (Pump & Roll, L.A.C.E.S.)",
    "Search & Rescue, RIT & Mayday Calls",
    "Vehicle Extrication (Hydraulics, Struts, Glass Cutting)",
    "Pump Operations, Drafting & Water Supply",
    "Live Fire Drills & Gas Cylinder / Flammable Liquids",
    "Radio Operations & Scene Management"
  ];

  // Helper to disable already selected ranks
  const getDisabledGoalsRank = (num, currentIdx) => {
    for (let i = 1; i <= 5; i++) {
      if (i !== currentIdx && formData[`goalsRank${i}`] === String(num)) {
        return true;
      }
    }
    return false;
  };

  const getDisabledTrainingRank = (num, currentIdx) => {
    for (let i = 1; i <= 5; i++) {
      if (i !== currentIdx && formData[`trainingTypesRank${i}`] === String(num)) {
        return true;
      }
    }
    return false;
  };

  const FieldError = ({ fieldId }) => {
    if (error.id === fieldId) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 mt-2 mb-3 text-red-700 text-sm font-semibold rounded shadow-sm flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
          {error.msg}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-red-600 px-6 py-8 border-b-4 border-yellow-400">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center">
            Member Training Check-In & 2027 Planning Survey
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-10" noValidate>
          {error.id === 'global' && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline font-semibold">{error.msg}</span>
            </div>
          )}

          {/* SECTION 1 */}
          <section className="space-y-6">
            <div className="border-b-2 border-red-100 pb-2">
              <h2 className="text-xl font-bold text-red-700">Section 1: Member Context</h2>
              <p className="text-sm text-gray-500 mt-1">This section helps us tailor our 2027 training schedule to match the actual experience levels and personal goals of our team.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Name (Optional)</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 border"
                placeholder="Leave blank to remain anonymous"
              />
            </div>

            <div className="space-y-3" id="field-tenure">
              <label className="block text-sm font-semibold text-gray-700">How long have you been with the department? <span className="text-red-500">*</span></label>
              <FieldError fieldId="field-tenure" />
              <div className="space-y-2">
                {['Less than 1 year', '1 to 2 years', '3 to 5 years', '5+ years', '10+ years'].map(option => (
                  <label key={option} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                    <input
                      type="radio"
                      name="tenure"
                      value={option}
                      checked={formData.tenure === option}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4" id="field-goals">
              <label className="block text-sm font-semibold text-gray-700">
                Rank your top personal goals for training right now (1 being your main focus, 5 being your lowest priority): <span className="text-red-500">*</span>
              </label>
              <FieldError fieldId="field-goals" />
              {goalOptions.map((goal, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <select
                    name={`goalsRank${idx + 1}`}
                    value={formData[`goalsRank${idx + 1}`]}
                    onChange={handleInputChange}
                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                  >
                    <option value="">Rank</option>
                    {[1,2,3,4,5].map(num => (
                      <option 
                        key={num} 
                        value={num}
                        disabled={getDisabledGoalsRank(num, idx + 1)}
                      >
                        {num}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-700">{idx + 1}. {goal}</span>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 2 */}
          <section className="space-y-6">
            <div className="border-b-2 border-red-100 pb-2">
              <h2 className="text-xl font-bold text-red-700">Section 2: Looking Back (2025 & 2026 Training)</h2>
            </div>

            <div className="space-y-3" id="field-rating">
              <label className="block text-sm font-semibold text-gray-700">Overall, how would you rate our recent training nights? <span className="text-red-500">*</span></label>
              <FieldError fieldId="field-rating" />
              <div className="space-y-2">
                {[
                  { val: '5', label: '5 - Excellent (Engaging, practical, relevant)' },
                  { val: '4', label: '4 - Good' },
                  { val: '3', label: '3 - Neutral' },
                  { val: '2', label: '2 - Needs Improvement' },
                  { val: '1', label: '1 - Poor' }
                ].map(option => (
                  <label key={option.val} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                    <input
                      type="radio"
                      name="trainingRating"
                      value={option.val}
                      checked={formData.trainingRating === option.val}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4" id="field-training-rank">
              <label className="block text-sm font-semibold text-gray-700">
                Which types of training sessions do you get the most out of? (Rank from 1 being the most, and 5 being the least) <span className="text-red-500">*</span>
              </label>
              <FieldError fieldId="field-training-rank" />
              {trainingTypeOptions.map((type, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <select
                    name={`trainingTypesRank${idx + 1}`}
                    value={formData[`trainingTypesRank${idx + 1}`]}
                    onChange={handleInputChange}
                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                  >
                    <option value="">Rank</option>
                    {[1,2,3,4,5].map(num => (
                      <option 
                        key={num} 
                        value={num}
                        disabled={getDisabledTrainingRank(num, idx + 1)}
                      >
                        {num}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-700">{type}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">How has training been working for you, and what changes (if any) would make it better?</label>
              <textarea
                name="feedbackRecent"
                value={formData.feedbackRecent}
                onChange={handleInputChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 border"
                placeholder="Open feedback for highlights, suggestions, or constructive criticism"
              ></textarea>
            </div>
          </section>

          {/* SECTION 3 */}
          <section className="space-y-6">
            <div className="border-b-2 border-red-100 pb-2">
              <h2 className="text-xl font-bold text-red-700">Section 3: Shaping the 2027 Plan</h2>
            </div>

            <div className="space-y-3" id="field-skills">
              <label className="block text-sm font-semibold text-gray-700">Which skill areas would you like to spend MORE time practicing in 2027? (Select all that apply) <span className="text-red-500">*</span></label>
              <FieldError fieldId="field-skills" />
              <div className="space-y-2">
                {skillAreas.map(skill => (
                  <label key={skill} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        name="skillsMoreTime"
                        value={skill}
                        checked={formData.skillsMoreTime.includes(skill)}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                    </div>
                    <span className="text-gray-700 text-sm leading-5">{skill}</span>
                  </label>
                ))}
                
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 p-2">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      name="skillsMoreTime"
                      value="Other"
                      checked={formData.skillsMoreTime.includes("Other")}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-gray-700 text-sm leading-5">Other. Please Specify:</span>
                  </div>
                  {formData.skillsMoreTime.includes("Other") && (
                    <input
                      type="text"
                      name="skillsMoreTimeOther"
                      value={formData.skillsMoreTimeOther}
                      onChange={handleInputChange}
                      className="block w-full sm:w-auto flex-1 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3" id="field-saturday">
              <label className="block text-sm font-semibold text-gray-700">Would you like to see more Saturday full-day/half-day scenario sessions in 2027? <span className="text-red-500">*</span></label>
              <FieldError fieldId="field-saturday" />
              <div className="space-y-2">
                {[
                  'Yes - Saturday scenario days are great',
                  'No - Stick strictly to regular bi-weekly weeknight sessions',
                  'Neutral / Depends on topic'
                ].map(option => (
                  <label key={option} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                    <input
                      type="radio"
                      name="saturdayScenarios"
                      value={option}
                      checked={formData.saturdayScenarios === option}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 4 */}
          <section className="space-y-6">
            <div className="border-b-2 border-red-100 pb-2">
              <h2 className="text-xl font-bold text-red-700">Section 4: Individual Support & Open Feedback</h2>
            </div>

            <div className="space-y-3" id="field-oneonone">
              <label className="block text-sm font-semibold text-gray-700">Would you like to sit down 1-on-1 with a Training Officer to look over your training record, sign-offs, or personal goals? <span className="text-red-500">*</span></label>
              <FieldError fieldId="field-oneonone" />
              <div className="space-y-2">
                {[
                  "Yes (Please make sure to put your name in Question 1)",
                  "No - I'm good with where I'm at",
                  "Maybe - If I want one, I'll contact an Officer directly to request one"
                ].map(option => (
                  <label key={option} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="oneOnOne"
                        value={option}
                        checked={formData.oneOnOne === option}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                      />
                    </div>
                    <span className="text-gray-700 text-sm leading-5">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Do you have any questions, concerns, or ideas for 2027?</label>
              <textarea
                name="openFeedback"
                value={formData.openFeedback}
                onChange={handleInputChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 border"
              ></textarea>
            </div>
          </section>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Survey'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
