"use client";

import { motion } from "framer-motion";
import { Github, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur-xl border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-purple-500/25 border border-purple-400/20">
              M
            </div>
            <span className="font-bold text-xl tracking-tight">MLTrack</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-white/80 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-white/80 hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="https://github.com/EconoBen/mltrack/wiki" className="text-white/80 hover:text-white transition-colors">
              Docs
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="https://github.com/EconoBen/mltrack"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium transition-all border border-white/10"
            >
              <Github className="w-4 h-4" />
              GitHub
            </Link>
          </div>
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden bg-gray-900/95 backdrop-blur-xl border-t border-white/10"
        >
          <div className="px-4 py-4 space-y-2">
            <Link
              href="#features"
              className="block py-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="block py-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              How it works
            </Link>
            <Link
              href="https://github.com/EconoBen/mltrack/wiki"
              className="block py-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="https://github.com/EconoBen/mltrack"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium transition-all border border-white/10 mt-4"
              onClick={() => setIsOpen(false)}
            >
              <Github className="w-4 h-4" />
              GitHub
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}