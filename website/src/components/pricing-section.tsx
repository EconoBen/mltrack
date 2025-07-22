"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Pricing that makes sense
          </h2>
          <p className="text-xl text-gray-300">
            Open source and free forever. Because ML tools should be accessible.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl p-8 border border-purple-500/20 hover:border-purple-500/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h3 className="text-2xl font-bold">Open Source</h3>
          </div>
          
          <div className="mb-8">
            <span className="text-5xl font-bold">$0</span>
            <span className="text-gray-300 ml-2">forever</span>
          </div>
          
          <ul className="space-y-3 mb-8">
            {[
              "Full access to all features",
              "Deploy to Modal, AWS, Docker",
              "Beautiful modern UI",
              "Cost tracking & analytics",
              "Community support",
              "MIT License",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
          
          <div className="pt-6 border-t border-white/10">
            <p className="text-sm text-gray-300 text-center">
              Want to support the project? Star us on GitHub or contribute code!
            </p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-gray-300 mb-4">
            Need enterprise features or support?
          </p>
          <a
            href="https://github.com/EconoBen/mltrack/discussions"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            Let's talk in the community →
          </a>
        </motion.div>
      </div>
    </section>
  );
}