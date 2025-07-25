"use client";

import { motion } from "framer-motion";
import { Copy, Terminal } from "lucide-react";

export function CodeExample() {
  return (
    <section className="relative py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Start building in seconds
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            MLTrack works with your existing MLflow setup. No migrations, no breaking changes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="w-full max-w-3xl mx-auto mt-12"
        >
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-lg p-1">
            <div className="bg-slate-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-600/10 rounded-lg">
                    <Terminal className="w-6 h-6 text-teal-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Quick Start</h3>
                    <p className="text-sm text-slate-500">Get started with MLTrack in seconds</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 relative group">
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 font-mono">
                  <span className="text-emerald-400">$</span>
                  <span className="text-slate-800 mx-3 flex-1">pip install ml-track</span>
                  <button 
                    className="p-2 hover:bg-slate-100 rounded-md transition-all duration-200 hover:scale-110"
                    aria-label="Copy to clipboard"
                  >
                    <Copy className="w-5 h-5 text-slate-400 group-hover:text-teal-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}