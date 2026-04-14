import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { saveBhajan } from '../data/offlineRepository';

function AddBhajan() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    deity: '',
    pitch: '',
    lineCount: ''
  });
  const [lines, setLines] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'lineCount') {
      const count = parseInt(value, 10);
      const newLines = isNaN(count) || count < 0 ? [] : new Array(count).fill('');
      setLines(newLines);
    }
  };

  const handleLineChange = (index, value) => {
    const updatedLines = [...lines];
    updatedLines[index] = value;
    setLines(updatedLines);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lines.length === 0 || lines.some(line => line.trim() === '')) {
      setError('Please fill in all the lyric lines.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const bhajanData = {
      title: formData.title,
      deity: formData.deity,
      pitch: formData.pitch,
      lyrics: lines.join('\n') // Database expects a String
    };

    try {
      await saveBhajan({ data: bhajanData });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
           <img src={logo} alt="SaiSwaram" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold text-gray-900 tracking-tight">SaiSwaram</span>
        </div>
        <Link to="/dashboard" className="text-gray-500 hover:text-primary transition-colors font-medium flex items-center gap-2">
          &larr; Back to Dashboard
        </Link>
      </nav>

      <main className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 md:p-10 shadow-lg border border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Add New Bhajan</h1>
          <p className="text-gray-500 mb-8">Enter the details of the bhajan to save it to your collection.</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Bhajan Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
                  placeholder="e.g. Ganesha Sharanam"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Deity <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="deity"
                  required
                  value={formData.deity}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
                  placeholder="e.g. Ganesha"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Musical Pitch / Shruti <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input
                  type="text"
                  name="pitch"
                  value={formData.pitch}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
                  placeholder="e.g. C#"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">How many lines? <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="lineCount"
                  min="1"
                  max="50"
                  required
                  value={formData.lineCount}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
                  placeholder="Number of lines"
                />
              </div>
            </div>

            {/* Dynamic Lines Generation */}
            {lines.length > 0 && (
              <div className="pt-2">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Bhajan Lyrics</h3>
                <div className="space-y-3 p-6 bg-gray-50 rounded-2xl border border-gray-200 shadow-inner">
                  {lines.map((line, index) => (
                    <div key={index} className="flex gap-4 items-center">
                      <span className="w-6 text-right font-bold text-primary/60">{index + 1}.</span>
                      <input
                        type="text"
                        required
                        value={line}
                        onChange={(e) => handleLineChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder={`Line ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting || lines.length === 0}
                className="w-full bg-primary hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                {isSubmitting ? 'Saving...' : 'Save Bhajan'}
              </button>
            </div>
            
          </form>
        </div>
      </main>
    </div>
  );
}

export default AddBhajan;
