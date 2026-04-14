import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

function Home() {
  return (
    <div className="font-sans text-gray-800 bg-gray-50 min-h-screen flex flex-col selection:bg-primary selection:text-white">
      
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 bg-white shadow-sm sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="SaiSwaram" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold text-gray-900 tracking-tight">SaiSwaram</span>
        </Link>
        <div className="hidden md:flex gap-8 items-center font-medium text-gray-600">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#about" className="hover:text-primary transition-colors">About</a>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="hidden md:block font-medium text-gray-600 hover:text-primary transition-colors">Log in</Link>
          <Link to="/signup" className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 inline-block border border-transparent">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden bg-white px-6 py-20 md:py-32 lg:px-12 flex flex-col items-center text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 -right-24 w-80 h-80 bg-[#ff9e7d] rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <span className="inline-block py-1 px-3 rounded-full bg-orange-100 text-primary font-semibold text-sm mb-6 border border-orange-200">
            Digitize your Devotion
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            Your Personal <span className="text-primary">Bhajan</span> Companion
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
            Leave the paper notes behind. Save your Sathya Sai Bhajans with lyrics, musical pitches (Shruti), and deities—all in one beautifully organized place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link to="/signup" className="bg-primary hover:bg-primary-dark text-white text-lg px-8 py-4 rounded-full font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full sm:w-auto text-center inline-block border border-transparent">
              Start Your Collection
            </Link>
            <button className="bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 text-lg px-8 py-4 rounded-full font-bold transition-all shadow-sm w-full sm:w-auto">
              View Demo
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Everything you need to lead</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Designed specifically for singers to keep track of their scale and repertoire instantly.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Pitch Perfect</h3>
              <p className="text-gray-600 leading-relaxed">
                Save the exact Shruti (scale) for every bhajan. High-contrast badges make it easy to see your pitch at a glance before you start singing.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Instant Search</h3>
              <p className="text-gray-600 leading-relaxed">
                Filter your entire collection in milliseconds. Search by bhajan title, deity name, or even lyrics to find exactly what you want to sing.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Reading Mode</h3>
              <p className="text-gray-600 leading-relaxed">
                A clean, distraction-free view with large typography. Perfectly optimized for reading lyrics quickly from your device during a session.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center mt-auto">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-6">
             <img src={logo} alt="SaiSwaram" className="w-8 h-8 object-contain" />
            <span className="text-2xl font-bold text-white tracking-tight">SaiSwaram</span>
          </div>
          <p className="mb-6">Digitizing devotion, one bhajan at a time.</p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="mt-12 text-xs text-gray-600">&copy; {new Date().getFullYear()} SaiSwaram. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
