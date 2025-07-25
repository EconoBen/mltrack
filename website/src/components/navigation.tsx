"use client";

import Link from 'next/link'
import { Github } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Navigation() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Reveal navigation after mount
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur-xl border-b border-white/10"
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(-100px)',
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-teal-500/25 border border-teal-400/20 hover:shadow-teal-500/40 transition-all">
              M
            </div>
            <span className="font-bold text-xl tracking-tight text-white">MLTrack</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-white/80 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#features" className="text-white/80 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/docs" className="text-white/80 hover:text-white transition-colors">
              Docs
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <a 
              href="https://github.com/EconoBen/mltrack" 
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium transition-all border border-white/10 hover:scale-105"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>

          <button className="md:hidden p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu" aria-hidden="true">
              <path d="M4 12h16"></path>
              <path d="M4 18h16"></path>
              <path d="M4 6h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}