"use client";

import { motion } from "framer-motion";
import { Check, Copy, Terminal } from "lucide-react";

const solutions = [
  {
    before: "mlflow ui",
    after: "ml ui",
    description: "Beautiful, modern interface that actually helps you work",
  },
  {
    before: "Complex Docker setup + API code + Cloud config",
    after: "ml ship model --modal",
    description: "One command to deploy anywhere",
  },
  {
    before: "MLproject files + conda.yaml + setup.py",
    after: "ml train script.py",
    description: "Just run your script, we handle the rest",
  },
  {
    before: "Write test client + Handle auth + Parse responses",
    after: "ml try model --modal",
    description: "Test deployed models instantly",
  },
];

export function SolutionSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-transparent to-teal-900/10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            MLTrack makes it{" "}
            <span className="bg-emerald-500/10 px-3 py-1 rounded-lg text-emerald-500 italic">delightfully simple</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Keep using MLflow. Add MLTrack. Ship models in minutes.
          </p>
        </motion.div>
        
        <div className="space-y-8">
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-amber-500/5 to-emerald-500/5 border border-slate-700 rounded-xl p-8 hover:border-slate-600 transition-all"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-500 mb-3">Before MLTrack:</div>
                  <code className="text-sm text-slate-500 line-through font-mono block mb-4">
                    {solution.before}
                  </code>
                </div>
                <div className="flex-shrink-0 text-2xl text-slate-600">→</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-emerald-400 mb-3">With MLTrack:</div>
                  <code className="text-lg text-white font-mono bg-slate-900/80 px-4 py-2 rounded-lg inline-block mb-4">
                    {solution.after}
                  </code>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3 pt-6 border-t border-slate-700">
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-slate-400 font-medium">{solution.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-lg text-gray-600 mb-6">
            100% compatible with your existing MLflow setup
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-slate-600">
              No migrations
            </div>
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-slate-600">
              No breaking changes
            </div>
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-slate-600">
              Just enhancement
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}