"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github, Star } from "lucide-react";
import Link from "next/link";
import { AnimatedTerminal } from "./animated-terminal";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Background gradient - dark theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-transparent to-blue-900/20 pointer-events-none select-none" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] select-none" />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600/10 border border-teal-600/20 rounded-full text-sm text-teal-500 mb-6"
          >
            <Star className="w-4 h-4" />
            <span>MLflow compatible. Zero friction.</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 text-slate-900"
          >
            <span className="font-light tracking-tight">Stop experimenting.</span>
            <br />
            <span className="font-black tracking-tight italic">Start shipping.</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-slate-700 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Drop-in enhancement for MLflow that adds deployment capabilities and a modern UI. 
            Deploy ML models in minutes, not weeks.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="https://github.com/EconoBen/mltrack"
              className="group flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all hover:scale-105"
            >
              <Github className="w-5 h-5" />
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              href="#features"
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-all border border-slate-700 shadow-lg hover:scale-105"
            >
              See it in action
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>Ready to use</span>
            </div>
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              <span>Open source</span>
            </div>
            <div className="flex items-center gap-2">
              <span>pip install mltrack</span>
            </div>
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <AnimatedTerminal />
        </motion.div>
      </div>
    </section>
  );
}