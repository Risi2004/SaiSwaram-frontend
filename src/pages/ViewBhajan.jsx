import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { createSchedule, getBhajanById } from '../data/offlineRepository';

function ViewBhajan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bhajan, setBhajan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scheduling States
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState(null);

  useEffect(() => {
    const fetchBhajan = async () => {
      try {
        if (!localStorage.getItem('token')) {
          navigate('/login');
          return;
        }
        const data = await getBhajanById(id, { refresh: true });
        if (!data) throw new Error('Failed to load bhajan');

        setBhajan(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBhajan();
  }, [id, navigate]);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleDate) return;
    
    setIsScheduling(true);
    setScheduleMessage(null);

    try {
      await createSchedule({
        bhajanId: id,
        scheduledDate: scheduleDate,
      });

      setScheduleMessage(navigator.onLine
        ? "Successfully scheduled! You'll receive an email on that date."
        : "Saved offline. This schedule will sync automatically when you're back online.");
      
      // Auto close popover after 3 seconds
      setTimeout(() => setShowScheduler(false), 3000);
    } catch (err) {
      setScheduleMessage(`Error: ${err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-sans"><p className="text-xl text-gray-500">Loading your bhajan...</p></div>;
  }

  if (error || !bhajan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans">
        <p className="text-2xl font-bold text-red-500 mb-4">{error || "Bhajan not found"}</p>
        <Link to="/dashboard" className="text-primary hover:underline">&larr; Return to Dashboard</Link>
      </div>
    );
  }

  // Split lyrics by newline for rendering rendering paragraphs
  const lyricLines = bhajan.lyrics.split('\n');

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let y = 20;

    // Optional Pitch
    if (bhajan.pitch) {
      doc.setFontSize(12);
      doc.setTextColor(200, 81, 49); // Brand primary color approx
      doc.text(`Pitch: ${bhajan.pitch}`, 105, y, { align: 'center' });
      y += 10;
    }

    // Title
    doc.setFontSize(24);
    doc.setTextColor(30, 30, 30);
    // Draw text with a very wide maxWidth to mimic "one single line" 
    doc.text(bhajan.title, 105, y, { align: 'center', maxWidth: 190 });
    y += 10;

    // Deity
    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150);
    doc.text(bhajan.deity, 105, y, { align: 'center' });
    y += 20;

    // Lyrics
    doc.setFontSize(16);
    doc.setTextColor(50, 50, 50);
    
    lyricLines.forEach(line => {
      if (line.trim() === '') {
        y += 5; // Half-height spacing for empty lines
      } else {
        // Draw exactly as one single aligned line, using absolute max width limits
        doc.text(line, 105, y, { align: 'center', maxWidth: 190 });
        y += 10;
      }
      
      // Auto page break if too long
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    // Save strictly as PDF
    doc.save(`${bhajan.title.replace(/\s+/g, '_')}_SaiSwaram.pdf`);
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary selection:text-white">
      {/* Top Navbar specifically tailored for reading mode */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <Link to="/dashboard" className="text-gray-500 hover:text-primary transition-colors font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back
        </Link>
        <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">Reading Mode</div>
      </nav>

      {/* Main Content optimized for readability */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-16 pb-32">
        {/* Header Block */}
        <div className="text-center mb-16">
          {bhajan.pitch && (
            <div className="inline-block bg-primary text-white text-2xl md:text-3xl font-extrabold px-6 py-2 rounded-xl shadow-md mb-8 transform -rotate-1">
              {bhajan.pitch}
            </div>
          )}
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
            {bhajan.title}
          </h1>
          <h2 className="text-xl md:text-2xl text-gray-400 font-medium tracking-wide">
            {bhajan.deity}
          </h2>
        </div>

        {/* Lyrics Block */}
        <div className="space-y-6 text-center w-full overflow-x-auto pb-8">
          {lyricLines.map((line, index) => (
            <p 
              key={index} 
              className={`whitespace-nowrap text-xl md:text-2xl lg:text-3xl text-gray-800 leading-relaxed font-medium px-4 ${line.trim() === '' ? 'h-8' : ''}`}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 bg-white border-2 border-primary text-primary hover:bg-orange-50 px-6 py-3 rounded-xl font-bold transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Download PDF
          </button>
          
          <button 
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex items-center justify-center gap-2 bg-gray-100 border-2 border-transparent text-gray-700 hover:bg-gray-200 px-6 py-3 rounded-xl font-bold transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            {showScheduler ? 'Close Scheduler' : 'Schedule Bhajan'}
          </button>
        </div>

        {/* Floating Scheduler Toolbox dynamically revealed */}
        {showScheduler && (
          <div className="mt-6 max-w-sm mx-auto bg-white border border-gray-200 shadow-xl rounded-2xl p-6 transition-all duration-300 transform translate-y-0">
             <h3 className="font-bold text-gray-900 mb-2">Schedule this Bhajan</h3>
             <p className="text-gray-500 text-sm mb-4">Pick a date. The system will auto-email you this PDF securely at 12 AM so you are prepared for that day's session.</p>
             
             {scheduleMessage && (
               <div className={`p-3 rounded-lg mb-4 text-sm font-bold ${scheduleMessage.includes('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                 {scheduleMessage}
               </div>
             )}

             <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-3">
               <input 
                 type="date" 
                 required
                 min={new Date().toISOString().split('T')[0]} // Cannot schedule for the past
                 value={scheduleDate}
                 onChange={(e) => setScheduleDate(e.target.value)}
                 className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
               />
               <button 
                 type="submit" 
                 disabled={isScheduling}
                 className="w-full bg-primary hover:bg-primary-dark disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm"
               >
                 {isScheduling ? 'Saving...' : 'Confirm Schedule'}
               </button>
             </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default ViewBhajan;
