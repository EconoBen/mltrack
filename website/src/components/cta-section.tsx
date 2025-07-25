"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-teal-900/20 to-blue-900/20 rounded-2xl p-12 text-center overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-teal-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-black">
              Ready to ship your models?
            </h2>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Join the growing community of ML engineers who ship models in minutes, not weeks.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://github.com/EconoBen/mltrack"
                className="group flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all text-lg hover:scale-105"
              >
                <Github className="w-6 h-6" />
                Get Started on GitHub
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            <div className="mt-8">
              <code className="text-sm text-slate-300 bg-slate-900/80 px-4 py-2 rounded-lg font-mono">
                pip install mltrack
              </code>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}