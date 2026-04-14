import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AddBhajan from './pages/AddBhajan';
import EditBhajan from './pages/EditBhajan';
import ViewBhajan from './pages/ViewBhajan';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-bhajan" element={<AddBhajan />} />
        <Route path="/edit-bhajan/:id" element={<EditBhajan />} />
        <Route path="/bhajan/:id" element={<ViewBhajan />} />
      </Routes>
    </Router>
  );
}

export default App;
