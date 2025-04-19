import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isActive = (path) => {
    return location.pathname === path ? 'nav-link nav-link-active' : 'nav-link nav-link-inactive';
  };
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  return (
    <nav className="bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="text-white font-bold text-xl">
                Serverless Platform
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/" className={isActive('/')}>
                  Functions
                </Link>
                <Link to="/create" className={isActive('/create')}>
                  Create Function
                </Link>
                <Link to="/dashboard" className={isActive('/dashboard')}>
                  System Dashboard
                </Link>
              </div>
            </div>
          </div>
          <div className="md:hidden">
            <button 
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon for menu */}
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link 
            to="/" 
            className={`${isActive('/')} block px-3 py-2 rounded-md text-base font-medium`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Functions
          </Link>
          <Link 
            to="/create" 
            className={`${isActive('/create')} block px-3 py-2 rounded-md text-base font-medium`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Create Function
          </Link>
          <Link 
            to="/dashboard" 
            className={`${isActive('/dashboard')} block px-3 py-2 rounded-md text-base font-medium`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            System Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;